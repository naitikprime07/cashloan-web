from pathlib import Path
from http.server import ThreadingHTTPServer,SimpleHTTPRequestHandler
from functools import partial
import threading,json,runpy
from playwright.sync_api import sync_playwright
root=Path.cwd()
class Quiet(SimpleHTTPRequestHandler):
 def log_message(self,*args):pass
server=ThreadingHTTPServer(('127.0.0.1',0),partial(Quiet,directory=str(root)));threading.Thread(target=server.serve_forever,daemon=True).start();base=f'http://127.0.0.1:{server.server_port}'
stub=runpy.run_path(str(root/'tests/ad-audit.py'))['STUB'].replace('MODE','"filled"');rows=[]
with sync_playwright() as p:
 b=p.chromium.launch(headless=True);c=b.new_context()
 c.route('**/*',lambda r:r.continue_() if r.request.url.startswith(base) else r.fulfill(content_type='application/javascript',body='/* held for layout test */') if '/tag/js/gpt.js' in r.request.url else r.abort())
 for w,h in [(320,568),(360,640),(375,667),(390,844),(393,852),(412,915),(430,932),(1440,900)]:
  for name in ['index','loan-amount','employment-type','loan-type','proceed']:
   t=c.new_page();t.set_viewport_size({'width':w,'height':h});t.goto(base+'/'+name+'.html')
   for state in ['unfilled','fluid','tall-fluid']:
    if state=='fluid':t.evaluate(stub)
    if state=='tall-fluid':t.locator('[data-test-creative]').evaluate('(e)=>e.style.height="500px"')
    d=t.evaluate('''()=>{const s=document.querySelector('.screen'),btn=s.querySelector('.cta .btn'),ad=s.querySelector('[data-ad-logical]'),next=s.nextElementSibling;const sr=s.getBoundingClientRect(),br=btn.getBoundingClientRect(),ar=ad.getBoundingClientRect();return {viewport:innerHeight,screenBottom:sr.bottom,buttonBottom:br.bottom,detailsTop:next.getBoundingClientRect().top,position:getComputedStyle(btn).position,padding:parseFloat(getComputedStyle(s).paddingBottom),widthAligned:Math.abs(ar.width-br.width)<.1,overflow:document.documentElement.scrollWidth>innerWidth}}''')
    assert d['screenBottom']>=h-1 and d['detailsTop']>=h-1,d
    assert abs(d['screenBottom']-d['buttonBottom']-d['padding'])<1,d
    assert d['position']=='static' and d['widthAligned'] and not d['overflow'],d
    rows.append(dict(page=name,width=w,height=h,state=state,**d))
   t.close()
 b.close()
server.shutdown();(root/'tests/next-viewport-results.json').write_text(json.dumps(rows,indent=2));print('PASS',len(rows),'viewport/page/ad-state checks. Details start below viewport; Next ends at section bottom; no horizontal overflow.')
