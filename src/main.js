import * as THREE from 'three';
import { OrbitControls } from 'three/addons/controls/OrbitControls.js';
import './style.css';

const PHASES = [
  'New Moon','Waxing Crescent','First Quarter','Waxing Gibbous',
  'Full Moon','Waning Gibbous','Last Quarter','Waning Crescent'
];
const PLAYERS = [
  {name:'Grape',color:0x9165e8,css:'grape',position:0,phases:[]},
  {name:'Orange',color:0xf18b3c,css:'orange',position:8,phases:[]},
  {name:'Lime',color:0x91c95d,css:'lime',position:16,phases:[]},
  {name:'Cherry',color:0xe34e70,css:'cherry',position:24,phases:[]}
];
const state={current:0,turn:1,questions:[],used:new Set(),pending:false,roll:null};
const sceneRoot=document.querySelector('#scene');
const scene=new THREE.Scene();
scene.background=new THREE.Color(0x080d1c);
scene.fog=new THREE.FogExp2(0x080d1c,.012);
const camera=new THREE.PerspectiveCamera(38,1,.1,160);
camera.position.set(0,22,34);
const renderer=new THREE.WebGLRenderer({antialias:true,alpha:false});
renderer.setPixelRatio(Math.min(devicePixelRatio,2));
renderer.shadowMap.enabled=true;
renderer.shadowMap.type=THREE.PCFSoftShadowMap;
renderer.outputColorSpace=THREE.SRGBColorSpace;
renderer.toneMapping=THREE.ACESFilmicToneMapping;
renderer.toneMappingExposure=1.12;
sceneRoot.appendChild(renderer.domElement);
const controls=new OrbitControls(camera,renderer.domElement);
controls.enableDamping=true;controls.dampingFactor=.055;controls.minDistance=18;controls.maxDistance=58;
controls.maxPolarAngle=Math.PI*.48;controls.target.set(0,1.2,0);
scene.add(new THREE.HemisphereLight(0x9eb8ed,0x171322,1.15));
const sunLight=new THREE.DirectionalLight(0xffe4b0,3.4);
sunLight.position.set(-13,15,-10);sunLight.castShadow=true;
sunLight.shadow.mapSize.set(2048,2048);
sunLight.shadow.camera.left=-19;sunLight.shadow.camera.right=19;sunLight.shadow.camera.top=19;sunLight.shadow.camera.bottom=-19;
sunLight.shadow.bias=-.0003;scene.add(sunLight);
const fillLight=new THREE.PointLight(0x536da9,30,45);fillLight.position.set(12,9,12);scene.add(fillLight);

