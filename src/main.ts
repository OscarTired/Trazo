import '@fontsource/antic-didone/latin-400.css';
import '@fontsource/dm-sans/latin-400.css';
import '@fontsource/dm-sans/latin-500.css';
import '@fontsource/caveat/latin-400.css';
import './style.css';
import gsap from 'gsap';
import { chapterIds, content, type Language } from './content';
import { closingMarkup, footerMarkup, renderStory } from './story';
import { initDrawing } from './drawing';
import { createMotion } from './motion';
import { assetUrl } from './assets';

const getPreference=(key:string)=> {try{return localStorage.getItem(key);}catch{return null;}};
const savePreference=(key:string,value:string)=> {try{localStorage.setItem(key,value);}catch{/* Storage is optional. */}};
const requestedLanguage=new URLSearchParams(location.search).get('lang');
let language:Language=requestedLanguage==='en'||requestedLanguage==='es'?requestedLanguage:getPreference('trazo-language')==='en'?'en':'es';
const systemMotion=window.matchMedia('(prefers-reduced-motion: reduce)');
let motionPreference=getPreference('trazo-reduced-motion');
let reduced=motionPreference===null?systemMotion.matches:motionPreference==='true';
let motion:ReturnType<typeof createMotion>|undefined;
let introRunning=false;
let finishIntro:(()=>void)|undefined;
const main=document.querySelector<HTMLElement>('main')!;
const hero=document.querySelector<HTMLElement>('.hero')!;
main.insertAdjacentElement('beforebegin',document.querySelector('.language')!);

hero.insertAdjacentHTML('afterend','<div class="story-container"></div>'+closingMarkup());
main.insertAdjacentHTML('afterbegin','<svg class="thread-route" aria-hidden="true"><path class="thread-under"/><path class="thread-ink"/></svg>');
document.querySelector('.narrator')!.insertAdjacentHTML('beforeend','<span class="guide-speech"></span>');
main.insertAdjacentHTML('afterend',footerMarkup());
document.body.insertAdjacentHTML('beforeend','<div class="page-progress" aria-hidden="true"></div><button type="button" class="motion-toggle"></button>');
document.body.insertAdjacentHTML('beforeend','<div class="paper-intro" hidden role="status" aria-live="polite"><div class="paper-fallback" aria-hidden="true"></div><span class="intro-wordmark" aria-hidden="true">trazo.</span><div class="intro-caption"><p data-ui="loading"></p><div class="loading-track" aria-hidden="true"><span></span></div></div><button type="button" class="skip-intro" data-ui="skipIntro"></button></div>');

function updateMotionButton() {
  const c=content[language], label=reduced?c.resume:c.pause;
  const button=document.querySelector<HTMLButtonElement>('.motion-toggle')!;
  button.innerHTML=`<svg class="icon" viewBox="0 0 24 24" aria-hidden="true"><path d="${reduced?'m8 5 11 7-11 7Z':'M8 5v14M16 5v14'}"/></svg><span>${label}</span>`;
  button.setAttribute('aria-label',label);button.setAttribute('title',label);button.setAttribute('aria-pressed',String(reduced));
  document.documentElement.classList.toggle('motion-reduced',reduced);
}

