import * as THREE from 'three';
import gsap from 'gsap';
import { assetUrl } from './assets';

/** A real folded mesh. UVs stay on the paper while its vertices unfold and crumple again. */
export async function createPaperIntro(stage: HTMLElement) {
  const renderer = new THREE.WebGLRenderer({alpha:true,antialias:true,powerPreference:'low-power'});
  renderer.setPixelRatio(Math.min(window.devicePixelRatio,1.5));
  renderer.setSize(window.innerWidth,window.innerHeight);
  renderer.setClearColor(0,0);
  renderer.shadowMap.enabled=true;renderer.shadowMap.type=THREE.PCFSoftShadowMap;
  renderer.domElement.className='paper-intro-canvas';
  stage.prepend(renderer.domElement);
  const aspect=window.innerWidth/window.innerHeight;
  const scene=new THREE.Scene();
  const camera=new THREE.OrthographicCamera(-aspect,aspect,1,-1,.1,30);
  camera.position.set(0,0,8);
  scene.add(new THREE.AmbientLight(0xffffff,.85));
  const key=new THREE.DirectionalLight(0xfff4e2,2.7); key.position.set(-3,4,6);key.castShadow=true;key.shadow.mapSize.set(1024,1024);key.shadow.camera.left=-1;key.shadow.camera.right=1;key.shadow.camera.top=1;key.shadow.camera.bottom=-1;key.shadow.normalBias=.015;scene.add(key);
  const fill=new THREE.DirectionalLight(0xe5e6ec,.75); fill.position.set(4,-2,3);scene.add(fill);
  const texture=await new THREE.TextureLoader().loadAsync(assetUrl('paper.webp'));
  texture.colorSpace=THREE.SRGBColorSpace;
  const geometry=new THREE.PlaneGeometry(aspect*2.12,2.12,46,36).toNonIndexed();
  const positions=geometry.attributes.position as THREE.BufferAttribute;
  const uv=geometry.attributes.uv as THREE.BufferAttribute;
  const flat=new Float32Array(positions.array);
  const folded=new Float32Array(flat.length);
  for(let i=0;i<positions.count;i++) {
    const u=uv.getX(i),v=uv.getY(i),theta=u*Math.PI*2+.15*Math.sin(v*14)*Math.sin(u*12),phi=v*Math.PI+.08*Math.sin(u*18)*Math.sin(v*Math.PI);
    const crease=Math.sin(u*25+v*13)*Math.sin(v*28-u*11);
    const radius=.36+.025*crease+.018*Math.sin(u*19-v*23);
    folded[i*3]=Math.sin(phi)*Math.cos(theta)*radius;
    folded[i*3+1]=Math.cos(phi)*radius;
    folded[i*3+2]=Math.sin(phi)*Math.sin(theta)*radius+.012*crease;
  }
  const material=new THREE.MeshStandardMaterial({map:texture,color:0xf5f0e7,roughness:1,metalness:0,side:THREE.DoubleSide,flatShading:true});
  const paper=new THREE.Mesh(geometry,material);scene.add(paper);
  paper.castShadow=true;paper.receiveShadow=true;
  paper.rotation.set(.1,-.4,-.2);
  const state={unfold:0};
  let disposed=false, timeline:gsap.core.Timeline|undefined, resolveReveal:(()=>void)|undefined;
  let previousUnfold=-1;
  const render=()=> {
    if(disposed)return;
    const p=state.unfold;
    if(p!==previousUnfold) {
      for(let i=0;i<positions.count;i++) {
      const j=i*3;
      positions.setXYZ(i,folded[j]+(flat[j]-folded[j])*p,folded[j+1]+(flat[j+1]-folded[j+1])*p,folded[j+2]*(1-p));
      }
      positions.needsUpdate=true;
      previousUnfold=p;
    }
    // Flat shading derives face normals in the shader; no CPU normal pass is needed.
    renderer.render(scene,camera);
  };
  render();
  const resize=()=> {const a=window.innerWidth/window.innerHeight;camera.left=-a;camera.right=a;camera.updateProjectionMatrix();renderer.setSize(window.innerWidth,window.innerHeight);render();};
  window.addEventListener('resize',resize);
  return {
    reveal:()=>new Promise<void>(resolve=> {
      gsap.ticker.add(render);
      resolveReveal=resolve;
      timeline=gsap.timeline({onComplete:resolve});
      timeline.to(paper.rotation,{z:.04,y:-.2,duration:.35,ease:'power1.inOut'}).addLabel('unfold')
        .to(stage.querySelectorAll('.intro-caption,.intro-wordmark,.skip-intro'),{autoAlpha:0,duration:.2},'unfold')
        .to(state,{unfold:1,duration:.9,ease:'power3.inOut'},'unfold')
        .to(paper.rotation,{x:0,y:0,z:0,duration:.9,ease:'power3.inOut'},'unfold')
        .set(stage,{backgroundColor:'transparent'})
        .addLabel('crumple','+=.08')
        .to(state,{unfold:0,duration:.75,ease:'power3.inOut'},'crumple')
        .to(paper.rotation,{x:.4,y:.5,z:-.45,duration:.75,ease:'power3.inOut'},'crumple')
        .to(paper.position,{x:aspect*.7,y:-1.75,duration:.7,ease:'power3.inOut'},'crumple+=.42')
        .to(paper.scale,{x:.75,y:.75,z:.75,duration:.7,ease:'power3.inOut'},'crumple+=.42')
        .to(stage,{autoAlpha:0,duration:.18},'crumple+=.94');
    }),
    dispose:()=> {if(disposed)return;disposed=true;timeline?.kill();resolveReveal?.();gsap.ticker.remove(render);window.removeEventListener('resize',resize);geometry.dispose();material.dispose();texture.dispose();renderer.dispose();renderer.forceContextLoss();renderer.domElement.remove();},
  };
}
