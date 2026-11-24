'use strict';
/* Hollow Pines — story, player, weapons, animals, the Tall Man, menu */
const $ = id => document.getElementById(id);
const cv = $('game');
if (touch) document.body.classList.add('touch');
let KEYN = touch ? 'USE' : 'E';
const saveSettings = () => { try { localStorage.setItem('hollowPinesSettings', JSON.stringify(settings)); } catch (e) {} };
const wait = ms => new Promise(r => setTimeout(r, ms));
const FW = new THREE.Vector3(), TV = new THREE.Vector3();
const fmtT = s => { s = Math.floor(s); const m = Math.floor(s / 60); return m + ':' + String(s % 60).padStart(2, '0'); };

// ================= STATE =================
const PKEYS = ['sgas', 'ch1done', 'ch2done', 'med', 'obj', 'poured', 'picked', 'carry', 'key', 'fuse', 'fuseIn', 'power', 'guns', 'am', 'wep', 'ammo', 'notes', 'time', 'hasLight', 'deaths', 'done', 'h1', 'valves', 'acid', 'grates'];
const fresh = () => ({ sgas: [], ch1done: false, ch2done: false, med: [], obj: 0, poured: 0, picked: [0, 0, 0, 0], carry: -1, key: false, fuse: false, fuseIn: false, power: false, guns: { pistol: false, shotgun: false, flare: false }, am: { p: 0, pr: 0, s: 0, sr: 0 }, wep: 'none', ammo: [], notes: [], time: 0, hasLight: false, deaths: 0, done: false, h1: false, valves: [], acid: false, grates: [] });
const G = Object.assign({ mode: 'boot', slot: 0, surviveT: 0, glimpseAt: 0, tips: {}, gateOpen: false, wolfT: 60, ambT: 8, cricketT: 1 }, fresh());
const P = { inHeli: false, x: 0, z: 5, y: 0, yaw: 0, pitch: 0, stam: 100, tired: false, hp: 100, hurtT: 9, onTower: false, inTunnel: false, light: false, overheat: 0, ohMax: 6, bob: 0, stepAcc: 0, look: null, cy: 0, cv: 0, shake: 0 };
const C = { state: 'off', x: 0, z: 0, timer: 0, seen: 0, burn: 0, pain: 0, stag: 0, aggr: 0, final: false, scripted: false, rush: false, ph: 0, stepT: 0, stung: false, s: 0, cy: 0, chaseT: 0, mode: 'idle', tw: { z: 0, y: 0, tz: 0, ty: 0, t: 0 }, speed: 0 };
const cr = makeCreature();
let CP = null;

// ================= SAVES (3 slots) =================
const SK = i => 'hollowPinesSlot' + i;
const readSlot = i => { try { return JSON.parse(localStorage.getItem(SK(i)) || 'null'); } catch (e) { return null; } };
const writeSlot = (i, d) => { try { localStorage.setItem(SK(i), JSON.stringify(d)); if (d && d.obj >= 16 && !d.ch2done) localStorage.setItem('hollowPinesCh2_' + i, JSON.stringify(d)); } catch (e) {} };
const readCh2 = i => { try { const d = JSON.parse(localStorage.getItem('hollowPinesCh2_' + i) || 'null'); return d && d.obj >= 16 && !d.ch2done ? d : null; } catch (e) { return null; } };
const clearCh2 = i => { try { localStorage.removeItem('hollowPinesCh2_' + i); } catch (e) {} };
const delSlot = i => { try { localStorage.removeItem(SK(i)); localStorage.removeItem('hollowPinesCh2_' + i); } catch (e) {} };
function snapshot() { const o = {}; PKEYS.forEach(k => o[k] = JSON.parse(JSON.stringify(G[k]))); o.x = P.x; o.z = P.z; o.yaw = P.yaw; o.tower = P.onTower; o.updated = Date.now(); return o; }
function checkpoint() { CP = snapshot(); writeSlot(G.slot, CP); try { const st = JSON.parse(localStorage.getItem('hollowPinesStats') || '{}'); st.best = Math.max(st.best || 0, G.obj); if (G.done) st.escaped = (st.escaped || 0); localStorage.setItem('hollowPinesStats', JSON.stringify(st)); } catch (e) {} }

// ================= STORY =================
const CHAP = ['Chapter 1 — The Caretaker', 'Chapter 2 — The Tower', 'Chapter 3 — The Tall Man', 'Chapter 4 — The Run', 'Chapter 5 — The Signal'];
const CANP = [[L.truck.x + 2.4, L.truck.z + 3.4], [L.cabin.x + 1.8, L.cabin.z + 3.9], [L.log.x + 3.6, L.log.z + 2.8], [LK.x + LD.x * 50.5 + LD.z * 1.5, LK.z + LD.z * 50.5 - LD.x * 1.5]];
function nearestCan() { let b = null, bd = 1e9; CANP.forEach(([x, z], i) => { if (G.picked[i]) return; const d = Math.hypot(x - P.x, z - P.z); if (d < bd) { bd = d; b = { x, z }; } }); return b; }
const FUSEPT = { x: T.x + 2, z: T.z + 3.1 };
const OBJ = [
  [0, 'Read Mr. Harlan’s letter at the campsite', () => ({ x: 2.6, z: 0.6 })],
  [0, 'Grab Harlan’s pistol from the tool shed', () => W.shed1],
  [0, () => G.carry >= 0 ? 'Carry the fuel can back to the generator' : `Find fuel cans for the generator (${G.poured}/4)`, () => G.carry >= 0 ? L.gen : nearestCan()],
  [0, 'Pull the generator’s starter cord', () => L.gen],
  [1, 'Check on the radio tower to the north', () => FUSEPT],
  [1, 'Find a spare fuse at the lookout shed, west of the tower', () => W.shed2],
  [1, 'Put the fuse in the tower’s fuse box', () => FUSEPT],
  [1, 'Climb the tower and use the radio', () => P.onTower ? { x: T.x, z: T.z - 1 } : { x: T.x, z: T.z + 3.1 }],
  [2, 'Find the ranger station to the west', () => ({ x: R.x + 6.4, z: R.z })],
  [2, 'Find the spare key at the chapel graveyard', () => ({ x: Gv.x + 6, z: Gv.z + 5.6 })],
  [2, 'Get back to the ranger station', () => ({ x: R.x + 6.4, z: R.z })],
  [3, 'RUN! Follow the red arrows!', () => ({ x: L.tunnel.x, z: L.tunnel.z - 2 })],
  [3, 'Get through the tunnel!', () => tPoint(TLEN)],
  [4, 'Fire the flare gun on the helipad', () => Hp],
  [4, 'Survive until the helicopter gets here', () => Hp],
  [4, 'Grab the rope ladder and CLIMB!', () => Hp],
  [5, 'Talk to the pilot', () => null],
  [5, 'Check the back of the helicopter', () => null],
  [5, 'JUMP out the door!', () => null],
  [5, 'Get out of the water — reach dry land', () => ({ x: SW.x + 16, z: SW.z - 8 })],
  [5, 'Find the helicopter crash site', () => W.crash],
  [5, 'Search the helicopter wreck', () => W.crash],
  [5, 'Follow the blood trail', () => W.nest],
  [5, () => `Find gas for the pump station (${G.sgas.length}/2) — houseboat & stilt village`, () => nearestGas()],
  [5, 'Get to the old pump station (south-east)', () => W.pump],
  [5, 'Fuel and start the pump station generator', () => W.pumpGen],
  [5, 'Survive until the ranger sees the floodlights', () => W.pump],
  [5, 'RUN to the fishing shack dock!', () => ({ x: W.shack.x, z: W.shack.z + 2.2 })],
  [5, () => `Open the flood valves out in the deep water (${(G.valves || []).length}/5)`, () => nearestValve()],
  [5, 'Grab a jug of acid from the pump house', () => ACIDJ],
  [5, 'Pour the acid into the water by the intake', () => POURP],
  [5, 'SHOOT IT IN THE HEAD!', () => null],
  [5, 'Get to the fishing shack dock — west, past the old water tower', () => ({ x: W.shack.x, z: W.shack.z + 2.2 })],
  [5, () => `Pull the rotten gunk out of the clogged grates (${(G.grates || []).length}/3)`, () => nearestGrate()]
];
const LETTER = `Kid —

Thanks for looking after Hollow Pines while I’m away on vacation. Just a few chores:

1. My pistol is in the tool shed past the old car. Keep it on you. The wolves get bold after dark.
2. Keep the generator fueled. I left cans at my truck, the hunting cabin, the logging site and the lake dock.
3. Check the radio tower every night.

One more thing. If you see a tall man standing in the trees, don’t stare at him. Shine a light on him and walk away. Never let him get close.

— Old Harlan`;
const NOTES = [
  { x: -4.6, z: -0.9, t: 'Caretaker’s log, night 1:\n\nSomething walked around the tent last night. The steps were too far apart to be a person.\n\nHarlan said the wolves were the only thing to worry about. I don’t think he told me everything.' },
  { x: L.truck.x - 2.2, z: L.truck.z + 2.2, t: 'Harlan’s truck. The keys are still in it.\n\nWhy would a man go on vacation without his truck?' },
  { x: L.cabin.x - 1.4, z: L.cabin.z + 4.2, t: 'Hunting log — H.\n\nSomething keeps taking the deer and hanging them high in the branches.\nNothing I know of climbs like that.\n\nLeft my old shotgun in the lookout shed by the tower.' },
  { x: L.log.x - 2, z: L.log.z + 3, t: 'Crew report: shift cancelled.\n\nDale saw a man in the tree line with arms down to his knees. When Dale hit him with the floodlight, he flinched and backed into the dark.\n\nLight bothers it. Bullets slow it down. Nothing stops it.' },
  { x: CANP[3][0] - LD.z * 2.5, z: CANP[3][1] + LD.x * 2.5, t: 'Left the last fuel can by the dock.\n\nIf you’re reading this, keep the generator running and stay near the light.\n— H.' },
  { x: T.x - 3.2, z: T.z + 4.6, t: 'Tower maintenance: the fuse keeps blowing.\nSpares are in the lookout shed, west along the trail.\n— Ranger R.' },
  { x: Gv.x + 2.5, z: Gv.z + 9, t: 'The chapel rang its bell every night so the town knew to stay inside.\nThen the bell ringer went missing.\n\nThey found his lantern by the well. Just the lantern.' },
  { x: W.shed3.x, z: W.shed3.z + 1.9, t: 'If he chases you, go underground.\nThe old mine tunnel by the ranger station runs all the way to the helipad.\n\nHe’s too tall for the tunnel.\nI hope.' }
];
const SGAS = [{ x: W.houseboat.x - 1.5, z: W.houseboat.z - 0.4, y: 1.0 }, { x: W.village.x + 12, z: W.village.z - 6.5, y: 1.56 }];
function nearestGas() { let b = null, bd = 1e9; SGAS.forEach((g, i) => { if (G.sgas.includes(i)) return; const d = Math.hypot(g.x - P.x, g.z - P.z); if (d < bd) { bd = d; b = g; } }); return b; }
NOTES.push(
  { x: W.houseboat.x + 0.5, z: W.houseboat.z + 0.6, y: 1.0, t: 'Fisherman’s diary.\n\nThe tall one came down from the pines last fall. Walked right across the water like it was a road.\n\nIt doesn’t eat the gators. The gators get out of its way.\n\nI’m taking the skiff to Millbrook in the morning. If I can find the paddle.' },
  { x: W.village.x + 0.5, z: W.village.z - 0.6, y: 1.56, t: 'EVACUATION NOTICE\nBayou Hollow Village\n\nAll residents must leave by order of the county.\n\nPeople keep reporting a tall figure standing in the water at night, smiling up at their windows.\n\nDO NOT open your doors after dark.' },
  { x: W.pump.x + 2.4, z: W.pump.z + 3.4, t: 'Pump Station 4 — maintenance\n\nGenerator runs the floodlights and the siren. Tank holds two cans.\n\nIf the siren ever sounds and you didn’t start it… get inside and lock the door.' },

  { x: L.oldcamp.x + 1.2, z: L.oldcamp.z - 1.6, t: 'Jess’s journal.\n\nDay 2. Marco went to Harlan’s barn by the old truck to look for gas. That was an hour ago.\n\nSomething keeps circling the tent. It’s so tall it has to duck under the branches.\n\nIf anyone finds this: the light keeps it away. Don’t let your flashlight die.' },
  { x: L.barn.x - 1, z: L.barn.z + 2.6, t: 'Jess —\n\nThe barn is empty except for Harlan’s suitcases. ALL of them. Packed.\n\nHe never left on any vacation.\n\nI left his first aid kit here for you. I’m heading back to the tent. If I’m not there, run.\n— Marco' },
  { x: L.stand.x + 1.5, z: L.stand.z + 2.6, t: 'Stand log — H.\n\nSaw it again tonight from up here. It doesn’t walk like a man.\nIt walks like something pretending to be one.\n\nThere’s another one too. Smaller. It just stands and stares. It never comes closer. I don’t know which one scares me more.' }
);
const MEDS = [
  { x: W.houseboat.x - 2.2, z: W.houseboat.z + 0.8, yo: 0.6 }, { x: W.village.x + 4, z: W.village.z + 11, yo: 1.56 }, { x: W.pump.x + 3.5, z: W.pump.z + 3.2 }, { x: W.nest.x + 1.8, z: W.nest.z + 1.2 },
  { x: L.oldcamp.x - 1.2, z: L.oldcamp.z + 2 }, { x: L.barn.x + 1.2, z: L.barn.z + 2.4 }, { x: L.cabin.x + 2.8, z: L.cabin.z + 3.9, yo: 0.2 }, { x: R.x + 6.6, z: R.z - 1.5, yo: 0.25 },
  { x: T.x + 3.2, z: T.z + 4 }, { x: W.shed3.x, z: W.shed3.z + 0.9 }, { x: W.crash.x + 4.5, z: W.crash.z - 2 }, { x: L.hatch.x - 2, z: L.hatch.z + 1.5 }, { x: L.stand.x - 1.8, z: L.stand.z + 1.6 }
];
const AMMO = [
  { x: W.shed1.x + 0.6, z: W.shed1.z, y: W.shed1.y, t: 'p', n: 12 }, { x: L.truck.x + 2.6, z: L.truck.z + 1.2, t: 'p', n: 12 }, { x: L.cabin.x - 1.8, z: L.cabin.z + 3.9, t: 'p', n: 12, yo: 0.2 },
  { x: L.log.x + 2.5, z: L.log.z + 1.5, t: 'p', n: 12, yo: 0.6 }, { x: CANP[3][0] + LD.z * 2, z: CANP[3][1] - LD.x * 2, t: 'p', n: 12 }, { x: W.shed2.x + 0.6, z: W.shed2.z, y: W.shed2.y, t: 's', n: 6 },
  { x: T.x - 2.6, z: T.z + 3.6, t: 'p', n: 12 }, { x: R.x + 6.4, z: R.z + 2.6, t: 'p', n: 12, yo: 0.25 }, { x: R.x + 6.4, z: R.z - 2.6, t: 's', n: 6, yo: 0.25 },
  { x: W.shed3.x - 0.5, z: W.shed3.z, y: W.shed3.y, t: 'p', n: 12 }, { x: W.shed3.x + 0.5, z: W.shed3.z, y: W.shed3.y, t: 's', n: 6 }, { x: L.tunnel.x + 2.8, z: L.tunnel.z - 4.5, t: 'p', n: 12 },
  { x: L.hatch.x + 2.2, z: L.hatch.z + 2, t: 's', n: 6 }, { x: Gv.x + 1, z: Gv.z - 2, t: 'p', n: 12 },
  { x: L.oldcamp.x + 2.4, z: L.oldcamp.z + 0.5, t: 'p', n: 12 }, { x: W.houseboat.x - 2.8, z: W.houseboat.z - 0.8, y: 1.0, t: 'p', n: 12 }, { x: W.village.x + 4.5, z: W.village.z + 10.4, y: 1.56, t: 's', n: 6 }, { x: W.pump.x - 3, z: W.pump.z + 3.2, t: 'p', n: 12 }, { x: W.nest.x - 1.5, z: W.nest.z + 1.6, t: 'p', n: 12 }, { x: W.crash.x + 5, z: W.crash.z + 1, t: 's', n: 6 }, { x: L.barn.x + 3.4, z: L.barn.z - 2.6, t: 's', n: 6, yo: 0.95 }, { x: L.stand.x + 1.6, z: L.stand.z - 1.6, t: 'p', n: 12 }
];

// ================= WORLD ITEMS =================
const IT = [];
const addIt = o => { IT.push(Object.assign({ r: 2.2, hold: 0, tower: false, tunnel: false, heli: false }, o)); return o; };
const cans = CANP.map(([x, z], i) => { const c = makeCan(); c.position.set(x, H(x, z) + (i === 1 ? 0.2 : 0), z); c.rotation.y = i * 1.7; scene.add(c); c.userData.gl = glint(x, c.position.y + 0.7, z); return c; });
const ammoM = AMMO.map(a => { const m = makeAmmo(); const y = a.y != null ? a.y : H(a.x, a.z) + (a.yo || 0); m.position.set(a.x, y, a.z); m.rotation.y = rand() * 6; scene.add(m); m.userData.gl = glint(a.x, y + 0.45, a.z); return m; });
const noteM = NOTES.map(n => { const m = bx(0.22, 0.012, 0.3, MAT.paper, n.x, (n.y != null ? n.y : H(n.x, n.z)) + 0.03, n.z); m.rotation.y = rand() * 6; m.userData.gl = glint(n.x, m.position.y + 0.4, n.z); return m; });
const pistolPick = makePistol(); pistolPick.position.set(W.shed1.x - 0.3, W.shed1.y + 0.02, W.shed1.z); pistolPick.rotation.set(0, 1.3, Math.PI / 2); scene.add(pistolPick); pistolPick.userData.gl = glint(W.shed1.x - 0.3, W.shed1.y + 0.4, W.shed1.z);
const shotPick = makeShotgun(); shotPick.position.set(W.shed2.x - 0.4, W.shed2.y + 0.03, W.shed2.z); shotPick.rotation.set(0, 1.5, Math.PI / 2); scene.add(shotPick); shotPick.userData.gl = glint(W.shed2.x - 0.4, W.shed2.y + 0.4, W.shed2.z);
const fusePick = bx(0.08, 0.04, 0.04, MAT.red, W.shed2.x + 0.1, W.shed2.y + 0.02, W.shed2.z + 0.15); fusePick.userData.gl = glint(W.shed2.x + 0.1, W.shed2.y + 0.35, W.shed2.z + 0.15);
const flarePick = makeFlareGun(); flarePick.position.set(R.x + 5.6, H(R.x, R.z) + 0.3, R.z + 0.9); flarePick.visible = false; scene.add(flarePick);

function hideItem(m) { m.visible = false; if (m.userData.gl) m.userData.gl.visible = false; }
function showItem(m, v) { m.visible = v; if (m.userData.gl) m.userData.gl.visible = v; }