function updateLanguage(initial=false) {
  const c=content[language];
  const current=document.querySelector('.chapter-dot[aria-current="step"]')?.getAttribute('href')?.slice(1);
  const previous=document.getElementById(current??'origins');
  const previousTop=previous?.getBoundingClientRect().top;
  const shouldAnchor=!initial&&window.scrollY>hero.offsetHeight;
  motion?.destroy();
  document.documentElement.lang=language;document.title=c.pageTitle;
  document.querySelector('meta[name="description"]')!.setAttribute('content',c.description);
  document.querySelector('.hero-title')!.innerHTML=`<span class="title-line">${c.title[0]}</span><span class="title-line">${c.title[1]}</span><span class="title-line">${c.title[2]} <em>${c.titleAccent}</em></span>`;
  document.querySelector('.hero-intro')!.innerHTML=`${c.intro[0]}<br /> ${c.intro[1]}`;
  document.querySelector('.hero-annotation')!.textContent=c.annotation;
  document.querySelector('.hero-cta')!.firstChild!.textContent=c.follow+' ';
  document.querySelector('.hero-footnote > span:first-child')!.textContent=c.first;
  document.querySelector('.hero-footnote .date')!.textContent=c.firstDate;
  document.querySelector('.nav-story')!.textContent=c.history;document.querySelector('.nav-journey')!.textContent=c.journey;
  document.querySelector('.masthead nav')!.setAttribute('aria-label',c.navigation);
  document.querySelector('.wordmark')!.setAttribute('aria-label',c.home);
  document.querySelector('.language')!.setAttribute('aria-label',c.language);
  document.querySelector('.skip-link')!.textContent=c.skip;
  document.querySelectorAll<HTMLButtonElement>('[data-lang]').forEach(button=>button.setAttribute('aria-pressed',String(button.dataset.lang===language)));
  document.querySelector('.story-container')!.innerHTML=renderStory(language);
  const rail=document.querySelector('.chapter-rail')!;rail.setAttribute('aria-label',c.chapterNav);
  rail.innerHTML=c.chapters.map((chapter,i)=>`<a class="chapter-dot" href="#${chapterIds[i]}" aria-label="${chapter.name}"><span>${chapter.name}</span></a>`).join('');
  document.querySelectorAll<HTMLElement>('[data-ui]').forEach(element=> {const value=c[element.dataset.ui as keyof typeof c];if(typeof value==='string')element.textContent=value;});
  document.querySelector('#drawing')!.setAttribute('aria-label',c.canvasLabel);
  document.querySelector('.graphite')!.setAttribute('aria-label',c.graphite);
  document.querySelector('.red-pencil')!.setAttribute('aria-label',c.redPencil);
  document.querySelector('.pencil-colors')!.setAttribute('aria-label',language==='es'?'Color del lápiz':'Pencil color');
  updateMotionButton();
  if(shouldAnchor&&previousTop!==undefined) {const target=document.getElementById(current??'origins')!;window.scrollBy({top:target.getBoundingClientRect().top-previousTop,behavior:'instant'});}
  motion=createMotion(reduced,()=>language);
  if(introRunning)motion.stop();
}

updateLanguage(true);
initDrawing(()=>language);
document.querySelectorAll<HTMLButtonElement>('[data-lang]').forEach(button=>button.addEventListener('click',()=> {
  const next=button.dataset.lang as Language;if(next===language)return;
  language=next;savePreference('trazo-language',language);updateLanguage();
}));
document.querySelector('.motion-toggle')!.addEventListener('click',()=> {
  reduced=!reduced;motionPreference=String(reduced);savePreference('trazo-reduced-motion',motionPreference);
  finishIntro?.();motion?.destroy();updateMotionButton();motion=createMotion(reduced,()=>language);
});
systemMotion.addEventListener('change',()=> {
  if(motionPreference!==null)return;
  reduced=systemMotion.matches;if(reduced)finishIntro?.();motion?.destroy();updateMotionButton();motion=createMotion(reduced,()=>language);
});

document.addEventListener('click',event=> {
  const anchor=(event.target as Element).closest<HTMLAnchorElement>('a[href^="#"]');
  if(!anchor||event.defaultPrevented)return;
  const id=anchor.getAttribute('href')!.slice(1),target=document.getElementById(id);
  if(!target)return;
  event.preventDefault();motion?.scrollTo(target,event.detail===0||reduced);
  history.replaceState(null,'',`#${id}`);
  if(event.detail===0) {target.setAttribute('tabindex','-1');target.focus({preventScroll:true});}
});

let resizeTimer=0;
let lastWidth=window.innerWidth,lastHeight=main.offsetHeight;
const observer=new ResizeObserver(()=> {
  if(window.innerWidth===lastWidth&&main.offsetHeight===lastHeight)return;
  window.clearTimeout(resizeTimer);
  resizeTimer=window.setTimeout(()=> {lastWidth=window.innerWidth;lastHeight=main.offsetHeight;motion?.destroy();motion=createMotion(reduced,()=>language);if(introRunning)motion.stop();},180);
});
observer.observe(main);
document.fonts.ready.then(()=> {motion?.destroy();motion=createMotion(reduced,()=>language);if(introRunning)motion.stop();});

