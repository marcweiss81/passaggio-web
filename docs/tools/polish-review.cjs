/* Local visual review; pass an installed Playwright module via PLAYWRIGHT_MODULE. */
const {chromium}=require(process.env.PLAYWRIGHT_MODULE || 'playwright');
const fs=require('node:fs');
const path=require('node:path');
const {spawn}=require('node:child_process');
const root=path.resolve(__dirname,'../..');
const phase=process.argv[2];
if(!['before','after'].includes(phase))throw Error('Use before or after');
(async()=>{
 const server=spawn('python3',['-m','http.server','8798','--bind','127.0.0.1'],{cwd:root,stdio:'ignore'});
 const browser=await chromium.launch({headless:true});
 const out=path.join(root,'docs/evidence/visual-polish-20261115');fs.mkdirSync(out,{recursive:true});
 const results=[];
 try{
  for(const name of ['index','features','lessons','how-it-works','faq','download','privacy','404']){
   for(const width of [360,412,1440]){
    const page=await browser.newPage({viewport:{width,height:1000},reducedMotion:'reduce'});
    await page.route('https://api.github.com/**',r=>r.abort());
    await page.goto(`http://127.0.0.1:8798/${name}.html`);await page.evaluate(()=>document.fonts.ready);
    await page.locator('img').evaluateAll(async imgs=>{for(const i of imgs){i.loading='eager';await i.decode().catch(()=>{});}});
    await page.screenshot({path:path.join(out,`${phase}-${name}-${width}.webp`),fullPage:true,type:'webp',quality:65});
    for(const scale of [1,2]){
     await page.evaluate(scale=>document.documentElement.style.fontSize=`${scale*100}%`,scale);
     const checks=await page.evaluate(()=>({overflow:document.documentElement.scrollWidth>innerWidth,brokenImages:[...document.images].filter(i=>!i.complete||!i.naturalWidth).map(i=>i.src),motion:[...document.querySelectorAll('*')].filter(e=>getComputedStyle(e).animationName!=='none').length}));
     results.push({name,width,scale,...checks});
    }
    if(width===360){await page.locator('.menu-btn').click();if(await page.locator('.menu-btn').getAttribute('aria-expanded')!=='true')throw Error('Menu failed');await page.keyboard.press('Escape');if(phase==='after' && await page.locator('.menu-btn').getAttribute('aria-expanded')!=='false')throw Error('Escape failed');}
    if(phase==='after') {
     await page.keyboard.press('Tab');
     const focus=await page.evaluate(()=>[...document.querySelectorAll('a[href],button,summary')].filter(e=>e.checkVisibility()).map(e=>{e.focus({preventScroll:true});const s=getComputedStyle(e);return {tag:e.tagName,visible:e.matches(':focus-visible')&&parseFloat(s.outlineWidth)>=2&&s.outlineStyle!=='none'}}));
     if(focus.some(e=>!e.visible))throw Error('Missing focus ring '+JSON.stringify(focus.filter(e=>!e.visible)));
    }
    await page.close();
   }
  }
  fs.writeFileSync(path.join(out,`${phase}-checks.json`),JSON.stringify(results,null,2));
  console.log(JSON.stringify(results.filter(r=>r.overflow||r.brokenImages.length||r.motion),null,2));
 }finally{await browser.close();server.kill();}
})().catch(e=>{console.error(e);process.exitCode=1});
