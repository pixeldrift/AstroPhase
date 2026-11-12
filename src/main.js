import * as THREE from 'three';
import UTIF from 'utif';
import { OrbitControls } from 'three/addons/controls/OrbitControls.js';
import { EffectComposer } from 'three/addons/postprocessing/EffectComposer.js';
import { RenderPass } from 'three/addons/postprocessing/RenderPass.js';
import { UnrealBloomPass } from 'three/addons/postprocessing/UnrealBloomPass.js';
import { ShaderPass } from 'three/addons/postprocessing/ShaderPass.js';
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
const starfieldTexture=new THREE.TextureLoader().load('/textures/starfield.jpg');
starfieldTexture.colorSpace=THREE.SRGBColorSpace;
starfieldTexture.mapping=THREE.EquirectangularReflectionMapping;
scene.background=starfieldTexture;
scene.fog=new THREE.FogExp2(0x080d1c,.012);
const camera=new THREE.PerspectiveCamera(38,1,.1,160);
camera.position.set(0,38,64);
const renderer=new THREE.WebGLRenderer({antialias:true,alpha:false});
renderer.setPixelRatio(Math.min(devicePixelRatio,2));
renderer.shadowMap.enabled=true;
renderer.shadowMap.type=THREE.PCFSoftShadowMap;
renderer.outputColorSpace=THREE.SRGBColorSpace;
renderer.toneMapping=THREE.ACESFilmicToneMapping;
renderer.toneMappingExposure=1.12;
sceneRoot.appendChild(renderer.domElement);
const composer=new EffectComposer(renderer);
composer.addPass(new RenderPass(scene,camera));
const bloomPass=new UnrealBloomPass(new THREE.Vector2(1,1),1.0,.56,.84);
const bloomComposer=new EffectComposer(renderer);
bloomComposer.renderToScreen=false;
bloomComposer.addPass(new RenderPass(scene,camera));
bloomComposer.addPass(bloomPass);
const bloomCompositePass=new ShaderPass(new THREE.ShaderMaterial({
 uniforms:{baseTexture:{value:null},bloomTexture:{value:bloomComposer.renderTarget2.texture}},
 vertexShader:'varying vec2 vUv;void main(){vUv=uv;gl_Position=projectionMatrix*modelViewMatrix*vec4(position,1.0);}',
 fragmentShader:'uniform sampler2D baseTexture;uniform sampler2D bloomTexture;varying vec2 vUv;void main(){gl_FragColor=texture2D(baseTexture,vUv)+texture2D(bloomTexture,vUv);}'
}),'baseTexture');
composer.addPass(bloomCompositePass);
const controls=new OrbitControls(camera,renderer.domElement);
controls.enableDamping=true;controls.dampingFactor=.055;controls.minDistance=17;controls.maxDistance=90;
controls.maxPolarAngle=Math.PI*.48;controls.target.set(0,1.2,0);
const boardAmbient=new THREE.HemisphereLight(0xb8c9ee,0x25213a,2.65);boardAmbient.layers.set(0);scene.add(boardAmbient);
const sunLight=new THREE.DirectionalLight(0xffe4b0,3.4);
sunLight.position.set(19.5,4.25,60);sunLight.castShadow=true;sunLight.layers.set(1);
sunLight.shadow.mapSize.set(2048,2048);
sunLight.shadow.camera.left=-28;sunLight.shadow.camera.right=28;sunLight.shadow.camera.top=28;sunLight.shadow.camera.bottom=-28;
sunLight.shadow.camera.near=.1;sunLight.shadow.camera.far=120;sunLight.shadow.camera.updateProjectionMatrix();
sunLight.shadow.bias=-.00012;sunLight.shadow.normalBias=.025;sunLight.shadow.radius=5;sunLight.shadow.autoUpdate=true;
scene.add(sunLight);scene.add(sunLight.target);
// Broad orbital fill: place the point source at Earth's position so the Moon stays
// consistently filled throughout its orbit. Distance 0 removes the old 60-unit cutoff.
const fillLight=new THREE.PointLight(0x718ac2,900,0,2);
fillLight.position.set(0,4.25,0);
fillLight.layers.enable(1);
scene.add(fillLight);

// Star field is supplied as an equirectangular background texture.