addIt({ x: 2.6, z: 0.6, label: 'Read the letter', cond: () => G.obj === 0, act: () => { G.hasLight = true; P.light = true; W.letter.visible = false; W.flashPick.visible = false; W.letterGl.visible = false; SND.pickup(); openNote(LETTER, () => { say('A flashlight too. Good.', 2.6, 'You'); say('Tool shed first. Then fuel for the generator.', 3.2, 'You'); tip('light', touch ? 'Tap LIGHT to switch the flashlight on and off.' : 'Press F to switch the flashlight on and off.'); }); setObj(1); } });
addIt({ x: W.shed1.x - 0.3, z: W.shed1.z, label: 'Take Harlan’s pistol', cond: () => !G.guns.pistol, act: () => { G.guns.pistol = true; G.am.p = 12; G.am.pr = Math.max(G.am.pr, 12); hideItem(pistolPick); SND.reload(); equip('pistol'); say('Harlan’s pistol. Twelve rounds loaded.', 3, 'You'); tip('gun', touch ? 'FIRE to shoot, RELOAD to reload, SWAP to change weapons.' : 'Click to shoot · R to reload · Q or 1-3 to switch weapons.'); if (G.obj === 1) setObj(2); else checkpoint(); } });
CANP.forEach(([x, z], i) => addIt({ x, z, label: 'Pick up the fuel can', cond: () => G.obj === 2 && !G.picked[i] && G.carry < 0, act: () => { G.picked[i] = 1; G.carry = i; hideItem(cans[i]); W.fpCan.visible = true; SND.clink(); say(['Got one. Back to the generator.', 'Heavy… still half full.', 'Found it.', 'The last can.'][i], 3, 'You'); checkpoint(); refreshObj(); } }));
addIt({ x: L.gen.x, z: L.gen.z, r: 2.6, label: 'Pour in the fuel', hold: 1.6, cond: () => G.obj === 2 && G.carry >= 0, act: pour });
addIt({ x: L.gen.x, z: L.gen.z, r: 2.6, label: 'Pull the starter cord', cond: () => G.obj === 3, act: startGen });
addIt({ x: FUSEPT.x, z: FUSEPT.z, label: 'Check the fuse box', cond: () => G.obj === 4, act: () => { SND.door(); say('The fuse is gone. No power is getting up the tower.', 3.4, 'You'); say('There’s a note… spare fuses in the lookout shed, west of here.', 3.6, 'You'); setObj(5); } });
addIt({ x: FUSEPT.x, z: FUSEPT.z, label: 'Put in the fuse', hold: 1.2, cond: () => G.obj === 6, act: () => { G.fuseIn = true; SND.unlock(); applyPower(); SND.clang(); say('Lights are on. Now the radio.', 3, 'You'); setObj(7); } });
addIt({ x: W.shed2.x + 0.1, z: W.shed2.z, label: 'Take the fuse', cond: () => G.obj === 5, act: () => { G.fuse = true; hideItem(fusePick); SND.pickup(); say('Got a fuse.', 2, 'You'); setObj(6); } });
addIt({ x: W.shed2.x - 0.4, z: W.shed2.z, label: 'Take the shotgun', cond: () => !G.guns.shotgun, act: () => { G.guns.shotgun = true; G.am.s = 6; G.am.sr = Math.max(G.am.sr, 6); hideItem(shotPick); SND.reload(); equip('shotgun'); say('Harlan’s old shotgun. That’ll stop a wolf.', 3, 'You'); checkpoint(); } });
addIt({ x: T.x, z: T.z + 3.1, label: 'Climb the ladder', cond: () => !P.onTower && G.obj >= 4, act: () => { if (G.obj < 7) { say('No power up there yet. Fix the fuse box first.', 3, 'You'); return; } climb(true); } });
addIt({ x: T.x, z: T.z + 1.2, r: 1.3, tower: true, label: 'Climb down', cond: () => G.obj !== 7, act: () => climb(false) });
addIt({ x: T.x, z: T.z - 1.0, r: 1.6, tower: true, label: 'Use the radio', cond: () => G.obj === 7, act: radioScene });
addIt({ x: R.x + 6.4, z: R.z, label: 'Open the door', cond: () => G.obj === 8, act: () => { SND.door(); openNote('LOCKED.\n\nA note is pinned to the door:\n\n“Spare key is on the well behind the old chapel, south of here. Don’t go there at night.\n— Ranger R.”'); setObj(9); } });
addIt({ x: R.x + 6.4, z: R.z, label: 'Unlock the door', hold: 1.2, cond: () => G.obj === 10, act: bigChase });
addIt({ x: Gv.x + 6, z: Gv.z + 5.4, r: 2.4, label: 'Take the key', cond: () => G.obj === 9, act: () => { G.key = true; W.key.visible = false; W.keyGl.visible = false; SND.pickup(); setObj(10); scriptedChase(); } });
addIt({ x: L.tunnel.x, z: L.tunnel.z - 2.2, r: 2.8, label: 'Get into the tunnel', cond: () => G.obj === 11, act: () => enterTunnel(false) });
{ const gp = tPoint(GATE_S - 0.8); addIt({ x: gp.x, z: gp.z, r: 1.8, tunnel: true, label: 'Force the gate open', hold: 1.4, cond: () => !G.gateOpen, act: () => { G.gateOpen = true; SND.gate(); remark('It’s open! GO!'); } }); }
{ const ep = tPoint(TLEN - 1); addIt({ x: ep.x, z: ep.z, r: 1.8, tunnel: true, label: 'Climb out', hold: 0.7, cond: () => G.obj === 12, act: exitTunnel }); }
addIt({ x: Hp.x, z: Hp.z, r: 9, label: 'Fire the flare gun', cond: () => G.obj === 13, act: fireFlare });
addIt({ x: Hp.x, z: Hp.z + 0.6, r: 2.6, label: 'Grab the rope ladder', cond: () => G.obj === 15 && heli.ready, act: startClimb });
const medM = MEDS.map(a => { const m = W.makeMedkit(); const y = a.yo > 1 ? a.yo : H(a.x, a.z) + (a.yo || 0); m.position.set(a.x, y, a.z); m.rotation.y = rand() * 6; scene.add(m); m.userData.gl = glint(a.x, y + 0.5, a.z); return m; });
MEDS.forEach((a, i) => addIt({ x: a.x, z: a.z, r: 2, label: () => P.hp >= 100 ? 'First aid kit (you’re not hurt)' : 'Use the first aid kit', cond: () => !G.med.includes(i), act: () => { if (P.hp >= 100) { hint('You’re not hurt. Save it for later.'); return; } G.med.push(i); hideItem(medM[i]); SND.pickup(); P.hp = Math.min(100, P.hp + 60); $('hurt').style.opacity = clamp((100 - P.hp) / 140, 0, 0.6); remark(['That’s better.', 'Okay… okay. I can keep going.', 'Patched up.']); } }));
AMMO.forEach((a, i) => addIt({ x: a.x, z: a.z, r: 2, label: a.t === 'p' ? 'Take pistol ammo' : 'Take shotgun shells', cond: () => !G.ammo.includes(i), act: () => { G.ammo.push(i); hideItem(ammoM[i]); SND.pickup(); if (a.t === 'p') G.am.pr += a.n; else G.am.sr += a.n; hint(`+${a.n} ${a.t === 'p' ? 'pistol rounds' : 'shotgun shells'}`); remark(['Ammo. Good.', 'I’ll take that.', 'More ammo.'], 0.6); } }));
addIt({ x: -0.6, z: -1.9, r: 1.3, heli: true, label: 'Talk to the pilot', cond: () => G.obj === 16 && !CH2.talked, act: () => { CH2.talked = true; pilotTalk(); } });
addIt({ x: 0, z: 2.2, r: 1.2, heli: true, label: 'Look out the back window', cond: () => G.obj === 17, act: backWindowScene });
addIt({ x: 1.15, z: 0.1, r: 1.2, heli: true, label: 'JUMP!', cond: () => G.obj === 18, act: jumpOut });
addIt({ x: W.shack.x, z: W.shack.z + 2.2, r: 2.6, label: 'Get inside!', hold: 0.5, cond: () => G.obj === 27, act: ch2End });
addIt({ x: W.crash.x + 2, z: W.crash.z + 2, r: 5, label: 'Search the wreck', hold: 1.2, cond: () => G.obj === 21, act: () => { SND.clink(); openNote('Pilot’s logbook — R. Dale, Millbrook Medevac\n\nLast entry: “Pickup at Hollow Pines. Caller says something has been following him for a week.”\n\nScribbled underneath, shaky:\n“Bayou Ranger Post 9 — channel 4. If you ever go down over the swamp, call them.”', () => { say('His radio’s not here. And that blood…', 3, 'You'); say('Something dragged him off. I have to follow the trail.', 3.4, 'You'); }); setObj(22); } });
addIt({ x: W.nest.x - 0.4, z: W.nest.z - 0.2, r: 2.4, label: 'Take the pilot’s radio', cond: () => G.obj === 22, act: () => { W.radioItem.visible = false; W.radioItem.userData.gl.visible = false; SND.pickup(); radioScene2(); } });
SGAS.forEach((gp, i) => { const c = makeCan(); c.position.set(gp.x, gp.y, gp.z); scene.add(c); W.swamp.attach(c); c.userData.gl = glint(gp.x, gp.y + 0.7, gp.z); gp.m = c; addIt({ x: gp.x, z: gp.z, r: 2.2, label: 'Take the gas can', cond: () => G.obj === 23 && !G.sgas.includes(i), act: () => { G.sgas.push(i); hideItem(c); SND.clink(); if (G.sgas.length >= 2) { say('That’s both cans. Now the pump station — south-east.', 3.4, 'You'); setObj(24); } else { say('One can. The other one should be in the ' + (i === 0 ? 'stilt village.' : 'houseboat.'), 3.4, 'You'); checkpoint(); refreshObj(); } } }); });
addIt({ x: W.pumpGen.x, z: W.pumpGen.z, r: 2.6, label: 'Pour the gas and start the generator', hold: 2, cond: () => G.obj === 25 || (G.obj === 24 && Math.hypot(P.x - W.pump.x, P.z - W.pump.z) < 16), act: startPump });
NOTES.forEach((n, i) => addIt({ x: n.x, z: n.z, r: 1.9, label: 'Read the note', cond: () => true, act: () => { if (!G.notes.includes(i)) G.notes.push(i); noteM[i].userData.gl.visible = false; SND.ui(); openNote(n.t, () => remark(['Creepy…', 'Okay. That’s not good.', 'I really wish I hadn’t read that.'], 0.7)); } }));

// ================= VOICE (you can hear yourself talk) =================
const VOICE = { ok: 'speechSynthesis' in window && 'SpeechSynthesisUtterance' in window };
// pick the most human-sounding voice the device has (natural / neural / premium voices first, novelty robot voices never)
const ROBOT = /albert|bad news|bahh|bells|boing|bubbles|cellos|deranged|good news|hysterical|jester|organ|superstar|trinoids|whisper|wobble|zarvox|fred|junior|ralph|kathy|princess|espeak|robot|grandma|grandpa|rocko|shelley|flo|eddy|reed|sandy/i;
const MALE = /\bmale\b|guy|davis|andrew|brian|christopher|eric|roger|steffan|ryan|thomas|david|mark|george|james|liam|william|connor|alex\b|aaron|daniel|tom\b|evan|nathan|arthur|gordon|rishi|oliver|lee\b|en-us-x-io[lm]|en-us-x-tpd|en-gb-x-rj|en-gb-x-gb[bd]|en-au-x-au[bd]/i;
const FEMALE = /female|samantha|karen|moira|tessa|victoria|allison|ava\b|susan|zoe|nicky|aria|jenny|sonia|libby|zira|hazel|emma|michelle|ana\b|natasha|clara|catherine|fiona|serena|kate|joanna|salli|kimberly|ivy|amy|olivia|sara|nancy|jane|en-us-x-sfg|en-us-x-tp[cf]|google us english$/i;
const isMale = v => MALE.test(v.name) && !/female/i.test(v.name);
function voiceScore(v) {
  const n = v.name; let s = 0; if (isMale(v)) s += 150; else if (FEMALE.test(n)) s -= 150;
  if (/natural/i.test(n)) s += 100; if (/neural|online/i.test(n)) s += 60; if (/premium/i.test(n)) s += 70; if (/enhanced/i.test(n)) s += 50; if (/siri/i.test(n)) s += 45;
  if (/google/i.test(n)) s += 35; 
  if (/en-US/i.test(v.lang)) s += 12; else if (/en-(GB|AU|IE|CA)/i.test(v.lang)) s += 6;
  if (!v.localService) s += 8; if (ROBOT.test(n)) s -= 500; return s;
}
function loadVoices() {
  if (!VOICE.ok) return; VOICE.bad = VOICE.bad || new Set();
  const all = speechSynthesis.getVoices(); const v = all.filter(x => /^en/i.test(x.lang) && !ROBOT.test(x.name) && !VOICE.bad.has(x.name)).sort((a, b) => voiceScore(b) - voiceScore(a));
  const picked = settings.voiceName && v.find(x => x.name === settings.voiceName);
  VOICE.you = picked || v[0] || null; VOICE.list = v; VOICE.radio = v.find(x => x !== VOICE.you && isMale(x) && voiceScore(x) > 20) || v.find(x => x !== VOICE.you && voiceScore(x) > 20) || v[1] || VOICE.you; VOICE.pilot = v.find(x => x !== VOICE.you && x !== VOICE.radio && voiceScore(x) > 20) || VOICE.radio;
  fillVoicePick();
  VOICE.local = v.find(x => x.localService && isMale(x)) || v.find(x => x.localService) || null; VOICE.count = all.length;
}
if (VOICE.ok) { loadVoices(); try { speechSynthesis.onvoiceschanged = loadVoices; if (speechSynthesis.addEventListener) speechSynthesis.addEventListener('voiceschanged', loadVoices); } catch (e) {} setTimeout(loadVoices, 600); setTimeout(loadVoices, 2500); }
// Chrome/Edge/Safari speech is fragile: a line spoken right after cancel() can be dropped, some online voices never start,
// and synthesis can get stuck "paused". So: wait a beat after cancelling, resume, and if a voice doesn't start, mark it bad and retry with another.
function fillVoicePick() { const sel = document.getElementById('sVoicePick'); if (!sel || !VOICE.list) return; sel.innerHTML = '';
  if (!VOICE.list.length) { const o = document.createElement('option'); o.textContent = 'No voices found on this device'; sel.appendChild(o); return; }
  VOICE.list.forEach((x, i) => { const o = document.createElement('option'); o.value = x.name; o.textContent = (i === 0 ? '★ ' : '') + x.name.replace(/ - English.*$/, '').replace(/^Microsoft /, '') + (isMale(x) ? ' (man)' : FEMALE.test(x.name) ? ' (woman)' : '') + (/natural|neural|premium|enhanced/i.test(x.name) ? ' · best quality' : ''); sel.appendChild(o); });
  sel.value = VOICE.you ? VOICE.you.name : ''; }
function speakLine(clean, who, opts, tries) {
  const radio = who !== 'You'; let v = who === 'Pilot' ? VOICE.pilot : radio ? VOICE.radio : VOICE.you;
  if (tries > 0) v = tries === 1 ? VOICE.local : null;
  const u = new SpeechSynthesisUtterance(clean); if (v) { u.voice = v; u.lang = v.lang; } else u.lang = 'en-US';
  u.pitch = v && isMale(v) ? opts.pitch * 0.94 : opts.pitch * 0.7; // no male voice on this device: pitch a default voice way down so it still sounds like a man
  u.pitch = Math.max(0.1, u.pitch); u.rate = opts.rate; u.volume = opts.vol; let started = false; VOICE.cur = u;
  u.onstart = () => { started = true; VOICE.works = true; if (opts.id === VOICE.line) VOICE.lineStarted = true; };
  u.onend = () => { if (opts.id === VOICE.line && VOICE.cur === u) VOICE.lineOn = false; };
  const retry = () => { if (started || VOICE.cur !== u) return; if (tries >= 2) { if (opts.id === VOICE.line) VOICE.lineOn = false; return; } if (v && v !== VOICE.local) { VOICE.bad.add(v.name); loadVoices(); } VOICE.cur = null; try { speechSynthesis.cancel(); } catch (e) {} setTimeout(() => speakLine(clean, who, opts, tries + 1), 90); };
  u.onerror = e => { if (e && (e.error === 'interrupted' || e.error === 'canceled')) return; retry(); };
  setTimeout(retry, VOICE.works ? 2600 : 1800);
  try { speechSynthesis.resume(); } catch (e) {} speechSynthesis.speak(u);
}
function speak(text, who) {
  VOICE.lineOn = false;
  if (!VOICE.ok || settings.voice === false || !['You', 'Radio', 'Pilot'].includes(who)) return;
  try {
    if (!VOICE.you && !VOICE.count) loadVoices();
    const clean = text.replace(/…/g, '... ').replace(/—/g, ', ').replace(/\bkk+h*…?/gi, '').replace(/[“”*]/g, '').replace(/\b([A-Z]{2,})\b/g, w => w.charAt(0) + w.slice(1).toLowerCase()).trim();
    if (!clean || clean === '...') return;
    const radio = who !== 'You', scared = /!|run|no no|get back|stay away|he’s|behind you/i.test(text), quiet = /…/.test(text) && !scared;
    const opts = { pitch: 1 + (rand() - 0.5) * 0.06 + (scared ? 0.05 : 0) - (quiet ? 0.03 : 0), rate: (radio ? 0.96 : 1.0) + (rand() - 0.5) * 0.06 + (scared ? 0.1 : 0) - (quiet ? 0.08 : 0), vol: Math.max(0.35, Math.min(1, settings.vol * (quiet ? 0.85 : 1.05))) };
    VOICE.cur = null; opts.id = VOICE.line = (VOICE.line || 0) + 1; VOICE.lineOn = true; VOICE.lineStarted = false; VOICE.lineStart = performance.now();
    if (speechSynthesis.speaking || speechSynthesis.pending) { speechSynthesis.cancel(); setTimeout(() => speakLine(clean, who, opts, 0), 70); } else speakLine(clean, who, opts, 0);
    if (radio) SND.radioBlip();
  } catch (e) {}
}
setInterval(() => { try { if (VOICE.ok && speechSynthesis.speaking && speechSynthesis.paused) speechSynthesis.resume(); } catch (e) {} }, 1000);
function voiceUnlock() { if (!VOICE.ok || VOICE.unlocked) return; VOICE.unlocked = true; try { loadVoices(); speechSynthesis.cancel(); const u = new SpeechSynthesisUtterance('.'); u.volume = 0.01; u.rate = 2; speechSynthesis.speak(u); } catch (e) {} }
function hush() { VOICE.lineOn = false; VOICE.cur = null; try { if (VOICE.ok) speechSynthesis.cancel(); } catch (e) {} }
const pick = a => a[Math.floor(rand() * a.length)];
function remark(lines, chance = 1) { if (G.mode !== 'play' || rand() > chance || G.time - (G.lastRemark || -99) < 9 || subQ.length > 1) return; G.lastRemark = G.time; say(Array.isArray(lines) ? pick(lines) : lines, 2.8, 'You'); }
const CHATTER = [
  ['It’s so quiet out here.', 'Harlan said this would be easy money.', 'Why would anyone live this far out?', 'Okay. Fuel first. Then I can relax.', 'Every tree looks the same in the dark.', 'I should have brought a bigger flashlight.', 'Is the rain getting heavier?'],
  ['That tower looks a lot taller up close.', 'I keep hearing branches snap behind me.', 'Just a fuse. Just get the fuse.', 'Something smells like… wet dog. Or worse.', 'I don’t like how the wind sounds out here.'],
  ['I feel like I’m being watched.', 'Don’t look at him… don’t look at him.', 'Harlan, what did you leave me with?', 'Keep the light on. Keep the light on.', 'He’s out there. I know he is.', 'I just want to go home.'],
  ['Don’t stop. Don’t stop!', 'Where does this go?!'],
  ['Come on, come on, where’s that chopper?', 'Almost out. Almost out of here.'],
  ['This water is freezing.', 'Something just brushed my leg.', 'Where am I? This isn’t Hollow Pines anymore.', 'Every step, the mud pulls at my boots.', 'I can still smell the smoke.', 'Please let there be a road out of here.']
];
// ---- arrow hints when you can't find the next item for a minute ----
const hintG = new THREE.Group(); hintG.visible = false; scene.add(hintG);
const HINT_ARROWS = (() => {
  const sh = new THREE.Shape(); sh.moveTo(0, 0.75); sh.lineTo(0.5, 0.1); sh.lineTo(0.18, 0.1); sh.lineTo(0.18, -0.6); sh.lineTo(-0.18, -0.6); sh.lineTo(-0.18, 0.1); sh.lineTo(-0.5, 0.1); sh.closePath();
  const ag = new THREE.ShapeGeometry(sh); ag.rotateX(-Math.PI / 2);
  const out = []; for (let i = 0; i < 16; i++) { const m = new THREE.Mesh(ag, new THREE.MeshBasicMaterial({ color: 0xffb030, transparent: true, opacity: 0.8, depthWrite: false })); m.renderOrder = 4; m.visible = false; scene.add(m); out.push(m); }
  return out;
})();
const hintPillar = new THREE.Mesh(new THREE.CylinderGeometry(0.32, 0.32, 40, 18, 1, true).translate(0, 20, 0), new THREE.ShaderMaterial({ uniforms: { uT: { value: 0 } }, transparent: true, depthWrite: false, blending: THREE.AdditiveBlending, side: THREE.DoubleSide, fog: false,
  vertexShader: 'varying float vY; varying vec3 vN; varying vec3 vV; void main(){ vY = position.y / 40.0; vec4 mv = modelViewMatrix * vec4(position, 1.0); vV = -mv.xyz; vN = normalMatrix * normal; gl_Position = projectionMatrix * mv; }',
  fragmentShader: 'uniform float uT; varying float vY; varying vec3 vN; varying vec3 vV; void main(){ vec3 n = vN / max(length(vN), 1e-4), v = vV / max(length(vV), 1e-4); float f = pow(clamp(abs(dot(n, v)), 0.0, 1.0), 1.5); float a = pow(max(1.0 - vY, 0.0), 2.0) * f * (0.6 + 0.3 * sin(uT * 3.0)); gl_FragColor = vec4(vec3(1.0, 0.72, 0.28) * a * 1.6, 1.0); }' }));