function makeStars(){
 const geo=new THREE.BufferGeometry(),points=[];
 for(let i=0;i<1500;i++){
  const v=new THREE.Vector3((Math.random()-.5)*120,(Math.random()-.5)*65,(Math.random()-.5)*120);
  if(v.length()<36)v.setLength(36);points.push(v.x,v.y,v.z);
 }
 geo.setAttribute('position',new THREE.Float32BufferAttribute(points,3));
 const mat=new THREE.PointsMaterial({color:0xc9d6ff,size:.12,transparent:true,opacity:.75,sizeAttenuation:true});
 scene.add(new THREE.Points(geo,mat));
}
makeStars();
function addMesh(geometry,material,parent=scene){const mesh=new THREE.Mesh(geometry,material);mesh.castShadow=true;mesh.receiveShadow=true;parent.add(mesh);return mesh;}
function makeLabel(text,color='#dce4ff',size=72){
 const c=document.createElement('canvas');c.width=512;c.height=128;
 const ctx=c.getContext('2d');ctx.font='600 '+size+'px "DM Sans",sans-serif';ctx.textAlign='center';ctx.textBaseline='middle';ctx.fillStyle=color;ctx.shadowColor=color;ctx.shadowBlur=12;ctx.fillText(text,256,64);
 const tex=new THREE.CanvasTexture(c);tex.colorSpace=THREE.SRGBColorSpace;
 const sprite=new THREE.Sprite(new THREE.SpriteMaterial({map:tex,transparent:true,depthWrite:false}));
 sprite.scale.set(3.1,.78,1);return sprite;
}
const board=new THREE.Group();scene.add(board);
const baseMat=new THREE.MeshStandardMaterial({color:0x202a47,metalness:.62,roughness:.38});
const base=addMesh(new THREE.CylinderGeometry(13.2,13.5,.8,128),baseMat,board);base.position.y=-.45;
const top=addMesh(new THREE.CylinderGeometry(12.95,13.05,.16,128),new THREE.MeshStandardMaterial({color:0x111a31,metalness:.35,roughness:.62}),board);top.position.y=.02;
function torus(radius,tube,color,y){const m=addMesh(new THREE.TorusGeometry(radius,tube,10,160),new THREE.MeshStandardMaterial({color,metalness:.75,roughness:.32,emissive:color,emissiveIntensity:.13}),board);m.rotation.x=Math.PI/2;m.position.y=y;return m}
torus(12.75,.075,0x6678a5,.15);torus(8.35,.09,0x7884b8,.19);torus(5.05,.055,0x7565b8,.22);
const tileMaterials=[0x293654,0x303a5d,0x293654,0x303a5d];
const trackTiles=[];
for(let i=0;i<32;i++){
 const a=(i/32)*Math.PI*2-Math.PI/2;
 const shape=new THREE.Shape();
 const inner=9.05,outer=12.5,half=Math.PI/32*.94;
 shape.moveTo(Math.cos(a-half)*inner,Math.sin(a-half)*inner);
 shape.lineTo(Math.cos(a-half)*outer,Math.sin(a-half)*outer);
 shape.lineTo(Math.cos(a+half)*outer,Math.sin(a+half)*outer);
 shape.lineTo(Math.cos(a+half)*inner,Math.sin(a+half)*inner);shape.closePath();
 const geo=new THREE.ShapeGeometry(shape,2);geo.rotateX(-Math.PI/2);
 const tile=addMesh(geo,new THREE.MeshStandardMaterial({color:tileMaterials[i%4],metalness:.28,roughness:.65,side:THREE.DoubleSide}),board);
 tile.position.y=.12;tile.userData.index=i;trackTiles.push(tile);
 const mid=a;const r=10.8;
 const num=makeLabel(String(i+1),'#aab7d8',46);num.position.set(Math.cos(mid)*r,.2,Math.sin(mid)*r);num.scale.set(.56,.24,1);board.add(num);
}
const phaseGroup=new THREE.Group();board.add(phaseGroup);
const phaseColors=[0x6c7395,0x8b8cb3,0xb3a4bd,0xd2c0ad,0xf2e4c7,0xd1b8a6,0xa9a1bd,0x777e9d];
const phaseMeshes=[];
for(let i=0;i<8;i++){
 const a=(i/8)*Math.PI*2-Math.PI/2,half=Math.PI/8*.94,ri=5.45,ro=8.15;
 const sh=new THREE.Shape();
 sh.moveTo(Math.cos(a-half)*ri,Math.sin(a-half)*ri);sh.lineTo(Math.cos(a-half)*ro,Math.sin(a-half)*ro);sh.lineTo(Math.cos(a+half)*ro,Math.sin(a+half)*ro);sh.lineTo(Math.cos(a+half)*ri,Math.sin(a+half)*ri);sh.closePath();
 const mesh=addMesh(new THREE.ShapeGeometry(sh,2),new THREE.MeshStandardMaterial({color:0x222b48,metalness:.22,roughness:.72,side:THREE.DoubleSide}),phaseGroup);
 mesh.rotation.x=-Math.PI/2;mesh.position.y=.24;mesh.userData.phase=i;phaseMeshes.push(mesh);
 const label=makeLabel(PHASES[i].toUpperCase(),'#c5c4e7',34);const r=6.78;
 label.position.set(Math.cos(a)*r,.3,Math.sin(a)*r);label.scale.set(1.75,.42,1);phaseGroup.add(label);
 // A small, correctly oriented lunar-phase medallion.
 const iconCanvas=document.createElement('canvas');iconCanvas.width=128;iconCanvas.height=128;
 const ix=iconCanvas.getContext('2d');const cx=64,cy=64,rad=51;
 ix.beginPath();ix.arc(cx,cy,rad,0,Math.PI*2);ix.fillStyle='#171c2d';ix.fill();
 ix.save();ix.beginPath();ix.arc(cx,cy,rad,0,Math.PI*2);ix.clip();
 ix.fillStyle='#e5dfce';ix.fillRect(cx-rad,cy-rad,rad*2,rad*2);
 const waxing=i<4,illumination=i===0?0:i===4?1:(i<4?i/4:(8-i)/4);
 ix.fillStyle='#171c2d';
 if(i===0){ix.fillRect(cx-rad,cy-rad,rad*2,rad*2)}
 else if(i===4){/* fully illuminated */}
 else {
  ix.beginPath();
  const edge=Math.cos(illumination*Math.PI)*rad;
  if(waxing){
   ix.moveTo(cx,cy-rad);ix.arc(cx,cy,rad,-Math.PI/2,Math.PI/2,false);
   ix.ellipse(cx,cy,Math.abs(edge),rad,0,Math.PI/2,-Math.PI/2,edge>0);
  }else{
   ix.moveTo(cx,cy-rad);ix.arc(cx,cy,rad,-Math.PI/2,Math.PI/2,true);
   ix.ellipse(cx,cy,Math.abs(edge),rad,0,Math.PI/2,-Math.PI/2,edge<0);
  }
  ix.closePath();ix.fill();
 }
 ix.restore();ix.beginPath();ix.arc(cx,cy,rad,0,Math.PI*2);ix.strokeStyle='rgba(220,225,245,.55)';ix.lineWidth=3;ix.stroke();
 const phaseTexture=new THREE.CanvasTexture(iconCanvas);phaseTexture.colorSpace=THREE.SRGBColorSpace;
 const icon=addMesh(new THREE.PlaneGeometry(.72,.72),new THREE.MeshBasicMaterial({map:phaseTexture,transparent:true,side:THREE.DoubleSide}),phaseGroup);
 icon.rotation.x=-Math.PI/2;icon.position.set(Math.cos(a)*5.85,.43,Math.sin(a)*5.85);
}
const centerRing=addMesh(new THREE.CylinderGeometry(5.15,5.15,.18,96),new THREE.MeshStandardMaterial({color:0x171f39,metalness:.5,roughness:.42}),board);centerRing.position.y=.25;
torus(5.05,.07,0x9b8ed5,.37);
// Central moon with a procedural crater texture.
function moonTexture(){
 const c=document.createElement('canvas');c.width=1024;c.height=512;const x=c.getContext('2d');
 const g=x.createLinearGradient(0,0,1024,512);g.addColorStop(0,'#aaa9a5');g.addColorStop(.5,'#d2d0c9');g.addColorStop(1,'#777b83');x.fillStyle=g;x.fillRect(0,0,1024,512);
 for(let i=0;i<1700;i++){
  const px=Math.random()*1024,py=Math.random()*512,r=2+Math.random()*15;
  x.beginPath();x.arc(px,py,r,0,Math.PI*2);x.fillStyle=Math.random()>.5?'rgba(45,48,55,.16)':'rgba(255,255,255,.13)';x.fill();
  x.beginPath();x.arc(px-r*.18,py-r*.18,r*.68,0,Math.PI*2);x.strokeStyle='rgba(35,38,45,.12)';x.lineWidth=1+Math.random()*2;x.stroke();
 }
 const t=new THREE.CanvasTexture(c);t.colorSpace=THREE.SRGBColorSpace;return t;
}
const moonMat=new THREE.MeshStandardMaterial({map:moonTexture(),roughness:1,metalness:0});
const moon=addMesh(new THREE.SphereGeometry(2.7,96,64),moonMat);
moon.position.set(0,4.25,0);moon.castShadow=true;
const moonGlow=new THREE.PointLight(0x9da9e8,7,13,2);moonGlow.position.set(0,4.3,0);scene.add(moonGlow);
const halo=addMesh(new THREE.SphereGeometry(2.92,48,32),new THREE.MeshBasicMaterial({color:0x9ca8e8,transparent:true,opacity:.075,side:THREE.BackSide}));halo.position.copy(moon.position);
// Sun marker in the same direction as the key light.
const sunGroup=new THREE.Group();scene.add(sunGroup);
const sunBall=addMesh(new THREE.SphereGeometry(1.15,32,24),new THREE.MeshBasicMaterial({color:0xffd78a}),sunGroup);
const sunGlow=addMesh(new THREE.SphereGeometry(1.75,32,24),new THREE.MeshBasicMaterial({color:0xffb85b,transparent:true,opacity:.12,side:THREE.BackSide}),sunGroup);
sunGroup.position.set(-17,11,-13);
const sunSprite=makeLabel('SUN','#ffd995',62);sunSprite.scale.set(2,.5,1);sunSprite.position.y=-2.1;sunGroup.add(sunSprite);
function makeRocket(color){
 const g=new THREE.Group();
 const bodyMat=new THREE.MeshStandardMaterial({color,metalness:.48,roughness:.3});
 const body=addMesh(new THREE.CylinderGeometry(.19,.27,.9,12),bodyMat,g);body.rotation.x=Math.PI/2;body.position.y=.32;
 const nose=addMesh(new THREE.ConeGeometry(.2,.48,12),bodyMat,g);nose.rotation.x=-Math.PI/2;nose.position.set(0,.32,.69);
 const finMat=new THREE.MeshStandardMaterial({color:0xd8def0,metalness:.5,roughness:.35});
 for(const side of [-1,1]){const fin=addMesh(new THREE.BoxGeometry(.08,.35,.36),finMat,g);fin.position.set(side*.23,.18,.03);fin.rotation.z=side*.35}
 const window=addMesh(new THREE.SphereGeometry(.105,16,12),new THREE.MeshStandardMaterial({color:0x8de0f5,metalness:.7,roughness:.18,emissive:0x245b78,emissiveIntensity:.5}),g);window.position.set(0,.47,.28);
 const flame=addMesh(new THREE.ConeGeometry(.12,.45,12),new THREE.MeshBasicMaterial({color:0xffa45e}),g);flame.rotation.x=Math.PI/2;flame.position.set(0,.32,-.57);
 g.userData.flame=flame;return g;
}
const rocketMeshes=PLAYERS.map((p,i)=>{const r=makeRocket(p.color);scene.add(r);return r});
function placeRockets(){
 PLAYERS.forEach((p,i)=>{
  const a=(p.position/32)*Math.PI*2-Math.PI/2,r=10.78+(i-1.5)*.43;
  const mesh=rocketMeshes[i];mesh.position.set(Math.cos(a)*r,.48,Math.sin(a)*r);mesh.rotation.y=-a+Math.PI/2;
 });
}
placeRockets();
function updateRocketPositions(){placeRockets()}
const orbitDots=addMesh(new THREE.TorusGeometry(13.6,.025,6,160),new THREE.MeshBasicMaterial({color:0x435176,transparent:true,opacity:.6}),scene);orbitDots.rotation.x=Math.PI/2;orbitDots.position.y=-.2;
function resize(){const w=sceneRoot.clientWidth,h=sceneRoot.clientHeight;if(!w||!h)return;camera.aspect=w/h;camera.updateProjectionMatrix();renderer.setSize(w,h)}
new ResizeObserver(resize).observe(sceneRoot);resize();
function animate(){requestAnimationFrame(animate);controls.update();moon.rotation.y+=.00035;rocketMeshes.forEach((r,i)=>{r.userData.flame.scale.y=.8+Math.sin(performance.now()*.012+i)*.22});renderer.render(scene,camera)}
animate();

