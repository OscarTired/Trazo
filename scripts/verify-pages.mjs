import { chromium } from '@playwright/test';
import assert from 'node:assert/strict';
import { mkdir,writeFile } from 'node:fs/promises';

const base=(process.env.SITE_URL??'http://127.0.0.1:4173/Trazo/').replace(/\/?$/,'/');
const browser=await chromium.launch({executablePath:process.env.CHROME_PATH??'C:/Program Files/Google/Chrome/Application/chrome.exe',headless:true});
const report={url:base,checks:[],errors:[],failedRequests:[]};
await mkdir('.impeccable/review',{recursive:true});
try {
  for(const viewport of [{width:1536,height:1024},{width:390,height:844}]) {
    const context=await browser.newContext({viewport});
    const page=await context.newPage();page.on('pageerror',e=>report.errors.push(e.message));
    page.on('response',r=>{if(r.status()>=400)report.failedRequests.push({url:r.url(),status:r.status()});});
    await page.goto(`${base}#modern`,{waitUntil:'domcontentloaded'});
    await page.locator('.paper-intro-canvas').waitFor({state:'visible',timeout:6500});
    await page.locator('.paper-intro').waitFor({state:'hidden',timeout:9000});
    const top=await page.locator('#modern').evaluate(el=>el.getBoundingClientRect().top);
    assert.ok(Math.abs(top-24)<3,`Fragment lost: ${top}`);
    assert.equal(await page.locator('.chapter').count(),6);
    for(const filename of ['paper.webp','history-art.webp','chapters.webp']) {
      const response=await page.request.get(`${base}assets/${filename}`);
      assert.equal(response.status(),200);
      assert.match(response.headers()['content-type'],/image\/webp/);
    }
    assert.equal(await page.locator('.history-art').evaluate(el=>el.complete&&el.naturalWidth>0),true);
    const images=await page.locator('.chapter-art image').evaluateAll(elements=>elements.map(el=>el.getAttribute('href')));
    assert.ok(images.every(href=>href.startsWith('/Trazo/assets/')),'Chapter assets escaped the Pages prefix');
    await page.getByRole('button',{name:'English',exact:true}).click();
    assert.equal(await page.locator('html').getAttribute('lang'),'en');
    await page.locator('.chapter-dot').first().click();await page.waitForTimeout(1600);
    await page.screenshot({path:`.impeccable/review/pages-${viewport.width}.png`});
    const before=await page.evaluate(()=>scrollY);await page.mouse.wheel(0,200);await page.waitForTimeout(1500);
    assert.ok(await page.evaluate(()=>scrollY)>before+100);
    await page.reload({waitUntil:'domcontentloaded'});
    await page.locator('.paper-intro').waitFor({state:'hidden',timeout:9000});
    assert.equal(await page.locator('html').getAttribute('lang'),'en');
    await page.getByRole('button',{name:'Reduce motion',exact:true}).click();
    await page.reload({waitUntil:'networkidle'});
    assert.equal(await page.locator('.paper-intro').isVisible(),false);
    assert.ok(await page.evaluate(()=>document.documentElement.scrollWidth<=innerWidth));
    report.checks.push({viewport,intro:true,fragment:true,assets:true,language:true,scroll:true,reducedMotion:true});
    await context.close();
  }
  assert.deepEqual(report.errors,[]);assert.deepEqual(report.failedRequests,[]);
  console.log(JSON.stringify(report));
}finally{await writeFile('.impeccable/review/pages-verification.json',JSON.stringify(report,null,2));await browser.close();}
