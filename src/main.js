import * as THREE from 'three';
import UTIF from 'utif';
import { OrbitControls } from 'three/addons/controls/OrbitControls.js';
import './style.css';

const PHASES = [
  'New Moon','Waxing Crescent','First Quarter','Waxing Gibbous',
  'Full Moon','Waning Gibbous','Last Quarter','Waning Crescent'
];
const PLAYERS = [
  {name:'Grape',color:0x9165e8,css:'grape',position:0,phases:[],parts:[],boosts:0},
  {name:'Orange',color:0xf18b3c,css:'orange',position:8,phases:[],parts:[],boosts:0},
  {name:'Lime',color:0x91c95d,css:'lime',position:16,phases:[],parts:[],boosts:0},
  {name:'Cherry',color:0xe34e70,css:'cherry',position:24,phases:[],parts:[],boosts:0}
];
const state={current:0,turn:1,questions:[],used:new Set(),pending:false,roll:null,eventDeck:[],gameOver:false,phaseBlocked:false};
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
const phaseMeshes=[];
function makeFlatText(text,color='#dce4ff'){
 const c=document.createElement('canvas');c.width=512;c.height=96;const ctx=c.getContext('2d');
 ctx.clearRect(0,0,c.width,c.height);ctx.font='700 46px "DM Sans",sans-serif';ctx.textAlign='center';ctx.textBaseline='middle';ctx.fillStyle=color;ctx.shadowColor=color;ctx.shadowBlur=8;ctx.fillText(text,256,48);
 const texture=new THREE.CanvasTexture(c);texture.colorSpace=THREE.SRGBColorSpace;
 return new THREE.Mesh(new THREE.PlaneGeometry(1.8,.34),new THREE.MeshBasicMaterial({map:texture,transparent:true,depthWrite:false,side:THREE.DoubleSide}));
}
for(let i=0;i<8;i++){
 const a=(i/8)*Math.PI*2-Math.PI/2,half=Math.PI/8*.97,ri=5.45,ro=8.15;
 const sh=new THREE.Shape();sh.moveTo(Math.cos(a-half)*ri,Math.sin(a-half)*ri);sh.lineTo(Math.cos(a-half)*ro,Math.sin(a-half)*ro);
 sh.absarc(0,0,ro,a-half,a+half,false);sh.lineTo(Math.cos(a+half)*ri,Math.sin(a+half)*ri);sh.absarc(0,0,ri,a+half,a-half,true);sh.closePath();
 const mesh=addMesh(new THREE.ShapeGeometry(sh,24),new THREE.MeshStandardMaterial({color:0x222b48,metalness:.22,roughness:.72,side:THREE.DoubleSide}),phaseGroup);
 mesh.rotation.x=-Math.PI/2;mesh.position.y=.24;mesh.userData.phase=i;mesh.castShadow=false;phaseMeshes.push(mesh);
 const tokenGroup=new THREE.Group();phaseGroup.add(tokenGroup);tokenGroup.rotation.y=Math.PI/2-a;
 const iconCanvas=document.createElement('canvas');iconCanvas.width=128;iconCanvas.height=128;
 const ix=iconCanvas.getContext('2d'),cx=64,cy=64,rad=54;
 ix.beginPath();ix.arc(cx,cy,rad,0,Math.PI*2);ix.fillStyle='#171c2d';ix.fill();
 ix.save();ix.beginPath();ix.arc(cx,cy,rad,0,Math.PI*2);ix.clip();ix.fillStyle='#e5dfce';ix.fillRect(cx-rad,cy-rad,rad*2,rad*2);
 const waxing=i<4,illumination=i===0?0:i===4?1:(i<4?i/4:(8-i)/4);ix.fillStyle='#171c2d';
 if(i===0)ix.fillRect(cx-rad,cy-rad,rad*2,rad*2);
 else if(i!==4){const edge=Math.cos(illumination*Math.PI)*rad;ix.beginPath();
  if(waxing){ix.moveTo(cx,cy-rad);ix.arc(cx,cy,rad,-Math.PI/2,Math.PI/2,false);ix.ellipse(cx,cy,Math.max(1,Math.abs(edge)),rad,0,Math.PI/2,-Math.PI/2,edge>0)}
  else{ix.moveTo(cx,cy-rad);ix.arc(cx,cy,rad,-Math.PI/2,Math.PI/2,true);ix.ellipse(cx,cy,Math.max(1,Math.abs(edge)),rad,0,Math.PI/2,-Math.PI/2,edge<0)}ix.closePath();ix.fill();}
 ix.restore();ix.beginPath();ix.arc(cx,cy,rad,0,Math.PI*2);ix.strokeStyle='rgba(220,225,245,.65)';ix.lineWidth=3;ix.stroke();
 const phaseTexture=new THREE.CanvasTexture(iconCanvas);phaseTexture.colorSpace=THREE.SRGBColorSpace;
 const token=new THREE.Mesh(new THREE.CircleGeometry(.39,48),new THREE.MeshStandardMaterial({color:0xffffff,roughness:.8,metalness:.08}));
 token.rotation.x=-Math.PI/2;token.position.set(0,.39,0);token.receiveShadow=false;token.castShadow=false;tokenGroup.add(token);
 const icon=new THREE.Mesh(new THREE.PlaneGeometry(.72,.72),new THREE.MeshBasicMaterial({map:phaseTexture,transparent:true,side:THREE.DoubleSide,depthWrite:false}));
 icon.rotation.x=-Math.PI/2;icon.position.set(0,.405,0);icon.castShadow=false;icon.receiveShadow=false;tokenGroup.add(icon);
 const label=makeFlatText(PHASES[i].toUpperCase(),'#d4d2f0');label.rotation.x=-Math.PI/2;label.position.set(0,.405,.77);label.castShadow=false;label.receiveShadow=false;tokenGroup.add(label);
 tokenGroup.position.set(Math.cos(a)*6.5,.26,Math.sin(a)*6.5);
}
const centerRing=addMesh(new THREE.CylinderGeometry(5.15,5.15,.18,96),new THREE.MeshStandardMaterial({color:0x171f39,metalness:.5,roughness:.42}),board);centerRing.position.y=.25;
torus(5.05,.07,0x9b8ed5,.37);
// Textured Moon; a little emissive fill keeps the near-side surface readable.
const textureLoader=new THREE.TextureLoader();
const moonAlbedo=textureLoader.load('/textures/moon-albedo.jpg');moonAlbedo.colorSpace=THREE.SRGBColorSpace;
const moonGeometry=new THREE.SphereGeometry(2.7,160,112);
const moonMat=new THREE.MeshStandardMaterial({map:moonAlbedo,emissiveMap:moonAlbedo,emissive:new THREE.Color(0x777777),emissiveIntensity:.24,roughness:.96,metalness:0});
const moon=addMesh(moonGeometry,moonMat);moon.position.set(0,4.25,0);moon.castShadow=false;moon.receiveShadow=true;
fetch('/textures/moon-displacement.tiff').then(r=>{if(!r.ok)throw new Error('Moon displacement map unavailable');return r.arrayBuffer()}).then(buffer=>{
 const ifds=UTIF.decode(buffer);if(!ifds.length)throw new Error('Could not decode TIFF displacement map');UTIF.decodeImage(buffer,ifds[0]);
 const width=ifds[0].width,height=ifds[0].height,rgba=UTIF.toRGBA8(ifds[0]),position=moonGeometry.attributes.position,uv=moonGeometry.attributes.uv;
 for(let i=0;i<position.count;i++){const u=((uv.getX(i)%1)+1)%1,v=Math.max(0,Math.min(.999999,uv.getY(i))),px=Math.min(width-1,Math.floor(u*width)),py=Math.min(height-1,Math.floor(v*height)),idx=(py*width+px)*4;
  const luminance=(rgba[idx]*.299+rgba[idx+1]*.587+rgba[idx+2]*.114)/255,radius=2.7+(luminance-.5)*.12;
  const vertex=new THREE.Vector3().fromBufferAttribute(position,i).normalize().multiplyScalar(radius);position.setXYZ(i,vertex.x,vertex.y,vertex.z);}
 position.needsUpdate=true;moonGeometry.computeVertexNormals();
}).catch(error=>console.warn('Moon displacement map skipped:',error));
const moonGlow=new THREE.PointLight(0x9da9e8,3.5,13,2);moonGlow.position.set(0,4.3,0);scene.add(moonGlow);
const halo=addMesh(new THREE.SphereGeometry(2.92,48,32),new THREE.MeshBasicMaterial({color:0x9ca8e8,transparent:true,opacity:.075,side:THREE.BackSide}));halo.position.copy(moon.position);halo.castShadow=false;
// Sun marker, using the supplied solar texture with a soft emissive presentation.
const sunGroup=new THREE.Group();scene.add(sunGroup);
const sunTexture=textureLoader.load('/textures/sun-surface.jpg');sunTexture.colorSpace=THREE.SRGBColorSpace;
const sunBall=addMesh(new THREE.SphereGeometry(1.15,64,48),new THREE.MeshBasicMaterial({map:sunTexture,color:0xffedcf,toneMapped:false}),sunGroup);sunBall.castShadow=false;
const sunGlow=addMesh(new THREE.SphereGeometry(1.75,48,32),new THREE.MeshBasicMaterial({color:0xffa84c,transparent:true,opacity:.18,side:THREE.BackSide,toneMapped:false}),sunGroup);sunGlow.castShadow=false;
const sunOuterGlow=addMesh(new THREE.SphereGeometry(2.35,48,32),new THREE.MeshBasicMaterial({color:0xff8a32,transparent:true,opacity:.055,side:THREE.BackSide,toneMapped:false}),sunGroup);sunOuterGlow.castShadow=false;
sunGroup.position.set(-17,11,-13);
const sunSprite=makeLabel('SUN','#ffd995',62);sunSprite.scale.set(2,.5,1);sunSprite.position.y=-2.1;sunGroup.add(sunSprite);
function makeRocket(color){
 const g=new THREE.Group(),bodyMat=new THREE.MeshStandardMaterial({color,metalness:.42,roughness:.3});
 const body=addMesh(new THREE.CylinderGeometry(.2,.25,.88,18),bodyMat,g);body.position.y=.58;
 const nose=addMesh(new THREE.ConeGeometry(.205,.48,18),bodyMat,g);nose.position.y=1.26;
 const finMat=new THREE.MeshStandardMaterial({color,metalness:.38,roughness:.34});
 for(let j=0;j<3;j++){const angle=j*Math.PI*2/3,fin=addMesh(new THREE.BoxGeometry(.12,.32,.34),finMat,g);fin.position.set(Math.cos(angle)*.22,.31,Math.sin(angle)*.22);fin.rotation.y=angle;}
 const window=addMesh(new THREE.SphereGeometry(.105,18,14),new THREE.MeshStandardMaterial({color:0x9ceaff,metalness:.58,roughness:.16,emissive:0x245b78,emissiveIntensity:.7}),g);window.position.set(0,.77,.205);
 const flame=addMesh(new THREE.ConeGeometry(.12,.38,14),new THREE.MeshBasicMaterial({color:0xffa45e}),g);flame.rotation.z=Math.PI;flame.position.y=.05;flame.visible=false;g.userData.flame=flame;return g;
}
const rocketMeshes=PLAYERS.map(p=>{const r=makeRocket(p.color);scene.add(r);return r});
function placeRockets(){
 PLAYERS.forEach((p,i)=>{
  const a=(p.position/32)*Math.PI*2-Math.PI/2,r=10.78+(i-1.5)*.43;
  const mesh=rocketMeshes[i];mesh.position.set(Math.cos(a)*r,-.02,Math.sin(a)*r);mesh.rotation.y=-a;
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
 document.querySelector('#parts-count').textContent=p.parts.length+' / 3';
 document.querySelector('#rocket-parts').innerHTML=['Easy','Medium','Hard'].map(part=>'<span class="part-slot '+(p.parts.includes(part)?'filled':'')+'">'+(p.parts.includes(part)?'✦ ':'')+part.toUpperCase()+'</span>').join('');
 document.querySelector('#boost-count').textContent='BOOSTS '+p.boosts;
 document.querySelector('#use-boost').classList.toggle('hidden',p.boosts===0||state.gameOver);
 document.querySelector('#crew-list').innerHTML=PLAYERS.map((x,i)=>'<div class="crew-member '+(i===state.current?'current':'')+'"><span class="pilot-avatar '+x.css+'">✦</span><strong>'+x.name+'</strong><small>'+x.phases.length+'/8 · '+x.parts.length+'/3</small></div>').join('');
 document.querySelector('#roll-button').disabled=state.pending||state.gameOver;
}
renderHud();

async function loadQuestions(){
 try{
  const res=await fetch('/quesrikns.csv');if(!res.ok)throw new Error('Question file unavailable');
  const text=await res.text();const lines=text.trim().split(/\r?\n/);
  state.questions=lines.slice(1).map(line=>line.split('\t')).filter(c=>c.length>=6).map(c=>({difficulty:c[0].trim(),question:c[1],answers:c.slice(2,5),correct:c[5].trim().toUpperCase()}));
 }catch(e){console.warn('Could not load question bank',e)}
}
await loadQuestions();
function showToast(message){const el=document.querySelector('#toast');el.textContent=message;el.classList.add('show');setTimeout(()=>el.classList.remove('show'),2600)}
function shuffle(items){const a=[...items];for(let i=a.length-1;i>0;i--){const j=Math.floor(Math.random()*(i+1));[a[i],a[j]]=[a[j],a[i]]}return a}
function nextQuestion(difficulty=null){
 let pool=state.questions.filter((q,i)=>!state.used.has(i));
 if(difficulty)pool=pool.filter(q=>q.difficulty.toLowerCase()===difficulty.toLowerCase());
 if(!pool.length&&difficulty)pool=state.questions.filter(q=>q.difficulty.toLowerCase()===difficulty.toLowerCase());
 if(!pool.length){state.used.clear();pool=state.questions.filter(q=>!difficulty||q.difficulty.toLowerCase()===difficulty.toLowerCase())}
 if(!pool.length)return null;
 const q=pool[Math.floor(Math.random()*pool.length)];state.used.add(state.questions.indexOf(q));return q;
}
function checkWin(player){
 if(player.phases.length===8&&['Easy','Medium','Hard'].every(part=>player.parts.includes(part))){
  state.gameOver=true;document.querySelector('#roll-button').disabled=true;document.querySelector('#use-boost').classList.add('hidden');
  showToast(player.name+' completed the lunar cycle and built their rocket. Mission accomplished!');
  document.querySelector('#move-status').textContent=player.name+' wins AstroPhase!';
  return true;
 }
 return false;
}
function showQuestion({difficulty=null,rewardDifficulty=null}={}){
 const q=nextQuestion(difficulty);
 if(!q){showToast('No questions found for '+(difficulty||'the question bank')+'.');endTurn();return}
 state.pending=true;
 document.querySelector('#question-title').textContent=q.question;
 document.querySelector('#question-difficulty').textContent=difficulty?difficulty.toUpperCase()+' QUESTION':q.difficulty.toUpperCase();
 const list=document.querySelector('#answer-list');list.innerHTML='';
 q.answers.forEach((answer,i)=>{
  const button=document.createElement('button');button.className='answer-option';
  const letter=document.createElement('span');letter.className='letter';letter.textContent=String.fromCharCode(65+i);
  const label=document.createElement('span');label.textContent=answer;
  button.append(letter,label);button.addEventListener('click',()=>resolveAnswer(button,q,String.fromCharCode(65+i),rewardDifficulty));list.appendChild(button);
 });
 document.querySelector('#answer-feedback').textContent='';
 document.querySelector('#continue-button').classList.add('hidden');
 document.querySelector('#question-modal').classList.remove('hidden');
}
function resolveAnswer(button,q,choice,rewardDifficulty=null){
 const buttons=[...document.querySelectorAll('.answer-option')];buttons.forEach(b=>b.disabled=true);
 const correct=choice===q.correct;
 buttons.forEach((b,i)=>{if(String.fromCharCode(65+i)===q.correct)b.classList.add('correct')});
 const feedback=document.querySelector('#answer-feedback');
 if(correct){
  const p=PLAYERS[state.current],phase=Math.floor(p.position/4),earned=[];
  if(!state.phaseBlocked&&!p.phases.includes(phase)){p.phases.push(phase);earned.push(PHASES[phase]+' phase')}
  else if(state.phaseBlocked)earned.push('no phase this turn (Solar Eclipse)');
  const part=rewardDifficulty||q.difficulty;
  const normalized=['Easy','Medium','Hard'].find(x=>x.toLowerCase()===String(part).toLowerCase());
  if(normalized&&!p.parts.includes(normalized)){p.parts.push(normalized);earned.push(normalized+' rocket component')}
  feedback.textContent=earned.length?'Correct! Collected: '+earned.join(' + ')+'.':'Correct! You already have this phase and rocket component.';
  renderHud();checkWin(p);
 }else{
  button.classList.add('wrong');feedback.textContent='Not quite. The correct answer is highlighted. Keep exploring!';
 }
 document.querySelector('#continue-button').classList.remove('hidden');
}
function endTurn(){
 state.pending=false;state.roll=null;state.phaseBlocked=false;
 document.querySelector('#roll-button').disabled=state.gameOver;
 document.querySelector('#roll-button').innerHTML='<span>SPIN TO MOVE</span><span>↗</span>';
 document.querySelector('#move-status').textContent='Ready for the next pilot.';
 if(!state.gameOver){state.current=(state.current+1)%PLAYERS.length;if(state.current===0)state.turn++}
 renderHud();
}
function showEvent(event){
 const modal=document.querySelector('#event-modal'),actions=document.querySelector('#event-actions');
 document.querySelector('#event-title').textContent=event.title;
 document.querySelector('#event-description').textContent=event.description;
 document.querySelector('#event-icon').textContent=event.icon||'✦';
 actions.innerHTML='';modal.classList.remove('hidden');
 const action=(label,fn,primary=false,disabled=false)=>{const b=document.createElement('button');b.className='event-action'+(primary?' primary':'');b.textContent=label;b.disabled=disabled;b.addEventListener('click',()=>{modal.classList.add('hidden');fn()});actions.appendChild(b)};
 const finish=()=>endTurn();
 switch(event.id){
  case 'solar-flare':{
   const p=PLAYERS[state.current];
   if(p.parts.length){const lost=p.parts[Math.floor(Math.random()*p.parts.length)];p.parts=p.parts.filter(x=>x!==lost);document.querySelector('#move-status').textContent='Solar Flare destroyed your '+lost+' rocket component.'}
   else document.querySelector('#move-status').textContent='Solar Flare! No rocket components to lose.';
   renderHud();action('CONTINUE',finish,true);break;
  }
  case 'crew-exchange':
   PLAYERS.forEach((p,i)=>{if(i!==state.current)action('Swap with '+p.name,()=>{const me=PLAYERS[state.current],pos=me.position;me.position=p.position;p.position=pos;updateRocketPositions();renderHud();showToast('You swapped positions with '+p.name+'.');endTurn()})});
   action('KEEP YOUR POSITION',finish);break;
  case 'solar-eclipse':
   state.phaseBlocked=true;document.querySelector('#move-status').textContent='Solar Eclipse: phase collection is blocked this turn.';
   action('ANSWER A QUESTION',()=>showQuestion(),true);break;
  case 'oxygen-leak':{
   const p=PLAYERS[state.current];
   if(p.phases.length){const lost=p.phases[Math.floor(Math.random()*p.phases.length)];p.phases=p.phases.filter(x=>x!==lost);document.querySelector('#move-status').textContent='Oxygen Leak: lost '+PHASES[lost]+'.'}
   else document.querySelector('#move-status').textContent='Oxygen Leak! You have no phases to lose.';
   renderHud();action('CONTINUE',finish,true);break;
  }
  case 'rocket-boost':
   action('TAKE AN EXTRA SPIN NOW',()=>{state.pending=false;spinTurn(true)},true);
   action('SAVE BOOST FOR LATER',()=>{PLAYERS[state.current].boosts++;renderHud();showToast('Rocket Boost saved for a future turn.');endTurn()});break;
  case 'bad-weather':
   action('SKIP TURN',()=>{showToast('Bad Weather: '+PLAYERS[state.current].name+' loses this turn.');endTurn()},true);break;
  case 'fuel-leak':
   action('MOVE ONE LESS SPACE',()=>{moveAndQuestion(Math.max(0,state.roll-1));},true);break;
  case 'space-sick':
   action('ANSWER HARD QUESTION',()=>{showQuestion({difficulty:'Hard',rewardDifficulty:'Easy'})},true);break;
  case 'slingshot':{
   const p=PLAYERS[state.current];p.position=(p.position+16)%32;updateRocketPositions();
   document.querySelector('#move-status').textContent='Slingshot maneuver! Now at space '+(p.position+1)+'.';
   action('CONTINUE FLIGHT',()=>showQuestion(),true);break;
  }
  case 'spacewalk':{
   const targets=PLAYERS.filter((p,i)=>i!==state.current&&p.phases.length);
   if(!targets.length){action('NO PHASES AVAILABLE — CONTINUE',finish,true);break}
   targets.forEach(target=>action('Choose '+target.name,()=>{
    actions.innerHTML='';
    target.phases.forEach(phase=>action('Take '+PHASES[phase],()=>{
     target.phases=target.phases.filter(x=>x!==phase);PLAYERS[state.current].phases.push(phase);
     renderHud();showToast(PLAYERS[state.current].name+' acquired '+PHASES[phase]+' from '+target.name+'.');
     checkWin(PLAYERS[state.current]);if(!state.gameOver)endTurn();
    }));
    action('CANCEL',()=>showEvent(event));
    modal.classList.remove('hidden');
   }));
   action('CANCEL',finish);break;
  }
  default:action('CONTINUE',finish,true);
 }
}
const EVENTS=[
 {id:'solar-flare',title:'Solar Flare',description:'Extra radiation has damaged part of your spacecraft. Remove a piece of your rocket.',icon:'☀'},
 {id:'crew-exchange',title:'Crew Exchange',description:'Swap places with another player that you choose.',icon:'⇄'},
 {id:'solar-eclipse',title:'Solar Eclipse',description:'The Earth is blocking the light of the Sun from the Moon. You cannot collect a phase this turn.',icon:'🌑'},
 {id:'oxygen-leak',title:'Oxygen Leak',description:'You are having trouble concentrating. Lose one of your phases.',icon:'◉'},
 {id:'rocket-boost',title:'Rocket Boost',description:'You have extra fuel to do another rocket burn. Take an extra spin now or save it for whenever you want.',icon:'🚀'},
 {id:'bad-weather',title:'Bad Weather',description:'The mission is delayed because of weather during launch. Skip your turn.',icon:'☁'},
 {id:'fuel-leak',title:'Fuel Leak',description:'There is a hole in your fuel tank so you don’t have enough to go as far. Move one less space than your spin.',icon:'⛽'},
 {id:'space-sick',title:'Space Sick',description:'You are space sick from zero gravity. Answer a hard question, but it only counts as easy.',icon:'🌀'},
 {id:'slingshot',title:'Slingshot',description:'A slingshot maneuver uses the Moon’s gravity to swing you around to the other side. Move your piece to the opposite space on the board.',icon:'🌙'},
 {id:'spacewalk',title:'Spacewalk',description:'Suit up and leave your ship. Take a phase from another player that you choose.',icon:'🧑‍🚀'}
];
function drawEvent(){if(!state.eventDeck.length)state.eventDeck=shuffle(EVENTS);return state.eventDeck.pop()}
function moveAndQuestion(spaces){
 const p=PLAYERS[state.current];p.position=(p.position+spaces)%32;updateRocketPositions();
 document.querySelector('#move-status').textContent=p.name+' moved '+spaces+' spaces · Space '+(p.position+1);
 showQuestion();
}
function spinTurn(isBonus=false){
 if(state.pending||state.gameOver)return;
 state.pending=true;
 if(isBonus){const p=PLAYERS[state.current];if(p.boosts>0)p.boosts--;renderHud()}
 document.querySelector('#roll-button').disabled=true;
 document.querySelector('#use-boost').classList.add('hidden');
 const outcome=Math.floor(Math.random()*8),slots=[1,3,5,'EVENT',2,4,6,'EVENT'];
 const rocket=document.querySelector('#spinner-rocket');
 const rotation=outcome*45+360*(5+Math.floor(Math.random()*3));
 rocket.style.transform='rotate('+rotation+'deg)';
 document.querySelector('#move-status').textContent='The spinner is slowing down…';
 setTimeout(()=>{
  const result=slots[outcome];state.roll=result==='EVENT'?null:result;
  if(result==='EVENT'){state.pending=false;showEvent(drawEvent());return}
  moveAndQuestion(result);
 },1550);
}
document.querySelector('#roll-button').addEventListener('click',()=>spinTurn(false));
document.querySelector('#use-boost').addEventListener('click',()=>spinTurn(true));
document.querySelector('#continue-button').addEventListener('click',()=>{
 document.querySelector('#question-modal').classList.add('hidden');
 if(state.gameOver)return;
 endTurn();
});
