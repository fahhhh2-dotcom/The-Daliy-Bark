// Cast — a little social network (Firebase edition)
import { firebaseConfig, storageEnabled } from './firebase-config.js';
import { FILTERS, filterStyle, validFilter, openEditor, openCamera, chooseTarget, compressVideo, canCompress, probeVideo } from './editor.js';

const FB = 'https://www.gstatic.com/firebasejs/10.12.2/';
const CONFIGURED = firebaseConfig && firebaseConfig.apiKey && !firebaseConfig.apiKey.startsWith('PASTE');

/* ---------- settings (saved on this device) ---------- */
const SET={theme:'dark',accent:'blue',quality:'high',autoplayShorts:true,motion:true,popups:false,sounds:true};
try{Object.assign(SET,JSON.parse(localStorage.getItem('cast_settings')||'{}'))}catch{}
const ACCENTS={blue:['#1d6bff','#00a3ff'],purple:['#7c4dff','#b388ff'],pink:['#ff2d87','#ff7ab6'],green:['#10b981','#34d399'],orange:['#ff7a1a','#ffb020'],red:['#ef4444','#ff7a7a']};
function applySettings(){
  const d=document.documentElement;
  const theme=SET.theme==='auto'?(matchMedia('(prefers-color-scheme: light)').matches?'light':'dark'):SET.theme;
  d.dataset.theme=theme;d.dataset.motion=SET.motion?'on':'off';
  const [a,b]=ACCENTS[SET.accent]||ACCENTS.blue;d.style.setProperty('--accent',a);d.style.setProperty('--blue2',b);
  const m=document.querySelector('meta[name="theme-color"]');if(m)m.content=theme==='light'?'#f4f7ff':'#03050a';
}
function saveSettings(patch){Object.assign(SET,patch);try{localStorage.setItem('cast_settings',JSON.stringify(SET))}catch{};applySettings();render()}
applySettings();
matchMedia('(prefers-color-scheme: light)').addEventListener?.('change',()=>{if(SET.theme==='auto')applySettings()});

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
  shorts:SV('<rect x="6" y="2.5" width="12" height="19" rx="3"/><path d="m10.5 9 4 3-4 3z"/>'),
  film:SV('<rect x="2.5" y="5" width="19" height="14" rx="2.5"/><path d="m10 9 5 3-5 3z"/>'),
  gear:SV('<circle cx="12" cy="12" r="3"/><path d="M19.4 15a1.7 1.7 0 0 0 .3 1.8l.1.1a2 2 0 1 1-2.8 2.8l-.1-.1a1.7 1.7 0 0 0-1.8-.3 1.7 1.7 0 0 0-1 1.5V21a2 2 0 1 1-4 0v-.1a1.7 1.7 0 0 0-1.1-1.5 1.7 1.7 0 0 0-1.8.3l-.1.1a2 2 0 1 1-2.8-2.8l.1-.1a1.7 1.7 0 0 0 .3-1.8 1.7 1.7 0 0 0-1.5-1H3a2 2 0 1 1 0-4h.1a1.7 1.7 0 0 0 1.5-1.1 1.7 1.7 0 0 0-.3-1.8l-.1-.1a2 2 0 1 1 2.8-2.8l.1.1a1.7 1.7 0 0 0 1.8.3H9a1.7 1.7 0 0 0 1-1.5V3a2 2 0 1 1 4 0v.1a1.7 1.7 0 0 0 1 1.5 1.7 1.7 0 0 0 1.8-.3l.1-.1a2 2 0 1 1 2.8 2.8l-.1.1a1.7 1.7 0 0 0-.3 1.8V9a1.7 1.7 0 0 0 1.5 1H21a2 2 0 1 1 0 4h-.1a1.7 1.7 0 0 0-1.5 1z"/>'),
  friends:SV('<circle cx="9" cy="8" r="3.5"/><path d="M2.5 20c1-3.5 3.5-5.5 6.5-5.5s5.5 2 6.5 5.5"/><circle cx="17" cy="9" r="2.5"/><path d="M16 14.6c2.6-.3 4.6 1.4 5.5 4.4"/>'),
  send:SV('<path d="M4 12 20 4l-6 16-3-7z"/>'),
  camera:SV('<path d="M4 8h3l2-3h6l2 3h3a1 1 0 0 1 1 1v10a1 1 0 0 1-1 1H4a1 1 0 0 1-1-1V9a1 1 0 0 1 1-1z"/><circle cx="12" cy="13.5" r="3.5"/>')
};
const GOOGLE = '<svg viewBox="0 0 48 48"><path fill="#FFC107" d="M43.6 20.5H42V20H24v8h11.3C33.7 32.7 29.2 36 24 36c-6.6 0-12-5.4-12-12s5.4-12 12-12c3.1 0 5.8 1.2 8 3l5.7-5.7C34 6.1 29.3 4 24 4 12.9 4 4 12.9 4 24s8.9 20 20 20 20-8.9 20-20c0-1.3-.1-2.4-.4-3.5z"/><path fill="#FF3D00" d="m6.3 14.7 6.6 4.8C14.7 15.1 19 12 24 12c3.1 0 5.8 1.2 8 3l5.7-5.7C34 6.1 29.3 4 24 4 16.3 4 9.7 8.3 6.3 14.7z"/><path fill="#4CAF50" d="M24 44c5.2 0 9.9-2 13.4-5.2l-6.2-5.2C29.2 35.1 26.7 36 24 36c-5.2 0-9.6-3.3-11.3-8l-6.5 5C9.5 39.6 16.2 44 24 44z"/><path fill="#1976D2" d="M43.6 20.5H42V20H24v8h11.3c-.8 2.2-2.2 4.2-4.1 5.6l6.2 5.2C37 39.2 44 34 44 24c0-1.3-.1-2.4-.4-3.5z"/></svg>';
const COLORS=['#1d6bff','#00a3ff','#5b4dff','#14b8a6','#ff4d8d','#f59e0b','#7c8cff','#ef4444'];
const VERIFY_AT=1000, RAW_VIDEO_MAX=600*1024*1024, MAX_CHUNKS=40;
const BADGE='<svg class="vbadge" viewBox="0 0 24 24" aria-label="Verified"><path fill="currentColor" d="M12 1.5l2.6 1.9 3.2-.2 1 3.1 2.6 1.9-1 3.1 1 3.1-2.6 1.9-1 3.1-3.2-.2L12 22.5l-2.6-1.9-3.2.2-1-3.1-2.6-1.9 1-3.1-1-3.1 2.6-1.9 1-3.1 3.2.2z"/><path d="M7.5 12.3l3 3 6-6.2" fill="none" stroke="#fff" stroke-width="2.4" stroke-linecap="round" stroke-linejoin="round"/></svg>';
const MAX=280, VIDEO_MAX=100*1024*1024, DB_VIDEO_MAX=27*1024*1024, CHUNK=700*1024;
const VCACHE=new Map(), VLOADING=new Set();

