// Cast Guard — checks words and pictures before anything is posted.
// The same core word list is also enforced by the database rules, so it can't be skipped.

// Words and phrases that aren't allowed (profanity, slurs, sexual content, bullying).
const BLOCKED = [
  'fuck','fucking','fucker','fucked','motherfucker','fck','fuk','fuq','wtf','stfu','shit','shitty','bullshit',
  'bitch','bitches','bastard','asshole','dick','dickhead','cock','pussy','cunt','twat','wanker','prick',
  'whore','slut','hoe','thot','fag','faggot','nigger','nigga','retard','retarded','spastic','tranny','chink','spic','kike',
  'porn','porno','nude','nudes','naked','onlyfans','hentai','xxx','boobs','tits','penis','vagina','dildo','horny','sexting',
  'rape','rapist','molest','pedo','pedophile',
  'kys','killyourself','kill yourself','kill urself','go die','hope you die','neck yourself'
];
// Sharing these in public is risky (especially for kids), so Cast Guard stops it.
const PHONE = /(?:\+?\d[\s\-.()]*){9,}\d/;
const EMAIL = /[a-z0-9._%+-]+@[a-z0-9.-]+\.[a-z]{2,}/i;
const ADDRESS = /\b\d{2,6}\s+[a-z]+(?:\s+[a-z]+)?\s+(?:street|st|avenue|ave|road|rd|drive|dr|lane|ln|court|ct|boulevard|blvd)\b/i;

const LEET = {'0':'o','1':'i','!':'i','3':'e','4':'a','@':'a','5':'s','$':'s','7':'t','8':'b','9':'g','+':'t'};
const squash = w => w.replace(/(.)\1+/g,'$1');            // "fuuuuck" -> "fuck"
function normalize(text){
  let t = String(text||'').toLowerCase().normalize('NFKD').replace(/[\u0300-\u036f]/g,'');
  t = t.replace(/[0134@57$8!9+]/g,c=>LEET[c]||c);
  // join letters that were split up: "f.u.c.k" / "f u c k" -> "fuck"
  t = t.replace(/\b(?:[a-z][\s.\-_*]){2,}[a-z]\b/g,m=>m.replace(/[\s.\-_*]/g,''));
  t = t.replace(/[*_]/g,'');
  return squash(t);
}
const WORDS = BLOCKED.map(w=>squash(w.toLowerCase()));
const RX = new RegExp('(?:^|[^a-z])(' + WORDS.map(w=>w.replace(/[.*+?^${}()|[\]\\]/g,'\\$&').replace(/ /g,'\\s*')).join('|') + ')(?=$|[^a-z])');

/**
 * Check some text. kind: 'public' (posts, comments, bios…) or 'private' (DMs).
 * Returns null if OK, or a friendly reason string.
 */
export function checkText(text, kind='public'){
  if(!text) return null;
  const n = normalize(text);
  if(RX.test(n) || RX.test(n.replace(/\s+/g,''))) return 'That has words that aren’t allowed on Cast. Please keep it kind and clean.';
  if(kind==='public'){
    if(EMAIL.test(text)) return 'For your safety, don’t post email addresses publicly. Send it in a private message instead.';
    if(PHONE.test(text)) return 'For your safety, don’t post phone numbers publicly. Send it in a private message instead.';
    if(ADDRESS.test(text)) return 'For your safety, don’t post home addresses.';
  }
  return null;
}

/* ---------------- picture checker (runs on the device) ---------------- */
let modelPromise = null;
function loadScript(src){return new Promise((res,rej)=>{const s=document.createElement('script');s.src=src;s.onload=res;s.onerror=()=>rej(new Error('load '+src));document.head.appendChild(s)})}
function loadModel(){
  if(!modelPromise) modelPromise=(async()=>{
    await loadScript('https://cdn.jsdelivr.net/npm/@tensorflow/tfjs@3.21.0/dist/tf.min.js');
    await loadScript('https://cdn.jsdelivr.net/npm/nsfwjs@2.4.2/dist/nsfwjs.min.js');
    return await window.nsfwjs.load();
  })().catch(e=>{console.warn('Cast Guard picture check unavailable',e);modelPromise=null;return null});
  return modelPromise;
}
const toImg = src => new Promise((res,rej)=>{const i=new Image();i.crossOrigin='anonymous';i.onload=()=>res(i);i.onerror=rej;i.src=src});
/**
 * Check a picture (canvas, image, or image URL / data URL).
 * Returns null if OK (or if the checker couldn't load), or a reason string.
 */
export async function checkImage(src){
  try{
    const model = await Promise.race([loadModel(), new Promise(r=>setTimeout(()=>r(null),20000))]);
    if(!model||!src) return null;
    let el = src;
    if(typeof src==='string') el = await toImg(src);
    const preds = await model.classify(el);
    const p = Object.fromEntries(preds.map(x=>[x.className,x.probability]));
    if((p.Porn||0)+(p.Hentai||0) > 0.6 || (p.Sexy||0) > 0.85) return 'Cast Guard thinks that picture or video isn’t appropriate, so it can’t be posted.';
    return null;
  }catch(e){ console.warn('picture check failed',e); return null; }
}
// start downloading the checker early (only when someone is about to post a picture)
export function warmUpImageCheck(){ loadModel(); }