async function runIntro() {
  if(introRunning)return;
  const stage=document.querySelector<HTMLElement>('.paper-intro')!;
  const siteElements=[main,document.querySelector<HTMLElement>('.language')!,document.querySelector<HTMLElement>('.footer')!,document.querySelector<HTMLElement>('.chapter-rail')!,document.querySelector<HTMLElement>('.motion-toggle')!];
  introRunning=true;motion?.stop();
  stage.hidden=false;stage.style.opacity='1';stage.style.visibility='visible';stage.style.backgroundColor='var(--paper)';
  stage.querySelector<HTMLElement>('.paper-fallback')!.hidden=false;
  gsap.set(stage.querySelectorAll('.intro-caption,.intro-wordmark,.skip-intro'),{autoAlpha:1});
  document.body.classList.add('intro-playing');siteElements.forEach(element=>element.inert=true);
  let disposed=false,controller:Awaited<ReturnType<typeof import('./paper-intro').createPaperIntro>>|undefined;
  const finish=()=> {
    if(disposed)return;disposed=true;
    const moveFocus=stage.contains(document.activeElement);
    controller?.dispose();stage.hidden=true;document.body.dataset.ready='true';document.body.classList.remove('intro-playing');siteElements.forEach(element=>element.inert=false);introRunning=false;finishIntro=undefined;motion?.start();window.clearTimeout(timeout);
    // Resolve the fragment after fonts and images settle, including on a hard reload.
    const target=document.getElementById(location.hash.slice(1));
    if(target)motion?.scrollTo(target,true);
    if(moveFocus)document.querySelector<HTMLAnchorElement>('.hero-cta')!.focus({preventScroll:true});
  };
  finishIntro=finish;
  const timeout=window.setTimeout(finish,6500);
  const skip=stage.querySelector<HTMLButtonElement>('.skip-intro')!;
  skip.onclick=finish;
  const loadImage=(src:string)=>new Promise<void>(resolve=> {const img=new Image();img.onload=()=>{img.decode().catch(()=>{}).finally(resolve);};img.onerror=()=>resolve();img.src=src;});
  let loaded=0;
  const loads=['paper.webp','history-art.webp','chapters.webp'].map(filename=>loadImage(assetUrl(filename)).then(()=> {loaded++;gsap.to(stage.querySelector('.loading-track span'),{scaleX:loaded/3,duration:.2,ease:'none',overwrite:true});}));
  const paper=import('./paper-intro').then(module=>module.createPaperIntro(stage)).then(value=> {controller=value;if(disposed)value.dispose();else stage.querySelector<HTMLElement>('.paper-fallback')!.hidden=true;}).catch(()=>{/* A real paper-texture fallback remains visible when WebGL is unavailable. */});
  try {
    await Promise.allSettled([...loads,paper,document.fonts.ready,new Promise(resolve=>window.setTimeout(resolve,350))]);
    if(disposed)return;
    stage.querySelector('.intro-caption p')!.textContent=content[language].opening;
    if(controller)await controller.reveal();
    else await new Promise<void>(resolve=> {gsap.timeline({onComplete:resolve}).to(stage.querySelector('.paper-fallback'),{rotation:18,scale:.95,yPercent:70,autoAlpha:0,duration:.7,ease:'power3.inOut'}).to(stage,{autoAlpha:0,duration:.2});});
  } finally {finish();}
}

document.querySelector('.replay-intro')!.addEventListener('click',()=> {
  motion?.scrollTo(hero,true);history.replaceState(null,'','#inicio');
  if(reduced) {document.querySelector<HTMLAnchorElement>('.hero-cta')!.focus({preventScroll:true});return;}
  void runIntro();
});

const isReview=new URLSearchParams(location.search).has('review');
if(!reduced&&!isReview)void runIntro();
else document.body.dataset.ready='true';
window.addEventListener('pagehide',()=> {finishIntro?.();});

if(import.meta.hot)import.meta.hot.dispose(()=> {finishIntro?.();motion?.destroy();observer.disconnect();window.clearTimeout(resizeTimer);});
