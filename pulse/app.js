// Pulse — a little social network (Firebase edition)
import { firebaseConfig, storageEnabled } from './firebase-config.js';

const FB = 'https://www.gstatic.com/firebasejs/10.12.2/';
const CONFIGURED = firebaseConfig && firebaseConfig.apiKey && !firebaseConfig.apiKey.startsWith('PASTE');

const SV = p => `<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">${p}</svg>`;
const ICON = {
  home:SV('<path d="M3 10.5 12 3l9 7.5V20a1 1 0 0 1-1 1h-5v-6h-6v6H4a1 1 0 0 1-1-1z"/>'),
  clips:SV('<rect x="3" y="4" width="18" height="16" rx="3"/><path d="m10 9 5 3-5 3z"/>'),
  explore:SV('<circle cx="12" cy="12" r="9"/><path d="m15.5 8.5-2 5-5 2 2-5z"/>'),
  bell:SV('<path d="M6 16V11a6 6 0 0 1 12 0v5l2 2H4zM10 21h4"/>'),
  bookmark:SV('<path d="M6 3h12v18l-6-4-6 4z"/>'),
  user:SV('<circle cx="12" cy="8" r="4"/><path d="M4 21c1.5-4 4.5-6 8-6s6.5 2 8 6"/>'),
  heart:SV('<path d="M12 20s-7-4.5-9-9a4.8 4.8 0 0 1 9-3 4.8 4.8 0 0 1 9 3c-2 4.5-9 9-9 9z"/>'),
  chat:SV('<path d="M21 12a8 8 0 0 1-11.6 7.1L4 20l1-4.6A8 8 0 1 1 21 12z"/>'),
  repost:SV('<path d="M17 2l4 4-4 4"/><path d="M3 11V9a3 3 0 0 1 3-3h15M7 22l-4-4 4-4"/><path d="M21 13v2a3 3 0 0 1-3 3H3"/>'),
  image:SV('<rect x="3" y="4" width="18" height="16" rx="3"/><circle cx="9" cy="10" r="2"/><path d="m21 16-5-5-9 9"/>'),
  video:SV('<rect x="2" y="6" width="14" height="12" rx="2"/><path d="m16 10 6-3v10l-6-3"/>'),
  poll:SV('<path d="M4 20V10M10 20V4M16 20v-7M22 20H2"/>'),
  trash:SV('<path d="M4 7h16M9 7V4h6v3M6 7l1 13h10l1-13"/>'),
  search:SV('<circle cx="11" cy="11" r="7"/><path d="m20 20-3.5-3.5"/>'),
  share:SV('<path d="M4 12v7a1 1 0 0 0 1 1h14a1 1 0 0 0 1-1v-7M12 3v13M7 8l5-5 5 5"/>'),
  at:SV('<circle cx="12" cy="12" r="4"/><path d="M16 8v5a3 3 0 0 0 6 0v-1a10 10 0 1 0-4 8"/>'),
  plus:SV('<path d="M12 5v14M5 12h14"/>')
};
const GOOGLE = '<svg viewBox="0 0 48 48"><path fill="#FFC107" d="M43.6 20.5H42V20H24v8h11.3C33.7 32.7 29.2 36 24 36c-6.6 0-12-5.4-12-12s5.4-12 12-12c3.1 0 5.8 1.2 8 3l5.7-5.7C34 6.1 29.3 4 24 4 12.9 4 4 12.9 4 24s8.9 20 20 20 20-8.9 20-20c0-1.3-.1-2.4-.4-3.5z"/><path fill="#FF3D00" d="m6.3 14.7 6.6 4.8C14.7 15.1 19 12 24 12c3.1 0 5.8 1.2 8 3l5.7-5.7C34 6.1 29.3 4 24 4 16.3 4 9.7 8.3 6.3 14.7z"/><path fill="#4CAF50" d="M24 44c5.2 0 9.9-2 13.4-5.2l-6.2-5.2C29.2 35.1 26.7 36 24 36c-5.2 0-9.6-3.3-11.3-8l-6.5 5C9.5 39.6 16.2 44 24 44z"/><path fill="#1976D2" d="M43.6 20.5H42V20H24v8h11.3c-.8 2.2-2.2 4.2-4.1 5.6l6.2 5.2C37 39.2 44 34 44 24c0-1.3-.1-2.4-.4-3.5z"/></svg>';
const COLORS=['#ff5a36','#127c74','#6a4cff','#e0a100','#d63a7a','#2f7de1','#3c9a3c','#8a5a3c'];
const MAX=280, VIDEO_MAX=20*1024*1024, DB_VIDEO_MAX=8*1024*1024, CHUNK=700*1024;
const VCACHE=new Map(), VLOADING=new Set();