function roundedPolygonShape(points,radius){
 const shape=new THREE.Shape(),corners=points.map((p,i)=>{
  const prev=points[(i+points.length-1)%points.length],next=points[(i+1)%points.length];
  const d1=new THREE.Vector2(prev[0]-p[0],prev[1]-p[1]),d2=new THREE.Vector2(next[0]-p[0],next[1]-p[1]);
  const len1=d1.length(),len2=d2.length();d1.normalize();d2.normalize();
  const corner= -d1.dot(d2)<.985,r=corner?Math.min(radius,len1*.42,len2*.42):0;
  return {in:[p[0]+d1.x*r,p[1]+d1.y*r],out:[p[0]+d2.x*r,p[1]+d2.y*r],vertex:p};
 });
 shape.moveTo(corners[0].in[0],corners[0].in[1]);
 for(let i=0;i<corners.length;i++){
  const c=corners[i];shape.quadraticCurveTo(c.vertex[0],c.vertex[1],c.out[0],c.out[1]);
  const next=corners[(i+1)%corners.length];shape.lineTo(next.in[0],next.in[1]);
 }
 shape.closePath();return shape;
}
function annularSectorPoints(inner,outer,start,end,segments=18){
 const points=[];
 for(let i=0;i<=segments;i++){const a=start+(end-start)*i/segments;points.push([Math.cos(a)*outer,Math.sin(a)*outer]);}
 for(let i=segments;i>=0;i--){const a=start+(end-start)*i/segments;points.push([Math.cos(a)*inner,Math.sin(a)*inner]);}
 return points;
}
function addMesh(geometry,material,parent=scene){const mesh=new THREE.Mesh(geometry,material);mesh.castShadow=true;mesh.receiveShadow=true;parent.add(mesh);return mesh;}
function makeLabel(text,color='#dce4ff',size=72){
 const c=document.createElement('canvas');c.width=512;c.height=128;
 const ctx=c.getContext('2d');ctx.font='600 '+size+'px "DM Sans",sans-serif';ctx.textAlign='center';ctx.textBaseline='middle';ctx.fillStyle=color;ctx.shadowColor=color;ctx.shadowBlur=12;ctx.fillText(text,256,64);
 const tex=new THREE.CanvasTexture(c);tex.colorSpace=THREE.SRGBColorSpace;
 const sprite=new THREE.Sprite(new THREE.SpriteMaterial({map:tex,transparent:true,depthWrite:false}));
 sprite.scale.set(3.1,.78,1);return sprite;
}
const earthMoonOrbit=new THREE.Group();scene.add(earthMoonOrbit);
const board=new THREE.Group();
const baseMat=new THREE.MeshStandardMaterial({color:0x2b3858,metalness:.48,roughness:.44});
function makeAnnularDeck(inner,outer,depth){
 const shape=new THREE.Shape();shape.absarc(0,0,outer,0,Math.PI*2,false);
 const hole=new THREE.Path();hole.absarc(0,0,inner,0,Math.PI*2,true);shape.holes.push(hole);
 const geometry=new THREE.ExtrudeGeometry(shape,{depth,bevelEnabled:false,curveSegments:128});
 geometry.rotateX(-Math.PI/2);return geometry;
}
// The structural decks share the same open center as the raised phase rings.
const base=addMesh(makeAnnularDeck(5.18,13.35,.8),baseMat,board);base.position.y=-.45;
const top=addMesh(makeAnnularDeck(5.18,13.0,.16),new THREE.MeshStandardMaterial({color:0x1d2945,metalness:.25,roughness:.68}),board);top.position.y=.02;
function makeTier(inner,outer,depth,y,color){
 const shape=new THREE.Shape();shape.absarc(0,0,outer,0,Math.PI*2,false);
 const hole=new THREE.Path();hole.absarc(0,0,inner,0,Math.PI*2,true);shape.holes.push(hole);
 const geometry=new THREE.ExtrudeGeometry(shape,{depth,bevelEnabled:true,bevelSegments:2,steps:1,bevelSize:.045,bevelThickness:.035,curveSegments:128});
 geometry.rotateX(-Math.PI/2);
 const mesh=addMesh(geometry,new THREE.MeshStandardMaterial({color,metalness:.48,roughness:.42}),board);
 mesh.position.y=y;mesh.castShadow=true;mesh.receiveShadow=true;return mesh;
}
// Raised annular decks restore the layered, machined tabletop profile.
makeTier(8.65,12.9,.28,.1,0x354766);
makeTier(5.18,8.48,.2,.1,0x303c5b);
function torus(radius,tube,color,y){const m=addMesh(new THREE.TorusGeometry(radius,tube,10,160),new THREE.MeshStandardMaterial({color,metalness:.75,roughness:.32,emissive:color,emissiveIntensity:.13}),board);m.rotation.x=Math.PI/2;m.position.y=y;return m}
torus(12.75,.075,0x6678a5,.4);torus(8.35,.09,0x7884b8,.32);torus(5.23,.055,0x7565b8,.37);
const tileMaterials=[0x465a7d,0x50658b,0x465a7d,0x50658b];
const trackTiles=[];
const sectorAngle=Math.PI/4,phaseGap=sectorAngle*.06,innerGap=sectorAngle*.025;
const tileSpan=(sectorAngle-phaseGap-3*innerGap)/4,slotStep=tileSpan+innerGap;
for(let i=0;i<32;i++){
 const phaseIndex=Math.floor(i/4),slotInPhase=i%4;
 const phaseCenter=-Math.PI/2+(phaseIndex/8)*Math.PI*2;
 const groupStart=-(sectorAngle-phaseGap)/2;
 const a=phaseCenter+groupStart+tileSpan/2+slotInPhase*slotStep;
 const half=tileSpan/2,inner=9.05,outer=11.7;
 const shape=roundedPolygonShape(annularSectorPoints(inner,outer,a-half,a+half,18),.24);
 const geo=new THREE.ExtrudeGeometry(shape,{depth:.18,bevelEnabled:true,bevelSegments:2,steps:1,bevelSize:.065,bevelThickness:.035,curveSegments:8});
 geo.rotateX(-Math.PI/2);
 const tile=addMesh(geo,new THREE.MeshStandardMaterial({color:tileMaterials[slotInPhase],metalness:.32,roughness:.52,side:THREE.DoubleSide}),board);
 tile.position.y=.38;tile.userData.index=i;tile.userData.phaseIndex=phaseIndex;trackTiles.push(tile);
 const num=makeLabel(String(i+1),'#c3cde6',48);
 num.position.set(Math.cos(a)*10.35,.59,Math.sin(a)*10.35);num.scale.set(.62,.26,1);board.add(num);
}
const phaseGroup=new THREE.Group();board.add(phaseGroup);
const phaseMeshes=[];
function makeFlatText(text,color='#ffffff'){
 const words=text.trim().split(/\s+/),mid=Math.ceil(words.length/2),rows=[words.slice(0,mid).join(' '),words.slice(mid).join(' ')].filter(Boolean);
 const canvas=document.createElement('canvas');canvas.width=768;canvas.height=320;
 const ctx=canvas.getContext('2d'),fontSize=88,centerX=canvas.width/2,maxWidth=680;
 ctx.clearRect(0,0,canvas.width,canvas.height);
 ctx.font=`700 ${fontSize}px "DM Sans",sans-serif`;
 ctx.textAlign='center';ctx.textBaseline='middle';ctx.fillStyle=color;
 const baselines=rows.length===1?[160]:[105,220];
 rows.forEach((line,row)=>{
  const chars=[...line],widths=chars.map(ch=>ctx.measureText(ch).width),total=widths.reduce((sum,width)=>sum+width,0);
  const scale=Math.min(1,maxWidth/total),scaledWidths=widths.map(width=>width*scale),scaledTotal=scaledWidths.reduce((sum,width)=>sum+width,0);
  const radius=1000,baseline=baselines[row];
  let cursor=-scaledTotal/2;
  chars.forEach((ch,index)=>{
   const width=scaledWidths[index],angle=(cursor+width/2)/radius;
   const x=centerX+radius*Math.sin(angle),y=baseline-radius*(1-Math.cos(angle));
   ctx.save();ctx.translate(x,y);ctx.rotate(-angle);
   ctx.font=`700 ${fontSize*scale}px "DM Sans",sans-serif`;
   ctx.fillText(ch,0,0);ctx.restore();cursor+=width;
  });
 });
 const texture=new THREE.CanvasTexture(canvas);texture.colorSpace=THREE.SRGBColorSpace;
 const material=new THREE.MeshBasicMaterial({map:texture,transparent:true,depthWrite:false,side:THREE.DoubleSide});
 const group=new THREE.Group(),plane=new THREE.Mesh(new THREE.PlaneGeometry(2.85,1.25),material);
 group.add(plane);return group;
}
for(let i=0;i<8;i++){
 const a=-Math.PI/2+(i/8)*Math.PI*2,half=(Math.PI/8)*.94,ri=5.45,ro=8.15;
 const sh=roundedPolygonShape(annularSectorPoints(ri,ro,a-half,a+half,24),.24);
 const phaseGeo=new THREE.ExtrudeGeometry(sh,{depth:.07,bevelEnabled:true,bevelSegments:2,steps:1,bevelSize:.055,bevelThickness:.025,curveSegments:8});
 const mesh=addMesh(phaseGeo,new THREE.MeshStandardMaterial({color:0x303b5b,metalness:.12,roughness:.78,side:THREE.DoubleSide}),phaseGroup);
 mesh.rotation.x=-Math.PI/2;mesh.position.y=.27;mesh.userData.phase=i;mesh.castShadow=false;phaseMeshes.push(mesh);
 const tokenGroup=new THREE.Group();phaseGroup.add(tokenGroup);tokenGroup.rotation.y=Math.PI/2-a;
 const iconCanvas=document.createElement('canvas');iconCanvas.width=256;iconCanvas.height=256;
 const ix=iconCanvas.getContext('2d'),cx=128,cy=128,rad=112;
 const pixels=ix.createImageData(256,256);
 const viewX=Math.cos(a),viewZ=Math.sin(a),rightX=Math.sin(a),rightZ=-Math.cos(a);
 const sunX=0,sunZ=1,viewDot=viewX*sunX+viewZ*sunZ,rightDot=rightX*sunX+rightZ*sunZ;
 for(let py=0;py<256;py++)for(let px=0;px<256;px++){
  const nx=(px+.5-cx)/rad,ny=(py+.5-cy)/rad,r2=nx*nx+ny*ny;if(r2>1)continue;
  const nz=Math.sqrt(1-r2),lit=nx*rightDot+nz*viewDot>0,shade=.91+.09*nz;
  const p=(py*256+px)*4,base=lit?229:23;
  pixels.data[p]=Math.round(base*(lit?1:0.92)*shade);
  pixels.data[p+1]=Math.round((lit?224:28)*shade);
  pixels.data[p+2]=Math.round((lit?210:45)*shade);
  pixels.data[p+3]=255;
 }
 ix.putImageData(pixels,0,0);
 ix.beginPath();ix.arc(cx,cy,rad,0,Math.PI*2);ix.strokeStyle='rgba(220,225,245,.65)';ix.lineWidth=4;ix.stroke();
 const phaseTexture=new THREE.CanvasTexture(iconCanvas);phaseTexture.colorSpace=THREE.SRGBColorSpace;
 const token=new THREE.Mesh(new THREE.CircleGeometry(.55,48),new THREE.MeshStandardMaterial({color:0xffffff,roughness:.8,metalness:.08}));
 token.rotation.x=-Math.PI/2;token.position.set(0,.39,0);token.receiveShadow=false;token.castShadow=false;tokenGroup.add(token);
 const icon=new THREE.Mesh(new THREE.PlaneGeometry(1.02,1.02),new THREE.MeshBasicMaterial({map:phaseTexture,transparent:true,side:THREE.DoubleSide,depthWrite:false}));
 icon.rotation.x=-Math.PI/2;icon.position.set(0,.405,0);icon.castShadow=false;icon.receiveShadow=false;tokenGroup.add(icon);
 const label=makeFlatText(PHASES[i].toUpperCase(),'#ffffff');label.rotation.x=-Math.PI/2;label.position.set(0,.415,1.25);label.traverse(o=>{o.castShadow=false;o.receiveShadow=false});tokenGroup.add(label);
 tokenGroup.position.set(Math.cos(a)*6.15,.29,Math.sin(a)*6.15);
}
// The center remains open beneath the Moon; no insert or floor closes the aperture.

 // Earth sits at the center of the Moon's orbital path, using the supplied map set.
 const earthGroup=new THREE.Group();earthGroup.position.set(0,4.25,0);scene.add(earthGroup);
 const earthDayTexture=new THREE.TextureLoader().load('/textures/earth-day.jpg');earthDayTexture.colorSpace=THREE.SRGBColorSpace;earthDayTexture.flipY=true;
 const earthNightTexture=new THREE.TextureLoader().load('/textures/earth-night.jpg');earthNightTexture.colorSpace=THREE.SRGBColorSpace;earthNightTexture.flipY=true;
 const earthCloudTexture=new THREE.TextureLoader().load('/textures/earth-clouds.jpg');earthCloudTexture.colorSpace=THREE.SRGBColorSpace;earthCloudTexture.flipY=true;
 const earthCloudAlphaTexture=earthCloudTexture.clone();earthCloudAlphaTexture.colorSpace=THREE.NoColorSpace;earthCloudAlphaTexture.needsUpdate=true;
 const earthMaterial=new THREE.MeshPhongMaterial({map:earthDayTexture,emissive:0xffffff,emissiveMap:earthNightTexture,emissiveIntensity:.72,specular:new THREE.Color(0x4a6a86),shininess:22});
 earthMaterial.onBeforeCompile=shader=>{
  shader.uniforms.uEarthSunDirection={value:new THREE.Vector3(0,0,1)};
  shader.vertexShader=shader.vertexShader.replace('#include <common>','#include <common>\nvarying vec3 vEarthWorldNormal;');
  shader.vertexShader=shader.vertexShader.replace('#include <worldpos_vertex>','#include <worldpos_vertex>\nvEarthWorldNormal = normalize(mat3(modelMatrix) * normal);');
  shader.fragmentShader=shader.fragmentShader.replace('#include <common>','#include <common>\nuniform vec3 uEarthSunDirection;\nvarying vec3 vEarthWorldNormal;');
  shader.fragmentShader=shader.fragmentShader.replace('#include <emissivemap_fragment>','#include <emissivemap_fragment>\nfloat earthDaylight = smoothstep(-0.12, 0.18, dot(normalize(vEarthWorldNormal), normalize(uEarthSunDirection)));\ntotalEmissiveRadiance *= (1.0 - earthDaylight);');
  earthMaterial.userData.shader=shader;
 };
 const earth=new THREE.Mesh(new THREE.SphereGeometry(3.35,128,96),earthMaterial);earth.castShadow=true;earth.receiveShadow=true;earthGroup.add(earth);earth.layers.set(1);
 // Both transparent shells use a view-space Fresnel term. Clouds retain their
 // texture mask across the disk, while their opacity gently increases toward the limb.
 function applyViewFresnel(material,centerVisibility,power){
  material.onBeforeCompile=shader=>{
   shader.vertexShader=shader.vertexShader.replace('#include <common>','#include <common>\nvarying vec3 vShellViewNormal;varying vec3 vShellViewDirection;');
   shader.vertexShader=shader.vertexShader.replace('#include <project_vertex>','#include <project_vertex>\nvShellViewNormal=normalize(normalMatrix*normal);vShellViewDirection=normalize(-mvPosition.xyz);');
   shader.fragmentShader=shader.fragmentShader.replace('#include <common>','#include <common>\nvarying vec3 vShellViewNormal;varying vec3 vShellViewDirection;');
   shader.fragmentShader=shader.fragmentShader.replace('#include <alphamap_fragment>',`#include <alphamap_fragment>\nfloat shellFacing=abs(dot(normalize(vShellViewNormal),normalize(vShellViewDirection)));float shellFresnel=pow(1.0-shellFacing,${power.toFixed(2)});diffuseColor.a*=mix(${centerVisibility.toFixed(2)},1.0,shellFresnel);`);
  };
  material.customProgramCacheKey=()=> 'view-fresnel-'+centerVisibility+'-'+power;
 }
 const earthCloudMaterial=new THREE.MeshBasicMaterial({color:0xffffff,map:earthCloudTexture,alphaMap:earthCloudAlphaTexture,transparent:true,opacity:.9,depthWrite:false,depthTest:true,side:THREE.FrontSide});
 applyViewFresnel(earthCloudMaterial,.72,1.8);
 const earthClouds=new THREE.Mesh(new THREE.SphereGeometry(3.405,128,96),earthCloudMaterial);earthClouds.renderOrder=2;earthGroup.add(earthClouds);earthClouds.layers.set(1);
 const atmosphereMaterial=new THREE.MeshBasicMaterial({color:0x65baff,transparent:true,opacity:.52,side:THREE.BackSide,depthWrite:false,depthTest:true,blending:THREE.AdditiveBlending,toneMapped:false});
 // Shape the atmospheric rim as a soft band: it builds gently outside the disk,
 // peaks just inside the silhouette, then fades back to transparent at the shell edge.
 atmosphereMaterial.onBeforeCompile=shader=>{
  shader.vertexShader=shader.vertexShader.replace('#include <common>','#include <common>\nvarying vec3 vAtmosphereViewNormal;varying vec3 vAtmosphereViewDirection;');
  shader.vertexShader=shader.vertexShader.replace('#include <project_vertex>','#include <project_vertex>\nvAtmosphereViewNormal=normalize(normalMatrix*normal);vAtmosphereViewDirection=normalize(-mvPosition.xyz);');
  shader.fragmentShader=shader.fragmentShader.replace('#include <common>','#include <common>\nvarying vec3 vAtmosphereViewNormal;varying vec3 vAtmosphereViewDirection;');
  shader.fragmentShader=shader.fragmentShader.replace('#include <alphamap_fragment>',`#include <alphamap_fragment>\nfloat atmosphereFacing=abs(dot(normalize(vAtmosphereViewNormal),normalize(vAtmosphereViewDirection)));float atmosphereRim=1.0-atmosphereFacing;float rimBuild=smoothstep(0.015,0.30,atmosphereRim);float rimFade=1.0-smoothstep(0.48,0.94,atmosphereRim);diffuseColor.a*=rimBuild*rimFade;`);
 };
 atmosphereMaterial.customProgramCacheKey=()=>'soft-atmosphere-rim-v1';
 const earthAtmosphere=new THREE.Mesh(new THREE.SphereGeometry(3.47,128,96),atmosphereMaterial);earthAtmosphere.renderOrder=3;
 earthGroup.add(earthAtmosphere);earthAtmosphere.layers.set(1);
 Promise.all([
  fetch('/textures/earth-normal.tiff').then(r=>r.arrayBuffer()),
  fetch('/textures/earth-specular.tiff').then(r=>r.arrayBuffer())
 ]).then(([normalBuffer,specularBuffer])=>{
  const decode=(buffer)=>{const ifds=UTIF.decode(buffer);UTIF.decodeImage(buffer,ifds[0]);const rgba=UTIF.toRGBA8(ifds[0]);const tex=new THREE.DataTexture(rgba,ifds[0].width,ifds[0].height,THREE.RGBAFormat);tex.flipY=true;tex.needsUpdate=true;tex.wrapS=THREE.RepeatWrapping;tex.wrapT=THREE.ClampToEdgeWrapping;tex.magFilter=THREE.LinearFilter;tex.minFilter=THREE.LinearMipmapLinearFilter;tex.generateMipmaps=true;tex.colorSpace=THREE.NoColorSpace;return tex;};
  earthMaterial.normalMap=decode(normalBuffer);earthMaterial.normalScale.set(.72,.72);
  earthMaterial.specularMap=decode(specularBuffer);earthMaterial.needsUpdate=true;
 }).catch(error=>console.warn('Earth detail maps skipped:',error));

