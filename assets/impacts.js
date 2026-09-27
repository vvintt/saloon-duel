// Surface-bound marks for the three painted locations. Coordinates refer to the
// original 1870 × 841 paintings, so changing viewport size keeps the same material.
const rect = (x0, y0, x1, y1) => [[x0,y0],[x1,y0],[x1,y1],[x0,y1]];
export function insidePolygon(x, y, polygon) {
  let inside = false;
  for (let i = 0, j = polygon.length - 1; i < polygon.length; j = i++) {
    const [ax,ay] = polygon[i], [bx,by] = polygon[j];
    if ((ay > y) !== (by > y) && x < (bx-ax)*(y-ay)/(by-ay)+ax) inside = !inside;
  }
  return inside;
}
const region = (kind, polygon) => ({kind, polygon});
export function paintedSurface(location, layer = {}) {
  const surface = { location, kind: 'wood', regions: [] };
  if (location === 'street') {
    if (layer.d === 10.4) surface.kind = 'dirt'; // hay bales
    if (layer.d === 16) surface.regions = [
      region('wood',rect(790,208,1060,264)), // bank sign
      region('wood',rect(710,392,1150,436)), // porch beam
      ...[[751,274,783,395],[876,273,900,395],[952,275,978,395],[1059,275,1088,395],[853,436,889,625],[978,436,1006,625]].map(r=>region('wood',rect(...r))),
      region('stone',rect(713,169,1140,630)),
      region('dirt',rect(0,674,1870,841)),
    ];
    if (layer.d === 11.8) surface.regions = [616,648,699].map(y=>region('metal',rect(438,y-4,617,y+4)));
  } else if (location === 'saloon') {
    if (layer.d === 11.5) surface.regions = [
      region('glass',[[385,345],[473,326],[680,328],[755,348],[753,450],[383,450]]),
      region('wood',rect(410,209,741,288)),
      ...[[265,120,800,310],[873,119,948,248],[1095,120,1160,248],[1307,120,1372,248],[1515,122,1630,248],[880,399,1242,510],[1295,399,1617,510]].map(r=>region('plaster',rect(...r))),
      region('metal',[[300,6],[566,6],[569,80],[482,99],[370,98],[302,72]]),
      region('metal',[[1265,3],[1487,3],[1518,74],[1435,107],[1321,98],[1259,68]]),
    ];
    if (layer.d === 5.59) surface.regions = [region('metal',[[1280,652],[1382,623],[1386,643],[1280,674]])];
    if (layer.d === 7.33) surface.regions = [region('metal',rect(1725,585,1794,607))];
  } else if (location === 'canyon') {
    surface.kind = layer.d === 8.9 || layer.d === 15.5 ? 'wood' : 'stone';
    if (layer.d === 18.5) surface.regions = [
      region('wood',rect(1000,363,1268,399)),
      region('wood',rect(1027,393,1064,555)),
      region('wood',rect(1210,395,1248,552)),
    ];
    if (layer.d === 15.5) surface.regions = [
      region('metal',rect(1160,557,1290,590)),
      region('metal',rect(1207,513,1222,562)),
      region('metal',rect(1267,513,1280,566)),
    ];
  }
  return surface;
}
export function surfaceAt(hit) {
  const o = hit.object, s = o.userData.surface;
  if (s) {
    if (hit.uv && s.regions) {
      const x = hit.uv.x * 1870, y = (1-hit.uv.y)*841;
      const r = s.regions.find(r=>insidePolygon(x,y,r.polygon));
      if (r) return r.kind;
    }
    return s.kind;
  }
  if (o.userData.leaf) return 'wood';
  if (o.userData.glass) return 'glass';
  return o.material?.metalness > 0.6 ? 'metal' : 'wood';
}

