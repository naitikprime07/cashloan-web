from pathlib import Path
import json,mimetypes,urllib.parse
from playwright.sync_api import sync_playwright
ROOT=Path.cwd();names=[p.stem for p in sorted(ROOT.glob('*.html')) if 'js/ad-config.js' in p.read_text(encoding='utf-8')];results=[]
with sync_playwright() as p:
 b=p.chromium.launch(headless=True)
 for mode in ['production','local-source-preview']:
  c=b.new_context(viewport={'width':390,'height':844},user_agent='Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/140.0.0.0 Safari/537.36')
  if mode=='local-source-preview':
   def route(r):
    file=(ROOT/(urllib.parse.urlsplit(r.request.url).path.lstrip('/') or 'index.html')).resolve()
    if file.is_relative_to(ROOT) and file.is_file():r.fulfill(content_type=mimetypes.guess_type(str(file))[0] or 'application/octet-stream',body=file.read_bytes())
    else:r.continue_()
   c.route('https://cashloanplatform.com/**',route)
  for name in names:
   t=c.new_page();errors=[];warnings=[];network=[]
   t.on('pageerror',lambda e:errors.append(str(e)))
   t.on('console',lambda m:warnings.append(m.text) if m.type in ['warning','error'] else None)
   t.on('response',lambda r:network.append({'path':r.url.split('?')[0],'status':r.status}) if '/tag/js/gpt.js' in r.url or '/gampad/ads' in r.url else None)
   try:
    response=t.goto('https://cashloanplatform.com/'+name+'.html',wait_until='domcontentloaded',timeout=25000)
    try:t.wait_for_function('window.AdManager && AdManager.getDiagnostics().slots.length && AdManager.getDiagnostics().slots.every(s=>["RENDERED","NO_FILL","UNSUPPORTED","CONFIG_ERROR","FAILED","ready","no-fill","unsupported"].includes(s.state))',timeout=7000)
    except Exception:pass
    d=t.evaluate('window.AdManager && AdManager.getDiagnostics()')
    if d:d.pop('events',None)
    result={'source':mode,'page':name,'http':response.status,'diagnostics':d,'jsErrors':errors,'warnings':warnings,'network':network,'gptScriptCount':t.locator('script[src*="/tag/js/gpt.js"]').count(),'assets':t.locator('script[src]').evaluate_all('(es)=>es.map(e=>e.getAttribute("src")).filter(x=>x.includes("ad-config")||x.includes("ad-manager"))')}
    results.append(result);print(mode,name,[(s['id'],s['state']) for s in (d or {}).get('slots',[])],flush=True)
   except Exception as e:results.append({'source':mode,'page':name,'error':str(e)})
   t.close()
  c.close()
 b.close()
(ROOT/'tests/all-ads-current-results.json').write_text(json.dumps(results,indent=2),encoding='utf-8')