hintPillar.frustumCulled = false; hintPillar.visible = false; scene.add(hintPillar);
const hintGlow = new THREE.Sprite(new THREE.SpriteMaterial({ map: TX.glint, color: 0xffb040, transparent: true, blending: THREE.AdditiveBlending, depthWrite: false, fog: false })); hintGlow.visible = false; scene.add(hintGlow);
const hintBig = (() => { const g = new THREE.Group(); const m = new THREE.MeshBasicMaterial({ color: 0xffb030 }); const c = new THREE.Mesh(new THREE.ConeGeometry(0.32, 0.6, 4), m); c.rotation.x = Math.PI; g.add(c); const st = new THREE.Mesh(new THREE.CylinderGeometry(0.1, 0.1, 0.55, 6), m); st.position.y = 0.55; g.add(st); hintG.add(g); return g; })();
const keyWorld = W.key.getWorldPosition(new THREE.Vector3());
function hintTarget() {
  if (P.onTower || P.inTunnel) return null;
  if (G.obj === 1 && !G.guns.pistol) return { k: 'pistol', p: pistolPick.position };
  if (G.obj === 2 && G.carry < 0) { const c = nearestCan(); return c ? { k: 'can' + G.poured + G.picked.join(''), p: { x: c.x, y: H(c.x, c.z) + (Math.hypot(c.x - L.cabin.x, c.z - L.cabin.z) < 8 ? 0.2 : 0), z: c.z } } : null; }
  if (G.obj === 5) return { k: 'fuse', p: fusePick.position };
  if (G.obj === 9) return { k: 'key', p: keyWorld };
  if (G.obj === 21) return { k: 'wreck', p: { x: W.crash.x + 2, y: H(W.crash.x, W.crash.z), z: W.crash.z + 2 } };
  if (G.obj === 22) return { k: 'radio', p: { x: W.nest.x - 0.4, y: H(W.nest.x, W.nest.z), z: W.nest.z - 0.2 } };
  if (G.obj === 23) { const g = nearestGas(); return g ? { k: 'sgas' + G.sgas.length, p: g } : null; }
  if (G.obj === 25) return { k: 'pump', p: { x: W.pumpGen.x, y: H(W.pumpGen.x, W.pumpGen.z), z: W.pumpGen.z } };
  if (typeof ch2Hint === 'function') return ch2Hint();
  return null;
}
function updateHint(dt) {
  const t = hintTarget();
  if (!t) { hintG.visible = hintPillar.visible = hintGlow.visible = false; HINT_ARROWS.forEach(a => a.visible = false); G.hintK = null; return; }
  if (t.k !== G.hintK) { G.hintK = t.k; G.hintT = 0; G.hintShown = false; }
  if (G.mode === 'play') G.hintT += dt;
  if (G.hintT > 60) {
    if (!G.hintShown) { G.hintShown = true; SND.obj(); say(pick(['I’m lost… okay, which way was it?', 'Think. Where did I see it?', 'Okay… this way. I think it’s this way.']), 3.2, 'You'); hint('Follow the arrows', 3.5); }
    hintG.visible = true; hintG.position.set(t.p.x, t.p.y + 1.4 + Math.sin(G.time * 3) * 0.18, t.p.z); hintBig.rotation.y += dt * 2;
    hintPillar.visible = hintGlow.visible = true; hintPillar.position.set(t.p.x, t.p.y, t.p.z); hintPillar.material.uniforms.uT.value = G.time; hintGlow.position.set(t.p.x, t.p.y + 0.4, t.p.z); const pul = 2.2 + Math.sin(G.time * 4) * 0.5; hintGlow.scale.set(pul, pul, pul);
    const dx = t.p.x - P.x, dz = t.p.z - P.z, dist = Math.hypot(dx, dz), ux = dx / (dist || 1), uz = dz / (dist || 1), yaw = Math.atan2(-dx, -dz);
    HINT_ARROWS.forEach((a, i) => { const d = 2.5 + i * 2.7; if (d > dist - 1.2) { a.visible = false; return; } const x = P.x + ux * d, z = P.z + uz * d; a.visible = true; a.position.set(x, H(x, z) + 0.12, z); a.scale.setScalar(1.25); a.rotation.y = yaw; a.material.opacity = 0.3 + 0.65 * Math.max(0, Math.sin(G.time * 5 - i * 0.8)); });
  } else { hintG.visible = hintPillar.visible = hintGlow.visible = false; HINT_ARROWS.forEach(a => a.visible = false); }
}
// ================= HUD =================
const subQ = []; let subT = 0, hintT = 0;
async function waitSubs(max) { const t0 = performance.now(); while ((subQ.length || subT > 0) && performance.now() - t0 < max) await wait(100); }
function say(text, dur = 3.5, who = '') { subQ.push({ text, dur, who }); }
function clearSubs() { subQ.length = 0; subT = 0; $('subs').innerHTML = ''; hush(); }
function hint(t, d = 2.5) { $('hint').textContent = t; $('hint').style.display = 'block'; hintT = d; }
function tip(id, t) { if (G.tips[id]) return; G.tips[id] = 1; say(t, 4.5, 'Tip'); }
function refreshObj() { const o = OBJ[G.obj]; $('chap').textContent = G.obj >= 16 ? 'Chapter 2 — The Swamp' : 'Chapter 1 — Hollow Pines'; $('objT').textContent = typeof o[1] === 'function' ? o[1]() : o[1]; }
function setObj(n, noSave) {
  G.obj = n; refreshObj(); const e = $('obj'); e.classList.remove('new'); void e.offsetWidth; e.classList.add('new'); SND.obj();
  if (n === 8) C.aggr = 1; if (n === 10) C.aggr = 2; if (n === 13) C.aggr = 3;
  if (!noSave) checkpoint();
}
const compEl = $('compass');
const compItems = [['N', 0], ['NE', -Math.PI / 4], ['E', -Math.PI / 2], ['SE', -3 * Math.PI / 4], ['S', Math.PI], ['SW', 3 * Math.PI / 4], ['W', Math.PI / 2], ['NW', Math.PI / 4]].map(([t, a]) => { const s = document.createElement('span'); s.textContent = t; if (t.length > 1) s.className = 's'; compEl.appendChild(s); return [s, a]; });
const compMk = document.createElement('span'); compMk.className = 'mk'; compMk.textContent = '◆'; compEl.appendChild(compMk);
let hudT = 0;
function updateHUD(dt) {
  const wd = compEl.clientWidth || 300;
  for (const [s, a] of compItems) { const rel = wrapA(a - P.yaw); s.style.display = Math.abs(rel) < Math.PI / 2 ? '' : 'none'; s.style.left = (wd / 2 - rel / (Math.PI / 2) * wd / 2) + 'px'; }
  const tg = OBJ[G.obj][2](); if (tg && !P.inTunnel && !P.inHeli) { const rel = clamp(wrapA(Math.atan2(-(tg.x - P.x), -(tg.z - P.z)) - P.yaw), -Math.PI / 2 * 0.96, Math.PI / 2 * 0.96); compMk.style.display = ''; compMk.style.left = (wd / 2 - rel / (Math.PI / 2) * wd / 2) + 'px'; $('dist').textContent = Math.round(Math.hypot(tg.x - P.x, tg.z - P.z)) + ' m'; }
  else if (P.inTunnel) { compMk.style.display = 'none'; $('dist').textContent = Math.round(TLEN - (tProject(P.x, P.z).s)) + ' m to the exit'; }
  else { compMk.style.display = 'none'; $('dist').textContent = ''; }
  $('stamI').style.width = P.stam + '%'; $('stam').style.opacity = P.stam < 99 ? 1 : 0; $('stamI').style.background = P.tired ? '#c33' : '#ddd';
  $('hpI').style.width = P.hp + '%';
  const w = G.wep; $('wep').innerHTML = w === 'pistol' ? `Pistol<b>${G.am.p} / ${G.am.pr}</b>` : w === 'shotgun' ? `Shotgun<b>${G.am.s} / ${G.am.sr}</b>` : w === 'flare' ? `Flare gun<b>1</b>` : '';
  $('cross').style.display = w !== 'none' ? 'block' : 'none'; $('dot').style.display = w !== 'none' ? 'none' : 'block';
  $('lightIc').textContent = !G.hasLight ? '' : P.overheat > 0 ? `LIGHT OVERHEATED ${Math.ceil(P.overheat)}s` : P.light ? 'LIGHT ON' : 'LIGHT OFF';
  if ((G.obj === 14 || G.obj === 26) && G.surviveT > 0) { $('timer').style.display = 'block'; $('timer').textContent = Math.ceil(G.surviveT); } else $('timer').style.display = 'none';
  if (subT > 0) { subT -= dt; if (subT <= 0) { const el = performance.now() - (VOICE.lineStart || 0); if (VOICE.lineOn && (VOICE.lineStarted ? el < 14000 : el < 2800)) subT = 0.05; else $('subs').innerHTML = ''; } }
  if (subT <= 0 && subQ.length) { const s = subQ.shift(); $('subs').innerHTML = (s.who ? `<b>${s.who}:</b> ` : '') + s.text; subT = s.dur; speak(s.text, s.who); }
  if (hintT > 0) { hintT -= dt; if (hintT <= 0) $('hint').style.display = 'none'; }
}

// ================= INPUT =================
const K = {}; let usePress = false, firePress = false, fireHeld = false, touchUse = false, touchRun = false, jx = 0, jy = 0, locked = false, lockFail = false;
const useHeld = () => K.KeyE || K.Space || touchUse || padUse;
addEventListener('keydown', e => {
  if (e.repeat && (e.code === 'KeyE' || e.code === 'Space')) { K[e.code] = true; return; }
  K[e.code] = true;
  if (G.mode === 'note' && ['KeyE', 'Space', 'Enter', 'Escape'].includes(e.code)) { closeNote(); return; }
  if (e.code === 'KeyE' || e.code === 'Space') usePress = true;
  if (e.code === 'KeyF') toggleLight();
  if (e.code === 'KeyR') reload();
  if (e.code === 'KeyQ') cycleWep();
  if (e.code === 'Digit1') equip('none'); if (e.code === 'Digit2' && G.guns.pistol) equip('pistol'); if (e.code === 'Digit3' && G.guns.shotgun) equip('shotgun'); if (e.code === 'Digit4' && G.guns.flare) equip('flare');
  if ((e.code === 'KeyP' || e.code === 'Escape') && (G.mode === 'play')) pause();
});
addEventListener('keyup', e => { K[e.code] = false; });
addEventListener('blur', () => { for (const k in K) K[k] = false; });
let lockGesture = false;
function lock(gesture) { if (touch || lockFail || locked || padOn) return; lockGesture = !!gesture; try { const r = cv.requestPointerLock(); if (r && r.catch) r.catch(() => { if (lockGesture) lockFail = true; }); } catch (e) { if (lockGesture) lockFail = true; } }
document.addEventListener('pointerlockchange', () => { const was = locked; locked = document.pointerLockElement === cv; if (was && !locked && G.mode === 'play') pause(); });
document.addEventListener('pointerlockerror', () => { if (lockGesture) lockFail = true; });
document.addEventListener('mousemove', e => {
  if (!(G.mode === 'play' || G.mode === 'cut' || G.mode === 'climb')) return;
  if (P.look) return;
  if (locked || (e.buttons & 2) || (lockFail && (e.buttons & 1))) { P.yaw -= e.movementX * 0.0022 * settings.sens; P.pitch = clamp(P.pitch - e.movementY * 0.0022 * settings.sens, -1.4, 1.4); }
});
cv.addEventListener('contextmenu', e => e.preventDefault());
cv.addEventListener('mousedown', e => {
  if (touch) return;
  if (G.mode === 'note') { closeNote(); return; }
  if (G.mode !== 'play') return;
  if (!locked && !lockFail) { lock(true); return; }
  if (e.button === 0) { firePress = true; fireHeld = true; }
});
addEventListener('mouseup', e => { if (e.button === 0) fireHeld = false; });
// touch
const tl = $('touch'); let joyId = null, lookId = null, jox = 0, joyY = 0, lx = 0, ly = 0;
tl.addEventListener('touchstart', e => { e.preventDefault(); for (const t of e.changedTouches) { if (t.clientX < innerWidth * 0.42 && joyId === null) { joyId = t.identifier; jox = t.clientX; joyY = t.clientY; const j = $('joy'); j.style.display = 'block'; j.style.left = jox + 'px'; j.style.top = joyY + 'px'; } else if (lookId === null) { lookId = t.identifier; lx = t.clientX; ly = t.clientY; } } }, { passive: false });
tl.addEventListener('touchmove', e => { e.preventDefault(); for (const t of e.changedTouches) { if (t.identifier === joyId) { let dx = t.clientX - jox, dy = t.clientY - joyY; const l = Math.hypot(dx, dy); if (l > 52) { dx *= 52 / l; dy *= 52 / l; } jx = dx / 52; jy = dy / 52; $('knob').style.transform = `translate(${dx}px,${dy}px)`; } else if (t.identifier === lookId) { if (!P.look) { P.yaw -= (t.clientX - lx) * 0.0052 * settings.sens; P.pitch = clamp(P.pitch - (t.clientY - ly) * 0.0052 * settings.sens, -1.4, 1.4); } lx = t.clientX; ly = t.clientY; } } }, { passive: false });
const tEnd = e => { for (const t of e.changedTouches) { if (t.identifier === joyId) { joyId = null; jx = jy = 0; $('joy').style.display = 'none'; $('knob').style.transform = ''; } if (t.identifier === lookId) lookId = null; } };
tl.addEventListener('touchend', tEnd); tl.addEventListener('touchcancel', tEnd);
function tbtn(id, down, up) { const b = $(id); b.addEventListener('touchstart', e => { e.preventDefault(); e.stopPropagation(); down(); }, { passive: false }); b.addEventListener('touchend', e => { e.preventDefault(); e.stopPropagation(); if (up) up(); }, { passive: false }); b.addEventListener('touchcancel', () => { if (up) up(); }); }
tbtn('bUse', () => { touchUse = true; usePress = true; if (G.mode === 'note') closeNote(); }, () => { touchUse = false; });
tbtn('bRun', () => { touchRun = !touchRun; $('bRun').classList.toggle('on', touchRun); });
tbtn('bLight', () => toggleLight());
tbtn('bFire', () => { firePress = true; fireHeld = true; }, () => { fireHeld = false; });
tbtn('bReload', () => reload());
tbtn('bSwap', () => cycleWep());
$('pauseBtn').addEventListener('click', () => { if (G.mode === 'play' || G.mode === 'climb') pause(); });
// ================= GAMEPAD (PS5 / Xbox / any standard controller) =================
let padL2 = false, padOn = false, padX = 0, padY = 0, padRun = false, padUse = false, padPrev = [], padNavT = 0, padFocus = null, padIdx = -1;
const padDZ = v => Math.abs(v) < 0.16 ? 0 : (v - Math.sign(v) * 0.16) / 0.84;
function rumble(strong, weak, ms) { if (!padOn || padIdx < 0) return; try { const gp = navigator.getGamepads()[padIdx], a = gp && gp.vibrationActuator; if (a && a.playEffect) a.playEffect('dual-rumble', { duration: ms, strongMagnitude: strong, weakMagnitude: weak }); } catch (e) {} }
function setPadMode(on) {
  if (padOn === on) return; padOn = on; KEYN = on ? '✕' : (touch ? 'USE' : 'E');
  document.body.classList.toggle('pad', on); if (!on && padFocus) { padFocus.classList.remove('pf'); padFocus = null; }
}
addEventListener('keydown', () => setPadMode(false), true);
addEventListener('mousedown', () => setPadMode(false), true);
addEventListener('gamepadconnected', e => { padIdx = e.gamepad.index; toast('🎮 Controller connected'); });
addEventListener('gamepaddisconnected', e => { if (e.gamepad.index === padIdx) { padIdx = -1; padX = padY = 0; padUse = padRun = false; fireHeld = false; setPadMode(false); toast('Controller disconnected'); } });
function toast(t) { let el = $('padToast'); if (!el) { el = document.createElement('div'); el.id = 'padToast'; document.body.appendChild(el); } el.textContent = t; el.style.opacity = 1; clearTimeout(el._t); el._t = setTimeout(() => el.style.opacity = 0, 2600); }
function padLayer() {
  for (const id of ['note', 'setP', 'howP', 'credP', 'slotP', 'pauseP', 'dead', 'win']) { const e = $(id); if (e && getComputedStyle(e).display !== 'none') return e; }
  return menuOn ? $('menu') : null;
}
function padItems(root) { return [...root.querySelectorAll('button,input,select,a[href]')].filter(e => e.offsetParent !== null && !e.disabled && e.id !== 'pauseBtn' && !e.classList.contains('tb')); }
function padSetFocus(e) { if (padFocus) padFocus.classList.remove('pf'); padFocus = e; if (e) { e.classList.add('pf'); try { e.focus({ preventScroll: false }); } catch (x) {} e.scrollIntoView && e.scrollIntoView({ block: 'nearest' }); } }
function padMove(root, dx, dy) {
  const items = padItems(root); if (!items.length) return;
  if (!padFocus || !items.includes(padFocus)) { padSetFocus(items[0]); return; }
  if (padFocus.tagName === 'SELECT' && dx) { const n = padFocus.options.length; padFocus.selectedIndex = (padFocus.selectedIndex + dx + n) % n; padFocus.dispatchEvent(new Event('change', { bubbles: true })); return; }
  if (padFocus.type === 'range' && dx) { const s = +padFocus.step || 0.05; padFocus.value = clamp(+padFocus.value + dx * s * 2, +padFocus.min, +padFocus.max); padFocus.dispatchEvent(new Event('input', { bubbles: true })); padFocus.dispatchEvent(new Event('change', { bubbles: true })); return; }
  const r0 = padFocus.getBoundingClientRect(), cx = r0.left + r0.width / 2, cy = r0.top + r0.height / 2;
  let best = null, bs = 1e9;
  for (const e of items) { if (e === padFocus) continue; const r = e.getBoundingClientRect(), ex = r.left + r.width / 2 - cx, ey = r.top + r.height / 2 - cy, along = ex * dx + ey * dy; if (along <= 2) continue; const perp = Math.abs(ex * dy - ey * dx), s = along + perp * 2.5; if (s < bs) { bs = s; best = e; } }
  if (!best) { const i = items.indexOf(padFocus), n = items.length; best = items[(i + (dx + dy > 0 ? 1 : -1) + n) % n]; }
  padSetFocus(best); SND.ok && SND.ui();
}
function padBack(root) {
  if (root.id === 'note') { closeNote(); return; }
  if (root.id === 'pauseP') { $('pResume').click(); return; }
  const b = root.querySelector('[data-back]'); if (b && b.offsetParent !== null) b.click();
}
function padPoll(dt) {
  const pads = navigator.getGamepads ? navigator.getGamepads() : []; let gp = pads[padIdx];
  if (!gp) { gp = null; for (const p of pads) if (p && p.connected) { gp = p; padIdx = p.index; break; } }
  if (!gp) return;
  const b = i => !!(gp.buttons[i] && (gp.buttons[i].pressed || gp.buttons[i].value > 0.5));
  const now = gp.buttons.map((x, i) => b(i)), hit = i => now[i] && !padPrev[i];
  const ax = padDZ(gp.axes[0] || 0), ay = padDZ(gp.axes[1] || 0), rx = padDZ(gp.axes[2] || 0), ry = padDZ(gp.axes[3] || 0);
  const any = now.some(Boolean) || ax || ay || rx || ry;
  if (any && !padOn) setPadMode(true);
  if (!padOn) { padPrev = now; return; }
  if (now.some((v, i) => v && !padPrev[i])) {
    if (!SND.ok) { try { SND.init(); SND.setVol(settings.vol); $('tapSound').style.display = 'none'; if (menuOn) { SND.set('menu', 0.06, 1); SND.music(true); } } catch (e) {} }
    voiceUnlock();
    if (G.mode === 'intro') G.skipIntro = true;
  }
  const playing = G.mode === 'play' || G.mode === 'climb' || G.mode === 'cut';
  const root = (G.mode === 'play' || G.mode === 'climb' || G.mode === 'cut' || G.mode === 'scare' || G.mode === 'intro') ? null : padLayer();
  if (root) {
    // menus: d-pad / left stick to move, ✕ to pick, ○ to go back
    padX = padY = 0; padUse = false; padL2 = false; fireHeld = false;
    let dx = (now[15] ? 1 : 0) - (now[14] ? 1 : 0), dy = (now[13] ? 1 : 0) - (now[12] ? 1 : 0);
    if (!dx && !dy) { dx = Math.abs(ax) > 0.55 ? Math.sign(ax) : 0; dy = Math.abs(ay) > 0.55 ? Math.sign(ay) : 0; if (dx && dy) { if (Math.abs(ax) > Math.abs(ay)) dy = 0; else dx = 0; } }
    padNavT -= dt;
    if (dx || dy) { if (padNavT <= 0) { padMove(root, dx, dy); padNavT = padNavT < -1 ? 0.32 : 0.16; } } else padNavT = -2;
    const items = padItems(root);
    if (!padFocus || !items.includes(padFocus)) padSetFocus(items[0] || null);
    if (hit(0)) { if (root.id === 'note') closeNote(); else if (padFocus) padFocus.click(); }
    if (hit(1)) padBack(root);
    if (hit(9) && root.id === 'pauseP') $('pResume').click();
  } else {
    if (padFocus) padSetFocus(null);
    padX = ax; padY = ay;
    if (playing && !P.look) { const s = 2.7 * settings.sens * dt; P.yaw -= rx * Math.abs(rx) * s; P.pitch = clamp(P.pitch - ry * Math.abs(ry) * s * 0.75, -1.4, 1.4); }
    padUse = now[0]; padL2 = now[6];
    if (hit(0)) usePress = true;
    if (hit(7)) { firePress = true; fireHeld = true; } if (!now[7] && padPrev[7]) fireHeld = false;
    if (hit(2)) reload();
    if (hit(3) || hit(5)) cycleWep();
    if (hit(4) || hit(12)) toggleLight();
    if (hit(10)) padRun = !padRun;
    if (!ax && !ay) padRun = false;
    if (hit(9) && G.mode === 'play') pause();
  }
  padPrev = now;
}
function toggleLight() { if (!G.hasLight || !(G.mode === 'play' || G.mode === 'climb')) return; P.light = !P.light; SND.dry(); }

// ================= WEAPONS =================
const WS = { cur: 'none', next: null, sw: 0, fireT: 0, reloadT: 0, recoil: 0, kick: 0, sway: { x: 0, y: 0 } };
const WSTAT = { pistol: { mag: 12, rate: 0.22, rel: 1.2, dmg: 1, pel: 1, spread: 0.008 }, shotgun: { mag: 6, rate: 0.85, rel: 1.9, dmg: 0.45, pel: 8, spread: 0.06 }, flare: { mag: 1, rate: 1, rel: 1, dmg: 0, pel: 0, spread: 0 } };
function owned() { return ['none', 'pistol', 'shotgun', 'flare'].filter(w => w === 'none' || G.guns[w]); }
function cycleWep() { const o = owned(); equip(o[(o.indexOf(G.wep) + 1) % o.length]); }
function equip(w) { if (w === G.wep && WS.cur === w) return; G.wep = w; WS.next = w; WS.sw = 1; SND.dry(); }
function reload() { const w = G.wep; if (w !== 'pistol' && w !== 'shotgun' || WS.reloadT > 0) return; const k = w === 'pistol' ? ['p', 'pr'] : ['s', 'sr'], st = WSTAT[w]; if (G.am[k[0]] >= st.mag || G.am[k[1]] <= 0) return; WS.reloadT = st.rel; SND.reload(); }
function finishReload() { const w = WS.cur; const k = w === 'pistol' ? ['p', 'pr'] : ['s', 'sr'], need = WSTAT[w].mag - G.am[k[0]], got = Math.min(need, G.am[k[1]]); G.am[k[0]] += got; G.am[k[1]] -= got; }
function updateWeapons(dt, canFire) {
  // switching: lower, swap, raise (smooth)
  if (WS.sw > 0) { WS.sw -= dt * 3.2; if (WS.sw < 0.5 && WS.next !== null) { WS.cur = WS.next; WS.next = null; WS.reloadT = 0; for (const k in W.fpGuns) W.fpGuns[k].visible = k === WS.cur; } }
  const lower = WS.sw > 0 ? Math.sin(clamp(WS.sw, 0, 1) * Math.PI) : 0;
  WS.fireT -= dt;
  if (WS.reloadT > 0) { WS.reloadT -= dt; if (WS.reloadT <= 0) finishReload(); }
  const relDip = WS.reloadT > 0 ? Math.sin(clamp(1 - WS.reloadT / WSTAT[WS.cur].rel, 0, 1) * Math.PI) : 0;
  if (canFire && firePress && WS.cur !== 'none' && WS.sw <= 0 && WS.reloadT <= 0 && WS.fireT <= 0) fire();
  firePress = false;
  WS.recoil = Math.max(0, WS.recoil - dt * 6); WS.kick += (0 - WS.kick) * Math.min(1, dt * 10);
  const bobX = Math.sin(P.bob * 0.5) * 0.012, bobY = Math.abs(Math.cos(P.bob * 0.5)) * 0.012;
  WS.sway.x += (0 - WS.sway.x) * Math.min(1, dt * 8); WS.sway.y += (0 - WS.sway.y) * Math.min(1, dt * 8);
  W.gunHold.position.set(0.24 + bobX + WS.sway.x, -0.25 - bobY - lower * 0.35 - relDip * 0.18 + WS.sway.y, -0.46 + WS.recoil * 0.09);
  W.gunHold.rotation.set(WS.recoil * 0.5 + relDip * 0.7, 0, relDip * 0.5);
  W.hand.position.set(-0.27 - bobX * 0.6, -0.27 - bobY * 0.7, -0.5);
  W.hand.visible = G.hasLight;
  W.muzzle.material.opacity = Math.max(0, W.muzzle.material.opacity - dt * 14); W.muzzleL.intensity = Math.max(0, W.muzzleL.intensity - dt * 40);
}
function fire() {
  const w = WS.cur, st = WSTAT[w];
  if (w === 'flare') { if (G.obj === 13 && Math.hypot(P.x - Hp.x, P.z - Hp.z) < 9) fireFlare(); else hint('Save the flare for the helipad!'); WS.fireT = 0.5; return; }
  const k = w === 'pistol' ? 'p' : 's';
  if (G.am[k] <= 0) { SND.dry(); WS.fireT = 0.25; if (G.am[k + 'r'] > 0) reload(); else { hint('Out of ammo!'); remark('I’m out! I’m out of ammo!'); } return; }
  G.am[k]--; if (G.am[k] + G.am[k + 'r'] === 3) remark('I’m almost out of ammo.'); WS.fireT = st.rate; WS.recoil = 1; P.pitch = Math.min(1.4, P.pitch + (w === 'shotgun' ? 0.05 : 0.022)); P.shake = Math.max(P.shake, w === 'shotgun' ? 0.25 : 0.1);
  W.muzzle.material.opacity = 1; W.muzzle.material.rotation = rand() * 6; W.muzzleL.intensity = w === 'shotgun' ? 4 : 2.6;
  w === 'pistol' ? (SND.pistol(), rumble(0.5, 0.8, 110)) : (SND.shotgun(), rumble(1, 0.9, 220));
  scareDeer(P.x, P.z, 60);
  camera.getWorldDirection(FW); const o = camera.getWorldPosition(TV).clone();
  let hitAny = false;
  for (let i = 0; i < st.pel; i++) {
    const d = FW.clone().add(V3((rand() - 0.5) * st.spread * 2, (rand() - 0.5) * st.spread * 2, (rand() - 0.5) * st.spread * 2)).normalize();
    if (typeof mireShot === 'function' && (mireShot(o, d, st.dmg) || hollowShot(o, d, st.dmg))) { hitAny = true; continue; }
    if (shootRay(o, d, st.dmg)) hitAny = true;
  }
  if (hitAny) { $('cross').classList.add('hit'); setTimeout(() => $('cross').classList.remove('hit'), 140); }
}
function treeBlock(o, d, maxT) { for (let t = 1; t < maxT; t += 0.8) { const x = o.x + d.x * t, y = o.y + d.y * t, z = o.z + d.z * t; if (P.inTunnel) return 1e9; if (y > H(x, z) + 9) continue; if (y < H(x, z)) return t; const A = CG.get(Math.floor(x / 6) + ',' + Math.floor(z / 6)); if (A) for (const c of A) if (c[2] < 1.2 && Math.hypot(x - c[0], z - c[1]) < c[2]) return t; } return 1e9; }
function raySphere(o, d, cx, cy, cz, r) { const ox = cx - o.x, oy = cy - o.y, oz = cz - o.z, t = ox * d.x + oy * d.y + oz * d.z; if (t < 0) return -1; const dx = o.x + d.x * t - cx, dy = o.y + d.y * t - cy, dz = o.z + d.z * t - cz; return dx * dx + dy * dy + dz * dz < r * r ? t : -1; }
function shootRay(o, d, dmg) {
  let best = 1e9, tgt = null;
  for (const a of ANIMALS) { if (a.dead) continue; const t = raySphere(o, d, a.x, a.y + a.m.bh, a.z, a.deer ? 0.62 : 0.5); if (t > 0 && t < best && t < 90) { best = t; tgt = a; } }
  if (cr.g.visible && C.state !== 'stun') { const p = cr.g.position, crawl = C.mode === 'crawl'; const hs = crawl ? [[0, 0.7, 0], [0, 0.8, 0.8], [0, 0.9, 1.5]] : [[0, 0.9, 0], [0, 1.7, 0], [0, 2.4, 0], [0, 2.95, 0]]; const yaw = cr.g.rotation.y; for (const h of hs) { const t = raySphere(o, d, p.x + Math.sin(yaw) * h[2], p.y + h[1], p.z + Math.cos(yaw) * h[2], 0.42); if (t > 0 && t < best && t < 90) { best = t; tgt = 'C'; } } }
  if (!tgt) return false;
  if (treeBlock(o, d, best) < best) return false;
  const hx = o.x + d.x * best, hy = o.y + d.y * best, hz = o.z + d.z * best;
  if (tgt === 'C') { spray(BLACKB, hx, hy, hz, 12, 2.6, d.x, 0.3, d.z); C.pain += dmg; C.stag = 0.35; SND.splat(0); if (C.pain >= 4) stunC(); return true; }
  spray(BLOOD, hx, hy, hz, 16, 2.8, d.x, 0.4, d.z); bloodPool(tgt.x + (rand() - 0.5), tgt.z + (rand() - 0.5), 0.22 + rand() * 0.2, 0);
  tgt.hp -= dmg; SND.splat(panOf(tgt.x, tgt.z));
  if (tgt.hp <= 0) killAnimal(tgt); else { if (tgt.deer) { tgt.flee = 8; } else { SND.yelp(panOf(tgt.x, tgt.z)); tgt.stag = 0.3; } }
  return true;
}

