import gsap from 'gsap';
import { ScrollTrigger } from 'gsap/ScrollTrigger';
import { MotionPathPlugin } from 'gsap/MotionPathPlugin';
import Lenis from 'lenis';
import 'lenis/dist/lenis.css';
import { chapterIds, content, type Language } from './content';
import { drawNarrator } from './narrator';
import { indexRoute, measurePolyline } from './geometry';

gsap.registerPlugin(ScrollTrigger, MotionPathPlugin);

type Point = {x: number; y: number};
function smoothPath(points: Point[]) {
  let d = `M${points[0].x} ${points[0].y}`;
  for (let i=0; i<points.length-1; i++) {
    const p = points[i], next = points[i+1], prev = points[Math.max(0,i-1)], after = points[Math.min(points.length-1,i+2)];
    const c1 = {x:p.x+(next.x-prev.x)/6, y:Math.min(next.y,p.y+(next.y-prev.y)/6)};
    const c2 = {x:next.x-(after.x-p.x)/6,y:Math.max(p.y,next.y-(after.y-p.y)/6)};
    d += ` C${c1.x} ${c1.y},${c2.x} ${c2.y},${next.x} ${next.y}`;
  }
  return d;
}

export function createMotion(reduced: boolean, getLanguage: () => Language) {
  const main = document.querySelector<HTMLElement>('main')!;
  const hero = document.querySelector<HTMLElement>('.hero')!;
  const narrator = document.querySelector<HTMLElement>('.narrator')!;
  const narratorCanvas = narrator.querySelector<HTMLCanvasElement>('canvas')!;
  const speech = narrator.querySelector<HTMLElement>('.guide-speech')!;
  const route = document.querySelector<SVGSVGElement>('.thread-route')!;
  const path = document.querySelector<SVGPathElement>('.thread-ink')!;
  const under = document.querySelector<SVGPathElement>('.thread-under')!;
  const progress = document.querySelector<HTMLElement>('.page-progress')!;
  const sections = chapterIds.map(id=>document.getElementById(id)!);
  const dots = document.querySelectorAll('.chapter-dot');
  const w = main.clientWidth, heroHeight = hero.offsetHeight, mobile = w<=760;
  const localY = (el: Element)=>el.getBoundingClientRect().top-main.getBoundingClientRect().top;
  const start = {x:w*(mobile?.14:.147),y:heroHeight*(mobile?.68:.365)};
  const lastY = localY(document.querySelector('.closing')!)+65;
  const points: Point[] = [start];
  if (!mobile) points.push({x:w*.25,y:heroHeight*.53},{x:w*.31,y:heroHeight*.71},{x:w*.76,y:heroHeight*.9});
  else points.push({x:w*.38,y:heroHeight*.81},{x:w*.91,y:heroHeight*.94});
  points.push({x:w*.93,y:localY(document.querySelector('.journey')!)+80});
  sections.forEach((section,i)=> {
    const y = localY(section), h = section.offsetHeight;
    const x = w*(mobile?.93:i%2?.065:.935);
    points.push({x,y:y+60},{x:x+(mobile?-5:(i%2?10:-10)),y:y+h*.55},{x,y:y+h-65});
  });
  points.push({x:w*(mobile?.93:.5),y:lastY});
  const d = smoothPath(points);
  route.setAttribute('viewBox',`0 0 ${w} ${lastY+80}`); route.style.height=`${lastY+80}px`;
  path.setAttribute('d',d); under.setAttribute('d',d);
  const pathLength = path.getTotalLength();
  const rawPath = MotionPathPlugin.cacheRawPathMeasurements(MotionPathPlugin.getRawPath(d), 20);
  const positionAtY = indexRoute(p => MotionPathPlugin.getPositionOnPath(rawPath, p));
  const narratorWidth = narrator.offsetWidth, narratorHeight = narrator.offsetHeight;
  let sectionTops: number[] = [], viewportHeight = window.innerHeight, maxScroll = 1;
  const measure = () => {
    const mainTop = main.getBoundingClientRect().top + window.scrollY;
    sectionTops = sections.map(section => section.getBoundingClientRect().top + window.scrollY - mainTop);
    viewportHeight = window.innerHeight;
    maxScroll = Math.max(1, document.documentElement.scrollHeight - viewportHeight);
  };
  measure();
  let lenis: Lenis | undefined;
  let activeChapter = -1, oldScroll = -1, lastRenderedScroll = -1, previousX = start.x, facing = 1;
  const context = gsap.context(()=> {
    gsap.set(narrator,{x:start.x-narrator.offsetWidth/2,y:start.y-narrator.offsetHeight});
    drawNarrator(narratorCanvas);
    if (!reduced) {
      path.style.strokeDasharray = `${pathLength}`;
      path.style.strokeDashoffset = `${pathLength}`;
      const masks = new Map<string, ReturnType<typeof measurePolyline>>();
      document.querySelectorAll<HTMLElement>('.artwork').forEach(art=> {
        const hatch = art.querySelector<SVGPathElement>('.hatch')!;
        const tip = art.querySelector<SVGCircleElement>('.pencil-point')!;
        const maskPath = hatch.getAttribute('d')!;
        const geometry = masks.get(maskPath) ?? measurePolyline(maskPath);
        masks.set(maskPath, geometry);
        const length = geometry.length;
        hatch.style.strokeDasharray = `${length}`;
        let draw:gsap.core.Tween|undefined;
        draw = gsap.fromTo(hatch,{strokeDashoffset:length},{strokeDashoffset:0,ease:'none',duration:1,scrollTrigger:{trigger:art,start:'top 88%',end:'bottom 55%',scrub:.65,invalidateOnRefresh:true},onUpdate:()=> {
          if(!draw)return;
          const p=draw.progress();
          const point=geometry.at(p);
          tip.setAttribute('cx',String(point.x)); tip.setAttribute('cy',String(point.y));
          tip.style.opacity=p>.01&&p<.985?'1':'0';
        }});
      });
    } else {
      gsap.set(path,{strokeDashoffset:0,opacity:.2});
      document.querySelectorAll<SVGPathElement>('.hatch').forEach(hatch=> {hatch.style.strokeDasharray='none'; hatch.style.strokeDashoffset='0';});
    }

    const setX = gsap.quickSetter(narrator, 'x', 'px');
    const setY = gsap.quickSetter(narrator, 'y', 'px');
    const update = () => {
      const scroll = window.scrollY;
      if (scroll === lastRenderedScroll) return;
      lastRenderedScroll = scroll;
      progress.style.transform=`scaleX(${scroll/maxScroll})`;
      document.body.classList.toggle('is-reading',scroll>heroHeight*.8);
      let chapter=0;
      sectionTops.forEach((top,i)=> {if(top<scroll+viewportHeight*.5) chapter=i;});
      if(chapter!==activeChapter) {
        activeChapter=chapter;
        dots.forEach((dot,i)=> {if(i===chapter)dot.setAttribute('aria-current','step'); else dot.removeAttribute('aria-current');});
        speech.textContent=content[getLanguage()].chapters[chapter].speech;
      }
      if(reduced) return;
      const desiredY=Math.min(lastY,start.y+scroll);
      const point=positionAtY(desiredY);
      setX(point.x-narratorWidth/2);setY(point.y-narratorHeight);
      path.style.strokeDashoffset=`${pathLength*(1-point.progress)}`;
      narrator.classList.toggle('is-left',point.x<w*.5);
      narrator.classList.toggle('guide-active',scroll>sectionTops[0]-viewportHeight*.55 && scroll<lastY-viewportHeight*.4);
      if(Math.abs(scroll-oldScroll)>.2) {
        if(Math.abs(point.x-previousX)>1) facing=point.x>previousX?1:-1;
        drawNarrator(narratorCanvas,scroll*.035,facing);
        previousX=point.x; oldScroll=scroll;
      }
    };
    ScrollTrigger.create({trigger:main,start:0,end:'max',onUpdate:update,onRefresh:()=>{measure();lastRenderedScroll=-1;update();}});
    update();
  });
  let ticking=false, destroyed=false, clock=1, previousTime:number|undefined;
  const sleep=()=> {gsap.ticker.remove(tick);ticking=false;previousTime=undefined;};
  const tick=(time:number)=> {
    if(!lenis||lenis.isStopped||document.hidden){sleep();return;}
    // Keep a local clock so waking after an idle period does not jump to the destination.
    if(previousTime!==undefined)clock+=(time-previousTime)*1000;
    previousTime=time;
    lenis.raf(clock);
    if(lenis.isScrolling!=='smooth')sleep();
  };
  const wake=()=> {
    if(!destroyed&&!ticking&&lenis?.isScrolling==='smooth'&&!document.hidden){ticking=true;gsap.ticker.add(tick);}
  };
  const onVirtualScroll=()=> {queueMicrotask(wake);};
  const onScroll=()=> {ScrollTrigger.update();wake();};
  const onVisibility=()=> {if(document.hidden)sleep();else wake();};
  if(!reduced) {
    lenis=new Lenis({autoRaf:false,duration:1.2,anchors:false,syncTouch:false});
    lenis.on('scroll',onScroll);
    lenis.on('virtual-scroll',onVirtualScroll);
    document.addEventListener('visibilitychange',onVisibility);
  }
  ScrollTrigger.refresh();
  return {
    scrollTo(element: HTMLElement, immediate=false) {
      const target=element.getBoundingClientRect().top+window.scrollY-24;
      if(lenis){lenis.scrollTo(target,{immediate});wake();}else window.scrollTo({top:target,behavior:'instant'});
    },
    stop(){lenis?.stop();sleep();},start(){lenis?.start();},
    destroy(){destroyed=true;sleep();context.revert();lenis?.destroy();document.removeEventListener('visibilitychange',onVisibility);narrator.classList.remove('guide-active');},
  };
}
