// Cast — Snapchat-style filters, photo editor (stickers + caption), camera, and video compression.

/* ---------------- filters ---------------- */
// Each filter is a list of CSS-style operations (used for the live preview AND
// baked into the photo pixel-by-pixel), plus an optional color tint and vignette.
export const FILTERS = [
  { id:'none',     name:'Normal',   ops:[] },
  { id:'vivid',    name:'Vivid',    ops:[['saturate',1.55],['contrast',1.08]] },
  { id:'midnight', name:'Midnight', ops:[['brightness',.92],['contrast',1.15],['saturate',1.15]], tint:['rgba(29,107,255,.32)','overlay'], vignette:.55 },
  { id:'noir',     name:'Noir',     ops:[['grayscale',1],['contrast',1.3]], vignette:.6 },
  { id:'retro',    name:'Retro',    ops:[['sepia',.5],['saturate',1.35],['contrast',.95],['hue-rotate',-10]], vignette:.45 },
  { id:'frost',    name:'Frost',    ops:[['saturate',.85],['hue-rotate',12],['brightness',1.08]], tint:['rgba(110,180,255,.22)','soft-light'] },
  { id:'golden',   name:'Golden',   ops:[['sepia',.28],['saturate',1.4],['brightness',1.05]], tint:['rgba(255,170,60,.22)','soft-light'] },
  { id:'dreamy',   name:'Dreamy',   ops:[['brightness',1.1],['saturate',1.25],['contrast',.9]], tint:['rgba(255,120,210,.2)','soft-light'] },
  { id:'pop',      name:'Pop',      ops:[['saturate',2.1],['contrast',1.3]] },
  { id:'neon',     name:'Neon',     ops:[['saturate',1.8],['hue-rotate',190],['contrast',1.2]], tint:['rgba(0,229,255,.18)','screen'] }
];
const FMAP = Object.fromEntries(FILTERS.map(f=>[f.id,f]));
export const validFilter = id => !!FMAP[id] && id !== 'none';
export function filterCSS(id){
  const f = FMAP[id]; if(!f) return '';
  return f.ops.map(([op,v])=>op==='hue-rotate'?`hue-rotate(${v}deg)`:`${op}(${v})`).join(' ');
}
// CSS for showing a filtered video/image (tint can't be done with CSS filter alone, so it's approximated)
export function filterStyle(id){ const c=filterCSS(id); return c?`filter:${c};`:''; }

// --- color matrix math (same formulas the browser uses for CSS filters) ---
const ID = [1,0,0,0,0, 0,1,0,0,0, 0,0,1,0,0, 0,0,0,1,0];
function mul(a,b){ const r=new Array(20);
  for(let i=0;i<4;i++)for(let j=0;j<5;j++){let v=0;for(let k=0;k<4;k++)v+=a[i*5+k]*b[k*5+j];if(j===4)v+=a[i*5+4];r[i*5+j]=v}
  return r; }
function sat(s){return[.213+.787*s,.715-.715*s,.072-.072*s,0,0, .213-.213*s,.715+.285*s,.072-.072*s,0,0, .213-.213*s,.715-.715*s,.072+.928*s,0,0, 0,0,0,1,0]}
function opMatrix(op,v){
  switch(op){
    case 'saturate': return sat(v);
    case 'grayscale': return sat(1-v);
    case 'sepia': { const s=1-v; return [.393+.607*s,.769-.769*s,.189-.189*s,0,0, .349-.349*s,.686+.314*s,.168-.168*s,0,0, .272-.272*s,.534-.534*s,.131+.869*s,0,0, 0,0,0,1,0]; }
    case 'hue-rotate': { const a=v*Math.PI/180,c=Math.cos(a),s=Math.sin(a);
      return [.213+c*.787-s*.213,.715-c*.715-s*.715,.072-c*.072+s*.928,0,0,
              .213-c*.213+s*.143,.715+c*.285+s*.140,.072-c*.072-s*.283,0,0,
              .213-c*.213-s*.787,.715-c*.715+s*.715,.072+c*.928+s*.072,0,0, 0,0,0,1,0]; }
    case 'brightness': return [v,0,0,0,0, 0,v,0,0,0, 0,0,v,0,0, 0,0,0,1,0];
    case 'contrast': { const o=.5-.5*v; return [v,0,0,0,o, 0,v,0,0,o, 0,0,v,0,o, 0,0,0,1,0]; }
  }
  return ID;
}
function applyFilter(ctx,w,h,id){
  const f=FMAP[id]; if(!f||id==='none') return;
  if(f.ops.length){
    let m=ID; for(const [op,v] of f.ops) m=mul(opMatrix(op,v),m);
    const img=ctx.getImageData(0,0,w,h), d=img.data;
    const [a0,a1,a2,,a4,b0,b1,b2,,b4,c0,c1,c2,,c4]=m, o0=a4*255,o1=b4*255,o2=c4*255;
    for(let i=0;i<d.length;i+=4){const r=d[i],g=d[i+1],b=d[i+2];
      d[i]=a0*r+a1*g+a2*b+o0; d[i+1]=b0*r+b1*g+b2*b+o1; d[i+2]=c0*r+c1*g+c2*b+o2;}
    ctx.putImageData(img,0,0);
  }
  if(f.tint){ ctx.save(); ctx.globalCompositeOperation=f.tint[1]; ctx.fillStyle=f.tint[0]; ctx.fillRect(0,0,w,h); ctx.restore(); }
  if(f.vignette){ const g=ctx.createRadialGradient(w/2,h/2,Math.min(w,h)*.35,w/2,h/2,Math.max(w,h)*.75);
    g.addColorStop(0,'rgba(0,0,0,0)'); g.addColorStop(1,`rgba(0,0,0,${f.vignette})`); ctx.fillStyle=g; ctx.fillRect(0,0,w,h); }
}