// ================= ANIMALS =================
const ANIMALS = []; let animT = 0;
function makeGator() {
  const g = new THREE.Group(), body = new THREE.Group(); g.add(body); const sk = MSM({ map: TX.stone, normalMap: NRM.stone, normalScale: new THREE.Vector2(2, 2), color: 0x4a5636, roughness: 0.55 });
  sph(1, sk, 0, 0.12, 0, body, 0.42, 0.2, 1.25); const head = new THREE.Group(); head.position.set(0, 0.12, 1.15); body.add(head);
  sph(1, sk, 0, 0, 0.25, head, 0.22, 0.12, 0.42); sph(1, sk, 0, -0.02, 0.62, head, 0.13, 0.07, 0.3);
  [-1, 1].forEach(sd => { sph(0.045, sk, sd * 0.1, 0.09, 0.15, head); sph(0.022, new THREE.MeshBasicMaterial({ color: 0xc8b040 }), sd * 0.1, 0.12, 0.18, head); });
  for (let i = 0; i < 7; i++) { const t = mk(new THREE.ConeGeometry(0.012, 0.04, 4), MAT.teeth, (i % 2 ? 1 : -1) * 0.11, -0.05, 0.3 + i * 0.06, head); t.rotation.x = Math.PI; }
  const tail = new THREE.Group(); tail.position.set(0, 0.1, -1.1); body.add(tail); const tl = mk(new THREE.ConeGeometry(0.22, 1.6, 8), sk, 0, 0, -0.8, tail); tl.rotation.x = -Math.PI / 2; tl.scale.set(1, 1, 0.5);
  for (let i = 0; i < 10; i++) sph(0.03, sk, 0, 0.22, 0.9 - i * 0.22, body);
  [[-1, 1], [1, 1], [-1, -1], [1, -1]].forEach(([sx, sz]) => { const l = cap(0.05, 0.25, sk, sx * 0.38, 0.0, sz * 0.6, body); l.rotation.z = sx * 1.2; });
  g.traverse(o => { if (o.isMesh) o.castShadow = settings.shadows; }); scene.add(g);
  return { g, body, neck: new THREE.Group(), head, legs: [], tail, bh: 0.15 };
}
function spawnAnimal(type, dist, ang) {
  const a = P.yaw + ang; let x = P.x - Math.sin(a) * dist, z = P.z - Math.cos(a) * dist; [x, z] = collide(x, z, 0.5);
  if (Math.hypot(x - LK.x, z - LK.z) < LK.c + 2) return null;
  if (type === 'gator' && H(x, z) > -0.45) return null;
  const m = type === 'gator' ? makeGator() : makeAnimal(type); m.g.traverse(o => { if (o.isMesh) o.castShadow = settings.shadows; });
  const an = { type, gator: type === 'gator', deer: type === 'deer', m, x, z, y: H(x, z), yaw: rand() * 6, hp: type === 'deer' ? 1.5 : type === 'gator' ? 3 : 2, dead: false, deadT: 0, flee: 0, wand: rand() * 4, ph: 0, atk: 0, stag: 0, side: rand() < 0.5 ? -1 : 1, fall: 0 };
  ANIMALS.push(an); return an;
}
function removeAnimal(a) { scene.remove(a.m.g); ANIMALS.splice(ANIMALS.indexOf(a), 1); }
function clearAnimals() { while (ANIMALS.length) removeAnimal(ANIMALS[0]); }
function killAnimal(a) { remark(a.deer ? ['Poor thing.', 'Sorry, deer.'] : ['Got it.', 'Stay down!', 'One less wolf.'], 0.7); a.dead = true; a.deadT = 0; bloodPool(a.x, a.z, a.deer ? 1.3 : 0.9, 3); spray(BLOOD, a.x, a.y + a.m.bh, a.z, 30, 3.5); a.deer ? SND.bleat(panOf(a.x, a.z)) : SND.yelp(panOf(a.x, a.z)); }
function scareDeer(x, z, r) { for (const a of ANIMALS) if (a.deer && !a.dead && Math.hypot(a.x - x, a.z - z) < r) a.flee = 7; }
function panOf(x, z) { return -Math.sin(wrapA(Math.atan2(-(x - P.x), -(z - P.z)) - P.yaw)); }
function updateAnimals(dt) {
  const active = !P.inTunnel && !P.onTower && !P.inHeli && G.mode !== 'climb';
  animT -= dt;
  if (active && animT <= 0) {
    animT = 2;
    const deer = ANIMALS.filter(a => a.deer).length; if (deer < 5 && P.x < 1000) spawnAnimal('deer', 45 + rand() * 40, Math.PI * (0.6 + rand() * 0.8) * (rand() < 0.5 ? 1 : -1));
    for (const a of ANIMALS.slice()) if (Math.hypot(a.x - P.x, a.z - P.z) > 130 || (a.dead && a.deadT > 80)) removeAnimal(a);
  }
  if (active && P.x > 1000 && G.obj >= 19 && G.obj <= 26 && G.mode === 'play' && H(P.x, P.z) < 0.35) { G.gatorT = (G.gatorT == null ? 25 : G.gatorT) - dt; if (G.gatorT <= 0) { G.gatorT = G.obj === 26 ? 14 : 30 + rand() * 30; if (ANIMALS.filter(a => a.gator && !a.dead).length < 2) { for (let k = 0; k < 12; k++) { if (spawnAnimal('gator', 18 + rand() * 14, (rand() - 0.5) * 3.2 + Math.PI)) { remark(['Something’s moving in the water…', 'Was that a log? Logs don’t move.', 'Gator! GATOR!']); break; } } } } }
  if (active && G.obj >= 2 && G.obj <= 14 && G.obj !== 11 && G.obj !== 12 && P.x < 1000 && G.mode === 'play') {
    G.wolfT -= dt;
    if (G.wolfT <= 0) { const n = ANIMALS.filter(a => !a.deer && !a.dead).length; remark(['Wolves… Harlan wasn’t kidding.', 'Something’s growling out there.', 'I hear wolves. Close.'], 0.8); G.wolfT = G.obj >= 13 ? 16 + rand() * 10 : 50 + rand() * 40; if (n < 3) { const k = G.obj >= 13 ? 2 : 1 + (rand() < 0.4 ? 1 : 0), ang = Math.PI * (0.7 + rand() * 0.6); for (let i = 0; i < k; i++) spawnAnimal('wolf', 42 + rand() * 10, ang + (rand() - 0.5) * 0.6); rand() < 0.5 ? SND.howl(panOf(P.x - Math.sin(P.yaw + ang) * 40, P.z - Math.cos(P.yaw + ang) * 40)) : SND.growl(0, 0.6); } }
  }
  for (const a of ANIMALS) {
    const dx = P.x - a.x, dz = P.z - a.z, d = Math.hypot(dx, dz); let sp = 0, ty = a.yaw;
    if (a.dead) { a.deadT += dt; a.fall = Math.min(1, a.fall + dt * 2.2); const e = 1 - Math.pow(1 - a.fall, 3); a.m.body.rotation.z = a.side * e * Math.PI / 2; a.m.body.position.y = -e * a.m.bh * 0.55; a.m.legs.forEach(l => { l.hp.rotation.x *= 0.9; }); a.m.g.position.set(a.x, a.y, a.z); continue; }
    a.stag = Math.max(0, a.stag - dt);
    if (a.gator) {
      const wet = H(a.x, a.z) < -0.15, pWet = H(P.x, P.z) < 0.35; a.atk -= dt;
      let gsp = 0; if (d < 45 && pWet && G.mode === 'play') { a.yaw += wrapA(Math.atan2(dx, dz) - a.yaw) * Math.min(1, dt * 2.5); gsp = a.stag > 0 ? 0.4 : wet ? (d < 8 ? 5.2 : 3.6) : 2.0; } else { a.wand -= dt; if (a.wand <= 0) { a.wand = 3 + rand() * 4; a.tyw = a.yaw + (rand() - 0.5) * 2; } a.yaw += wrapA((a.tyw || a.yaw) - a.yaw) * dt; gsp = 0.6; }
      if (gsp > 0) { let nx = a.x + Math.sin(a.yaw) * gsp * dt, nz = a.z + Math.cos(a.yaw) * gsp * dt; [nx, nz] = collide(nx, nz, 0.6); a.ph += gsp * dt * 3; a.x = nx; a.z = nz; }
      if (d < 2.1 && a.atk <= 0 && G.mode === 'play') { a.atk = 1.4; SND.chomp(panOf(a.x, a.z)); hurt(20 + rand() * 6, 'gator'); spray(BLOOD, P.x, P.y + 0.6, P.z, 12, 2); }
      if (rand() < dt * 0.15 && d < 30) SND.hiss(panOf(a.x, a.z));
      const gyy = H(a.x, a.z); a.y = wet ? Math.max(gyy, -0.3) : gyy; a.m.tail.rotation.y = Math.sin(a.ph) * 0.5; a.m.head.rotation.x = d < 4 ? -0.35 : 0;
      a.m.g.position.set(a.x, a.y, a.z); a.m.g.rotation.y = a.yaw; continue;
    }
    if (a.deer) {
      if (d < 14 && G.mode === 'play') a.flee = Math.max(a.flee, 4);
      if (a.flee > 0) { a.flee -= dt; ty = Math.atan2(-dx, -dz); sp = 7; }
      else { a.wand -= dt; if (a.wand <= 0) { a.wand = 2 + rand() * 5; a.tyw = a.yaw + (rand() - 0.5) * 2.5; a.walk = rand() < 0.6; } ty = a.tyw != null ? a.tyw : a.yaw; sp = a.walk ? 1.1 : 0; }
    } else {
      ty = Math.atan2(dx, dz); a.atk -= dt;
      sp = a.stag > 0 ? 0.5 : d > 2 ? (d > 18 ? 5.6 : 6.1) : 0;
      if (P.inTunnel || P.onTower) sp = 0;
      if (d < 1.9 && a.atk <= 0 && G.mode === 'play') { a.atk = 1.15; SND.bite(panOf(a.x, a.z)); hurt(14 + rand() * 6, 'wolf'); spray(BLOOD, P.x, P.y + 1.1, P.z, 10, 2); }
      if (rand() < dt * 0.25) SND.growl(panOf(a.x, a.z), clamp(1 - d / 40, 0.1, 1));
    }
    a.yaw += wrapA(ty - a.yaw) * Math.min(1, dt * (a.deer && a.flee > 0 ? 6 : 4));
    if (sp > 0) { let nx = a.x + Math.sin(a.yaw) * sp * dt, nz = a.z + Math.cos(a.yaw) * sp * dt; [nx, nz] = collide(nx, nz, 0.45); a.ph += Math.hypot(nx - a.x, nz - a.z) * (a.deer ? 2.2 : 3); a.x = nx; a.z = nz; }
    a.y = H(a.x, a.z); const amp = sp > 3 ? 0.75 : sp > 0 ? 0.4 : 0;
    a.m.legs.forEach((l, i) => { const o = (i === 0 || i === 3) ? 0 : Math.PI, s = Math.sin(a.ph + o); l.hp.rotation.x += (s * amp - l.hp.rotation.x) * Math.min(1, dt * 14); l.kn.rotation.x += (Math.max(0, -s) * amp * 1.3 - l.kn.rotation.x) * Math.min(1, dt * 14); });
    a.m.body.position.y = sp > 3 ? Math.abs(Math.sin(a.ph)) * 0.06 : 0;
    a.m.neck.rotation.x += ((a.deer && sp === 0 ? 0.9 : 0) - a.m.neck.rotation.x) * Math.min(1, dt * 3);
    a.m.g.position.set(a.x, a.y, a.z); a.m.g.rotation.y = a.yaw;
  }
}

// ================= PLAYER HEALTH =================
function hurt(n, by) { if (G.mode !== 'play') return; P.hp -= n; if (P.hp < 40) remark(['I’m hurt bad…', 'I can’t take much more of this.']); else remark(['Agh! It bit me!', 'Get off me!'], 0.6); P.hurtT = 0; P.shake = Math.max(P.shake, 0.4); SND.hurt(); rumble(0.9, 0.6, 260); $('hurt').style.opacity = 0.9; setTimeout(() => $('hurt').style.opacity = clamp((100 - P.hp) / 140, 0, 0.6), 220); if (P.hp <= 0) die(by); }

// ================= CREATURE =================
function showC(v) { cr.g.visible = v; }
function crHeadY() { return cr.g.position.y + (C.mode === 'crawl' ? 1.2 : 2.95); }
function lookAng() { camera.getWorldDirection(FW); const p = cr.g.position, hx = p.x - camera.position.x, hy = crHeadY() - camera.position.y, hz = p.z - camera.position.z, l = Math.hypot(hx, hy, hz) || 1; return Math.acos(clamp((FW.x * hx + FW.y * hy + FW.z * hz) / l, -1, 1)); }
function placeC(dist, angOff) { const a = P.yaw + angOff; let x = P.x - Math.sin(a) * dist, z = P.z - Math.cos(a) * dist; [x, z] = collide(x, z, 0.5); C.x = x; C.z = z; }
function vanishC(next) { if (G.mode === 'play' && cr.g.visible) { if (C.state === 'chase') remark(['I think I lost him.', 'He’s gone… for now.', 'Keep moving. Don’t stop.']); else if (C.state === 'stalk') remark(['He was right there…', 'Where did he go?', 'I saw him. I KNOW I saw him.']); } showC(false); C.state = 'hidden'; C.timer = next; C.seen = 0; C.burn = 0; C.stung = false; C.pain = 0; P.flick = 0.5; }
function startChase(dur, scripted) { C.state = 'chase'; C.chaseT = dur; C.scripted = !!scripted; showC(true); if (!C.stung) { SND.stinger(); C.stung = true; } tip('burn', 'Keep your flashlight right on him to drive him back — or shoot him to slow him down!'); }
function stunC() { if (C.state === 'stun') return; SND.shriek(); remark(['Get BACK!', 'Stay away from me!', 'He hates the light!']); C.state = 'stun'; C.timer = 0.7; C.pain = 0; C.burn = 0; if (P.burnUsed) { P.overheat = P.ohMax = C.final ? 4 : 6.5; P.burnUsed = false; if (!G.tips.oh) { G.tips.oh = 1; say('The flashlight overheated! Wait for it to cool down.', 3, ''); } } }
function updateTwitch(dt) { const t = C.tw; t.t -= dt; if (t.t <= 0) { t.tz = (rand() - 0.5) * 1.2; t.ty = (rand() - 0.5) * 0.9; t.t = rand() < 0.35 ? 0.06 + rand() * 0.14 : 0.5 + rand() * 1.6; } t.z += (t.tz - t.z) * Math.min(1, dt * 22); t.y += (t.ty - t.y) * Math.min(1, dt * 22); }
function moveC(speed, dt) {
  const dx = P.x - C.x, dz = P.z - C.z; C.detT = (C.detT || 0) - dt; if (C.detT <= 0) C.det = 0;
  const a = Math.atan2(dx, dz) + (C.det || 0);
  let nx = C.x + Math.sin(a) * speed * dt, nz = C.z + Math.cos(a) * speed * dt; [nx, nz] = collide(nx, nz, 0.45);
  const mv = Math.hypot(nx - C.x, nz - C.z);
  if (mv < speed * dt * 0.4) { C.stuck = (C.stuck || 0) + dt; if (C.detT <= 0) { C.detSide = -(C.detSide || 1); C.det = C.detSide * 1.35; C.detT = 1.2; } }
  else C.stuck = Math.max(0, (C.stuck || 0) - dt * 0.5);
  C.ph += mv * 1.6; C.x = nx; C.z = nz;
  if (C.stuck > 3) { C.stuck = 0; C.det = 0; placeC(22, Math.PI + (rand() - 0.5) * 0.8); }
}
function updateCreature(dt) {
  updateTwitch(dt);
  const st = C.state; if (st === 'off') { if (cr.g.visible && G.mode !== 'menu') showC(false); return; }
  if (st === 'rise') { C.timer -= dt; const gy = H(C.x, C.z), k = 1 - Math.max(0, C.timer) / 1.6; cr.g.position.set(C.x, gy - 3.3 * (1 - k), C.z); cr.g.rotation.y = Math.atan2(P.x - C.x, P.z - C.z); C.mode = 'idle'; poseCreature(cr, 'idle', 0, C.tw, dt); if (C.timer <= 0) { C.stung = true; startChase(999, true); } return; }
  if (st === 'scripted' || st === 'tunnelWait') { poseCreature(cr, C.mode, C.ph += dt * 6, C.tw, dt); return; }
  if (st === 'tunnel') return updateTunnelC(dt);
  if (st === 'climbRun' || st === 'climb' || st === 'fall') return;
  const d = Math.hypot(P.x - C.x, P.z - C.z);
  if (st === 'hidden') { if (P.onTower || P.inTunnel || G.mode !== 'play') return; C.timer -= dt; if (C.timer <= 0) { if (C.final) { placeC(32, (rand() - 0.5) * 5); C.chaseT = 0; startChase(40, false); if (C.rush) C.scripted = true; } else { placeC(26 + rand() * 14, Math.PI + (rand() - 0.5) * 1.8); C.state = 'stalk'; C.timer = 15; C.seen = 0; showC(true); C.stung = false; SND.snap(panOf(C.x, C.z)); } } return; }
  const ang = lookAng(), lit = P.light && P.overheat <= 0 && G.hasLight;
  if (st === 'glimpse') { C.mode = 'idle'; C.timer -= dt; if (ang < 0.45 && d < 50) { C.seen += dt; if (C.seen > 0.05 && !C.stung) { SND.stinger(); C.stung = true; } } if (C.seen > 0.55 || C.timer <= 0) { showC(false); C.state = 'off'; P.flick = 0.4; } }
  else if (st === 'stalk') {
    if (ang < 0.5 && d < 44) { C.seen += dt; if (!C.stung) { SND.stinger(); C.stung = true; } }
    if (C.seen > 0.8) { if (rand() < 0.3 + C.aggr * 0.2) startChase(14 + C.aggr * 3); else vanishC((35 + rand() * 30) / (1 + C.aggr * 0.3)); }
    else { C.timer -= dt; if (C.seen <= 0) moveC(1.3, dt); C.mode = C.seen > 0 ? 'idle' : 'stalk'; if (d < 13) startChase(14 + C.aggr * 3); if (C.timer <= 0) vanishC(30 + rand() * 30); }
  } else if (st === 'chase') {
    C.mode = 'run'; C.stag = Math.max(0, C.stag - dt);
    let sp = C.rush ? 6.6 : C.final ? 4.6 : 4.5 + C.aggr * 0.2;
    if (C.scripted) sp = d > 19 ? 6.3 : d < 8 ? 4.4 : 5.5;
    if (C.stag > 0) sp *= 0.3;
    moveC(sp, dt); C.chaseT -= dt;
    if (lit && ang < 0.2 && d < 17) { C.burn += dt; P.burnUsed = true; cr.g.position.x += (rand() - 0.5) * 0.06; if (C.burn > 1.0) stunC(); } else { C.burn = Math.max(0, C.burn - dt * 0.6); if (C.burn <= 0) P.burnUsed = false; }
    C.stepT -= dt; if (C.stepT <= 0) { C.stepT = 0.36; SND.cstep(panOf(C.x, C.z), clamp(1 - d / 45, 0.05, 1)); }
    if (d < 1.45 && G.mode === 'play' && !P.onTower) { startScare(); return; }
    if (C.rush && C.state === 'chase' && G.obj === 15 && heli.ready && Math.hypot(C.x - Hp.x, C.z - Hp.z) < 1) { /* waits at ladder */ }
    if (!C.scripted && (d > 50 || C.chaseT <= 0)) vanishC(C.final ? 3 + rand() * 2 : 30 + rand() * 25);
  } else if (st === 'stun') {
    C.mode = 'lunge'; C.timer -= dt; const dx = C.x - P.x, dz = C.z - P.z, l = Math.hypot(dx, dz) || 1; C.x += dx / l * 7 * dt; C.z += dz / l * 7 * dt; cr.g.position.x += (rand() - 0.5) * 0.15;
    if (C.timer <= 0) { if (C.scripted) { showC(false); C.state = 'rehunt'; C.timer = 2.2; } else vanishC(C.final ? 3 + rand() * 2.5 : 28 + rand() * 25); }
  } else if (st === 'rehunt') { C.timer -= dt; if (C.timer <= 0) { placeC(24, Math.PI + (rand() - 0.5) * 0.8); C.state = 'chase'; showC(true); SND.shriek(); } return; }
  if (cr.g.visible) { cr.g.position.set(C.x, H(C.x, C.z), C.z); cr.g.rotation.y = Math.atan2(P.x - C.x, P.z - C.z); poseCreature(cr, C.mode, C.ph + (C.mode === 'run' ? 0 : (C.idlePh = (C.idlePh || 0) + dt * 2)), C.tw, dt); }
}
function glimpse() { placeC(36 + rand() * 6, (rand() - 0.5) * 0.9); C.state = 'glimpse'; C.timer = 3.5; C.seen = 0; C.stung = false; showC(true); C.mode = 'idle'; cr.g.position.set(C.x, H(C.x, C.z), C.z); cr.g.rotation.y = Math.atan2(P.x - C.x, P.z - C.z); }