const S={
  fb:null,uid:null,authReady:false,isAdmin:false,loading:true,profilesReady:false,
  posts:[],likes:[],comments:[],follows:[],counts:{},stories:[],convos:[],publicGroups:[],chat:null,msgs:[],chatDraft:'',reposts:[],votes:[],profiles:{},me:{seenAt:0,bookmarks:[]},
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
// friends = people who follow each other
const followsMe=id=>S.follows.some(f=>f.from===id&&f.to===S.uid);
const isFriend=id=>!!S.uid&&id!==S.uid&&following(id)&&followsMe(id);
const myFriends=()=>S.uid?[...new Set(S.follows.filter(f=>f.from===S.uid).map(f=>f.to))].filter(followsMe):[];
const friendRequests=()=>S.uid?[...new Set(S.follows.filter(f=>f.to===S.uid).map(f=>f.from))].filter(id=>!following(id)&&id!==S.uid):[];
function followBtn(id,small=true){
  if(!canWrite()||id===S.uid)return'';
  const f=isFriend(id),fo=following(id),back=!fo&&followsMe(id);
  return`<button class="btn ${small?'small':''} ${fo?'ghost':''} ${f?'friendbtn':''}" data-act="follow" data-id="${esc(id)}">${f?'✓ Friends':fo?'Following':back?'Add back':'Add friend'}</button>`;
}
// points: earned from activity (calculated, so nobody can fake them)
const LEVELS=[[0,'Newbie','🌱'],[100,'Bronze','🥉'],[500,'Silver','🥈'],[2000,'Gold','🥇'],[10000,'Diamond','💎']];
function pointsOf(id){
  const mine=S.posts.filter(p=>p.author===id),ids=new Set(mine.map(p=>p.id));
  const likes=S.likes.filter(l=>ids.has(l.post)&&l.user!==id).length;
  const replies=S.comments.filter(c=>ids.has(c.post)&&c.author!==id).length;
  const reps=S.reposts.filter(r=>ids.has(r.post)&&r.user!==id).length;
  const stories=liveStories().filter(x=>x.author===id).length;
  return mine.length*10+likes*2+replies*3+reps*4+stories*5+followersOf(id)*5;
}
const levelOf=pts=>{let L=LEVELS[0];for(const l of LEVELS)if(pts>=l[0])L=l;return L};
const nextLevel=pts=>LEVELS.find(l=>l[0]>pts);
function pointsPill(id){const p=pointsOf(id),L=levelOf(p);return`<span class="pts" title="${L[1]} level">${L[2]} ${p.toLocaleString()} pts</span>`}
function leaderboard(n){
  const ids=Object.keys(S.profiles).filter(id=>S.profiles[id]?.handle);
  ids.slice(0,40).forEach(id=>NEED.add(id));
  return ids.map(id=>[id,pointsOf(id)]).sort((a,b)=>b[1]-a[1]).slice(0,n);
}
function leaderHTML(n=5){
  const L=leaderboard(n);if(!L.length)return`<p class="muted" style="margin:0">Post, get likes and make friends to earn points.</p>`;
  return L.map(([id,p],i)=>`<div class="person lead"><span class="rank r${i+1}">${i+1}</span>${av(id,'sm')}<div class="n" data-profile="${esc(id)}">${esc(nameOf(id))}${badge(id)}<small>${levelOf(p)[2]} ${levelOf(p)[1]}</small></div><b class="lead-pts">${p.toLocaleString()}</b></div>`).join('');
}
function friendsView(){
  if(!S.uid)return`<div class="top"><h1>Friends</h1></div><div class="card hero"><h2>Find your friends</h2><p>Sign in to add friends.</p>${signInBtn()}</div>`;
  const fr=myFriends(),req=friendRequests();
  const sugg=Object.keys(S.profiles).filter(id=>id!==S.uid&&S.profiles[id]?.handle&&!following(id)&&!followsMe(id)).slice(0,8);
  const row=id=>`<div class="person">${av(id,'sm')}<div class="n" data-profile="${esc(id)}">${esc(nameOf(id))}${badge(id)}<small>@${esc(handleOf(id))} · ${pointsPill(id)}</small></div>
    ${isFriend(id)?`<button class="btn ghost small" data-act="dm" data-id="${esc(id)}">${ICON.msg}</button>`:''}${followBtn(id)}</div>`;
  return`<div class="top"><h1>Friends</h1><span class="muted">${fr.length} friend${fr.length===1?'':'s'}</span></div>
    ${req.length?`<div class="card box" style="margin-bottom:14px"><h3>Friend requests <span class="badge">${req.length}</span></h3>${req.map(row).join('')}</div>`:''}
    <div class="card box" style="margin-bottom:14px"><h3>Your friends</h3>${fr.length?fr.map(row).join(''):`<p class="muted" style="margin:0">When you and someone add each other, you become friends.</p>`}</div>
    <div class="card box"><h3>People you may know</h3>${sugg.length?sugg.map(row).join(''):`<p class="muted" style="margin:0">Share Cast with friends — they’ll show up here.</p>`}</div>`;
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
  const M=C.media,long=M.form==='long',lim=S.fb.st?VIDEO_MAX:DB_VIDEO_MAX,maxSec=long?LONG_MAX():60;
  if(M.duration&&M.duration>maxSec+1)throw new Error(long?`Long videos can be up to ${Math.round(maxSec/60)} minutes`:'Shorts can be up to 60 seconds — switch to Long video');
  const hq=SET.quality!=='saver';
  const opt=long?(S.fb.st?{maxDim:hq?1280:854,vbps:hq?1800000:900000,abps:128000}:{maxDim:hq?854:640,vbps:hq?600000:400000,abps:64000})
                :{maxDim:hq?1280:720,vbps:hq?1500000:700000,abps:hq?128000:64000};
  if(canCompress()&&M.blob.size>1.5*1024*1024&&!M.compressed){
    setBtn('Compressing…');
    try{
      const out=await compressVideo(M.blob,{maxSeconds:maxSec,...opt,onProgress:f=>setBtn(`Compressing ${Math.round(f*100)}%`)});
      if(out.size&&out.size<M.blob.size){M.blob=out;M.compressed=true}
      if(out.thumb)M.thumb=out.thumb;
    }catch(e){if(/seconds|minutes/.test(e.message||''))throw e;console.warn('compress failed',e)}
  }
  if(!M.thumb)M.thumb=await makeThumb(M.url);
  if(M.blob.size>lim)throw new Error(`That video is too big — try a shorter one${long?'':' or post it as a Long video'}`);
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
      if(data.media?.kind==='video'){
        if(validFilter(C.media.filter))data.media.filter=C.media.filter;
        data.media.form=C.media.form==='long'?'long':'short';
        if(C.media.duration)data.media.duration=Math.round(C.media.duration);
        if(C.media.w&&C.media.h){data.media.w=C.media.w;data.media.h=C.media.h}
        const t=(C.media.title||'').trim().slice(0,100);if(data.media.form==='long'&&t)data.title=t;
      }
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
  else{await put('follows',pairId(S.uid,id),{from:S.uid,to:id,at:Date.now()});bumpCount(id,'followers',1);bumpCount(S.uid,'following',1);toast(followsMe(id)?`You and ${nameOf(id).split(' ')[0]} are now friends! 🎉`:'Friend request sent')}
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
    setVideoMedia(file,'none');return;
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
const LONG_MAX=()=>S.fb?.st?20*60:5*60;
const fmtDur=t=>{t=Math.round(t||0);const m=Math.floor(t/60),s=t%60;return m>=60?`${Math.floor(m/60)}:${String(m%60).padStart(2,'0')}:${String(s).padStart(2,'0')}`:`${m}:${String(s).padStart(2,'0')}`};
// vertical -> Short, horizontal -> Long video
const autoForm=m=>(m.h>m.w&&(!m.duration||m.duration<=61))?'short':(m.w||m.h||m.duration>61)?'long':'short';
const orientOf=m=>!m.w||!m.h?'':m.h>m.w*1.05?'vertical':m.w>m.h*1.05?'horizontal':'square';
function setVideoMedia(blob,filter){
  const C=S.compose;if(C.media?.url?.startsWith('blob:'))URL.revokeObjectURL(C.media.url);
  C.media={kind:'video',blob,url:URL.createObjectURL(blob),thumb:'',filter:filter||'none',duration:0,w:0,h:0,form:'short',title:''};C.poll=null;render();
  probeVideo(blob).then(m=>{if(C.media?.blob!==blob)return;Object.assign(C.media,m);C.media.form=autoForm(m);C.media.auto=true;render()});
  makeThumb(C.media.url).then(t=>{if(C.media?.blob===blob&&!C.media.thumb)C.media.thumb=t});
}
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
  setVideoMedia(blob,r.filter||'none');
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
const isDbVideo=m=>m?.kind==='video'&&typeof m.vid==='string'&&Number.isInteger(m.chunks)&&m.chunks>0&&m.chunks<=MAX_CHUNKS;
const isVideo=p=>p.media?.kind==='video'&&(okURL(p.media.url)||isDbVideo(p.media));
const isLong=p=>isVideo(p)&&p.media.form==='long';
const isShort=p=>isVideo(p)&&p.media.form!=='long';
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
const fmtNum=n=>n>=1e6?(n/1e6).toFixed(n>=1e7?0:1).replace(/\.0$/,'')+'M':n>=1e3?(n/1e3).toFixed(n>=1e4?0:1).replace(/\.0$/,'')+'K':String(n||0);
let VIEWED=new Set();try{VIEWED=new Set(JSON.parse(localStorage.getItem('cast_viewed')||'[]'))}catch{}
function countView(pid){
  if(!pid||VIEWED.has(pid)||!S.fb)return;const p=postById(pid);if(!p||!isVideo(p))return;
  VIEWED.add(pid);try{localStorage.setItem('cast_viewed',JSON.stringify([...VIEWED].slice(-2000)))}catch{}
  S.fb.fs.updateDoc(dref('posts',pid),{views:S.fb.fs.increment(1)}).catch(e=>console.warn(e));
}
const viewsLabel=p=>`${fmtNum(p.views||0)} view${(p.views||0)===1?'':'s'}`;
function videoBox(p,cls='pimg'){
  const src=videoSrc(p);
  const fs=(validFilter(p.media.filter)?filterStyle(p.media.filter):'')+(cls==='pimg'&&p.media.w&&p.media.h?`aspect-ratio:${p.media.w}/${p.media.h};`:'');
  if(src)return`<video class="${cls}${p.media.h>p.media.w?' tall':''}" data-pid="${esc(p.id)}" data-vid="${esc(p.media.vid||'')}" src="${esc(src)}" controls playsinline preload="metadata" ${p.media.thumb?`poster="${esc(p.media.thumb)}"`:''} style="${fs}"></video>`;
  const loading=VLOADING.has(p.media.vid);
  return`<button class="vposter ${cls}${p.media.h>p.media.w?' tall':''}" data-act="playvid" data-id="${esc(p.id)}" style="${p.media.thumb?`background-image:url('${esc(p.media.thumb)}');`:''}${fs}">
    <span class="vplay">${loading?'Loading…':'▶'}</span><span class="vsize">👁 ${viewsLabel(p)}</span></button>`;
}

function thumbBox(p,cls){
  const fs=validFilter(p.media.filter)?filterStyle(p.media.filter):'';
  return`<div class="${cls}" data-act="openwatch" data-id="${esc(p.id)}"><div class="tb-img" style="${p.media.thumb?`background-image:url('${esc(p.media.thumb)}');`:''}${fs}"></div>
    <span class="tb-play">▶</span>${p.media.duration?`<span class="tb-dur">${fmtDur(p.media.duration)}</span>`:''}</div>`;
}
function longCard(p){return`${p.title?`<div class="ptitle" data-act="openwatch" data-id="${esc(p.id)}">${esc(p.title)}</div>`:''}${thumbBox(p,'thumb16 pimgwrap')}<div class="muted" style="font-size:13px;margin-top:6px">👁 ${viewsLabel(p)} · Long video</div>`}

/* ---------- Shorts (swipe up) ---------- */
let shortsStarted=false;
function shortsView(){
  const list=S.posts.filter(isShort).sort((a,b)=>b.createdAt-a.createdAt);
  if(!list.length)return`<div class="top"><h1>Shorts</h1></div><div class="empty"><div class="big">No Shorts yet</div>Post a video up to 60 seconds and it shows up here.</div>`;
  return`<div class="shorts" id="shorts">${list.map(shortItem).join('')}</div>`;
}
function shortItem(p){
  const src=videoSrc(p),fs=validFilter(p.media.filter)?filterStyle(p.media.filter):'',loading=VLOADING.has(p.media.vid);
  return`<section class="short ${PLAYING_SH.has(p.id)?'playing':''}" data-post="${esc(p.id)}">
    <div class="short-media" data-act="shorttap" data-id="${esc(p.id)}">
      ${src?`<video data-pid="${esc(p.id)}" data-vid="${esc(p.media.vid||'')}" src="${esc(src)}" loop playsinline preload="metadata" ${p.media.thumb?`poster="${esc(p.media.thumb)}"`:''} style="${fs}"></video>`
        :`<div class="short-poster" style="${p.media.thumb?`background-image:url('${esc(p.media.thumb)}');`:''}${fs}"></div>`}
      <div class="short-play">${loading?'<span class="spin"></span>':'▶'}</div>
    </div>
    <div class="short-side">
      <button class="${iLike(p.id)?'on':''}" data-act="like" data-id="${esc(p.id)}"><i>❤</i><span>${fmtNum(likesFor(p.id).length)}</span></button>
      <button data-act="gopost" data-id="${esc(p.id)}"><i>💬</i><span>${fmtNum(commentsFor(p.id).length)}</span></button>
      <button class="${iSaved(p.id)?'on':''}" data-act="save" data-id="${esc(p.id)}"><i>🔖</i><span>Save</span></button>
      <button data-act="copy" data-id="${esc(p.id)}"><i>↗</i><span>Share</span></button>
      <div><i>👁</i><span>${fmtNum(p.views||0)}</span></div>
    </div>
    <div class="short-info"><div class="short-who">${av(p.author,'sm')}<b data-profile="${esc(p.author)}">${esc(nameOf(p.author))}${badge(p.author)}</b>${p.author!==S.uid?followBtn(p.author):''}</div>${p.text?`<p>${fmt(p.text)}</p>`:''}</div>
  </section>`;
}
async function playShort(p,el){
  shortsStarted=true;
  if(!videoSrc(p)){await loadVideo(p,false)}
  const v=(el||document.querySelector(`.short[data-post="${CSS.escape(p.id)}"]`))?.querySelector('video');
  if(v)v.play().catch(()=>{});
}
const SIO=new IntersectionObserver(es=>es.forEach(e=>{
  const sec=e.target,v=sec.querySelector('video');
  if(e.isIntersecting&&e.intersectionRatio>.7){if(shortsStarted&&SET.autoplayShorts){const p=postById(sec.dataset.post);if(p)playShort(p,sec)}}
  else if(v&&!v.paused)v.pause();
}),{threshold:[0,.7,1]});
const SEEN_SH=new WeakSet();
const PLAYING_SH=new Set();
document.addEventListener('play',e=>{const sec=e.target.closest?.('.short');if(sec){PLAYING_SH.add(sec.dataset.post);sec.classList.add('playing')}},true);
document.addEventListener('pause',e=>{const sec=e.target.closest?.('.short');if(sec){PLAYING_SH.delete(sec.dataset.post);sec.classList.remove('playing')}},true);

/* ---------- long videos ---------- */
function videosView(){
  const list=S.posts.filter(isLong).sort((a,b)=>b.createdAt-a.createdAt);
  return`<div class="top"><h1>Videos</h1><span class="muted">${list.length} video${list.length===1?'':'s'}</span></div>
  ${list.length?`<div class="vgrid">${list.map(p=>`<div class="vcard">${thumbBox(p,'thumb16')}<div class="vmeta">${av(p.author,'sm')}<div><div class="vtitle2" data-act="openwatch" data-id="${esc(p.id)}">${esc(p.title||p.text||'Untitled video')}</div><div class="muted" style="font-size:13px"><span data-profile="${esc(p.author)}">${esc(nameOf(p.author))}</span>${badge(p.author)} · ${viewsLabel(p)} · ${ago(p.createdAt)}</div></div></div></div>`).join('')}</div>`
  :`<div class="empty"><div class="big">No long videos yet</div>Pick a video in the post box and choose <b>🎬 Long video</b>.</div>`}`;
}
function openWatch(id){S.watchId=id;go('watch')}
function watchView(){
  const p=postById(S.watchId);
  if(!p)return S.loading?`<div class="empty">Loading…</div>`:`<div class="empty"><div class="big">Video not found</div>It may have been deleted.</div>`;
  const cm=commentsFor(p.id),more=S.posts.filter(x=>isLong(x)&&x.id!==p.id).sort((a,b)=>b.createdAt-a.createdAt).slice(0,8);
  const canDel=S.uid&&(p.author===S.uid||S.isAdmin);
  return`<div class="watch" data-post="${esc(p.id)}">
    <div class="watchplayer">${videoBox(p,'wplayer')}</div>
    <h1 class="wtitle">${esc(p.title||'Untitled video')}</h1>
    <div class="muted" style="font-size:14px">${viewsLabel(p)} · ${ago(p.createdAt)}${p.media.duration?` · ${fmtDur(p.media.duration)}`:''}</div>
    <div class="wrow"><div class="person" style="flex:1;padding:0">${av(p.author)}<div class="n" data-profile="${esc(p.author)}">${esc(nameOf(p.author))}${badge(p.author)}<small>${fmtNum(followersOf(p.author))} followers</small></div>${followBtn(p.author)}</div>
      <div class="wbtns"><button class="pillbtn ${iLike(p.id)?'on':''}" data-act="like" data-id="${esc(p.id)}">❤ ${fmtNum(likesFor(p.id).length)}</button><button class="pillbtn" data-act="copy" data-id="${esc(p.id)}">↗ Share</button><button class="pillbtn ${iSaved(p.id)?'on':''}" data-act="save" data-id="${esc(p.id)}">🔖 Save</button>${canDel?`<button class="pillbtn" data-act="del" data-id="${esc(p.id)}">${ICON.trash}</button>`:''}</div></div>
    ${p.text?`<div class="card wdesc">${fmt(p.text)}</div>`:''}
    <h3 class="sect">${cm.length} comment${cm.length===1?'':'s'}</h3>
    ${canWrite()?`<form class="cform" data-form="c" data-id="${esc(p.id)}" style="margin-bottom:14px">${av(S.uid,'sm')}<input data-key="c:${esc(p.id)}" data-draft="${esc(p.id)}" placeholder="Add a comment…" maxlength="500" value="${esc(S.drafts[p.id]||'')}"><button class="btn small" type="submit">Comment</button></form>`:(S.uid?'':`<button class="btn ghost small" data-act="signin" style="margin-bottom:14px">Sign in to comment</button>`)}
    <div class="thread" style="border:0;padding:0">${cm.map(c=>`<div class="cmt" data-mkey="c-${esc(c.id)}">${av(c.author,'sm')}<div class="bub"><span class="who" data-profile="${esc(c.author)}">${esc(nameOf(c.author))}${badge(c.author)}</span> <span class="muted" style="font-size:12px">${ago(c.createdAt)}</span>
      ${S.uid&&(c.author===S.uid||S.isAdmin||p.author===S.uid)?`<button class="muted" style="float:right;font-size:12px" data-act="delc" data-id="${esc(c.id)}">delete</button>`:''}<p>${fmt(c.text)}</p></div></div>`).join('')}</div>
    ${more.length?`<h3 class="sect">Up next</h3><div class="upnext">${more.map(x=>`<div class="unx" data-act="openwatch" data-id="${esc(x.id)}">${thumbBox(x,'thumb16 sm')}<div><b>${esc(x.title||'Untitled video')}</b><div class="muted" style="font-size:12px">${esc(nameOf(x.author))} · ${viewsLabel(x)}</div></div></div>`).join('')}</div>`:''}
  </div>`;
}

/* ---------- settings page ---------- */
function settingsView(){
  const opt=(k,v,label)=>`<button class="segbtn ${String(SET[k])===String(v)?'on':''}" data-set="${k}" data-val="${v}">${label}</button>`;
  const tog=(k,label,sub)=>`<div class="setrow"><div><b>${label}</b>${sub?`<small>${sub}</small>`:''}</div><button class="switch ${SET[k]?'on':''}" data-set="${k}" data-val="${!SET[k]}" aria-label="${label}"><i></i></button></div>`;
  return`<div class="top"><h1>Settings</h1></div>
  <div class="card box setcard"><h3>🎨 Appearance</h3>
    <div class="setrow"><div><b>Theme</b><small>Dark, light, or match your device</small></div><div class="seg">${opt('theme','dark','🌙 Dark')}${opt('theme','light','☀️ Light')}${opt('theme','auto','Auto')}</div></div>
    <div class="setrow"><div><b>Accent color</b><small>Buttons, links and highlights</small></div><div class="swatches">${Object.entries(ACCENTS).map(([k,[a,b]])=>`<button class="${SET.accent===k?'on':''}" data-set="accent" data-val="${k}" style="background:linear-gradient(135deg,${b},${a})" aria-label="${k}"></button>`).join('')}</div></div>
    ${tog('motion','Animations','Smooth motion and effects')}
  </div>
  <div class="card box setcard"><h3>🔔 Notifications</h3>
    <div class="setrow"><div><b>Pop-up notifications</b><small>Get a pop-up for likes, replies, mentions, friends and messages${isIOS()&&!isStandalone()?' — on iPhone, install Cast first':''}</small></div><button class="switch ${SET.popups&&('Notification' in window)&&Notification.permission==='granted'?'on':''}" data-act="togglepopups" aria-label="Pop-up notifications"><i></i></button></div>
    ${tog('sounds','Sounds','Play a little sound for new notifications')}
  </div>
  <div class="card box setcard"><h3>🎬 Videos</h3>
    <div class="setrow"><div><b>Upload quality</b><small>High looks sharper · Data saver uploads faster and fits more videos</small></div><div class="seg">${opt('quality','high','High')}${opt('quality','saver','Data saver')}</div></div>
    ${tog('autoplayShorts','Autoplay Shorts while swiping','After you tap play once, the next Short plays as you swipe')}
  </div>
  <div class="card box setcard"><h3>📲 App</h3>
    ${canInstall()?`<div class="setrow"><div><b>Install Cast</b><small>Add it to your home screen or computer</small></div><button class="btn small" data-act="install">Install</button></div>`:`<div class="setrow"><div><b>Cast is installed</b><small>You’re using the app version</small></div></div>`}
  </div>
  ${S.uid?`<div class="card box setcard"><h3>👤 Account</h3>
    <div class="setrow"><div><b>${esc(nameOf(S.uid))}</b><small>@${esc(handleOf(S.uid))} · signed in with Google</small></div><button class="btn ghost small" data-act="settingsedit">Edit profile</button></div>
    <div class="setrow"><div><b>Sign out</b><small>You can sign back in any time</small></div><button class="btn ghost small" data-act="signout">Sign out</button></div>
  </div>`:`<div class="card box setcard"><h3>👤 Account</h3><div class="setrow"><div><b>Not signed in</b></div>${signInBtn()}</div></div>`}
  <p class="muted" style="text-align:center;font-size:12px">Cast · settings are saved on this device</p>`;
}

/* ---------- post rendering ---------- */
function mediaHTML(p){
  if(isLong(p))return longCard(p);
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
    ${isLong(p)?`${mediaHTML(p)}${p.text?`<p class="text" style="color:var(--muted);font-size:15px">${fmt(p.text)}</p>`:''}`:`${p.text?`<p class="text">${fmt(p.text)}</p>`:''}${mediaHTML(p)}`}${pollHTML(p)}
    <div class="actions">
      <button class="iconbtn" data-act="thread" data-id="${esc(p.id)}" title="Reply">${ICON.chat}${cmts.length||''}</button>
      <button class="iconbtn ${iRepost(p.id)?'reposted':''}" data-act="repost" data-id="${esc(p.id)}" title="Repost">${ICON.repost}${reps||''}</button>
      <button class="iconbtn ${iLike(p.id)?'liked':''}" data-act="like" data-id="${esc(p.id)}" title="Like">${ICON.heart}${likes||''}</button>
      <button class="iconbtn ${iSaved(p.id)?'saved':''}" data-act="save" data-id="${esc(p.id)}" title="Bookmark">${ICON.bookmark}</button>
      <button class="iconbtn" data-act="copy" data-id="${esc(p.id)}" title="Copy link">${ICON.share}</button>
      ${isVideo(p)?`<span class="iconbtn views" title="Views">👁 ${fmtNum(p.views||0)}</span>`:''}
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
      ${C.media.kind==='video'?`<div class="vchoose">
        <button class="vopt ${C.media.form!=='long'?'on':''}" data-vform="short"><span class="vshape tall"></span><span><b>Short</b><small>Vertical · up to 60s · shows in Shorts</small></span></button>
        <button class="vopt ${C.media.form==='long'?'on':''}" data-vform="long"><span class="vshape wide"></span><span><b>Long video</b><small>Horizontal · up to ${Math.round(LONG_MAX()/60)} min · shows in Videos</small></span></button>
      </div>
      <div class="muted vnote2">${C.media.duration?`${fmtDur(C.media.duration)} · `:''}${orientOf(C.media)?`${orientOf(C.media)} video`:'checking video…'}${C.media.auto&&orientOf(C.media)?` — we picked <b>${C.media.form==='long'?'Long video':'Short'}</b> for you`:''}${C.media.form!=='long'&&C.media.duration>61?' · <span style="color:#ff6b81">too long for a Short</span>':''}</div>
        ${C.media.form==='long'?`<input class="vtitle" data-key="vtitle" maxlength="100" placeholder="Give your video a title" value="${esc(C.media.title||'')}">`:''}`:''}
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
/* ---------- For You: a mixed, personal feed ---------- */
function interests(){
  const tags={},authors={};if(!S.uid)return{tags,authors};
  const liked=new Set(S.likes.filter(l=>l.user===S.uid).map(l=>l.post));
  S.comments.filter(c=>c.author===S.uid).forEach(c=>liked.add(c.post));
  for(const p of S.posts){const w=p.author===S.uid?1:liked.has(p.id)?2:0;if(!w)continue;
    for(const t of tagsIn(p.text))tags[t]=(tags[t]||0)+w;if(p.author!==S.uid)authors[p.author]=(authors[p.author]||0)+1}
  return{tags,authors};
}
const kindOf=p=>isLong(p)?'long':isShort(p)?'short':(p.media||p.image)?'photo':p.poll?'poll':'text';
function scorePost(p,I,now){
  const age=(now-p.createdAt)/3600000;
  const eng=likesFor(p.id).length*2+commentsFor(p.id).length*3+repostsFor(p.id).length*3+(p.views||0)*.15;
  let sc=(10+eng)/Math.pow(age+2,1.1);
  if(isFriend(p.author))sc*=2.2;else if(following(p.author))sc*=1.6;
  if(I.authors[p.author])sc*=1+Math.min(1,I.authors[p.author]*.25);
  const tg=tagsIn(p.text).reduce((a,t)=>a+(I.tags[t]||0),0);if(tg)sc*=1+Math.min(1.5,tg*.3);
  if(kindOf(p)!=='text')sc*=1.25;
  if(p.author===S.uid)sc*=age<1?3:.6;
  if(iLike(p.id))sc*=.7;
  return sc;
}
function forYouHTML(){
  const now=Date.now(),I=interests();
  const all=S.posts.map(p=>({p,sc:scorePost(p,I,now)})).sort((a,b)=>b.sc-a.sc);
  if(!all.length)return S.loading?`<div class="empty">Loading…</div>`:`<div class="empty"><div class="big">Be the first to post</div>Share a photo, a Short, a video or a poll.</div>`;
  const shorts=all.filter(x=>isShort(x.p)).slice(0,10).map(x=>x.p);
  const longs=all.filter(x=>isLong(x.p)).slice(0,8).map(x=>x.p);
  const inStrip=new Set([...(shorts.length>=2?shorts:[]),...(longs.length>=2?longs:[])].map(p=>p.id));
  // pick posts so the feed keeps changing: no same person twice in a row, no 3 of the same kind in a row
  let pool=all.filter(x=>!inStrip.has(x.p.id));const out=[];
  while(pool.length){
    const last=out[out.length-1],prev=out[out.length-2];
    let i=pool.findIndex(x=>(!last||x.p.author!==last.author)&&!(last&&prev&&kindOf(last)===kindOf(prev)&&kindOf(x.p)===kindOf(last)));
    if(i<0)i=0;out.push(pool[i].p);pool.splice(i,1);
  }
  const reposted=new Map();for(const r of S.reposts)if(r.user!==S.uid&&(following(r.user)||isFriend(r.user)))reposted.set(r.post,r.user);
  const card=p=>postHTML(p,reposted.has(p.id)?`${esc(nameOf(reposted.get(p.id)))} reposted`:'');
  const shortStrip=shorts.length>=2?`<div class="strip" data-mkey="strip-shorts"><div class="strip-head"><h3>📱 Shorts for you</h3><button class="muted" data-view="shorts">See all</button></div><div class="strip-row">${shorts.map(p=>`<div class="strip-short" data-act="openshort" data-id="${esc(p.id)}" data-mkey="ss-${esc(p.id)}"><div class="tb-img" style="${p.media.thumb?`background-image:url('${esc(p.media.thumb)}');`:''}${validFilter(p.media.filter)?filterStyle(p.media.filter):''}"></div><span class="ss-views">▶ ${fmtNum(p.views||0)}</span><span class="ss-cap">${esc((p.text||nameOf(p.author)).slice(0,40))}</span></div>`).join('')}</div></div>`:'';
  const longStrip=longs.length>=2?`<div class="strip" data-mkey="strip-long"><div class="strip-head"><h3>🎬 Videos for you</h3><button class="muted" data-view="videos">See all</button></div><div class="strip-row">${longs.map(p=>`<div class="strip-long" data-mkey="sl-${esc(p.id)}">${thumbBox(p,'thumb16')}<b data-act="openwatch" data-id="${esc(p.id)}">${esc(p.title||'Untitled video')}</b><small>${esc(nameOf(p.author))} · ${viewsLabel(p)}</small></div>`).join('')}</div></div>`:'';
  let html='';
  out.forEach((p,i)=>{html+=card(p);if(i===2)html+=shortStrip;if(i===6)html+=longStrip});
  if(out.length<=2)html+=shortStrip;if(out.length<=6)html+=longStrip;
  return html;
}
function homeView(){
  let set=null;
  if(S.tab==='following'&&S.uid){set=new Set(S.follows.filter(f=>f.from===S.uid).map(f=>f.to));set.add(S.uid)}
  if(S.tab==='friends'&&S.uid){set=new Set(myFriends());set.add(S.uid)}
  return`${installBanner()}${storiesBar()}<div class="top"><h1>Home</h1>${S.uid?`<div class="tabs"><button data-tab="all" class="${S.tab==='all'?'on':''}">For you</button><button data-tab="following" class="${S.tab==='following'?'on':''}">Following</button><button data-tab="friends" class="${S.tab==='friends'?'on':''}">Friends</button></div>`:''}</div>
  ${composerHTML()}
  ${S.tab==='all'?forYouHTML():feedList(feedItems(set),S.tab!=='all'?'Nothing here yet':'Be the first to post',S.tab==='friends'?'Add friends to fill this feed.':S.tab==='following'?'Follow people to fill this feed.':'Say hi — post some text, a photo, a video or a poll.')}`;
}
function clipsView(){
  const vids=S.posts.filter(isVideo).sort((a,b)=>b.createdAt-a.createdAt);
  return`<div class="top"><h1>Clips</h1><span class="muted">${vids.length} video${vids.length===1?'':'s'}</span></div>
  ${vids.length?`<div class="clips">${vids.map(p=>`<div class="clip" data-act="watch" data-id="${esc(p.id)}">
    ${p.media.thumb?`<img src="${esc(p.media.thumb)}" alt="" style="width:100%;height:100%;object-fit:cover;display:block;${validFilter(p.media.filter)?filterStyle(p.media.filter):''}">`:videoSrc(p)?`<video src="${esc(videoSrc(p))}#t=0.5" muted playsinline preload="metadata"></video>`:'<div style="width:100%;height:100%;background:linear-gradient(135deg,#2a2420,#000)"></div>'}
    <span class="play">▶</span><div class="cap"><b>${esc(nameOf(p.author))}${badge(p.author)}</b><div>${esc(p.text||'')}</div><div class="cstats">👁 ${fmtNum(p.views||0)} · ❤ ${fmtNum(likesFor(p.id).length)}</div></div></div>`).join('')}</div>`
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
  ${!q&&!S.tag?`<div class="card box" style="margin-bottom:14px"><h3>🏆 Top creators</h3>${leaderHTML(10)}</div><div class="card box" style="margin-bottom:14px"><h3>Trending</h3>${trendsHTML()}</div>`:''}
  ${feedList(list,'No matching posts','Try another word or tag.')}`;
}
const NK={like:['#ff5a36','heart','liked your post'],repost:['#2f8f4e','repost','reposted your post'],reply:['#127c74','chat','replied'],mention:['#6a4cff','at','mentioned you'],follow:['#2f7de1','user','added you as a friend'],vote:['#e0a100','poll','voted in your poll']};
function notifView(){
  if(!S.uid)return`<div class="top"><h1>Notifications</h1></div><div class="card hero"><h2>See who’s talking to you</h2><p>Sign in to get likes, replies, mentions and new followers.</p>${signInBtn()}</div>`;
  const list=notifications(),seen=S.notifSeenSnapshot??(S.me.seenAt||0);
  return`<div class="top"><h1>Notifications</h1></div>
  ${list.length?`<div class="card" style="overflow:hidden">${list.map(n=>{const[c,ic,verb]=NK[n.kind];const p=n.post&&postById(n.post);
    return`<div class="notif ${n.at>seen?'new':''}" ${n.post?`data-act="gopost" data-id="${esc(n.post)}"`:`data-profile="${esc(n.who)}"`}>
      <div class="ic" style="background:${c}">${ICON[ic]}</div><div class="txt"><div><b>${esc(nameOf(n.who))}</b>${badge(n.who)} ${verb} <span class="muted">· ${ago(n.at)}</span></div>
      ${n.text?`<div class="snip">${esc(n.text)}</div>`:p?.text?`<div class="snip">${esc(p.text)}</div>`:''}</div>${n.kind==='follow'&&!following(n.who)?`<span onclick="event.stopPropagation()">${followBtn(n.who)}</span>`:''}</div>`}).join('')}</div>`
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
    ${me?(canWrite()&&!S.editing?`<div style="display:flex;gap:8px"><button class="btn ghost small" data-act="edit">Edit profile</button><button class="btn ghost small" data-view="settings" aria-label="Settings">${ICON.gear}</button></div>`:''):(canWrite()?`<div style="display:flex;gap:8px"><button class="btn ghost small" data-act="dm" data-id="${esc(id)}">${ICON.msg} Message</button>${followBtn(id)}</div>`:'')}
  </div>
  <h2>${esc(nameOf(id))}${badge(id)}</h2>${verified(id)?'<div class="vnote">Verified \u00b7 1,000+ followers</div>':''}${pr.handle?`<div class="handle">@${esc(pr.handle)}</div>`:''}
  ${pr.bio?`<p class="bio">${fmt(pr.bio)}</p>`:(me?`<p class="bio muted">Add a bio so people know who you are.</p>`:'')}
  ${pr.website&&/^https?:\/\//.test(pr.website)?`<p style="margin:0 0 10px"><a href="${esc(pr.website)}" target="_blank" rel="noopener nofollow">${esc(pr.website.replace(/^https?:\/\//,''))}</a></p>`:''}
  <div class="pointsrow">${pointsPill(id)}<span class="lvl">${levelOf(pointsOf(id))[1]} level</span>${me&&nextLevel(pointsOf(id))?`<span class="muted" style="font-size:13px">${(nextLevel(pointsOf(id))[0]-pointsOf(id)).toLocaleString()} pts to ${nextLevel(pointsOf(id))[1]}</span>`:''}${!me&&isFriend(id)?'<span class="frtag">✓ Friends</span>':(!me&&followsMe(id)?'<span class="frtag">Added you</span>':'')}</div>
  <div class="stats"><span><b>${list.length}</b> posts</span>${me?`<span data-view="friends" style="cursor:pointer"><b>${myFriends().length}</b> friends</span>`:''}<span><b>${followersOf(id).toLocaleString()}</b> followers</span><span><b>${followingOf(id).toLocaleString()}</b> following</span><span><b>${likesGot}</b> likes</span>${pr.createdAt?`<span>Joined ${new Date(pr.createdAt).toLocaleDateString(undefined,{month:'short',year:'numeric'})}</span>`:''}</div>
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
    ${followBtn(id)}</div>`;
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
      ${src?`<video data-pid="${esc(p.id)}" src="${esc(src)}" controls autoplay playsinline onclick="event.stopPropagation()" style="${validFilter(p.media.filter)?filterStyle(p.media.filter):''}"></video>`:`<div style="color:#fff;font-size:18px">Loading video…</div>`}
      <div class="info"><b>${esc(nameOf(p.author))}</b> ${esc(p.text||'')}<div class="vrow"><button class="vlike ${iLike(p.id)?'on':''}" data-act="like" data-id="${esc(p.id)}">❤ ${fmtNum(likesFor(p.id).length)}</button><span>👁 ${viewsLabel(p)}</span><button class="btn small" data-act="gopost" data-id="${esc(p.id)}">💬 ${commentsFor(p.id).length} · Open post</button></div></div></div>`}
  if(S.installHelp)return installHelpHTML();
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

/* ---------- pop-up notifications ---------- */
let notifyBase=null;
function ding(){
  if(!SET.sounds)return;
  try{const A=window.__ac||(window.__ac=new (window.AudioContext||window.webkitAudioContext)());const t=A.currentTime;
    [880,1320].forEach((f,i)=>{const o=A.createOscillator(),g=A.createGain();o.type='sine';o.frequency.value=f;g.gain.setValueAtTime(0,t+i*.09);g.gain.linearRampToValueAtTime(.12,t+i*.09+.01);g.gain.exponentialRampToValueAtTime(.001,t+i*.09+.25);o.connect(g).connect(A.destination);o.start(t+i*.09);o.stop(t+i*.09+.3)})}catch{}
}
function showSystem(title,body,hash,tag){
  if(!SET.popups||!('Notification' in window)||Notification.permission!=='granted')return false;
  const opts={body,icon:'icon-192.png',badge:'icon-192.png',tag,data:{url:location.pathname+'#'+hash},renotify:true};
  (navigator.serviceWorker?.getRegistration?.()||Promise.resolve(null)).then(r=>{if(r)return r.showNotification(title,opts);const n=new Notification(title,opts);n.onclick=()=>{window.focus();location.hash=hash;n.close()}}).catch(()=>{});
  return true;
}
const NTXT={like:'liked your post',repost:'reposted your post',reply:'replied to you',mention:'mentioned you',follow:'added you as a friend',vote:'voted in your poll'};
function checkPopups(){
  if(!S.uid||!S.profilesReady||S.loading)return;
  let saved=0;try{saved=+localStorage.getItem('cast_last_notif_'+S.uid)||0}catch{}
  if(notifyBase===null){notifyBase=Math.max(Date.now()-3000,saved);return}
  const items=notifications().filter(n=>n.at>notifyBase);
  const chats=S.convos.filter(c=>c.last&&c.last.from!==S.uid&&(c.updatedAt||0)>notifyBase);
  if(!items.length&&!chats.length)return;
  notifyBase=Math.max(notifyBase,...items.map(n=>n.at),...chats.map(c=>c.updatedAt||0));
  try{localStorage.setItem('cast_last_notif_'+S.uid,String(notifyBase))}catch{}
  const out=[];
  for(const c of chats){const inChat=S.view==='messages'&&S.chat?.cid===c.id&&!document.hidden;if(inChat)continue;
    out.push({title:c.group?`${nameOf(c.last.from)} in ${c.name||'group'}`:nameOf(c.last.from),body:c.last.text||'Sent a message',hash:'messages',tag:'chat-'+c.id})}
  for(const n of items){const p=n.post&&postById(n.post);
    out.push({title:`${nameOf(n.who)} ${NTXT[n.kind]||''}`,body:n.text||p?.title||p?.text||'',hash:n.post?(p&&isLong(p)?'v-':'p-')+n.post:'u-'+handleOf(n.who),tag:n.kind+'-'+(n.post||n.who)})}
  if(!out.length)return;
  let sys=false;
  if(document.hidden)for(const o of out.slice(0,3))sys=showSystem(o.title,o.body,o.hash,o.tag)||sys;
  if(!sys){const o=out[0];if(!(S.view==='notifications'&&!o.tag.startsWith('chat-')))toast(`🔔 ${o.title}${out.length>1?` (+${out.length-1} more)`:''}`)}
  ding();
}
async function enablePopups(on){
  if(!on)return saveSettings({popups:false});
  if(!('Notification' in window)){toast(isIOS()?'On iPhone, install Cast to your home screen first, then turn this on':'This browser doesn’t support pop-up notifications');return}
  let perm=Notification.permission;
  if(perm==='default')perm=await Notification.requestPermission();
  if(perm!=='granted'){toast('Notifications are blocked — allow them in your browser’s site settings');return saveSettings({popups:false})}
  saveSettings({popups:true});showSystem('Cast notifications are on 🎉','You’ll get a pop-up when someone likes, replies, adds you or messages you.','notifications','welcome');
}

/* ---------- render ---------- */
// Update the page in place instead of rebuilding it, so photos and videos don't reload or jump.
const keyOf=n=>n.nodeType===1?(n.getAttribute('data-post')||n.getAttribute('data-mkey')):null;
function morph(el,html){const t=document.createElement(el.tagName);t.innerHTML=html;patchChildren(el,t)}
function patchChildren(a,b){
  const keyed=new Map();for(const c of a.childNodes){const k=keyOf(c);if(k)keyed.set(k,c)}
  let cur=a.firstChild;
  for(const y of [...b.childNodes]){
    const k=keyOf(y);let x=null;
    if(k){x=keyed.get(k)||null;if(x)keyed.delete(k)}
    else if(cur&&!keyOf(cur)&&cur.nodeType===y.nodeType&&cur.nodeName===y.nodeName)x=cur;
    if(x){if(x===cur)cur=cur.nextSibling;else a.insertBefore(x,cur);patchNode(x,y)}
    else a.insertBefore(y,cur);
  }
  while(cur){const n=cur.nextSibling;a.removeChild(cur);cur=n}
}
function patchNode(x,y){
  if(x.nodeType!==1){if(x.nodeValue!==y.nodeValue)x.nodeValue=y.nodeValue;return}
  for(const at of [...x.attributes])if(!y.hasAttribute(at.name))x.removeAttribute(at.name);
  for(const at of [...y.attributes])if(x.getAttribute(at.name)!==at.value)x.setAttribute(at.name,at.value);
  const tag=x.tagName;
  if(tag==='INPUT'){if(x.type==='checkbox'||x.type==='radio')x.checked=y.hasAttribute('checked');else if(document.activeElement!==x&&x.value!==(y.getAttribute('value')||''))x.value=y.getAttribute('value')||'';return}
  if(tag==='TEXTAREA'){if(document.activeElement!==x&&x.value!==y.value)x.value=y.value;return}
  if(tag==='svg'&&x.innerHTML===y.innerHTML)return;
  patchChildren(x,y);
}
// videos never start on their own: only one plays at a time, and it pauses when scrolled off screen
const VIO=new IntersectionObserver(es=>es.forEach(e=>{if(!e.isIntersecting&&!e.target.paused)e.target.pause()}),{threshold:.2});
document.addEventListener('play',e=>{if(e.target.tagName!=='VIDEO')return;countView(e.target.dataset.pid);document.querySelectorAll('video').forEach(v=>{if(v!==e.target&&!v.paused)v.pause()})},true);
function focusKey(k,caret){const el=document.querySelector(`[data-key="${CSS.escape(k)}"]`);if(el){el.focus();if(caret!=null&&el.setSelectionRange)try{el.setSelectionRange(caret,caret)}catch{}}}
function suggestHandle(){return(S.googleName||'').toLowerCase().replace(/[^a-z0-9_]/g,'').slice(0,16)}
function render(){
  if(!CONFIGURED){$('#main').innerHTML=setupHTML();$('#nav').innerHTML='';$('#side').innerHTML='';return}
  const a=document.activeElement,key=a?.dataset?.key,caret=a?.selectionStart;
  const playing=[...document.querySelectorAll('main video')].filter(v=>!v.paused).map(v=>v.src);
  if(S.uid&&S.profilesReady&&!handleOf(S.uid)&&!S.onboard)S.onboard={handle:suggestHandle(),displayName:S.googleName||'',bio:'',website:'',color:colorOf(S.uid),usePhoto:!!S.photoURL};
  if(S.onboard&&(!S.uid||handleOf(S.uid)))S.onboard=null;
  const n=unread();
  const items=[['home','Home'],['shorts','Shorts'],['videos','Videos'],['explore','Explore'],['messages','Chats'],['friends','Friends'],['notifications','Alerts'],['bookmarks','Saved'],['settings','Settings'],['profile','Profile']];
  const icon={home:'home',shorts:'shorts',videos:'film',explore:'explore',messages:'msg',friends:'friends',notifications:'bell',bookmarks:'bookmark',settings:'gear',profile:'user'};
  const um=unreadChats();
  const isOn=v=>S.view===v&&(v!=='profile'||!S.profileId||S.profileId===S.uid);
  const h=handleOf(S.uid);
  morph($('#nav'),`<div class="brand"><span class="dot"></span>Cast</div>
    ${items.map(([v,l])=>`<button class="navbtn ${isOn(v)?'on':''}" data-view="${v}">${ICON[icon[v]]}${v==='notifications'?'Notifications':v==='bookmarks'?'Bookmarks':v==='messages'?'Messages':l}${v==='notifications'&&n?`<span class="badge">${n>99?'99+':n}</span>`:''}${v==='messages'&&um?`<span class="badge">${um}</span>`:''}${v==='friends'&&friendRequests().length?`<span class="badge">${friendRequests().length}</span>`:''}</button>`).join('')}
    ${S.uid?`<button class="btn navpost" data-act="fab">${ICON.camera} Snap</button>`:''}
    ${canInstall()?`<button class="navbtn" data-act="install" style="margin-top:6px">⬇︎ Install app</button>`:''}
    ${S.uid?`<div class="mecard" data-profile="${esc(S.uid)}">${av(S.uid,'sm')}<div style="min-width:0;flex:1"><div class="n">${esc(nameOf(S.uid))}${badge(S.uid)}</div><div class="s">${h?'@'+esc(h):'Setting up…'}</div></div></div>`
      :S.authReady?`<div style="margin-top:16px">${signInBtn('Sign in')}</div>`:''}`);
  {const tab=(v,l)=>`<button class="${isOn(v)?'on':''}" data-view="${v}">${ICON[icon[v]]}<span>${l}</span>${v==='messages'&&um?`<i class="dotbadge">${um>9?'9+':um}</i>`:''}</button>`;
   morph($('#mnav'),`${tab('home','Home')}${tab('shorts','Shorts')}${S.uid&&canWrite()?`<button class="mnav-cam" data-act="fab" aria-label="Camera">${ICON.camera}</button>`:tab('explore','Explore')}${tab('videos','Videos')}${tab('messages','Chats')}`);}
  const fr=friendRequests().length;
  morph($('#mtop'),`<div class="brand"><span class="dot"></span>Cast</div><div class="mtop-icons">
    <button data-view="explore" aria-label="Search" class="${S.view==='explore'?'on':''}">${ICON.search}</button>
    <button data-view="friends" aria-label="Friends" class="${S.view==='friends'?'on':''}">${ICON.friends}${fr?`<span class="badge">${fr}</span>`:''}</button>
    <button data-view="notifications" aria-label="Notifications" class="${S.view==='notifications'?'on':''}">${ICON.bell}${n?`<span class="badge">${n>9?'9+':n}</span>`:''}</button>
    ${S.uid?`<button data-view="profile" aria-label="Profile" class="mtop-me ${isOn('profile')?'on':''}">${av(S.uid,'sm',false)}</button>`:`<button data-view="settings" aria-label="Settings" class="${S.view==='settings'?'on':''}">${ICON.gear}</button>`}</div>`);
  document.body.classList.toggle('in-shorts',S.view==='shorts');
  {const f=S.uid&&canWrite()&&S.view!=='shorts'&&S.view!=='watch'?`<button class="fab" data-act="fab" aria-label="Open camera">${ICON.camera}</button>`:'';if($('#fab').dataset.h!==f){$('#fab').innerHTML=f;$('#fab').dataset.h=f}}
  const V={explore:exploreView,profile:profileView,shorts:shortsView,videos:videosView,watch:watchView,settings:settingsView,notifications:notifView,bookmarks:bookmarksView,messages:messagesView,friends:friendsView}[S.view]||homeView;
  const vt=S.view+'|'+(S.view==='profile'?S.profileId:S.view==='watch'?S.watchId:'');
  morph($('#main'),V());
  if($('#main').dataset.vt!==vt){$('#main').dataset.vt=vt;const m=$('#main');m.classList.remove('vt');void m.offsetWidth;m.classList.add('vt')}
  document.querySelectorAll('.short').forEach(sec=>{if(!SEEN_SH.has(sec)){SEEN_SH.add(sec);SIO.observe(sec)}});
  morph($('#side'),`<div class="search">${ICON.search}<input data-key="sq" id="sq" placeholder="Search Cast"></div>
    <div class="card box"><h3>Trending</h3>${trendsHTML()}</div>
    <div class="card box"><h3>🏆 Top creators</h3>${leaderHTML(5)}</div>
    <div class="card box"><h3>People you may know</h3>${peopleHTML()}</div>
    <p class="muted" style="padding:0 6px;font-size:12px">Posts are public. Bookmarks are private to you.</p>`);
  const ov=overlayHTML();
  if(!(S.viewer&&$('#overlay video')))$('#overlay').innerHTML=ov;
  if(!ov)$('#overlay').innerHTML='';
  if(key)focusKey(key,caret);
  if(S.uid)NEED.add(S.uid);
  ensureCounts();
  checkPopups();
  document.querySelectorAll('main video').forEach(v=>VIO.observe(v));
  if(playing.length)document.querySelectorAll('main video').forEach(v=>{if(playing.includes(v.src))v.play().catch(()=>{})});
}
let rt=null;const soon=()=>{clearTimeout(rt);rt=setTimeout(render,30)};
function go(view,extra={}){
  if(S.view==='notifications'&&view!=='notifications')S.notifSeenSnapshot=null;
  Object.assign(S,{view,editing:false,...extra});
  if(view==='notifications'&&S.uid){S.notifSeenSnapshot=S.me.seenAt||0;const latest=notifications()[0]?.at||0;if(latest>(S.me.seenAt||0))saveMe({seenAt:latest})}
  let hsh=view==='home'?'':view;
  if(view==='watch'&&S.watchId)hsh='v-'+S.watchId;
  if(view==='profile'&&S.profileId&&S.profileId!==S.uid&&handleOf(S.profileId))hsh='u-'+handleOf(S.profileId);
  if(location.hash.slice(1)!==hsh)history.pushState(null,'',hsh?'#'+hsh:location.pathname+location.search);
  render();window.scrollTo({top:0});
}
function goPost(pid){
  S.viewer=null;S.open.add(pid);
  const p=postById(pid);if(!p)return toast('That post was deleted');
  if(isLong(p))return openWatch(pid);
  go('profile',{profileId:p.author,ptab:'posts'});
  history.replaceState(null,'','#p-'+pid);
  setTimeout(()=>{const el=document.querySelector(`[data-post="${CSS.escape(pid)}"]`);if(el){el.scrollIntoView({behavior:'smooth',block:'center'});el.animate([{boxShadow:'0 0 0 3px var(--accent)'},{boxShadow:'0 0 0 0 transparent'}],{duration:1600})}},60);
}

/* ---------- double-tap to like ---------- */
let lastTap={t:0,id:null};
document.addEventListener('pointerup',e=>{
  if(e.target.closest('video'))return;
  const m=e.target.closest('img.pimg,.vposter');if(!m)return;const art=m.closest('[data-post]');if(!art||!S.uid)return;
  const id=art.dataset.post,now=Date.now();
  if(lastTap.id===id&&now-lastTap.t<320){lastTap={t:0,id:null};
    const h=document.createElement('div');h.className='heartpop';h.textContent='❤';const r=m.getBoundingClientRect();h.style.left=(e.clientX-r.left)+'px';h.style.top=(e.clientY-r.top)+'px';
    const wrap=m.parentElement;wrap.style.position='relative';wrap.appendChild(h);setTimeout(()=>h.remove(),900);
    if(!iLike(id))toggleLike(id);
  }else lastTap={t:now,id};
});

/* ---------- install as an app (phone home screen & computer) ---------- */
let installEvt=null;
const isStandalone=()=>matchMedia('(display-mode: standalone)').matches||navigator.standalone===true;
const isIOS=()=>/iphone|ipad|ipod/i.test(navigator.userAgent)||(navigator.platform==='MacIntel'&&navigator.maxTouchPoints>1);
window.addEventListener('beforeinstallprompt',e=>{e.preventDefault();installEvt=e;soon()});
window.addEventListener('appinstalled',()=>{installEvt=null;toast('Cast is installed! 🎉');soon()});
const canInstall=()=>!isStandalone();
let installHidden=false;try{installHidden=localStorage.getItem('cast_install_hide')==='1'}catch{}
async function doInstall(){
  if(installEvt){installEvt.prompt();const r=await installEvt.userChoice.catch(()=>null);installEvt=null;if(r?.outcome==='accepted')toast('Installing Cast…');return render()}
  S.installHelp=true;render();
}
function installBanner(){
  if(!canInstall()||installHidden)return'';
  return`<div class="card installbar"><img src="icon-192.png" alt=""><div><b>Get the Cast app</b><small>${isIOS()?'Add it to your home screen':'Install it on this device — opens like a real app'}</small></div><button class="btn small" data-act="install">Install</button><button class="iconbtn" data-act="hideinstall" aria-label="Dismiss">✕</button></div>`;
}
function installHelpHTML(){
  const ua=navigator.userAgent,ios=isIOS(),android=/android/i.test(ua),safariMac=/Macintosh/.test(ua)&&/Safari/.test(ua)&&!/Chrome|Edg/.test(ua),firefox=/Firefox/.test(ua);
  const steps=ios?['Tap the <b>Share</b> button <span class="kbd">⬆︎</span> at the bottom (or top) of Safari','Scroll down and tap <b>Add to Home Screen</b>','Tap <b>Add</b> — Cast appears on your home screen']
    :android?['Tap the <b>⋮ menu</b> in the top-right of Chrome','Tap <b>Install app</b> or <b>Add to Home screen</b>','Tap <b>Install</b>']
    :safariMac?['In the menu bar, click <b>File</b>','Click <b>Add to Dock</b>','Cast opens from your Dock like any app']
    :firefox?['Firefox can’t install web apps','Open this page in <b>Chrome</b> or <b>Edge</b>','Then click the install icon ⊕ in the address bar']
    :['Look for the <b>install icon</b> ⊕ at the right end of the address bar','Or open the <b>⋮ menu</b> → <b>Cast → Install</b>','Cast gets its own window and a desktop/Start menu icon'];
  return`<div class="modal" data-act="closeinstall"><div class="card" onclick="event.stopPropagation()"><div style="display:flex;align-items:center;gap:12px;margin-bottom:10px"><img src="icon-192.png" alt="" style="width:52px;height:52px;border-radius:14px"><h2>Install Cast</h2></div>
    <ol class="isteps">${steps.map(x=>`<li>${x}</li>`).join('')}</ol>
    <button class="btn" data-act="closeinstall" style="width:100%">Got it</button></div></div>`;
}

/* ---------- events ---------- */
document.addEventListener('click',async e=>{
  const gpub=e.target.closest('[data-gpub]');if(gpub&&S.groupForm){S.groupForm.pub=gpub.dataset.gpub==='1';S.groupForm.err='';return render()}
  const gp=e.target.closest('[data-gpick]');if(gp&&S.groupForm){if(gp.tagName==='INPUT'){gp.checked?S.groupForm.picked.add(gp.dataset.gpick):S.groupForm.picked.delete(gp.dataset.gpick)}else S.groupForm.picked.delete(gp.dataset.gpick);S.groupForm.err='';return render()}
  if(e.target.closest('.gp'))return;
  const vfm=e.target.closest('[data-vform]');if(vfm&&S.compose.media){S.compose.media.form=vfm.dataset.vform;S.compose.media.auto=false;return render()}
  const sst=e.target.closest('[data-set]');if(sst){const k=sst.dataset.set,v=sst.dataset.val;saveSettings({[k]:v==='true'?true:v==='false'?false:v});return}
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
    case'install':return doInstall();
    case'closeinstall':S.installHelp=false;return render();
    case'hideinstall':installHidden=true;try{localStorage.setItem('cast_install_hide','1')}catch{};return render();
    case'joingroup':e.stopPropagation();return joinGroup(id);
    case'sendmsg':return sendMsg();
    case'reedit':{const m=C.media;if(m?.kind==='image')editPhoto(m.dataUrl||m.url,'none');return}
    case'signout':S.onboard=null;return signOut();
    case'post':return createPost();
    case'like':{const r=toggleLike(id);if(S.viewer){r.then(()=>{const b=$('#overlay .vlike');if(b){b.classList.toggle('on',iLike(id));b.textContent='❤ '+fmtNum(likesFor(id).length)}})}return r}
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
    case'openwatch':return openWatch(id);
    case'openshort':{go('shorts');setTimeout(()=>{const el=document.querySelector(`.short[data-post="${CSS.escape(id)}"]`);if(el){el.scrollIntoView({block:'start'});const p=postById(id);if(p)playShort(p,el)}},60);return}
    case'togglepopups':return enablePopups(!(SET.popups&&('Notification' in window)&&Notification.permission==='granted'));
    case'shorttap':{const p=postById(id);if(!p)return;const v=t.querySelector('video');if(v&&!v.paused){v.pause();return}return playShort(p,t.closest('.short'))}
    case'settingsedit':go('profile',{profileId:S.uid});setTimeout(()=>{const p=prof(S.uid);S.editing=true;S.edit={handle:p.handle||'',displayName:p.displayName||'',bio:p.bio||'',website:p.website||'',color:colorOf(S.uid),usePhoto:!!p.photo};render()},0);return;
    case'watch':{S.viewer=id;render();const p=postById(id);if(p&&isDbVideo(p.media)&&!VCACHE.has(p.media.vid)){await loadVideo(p,false);$('#overlay').innerHTML=''}return render()}
    case'playvid':{const p=postById(id);if(p)loadVideo(p);return}
    case'closeviewer':if(e.target.closest('video'))return;S.viewer=null;$('#overlay').innerHTML='';return render();
    case'gopost':return goPost(id);
    case'copy':{const pp=postById(id);const url=location.origin+location.pathname+(pp&&isLong(pp)?'#v-':'#p-')+id;
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
  if(k==='vtitle'&&S.compose.media){S.compose.media.title=t.value;return}
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
const VIEWS=['shorts','videos','explore','notifications','bookmarks','profile','messages','friends','settings'];
let pendingHash=null;
function fromHash(){
  const h=decodeURIComponent(location.hash.slice(1));
  if(h.startsWith('p-')){pendingHash=h;S.view='home';return}
  if(h.startsWith('u-')){pendingHash=h;S.view='profile';return}
  if(h.startsWith('v-')){S.watchId=h.slice(2);S.view='watch';return}
  if(h==='clips'){S.view='shorts';return}
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
  const list=[...by.values()].filter(a=>a.id!==S.uid&&isFriend(a.id));
  list.sort((a,b)=>(b.unseen-a.unseen)||((following(b.id)?1:0)-(following(a.id)?1:0))||(b.last-a.last));
  return list;
}
function storiesBar(){
  const others=storyAuthors(), mine=storiesBy(S.uid).length;
  if(!others.length&&!mine)return'';
  return`<div class="stories">
    ${S.uid&&canWrite()?`<div class="story-item"><button class="story-ring ${mine?'mine':'add'}" data-act="${mine?'story':'addstory'}" data-id="${esc(S.uid)}">${av(S.uid,'',false)}${mine?'':'<span class="story-plus">+</span>'}</button><span>${mine?'Your story':'Add story'}</span>${mine?`<button class="story-add2" data-act="addstory" aria-label="Add to story">+</button>`:''}</div>`:''}
    ${others.map(a=>`<div class="story-item"><button class="story-ring ${a.unseen?'':'seen'}" data-act="story" data-id="${esc(a.id)}">${av(a.id,'',false)}</button><span>${esc(nameOf(a.id).split(' ')[0])}</span></div>`).join('')}
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
const convoById=cid=>S.convos.find(c=>c.id===cid)||S.publicGroups.find(c=>c.id===cid);
const amMember=c=>!!c&&(c.members||[]).includes(S.uid);
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
  S.groupForm={cid:cid||null,name:c?.name||'',pub:!!c?.public,picked:new Set(c?(c.members||[]).filter(m=>m!==S.uid):[]),q:'',err:''};render();
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
  if(G.picked.size<1&&!G.pub){G.err='Pick at least one person (or make it a public group)';return render()}
  if(G.picked.size>99){G.err="You can add up to 100 people at once";return render()}
  const {fs}=S.fb,now=Date.now();let cid=G.cid;
  const ok=await guard(async()=>{
    const members=[S.uid,...G.picked];
    if(cid){const c=convoById(cid);await fs.setDoc(dref('convos',cid),{members,...(c.owner===S.uid?{public:!!G.pub,...(name?{name}:{})}:{}),updatedAt:now,last:{from:S.uid,text:'updated the group'},read:{[S.uid]:now}},{merge:true})}
    else{cid=newId();await fs.setDoc(dref('convos',cid),{group:true,public:!!G.pub,name,owner:S.uid,members,updatedAt:now,last:{from:S.uid,text:'created the group'},read:{[S.uid]:now}})}
  });
  if(!ok)return;
  S.groupForm=null;toast(G.cid?'Group updated':'Group created');
  stopChat();S.chat={cid,other:null};setTimeout(()=>{listenChat(cid);render()},100);go('messages');
}
async function joinGroup(cid){
  const c=convoById(cid);if(!c||!c.public)return;
  const now=Date.now();
  const ok=await guard(()=>S.fb.fs.setDoc(dref('convos',cid),{members:[...(c.members||[]).filter(m=>m!==S.uid),S.uid],read:{[S.uid]:now}},{merge:true}));
  if(ok){toast(`You joined ${c.name||'the group'}`);setTimeout(()=>focusKey('chat'),200)}
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
    ${canName?`<label class="field">Group name<input data-key="gname" data-g="name" maxlength="40" placeholder="e.g. Weekend crew" value="${esc(G.name)}"></label>
    <div class="field">Who can join?<div class="gtype">
      <button class="${!G.pub?'on':''}" data-gpub="0"><b>🔒 Private</b><small>Only people you add can see and join</small></button>
      <button class="${G.pub?'on':''}" data-gpub="1"><b>🌍 Public</b><small>Anyone can find it and join</small></button></div></div>`:''}
    <div class="field">Add people <span class="hint">${G.picked.size} picked</span>
      <div class="gpicked">${[...G.picked].map(id=>`<button class="chipbtn on" data-gpick="${esc(id)}">${esc(nameOf(id))} ✕</button>`).join('')}</div>
      <input data-key="gq" data-g="q" placeholder="Search people" value="${esc(G.q)}"></div>
    <div class="glist">${list.length?list.map(id=>`<label class="person gp"><input type="checkbox" data-gpick="${esc(id)}" ${G.picked.has(id)?'checked':''}>${av(id,'sm')}<div class="n">${esc(nameOf(id))}${badge(id)}<small>@${esc(handleOf(id))}${following(id)?' · you follow':''}</small></div></label>`).join('')
      :`<p class="muted">No people found. Friends need a Cast account first.</p>`}</div>
    ${G.pub?`<p class="muted" style="margin:-4px 0 0;font-size:13px">Adding people is optional for public groups.</p>`:''}
    ${G.err?`<div class="field"><span class="err">${esc(G.err)}</span></div>`:''}
    <button class="btn" data-act="savegroup">${editing?'Save':'Create group'}</button>
  </div></div>`;
}
function discoverHTML(){
  const list=S.publicGroups.filter(g=>!amMember(g)).sort((a,b)=>(b.members||[]).length-(a.members||[]).length).slice(0,20);
  return`<h3 class="sect">🌍 Public groups</h3>${list.length?`<div class="card" style="overflow:hidden">${list.map(g=>`<div class="notif" data-act="chat" data-id="${esc(g.id)}">${convoAvatar(g)}<div class="txt"><div><b>${esc(g.name||'Group')}</b> <span class="muted">· ${(g.members||[]).length} members</span></div><div class="snip">Active ${ago(g.updatedAt||0)}</div></div><button class="btn small" data-act="joingroup" data-id="${esc(g.id)}">Join</button></div>`).join('')}</div>`
    :`<p class="muted">No public groups to join yet. Make one with <b>New group</b> → Public.</p>`}`;
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
        ${grp?`${convoAvatar(c)}<div class="chat-who" data-act="groupinfo"><b>${esc(c.name||'Group')}</b><small>${c.public?'🌍 Public':'🔒 Private'} · ${mem.length} members · tap for info</small></div>`
        :`${av(o,'sm')}<div class="chat-who" data-profile="${esc(o)}"><b>${esc(nameOf(o))}${badge(o)}</b>${handleOf(o)?`<small>@${esc(handleOf(o))}</small>`:''}</div>`}</div>
      ${grp&&S.groupInfo?`<div class="ginfo"><div class="gmem">${mem.map(m=>`<span class="chipbtn" data-profile="${esc(m)}">${esc(m===S.uid?'You':nameOf(m))}${m===c.owner?' (owner)':''}</span>`).join('')}</div>
        <div style="display:flex;gap:8px;margin-top:10px">${c.owner===S.uid?`<button class="btn small" data-act="editgroup" data-id="${esc(cid)}">Add / remove people</button>`:''}${amMember(c)?`<button class="btn ghost small" data-act="leavegroup" data-id="${esc(cid)}">Leave group</button>`:''}</div></div>`:''}
      <div class="chat-body">${S.msgs.length?S.msgs.map((m,k)=>{const mine=m.from===S.uid,prevSame=k>0&&S.msgs[k-1].from===m.from&&m.createdAt-S.msgs[k-1].createdAt<300000;
        return`${!prevSame?`<div class="chat-time">${ago(m.createdAt)}</div>`:''}${grp&&!mine&&!prevSame?`<div class="bname" data-profile="${esc(m.from)}">${esc(nameOf(m.from))}</div>`:''}<div class="bubble ${mine?'me':''}" data-mkey="m-${esc(m.id)}">${fmt(m.text)}</div>`}).join('')
        :`<div class="empty" style="padding:40px 10px"><div class="big">Say hi 👋</div>${grp?'Only people in this group can see these messages.':'Messages are private — only you two can see them.'}</div>`}</div>
      ${grp&&!amMember(c)?`<div class="chat-input"><button class="btn" style="flex:1" data-act="joingroup" data-id="${esc(cid)}">Join ${esc(c.name||'group')}</button></div>`:canWrite()?`<div class="chat-input"><input data-key="chat" maxlength="1000" placeholder="${grp?`Message ${esc(c.name||'the group')}`:`Message ${esc(nameOf(o).split(' ')[0])}`}…" value="${esc(S.chatDraft)}" autocomplete="off"><button class="btn" data-act="sendmsg" aria-label="Send">${ICON.send}</button></div>`:''}
    </div>`;
  }
  return`<div class="top"><h1>Messages</h1>${canWrite()?`<button class="btn small" data-act="newgroup">${ICON.plus} New group</button>`:''}</div>
    <p class="muted" style="margin:-6px 0 12px">Private — only the people in a chat can read it.</p>
    ${S.convos.length?`<div class="card" style="overflow:hidden">${S.convos.map(c=>{if(!c.group&&!otherOf(c))return'';const un=isUnread(c);
      const who=c.last?.from===S.uid?'You: ':(c.group&&c.last?.from?nameOf(c.last.from).split(' ')[0]+': ':'');
      return`<div class="notif ${un?'new':''}" data-act="chat" data-id="${esc(c.id)}">${convoAvatar(c)}<div class="txt"><div><b>${esc(convoName(c))}</b>${c.group?` <span class="gtag">${c.public?'public':'private'} group</span>`:badge(otherOf(c))} <span class="muted">· ${ago(c.updatedAt||0)}</span></div><div class="snip">${esc(who)}${esc(c.last?.text||'')}</div></div>${un?'<span class="badge" style="align-self:center">new</span>':''}</div>`}).join('')}</div>`
    :`<div class="empty"><div class="big">No messages yet</div>Open someone’s profile and tap <b>Message</b>, or start a <b>New group</b>.</div>`}
    ${discoverHTML()}`;
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

  let unsubMe=null,unsubAdmin=null,unsubF1=null,unsubF2=null,unsubC=null,unsubPG=null,fA=[],fB=[];
  try{await auth.getRedirectResult(authI)}catch{}
  auth.onAuthStateChanged(authI,user=>{
    unsubMe?.();unsubAdmin?.();unsubF1?.();unsubF2?.();unsubC?.();fA=[];fB=[];S.follows=[];S.convos=[];if(!user){unsubPG?.();unsubPG=null;S.publicGroups=[]}S.chat=null;stopChat();
    notifyBase=null;
    S.uid=user?.uid||null;S.googleName=user?.displayName||'';S.photoURL=user?.photoURL||'';
    S.me={seenAt:0,bookmarks:[]};S.isAdmin=false;S.authReady=true;
    if(user){
      unsubMe=fs.onSnapshot(dref('private',user.uid),d=>{if(d.exists()){const v=d.data();S.me={seenAt:+v.seenAt||0,bookmarks:Array.isArray(v.bookmarks)?v.bookmarks:[]}}soon()},()=>{});
      unsubAdmin=fs.onSnapshot(dref('admins',user.uid),d=>{S.isAdmin=d.exists();soon()},()=>{});
      const mergeF=()=>{const m=new Map();[...fA,...fB].forEach(f=>m.set(f.id,f));S.follows=[...m.values()];soon()};
      unsubF1=fs.onSnapshot(fs.query(col('follows'),fs.where('from','==',user.uid),fs.limit(5000)),s=>{fA=s.docs.map(d=>({id:d.id,...d.data()}));mergeF()},e=>console.warn(e));
      unsubPG?.();unsubPG=fs.onSnapshot(fs.query(col('convos'),fs.where('public','==',true),fs.limit(100)),s=>{S.publicGroups=s.docs.map(d=>({id:d.id,...d.data()}));soon()},e=>console.warn(e));
      unsubC=fs.onSnapshot(fs.query(col('convos'),fs.where('members','array-contains',user.uid),fs.limit(200)),s=>{S.convos=s.docs.map(d=>({id:d.id,...d.data()})).sort((a,b)=>(b.updatedAt||0)-(a.updatedAt||0));soon()},e=>console.warn(e));
      unsubF2=fs.onSnapshot(fs.query(col('follows'),fs.where('to','==',user.uid),fs.limit(300)),s=>{fB=s.docs.map(d=>({id:d.id,...d.data()}));mergeF()},e=>console.warn(e));
    }
    render();
  });
})();