torus(5.05,.07,0x9b8ed5,.37);
// Textured Moon; a little emissive fill keeps the near-side surface readable.
const textureLoader=new THREE.TextureLoader();
const moonAlbedo=textureLoader.load('/textures/moon-albedo.jpg');moonAlbedo.colorSpace=THREE.SRGBColorSpace;
const moonGeometry=new THREE.SphereGeometry(2.7,256,192);
const moonMat=new THREE.MeshStandardMaterial({map:moonAlbedo,emissive:new THREE.Color(0x000000),emissiveIntensity:0,roughness:.985,metalness:0});
// Remove indirect/ambient illumination from the lunar surface. Only direct sunlight
// should reveal terrain; the terminator's night side must remain genuinely dark.
moonMat.onBeforeCompile=shader=>{
 shader.fragmentShader=shader.fragmentShader.replace(
  '#include <lights_fragment_end>',
  '#include <lights_fragment_end>\nreflectedLight.indirectDiffuse=vec3(0.0);'
 );
};
moonMat.customProgramCacheKey=()=>'moon-direct-sunlight-only-v1';
const moon=addMesh(moonGeometry,moonMat,earthMoonOrbit);moon.position.set(19.5,4.25,0);moon.castShadow=true;moon.receiveShadow=true;
// The board is fixed to the Moon; its quarter-token axis is aligned with the lunar terminator at the initial Sun direction.
// Keep the texture's lunar near-side meridian facing Earth (+world X is away from Earth).
// With the Moon at +X, a half-turn brings the texture's +X face toward Earth (-X).
moon.add(board);board.position.set(0,-4.25,0);board.rotation.y=Math.PI;
moon.layers.set(1);camera.layers.enable(1);camera.layers.enable(2);
moon.rotation.y=Math.PI;moon.add(camera);camera.position.set(64,38,19.5);controls.target.set(0,0,0);sunLight.target.position.set(0,4.25,0);
sunLight.intensity=4.6;