function lightningReveal() {
  if (menuOn || G.mode !== 'play' || P.onTower || P.inTunnel) return;
  if (C.state === 'hidden' && G.obj >= 8 && G.obj <= 14 && rand() < 0.45) {
    placeC(28 + rand() * 10, (rand() - 0.5) * 0.8); cr.g.position.set(C.x, H(C.x, C.z), C.z); cr.g.rotation.y = Math.atan2(P.x - C.x, P.z - C.z); C.mode = 'idle'; poseCreature(cr, 'idle', 0, C.tw, 1); showC(true); G.revealT = 0.6;
    setTimeout(() => { if (G.mode === 'play') SND.stinger(); }, 250); setTimeout(() => remark(['Was that… him?', 'He’s watching me.', 'No no no no…']), 1200);
  } else remark(['Whoa!', 'That was close.', 'This storm keeps getting worse.'], 0.3);
}
// ================= THE WATCHER (rare; just stands there and stares) =================
const WATCH = (() => {
  const g = new THREE.Group(), coat = MSM({ color: 0x4a4d55, roughness: 0.85 }), face = MSM({ color: 0xf4eee4, roughness: 0.45, emissive: 0x1a1816 });
  const body = mk(new THREE.CylinderGeometry(0.2, 0.36, 1.35, 12), coat, 0, 0.72, 0, g); mk(new THREE.CylinderGeometry(0.17, 0.21, 0.5, 12), coat, 0, 1.6, 0, g);
  [-1, 1].forEach(sd => { const a = mk(new THREE.CapsuleGeometry(0.055, 0.6, 3, 8), coat, sd * 0.24, 1.25, 0, g); a.rotation.z = sd * 0.08; sph(0.045, face, sd * 0.26, 0.86, 0.02, g); });
  const head = new THREE.Group(); head.position.y = 1.92; g.add(head);
  sph(0.12, face, 0, 0, 0.02, head, 0.85, 1.12, 0.92); mk(new THREE.SphereGeometry(0.17, 14, 10, 0, Math.PI * 2, 0, Math.PI * 0.62), coat, 0, 0.02, -0.03, head).rotation.x = -0.35;
  [-1, 1].forEach(sd => { sph(0.022, MAT.black, sd * 0.04, 0.02, 0.115, head, 1, 0.7, 0.5); sph(0.009, new THREE.MeshBasicMaterial({ color: 0xd8e0c8 }), sd * 0.04, 0.024, 0.128, head); });
  g.visible = false; g.traverse(o => { if (o.isMesh) o.castShadow = true; }); scene.add(g);
  return { g, head, on: false, t: 0, seen: 0, away: 0, next: 150 + rand() * 120 };
})();
function updateWatcher(dt) {
  const w = WATCH;
  if (!w.on) {
    if (G.mode !== 'play' || P.inTunnel || P.onTower || C.state === 'chase' || cr.g.visible || G.obj >= 11) return;
    w.next -= dt; if (w.next > 0) return;
    w.next = 220 + rand() * 260; if (rand() > 0.55) return;
    let best = null;
    for (let k = 0; k < 16 && !best; k++) { const a = P.yaw + (rand() - 0.5) * 1.6, d = 22 + rand() * 9; let x = P.x - Math.sin(a) * d, z = P.z - Math.cos(a) * d; [x, z] = collide(x, z, 0.5); if (Math.hypot(x - LK.x, z - LK.z) < LK.c + 2) continue; const dx = x - P.x, dz = z - P.z, l = Math.hypot(dx, dz); let clear = true; for (let t = 2; t < l - 1 && clear; t += 0.8) { const qx = P.x + dx / l * t, qz = P.z + dz / l * t, A = CG.get(Math.floor(qx / 6) + ',' + Math.floor(qz / 6)); if (A) for (const c of A) if (Math.hypot(qx - c[0], qz - c[1]) < c[2] + 0.35) { clear = false; break; } } if (clear) best = { x, z }; }
    if (!best) return; const x = best.x, z = best.z;
    w.on = true; w.t = 0; w.seen = 0; w.away = 0; w.g.position.set(x, H(x, z), z); w.g.visible = true; return;
  }
  w.t += dt; const p = w.g.position, dx = P.x - p.x, dz = P.z - p.z, d = Math.hypot(dx, dz);
  w.g.rotation.y += wrapA(Math.atan2(dx, dz) * 0.15 - w.g.rotation.y * 0.15) * 0; // body stays still
  const want = wrapA(Math.atan2(dx, dz) - w.g.rotation.y); w.head.rotation.y += (clamp(want, -1.2, 1.2) - w.head.rotation.y) * Math.min(1, dt * 2.5);
  w.head.rotation.z = Math.sin(w.t * 0.7) * 0.06;
  camera.getWorldDirection(FW); const hx = p.x - camera.position.x, hy = p.y + 1.9 - camera.position.y, hz = p.z - camera.position.z, l = Math.hypot(hx, hy, hz), ang = Math.acos(clamp((FW.x * hx + FW.y * hy + FW.z * hz) / l, -1, 1));
  const inView = ang < 0.55;
  if (inView) { if (!w.seen) { w.seen = 0.001; SND.whisper(panOf(p.x, p.z)); setTimeout(() => remark(['Who… who is that?', 'Hey! HEY! Who’s there?', 'Someone’s just… standing there.', 'Why is he just staring at me?']), 900); } w.seen += dt; w.away = 0; }
  else if (w.seen > 0.6) w.away += dt;
  if (d < 13 || w.away > 1.0 || w.t > 35 || G.mode !== 'play' || P.inTunnel || C.state === 'chase') { w.on = false; w.g.visible = false; if (w.seen > 0.6 && d >= 13 && G.mode === 'play') setTimeout(() => remark(['He’s gone.', 'Where did he go?', 'I didn’t imagine that. Did I?'], 0.8), 700); }
}
// bats flitting over the trees
const BATS = [];
{ const wg = new THREE.BufferGeometry(); wg.setAttribute('position', new THREE.Float32BufferAttribute([0, 0, 0, 0.32, 0.02, -0.06, 0.05, 0, -0.16], 3)); wg.computeVertexNormals(); const bm = new THREE.MeshBasicMaterial({ color: 0x050505, side: THREE.DoubleSide });
  for (let i = 0; i < 7; i++) { const g = new THREE.Group(), wl = new THREE.Mesh(wg, bm), wr = new THREE.Mesh(wg, bm); wr.scale.x = -1; g.add(wl, wr); g.add(new THREE.Mesh(new THREE.SphereGeometry(0.05, 6, 4), bm)); g.visible = false; scene.add(g); BATS.push({ g, wl, wr, ph: rand() * 6, o: new THREE.Vector3((rand() - 0.5) * 6, (rand() - 0.5) * 3, (rand() - 0.5) * 6) }); } }
const BATF = { t: 30, on: false, p: new THREE.Vector3(), v: new THREE.Vector3(), life: 0 };
function updateBats(dt) {
  if (!BATF.on) { BATF.t -= dt; if (BATF.t <= 0 && !P.inTunnel) { BATF.t = 45 + rand() * 60; BATF.on = true; BATF.life = 9; const a = rand() * 6.28; BATF.p.set(P.x + Math.cos(a) * 40, P.y + 9 + rand() * 6, P.z + Math.sin(a) * 40); BATF.v.set(-Math.cos(a), 0, -Math.sin(a)).multiplyScalar(9); BATS.forEach(b => b.g.visible = true); } return; }
  BATF.life -= dt; BATF.p.addScaledVector(BATF.v, dt);
  BATS.forEach((b, i) => { b.ph += dt * (22 + i); const f = Math.sin(b.ph) * 0.9; b.wl.rotation.z = f; b.wr.rotation.z = -f; b.g.position.set(BATF.p.x + b.o.x + Math.sin(FX.t * 3 + i) * 1.2, BATF.p.y + b.o.y + Math.sin(FX.t * 5 + i * 2) * 0.6, BATF.p.z + b.o.z + Math.cos(FX.t * 2.6 + i) * 1.2); b.g.rotation.y = Math.atan2(BATF.v.x, BATF.v.z) + Math.sin(FX.t * 4 + i) * 0.5; });
  if (BATF.life <= 0 || P.inTunnel) { BATF.on = false; BATS.forEach(b => b.g.visible = false); }
}
// ================= TUNNEL =================
const FOG_SWAMP = new THREE.Color(0x1e2818);
function setEnv(tunnel) { const swamp = !tunnel && !P.inHeli && P.x > 1000; W.swamp.visible = swamp; W.cabin.visible = P.inHeli; W.cabinL.intensity = P.inHeli ? 0.45 : 0; if (!P.inHeli) W.alarmL.intensity = 0; W.crashFire.intensity = swamp ? 2.4 : 0; W.shackL.intensity = swamp ? 1.3 : 0; const c = tunnel ? FOG_TUNNEL : swamp ? FOG_SWAMP : FOG_FOREST; scene.fog.color.copy(c); scene.fog.density = tunnel ? 0.07 : swamp ? 0.047 : 0.032; scene.environment = tunnel ? null : (FX.env || null); hemi.intensity = tunnel ? 0.05 : 0.46; moon.intensity = tunnel ? 0 : 0.34; W.tunnel.visible = tunnel; W.endLight.intensity = tunnel ? 1.4 : 0; if (!tunnel) W.tunL.forEach(l => l.intensity = 0); SND.set('tunnel', tunnel ? 0.16 : 0, 0.5); SND.set('wind', tunnel ? 0.02 : 0.13, 0.5); SND.set('leaves', tunnel ? 0 : 0.025, 0.5); }
async function enterTunnel(restoring) {
  G.mode = 'cut'; fade(1); await wait(650);
  P.inTunnel = true; P.onTower = false; G.gateOpen = false; W.gate.position.y = TB.y; setEnv(true); updateChunks(9999, 9999, 0);
  const p = tPoint(6); P.x = p.x; P.z = p.z; P.y = TB.y; P.yaw = Math.atan2(-p.dx, -p.dz); P.pitch = 0;
  C.state = 'tunnelWait'; C.mode = 'crawl'; C.s = 0.2; placeTunnelC(); showC(true); cr.g.scale.set(0.7, 1, 0.7);
  if (!restoring) setObj(12);
  await wait(300); fade(0); await wait(900);
  SND.thud(); await wait(500); SND.stinger(); SND.shriek(); say('He’s squeezing in after you!', 2.6, 'You');
  P.look = { yaw: P.yaw + Math.PI, pitch: -0.15 }; await wait(1500);
  P.look = { yaw: Math.atan2(-p.dx, -p.dz), pitch: 0 }; await wait(500); P.look = null;
  C.state = 'tunnel'; G.mode = 'play'; say('RUN!', 1.5, '');
}
function placeTunnelC() { const p = tPoint(C.s); cr.g.position.set(p.x, TB.y, p.z); cr.g.rotation.y = Math.atan2(p.dx, p.dz); }
function updateTunnelC(dt) {
  const ps = tProject(P.x, P.z).s, gap = ps - C.s; C.mode = 'crawl';
  cr.g.scale.x += (1 - cr.g.scale.x) * Math.min(1, dt * 2); cr.g.scale.z = cr.g.scale.x;
  C.stag = Math.max(0, C.stag - dt);
  let sp = gap > 16 ? 6.6 : gap < 6 ? 4.3 : 4.9; if (C.stag > 0) sp *= 0.3;
  const ang = lookAng(); if (P.light && P.overheat <= 0 && ang < 0.25 && gap < 14) { C.burn += dt; P.burnUsed = true; if (C.burn > 1.0) { C.burn = 0; C.stag = 1.4; SND.shriek(); if (P.burnUsed) { P.overheat = P.ohMax = 5; P.burnUsed = false; } } } else C.burn = Math.max(0, C.burn - dt);
  if (C.pain >= 4) { C.pain = 0; C.stag = 1.4; SND.shriek(); }
  C.s = Math.min(C.s + sp * dt, G.gateOpen ? TLEN : GATE_S - 0.4); C.ph += sp * dt * 1.3;
  placeTunnelC(); poseCreature(cr, 'crawl', C.ph, C.tw, dt);
  C.stepT -= dt; if (C.stepT <= 0) { C.stepT = 0.28; SND.crawl(panOf(cr.g.position.x, cr.g.position.z), clamp(1 - gap / 30, 0.15, 1)); }
  if (gap < 1.4 && G.mode === 'play') startScare();
}
async function exitTunnel() {
  G.mode = 'cut'; fade(1); await wait(650);
  P.inTunnel = false; setEnv(false); showC(false); C.state = 'hidden'; C.timer = 40; cr.g.scale.set(1, 1, 1);
  P.x = L.hatch.x; P.z = L.hatch.z + 2.2; P.y = H(P.x, P.z); P.yaw = Math.atan2(-(Hp.x - P.x), -(Hp.z - P.z)); P.pitch = 0; updateChunks(P.x, P.z, 125);
  setObj(13); await wait(300); fade(0); G.mode = 'play'; SND.clang();
  say('Made it out. The helipad is right there.', 3, 'You'); say(G.wep === 'flare' ? 'Fire the flare!' : 'Get on the pad and fire the flare gun!', 3, 'You');
}

// ================= CUTSCENES =================
function fade(v, kind) { const f = $('fade'); f.classList.toggle('white', kind === true); f.classList.toggle('water', kind === 'water'); f.style.opacity = v; }
async function climb(up) {
  G.mode = 'cut'; fade(1); await wait(650);
  if (up) { P.onTower = true; P.x = T.x; P.z = T.z + 0.6; P.yaw = 0; P.pitch = 0; P.y = TG0 + TY + 0.08; }
  else { P.onTower = false; P.x = T.x; P.z = T.z + 4; P.yaw = Math.PI; P.pitch = 0; P.y = H(P.x, P.z); }
  await wait(200); fade(0); G.mode = 'play';
}
function pour() { SND.pour(); G.poured++; G.carry = -1; W.fpCan.visible = false; if (G.poured < 4) { say(['One can in. Three to go.', 'Halfway there.', 'One more can.'][G.poured - 1], 3, 'You'); if (G.poured === 2) G.glimpseAt = G.time + 12; checkpoint(); refreshObj(); } else { say('That’s enough fuel. Now start it.', 3, 'You'); setObj(3); } }
async function startGen() { G.mode = 'cut'; SND.sputter(); say('Come on…', 2, 'You'); await wait(1700); SND.sputter(); await wait(1600); G.power = true; applyPower(); say('It’s running!', 2.4, 'You'); say('Harlan said to check the radio tower. It’s north, up the trail.', 4, 'You'); G.glimpseAt = G.time + 50; G.mode = 'play'; setObj(4); }
function applyPower() {
  W.genL.intensity = G.power ? 1.5 : 0; W.bulbMat.emissive.setHex(G.power ? 0xffd59a : 0); W.bulbMat.emissiveIntensity = 1.5;
  const tw = G.power && G.fuseIn; W.flood.intensity = tw ? 2.2 : 0; W.beacon.visible = tw; W.fuseLed.emissive.setHex(tw ? 0x30ff40 : (G.power ? 0xff2010 : 0)); W.radioLed.emissive.setHex(tw ? 0x30ff40 : 0);
}
async function radioScene() {
  G.mode = 'cut'; SND.radioBlip(); SND.set('stat', 0.15, 0.05);
  const lines = [['You', 'Hello? This is the caretaker at Hollow Pines. Is anyone there?', 3.8], ['Radio', '…kkhh… Hollow Pines? That’s Harlan’s land.', 3.4], ['Radio', 'Harlan called us a week ago. He said he wasn’t going on vacation…', 4.2], ['Radio', '…he was running from something in the trees.', 3.6], ['You', 'Running from WHAT?', 2.4], ['Radio', 'Listen. Get the flare gun from the ranger station, west of the tower.', 4.2], ['Radio', 'Fire it on the helipad in the northeast. We’ll send a chopper.', 4.2], ['Radio', 'And stay in the light. Whatever you do, don’t let it get clo—', 4.2]];
  let tot = 0; for (const [w, t, d] of lines) { say(t, d, w); tot += d; }
  await wait(tot * 1000 - 300); await waitSubs(15000); SND.set('stat', 0, 0.05); SND.radioBlip(); clearSubs();
  for (let i = 0; i < 6; i++) { W.flood.intensity = i % 2 ? 2.2 : 0; await wait(110); }
  C.x = T.x - 8; C.z = T.z + 13; C.state = 'scripted'; C.mode = 'idle'; showC(true); cr.g.position.set(C.x, H(C.x, C.z), C.z); cr.g.rotation.y = Math.atan2(T.x - C.x, T.z - C.z); W.flood.intensity = 2.2;
  const cy = TG0 + TY + 1.7; P.look = { yaw: Math.atan2(-(C.x - P.x), -(C.z - P.z)), pitch: Math.atan2(H(C.x, C.z) + 2.8 - cy, Math.hypot(C.x - P.x, C.z - P.z)) };
  SND.stinger(); await wait(3000);
  for (let i = 0; i < 4; i++) { W.flood.intensity = i % 2 ? 2.2 : 0; await wait(90); }
  showC(false); C.state = 'off'; W.flood.intensity = 2.2; P.look = null;
  say('What… was THAT?', 2.6, 'You'); say('I need that flare gun. The ranger station is west.', 3.6, 'You');
  G.mode = 'play'; setObj(8); C.state = 'hidden'; C.timer = 30;
}
function scriptedChase() { placeC(30, Math.PI); SND.snap(panOf(C.x, C.z)); C.stung = false; startChase(22, false); say('Behind you — RUN!', 2.5, ''); }
async function bigChase() {
  G.guns.flare = true; SND.unlock(); G.mode = 'cut'; showItem(flarePick, false);
  say('The flare gun! Got it!', 2.4, 'You'); equip('flare'); await wait(1600);
  SND.creak(0); await wait(400); SND.thud();
  W.arrows.visible = true; setObj(11);
  const tx = L.tunnel.x - P.x, tz = L.tunnel.z - P.z; P.look = null;
  const away = Math.atan2(-tx, -tz) + Math.PI; C.x = P.x - Math.sin(away) * 24; C.z = P.z - Math.cos(away) * 24; [C.x, C.z] = collide(C.x, C.z, 0.5);
  C.stung = false; startChase(999, true); G.mode = 'play'; say('He’s here! Follow the red arrows — RUN!', 3, '');
}
async function fireFlare() {
  if (G.obj !== 13) return; equip('flare'); G.mode = 'cut'; await wait(450);
  SND.flare(); WS.recoil = 1; W.muzzle.material.opacity = 1; W.muzzleL.intensity = 4; P.pitch = 0.9;
  G.flareT = 0; W.flare.visible = true; W.flareL.intensity = 2.4; W.padLightMat.opacity = 0.9;
  G.guns.flare = false; equip(G.guns.shotgun ? 'shotgun' : G.guns.pistol ? 'pistol' : 'none');
  await wait(900); G.mode = 'play'; setObj(14); G.surviveT = 30; C.final = true; C.rush = false; C.scripted = false; C.state = 'hidden'; C.timer = 5; G.wolfT = 2;
  say('We see your flare! Chopper’s inbound — hold on for thirty seconds!', 4, 'Radio');
}
async function heliArrive() {
  G.mode = 'cut'; C.state = 'off'; showC(false); SND.set('drone', 0, 1);
  for (const a of ANIMALS.slice()) if (!a.deer && !a.dead) removeAnimal(a);
  heli.g.visible = true; heli.t = 0; heli.ready = false; heli.spot.intensity = 3.2; heli.ladder.scale.y = 0.001;
  say('You hear rotor blades…', 2.5, '');
  while (heli.t < 7.5) { const p = heli.g.position; P.look = { yaw: Math.atan2(-(p.x - P.x), -(p.z - P.z)), pitch: clamp(Math.atan2(p.y - P.y - 1.6, Math.hypot(p.x - P.x, p.z - P.z)), -0.3, 1.2) }; await wait(50); }
  say('Grab the ladder! GO!', 2.6, 'Pilot'); SND.clang();
  const t0 = performance.now(); while (performance.now() - t0 < 1600) { heli.ladder.scale.y = Math.max(0.001, 1 - Math.pow(1 - (performance.now() - t0) / 1600, 3)); await wait(16); }
  heli.ladder.scale.y = 1; heli.ready = true; P.look = null; G.mode = 'play'; setObj(15);
  C.final = true; C.rush = true; C.state = 'hidden'; C.timer = 2.2;
}
function heliPos(t) { const e = 1 - Math.pow(1 - clamp(t / 7.5, 0, 1), 3), gy = H(Hp.x, Hp.z), sx = Hp.x + 260, sz = Hp.z + 140; return { x: lerp(sx, Hp.x, e), y: lerp(gy + 55, gy + 14.9, e), z: lerp(sz, Hp.z, e) }; }
function startClimb() {
  G.mode = 'climb'; P.cy = 0.2; P.cv = 0; P.climbT = 0; P.yaw = 0; P.pitch = -0.7; equip('none'); setObj(15);
  P.x = Hp.x; P.z = Hp.z + 0.6 + 0.45;
  C.state = 'climbRun'; const a = rand() * 6.28; C.x = Hp.x + Math.sin(a) * 16; C.z = Hp.z + Math.cos(a) * 16; C.cy = 0; showC(true); SND.stinger(); SND.shriek();
  say('He’s right behind you — CLIMB!', 2.6, ''); tip('climb', touch ? 'Hold USE (or push the stick up) to climb!' : 'Hold W (or E) to climb!');
}
function updateClimb(dt) {
  const gy = H(Hp.x, Hp.z), held = K.KeyW || K.ArrowUp || K.KeyE || K.Space || touchUse || padUse || jy < -0.4 || padY < -0.4;
  P.cv += ((held ? 2.35 : 0) - P.cv) * Math.min(1, dt * 8); const old = P.cy; P.cy = Math.min(12.6, P.cy + P.cv * dt);
  if (Math.floor(P.cy / 0.4) !== Math.floor(old / 0.4)) SND.rung();
  P.bob += P.cv * dt * 4;
  P.x = Hp.x; P.z = Hp.z + 1.05; P.y = gy + P.cy;
  // creature: run to the ladder, then climb right under you
  if (C.state === 'climbRun') { const dx = Hp.x - C.x, dz = Hp.z + 0.75 - C.z, d = Math.hypot(dx, dz); C.mode = 'run'; if (d > 0.4) { C.x += dx / d * 8 * dt; C.z += dz / d * 8 * dt; C.ph += 8 * dt * 1.6; C.stepT -= dt; if (C.stepT <= 0) { C.stepT = 0.3; SND.cstep(0, 0.9); } } else { C.state = 'climb'; C.cy = 0; SND.shriek(); } cr.g.position.set(C.x, gy, C.z); cr.g.rotation.y = Math.atan2(dx, dz); }
  else if (C.state === 'climb') { C.cy += 2.5 * dt; C.ph += dt * 7; C.mode = 'climb'; cr.g.position.set(Hp.x, gy + C.cy, Hp.z + 0.75); cr.g.rotation.y = Math.PI; if (rand() < dt * 2) SND.rung(); if (C.cy + 3.0 > P.cy - 0.1 && G.mode === 'climb') { G.mode = 'play'; startScare(); return; } }
  poseCreature(cr, C.mode, C.ph, C.tw, dt);
  if (P.cy >= 12.6 && G.mode === 'climb') winSequence();
}
async function winSequence() {
  G.mode = 'cut'; P.look = { yaw: 0, pitch: -1.1 }; SND.shriek();
  say('You grab the door frame and haul yourself in!', 2.6, '');
  C.state = 'fall'; let vy = 0; const t0 = performance.now();
  while (performance.now() - t0 < 2200) { const dt = 0.016; vy -= 9.8 * dt; cr.g.position.y = Math.max(H(Hp.x, Hp.z), cr.g.position.y + vy * dt); cr.g.rotation.x += dt * 1.5; heli.g.position.y += dt * 2; P.y += dt * 2; await wait(16); }
  SND.thud(); fade(1, true); await wait(1200);
  G.done = true; G.ch1done = true; G.obj = 16; G.hintK = null; checkpoint(); try { const st = JSON.parse(localStorage.getItem('hollowPinesStats') || '{}'); st.escaped = (st.escaped || 0) + 1; st.bestTime = Math.min(st.bestTime || 1e9, G.time); localStorage.setItem('hollowPinesStats', JSON.stringify(st)); } catch (e) {}
  G.mode = 'win'; showC(false); C.state = 'off'; $('hud').style.display = 'none'; $('touch').style.display = 'none'; SND.set('heli', 0, 2); SND.set('drone', 0, 1);
  $('winT').innerHTML = `The helicopter lifts you over the pines. Far below, in the red glow of the flare, a tall shape stands in the clearing… watching you leave.<br><br>Time: ${fmtT(G.time)} · Deaths: ${G.deaths}<br><br><b>Chapter 2 is now unlocked</b> on the home screen.<br><br>Mr. Harlan never came back from his “vacation.”`;
  $('win').style.display = 'grid'; fade(0); try { document.exitPointerLock(); } catch (e) {}
}

