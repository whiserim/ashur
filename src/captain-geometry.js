import * as THREE from 'three';
const textureCache = new Map();
export function subdivide(part, center, scale){
  let positions=part.positions.map((v,i)=>(v-center[i%3])*scale);
  let uvs=part.uvs.slice();let indices=part.indices.slice();let groups=part.groups.map(g=>({...g}));
  for(let level=0;level<(part.refined?0:2);level++){
    const edges=new Map(), next=[];
    const midpoint=(a,b)=>{
      const key=a<b?a+':'+b:b+':'+a;
      if(edges.has(key))return edges.get(key);
      const i=positions.length/3;
      for(let k=0;k<3;k++)positions.push((positions[a*3+k]+positions[b*3+k])*.5);
      for(let k=0;k<2;k++)uvs.push((uvs[a*2+k]+uvs[b*2+k])*.5);
      edges.set(key,i);return i;
    };
    for(let i=0;i<indices.length;i+=3){
      const a=indices[i],b=indices[i+1],c=indices[i+2],ab=midpoint(a,b),bc=midpoint(b,c),ca=midpoint(c,a);
      next.push(a,ab,ca,ab,b,bc,ca,bc,c,ab,bc,ca);
    }
    indices=next;groups=groups.map(g=>({...g,start:g.start*4,count:g.count*4}));
  }
  const geometry=new THREE.BufferGeometry();
  geometry.setAttribute('position',new THREE.Float32BufferAttribute(positions,3).setUsage(THREE.DynamicDrawUsage));
  geometry.setAttribute('uv',new THREE.Float32BufferAttribute(uvs,2));
  geometry.setIndex(indices);
  for(const g of groups)geometry.addGroup(g.start,g.count,g.material);
  geometry.computeVertexNormals();geometry.computeBoundingSphere();
  return geometry;
}
async function loadTexture(data){
  if(!textureCache.has(data))textureCache.set(data,new THREE.TextureLoader().loadAsync(data));
  return textureCache.get(data);
}
export function linkNormals(group){
  const nodes=new Map();
  for(const mesh of group.children){
    if(!mesh.userData.armWeights)continue;
    const geometry=mesh.geometry,positions=geometry.attributes.position.array;
    const skin=new Uint8Array(positions.length/3);
    for(const face of geometry.groups){
      if(!mesh.material[face.materialIndex].name.startsWith('MAT_Body'))continue;
      for(let j=face.start;j<face.start+face.count;j++)skin[geometry.index.array[j]]=1;
    }
    for(let i=0;i<skin.length;i++){
      const weight=THREE.MathUtils.smoothstep(mesh.userData.armWeights[i],.03,.85);
      if(!skin[i]||weight===0)continue;
      const key=positions[i*3].toFixed(5)+','+positions[i*3+1].toFixed(5)+','+positions[i*3+2].toFixed(5);
      if(!nodes.has(key))nodes.set(key,[]);
      nodes.get(key).push({normal:geometry.attributes.normal.array,index:i*3,weight});
    }
  }
  group.userData.normalLinks=[...nodes.values()].filter(entries=>entries.length>1);
}
export function smoothNormals(group){
  for(const entries of group.userData.normalLinks){
    let x=0,y=0,z=0;
    for(const entry of entries){const n=entry.normal,i=entry.index;x+=n[i];y+=n[i+1];z+=n[i+2];}
    const length=Math.hypot(x,y,z);
    if(length<1e-8)throw new Error('Arm surface normals cancel out: '+group.name);
    x/=length;y/=length;z/=length;
    for(const entry of entries){
      const n=entry.normal,i=entry.index,w=entry.weight;
      const a=n[i]*(1-w)+x*w,b=n[i+1]*(1-w)+y*w,c=n[i+2]*(1-w)+z*w;
      const size=Math.hypot(a,b,c);n[i]=a/size;n[i+1]=b/size;n[i+2]=c/size;
    }
  }
}
export async function buildCharacter(character){
  const group=new THREE.Group();group.name=character.name;
  const min=[Infinity,Infinity,Infinity],max=[-Infinity,-Infinity,-Infinity];
  for(const p of character.parts)for(let i=0;i<p.positions.length;i++){const axis=i%3;min[axis]=Math.min(min[axis],p.positions[i]);max[axis]=Math.max(max[axis],p.positions[i]);}
  const center=[(min[0]+max[0])*.5,min[1],(min[2]+max[2])*.5];const scale=2.65/(max[1]-min[1]);
  for(const part of character.parts){
    if(part.uvs.length!==part.positions.length/3*2)throw new Error(character.name+'/'+part.name+': Missing UV coordinates');
    const geometry=subdivide(part,center,scale);
    const materials=await Promise.all(part.materials.map(async data=>{
      const body=data.name.startsWith('MAT_Body');
      const material=new THREE.MeshPhysicalMaterial({
        name:data.name,
        color:new THREE.Color().setRGB(...data.color.slice(0,3),THREE.SRGBColorSpace),
        metalness:data.metallic,
        roughness:body?.82:Math.max(.48,1-data.smoothness),
        specularIntensity:body?.22:.65,
        clearcoat:0,
        envMapIntensity:body?.2:.35,
        side:data.cull===0?THREE.DoubleSide:THREE.FrontSide,
        transparent:data.surface===1,
        opacity:data.color[3],
        alphaTest:data.alphaClip===1?data.cutoff:0
      });
      if(data.texture){
        const texture=(await loadTexture(data.texture)).clone();texture.colorSpace=THREE.SRGBColorSpace;texture.wrapS=texture.wrapT=THREE.RepeatWrapping;texture.repeat.fromArray(data.scale);texture.offset.fromArray(data.offset);texture.needsUpdate=true;material.map=texture;
        material.depthWrite=false;material.polygonOffset=true;material.polygonOffsetFactor=-1;material.polygonOffsetUnits=-1;
      }
      return material;
    }));
    const mesh=new THREE.Mesh(geometry,materials);mesh.name=part.name;mesh.castShadow=!part.name.startsWith('Mouth');mesh.receiveShadow=true;mesh.frustumCulled=false;
    mesh.userData.base=geometry.attributes.position.array.slice();
    mesh.userData.normals=geometry.attributes.normal.array.slice();
    if(part.refined)mesh.userData.armWeights=part.armWeights;
    group.add(mesh);
  }
  linkNormals(group);smoothNormals(group);
  for(const mesh of group.children)mesh.userData.normals=mesh.geometry.attributes.normal.array.slice();
  return group;
}
