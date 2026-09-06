import * as THREE from 'three';
import { buildCharacter, smoothNormals } from './captain-geometry.js';
import { CAPTAIN, JellyState } from './captain-physics.js';
import captainUrl from './assets/captain.json?url';
import engineerUrl from './assets/engineer.json?url';
import gunnerUrl from './assets/gunner.json?url';
import navigatorUrl from './assets/navigator.json?url';

export async function createViewer(section) {
const characters=await Promise.all([captainUrl,engineerUrl,gunnerUrl,navigatorUrl].map(async url=>{
  const response=await fetch(url);
  if(!response.ok)throw new Error(`Character resource: HTTP ${response.status}`);
  return buildCharacter(await response.json());
}));
let selected=0,body=characters[0];
const stage=section.querySelector('[data-preview-stage]');
const renderer=new THREE.WebGLRenderer({antialias:true,alpha:true});
renderer.setPixelRatio(Math.min(devicePixelRatio,innerWidth<700?1.5:2));
renderer.outputColorSpace=THREE.SRGBColorSpace;
renderer.toneMapping=THREE.ACESFilmicToneMapping;
renderer.toneMappingExposure=1;
renderer.shadowMap.enabled=true;
renderer.shadowMap.type=THREE.PCFSoftShadowMap;
stage.appendChild(renderer.domElement);
renderer.domElement.className='character-canvas';
renderer.domElement.tabIndex=0;
renderer.domElement.setAttribute('aria-label','Interactive Captain. Arrow keys rotate, plus and minus zoom, Space gives him a boop, and zero resets the view.');
renderer.domElement.setAttribute('aria-describedby','character-instructions');
const events=new AbortController();
function listen(element,type,handler,options={}){element.addEventListener(type,handler,{...options,signal:events.signal});}
const scene=new THREE.Scene();
characters.forEach((character,index)=>{character.visible=index===0;scene.add(character);});
const camera=new THREE.PerspectiveCamera(33,1,.05,60);
const target=new THREE.Vector3(0,1.3,0);
let yaw=.2,pitch=.1,distance=7,mode='jelly',auto=false;
const ray=new THREE.Raycaster(),pointer=new THREE.Vector2(),plane=new THREE.Plane();
const planePoint=new THREE.Vector3(),grabStart=new THREE.Vector3();
const physics=new JellyState();
const {grab,pull,velocity,desired,sway}=physics;
let dragging=null,previous={x:0,y:0},clock=0,pinch=null;
const contacts=new Map();
const reducedMotion=matchMedia('(prefers-reduced-motion: reduce)').matches;
// Broad, low-contrast reflections retain color without a product-photo sheen.
const room = new THREE.Scene();
room.background = new THREE.Color('#28334b');
const roomShell = new THREE.Mesh(new THREE.BoxGeometry(24,16,24),new THREE.MeshBasicMaterial({color:'#28334b',side:THREE.BackSide}));
room.add(roomShell);
function softbox(x,y,z,width,height,color,intensity){
  const light = new THREE.Mesh(new THREE.PlaneGeometry(width,height),new THREE.MeshBasicMaterial({color:new THREE.Color(color).multiplyScalar(intensity),side:THREE.DoubleSide}));
  light.position.set(x,y,z);light.lookAt(0,1,0);room.add(light);
}
softbox(-4,6,5,8,8,'#fff0d8',1.4);
softbox(5,4,1,6,7,'#c3dfff',.7);
softbox(0,7,-4,8,5,'#dceaff',.8);
const pmrem = new THREE.PMREMGenerator(renderer);
const environment = pmrem.fromScene(room,.35);
scene.environment = environment.texture;
room.traverse(o=>{if(o.isMesh){o.geometry.dispose();o.material.dispose();}});
pmrem.dispose();
const hemi = new THREE.HemisphereLight('#e3eaff','#545064',1.9);scene.add(hemi);
const key = new THREE.DirectionalLight('#ffe9ce',1.8);key.position.set(-3,5,6);key.castShadow=true;
const shadowSize=innerWidth<700?1024:2048;key.shadow.mapSize.set(shadowSize,shadowSize);key.shadow.camera.left=-4;key.shadow.camera.right=4;key.shadow.camera.top=5;key.shadow.camera.bottom=-3;key.shadow.camera.near=.1;key.shadow.camera.far=20;
key.shadow.normalBias=.025;key.shadow.bias=-.00015;key.shadow.radius=4;key.target.position.set(0,1.1,0);scene.add(key,key.target);
const fill = new THREE.DirectionalLight('#c8dbff',.55);fill.position.set(4,3,3);scene.add(fill);
const rim = new THREE.DirectionalLight('#bad9ee',1.0);rim.position.set(2,4,-4);scene.add(rim);
const floor = new THREE.Mesh(new THREE.PlaneGeometry(200,200),new THREE.ShadowMaterial({opacity:.2}));
floor.rotation.x=-Math.PI/2;floor.position.y=-.018;floor.receiveShadow=true;scene.add(floor);
const pedestal = new THREE.Mesh(new THREE.CylinderGeometry(1.45,1.49,.08,128),new THREE.MeshStandardMaterial({color:'#151d2c',metalness:.42,roughness:.45}));
pedestal.position.y=-.065;pedestal.receiveShadow=true;scene.add(pedestal);
const ring = new THREE.Mesh(new THREE.TorusGeometry(1.455,.008,8,160),new THREE.MeshBasicMaterial({color:'#ed9bbe',transparent:true,opacity:.55}));
ring.rotation.x=Math.PI/2;ring.position.y=-.013;scene.add(ring);
const shadowCanvas=document.createElement('canvas');shadowCanvas.width=128;shadowCanvas.height=128;
const context=shadowCanvas.getContext('2d');const gradient=context.createRadialGradient(64,64,5,64,64,64);gradient.addColorStop(0,'rgba(0,0,0,.55)');gradient.addColorStop(1,'rgba(0,0,0,0)');context.fillStyle=gradient;context.fillRect(0,0,128,128);
const contactShadow=new THREE.Mesh(new THREE.PlaneGeometry(2.5,2.0),new THREE.MeshBasicMaterial({map:new THREE.CanvasTexture(shadowCanvas),transparent:true,depthWrite:false}));
contactShadow.rotation.x=-Math.PI/2;contactShadow.position.y=-.011;scene.add(contactShadow);

function positionCamera(){
  camera.position.set(Math.sin(yaw)*Math.cos(pitch)*distance,target.y+Math.sin(pitch)*distance,Math.cos(yaw)*Math.cos(pitch)*distance);
  camera.lookAt(target);camera.updateMatrixWorld();
}
function resize(){
  const box=stage.getBoundingClientRect();renderer.setSize(box.width,box.height);camera.aspect=box.width/box.height;
  camera.fov=box.width<500?40:33;camera.updateProjectionMatrix();positionCamera();
}
const resizeObserver=new ResizeObserver(resize);resizeObserver.observe(stage);

function release(){if(dragging?.type==='pull')physics.release();dragging=null;}
function restore(){
  release();physics.reset();contacts.clear();pinch=null;
  for(const mesh of body.children){
    mesh.geometry.attributes.position.array.set(mesh.userData.base);
    mesh.geometry.attributes.position.needsUpdate=true;
    mesh.geometry.attributes.normal.array.set(mesh.userData.normals);
    mesh.geometry.attributes.normal.needsUpdate=true;
    mesh.geometry.computeBoundingSphere();
  }
  body.position.y=0;
}
function boop(){restore();physics.boop();}
function reset(){restore();yaw=.2;pitch=.1;distance=7;positionCamera();}
function selectCharacter(offset){
  restore();body.visible=false;
  selected=(selected+offset+characters.length)%characters.length;
  body=characters[selected];body.visible=true;body.updateMatrixWorld(true);
  section.querySelector('[data-character-name]').textContent=`${body.name} · ${selected+1} / ${characters.length}`;
  renderer.domElement.setAttribute('aria-label',`Interactive ${body.name}. Arrow keys rotate, plus and minus zoom, Space gives a boop, and zero resets the view.`);
  ring.material.color.set(['#ed9bbe','#e9c874','#df986d','#82c6ed'][selected]);
}
function setMode(value){release();mode=value;for(const key of ['jelly','orbit'])section.querySelector(`[data-preview-action=${key}]`).setAttribute('aria-pressed',key===value);}
for(const button of section.querySelectorAll('[data-preview-action]'))listen(button,'click',()=>{
  const action=button.dataset.previewAction;
  if(action==='jelly'||action==='orbit')setMode(action);
  if(action==='boop')boop();
  if(action==='reset')reset();
  if(action==='previous')selectCharacter(-1);
  if(action==='next')selectCharacter(1);
  if(action==='auto'){auto=!auto;button.setAttribute('aria-pressed',auto);}
});
function setPointer(e){const r=renderer.domElement.getBoundingClientRect();pointer.set((e.clientX-r.left)/r.width*2-1,-(e.clientY-r.top)/r.height*2+1);ray.setFromCamera(pointer,camera);}
function findGrab(hit){
  const geometry=hit.object.geometry,position=geometry.attributes.position,base=hit.object.userData.base;
  const a=new THREE.Vector3().fromBufferAttribute(position,hit.face.a),b=new THREE.Vector3().fromBufferAttribute(position,hit.face.b),c=new THREE.Vector3().fromBufferAttribute(position,hit.face.c);
  const local=hit.object.worldToLocal(hit.point.clone());const bary=new THREE.Vector3();new THREE.Triangle(a,b,c).getBarycoord(local,bary);
  grab.set(0,0,0);for(const [index,weight] of [[hit.face.a,bary.x],[hit.face.b,bary.y],[hit.face.c,bary.z]])grab.addScaledVector(new THREE.Vector3().fromArray(base,index*3),weight);
}
const canvas=renderer.domElement;
listen(canvas,'contextmenu',e=>e.preventDefault());
listen(canvas,'pointerdown',e=>{
  if(e.button!==0&&e.button!==2)return;
  canvas.focus({preventScroll:true});contacts.set(e.pointerId,{x:e.clientX,y:e.clientY});canvas.setPointerCapture(e.pointerId);
  if(contacts.size===2){release();const values=[...contacts.values()];pinch={length:Math.hypot(values[0].x-values[1].x,values[0].y-values[1].y),distance};return;}
  setPointer(e);const hits=ray.intersectObjects(body.children,false);
  previous={x:e.clientX,y:e.clientY};
  if(mode==='jelly'&&e.button===0&&!e.shiftKey&&hits.length){
    const hit=hits[0];findGrab(hit);plane.setFromNormalAndCoplanarPoint(camera.getWorldDirection(new THREE.Vector3()),hit.point);
    grabStart.copy(hit.point);desired.copy(pull);dragging={type:'pull',id:e.pointerId,initial:pull.clone()};physics.held=true;
  }else dragging={type:'orbit',id:e.pointerId};
});
listen(canvas,'pointermove',e=>{
  if(contacts.has(e.pointerId))contacts.set(e.pointerId,{x:e.clientX,y:e.clientY});
  if(pinch&&contacts.size===2){const values=[...contacts.values()];const length=Math.hypot(values[0].x-values[1].x,values[0].y-values[1].y);distance=THREE.MathUtils.clamp(pinch.distance*pinch.length/Math.max(10,length),3.7,11);positionCamera();return;}
  if(!dragging||dragging.id!==e.pointerId)return;
  if(dragging.type==='orbit'){
    yaw-=(e.clientX-previous.x)*.007;pitch=THREE.MathUtils.clamp(pitch+(e.clientY-previous.y)*.005,-.15,1.1);positionCamera();
  }else{
    setPointer(e);if(ray.ray.intersectPlane(plane,planePoint)){
      const p=CAPTAIN;desired.copy(planePoint).sub(grabStart).multiplyScalar(p.stretch).add(dragging.initial).clampLength(0,p.limit);
    }
  }
  previous={x:e.clientX,y:e.clientY};
});
function endPointer(e){contacts.delete(e.pointerId);if(contacts.size<2)pinch=null;if(dragging?.id===e.pointerId)release();}
listen(canvas,'pointerup',endPointer);listen(canvas,'pointercancel',endPointer);listen(canvas,'lostpointercapture',endPointer);
listen(window,'blur',()=>{release();contacts.clear();pinch=null;});
listen(canvas,'wheel',e=>{if(document.activeElement!==canvas)return;e.preventDefault();distance=THREE.MathUtils.clamp(distance*Math.exp(e.deltaY*.001),3.7,11);positionCamera();},{passive:false});
listen(canvas,'keydown',e=>{
  if(['ArrowLeft','ArrowRight','ArrowUp','ArrowDown',' ','+','=','-','0'].includes(e.key))e.preventDefault();
  if(e.key==='ArrowLeft')yaw+=.12;if(e.key==='ArrowRight')yaw-=.12;if(e.key==='ArrowUp')pitch=Math.min(1.1,pitch+.08);if(e.key==='ArrowDown')pitch=Math.max(-.15,pitch-.08);
  if(e.key==='+'||e.key==='=')distance=Math.max(3.7,distance-.3);if(e.key==='-')distance=Math.min(11,distance+.3);if(e.key===' ')boop();if(e.key==='0')reset();positionCamera();
});
function deform(){
  const p=CAPTAIN;const {hop,squash,ripple}=physics;const length=pull.length();const radius=p.radius+Math.min(.25,length*.12),inv=1/(radius*radius);
  const elapsed=physics.elapsed;
  body.position.y=hop;
  const idle=reducedMotion?0:Math.sin(clock*1.55)*.003;
  for(const mesh of body.children){
    const base=mesh.userData.base,positions=mesh.geometry.attributes.position.array;
    for(let i=0;i<base.length;i+=3){
      const x=base[i],y=base[i+1],z=base[i+2];
      const dx=x-grab.x,dy=y-grab.y,dz=z-grab.z;
      const foot=THREE.MathUtils.smoothstep(y,.02,.45);
      const weight=Math.exp(-(dx*dx+dy*dy+dz*dz)*inv)*foot;
      const height=y/2.65,lean=height*height;
      const wave=ripple*Math.sin(height*9-elapsed*18)*foot;
      const squeeze=THREE.MathUtils.clamp(squash,-.18,.18)+idle;
      positions[i]=x*(1-squeeze*.45)+pull.x*weight+sway.x*lean+wave*x*.35;
      const baseline=y*(1+squeeze),lift=pull.y*weight+sway.y*foot*.3+wave*.18;
      positions[i+1]=lift<0?baseline*Math.exp(lift/Math.max(baseline,.2)):baseline+lift;
      positions[i+2]=z*(1-squeeze*.45)+pull.z*weight+sway.z*lean+wave*z*.35;
    }
    mesh.geometry.attributes.position.needsUpdate=true;mesh.geometry.computeVertexNormals();mesh.geometry.computeBoundingSphere();
  }
  smoothNormals(body);
  contactShadow.material.opacity=Math.max(.18,1-hop*.65);contactShadow.scale.setScalar(1+hop*.22);
}


let active=false,disposed=false,failed=false,frame=0,lastTime=0,accumulator=0;
function animate(now){
  if(!active)return;
  const dt=Math.min((now-lastTime)/1000,.05);lastTime=now;clock+=dt;accumulator+=dt;
  while(accumulator>=1/120){physics.step(1/120);accumulator-=1/120;}
  if(auto&&!dragging&&!pinch){yaw+=dt*.28;positionCamera();}
  deform();renderer.render(scene,camera);frame=requestAnimationFrame(animate);
}
function start(){if(active||disposed||failed)return;active=true;lastTime=performance.now();accumulator=0;frame=requestAnimationFrame(animate);}
function stop(){active=false;cancelAnimationFrame(frame);release();contacts.clear();pinch=null;}
listen(canvas,'webglcontextlost',event=>{
  event.preventDefault();failed=true;stop();
  const status=section.querySelector('[data-preview-status]');status.hidden=false;status.dataset.failed='true';
  status.textContent='The preview lost its graphics connection. Reload the page to bring the crew back.';
  section.querySelectorAll('[data-preview-action]').forEach(button=>{button.disabled=true;});
});
resize();
return {start,stop,dispose(){
  if(disposed)return;disposed=true;stop();events.abort();resizeObserver.disconnect();
  const textures=new Set();
  scene.traverse(object=>{if(object.isMesh){object.geometry.dispose();for(const material of Array.isArray(object.material)?object.material:[object.material]){if(material.map)textures.add(material.map);material.dispose();}}});
  for(const texture of textures)texture.dispose();
  key.shadow.dispose();environment.dispose();renderer.dispose();canvas.remove();
}};
}