// ================= CHAPTER 2: THE HELICOPTER + THE SWAMP =================
const CH2 = { crashT: -1, beep: 0 };
function heliMove(dt, mx, mz, moving) {
  const fx = -Math.sin(P.yaw), fz = -Math.cos(P.yaw), rx = Math.cos(P.yaw), rz = -Math.sin(P.yaw);
  let nx = P.x + (fx * mz + rx * mx) * 2.6 * dt, nz = P.z + (fz * mz + rz * mx) * 2.6 * dt;
  const door = nz > -0.65 && nz < 0.8; nx = clamp(nx, -0.7, door ? 1.3 : 1.0); nz = clamp(nz, -2.1, 2.35);
  const mv = Math.hypot(nx - P.x, nz - P.z); P.x = nx; P.z = nz;
  if (moving && G.mode === 'play') { P.bob += mv * 2.3; P.stepAcc += mv; if (P.stepAcc > 0.8) { P.stepAcc = 0; SND.step(false, true); } }
}
function startChapter2() {
  P.inHeli = true; P.onTower = false; P.inTunnel = false; P.falling = false; P.x = 0.2; P.z = 1.9; P.yaw = 0; P.pitch = -0.05; P.y = 0;
  W.cabin.rotation.set(0, 0, 0); CH2.crashT = -1; W.alarmL.intensity = 0; W.cabinScreens.forEach(m => m.emissive.setHex(m === W.cabinScreens[0] ? 0x40ff90 : 0xffb040));
  C.state = 'off'; showC(false); cr.g.scale.set(1, 1, 1); cr.g.rotation.set(0, 0, 0); clearAnimals(); heli.g.visible = false; W.flare.visible = false; W.flareL.intensity = 0; W.arrows.visible = false; G.flareT = -1;
  G.obj = 16; refreshObj(); setEnv(false); SND.set('heli', 0.5, 1); SND.set('drone', 0, 0.5);
  say('Chapter 2 — The Swamp', 3, ''); say('The pilot is up front. Go talk to him.', 3.5, 'Tip');
}
async function pilotTalk() {
  const lines = [['Pilot', 'Harlan’s caretaker? Kid, you are lucky to be alive.', 3.4], ['You', 'Did you see it? Under the ladder? It was right under me!', 3.4], ['Pilot', 'I saw… something. Figured it was a shadow from the searchlight.', 3.8], ['Pilot', 'Sit tight. Hospital in Millbrook, twenty minutes.', 3.2]];
  let tot = 0; for (const [w, t, d] of lines) { say(t, d, w); tot += d; } await wait(tot * 1000); await waitSubs(15000); await wait(2500);
  if (G.obj !== 16 || !P.inHeli) return;
  SND.thud(); P.shake = 0.8; await wait(500); SND.thud(); SND.gate(); P.shake = 0.6;
  say('What the—? Something just landed on the roof!', 3, 'Pilot'); say('Go check the back window!', 2.6, 'Pilot');
  setObj(17, true);
}
async function backWindowScene() {
  G.mode = 'cut'; clearSubs(); const cb = W.cabin; cb.updateMatrixWorld();
  const head = cb.localToWorld(new THREE.Vector3(0, -1.75, 3.05)); cr.g.position.copy(head); cr.g.rotation.set(0, cb.rotation.y + Math.PI, 0); C.state = 'scripted'; C.mode = 'climb'; showC(true);
  P.look = { yaw: Math.PI, pitch: 0.05 }; await wait(700);
  SND.stinger(); SND.scream(); P.shake = 1; await wait(1300);
  SND.clang(); await wait(500); showC(false); C.state = 'off'; P.look = null;
  say('IT’S ON THE TAIL ROTOR! WE’RE GOING DOWN!', 3, 'Pilot'); say('There’s water below us — JUMP! JUMP NOW!', 3.2, 'Pilot');
  CH2.crashT = 14; G.mode = 'play'; setObj(18, true);
}
async function jumpOut() {
  G.mode = 'cut'; clearSubs(); SND.whoosh(); fade(1, true); await wait(500);
  P.inHeli = false; W.cabin.visible = false; W.alarmL.intensity = 0; CH2.crashT = -1; SND.set('heli', 0, 0.8);
  P.x = SW.x; P.z = SW.z; P.y = 30; P.yaw = 0.3; P.pitch = -1.35; P.falling = true; setEnv(false); updateChunks(9999, 0, 0);
  fade(0); const t0 = performance.now(); while (performance.now() - t0 < 1300) { const k = (performance.now() - t0) / 1300; P.y = 30 - 32 * k * k; await wait(16); }
  SND.bigSplash(); fade(0.9, 'water'); P.y = -2.2; await wait(1300);
  P.falling = false; P.y = H(P.x, P.z); P.pitch = 0.08; P.yaw = Math.atan2(-(W.crash.x - P.x), -(W.crash.z - P.z)) + 0.5; fade(0);
  await wait(400); SND.boom(); P.shake = 0.6;
  say('*gasp* I’m… I’m alive.', 2.6, 'You'); say('The helicopter… it went down over there. I can see the fire.', 3.6, 'You');
  G.mode = 'play'; setObj(19);
}
async function radioScene2() {
  G.mode = 'cut'; SND.radioBlip(); SND.set('stat', 0.12, 0.05);
  const lines = [['You', 'Hello? Anyone? The helicopter crashed in the swamp!', 3.2], ['Radio', '…kkh… This is Bayou Ranger Post Nine. Say again — crashed where?', 3.8], ['You', 'There’s a wreck burning on an island. The pilot’s gone. Something took him.', 4], ['Radio', 'I can see the smoke, but I’ll never find you in this fog.', 3.4], ['Radio', 'There’s an old pump station south-east of you. Get its generator running and the floodlights will bring me in.', 5], ['Radio', 'The tank’s dry. Try the old houseboat to the east, and the stilt village down south.', 4.4], ['Radio', 'And stay out of the deep water. Gators are bad this year.', 3.4], ['You', 'Gators are the least of my problems.', 2.6]];
  let tot = 0; for (const [w, t, d] of lines) { say(t, d, w); tot += d; }
  G.mode = 'play'; setObj(23); C.aggr = 2; if (C.state === 'off') { C.state = 'hidden'; C.timer = 45; }
  await wait(tot * 1000); SND.set('stat', 0, 0.1);
}
async function startPump() {
  if (G.sgas.length < 2) { say('The tank is bone dry. I need both gas cans first.', 3, 'You'); return; }
  G.mode = 'cut'; SND.pour(); await wait(1500); SND.sputter(); await wait(1700); SND.sputter(); await wait(900);
  C.state = 'off'; showC(false); pumpOn(true); SND.boom(); await wait(1300); pumpOn(false); SND.sputter(); await wait(250); pumpOn(true); await wait(350); pumpOn(false); SND.sputter();
  G.mode = 'play'; say('No, no, no… the lights died again.', 2.8, 'You'); say('The pump is choking on something. The flood valves are out in the old basin, north of here — in the deep water.', 4.2, 'You'); setObj(28); hint(`Wade out and hold ${KEYN} to turn the valves`, 4);
}
function pumpOn(on) { W.pumpL.intensity = on ? 3 : 0; W.pumpLampM.emissive.setHex(on ? 0xe8f0ff : 0); W.pumpLampM.emissiveIntensity = 2; SND.set('siren', on ? 0.08 : 0, 0.5); G.pumpOn = on; }
function swampChase() { hollowChaseStart(true); }
async function ch2End() {
  G.mode = 'cut'; showC(false); C.state = 'off'; if (typeof hShow === 'function') hShow(false); SND.set('drone', 0, 0.3); SND.door(); fade(1); await wait(800); SND.thud(); await wait(1600);
  for (let i = 0; i < 3; i++) { SND.thud(); P.shake = 0.5; await wait(700); } SND.whisper(0); await wait(1500);
  G.ch2done = true; checkpoint(); clearCh2(G.slot); G.mode = 'win'; $('hud').style.display = 'none'; $('touch').style.display = 'none';
  $('winH').textContent = 'Chapter 2 Complete';
  $('winT').innerHTML = 'You slam the shack door and drop the bar across it.<br>Long fingers scrape slowly down the wall outside. The Hollow One is still out there… then the swamp goes quiet.<br><br>Time: ' + fmtT(G.time) + ' · Deaths: ' + G.deaths + '<br><br><b>Chapter 3 is coming soon.</b>';
  $('win').style.display = 'grid'; fade(0); try { document.exitPointerLock(); } catch (e) {}
}
function updateCh2(dt) {
  if (P.inHeli) {
    const cb = W.cabin, t = G.time; let roll = Math.sin(t * 0.8) * 0.02, pitch = Math.sin(t * 0.6) * 0.012;
    if (CH2.crashT >= 0) { const k = 1 - CH2.crashT / 14; roll += Math.sin(t * 3.1) * (0.08 + k * 0.2); pitch += Math.sin(t * 2.3) * 0.06 * (1 + k); cb.rotation.y += dt * (0.4 + k * 1.4); P.shake = Math.max(P.shake, 0.25 + k * 0.4);
      CH2.beep -= dt; if (CH2.beep <= 0) { CH2.beep = 0.45; SND.alarm(); } const on = Math.sin(t * 12) > 0; W.alarmL.intensity = on ? 1.6 : 0.1; W.cabinScreens.forEach(m => m.emissive.setHex(on ? 0xff2010 : 0x200000));
      if (G.mode === 'play') { CH2.crashT -= dt; if (CH2.crashT <= 0) { CH2.crashT = -1; SND.boom(); fade(1, true); setTimeout(() => { fade(0); G.deaths++; showDead('The helicopter went down with you inside. Jump out the open door!'); }, 900); G.mode = 'cut'; } } }
    cb.rotation.z = roll; cb.rotation.x = pitch;
  }
  if (W.swamp.visible) {
    W.rippleN.offset.x += dt * 0.006; W.rippleN.offset.y += dt * 0.0035;
    G.bugT = (G.bugT || 3) - dt; if (G.bugT <= 0) { G.bugT = 4 + rand() * 7; const r = rand(); if (r < 0.45) SND.bullfrog(rand() * 2 - 1); else if (r < 0.75) SND.buzz(rand() * 2 - 1); else SND.plop(rand() * 2 - 1); }
    W.flames.forEach((f, i) => { const u = f.userData; u.ph += dt * 6; const sc = 1.4 + Math.sin(u.ph + i) * 0.5 + rand() * 0.3; f.scale.set(sc, sc * 1.5, sc); f.position.y = u.by + Math.sin(u.ph * 0.7) * 0.15; });
    W.smoke.forEach(sp => { const u = sp.userData; u.t = (u.t + dt * 0.08) % 1; sp.position.set(W.crash.x + Math.sin(u.t * 9) * 1.5, H(W.crash.x, W.crash.z) + 1.5 + u.t * 14, W.crash.z + u.t * 3); const sc = 2 + u.t * 7; sp.scale.set(sc, sc, sc); sp.material.opacity = 0.45 * (1 - u.t); });
    W.crashFire.intensity = 2.2 + Math.sin(G.time * 11) * 0.3 + rand() * 0.3; W.shackWin.emissiveIntensity = 0.8 + Math.sin(G.time * 5) * 0.1;
    if (G.mode === 'play') {
      if (G.obj === 19 && H(P.x, P.z) > 0.25) { say('Solid ground. Finally.', 2.6, 'You'); setObj(20); }
      if (G.obj === 20 && Math.hypot(P.x - W.crash.x, P.z - W.crash.z) < 15) { say('The pilot… he’s gone.', 2.8, 'You'); say('Maybe there’s something useful in the wreck.', 3, 'You'); setObj(21); }
      if (G.obj === 24 && Math.hypot(P.x - W.pump.x, P.z - W.pump.z) < 14) { say('The pump station. Generator’s around the side.', 3, 'You'); setObj(25); }
      if (G.obj === 26) { G.surviveT -= dt; if (G.surviveT <= 0) { C.final = false; C.state = 'off'; showC(false); tallManDeath(); } }
      if (G.church && Math.hypot(P.x - W.church.x, P.z - W.church.z) < 40 && rand() < dt * 0.08) SND.bell(panOf(W.church.x, W.church.z));
    }
  }
  if (typeof updateMonsters === 'function') updateMonsters(dt);
}
// ================= NOTES / PAUSE / DEATH =================
let noteCb = null;
function openNote(t, cb) { G.prevMode = G.mode; G.mode = 'note'; noteCb = cb || null; $('noteT').textContent = t; $('noteClose').textContent = touch ? 'Close' : 'Close (E)'; $('note').style.display = 'grid'; }
function closeNote() { if (G.mode !== 'note') return; $('note').style.display = 'none'; G.mode = 'play'; usePress = false; if (noteCb) { const c = noteCb; noteCb = null; c(); } }
$('note').addEventListener('click', closeNote); $('note').addEventListener('touchend', e => { e.preventDefault(); closeNote(); });
let pausedFrom = 'play';
function pause() { if (G.mode !== 'play' && G.mode !== 'climb') return; hush(); pausedFrom = G.mode; G.mode = 'pause'; $('pauseP').style.display = 'grid'; try { document.exitPointerLock(); } catch (e) {} }
$('pResume').onclick = () => { $('pauseP').style.display = 'none'; G.mode = pausedFrom; lock(true); };
$('pSet').onclick = () => { $('pauseP').style.display = 'none'; openPanel('setP', 'pauseP'); };
$('pMenu').onclick = () => { $('pauseP').style.display = 'none'; const safe = G.mode === 'pause' && pausedFrom === 'play' && ![11, 12, 14, 15, 27, 31].includes(G.obj) && C.state !== 'chase' && !P.inTunnel; if (safe) checkpoint(); showMenu(); };
const DEATH_TIPS = ['Keep your flashlight right on him to make him back off.', 'Shooting him slows him down for a moment.', 'Running drains stamina. Walk when he’s not chasing.', 'Wolves come in packs. The shotgun is in the lookout shed by the tower.', 'Ammo boxes are hidden in sheds and at every landmark.', 'Don’t stare at him when he’s just watching. He doesn’t like it.'];
function die(by) { if (G.mode !== 'play' && G.mode !== 'scare') return; G.deaths++; G.mode = 'dead'; showDead(by === 'wolf' ? 'The wolves got you.' : by === 'gator' ? 'The alligator dragged you under.' : by === 'mire' ? 'Something in the water dragged you under. When it grabs you, HOLD the use button to break free!' : ''); }
function showDead(msg) { hush(); SND.set('siren', 0, 0.3);
  G.mode = 'dead'; $('hud').style.display = 'none'; $('touch').style.display = 'none'; SND.set('drone', 0, 0.5); SND.set('breath', 0, 0.3);
  $('deadTip').textContent = (msg ? msg + ' ' : '') + DEATH_TIPS[Math.floor(rand() * DEATH_TIPS.length)];
  $('dead').style.display = 'grid'; try { document.exitPointerLock(); } catch (e) {}
}
$('dRetry').onclick = () => { $('dead').style.display = 'none'; const d = G.deaths; restore(CP || readSlot(G.slot)); G.deaths = d; begin(); };
$('dMenu').onclick = () => { $('dead').style.display = 'none'; showMenu(); };
$('wMenu').onclick = () => { $('win').style.display = 'none'; showMenu(); };
$('wCred').onclick = () => { $('win').style.display = 'none'; showMenu(); openPanel('credP', null); };

