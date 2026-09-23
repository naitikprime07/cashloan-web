"""Measure dropdownNext separately from fixed creatives. No production mutation.
python tests/dropdown-width.py --mode controlled --label after
python tests/dropdown-width.py --mode preview --label preview
python tests/dropdown-width.py --mode production --label production
"""
from pathlib import Path
from functools import partial
from http.server import ThreadingHTTPServer,SimpleHTTPRequestHandler
import argparse,threading,json,runpy,mimetypes,urllib.parse
from playwright.sync_api import sync_playwright
ROOT=Path(__file__).resolve().parents[1]
PAGES=['index','loan-amount','employment-type','loan-type','proceed']
WIDTHS=[320,360,375,390,393,412,430,480,1440]
MEASURE=r'''() => {
 const slot=document.querySelector('.screen [data-ad-logical]'),wrapper=slot.parentElement,button=document.querySelector('.screen .cta .btn'),screen=document.querySelector('.screen');
 const rect=e=>{const r=e.getBoundingClientRect();return {left:r.left,right:r.right,width:r.width,top:r.top,height:r.height,bottom:r.bottom}};
 const css=getComputedStyle(screen),b=rect(button),a=rect(slot),w=rect(wrapper);
 const creatives=[...slot.querySelectorAll('iframe,[data-test-creative]')].map(e=>({tag:e.tagName,...rect(e),transform:getComputedStyle(e).transform}));
 return {viewport:innerWidth,button:b,wrapper:w,slot:a,content:{width:screen.clientWidth-parseFloat(css.paddingLeft)-parseFloat(css.paddingRight),paddingLeft:css.paddingLeft,paddingRight:css.paddingRight},
 aligned:Math.abs(a.left-b.left)<0.1&&Math.abs(a.right-b.right)<0.1&&Math.abs(w.left-b.left)<0.1&&Math.abs(w.right-b.right)<0.1,
 pageOverflow:document.documentElement.scrollWidth>innerWidth,slotScrollbar:slot.scrollWidth>slot.clientWidth,
 buttonPosition:getComputedStyle(button).position,gap:b.top-w.bottom,creatives,
 scripts:document.querySelectorAll('script[src*="/tag/js/gpt.js"]').length,
 diagnostics:window.AdManager&&AdManager.getDiagnostics()};
}'''
class Quiet(SimpleHTTPRequestHandler):
 def log_message(self,*args):pass
def run(mode,label):
 server=ThreadingHTTPServer(('127.0.0.1',0),partial(Quiet,directory=str(ROOT)));threading.Thread(target=server.serve_forever,daemon=True).start()
 base=f'http://127.0.0.1:{server.server_port}' if mode=='controlled' else 'https://cashloanplatform.com'
 stub=runpy.run_path(str(ROOT/'tests/ad-audit.py'))['STUB'].replace('MODE','"filled"')
 rows=[]
 with sync_playwright() as p:
  browser=p.chromium.launch(headless=True)
  context=browser.new_context(user_agent='Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/140.0.0.0 Safari/537.36')
  if mode=='controlled':
   context.route('**/*',lambda r:r.continue_() if r.request.url.startswith(base) else r.fulfill(content_type='application/javascript',body='/* GPT held until initial layout is measured */') if '/tag/js/gpt.js' in r.request.url else r.abort())
  if mode=='preview':
   def route(r):
    f=(ROOT/(urllib.parse.urlsplit(r.request.url).path.lstrip('/') or 'index.html')).resolve()
    if f.is_relative_to(ROOT) and f.is_file():r.fulfill(content_type=mimetypes.guess_type(str(f))[0] or 'application/octet-stream',body=f.read_bytes())
    else:r.continue_()
   context.route(base+'/**',route)
  for width in WIDTHS:
   for name in PAGES:
    t=context.new_page();t.set_viewport_size({'width':width,'height':900});errors=[];warnings=[];net=[]
    t.on('pageerror',lambda e:errors.append(str(e)))
    t.on('console',lambda m:warnings.append(m.text) if m.type in ['warning','error'] else None)
    t.on('response',lambda r:net.append({'path':r.url.split('?')[0],'status':r.status}) if '/tag/js/gpt.js' in r.url or '/gampad/ads' in r.url else None)
    try:
     response=t.goto(base+'/'+name+'.html',wait_until='domcontentloaded',timeout=20000)
     before=t.evaluate(MEASURE)
     if mode=='controlled':t.evaluate(stub)
     try:t.wait_for_function('window.AdManager && AdManager.getDiagnostics().slots.some(s=>s.kind==="display" && ["RENDERED","NO_FILL","ready","no-fill","rejected-size"].includes(s.state))',timeout=5000)
     except Exception:pass
     if mode!='controlled' and t.evaluate('window.AdManager && AdManager.getDiagnostics().slots.some(s=>s.kind==="display" && s.isEmpty===false)'):
      try:t.wait_for_function('Array.from(document.querySelectorAll(".screen [data-ad-logical] iframe")).some(e=>e.getBoundingClientRect().height>0)',timeout=4000)
      except Exception:pass
     after=t.evaluate(MEASURE);after.update(page=name,mode=mode,http=response.status,errors=errors,warnings=warnings,network=net)
     if mode=='controlled':
      assert after['aligned'] and not after['pageOverflow'],after
      # A square creative taller than the 250px floor may push Next down; it must never jump up.
      assert after['button']['top']>=before['button']['top']-0.1
      assert after['buttonPosition']=='static'
      assert after['scripts']==1 and not errors
      slot=next(s for s in after['diagnostics']['slots'] if s['kind']=='display')
      assert slot['requestCount']==slot['renderCount']==1
      # Fixed creatives are scaled to the slot width; fluid renders natively full width.
      assert len(after['creatives'])==1 and abs(after['creatives'][0]['width']-after['slot']['width'])<1.5,after['creatives']
      if slot['renderedSize']=='fluid': assert after['creatives'][0]['transform']=='none'
      assert t.evaluate('__gptTest.calls.filter(c=>c[0]==="display" && c[1]===document.querySelector("[data-ad-logical]").id).length')==1
      t.evaluate('AdManager.init()');assert t.evaluate('AdManager.getDiagnostics().slots[0].requestCount')==1
     if after.get("diagnostics"):after["diagnostics"].pop("events",None)
     rows.append(after)
     print(mode,name,width,'button',after['button']['width'],'slot',after['slot']['width'],'creative',[(x['width'],x['height']) for x in after['creatives']],'aligned',after['aligned'],flush=True)
    except Exception as e:
     rows.append({'page':name,'viewport':width,'mode':mode,'error':str(e)})
     if mode=='controlled':raise
    finally:t.close()
  if mode=='controlled':
   t=context.new_page()
   for source,target in zip(PAGES,['loan-amount','employment-type','loan-type','proceed','blogs']):
    t.goto(base+'/'+source+'.html');t.evaluate(stub)
    if t.locator('.select').count():
     t.locator('.select').click();t.locator('.option').first.click();t.locator('dialog').wait_for(state='hidden')
    t.locator('.cta .btn').click();t.wait_for_url('**/'+target+'.html')
   print('All five Next destinations passed',flush=True)
  browser.close()
 server.shutdown();(ROOT/'tests'/('dropdown-width-'+label+'.json')).write_text(json.dumps(rows,indent=2),encoding='utf-8')
if __name__=='__main__':
 a=argparse.ArgumentParser();a.add_argument('--mode',choices=['controlled','preview','production'],default='controlled');a.add_argument('--label',default='after');args=a.parse_args();run(args.mode,args.label)
