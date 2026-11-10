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
for(const width of [320,375,390,768,1440])test(`credit payoff controls and existing savings slider at ${width}px`,async()=>{
 const context=await browser.newContext({viewport:{width,height:1100},serviceWorkers:'block'}),page=await context.newPage();
 const errors=[];page.on('pageerror',e=>errors.push(e.message));
 await page.goto(url);await page.locator('[data-act="startExample"]').click();
 const before=await page.evaluate(()=>localStorage.getItem('moneyAhead.v2'));
 await page.locator('#tabs [data-view="review"]').click();
 const card=page.locator('.mi-card[data-kind="credit"]');await card.locator('summary').click();
 assert.ok((await card.innerText()).includes('$1,092.60'));
 assert.ok((await card.innerText()).includes('15 years'));
 assert.ok((await card.innerText()).includes('4 years, 4 months'));
 assert.ok((await card.innerText()).includes('Demo estimate'));
 const initial=await page.locator('#creditComparison').innerText();
 await card.locator('[data-cents="10000"]').click();
 assert.notEqual(await page.locator('#creditComparison').innerText(),initial);
 assert.equal(await card.locator('[data-cents="10000"]').getAttribute('aria-pressed'),'true');
 await card.locator('[data-act="creditCustom"]').click();
 await page.locator('#creditExtraCustom').fill('125.50');
 assert.ok((await page.locator('#creditComparison').innerText()).includes('$125.50/month'));
 assert.equal(await page.locator('#creditExtraCustom').evaluate(el=>el===document.activeElement),true);
 await page.locator('#creditExtraCustom').fill('-1');
 assert.equal(await page.locator('#creditExtraCustom').getAttribute('aria-invalid'),'true');
 await card.locator('[data-cents="5000"]').click();
 assert.equal(await page.locator('#creditComparison').innerText(),initial);
 assert.equal(await card.getAttribute('open'),'');
 assert.ok(await page.evaluate(()=>document.documentElement.scrollWidth<=innerWidth));
 assert.ok(await card.evaluate(el=>el.scrollWidth<=el.clientWidth),'no panel overflow');
 if(process.env.CREDIT_PAYOFF_SCREENSHOTS){fs.mkdirSync(process.env.CREDIT_PAYOFF_SCREENSHOTS,{recursive:true});await page.locator('#moneyInsights').screenshot({path:path.join(process.env.CREDIT_PAYOFF_SCREENSHOTS,`credit-${width}.png`)});}
 assert.equal(await page.evaluate(()=>localStorage.getItem('moneyAhead.v2')),before,'what-if controls leave saved budget untouched');
 await page.locator('#tabs [data-view="today"]').click();await page.locator('#subs [data-sub="goals"]').click();
 assert.equal(await page.locator('#savDyn').isVisible(),false,'secondary Goals cards start collapsed');
 await page.locator('#savings .fold-btn').click();
 await page.locator('#savSlider').fill('5000');
 const savings=await page.locator('#savDyn').innerText();
 for(const label of ['$50','1 year','3 years','5 years','4%'])assert.ok(savings.includes(label));
 assert.ok(await page.evaluate(()=>document.documentElement.scrollWidth<=innerWidth));
 assert.deepEqual(errors,[]);await context.close();
});

for(const width of [375,1440])test(`credit lesson illustrations load and work offline at ${width}px`,async()=>{
 const context=await browser.newContext({viewport:{width,height:1000}}),page=await context.newPage();
 await page.goto(url);await page.locator('[data-act="startExample"]').click();
 await page.evaluate(async()=>{await navigator.serviceWorker.register('sw.js');await navigator.serviceWorker.ready;});
 await page.waitForFunction(()=>navigator.serviceWorker.controller);
 await page.locator('#tabs [data-view="learn"]').click();
 const before=await page.evaluate(()=>localStorage.getItem('moneyAhead.v2'));
 for(const id of ['credit101','creditcost','creditscore']){
  await page.locator(`[data-act="lesson"][data-id="${id}"]`).click();
  const image=page.locator('.lesson-open .photo img');
  await image.evaluate(img=>img.decode());
  assert.ok((await image.getAttribute('src')).endsWith(id+'.jpg'));
  const size=await image.evaluate(img=>({width:img.naturalWidth,height:img.naturalHeight}));
  assert.ok(size.width>=1200);assert.ok(Math.abs(size.width/size.height-16/9)<.01);
  assert.equal(await page.locator('.photo.failed').count(),0);
  assert.ok(await page.evaluate(()=>document.documentElement.scrollWidth<=innerWidth));
  if(process.env.CREDIT_LESSON_SCREENSHOTS){fs.mkdirSync(process.env.CREDIT_LESSON_SCREENSHOTS,{recursive:true});await page.locator('.lesson-open').screenshot({path:path.join(process.env.CREDIT_LESSON_SCREENSHOTS,`${id}-${width}.png`)});}
  await page.locator('[data-act="lessonClose"]').click();
 }
 assert.equal(await page.evaluate(()=>localStorage.getItem('moneyAhead.v2')),before);
 await context.setOffline(true);await page.reload();
 await page.locator('#tabs [data-view="learn"]').click();
 for(const id of ['credit101','creditcost','creditscore']){
  await page.locator(`[data-act="lesson"][data-id="${id}"]`).click();
  await page.locator('.lesson-open .photo img').evaluate(img=>img.decode());
  assert.equal(await page.locator('.photo.failed').count(),0);
  await page.locator('[data-act="lessonClose"]').click();
 }
 await context.close();
});

for(const width of [320,375,1440])test(`thicker level indicator stays readable on every page at ${width}px`,async()=>{
 const context=await browser.newContext({viewport:{width,height:1000},serviceWorkers:'block'}),page=await context.newPage();
 await page.goto(url);await page.locator('[data-act="startExample"]').click();
 for(const view of ['today','plan','review','month','learn']){
  await page.locator(`#tabs [data-view="${view}"]`).click();
  const track=page.locator('#moneyLevelRoot .ml-track');
  if(view==='today'){
   assert.ok(await track.isVisible());assert.equal(Math.round((await track.boundingBox()).height),12);
   const label=page.locator('#moneyLevelRoot .ml-bar-caption').first();
   assert.equal((await label.innerText()).replace(/\s+/g,' '),'Journey to Money Master 62%');
   assert.ok(await label.evaluate(el=>el.scrollWidth<=el.clientWidth),'progress text fits');
  } else {
   assert.ok(!(await track.isVisible()),'journey card stays on Today so other tabs start with their own content');
  }
 }
 await page.locator('#tabs [data-view="today"]').click();
 await page.locator('[data-act="openCheck"]').click();
 assert.ok((await page.locator('#ask').innerText()).includes('Give impulse buying a second opinion.'));
 await context.close();
});