const S={
  fb:null,uid:null,authReady:false,isAdmin:false,loading:true,profilesReady:false,
  posts:[],likes:[],comments:[],follows:[],reposts:[],votes:[],profiles:{},me:{seenAt:0,bookmarks:[]},
  view:'home',tab:'all',ptab:'posts',profileId:null,query:'',tag:null,
  open:new Set(),drafts:{},
  compose:{text:'',media:null,poll:null,busy:false,progress:0},
  editing:false,edit:{},onboard:null,viewer:null,notifSeenSnapshot:null
};
const canWrite=()=>!!S.uid&&!!S.profiles[S.uid]?.handle;
const $=s=>document.querySelector(s);
const esc=s=>String(s??'').replace(/[&<>"']/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]));
const hash=s=>{let h=0;for(const c of String(s))h=(h*31+c.charCodeAt(0))|0;return Math.abs(h)};
const prof=id=>S.profiles[id]||{};
const colorOf=id=>prof(id).color||COLORS[hash(id)%COLORS.length];
const nameOf=id=>prof(id).displayName||(id===S.uid?'You':'Someone');
const handleOf=id=>prof(id).handle||'';
const byHandle=h=>Object.values(S.profiles).find(p=>p.handle===String(h).toLowerCase())?.user;
const initials=n=>n.split(/\s+/).filter(Boolean).slice(0,2).map(w=>w[0]).join('').toUpperCase()||'?';
const av=(id,cls='')=>{const p=prof(id);const photo=p.photo&&/^https:\/\//.test(p.photo)?`background-image:url('${esc(p.photo)}');background-size:cover;`:'';
  return `<div class="av ${cls}" data-profile="${esc(id)}" style="background-color:${esc(colorOf(id))};${photo}">${photo?'':esc(initials(nameOf(id)))}</div>`};
const ago=t=>{const s=(Date.now()-t)/1000;if(s<45)return'just now';if(s<3600)return Math.floor(s/60)+'m';if(s<86400)return Math.floor(s/3600)+'h';if(s<604800)return Math.floor(s/86400)+'d';return new Date(t).toLocaleDateString(undefined,{month:'short',day:'numeric'})};
function fmt(t){
  return esc(t)
    .replace(/(https?:\/\/[^\s<]+)/g,'<a href="$1" target="_blank" rel="noopener nofollow">$1</a>')
    .replace(/(^|\s)#([A-Za-z0-9_]{1,40})/g,'$1<span class="tag" data-tag="$2">#$2</span>')
    .replace(/(^|\s)@([A-Za-z0-9_]{3,20})/g,(m,a,h)=>{const id=byHandle(h);return id?`${a}<span class="mention" data-profile="${esc(id)}">@${h}</span>`:m});
}
const tagsIn=t=>[...String(t||'').matchAll(/(?:^|\s)#([A-Za-z0-9_]{1,40})/g)].map(m=>m[1].toLowerCase());
const mentionsIn=t=>[...String(t||'').matchAll(/(?:^|\s)@([A-Za-z0-9_]{3,20})/g)].map(m=>m[1].toLowerCase());
function toast(m){const t=$('#toast');t.textContent=m;t.classList.add('show');clearTimeout(t._t);t._t=setTimeout(()=>t.classList.remove('show'),2600)}
const okURL=u=>typeof u==='string'&&/^https:\/\/(firebasestorage\.googleapis\.com|storage\.googleapis\.com)\//.test(u);

/* ---------- derived ---------- */
const likesFor=pid=>S.likes.filter(l=>l.post===pid);
const commentsFor=pid=>S.comments.filter(c=>c.post===pid).sort((a,b)=>a.createdAt-b.createdAt);
const repostsFor=pid=>S.reposts.filter(r=>r.post===pid);
const votesFor=pid=>S.votes.filter(v=>v.post===pid);
const iLike=pid=>S.likes.some(l=>l.post===pid&&l.user===S.uid);
const iRepost=pid=>S.reposts.some(r=>r.post===pid&&r.user===S.uid);
const iSaved=pid=>(S.me.bookmarks||[]).includes(pid);
const following=id=>S.follows.some(f=>f.from===S.uid&&f.to===id);
const followersOf=id=>S.follows.filter(f=>f.to===id).length;
const followingOf=id=>S.follows.filter(f=>f.from===id).length;
const postById=id=>S.posts.find(p=>p.id===id);

function notifications(){
  if(!S.uid)return[];
  const mine=new Set(S.posts.filter(p=>p.author===S.uid).map(p=>p.id));
  const h=handleOf(S.uid);const out=[];
  for(const l of S.likes)if(mine.has(l.post)&&l.user!==S.uid)out.push({kind:'like',who:l.user,post:l.post,at:l.at||0});
  for(const r of S.reposts)if(mine.has(r.post)&&r.user!==S.uid)out.push({kind:'repost',who:r.user,post:r.post,at:r.at||0});
  for(const c of S.comments){
    if(c.author===S.uid)continue;
    if(mine.has(c.post))out.push({kind:'reply',who:c.author,post:c.post,text:c.text,at:c.createdAt});
    else if(h&&mentionsIn(c.text).includes(h))out.push({kind:'mention',who:c.author,post:c.post,text:c.text,at:c.createdAt});
  }
  if(h)for(const p of S.posts)if(p.author!==S.uid&&mentionsIn(p.text).includes(h))out.push({kind:'mention',who:p.author,post:p.id,text:p.text,at:p.createdAt});
  for(const f of S.follows)if(f.to===S.uid&&f.from!==S.uid)out.push({kind:'follow',who:f.from,at:f.at||0});
  for(const v of S.votes)if(mine.has(v.post)&&v.user!==S.uid)out.push({kind:'vote',who:v.user,post:v.post,at:v.at||0});
  return out.sort((a,b)=>b.at-a.at).slice(0,100);
}
const unread=()=>notifications().filter(n=>n.at>(S.me.seenAt||0)).length;

/* ---------- Firebase ---------- */
async function loadFirebase(){
  const [app,auth,fs]=await Promise.all([import(FB+'firebase-app.js'),import(FB+'firebase-auth.js'),import(FB+'firebase-firestore.js')]);
  const st=storageEnabled?await import(FB+'firebase-storage.js'):null;
  const a=app.initializeApp(firebaseConfig);
  return {auth:auth,authI:auth.getAuth(a),fs,db:fs.getFirestore(a),st,storage:st?st.getStorage(a):null};
}
const col=n=>S.fb.fs.collection(S.fb.db,n);
const dref=(n,id)=>S.fb.fs.doc(S.fb.db,n,id);
async function put(c,id,data){await S.fb.fs.setDoc(dref(c,id),data)}
async function remove(c,id){await S.fb.fs.deleteDoc(dref(c,id))}
const newId=()=>S.fb.fs.doc(col('posts')).id;

async function signIn(){
  if(!S.fb)return toast('Pulse isn’t connected to Firebase yet');
  try{await S.fb.auth.signInWithPopup(S.fb.authI,new S.fb.auth.GoogleAuthProvider())}
  catch(e){
    if(e?.code==='auth/popup-blocked'||e?.code==='auth/operation-not-supported-in-this-environment'){try{await S.fb.auth.signInWithRedirect(S.fb.authI,new S.fb.auth.GoogleAuthProvider())}catch(e2){toast('Sign-in failed: '+(e2.code||e2.message))}}
    else if(e?.code==='auth/unauthorized-domain')toast('Add this website’s address to Firebase → Authentication → Settings → Authorized domains');
    else if(e?.code!=='auth/popup-closed-by-user'&&e?.code!=='auth/cancelled-popup-request')toast('Sign-in failed: '+(e.code||e.message));
  }
}
async function signOut(){await S.fb.auth.signOut(S.fb.authI);toast('Signed out')}

async function guard(fn){
  if(!S.uid){signIn();return false}
  try{await fn();return true}catch(e){
    console.warn(e);const c=e?.code||'';
    if(e?.taken)return false;
    if(c==='permission-denied'||c==='storage/unauthorized')toast('Not allowed — check that your security rules are published (setup step 5)');
    else if(c==='resource-exhausted'||c==='storage/quota-exceeded')toast('Firebase free limit reached for today');
    else if(c==='unavailable')toast('You’re offline — it will save when you reconnect');
    else if(c.startsWith('storage/'))toast('Upload failed: '+c.replace('storage/',''));
    else if(e?.message&&!c)toast(e.message);
    else toast('Couldn’t save — try again');
    return false;
  }
}
let meChain=Promise.resolve();
function saveMe(patch){
  Object.assign(S.me,patch);render();
  if(!S.uid)return;
  const body={seenAt:S.me.seenAt||0,bookmarks:[...(S.me.bookmarks||[])].slice(-500)};
  meChain=meChain.then(()=>put('private',S.uid,body)).catch(e=>console.warn(e));
}

/* ---------- actions ---------- */
function uploadMedia(blob,kind){
  return new Promise((resolve,reject)=>{
    const ext=kind==='video'?(blob.type==='video/webm'?'webm':'mp4'):'jpg';
    const path=`media/${S.uid}/${Date.now()}-${Math.random().toString(36).slice(2,8)}.${ext}`;
    const r=S.fb.st.ref(S.fb.storage,path);
    const contentType=kind==='video'?(blob.type==='video/webm'?'video/webm':'video/mp4'):'image/jpeg';
    const task=S.fb.st.uploadBytesResumable(r,blob,{contentType});
    task.on('state_changed',s=>{S.compose.progress=Math.round(s.bytesTransferred*100/s.totalBytes);const b=$('[data-act="post"]');if(b)b.textContent=`Uploading ${S.compose.progress}%`},
      reject,async()=>{try{resolve({kind,path,url:await S.fb.st.getDownloadURL(r)})}catch(e){reject(e)}});
  });
}
async function createPost(){
  const C=S.compose;const text=C.text.trim();
  const opts=C.poll?C.poll.map(o=>o.trim()).filter(Boolean):null;
  if(C.poll&&(!opts||opts.length<2)){toast('A poll needs at least 2 options');return}
  if(!text&&!C.media&&!opts)return;
  if(text.length>MAX||C.busy)return;
  C.busy=true;C.progress=0;render();
  const ok=await guard(async()=>{
    const data={author:S.uid,text,createdAt:Date.now()};
    if(C.media){
      if(S.fb.st)data.media={...(await uploadMedia(C.media.blob,C.media.kind)),...(C.media.thumb&&C.media.thumb.length<120000?{thumb:C.media.thumb}:{})};
      else if(C.media.kind==='image'&&C.media.dataUrl)data.image=C.media.dataUrl;
      else if(C.media.kind==='video'){if(!C.media.thumb)C.media.thumb=await makeThumb(C.media.url);data.media=await uploadChunks(C.media.blob,C.media.thumb)}
    }
    if(opts)data.poll={options:opts.slice(0,4)};
    await put('posts',newId(),data);
  });
  C.busy=false;
  if(ok){if(C.media?.url?.startsWith('blob:'))URL.revokeObjectURL(C.media.url);S.compose={text:'',media:null,poll:null,busy:false,progress:0};toast('Posted')}
  render();
}
const pairId=(a,b)=>a+'__'+b;
const toggleLike=pid=>guard(()=>iLike(pid)?remove('likes',pairId(pid,S.uid)):put('likes',pairId(pid,S.uid),{post:pid,user:S.uid,at:Date.now()}));
const toggleRepost=pid=>guard(async()=>{if(iRepost(pid))await remove('reposts',pairId(pid,S.uid));else{await put('reposts',pairId(pid,S.uid),{post:pid,user:S.uid,at:Date.now()});toast('Reposted')}});
const vote=(pid,i)=>guard(()=>put('votes',pairId(pid,S.uid),{post:pid,user:S.uid,choice:i,at:Date.now()}));
function toggleSave(pid){if(!S.uid)return signIn();const b=new Set(S.me.bookmarks||[]);b.has(pid)?b.delete(pid):b.add(pid);saveMe({bookmarks:[...b]});toast(b.has(pid)?'Saved to bookmarks':'Removed from bookmarks')}
async function addComment(pid){
  const text=(S.drafts[pid]||'').trim();if(!text)return;
  if(await guard(()=>put('comments',newId(),{post:pid,author:S.uid,text:text.slice(0,500),createdAt:Date.now()}))){S.drafts[pid]='';render();focusKey('c:'+pid)}
}
async function deletePost(pid){
  const p=postById(pid);if(!p)return;
  await guard(async()=>{
    // children first (rules check the post's author while it still exists)
    for(const c of['likes','reposts','votes'])for(const r of S[c].filter(x=>x.post===pid))await remove(c,r.id);
    for(const c of commentsFor(pid))await remove('comments',c.id);
    await remove('posts',pid);
    if(isDbVideo(p.media)&&(p.author===S.uid||S.isAdmin)){for(let i=0;i<p.media.chunks;i++){try{await remove('videoChunks',p.media.vid+'_'+i)}catch{}}}
    if(p.media?.path&&S.fb.st&&p.author===S.uid){try{await S.fb.st.deleteObject(S.fb.st.ref(S.fb.storage,p.media.path))}catch{}}
    const b=(S.me.bookmarks||[]);if(b.includes(pid))saveMe({bookmarks:b.filter(x=>x!==pid)});
    toast('Post deleted');
  });
}
const deleteComment=cid=>guard(()=>remove('comments',cid));
const toggleFollow=id=>guard(()=>following(id)?remove('follows',pairId(S.uid,id)):put('follows',pairId(S.uid,id),{from:S.uid,to:id,at:Date.now()}));

const HANDLE_RE=/^[a-z0-9_]{3,20}$/;
async function saveAccount(f,isNew){
  const h=String(f.handle||'').toLowerCase().replace(/^@/,'');
  if(!HANDLE_RE.test(h))return '3–20 letters, numbers or _';
  const name=String(f.displayName||'').trim().slice(0,40);
  if(!name)return 'Pick a display name';
  const web=String(f.website||'').trim().slice(0,100);
  if(web&&!/^https?:\/\//.test(web))return 'Website must start with http:// or https://';
  const old=handleOf(S.uid);let err=null;
  const {fs,db}=S.fb;
  const ok=await guard(async()=>{
    try{
      await fs.runTransaction(db,async tx=>{
        if(h!==old){
          const hs=await tx.get(dref('handles',h));
          if(hs.exists()&&hs.data().user!==S.uid){const e=new Error('taken');e.taken=true;throw e}
          if(!hs.exists())tx.set(dref('handles',h),{user:S.uid,at:Date.now()});
          if(old)tx.delete(dref('handles',old));
        }
        tx.set(dref('profiles',S.uid),{user:S.uid,handle:h,displayName:name,bio:String(f.bio||'').trim().slice(0,160),color:f.color||colorOf(S.uid),website:web,photo:f.usePhoto&&S.photoURL?S.photoURL:'',createdAt:prof(S.uid).createdAt||Date.now()});
      });
    }catch(e){if(e.taken){err='@'+h+' is taken';e.taken=true}throw e}
  });
  if(err)return err;
  if(!ok)return 'Couldn’t save — try again';
  toast(isNew?'Welcome to Pulse!':'Profile saved');
  return null;
}

/* ---------- media pick ---------- */
function pickFile(file,kind){
  if(!file)return;
  const C=S.compose;
  if(kind==='video'){
    if(/quicktime/.test(file.type)||/\.mov$/i.test(file.name)){toast('.mov isn’t supported — export as MP4');return}
    if(!/^video\/(mp4|webm)$/.test(file.type)&&!/\.(mp4|webm)$/i.test(file.name)){toast('Pick an MP4 or WebM video');return}
    const lim=S.fb?.st?VIDEO_MAX:DB_VIDEO_MAX;
    if(file.size>lim){toast(`Videos must be under ${lim/1048576} MB`);return}
    if(C.media?.url?.startsWith('blob:'))URL.revokeObjectURL(C.media.url);
    C.media={kind:'video',blob:file,url:URL.createObjectURL(file),thumb:''};C.poll=null;render();
    makeThumb(C.media.url).then(t=>{if(C.media?.blob===file)C.media.thumb=t});return;
  }
  if(!file.type.startsWith('image/')){toast('Pick an image');return}
  const r=new FileReader();
  r.onload=()=>{const img=new Image();img.onload=()=>{
    const max=S.fb?.st?1600:900;let w=img.width,h=img.height;const k=Math.min(1,max/Math.max(w,h));w=Math.round(w*k);h=Math.round(h*k);
    const c=document.createElement('canvas');c.width=w;c.height=h;c.getContext('2d').drawImage(img,0,0,w,h);
    const finish=(blob,dataUrl)=>{if(C.media?.url?.startsWith('blob:'))URL.revokeObjectURL(C.media.url);C.media={kind:'image',blob,dataUrl,url:blob?URL.createObjectURL(blob):dataUrl};C.poll=null;render()};
    if(S.fb?.st)c.toBlob(b=>finish(b,null),'image/jpeg',.85);
    else{let q=.8,url=c.toDataURL('image/jpeg',q);while(url.length>300000&&q>.3){q-=.1;url=c.toDataURL('image/jpeg',q)}finish(null,url)}
  };img.src=r.result};
  r.readAsDataURL(file);
}

function makeThumb(url){
  return new Promise(res=>{
    const v=document.createElement('video');v.muted=true;v.playsInline=true;v.preload='auto';v.src=url;
    let to;const done=t=>{clearTimeout(to);res(t)};to=setTimeout(()=>done(''),6000);
    v.onloadeddata=()=>{try{v.currentTime=Math.min(0.5,(v.duration||1)/2)}catch{done('')}};
    v.onseeked=()=>{try{const w=Math.min(480,v.videoWidth||480),h=Math.round(w*(v.videoHeight||270)/(v.videoWidth||480));
      const c=document.createElement('canvas');c.width=w;c.height=h;c.getContext('2d').drawImage(v,0,0,w,h);done(c.toDataURL('image/jpeg',.7))}catch{done('')}};
    v.onerror=()=>done('');
  });
}
// Free mode: a video is saved as small pieces in the database (no Storage plan needed)
async function uploadChunks(file,thumb){
  const buf=new Uint8Array(await file.arrayBuffer());
  const n=Math.ceil(buf.length/CHUNK), vid=newId(), type=file.type==='video/webm'?'video/webm':'video/mp4';
  for(let i=0;i<n;i++){
    const part=buf.subarray(i*CHUNK,(i+1)*CHUNK);let bin='';
    for(let j=0;j<part.length;j+=0x8000)bin+=String.fromCharCode.apply(null,part.subarray(j,j+0x8000));
    await put('videoChunks',vid+'_'+i,{owner:S.uid,vid,i,data:btoa(bin)});
    S.compose.progress=Math.round((i+1)*100/n);const b=$('[data-act="post"]');if(b)b.textContent=`Uploading ${S.compose.progress}%`;
  }
  return{kind:'video',vid,chunks:n,type,size:buf.length,thumb:/^data:image\/jpeg;base64,/.test(thumb||'')&&thumb.length<120000?thumb:''};
}
const isDbVideo=m=>m?.kind==='video'&&typeof m.vid==='string'&&Number.isInteger(m.chunks)&&m.chunks>0&&m.chunks<=20;
const isVideo=p=>p.media?.kind==='video'&&(okURL(p.media.url)||isDbVideo(p.media));
const videoSrc=p=>okURL(p.media?.url)?p.media.url:VCACHE.get(p.media?.vid)||'';
async function loadVideo(p,autoplay=true){
  const m=p.media;if(!isDbVideo(m)||VCACHE.has(m.vid)||VLOADING.has(m.vid))return;
  VLOADING.add(m.vid);render();
  try{
    const parts=await Promise.all(Array.from({length:m.chunks},(_,i)=>S.fb.fs.getDoc(dref('videoChunks',m.vid+'_'+i))));
    const bytes=parts.map(d=>{if(!d.exists())throw new Error('missing');const b=atob(d.data().data);const u=new Uint8Array(b.length);for(let i=0;i<b.length;i++)u[i]=b.charCodeAt(i);return u});
    VCACHE.set(m.vid,URL.createObjectURL(new Blob(bytes,{type:m.type==='video/webm'?'video/webm':'video/mp4'})));
  }catch(e){console.warn(e);toast('Couldn’t load that video')}
  VLOADING.delete(m.vid);render();
  if(autoplay){const v=document.querySelector(`main [data-vid="${CSS.escape(m.vid)}"]`);v?.play().catch(()=>{})}
}
function videoBox(p,cls='pimg'){
  const src=videoSrc(p);
  if(src)return`<video class="${cls}" data-vid="${esc(p.media.vid||'')}" src="${esc(src)}" controls playsinline preload="metadata" ${p.media.thumb?`poster="${esc(p.media.thumb)}"`:''}></video>`;
  const loading=VLOADING.has(p.media.vid);
  return`<button class="vposter ${cls}" data-act="playvid" data-id="${esc(p.id)}" style="${p.media.thumb?`background-image:url('${esc(p.media.thumb)}')`:''}">
    <span class="vplay">${loading?'Loading…':'▶'}</span>${p.media.size?`<span class="vsize">${(p.media.size/1048576).toFixed(1)} MB</span>`:''}</button>`;
}

/* ---------- post rendering ---------- */
function mediaHTML(p){
  if(isVideo(p))return videoBox(p);
  if(p.media&&okURL(p.media.url)){
    const src=esc(p.media.url);
    if(p.media.kind==='video')return`<video class="pimg" src="${src}" controls playsinline preload="metadata"></video>`;
    return`<img class="pimg" src="${src}" alt="" loading="lazy">`;
  }
  if(p.image&&/^data:image\/(jpeg|png|webp);base64,/.test(p.image))return`<img class="pimg" src="${esc(p.image)}" alt="" loading="lazy">`;
  return'';
}
function pollHTML(p){
  const opts=Array.isArray(p.poll?.options)?p.poll.options.slice(0,4):[];if(!opts.length)return'';
  const vs=votesFor(p.id),total=vs.length,mine=vs.find(v=>v.user===S.uid),showRes=!!mine||p.author===S.uid||!S.uid;
  return`<div class="poll">${opts.map((o,i)=>{const n=vs.filter(v=>v.choice===i).length,pct=total?Math.round(n*100/total):0;
    return`<button class="opt ${showRes?'voted':''} ${mine?.choice===i?'mine':''}" data-act="vote" data-id="${esc(p.id)}" data-i="${i}">
      ${showRes?`<div class="fill" style="transform:scaleX(${pct/100})"></div>`:''}<span>${esc(o)}</span>${showRes?`<span>${pct}%</span>`:''}</button>`}).join('')}
    <div class="muted" style="font-size:13px">${total} vote${total===1?'':'s'}${mine?' · tap another option to change':''}</div></div>`;
}
const SEEN=new Set();
function postHTML(p,why){
  const likes=likesFor(p.id).length,cmts=commentsFor(p.id),reps=repostsFor(p.id).length,open=S.open.has(p.id);
  const canDel=S.uid&&(p.author===S.uid||S.isAdmin),h=handleOf(p.author);
  const fresh=!SEEN.has(p.id);SEEN.add(p.id);
  return`<article class="card post${fresh?' fresh':''}" data-post="${esc(p.id)}">
    ${why?`<div class="why">${ICON.repost}${why}</div>`:''}
    ${av(p.author)}<div class="body">
    <div class="meta"><span class="who" data-profile="${esc(p.author)}">${esc(nameOf(p.author))}</span>${h?`<span class="h">@${esc(h)}</span>`:''}<span class="when">· ${ago(p.createdAt)}</span></div>
    ${p.text?`<p class="text">${fmt(p.text)}</p>`:''}
    ${mediaHTML(p)}${pollHTML(p)}
    <div class="actions">
      <button class="iconbtn" data-act="thread" data-id="${esc(p.id)}" title="Reply">${ICON.chat}${cmts.length||''}</button>
      <button class="iconbtn ${iRepost(p.id)?'reposted':''}" data-act="repost" data-id="${esc(p.id)}" title="Repost">${ICON.repost}${reps||''}</button>
      <button class="iconbtn ${iLike(p.id)?'liked':''}" data-act="like" data-id="${esc(p.id)}" title="Like">${ICON.heart}${likes||''}</button>
      <button class="iconbtn ${iSaved(p.id)?'saved':''}" data-act="save" data-id="${esc(p.id)}" title="Bookmark">${ICON.bookmark}</button>
      <button class="iconbtn" data-act="copy" data-id="${esc(p.id)}" title="Copy link">${ICON.share}</button>
      ${canDel?`<button class="iconbtn del" data-act="del" data-id="${esc(p.id)}" title="Delete">${ICON.trash}</button>`:''}
    </div>
    ${open?`<div class="thread">
      ${cmts.map(c=>`<div class="cmt">${av(c.author,'sm')}<div class="bub"><span class="who" data-profile="${esc(c.author)}">${esc(nameOf(c.author))}</span> <span class="muted" style="font-size:12px">${ago(c.createdAt)}</span>
        ${S.uid&&(c.author===S.uid||S.isAdmin||p.author===S.uid)?`<button class="muted" style="float:right;font-size:12px" data-act="delc" data-id="${esc(c.id)}">delete</button>`:''}
        <p>${fmt(c.text)}</p></div></div>`).join('')}
      ${canWrite()?`<form class="cform" data-form="c" data-id="${esc(p.id)}">${av(S.uid,'sm')}<input data-key="c:${esc(p.id)}" data-draft="${esc(p.id)}" placeholder="Write a reply…" maxlength="500" value="${esc(S.drafts[p.id]||'')}"><button class="btn small" type="submit">Reply</button></form>`
        :`<button class="btn ghost small" data-act="signin" style="align-self:flex-start">Sign in to reply</button>`}
    </div>`:''}
  </div></article>`;
}
function feedList(items,emptyBig,emptySmall){
  if(S.loading&&!items.length)return`<div class="empty">Loading…</div>`;
  if(!items.length)return`<div class="empty"><div class="big">${emptyBig}</div>${emptySmall||''}</div>`;
  return items.map(it=>it.post?postHTML(it.post,it.why):postHTML(it)).join('');
}
function feedItems(authorsSet){
  const items=new Map();
  for(const p of S.posts)if(!authorsSet||authorsSet.has(p.author))items.set(p.id,{post:p,at:p.createdAt,why:''});
  for(const r of S.reposts){
    const p=postById(r.post);if(!p)continue;
    if(authorsSet&&!authorsSet.has(r.user))continue;
    const cur=items.get(p.id);
    if(!cur||(r.at||0)>cur.at)items.set(p.id,{post:p,at:r.at||0,why:`${r.user===S.uid?'You':esc(nameOf(r.user))} reposted`});
  }
  return[...items.values()].sort((a,b)=>b.at-a.at);
}

/* ---------- views ---------- */
const signInBtn=(label='Sign in with Google')=>`<button class="signin" data-act="signin">${GOOGLE}${label}</button>`;
function composerHTML(){
  if(!S.uid)return`<div class="card hero"><h2>Join the conversation</h2><p>Sign in to post, reply, like and follow people.</p>${signInBtn()}</div>`;
  if(!canWrite())return'';
  const C=S.compose,n=C.text.length,left=MAX-n;
  const can=!C.busy&&n<=MAX&&(C.text.trim()||C.media||(C.poll&&C.poll.filter(o=>o.trim()).length>=2));
  return`<div class="card composer">${av(S.uid)}<div style="flex:1;min-width:0">
    <textarea data-key="compose" placeholder="What’s happening? Use #tags and @mentions" rows="2" maxlength="${MAX+50}">${esc(C.text)}</textarea>
    ${C.media?`<div class="preview"><button class="x" data-act="rmmedia" aria-label="Remove">✕</button>${C.media.kind==='video'?`<video src="${esc(C.media.url)}" controls playsinline></video>`:`<img src="${esc(C.media.url)}" alt="">`}</div>`:''}
    ${C.poll?`<div class="pollin">${C.poll.map((o,i)=>`<input data-key="poll:${i}" data-poll="${i}" maxlength="40" placeholder="Option ${i+1}" value="${esc(o)}">`).join('')}
      <div style="display:flex;gap:8px">${C.poll.length<4?`<button class="iconbtn" data-act="addopt">${ICON.plus}Add option</button>`:''}<button class="iconbtn" data-act="rmpoll">Remove poll</button></div></div>`:''}
    <div class="row"><div class="tools">
      <label class="iconbtn" title="Photo">${ICON.image}<span>Photo</span><input type="file" accept="image/*" data-file="image" hidden></label>
      <label class="iconbtn" title="Video">${ICON.video}<span>Video</span><input type="file" accept="video/mp4,video/webm" data-file="video" hidden></label>
      <button class="iconbtn ${C.poll?'on':''}" data-act="poll" title="Poll">${ICON.poll}<span>Poll</span></button>
    </div>
    <div style="display:flex;align-items:center;gap:12px"><span class="count ${left<20?'warn':''}">${left}</span><button class="btn" data-act="post" ${can?'':'disabled'}>${C.busy?(C.media?`Uploading ${C.progress}%`:'Posting…'):'Post'}</button></div></div>
  </div></div>`;
}
function homeView(){
  let set=null;
  if(S.tab==='following'&&S.uid){set=new Set(S.follows.filter(f=>f.from===S.uid).map(f=>f.to));set.add(S.uid)}
  return`<div class="top"><h1>Home</h1>${S.uid?`<div class="tabs"><button data-tab="all" class="${S.tab==='all'?'on':''}">For you</button><button data-tab="following" class="${S.tab==='following'?'on':''}">Following</button></div>`:''}</div>
  ${composerHTML()}
  ${feedList(feedItems(set),S.tab==='following'?'Nothing here yet':'Be the first to post',S.tab==='following'?'Follow people to fill this feed.':'Say hi — post some text, a photo, a video or a poll.')}`;
}
function clipsView(){
  const vids=S.posts.filter(isVideo).sort((a,b)=>b.createdAt-a.createdAt);
  return`<div class="top"><h1>Clips</h1><span class="muted">${vids.length} video${vids.length===1?'':'s'}</span></div>
  ${vids.length?`<div class="clips">${vids.map(p=>`<div class="clip" data-act="watch" data-id="${esc(p.id)}">
    ${p.media.thumb?`<img src="${esc(p.media.thumb)}" alt="" style="width:100%;height:100%;object-fit:cover;display:block">`:videoSrc(p)?`<video src="${esc(videoSrc(p))}#t=0.5" muted playsinline preload="metadata"></video>`:'<div style="width:100%;height:100%;background:linear-gradient(135deg,#2a2420,#000)"></div>'}
    <span class="play">▶</span><div class="cap"><b>${esc(nameOf(p.author))}</b><div>${esc(p.text||'')}</div></div></div>`).join('')}</div>`
  :`<div class="empty"><div class="big">No clips yet</div>Post a video from Home and it shows up here.</div>`}`;
}
function exploreView(){
  const q=S.query.toLowerCase();
  let list=[...S.posts].sort((a,b)=>b.createdAt-a.createdAt);
  if(S.tag)list=list.filter(p=>tagsIn(p.text).includes(S.tag));
  if(q)list=list.filter(p=>(p.text||'').toLowerCase().includes(q)||nameOf(p.author).toLowerCase().includes(q)||handleOf(p.author).includes(q.replace(/^@/,'')));
  const people=q?Object.values(S.profiles).filter(p=>p.user&&((p.displayName||'').toLowerCase().includes(q)||(p.handle||'').includes(q.replace(/^@/,'')))).slice(0,6):[];
  return`<div class="top"><h1>Explore</h1></div>
  <div class="search card" style="margin-bottom:14px">${ICON.search}<input data-key="q" placeholder="Search posts, @people and #tags" value="${esc(S.query)}"></div>
  ${S.tag?`<div class="filter"><span class="chip">#${esc(S.tag)}</span><button class="muted" data-act="cleartag">clear</button></div>`:''}
  ${people.length?`<div class="card box" style="margin-bottom:14px"><h3>People</h3>${people.map(p=>personRow(p.user)).join('')}</div>`:''}
  ${!q&&!S.tag?`<div class="card box" style="margin-bottom:14px"><h3>Trending</h3>${trendsHTML()}</div>`:''}
  ${feedList(list,'No matching posts','Try another word or tag.')}`;
}
const NK={like:['#ff5a36','heart','liked your post'],repost:['#2f8f4e','repost','reposted your post'],reply:['#127c74','chat','replied'],mention:['#6a4cff','at','mentioned you'],follow:['#2f7de1','user','followed you'],vote:['#e0a100','poll','voted in your poll']};
function notifView(){
  if(!S.uid)return`<div class="top"><h1>Notifications</h1></div><div class="card hero"><h2>See who’s talking to you</h2><p>Sign in to get likes, replies, mentions and new followers.</p>${signInBtn()}</div>`;
  const list=notifications(),seen=S.notifSeenSnapshot??(S.me.seenAt||0);
  return`<div class="top"><h1>Notifications</h1></div>
  ${list.length?`<div class="card" style="overflow:hidden">${list.map(n=>{const[c,ic,verb]=NK[n.kind];const p=n.post&&postById(n.post);
    return`<div class="notif ${n.at>seen?'new':''}" ${n.post?`data-act="gopost" data-id="${esc(n.post)}"`:`data-profile="${esc(n.who)}"`}>
      <div class="ic" style="background:${c}">${ICON[ic]}</div><div class="txt"><div><b>${esc(nameOf(n.who))}</b> ${verb} <span class="muted">· ${ago(n.at)}</span></div>
      ${n.text?`<div class="snip">${esc(n.text)}</div>`:p?.text?`<div class="snip">${esc(p.text)}</div>`:''}</div></div>`}).join('')}</div>`
  :`<div class="empty"><div class="big">All quiet</div>Likes, replies, reposts, mentions and new followers show up here.</div>`}`;
}
function bookmarksView(){
  if(!S.uid)return`<div class="top"><h1>Bookmarks</h1></div><div class="card hero"><h2>Save posts for later</h2><p>Sign in to keep a private list of posts.</p>${signInBtn()}</div>`;
  const list=[...(S.me.bookmarks||[])].reverse().map(postById).filter(Boolean);
  return`<div class="top"><h1>Bookmarks</h1><span class="muted">Only you can see these</span></div>
  ${feedList(list,'No bookmarks yet','Tap the bookmark on any post to save it here.')}`;
}
function profileView(){
  const id=S.profileId||S.uid;
  if(!id)return`<div class="top"><h1>Profile</h1></div><div class="card hero"><h2>Make your profile</h2><p>Sign in with Google to create your account.</p>${signInBtn()}</div>`;
  const me=id===S.uid,pr=prof(id),col=colorOf(id);
  const list=S.posts.filter(p=>p.author===id).sort((a,b)=>b.createdAt-a.createdAt);
  const likesGot=S.likes.filter(l=>list.some(p=>p.id===l.post)).length;
  let items=list;
  if(S.ptab==='media')items=list.filter(p=>p.media||p.image);
  if(S.ptab==='likes')items=S.likes.filter(l=>l.user===id).sort((a,b)=>(b.at||0)-(a.at||0)).map(l=>postById(l.post)).filter(Boolean);
  const E=S.edit;
  return`<div class="card phead"><div class="cover" style="background:linear-gradient(120deg,${esc(col)},${esc(col)}88 60%,var(--soft))"></div>
  <div class="pinfo"><div class="row">${av(id,'lg')}
    ${me?(canWrite()&&!S.editing?`<div style="display:flex;gap:8px"><button class="btn ghost small" data-act="edit">Edit profile</button><button class="btn ghost small" data-act="signout">Sign out</button></div>`:''):(canWrite()?`<button class="btn small ${following(id)?'ghost':''}" data-act="follow" data-id="${esc(id)}">${following(id)?'Following':'Follow'}</button>`:'')}
  </div>
  <h2>${esc(nameOf(id))}</h2>${pr.handle?`<div class="handle">@${esc(pr.handle)}</div>`:''}
  ${pr.bio?`<p class="bio">${fmt(pr.bio)}</p>`:(me?`<p class="bio muted">Add a bio so people know who you are.</p>`:'')}
  ${pr.website&&/^https?:\/\//.test(pr.website)?`<p style="margin:0 0 10px"><a href="${esc(pr.website)}" target="_blank" rel="noopener nofollow">${esc(pr.website.replace(/^https?:\/\//,''))}</a></p>`:''}
  <div class="stats"><span><b>${list.length}</b> posts</span><span><b>${followersOf(id)}</b> followers</span><span><b>${followingOf(id)}</b> following</span><span><b>${likesGot}</b> likes</span>${pr.createdAt?`<span>Joined ${new Date(pr.createdAt).toLocaleDateString(undefined,{month:'short',year:'numeric'})}</span>`:''}</div>
  ${me&&S.editing?`<div class="edit">${accountFields(E)}
    ${E.err?`<div class="field"><span class="err">${esc(E.err)}</span></div>`:''}
    <div style="display:flex;gap:8px"><button class="btn small" data-act="saveprofile">Save</button><button class="btn ghost small" data-act="cancel">Cancel</button></div></div>`:''}
  </div></div>
  <div class="tabs" style="margin-bottom:14px;width:fit-content">${[['posts','Posts'],['media','Media'],['likes','Likes']].map(([k,l])=>`<button data-ptab="${k}" class="${S.ptab===k?'on':''}">${l}</button>`).join('')}</div>
  ${feedList(items,S.ptab==='likes'?'No likes yet':S.ptab==='media'?'No photos or videos yet':me?'You haven’t posted yet':'No posts yet','')}`;
}
function accountFields(E){
  return`<label class="field">Username<div class="prefix"><span>@</span><input data-key="f:handle" data-f="handle" maxlength="20" value="${esc(E.handle||'')}" autocomplete="off"></div><span class="hint">3–20 letters, numbers or _ — must be unique</span></label>
  <label class="field">Display name<input data-key="f:displayName" data-f="displayName" maxlength="40" value="${esc(E.displayName||'')}"></label>
  <label class="field">Bio<textarea data-key="f:bio" data-f="bio" rows="2" maxlength="160" placeholder="Tell people about yourself">${esc(E.bio||'')}</textarea></label>
  <label class="field">Website<input data-key="f:website" data-f="website" maxlength="100" placeholder="https://" value="${esc(E.website||'')}"></label>
  ${S.photoURL?`<label class="field" style="flex-direction:row;align-items:center;gap:8px;font-weight:500"><input type="checkbox" data-check="usePhoto" ${E.usePhoto?'checked':''}> Use my Google profile photo</label>`:''}
  <div class="field">Avatar color<div class="swatches">${COLORS.map(c=>`<button data-color="${c}" class="${E.color===c?'on':''}" style="background:${c}" aria-label="color ${c}"></button>`).join('')}</div></div>`;
}
function trendsHTML(){
  const counts={};for(const p of S.posts)for(const t of new Set(tagsIn(p.text)))counts[t]=(counts[t]||0)+1;
  const top=Object.entries(counts).sort((a,b)=>b[1]-a[1]).slice(0,6);
  if(!top.length)return`<p class="muted" style="margin:0">Tags like #weekend show up here once people use them.</p>`;
  return top.map(([t,n])=>`<div class="trend" data-tag="${esc(t)}"><b>#${esc(t)}</b><span>${n} post${n>1?'s':''}</span></div>`).join('');
}
function personRow(id){
  const h=handleOf(id);
  return`<div class="person">${av(id,'sm')}<div class="n" data-profile="${esc(id)}">${esc(nameOf(id))}<small>${h?'@'+esc(h)+' · ':''}${followersOf(id)} followers</small></div>
    ${canWrite()&&id!==S.uid?`<button class="btn small ${following(id)?'ghost':''}" data-act="follow" data-id="${esc(id)}">${following(id)?'Following':'Follow'}</button>`:''}</div>`;
}
function peopleHTML(){
  const ids=Object.keys(S.profiles).filter(id=>id&&id!==S.uid&&!following(id));
  ids.sort((a,b)=>followersOf(b)-followersOf(a));
  if(!ids.length)return`<p class="muted" style="margin:0">Share Pulse with friends — they’ll show up here.</p>`;
  return ids.slice(0,5).map(personRow).join('');
}
function overlayHTML(){
  if(S.viewer){const p=postById(S.viewer);if(!p||!isVideo(p)){S.viewer=null;return''}
    const src=videoSrc(p);
    return`<div class="viewer" data-act="closeviewer"><button class="x" data-act="closeviewer" aria-label="Close">✕</button>
      ${src?`<video src="${esc(src)}" controls autoplay playsinline onclick="event.stopPropagation()"></video>`:`<div style="color:#fff;font-size:18px">Loading video…</div>`}
      <div class="info"><b>${esc(nameOf(p.author))}</b> ${esc(p.text||'')}<br><button class="btn small" style="margin-top:10px" data-act="gopost" data-id="${esc(p.id)}">Open post · ${likesFor(p.id).length} likes · ${commentsFor(p.id).length} replies</button></div></div>`}
  if(S.onboard){const E=S.onboard;
    return`<div class="modal"><div class="card"><div class="brand" style="padding:0 0 6px;font-size:22px"><span class="dot"></span>Pulse</div>
      <h2>Create your account</h2><p class="muted" style="margin:4px 0 16px">You’re signed in with Google. Pick a username so people can find and @mention you.</p>
      <div class="edit" style="margin:0">${accountFields(E)}
      ${E.err?`<div class="field"><span class="err">${esc(E.err)}</span></div>`:''}
      <button class="btn" data-act="createaccount" ${E.busy?'disabled':''}>${E.busy?'Creating…':'Create account'}</button>
      <button class="muted" data-act="signout" style="font-size:13px">Use a different Google account</button></div></div></div>`}
  return'';
}
function setupHTML(){
  return`<div class="card setup"><div class="brand" style="padding:0 0 10px"><span class="dot"></span>Pulse</div>
  <h2 style="font-size:24px;margin-bottom:8px">Almost there — connect Firebase</h2>
  <p>Pulse needs a free Firebase project to save posts and sign people in with Google.</p>
  <p>Open <code>SETUP-GUIDE.md</code> and follow the steps, then paste your settings into <code>firebase-config.js</code> and reload this page.</p></div>`;
}

/* ---------- render ---------- */
function focusKey(k,caret){const el=document.querySelector(`[data-key="${CSS.escape(k)}"]`);if(el){el.focus();if(caret!=null&&el.setSelectionRange)try{el.setSelectionRange(caret,caret)}catch{}}}
function suggestHandle(){return(S.googleName||'').toLowerCase().replace(/[^a-z0-9_]/g,'').slice(0,16)}
function render(){
  if(!CONFIGURED){$('#main').innerHTML=setupHTML();$('#nav').innerHTML='';$('#side').innerHTML='';return}
  const a=document.activeElement,key=a?.dataset?.key,caret=a?.selectionStart;
  const playing=[...document.querySelectorAll('main video')].filter(v=>!v.paused).map(v=>v.src);
  if(S.uid&&S.profilesReady&&!handleOf(S.uid)&&!S.onboard)S.onboard={handle:suggestHandle(),displayName:S.googleName||'',bio:'',website:'',color:colorOf(S.uid),usePhoto:!!S.photoURL};
  if(S.onboard&&(!S.uid||handleOf(S.uid)))S.onboard=null;
  const n=unread();
  const items=[['home','Home'],['clips','Clips'],['explore','Explore'],['notifications','Alerts'],['bookmarks','Saved'],['profile','Profile']];
  const icon={home:'home',clips:'clips',explore:'explore',notifications:'bell',bookmarks:'bookmark',profile:'user'};
  const isOn=v=>S.view===v&&(v!=='profile'||!S.profileId||S.profileId===S.uid);
  const h=handleOf(S.uid);
  $('#nav').innerHTML=`<div class="brand"><span class="dot"></span>Pulse</div>
    ${items.map(([v,l])=>`<button class="navbtn ${isOn(v)?'on':''}" data-view="${v}">${ICON[icon[v]]}${v==='notifications'?'Notifications':v==='bookmarks'?'Bookmarks':l}${v==='notifications'&&n?`<span class="badge">${n>99?'99+':n}</span>`:''}</button>`).join('')}
    ${S.uid?`<div class="mecard" data-profile="${esc(S.uid)}">${av(S.uid,'sm')}<div style="min-width:0;flex:1"><div class="n">${esc(nameOf(S.uid))}</div><div class="s">${h?'@'+esc(h):'Setting up…'}</div></div></div>`
      :S.authReady?`<div style="margin-top:16px">${signInBtn('Sign in')}</div>`:''}`;
  $('#mnav').innerHTML=items.filter(([v])=>v!=='bookmarks').map(([v,l])=>`<button class="${isOn(v)?'on':''}" data-view="${v}">${ICON[icon[v]]}${l}${v==='notifications'&&n?`<span class="badge">${n>9?'9+':n}</span>`:''}</button>`).join('');
  const V={explore:exploreView,profile:profileView,clips:clipsView,notifications:notifView,bookmarks:bookmarksView}[S.view]||homeView;
  $('#main').innerHTML=V();
  $('#side').innerHTML=`<div class="search">${ICON.search}<input data-key="sq" id="sq" placeholder="Search Pulse"></div>
    <div class="card box"><h3>Trending</h3>${trendsHTML()}</div>
    <div class="card box"><h3>Who to follow</h3>${peopleHTML()}</div>
    <p class="muted" style="padding:0 6px;font-size:12px">Posts are public. Bookmarks are private to you.</p>`;
  const ov=overlayHTML();
  if(!(S.viewer&&$('#overlay video')))$('#overlay').innerHTML=ov;
  if(!ov)$('#overlay').innerHTML='';
  if(key)focusKey(key,caret);
  if(playing.length)document.querySelectorAll('main video').forEach(v=>{if(playing.includes(v.src))v.play().catch(()=>{})});
}
let rt=null;const soon=()=>{clearTimeout(rt);rt=setTimeout(render,30)};
function go(view,extra={}){
  if(S.view==='notifications'&&view!=='notifications')S.notifSeenSnapshot=null;
  Object.assign(S,{view,editing:false,...extra});
  if(view==='notifications'&&S.uid){S.notifSeenSnapshot=S.me.seenAt||0;const latest=notifications()[0]?.at||0;if(latest>(S.me.seenAt||0))saveMe({seenAt:latest})}
  let hsh=view==='home'?'':view;
  if(view==='profile'&&S.profileId&&S.profileId!==S.uid&&handleOf(S.profileId))hsh='u-'+handleOf(S.profileId);
  if(location.hash.slice(1)!==hsh)history.pushState(null,'',hsh?'#'+hsh:location.pathname+location.search);
  render();window.scrollTo({top:0});
}
function goPost(pid){
  S.viewer=null;S.open.add(pid);
  const p=postById(pid);if(!p)return toast('That post was deleted');
  go('profile',{profileId:p.author,ptab:'posts'});
  history.replaceState(null,'','#p-'+pid);
  setTimeout(()=>{const el=document.querySelector(`[data-post="${CSS.escape(pid)}"]`);if(el){el.scrollIntoView({behavior:'smooth',block:'center'});el.animate([{boxShadow:'0 0 0 3px var(--accent)'},{boxShadow:'0 0 0 0 transparent'}],{duration:1600})}},60);
}

/* ---------- events ---------- */
document.addEventListener('click',async e=>{
  const t=e.target.closest('[data-view],[data-tab],[data-ptab],[data-act],[data-profile],[data-tag],[data-color]');if(!t)return;
  if(t.tagName==='LABEL')return;
  if(t.dataset.view)return go(t.dataset.view,{profileId:t.dataset.view==='profile'?S.uid:S.profileId});
  if(t.dataset.tab){S.tab=t.dataset.tab;return render()}
  if(t.dataset.ptab){S.ptab=t.dataset.ptab;return render()}
  if(t.dataset.color){const E=S.onboard||S.edit;E.color=t.dataset.color;return render()}
  if(t.dataset.profile){S.viewer=null;return go('profile',{profileId:t.dataset.profile,ptab:'posts'})}
  if(t.dataset.tag)return go('explore',{tag:t.dataset.tag.toLowerCase(),query:''});
  const id=t.dataset.id,C=S.compose;
  switch(t.dataset.act){
    case'signin':return signIn();
    case'signout':S.onboard=null;return signOut();
    case'post':return createPost();
    case'like':return toggleLike(id);
    case'repost':return toggleRepost(id);
    case'save':return toggleSave(id);
    case'vote':return vote(id,+t.dataset.i);
    case'thread':S.open.has(id)?S.open.delete(id):S.open.add(id);render();if(S.open.has(id))focusKey('c:'+id);return;
    case'del':return deletePost(id);
    case'delc':return deleteComment(id);
    case'follow':return toggleFollow(id);
    case'poll':C.poll=C.poll?null:['',''];if(C.poll)C.media=null;render();if(C.poll)focusKey('poll:0');return;
    case'addopt':C.poll.push('');render();focusKey('poll:'+(C.poll.length-1));return;
    case'rmpoll':C.poll=null;return render();
    case'rmmedia':if(C.media?.url?.startsWith('blob:'))URL.revokeObjectURL(C.media.url);C.media=null;return render();
    case'edit':{const p=prof(S.uid);S.editing=true;S.edit={handle:p.handle||'',displayName:p.displayName||'',bio:p.bio||'',website:p.website||'',color:colorOf(S.uid),usePhoto:!!p.photo};return render()}
    case'cancel':S.editing=false;return render();
    case'saveprofile':{S.edit.err=await saveAccount(S.edit,false);if(!S.edit.err)S.editing=false;return render()}
    case'createaccount':{const E=S.onboard;E.busy=true;E.err=null;render();E.err=await saveAccount(E,true);E.busy=false;if(!E.err)S.onboard=null;return render()}
    case'cleartag':S.tag=null;return render();
    case'watch':{S.viewer=id;render();const p=postById(id);if(p&&isDbVideo(p.media)&&!VCACHE.has(p.media.vid)){await loadVideo(p,false);$('#overlay').innerHTML=''}return render()}
    case'playvid':{const p=postById(id);if(p)loadVideo(p);return}
    case'closeviewer':if(e.target.closest('video'))return;S.viewer=null;$('#overlay').innerHTML='';return render();
    case'gopost':return goPost(id);
    case'copy':{const url=location.origin+location.pathname+'#p-'+id;
      try{await navigator.clipboard.writeText(url);toast('Link copied')}catch{toast('Couldn’t copy')}return}
  }
});
document.addEventListener('input',e=>{
  const t=e.target,k=t.dataset.key;
  if(k==='compose'){S.compose.text=t.value;const left=MAX-t.value.length;const c=t.closest('.composer').querySelector('.count');c.textContent=left;c.classList.toggle('warn',left<20);
    const b=t.closest('.composer').querySelector('[data-act="post"]');const C=S.compose;b.disabled=C.busy||t.value.length>MAX||!(t.value.trim()||C.media||(C.poll&&C.poll.filter(o=>o.trim()).length>=2));return}
  if(t.dataset.poll!=null){S.compose.poll[+t.dataset.poll]=t.value;const b=$('[data-act="post"]');if(b)b.disabled=S.compose.poll.filter(o=>o.trim()).length<2&&!S.compose.text.trim();return}
  if(t.dataset.draft){S.drafts[t.dataset.draft]=t.value;return}
  if(t.dataset.check){(S.onboard||S.edit)[t.dataset.check]=t.checked;return}
  if(t.dataset.f){const E=S.onboard||S.edit;E[t.dataset.f]=t.dataset.f==='handle'?t.value.toLowerCase().replace(/[^a-z0-9_]/g,''):t.value;if(t.dataset.f==='handle'&&t.value!==E.handle){const pos=t.selectionStart;t.value=E.handle;try{t.setSelectionRange(pos,pos)}catch{}}return}
  if(k==='q'){S.query=t.value;render();return}
});
document.addEventListener('keydown',e=>{
  if(e.target.dataset?.key==='compose'&&e.key==='Enter'&&(e.metaKey||e.ctrlKey)){e.preventDefault();createPost()}
  if(e.target.id==='sq'&&e.key==='Enter')go('explore',{query:e.target.value,tag:null});
  if(e.key==='Escape'&&S.viewer){S.viewer=null;$('#overlay').innerHTML='';render()}
});
document.addEventListener('change',e=>{const k=e.target.dataset.file;if(k){pickFile(e.target.files[0],k);e.target.value=''}});
document.addEventListener('submit',e=>{e.preventDefault();if(e.target.dataset.form==='c')addComment(e.target.dataset.id)});
const VIEWS=['clips','explore','notifications','bookmarks','profile'];
let pendingHash=null;
function fromHash(){
  const h=decodeURIComponent(location.hash.slice(1));
  if(h.startsWith('p-')){pendingHash=h;S.view='home';return}
  if(h.startsWith('u-')){pendingHash=h;S.view='profile';return}
  S.view=VIEWS.includes(h)?h:'home';if(h==='profile')S.profileId=S.uid;
}
function resolvePendingHash(){
  if(!pendingHash||S.loading)return;
  const h=pendingHash;pendingHash=null;
  if(h.startsWith('p-'))goPost(h.slice(2));
  else{const id=byHandle(h.slice(2));if(id)go('profile',{profileId:id,ptab:'posts'});else toast('User not found')}
}
window.addEventListener('popstate',()=>{fromHash();resolvePendingHash();render()});
setInterval(()=>{const a=document.activeElement;if((!a||a===document.body)&&![...document.querySelectorAll('video')].some(v=>!v.paused)&&!S.viewer)render()},60000);

/* ---------- boot ---------- */
fromHash();
render();
if(CONFIGURED)(async()=>{
  try{S.fb=await loadFirebase()}catch(e){console.error(e);$('#main').innerHTML='<div class="empty"><div class="big">Couldn’t load Pulse</div>Check your internet connection and reload.</div>';return}
  const {fs,auth,authI}=S.fb;
  const listen=(q,apply)=>fs.onSnapshot(q,snap=>{apply(snap.docs.map(d=>({id:d.id,...d.data()})),snap);soon()},err=>{console.warn(err);S.loading=false;soon()});
  let loaded=0;const mark=()=>{if(++loaded>=2){S.loading=false;resolvePendingHash()}};
  listen(fs.query(col('posts'),fs.orderBy('createdAt','desc'),fs.limit(400)),(rows,s)=>{S.posts=rows.filter(r=>typeof r.createdAt==='number'&&typeof r.author==='string');if(!s.metadata.fromCache&&!S._p){S._p=1;mark()}});
  listen(fs.query(col('profiles'),fs.limit(1000)),(rows,s)=>{const m={};rows.forEach(r=>{m[r.user||r.id]=r});S.profiles=m;if(!s.metadata.fromCache){S.profilesReady=true;if(!S._pr){S._pr=1;mark()}}});
  listen(fs.query(col('likes'),fs.limit(2000)),rows=>S.likes=rows);
  listen(fs.query(col('comments'),fs.orderBy('createdAt','asc'),fs.limit(2000)),rows=>S.comments=rows.filter(r=>r.post&&r.author&&typeof r.text==='string'));
  listen(fs.query(col('follows'),fs.limit(2000)),rows=>S.follows=rows);
  listen(fs.query(col('reposts'),fs.limit(2000)),rows=>S.reposts=rows);
  listen(fs.query(col('votes'),fs.limit(2000)),rows=>S.votes=rows.filter(v=>Number.isInteger(v.choice)));
  setTimeout(()=>{if(S.loading){S.loading=false;render()}},10000);

  let unsubMe=null,unsubAdmin=null;
  try{await auth.getRedirectResult(authI)}catch{}
  auth.onAuthStateChanged(authI,user=>{
    unsubMe?.();unsubAdmin?.();
    S.uid=user?.uid||null;S.googleName=user?.displayName||'';S.photoURL=user?.photoURL||'';
    S.me={seenAt:0,bookmarks:[]};S.isAdmin=false;S.authReady=true;
    if(user){
      unsubMe=fs.onSnapshot(dref('private',user.uid),d=>{if(d.exists()){const v=d.data();S.me={seenAt:+v.seenAt||0,bookmarks:Array.isArray(v.bookmarks)?v.bookmarks:[]}}soon()},()=>{});
      unsubAdmin=fs.onSnapshot(dref('admins',user.uid),d=>{S.isAdmin=d.exists();soon()},()=>{});
    }
    render();
  });
})();
