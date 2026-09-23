"""Controlled browser regression checks. This does NOT test GAM fill or frequency caps.
Run: python tests/ad-audit.py (requires the Python Playwright package and Chromium).
"""
from pathlib import Path
from http.server import ThreadingHTTPServer, SimpleHTTPRequestHandler
from functools import partial
import threading, json, re
from playwright.sync_api import sync_playwright
ROOT = Path(__file__).resolve().parents[1]
class QuietHandler(SimpleHTTPRequestHandler):
    def log_message(self, *args): pass
STUB = r"""
(function(){
 const mode = MODE, active = [], handlers = {}, calls = [];
 const emit = (name, slot, extra={}) => (handlers[name] || []).forEach(fn => fn({slot,...extra}));
 let configured = {}, services = 0;
 function request(slot) {
  if (slot.requested) throw Error('duplicate request');
  slot.requested = true; calls.push(['request',slot.id]); emit('slotRequested',slot);
  if (mode === 'silent') return;
  emit('slotResponseReceived',slot);
  const empty = mode === 'empty';
  let size = null;
  if (!empty && !slot.format) {
   const entry = slot.mapping.find(m => innerWidth >= m[0][0]);
   size = entry && entry[1][0];
   if (!size) throw Error('No fitting mapping');
   const creative = document.createElement('div');
   creative.setAttribute('data-test-creative','true');
   creative.style.cssText = `width:${size[0]}px;height:${size[1]}px;margin:0 auto;background:#345`;
   document.getElementById(slot.id).appendChild(creative);
  }
  if (!empty && slot.format === 'BOTTOM_ANCHOR') size = [320,50];
  if (!empty && slot.format === 'INTERSTITIAL') size = [innerWidth,innerHeight];
  emit('slotRenderEnded',slot,{isEmpty:empty,size,responseIdentifier:'controlled-response'});
  if (!empty) {emit('slotOnload',slot); emit('impressionViewable',slot);}
 }
 const pub = {getSlots:()=>active.slice(),addEventListener:(n,f)=>{(handlers[n] ||= []).push(f)},
  removeEventListener:(n,f)=>{handlers[n]=handlers[n].filter(x=>x!==f)},refresh:slots=>slots.forEach(request)};
 function define(path,sizes,id,format) {
  if (mode === 'null' && format) return null;
  if (active.some(s=>s.id===id)) throw Error('duplicate slot');
  if (format && active.some(s=>s.format===format)) throw Error('duplicate format');
  const slot={id,format,path,sizes,getSlotElementId:()=>id,getAdUnitPath:()=>path,
   addService(s){if(s!==pub)throw Error('wrong service');this.serviced=true;calls.push(['service',id]);return this},
   defineSizeMapping(m){this.mapping=m;return this},setConfig(){return this}};
  calls.push(['define',id]);active.push(slot);return slot;
 }
 const old=window.googletag;
 window.__gptTest={calls,active,handlers,emit,get services(){return services}};
 window.googletag={cmd:{push:fn=>fn()},setConfig:c=>configured=c,
  enableServices(){services++;calls.push(['enable']);if(services>1)throw Error('duplicate enable')},
  pubads:()=>pub,enums:{OutOfPageFormat:{INTERSTITIAL:'INTERSTITIAL',BOTTOM_ANCHOR:'BOTTOM_ANCHOR'}},
  defineSlot:(path,sizes,id)=>define(path,sizes,id),
  defineOutOfPageSlot:(path,format)=>define(path,null,'gpt-'+format,format),
  sizeMapping:()=>{const entries=[];return {addSize(a,b){entries.push([a,b]);return this},build:()=>entries.sort((a,b)=>b[0][0]-a[0][0])}},
  display(slot){if(!slot.serviced || !services)throw Error('display before service');calls.push(['display',slot.id]);
   if(!configured.disableInitialLoad){if(configured.singleRequest)active.filter(s=>!s.requested).forEach(request);else request(slot)}},
  destroySlots(slots){if(!slots)throw Error('global destroy');slots.forEach(s=>{calls.push(['destroy',s.id]);active.splice(active.indexOf(s),1)});return true},
  openConsole(){calls.push(['console'])}};
 (old.cmd || []).forEach(fn=>fn());
})();
"""
def run():
 server=ThreadingHTTPServer(('127.0.0.1',0),partial(QuietHandler,directory=str(ROOT)))
 threading.Thread(target=server.serve_forever,daemon=True).start()
 base=f'http://127.0.0.1:{server.server_port}'
 pages=[p.stem for p in ROOT.glob('*.html') if 'js/ad-config.js' in p.read_text(encoding='utf-8')]
 results=[]
 with sync_playwright() as p:
  browser=p.chromium.launch(headless=True)
  def context(mode='filled',width=390):
   c=browser.new_context(viewport={'width':width,'height':844})
   c.route('**/*',lambda r:r.continue_() if r.request.url.startswith(base) else r.fulfill(content_type='application/javascript',body=STUB.replace('MODE',json.dumps(mode))) if '/tag/js/gpt.js' in r.request.url else r.abort())
   return c
  for mode in ['filled','empty','null']:
   for width in [320,390,1440]:
    for name in pages:
     c=context(mode,width); tab=c.new_page(); errors=[]; tab.on('pageerror',lambda e: errors.append(str(e)))
     tab.goto(f'{base}/{name}.html'); tab.wait_for_function('window.AdManager && AdManager.getDiagnostics().slots.every(s=>s.state!=="QUEUED")')
     d=tab.evaluate('AdManager.getDiagnostics()'); test=tab.evaluate('({calls:__gptTest.calls,services:__gptTest.services})')
     assert not errors and not d['errors'],(name,mode,errors,d['errors'])
     assert test['services']==1
     assert any(x[0]=='request' for x in test['calls']),(name,mode,width,d,test)
     first_request=next(i for i,x in enumerate(test['calls']) if x[0]=='request')
     assert all(i<first_request for i,x in enumerate(test['calls']) if x[0]=='define')
     for slot in d['slots']:
      unsupported=mode=='null' and slot['kind']!='display'
      assert slot['state']==('UNSUPPORTED' if unsupported else 'NO_FILL' if mode=='empty' else 'RENDERED'),(name,slot)
      assert slot['requestCount']==(0 if unsupported else 1)
      assert slot['renderCount']==(0 if unsupported else 1)
      assert sum(x==['display',slot['elementId']] for x in test['calls'])==(0 if unsupported else 1)
      if not unsupported: assert slot['responseIdentifier']=='controlled-response'
     assert len([s for s in d['slots'] if s['kind']=='interstitial'])<=1
     geom=tab.evaluate('''() => {const a=document.querySelector('[data-ad-logical]'),n=document.querySelector('.screen .cta .btn'),c=a.querySelector('[data-test-creative]');return {width:a.getBoundingClientRect().width,creative:c&&c.getBoundingClientRect().width,overflow:document.documentElement.scrollWidth>innerWidth,next:n&&getComputedStyle(n).position,gap:n&&n.getBoundingClientRect().top-a.getBoundingClientRect().bottom}}''')
     assert not geom['overflow'],(name,width,geom)
     if geom['creative']: assert geom['creative']<=geom['width']
     if geom['next']: assert geom['next']=='static' and 0<=geom['gap']<=45,geom
     before=len(test['calls']); tab.evaluate('AdManager.init(); window.dispatchEvent(new PageTransitionEvent("pagehide",{persisted:true})); window.dispatchEvent(new PageTransitionEvent("pageshow",{persisted:true})); AdManager.init()')
     assert tab.evaluate('__gptTest.calls.length')==before
     results.append({'page':name,'mode':mode,'width':width,'passed':True})
     c.close()
  # Breakpoint boundaries reflect the 40px gutter, including the no-size case.
  for width,expected in [(289,None),(290,250),(339,250),(340,300),(479,300),(480,440)]:
   c=context(width=width);tab=c.new_page();tab.goto(base+'/index.html');tab.wait_for_function('AdManager.getDiagnostics().gpt.servicesEnabled')
   slot=tab.evaluate('AdManager.getDiagnostics().slots[0]')
   assert (slot['renderedSize'][0] if slot['renderedSize'] else None)==expected,(width,slot)
   c.close()
  # No-fill must not block any Next destination; preserve existing #3/#4 mapping.
  routes={'index':'loan-amount','loan-amount':'employment-type','employment-type':'loan-type','loan-type':'proceed','proceed':'blogs'}
  for mode in ['empty','null','blocked']:
   c=context(mode);tab=c.new_page()
   if mode=='blocked': c.route('**/tag/js/gpt.js',lambda r:r.abort())
   for source,target in routes.items():
    tab.goto(base+'/'+source+'.html')
    if tab.locator('.select').count():
     tab.locator('.select').click();tab.locator('.option').first.click();tab.locator('dialog').wait_for(state='hidden')
    tab.locator('.cta .btn').click();tab.wait_for_url('**/'+target+'.html')
   for loan in ['personal-loan','auto-loan','student-loan','business-loan','payday-loan','home-loan','gold-loan']:
    tab.goto(base+'/blogs.html');tab.locator('a.post-card[href*="'+loan+'"]').click();tab.wait_for_url('**/eligibility-check.html?loan='+loan)
   # Apply Loan is generated by eligibility.js, preserving all query parameters.
   tab.goto(base+'/eligibility-check.html?loan=personal-loan');tab.locator('#age').fill('30');tab.locator('#income').fill('40000')
   tab.locator('.select').click();tab.locator('.option').first.click();tab.locator('dialog').wait_for(state='hidden')
   tab.locator('button[form="eligForm"]').click();href=tab.locator('#applyBtn').get_attribute('href');assert href.startswith('blog-personal-loan.html?amount=')
   tab.locator('#applyBtn').click();tab.wait_for_url(base+'/'+href)
   c.close()
  # Delayed GPT callback remains usable; duplicate init does not add a loader.
  c=context();c.route('**/tag/js/gpt.js',lambda r:r.fulfill(content_type='application/javascript',body='/* held by test */'))
  tab=c.new_page();tab.clock.install();tab.goto(base+'/index.html');tab.clock.fast_forward(16000);tab.evaluate('AdManager.init()');assert tab.evaluate('GAM.getState()')=='unconfirmed'
  assert tab.evaluate('document.querySelectorAll(\'script[src*="/tag/js/gpt.js"]\').length')==1
  tab.evaluate(STUB.replace('MODE','"filled"'));tab.wait_for_function('AdManager.getDiagnostics().slots[0].state==="RENDERED"')
  assert tab.evaluate('__gptTest.services')==1
  c.close()
  # Duplicate DOM IDs fail only the affected display, not its interstitial.
  c=context();c.route('**/tag/js/gpt.js',lambda r:r.fulfill(content_type='application/javascript',body='/* held */'))
  tab=c.new_page();tab.goto(base+'/index.html');tab.evaluate('document.body.appendChild(document.querySelector("[data-ad-logical]").cloneNode())');tab.evaluate(STUB.replace('MODE','"filled"'))
  tab.wait_for_function('AdManager.getDiagnostics().gpt.servicesEnabled');d=tab.evaluate('AdManager.getDiagnostics()')
  assert d['slots'][0]['state']=='CONFIG_ERROR' and d['slots'][1]['state']=='RENDERED',d
  c.close()
  # A filled rectangle survives rotation at natural size without page overflow.
  c=context(width=1440);tab=c.new_page();tab.goto(base+'/index.html');tab.wait_for_function('AdManager.getDiagnostics().slots[0].renderCount===1')
  tab.set_viewport_size({'width':320,'height':844})
  assert tab.evaluate('document.documentElement.scrollWidth<=innerWidth')
  assert tab.locator('[data-test-creative]').evaluate('(e)=>e.getBoundingClientRect().width')==440
  assert tab.evaluate('AdManager.getDiagnostics().slots[0].requestCount')==1
  assert not tab.evaluate('__gptTest.calls.some(c=>c[0]==="destroy")')
  c.close()
  # A response that never arrives is unconfirmed, not no-fill or a retry.
  c=context('silent');tab=c.new_page();tab.clock.install();tab.goto(base+'/index.html');tab.wait_for_function('AdManager.getDiagnostics().slots[0].requestCount===1');tab.clock.fast_forward(31000)
  assert tab.evaluate('AdManager.getDiagnostics().slots.every(s=>s.state==="UNCONFIRMED" && s.requestCount===1 && s.isEmpty===null)')
  c.close()
  # A missing container and an externally owned slot fail in isolation.
  for scenario in ['missing','existing']:
   c=context();c.route('**/tag/js/gpt.js',lambda r:r.fulfill(content_type='application/javascript',body='/* held */'))
   tab=c.new_page();tab.goto(base+'/index.html')
   if scenario=='missing':tab.evaluate('document.querySelector("[data-ad-logical]").remove()')
   else:tab.evaluate('googletag.cmd.push(()=>googletag.defineSlot("/23338698373/cashloanplatform_native_in_content_01",[[250,250]],"gam-index-dropdown-next").defineSizeMapping([[[0,0],[[250,250]]]]).addService(googletag.pubads()))')
   tab.evaluate(STUB.replace('MODE','"filled"'));tab.wait_for_function('AdManager.getDiagnostics().gpt.servicesEnabled')
   assert tab.evaluate('AdManager.getDiagnostics().slots[0].state')=='CONFIG_ERROR'
   assert tab.evaluate('AdManager.getDiagnostics().slots[1].state')=='RENDERED'
   c.close()
  browser.close()
 server.shutdown()
 (ROOT/'tests'/'ad-audit-results.json').write_text(json.dumps({'controlled':True,'matrix':results,'additional':['6 size boundaries','Next/blog/Apply navigation: empty/null/blocked','delayed GPT','duplicate container isolation','persisted history idempotence']},indent=2))
 print(f'PASS: {len(results)} controlled page/mode/viewport cases plus boundaries, navigation, delayed GPT and duplicate isolation. NOT live GAM delivery.')
if __name__=='__main__':run()