document.querySelector('#view-top').addEventListener('click',()=>{camera.position.set(0,42,.01);controls.target.set(0,0,0);controls.update();setViewButton('view-top')});
document.querySelector('#view-orbit').addEventListener('click',()=>{camera.position.set(0,22,34);controls.target.set(0,1.2,0);controls.update();setViewButton('view-orbit')});
document.querySelector('#reset-view').addEventListener('click',()=>{camera.position.set(0,22,34);controls.target.set(0,1.2,0);controls.update();setViewButton('view-orbit')});
function setViewButton(id){document.querySelectorAll('.control-pill').forEach(b=>b.classList.toggle('active',b.id===id))}
function renderHud(){
 const p=PLAYERS[state.current];
 document.querySelector('#current-player').textContent=p.name;
 document.querySelector('#current-player').previousElementSibling.className='pilot-avatar '+p.css;
 document.querySelector('#turn-number').textContent=String(state.turn).padStart(2,'0');
 document.querySelector('#phase-count').innerHTML=p.phases.length+' <i>/ 8</i>';
 document.querySelector('#phase-progress').innerHTML=PHASES.map((_,i)=>'<span class="'+(p.phases.includes(i)?'filled':'')+'"></span>').join('');
 document.querySelector('#collected-phases').innerHTML=p.phases.length?p.phases.map(i=>'<span class="phase-chip">'+PHASES[i]+'</span>').join(''):'<span class="empty-collection">Your lunar discoveries will appear here.</span>';
 document.querySelector('#crew-list').innerHTML=PLAYERS.map((x,i)=>'<div class="crew-member '+(i===state.current?'current':'')+'"><span class="pilot-avatar '+x.css+'">✦</span><strong>'+x.name+'</strong><small>'+x.phases.length+'/8 phases</small></div>').join('');
}
renderHud();
async function loadQuestions(){
 try{
  const res=await fetch('/quesrikns.csv');if(!res.ok)throw new Error('Question file unavailable');
  const text=await res.text();const lines=text.trim().split(/\r?\n/);
  state.questions=lines.slice(1).map(line=>line.split('\t')).filter(c=>c.length>=6).map(c=>({difficulty:c[0],question:c[1],answers:c.slice(2,5),correct:c[5].trim()}));
 }catch(e){console.warn('Could not load question bank',e)}
}
await loadQuestions();
function showToast(message){const el=document.querySelector('#toast');el.textContent=message;el.classList.add('show');setTimeout(()=>el.classList.remove('show'),2300)}
function nextQuestion(){
 const available=state.questions.filter((q,i)=>!state.used.has(i));
 if(!available.length)state.used.clear();
 const q=(available.length?available:state.questions)[Math.floor(Math.random()*(available.length?available:state.questions).length)];
 const index=state.questions.indexOf(q);state.used.add(index);return q;
}
function askQuestion(){
 const q=nextQuestion();if(!q){showToast('Add questions to the question bank to play.');endTurn();return}
 document.querySelector('#question-title').textContent=q.question;
 document.querySelector('#question-difficulty').textContent=q.difficulty.toUpperCase();
 const list=document.querySelector('#answer-list');list.innerHTML='';
 q.answers.forEach((answer,i)=>{
  const button=document.createElement('button');button.className='answer-option';
  button.innerHTML='<span class="letter">'+String.fromCharCode(65+i)+'</span><span></span>';button.querySelector('span:last-child').textContent=answer;
  button.addEventListener('click',()=>resolveAnswer(button,q,String.fromCharCode(65+i)));list.appendChild(button);
 });
 document.querySelector('#answer-feedback').textContent='';
 document.querySelector('#continue-button').classList.add('hidden');
 document.querySelector('#question-modal').classList.remove('hidden');
}
function resolveAnswer(button,q,choice){
 const buttons=[...document.querySelectorAll('.answer-option')];buttons.forEach(b=>b.disabled=true);
 const correct=choice===q.correct;
 buttons.forEach((b,i)=>{if(String.fromCharCode(65+i)===q.correct)b.classList.add('correct')});
 if(correct){
  const p=PLAYERS[state.current],phase=(p.position%32)/4|0;
  if(!p.phases.includes(phase)){p.phases.push(phase);document.querySelector('#answer-feedback').textContent='Correct! You discovered the '+PHASES[phase]+'. Phase token collected.';renderHud()}
  else document.querySelector('#answer-feedback').textContent='Correct! You already collected the '+PHASES[phase]+' token.';
  if(p.phases.length===8)document.querySelector('#answer-feedback').textContent+=' You completed the lunar collection!';
 }else{
  button.classList.add('wrong');document.querySelector('#answer-feedback').textContent='Not quite. The correct answer is highlighted. Keep exploring!';
 }
 document.querySelector('#continue-button').classList.remove('hidden');
}
function endTurn(){
 state.pending=false;state.roll=null;
 document.querySelector('#roll-button').disabled=false;
 document.querySelector('#roll-button').innerHTML='<span>ROLL TO MOVE</span><span>↗</span>';
 document.querySelector('#move-status').textContent='Your rocket is waiting at the launch point.';
 state.current=(state.current+1)%PLAYERS.length;if(state.current===0)state.turn++;
 renderHud();
}
document.querySelector('#roll-button').addEventListener('click',()=>{
 if(state.pending)return;
 const roll=1+Math.floor(Math.random()*6);state.roll=roll;state.pending=true;
 document.querySelector('#die-face').textContent=roll;
 document.querySelector('#roll-button').disabled=true;
 const p=PLAYERS[state.current];p.position=(p.position+roll)%32;updateRocketPositions();
 document.querySelector('#move-status').textContent=p.name+' moved '+roll+' spaces · Space '+(p.position+1);
 setTimeout(askQuestion,650);
});
document.querySelector('#continue-button').addEventListener('click',()=>{
 document.querySelector('#question-modal').classList.add('hidden');
 if(PLAYERS[state.current].phases.length===8){showToast(PLAYERS[state.current].name+' has collected all eight lunar phases!')}
 endTurn();
});
document.querySelector('#question-modal').addEventListener('click',e=>{if(e.target.id==='question-modal'&&document.querySelector('#continue-button').classList.contains('hidden'))return});