/* ---------------- photo editor ---------------- */
const STICKERS=['😎','👑','❤️','🔥','✨','🐶','😂','🌈','⭐','🎉','💯','🦋','🥳','😍','👀','💙','⚡','🍕','🌸','🎮'];
const EMOJI_FONT='"Apple Color Emoji","Segoe UI Emoji","Noto Color Emoji",sans-serif';
const esc=s=>String(s??'').replace(/[&<>"']/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]));
let root=null;
function ensureRoot(){ if(!root){root=document.createElement('div');root.id='editor';document.body.appendChild(root)} return root; }
function close(){ stopCamera(); if(root){root.innerHTML='';root.className=''} document.body.style.overflow=''; }
const loadImage=src=>new Promise((res,rej)=>{const i=new Image();i.onload=()=>res(i);i.onerror=()=>rej(new Error('Couldn’t open that image'));i.src=src});
const fileToDataURL=f=>new Promise((res,rej)=>{const r=new FileReader();r.onload=()=>res(r.result);r.onerror=rej;r.readAsDataURL(f)});

function filterStrip(cur,thumb){
  return `<div class="ed-filters">${FILTERS.map(f=>`<button class="ed-f ${f.id===cur?'on':''}" data-ed-filter="${f.id}">
    <span class="ed-fthumb" style="${thumb?`background-image:url('${thumb}');`:''}${filterStyle(f.id)}">${f.tint?`<i style="background:${f.tint[0]};mix-blend-mode:${f.tint[1]}"></i>`:''}</span><span>${f.name}</span></button>`).join('')}</div>`;
}

/**
 * Open the photo editor. src: File or data URL. Resolves with a canvas (or null if cancelled).
 */
export async function openEditor(src, {filter='none', maxSize=1600}={}){
  const url = typeof src==='string' ? src : await fileToDataURL(src);
  const img = await loadImage(url);
  // small thumbnail for the filter strip
  const tc=document.createElement('canvas'); const ts=96/Math.min(img.width,img.height);
  tc.width=Math.round(img.width*ts); tc.height=Math.round(img.height*ts); tc.getContext('2d').drawImage(img,0,0,tc.width,tc.height);
  const thumb=tc.toDataURL('image/jpeg',.7);
  const st={filter, stickers:[], caption:null, sel:-1, picker:false};
  const R=ensureRoot(); R.className='open'; document.body.style.overflow='hidden';

  return new Promise(resolve=>{
    const draw=()=>{
      const f=FMAP[st.filter];
      R.innerHTML=`<div class="ed">
        <div class="ed-top"><button class="ed-icon" data-ed="cancel" aria-label="Cancel">✕</button><b>Edit photo</b><button class="btn small" data-ed="done">Use photo</button></div>
        <div class="ed-stage"><div class="ed-frame" id="edFrame">
          <img src="${url}" alt="" draggable="false" style="${filterStyle(st.filter)}">
          ${f.tint?`<div class="ed-tint" style="background:${f.tint[0]};mix-blend-mode:${f.tint[1]}"></div>`:''}
          ${f.vignette?`<div class="ed-vig" style="background:radial-gradient(circle,rgba(0,0,0,0) 45%,rgba(0,0,0,${f.vignette}) 100%)"></div>`:''}
          ${st.caption?`<div class="ed-cap" data-ed-drag="cap" style="top:${st.caption.y*100}%"><input data-ed-cap maxlength="60" placeholder="Type something…" value="${esc(st.caption.text)}"></div>`:''}
          ${st.stickers.map((s,i)=>`<div class="ed-st ${i===st.sel?'sel':''}" data-ed-drag="st" data-i="${i}" style="left:${s.x*100}%;top:${s.y*100}%;font-size:calc(var(--fw) * ${s.size})">${s.e}</div>`).join('')}
          <div class="ed-name">${f.name}</div>
        </div></div>
        ${filterStrip(st.filter,thumb)}
        <div class="ed-tools">
          ${st.sel>=0?`<button data-ed="smaller">－ Smaller</button><button data-ed="bigger">＋ Bigger</button><button data-ed="delst">🗑 Remove</button><button data-ed="desel">Done</button>`
          :`<button data-ed="text">Aa Text</button><button data-ed="picker" class="${st.picker?'on':''}">😀 Stickers</button>`}
        </div>
        ${st.picker&&st.sel<0?`<div class="ed-picker">${STICKERS.map(e=>`<button data-ed-sticker="${e}">${e}</button>`).join('')}</div>`:''}
        <div class="ed-hint">Swipe the photo to change filters · drag stickers to move them</div>
      </div>`;
      fit();
    };
    const fit=()=>{
      const fr=R.querySelector('#edFrame'), stg=R.querySelector('.ed-stage'); if(!fr||!stg)return;
      const aw=stg.clientWidth, ah=stg.clientHeight, k=Math.min(aw/img.width, ah/img.height);
      fr.style.width=Math.round(img.width*k)+'px'; fr.style.height=Math.round(img.height*k)+'px';
      fr.style.setProperty('--fw', Math.round(img.width*k)+'px');
    };
    const finish=ok=>{window.removeEventListener('resize',fit);R.removeEventListener('click',onClick);R.removeEventListener('input',onInput);R.removeEventListener('pointerdown',onDown);close();resolve(ok?render():null)};
    const render=()=>{
      const k=Math.min(1,maxSize/Math.max(img.width,img.height)), W=Math.round(img.width*k), H=Math.round(img.height*k);
      const c=document.createElement('canvas'); c.width=W; c.height=H; const ctx=c.getContext('2d');
      ctx.drawImage(img,0,0,W,H); applyFilter(ctx,W,H,st.filter);
      if(st.caption&&st.caption.text.trim()){
        const bh=Math.round(W*.085), y=st.caption.y*H-bh/2;
        ctx.fillStyle='rgba(0,0,0,.55)'; ctx.fillRect(0,y,W,bh);
        ctx.fillStyle='#fff'; ctx.font=`600 ${Math.round(W*.045)}px "DM Sans",system-ui,sans-serif`; ctx.textAlign='center'; ctx.textBaseline='middle';
        ctx.fillText(st.caption.text.trim(),W/2,y+bh/2,W*.94);
      }
      ctx.textAlign='center'; ctx.textBaseline='middle';
      for(const s of st.stickers){ ctx.font=`${Math.round(W*s.size)}px ${EMOJI_FONT}`; ctx.fillText(s.e,s.x*W,s.y*H); }
      return c;
    };
    const onClick=e=>{
      const t=e.target.closest('[data-ed],[data-ed-filter],[data-ed-sticker]'); if(!t)return;
      if(t.dataset.edFilter){st.filter=t.dataset.edFilter;return draw()}
      if(t.dataset.edSticker){st.stickers.push({e:t.dataset.edSticker,x:.5,y:.45,size:.18});st.sel=st.stickers.length-1;st.picker=false;return draw()}
      const s=st.stickers[st.sel];
      switch(t.dataset.ed){
        case 'cancel': return finish(false);
        case 'done': return finish(true);
        case 'text': if(!st.caption)st.caption={text:'',y:.72}; draw(); R.querySelector('[data-ed-cap]')?.focus(); return;
        case 'picker': st.picker=!st.picker; return draw();
        case 'bigger': if(s)s.size=Math.min(.6,s.size*1.25); return draw();
        case 'smaller': if(s)s.size=Math.max(.06,s.size/1.25); return draw();
        case 'delst': st.stickers.splice(st.sel,1); st.sel=-1; return draw();
        case 'desel': st.sel=-1; return draw();
      }
    };
    const onInput=e=>{ if(e.target.dataset.edCap!=null&&st.caption) st.caption.text=e.target.value; };
    const onDown=e=>{
      const fr=R.querySelector('#edFrame'); if(!fr||!fr.contains(e.target)||e.target.tagName==='INPUT')return;
      const rect=fr.getBoundingClientRect(), drag=e.target.closest('[data-ed-drag]'), sx=e.clientX, sy=e.clientY;
      let moved=false;
      if(drag&&drag.dataset.edDrag==='st'){
        const i=+drag.dataset.i, s=st.stickers[i]; st.sel=i; R.querySelectorAll('.ed-st').forEach((el,j)=>el.classList.toggle('sel',j===i));
        const mv=ev=>{moved=true;s.x=Math.min(1,Math.max(0,(ev.clientX-rect.left)/rect.width));s.y=Math.min(1,Math.max(0,(ev.clientY-rect.top)/rect.height));drag.style.left=s.x*100+'%';drag.style.top=s.y*100+'%'};
        const up=()=>{window.removeEventListener('pointermove',mv);window.removeEventListener('pointerup',up);draw()};
        window.addEventListener('pointermove',mv);window.addEventListener('pointerup',up);e.preventDefault();return;
      }
      if(drag&&drag.dataset.edDrag==='cap'){
        const mv=ev=>{st.caption.y=Math.min(.95,Math.max(.05,(ev.clientY-rect.top)/rect.height));drag.style.top=st.caption.y*100+'%'};
        const up=()=>{window.removeEventListener('pointermove',mv);window.removeEventListener('pointerup',up)};
        window.addEventListener('pointermove',mv);window.addEventListener('pointerup',up);e.preventDefault();return;
      }
      // swipe left/right on the photo to change filter
      const up=ev=>{window.removeEventListener('pointerup',up);const dx=ev.clientX-sx,dy=ev.clientY-sy;
        if(Math.abs(dx)>40&&Math.abs(dx)>Math.abs(dy)){const i=FILTERS.findIndex(f=>f.id===st.filter);st.filter=FILTERS[(i+(dx<0?1:-1)+FILTERS.length)%FILTERS.length].id;draw()}
        else if(st.sel>=0){st.sel=-1;draw()}};
      window.addEventListener('pointerup',up);
    };
    R.addEventListener('click',onClick); R.addEventListener('input',onInput); R.addEventListener('pointerdown',onDown);
    window.addEventListener('resize',fit);
    draw();
  });
}

/* ---------------- camera ---------------- */
let camStream=null;
function stopCamera(){ camStream?.getTracks().forEach(t=>t.stop()); camStream=null; }
const REC_TYPES=['video/mp4;codecs=avc1,mp4a.40.2','video/mp4','video/webm;codecs=vp9,opus','video/webm;codecs=vp8,opus','video/webm'];
/**
 * Opens the camera with live filters. Tap = photo, hold = record video (up to maxSeconds).
 * Resolves with {dataUrl, filter} | {videoBlob, filter} | {file} (picked from gallery) | null.
 */
export async function openCamera({title='Camera', maxSeconds=30}={}){
  if(!navigator.mediaDevices?.getUserMedia) throw new Error('This browser can’t use the camera');
  let facing='user', filter='none', rec=null, recParts=[], recStart=0, recTick=null, holdT=null, done=false;
  const R=ensureRoot(); R.className='open'; document.body.style.overflow='hidden';
  const start=async()=>{
    stopCamera();
    const video={facingMode:facing,width:{ideal:1280},height:{ideal:1280}};
    try{ camStream=await navigator.mediaDevices.getUserMedia({video,audio:true}); }
    catch(e){ if(e?.name==='NotAllowedError'&&!camStream) throw e; camStream=await navigator.mediaDevices.getUserMedia({video,audio:false}); }
    const v=R.querySelector('video'); if(v){v.srcObject=camStream; await v.play().catch(()=>{})}
  };
  return new Promise(async(resolve,reject)=>{
    const finish=val=>{ if(done)return; done=true; clearInterval(recTick); clearTimeout(holdT);
      R.removeEventListener('click',onClick); R.removeEventListener('pointerdown',onDown); R.removeEventListener('change',onChange);
      window.removeEventListener('pointerup',onUp); stopCamera(); close(); resolve(val); };
    const draw=()=>{
      const f=FMAP[filter];
      R.innerHTML=`<div class="ed cam">
        <div class="ed-top"><button class="ed-icon" data-cam="cancel" aria-label="Close">✕</button><b>${esc(title)}</b><button class="ed-icon" data-cam="flip" aria-label="Flip camera">⟲</button></div>
        <div class="ed-stage"><div class="cam-frame"><video playsinline muted autoplay style="${filterStyle(filter)}${facing==='user'?'transform:scaleX(-1);':''}"></video>
          ${f.tint?`<div class="ed-tint" style="background:${f.tint[0]};mix-blend-mode:${f.tint[1]}"></div>`:''}
          ${f.vignette?`<div class="ed-vig" style="background:radial-gradient(circle,rgba(0,0,0,0) 45%,rgba(0,0,0,${f.vignette}) 100%)"></div>`:''}
          <div class="ed-name">${f.name}</div><div class="cam-rec" hidden>● REC <span>0s</span></div></div></div>
        ${filterStrip(filter,'')}
        <div class="cam-bar">
          <label class="cam-side" title="Upload from gallery">🖼<input type="file" accept="image/*,video/mp4,video/webm" data-cam-file hidden></label>
          <button class="cam-snap" data-cam="snap" aria-label="Tap for photo, hold for video"><svg viewBox="0 0 100 100"><circle cx="50" cy="50" r="46" pathLength="100"/></svg></button>
          <span class="cam-side ghost"></span>
        </div>
        <div class="ed-hint">Tap for a photo · hold to record (up to ${maxSeconds}s)</div>
      </div>`;
      const v=R.querySelector('video'); if(camStream){v.srcObject=camStream; v.play().catch(()=>{})}
    };
    const snapPhoto=()=>{
      const v=R.querySelector('video'); if(!v||!v.videoWidth)return;
      const c=document.createElement('canvas'); c.width=v.videoWidth; c.height=v.videoHeight; const ctx=c.getContext('2d');
      if(facing==='user'){ctx.translate(c.width,0);ctx.scale(-1,1)}
      ctx.drawImage(v,0,0); finish({dataUrl:c.toDataURL('image/jpeg',.92),filter});
    };
    const startRec=()=>{
      if(!camStream||typeof MediaRecorder==='undefined')return;
      const type=REC_TYPES.find(t=>MediaRecorder.isTypeSupported(t));
      try{ rec=new MediaRecorder(camStream,type?{mimeType:type,videoBitsPerSecond:900000,audioBitsPerSecond:64000}:undefined); }catch{ rec=null; return; }
      recParts=[]; rec.ondataavailable=e=>{if(e.data&&e.data.size)recParts.push(e.data)};
      rec.onstop=()=>{ const t=(rec.mimeType||type||'video/webm').split(';')[0]; const blob=new Blob(recParts,{type:t}); if(blob.size)finish({videoBlob:blob,filter}); };
      rec.start(500); recStart=Date.now();
      const btn=R.querySelector('.cam-snap'), lab=R.querySelector('.cam-rec'); btn?.classList.add('rec'); if(lab)lab.hidden=false;
      btn?.style.setProperty('--dur',maxSeconds+'s');
      recTick=setInterval(()=>{const s=Math.floor((Date.now()-recStart)/1000); const sp=R.querySelector('.cam-rec span'); if(sp)sp.textContent=s+'s'; if(s>=maxSeconds)stopRec();},250);
    };
    const stopRec=()=>{ clearInterval(recTick); if(rec&&rec.state!=='inactive'){ if(Date.now()-recStart<700){ setTimeout(stopRec,700-(Date.now()-recStart)); return; } rec.stop(); } };
    const onDown=e=>{
      if(!e.target.closest('[data-cam="snap"]'))return;
      e.preventDefault(); holdT=setTimeout(()=>{holdT=null;startRec()},350);
      window.addEventListener('pointerup',onUp);
    };
    const onUp=()=>{ window.removeEventListener('pointerup',onUp);
      if(holdT){clearTimeout(holdT);holdT=null;snapPhoto();} else if(rec) stopRec(); };
    const onChange=e=>{ const f=e.target.files?.[0]; if(e.target.dataset.camFile!=null&&f) finish({file:f}); };
    const onClick=async e=>{
      const t=e.target.closest('[data-cam],[data-ed-filter]'); if(!t)return;
      if(t.dataset.edFilter){ if(rec)return; filter=t.dataset.edFilter; return draw(); }
      if(t.dataset.cam==='cancel'){ if(rec&&rec.state!=='inactive'){rec.onstop=null;rec.stop()} return finish(null); }
      if(t.dataset.cam==='flip'){ if(rec)return; facing=facing==='user'?'environment':'user'; draw(); try{await start()}catch{} }
    };
    R.addEventListener('click',onClick); R.addEventListener('pointerdown',onDown); R.addEventListener('change',onChange);
    draw();
    try{await start()}catch(e){ finish(null); reject(new Error(e?.name==='NotAllowedError'?'Camera permission was blocked — allow it in your browser settings':'Couldn’t start the camera')); }
  });
}

/* ---------------- share sheet (Post or Story) ---------------- */
export function chooseTarget(){
  const R=ensureRoot(); R.className='open sheet-bg'; document.body.style.overflow='hidden';
  return new Promise(resolve=>{
    R.innerHTML=`<div class="sheet"><b>Share to…</b>
      <button data-t="story"><span class="sheet-ic story">◎</span><span><b>Your story</b><small>Disappears after 24 hours</small></span></button>
      <button data-t="post"><span class="sheet-ic">＋</span><span><b>New post</b><small>Stays on your profile</small></span></button>
      <button data-t="" class="sheet-cancel">Cancel</button></div>`;
    const on=e=>{const b=e.target.closest('[data-t]'); if(!b&&e.target!==R)return; R.removeEventListener('click',on); close(); resolve(b?b.dataset.t||null:null);};
    R.addEventListener('click',on);
  });
}

/* ---------------- video compression ---------------- */
export const canCompress = () => typeof MediaRecorder!=='undefined' && !!HTMLCanvasElement.prototype.captureStream;
/**
 * Re-encode a video smaller (max 640px, ~0.7 Mbps). Plays through once, so it takes as long as the video.
 * Resolves with a Blob. Throws if the video is too long or can't be read.
 */
export async function compressVideo(file,{maxSeconds=60,onProgress=()=>{}}={}){
  const url=URL.createObjectURL(file);
  const v=document.createElement('video'); v.src=url; v.playsInline=true; v.preload='auto';
  try{
    await new Promise((res,rej)=>{v.onloadedmetadata=res;v.onerror=()=>rej(new Error('Couldn’t read that video'))});
    if(v.duration>maxSeconds+1) throw new Error(`Videos can be up to ${maxSeconds} seconds`);
    const sc=Math.min(1,640/Math.max(v.videoWidth,v.videoHeight));
    const w=Math.max(2,Math.round(v.videoWidth*sc/2)*2), h=Math.max(2,Math.round(v.videoHeight*sc/2)*2);
    const c=document.createElement('canvas'); c.width=w; c.height=h; const ctx=c.getContext('2d');
    ctx.drawImage(v,0,0,w,h);
    const stream=c.captureStream(30);
    let ac=null;
    try{ ac=new (window.AudioContext||window.webkitAudioContext)(); const src=ac.createMediaElementSource(v); const dst=ac.createMediaStreamDestination(); src.connect(dst); dst.stream.getAudioTracks().forEach(t=>stream.addTrack(t)); }catch{ ac=null; }
    const type=['video/mp4;codecs=avc1.42E01E,mp4a.40.2','video/mp4;codecs=avc1','video/mp4','video/webm;codecs=vp9,opus','video/webm;codecs=vp8,opus','video/webm'].find(t=>MediaRecorder.isTypeSupported(t));
    if(!type) throw new Error('compress-unsupported');
    const rec=new MediaRecorder(stream,{mimeType:type,videoBitsPerSecond:700000,audioBitsPerSecond:64000});
    const parts=[]; rec.ondataavailable=e=>{if(e.data&&e.data.size)parts.push(e.data)};
    const stopped=new Promise(r=>rec.onstop=r);
    rec.start(1000);
    try{ await v.play(); }catch{ v.muted=true; await v.play(); }
    const tick=setInterval(()=>{ctx.drawImage(v,0,0,w,h);onProgress(Math.min(1,v.currentTime/(v.duration||1)))},1000/30);
    await new Promise(r=>{v.onended=r;});
    clearInterval(tick); ctx.drawImage(v,0,0,w,h);
    rec.stop(); await stopped; stream.getTracks().forEach(t=>t.stop()); try{ac?.close()}catch{}
    return new Blob(parts,{type:type.split(';')[0]});
  }finally{ URL.revokeObjectURL(url); }
}
