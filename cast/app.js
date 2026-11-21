// Cast — a little social network (Firebase edition)
import { firebaseConfig, storageEnabled } from './firebase-config.js';
import { FILTERS, filterStyle, validFilter, openEditor, openCamera, chooseTarget, compressVideo, canCompress } from './editor.js';

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
  plus:SV('<path d="M12 5v14M5 12h14"/>'),
  msg:SV('<path d="M4 5h16v11H8l-4 4z"/>'),
  send:SV('<path d="M4 12 20 4l-6 16-3-7z"/>'),
  camera:SV('<path d="M4 8h3l2-3h6l2 3h3a1 1 0 0 1 1 1v10a1 1 0 0 1-1 1H4a1 1 0 0 1-1-1V9a1 1 0 0 1 1-1z"/><circle cx="12" cy="13.5" r="3.5"/>')
};
const GOOGLE = '<svg viewBox="0 0 48 48"><path fill="#FFC107" d="M43.6 20.5H42V20H24v8h11.3C33.7 32.7 29.2 36 24 36c-6.6 0-12-5.4-12-12s5.4-12 12-12c3.1 0 5.8 1.2 8 3l5.7-5.7C34 6.1 29.3 4 24 4 12.9 4 4 12.9 4 24s8.9 20 20 20 20-8.9 20-20c0-1.3-.1-2.4-.4-3.5z"/><path fill="#FF3D00" d="m6.3 14.7 6.6 4.8C14.7 15.1 19 12 24 12c3.1 0 5.8 1.2 8 3l5.7-5.7C34 6.1 29.3 4 24 4 16.3 4 9.7 8.3 6.3 14.7z"/><path fill="#4CAF50" d="M24 44c5.2 0 9.9-2 13.4-5.2l-6.2-5.2C29.2 35.1 26.7 36 24 36c-5.2 0-9.6-3.3-11.3-8l-6.5 5C9.5 39.6 16.2 44 24 44z"/><path fill="#1976D2" d="M43.6 20.5H42V20H24v8h11.3c-.8 2.2-2.2 4.2-4.1 5.6l6.2 5.2C37 39.2 44 34 44 24c0-1.3-.1-2.4-.4-3.5z"/></svg>';
const COLORS=['#1d6bff','#00a3ff','#5b4dff','#14b8a6','#ff4d8d','#f59e0b','#7c8cff','#ef4444'];
const VERIFY_AT=1000, RAW_VIDEO_MAX=200*1024*1024;
const BADGE='<svg class="vbadge" viewBox="0 0 24 24" aria-label="Verified"><path fill="currentColor" d="M12 1.5l2.6 1.9 3.2-.2 1 3.1 2.6 1.9-1 3.1 1 3.1-2.6 1.9-1 3.1-3.2-.2L12 22.5l-2.6-1.9-3.2.2-1-3.1-2.6-1.9 1-3.1-1-3.1 2.6-1.9 1-3.1 3.2.2z"/><path d="M7.5 12.3l3 3 6-6.2" fill="none" stroke="#fff" stroke-width="2.4" stroke-linecap="round" stroke-linejoin="round"/></svg>';
const MAX=280, VIDEO_MAX=20*1024*1024, DB_VIDEO_MAX=8*1024*1024, CHUNK=700*1024;
const VCACHE=new Map(), VLOADING=new Set();