// ================= JUMPSCARE =================
const sc = $('scare'), sg = sc.getContext('2d'); let faceImg = null, scareT = 0;
function renderFace() {
  const c = document.createElement('canvas'), Wf = 600, Hf = 780; c.width = Wf; c.height = Hf; const g = c.getContext('2d'); let s = 9; const r = () => { s = (s * 16807) % 2147483647; return s / 2147483647; };
  g.fillStyle = '#000'; g.fillRect(0, 0, Wf, Hf); const cx = 300, cy = 350; let gr;
  gr = g.createRadialGradient(cx, Hf + 80, 40, cx, Hf + 80, 380); gr.addColorStop(0, '#3a332c'); gr.addColorStop(1, 'rgba(0,0,0,0)'); g.fillStyle = gr; g.fillRect(0, 0, Wf, Hf);
  gr = g.createRadialGradient(cx, cy + 200, 30, cx, cy + 200, 240); gr.addColorStop(0, '#8a8075'); gr.addColorStop(0.6, '#4a423a'); gr.addColorStop(1, 'rgba(0,0,0,0)'); g.fillStyle = gr; g.beginPath(); g.ellipse(cx, cy + 195, 178, 255, 0, 0, 7); g.fill();
  gr = g.createRadialGradient(cx - 50, cy - 150, 20, cx, cy - 20, 330); gr.addColorStop(0, '#e3dccf'); gr.addColorStop(0.3, '#b3a99a'); gr.addColorStop(0.62, '#5c5349'); gr.addColorStop(1, '#000'); g.fillStyle = gr; g.beginPath(); g.ellipse(cx, cy - 40, 205, 290, 0, 0, 7); g.fill();
  for (let i = 0; i < 900; i++) { const a = r() * 7, d = Math.sqrt(r()) * 260; g.fillStyle = r() < 0.5 ? `rgba(60,40,35,${r() * 0.13})` : `rgba(230,220,205,${r() * 0.06})`; g.beginPath(); g.arc(cx + Math.cos(a) * d * 0.75, cy - 40 + Math.sin(a) * d, 1 + r() * 9, 0, 7); g.fill(); }
  g.lineCap = 'round'; for (let v = 0; v < 16; v++) { let x = cx + (r() - 0.5) * 320, y = cy - 250 + r() * 330, a = r() * 7; g.strokeStyle = `rgba(${70 + r() * 30},25,60,${0.25 + r() * 0.25})`; g.lineWidth = 0.6 + r() * 1.6; g.beginPath(); g.moveTo(x, y); for (let k = 0; k < 22; k++) { a += (r() - 0.5) * 0.9; x += Math.cos(a) * 7; y += Math.sin(a) * 7; g.lineTo(x, y); } g.stroke(); }
  [-1, 1].forEach(sd => { gr = g.createRadialGradient(cx + sd * 140, cy + 40, 10, cx + sd * 140, cy + 40, 140); gr.addColorStop(0, 'rgba(0,0,0,.75)'); gr.addColorStop(1, 'rgba(0,0,0,0)'); g.fillStyle = gr; g.fillRect(0, 0, Wf, Hf); });
  gr = g.createLinearGradient(0, cy - 150, 0, cy - 60); gr.addColorStop(0, 'rgba(0,0,0,0)'); gr.addColorStop(1, 'rgba(0,0,0,.45)'); g.fillStyle = gr; g.beginPath(); g.ellipse(cx, cy - 95, 190, 55, 0, 0, 7); g.fill();
  [-1, 1].forEach(sd => {
    const ex = cx + sd * 82, ey = cy - 80; g.save(); g.translate(ex, ey); g.rotate(sd * -0.18); g.scale(1, 0.78); gr = g.createRadialGradient(0, 0, 5, 0, 0, 95); gr.addColorStop(0, '#000'); gr.addColorStop(0.5, 'rgba(0,0,0,.97)'); gr.addColorStop(0.8, 'rgba(25,4,4,.5)'); gr.addColorStop(1, 'rgba(0,0,0,0)'); g.fillStyle = gr; g.beginPath(); g.arc(0, 0, 95, 0, 7); g.fill(); g.restore();
    gr = g.createRadialGradient(ex - sd * 4, ey + 4, 0, ex - sd * 4, ey + 4, 17); gr.addColorStop(0, 'rgba(255,250,235,1)'); gr.addColorStop(0.25, 'rgba(255,235,210,.75)'); gr.addColorStop(1, 'rgba(255,200,180,0)'); g.fillStyle = gr; g.beginPath(); g.arc(ex - sd * 4, ey + 4, 17, 0, 7); g.fill();
    for (let k = 0; k < 2; k++) { let x = ex + (r() - 0.5) * 30, y = ey + 40; const w = 3 + r() * 5; g.strokeStyle = 'rgba(115,0,0,.9)'; g.lineWidth = w; g.beginPath(); g.moveTo(x, y); for (let q = 0; q < 12; q++) { x += (r() - 0.5) * 5; y += 12 + r() * 9; g.lineTo(x, y); } g.stroke(); g.fillStyle = 'rgba(115,0,0,.9)'; g.beginPath(); g.arc(x, y, w * 0.8, 0, 7); g.fill(); }
  });
  g.fillStyle = 'rgba(0,0,0,.85)'; [-1, 1].forEach(sd => { g.beginPath(); g.ellipse(cx + sd * 17, cy + 25, 7, 15, sd * 0.4, 0, 7); g.fill(); });
  const my = cy + 178, mrx = 105, mry = 150;
  g.save(); g.beginPath(); g.ellipse(cx, my, mrx + 14, mry + 12, 0, 0, 7); g.fillStyle = '#420707'; g.fill();
  g.beginPath(); g.ellipse(cx, my, mrx, mry, 0, 0, 7); gr = g.createRadialGradient(cx, my + 20, 10, cx, my, mry); gr.addColorStop(0, '#000'); gr.addColorStop(0.7, '#140000'); gr.addColorStop(1, '#3e0505'); g.fillStyle = gr; g.fill(); g.clip();
  const tooth = (x, y, w, h, dn) => { const sgn = dn ? 1 : -1; gr = g.createLinearGradient(x, y, x, y + h * sgn); gr.addColorStop(0, '#5a4a30'); gr.addColorStop(0.25, '#cfc4a0'); gr.addColorStop(1, '#efe6c8'); g.fillStyle = gr; g.beginPath(); g.moveTo(x - w / 2, y); g.quadraticCurveTo(x - w * 0.1, y + h * 0.6 * sgn, x + (r() - 0.5) * w * 0.3, y + h * sgn); g.quadraticCurveTo(x + w * 0.1, y + h * 0.6 * sgn, x + w / 2, y); g.fill(); };
  for (let i = 0; i < 11; i++) { const a = Math.PI * (1.12 + i * 0.076); tooth(cx + Math.cos(a) * mrx * 0.98, my + Math.sin(a) * mry * 0.98 - 4, 16 + r() * 12, 26 + r() * 42, true); }
  for (let i = 0; i < 10; i++) { const a = Math.PI * (0.12 + i * 0.084); tooth(cx + Math.cos(a) * mrx * 0.98, my + Math.sin(a) * mry * 0.98 + 4, 14 + r() * 12, 22 + r() * 36, false); }
  gr = g.createRadialGradient(cx, my + 10, 0, cx, my + 10, 75); gr.addColorStop(0, '#000'); gr.addColorStop(1, 'rgba(0,0,0,0)'); g.fillStyle = gr; g.fillRect(cx - 100, my - 100, 200, 200); g.restore();
  for (let k = 0; k < 6; k++) { let x = cx + (r() - 0.5) * 170, y = my + mry * 0.85 + r() * 10; const w = 4 + r() * 7; g.strokeStyle = 'rgba(110,0,0,.95)'; g.lineWidth = w; g.beginPath(); g.moveTo(x, y); const L2 = 6 + r() * 12; for (let q = 0; q < L2; q++) { x += (r() - 0.5) * 4; y += 10; g.lineTo(x, y); } g.stroke(); g.fillStyle = 'rgba(110,0,0,.95)'; g.beginPath(); g.arc(x, y, w * 0.9, 0, 7); g.fill(); }
  const id = g.getImageData(0, 0, Wf, Hf), d = id.data; for (let i = 0; i < d.length; i += 4) { const n = (Math.random() - 0.5) * 26; d[i] += n; d[i + 1] += n; d[i + 2] += n; } g.putImageData(id, 0, 0);
  gr = g.createRadialGradient(cx, cy, 200, cx, cy, 520); gr.addColorStop(0, 'rgba(0,0,0,0)'); gr.addColorStop(1, '#000'); g.fillStyle = gr; g.fillRect(0, 0, Wf, Hf);
  return c;
}
function startScare() { rumble(1, 1, 900);
  if (G.mode === 'scare' || G.mode === 'dead') return;
  if (!faceImg) faceImg = renderFace();
  G.mode = 'scare'; scareT = 0; G.deaths++; SND.scream(); P.look = null; C.state = 'off'; SND.set('drone', 0, 0.1);
  $('hud').style.display = 'none'; $('touch').style.display = 'none';
  try { if (navigator.vibrate) navigator.vibrate([250, 60, 400]); } catch (e) {}
}
function updateScare(dt) {
  scareT += dt;
  if (scareT < 0.32) { // lunge
    camera.getWorldDirection(FW); const d = lerp(1.8, 0.35, scareT / 0.32); cr.g.visible = true; cr.g.scale.set(1, 1, 1);
    cr.g.position.set(camera.position.x + FW.x * d, camera.position.y - 2.85, camera.position.z + FW.z * d); cr.g.rotation.y = Math.atan2(-FW.x, -FW.z); poseCreature(cr, 'lunge', 0, C.tw, dt);
    camera.position.x += (rand() - 0.5) * 0.08; camera.position.y += (rand() - 0.5) * 0.08; return;
  }
  if (sc.style.display !== 'block') { sc.width = innerWidth; sc.height = innerHeight; sc.style.display = 'block'; }
  const SW = sc.width, SH = sc.height, t = scareT - 0.32, z = 1.05 + t * 0.5, fh = SH * 1.25 * z, fwid = fh * faceImg.width / faceImg.height, shk = (1 - Math.min(1, t / 1.3)) * 30 + 6;
  sg.fillStyle = '#000'; sg.fillRect(0, 0, SW, SH);
  sg.drawImage(faceImg, SW / 2 - fwid / 2 + (rand() - 0.5) * shk, SH / 2 - fh / 2 + (rand() - 0.5) * shk - fh * 0.05, fwid, fh);
  if (rand() < 0.3) { sg.globalCompositeOperation = 'multiply'; sg.fillStyle = '#ff2020'; sg.fillRect(0, 0, SW, SH); sg.globalCompositeOperation = 'source-over'; }
  if (t < 0.08) { sg.fillStyle = 'rgba(255,255,255,.6)'; sg.fillRect(0, 0, SW, SH); }
  for (let i = 0; i < 6; i++) { sg.fillStyle = `rgba(0,0,0,${rand() * 0.5})`; sg.fillRect(0, rand() * SH, SW, rand() * 8); }
  if (t > 1.45) { sc.style.display = 'none'; showC(false); showDead(''); }
}

// ================= RESTORE / NEW GAME =================
function restore(s) {
  s = s || Object.assign(fresh(), { x: 0, z: 5, yaw: 0, tower: false });
  PKEYS.forEach(k => { if (s[k] !== undefined) G[k] = JSON.parse(JSON.stringify(s[k])); });
  G.am = Object.assign({ p: 0, pr: 0, s: 0, sr: 0 }, G.am); G.guns = Object.assign({ pistol: false, shotgun: false, flare: false }, G.guns);
  P.x = s.x; P.z = s.z; P.yaw = s.yaw || 0; P.pitch = 0; P.onTower = !!s.tower; P.inTunnel = false; P.y = P.onTower ? TG0 + TY + 0.08 : H(P.x, P.z);
  P.hp = 100; P.stam = 100; P.tired = false; P.overheat = 0; P.light = G.hasLight; P.look = null; P.hurtT = 9; P.shake = 0;
  $('hurt').style.opacity = 0; setEnv(false); clearAnimals(); clearSubs(); G.carry = G.obj === 2 ? G.carry : -1;
  showItem(W.letter, G.obj === 0); W.flashPick.visible = G.obj === 0; W.letterGl.visible = G.obj === 0;
  cans.forEach((c, i) => showItem(c, !G.picked[i])); W.fpCan.visible = G.carry >= 0;
  G.med = G.med || []; ammoM.forEach((m, i) => showItem(m, !G.ammo.includes(i))); medM.forEach((m, i) => showItem(m, !G.med.includes(i))); noteM.forEach((m, i) => { m.visible = true; m.userData.gl.visible = !G.notes.includes(i); });
  showItem(pistolPick, !G.guns.pistol); showItem(shotPick, !G.guns.shotgun); showItem(fusePick, !G.fuse);
  W.key.visible = !G.key; W.keyGl.visible = !G.key;
  applyPower(); W.arrows.visible = G.obj === 11;
  C.state = 'off'; C.final = false; C.rush = false; C.scripted = false; C.aggr = G.obj >= 13 ? 3 : G.obj >= 10 ? 2 : G.obj >= 8 ? 1 : 0; showC(false); cr.g.scale.set(1, 1, 1); cr.g.rotation.x = 0;
  heli.g.visible = false; heli.t = -1; heli.ready = false; heli.spot.intensity = 0; SND.set('heli', 0, 0.2);
  W.flare.visible = false; W.flareL.intensity = 0; W.padLightMat.opacity = 0.12; G.flareT = -1;
  WS.cur = 'none'; WS.next = null; for (const k in W.fpGuns) W.fpGuns[k].visible = false; const w = G.wep; G.wep = 'x'; equip(G.guns[w] ? w : 'none');
  G.wolfT = 40; G.glimpseAt = 0; G.gateOpen = false; W.gate.position.y = TB.y;
  if (G.obj >= 8 && G.obj <= 10) { C.state = 'hidden'; C.timer = 25; }
  if (G.obj === 13) { C.state = 'hidden'; C.timer = 30; }
  P.inHeli = false; P.falling = false; W.cabin.rotation.set(0, 0, 0); CH2.crashT = -1; CH2.talked = false; if (G.obj >= 16) G.ch1done = true; if (G.obj === 17 || G.obj === 18) G.obj = 16; G.sgas = G.sgas || []; G.church = true;
  W.radioItem.visible = G.obj <= 22; W.radioItem.userData.gl.visible = G.obj <= 22; SGAS.forEach((gp, i) => showItem(gp.m, !G.sgas.includes(i)));
  if (G.obj >= 22 && G.obj <= 25) { C.aggr = 2; C.state = 'hidden'; C.timer = 30; }
  if (G.obj === 26) { G.surviveT = 45; C.final = true; C.state = 'hidden'; C.timer = 5; }
  if (G.obj >= 14 && G.obj <= 15) { G.flareT = 6; W.flare.visible = true; W.flareL.intensity = 2.4; W.padLightMat.opacity = 0.9; }
  if (G.obj === 14) { G.surviveT = 30; C.final = true; C.state = 'hidden'; C.timer = 5; G.wolfT = 3; }
  if (G.obj === 15) { heli.g.visible = true; heli.t = 7.5; heli.ready = true; heli.spot.intensity = 3.2; heli.ladder.scale.y = 1; C.final = true; C.rush = true; C.state = 'hidden'; C.timer = 3; }
  if (typeof ch2Restore === 'function') ch2Restore(); else pumpOn(G.obj >= 26 && G.obj <= 27);
  updateChunks(P.x, P.z, 125); refreshObj(); CP = snapshot(); CP.x = s.x; CP.z = s.z;
  G.pendingStart = G.obj === 11 ? 'chase' : G.obj === 12 ? 'tunnel' : G.obj === 16 ? 'heli' : G.obj === 27 ? 'swampChase' : G.obj === 31 ? 'mire' : null;
}
function begin() {
  G.mode = 'play'; $('hud').style.display = 'block'; if (touch) $('touch').style.display = 'block'; $('scare').style.display = 'none';
  SND.set('menu', 0, 1); SND.music(false); setEnv(P.inTunnel); lock();
  if (G.pendingStart === 'chase') { G.pendingStart = null; P.x = R.x + 7.5; P.z = R.z; P.yaw = Math.atan2(-(L.tunnel.x - P.x), -(L.tunnel.z - P.z)); W.arrows.visible = true; const away = P.yaw + Math.PI; C.x = P.x - Math.sin(away) * 26; C.z = P.z - Math.cos(away) * 26; [C.x, C.z] = collide(C.x, C.z, 0.5); C.stung = false; startChase(999, true); say('RUN! Follow the red arrows!', 3, ''); }
  else if (G.pendingStart === 'tunnel') { G.pendingStart = null; enterTunnel(true); }
  else if (G.pendingStart === 'heli') { G.pendingStart = null; startChapter2(); }
  else if (G.pendingStart === 'swampChase') { G.pendingStart = null; hollowChaseStart(true); }
  else if (G.pendingStart === 'mire') { G.pendingStart = null; mireFightStart(true); }
  if (G.obj === 15) say('Grab the ladder! GO!', 2.6, 'Pilot');
}
async function newGame(slot) {
  G.slot = slot; clearCh2(slot); Object.assign(G, fresh(), { tips: {} }); restore(null); checkpoint(); hideMenu();
  G.mode = 'intro'; lock(true);
  const lines = ['Mr. Harlan owns every tree in Hollow Pines.', 'He’s gone away on vacation for a week.', 'He asked you to look after his forest while he’s gone.', 'It’s your first night alone out here.', 'Something in the trees already knows your name.'];
  const el = $('intro'); el.style.display = 'grid'; G.skipIntro = false;
  for (const l of lines) { if (G.skipIntro) break; el.innerHTML = `<p>${l}</p><small>${touch ? 'Tap' : padOn ? 'Press ✕' : 'Click'} to skip</small>`; for (let i = 0; i < 30 && !G.skipIntro; i++) await wait(100); }
  el.style.display = 'none';
  begin(); say('Harlan left a letter on the log by the fire.', 3.5, 'You');
}
function continueSlot(slot) { const d = readSlot(slot); if (!d) return newGame(slot); if (d.ch2done) return playChapter(slot, 2); G.slot = slot; G.tips = { light: 1, gun: 1 }; restore(d); hideMenu(); lock(true); begin(); }

// ================= MENU =================
let menuOn = false; const MENU_CAM = { x: 4, z: 10 }, MENU_CR = { x: 8, z: -13 };
const bl = $('blood'), bg = bl.getContext('2d'); let BW = 0, BH = 0, drips = [], splat = null;
function bloodResize() { const d = Math.min(devicePixelRatio || 1, 2); BW = bl.width = innerWidth * d; BH = bl.height = innerHeight * d; const n = Math.round(BW / (38 * d)); drips = []; for (let i = 0; i < n; i++) drips.push(newDrip(i / n * BW + rand() * 30 * d, true)); splat = makeSplat(d); }
function newDrip(x, init) { const d = Math.min(devicePixelRatio || 1, 2); return { x: x != null ? x : rand() * BW, len: init ? rand() * BH * 0.25 : 0, max: BH * (0.06 + rand() * 0.5), w: (2 + rand() * 6) * d, sp: (8 + rand() * 30) * d, wait: 0 }; }
const band = x => (16 + 10 * Math.sin(x * 0.011) + 7 * Math.sin(x * 0.037 + 1) + 4 * Math.sin(x * 0.09 + 2)) * Math.min(devicePixelRatio || 1, 2);
function makeSplat(d) { const c = document.createElement('canvas'); c.width = BW; c.height = BH; const g = c.getContext('2d'); const blob = (x, y, r, a) => { g.fillStyle = `rgba(105,0,0,${a})`; g.beginPath(); g.arc(x, y, r, 0, 7); g.fill(); for (let i = 0; i < 26; i++) { const an = rand() * 7, dd = r * (1 + rand() * 2.2); g.beginPath(); g.arc(x + Math.cos(an) * dd, y + Math.sin(an) * dd, r * rand() * 0.22, 0, 7); g.fill(); } for (let i = 0; i < 6; i++) { const an = rand() * 7; g.strokeStyle = `rgba(105,0,0,${a * 0.8})`; g.lineWidth = r * 0.12; g.beginPath(); g.moveTo(x, y); g.lineTo(x + Math.cos(an) * r * 2.6, y + Math.sin(an) * r * 2.6); g.stroke(); } }; blob(BW * 0.06, BH * 0.1, 40 * d, 0.85); blob(BW * 0.95, BH * 0.2, 28 * d, 0.75); blob(BW * 0.08, BH * 0.9, 34 * d, 0.5); blob(BW * 0.9, BH * 0.88, 22 * d, 0.45); return c; }
function drawBlood(dt) {
  bg.clearRect(0, 0, BW, BH); if (splat) bg.drawImage(splat, 0, 0);
  bg.beginPath(); bg.moveTo(0, 0); for (let x = 0; x <= BW; x += 8) bg.lineTo(x, band(x)); bg.lineTo(BW, 0); bg.closePath(); let gr = bg.createLinearGradient(0, 0, 0, 40); gr.addColorStop(0, '#3a0000'); gr.addColorStop(1, '#8a0606'); bg.fillStyle = gr; bg.fill();
  for (const dr of drips) {
    dr.len += dr.sp * dt * (1 - dr.len / dr.max * 0.75); if (dr.len >= dr.max * 0.98) { dr.wait += dt; if (dr.wait > 1.5 + rand() * 3) Object.assign(dr, newDrip(dr.x, false)); }
    const y0 = band(dr.x) - 2, y1 = y0 + dr.len; gr = bg.createLinearGradient(0, y0, 0, y1); gr.addColorStop(0, '#7e0505'); gr.addColorStop(1, '#4a0000'); bg.fillStyle = gr;
    bg.beginPath(); bg.moveTo(dr.x - dr.w / 2, y0); bg.lineTo(dr.x - dr.w * 0.35, y1); bg.lineTo(dr.x + dr.w * 0.35, y1); bg.lineTo(dr.x + dr.w / 2, y0); bg.fill(); bg.beginPath(); bg.arc(dr.x, y1, dr.w * 0.62, 0, 7); bg.fill();
    bg.fillStyle = 'rgba(255,90,90,.22)'; bg.fillRect(dr.x - dr.w * 0.25, y0, Math.max(1, dr.w * 0.12), dr.len * 0.8);
  }
}
function showMenu() { hush(); if (typeof ch2Reset === 'function') ch2Reset();
  menuOn = true; G.mode = 'menu'; $('menu').style.display = 'flex'; bl.style.display = 'block'; $('hud').style.display = 'none'; $('touch').style.display = 'none';
  ['slotP', 'howP', 'setP', 'credP', 'pauseP', 'dead', 'win', 'note', 'intro'].forEach(id => $(id).style.display = 'none'); $('scare').style.display = 'none'; fade(0);
  P.inTunnel = false; P.onTower = false; setEnv(false); clearAnimals(); heli.g.visible = false; W.flare.visible = false; W.flareL.intensity = 0;
  C.state = 'menu'; showC(true); cr.g.scale.set(1, 1, 1); cr.g.rotation.x = 0; cr.g.position.set(MENU_CR.x, H(MENU_CR.x, MENU_CR.z), MENU_CR.z); cr.g.rotation.y = Math.atan2(MENU_CAM.x - MENU_CR.x, MENU_CAM.z - MENU_CR.z);
  flash.intensity = 0; W.rig.visible = false; P.inHeli = false; P.x = 0; P.z = 5; setEnv(false); updateChunks(0, 0, 125); clearSubs(); let un = false; for (let i = 0; i < 3; i++) { const d = readSlot(i); if (d && d.ch1done) un = true; } $('unlockTag').style.display = un ? 'block' : 'none';
  ['drone', 'hum', 'stat', 'heli', 'breath', 'tunnel', 'siren'].forEach(n => SND.set(n, 0, 0.3)); SND.set('menu', 0.06, 1); SND.music(true);
  try { document.exitPointerLock(); } catch (e) {}
}
function hideMenu() { SND.music(false); menuOn = false; $('menu').style.display = 'none'; bl.style.display = 'none'; ['slotP', 'howP', 'setP', 'credP'].forEach(id => $(id).style.display = 'none'); W.rig.visible = true; showC(false); C.state = 'off'; }
let menuT = 0;
function menuFrame(dt) {
  menuT += dt; const gy = H(MENU_CAM.x, MENU_CAM.z);
  camera.position.set(MENU_CAM.x + Math.sin(menuT * 0.13) * 0.6, gy + 1.65 + Math.sin(menuT * 0.4) * 0.04, MENU_CAM.z + Math.cos(menuT * 0.1) * 0.3);
  const ty = Math.atan2(-(-3 - camera.position.x), -(-14 - camera.position.z)); camera.rotation.set(0.04 + Math.sin(menuT * 0.21) * 0.015, ty + Math.sin(menuT * 0.17) * 0.04, 0);
  updateTwitch(dt); poseCreature(cr, 'idle', 0, C.tw, dt);
  W.fireL.intensity = 1.6 + Math.sin(menuT * 17) * 0.12 + Math.sin(menuT * 7.3) * 0.15;
  drawBlood(dt);
  SND.ok && ambience(dt);
}
const panelFrom = {};
function openPanel(id, from) { panelFrom[id] = from; $(id).style.display = 'grid'; if (id === 'slotP') renderSlots(); if (id === 'setP') { loadVoices(); $('sVoice').checked = settings.voice !== false; $('sHQ').checked = HQ(); $('sSens').value = settings.sens; $('sVol').value = settings.vol; $('sShadow').checked = settings.shadows; } }
document.querySelectorAll('[data-back]').forEach(b => b.addEventListener('click', () => { const p = b.closest('.panel'); p.style.display = 'none'; const f = panelFrom[p.id]; if (f) $(f).style.display = 'grid'; SND.ui(); }));
$('playBtn').onclick = () => { SND.init(); SND.ui(); openPanel('slotP', null); };
$('mHow').onclick = () => { SND.ui(); openPanel('howP', null); }; $('mSet').onclick = () => { SND.ui(); openPanel('setP', null); }; $('mCred').onclick = () => { SND.ui(); openPanel('credP', null); };
$('sSens').oninput = e => { settings.sens = +e.target.value; saveSettings(); };
$('sVol').oninput = e => { settings.vol = +e.target.value; SND.setVol(settings.vol); saveSettings(); };
$('sVoice').onchange = e => { settings.voice = e.target.checked; if (!settings.voice) hush(); saveSettings(); };
$('sVoicePick').onchange = e => { settings.voiceName = e.target.value; saveSettings(); VOICE.bad && VOICE.bad.delete(e.target.value); loadVoices(); hush(); setTimeout(() => speak('This is how I sound now. Can you hear me?', 'You'), 120); };
$('sVoiceTest').onclick = () => { VOICE.unlocked = false; voiceUnlock(); settings.voice = true; $('sVoice').checked = true; saveSettings(); setTimeout(() => { speak('Can you hear me? This is my voice.', 'You'); setTimeout(() => { $('sVoiceMsg').textContent = !VOICE.ok ? 'This browser has no speech voices. Try Chrome, Edge or Safari.' : VOICE.works ? 'Voice is working.' : 'No sound? Turn your device volume up, check it isn’t on silent, and try Chrome, Edge or Safari.'; }, 2600); }, 150); };
$('sHQ').onchange = e => { settings.quality = e.target.checked ? 'high' : 'low'; FX.setQuality(); saveSettings(); };
$('sShadow').onchange = e => { settings.shadows = e.target.checked; flash.castShadow = settings.shadows; saveSettings(); };
let delArm = -1;
function playChapter(i, ch, fresh2) {
  if (ch === 2 && !fresh2) { const c2 = readCh2(i), m = readSlot(i); const best = m && m.obj >= 16 && !m.ch2done ? m : c2; if (best) { G.slot = i; G.tips = { light: 1, gun: 1 }; restore(best); checkpoint(); hideMenu(); lock(true); begin(); return; } }
  if (ch === 2) clearCh2(i);
  const d = readSlot(i) || {}; G.slot = i; Object.assign(G, fresh(), { tips: { light: 1, gun: 1 } });
  const base = Object.assign(fresh(), { x: 0, z: 5, yaw: 0, tower: false, ch1done: true, ch2done: !!d.ch2done, time: d.time || 0, deaths: d.deaths || 0 });
  if (ch === 2) Object.assign(base, { obj: 16, hasLight: true, guns: d.guns || { pistol: true, shotgun: false, flare: false }, am: d.am || { p: 12, pr: 12, s: 0, sr: 0 }, wep: 'none', med: [] });
  restore(base); checkpoint(); hideMenu(); lock(true); begin(); if (ch === 1) say('Harlan left a letter on the log by the fire.', 3.5, 'You');
}
function renderSlots() {
  const el = $('slots'); el.innerHTML = '';
  for (let i = 0; i < 3; i++) {
    const d = readSlot(i), div = document.createElement('div'); div.className = 'slot'; const ch = d ? (d.obj >= 16 ? 2 : 1) : 0;
    const title = !d ? `Save ${i + 1} — Empty` : d.ch2done ? `Save ${i + 1} — Chapters 1 & 2 beaten!` : `Save ${i + 1} — Chapter ${ch}${ch === 1 ? ': Hollow Pines' : ': The Swamp'}`;
    const ot = d && OBJ[d.obj] ? (typeof OBJ[d.obj][1] === 'function' ? 'Find fuel cans for the generator' : OBJ[d.obj][1]) : '';
    const info = !d ? 'Start a new story here' : (d.ch2done ? 'Chapter 3 coming soon · ' : '') + (d.ch1done && !d.ch2done && ch === 2 ? 'Chapter 2 unlocked! · ' : '') + (d.ch2done ? '' : (d.obj === 23 ? 'Find gas for the pump station' : d.obj === 28 ? 'Open the flood valves' : d.obj === 33 ? 'Clear the clogged grates' : ot) + ' · ') + 'played ' + fmtT(d.time || 0);
    div.innerHTML = `<div><h3></h3><p></p></div><div class="acts"></div>`; div.querySelector('h3').textContent = title; div.querySelector('p').textContent = info;
    const acts = div.querySelector('.acts'); const mkb = (t, fn) => { const b = document.createElement('button'); b.className = 'btn'; b.textContent = t; b.onclick = fn; acts.appendChild(b); return b; };
    if (d && !d.ch2done) mkb(ch === 2 ? 'Continue Chapter 2' : 'Continue', () => { SND.init(); continueSlot(i); });
    const c2 = d && (readCh2(i) || (d.obj >= 16 && !d.ch2done ? d : null));
    if (d && d.ch1done) { mkb(ch === 2 ? 'Replay Chapter 1' : 'Chapter 1', () => { SND.init(); playChapter(i, 1); }); if (c2 && ch !== 2) mkb('Continue Chapter 2', () => { SND.init(); playChapter(i, 2); }); else if (!c2) mkb('Chapter 2', () => { SND.init(); playChapter(i, 2); }); if (c2) mkb('Restart Chapter 2', () => { SND.init(); playChapter(i, 2, true); }); }
    else if (d) { const lb = mkb('Chapter 2 🔒', () => {}); lb.disabled = true; lb.title = 'Beat Chapter 1 to unlock'; }
    mkb(d ? 'New Game' : 'Start', () => { SND.init(); newGame(i); });
    if (d) mkb(delArm === i ? 'Tap again to delete' : 'Delete', () => { if (delArm === i) { delSlot(i); delArm = -1; } else delArm = i; renderSlots(); });
    el.appendChild(div);
  }
}
addEventListener('keydown', () => { if (G.mode === 'intro') G.skipIntro = true; });
document.addEventListener('pointerdown', () => { if (G.mode === 'intro') G.skipIntro = true; voiceUnlock(); if (!SND.ok) { SND.init(); SND.setVol(settings.vol); $('tapSound').style.display = 'none'; if (menuOn) { SND.set('menu', 0.06, 1); SND.music(true); } } }, { capture: true });

