"""Read-only live delivery observations. Does not change GAM or production."""
from pathlib import Path
from http.server import ThreadingHTTPServer,SimpleHTTPRequestHandler
from functools import partial
import threading,json,hashlib
from playwright.sync_api import sync_playwright
ROOT=Path(__file__).resolve().parents[1]
class Quiet(SimpleHTTPRequestHandler):
 def log_message(self,*args):pass
def run():
 server=ThreadingHTTPServer(('127.0.0.1',0),partial(Quiet,directory=str(ROOT)));threading.Thread(target=server.serve_forever,daemon=True).start()
 base=f'http://127.0.0.1:{server.server_port}'
 names=[p.stem for p in ROOT.glob('*.html') if 'js/ad-config.js' in p.read_text(encoding='utf-8')]
 results=[]
 with sync_playwright() as p:
  b=p.chromium.launch(headless=True)
  c=b.new_context(viewport={'width':390,'height':844},user_agent='Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/140.0.0.0 Safari/537.36')
  for name in names:
   t=c.new_page();errs=[];messages=[];requests=[]
   t.on('pageerror',lambda e:errs.append(str(e)))
   t.on('console',lambda m:messages.append({'type':m.type,'text':m.text}) if m.type in ['warning','error'] else None)
   t.on('response',lambda r:requests.append({'host':r.url.split('/')[2],'path':r.url.split('?')[0].split('#')[0],'status':r.status}) if any(s in r.url for s in ['doubleclick.net','googlesyndication.com']) else None)
   t.on('requestfailed',lambda r:requests.append({'path':r.url.split('?')[0],'failed':r.failure}) if any(s in r.url for s in ['doubleclick.net','googlesyndication.com']) else None)
   try:
    r=t.goto(base+'/'+name+'.html',wait_until='domcontentloaded',timeout=30000)
    try:t.wait_for_function('window.AdManager && AdManager.getDiagnostics().slots.every(s=>s.renderCount>0 || ["UNSUPPORTED","FAILED","CONFIG_ERROR","UNSUPPORTED_SIZE"].includes(s.state))',timeout=7000)
    except Exception:pass
    d=t.evaluate('window.AdManager ? AdManager.getDiagnostics() : null')
    results.append({'origin':'local-real-GPT','page':name,'width':390,'http':r.status,'diagnostics':d,'jsErrors':errs,'console':messages,'network':requests})
    print(name,json.dumps({'gpt':d and d['gpt'],'slots':[(s['kind'],s['state'],s['requestCount']) for s in (d or {}).get('slots',[])]}),flush=True)
    if name=='blogs':
     t.evaluate('AdConfig.debug=true; AdManager.openConsole()');t.wait_for_timeout(1000)
     results[-1]['publisherConsoleFrames']=[{'url':f.url.split('?')[0],'text':f.locator('body').inner_text(timeout=2000)[:10000]} for f in t.frames if 'pubconsole' in f.url]
   except Exception as e:results.append({'origin':'local-real-GPT','page':name,'error':str(e)})
   t.close()
  # One production document first; do not hammer a server that rejects this client.
  t=c.new_page()
  try:
   r=t.goto('https://cashloanplatform.com/index.html',wait_until='domcontentloaded',timeout=30000)
   headers={k:v for k,v in r.headers.items() if k in ['server','age','cache-control','cf-cache-status','etag','last-modified','content-security-policy']}
   body=r.body();local=(ROOT/'index.html').read_bytes()
   results.append({'origin':'production','page':'index','http':r.status,'headers':headers,'matchesLocal':body==local,'sha256':hashlib.sha256(body).hexdigest(),'title':t.title()})
   if r.status==200:
    t.wait_for_timeout(3000)
    results[-1]['diagnostics']=t.evaluate('window.AdManager ? AdManager.getDiagnostics() : null')
    results[-1]['scripts']=t.locator('script[src]').evaluate_all('(els)=>els.map(e=>e.src)')
   print('production',r.status,headers,flush=True)
  except Exception as e:results.append({'origin':'production','error':str(e)})
  b.close()
 server.shutdown();(ROOT/'tests'/'ad-live-results.json').write_text(json.dumps(results,indent=2),encoding='utf-8')
if __name__=='__main__':run()
