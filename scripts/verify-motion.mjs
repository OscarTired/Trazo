import { chromium } from '@playwright/test';
import assert from 'node:assert/strict';
import { writeFile } from 'node:fs/promises';

const browser=await chromium.launch({executablePath:process.env.CHROME_PATH??'C:/Program Files/Google/Chrome/Application/chrome.exe',headless:true});
const report={checks:[],errors:[]};
try {
  for(const viewport of [{width:1536,height:1024},{width:390,height:844}]) {
    const context=await browser.newContext({viewport});
    const page=await context.newPage();page.on('pageerror',e=>report.errors.push(e.message));
    for(const hash of ['inicio','modern']) {
      await page.goto('about:blank');
      await page.goto(`http://127.0.0.1:5173/#${hash}`,{waitUntil:'domcontentloaded'});
      // Check both opening a fragment URL and actually reloading it.
      for(let reload=0;reload<2;reload++) {
        if(reload)await page.reload({waitUntil:'domcontentloaded'});
        await page.locator('.paper-intro').waitFor({state:'visible'});
        await page.locator('.paper-intro-canvas').waitFor({state:'visible',timeout:6500});
        if(hash==='modern')await page.locator('.skip-intro').click();
        await page.locator('.paper-intro').waitFor({state:'hidden',timeout:9000});
        await page.waitForTimeout(100);
        const top=await page.locator(`#${hash}`).evaluate(el=>el.getBoundingClientRect().top);
        assert.ok(Math.abs(top-(hash==='inicio'?0:24))<3,`${hash} anchor lost: ${top}`);
        assert.equal(await page.locator('main').evaluate(el=>el.inert),false);
        assert.equal(await page.locator('.paper-intro-canvas').count(),0,'WebGL canvas must be disposed');
        report.checks.push({viewport,hash,reload:!!reload,top});
      }
    }
    await page.goto('http://127.0.0.1:5173/?review=1',{waitUntil:'networkidle'});
    await page.evaluate(()=>document.fonts.ready);
    for(const index of [0,3,5]) {
      // Each navigation wakes Lenis after it has finished the previous animation.
      await page.locator('.chapter-dot').nth(index).click();await page.waitForTimeout(1800);
      const geometry=await page.evaluate(()=> {
        const path=document.querySelector('.thread-ink');
        const length=path.getTotalLength();
        const p=1-parseFloat(path.style.strokeDashoffset)/length;
        const point=path.getPointAtLength(p*length);
        const guide=document.querySelector('.narrator').getBoundingClientRect();
        const route=document.querySelector('.thread-route').getBoundingClientRect();
        return {error:Math.hypot(point.x+route.x-(guide.x+guide.width/2),point.y+route.y-(guide.y+guide.height)),scroll:scrollY};
      });
      assert.ok(geometry.error<3,`Cached route diverged: ${JSON.stringify(geometry)}`);
      const before=geometry.scroll;
      await page.mouse.wheel(0,170);await page.waitForTimeout(1600);
      assert.ok(await page.evaluate(()=>scrollY)>before+100,'Wheel must wake Lenis after idle');
      report.checks.push({viewport,index,...geometry});
    }
    await page.getByRole('button',{name:'Reducir movimiento',exact:true}).click();
    await page.reload({waitUntil:'networkidle'});
    assert.equal(await page.locator('.paper-intro').isVisible(),false,'Reduced motion skips intro even with a fragment');
    await context.close();
  }
  assert.deepEqual(report.errors,[]);
  await writeFile('.impeccable/review/motion-regression.json',JSON.stringify(report,null,2));
  console.log(JSON.stringify(report));
} finally {await browser.close();}