fetch('/textures/moon-displacement.tiff').then(r=>{if(!r.ok)throw new Error('Moon displacement map unavailable');return r.arrayBuffer()}).then(buffer=>{
 const ifds=UTIF.decode(buffer);if(!ifds.length)throw new Error('Could not decode TIFF displacement map');UTIF.decodeImage(buffer,ifds[0]);
 const width=ifds[0].width,height=ifds[0].height,rgba=UTIF.toRGBA8(ifds[0]),position=moonGeometry.attributes.position,uv=moonGeometry.attributes.uv;
 for(let i=0;i<position.count;i++){const u=((uv.getX(i)%1)+1)%1,v=Math.max(0,Math.min(.999999,uv.getY(i))),px=Math.min(width-1,Math.floor(u*width)),py=Math.min(height-1,Math.floor(v*height)),idx=(py*width+px)*4;
  const luminance=(rgba[idx]*.299+rgba[idx+1]*.587+rgba[idx+2]*.114)/255,radius=2.7+(luminance-.5)*.64;
  const vertex=new THREE.Vector3().fromBufferAttribute(position,i).normalize().multiplyScalar(radius);position.setXYZ(i,vertex.x,vertex.y,vertex.z);}
 position.needsUpdate=true;moonGeometry.computeVertexNormals();
 const bumpTexture=new THREE.DataTexture(rgba,width,height,THREE.RGBAFormat);bumpTexture.needsUpdate=true;bumpTexture.wrapS=THREE.RepeatWrapping;bumpTexture.wrapT=THREE.ClampToEdgeWrapping;bumpTexture.magFilter=THREE.LinearFilter;bumpTexture.minFilter=THREE.LinearMipmapLinearFilter;bumpTexture.generateMipmaps=true;
 moonMat.bumpMap=bumpTexture;moonMat.bumpScale=.32;moonMat.needsUpdate=true;
}).catch(error=>console.warn('Moon displacement map skipped:',error));
function makeSoftGlow(cssColor,size,opacity){
 const canvas=document.createElement('canvas');canvas.width=512;canvas.height=512;
 const ctx=canvas.getContext('2d'),g=ctx.createRadialGradient(256,256,12,256,256,256);
 const rgba=(alpha)=>cssColor.replace('COLOR',String(alpha));
 g.addColorStop(0,rgba(opacity));
 g.addColorStop(.12,rgba(opacity*.82));
 g.addColorStop(.3,rgba(opacity*.42));
 g.addColorStop(.52,rgba(opacity*.16));
 g.addColorStop(.76,rgba(opacity*.045));
 g.addColorStop(1,rgba(0));
 ctx.fillStyle=g;ctx.fillRect(0,0,512,512);
 const texture=new THREE.CanvasTexture(canvas);texture.colorSpace=THREE.SRGBColorSpace;
 const sprite=new THREE.Sprite(new THREE.SpriteMaterial({map:texture,transparent:true,opacity:1,blending:THREE.AdditiveBlending,depthWrite:false,depthTest:true,toneMapped:false}));
 sprite.scale.set(size,size,1);sprite.renderOrder=2;return sprite;
}
const moonGlowOuter=makeSoftGlow('rgba(143,170,255,COLOR)',10.8,.22);moonGlowOuter.position.copy(moon.position);moonGlowOuter.renderOrder=10;moonGlowOuter.material.depthTest=true;earthMoonOrbit.add(moonGlowOuter);
const moonGlowInner=makeSoftGlow('rgba(170,190,255,COLOR)',6.2,.16);moonGlowInner.position.copy(moon.position);moonGlowInner.renderOrder=11;moonGlowInner.material.depthTest=true;earthMoonOrbit.add(moonGlowInner);