export function createImpactMarks(T, limit = 140) {
  const marks = [], textures = new Map(), surfaceMaterials = new WeakMap();
  const profile = {
    wood: {size:0.21, dust:0xbfa075}, stone: {size:0.25, dust:0xcbaf91},
    metal:{size:0.16, dust:0xaca99e}, plaster:{size:0.25, dust:0xe0c7a2},
    glass:{size:0.33, dust:0xc8d9d8}, dirt:{size:0.24, dust:0xc6a078},
  };
  function texture(kind, location, variant) {
    const key = `${kind}-${location}-${variant}`;
    if (textures.has(key)) return textures.get(key);
    let seed = 1729 + variant * 971;
    const random = () => ((seed = (seed * 1664525 + 1013904223) >>> 0) / 4294967296);
    const canvas = document.createElement('canvas'); canvas.width = canvas.height = 128;
    const g = canvas.getContext('2d'); g.translate(64,64);
    const polygon = (radius, n, color, stretch = 1) => {
      g.beginPath();
      for (let i=0;i<n;i++) {const a=i/n*Math.PI*2,r=radius*(0.62+random()*0.38); const x=Math.cos(a)*r,y=Math.sin(a)*r*stretch; i?g.lineTo(x,y):g.moveTo(x,y);}
      g.closePath();g.fillStyle=color;g.fill();
    };
    const shadow = g.createRadialGradient(0,0,6,0,0,46);
    shadow.addColorStop(0,'rgba(10,6,3,.5)');shadow.addColorStop(1,'rgba(10,6,3,0)');
    g.fillStyle=shadow;g.fillRect(-64,-64,128,128);
    if (kind === 'wood') {
      // Long exposed fibres and a small dark bore, not a pale circular sticker.
      for (let i=0;i<17;i++) {
        const x=(random()-.5)*27,y=(random()-.5)*20;
        g.beginPath();g.moveTo(x-2,y-6);g.lineTo(x+(random()-.5)*7,y-24-random()*24);g.lineTo(x+2,y+7);
        g.fillStyle=i%3?'#9b7348':'#c6a071';g.fill();
      }
      polygon(20,17,'#6b452b',1.22);polygon(12,13,'#21150e',1.08);polygon(7,11,'#090706');
    } else if (kind === 'metal') {
      polygon(24,20,'#343533');polygon(19,18,'#8d8d83');polygon(15,19,'#252724');
      g.beginPath();g.arc(0,1,17,.1,2.6);g.lineWidth=2;g.strokeStyle='rgba(225,224,198,.85)';g.stroke();
      polygon(7,10,'#111412');
      for(let i=0;i<8;i++){const a=random()*6.28;g.beginPath();g.moveTo(Math.cos(a)*21,Math.sin(a)*21);g.lineTo(Math.cos(a)*32,Math.sin(a)*32);g.strokeStyle='#aaa99a';g.lineWidth=1;g.stroke();}
    } else if (kind === 'glass') {
      for(let i=0;i<11;i++) {
        const a=i/11*6.28+random()*.2,len=28+random()*28;
        g.beginPath();g.moveTo(Math.cos(a)*5,Math.sin(a)*5);g.lineTo(Math.cos(a+.05)*len*.5,Math.sin(a+.05)*len*.5);g.lineTo(Math.cos(a)*len,Math.sin(a)*len);
        g.lineWidth=i%2?1:1.7;g.strokeStyle='rgba(200,223,221,.8)';g.stroke();
      }
      polygon(10,11,'rgba(225,239,231,.65)');polygon(6,9,'rgba(20,31,29,.95)');
    } else if (kind === 'dirt') {
      polygon(25,20,'rgba(89,56,31,.36)');polygon(13,14,'rgba(62,40,25,.65)');
      for(let i=0;i<32;i++){const a=random()*6.28,r=17+random()*30;g.fillStyle=i%2?'rgba(80,51,27,.6)':'rgba(190,149,99,.6)';g.fillRect(Math.cos(a)*r,Math.sin(a)*r,1+random()*3,1+random()*2);}
    } else {
      const warm = kind==='stone' && location==='canyon';
      polygon(34,17,warm?'#a56b43':kind==='plaster'?'#cebb9c':'#aaa18b');
      polygon(26,16,warm?'#cf9868':kind==='plaster'?'#e3ceb0':'#cab79b');
      polygon(17,13,warm?'#75472f':'#6b6051');polygon(8,9,'#302820');
      for(let i=0;i<6;i++){const a=random()*6.28;g.beginPath();g.moveTo(Math.cos(a)*14,Math.sin(a)*14);g.lineTo(Math.cos(a)*39,Math.sin(a)*39);g.strokeStyle=warm?'#805237':'#776b57';g.lineWidth=1;g.stroke();}
    }
    const tex = new T.CanvasTexture(canvas);tex.colorSpace=T.SRGBColorSpace;
    textures.set(key,tex);return tex;
  }
  function mark(hit, normal, kind = surfaceAt(hit)) {
    const surface = hit.object, location = surface.userData.surface?.location || 'street';
    const variant = Math.floor(Math.random()*4), p = profile[kind] || profile.wood;
    let cache = surfaceMaterials.get(surface);if(!cache){cache=new Map();surfaceMaterials.set(surface,cache);}
    const key=`${kind}-${variant}`;
    if (!cache.has(key)) {
      const mat=new T.MeshBasicMaterial({map:texture(kind,location,variant),transparent:true,depthWrite:false,depthTest:true,toneMapped:false,polygonOffset:true,polygonOffsetFactor:-2,polygonOffsetUnits:-2,side:T.DoubleSide});
      const mask=surface.material?.alphaMap, plane=surface.geometry.type==='PlaneGeometry';
      if (plane) {
        mat.onBeforeCompile=shader=>{
          shader.uniforms.impactMask={value:mask || null};
          shader.vertexShader=shader.vertexShader.replace('#include <common>','#include <common>\nattribute vec2 surfaceUv; varying vec2 vSurfaceUv;').replace('#include <begin_vertex>','#include <begin_vertex>\nvSurfaceUv=surfaceUv;');
          shader.fragmentShader=shader.fragmentShader.replace('#include <common>','#include <common>\nvarying vec2 vSurfaceUv;\nuniform sampler2D impactMask;').replace('#include <clipping_planes_fragment>',`#include <clipping_planes_fragment>\nif(any(lessThan(vSurfaceUv,vec2(0.0))) || any(greaterThan(vSurfaceUv,vec2(1.0)))) discard;\n${mask?'if(texture2D(impactMask,vSurfaceUv).g < 0.5) discard;':''}`);
        };
        mat.customProgramCacheKey=()=>`impact-${mask?'masked':'plane'}`;
      }
      cache.set(key,mat);
    }
    const size=p.size*(0.85+Math.random()*.3), geo=new T.PlaneGeometry(size,size);
    const transform=new T.Object3D();transform.position.copy(hit.point).addScaledVector(normal,.002);
    transform.quaternion.setFromUnitVectors(new T.Vector3(0,0,1),normal);
    transform.rotateZ(kind==='wood'?(Math.random()-.5)*.22:Math.random()*Math.PI*2);transform.updateMatrix();
    surface.updateWorldMatrix(true,false);
    geo.applyMatrix4(transform.matrix).applyMatrix4(surface.matrixWorld.clone().invert());
    const pos=geo.attributes.position, uv=new Float32Array(pos.count*2), dims=surface.geometry.parameters;
    if(surface.geometry.type==='PlaneGeometry')for(let i=0;i<pos.count;i++){uv[i*2]=pos.getX(i)/dims.width+.5;uv[i*2+1]=pos.getY(i)/dims.height+.5;}
    geo.setAttribute('surfaceUv',new T.BufferAttribute(uv,2));
    const mesh=new T.Mesh(geo,cache.get(key));mesh.userData.impact=kind;mesh.renderOrder=1;
    surface.add(mesh);marks.push(mesh);
    if(marks.length>limit){const old=marks.shift();old.removeFromParent();old.geometry.dispose();}
    return {mesh,kind,...p,dust:kind==='stone'&&location==='canyon'?0xc08050:p.dust};
  }
  function clear(){for(const mesh of marks){mesh.removeFromParent();mesh.geometry.dispose();}marks.length=0;}
  return {mark,clear,marks,surfaceAt};
}