// ================= AMBIENCE =================
function ambience(dt) {
  const near = cr.g.visible && C.state !== 'menu' ? Math.hypot(cr.g.position.x - P.x, cr.g.position.z - P.z) : 99;
  const calm = (C.state === 'off' || C.state === 'hidden' || C.state === 'menu') && !P.inTunnel && !P.inHeli;
  const quiet = !calm || near < 35 || (C.state === 'chase');
  SND.set('chorus', quiet ? 0 : (menuOn ? 0.55 : G.obj >= 8 ? 0.35 : 0.5), quiet ? 0.4 : 2.5);
  G.cricketT -= dt; if (G.cricketT <= 0) { G.cricketT = 0.25 + rand() * 0.6; if (!quiet) SND.cricket(); }
  const lakeD = Math.hypot(camera.position.x - LK.x, camera.position.z - LK.z);
  G.frogT = (G.frogT || 2) - dt; if (G.frogT <= 0) { G.frogT = 1.2 + rand() * 3; if (!quiet && (lakeD < 110 || P.x > 1000)) SND.frog(clamp((LK.x - camera.position.x) / 60, -1, 1) * 0.8); }
  G.ambT -= dt; if (G.ambT <= 0 && !P.inTunnel) { G.ambT = 9 + rand() * 18; const r = rand(), pan = rand() * 2 - 1; if (r < 0.25) SND.owl(pan); else if (r < 0.45) SND.creak(pan); else if (r < 0.65) SND.snap(pan); else if (r < 0.8) SND.howl(pan); else if (G.obj >= 8 || menuOn) SND.whisper(pan); else SND.owl(pan); }
}

// ================= MAIN UPDATE =================
let curIt = null, holdT = 0, chunkT = 0, heartT = 0, grainF = 0;
function update(dt) {
  const playing = G.mode === 'play', climbing = G.mode === 'climb';
  if (playing || climbing) G.time += dt;
  if (P.look) { P.yaw += wrapA(P.look.yaw - P.yaw) * Math.min(1, dt * 4); P.pitch += (P.look.pitch - P.pitch) * Math.min(1, dt * 4); }
  // movement
  let mx = 0, mz = 0;
  if (playing && !P.held) { if (K.KeyW || K.ArrowUp) mz += 1; if (K.KeyS || K.ArrowDown) mz -= 1; if (K.KeyD || K.ArrowRight) mx += 1; if (K.KeyA || K.ArrowLeft) mx -= 1; mx += jx + padX; mz -= jy + padY; }
  const ml = Math.hypot(mx, mz); if (ml > 1) { mx /= ml; mz /= ml; }
  const moving = ml > 0.1, adren = G.obj === 11 || G.obj === 12 || C.state === 'chase' || G.obj === 27;
  if (P.tired && P.stam > 35) P.tired = false;
  const run = (K.ShiftLeft || K.ShiftRight || touchRun || padRun || padL2) && moving && mz > -0.2 && !P.tired && !P.onTower;
  if (run) { P.stam -= (adren ? 4.5 : 15) * dt; if (P.stam <= 0) { P.stam = 0; P.tired = true; if (touchRun) { touchRun = false; $('bRun').classList.remove('on'); } } } else P.stam = Math.min(100, P.stam + (moving ? 9 : 16) * dt);
  SND.set('breath', P.tired || P.stam < 25 ? 0.08 : 0, 0.4);
  const wade = P.x > 1000 && !P.inHeli ? clamp(1 + H(P.x, P.z) * 0.55, 0.5, 1) : 1;
  const sp = (run ? 5.7 : 3.0) * (G.carry >= 0 ? 0.92 : 1) * (P.tired ? 0.88 : 1) * wade;
  if (P.inHeli) heliMove(dt, mx, mz, moving);
  else if (!climbing) {
    const fx = -Math.sin(P.yaw), fz = -Math.cos(P.yaw), rx = Math.cos(P.yaw), rz = -Math.sin(P.yaw);
    let nx = P.x + (fx * mz + rx * mx) * sp * dt, nz = P.z + (fz * mz + rz * mx) * sp * dt;
    if (P.onTower) { nx = clamp(nx, T.x - 1.4, T.x + 1.4); nz = clamp(nz, T.z - 1.4, T.z + 1.4); }
    else if (P.inTunnel) { let pr = tProject(nx, nz); if (pr.d > 0.95) { const k = 0.95 / pr.d; nx = pr.px + (nx - pr.px) * k; nz = pr.pz + (nz - pr.pz) * k; pr = tProject(nx, nz); } if (pr.s < 1.0 || (!G.gateOpen && pr.s > GATE_S - 0.6)) { const lim = pr.s < 1.0 ? 1.0 : GATE_S - 0.6, q = tPoint(lim); nx = q.x; nz = q.z; } }
    else[nx, nz] = collide(nx, nz, 0.4);
    const moved = Math.hypot(nx - P.x, nz - P.z); P.x = nx; P.z = nz;
    if (moving && playing) { P.bob += moved * (run ? 1.9 : 2.3); P.stepAcc += moved; if (P.stepAcc > (run ? 1.15 : 0.85)) { P.stepAcc = 0; if (wade < 0.98) SND.splash(run); else SND.step(run, P.onTower || P.inTunnel || (P.x > 1000 && H(P.x, P.z) > 0.5)); } }
    const gy = P.onTower ? TG0 + TY + 0.08 : P.inTunnel ? TB.y : H(P.x, P.z); if (!P.falling) P.y += (gy - P.y) * Math.min(1, dt * 12);
  } else updateClimb(dt);
  P.shake = Math.max(0, P.shake - dt * 1.5); const sh = P.shake * 0.05 + (climbing ? 0.012 : 0);
  const breath = Math.sin(G.time * 1.7) * (moving ? 0.001 : 0.004);
  if (P.inHeli) { const cb = W.cabin; TV.set(P.x + (rand() - 0.5) * sh, 1.65 + Math.sin(P.bob) * 0.03 + (rand() - 0.5) * sh, P.z); cb.updateMatrixWorld(); camera.position.copy(cb.localToWorld(TV)); camera.rotation.set(P.pitch + breath + cb.rotation.x, P.yaw + cb.rotation.y, cb.rotation.z * Math.cos(P.yaw) + Math.sin(P.bob * 0.5) * 0.006); }
  else { camera.position.set(P.x + (rand() - 0.5) * sh, P.y + (climbing ? 1.5 : 1.65) - (P.sinkY || 0) + Math.sin(P.bob) * 0.045 + (rand() - 0.5) * sh, P.z + (rand() - 0.5) * sh);
  camera.rotation.set(P.pitch + breath, P.yaw + Math.sin(G.time * 0.9) * 0.0015, Math.sin(P.bob * 0.5) * 0.006); }
  const tf = run ? 77 : 70; if (Math.abs(camera.fov - tf) > 0.05) { camera.fov += (tf - camera.fov) * Math.min(1, dt * 5); camera.updateProjectionMatrix(); }
  // flashlight
  let fi = P.light && G.hasLight ? 2.7 : 0;
  if (P.overheat > 0) { P.overheat -= dt; fi = P.overheat > P.ohMax - 0.5 ? (rand() < 0.5 ? 2.7 : 0) : 0; }
  else if (fi > 0 && ((cr.g.visible && Math.hypot(cr.g.position.x - P.x, cr.g.position.z - P.z) < 26 && rand() < 0.1) || (P.flick > 0 && rand() < 0.5))) fi *= rand() * 0.35;
  P.flick = Math.max(0, (P.flick || 0) - dt);
  flash.intensity = fi; W.lensMat.color.setHex(fi > 0 ? 0xfff2d8 : 0x222222);
  // interactions
  let best = null, bd = 99;
  if (playing) for (const it of IT) { if (it.tower !== P.onTower || it.tunnel !== P.inTunnel || it.heli !== P.inHeli || !it.cond()) continue; const d = Math.hypot(it.x - P.x, it.z - P.z); if (d < it.r && d < bd) { bd = d; best = it; } }
  if (best !== curIt) { curIt = best; holdT = 0; }
  const pe = $('prompt');
  if (best) { pe.style.display = 'block'; $('promptT').textContent = (best.hold ? `Hold ${KEYN} · ` : `${KEYN} · `) + (typeof best.label === 'function' ? best.label() : best.label);
    if (best.hold) { if (useHeld()) { holdT += dt; if (holdT >= best.hold) { holdT = 0; const a = best; curIt = null; a.act(); } } else holdT = 0; $('promptP').style.width = (holdT / best.hold * 100) + '%'; }
    else { $('promptP').style.width = '0'; if (usePress) { const a = best; curIt = null; a.act(); } } }
  else pe.style.display = 'none';
  usePress = false;
  updateWeapons(dt, playing);
  // triggers
  if (playing && G.glimpseAt && G.time > G.glimpseAt && C.state === 'off' && G.obj < 8 && !P.onTower) { G.glimpseAt = 0; glimpse(); }
  if (playing && G.obj === 14) { G.surviveT -= dt; if (G.surviveT <= 0) heliArrive(); }
  if (P.hp < 100 && playing) { P.hurtT += dt; if (P.hurtT > 5) P.hp = Math.min(100, P.hp + 5 * dt); $('hurt').style.opacity = clamp((100 - P.hp) / 140, 0, 0.6); }
  if (G.revealT > 0) { G.revealT -= dt; if (G.revealT <= 0 && C.state === 'hidden') showC(false); }
  updateHint(dt); updateWatcher(dt); updateBats(dt); updateCh2(dt);
  if (playing && !P.inTunnel && C.state !== 'chase' && subT <= 0 && !subQ.length) { G.chatT = (G.chatT == null ? 40 : G.chatT) - dt; if (G.chatT <= 0) { G.chatT = 50 + rand() * 50; const pool = CHATTER[OBJ[G.obj][0]]; say(pick(pool), 3.2, 'You'); } }
  updateCreature(dt); updateAnimals(dt);
  stepParticles(BLOOD, dt); stepParticles(BLACKB, dt); stepPools(dt);
  // world fx
  chunkT -= dt; if (chunkT <= 0) { chunkT = 0.3; if (!P.inTunnel) updateChunks(P.inHeli ? 9999 : P.x, P.z, 125); }
  W.fireL.intensity = 1.6 + Math.sin(G.time * 17) * 0.12 + Math.sin(G.time * 7.3) * 0.15;
  W.winMat.emissiveIntensity = 0.5 + Math.sin(G.time * 3) * 0.1 + (rand() < 0.02 ? -0.4 : 0);
  if (W.beacon.visible) W.beacon.material.opacity = Math.sin(G.time * 3) > 0 ? 1 : 0.1;
  for (const m of GL) { if (!m.visible) continue; const d = Math.hypot(m.position.x - P.x, m.position.z - P.z), sc = d < 16 ? 1 : d < 22 ? 1 - (d - 16) / 6 : 0.001; m.scale.setScalar(sc); m.position.y = m.userData.by + Math.sin(G.time * 3 + m.position.x) * 0.06; m.rotation.y += dt * 1.6; }
  if (P.inTunnel) { const near = TBULBS.map(b => [b, Math.hypot(b.x - P.x, b.z - P.z)]).sort((a, b) => a[1] - b[1]); W.tunL.forEach((l, i) => { const b = near[i][0]; l.position.set(b.x, TB.y + 2.2, b.z); l.intensity = 1.3 + (rand() < 0.04 ? -1 : 0); }); W.gate.position.y += ((G.gateOpen ? TB.y + 2.45 : TB.y) - W.gate.position.y) * Math.min(1, dt * 3); }
  if (G.flareT >= 0 && W.flare.visible) { G.flareT += dt; const gy = H(Hp.x, Hp.z), h = G.flareT < 3 ? smooth(0, 3, G.flareT) * 60 : 60 - (G.flareT - 3) * 0.4; W.flare.position.set(Hp.x + Math.sin(G.flareT * 0.3) * 4, gy + Math.max(25, h), Hp.z + 6); W.flareL.position.copy(W.flare.position); W.flareL.intensity = 2.2 + rand() * 0.4; scene.fog.color.lerp(FOG_FLARE, Math.min(1, dt)); }
  if (heli.g.visible) { if (heli.t >= 0 && heli.t < 7.5) heli.t += dt; if (G.mode !== 'cut' || heli.t < 7.5) { const hp = heliPos(heli.t); if (G.obj !== 15 || !heli.ready || G.mode !== 'cut') heli.g.position.set(hp.x, hp.y, hp.z); } heli.rot.rotation.y += dt * 24; heli.trot.rotation.x += dt * 30; heli.g.rotation.z = Math.sin(G.time * 0.8) * 0.03; const hd = Math.hypot(heli.g.position.x - P.x, heli.g.position.z - P.z); SND.set('heli', clamp(1 - hd / 300, 0, 1) * 0.5, 0.3); }
  // fear + audio
  const cd = cr.g.visible ? Math.hypot(cr.g.position.x - P.x, cr.g.position.z - P.z) : 99, chasing = C.state === 'chase' || C.state === 'tunnel' || C.state === 'climb' || C.state === 'climbRun' || (typeof HS !== 'undefined' && (HS.state === 'chase' || MS.state === 'fight' || !!MS.tug));
  let fear = cr.g.visible ? clamp(1 - cd / 38, 0, 1) : 0; if (chasing) fear = Math.max(fear, 0.6);
  $('fear').style.opacity = fear * 0.75;
  heartT -= dt; if (fear > 0.05 && heartT <= 0) { SND.heart(0.4 + fear * 0.6); heartT = lerp(1.0, 0.36, fear); }
  SND.set('drone', chasing ? 0.34 : (C.state === 'stalk' ? 0.08 : 0), chasing ? 0.2 : 1.2);
  SND.set('hum', G.power && !P.inTunnel ? 0.22 * clamp(1 - Math.hypot(P.x - L.gen.x, P.z - L.gen.z) / 40, 0, 1) : 0, 0.3);
  ambience(dt);
  updateHUD(dt);
}

// ================= LOOP =================
const gc = $('grain'), gg2 = gc.getContext('2d'), gImg = gg2.createImageData(160, 160);
function grain() { if (++grainF % 2) return; const d = gImg.data; for (let i = 0; i < d.length; i += 4) { const v = rand() * 255; d[i] = d[i + 1] = d[i + 2] = v; d[i + 3] = 255; } gg2.putImageData(gImg, 0, 0); }
let last = performance.now();
function loop(now) {
  requestAnimationFrame(loop); const dt = Math.min(0.05, (now - last) / 1000 || 0); last = now;
  padPoll(dt);
  if (window.HP_FREEZE) { FX.render(); return; }
  if (menuOn) menuFrame(dt);
  else if (G.mode === 'play' || G.mode === 'cut' || G.mode === 'climb') update(dt);
  else if (G.mode === 'scare') updateScare(dt);
  if (!(G.mode === 'scare' && scareT >= 0.32)) {
    const ox = (menuOn || P.inHeli) ? camera.position.x : P.x, oz = (menuOn || P.inHeli) ? camera.position.z : P.z;
    FX.update(dt, { noCover: !menuOn && P.inHeli, tunnel: !menuOn && P.inTunnel, storm: menuOn ? 1 : G.obj >= 8 ? 1 : G.obj >= 4 ? 0.6 : 0.35, rain: menuOn ? 0.55 : G.obj < 4 ? 0.35 : G.obj < 8 ? 0.6 : 0.9, x: ox, z: oz, red: W.flare.visible ? 0.18 : 0, onStrike: lightningReveal });
    SND.set('rain', !menuOn && P.inTunnel ? 0.015 : (menuOn ? 0.55 : G.obj < 4 ? 0.35 : G.obj < 8 ? 0.6 : 0.9) * 0.22, 0.6);
    FX.render();
  }
}
addEventListener('resize', () => { renderer.setSize(innerWidth, innerHeight); FX.resize(); camera.aspect = innerWidth / innerHeight; camera.updateProjectionMatrix(); bloodResize(); });
bloodResize(); showMenu(); $('loading').style.display = 'none';
requestAnimationFrame(loop);
setTimeout(() => { faceImg = renderFace(); }, 1500);
window.HP = { playChapter, CH2, walkInfo, WATCH, updateWatcher, update, updateScare, K, G, P, C, cr, W, setObj, restore, begin, heli, ANIMALS, spawnAnimal, radioScene, enterTunnel, startClimb, startScare, heliArrive, fireFlare, bigChase, snapshot, hideMenu, tPoint, TLEN, GATE_S };