const S={
  fb:null,uid:null,authReady:false,isAdmin:false,loading:true,profilesReady:false,
  posts:[],likes:[],comments:[],follows:[],counts:{},stories:[],convos:[],chat:null,msgs:[],chatDraft:'',reposts:[],votes:[],profiles:{},me:{seenAt:0,bookmarks:[]},
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
const av=(id,cls='',link=true)=>{const p=prof(id);const photo=p.photo&&/^https:\/\//.test(p.photo)?`background-image:url('${esc(p.photo)}');background-size:cover;`:'';
  return `<div class="av ${cls}" ${link?`data-profile="${esc(id)}"`:''} style="background-color:${esc(colorOf(id))};${photo}">${photo?'':esc(initials(nameOf(id)))}</div>`};
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
const NEED=new Set(), COUNT_PENDING=new Set();
const followersOf=id=>{NEED.add(id);return S.counts[id]?.followers??0};
const followingOf=id=>{NEED.add(id);return S.counts[id]?.following??0};
const verified=id=>followersOf(id)>=VERIFY_AT;
const badge=id=>verified(id)?BADGE:'';
async function ensureCounts(){
  if(!S.fb)return;
  const now=Date.now(), ids=[...NEED].filter(id=>id&&!COUNT_PENDING.has(id)&&(!S.counts[id]||now-S.counts[id].at>120000)).slice(0,12);
  NEED.clear(); if(!ids.length)return;
  ids.forEach(id=>COUNT_PENDING.add(id));
  const {fs}=S.fb;
  await Promise.all(ids.map(async id=>{
    try{
      const [a,b]=await Promise.all([fs.getCountFromServer(fs.query(col('follows'),fs.where('to','==',id))),fs.getCountFromServer(fs.query(col('follows'),fs.where('from','==',id)))]);
      S.counts[id]={followers:a.data().count,following:b.data().count,at:Date.now()};
    }catch(e){console.warn(e);S.counts[id]={followers:S.counts[id]?.followers||0,following:S.counts[id]?.following||0,at:Date.now()}}
    COUNT_PENDING.delete(id);
  }));
  soon();
}
function bumpCount(id,field,d){const c=S.counts[id]||{followers:0,following:0,at:Date.now()};c[field]=Math.max(0,(c[field]||0)+d);S.counts[id]=c}
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
  if(!S.fb)return toast('Cast isn’t connected to Firebase yet');
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
const setBtn=t=>{const b=$('[data-act="post"]');if(b)b.textContent=t};
async function prepareVideo(C){
  const lim=S.fb.st?VIDEO_MAX:DB_VIDEO_MAX;
  if(!C.media.thumb)C.media.thumb=await makeThumb(C.media.url);
  if(canCompress()&&C.media.blob.size>1.5*1024*1024&&!C.media.compressed){
    setBtn('Compressing\u2026');
    try{
      const out=await compressVideo(C.media.blob,{onProgress:f=>setBtn(`Compressing ${Math.round(f*100)}%`)});
      if(out.size&&out.size<C.media.blob.size){C.media.blob=out;C.media.compressed=true}
    }catch(e){if(/seconds/.test(e.message||''))throw e;console.warn('compress failed',e)}
  }
  if(C.media.blob.size>lim)throw new Error(`That video is too long \u2014 try one under ${S.fb.st?'2 minutes':'60 seconds'}`);
}
async function createPost(){
  const C=S.compose;const text=C.text.trim();
  const opts=C.poll?C.poll.map(o=>o.trim()).filter(Boolean):null;
  if(C.poll&&(!opts||opts.length<2)){toast('A poll needs at least 2 options');return}
  if(!text&&!C.media&&!opts)return;
  if(text.length>MAX||C.busy)return;
  C.busy=true;C.progress=0;render();
  const ok=await guard(async()=>{
    if(C.media?.kind==='video')await prepareVideo(C);
    const data={author:S.uid,text,createdAt:Date.now()};
    if(C.media){
      if(S.fb.st)data.media={...(await uploadMedia(C.media.blob,C.media.kind)),...(C.media.thumb&&C.media.thumb.length<120000?{thumb:C.media.thumb}:{})};
      else if(C.media.kind==='image'&&C.media.dataUrl)data.image=C.media.dataUrl;
      else if(C.media.kind==='video'){if(!C.media.thumb)C.media.thumb=await makeThumb(C.media.url);data.media=await uploadChunks(C.media.blob,C.media.thumb)}
      if(data.media?.kind==='video'&&validFilter(C.media.filter))data.media.filter=C.media.filter;
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
const toggleFollow=id=>guard(async()=>{
  if(following(id)){await remove('follows',pairId(S.uid,id));bumpCount(id,'followers',-1);bumpCount(S.uid,'following',-1)}
  else{await put('follows',pairId(S.uid,id),{from:S.uid,to:id,at:Date.now()});bumpCount(id,'followers',1);bumpCount(S.uid,'following',1)}
  render();
});

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
  toast(isNew?'Welcome to Cast!':'Profile saved');
  return null;
}

/* ---------- media pick ---------- */
function pickFile(file,kind){
  if(!file)return;
  const C=S.compose;
  if(kind==='video'){
    if(/quicktime/.test(file.type)||/\.mov$/i.test(file.name)){toast('.mov isn’t supported — export as MP4');return}
    if(!/^video\/(mp4|webm)$/.test(file.type)&&!/\.(mp4|webm)$/i.test(file.name)){toast('Pick an MP4 or WebM video');return}
    const lim=canCompress()?RAW_VIDEO_MAX:(S.fb?.st?VIDEO_MAX:DB_VIDEO_MAX);
    if(file.size>lim){toast(`Videos must be under ${Math.round(lim/1048576)} MB`);return}
    if(C.media?.url?.startsWith('blob:'))URL.revokeObjectURL(C.media.url);
    C.media={kind:'video',blob:file,url:URL.createObjectURL(file),thumb:'',filter:'none'};C.poll=null;render();
    makeThumb(C.media.url).then(t=>{if(C.media?.blob===file)C.media.thumb=t});return;
  }
  if(!file.type.startsWith('image/')){toast('Pick an image');return}
  editPhoto(file,'none');
}
async function editPhoto(src,filter){
  try{
    const c=await openEditor(src,{filter,maxSize:S.fb?.st?1600:900});
    if(c)canvasToMedia(c);
  }catch(e){toast(e.message||'Couldn\u2019t open that photo')}
}
function canvasToMedia(c){
  const C=S.compose;
  const finish=(blob,dataUrl)=>{if(C.media?.url?.startsWith('blob:'))URL.revokeObjectURL(C.media.url);C.media={kind:'image',blob,dataUrl,url:blob?URL.createObjectURL(blob):dataUrl};C.poll=null;render()};
  if(S.fb?.st)c.toBlob(b=>finish(b,null),'image/jpeg',.88);
  else{let q=.82,url=c.toDataURL('image/jpeg',q);while(url.length>300000&&q>.3){q-=.08;url=c.toDataURL('image/jpeg',q)}finish(null,url)}
}
// target: 'post' | 'story' | null (ask)
async function useCamera(target='post'){
  if(!S.uid)return signIn();
  let r;
  try{r=await openCamera({title:target==='story'?'Add to story':'Camera'})}catch(e){return toast(e.message)}
  if(!r)return;
  if(!target)target=await chooseTarget();
  if(!target)return;
  // photo (from camera or gallery)
  const isImg=r.dataUrl||(r.file&&r.file.type.startsWith('image/'));
  if(isImg){
    let c;try{c=await openEditor(r.dataUrl||r.file,{filter:r.filter||'none',maxSize:S.fb?.st?1600:900})}catch(e){return toast(e.message)}
    if(!c)return;
    if(target==='story')return postStory({canvas:c});
    if(S.view!=='home')go('home');
    return canvasToMedia(c);
  }
  // video (recorded or picked)
  const blob=r.videoBlob||r.file;
  if(!blob||!/^video\//.test(blob.type||'video/mp4')){toast('Pick a photo or an MP4/WebM video');return}
  if(target==='story')return postStory({video:blob,filter:r.filter});
  if(S.view!=='home')go('home');
  const C=S.compose;if(C.media?.url?.startsWith('blob:'))URL.revokeObjectURL(C.media.url);
  C.media={kind:'video',blob,url:URL.createObjectURL(blob),thumb:'',filter:r.filter||'none'};C.poll=null;render();
  makeThumb(C.media.url).then(t=>{if(C.media?.blob===blob)C.media.thumb=t});
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
async function uploadChunks(file,thumb,onProg){
  const buf=new Uint8Array(await file.arrayBuffer());
  const n=Math.ceil(buf.length/CHUNK), vid=newId(), type=file.type==='video/webm'?'video/webm':'video/mp4';
  for(let i=0;i<n;i++){
    const part=buf.subarray(i*CHUNK,(i+1)*CHUNK);let bin='';
    for(let j=0;j<part.length;j+=0x8000)bin+=String.fromCharCode.apply(null,part.subarray(j,j+0x8000));
    await put('videoChunks',vid+'_'+i,{owner:S.uid,vid,i,data:btoa(bin)});
    const pct=Math.round((i+1)*100/n);
    if(onProg)onProg(pct);else{S.compose.progress=pct;const b=$('[data-act="post"]');if(b)b.textContent=`Uploading ${pct}%`}
  }
  return{kind:'video',vid,chunks:n,type,size:buf.length,thumb:/^data:image\/jpeg;base64,/.test(thumb||'')&&thumb.length<120000?thumb:''};
}
const isDbVideo=m=>m?.kind==='video'&&typeof m.vid==='string'&&Number.isInteger(m.chunks)&&m.chunks>0&&m.chunks<=20;
const isVideo=p=>p.media?.kind==='video'&&(okURL(p.media.url)||isDbVideo(p.media));
const videoSrc=p=>okURL(p.media?.url)?p.media.url:VCACHE.get(p.media?.vid)||'';
async function chunkURL(m){
  if(VCACHE.has(m.vid))return VCACHE.get(m.vid);
  const parts=await Promise.all(Array.from({length:m.chunks},(_,i)=>S.fb.fs.getDoc(dref('videoChunks',m.vid+'_'+i))));
  const bytes=parts.map(d=>{if(!d.exists())throw new Error('missing');const b=atob(d.data().data);const u=new Uint8Array(b.length);for(let i=0;i<b.length;i++)u[i]=b.charCodeAt(i);return u});
  const url=URL.createObjectURL(new Blob(bytes,{type:m.type==='video/webm'?'video/webm':'video/mp4'}));
  VCACHE.set(m.vid,url);return url;
}
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
  const fs=validFilter(p.media.filter)?filterStyle(p.media.filter):'';
  if(src)return`<video class="${cls}" data-vid="${esc(p.media.vid||'')}" src="${esc(src)}" controls playsinline preload="metadata" ${p.media.thumb?`poster="${esc(p.media.thumb)}"`:''} style="${fs}"></video>`;
  const loading=VLOADING.has(p.media.vid);
  return`<button class="vposter ${cls}" data-act="playvid" data-id="${esc(p.id)}" style="${p.media.thumb?`background-image:url('${esc(p.media.thumb)}');`:''}${fs}">
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
    <div class="meta"><span class="who" data-profile="${esc(p.author)}">${esc(nameOf(p.author))}${badge(p.author)}</span>${h?`<span class="h">@${esc(h)}</span>`:''}<span class="when">· ${ago(p.createdAt)}</span></div>
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
      ${cmts.map(c=>`<div class="cmt">${av(c.author,'sm')}<div class="bub"><span class="who" data-profile="${esc(c.author)}">${esc(nameOf(c.author))}${badge(c.author)}</span> <span class="muted" style="font-size:12px">${ago(c.createdAt)}</span>
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
    ${C.media?`<div class="preview"><button class="x" data-act="rmmedia" aria-label="Remove">✕</button>${C.media.kind==='video'?`<video src="${esc(C.media.url)}" controls playsinline style="${filterStyle(C.media.filter)}"></video>`:`<img src="${esc(C.media.url)}" alt="">`}</div>
      ${C.media.kind==='video'?`<div class="vfilters">${FILTERS.map(f=>`<button class="chipbtn ${C.media.filter===f.id?'on':''}" data-vfilter="${f.id}">${f.name}</button>`).join('')}</div>`
        :`<button class="iconbtn" data-act="reedit" style="margin-top:6px">\u2728 Filters & stickers</button>`}`:''}
    ${C.poll?`<div class="pollin">${C.poll.map((o,i)=>`<input data-key="poll:${i}" data-poll="${i}" maxlength="40" placeholder="Option ${i+1}" value="${esc(o)}">`).join('')}
      <div style="display:flex;gap:8px">${C.poll.length<4?`<button class="iconbtn" data-act="addopt">${ICON.plus}Add option</button>`:''}<button class="iconbtn" data-act="rmpoll">Remove poll</button></div></div>`:''}
    <div class="row"><div class="tools">
      <button class="iconbtn" data-act="camera" title="Camera">${ICON.camera}<span>Camera</span></button>
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
  return`${storiesBar()}<div class="top"><h1>Home</h1>${S.uid?`<div class="tabs"><button data-tab="all" class="${S.tab==='all'?'on':''}">For you</button><button data-tab="following" class="${S.tab==='following'?'on':''}">Following</button></div>`:''}</div>
  ${composerHTML()}
  ${feedList(feedItems(set),S.tab==='following'?'Nothing here yet':'Be the first to post',S.tab==='following'?'Follow people to fill this feed.':'Say hi — post some text, a photo, a video or a poll.')}`;
}
function clipsView(){
  const vids=S.posts.filter(isVideo).sort((a,b)=>b.createdAt-a.createdAt);
  return`<div class="top"><h1>Clips</h1><span class="muted">${vids.length} video${vids.length===1?'':'s'}</span></div>
  ${vids.length?`<div class="clips">${vids.map(p=>`<div class="clip" data-act="watch" data-id="${esc(p.id)}">
    ${p.media.thumb?`<img src="${esc(p.media.thumb)}" alt="" style="width:100%;height:100%;object-fit:cover;display:block;${validFilter(p.media.filter)?filterStyle(p.media.filter):''}">`:videoSrc(p)?`<video src="${esc(videoSrc(p))}#t=0.5" muted playsinline preload="metadata"></video>`:'<div style="width:100%;height:100%;background:linear-gradient(135deg,#2a2420,#000)"></div>'}
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
      <div class="ic" style="background:${c}">${ICON[ic]}</div><div class="txt"><div><b>${esc(nameOf(n.who))}</b>${badge(n.who)} ${verb} <span class="muted">· ${ago(n.at)}</span></div>
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
    ${me?(canWrite()&&!S.editing?`<div style="display:flex;gap:8px"><button class="btn ghost small" data-act="edit">Edit profile</button><button class="btn ghost small" data-act="signout">Sign out</button></div>`:''):(canWrite()?`<div style="display:flex;gap:8px"><button class="btn ghost small" data-act="dm" data-id="${esc(id)}">${ICON.msg} Message</button><button class="btn small ${following(id)?'ghost':''}" data-act="follow" data-id="${esc(id)}">${following(id)?'Following':'Follow'}</button></div>`:'')}
  </div>
  <h2>${esc(nameOf(id))}${badge(id)}</h2>${verified(id)?'<div class="vnote">Verified \u00b7 1,000+ followers</div>':''}${pr.handle?`<div class="handle">@${esc(pr.handle)}</div>`:''}
  ${pr.bio?`<p class="bio">${fmt(pr.bio)}</p>`:(me?`<p class="bio muted">Add a bio so people know who you are.</p>`:'')}
  ${pr.website&&/^https?:\/\//.test(pr.website)?`<p style="margin:0 0 10px"><a href="${esc(pr.website)}" target="_blank" rel="noopener nofollow">${esc(pr.website.replace(/^https?:\/\//,''))}</a></p>`:''}
  <div class="stats"><span><b>${list.length}</b> posts</span><span><b>${followersOf(id).toLocaleString()}</b> followers</span><span><b>${followingOf(id).toLocaleString()}</b> following</span><span><b>${likesGot}</b> likes</span>${pr.createdAt?`<span>Joined ${new Date(pr.createdAt).toLocaleDateString(undefined,{month:'short',year:'numeric'})}</span>`:''}</div>
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
  return`<div class="person">${av(id,'sm')}<div class="n" data-profile="${esc(id)}">${esc(nameOf(id))}${badge(id)}<small>${h?'@'+esc(h)+' · ':''}${followersOf(id)} followers</small></div>
    ${canWrite()&&id!==S.uid?`<button class="btn small ${following(id)?'ghost':''}" data-act="follow" data-id="${esc(id)}">${following(id)?'Following':'Follow'}</button>`:''}</div>`;
}
function peopleHTML(){
  const ids=Object.keys(S.profiles).filter(id=>id&&id!==S.uid&&!following(id));ids.slice(0,30).forEach(id=>NEED.add(id));
  ids.sort((a,b)=>followersOf(b)-followersOf(a));
  if(!ids.length)return`<p class="muted" style="margin:0">Share Cast with friends — they’ll show up here.</p>`;
  return ids.slice(0,5).map(personRow).join('');
}
function overlayHTML(){
  if(S.viewer){const p=postById(S.viewer);if(!p||!isVideo(p)){S.viewer=null;return''}
    const src=videoSrc(p);
    return`<div class="viewer" data-act="closeviewer"><button class="x" data-act="closeviewer" aria-label="Close">✕</button>
      ${src?`<video src="${esc(src)}" controls autoplay playsinline onclick="event.stopPropagation()" style="${validFilter(p.media.filter)?filterStyle(p.media.filter):''}"></video>`:`<div style="color:#fff;font-size:18px">Loading video…</div>`}
      <div class="info"><b>${esc(nameOf(p.author))}</b> ${esc(p.text||'')}<br><button class="btn small" style="margin-top:10px" data-act="gopost" data-id="${esc(p.id)}">Open post · ${likesFor(p.id).length} likes · ${commentsFor(p.id).length} replies</button></div></div>`}
  if(S.groupForm)return groupFormHTML();
  if(S.onboard){const E=S.onboard;
    return`<div class="modal"><div class="card"><div class="brand" style="padding:0 0 6px;font-size:22px"><span class="dot"></span>Cast</div>
      <h2>Create your account</h2><p class="muted" style="margin:4px 0 16px">You’re signed in with Google. Pick a username so people can find and @mention you.</p>
      <div class="edit" style="margin:0">${accountFields(E)}
      ${E.err?`<div class="field"><span class="err">${esc(E.err)}</span></div>`:''}
      <button class="btn" data-act="createaccount" ${E.busy?'disabled':''}>${E.busy?'Creating…':'Create account'}</button>
      <button class="muted" data-act="signout" style="font-size:13px">Use a different Google account</button></div></div></div>`}
  return'';
}
function setupHTML(){
  return`<div class="card setup"><div class="brand" style="padding:0 0 10px"><span class="dot"></span>Cast</div>
  <h2 style="font-size:24px;margin-bottom:8px">Almost there — connect Firebase</h2>
  <p>Cast needs a free Firebase project to save posts and sign people in with Google.</p>
  <p>Open <code>SETUP-GUIDE.md</code> and follow the steps, then paste your settings into <code>firebase-config.js</code> and reload this page.</p></div>`;
}

/* ---------- render ---------- */
// videos never start on their own: only one plays at a time, and it pauses when scrolled off screen
const VIO=new IntersectionObserver(es=>es.forEach(e=>{if(!e.isIntersecting&&!e.target.paused)e.target.pause()}),{threshold:.2});
document.addEventListener('play',e=>{if(e.target.tagName!=='VIDEO')return;document.querySelectorAll('video').forEach(v=>{if(v!==e.target&&!v.paused)v.pause()})},true);
function focusKey(k,caret){const el=document.querySelector(`[data-key="${CSS.escape(k)}"]`);if(el){el.focus();if(caret!=null&&el.setSelectionRange)try{el.setSelectionRange(caret,caret)}catch{}}}
function suggestHandle(){return(S.googleName||'').toLowerCase().replace(/[^a-z0-9_]/g,'').slice(0,16)}
function render(){
  if(!CONFIGURED){$('#main').innerHTML=setupHTML();$('#nav').innerHTML='';$('#side').innerHTML='';return}
  const a=document.activeElement,key=a?.dataset?.key,caret=a?.selectionStart;
  const playing=[...document.querySelectorAll('main video')].filter(v=>!v.paused).map(v=>v.src);
  if(S.uid&&S.profilesReady&&!handleOf(S.uid)&&!S.onboard)S.onboard={handle:suggestHandle(),displayName:S.googleName||'',bio:'',website:'',color:colorOf(S.uid),usePhoto:!!S.photoURL};
  if(S.onboard&&(!S.uid||handleOf(S.uid)))S.onboard=null;
  const n=unread();
  const items=[['home','Home'],['clips','Clips'],['explore','Explore'],['messages','Chats'],['notifications','Alerts'],['bookmarks','Saved'],['profile','Profile']];
  const icon={home:'home',clips:'clips',explore:'explore',messages:'msg',notifications:'bell',bookmarks:'bookmark',profile:'user'};
  const um=unreadChats();
  const isOn=v=>S.view===v&&(v!=='profile'||!S.profileId||S.profileId===S.uid);
  const h=handleOf(S.uid);
  $('#nav').innerHTML=`<div class="brand"><span class="dot"></span>Cast</div>
    ${items.map(([v,l])=>`<button class="navbtn ${isOn(v)?'on':''}" data-view="${v}">${ICON[icon[v]]}${v==='notifications'?'Notifications':v==='bookmarks'?'Bookmarks':v==='messages'?'Messages':l}${v==='notifications'&&n?`<span class="badge">${n>99?'99+':n}</span>`:''}${v==='messages'&&um?`<span class="badge">${um}</span>`:''}</button>`).join('')}
    ${S.uid?`<button class="btn navpost" data-act="fab">${ICON.camera} Snap</button>`:''}
    ${S.uid?`<div class="mecard" data-profile="${esc(S.uid)}">${av(S.uid,'sm')}<div style="min-width:0;flex:1"><div class="n">${esc(nameOf(S.uid))}${badge(S.uid)}</div><div class="s">${h?'@'+esc(h):'Setting up…'}</div></div></div>`
      :S.authReady?`<div style="margin-top:16px">${signInBtn('Sign in')}</div>`:''}`;
  $('#mnav').innerHTML=items.filter(([v])=>v!=='bookmarks'&&v!=='explore').map(([v,l])=>`<button class="${isOn(v)?'on':''}" data-view="${v}">${ICON[icon[v]]}${l}${v==='notifications'&&n?`<span class="badge">${n>9?'9+':n}</span>`:''}${v==='messages'&&um?`<span class="badge">${um}</span>`:''}</button>`).join('');
  $('#fab').innerHTML=S.uid&&canWrite()?`<button class="fab" data-act="fab" aria-label="Open camera">${ICON.camera}</button>`:'';
  const V={explore:exploreView,profile:profileView,clips:clipsView,notifications:notifView,bookmarks:bookmarksView,messages:messagesView}[S.view]||homeView;
  $('#main').innerHTML=V();
  $('#side').innerHTML=`<div class="search">${ICON.search}<input data-key="sq" id="sq" placeholder="Search Cast"></div>
    <div class="card box"><h3>Trending</h3>${trendsHTML()}</div>
    <div class="card box"><h3>Who to follow</h3>${peopleHTML()}</div>
    <p class="muted" style="padding:0 6px;font-size:12px">Posts are public. Bookmarks are private to you.</p>`;
  const ov=overlayHTML();
  if(!(S.viewer&&$('#overlay video')))$('#overlay').innerHTML=ov;
  if(!ov)$('#overlay').innerHTML='';
  if(key)focusKey(key,caret);
  if(S.uid)NEED.add(S.uid);
  ensureCounts();
  document.querySelectorAll('main video').forEach(v=>VIO.observe(v));
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
  const gp=e.target.closest('[data-gpick]');if(gp&&S.groupForm){if(gp.tagName==='INPUT'){gp.checked?S.groupForm.picked.add(gp.dataset.gpick):S.groupForm.picked.delete(gp.dataset.gpick)}else S.groupForm.picked.delete(gp.dataset.gpick);S.groupForm.err='';return render()}
  if(e.target.closest('.gp'))return;
  const vf=e.target.closest('[data-vfilter]');if(vf&&S.compose.media){S.compose.media.filter=vf.dataset.vfilter;return render()}
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
    case'camera':return useCamera('post');
    case'fab':return useCamera(null);
    case'addstory':return useCamera('story');
    case'story':return openStories(id);
    case'dm':return openChat(id);
    case'chat':return openConvo(id);
    case'closechat':S.chat=null;stopChat();return render();
    case'newgroup':return openGroupForm(null);
    case'editgroup':return openGroupForm(id);
    case'closegroup':S.groupForm=null;return render();
    case'savegroup':return saveGroup();
    case'groupinfo':S.groupInfo=!S.groupInfo;return render();
    case'leavegroup':return leaveGroup(id);
    case'sendmsg':return sendMsg();
    case'reedit':{const m=C.media;if(m?.kind==='image')editPhoto(m.dataUrl||m.url,'none');return}
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
  if(k==='chat'){S.chatDraft=t.value;return}
  if(t.dataset.g&&S.groupForm){S.groupForm[t.dataset.g]=t.value;if(t.dataset.g==='q')render();return}
});
document.addEventListener('keydown',e=>{
  if(e.target.dataset?.key==='compose'&&e.key==='Enter'&&(e.metaKey||e.ctrlKey)){e.preventDefault();createPost()}
  if(e.target.id==='sq'&&e.key==='Enter')go('explore',{query:e.target.value,tag:null});
  if(e.target.dataset?.key==='chat'&&e.key==='Enter'&&!e.shiftKey){e.preventDefault();sendMsg()}
  if(e.key==='Escape'&&S.viewer){S.viewer=null;$('#overlay').innerHTML='';render()}
});
document.addEventListener('change',e=>{const k=e.target.dataset.file;if(k){pickFile(e.target.files[0],k);e.target.value=''}});
document.addEventListener('submit',e=>{e.preventDefault();if(e.target.dataset.form==='c')addComment(e.target.dataset.id)});
const VIEWS=['clips','explore','notifications','bookmarks','profile','messages'];
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

/* ---------- stories (24 hours) ---------- */
const DAY=24*60*60*1000;
const liveStories=()=>S.stories.filter(s=>Date.now()-s.createdAt<DAY);
const storiesBy=id=>liveStories().filter(s=>s.author===id).sort((a,b)=>a.createdAt-b.createdAt);
let SEEN_ST=new Set();try{SEEN_ST=new Set(JSON.parse(localStorage.getItem('pulse_seen_stories')||'[]'))}catch{}
function markSeen(id){SEEN_ST.add(id);try{localStorage.setItem('pulse_seen_stories',JSON.stringify([...SEEN_ST].slice(-800)))}catch{}}
function storyAuthors(){
  const by=new Map();for(const s of liveStories()){const a=by.get(s.author)||{id:s.author,last:0,unseen:false};a.last=Math.max(a.last,s.createdAt);if(!SEEN_ST.has(s.id))a.unseen=true;by.set(s.author,a)}
  const list=[...by.values()].filter(a=>a.id!==S.uid);
  list.sort((a,b)=>(b.unseen-a.unseen)||((following(b.id)?1:0)-(following(a.id)?1:0))||(b.last-a.last));
  return list;
}
function storiesBar(){
  const others=storyAuthors(), mine=storiesBy(S.uid).length;
  if(!S.uid&&!others.length)return'';
  return`<div class="stories">
    ${S.uid&&canWrite()?`<div class="story-item"><button class="story-ring ${mine?'mine':'add'}" data-act="${mine?'story':'addstory'}" data-id="${esc(S.uid)}">${av(S.uid,'',false)}${mine?'':'<span class="story-plus">+</span>'}</button><span>${mine?'Your story':'Add story'}</span>${mine?`<button class="story-add2" data-act="addstory" aria-label="Add to story">+</button>`:''}</div>`:''}
    ${others.map(a=>`<div class="story-item"><button class="story-ring ${a.unseen?'':'seen'}" data-act="story" data-id="${esc(a.id)}">${av(a.id,'',false)}</button><span>${esc(nameOf(a.id).split(' ')[0])}</span></div>`).join('')}
    ${!others.length&&S.uid?`<div class="story-empty">No stories right now — be the first! Stories disappear after 24 hours.</div>`:''}
  </div>`;
}
async function postStory({canvas,video,filter}){
  if(!canWrite())return;
  toast('Posting your story…');
  const ok=await guard(async()=>{
    const data={author:S.uid,createdAt:Date.now()};
    if(canvas){
      if(S.fb.st){const blob=await new Promise(r=>canvas.toBlob(r,'image/jpeg',.88));const C0=S.compose.progress;data.media=await uploadMedia(blob,'image');S.compose.progress=C0}
      else{let q=.82,url=canvas.toDataURL('image/jpeg',q);while(url.length>300000&&q>.3){q-=.08;url=canvas.toDataURL('image/jpeg',q)}data.image=url}
    }else if(video){
      let blob=video;const url=URL.createObjectURL(blob);const thumb=await makeThumb(url);
      if(canCompress()&&blob.size>1.5*1024*1024){try{const out=await compressVideo(blob,{maxSeconds:30,onProgress:f=>toast(`Compressing ${Math.round(f*100)}%`)});if(out.size&&out.size<blob.size)blob=out}catch(e){if(/seconds/.test(e.message||''))throw new Error('Stories can be up to 30 seconds')}}
      const lim=S.fb.st?VIDEO_MAX:DB_VIDEO_MAX;if(blob.size>lim)throw new Error('That video is too long for a story');
      if(S.fb.st){data.media={...(await uploadMedia(blob,'video')),...(thumb&&thumb.length<120000?{thumb}:{})}}
      else data.media=await uploadChunks(blob,thumb,pct=>toast(`Uploading story ${pct}%`));
      if(validFilter(filter))data.media.filter=filter;
      URL.revokeObjectURL(url);
    }
    await put('stories',newId(),data);
  });
  if(ok)toast('Added to your story');
}
async function deleteStory(st){
  await guard(async()=>{
    if(isDbVideo(st.media))for(let i=0;i<st.media.chunks;i++){try{await remove('videoChunks',st.media.vid+'_'+i)}catch{}}
    if(st.media?.path&&S.fb.st){try{await S.fb.st.deleteObject(S.fb.st.ref(S.fb.storage,st.media.path))}catch{}}
    await remove('stories',st.id);
  });
}
let cleaned=false;
async function cleanupStories(){ // remove my own expired stories (and their video pieces)
  if(cleaned||!S.uid||!S.fb)return;cleaned=true;
  try{const {fs}=S.fb;const old=await fs.getDocs(fs.query(col('stories'),fs.where('author','==',S.uid),fs.limit(100)));
    for(const d of old.docs){const v=d.data();if(Date.now()-v.createdAt>DAY)await deleteStory({id:d.id,...v})}}catch(e){console.warn(e)}
}
function openStories(startId){
  const order=[...(storiesBy(S.uid).length?[S.uid]:[]),...storyAuthors().map(a=>a.id)];
  let a=Math.max(0,order.indexOf(startId)),i=0,timer=null,paused=false;
  if(startId!==S.uid){const L=storiesBy(order[a]);const firstUnseen=L.findIndex(s=>!SEEN_ST.has(s.id));i=Math.max(0,firstUnseen)}
  const R=document.getElementById('storyv');R.className='open';document.body.style.overflow='hidden';
  const close=()=>{clearTimeout(timer);R.className='';R.innerHTML='';document.body.style.overflow='';R.onclick=null;document.removeEventListener('keydown',key);render()};
  const key=e=>{if(e.key==='Escape')close();if(e.key==='ArrowRight')next();if(e.key==='ArrowLeft')prev()};
  document.addEventListener('keydown',key);
  const next=()=>{const L=storiesBy(order[a]);i++;if(i>=L.length){a++;i=0;if(a>=order.length)return close()}show()};
  const prev=()=>{i--;if(i<0){a--;if(a<0){a=0;i=0}else i=Math.max(0,storiesBy(order[a]).length-1)}show()};
  const show=async()=>{
    clearTimeout(timer);
    const L=storiesBy(order[a]);if(!L.length)return next();
    const st=L[i];if(!st)return close();markSeen(st.id);
    const fs=validFilter(st.media?.filter)?filterStyle(st.media.filter):'';
    const isV=st.media?.kind==='video';
    let src=isV?(okURL(st.media.url)?st.media.url:VCACHE.get(st.media.vid)||''):(okURL(st.media?.url)?st.media.url:(/^data:image\/jpeg;base64,/.test(st.image||'')?st.image:''));
    const mine=st.author===S.uid||S.isAdmin;
    R.innerHTML=`<div class="sv">
      <div class="sv-bars">${L.map((x,j)=>`<i class="${j<i?'done':''}"><b ${j===i?'class="go"':''}></b></i>`).join('')}</div>
      <div class="sv-head">${av(st.author,'sm')}<span class="sv-name">${esc(nameOf(st.author))}${badge(st.author)}</span><span class="sv-time">${ago(st.createdAt)}</span>
        ${mine?`<button class="sv-btn" data-sv="del" aria-label="Delete story">${ICON.trash}</button>`:''}<button class="sv-btn" data-sv="close" aria-label="Close">✕</button></div>
      <div class="sv-media">${isV?(src?`<video src="${esc(src)}" playsinline autoplay style="${fs}"></video>`:`<div class="sv-load">Loading…</div>`):(src?`<img src="${esc(src)}" alt="">`:`<div class="sv-load">Story unavailable</div>`)}</div>
      <div class="sv-tap left" data-sv="prev"></div><div class="sv-tap right" data-sv="next"></div>
    </div>`;
    const bar=R.querySelector('.go');
    const run=ms=>{if(bar){bar.style.transitionDuration=ms+'ms';requestAnimationFrame(()=>bar.classList.add('run'))}timer=setTimeout(next,ms)};
    if(isV){
      if(!src){try{await chunkURL(st.media)}catch{toast('Couldn’t load that story');return next()}if(R.className==='open')show();return}
      const v=R.querySelector('video');v.onloadedmetadata=()=>run(Math.min(30000,(isFinite(v.duration)?v.duration:10)*1000));v.onerror=()=>run(3000);
    }else run(5000);
  };
  R.onclick=async e=>{const t=e.target.closest('[data-sv],[data-profile]');if(!t)return;
    if(t.dataset.profile){close();return go('profile',{profileId:t.dataset.profile})}
    const k=t.dataset.sv;if(k==='close')return close();if(k==='next')return next();if(k==='prev')return prev();
    if(k==='del'){const L=storiesBy(order[a]);const st=L[i];clearTimeout(timer);await deleteStory(st);toast('Story deleted');setTimeout(()=>{if(!storiesBy(order[a]).length){a++;i=0;if(a>=order.length)return close()}else i=Math.min(i,storiesBy(order[a]).length-1);show()},300)}};
  show();
}

/* ---------- private messages & group chats ---------- */
const convoId=(a,b)=>[a,b].sort().join('__');
const otherOf=c=>(c.members||[]).find(m=>m!==S.uid);
const convoById=cid=>S.convos.find(c=>c.id===cid);
const isUnread=c=>c.last&&c.last.from!==S.uid&&(c.updatedAt||0)>((c.read||{})[S.uid]||0);
const unreadChats=()=>S.convos.filter(isUnread).length;
const convoName=c=>c.group?(c.name||'Group'):nameOf(otherOf(c));
function convoAvatar(c){
  if(!c.group)return av(otherOf(c),'sm',false);
  const m=(c.members||[]).filter(x=>x!==S.uid).slice(0,2);
  return`<div class="gav">${m.map(x=>av(x,'sm',false)).join('')}${m.length<2?`<div class="av sm" style="background:#334">${esc(initials(c.name||'G'))}</div>`:''}</div>`;
}
let unsubMsgs=null,readT=null;
function stopChat(){unsubMsgs?.();unsubMsgs=null;S.msgs=[]}
// open a 1-on-1 chat with a person
function openChat(other){
  if(!S.uid)return signIn();
  if(!other||other===S.uid)return;
  openConvo(convoId(S.uid,other),other);
}
function openConvo(cid,other){
  stopChat();S.chat={cid,other:other||null};S.chatDraft='';S.groupInfo=false;
  if(convoById(cid))listenChat(cid);
  go('messages');setTimeout(()=>focusKey('chat'),50);
}
function listenChat(cid){
  if(unsubMsgs)return;const {fs}=S.fb;
  unsubMsgs=fs.onSnapshot(fs.query(fs.collection(S.fb.db,'convos',cid,'messages'),fs.orderBy('createdAt','desc'),fs.limit(200)),s=>{
    S.msgs=s.docs.map(d=>({id:d.id,...d.data()})).reverse();markRead(cid);soon();
    setTimeout(()=>{const b=$('.chat-body');if(b)b.scrollTop=b.scrollHeight},40);
  },e=>console.warn(e));
}
function markRead(cid){
  const c=convoById(cid);if(!c||!isUnread(c))return;
  clearTimeout(readT);readT=setTimeout(()=>S.fb.fs.setDoc(dref('convos',cid),{read:{[S.uid]:Date.now()}},{merge:true}).catch(e=>console.warn(e)),300);
}
async function sendMsg(){
  const text=(S.chatDraft||'').trim();if(!text||!S.chat)return;
  const {cid,other}=S.chat,{fs,db}=S.fb,now=Date.now(),c=convoById(cid);
  S.chatDraft='';const inp=$('[data-key="chat"]');if(inp)inp.value='';
  const ok=await guard(async()=>{
    const head={updatedAt:now,last:{from:S.uid,text:text.slice(0,120)},read:{[S.uid]:now}};
    if(!c&&other)head.members=[S.uid,other].sort();
    await fs.setDoc(dref('convos',cid),head,{merge:true});
    await fs.setDoc(fs.doc(fs.collection(db,'convos',cid,'messages')),{from:S.uid,text:text.slice(0,1000),createdAt:now});
    listenChat(cid);
  });
  if(!ok){S.chatDraft=text;render()}
  focusKey('chat');
}
// ---- groups ----
function openGroupForm(cid){
  const c=cid?convoById(cid):null;
  S.groupForm={cid:cid||null,name:c?.name||'',picked:new Set(c?(c.members||[]).filter(m=>m!==S.uid):[]),q:'',err:''};render();
  setTimeout(()=>focusKey(cid?'gq':'gname'),50);
}
function groupCandidates(q){
  const mine=new Set(S.follows.filter(f=>f.from===S.uid).map(f=>f.to));
  let ids=Object.values(S.profiles).filter(p=>p.user&&p.user!==S.uid&&p.handle).map(p=>p.user);
  q=(q||'').toLowerCase().replace(/^@/,'');
  if(q)ids=ids.filter(id=>nameOf(id).toLowerCase().includes(q)||handleOf(id).includes(q));
  ids.sort((a,b)=>(mine.has(b)-mine.has(a))||nameOf(a).localeCompare(nameOf(b)));
  return ids.slice(0,40);
}
async function saveGroup(){
  const G=S.groupForm;const name=G.name.trim().slice(0,40);
  if(!G.cid&&!name){G.err='Give your group a name';return render()}
  if(G.picked.size<1){G.err='Pick at least one person';return render()}
  if(G.picked.size>31){G.err='Groups can have up to 32 people';return render()}
  const {fs}=S.fb,now=Date.now();let cid=G.cid;
  const ok=await guard(async()=>{
    const members=[S.uid,...G.picked];
    if(cid){const c=convoById(cid);await fs.setDoc(dref('convos',cid),{members,...(c.owner===S.uid&&name?{name}:{}),updatedAt:now,last:{from:S.uid,text:'updated the group'},read:{[S.uid]:now}},{merge:true})}
    else{cid=newId();await fs.setDoc(dref('convos',cid),{group:true,name,owner:S.uid,members,updatedAt:now,last:{from:S.uid,text:'created the group'},read:{[S.uid]:now}})}
  });
  if(!ok)return;
  S.groupForm=null;toast(G.cid?'Group updated':'Group created');
  stopChat();S.chat={cid,other:null};setTimeout(()=>{listenChat(cid);render()},100);go('messages');
}
async function leaveGroup(cid){
  const c=convoById(cid);if(!c)return;
  const ok=await guard(()=>S.fb.fs.setDoc(dref('convos',cid),{members:(c.members||[]).filter(m=>m!==S.uid)},{merge:true}));
  if(ok){stopChat();S.chat=null;toast('You left the group');render()}
}
function groupFormHTML(){
  const G=S.groupForm;if(!G)return'';
  const editing=!!G.cid,c=editing?convoById(G.cid):null,canName=!editing||c?.owner===S.uid;
  const list=groupCandidates(G.q);
  return`<div class="modal"><div class="card gform">
    <div style="display:flex;justify-content:space-between;align-items:center"><h2>${editing?'Group members':'New group'}</h2><button class="iconbtn" data-act="closegroup" aria-label="Close">✕</button></div>
    ${canName?`<label class="field">Group name<input data-key="gname" data-g="name" maxlength="40" placeholder="e.g. Weekend crew" value="${esc(G.name)}"></label>`:''}
    <div class="field">Add people <span class="hint">${G.picked.size} picked</span>
      <div class="gpicked">${[...G.picked].map(id=>`<button class="chipbtn on" data-gpick="${esc(id)}">${esc(nameOf(id))} ✕</button>`).join('')}</div>
      <input data-key="gq" data-g="q" placeholder="Search people" value="${esc(G.q)}"></div>
    <div class="glist">${list.length?list.map(id=>`<label class="person gp"><input type="checkbox" data-gpick="${esc(id)}" ${G.picked.has(id)?'checked':''}>${av(id,'sm')}<div class="n">${esc(nameOf(id))}${badge(id)}<small>@${esc(handleOf(id))}${following(id)?' · you follow':''}</small></div></label>`).join('')
      :`<p class="muted">No people found. Friends need a Cast account first.</p>`}</div>
    ${G.err?`<div class="field"><span class="err">${esc(G.err)}</span></div>`:''}
    <button class="btn" data-act="savegroup">${editing?'Save':'Create group'}</button>
  </div></div>`;
}
function messagesView(){
  if(!S.uid)return`<div class="top"><h1>Messages</h1></div><div class="card hero"><h2>Private messages</h2><p>Sign in to chat one-on-one or in groups.</p>${signInBtn()}</div>`;
  if(S.chat){
    const {cid,other}=S.chat,c=convoById(cid),grp=c?.group;
    const o=grp?null:(other||otherOf(c||{}));
    if(!grp&&!o){S.chat=null;return messagesView()}
    const mem=grp?(c.members||[]):[];
    return`<div class="card chat">
      <div class="chat-head"><button class="iconbtn" data-act="closechat" aria-label="Back">←</button>
        ${grp?`${convoAvatar(c)}<div class="chat-who" data-act="groupinfo"><b>${esc(c.name||'Group')}</b><small>${mem.length} members · tap for info</small></div>`
        :`${av(o,'sm')}<div class="chat-who" data-profile="${esc(o)}"><b>${esc(nameOf(o))}${badge(o)}</b>${handleOf(o)?`<small>@${esc(handleOf(o))}</small>`:''}</div>`}</div>
      ${grp&&S.groupInfo?`<div class="ginfo"><div class="gmem">${mem.map(m=>`<span class="chipbtn" data-profile="${esc(m)}">${esc(m===S.uid?'You':nameOf(m))}${m===c.owner?' (owner)':''}</span>`).join('')}</div>
        <div style="display:flex;gap:8px;margin-top:10px">${c.owner===S.uid?`<button class="btn small" data-act="editgroup" data-id="${esc(cid)}">Add / remove people</button>`:''}<button class="btn ghost small" data-act="leavegroup" data-id="${esc(cid)}">Leave group</button></div></div>`:''}
      <div class="chat-body">${S.msgs.length?S.msgs.map((m,k)=>{const mine=m.from===S.uid,prevSame=k>0&&S.msgs[k-1].from===m.from&&m.createdAt-S.msgs[k-1].createdAt<300000;
        return`${!prevSame?`<div class="chat-time">${ago(m.createdAt)}</div>`:''}${grp&&!mine&&!prevSame?`<div class="bname" data-profile="${esc(m.from)}">${esc(nameOf(m.from))}</div>`:''}<div class="bubble ${mine?'me':''}">${fmt(m.text)}</div>`}).join('')
        :`<div class="empty" style="padding:40px 10px"><div class="big">Say hi 👋</div>${grp?'Only people in this group can see these messages.':'Messages are private — only you two can see them.'}</div>`}</div>
      ${canWrite()?`<div class="chat-input"><input data-key="chat" maxlength="1000" placeholder="${grp?`Message ${esc(c.name||'the group')}`:`Message ${esc(nameOf(o).split(' ')[0])}`}…" value="${esc(S.chatDraft)}" autocomplete="off"><button class="btn" data-act="sendmsg" aria-label="Send">${ICON.send}</button></div>`:''}
    </div>`;
  }
  return`<div class="top"><h1>Messages</h1>${canWrite()?`<button class="btn small" data-act="newgroup">${ICON.plus} New group</button>`:''}</div>
    <p class="muted" style="margin:-6px 0 12px">Private — only the people in a chat can read it.</p>
    ${S.convos.length?`<div class="card" style="overflow:hidden">${S.convos.map(c=>{if(!c.group&&!otherOf(c))return'';const un=isUnread(c);
      const who=c.last?.from===S.uid?'You: ':(c.group&&c.last?.from?nameOf(c.last.from).split(' ')[0]+': ':'');
      return`<div class="notif ${un?'new':''}" data-act="chat" data-id="${esc(c.id)}">${convoAvatar(c)}<div class="txt"><div><b>${esc(convoName(c))}</b>${c.group?' <span class="gtag">group</span>':badge(otherOf(c))} <span class="muted">· ${ago(c.updatedAt||0)}</span></div><div class="snip">${esc(who)}${esc(c.last?.text||'')}</div></div>${un?'<span class="badge" style="align-self:center">new</span>':''}</div>`}).join('')}</div>`
    :`<div class="empty"><div class="big">No messages yet</div>Open someone’s profile and tap <b>Message</b>, or start a <b>New group</b>.</div>`}`;
}

/* ---------- boot ---------- */
fromHash();
render();
if(CONFIGURED)(async()=>{
  try{S.fb=await loadFirebase()}catch(e){console.error(e);$('#main').innerHTML='<div class="empty"><div class="big">Couldn’t load Cast</div>Check your internet connection and reload.</div>';return}
  const {fs,auth,authI}=S.fb;
  const listen=(q,apply)=>fs.onSnapshot(q,snap=>{apply(snap.docs.map(d=>({id:d.id,...d.data()})),snap);soon()},err=>{console.warn(err);S.loading=false;soon()});
  let loaded=0;const mark=()=>{if(++loaded>=2){S.loading=false;resolvePendingHash()}};
  listen(fs.query(col('posts'),fs.orderBy('createdAt','desc'),fs.limit(400)),(rows,s)=>{S.posts=rows.filter(r=>typeof r.createdAt==='number'&&typeof r.author==='string');if(!s.metadata.fromCache&&!S._p){S._p=1;mark()}});
  listen(fs.query(col('profiles'),fs.limit(1000)),(rows,s)=>{const m={};rows.forEach(r=>{m[r.user||r.id]=r});S.profiles=m;if(!s.metadata.fromCache){S.profilesReady=true;if(!S._pr){S._pr=1;mark()}}});
  listen(fs.query(col('likes'),fs.limit(2000)),rows=>S.likes=rows);
  listen(fs.query(col('comments'),fs.orderBy('createdAt','asc'),fs.limit(2000)),rows=>S.comments=rows.filter(r=>r.post&&r.author&&typeof r.text==='string'));
  listen(fs.query(col('reposts'),fs.limit(2000)),rows=>S.reposts=rows);
  listen(fs.query(col('votes'),fs.limit(2000)),rows=>S.votes=rows.filter(v=>Number.isInteger(v.choice)));
  listen(fs.query(col('stories'),fs.where('createdAt','>',Date.now()-DAY),fs.orderBy('createdAt','asc'),fs.limit(500)),rows=>{S.stories=rows.filter(r=>typeof r.author==='string'&&typeof r.createdAt==='number');cleanupStories()});
  setTimeout(()=>{if(S.loading){S.loading=false;render()}},10000);

  let unsubMe=null,unsubAdmin=null,unsubF1=null,unsubF2=null,unsubC=null,fA=[],fB=[];
  try{await auth.getRedirectResult(authI)}catch{}
  auth.onAuthStateChanged(authI,user=>{
    unsubMe?.();unsubAdmin?.();unsubF1?.();unsubF2?.();unsubC?.();fA=[];fB=[];S.follows=[];S.convos=[];S.chat=null;stopChat();
    S.uid=user?.uid||null;S.googleName=user?.displayName||'';S.photoURL=user?.photoURL||'';
    S.me={seenAt:0,bookmarks:[]};S.isAdmin=false;S.authReady=true;
    if(user){
      unsubMe=fs.onSnapshot(dref('private',user.uid),d=>{if(d.exists()){const v=d.data();S.me={seenAt:+v.seenAt||0,bookmarks:Array.isArray(v.bookmarks)?v.bookmarks:[]}}soon()},()=>{});
      unsubAdmin=fs.onSnapshot(dref('admins',user.uid),d=>{S.isAdmin=d.exists();soon()},()=>{});
      const mergeF=()=>{const m=new Map();[...fA,...fB].forEach(f=>m.set(f.id,f));S.follows=[...m.values()];soon()};
      unsubF1=fs.onSnapshot(fs.query(col('follows'),fs.where('from','==',user.uid),fs.limit(5000)),s=>{fA=s.docs.map(d=>({id:d.id,...d.data()}));mergeF()},e=>console.warn(e));
      unsubC=fs.onSnapshot(fs.query(col('convos'),fs.where('members','array-contains',user.uid),fs.limit(200)),s=>{S.convos=s.docs.map(d=>({id:d.id,...d.data()})).sort((a,b)=>(b.updatedAt||0)-(a.updatedAt||0));soon()},e=>console.warn(e));
      unsubF2=fs.onSnapshot(fs.query(col('follows'),fs.where('to','==',user.uid),fs.limit(300)),s=>{fB=s.docs.map(d=>({id:d.id,...d.data()}));mergeF()},e=>console.warn(e));
    }
    render();
  });
})();