// Sun marker, using the supplied solar texture with a soft emissive presentation.
const BLOOM_LAYER=2;
const bloomLayer=new THREE.Layers();bloomLayer.set(BLOOM_LAYER);
const sunGroup=new THREE.Group();sunGroup.layers.set(BLOOM_LAYER);scene.add(sunGroup);
let sunMaterial;
const sunTexture=textureLoader.load('/textures/sun-surface.jpg',loaded=>{
 const image=loaded.image,canvas=document.createElement('canvas');canvas.width=image.width;canvas.height=image.height;
 const ctx=canvas.getContext('2d');ctx.filter='brightness(1.85) contrast(.86)';ctx.drawImage(image,0,0);
 const softenedTexture=new THREE.CanvasTexture(canvas);softenedTexture.colorSpace=THREE.SRGBColorSpace;
 if(sunMaterial){sunMaterial.map=softenedTexture;sunMaterial.emissiveMap=softenedTexture;sunMaterial.needsUpdate=true;}
});sunTexture.colorSpace=THREE.SRGBColorSpace;
sunMaterial=new THREE.MeshStandardMaterial({map:sunTexture,emissiveMap:sunTexture,emissive:0xffe0ad,emissiveIntensity:18,roughness:1,metalness:0,toneMapped:false});
const sunBall=addMesh(new THREE.SphereGeometry(2,64,48),sunMaterial,sunGroup);sunBall.castShadow=false;sunBall.layers.set(BLOOM_LAYER);
const sunGlowOuter=makeSoftGlow('rgba(255,176,96,COLOR)',31,1.0);sunGlowOuter.position.set(0,0,0);sunGlowOuter.renderOrder=2;sunGlowOuter.layers.set(BLOOM_LAYER);sunGroup.add(sunGlowOuter);
const sunGlowInner=makeSoftGlow('rgba(255,235,185,COLOR)',19.5,1.0);sunGlowInner.position.set(0,0,0);sunGlowInner.renderOrder=3;sunGlowInner.layers.set(BLOOM_LAYER);sunGroup.add(sunGlowInner);
sunGroup.position.set(19.5,4.25,60);sunGroup.scale.setScalar(2);

