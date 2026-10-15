import { chromium } from '@playwright/test';
import { readFile,writeFile } from 'node:fs/promises';
import assert from 'node:assert/strict';
const browser=await chromium.launch({executablePath:process.env.CHROME_PATH??'C:/Program Files/Google/Chrome/Application/chrome.exe',headless:true});
const results=[];
try {
  for(const viewport of [{name:'desktop',width:1536,height:1024},{name:'mobile',width:390,height:844}]) {
    const page=await browser.newPage({viewport:{width:viewport.width,height:viewport.height},reducedMotion:'reduce',acceptDownloads:true});
    await page.goto('http://127.0.0.1:5173/?review=1',{waitUntil:'load'});
    await page.evaluate(()=>document.fonts.ready);
    await page.locator('.add-line').click();
    const rect=await page.locator('#drawing').boundingBox();
    const [download]=await Promise.all([page.waitForEvent('download'),page.locator('.save-drawing').click()]);
    const bytes=await readFile(await download.path());
    const width=bytes.readUInt32BE(16),height=bytes.readUInt32BE(20);
    assert.ok(Math.abs(height/width-rect.height/rect.width)<.001,`${viewport.name} export distorts drawing proportions`);
    const canvas=page.locator('#drawing');
    await page.locator('.clear-drawing').click();
    const box=await canvas.boundingBox();
    await page.mouse.move(box.x+box.width*.65,box.y+box.height*.5);await page.mouse.down();
    for(let step=1;step<=40;step++) {const angle=step/40*Math.PI*2;await page.mouse.move(box.x+box.width*.5+Math.cos(angle)*box.width*.15,box.y+box.height*.5+Math.sin(angle)*box.width*.15);}
    await page.mouse.up();await page.waitForTimeout(200);
    await page.screenshot({path:`.impeccable/review/${viewport.name}-closing.png`});
    results.push({viewport:viewport.name,visibleRatio:rect.width/rect.height,export:{width,height},matched:true});
    await page.close();
  }
  await writeFile('.impeccable/review/export-verification.json',JSON.stringify(results,null,2));
  console.log(JSON.stringify(results));
}finally{await browser.close();}
