'use strict';
const {test,before,after}=require('node:test');
const assert=require('node:assert/strict');
const fs=require('node:fs'),path=require('node:path'),http=require('node:http');
const {chromium}=require('playwright');
let server,browser,url;
before(async()=>{
 const root=path.join(__dirname,'..');
 server=http.createServer((req,res)=>{
  const name=new URL(req.url,'http://localhost').pathname;
  const file=path.join(root,name==='/'?'index.html':name);
  const mime={'.html':'text/html','.js':'text/javascript','.css':'text/css','.svg':'image/svg+xml','.webp':'image/webp'};
  fs.readFile(file,(err,data)=>{res.writeHead(err?404:200,{'Content-Type':mime[path.extname(file)]||'application/octet-stream'});res.end(err?'Not found':data);});
 });
 await new Promise(resolve=>server.listen(0,'127.0.0.1',resolve));
 url=`http://127.0.0.1:${server.address().port}/`;
 browser=await chromium.launch({headless:true,...(process.env.PLAYWRIGHT_CHROMIUM_EXECUTABLE_PATH?{executablePath:process.env.PLAYWRIGHT_CHROMIUM_EXECUTABLE_PATH}:{channel:'chromium'})});
});
after(async()=>{if(browser)await browser.close();if(server)await new Promise(resolve=>server.close(resolve));});
test('malicious file import and pasted merge preserve the saved budget; CSP blocks inline injection',async()=>{
 const context=await browser.newContext({serviceWorkers:'block'}),page=await context.newPage();
 await page.goto(url);await page.locator('[data-act="startExample"]').click();
 const before=await page.evaluate(()=>localStorage.getItem('moneyAhead.v2'));
 const attack=JSON.parse(before);attack.budget.cats[0].id='c" onclick="window.__injected=1';
 await page.locator('#profileBtn').click();
 page.on('dialog',d=>d.accept());
 await page.locator('#restoreFile').setInputFiles({name:'synthetic.json',mimeType:'application/json',buffer:Buffer.from(JSON.stringify(attack))});
 await page.waitForFunction(()=>document.querySelector('#backupFileMsg')?.textContent.includes('Invalid'));
 assert.equal(await page.evaluate(()=>localStorage.getItem('moneyAhead.v2')),before);
 await page.getByText('Sync two phones (unencrypted)',{exact:true}).click();
 await page.locator('#backup').fill(JSON.stringify(attack));
 await page.locator('[data-act="mergeSync"]').click();
 assert.equal(await page.evaluate(()=>localStorage.getItem('moneyAhead.v2')),before);
 await page.evaluate(()=>{const s=document.createElement('script');s.textContent='window.__injected=1';document.body.appendChild(s);});
 assert.equal(await page.evaluate(()=>window.__injected),undefined);
 await context.close();
});
