import { chromium } from '@playwright/test';
import { writeFile } from 'node:fs/promises';
import assert from 'node:assert/strict';
const browser=await chromium.launch({executablePath:process.env.CHROME_PATH??'C:/Program Files/Google/Chrome/Application/chrome.exe',headless:true});
const results=[];
try {
  for(const width of [320,390,540,760,768,1024,1536]) {
    const page=await browser.newPage({viewport:{width,height:width===390?844:1024},reducedMotion:'reduce'});
    for(const language of ['es','en']) {
      await page.goto(`http://127.0.0.1:5173/?review=1&lang=${language}`,{waitUntil:'load'});
      await page.evaluate(()=>document.fonts.ready);await page.waitForTimeout(200);
      const layout=await page.evaluate(()=> {const h=document.querySelector('.hero-title').getBoundingClientRect(),p=document.querySelector('.hero-intro').getBoundingClientRect();return{titleBottom:h.bottom,introTop:p.top,overflow:document.documentElement.scrollWidth-innerWidth};});
      assert.ok(layout.titleBottom<=layout.introTop,`Overlapping hero text at ${width}px ${language}`);
      assert.ok(layout.overflow<=0,`Overflow at ${width}px ${language}`);
      results.push({width,language,...layout});
      if(width===760&&language==='es')await page.screenshot({path:'.impeccable/review/tablet.png'});
      if([390,1536].includes(width)&&language==='en')await page.screenshot({path:`.impeccable/review/${width===390?'mobile':'desktop'}-english.png`});
      if([390,1536].includes(width)&&language==='es')await page.screenshot({path:`.impeccable/review/${width===390?'mobile':'desktop'}-full.png`,fullPage:true});
    }
    await page.close();
  }
  await writeFile('.impeccable/review/responsive.json',JSON.stringify(results,null,2));
  console.log(`14 responsive/language combinations passed (${results.map(r=>`${r.width}:${r.language}`).join(', ')}).`);
} finally {await browser.close();}
