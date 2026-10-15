import { chromium } from '@playwright/test';
import { mkdir, writeFile } from 'node:fs/promises';
import assert from 'node:assert/strict';

await mkdir('.impeccable/review',{recursive:true});
const browser=await chromium.launch({executablePath:process.env.CHROME_PATH??'C:/Program Files/Google/Chrome/Application/chrome.exe',headless:true});
const report={errors:[],viewports:[],checks:[]};
try {
  for(const viewport of [{name:'desktop',width:1536,height:1024},{name:'mobile',width:390,height:844}]) {
    const context=await browser.newContext({viewport:{width:viewport.width,height:viewport.height},deviceScaleFactor:1,acceptDownloads:true});
    const page=await context.newPage();
    page.on('pageerror',error=>report.errors.push(error.message));
    await page.goto('http://127.0.0.1:5173/?review=1',{waitUntil:'load'});
    await page.evaluate(()=>document.fonts.ready);
    await page.waitForTimeout(400);
    assert.equal(await page.locator('.chapter').count(),6);
    assert.equal(await page.locator('html').getAttribute('lang'),'es');
    const width=await page.evaluate(()=>({scroll:document.documentElement.scrollWidth,inner:innerWidth}));
    assert.ok(width.scroll<=width.inner,`${viewport.name}: horizontal overflow`);
    await page.screenshot({path:`.impeccable/review/${viewport.name}.png`});
    for(let i=0;i<6;i++) {
      const art=page.locator('.artwork').nth(i);
      await page.locator('.chapter-dot').nth(i).click();
      await page.waitForTimeout(1600);
      const artPosition=await art.boundingBox();
      await page.mouse.wheel(0,Math.max(0,artPosition.y-viewport.height*.15));
      await page.waitForTimeout(1600);
      const metrics=await page.evaluate((i)=> {
        const figure=document.querySelectorAll('.artwork')[i];const mask=figure.querySelector('.hatch');
        const guide=document.querySelector('.narrator').getBoundingClientRect();
        return {chapter:i,guide:{x:guide.x,y:guide.y,width:guide.width,height:guide.height},offset:parseFloat(getComputedStyle(mask).strokeDashoffset),length:mask.getTotalLength()};
      },i);
      assert.ok(metrics.guide.y>-metrics.guide.height&&metrics.guide.y<viewport.height,`guide left ${viewport.name} viewport in chapter ${i}`);
      assert.ok(metrics.offset<metrics.length,`chapter ${i} was not drawn: ${JSON.stringify(metrics)}`);
      if(i===0)await page.screenshot({path:`.impeccable/review/${viewport.name}-story.png`});
      report.checks.push({viewport:viewport.name,...metrics});
    }
    await page.getByRole('button',{name:'English',exact:true}).click();
    assert.equal(await page.locator('html').getAttribute('lang'),'en');
    assert.equal(await page.locator('#heading-renaissance').textContent(),'Drawing to understand.');
    await page.reload({waitUntil:'networkidle'});
    await page.locator('.paper-intro').waitFor({state:'hidden',timeout:9000});
    assert.equal(await page.locator('html').getAttribute('lang'),'en');
    await page.getByRole('button',{name:'Español',exact:true}).click();
    const add=page.locator('.add-line');await add.scrollIntoViewIfNeeded();
    await add.click();
    assert.equal(await page.locator('.save-drawing').isEnabled(),true);
    const [download]=await Promise.all([page.waitForEvent('download'),page.locator('.save-drawing').click()]);
    assert.equal(download.suggestedFilename(),'mi-trazo.png');
    await page.locator('.clear-drawing').click();
    assert.equal(await page.locator('.save-drawing').isEnabled(),false);
    const canvas=page.locator('#drawing');const box=await canvas.boundingBox();
    await page.mouse.move(box.x+40,box.y+80);await page.mouse.down();await page.mouse.move(box.x+box.width-35,box.y+box.height-60,{steps:16});await page.mouse.up();
    assert.equal(await page.locator('.save-drawing').isEnabled(),true);
    await page.waitForTimeout(200);
    await page.screenshot({path:`.impeccable/review/${viewport.name}-closing.png`});
    await page.getByRole('button',{name:'Reducir movimiento',exact:true}).click();
    assert.equal(await page.locator('html').evaluate(el=>el.classList.contains('motion-reduced')),true);
    await page.evaluate(()=>window.scrollTo({top:0,behavior:'instant'}));
    await page.screenshot({path:`.impeccable/review/${viewport.name}-full.png`,fullPage:true});
    report.viewports.push({name:viewport.name,width:viewport.width,height:viewport.height,documentHeight:await page.evaluate(()=>document.documentElement.scrollHeight),overflow:width.scroll-width.inner});
    await context.close();
  }
  const reduce=await browser.newContext({viewport:{width:390,height:844},reducedMotion:'reduce'});
  const page=await reduce.newPage();page.on('pageerror',e=>report.errors.push(e.message));
  await page.goto('http://127.0.0.1:5173/',{waitUntil:'networkidle'});
  assert.equal(await page.locator('.paper-intro').isVisible(),false);
  assert.equal(await page.locator('html').evaluate(el=>el.classList.contains('motion-reduced')),true);
  await reduce.close();report.checks.push('System reduced-motion preference respected');

  const introContext=await browser.newContext({viewport:{width:1280,height:900}});
  const intro=await introContext.newPage();intro.on('pageerror',e=>report.errors.push(e.message));
  await intro.goto('http://127.0.0.1:5173/',{waitUntil:'domcontentloaded'});
  await intro.locator('.paper-intro').waitFor({state:'visible'});
  await intro.waitForTimeout(650);
  await intro.screenshot({path:'.impeccable/review/paper-intro.png'});
  await intro.locator('.paper-intro').waitFor({state:'hidden',timeout:9000});
  assert.equal(await intro.locator('main').evaluate(el=>el.inert),false);
  assert.equal(await intro.locator('body').evaluate(el=>el.classList.contains('intro-playing')),false);
  report.checks.push('Paper intro completes and releases navigation');
  await intro.locator('.replay-intro').scrollIntoViewIfNeeded();await intro.locator('.replay-intro').click();
  await intro.locator('.skip-intro').click();
  await intro.locator('.paper-intro').waitFor({state:'hidden'});
  report.checks.push('Paper intro can be replayed and skipped');
  await introContext.close();
  assert.deepEqual(report.errors,[],'Browser runtime errors');
  await writeFile('.impeccable/review/verification.json',JSON.stringify(report,null,2));
  console.log(JSON.stringify(report,null,2));
} finally {await browser.close();}
