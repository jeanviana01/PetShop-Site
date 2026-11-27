// Limpeza visual dos controles capturados nos prints do Instagram.
// Preserva as fotos originais embutidas no HTML e remove somente as sobreposições.
(() => {
  const targets = new Set([
    'Cachorrinho penteado na festa junina',
    'Tosa higiênica antes e depois',
    'Divulgação do banho sensorial premium',
    'Cachorrinha no arraiá',
    'Cachorrinha com laço azul'
  ]);
  function repair(img) {
    if (!targets.has(img.alt) || !img.naturalWidth) return;
    const c = document.createElement('canvas');
    c.width = img.naturalWidth; c.height = img.naturalHeight;
    const ctx = c.getContext('2d', {willReadFrequently:true});
    ctx.drawImage(img,0,0);
    const frame=ctx.getImageData(0,0,c.width,c.height);
    const {data}=frame, w=c.width, h=c.height;
    // Marcas circulares de perfil e áudio nos cantos inferiores.
    const circles=[[.074,.944,.043],[.929,.944,.044]];
    // Contador de carrossel "1/4" no print do banho sensorial.
    if(img.alt==='Divulgação do banho sensorial premium') circles.push([.909,.066,.057]);
    const known = new Uint8Array(w*h).fill(1);
    for (const [rx,ry,rr] of circles) {
      const cx=rx*w,cy=ry*h,r=rr*Math.min(w,h);
      for(let y=Math.max(0,Math.floor(cy-r));y<Math.min(h,Math.ceil(cy+r));y++)
      for(let x=Math.max(0,Math.floor(cx-r));x<Math.min(w,Math.ceil(cx+r));x++)
        if((x-cx)**2+(y-cy)**2<=r*r) known[y*w+x]=0;
    }
    // Propaga os pixels vizinhos para dentro da pequena área do ícone.
    // Não altera o restante da imagem.
    const queue=[], dist=new Uint16Array(w*h), sum=new Float32Array(w*h*3), count=new Uint8Array(w*h);
    for(let y=0;y<h;y++) for(let x=0;x<w;x++){
      const i=y*w+x;
      if(known[i]) continue;
      const neighbors=[x>0?i-1:-1,x<w-1?i+1:-1,y>0?i-w:-1,y<h-1?i+w:-1];
      for(const j of neighbors) if(j>=0 && known[j]){queue.push(i);break;}
    }
    const queued=new Uint8Array(w*h);
    queue.forEach(i=>queued[i]=1);
    for(let head=0;head<queue.length;head++){
      const i=queue[head],x=i%w,y=(i/w)|0;
      const neighbors=[x>0?i-1:-1,x<w-1?i+1:-1,y>0?i-w:-1,y<h-1?i+w:-1];
      let n=0,r=0,g=0,b=0;
      for(const j of neighbors) if(j>=0 && (known[j]||dist[j]>0)){
        r+=data[4*j];g+=data[4*j+1];b+=data[4*j+2];n++;
      }
      if(!n)continue;
      data[4*i]=r/n;data[4*i+1]=g/n;data[4*i+2]=b/n;data[4*i+3]=255;
      dist[i]=1;
      for(const j of neighbors) if(j>=0 && !known[j] && !queued[j]){queued[j]=1;queue.push(j);}
    }
    ctx.putImageData(frame,0,0);
    img.src=c.toDataURL('image/jpeg',.94);
  }
  document.querySelectorAll('img').forEach(img=>{
    if(!targets.has(img.alt)) return;
    if(img.complete) repair(img);
    else img.addEventListener('load',()=>repair(img),{once:true});
  });
})();