import { chromium } from '@playwright/test';
import { mkdir, writeFile } from 'node:fs/promises';

const label=process.argv[2]??'current';
await mkdir('.impeccable/review',{recursive:true});
const browser=await chromium.launch({executablePath:process.env.CHROME_PATH??'C:/Program Files/Google/Chrome/Application/chrome.exe',headless:true});
try {
  const browserSession=await browser.newBrowserCDPSession();
  const page=await browser.newPage({viewport:{width:1536,height:1024}});
  const errors=[];page.on('pageerror',e=>errors.push(e.message));
  await page.addInitScript(()=> {
    window.__geometryCalls={path:0,rect:0};
    const point=SVGPathElement.prototype.getPointAtLength;
    SVGPathElement.prototype.getPointAtLength=function(...args){window.__geometryCalls.path++;return point.apply(this,args);};
    const rect=Element.prototype.getBoundingClientRect;
    Element.prototype.getBoundingClientRect=function(...args){window.__geometryCalls.rect++;return rect.apply(this,args);};
  });
  await page.goto('http://127.0.0.1:5173/?review=1',{waitUntil:'load'});
  await page.evaluate(()=>document.fonts.ready);await page.waitForTimeout(1200);
  const session=await page.context().newCDPSession(page);await session.send('Performance.enable');
  const snapshot=async()=> {
    const {metrics}=await session.send('Performance.getMetrics');
    const processes=await browserSession.send('SystemInfo.getProcessInfo');
    return {metrics:Object.fromEntries(metrics.map(x=>[x.name,x.value])),cpu:processes.processInfo.reduce((sum,p)=>sum+p.cpuTime,0),calls:await page.evaluate(()=>({...window.__geometryCalls}))};
  };
  const phases=[];
  for(const phase of ['scroll','idle']) {
    const before=await snapshot();const start=performance.now();
    if(phase==='scroll') {for(let i=0;i<80;i++){await page.mouse.wheel(0,80);await page.waitForTimeout(65);}}
    else await page.waitForTimeout(2500);
    const elapsedMs=performance.now()-start,after=await snapshot();
    const duration={};
    for(const key of ['TaskDuration','ScriptDuration','LayoutDuration','RecalcStyleDuration'])duration[key]=Math.round((after.metrics[key]-before.metrics[key])*1000);
    phases.push({phase,elapsedMs:Math.round(elapsedMs),browserCpuMs:Math.round((after.cpu-before.cpu)*1000),...duration,geometryCalls:{path:after.calls.path-before.calls.path,rect:after.calls.rect-before.calls.rect}});
  }
  const result={label,viewport:{width:1536,height:1024},phases,errors};
  await writeFile(`.impeccable/review/perf-${label}.json`,JSON.stringify(result,null,2));console.log(JSON.stringify(result));
}finally{await browser.close();}