// Fixed visual baseline: full sun brightness and sun-only bloom.
sunLight.intensity=7;
sunMaterial.emissiveIntensity=18;

function makeRocket(color){
 const g=new THREE.Group(),bodyMat=new THREE.MeshStandardMaterial({color,metalness:.42,roughness:.3});
 const body=addMesh(new THREE.CylinderGeometry(.2,.25,.88,18),bodyMat,g);body.position.y=.58;
 const nose=addMesh(new THREE.ConeGeometry(.205,.48,18),bodyMat,g);nose.position.y=1.26;
 const finMat=new THREE.MeshStandardMaterial({color,metalness:.38,roughness:.34});
 for(let j=0;j<3;j++){const angle=j*Math.PI*2/3,fin=addMesh(new THREE.BoxGeometry(.12,.32,.34),finMat,g);fin.position.set(Math.cos(angle)*.22,.31,Math.sin(angle)*.22);fin.rotation.y=angle;}
 const window=addMesh(new THREE.SphereGeometry(.105,18,14),new THREE.MeshStandardMaterial({color:0x9ceaff,metalness:.58,roughness:.16,emissive:0x245b78,emissiveIntensity:.7}),g);window.position.set(0,.77,.205);
 const flame=addMesh(new THREE.ConeGeometry(.12,.38,14),new THREE.MeshBasicMaterial({color:0xffa45e}),g);flame.rotation.z=Math.PI;flame.position.y=.05;flame.visible=false;g.userData.flame=flame;return g;
}
const rocketMeshes=PLAYERS.map(p=>{const r=makeRocket(p.color);board.add(r);return r});
function placeRockets(){
 PLAYERS.forEach((p,i)=>{
  const phaseIndex=Math.floor(p.position/4),slotInPhase=p.position%4;
  const phaseCenter=-Math.PI/2+(phaseIndex/8)*Math.PI*2;
  const groupStart=-(sectorAngle-phaseGap)/2;
  const a=phaseCenter+groupStart+tileSpan/2+slotInPhase*slotStep;
  const r=10.0+(i-1.5)*.38;
  const mesh=rocketMeshes[i];mesh.position.set(Math.cos(a)*r,.43,Math.sin(a)*r);mesh.rotation.y=-a;
 });
}
placeRockets();
// Keep the board in its own lighting/shadow domain. Its meshes remain on layer 0,
// illuminated by the brighter board fill, and cannot cast shadows onto the Moon.
board.traverse(object=>{
 if(object.isMesh){
  object.layers.set(0);
  object.castShadow=false;
  object.receiveShadow=false;
 }
});
function updateRocketPositions(){placeRockets()}
const moonOrbitRadius=moon.position.distanceTo(earthGroup.position);
const orbitDots=addMesh(new THREE.TorusGeometry(moonOrbitRadius,.025,6,240),new THREE.MeshBasicMaterial({color:0x7c8bb5,transparent:true,opacity:.78,toneMapped:false,depthWrite:false}),scene);orbitDots.rotation.x=Math.PI/2;orbitDots.position.copy(earthGroup.position);orbitDots.castShadow=false;orbitDots.receiveShadow=false;
function resize(){const w=sceneRoot.clientWidth,h=sceneRoot.clientHeight;if(!w||!h)return;camera.aspect=w/h;camera.updateProjectionMatrix();renderer.setSize(w,h);composer.setSize(w,h);bloomComposer.setSize(w,h)}
new ResizeObserver(resize).observe(sceneRoot);resize();
const moonWorldPosition=new THREE.Vector3();
const sunWorldPosition=new THREE.Vector3(),earthWorldPosition=new THREE.Vector3();
const moonWorldQuaternion=new THREE.Quaternion(),sunDirectionInMoonSpace=new THREE.Vector3();
let cameraTransition=null;
function transitionCamera(localPosition,duration=1200){
 cameraTransition={from:camera.position.clone(),to:localPosition.clone(),startedAt:performance.now(),duration};
 controls.enabled=false;
}
const darkMaterialCache=new Map();
function getDarkMaterial(original){
 if(Array.isArray(original))return original.map(getDarkMaterial);
 if(!original)return original;
 if(!darkMaterialCache.has(original.uuid)){
  const dark=original.clone();
  if(dark.color)dark.color.setRGB(0,0,0);
  if(dark.emissive)dark.emissive.setRGB(0,0,0);
  if('emissiveIntensity' in dark)dark.emissiveIntensity=0;
  dark.emissiveMap=null;
  darkMaterialCache.set(original.uuid,dark);
 }
 return darkMaterialCache.get(original.uuid);
}
function renderSelectiveBloom(){
 const originalBackground=scene.background,restore=[];
 scene.background=new THREE.Color(0x000000);
 scene.traverse(object=>{
  if((object.isMesh||object.isSprite)&&!bloomLayer.test(object.layers)){
   restore.push([object,object.material]);
   object.material=getDarkMaterial(object.material);
  }
 });
 bloomComposer.render();
 for(const [object,material] of restore)object.material=material;
 scene.background=originalBackground;
 composer.render();
}
function animate(){
 requestAnimationFrame(animate);
 earthMoonOrbit.rotation.y=performance.now()*.000018;
 sunGroup.getWorldPosition(sunWorldPosition);
 earthGroup.getWorldPosition(earthWorldPosition);
 if(cameraTransition){
  const progress=Math.min(1,(performance.now()-cameraTransition.startedAt)/cameraTransition.duration);
  const eased=progress*progress*(3-2*progress);
  camera.position.lerpVectors(cameraTransition.from,cameraTransition.to,eased);
  if(progress>=1){camera.position.copy(cameraTransition.to);cameraTransition=null;controls.target.set(0,0,0);controls.enabled=true;}
 }else controls.update();
 moon.getWorldPosition(moonWorldPosition);
 moon.getWorldQuaternion(moonWorldQuaternion);
 sunDirectionInMoonSpace.copy(sunWorldPosition).sub(moonWorldPosition).normalize().applyQuaternion(moonWorldQuaternion.invert());
 board.rotation.y=Math.atan2(sunDirectionInMoonSpace.x,sunDirectionInMoonSpace.z)-Math.PI;
 camera.lookAt(moonWorldPosition);
 // Aim the directional source at Earth so its parallel rays naturally cast both eclipse shadows.
 sunLight.position.copy(sunWorldPosition);
 sunLight.target.position.copy(earthWorldPosition);
 sunLight.shadow.needsUpdate=true;
 if(earthMaterial.userData.shader){earthMaterial.userData.shader.uniforms.uEarthSunDirection.value.copy(sunWorldPosition).sub(earthWorldPosition).normalize()}
 earthClouds.rotation.y=performance.now()*.000008;
 rocketMeshes.forEach((r,i)=>{r.userData.flame.scale.y=.8+Math.sin(performance.now()*.012+i)*.22});
 renderSelectiveBloom();
}
animate();

document.querySelector('#view-top').addEventListener('click',()=>transitionCamera(new THREE.Vector3(0,46,.01)));
document.querySelector('#view-earth').addEventListener('click',()=>{
 moon.updateWorldMatrix(true,false);earthGroup.updateWorldMatrix(true,false);
 earthGroup.getWorldPosition(earthWorldPosition);
 const earthLocal=moon.worldToLocal(earthWorldPosition.clone());
 const towardMoon=earthLocal.clone().negate().normalize();
 // Place the camera just above Earth's near-side horizon, looking outward toward the full Moon.
 const earthViewPosition=earthLocal.clone().addScaledVector(towardMoon,7.0).add(new THREE.Vector3(0,5.5,0));
 transitionCamera(earthViewPosition,1400);
});
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
