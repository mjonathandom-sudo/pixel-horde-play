'use strict';
/* Pixel Horde 0.6.0 — loot filter, junk (no re-pickup), ground inspect, village Armory (multi-item keep-set). 0.5.0: enemy roles (swarm/tank/charger/ranged/mini-boss), per-map wave tables + light map hazards, on top of 0.4.0 heroes/gear/village. Vanilla JS + canvas, no deps. */
(() => {
const VERSION = '1.18.1';
/* ---------------- 1.18.0: momentum, fleeting gates, map signatures, artillery split, objective pings, useful village ---------------- */
const ON18 = !window.__phLegacy && !window.__phNo118;   // the 1.17 smoke suites pin the old rules with __phNo118; the shipped game always runs 1.18
const DRIFT18 = { a: { ash: 0, crypt: Math.PI / 2, frost: -Math.PI / 2 }, name: { ash: 'EAST', crypt: 'SOUTH', frost: 'NORTH' }, cone: Math.PI / 3, bias: 0.75 };
const HEAT18 = { r: 140, grace: 18, rise: 1 / 45, decay: 1 / 10, spawnX: 1.5, packAt: 0.4, packEvery: 7, pack: w => 3 + Math.floor(w / 5), biteAt: 0.5,
  name: { ash: 'CINDERS', crypt: 'GRAVE FOG', frost: 'WHITEOUT' }, col: { ash: '#ef7d57', crypt: '#a7f070', frost: '#f4f4f4' }, ashBurn: 0.015, fogRot: 0.01, frostSlow: 0.30 };
const GATE18 = { reDelay: 40, reLife: 90, fade: 20 };
const FIRE18 = { dens: 0.045, r: 15, tick: 0.4, pct: 0.035, flat: w => 1 + 0.2 * w, burnT: 2, burnPct: 0.015, mobX: 0.5 };
const ICE18 = { cell: 48, dens: 0.10, hp: w => 60 + 10 * w };
const CRYPT18 = { C: 224, road: 24 };
const ART18 = { burnR: 0.75, burnT: 3, burnPer: 0.25, burnX: 0.30 };
const WIZ18 = { from: 8, every: [22, 32], cap: w => w < 20 ? 1 : w < 35 ? 2 : 3, keep: 120, range: 230, cd: [4.5, 6.5], tele: 1.2, wallTele: 1.0, wallsFrom: 15,
  cloud: { r: 34, life: 6 }, freeze: { r: 30, life: 5, x: 0.45 }, weak: { r: 26, dur: 6 }, fwall: { len: 90, life: 4, x: 0.45 }, lwall: { len: 110, x: 2.2 }, barFrom: 4, barEvery: 3 };
const MKT18 = [1, 1.15, 1.30];                 // market stalls tier 0..2: sell multiplier
const SMITH18 = [0, 0.05, 0.10, 0.15];         // smithy discount: none / smithy / forge II / forge III
const FLASK18 = { n: [0, 1, 1, 2], heal: [0, 0.30, 0.50, 0.50], at: 0.30 };
const SCOUT18 = { lead: [0, 15, 25, 35], gate: [0, 20, 35, 50] };
const PRICE181 = { apoth: { 2: 200000 }, watch: { 2: 240000 } };   // 1.18.1 hand-set top tiers (were 360,000 / 440,000 from the econ bands): reachable mid-game
function smithT18() { const h = save && save.home; return !h || !h.smithy ? 0 : 1 + Math.min(2, h.forge | 0); }
function disc18(c) { return ON18 && save && save.home ? Math.round(c * (1 - SMITH18[smithT18()])) : c; }
/* 1.17.1: Matt phone-test pack. Fantasy satchel bag icon; capped/non-stacking screen shake + Settings toggle (default on);
   bag action row fits every viewport with a header CLOSE; same CLOSE/BACK on stash + Armory; stash uses in-run line-by-line compare;
   stash tile taps use a slop-tolerant pointer pick (scroll was cancelling clicks); To Loadout uses existing Armory slots;
   item lock (uniques default on) persists into the stash/loadout. Gameplay numbers unchanged. */
/* 1.16.0: Friend closed-beta pack (Matt): CLEAN combat HUD default + VERBOSE HUD setting; 8-tier barracks + artillery ladders (wave-gated ~every 10 waves); artillery families (catapult arc / cannon line / mage) — no mage-on-catapult; in-app SEND FEEDBACK (screenshot + text → email Intent). */
/* 1.15.0: PoE loot filter (Settings: hide Common / Magic independently + convert junk to gold; below-floor never shows / never auto-picks) + typed stash tabs (Weapons / Armour / Uniques / Resources; Premium ★ UNIQUES stays). */
/* 1.14.2: Market-style PRE-pick on missions (caravan, mage escort, SUPPLY DROP, HOLD THE LINE): approach -> pick your reward card first; its tier sets the difficulty; win = that card, fail = nothing. */
/* 1.14.1: reward picks (pause-style, 3 options scaled by a tier rolled before you commit) on caravan + mage-teleport escorts, SUPPLY DROP and HOLD THE LINE; 6 new field events (blood altar, supply drop, hold the line, storm obelisk, rich vein, cursed chest) on their own clock. */
/* 1.7.0: Matt's feedback pile. EXTRACT OR LOSE IT: die / abandon without extracting = every item you carried is gone (kept Armory items too); exit gates every 10 waves, sealed until you beat a trial (kill quota / rune sequence / gate keeper / the Gear Check); KEEP picker + Armory show full item details. Village + homestead costs x1000 (ECON), portal use x5. XP x0.5 and ONE skill-point pool for the shared + hero trees. 12 new uniques, 5 sets (2-3 piece bonuses). Barracks / catapults are far outposts that grow if ignored (hut > war camp > citadel; catapult > siege squad > artillery mage) and their Magic drops obey the loot filter. Axe = frontal cone (max half-circle). Raids: harder hits, half your DR, SUNDER follow-ups, OPEN punish windows, 1 revive. Numbers: DECISIONS.md § 1.7.0. */
/* 1.6.0: art pass, draw-only (no numbers changed): fire circles are pixel-crisp scanline ellipses with ordered dither + flame tongues (nukes, Blast Ticks, catapult shells, ember vents, Meteor / Crater / Inferno) and a fire blast + scorch FX that matches the real hit ellipse; items get chunky outlined 10x10 icons (ground, bag, Market, Armory, HUD) with a rarity rim + pedestal on the ground; the escort caravan is a covered wagon pulled by an ox with a driver, rolling wheels and walking legs. */
/* 1.4.0: RAIDS. A separate trophy ladder of 5 staged bosses (3 phases each: get-out circles, stand-in safe zones, long-telegraph AoE, shield adds, punish-if-you-stay) fought in a sealed arena from the hub RAID BOARD. save.raids per boss {kills, firstAt, best, tries}; Trophy Wall shows raid plaques. Numbers: DECISIONS.md § 1.4.0 implementation choices. */
/* 1.3.0: announcement banner setting (save.banner: normal / small / top / off). One draw site: drawBanner(). Numbers: DECISIONS.md § 1.3.0 implementation choices. */
/* 1.2.0: village art pass. New 1-px building kit (roofs, walls, windows, chimneys), road tiers dirt -> gravel -> cobbles -> dressed stone, cached ground, y-sorted ambient life. Art only: no gameplay or save changes. DECISIONS.md § 1.2.0 implementation choices. */
/* 1.1.0: content depth pass. Shared tree 8 -> 15 nodes, hero trees 5 -> 9 nodes, 6 new monsters (incl. the wall-raising Cinder Mason) + refreshed wave tables, 3 new weapon bases, 6 new affixes, 5 uniques, long-telegraph nuke circles. Numbers: DECISIONS.md § 1.1.0 implementation choices. */
/* 1.0.0: in-run Market (buy / sell gear for gold, time frozen while you trade) + hub RESET PROGRESS (type-to-confirm full save wipe); Skills RESET renamed RESPEC. Numbers: DECISIONS.md § 1.0.0 implementation choices. */
/* 0.9.0 tester pack: Portal Circle (gold per hot-drop), tougher installations, gate bonus preview, rest-of-run boons, late loot tiers T4/T5, wave 20/40/60 Gear Check wardens. Numbers: DECISIONS.md § 0.9.0 implementation choices. */
/* 0.8.0 events pack: escort (mage / caravan), exit gate (escape = early bank + bonus), distant installations (barracks / catapult), event director. */
const BAG_MAX = 10;
const bagMax = () => BAG_MAX + ((save && save.skills && save.skills.pack) || 0);   // 1.1.0 Packrat: +1 slot / rank
const PAL = ['#1a1c2c','#5d275d','#b13e53','#ef7d57','#ffcd75','#a7f070','#38b764','#257179','#29366f','#3b5dc9','#41a6f6','#73eff7','#f4f4f4','#94b0c2','#566c86','#333c57'];
const RCOL = ['#f4f4f4', '#41a6f6', '#ffcd75', '#ef7d57'], RNAME = ['Common', 'Magic', 'Rare', 'Unique'], RCLS = ['common', 'magic', 'rare', 'unique'];   // 1.1.0: + Unique
const rnd = (a, b) => a + Math.random() * (b - a), irnd = (a, b) => Math.floor(rnd(a, b + 1)), pick = a => a[Math.floor(Math.random() * a.length)];
const clamp = (v, a, b) => v < a ? a : v > b ? b : v, TAU = Math.PI * 2;
const $ = s => document.querySelector(s);

/* ---------------- sprites (palette index grids, '.' = clear) ---------------- */
const SPR = {
  hero: [[ '...0000...','..0dddd0..','.0dccccd0.','.0d0440d0.','.0dddddd0.','0220ee0220','02eeeeee20','02edccde20','.0eeeeee0.','..0e00e0..','..0f00f0..','..00..00..' ],
         [ '...0000...','..0dddd0..','.0dccccd0.','.0d0440d0.','.0dddddd0.','0220ee0220','02eeeeee20','02edccde20','.0eeeeee0.','.0e0..0e0.','.0f0..0f0.','.00....00.' ]],
  slime: [[ '........','..0000..','.056650.','05055050','05666650','06666660','.000000.' ],
          [ '........','........','.000000.','05655650','05055050','06666660','00000000' ]],
  bat: [[ '01......10','011.00.110','0111111110','..012210..','...0110...','..........' ],
        [ '..........','....00....','..011110..','.01122110.','0110110110','00......00' ]],
  skel: [[ '..0000..','.0cccc0.','.020020.','.0cccc0.','..0d0d..','.0cdcdc0','0d0cdc0d','..0cdc0.','..0c0c0.','..0d0d0.','..00.00.' ],
         [ '..0000..','.0cccc0.','.020020.','.0cccc0.','..0d0d..','.0cdcdc0','0d0cdc0d','..0cdc0.','.0c0.0c0','.0d0.0d0','.00...00' ]],
  brute: [[ '...000000...','..03333330..','.0333333330.','.0302332030.','.0333333330.','.033c3c3330.','003333333300','033022220330','030022220030','..02222220..','..0110.0110.','..000..000..' ],
          [ '...000000...','..03333330..','.0333333330.','.0302332030.','.0333333330.','.033c3c3330.','003333333300','033022220330','030022220030','..02222220..','.0110..0110.','.000....000.' ]],
  wand: [[ '.....4.4','......4.','.....030','....0f0.','...0f0..','..0f0...','.0f0....','.00.....' ]],
  axe:  [[ '..000...','.0dcc0..','0dcccf0.','0dcc0f0.','.00.0f0.','....0f0.','....0f0.','....000.' ]],
  bow:  [[ '.00.....','030c....','03.c....','03..c...','03..c...','03.c....','030c....','.00.....' ]],
  heart: [[ '.0.0.','02020','02220','.020.','..0..' ]],
  bone: [[ 'c..c','.cc.','.cc.','c..c' ]],
  dashI: [[ '.........','.0...0...','.c0..c0..','.cc0.cc0.','.ccc0ccc0','.cc0.cc0.','.c0..c0..','.0...0...','.........' ]],
  novaI: [[ '....b....','.b..b..b.','..b.b.b..','...bcb...','bbbcccbbb','...bcb...','..b.b.b..','.b..b..b.','....b....' ]],
  goblin: [[ '0......0','05000050','.056650.','.0c55c0.','.055550.','00444400','04444440','.044440.','.0.00.0.' ],
           [ '0......0','05000050','.056650.','.0c55c0.','.055550.','00444400','04444440','.044440.','0..00..0' ]],
  coin: [[ '.000.','04440','04c40','04440','.000.' ]],
  tavern: [[ '....0000....','...022220...','..02222220..','.0222222220.','022222222220','000000000000','.0333333330.','.0344334430.','.0344334430.','.0333003330.','.0333003330.','000000000000' ]],
  hearth: [[ '....0000....','...0eeee0...','...0effe0...','.0000ee0000.','0eeeeeeeeee0','0effffffffe0','0ef000000fe0','0ef034430fe0','0ef043340fe0','0ef022220fe0','0eeeeeeeeee0','000000000000' ]],
  smithy: [[ '.4.......4..','...4..4.....','00000000000.','0ccccccccd0.','.0dddddddd0.','..00dddd00..','....0dd0....','....0dd0....','...0dddd0...','..0dddddd0..','..00000000..','............' ]],
  tower: [[ '.....00.....','....0990....','...099990...','..09999990..','.0000000000.','...0eeee0...','...0eaae0...','...0eeee0...','...0eaae0...','...0eeee0...','..0eeeeee0..','.0000000000.' ]],
  helmet: [[ '..0000..','.0dddd0.','0dccccd0','0d0000d0','0d0..0d0','0d0..0d0','.00..00.','........' ]],
  chest:  [[ '.00..00.','0ee00ee0','0eeeeee0','.0eeee0.','.0edde0.','.0eeee0.','.0eeee0.','.000000.' ]],
  pants:  [[ '.000000.','.0dddd0.','.0eeee0.','.0e00e0.','.0e00e0.','.0e00e0.','.0f00f0.','.00..00.' ]],
  boots:  [[ '..000...','..0e0...','..0e0...','..0e0...','..0ee00.','..0eeee0','..0ffff0','..000000' ]],
  gloves: [[ '..0.0.0.','.0e0e0e0','.0e0e0e0','.0eeeee0','00eeeee0','0e0eeee0','.0eeee0.','..0dd0..' ]],
  belt:   [[ '........','........','00000000','03344330','03400430','03344330','00000000','........' ]],
  ring:   [[ '...44...','..4cc4..','...44...','..0000..','.04..40.','.04..40.','..0000..','........' ]],
  amulet: [[ '.0....0.','..0..0..','...00...','..0440..','.04aa40.','.04aa40.','..0440..','...00...' ]],
  meteorI: [[ '......33.','.....33..','....33...','.0033....','03443....','04c43....','03443....','.033.....','.........' ]],
  infernoI: [[ '....3....','...343...','..34443..','.3443443.','3444c4443','34c444c43','.344c443.','..33333..','.........' ]],
  rollI: [[ '...666...','..6...6..','.6.....6.','.6....666','.6.....6.','..6......','...666...','.........','.........' ]],
  rainI: [[ '5.5.5.5..','.5.5.5.5.','5.5.5.5..','.5.5.5.5.','.........','..ccccc..','.c.....c.','.........','.........' ]],
  chargeI: [[ '...0c....','..0cc0...','.0ccccc0.','0cccccccc','.0ccccc0.','..0cc0...','...0c....','.........','.........' ]],
  wardI: [[ '.0000000.','0ccccccc0','0cdcccdc0','0ccdcdcc0','.0ccdcc0.','.0ccccc0.','..0ccc0..','...0c0...','....0....' ]],
  hall: [[ '.....22.....','.....2......','...000000...','..0ffffff0..','.0ffffffff0.','000000000000','.0dddddddd0.','.0d22dd22d0.','.0d22dd22d0.','.0ddd00ddd0.','.0ddd00ddd0.','000000000000' ]],
  gate: [[ '....0000....','..00dddd00..','.0dd0000dd0.','.0d0bbbb0d0.','0d0b9bb9b0d0','0d0bb99bb0d0','0d0b9bb9b0d0','0d0bbbbbb0d0','0d0b9bb9b0d0','0d0bbbbbb0d0','0dd000000dd0','000000000000' ]],
  wall: [[ '.0..0..0..0.','030030030030','033033033033','333333333333','303303303303','333333333333','303303303303','333333333333','000000000000' ]],
  /* 0.5.0 bestiary (all face right; flipped toward the hero) */
  rat: [[ '......00..','..00000e0.','.0eeeeee20','feeeeeeee3','.0e0..0e0.','..........' ],
    [ '..........','......00..','..00000e0.','feeeeeee20','.0eeeeeee3','..0e00e0..' ]],
  boar: [[ '...0000.....','..0f3f300...','.0ffffff00..','0f3ffffff40.','0ffffffffff0','0f3ffffffc0.','.0ffffff0c..','.0f0.0f0....','.00..00.....' ],
    [ '...0000.....','..0f3f300...','.0ffffff00..','0f3ffffff40.','0ffffffffff0','0f3ffffffc0.','.0ffffff0c..','..0f00f0....','..00..00....' ]],
  imp: [[ '.0....0.','.20..02.','.022220.','.024420.','..0220..','.022220.','0.0220.3','..0220.4','..0..0..','.00..00.' ],
    [ '.0....0.','.20..02.','.022220.','.024420.','..0220..','.022220.','0.0220.4','..0220.3','..0..0..','..0..0..' ]],
  caster: [[ '...00..5','..0110.f','.011110f','.01cc10f','.0c55c0f','..0cc0.f','.011110f','01111110','01181810','.011110f','.011110.','.000000.' ],
    [ '...00..5','..0110.f','.011110f','.01cc10f','.0c55c0f','..0cc0.f','.011110f','01111110','01818110','.011110f','.011110.','..0000..' ]],
  wisp: [[ '...c....','..cb....','..bbc...','.bbbbc..','bb0bb0b.','bbbbbbb.','.abbba..','..a.a...' ],
    [ '....c...','...bc...','..cbb...','.cbbbb..','bb0bb0b.','bbbbbbb.','.abbba..','.a...a..' ]],
  golem: [[ '....000000....','...0aaaaaa0...','..0abbbbbba0..','..0ab0bb0ba0..','..0abbbbbba0..','.00aaaaaaaa00.','0aa0abbbba0aa0','0ab0aaaaaa0ba0','0aa0a9999a0aa0','.00.a9999a.00.','....0aa0aa0...','...000..000...' ],
    [ '....000000....','...0aaaaaa0...','..0abbbbbba0..','..0ab0bb0ba0..','..0abbbbbba0..','.00aaaaaaaa00.','0aa0abbbba0aa0','0ab0aaaaaa0ba0','0aa0a9999a0aa0','.00.a9999a.00.','...0aa0.0aa0..','...000...000..' ]],
  wolf: [[ '.........0.0','........0d0d','.0000000dccd','0dcccccccb0d','0ddddddddddd','.0dddddddd0.','.0d0...0d0..','.00....00...' ],
    [ '.........0.0','........0d0d','.0000000dccd','0dcccccccb0d','0ddddddddddd','.0dddddddd0.','..0d0.0d0...','..00..00....' ]],
  armory: [[ '....0000....','...0dddd0...','..0dddddd0..','.0dddddddd0.','000000000000','0eeeeeeeeee0','0e22e44e22e0','0e22e44e22e0','0eeeeeeeeee0','0ee0e00e0ee0','0ee0e00e0ee0','000000000000' ]],   // 0.6.0
  /* 1.1.0 weapons + bestiary */
  spear: [[ '......cc','.....cdc','....0dc.','...0f0..','..0f0...','.0f0....','0f0.....','00......' ]],
  xbow:  [[ '0......0','.0....0.','..0dd0..','.dddddd4','..0ff0..','.0..f.0.','0...f..0','....0...' ]],
  flail: [[ '.....d.d','....ddd.','...dcdd.','....ddd.','...e.d.d','..e.....','.0f.....','0f......' ]],
  mason: [[ '....0000....','...0eeee0...','..0e3ee3e0..','..0eeeeee0.0','...0ffff0.0d','.00feeeef00d','0ee0feef0.0d','0e00feef0...','...0ffff0...','...0f00f0...','...0e00e0...','...00..00...' ],
    [ '....0000....','...0eeee0...','..0e3ee3e0..','..0eeeeee0..','...0ffff00d.','.00feeeef0d.','0ee0feef00d.','0e00feef0...','...0ffff0...','..0f0..0f0..','..0e0..0e0..','..00....00..' ]],
  tick: [[ '...4....','...3....','.00000..','0322230.','0222220.','.0.0.0..' ],
    [ '...3....','...4....','.00000..','0322230.','0222220.','0.0.0.0.' ]],
  bloat: [[ '....0000....','..00666600..','.0665665660.','066566665660','060c6666c060','066666666660','065666666560','.0666556660.','..00666600..','...0.00.0...' ],
    [ '....0000....','..00666600..','.0666566560.','066656656660','060c6666c060','066666666660','066566665660','.0665666560.','..00666600..','..0..00..0..' ]],
  maggot: [[ '.000.','0ccc0','.0.0.' ], [ '.000.','0ccc0','0...0' ]],
  wraith: [[ '...0000...','..0cccc0..','.0c1cc1c0.','.0cccccc0.','.0dcccdc0.','0dd1cc1dd0','0d111111d0','.01111110.','.0111110..','..01.01.0.','...0..0...' ],
    [ '...0000...','..0cccc0..','.0c1cc1c0.','.0cccccc0.','.0dcccdc0.','0dd1cc1dd0','0d111111d0','.01111110.','.0111110..','.01.01.0..','..0..0....' ]],
  oracle: [[ '.b........','bcb..00...','.b..0990..','.f.09c9c0.','.f.099990.','.f0999990.','.f09a99a90','.f0999990.','.f.09a90..','.f.09990..','.f0999990.','.f0000000.' ],
    [ '.c........','bbb..00...','.b..0990..','.f.09c9c0.','.f.099990.','.f0999990.','.f09a99a90','.f0999990.','.f.09a90..','.f.09990..','.f0999990.','.f0000000.' ]],
  /* 0.4.0 village sprites */
  inn: [[ '...000000...','..02222220..','.0222222220.','022222222220','000000000000','.0344334430.','.0344334430.','.0333333330.','000000000000','.0344334430.','.0344334430.','.0333003330.','.0333003330.','000000000000' ]],
  fountain: [[ '....b..b....','...b.cc.b...','.....dd.....','..00edde00..','.0daabbaad0.','0dddddddddd0','0eeeeeeeeee0','.0000000000.' ]],
  banner: [[ '00......','02222...','02442...','02222...','0222....','02......','0.......','0.......','0.......','0.......','0.......','00......' ]],
  lantern: [[ '.0000.','.0440.','.0440.','.0000.','..ff..','..ff..','..ff..','..ff..','..ff..','.ffff.' ]],
  stall: [[ '2c2c2c2c2c2c','2c2c2c2c2c2c','.0........0.','.f........f.','.f.4.5.3..f.','000000000000','0eeeeeeeeee0','0e44e55e33e0','0eeeeeeeeee0','.f........f.' ]],
  watch: [[ '....00....','...0340...','..004400..','.00000000.','.0eeeeee0.','.0e0ee0e0.','0000000000','..0f..f0..','..0.ff.0..','..0f..f0..','..0.ff.0..','..0f..f0..','..0.ff.0..','..0f..f0..','.0eeeeee0.','.0e0000e0.','.0e0..0e0.','0000000000' ]],
  trophy: [[ '000000000000','0ffffffffff0','0ffffffffff0','0ffffffffff0','0ffffffffff0','0ffffffffff0','0ffffffffff0','0ffffffffff0','000000000000','.0e......e0.' ]],
  garden: [[ '..5...4...5.','.565.636.565','..6...6...6.','ffffffffffff','f2f6f5f2f6ff','ffffffffffff' ]],
  cottage: [[ '...0000...','..022220..','.02222220.','0222222220','0000000000','.0c4cc4c0.','.0cccccc0.','.0cc00cc0.','.00000000.' ]],
  crystal: [[ '..c..','.cb..','.bba.','abba.','a9ba9' ]], drift: [[ '.cc.','cddc' ]],
  tuft: [[ '.6.6','6.6.' ]], stone: [[ '.ee.','effe' ]], skull: [[ '.cc.','c0c0','.cc.' ]], ash: [[ 'f.f' ]],
  /* 1.2.0 village props + critters (extra letters = XPAL earth tones, never remapped) */
  vhen: [[ '..2.','.cc3','ccc.','.3.3' ], [ '....','..2.','ccc3','.3.3' ]],
  vsheep: [[ '.cccc.','cccc00','.cccc.','.0..0.' ], [ '.cccc.','cccc00','.cccc.','..0.0.' ]],
  vduck: [[ '...63','cccc.','.ccc.' ], [ '.....','ccc63','.ccc.' ]],
  vdog: [[ '....33','3...30','.3333.','.3..3.' ], [ '....33','.3..30','.3333.','3....3' ]],
  vcat: [[ 'f.f.','5f5.','fff.','.fff' ], [ 'f.f.','fff.','fff.','.fff' ]],
  vbird: [[ '0.0','.0.' ], [ '...','000' ]],
  barrel: [[ 'jhhj','hgnh','ffff','hgnh','jhhj' ]],
  crate: [[ 'hhhhh','hgngh','hngnh','hhhhh' ]],
  sack: [[ '.mm.','mkkm','mkkm','.mm.' ]],
  hay: [[ '.kkkk.','kkhkkk','kkkkhk','.hhhh.' ]],
  anvil: [[ '.ddddd','eeeee.','..ee..','.ffff.' ]],
  well: [[ '..hhhhh..','.hgngngh.','hhhhhhhhh','.j.....j.','.j..f..j.','.j..h..j.','ddddddddd','edeedeede','eeeeeeeee','.fffffff.' ]],
  cart: [[ 'hhhhhhhh..','hgngngnh..','hhhhhhhhhh','.fjf..fjf.','..f....f..' ]],
  scarecrow: [[ '..j..','.jjj.','.mmm.','k222k','.222.','..h..','..h..','..h..' ]],
  /* 1.4.0 raid bosses (face right; flipped toward the hero) + raid adds + trophy-wall heads */
  rb_ashmaw: [[ '..0............0..','.030..........030.','.0330..0000..0330.','..03300ffff00330..','...00ff2222ff00...','....0f242242f0....','....0f222222f0....','..000ff2332ff000..','.0ff20f3443f02ff0.','0f22f0f2332f0f22f0','0f33f0ff22ff0f33f0','0ff0.0f2332f0.0ff0','.00..0ff22ff0..00.','.....0f2ff2f0.....','....0ff0..0ff0....','....0320..0230....','...00000..00000...' ],
               [ '..0............0..','.030..........030.','.0330..0000..0330.','..03300ffff00330..','...00ff2222ff00...','....0f242242f0....','....0f222222f0....','..000ff2442ff000..','.0ff20f4334f02ff0.','0f22f0f2442f0f22f0','0f33f0ff22ff0f33f0','0ff0.0f2442f0.0ff0','.00..0ff22ff0..00.','.....0f2ff2f0.....','...0ff0....0ff0...','...0320....0230...','..00000....00000..' ]],
  rb_morthal: [[ '..4...4..4...4..','..44.444444.44..','..444424424444..','...0cccccccc0...','..0cc00cc00cc0..','..0cc02cc20cc0..','..0ccccddcccc0..','...0c0c0c0c0....','..0110cccc0110..','.01111dccd11110.','0111c1dccd1c1110','01c11dccccd11c10','.0c111dccd111c0.','..0111dccd1110..','..01111dd11110..','..011111111110..','.01111111111110.','.00000000000000.' ],
                [ '..4...4..4...4..','..44.444444.44..','..444424424444..','...0cccccccc0...','..0cc00cc00cc0..','..0cc05cc50cc0..','..0ccccddcccc0..','...0c0c0c0c0....','..0110cccc0110..','.01111dccd11110.','0111c1dccd1c1110','01c11dccccd11c10','.0c111dccd111c0.','..0111dccd1110..','..01111dd11110..','..011111111110..','.01111111111110.','..000000000000..' ]],
  rb_glacia: [[ '...b..c..c..b...','...bb.cbbc.bb...','....bbbccbbb....','.....0cccc0.....','....0cc00cc0....','....0cbccbc0....','.....0cccc0.....','...00abccba00...','..0aabbccbbaa0..','.0a0abbccbba0a0.','.0b0abccccba0b0.','..0.abbccbba.0..','....0abbbba0....','....0aabbaa0....','.....0aaaa0.....','.....b.aa.b.....','......b..b......' ],
               [ '...b..c..c..b...','...bb.cbbc.bb...','....bbbccbbb....','.....0cccc0.....','....0cc00cc0....','....0cbccbc0....','.....0cccc0.....','...00abccba00...','..0aabbccbbaa0..','.0a0abbccbba0a0.','.0b0abccccba0b0.','..0.abbccbba.0..','....0abbbba0....','....0aabbaa0....','.....0aaaa0.....','......baab......','.....b....b.....' ]],
  rb_vael: [[ '......000000......','....0011111100....','...011cccccc110...','..01ccccccccccc10.','..01cccc2222ccc10.','.01ccc223322ccc10.','.01ccc230032ccc10.','.01ccc230032ccc10.','.01ccc223322ccc10.','..01cccc2222ccc10.','..011ccccccccc110.','...0111cccc1110...','....0f111111f0....','...0f0f0ff0f0f0...','..0f0.0f..f0.0f0..','..0...0f..f0...0..' ],
           [ '......000000......','....0011111100....','...011cccccc110...','..01ccccccccccc10.','..01ccc2222cccc10.','.01ccc223322ccc10.','.01ccc230032ccc10.','.01ccc230032ccc10.','.01ccc223322ccc10.','..01ccc2222cccc10.','..011ccccccccc110.','...0111cccc1110...','....0f111111f0....','....0f0ff0f0f0....','...0f0.f..f.0f0...','...0..0f..f0..0...' ]],
  rb_morr: [[ '..0d0....4.4....06..','.0dd0...44444...066.','0ddd00..42424..0666.','0d0dd0.0cccc0.06060','.0dddd00c00c0006660.','..0dd0f0cccc0f0660..','...00fff0c0fff00....','..0ff1f2f22f2f1ff0..','.0f1f2f2222f2f1f0...','0ff1f2f234432f1ff0..','0f11f2f233332f11f0..','.0f1ff22222222ff0...','..0f1f22222222f0....','...0ff2f2222f2f0....','...0f0ff0..0ff0f0...','..0f0..0f..f0..0f0..','..00...00..00...00..' ],
           [ '..0d0....4.4....06..','.0dd0...44444...066.','0ddd00..42424..0666.','0d0dd0.0cccc0.06060','.0dddd00c00c0006660.','..0dd0f0cccc0f0660..','...00fff0c0fff00....','..0ff1f2f22f2f1ff0..','.0f1f2f2222f2f1f0...','0ff1f2f243342f1ff0..','0f11f2f244442f11f0..','.0f1ff22222222ff0...','..0f1f22222222f0....','...0ff2f2222f2f0....','..0f0ff0....0ff0f0..','.0f0..0f....f0..0f0.','.00...00....00...00.' ]],
  pylon: [[ '...00...','..0110..','..0c50..','.0c11c0.','.0cddc0.','.0cddc0.','.0dccd0.','.0cddc0.','.0cddc0.','0dcddcd0','0dccccd0','0eddddde','.000000.' ], [ '...00...','..0110..','..0c60..','.0c11c0.','.0cddc0.','.0cddc0.','.0dccd0.','.0cddc0.','.0cddc0.','0dcddcd0','0dccccd0','0eddddde','.000000.' ]],
  vorb: [[ '.0110.','011c10','01c201','01cc11','.0110.','..1.1.' ], [ '.0110.','01c110','0102c1','011c10','.0110.','.1.1..' ]],
  rt_ashmaw: [[ '3...3','32223','24242','.222.','..2..' ]],
  rt_morthal: [[ '4.4.4','44444','c0c0c','ccccc','.c.c.' ]],
  rt_glacia: [[ 'b.c.b','.bcb.','c0c0c','.ccc.','..a..' ]],
  rt_vael: [[ '.111.','1ccc1','1c2c1','1ccc1','.1.1.' ]],
  rt_morr: [[ 'd.4.6','d4446','40204','.444.','..4..' ]],
};
// 1.6.0: auto 1px dark outline (4-neighbour) around a sprite's silhouette, so the new item icons + wagon read on any ground
function olRows(rows) { return rows.map((r, y) => [...r].map((ch, x) => ch !== '.' ? ch : [[1, 0], [-1, 0], [0, 1], [0, -1]].some(([dx, dy]) => { const c = (rows[y + dy] || '')[x + dx]; return !!c && c !== '.' && c !== '0'; }) ? '0' : '.').join('')); }
Object.assign(SPR, (() => { const o = {   // 1.6.0 chunky 10x10 item icons (it_<weapon base | armour slot>) + the escort caravan (wagon: wheel frames, cox: ox walk frames)
  it_wand: [['..........', '......4...', '.....343..', '....34c43.', '.....343..', '....kn....', '...kn.....', '..kn......', '.hh.......', '..........']],
  it_axe: [['..........', '..cddenh..', '.cdddenh..', '.cdddenh..', '.cdddenh..', '..cddenh..', '......nh..', '......nh..', '......jj..', '..........']],
  it_bow: [['..........', '..kg......', '..c.gn....', '..c..gn...', '.eccddgna.', '..c..gn...', '..c.gn....', '..kg......', '..........', '..........']],
  it_spear: [['..........', '......ccc.', '.....cddc.', '.....bdc..', '....kb....', '...kn.....', '..kn......', '.kn.......', '.h........', '..........']],
  it_xbow: [['..........', '....cc....', '.e..dd..e.', '.eddkkdde.', '..e.nh.e..', '...cnhc...', '....nh....', '....nh....', '....hj....', '..........']],
  it_flail: [['..........', '.......d..', '.....edd..', '....dcddd.', '.....ddde.', '....e.ed..', '..kd......', '.kn.......', '.hh.......', '..........']],
  it_helmet: [['..........', '....32....', '..eddcde..', '.edccccde.', '.edcddcde.', '.ed0000de.', '.edd00dde.', '..ed..de..', '..........', '..........']],
  it_chest: [['..........', '.ee....ee.', '.edd44dde.', '.edcddcde.', '..dcddcd..', '..dddddd..', '..e4444e..', '..edddde..', '...eeee...', '..........']],
  it_pants: [['..........', '..8888888.', '..99a9a99.', '..9a9.9a9.', '..9a9.9a9.', '..9a9.9a9.', '..999.999.', '..eee.eee.', '..........', '..........']],
  it_boots: [['..........', '..kkkk....', '..gnng....', '..gnng....', '..gnng....', '..gnnggg..', '..gnnnnng.', '..hhhhhhh.', '..........', '..........']],
  it_gloves: [['..........', '...k.k.k..', '...knknk..', '.k.nnnnn..', '.knnnnnn..', '..nnnnnn..', '...nnnn...', '...hhhh...', '...hhhh...', '..........']],
  it_belt: [['..........', '..........', '....444...', '.hhh4h4hh.', '.gnn404ng.', '.hhh4h4hh.', '....444...', '..........', '..........', '..........']],
  it_ring: [['..........', '....bb....', '...bccb...', '....bb....', '...3443...', '..43..34..', '..4....4..', '..34..43..', '...3443...', '..........']],
  it_amulet: [['..........', '.e......e.', '..e....e..', '...e..e...', '...4444...', '..422224..', '..42c224..', '..422224..', '...4444...', '..........']],
  caravan: [['..............................', '......cccccccccccc............', '....mmmkmmmmkmmmmkmmm.........', '...jmmmkmmmmkmmmmkmmmm.hh.....', '...jmmmkmmmmkmmmmkmmmmhhhh....', '...jgmmkmmmmkmmmmkmmmm.mm.....', '.h.jnmmkmmmmkmmmmkmmmm.99.....', '.4.jmmmkmmmmkmmmmkmmmm.99.....', '.3.kkkkhkkkkhkkkkhkkkk.99.....', '..hhhhhhhhhhhhhhhhhhhhhh......', '..gnnnngnnnngnnnngnnnngg......', '..gnknngnknngnknngnknngg......', '..hhhhhhhhhhhhhhhhhhhhhhhhhh..', '......hhh.........hhh.........', '.....h.k.h.......h.k.h........', '....h..k..h.....h..k..h.......', '....hkk4kkh.....hkk4kkh.......', '....h..k..h.....h..k..h.......', '.....h.k.h.......h.k.h........', '......hhh.........hhh.........'], ['..............................', '......cccccccccccc............', '....mmmkmmmmkmmmmkmmm.........', '...jmmmkmmmmkmmmmkmmmm.hh.....', '...jmmmkmmmmkmmmmkmmmmhhhh....', '...jgmmkmmmmkmmmmkmmmm.mm.....', '.h.jnmmkmmmmkmmmmkmmmm.99.....', '.4.jmmmkmmmmkmmmmkmmmm.99.....', '.3.kkkkhkkkkhkkkkhkkkk.99.....', '..hhhhhhhhhhhhhhhhhhhhhh......', '..gnnnngnnnngnnnngnnnngg......', '..gnknngnknngnknngnknngg......', '..hhhhhhhhhhhhhhhhhhhhhhhhhh..', '......hhh.........hhh.........', '.....h...h.......h...h........', '....h.k.k.h.....h.k.k.h.......', '....h..4..h.....h..4..h.......', '....h.k.k.h.....h.k.k.h.......', '.....h...h.......h...h........', '......hhh.........hhh.........']],
  cox: [['..............', '..........m.m.', '.........jggg.', '.ggggggggjgn0g', 'hgnnnnnnnjnnng', '.gnnnnnnnnggmm', '.gnnnnnnnng.mm', '..gkkkkkkg....', '..h.h...h.h...', '..h.h...h.h...', '..............'], ['..............', '..........m.m.', '.........jggg.', '.ggggggggjgn0g', 'hgnnnnnnnjnnng', '.gnnnnnnnnggmm', '.gnnnnnnnng.mm', '..gkkkkkkg....', '...hh...hh....', '...h.h..h.h...', '..............']],
}; for (const k in o) o[k] = o[k].map(olRows); return o; })());
/* 1.10.0 sprites: new foes (2 frames, face right), raid bosses 6-8 + trophy heads, 2 hand weapons + item icons, 8 armour-base icons (recoloured slot icons) */
Object.assign(SPR, (() => { const pad = f => { const w = Math.max(...f.map(r => r.length)); return f.map(r => r.padEnd(w, '.')); }, o = {
  spitter: [[ '........', '..0000..', '.066660.', '06c66c60', '06666660', '06111160', '.011110.', '06666660', '.06..60.', '.00..00.' ],
            [ '........', '........', '..0000..', '.066660.', '06c66c60', '06666660', '06111160', '0661166.', '06....60', '00....00' ]],
  adder: [[ '.......00.', '......0770', '..00..07c0', '.0770.0770', '077b077.0.', '.0...0....' ],
          [ '.......00.', '......0770', '.......7c0', '.00..07700', '07707b70..', '.077.0....' ]],
  blightcap: [[ '...0000...', '.00111100.', '0111c11c10', '01c1111110', '0111111c10', '.00000000.', '...0cc0...', '..0c00c0..', '..0cccc0..', '..00..00..' ],
              [ '..........', '...0000...', '.00111100.', '0111c11c10', '01c11111c0', '.00000000.', '...0cc0...', '..0c00c0..', '..0cccc0..', '.00....00.' ]],
  phalanx: [[ '..0000..', '.0dddd0.', '.0d00d0.', '.0dccd0.', '..0000..', '.0eeee0.', '0deeeed0', '0.0ee0.0', '..0ee0..', '..0dd0..', '..0..0..', '.00..00.' ],
            [ '..0000..', '.0dddd0.', '.0d00d0.', '.0dccd0.', '..0000..', '.0eeee0.', '0deeeed0', '0.0ee0.0', '..0ee0..', '..0dd0..', '.0d..d0.', '.00..00.' ]],
  hurler: [[ '...00.....', '..0ee0....', '...00.....', '.0.000.0..', '0303330.0.', '.0333330..', '..0c3c0...', '.0333330..', '0330.0330.', '.00...00..' ],
           [ '..0ee0....', '...00.....', '..........', '.0.000.0..', '0303330.0.', '.0333330..', '..0c3c0...', '.0333330..', '.030.030..', '.00...00..' ]],
  chakram: [[ '..0dd0..', '.0dccd0.', '0dc00cd0', 'dc0..0cd', 'dc0..0cd', '0dc00cd0', '.0dccd0.', '..0dd0..' ]],
  darts: [[ '.......c', '......c1', '.....01.', '....0f0.', '...0f0..', '..0f0...', '.55.....', '5.5.....' ]],
  rb_vexmire: [[ '.....00000000.....', '...001111111100...', '..011c111111c110..', '.01111111c1111110.', '.01c111111111c110.', '..00000000000000..', '....0dddddddd0....', '...0d20dddd02d0...', '...0dddd00dddd0...', '...0dd0c00c0dd0...', '..0dddddddddddd0..', '.0d1d1dddddd1d1d0.', '.0d0d0dddddd0d0d0.', '..0.0.0dddd0.0.0..', '......0d00d0......', '.....00.00.00.....' ],
                [ '.....00000000.....', '...001111111100...', '..011c111111c110..', '.01111111c1111110.', '.01c111111111c110.', '..00000000000000..', '....0dddddddd0....', '...0d20dddd02d0...', '...0dddd00dddd0...', '...0dd0cc0c0dd0...', '..0dddddddddddd0..', '0d1d1.dddddd.1d1d0', '0d0d0.dddddd.0d0d0', '.0.0..0dddd0..0.0.', '......0d00d0......', '......00..00......' ]],
  rb_kharos: [[ '....4.......4.....', '.....4.0000.4.....', '......099990......', '.....09999990.....', '....099c99c990....', '....0999999990....', '..00009999990000..', '.0aa0099999900aa0.', '0a4a009999990a4a0.', '0aaa0a9cc9a0aaa0..', '.00.0a9999a0.00...', '....0aa99aa0......', '....0a0aa0a0......', '...0a0.00.0a0.....', '...00......00.....' ],
               [ '...4.........4....', '....4..0000.4.....', '......099990......', '.....09999990.....', '....099c99c990....', '....0999999990....', '..00009999990000..', '.0aa0099999900aa0.', '0a4a009999990a4a0.', '0aaa0a9cc9a0aaa0..', '.00.0a9999a0.00...', '....0aa99aa0......', '....0a0aa0a0......', '....0a0000a0......', '....00....00......' ]],
  rb_skarn: [[ '..b.........b.......', '..bb..00000.bb......', '...bb0ccccc0bb......', '....0cc2cc2c0.......', '....0ccccccc0.......', '.....0c0c0c0........', '...00cccccccc00.....', '..0bccccccccccb0....', '.0bcc0ccccccc0ccb0..', '0bc0.0ccbbbcc0.0cb0.', '0b0..0cbbbbbc0..0b0.', '.0...0ccbbbcc0...0..', '.....0cc0.0cc0......', '....0cc0...0cc0.....', '....000.....000.....' ],
              [ '..b.........b.......', '..bb..00000.bb......', '...bb0ccccc0bb......', '....0cc2cc2c0.......', '....0ccccccc0.......', '.....0c0c0c0........', '0b.00cccccccc00.b0..', '0bcbccccccccccbcb0..', '.0bcc0ccccccc0ccb0..', '..00.0ccbbbcc0.00...', '.....0cbbbbbc0......', '.....0ccbbbcc0......', '.....0cc0.0cc0......', '.....0cc0.0cc0......', '.....000...000......' ]],
  rt_vexmire: [[ '.111.', '1c1c1', '11111', '.2.2.', '.d.d.' ]],
  rt_kharos: [[ '4...4', '.999.', '9c9c9', '.999.', '..4..' ]],
  rt_skarn: [[ 'b...b', '.ccc.', 'c2c2c', '.ccc.', '.b.b.' ]],
}; for (const k in o) o[k] = o[k].map(pad); return o; })());
Object.assign(SPR, (() => { const o = {
  it_chakram: [['..........', '...dddd...', '..dc00cd..', '.dc0..0cd.', '.d0....0d.', '.d0....0d.', '.dc0..0cd.', '..dc00cd..', '...dddd...', '..........']],
  it_darts: [['..........', '.......cc.', '......c1c.', '.....01c..', '....0f0...', '...0f0....', '..0f0.....', '.550......', '.55.......', '..........']],
  satchel: [['..........', '.h........', '.h.nnnn...', '.hjnnnnn..', 'h.jnkkng..', '..jnnnnj..', '..jnnnnj..', '..hjjjjh..', '...hhhh...', '..........']],   // 1.17.1 leather satchel / pouch (strap + flap + buckle; not a school backpack)
}; for (const k in o) o[k] = o[k].map(olRows); const sub = (src, m) => SPR[src].map(f => f.map(r => [...r].map(ch => m[ch] ?? ch).join('')));
  Object.assign(o, { it_cowl: sub('it_helmet', { d: '1', c: 'd', e: '0', 3: '5', 2: '6' }), it_talisman: sub('it_amulet', { 4: 'b', 2: '1', e: 'd' }), it_robe: sub('it_chest', { d: '9', c: 'a', e: '8', 4: '4' }),
    it_gauntlets: sub('it_gloves', { n: 'd', k: 'c', h: 'e' }), it_signet: sub('it_ring', { b: '2', c: '3', 3: 'd', 4: 'c' }), it_sash: sub('it_belt', { h: '2', g: '3', n: '2' }),
    it_chausses: sub('it_pants', { 8: 'e', 9: 'd', a: 'c' }), it_sabatons: sub('it_boots', { k: 'c', g: 'e', n: 'd', h: '0' }) }); return o; })());
const REMAP = {
  w: () => 12,
  e: i => ({ 1: 2, 2: 4, 3: 2, 5: 4, 6: 3, 12: 4, 13: 3, 14: 2, 15: 1, 4: 12 })[i] ?? i,
  b: i => ({ 3: 1, 2: 11, 4: 12, 1: 15, 12: 13, 6: 1, 5: 9 })[i] ?? i,
  i: i => i === 0 ? 8 : ({ 12: 11, 4: 11 })[i] ?? (i % 2 ? 10 : 11),
  s: i => i === 0 ? 0 : ({ 1: 15, 2: 14, 3: 13, 4: 12, 5: 13, 6: 14, 7: 14, 8: 15, 9: 14, 10: 13, 11: 12 })[i] ?? i,   // stone (statue / ruins)
  g: i => i === 0 ? 0 : ({ 1: 1, 2: 3, 3: 4, 4: 12, 5: 4, 6: 3, 7: 3, 8: 1, 9: 3, 10: 4, 11: 4, 13: 4, 14: 3, 15: 1 })[i] ?? i, // gold (gilded statue)
  p: i => i === 0 ? 0 : ({ 1: 15, 2: 13, 3: 12, 4: 11, 5: 12, 6: 13, 7: 13, 8: 14, 9: 13, 10: 11, 13: 12, 14: 13, 15: 14 })[i] ?? i, // platinum (slayer tavern)
  h: i => ({ 13: 12, 12: 13, 11: 2 })[i] ?? i,   // 0.5.0 bone hound (wolf sheet, bleached + red eye)
  r1: i => i === 2 ? 9 : i, r2: i => i === 2 ? 7 : i, r3: i => i === 2 ? 1 : i,   // 0.4.0 roof colours (cottages, stalls)
};
// 0.3.0 hero outfits: palette remaps of the hero sheet (d hood, c face, 4 eyes, 2 shoulders, e body, f boots)
const HERO_REMAP = {
  pyro:   i => ({ 13: 3, 14: 2, 2: 4, 15: 1 })[i] ?? i,
  ranger: i => ({ 13: 6, 14: 7, 2: 5 })[i] ?? i,
  knight: i => ({ 13: 12, 12: 13, 14: 15, 2: 13, 4: 2 })[i] ?? i,
};
const XPAL = { g: '#8b5a2b', h: '#5a4630', j: '#3d2a1a', k: '#c8a060', m: '#e0d2b0', n: '#a8743a' };   // 1.2.0 earth tones for village props (never remapped)
function mk(rows, map) {
  const c = document.createElement('canvas'); c.width = rows[0].length; c.height = rows.length; const x = c.getContext('2d');
  rows.forEach((r, y) => [...r].forEach((ch, X) => { if (ch === '.') return; if (XPAL[ch]) { x.fillStyle = XPAL[ch]; x.fillRect(X, y, 1, 1); return; } let i = parseInt(ch, 16); if (map) i = map(i); x.fillStyle = PAL[i]; x.fillRect(X, y, 1, 1); }));
  return c;
}
SPR.wizard = [[ '.....0.....','....090..b.','....0990bcb','...09949.b.','..0000000g.','...0c4c0.g.','...0ddd0.g.','..089998cg.','..0899980g.','..0894980g.','.08999998g.','.08999998g.','.088888880g','..00..00.g.' ],
  [ '.....0.....','....090..c.','....0990cbc','...09949.c.','..0000000g.','...0c4c0.g.','...0ddd0.g.','..089998cg.','..0899980g.','..0894980g.','.08999998g.','.08999998g.','.088888880g','...00.00.g.' ]];   // 1.18.0 robed wizard: pointed hat, beard, staff
const IMG = {};
for (const k in SPR) { IMG[k] = { n: SPR[k].map(f => mk(f)) }; for (const v in REMAP) IMG[k][v] = SPR[k].map(f => mk(f, REMAP[v])); }
for (const h in HERO_REMAP) { const m = HERO_REMAP[h]; IMG['hero_' + h] = { n: SPR.hero.map(f => mk(f, m)), w: SPR.hero.map(f => mk(f, REMAP.w)) }; }
IMG.hero_wanderer = IMG.hero;
const SILC = new Map();   // 1.6.0: one-colour silhouette of a sprite (item rarity rim, caravan hit flash)
function silh(img, col) { let m = SILC.get(img); if (!m) SILC.set(img, m = {}); if (m[col]) return m[col]; const c = document.createElement('canvas'); c.width = img.width; c.height = img.height; const x = c.getContext('2d'); x.drawImage(img, 0, 0); x.globalCompositeOperation = 'source-in'; x.fillStyle = col; x.fillRect(0, 0, c.width, c.height); return (m[col] = c); }
const shadowC = (() => { const c = document.createElement('canvas'); c.width = 12; c.height = 4; const x = c.getContext('2d'); x.fillStyle = 'rgba(0,0,0,.35)'; x.fillRect(2, 0, 8, 4); x.fillRect(0, 1, 12, 2); return c; })();
const bigIcon = (img, s) => { const c = document.createElement('canvas'); c.width = img.width * s; c.height = img.height * s; const x = c.getContext('2d'); x.imageSmoothingEnabled = false; x.drawImage(img, 0, 0, c.width, c.height); return c.toDataURL(); };

/* ---------------- 3x5 bitmap font ---------------- */
const FONT = { '0':'111101101101111','1':'010110010010111','2':'111001111100111','3':'111001111001111','4':'101101111001001','5':'111100111001111','6':'111100111101111','7':'111001001010010','8':'111101111101111','9':'111101111001111',
 A:'010101111101101',B:'110101110101110',C:'011100100100011',D:'110101101101110',E:'111100110100111',F:'111100110100100',G:'011100101101011',H:'101101111101101',I:'111010010010111',J:'001001001101010',K:'101101110101101',L:'100100100100111',M:'101111111101101',N:'110101101101101',O:'010101101101010',P:'110101110100100',Q:'010101101110011',R:'110101110101101',S:'011100010001110',T:'111010010010010',U:'101101101101111',V:'101101101101010',W:'101101111111101',X:'101101010101101',Y:'101101010010010',Z:'111001010100111',
 '+':'000010111010000','-':'000000111000000','%':'101001010100101','/':'001001010100100',':':'000010000010000','!':'010010010000010','.':'000000000000010',"'":'010010000000000','?':'111001011000010',' ':'000000000000000','(':'010100100100010',')':'010001001001010' };
const txtCache = new Map();
function textImg(s, col) {
  s = String(s).toUpperCase(); const key = s + '|' + col; let c = txtCache.get(key); if (c) return c;
  if (txtCache.size > 600) txtCache.clear();
  c = document.createElement('canvas'); c.width = Math.max(1, s.length * 4 + 1); c.height = 7; const x = c.getContext('2d');
  for (let pass = 0; pass < 2; pass++) {
    x.fillStyle = pass ? col : '#0b0b14';
    [...s].forEach((ch, i) => { const g = FONT[ch]; if (!g) return; for (let p = 0; p < 15; p++) if (g[p] === '1') { const X = i * 4 + (p % 3) + 1, Y = Math.floor(p / 3) + 1; if (pass) x.fillRect(X, Y, 1, 1); else x.fillRect(X - 1, Y - 1, 3, 3); } });
  }
  txtCache.set(key, c); return c;
}
function text(ctx, s, x, y, col = '#f4f4f4', sc = 1, align = 'l') {
  if (TXTLOG) TXTLOG.push(String(s));   // 1.9.1 headless test hook (off = one null check)
  const c = textImg(s, col), w = c.width * sc; const X = align === 'c' ? x - w / 2 : align === 'r' ? x - w : x;
  ctx.drawImage(c, Math.round(X), Math.round(y), w, c.height * sc);
  if (HUDLOG && INHUD) HUDLOG.push({ k: 'txt', s: String(s), x: Math.round(X) + HUDO.x, y: Math.round(y) + HUDO.y, w, h: c.height * sc });   // 1.9.2 test hook
}

/* ---------------- data: weapons, affixes, skills, unlocks ---------------- */
const BASES = {
  wand: { name: 'Ember Wand', dmg: 12.5, rate: 1.6, range: 150, ex: 1.3, n0: 1, desc: 'Seeking fire bolts that burst on impact' },
  axe:  { name: 'Cleaver', dmg: 23, rate: 0.95, range: 36, ex: 1.3, n0: 1, desc: 'Heavy frontal cleave: a cone in front of you (Twin / Vast widen it, up to a half-circle), big knockback' },   // 1.7.0 cone identity
  bow:  { name: 'Storm Bow', dmg: 9.5, rate: 1.15, range: 200, ex: 1.4, n0: 3, desc: 'Fan of piercing arrows' },
  // 1.1.0
  spear: { name: 'Rift Spear', dmg: 17, rate: 1.2, range: 64, ex: 1.5, n0: 1, desc: 'Long thrust that pierces everything in a line' },
  xbow:  { name: 'Bolt Thrower', dmg: 11.5, rate: 0.9, range: 190, ex: 1.1, n0: 3, desc: 'Three-bolt burst into one target: best against bosses' },
  flail: { name: 'Chain Flail', dmg: 17, rate: 0.8, range: 46, ex: 1.4, n0: 1, desc: 'Spins a full ring around you with outward knockback' },
};
const MELEE = { axe: 1, spear: 1, flail: 1 };
const FLAIL2 = { twin: 0.6 };   // 1.13.2 Matt: flail Twin follow-up spins hit for 60% (was 100%)
const PROJB = { wand: 1, bow: 1, xbow: 1, chakram: 1, darts: 1 };   // 1.13.2: projectile bases (fork / ricochet only roll here)
const FORK = { n: 2, a: 0.55, mul: 0.55, life: 0.45, gen: 1 }, RICO = { r: 90, mul: 0.75, max: 2 }, SEC = { procX: 2 };   // 1.13.2 forking / ricochet; secondary hits roll status x2   // range scales with area
const AXE7 = { half: 0.62, twin: 0.2, area: 0.35, max: Math.PI / 2, gap: 0.1, kb: 110, hug: 3 };   // 1.7.0 axe cone: half-angle 0.72 rad (~83 deg cone) + 0.26 per Twin + 0.35 x (area-1), capped at a half-circle; Twin also adds follow-up chops 0.1s apart
const axeHalf = S => Math.min(AXE7.max, AXE7.half + AXE7.twin * S.proj + AXE7.area * Math.max(0, S.area - 1) + (S.graveAxe || 0));
const AFX = {
  dmg:   { p: 1, name: 'Brutal', t: [[10, 18], [18, 30], [30, 45], [42, 62], [56, 82]], fmt: v => `+${v}% damage` },
  aspd:  { p: 1, name: 'Swift', t: [[8, 14], [14, 22], [22, 32], [30, 42], [38, 54]], fmt: v => `+${v}% attack speed` },
  area:  { p: 1, name: 'Vast', t: [[12, 20], [20, 32], [32, 50], [44, 66], [56, 84]], fmt: v => `+${v}% area` },
  crit:  { p: 1, name: 'Keen', t: [[5, 8], [8, 12], [12, 18], [16, 23], [20, 28]], fmt: v => `+${v}% crit chance` },
  proj:  { p: 1, name: 'Twin', t: [[1, 1], [1, 1], [1, 2], [1, 2], [2, 2]], fmt: v => `+${v} projectile${v > 1 ? 's' : ''} / swing` },
  burn:  { p: 0, name: 'of Embers', t: [[15, 22], [22, 30], [30, 40], [38, 50], [46, 60]], fmt: v => `${v}% on hit: ignite` },
  chain: { p: 0, name: 'of Storms', t: [[8, 12], [12, 18], [18, 25], [24, 32], [30, 40]], fmt: v => `${v}% on hit: chain lightning` },
  leech: { p: 0, name: 'of the Leech', t: [[2, 3], [3, 5], [5, 7], [5, 8], [6, 8]], fmt: v => `${v}% life steal` },
  echo:  { p: 0, name: 'of Echoes', t: [[4, 6], [6, 9], [9, 12], [12, 16], [15, 20]], fmt: v => `hits cut ability cooldowns ${(v / 100).toFixed(2)}s` },
  frost: { p: 0, name: 'of Frost', t: [[12, 18], [18, 25], [25, 35], [32, 44], [40, 54]], fmt: v => `${v}% on hit: chill` },
  // 1.1.0: w = weapons may roll it too, arm = armour only
  elite: { p: 1, name: "Slayer's", t: [[10, 16], [16, 24], [24, 34], [32, 44], [40, 56]], fmt: v => `+${v}% damage to elites, mini-bosses + bosses (Wardens too)` },
  exec:  { p: 0, name: 'of Execution', t: [[15, 25], [25, 35], [35, 50], [45, 65], [55, 80]], fmt: v => `+${v}% damage to foes below 30% HP` },
  stun:  { p: 0, name: 'of Thunder', t: [[5, 8], [8, 12], [12, 16], [15, 20], [18, 24]], fmt: v => `${v}% on hit: stun 0.4s` },
  spd:   { p: 1, arm: 1, name: 'Fleet', t: [[10, 16], [16, 24], [24, 32], [30, 40], [36, 48]], fmt: v => `+${v}% move speed` },
  greed: { p: 0, arm: 1, name: 'of Greed', t: [[20, 30], [30, 45], [45, 60], [60, 80], [75, 100]], fmt: v => `+${v}% gold from coins` },
  thorns:{ p: 0, arm: 1, name: 'of Thorns', t: [[50, 80], [80, 120], [120, 170], [160, 230], [200, 290]], fmt: v => `melee attackers take ${v}% weapon dmg` },
};
/* 1.10.0 content depth II: + 2 weapon bases, + 6 affixes (v110 = new in 1.10; the __phLegacy suites never roll them) */
Object.assign(BASES, {
  chakram: { name: 'Moon Chakram', dmg: 14.5, rate: 0.85, range: 120, ex: 1.6, n0: 1, v110: 1, desc: 'Returning blade: flies out, curves back to you and cuts everything both ways (it hits shields from behind on the way back)' },
  darts:   { name: 'Blight Darts', dmg: 7.5, rate: 2.3, range: 150, ex: 1.2, n0: 2, v110: 1, desc: 'Quick twin darts; every hit envenoms the foe (stacking poison, up to 5)' },
});
Object.assign(AFX, {
  cruel:  { p: 1, v110: 1, name: 'Cruel', t: [[10, 16], [16, 24], [24, 34], [32, 44], [40, 56]], fmt: v => `+${v}% damage to afflicted foes (burning, chilled, frozen or envenomed)` },
  reach:  { p: 1, v110: 1, name: 'Far-Reaching', t: [[6, 10], [10, 15], [15, 20], [18, 25], [22, 30]], fmt: v => `+${v}% attack range` },
  venom:  { p: 0, v110: 1, name: 'of Venom', t: [[10, 15], [15, 22], [22, 30], [28, 38], [34, 46]], fmt: v => `${v}% on hit: envenom (stacking poison)` },
  sturdy: { p: 1, arm: 1, v110: 1, name: 'Sturdy', t: [[20, 30], [30, 45], [45, 65], [60, 85], [75, 110]], fmt: v => `+${v} max HP` },
  warded: { p: 1, arm: 1, v110: 1, name: 'Warded', t: [[20, 30], [30, 42], [42, 56], [52, 68], [62, 80]], fmt: v => `-${v}% damage from enemy projectiles` },
  antid:  { p: 0, arm: 1, v110: 1, name: 'of the Antidote', t: [[30, 45], [45, 60], [60, 80], [75, 100], [90, 120]], fmt: v => `-${v}% poison damage taken` },
});
Object.assign(AFX, {   // 1.13.2 projectile suffixes (weapons with a projectile base only; never on the legacy suites)
  fork: { p: 0, v110: 1, pj: 1, name: 'of Forking', t: [[12, 18], [18, 26], [26, 35], [33, 44], [40, 52]], fmt: v => `${v}% on projectile hit: forks into 2 shards (55% dmg, double status chance)` },
  rico: { p: 0, v110: 1, pj: 1, name: 'of Ricochet', t: [[15, 22], [22, 30], [30, 40], [38, 50], [45, 60]], fmt: v => `${v}% on projectile hit: bounces to a new foe (75% dmg, up to 2 bounces, double status chance)` },
});
const v110ok = o => !(o && o.v110 && window.__phLegacy);
/* 1.1.0 uniques: fixed name, base and affixes (rolled at the top of the drop's tier band) + one special effect. Drops only: Wardens 35%, wave-10+ Colossus 10%, wave-8+ mini-bosses 4%, wave-15+ elites 0.4%. */
const UNIQ = {
  widow:  { name: 'Widowmaker', slot: 'weapon', base: 'xbow', afx: ['elite', 'crit'], d: 'Bursts fire 5 bolts instead of 3' },
  pin:    { name: "Grandma's Rolling Pin", slot: 'weapon', base: 'flail', afx: ['dmg', 'area', 'aspd', 'stun'], d: 'Double knockback, and every hit chills' },
  ouro:   { name: 'Ouroboros Loop', slot: 'ring', afx: ['echo', 'crit', 'dmg'], d: '-15% ability cooldowns, but -20 max HP' },
  regret: { name: "Mason's Regret", slot: 'boots', afx: ['spd', 'aspd', 'thorns'], d: 'Walk straight through raised walls' },
  sun:    { name: 'Pocket Sun', slot: 'amulet', afx: ['burn', 'area', 'dmg'], d: 'Every 5s a fire ring bursts around you (150% weapon dmg, ignites)' },
  // 1.7.0: 12 set pieces (5 sets). Their own line is the set; the bonus needs 2-3 pieces worn (SETS)
  ashhelm:  { name: 'Ashen Visor', slot: 'helmet', afx: ['spd', 'thorns'], set: 'ashen', d: 'Ashen Vanguard set piece' },
  ashchest: { name: 'Ashen Hauberk', slot: 'chest', afx: ['thorns', 'greed'], set: 'ashen', d: 'Ashen Vanguard set piece' },
  ashpants: { name: 'Ashen Greaves', slot: 'pants', afx: ['spd', 'thorns'], set: 'ashen', d: 'Ashen Vanguard set piece' },
  stormrod: { name: 'Stormcaller Rod', slot: 'weapon', base: 'wand', afx: ['dmg', 'chain', 'aspd'], set: 'storm', d: 'Stormcaller set piece' },
  stormeye: { name: 'Eye of the Storm', slot: 'amulet', afx: ['chain', 'crit'], set: 'storm', d: 'Stormcaller set piece' },
  stormgrip:{ name: 'Static Grips', slot: 'gloves', afx: ['aspd', 'chain'], set: 'storm', d: 'Stormcaller set piece' },
  huntbow:  { name: "Huntsman's Recurve", slot: 'weapon', base: 'bow', afx: ['crit', 'dmg', 'elite'], set: 'hunt', d: "Huntsman's Pair set piece" },
  hunthood: { name: "Huntsman's Hood", slot: 'helmet', afx: ['crit', 'spd'], set: 'hunt', d: "Huntsman's Pair set piece" },
  graveaxe: { name: 'Gravecleaver', slot: 'weapon', base: 'axe', afx: ['dmg', 'area', 'leech'], set: 'grave', d: 'Gravewarden set piece' },
  gravebelt:{ name: 'Ossuary Girdle', slot: 'belt', afx: ['leech', 'thorns'], set: 'grave', d: 'Gravewarden set piece' },
  rimering: { name: 'Rime Band', slot: 'ring', afx: ['frost', 'crit'], set: 'rime', d: 'Rimebound set piece' },
  rimeboot: { name: 'Glacier Treads', slot: 'boots', afx: ['spd', 'frost'], set: 'rime', d: 'Rimebound set piece' },
};
/* 1.13.2 UNIQUES II (Matt: "bland, only seen 4-5"): 17 new uniques, each with a rule / behaviour, not just numbers. Hooks: stats() (rules), hit() (on-hit),
   kill() (on-death), projSplit() (fork / ricochet), flailRing / axeChop (weapon patterns), hurt() (on-hit-taken), the update loop (stride / gem counters). */
Object.assign(UNIQ, {
  hydra:   { v1132: 1, name: "Hydra's Tongue", slot: 'weapon', base: 'darts', afx: ['venom', 'aspd', 'cruel'], d: 'Every dart forks into 2 shards on hit; shards add 2 poison stacks' },
  gallows: { v1132: 1, name: 'Gallows Recurve', slot: 'weapon', base: 'bow', afx: ['crit', 'dmg', 'reach'], d: 'Arrows always ricochet (2 bounces), each bounce hits 15% HARDER' },
  ember:   { v1132: 1, name: 'Emberheart Scepter', slot: 'weapon', base: 'wand', afx: ['burn', 'dmg', 'area'], d: 'Burning foes explode on death (60% weapon dmg) and ignite the crowd' },
  tide:    { v1132: 1, name: 'Tidecutter', slot: 'weapon', base: 'chakram', afx: ['frost', 'aspd', 'area'], d: 'The chakram chills everything it cuts; chilled / frozen foes take +40% from it' },
  bonesaw: { v1132: 1, name: 'Bonesaw', slot: 'weapon', base: 'axe', afx: ['dmg', 'leech', 'aspd'], d: 'Every 3rd chop is a full 360° whirl' },
  comet:   { v1132: 1, name: 'Comet Pike', slot: 'weapon', base: 'spear', afx: ['exec', 'crit', 'reach'], d: 'Every thrust also launches a piercing comet down the line (80% dmg, 2x range)' },
  heart:   { v1132: 1, name: 'Heartseeker', slot: 'weapon', base: 'xbow', afx: ['elite', 'dmg', 'aspd'], d: 'Hits on foes above 80% HP always crit' },
  mill:    { v1132: 1, name: 'Millstone', slot: 'weapon', base: 'flail', afx: ['dmg', 'stun', 'area'], d: 'Spins PULL foes in instead of pushing; every 4th spin quakes (freeze 0.5s)' },
  vamp:    { v1132: 1, name: 'Crown of the Thirsting', slot: 'helmet', afx: ['leech', 'crit'], d: 'Every crit heals 1% max HP' },
  mirror:  { v1132: 1, name: 'Mirrorplate', slot: 'chest', afx: ['warded', 'sturdy'], d: '25% of enemy projectiles that hit you are reflected at a foe (200% weapon dmg, no damage to you)' },
  stride:  { v1132: 1, name: 'Stormstride Boots', slot: 'boots', afx: ['spd', 'chain'], d: 'Every 70 px you walk, lightning strikes the nearest foe (120% weapon dmg + chain)' },
  plague:  { v1132: 1, name: 'Plague Wraps', slot: 'gloves', afx: ['venom', 'aspd'], d: 'Envenomed foes pass their poison (half the stacks, min 2) to 2 neighbours when they die' },
  lode:    { v1132: 1, name: 'Lodestone Band', slot: 'ring', afx: ['greed', 'crit'], d: 'Pickup radius x2.5; every 25 gems releases a ring of 10 shards (100% weapon dmg)' },
  thornh:  { v1132: 1, name: 'Thornheart', slot: 'amulet', afx: ['thorns', 'sturdy'], d: 'When hit, burst 8 thorns around you (100% weapon dmg, 1s cooldown)' },
  glass:   { v1132: 1, name: 'Glass Sun', slot: 'amulet', afx: ['crit', 'dmg'], d: 'RULE: +60% damage and crits ignite, but you take +30% damage' },
  oath:    { v1132: 1, name: 'Oathbreaker Girdle', slot: 'belt', afx: ['spd', 'sturdy'], d: 'Your movement ability leaves a fire nova where you start (150% weapon dmg, ignites)' },
  twinmoon:{ v1132: 1, name: 'Sigil of Twin Moons', slot: 'ring', afx: ['proj', 'echo'], d: 'RULE: +1 projectile / swing, but ability cooldowns +20%' },
});
/* 1.7.0 SETS: unique pieces that share a `set` id. Bonuses stack by pieces worn (2 and 3). Applied in stats() (+ attack() for Storm 3pc, hit() for Rime 2pc). */
const SETS = {
  ashen: { name: 'Ashen Vanguard', n: 3, b: { 2: '+40 max HP, -8% damage taken', 3: 'below 50% HP: -15% damage taken; melee attackers take 150% weapon dmg' } },
  storm: { name: 'Stormcaller', n: 3, b: { 2: '+15% chain lightning chance', 3: 'every 4th attack calls lightning on the target: 250% weapon dmg + chain' } },
  hunt:  { name: "Huntsman's Pair", n: 2, b: { 2: '+20% attack speed, +10% move, +10% crit on far targets' } },
  grave: { name: 'Gravewarden', n: 2, b: { 2: 'kills heal 0.6 HP; Cleaver cone +20 degrees, +15% damage' } },
  rime:  { name: 'Rimebound', n: 2, b: { 2: '+20% chill chance; chilled foes take +15% damage' } },
};
const setCount = (g, id) => SLOTS.reduce((n, k) => n + (g[k] && g[k].uq && UNIQ[g[k].uq] && UNIQ[g[k].uq].set === id ? 1 : 0), 0);
function setLine(w, g) { const U = w && w.uq && UNIQ[w.uq]; if (!U || !U.set) return ''; const S = SETS[U.set], have = g ? setCount(g, U.set) : 0, parts = Object.keys(UNIQ).filter(k => UNIQ[k].set === U.set).map(k => UNIQ[k].name);
  return `<li class="set">SET ${S.name} (${have}/${S.n}): ${parts.join(' + ')}</li>` + Object.keys(S.b).map(n => `<li class="set${have >= +n ? ' on' : ''}">${n}pc: ${S.b[n]}</li>`).join(''); }

/* 0.9.0 late loot: tier bands keep climbing past wave 10. T1 w1-4, T2 w5-9, T3 w10-19, T4 'Exalted' w20-39, T5 'Mythic' w40+.
   Weapon power also bends upward after wave 20 (+0.004 x (w-20)^2) so it keeps pace with the quadratic monster HP curve. */
const tierOf = w => w >= 40 ? 4 : w >= 20 ? 3 : w >= 10 ? 2 : w >= 5 ? 1 : 0;
const TIER_TAG = ['', '', '', 'Exalted', 'Mythic'];
const itemPow = w => +(1 + 0.1 * (w - 1) + 0.004 * Math.max(0, w - 20) ** 2).toFixed(3);
const RARE1 = ['Grim', 'Dusk', 'Ash', 'Blood', 'Storm', 'Hollow', 'Bone', 'Ember', 'Rune', 'Wraith', 'Gloom', 'Iron'];
const RARE2 = ['Bite', 'Song', 'Fang', 'Brand', 'Whisper', 'Reaver', 'Spire', 'Call', 'Thorn', 'Mark', 'Howl', 'Edge'];
const SKILLS = [   // 1.1.0: 5 columns x 4 rows, 15 nodes (8 from 0.1-1.0 keep their ids + ranks)
  { id: 'vit', name: 'Vitality', ico: '♥', max: 5, req: null, col: 2, row: 0, d: r => `+${12 * r} max HP`, per: '+12 max HP per rank' },
  { id: 'might', name: 'Might', ico: '⚔', max: 5, req: 'vit', col: 1, row: 1, d: r => `+${8 * r}% damage`, per: '+8% damage per rank' },
  { id: 'haste', name: 'Haste', ico: '»', max: 5, req: 'vit', col: 2, row: 1, d: r => `+${7 * r}% attack speed`, per: '+7% attack speed per rank' },
  { id: 'arcana', name: 'Arcana', ico: '✦', max: 4, req: 'vit', col: 3, row: 1, d: r => `-${8 * r}% ability cooldowns`, per: '-8% cooldown on both hero abilities per rank' },
  { id: 'keen', name: 'Executioner', ico: '✖', max: 5, req: 'might', col: 1, row: 2, d: r => `+${4 * r}% crit chance, crits x${(2 + 0.1 * r).toFixed(1)}`, per: '+4% crit chance and +10% crit damage per rank. Stacks with Keen weapons.' },
  { id: 'fleet', name: 'Fleetfoot', ico: '➶', max: 3, req: 'haste', col: 2, row: 2, d: r => `+${6 * r}% move speed, +${20 * r}% pickup range`, per: '+6% move speed and +20% gem pickup range per rank' },
  { id: 'nova', name: 'Frostbinder', ico: '❄', max: 3, req: 'arcana', col: 3, row: 2, d: r => `Big ability +${15 * r}% radius, freeze +${(0.3 * r).toFixed(1)}s, quick ability +${25 * r}% dmg`, per: 'Bigger big ability (Nova / Inferno / Arrow Rain / Bone Ward), longer Nova freeze, harder-hitting quick ability (Dash / Meteor / Charge)' },
  { id: 'scav', name: 'Scavenger', ico: '✚', max: 3, req: 'fleet', col: 2, row: 3, d: r => `+${25 * r}% weapon drops, better rarity`, per: 'More weapon drops and more Magic/Rare rolls' },
  // 1.1.0 pattern amplifiers (no flat global damage)
  { id: 'blood', name: 'Bloodlust', ico: '♦', max: 3, req: 'might', col: 0, row: 1, d: r => `each kill heals ${(0.35 * r).toFixed(2)} HP`, per: 'Every kill heals you a little (+0.35 HP per rank). Hordes keep you topped up' },
  { id: 'gasp', name: 'Last Gasp', ico: '☼', max: 3, req: 'vit', col: 4, row: 1, d: r => `below 35% HP: +${10 * r}% move speed; hearts heal +${40 * r}%`, per: 'Run faster when you are low, and heart drops heal more' },
  { id: 'splinter', name: 'Splinter', ico: '✷', max: 3, req: 'keen', col: 0, row: 2, d: r => `crits splash ${15 * r}% to up to 3 foes nearby`, per: 'Crit builds: every crit throws shards into up to 3 enemies within 20px' },
  { id: 'catal', name: 'Catalyst', ico: '◈', max: 3, req: 'nova', col: 4, row: 2, d: r => `ignite / chill / chain chance x${(1 + 0.2 * r).toFixed(1)}`, per: '+20% (relative) chance per rank for every on-hit effect: Embers, Frost, Storms affixes and Kindling' },
  { id: 'momentum', name: 'Momentum', ico: '⇉', max: 3, req: 'haste', col: 1, row: 3, d: r => `quick ability: +${10 * r}% attack speed for 3s`, per: 'Weave your quick ability (Dash / Meteor / Roll / Charge) between attacks' },
  { id: 'midas', name: 'Midas', ico: '$', max: 3, req: 'scav', col: 3, row: 3, d: r => `+${10 * r}% gold from coins`, per: 'More gold from every coin: feeds the Market, Portal and village' },
  { id: 'pack', name: 'Packrat', ico: '▣', max: 2, req: 'midas', col: 4, row: 3, d: r => `bag holds ${BAG_MAX + r} items`, per: '+1 backpack slot per rank' },
];
const SK = Object.fromEntries(SKILLS.map(s => [s.id, s]));
/* 0.3.0 heroes: ability kits live on the hero (weapons only change the auto-attack) */
const HEROES = {
  wanderer: { name: 'Wanderer', d: 'Balanced drifter. Dash in, freeze the crowd.',
    a1: { id: 'dash', name: 'DASH', cd: 5, ico: 'dashI', d: 'Dash through enemies (invulnerable), shockwave at the end' },
    a2: { id: 'nova', name: 'NOVA', cd: 12, ico: 'novaI', d: 'Frost blast for 3x damage: freezes, knocks back, deletes bones' },
    pas: { name: 'Drifter', d: '+20% gem / coin pickup range' }, p: { pick: 0.2 } },
  pyro: { name: 'Pyromancer', d: 'Glass cannon. Everything burns.',
    a1: { id: 'meteor', name: 'METEOR', cd: 6, ico: 'meteorI', d: 'Meteor hits the nearest enemy area after 0.45s for 4x damage and ignites' },
    a2: { id: 'inferno', name: 'INFERNO', cd: 14, ico: 'infernoI', d: '4s fire aura: burns and ignites everything close to you' },
    pas: { name: 'Kindling', d: '+15% ignite chance on every hit, ignites burn 50% hotter' }, p: { burn: 0.15, burnX: 1.5 },
    gate: { base: 150, get cost() { return Math.round(this.base * ECON.heroX); }, need: 'Reach wave 10', ok: s => s.best.wave >= 10, prog: s => `wave ${Math.min(s.best.wave, 10)}/10` } },
  ranger: { name: 'Ranger', d: 'Kiter. Long range, fast feet, arrow storms.',
    a1: { id: 'roll', name: 'ROLL', cd: 4, ico: 'rollI', d: 'Long evasive roll (invulnerable), then 2.5s of +60% attack speed' },
    a2: { id: 'rain', name: 'RAIN', cd: 12, ico: 'rainI', d: '2s arrow rain on the nearest pack: many small hits that chill' },
    pas: { name: 'Eagle Eye', d: '+25% attack range, +6% crit, +8% move speed' }, p: { range: 1.25, crit: 0.06, move: 1.08 },
    gate: { base: 200, get cost() { return Math.round(this.base * ECON.heroX); }, need: 'Slay 1,500 monsters (total)', ok: s => s.totalKills >= 1500, prog: s => `${Math.min(s.totalKills, 1500)}/1500 kills` } },
  knight: { name: 'Bone Knight', d: 'Tank. Charge in and soak hits.',
    a1: { id: 'charge', name: 'CHARGE', cd: 6, ico: 'chargeI', d: 'Shield charge: 3x damage, heavy knockback, stuns' },
    a2: { id: 'ward', name: 'WARD', cd: 15, ico: 'wardI', d: '5s of 4 orbiting bone shields: hit enemies, eat bones, -40% damage taken' },
    pas: { name: 'Bulwark', d: '+40 max HP, -12% damage taken, -8% move speed' }, p: { hp: 40, dr: 0.12, move: 0.92 },
    gate: { base: 250, get cost() { return Math.round(this.base * ECON.heroX); }, need: 'Defeat 2 bosses (total)', ok: s => s.bossKills >= 2, prog: s => `${Math.min(s.bossKills, 2)}/2 bosses` } },
};
const HERO_IDS = Object.keys(HEROES);
/* 0.7.0 per-hero skill trees. Points = hero levels: every XP you earn while playing a hero also feeds that hero's own level (curve hneed = 2x the shared curve).
   Layout: col 0 = quick ability, col 1 = big ability, col 2 = passive. Row 0 = base node, row 1 = capstone (needs 2 ranks in the node above). */
const HTREE = {
  wanderer: [
    { id: 'w_stride', name: 'Long Stride', ico: '»', max: 3, col: 0, row: 0, d: r => `DASH travels +${20 * r}% farther, end shockwave +${15 * r}% radius`, per: 'Longer dash and a wider landing shockwave per rank' },
    { id: 'w_rime', name: 'Rime Step', ico: '❆', max: 1, req: 'w_stride', col: 0, row: 1, d: () => 'DASH landing shockwave freezes enemies 0.8s', per: 'Your dash landing freezes everything it hits (bosses 0.3s)' },
    { id: 'w_deep', name: 'Deep Freeze', ico: '❄', max: 3, col: 1, row: 0, d: r => `NOVA freeze +${(0.3 * r).toFixed(1)}s; frozen foes take +${12 * r}% damage`, per: 'Longer freeze, and anything frozen shatters for bonus damage from every hit' },
    { id: 'w_after', name: 'Aftershock', ico: '◎', max: 1, req: 'w_deep', col: 1, row: 1, d: () => 'NOVA pulses again 0.6s later (70% size, 50% dmg)', per: 'A second, smaller Nova follows the first' },
    { id: 'w_wind', name: "Wayfarer's Wind", ico: '✧', max: 3, col: 2, row: 0, d: r => `each XP gem cuts DASH cooldown ${(0.04 * r).toFixed(2)}s`, per: 'Collecting gems recharges your dash. Pairs with Drifter pickup range' },
    // 1.1.0
    { id: 'w_echo', name: 'Echo Step', ico: '◌', max: 2, req: 'w_rime', reqR: 1, col: 0, row: 2, d: r => `DASH start point detonates 0.5s later: ${100 * r}% weapon dmg`, per: 'Leave an afterimage that blows up where you dashed from' },
    { id: 'w_glacier', name: 'Glacier', ico: '❅', max: 2, req: 'w_after', reqR: 1, col: 1, row: 2, d: r => `NOVA leaves a 3s ice field: chills, ${25 * r}% weapon dmg / 0.5s`, per: 'Your Nova freezes the ground for 3 seconds' },
    { id: 'w_siphon', name: 'Siphon', ico: '✙', max: 3, req: 'w_wind', col: 2, row: 1, d: r => `each XP gem heals ${(0.25 * r).toFixed(2)} HP`, per: 'Gems heal you. Pairs with Drifter pickup range' },
    { id: 'w_gale', name: 'Gale Pull', ico: '@', max: 1, req: 'w_siphon', col: 2, row: 2, d: () => 'every 8s a gust pulls every gem + coin on screen to you', per: 'Never miss loot while you kite' },
  ],
  pyro: [
    { id: 'p_rock', name: 'Big Rock', ico: '●', max: 3, col: 0, row: 0, d: r => `METEOR +${15 * r}% radius, +${10 * r}% damage`, per: 'A bigger, harder meteor per rank' },
    { id: 'p_shower', name: 'Meteor Shower', ico: '☄', max: 2, req: 'p_rock', col: 0, row: 1, d: r => `METEOR calls ${r} extra small meteor${r > 1 ? 's' : ''} on other foes (50% dmg)`, per: '+1 follow-up meteor per rank, aimed at other nearby enemies' },
    { id: 'p_walk', name: 'Firewalk', ico: '♨', max: 3, col: 1, row: 0, d: r => `INFERNO lasts +${r}s, +${8 * r}% radius`, per: 'Longer, wider fire aura per rank' },
    { id: 'p_heat', name: 'Heat Shield', ico: '⛨', max: 1, req: 'p_walk', col: 1, row: 1, d: () => 'during INFERNO: -25% damage taken, enemy shots burn up in the aura', per: 'Inferno becomes a defensive bubble too' },
    { id: 'p_wild', name: 'Wildfire', ico: '✺', max: 3, col: 2, row: 0, d: r => `burning foes burst on death, igniting foes within ${16 + 8 * r}px`, per: 'Ignites spread corpse to corpse. Feeds on Kindling and Embers affixes' },
    // 1.1.0
    { id: 'p_crater', name: 'Crater', ico: '◍', max: 2, req: 'p_shower', reqR: 1, col: 0, row: 2, d: r => `METEOR leaves a 3s burning crater: ${30 * r}% weapon dmg / 0.5s`, per: 'Molten ground where your meteor lands' },
    { id: 'p_nova', name: 'Supernova', ico: '✹', max: 1, req: 'p_heat', reqR: 1, col: 1, row: 2, d: () => 'INFERNO ends in a blast: 300% weapon dmg + ignite', per: 'Your fire aura goes out with a bang' },
    { id: 'p_fuel', name: 'Hot Coals', ico: '▲', max: 3, req: 'p_wild', col: 2, row: 1, d: r => `ignites burn +${15 * r}% hotter`, per: 'More ignite damage. Stacks with Kindling' },
    { id: 'p_phoenix', name: 'Phoenix', ico: '♆', max: 1, req: 'p_fuel', col: 2, row: 2, d: () => 'killing a burning foe cuts METEOR cooldown 0.15s', per: 'Keep the fires going and the meteors keep coming' },
  ],
  ranger: [
    { id: 'r_quick', name: 'Quickdraw', ico: '➹', max: 3, col: 0, row: 0, d: r => `ROLL attack-speed window ${2.5 + r}s (was 2.5s)`, per: '+1s of post-roll +60% attack speed per rank' },
    { id: 'r_calt', name: 'Caltrops', ico: '✱', max: 2, req: 'r_quick', col: 0, row: 1, d: r => `ROLL drops caltrops for 3s: chill + ${40 * r}% weapon dmg / 0.3s`, per: 'Roll away and leave a spiky patch behind you' },
    { id: 'r_volley', name: 'Volley', ico: '⇣', max: 3, col: 1, row: 0, d: r => `RAIN lasts +${(0.5 * r).toFixed(1)}s, +${10 * r}% radius`, per: 'Longer, wider arrow rain per rank' },
    { id: 'r_pin', name: 'Pinning Rain', ico: '⚲', max: 1, req: 'r_volley', col: 1, row: 1, d: () => 'RAIN hits pin foes in place (0.35s, not bosses)', per: 'Arrow rain roots what it hits, on top of the chill' },
    { id: 'r_dead', name: 'Deadeye', ico: '◉', max: 3, col: 2, row: 0, d: r => `+${8 * r}% crit chance on foes beyond 60% of your range`, per: 'Rewards kiting at max range. Stacks with Eagle Eye range' },
    // 1.1.0
    { id: 'r_vanish', name: 'Vanish', ico: '◐', max: 2, req: 'r_calt', reqR: 1, col: 0, row: 2, d: r => `ROLL +${(0.25 * r).toFixed(2)}s invulnerable; cancels aims, charges + walls being raised within 90px`, per: 'Roll breaks enemy wind-ups around you' },
    { id: 'r_hail', name: 'Hailstorm', ico: '⁘', max: 2, req: 'r_pin', reqR: 1, col: 1, row: 2, d: r => `RAIN also hits a 2nd pack (${50 * r}% duration, 70% size)`, per: 'A second arrow rain on the next pack' },
    { id: 'r_mark', name: 'Marksman', ico: '⊕', max: 3, req: 'r_dead', col: 2, row: 1, d: r => `+${8 * r}% damage to elites, bosses + mini-bosses`, per: 'Priority targets go down faster' },
    { id: 'r_tail', name: 'Tailwind', ico: '≫', max: 1, req: 'r_mark', col: 2, row: 2, d: () => '+15% attack speed while moving', per: 'Rewards never standing still' },
  ],
  knight: [
    { id: 'k_ram', name: 'Battering Ram', ico: '⛊', max: 3, col: 0, row: 0, d: r => `CHARGE +${15 * r}% damage, stun +${(0.25 * r).toFixed(2)}s`, per: 'Harder hits and longer stuns per rank' },
    { id: 'k_quake', name: 'Quake', ico: '≋', max: 2, req: 'k_ram', col: 0, row: 1, d: r => `CHARGE impact +${30 * r}% radius and chills 2s`, per: 'The landing shockwave grows and slows the pack' },
    { id: 'k_wall', name: 'Bone Wall', ico: '☗', max: 3, col: 1, row: 0, d: r => `WARD ${4 + r} shields, lasts ${5 + r}s`, per: '+1 orbiting shield and +1s per rank' },
    { id: 'k_spike', name: 'Spiked Ward', ico: '✠', max: 1, req: 'k_wall', col: 1, row: 1, d: () => 'while WARD is up, whatever hits you takes 200% weapon dmg', per: 'Punish anything that gets close' },
    { id: 'k_iron', name: 'Iron Will', ico: '♜', max: 3, col: 2, row: 0, d: r => `below 50% HP: -${8 * r}% damage taken`, per: 'Gets tougher when it matters. Stacks with Bulwark (75% cap)' },
    // 1.1.0
    { id: 'k_rally', name: 'Rally', ico: '✜', max: 2, req: 'k_quake', reqR: 1, col: 0, row: 2, d: r => `CHARGE heals ${3 * r}% max HP per foe hit (max 5)`, per: 'Dive into the pack to heal' },
    { id: 'k_storm', name: 'Bonestorm', ico: '⋇', max: 2, req: 'k_spike', reqR: 1, col: 1, row: 2, d: r => `WARD ends by firing its shields outward: ${100 * r}% weapon dmg, pierce 2`, per: 'Ward finishes with a volley' },
    { id: 'k_thorn', name: 'Thorns', ico: '♣', max: 3, req: 'k_iron', col: 2, row: 1, d: r => `melee attackers take ${50 * r}% weapon dmg`, per: 'Hitting you hurts. Stacks with Thorns gear' },
    { id: 'k_bast', name: 'Bastion', ico: '▤', max: 1, req: 'k_thorn', col: 2, row: 2, d: () => 'standing still 0.6s: -15% damage taken (75% cap)', per: 'Plant your feet' },
  ],
};
const HCOLS = { wanderer: ['DASH', 'NOVA', 'DRIFTER'], pyro: ['METEOR', 'INFERNO', 'KINDLING'], ranger: ['ROLL', 'RAIN', 'EAGLE EYE'], knight: ['CHARGE', 'WARD', 'BULWARK'] };
const HREQ_R = 2;   // capstones need 2 ranks in the node above
const hreqR = n => n.reqR || HREQ_R;   // 1.1.0: row-2 nodes under a 1-rank capstone need 1 rank
const HN = Object.fromEntries(Object.entries(HTREE).flatMap(([h, t]) => t.map(n => [n.id, Object.assign(n, { hero: h })])));
/* 0.3.0 maps */
const MAPS = {
  ash:   { name: 'Ashen Field', g: ['#232a35', '#283040', '#1e2430', '#2b3545'], hp: 1, loot: 1, threat: 1 },
  crypt: { name: 'Bone Crypt', g: ['#2a2234', '#362b42', '#201a29', '#40324d'], hp: 1.35, dmg: 1.25, dens: 1.15, lvl: 3, wd: 1.15, rise: 0.75, loot: 1.4, threat: 2, d: 'Skeleton legions, bone casters, bone hounds, graves that rise and a Bone Lich. Zone threat II: monsters fight 3 waves deeper, +35% HP, +25% damage, +15% horde, graves rise faster. +40% gold and XP' },
  frost: { name: 'Frost Spire', g: ['#34465e', '#3f5470', '#2b3a4f', '#7aa2c4'], hp: 1.6, dmg: 1.45, dens: 1.3, lvl: 7, wd: 1.3, loot: 1.75, spd: 0.92, threat: 3, d: 'Bat swarms, frost wisps, rime golems, frost wolves, slick ice and a Frost Troll. Zone threat III: monsters fight 7 waves deeper, +60% HP, +45% damage, +30% horde, -8% speed. +75% gold and XP' },   // 0.4.0 (0.5.0 cast)
};
/* 1.5.0 zone threat: lvl = waves deeper the monsters scale (HP + damage curve only; spawn casts, gear checks and loot bands keep the real wave), dmg / dens = damage + horde multipliers,
   wd = Warden HP (the 1.4 map HP, so gear checks stay wave-calibrated), rise = Crypt grave interval. Ashen Field is untouched. */
const ZONE_TAG = ['', 'I', 'II', 'III'];
const zoneLine = m => { const M = MAPS[m]; if (!M || (M.threat || 1) < 2) return 'Zone threat I: the base curve'; return `Zone threat ${ZONE_TAG[M.threat]}: monsters ${M.lvl} waves deeper · +${Math.round((M.hp - 1) * 100)}% HP · +${Math.round((M.dmg - 1) * 100)}% dmg · +${Math.round((M.dens - 1) * 100)}% horde · +${Math.round((M.loot - 1) * 100)}% gold/XP`; };
/* village: every new building / tier is a dual gate (gold AND milestone). levels[i] = what level i+1 needs.
   0.3.0: hall, gate L1, wall L1, statue, slayer. 0.4.0: functional tiers (inn, fire, forge, gate L2 -> Frost Spire) + scenic prestige. */
const ECON = { bands: [[100, 20], [250, 50], [600, 150], [5000, 400], [Infinity, 1000]], heroX: 50, xp: 0.5, portalX: 2, extract: true };   // 1.9.3: staged price bands (see econCost)   // 1.11.0: the 1.7.1 deathLose (one random heirloom) is gone: death destroys every UNINSURED item (see INS)
   // 1.7.0: village / homestead costs x1000 (earnings untouched), all XP x0.5, portal use x5, extract-or-lose-it. Read live (one place to retune)
if (window.__phLegacy) Object.assign(ECON, { bands: [[Infinity, 1]], heroX: 1, xp: 1, portalX: 1, extract: false });   // test hook: the pre-1.7 regression suites run on the old economy + keep-on-death
/* 1.9.3 ECONOMY REBALANCE (Matt: "the first upgrades are way too expensive"). The flat 1.7 x1000 is replaced by a multiplier picked by the
   pre-1.7 base price: <= 100 x20 (starter), 101-250 x50 (early), 251-600 x150 (mid), 601-5000 x400 (late), > 5000 x1000 (endgame).
   Earnings, XP, extract / death rules unchanged. Hero recruits x ECON.heroX (were never multiplied), portal use x ECON.portalX (5 -> 2). */
const econX = base => { for (const [max, x] of ECON.bands) if (base <= max) return x; return ECON.bands[ECON.bands.length - 1][1]; };
const econCost = base => Math.round(base * econX(base));
/* 1.14.0 MULTI-RESOURCE (Matt lock 2026-11-04): five tiers. Kills drop them as chips (tier unlocks by wave; low tiers are common), the caravan pays a supply crate + refugees.
   The run haul banks into save.res at run end: everything on an extract / won raid, HALF (floored) on death or abandon. Sinks: Workshop field kits + Portal tiers 5+. Mage trials never pay resources (1.14 lock). */
const RES = { ids: ['wood', 'stone', 'oil', 'jewels', 'people'], deathKeep: 0.5,
  t: { wood: { n: 'WOOD', c: '#ef7d57', tier: 1, w: 1, v: 3 }, stone: { n: 'STONE', c: '#94b0c2', tier: 2, w: 5, v: 2 }, oil: { n: 'OIL', c: '#3b5dc9', tier: 3, w: 12, v: 2 }, jewels: { n: 'JEWELS', c: '#73eff7', tier: 4, w: 20, v: 1 }, people: { n: 'PEOPLE', c: '#a7f070', tier: 5, w: 30, v: 1 } },
  p: { boss: [3, 1], mini: [2, 1], elite: [1, 0.25], foe: [1, 0.012] } };   // [bundles, chance]
/* 1.14.0 WORKSHOP FIELD KITS: crafted in the village from resources, stock up to KIT_MAX each; every owned kit deploys ONE charge at the start of a wave run (not raids). */
const KIT_MAX = 3;
const KITS = {
  stakes:  { n: 'BARRICADE STAKES', d: 'AEGIS for the whole run (-12% damage taken)', cost: { wood: 40, stone: 20 }, buff: ['aegis', Infinity] },
  ward:    { n: 'WARD STONES', d: 'SLOW AURA for the first 2:00', cost: { stone: 30 }, buff: ['slow', 120] },
  oil:     { n: 'OIL FLASKS', d: 'FURY (+20% attack speed) for the first 3:00', cost: { oil: 12, wood: 15 }, buff: ['fury', 180] },
  charm:   { n: 'JEWEL CHARM', d: 'LIFESTEAL for the whole run', cost: { jewels: 6, stone: 10 }, buff: ['leech', Infinity] },
  militia: { n: 'MILITIA', d: '+1 Hearth revive this run', cost: { people: 3, wood: 20 }, life: 1 },
};
/* 1.14.0 MAGE TRIALS: a mage sigil appears (wave 3+, every 55-80 s, 40 s to take it) with a RANDOM difficulty D1-D6 (max D rises with the wave) shown before you commit.
   Step on it -> defend her for 12 + 2D s. Harder = less mage HP, more raiders + more pulses, elites from D3, a SNARE AURA from D4 (inside the big purple ring but outside her ward = SLOWED),
   breakers from D5 (raiders hit her x1.5), no frost pulse at D6. Rewards are gold / XP / buffs only (x0.5 at D1 ... x3 at D6): an extra revive, a run-long aura, or a timed buff. */
const MSN = { from: 3, first: 50, every: [55, 80], life: 40, r: 11, hpX: [1.3, 1.15, 1, 0.85, 0.72, 0.6], needB: 12, needD: 2, rewX: [0.5, 0.8, 1.2, 1.7, 2.3, 3], packX: [0.7, 0.85, 1, 1.15, 1.3, 1.5],
  eliteD: 3, auraD: 4, auraR: 120, breakD: 5, breakX: 1.5, noFrostD: 6, auras: ['slow', 'aegis', 'leech', 'freeze'], col: ['#a7f070', '#38b764', '#ffcd75', '#ef7d57', '#b13e53', '#b55088'] };
/* 1.14.0 PORTAL SKIP LADDER (Matt lock 2026-11-04): tier L deploys into wave PORTAL_W[L]. Buying tier L needs best wave >= PORTAL_W[L] (reach = the right to buy, never an auto-skip)
   + its gold (flat, not econ-banded: tier 1 is ~1000g on purpose) + resources from tier 5 (wave 41) up. */
const PORTAL_T = [[1000, 5], [6000, 11], [25000, 21], [60000, 31], [110000, 41, { stone: 40 }], [180000, 51, { stone: 60, oil: 10 }], [270000, 61, { oil: 25, jewels: 4 }], [380000, 71, { stone: 80, jewels: 8 }], [520000, 81, { jewels: 12, people: 2 }], [700000, 91, { jewels: 16, people: 4 }], [950000, 101, { jewels: 24, people: 6 }]];
const portalLv = (c, W, res) => ({ base: c, cost: c, W, res: res || null, need: `Reach wave ${W}`, ok: s => (s.best && s.best.wave || 0) >= W, prog: s => `best wave ${Math.min((s.best && s.best.wave) || 0, W)}/${W}` });
const gl = (cost, need, ok, prog) => ({ base: cost, get cost() { return disc18(this.fix || econCost(this.base)); }, need, ok, prog });   // 1.18.1: .fix = hand-set price
const nfmt = n => n.toLocaleString('en-US');
const atL = (v, n) => `${nfmt(Math.min(v, n))}/${nfmt(n)}`;
const PORTAL_W = [0, 5, 11, 21, 31, 41, 51, 61, 71, 81, 91, 101];   // 1.14.0 (Matt): 11 deploy bands, cheap first tier (wave 5). Was [0, 21, 31, 41, 61, 81, 101]
const PORTAL_OLD = [0, 21, 31, 41, 61, 81, 101];   // v16 home.portal index -> wave (migrate remaps to the new index of the same wave)   // 0.9.0 Portal Circle drop wave per level (defined up here: migrate() needs it at load). 1.5.0: + 61 / 81 / 101, each one wave past a Gear Check
const KEEP_CAP = window.__phLegacy ? [1, 3, 4] : [3, 6, 9];   // 0.6.0 items kept between runs: camp heirloom / Armory / Artifact Museum. 1.11.0: insured loadout 2/4/6. 1.13.0: = LOADOUT SLOTS 3/6/9 (the Museum takes a full 9-slot kit)
/* ---------------- 1.13.0 EXTRACT REDESIGN (Matt lock "the word", 2026-11-03): LOADOUT SLOTS, no insurance ----------------
   LOADOUT (save.armory, cap KEEP_CAP by Armory tier = loadout slots): the stash pieces you TAKE INTO the next run. Pick them on the STASH screen (or AUTO-KIT).
     At START / CHALLENGE every loadout piece is equipped (no cover fee, no picker). They are NOT protected: carried = at risk.
   DEATH / ABANDON / RAID FAIL: EVERYTHING you carried is lost (loadout pieces + every pickup). The stash and the ★ UNIQUES tab are never touched.
     DEATH AD (once per lost kit): pick ONE lost piece and watch a rewarded ad to put it back in the stash. Premium saves one free (no ad), like its free revive.
   EXTRACT (exit gate / won raid): EVERYTHING is banked. Loadout pieces you still carry go back into the loadout; every other carried piece (+ the gate gift)
     goes to the STASH (cap STASH_CAP by Armory tier, Premium STASH_CAP_P; Premium Uniques -> the endless ★ UNIQUES tab). Over the cap = the weakest are salvaged (25%).
     The smithy pick and raid-issued gear are never banked (re-made every run).
   __phLegacy keeps the 0.6 keep picker (LOAD.on = false). */
const LOAD = { on: !window.__phLegacy, salvage: 0.25, saveOne: true, premFree: true };
const STASH_CAP = [12, 24, 40];   // camp / Armory / Artifact Museum
const STASH_CAP_P = [24, 48, 80];   // 1.11.1: PREMIUM stash (x2); Uniques go to the endless ★ UNIQUES tab on top (save.uniq)
function premOf(s) { return !!((s && s.premium === true) || window.__phPremium); }
const armTier = (s = save) => (s && s.home && s.home.armory) || 0;
const stashCap = (s = save) => (premOf(s) ? STASH_CAP_P : STASH_CAP)[armTier(s)];   // 1.11.1: Premium = bigger stash

/* 1.4.0 RAIDS: a separate trophy ladder of staged bosses (defined up here: migrate() + VILLAGE / UNLOCKS gates need it at load).
   Each boss: band W (enemy scaling as if at that wave), fixed HP (~50-75s of a raid-kit's DPS), phases at HP thresholds, an attack rotation per phase.
   gate = every line must be met (dual gate: the prior trophy + a progress milestone). Numbers + rationale: DECISIONS.md § 1.4.0 implementation choices. */
const RAID_IDS = ['ashmaw', 'morthal', 'glacia', 'vael', 'morr'];
const raidRec = (s, id) => (s && s.raids && s.raids[id]) || { kills: 0, firstAt: 0, best: 0, tries: 0 };
const raidKills = (s, id) => raidRec(s, id).kills | 0;
const raidTotal = s => RAID_IDS.filter(id => raidKills(s, id) > 0).length;   // trophies (distinct bosses slain)
const rgate = (need, ok, prog) => ({ need, ok, prog });
const rTrophy = id => rgate(`${RAID_NAME[id]} trophy`, s => raidKills(s, id) > 0, s => raidKills(s, id) ? 'slain' : 'not yet');
const RAID_NAME = { ashmaw: 'Ashmaw', morthal: 'Morthal', glacia: 'Glacia', vael: 'Vael', morr: 'Morrghast' };
const RAIDS = [
  { id: 'ashmaw', name: 'ASHMAW', title: 'THE CINDER KING', arena: 'CINDER THRONE', map: 'ash', W: 14, hp: 8000, col: '#ef7d57', spr: 'rb_ashmaw', sc: 2.2, r: 15, spd: 22, keep: 0, ico: 'rt_ashmaw',
    g: ['#2a1c1c', '#33201e', '#231716', '#4a2a1e'],
    d: 'A magma tyrant. Get out of falling embers, stand on cooled stone when the magma tide rolls in, then break his imp guard.',
    gate: [rgate('Defeat 3 bosses (Colossus / Warden)', s => s.bossKills >= 3, s => atL(s.bossKills, 3)), rgate('Reach wave 12', s => s.best.wave >= 12, s => `wave ${Math.min(s.best.wave, 12)}/12`)],
    phases: [
      { at: 1, name: 'EMBER RAIN', cue: 'ORANGE CIRCLES: GET OUT', rot: ['pools', 'fan', 'pools', 'slam'], gap: 1.5 },
      { at: 0.66, name: 'MAGMA TIDE', cue: 'TIDE: STAND IN THE GREEN', center: true, rot: ['tide', 'pools', 'fan', 'pools'], gap: 1.3 },
      { at: 0.33, name: 'CINDER CROWN', cue: 'KILL THE IMPS: HE IS SHIELDED', center: true, enter: ['imps'], after: 'IMPS DOWN: TIDE AND EMBERS - KEEP MOVING', rot: ['pools', 'tide', 'fan', 'slam'], gap: 1.1 }] },
  { id: 'morthal', name: 'MORTHAL', title: 'THE OSSUARY KING', arena: 'OSSUARY', map: 'crypt', W: 20, hp: 11000, col: '#94b0c2', spr: 'rb_morthal', sc: 2.2, r: 14, spd: 20, keep: 0, ico: 'rt_morthal',
    g: ['#241e2c', '#2d2538', '#1c1724', '#3a2f48'],
    d: 'The bone king of the crypt. Step out of his slam ring, smash the pylons that hide him, then reach the light before the death toll rings.',
    gate: [rTrophy('ashmaw'), rgate('Reach wave 18', s => s.best.wave >= 18, s => `wave ${Math.min(s.best.wave, 18)}/18`)],
    phases: [
      { at: 1, name: 'BONE CHOIR', cue: 'RED RING: STEP OUT', rot: ['slam', 'nova', 'raise', 'slam', 'nova'], gap: 1.4 },
      { at: 0.66, name: 'THE LEGION', cue: 'BREAK THE 3 PYLONS', center: true, enter: ['pylons'], shieldRot: ['nova'], shieldGap: 2.6, after: 'HE IS EXPOSED: STEP OUT OF THE RED', rot: ['slam', 'raise', 'nova', 'slam'], gap: 1.3 },
      { at: 0.33, name: "DEATH'S DOOR", cue: 'DEATH TOLL: REACH THE LIGHT', rot: ['toll', 'slam', 'nova', 'raise', 'slam'], gap: 1.2 }] },
  { id: 'glacia', name: 'GLACIA', title: 'THE WHITE HUSH', arena: 'FROZEN NAVE', map: 'frost', W: 26, hp: 21000, col: '#73eff7', spr: 'rb_glacia', sc: 2.2, r: 13, spd: 24, keep: 60, ico: 'rt_glacia', chill: [9, 8, 6],
    g: ['#2e3f56', '#36496a', '#263548', '#6f94b8'],
    d: 'The cold itself. Stay near a fire or freeze, sidestep the ice shards, slip through the gap in her shattering rings. At the end only one fire is left.',
    gate: [rTrophy('morthal'), rgate('Pass the wave-20 Gear Check', s => (s.gc && s.gc[0] || 0) >= 1, s => atL(s.gc && s.gc[0] || 0, 1)), rgate('Reach wave 24', s => s.best.wave >= 24, s => `wave ${Math.min(s.best.wave, 24)}/24`)],
    phases: [
      { at: 1, name: 'BLIZZARD', cue: 'STAY NEAR A FIRE: THE COLD BUILDS', rot: ['shards', 'fan', 'shards', 'fan'], gap: 1.6 },
      { at: 0.6, name: 'SHATTERING ICE', cue: 'ICE RING: STAND IN THE GAP', rot: ['icering', 'shards', 'icering', 'fan'], gap: 1.4 },
      { at: 0.3, name: 'WHITEOUT', cue: 'ONE FIRE LEFT: FOLLOW IT', enter: ['whiteout'], rot: ['icering2', 'shards', 'icering'], gap: 1.3 }] },
  { id: 'vael', name: 'VAEL', title: 'THE UNBLINKING', arena: 'THE HOLLOW', map: 'crypt', W: 32, hp: 24000, col: '#b13e53', spr: 'rb_vael', sc: 2.2, r: 15, spd: 26, keep: 80, ico: 'rt_vael', gaze: [26, 30, 38],
    g: ['#16101e', '#1d1428', '#110c18', '#2e1f3e'],
    d: 'An eye that never closes. Keep moving or its gaze burns where you stand, step off the void beams, pop its orbs, and hold the centre as the edge falls away.',
    gate: [rTrophy('glacia'), rgate('Reach wave 30', s => s.best.wave >= 30, s => `wave ${Math.min(s.best.wave, 30)}/30`)],
    phases: [
      { at: 1, name: 'THE GAZE', cue: 'THE EYE FOLLOWS: KEEP MOVING', rot: ['beams', 'fan', 'beams', 'nova'], gap: 1.4 },
      { at: 0.6, name: 'BLINK STORM', cue: 'POP THE VOID ORBS', enter: ['orbs'], after: 'BEAMS: STEP OFF THE PURPLE LINES', rot: ['blink', 'beams', 'fan', 'beams'], gap: 1.3 },
      { at: 0.3, name: 'COLLAPSE', cue: 'THE EDGE IS VOID: HOLD THE CENTRE', enter: ['collapse'], rot: ['cross', 'nova', 'beams', 'fan'], gap: 1.2 }] },
  { id: 'morr', name: 'MORRGHAST', title: 'ELDER OF THE HORDE', arena: 'ELDER PIT', map: 'ash', W: 40, hp: 40000, col: '#ffcd75', spr: 'rb_morr', sc: 2.3, r: 16, spd: 24, keep: 0, ico: 'rt_morr', gaze: [0, 0, 36],
    g: ['#1e1a14', '#262018', '#16130e', '#3a2e1c'],
    d: 'Three heads, every trick. Embers and slams, then a brood that shields it while the tide rolls in, then a dying world: void edge, a hunting eye, beams and rings at once.',
    gate: [rTrophy('ashmaw'), rTrophy('morthal'), rTrophy('glacia'), rTrophy('vael'), rgate('Reach wave 36', s => s.best.wave >= 36, s => `wave ${Math.min(s.best.wave, 36)}/36`)],
    phases: [
      { at: 1, name: 'THE MAW', cue: 'OUT OF ORANGE AND RED', rot: ['pools', 'slam', 'shards', 'fan'], gap: 1.3 },
      { at: 0.66, name: 'THE BROOD', cue: 'KILL THE BROOD: STAND IN GREEN', center: true, enter: ['brood'], after: 'BROOD DOWN: STAND IN GREEN - DODGE THE REST', rot: ['tide', 'beams', 'icering', 'pools'], gap: 1.2 },
      { at: 0.33, name: 'END OF ALL', cue: 'EDGE IS VOID: THE EYE HUNTS', enter: ['collapse', 'gaze'], rot: ['tide', 'cross', 'icering', 'slam', 'pools'], gap: 1.0 }] },
];
/* 1.10.0: raid bosses 6-8 on the same ladder: dual gates (prior trophy + milestone), 3 phases, 1.9.5 rematch tiers. __phLegacy keeps the 5-boss ladder. */
Object.assign(RAID_NAME, { vexmire: 'Vexmire', kharos: 'Kharos', skarn: 'Skarn' });
const RAIDS110 = [
  { id: 'vexmire', name: 'VEXMIRE', title: 'THE ROT MOTHER', arena: 'BLIGHT HOLLOW', map: 'crypt', W: 46, hp: 52000, col: '#c86ad8', spr: 'rb_vexmire', sc: 2.2, r: 15, spd: 20, keep: 70, ico: 'rt_vexmire', v110: 1,
    g: ['#1e1424', '#261a2e', '#170f1c', '#3a2448'],
    d: 'Mother of every spitter and cap. Her venom globs leave poison pools: get out of the violet, DASH sheds stacks. Break her pylons, then outlast the bloom.',
    gate: [rTrophy('morr'), rgate('Reach wave 42', s => s.best.wave >= 42, s => `wave ${Math.min(s.best.wave, 42)}/42`)],
    phases: [
      { at: 1, name: 'SPORE RAIN', cue: 'VIOLET = POISON: GET OUT', rot: ['venom', 'fan', 'venom', 'slam'], gap: 1.4 },
      { at: 0.66, name: 'THE BROOD', cue: 'BREAK THE 3 PYLONS', center: true, enter: ['pylons'], shieldRot: ['venom'], shieldGap: 2.6, after: 'SHE IS EXPOSED: KEEP OUT OF THE VIOLET', rot: ['venom', 'raise', 'nova', 'venom'], gap: 1.3 },
      { at: 0.33, name: 'BLIGHT BLOOM', cue: 'DASH TO SHED POISON', rot: ['venom', 'tide', 'venom', 'nova', 'slam'], gap: 1.15 }] },
  { id: 'kharos', name: 'KHAROS', title: 'THE STORM HERALD', arena: 'THUNDER STEPPE', map: 'ash', W: 52, hp: 64000, col: '#41a6f6', spr: 'rb_kharos', sc: 2.2, r: 14, spd: 28, keep: 90, ico: 'rt_kharos', v110: 1,
    g: ['#1a1f2c', '#202838', '#141823', '#2e3a52'],
    d: 'A herald riding the storm front. Lightning walks toward you in a line (sidestep it) while beams cross the steppe. Pop its storm orbs, then hold the shrinking eye.',
    gate: [rTrophy('vexmire'), rgate('Pass the wave-40 Gear Check', s => (s.gc && s.gc[1] || 0) >= 1, s => atL(s.gc && s.gc[1] || 0, 1)), rgate('Reach wave 48', s => s.best.wave >= 48, s => `wave ${Math.min(s.best.wave, 48)}/48`)],
    phases: [
      { at: 1, name: 'STORMFRONT', cue: 'LIGHTNING WALKS: SIDESTEP THE LINE', rot: ['strikes', 'fan', 'beams', 'strikes'], gap: 1.35 },
      { at: 0.6, name: 'CHARGED AIR', cue: 'POP THE STORM ORBS', enter: ['orbs'], after: 'STRIKES AND BEAMS - KEEP MOVING', rot: ['strikes', 'cross', 'blink', 'strikes'], gap: 1.25 },
      { at: 0.3, name: 'EYE OF THE STORM', cue: 'THE EDGE IS VOID: HOLD THE CENTRE', enter: ['collapse'], rot: ['strikes', 'nova', 'beams', 'strikes', 'cross'], gap: 1.1 }] },
  { id: 'skarn', name: 'SKARN', title: 'THE LAST WINTER', arena: 'GLACIER CROWN', map: 'frost', W: 60, hp: 80000, col: '#f4f4f4', spr: 'rb_skarn', sc: 2.3, r: 16, spd: 22, keep: 0, ico: 'rt_skarn', chill: [10, 8, 6], v110: 1,
    g: ['#34465e', '#3f5470', '#2b3a4f', '#94b0c2'],
    d: 'An old wyrm of ice. Hail hammers the arena in waves, its rings shatter outward and the cold never stops: stay near a fire. At the end one fire is left.',
    gate: [rTrophy('kharos'), rgate('Defeat 30 bosses (total)', s => s.bossKills >= 30, s => atL(s.bossKills, 30)), rgate('Reach wave 56', s => s.best.wave >= 56, s => `wave ${Math.min(s.best.wave, 56)}/56`)],
    phases: [
      { at: 1, name: 'HAILSTORM', cue: 'HAIL: LEAVE THE SHADOWS, STAY WARM', rot: ['hail', 'shards', 'slam', 'hail'], gap: 1.4 },
      { at: 0.6, name: 'SHATTER', cue: 'ICE RING: STAND IN THE GAP', rot: ['icering', 'hail', 'icering2', 'fan'], gap: 1.3 },
      { at: 0.3, name: 'LAST WINTER', cue: 'ONE FIRE LEFT: FOLLOW IT', enter: ['whiteout'], rot: ['hail', 'icering2', 'shards', 'hail'], gap: 1.2 }] },
];
if (!window.__phLegacy) { RAIDS.push(...RAIDS110); RAID_IDS.push(...RAIDS110.map(D => D.id)); }
const RAID_BY = Object.fromEntries(RAIDS.map(D => [D.id, D]));
function raidOpenFor(s, id) { const D = RAID_BY[id]; return !!D && D.gate.every(g => g.ok(s)); }
const INN_MULT = [1, 1.4, 1.8], MEND_PCT = [8, 11, 14], REVIVE_HP = [0.5, 0.5, 0.7], FORGE_POW = [1, 1.1, 1.2], FORGE_TAG = ['', 'Tempered ', 'Runed '];
const VILLAGE = {
  // functional tiers on the 0.2.0 buildings (look + effect)
  inn:    { name: 'INN', names: ['ROADSIDE INN', 'GRAND INN'], on: 'tavern', ico: 'inn', d: 'Tavern tier: rebuild it as a two-storey inn. Brews gold faster and stores more.',
    fx: l => `tavern brew x${INN_MULT[l]}`, levels: [
    gl(350, 'Tavern L4 + play 15 runs', s => s.home.tavern >= 4 && s.runs >= 15, s => `tavern L${s.home.tavern}/4 · ${atL(s.runs, 15)} runs`),
    gl(900, 'Tavern L5 + earn 5,000 gold (lifetime)', s => s.home.tavern >= 5 && s.goldTotal >= 5000, s => `tavern L${s.home.tavern}/5 · ${atL(s.goldTotal, 5000)} gold`)] },
  fire:   { name: 'HEARTH TIER', names: ['STONE HEARTH', 'GREAT HEARTH'], on: 'hearth', ico: 'hearth', d: 'Hearth tier: a bigger fire. Wave mend heals more per rank; the Great Hearth revives you at 70% HP.',
    fx: l => `mend ${MEND_PCT[l]}%/rank · revive ${REVIVE_HP[l] * 100}% HP`, levels: [
    gl(200, '2 MEND ranks + defeat 5 bosses', s => s.home.mend >= 2 && s.bossKills >= 5, s => `mend ${s.home.mend}/2 · ${atL(s.bossKills, 5)} bosses`),
    gl(500, 'MEND 3/3 + survive 7:00 in one run', s => s.home.mend >= 3 && s.best.time >= 420, s => `mend ${s.home.mend}/3 · ${fmtT(Math.min(s.best.time, 420))}/7:00`)] },
  forge:  { name: 'FORGE', names: ['TEMPERED FORGE', 'RUNED ANVIL'], on: 'smithy', ico: 'smithy', d: 'Smithy tier: a real furnace. Your smithy start weapon gets more item power.',
    fx: l => `start weapon +${Math.round((FORGE_POW[l] - 1) * 100)}% power`, levels: [
    gl(180, 'Smithy built + reach wave 10', s => !!s.home.smithy && s.best.wave >= 10, s => `${s.home.smithy ? 'smithy ✓' : 'smithy ✗'} · wave ${Math.min(s.best.wave, 10)}/10`),
    gl(450, 'Smithy built + defeat 8 bosses', s => !!s.home.smithy && s.bossKills >= 8, s => `${atL(s.bossKills, 8)} bosses`)] },
  armory: { name: 'ARMORY', names: ['ARMORY', 'ARTIFACT MUSEUM'], ico: 'armory', d: LOAD.on ? 'Loadout slots + stash. Loadout = stash pieces you take into a run. Camp: 3 slots, stash 12 · Armory: 6 + stash 24 · Artifact Museum: 9 + stash 40. Premium stash: 24 / 48 / 80 + an endless Uniques tab. What you carry is lost if you die; extract to bank it all.' : 'Keeps gear between runs. Camp alone keeps 1 heirloom; the Armory keeps 3, the Artifact Museum 4. Kept items are equipped at run start.',   // 0.6.0
    fx: l => LOAD.on ? `loadout ${KEEP_CAP[l]} slots · stash ${(premOf(save) ? STASH_CAP_P : STASH_CAP)[l]}` : `keep ${KEEP_CAP[l]} item${KEEP_CAP[l] > 1 ? 's' : ''} between runs`, levels: [
    gl(250, 'Defeat 3 mini-bosses (total)', s => (s.miniKills || 0) >= 3, s => `${atL(s.miniKills || 0, 3)} mini-bosses`),
    gl(600, 'Defeat 10 mini-bosses + reach wave 12', s => (s.miniKills || 0) >= 10 && s.best.wave >= 12, s => `${atL(s.miniKills || 0, 10)} minis · wave ${Math.min(s.best.wave, 12)}/12`)] },
  portal: { name: 'PORTAL CIRCLE', names: ['PORTAL CIRCLE', 'WAYSTONE RING', 'GREATER PORTAL', 'ELDER PORTAL', 'RUNED PORTAL', 'ASTRAL PORTAL', 'STAR PORTAL', 'VOID PORTAL', 'DEEP PORTAL', 'ABYSS PORTAL', 'WORLD PORTAL'], ico: 'gate', icoV: 'b', d: 'Standing stones that deploy you straight into a later wave band (gear checks and loot scale as if you had walked there). Reaching a wave only unlocks the RIGHT to buy that tier: you still pay the upgrade here before you can deploy there. Each deploy costs a small gold fee.',   // 0.9.0 · 1.14.0 upgradeable skip ladder
    fx: l => l ? `deploy up to wave ${PORTAL_W[l]}` : 'no portal', levels: PORTAL_T.map(([c, W, res]) => portalLv(c, W, res)) },
  hall:   { name: 'HERO HALL', ico: 'hall', d: 'Choose your hero and recruit new ones.', levels: [gl(100, 'Reach wave 5', s => s.best.wave >= 5, s => `wave ${Math.min(s.best.wave, 5)}/5`)] },
  gate:   { name: 'WAYGATE', names: ['WAYGATE', 'FROST WAYGATE'], ico: 'gate', d: 'Opens new maps: the Bone Crypt, then (tier 2) the Frost Spire.', levels: [
    gl(200, 'Reach wave 8', s => s.best.wave >= 8, s => `wave ${Math.min(s.best.wave, 8)}/8`),
    gl(450, 'Survive 6:00 in one run', s => s.best.time >= 360, s => `${fmtT(Math.min(s.best.time, 360))}/6:00`)] },
  // prestige / scenic (cosmetic only)
  wall:   { name: 'PALISADE', names: ['PALISADE', 'STONE WALLS'], ico: 'wall', deco: true, d: 'Prestige: a timber wall rings the village; later stone walls with towers.', levels: [
    gl(80, 'Play 5 runs', s => s.runs >= 5, s => `${atL(s.runs, 5)} runs`), gl(350, 'Play 30 runs', s => s.runs >= 30, s => `${atL(s.runs, 30)} runs`)] },
  statue: { name: 'BOSS STATUE', names: ['BOSS STATUE', 'GILDED STATUE'], ico: 'brute', icoV: 's', deco: true, d: 'Prestige: a statue of the Bone Colossus in the plaza. Gild it later.', levels: [
    gl(150, 'Defeat 3 bosses', s => s.bossKills >= 3, s => `${atL(s.bossKills, 3)} bosses`), gl(400, 'Defeat 10 bosses', s => s.bossKills >= 10, s => `${atL(s.bossKills, 10)} bosses`)] },
  slayer: { name: 'MONSTER SLAYER TAVERN', ico: 'tavern', icoV: 'p', deco: true, d: 'Prestige: re-roof the tavern (or inn) in platinum with a slayer sign.', levels: [gl(500, 'Slay 10,000 monsters', s => s.totalKills >= 10000, s => `${atL(s.totalKills, 10000)} kills`)] },
  garden: { name: 'GARDEN', names: ['HERB GARDEN', 'ORCHARD & PEN'], ico: 'garden', deco: true, d: 'Prestige: vegetable beds and chickens; then fruit trees and a sheep pen.', levels: [
    gl(120, 'Play 8 runs', s => s.runs >= 8, s => `${atL(s.runs, 8)} runs`), gl(300, 'Play 20 runs', s => s.runs >= 20, s => `${atL(s.runs, 20)} runs`)] },
  banners: { name: 'BANNER ROW', ico: 'banner', deco: true, d: 'Prestige: hero banners fly between the houses along the high road.', levels: [gl(150, 'Reach wave 10', s => s.best.wave >= 10, s => `wave ${Math.min(s.best.wave, 10)}/10`)] },
  lanterns: { name: 'LANTERN LANE', ico: 'lantern', deco: true, d: 'Prestige: glowing lanterns along the road and around the plaza.', levels: [gl(180, 'Slay 4,000 monsters', s => s.totalKills >= 4000, s => `${atL(s.totalKills, 4000)} kills`)] },
  fountain: { name: 'FOUNTAIN', ico: 'fountain', deco: true, d: 'Prestige: a splashing fountain in the plaza (ducks move into the stream).', levels: [gl(300, 'Win 12 events', s => s.events >= 12, s => `${atL(s.events, 12)} events`)] },
  market: { name: 'MARKET', names: ['MARKET STALLS', 'BUSY MARKET'], ico: 'stall', deco: true, d: 'Prestige: two stalls with awnings; later a busy market with crates and shoppers.', levels: [
    gl(250, 'Earn 2,000 gold (lifetime)', s => s.goldTotal >= 2000, s => `${atL(s.goldTotal, 2000)} gold`), gl(600, 'Earn 6,000 gold (lifetime)', s => s.goldTotal >= 6000, s => `${atL(s.goldTotal, 6000)} gold`)] },
  watch:  { name: 'WATCHTOWER', ico: 'watch', deco: true, d: 'Prestige: a lookout tower with a beacon fire and a guard.', levels: [gl(220, 'Survive 5:00 in one run', s => s.best.time >= 300, s => `${fmtT(Math.min(s.best.time, 300))}/5:00`)] },
  trophy: { name: 'TROPHY WALL', ico: 'trophy', deco: true, d: 'Prestige: Colossus skulls mounted on a board, one per 5 bosses slain (up to 6), and a plinth row for every raid boss: each first raid kill mounts its head.', levels: [gl(350, 'Defeat 15 bosses or any raid boss', s => s.bossKills >= 15 || raidTotal(s) >= 1, s => raidTotal(s) ? `raid trophy ${raidTotal(s)}/${RAIDS.length}` : `${atL(s.bossKills, 15)} bosses`)] },
};
if (ON18) {   // 1.18.0 useful village
  Object.assign(VILLAGE.market, { deco: false, bonus: true, d: 'Market stalls: traders in town raise what the travelling Market pays when you sell.', fx: l => `Market sell price x${MKT18[l].toFixed(2)}` });
  Object.assign(VILLAGE.watch, { deco: false, bonus: true, name: 'SCOUT TOWER', names: ['WATCHTOWER', 'SCOUT TOWER', 'EAGLE SPIRE'], d: 'Scouts ride out ahead: exit gates (and the travelling Market) are foretold before they rise, and gate timers run longer.', fx: l => l ? `gates + Market foretold ${SCOUT18.lead[l]}s early · gate timer +${SCOUT18.gate[l]}s` : 'no scouting' });
  VILLAGE.watch.levels.push(gl(450, 'Reach wave 15', s => s.best.wave >= 15, s => `wave ${Math.min(s.best.wave, 15)}/15`), gl(1100, 'Reach wave 25 + defeat 12 bosses', s => s.best.wave >= 25 && s.bossKills >= 12, s => `wave ${Math.min(s.best.wave, 25)}/25 · ${atL(s.bossKills, 12)} bosses`));
  { const fx0 = VILLAGE.forge.fx; VILLAGE.forge.fx = l => `${fx0(l)} · upgrades -${Math.round(SMITH18[1 + l] * 100)}%`; VILLAGE.forge.bonus = true; }
  VILLAGE.apoth = { name: 'APOTHECARY', names: ['APOTHECARY', 'ALCHEMIST', 'GRAND ALCHEMIST'], ico: 'heart', bonus: true, d: 'Brews healing flasks from the herb garden. You start each wave run with them; one is drunk automatically when you drop below 30% HP (not while NO REGEN is on).',
    fx: l => l ? `${FLASK18.n[l]} starting flask${FLASK18.n[l] > 1 ? 's' : ''} · each heals ${Math.round(FLASK18.heal[l] * 100)}% max HP` : 'no starting flask',
    levels: [gl(150, 'Herb Garden + play 10 runs', s => (s.home.garden || 0) >= 1 && s.runs >= 10, s => `${(s.home.garden || 0) >= 1 ? 'garden ✓' : 'garden ✗'} · ${atL(s.runs, 10)} runs`), gl(400, 'Defeat 6 bosses', s => s.bossKills >= 6, s => `${atL(s.bossKills, 6)} bosses`), gl(900, 'Reach wave 20', s => s.best.wave >= 20, s => `wave ${Math.min(s.best.wave, 20)}/20`)] };
}
if (ON18) for (const k in PRICE181) for (const i in PRICE181[k]) VILLAGE[k].levels[i].fix = PRICE181[k][i];   // 1.18.1
const VKEYS = Object.keys(VILLAGE);
const UNLOCKS = [ // milestone notices at run end (the gold half is paid in the village)
  { id: 'map2', kind: 'MAP', name: 'Bone Crypt', need: 'Waygate: ' + VILLAGE.gate.levels[0].need, ok: VILLAGE.gate.levels[0].ok, where: 'build the Waygate' },
  { id: 'map3', kind: 'MAP', name: 'Frost Spire', need: 'Frost Waygate: ' + VILLAGE.gate.levels[1].need, ok: VILLAGE.gate.levels[1].ok, where: 'upgrade the Waygate' },
  { id: 'hall', kind: 'BUILDING', name: 'Hero Hall', need: VILLAGE.hall.levels[0].need, ok: VILLAGE.hall.levels[0].ok, where: 'build it in the village' },
  ...['pyro', 'ranger', 'knight'].map(h => ({ id: 'hero_' + h, kind: 'HERO', name: HEROES[h].name, need: HEROES[h].gate.need, ok: HEROES[h].gate.ok, where: 'recruit at the Hero Hall' })),
  ...RAIDS.map(D => ({ id: 'raid_' + D.id, kind: 'RAID', name: `Raid: ${D.name}`, need: D.gate.map(g => g.need).join(' + '), ok: s => raidOpenFor(s, D.id), where: 'challenge it from the hub RAIDS board' })),   // 1.4.0
];
/* 0.3.0 gear slots. Armour = one base per slot with a small implicit; affix pool and magnitude scaled per slot (weapon = 1.0) */
const SLOTS = ['weapon', 'helmet', 'amulet', 'chest', 'gloves', 'ring', 'belt', 'pants', 'boots'];
const DOLL = ['ring', 'helmet', 'amulet', 'weapon', 'chest', 'gloves', 'belt', 'pants', 'boots'];
const SLOTN = { weapon: 'Weapon', helmet: 'Helmet', amulet: 'Amulet', chest: 'Chest', gloves: 'Gloves', ring: 'Ring', belt: 'Belt', pants: 'Pants', boots: 'Boots' };
const ARMOR = {
  helmet: { name: 'Helm', imp: { hp: 10 }, k: 0.35, pool: ['crit', 'area', 'echo', 'frost', 'greed', 'stun'] },
  amulet: { name: 'Amulet', imp: { cd: 4 }, k: 0.5, pool: ['area', 'echo', 'proj', 'chain', 'burn', 'frost', 'spd', 'greed', 'elite'] },
  chest:  { name: 'Mail', imp: { hp: 20, dr: 4 }, k: 0.4, pool: ['dmg', 'area', 'leech', 'burn', 'frost', 'thorns', 'exec'] },
  gloves: { name: 'Gloves', imp: { aspd: 5 }, k: 0.5, pool: ['dmg', 'aspd', 'crit', 'burn', 'leech', 'exec', 'stun', 'thorns'] },
  ring:   { name: 'Ring', imp: { crit: 3 }, k: 0.45, pool: ['dmg', 'crit', 'chain', 'leech', 'echo', 'burn', 'frost', 'greed', 'elite'] },
  belt:   { name: 'Belt', imp: { hp: 12, pick: 15 }, k: 0.35, pool: ['dmg', 'aspd', 'area', 'leech', 'thorns', 'greed'] },
  pants:  { name: 'Leggings', imp: { hp: 10, dr: 2 }, k: 0.3, pool: ['dmg', 'aspd', 'frost', 'chain', 'spd', 'thorns'] },
  boots:  { name: 'Boots', imp: { move: 6 }, k: 0.3, pool: ['aspd', 'echo', 'frost', 'chain', 'spd'] },
};
const ARMOR_SLOTS = Object.keys(ARMOR);
const IMPN = { hp: v => `+${v} max HP`, dr: v => `-${v}% damage taken`, cd: v => `-${v}% ability cooldowns`, aspd: v => `+${v}% attack speed`, crit: v => `+${v}% crit chance`, pick: v => `+${v}% pickup range`, move: v => `+${v}% move speed` };
const IMP_T = [1, 1.5, 2.2, 3, 4];   // 0.9.0: + T4 / T5 armour implicits
/* 1.10.0 armour bases: every slot keeps its plain base (base === slot) and gains one variant with its own implicit (same slot + paper-doll square, own icon). 35% of armour drops. */
const ARMB = {
  cowl:      { slot: 'helmet', name: 'Cowl', imp: { cd: 3, crit: 2 } },
  talisman:  { slot: 'amulet', name: 'Talisman', imp: { pres: 10, cd: 2 } },
  robe:      { slot: 'chest', name: 'Robe', imp: { hp: 12, cd: 4 } },
  gauntlets: { slot: 'gloves', name: 'Gauntlets', imp: { dr: 3, hp: 6 } },
  signet:    { slot: 'ring', name: 'Signet', imp: { hp: 8, crit: 2 } },
  sash:      { slot: 'belt', name: 'Sash', imp: { move: 4, pick: 20 } },
  chausses:  { slot: 'pants', name: 'Chausses', imp: { dr: 3, hp: 6 } },
  sabatons:  { slot: 'boots', name: 'Sabatons', imp: { dr: 3, hp: 8 } },
};
const ARMB_P = 0.35;
IMPN.pres = v => `-${v}% poison damage`;
const armBase = w => (w && ARMB[w.base] && ARMB[w.base].slot === w.slot) ? ARMB[w.base] : null;
if (!window.__phLegacy) { const add = { helmet: ['sturdy', 'warded'], amulet: ['antid', 'cruel'], chest: ['sturdy', 'warded', 'antid'], gloves: ['cruel', 'venom', 'warded'], ring: ['cruel', 'venom'], belt: ['sturdy', 'antid'], pants: ['sturdy', 'warded'], boots: ['antid'] }; for (const k in add) ARMOR[k].pool.push(...add[k]); }
/* 0.2.0 homestead + power-ups */
const HOME = {
  tavern: { max: 5, cost: l => disc18(econCost([0, 60, 150, 300, 600][l])), rate: l => Math.round(l * INN_MULT[save.home.inn || 0]), cap: l => Math.round(90 * l * INN_MULT[save.home.inn || 0]) },   // gold per minute, storage cap (0.4.0: x inn tier)
  life:   { max: 2, cost: l => disc18(econCost([120, 300][l])) },        // hearth: extra lives per run
  mend:   { max: 3, cost: l => disc18(econCost([50, 110, 200][l])) },    // hearth: heal % max HP at each new wave
  smithy: { get cost() { return econCost(75); } },
};
const BUFFS = {
  multi:  { name: 'MULTI-SHOT', d: '+2 projectiles / swings', c: '#ffcd75' },
  slow:   { name: 'SLOW AURA', d: 'nearby enemies move at half speed', c: '#73eff7' },
  leech:  { name: 'LIFESTEAL', d: '+5% life steal', c: '#b13e53' },
  freeze: { name: 'FREEZE BURST', d: 'frost pulse every 6s', c: '#41a6f6' },
  fury:   { name: 'FURY', d: '+20% attack speed', c: '#ef7d57' },           // 0.9.0
  aegis:  { name: 'AEGIS', d: '-12% damage taken (inside the 75% cap)', c: '#94b0c2' },   // 0.9.0
};
const RUN_BUFF = Infinity;   // 0.9.0: a buff with Infinity seconds lasts for the rest of the run (HUD shows RUN)
const fmtT = t => `${Math.floor(t / 60)}:${String(Math.floor(t % 60)).padStart(2, '0')}`;
const need = l => Math.round(40 + 30 * (l - 1) + 6 * (l - 1) ** 2);

/* ---------------- save ---------------- */
const SKEY = 'pixelhorde.save.v1';
const defHome = () => ({ tavern: 1, life: 0, mend: 0, smithy: 0, start: 'wand', tavT: Date.now(), ...Object.fromEntries(VKEYS.map(k => [k, 0])) });
const SAVE_V = 21;   // 1.18.0: + vibrate (bool; default true) + home.apoth (0..3) + home.watch may reach 3.   // 1.17.1: + shake (bool; default true) + item.locked (persists into stash/loadout; uniques default locked).   // 1.16.3: fixed-size bag/stash detail panes (Junk never moves).   // 1.16.2: Settings-only LOOT filter; bag/pause cycle removed (no schema change).   // 1.16.1: same schema (hub beta banner + privacy URL; no new keys).   // 1.16.0: + verboseHud (bool; default false = CLEAN combat HUD).   // 1.15.0: + lootHideC / lootHideM / lootConv.   // 1.14.0: + res + kits
const BANNER_MODES = ['normal', 'small', 'top', 'off'];   // 1.3.0: hub / pause cycle order
const BANNER_LBL = { normal: 'NORMAL', small: 'SMALL', top: 'TOP', off: 'OFF' };
const defRes = () => ({ wood: 0, stone: 0, oil: 0, jewels: 0, people: 0 });   // 1.14.0
const defPortal = () => ({ pick: 0, uses: 0, spent: 0, streak: 0, best: 0 });   // 0.9.0
const defHx = () => ({ lv: 1, xp: 0, sp: 0, tot: 0, n: {} });
/* 1.7.1 ONBOARDING. Fresh save: WELCOME cards on the hub (5 pages: controls, extract-or-lose-one-heirloom, gates, bag + KEEP, village) -> START GUIDED RUN
   (a normal Ashen Field run with coach tips that never pause the game) -> run-end KEEP tip -> back at camp a VILLAGE wrap-up card -> done. SKIP anywhere.
   HOW TO -> REPLAY TUTORIAL restarts it. Old saves migrate as done. */
const TUT_TIPS = [   // in-run coach tips (guided run only, never in raids), first match whose `when` is true shows next; each shows `t` s
  { id: 'move', when: R => R.t - R.t0 > 0.4, s: 'MOVE: drag your LEFT thumb anywhere on the left half (WASD on keyboard). Your weapon aims and fires on its own.' },
  { id: 'abil', when: R => R.t - R.t0 > 9, s: 'ABILITIES: the round buttons on the right. DASH slips through danger, NOVA blasts everything around you.' },
  { id: 'loot', when: R => R.I.length > 0 || R.bag.length > 0, s: 'LOOT: walk over items to bag them. Tap BAG (time freezes) to compare each stat ▲/▼ vs what you wear and EQUIP. The LOOT filter hides junk.' },
  { id: 'gold', when: R => R.t - R.t0 > 24, s: 'GOLD (coins) is kept forever and spent in the VILLAGE. Gems are XP: level ups give skill points.' },
  { id: 'risk', when: R => R.t - R.t0 > 40, s: LOAD.on ? 'EXTRACT OR LOSE IT: die or abandon before extracting and EVERYTHING you carry is lost, your loadout too. Extract to bank it all.' : 'EXTRACT OR LOSE: if you die or abandon before extracting, ONE random ★ heirloom you carry is destroyed. Extracting loses nothing.' },
  { id: 'gate', when: R => !!R.gate, s: 'EXIT GATE! One rises every 10 waves, SEALED. Beat its trial (the HUD says how), then stand in it 5 s to EXTRACT.' },
  { id: 'open', when: R => !!(R.gate && !R.gate.sealed), s: 'GATE OPEN: stand inside for 5 s to extract with a bonus, a Rare gift and every item safe.' }];
const TUT_PAGES = [
  ['WELCOME TO PIXEL HORDE', 'Waves of monsters never stop. <b>Left thumb</b>: move. Your weapon <b>auto-aims</b>. The two round buttons (right) are your <b>abilities</b> (DASH, NOVA). Esc / ❚❚ pauses.'],
  LOAD.on ? ['EXTRACT OR LOSE IT', 'Gold and XP are always kept. Gear is only safe if you <b>extract</b>: then <b>everything</b> you carry is banked in your <b>STASH</b>. Die or abandon first and <b>everything</b> you carried is <b>lost</b> (one ad can save one piece).'] : ['EXTRACT OR LOSE ONE', 'Gold and XP are always kept. Gear is only safe if you <b>extract</b>. Die or abandon first and <b>one random ★ heirloom</b> you carry is destroyed; you still choose what to keep from the rest.'],
  ['EXIT GATES', 'An <b>exit gate</b> rises every <b>10 waves</b>, <b>SEALED</b>. Beat its trial (kill quota in its ring, runes in order, the gate keeper, or the Gear Check warden), then stand in it <b>5 s</b> to extract.'],
  LOAD.on ? ['BAG, STASH + LOADOUT', 'Walk over loot to bag it; tap <b>BAG</b> to compare and equip. Between runs, pick your <b>LOADOUT</b> from the <b>STASH</b>: those pieces are equipped at START, but they are <b>lost if you die</b> with them. The <b>Armory</b> adds loadout slots and stash space.'] : ['BAG + KEEP', 'Walk over loot to bag it; tap <b>BAG</b> to compare and equip. When a run ends you <b>KEEP</b> items (one heirloom, more with the Armory). Kept ★ heirlooms are equipped at your next start.'],
  ['YOUR VILLAGE', 'Spend gold in the <b>VILLAGE</b>: the tavern brews gold, the hearth gives lives, the smithy picks your weapon, the Armory adds loadout slots + stash, the Waygate opens new maps. Cards show gold + milestone ✓/✗.']];
const defTut = (done = false) => ({ done, intro: done, ran: done, seen: {} });   // 1.7.1 onboarding: intro cards seen, guided run finished, in-run tips seen, done
const defSave = () => ({ v: SAVE_V, level: 1, xp: 0, sp: 0, skills: {}, best: { wave: 0, time: 0, kills: 0 }, totalKills: 0, bossKills: 0, runs: 0, unlocked: {}, sound: true, banner: 'normal', gold: 0, goldTotal: 0, home: defHome(), armory: [], stash: [], lootMin: 1, lootHideC: true, lootHideM: false, lootConv: true, verboseHud: false, shake: true, vibrate: true, events: 0, hero: 'wanderer', heroes: { wanderer: true }, map: 'ash', slain: {}, miniKills: 0, hx: Object.fromEntries(HERO_IDS.map(h => [h, defHx()])), portal: defPortal(), gc: [0, 0, 0, 0, 0], raids: {}, tut: defTut(), music: true, premium: false, uniq: [], cheers: 0, res: defRes(), kits: {} });   // 1.11.1: - adRuns, + uniq + cheers   // 1.9.0: + premium (one-off IAP flag) + adRuns (finished runs since the last interstitial)   // 1.8.0: + music (♫ toggle; ♪ = sound stays the master mute)
let save = defSave();
const validItem = w => !!w && (w.slot || 'weapon') === 'weapon' ? !!(w && BASES[w.base]) : !!(w && ARMOR[w.slot] && (w.base === w.slot || !!armBase(w)));
// schema v1 (0.1.x) -> v2 (0.2.0) -> v3 (0.3.0) -> v4 (0.4.0) -> v5 (0.5.0: bestiary kill counts + mini-boss kills): same key, new fields get defaults; XP/skills/bests/gold/homestead untouched
// v6 (0.6.0): the single `heirloom` folds into `armory` (the keep-set, capped by KEEP_CAP) + `lootMin` loot filter (default 1 = hide Commons)
// v8 (0.9.0): + `portal` { pick, uses, spent, streak, best } + `gc` [Gear Check wins: tier I, II, III+] + home.portal (VILLAGE key, defaults 0). Everything else 1:1
// v9 (1.1.0): no new keys. New shared nodes (blood gasp splinter catal momentum midas pack) and 4 new nodes per hero start at 0; every old shared + hero rank carries 1:1; new weapon bases are valid smithy picks / Armory items; uniques keep their `uq` id
// v11 (1.4.0): + `raids` { [bossId]: { kills, firstAt, best (s), tries } } for the raid trophy ladder. Everything else 1:1
// v10 (1.3.0): + `banner` announcement-banner mode ('normal' default / 'small' / 'top' / 'off'). Everything else 1:1
// v12 (1.5.0): `gc` grows 3 -> 5 slots [wave-20, 40, 60, 80, 100+ Gear Check wins]; old III+ wins stay in slot 3 (wave 60). home.portal may go to 6 (61 / 81 / 101). Everything else 1:1
// v7 (0.7.0): + `hx` per-hero progress { lv, xp, sp, tot, n: {nodeId: rank} }. Shared `skills`/`sp`/`level`/`xp` untouched; hero trees start empty at hero LV 1 (no retro XP)
// 1.7.1 (still v13, additive): + `tut` { done, intro, ran, seen } onboarding flags. A save without `tut` predates 1.7.1 = a veteran: migrates as done (never forced through the tutorial). Fresh saves / RESET PROGRESS start it
// v13 (1.7.0): ONE skill-point pool. Every hero's unspent hero points fold into `sp` (hx[h].sp -> 0); hero ranks, shared ranks, level and XP carry 1:1. hx lv/xp stay as history (no new hero XP). Everything else 1:1 (kept Armory items stay until your next death without extracting)
// v14 (1.11.0, principle B): + `stash` (extracted gear, cap STASH_CAP by Armory tier). Old `armory` heirlooms become the INSURED LOADOUT 1:1 (caps grew 1/3/4 -> 2/4/6, so nothing is cut); stash starts empty. Everything else 1:1
// v20 (1.17.1): + `shake` (bool; default true = screen shake on). Item `locked` is stored on each gear object (cleanW keeps it; uniques default locked). Locks persist into the stash and loadout.
// v19 (1.16.0): + `verboseHud` (bool; default false = CLEAN combat HUD: HP / gold / wave + arrows; event banners one short line ~2s). VERBOSE HUD is Settings-only debug-ish.
// v18 (1.15.0): + `lootHideC` / `lootHideM` (bool; default hide Commons, show Magic) + `lootConv` (bool; default true = convert filtered Common/Magic to gold). lootMin stays 0/1/2 synced from the toggles
// v17 (1.14.0): + `res` {wood, stone, oil, jewels, people} ints >= 0, + `kits` {kitId: 0..3}; home.portal (old 0..6 = waves 21..101) -> index of the same wave in the 11-band ladder
// v16 (1.13.0, extract redesign): no new keys. Insurance is gone: `armory` = the LOADOUT 1:1 (cleanW strips any heir / aix / insured flags; caps grew 2/4/6 -> 3/6/9 so nothing is cut). Stash + Uniques kept 1:1. Old v15 saves keep every piece
// v15 (1.11.1, monetization remount): + `uniq` (endless Premium Uniques tab; Unique-rarity items only, no cap), + `cheers` (support ads watched, int >= 0), - `adRuns`. A Premium save sweeps its stash Uniques into the tab; stash cap = Premium cap for Premium saves
function migrate(s) {
  const d = defSave(); if (!s || ![1, 2, 3, 4, 5, 6, 7, 8, 9, 10, 11, 12, 13, 14, 15, 16, 17, 18, 19, 20, 21].includes(s.v)) return d;
  const o = Object.assign(d, s, { best: Object.assign(d.best, s.best), home: Object.assign(defHome(), s.home || {}), heroes: Object.assign({ wanderer: true }, s.heroes || {}) });
  if (!Number.isFinite(o.gold) || o.gold < 0) o.gold = 0; if (!BASES[o.home.start]) o.home.start = 'wand';
  const keep = (Array.isArray(s.armory) ? s.armory.slice() : []); if (s.heirloom && s.v < 6) keep.unshift(s.heirloom); delete o.heirloom;   // 0.6.0: old heirloom = first kept item
  o.armory = keep.filter(w => w && typeof w === 'object').map(w => { if (!w.slot) w.slot = 'weapon'; return w; }).filter(w => validItem(w) && Array.isArray(w.affixes)).map(cleanW);   // 0.2.0 heirlooms are weapons
  if (!HEROES[o.hero] || !o.heroes[o.hero]) o.hero = 'wanderer';
  for (const k of VKEYS) { const v = Math.floor(+o.home[k] || 0); o.home[k] = clamp(v, 0, VILLAGE[k].levels.length); }   // 0.4.0 tiers default 0; old levels kept
  for (const k of ['tavern', 'life', 'mend']) o.home[k] = clamp(Math.floor(+o.home[k] || 0), k === 'tavern' ? 1 : 0, HOME[k].max);
  for (const k of ['events', 'goldTotal', 'runs', 'bossKills', 'totalKills', 'miniKills']) if (!Number.isFinite(o[k])) o[k] = 0;
  if (!o.slain || typeof o.slain !== 'object' || Array.isArray(o.slain)) o.slain = {};   // 0.5.0
  if (!MAPS[o.map] || !mapOpenFor(o, o.map)) o.map = 'ash';
  o.armory = o.armory.slice(0, KEEP_CAP[o.home.armory || 0]);
  o.stash = (Array.isArray(s.stash) ? s.stash : []).filter(w => w && typeof w === 'object').map(w => { if (!w.slot) w.slot = 'weapon'; return w; }).filter(w => validItem(w) && Array.isArray(w.affixes)).map(w => Object.assign(cleanW(w), w.gift ? { gift: true } : {}));   // 1.11.0 v14
  o.uniq = (Array.isArray(s.uniq) ? s.uniq : []).filter(w => w && typeof w === 'object' && w.rarity === 3).map(w => { if (!w.slot) w.slot = 'weapon'; return w; }).filter(w => validItem(w) && Array.isArray(w.affixes)).map(cleanW);   // 1.11.1 v15
  if (s.premium === true && LOAD.on) { o.uniq.push(...o.stash.filter(w => w.rarity === 3)); o.stash = o.stash.filter(w => w.rarity !== 3); }   // Premium: stash Uniques move to their tab first (never cut)
  o.stash = o.stash.slice(0, (s.premium === true ? STASH_CAP_P : STASH_CAP)[o.home.armory || 0]);   // 1.11.1: Premium cap
  o.lootMin = [0, 1, 2].includes(o.lootMin) ? o.lootMin : 1;   // 0.6.0
  if (typeof s.lootHideC === 'boolean' || typeof s.lootHideM === 'boolean') { o.lootHideC = s.lootHideC !== false; o.lootHideM = s.lootHideM === true; }
  else { o.lootHideC = o.lootMin >= 1; o.lootHideM = o.lootMin >= 2; }   // 1.15.0: derive from lootMin for older saves
  o.lootConv = s.lootConv !== false;   // 1.15.0 default ON
  o.lootMin = o.lootHideC && o.lootHideM ? 2 : o.lootHideC ? 1 : 0;   // keep bag/pause cycle in sync
  o.verboseHud = s.verboseHud === true;   // 1.16.0 default CLEAN (false)
  o.vibrate = s.vibrate !== false;   // 1.18.0 default ON (v21)
  o.shake = s.shake !== false;   // 1.17.1 default ON
  const hx0 = s.hx && typeof s.hx === 'object' ? s.hx : {}; o.hx = {};   // 0.7.0
  for (const h of HERO_IDS) { const r = hx0[h] || {}, q = defHx(); q.lv = Math.max(1, Math.floor(+r.lv || 1)); q.xp = Math.max(0, Math.floor(+r.xp || 0)); q.sp = Math.max(0, Math.floor(+r.sp || 0)); q.tot = Math.max(0, Math.floor(+r.tot || 0));
    for (const n of HTREE[h]) { const v = Math.floor(+(r.n && r.n[n.id]) || 0); if (v > 0) q.n[n.id] = Math.min(v, n.max); } o.hx[h] = q; }
  if (!o.skills || typeof o.skills !== 'object') o.skills = {}; for (const k in o.skills) if (SK[k]) o.skills[k] = clamp(Math.floor(+o.skills[k] || 0), 0, SK[k].max);   // shared ranks carried 1:1
  if (!Number.isFinite(o.sp) || o.sp < 0) o.sp = 0;
  for (const h of HERO_IDS) { o.sp += o.hx[h].sp; o.hx[h].sp = 0; }   // 1.7.0 v13: hero points fold into the one pool
  const pr = s.portal && typeof s.portal === 'object' ? s.portal : {}; o.portal = defPortal(); for (const k in o.portal) { const v = Math.floor(+pr[k] || 0); o.portal[k] = v > 0 ? v : 0; }   // 0.9.0
  if (s.v < 17) o.home.portal = Math.max(0, PORTAL_W.indexOf(PORTAL_OLD[clamp(Math.floor(+o.home.portal || 0), 0, PORTAL_OLD.length - 1)]));   // 1.14.0 v17: same wave, new tier index
  o.home.portal = clamp(Math.floor(+o.home.portal || 0), 0, PORTAL_W.length - 1);   // 1.5.0: 6 portal tiers · 1.14.0: 11
  { const r0 = s.res && typeof s.res === 'object' ? s.res : {}; o.res = defRes(); for (const k in o.res) { const v = Math.floor(+r0[k] || 0); o.res[k] = v > 0 ? v : 0; }
    const k0 = s.kits && typeof s.kits === 'object' && !Array.isArray(s.kits) ? s.kits : {}; o.kits = {}; for (const k in KITS) { const v = clamp(Math.floor(+k0[k] || 0), 0, KIT_MAX); if (v) o.kits[k] = v; } }   // 1.14.0
  if (!PORTAL_W.slice(1, o.home.portal + 1).includes(o.portal.pick)) o.portal.pick = 0;
  o.gc = [0, 1, 2, 3, 4].map(i => { const v = Math.floor(+(Array.isArray(s.gc) ? s.gc[i] : 0) || 0); return v > 0 ? v : 0; });
  if (!BANNER_MODES.includes(o.banner)) o.banner = 'normal';   // 1.3.0
  const rr = s.raids && typeof s.raids === 'object' && !Array.isArray(s.raids) ? s.raids : {}; o.raids = {};   // 1.4.0: known bosses only, non-negative ints
  for (const id of RAID_IDS) { const r = rr[id]; if (!r || typeof r !== 'object') continue; const q = {}; for (const k of ['kills', 'firstAt', 'best', 'tries']) { const v = Math.floor(+r[k] || 0); q[k] = v > 0 ? v : 0; } if (q.kills || q.tries) o.raids[id] = q; }
  const tt = s.tut && typeof s.tut === 'object' && !Array.isArray(s.tut) ? s.tut : null; o.tut = tt ? { done: !!tt.done, intro: !!tt.intro, ran: !!tt.ran, seen: Object.fromEntries(Object.keys(tt.seen && typeof tt.seen === 'object' ? tt.seen : {}).filter(k => TUT_TIPS.some(t => t.id === k)).map(k => [k, 1])) } : defTut(true);   // 1.7.1
  o.sound = o.sound !== false; o.music = o.music !== false;   // 1.8.0 (still v13, additive): music defaults ON for older saves
  o.premium = o.premium === true; delete o.adRuns; o.cheers = Math.max(0, Math.floor(+o.cheers || 0)) || 0;   // 1.9.0 premium; 1.11.1: interstitial counter gone, + cheers
  o.v = SAVE_V; return o;
}
function mapOpenFor(s, m) { return m === 'ash' || (m === 'crypt' && (s.home.gate || 0) >= 1) || (m === 'frost' && (s.home.gate || 0) >= 2); }
try { save = migrate(JSON.parse(localStorage.getItem(SKEY) || 'null')); } catch (e) {}
const persist = () => { try { localStorage.setItem(SKEY, JSON.stringify(save)); } catch (e) {} };
const rank = id => save.skills[id] || 0;
/* 0.7.0 hero progress */
const hneed = l => need(l) * 2;   // hero curve = 2x the shared curve
const hx = (h = save.hero) => save.hx[h] || (save.hx[h] = defHx());
const hrank = (id, h) => { const n = HN[id]; if (!n) return 0; h = h || heroId(); if (n.hero !== h) return 0; const r = save.hx && save.hx[h]; return (r && r.n[id]) || 0; };
function addHeroXP(v, h) { const q = hx(h); q.xp += v; q.tot += v; let ups = 0; while (q.xp >= hneed(q.lv)) { q.xp -= hneed(q.lv); q.lv++; q.sp++; ups++; } return ups; }
function canLearnH(n, h = save.hero) { const q = hx(h); return n.hero === h && save.sp > 0 &&   /* 1.7.0: one shared SP pool */ (q.n[n.id] || 0) < n.max && (!n.req || (q.n[n.req] || 0) >= hreqR(n)); }
function learnH(id, h = save.hero) { const n = HN[id]; if (!n || !canLearnH(n, h)) return false; const q = hx(h); save.sp--; q.n[id] = (q.n[id] || 0) + 1; persist(); return true; }
function tavernPending(now = Date.now()) {
  const h = save.home; if (!(now >= h.tavT)) h.tavT = now; // clock went backwards: restart the tick
  return Math.min(HOME.tavern.cap(h.tavern), Math.floor((now - h.tavT) / 60000 * HOME.tavern.rate(h.tavern)));
}
function collectTavern(now = Date.now()) { const g = tavernPending(now); save.gold += g; save.home.tavT = now; persist(); return g; }
function villageNext(k) { const B = VILLAGE[k], l = save.home[k] || 0; return l < B.levels.length ? B.levels[l] : null; }
function villageCan(k) { const n = villageNext(k); return !!n && n.ok(save) && save.gold >= n.cost && resHas(n.res); }
function villageBuy(k) { const n = villageNext(k); if (!n || !n.ok(save) || save.gold < n.cost || !resHas(n.res)) return false; resPay(n.res); if (k === 'inn') collectTavern(); // bank brewed gold at the old rate first
  save.gold -= n.cost; save.home[k] = (save.home[k] || 0) + 1; persist(); return true; }
const mendPct = () => MEND_PCT[save.home.fire || 0], reviveHp = () => REVIVE_HP[save.home.fire || 0];
function heroCan(id) { const H = HEROES[id]; return !save.heroes[id] && !!save.home.hall && !!H.gate && H.gate.ok(save) && save.gold >= H.gate.cost; }
function recruit(id) { if (!heroCan(id)) return false; save.gold -= HEROES[id].gate.cost; save.heroes[id] = true; persist(); return true; }
function selectHero(id) { if (!HEROES[id] || !save.heroes[id]) return false; save.hero = id; persist(); return true; }
const mapsOpen = () => Object.keys(MAPS).filter(m => mapOpenFor(save, m));
function setMap(m) { if (!mapsOpen().includes(m)) return false; save.map = m; persist(); return true; }
function homeBuy(what) {
  if (VILLAGE[what]) return villageBuy(what);
  const h = save.home; let c;
  if (what === 'tavern') { if (h.tavern >= HOME.tavern.max) return false; c = HOME.tavern.cost(h.tavern); }
  else if (what === 'life' || what === 'mend') { if (h[what] >= HOME[what].max) return false; c = HOME[what].cost(h[what]); }
  else if (what === 'smithy') { if (h.smithy) return false; c = HOME.smithy.cost; }
  else return false;
  if (save.gold < c) return false;
  if (what === 'tavern') collectTavern(); // bank what's stored at the old rate first
  save.gold -= c; h[what] = (h[what] || 0) + 1; persist(); return true;
}
function isUqItem(w) { return !!(w && (w.uq || (w.rarity | 0) >= 3)); }
function isLocked(w) { if (!w) return false; if (w.locked === true) return true; if (w.locked === false) return false; return isUqItem(w); }   // 1.17.1: uniques locked by default; explicit false stays unlocked
function setLocked(w, on) { if (!w) return false; w.locked = !!on; return isLocked(w); }
function toggleLock(w) { if (!w) return false; return setLocked(w, !isLocked(w)); }
function cleanW(w) { return w && ({ slot: w.slot || 'weapon', base: w.base, rarity: w.rarity | 0, tier: w.tier | 0, power: +w.power || 1, affixes: (w.affixes || []).map(a => ({ id: a.id, v: a.v })).filter(a => AFX[a.id]), name: String(w.name || ''), ...(w.uq && UNIQ[w.uq] ? { uq: w.uq } : {}), locked: isLocked(w) }); }
function plainWeapon(base) { return { slot: 'weapon', base, rarity: 0, tier: 0, power: 1, affixes: [], name: BASES[base].name }; }
const emptyGear = () => Object.fromEntries(SLOTS.map(k => [k, null]));
const keepCap = (s = save) => KEEP_CAP[(s.home && s.home.armory) || 0];
/* RULE (0.6.0): every kept item (save.armory, up to keepCap) is equipped into its own slot at run start, in keep order.
   The first kept weapon wins the weapon slot and the smithy pick rides in the bag as a spare; with no kept weapon the smithy pick is equipped.
   A second kept item for an already-filled slot rides in the bag. */
function startKit(arm = save.armory) {
  const base = save.home.smithy ? save.home.start : 'wand', smith = plainWeapon(base), gear = emptyGear(); gear.weapon = smith; const extra = []; let wk = false;
  const fg = save.home.smithy ? save.home.forge || 0 : 0; if (fg) { smith.power = FORGE_POW[fg]; smith.name = FORGE_TAG[fg] + smith.name; }   // 0.4.0 forge tier
  smith.smith = true; if (arm && !Array.isArray(arm)) arm = [arm];
  for (const it of arm || []) { if (!it) continue; const h = cleanW(it); if (LOAD.on) h.lo = true; else h.heir = true; if (it.aix != null) h.aix = it.aix;   /* 1.13.0: lo = came from the loadout (UI tag only, NOT protected); heir = legacy keep */
    if (h.slot === 'weapon') { if (!wk) { gear.weapon = h; wk = true; } else extra.push(h); }
    else if (!gear[h.slot]) gear[h.slot] = h; else extra.push(h); }
  return { gear, bag: wk ? [smith, ...extra] : extra, weapon: gear.weapon, smith };
}
function addXP(v) {
  save.xp += v; let ups = 0;
  while (save.xp >= need(save.level)) { save.xp -= need(save.level); save.level++; save.sp++; ups++; }
  return ups;
}

/* ---------------- items ---------------- */
function rollItem(wave, opt = {}) {
  const slot = opt.slot || (opt.base ? 'weapon' : Math.random() < 0.4 ? 'weapon' : pick(ARMOR_SLOTS));
  return slot === 'weapon' ? rollWeapon(wave, opt) : rollArmor(wave, slot, opt);
}
function rollRarity(tier, min) { const sc = rank('scav'), r = Math.random(), pRare = 0.06 + 0.05 * tier + 0.04 * sc, pMagic = 0.42 + 0.06 * tier + 0.06 * sc; return Math.max(r < pRare ? 2 : r < pRare + pMagic ? 1 : 0, min || 0); }
function rollArmor(wave, slot, opt = {}) {
  const tier = tierOf(wave), A = ARMOR[slot], rar = rollRarity(tier, opt.min);
  const ab = opt.abase && ARMB[opt.abase] && ARMB[opt.abase].slot === slot ? opt.abase : !window.__phLegacy && !opt.plain && Math.random() < ARMB_P ? Object.keys(ARMB).find(k => ARMB[k].slot === slot) : null;   // 1.10.0
  const w = { slot, base: ab || slot, rarity: rar, tier, power: itemPow(wave), affixes: [] };
  const P = A.pool.filter(k => AFX[k].p && !(k === 'proj' && tier === 0)), S = A.pool.filter(k => !AFX[k].p);
  const take = pool => { if (!pool.length) pool = P.length ? P : S; if (!pool.length) return null; const k = pool.splice(Math.floor(Math.random() * pool.length), 1)[0]; const [a, b] = AFX[k].t[tier];
    w.affixes.push({ id: k, v: k === 'proj' ? 1 : Math.max(1, Math.round(irnd(a, b) * A.k)) }); return k; };
  let pre = null, suf = null;
  if (rar === 1) { const m = Math.random(); if (m < 0.4 && P.length) pre = take(P); else if (m < 0.7 && S.length) suf = take(S); else { pre = take(P); suf = take(S); } }
  if (rar === 2) { const n = tier >= 3 ? 4 : irnd(3, 4); for (let i = 0; i < n; i++) take(i === 0 ? P : i === 1 ? S : Math.random() < 0.5 ? P : S); }   // 0.9.0: T4+ rares always roll 4
  w.name = rar === 2 ? `${pick(RARE1)} ${pick(RARE2)}` : [pre && AFX[pre].name, ab ? ARMB[ab].name : A.name, suf && AFX[suf].name].filter(Boolean).join(' ');
  return w;
}
const itemImp = w => { const A = ARMOR[w.slot]; if (!A || w.slot === 'weapon') return {}; const AB = armBase(w) || A, o = {}; for (const k in AB.imp) o[k] = Math.round(AB.imp[k] * IMP_T[w.tier || 0]); return o; };   // 1.10.0: armour bases carry their own implicit
const itemIco = w => (w.slot || 'weapon') === 'weapon' ? w.base : armBase(w) ? w.base : w.slot;
const itemImg = w => (IMG['it_' + itemIco(w)] || IMG[itemIco(w)]).n[0];   // 1.6.0 chunky outlined 10x10 icon (ground, bag, Market, Armory, HUD)
const itemBase = w => (w.slot || 'weapon') === 'weapon' ? BASES[w.base].name : armBase(w) ? armBase(w).name : SLOTN[w.slot];
const UQ2 = { fresh: 0.6 };
function rollUnique(wave, id) {   // 1.1.0
  if (!UNIQ[id]) { const pool = Object.keys(UNIQ).filter(k => !(UNIQ[k].v1132 && window.__phLegacy)); let fresh = []; try { const sn = uqSeen(); fresh = pool.filter(k => !sn.has(k)); } catch (e) {} id = fresh.length && Math.random() < UQ2.fresh ? pick(fresh) : pick(pool); }   // 1.13.2: 60% of drops favour a Unique you have not banked yet const U = UNIQ[id], tier = tierOf(wave), A = ARMOR[U.slot];
  const U = UNIQ[id], tier = tierOf(wave), A = ARMOR[U.slot];
  return { slot: U.slot, base: U.base || U.slot, rarity: 3, tier, power: itemPow(wave), uq: id, name: U.name, affixes: U.afx.map(k => ({ id: k, v: k === 'proj' ? 1 : Math.max(1, Math.round(AFX[k].t[tier][1] * (A ? A.k : 1))) })), locked: true };
}
function rollWeapon(wave, opt = {}) {
  const tier = tierOf(wave), sc = rank('scav');
  const base = opt.base || pick(Object.keys(BASES).filter(k => v110ok(BASES[k])));
  let rar = 0; const r = Math.random();
  const pRare = 0.06 + 0.05 * tier + 0.04 * sc, pMagic = 0.42 + 0.06 * tier + 0.06 * sc;
  if (r < pRare) rar = 2; else if (r < pRare + pMagic) rar = 1;
  rar = Math.max(rar, opt.min || 0);
  const w = { slot: 'weapon', base, rarity: rar, tier, power: itemPow(wave), affixes: [] };
  const P = Object.keys(AFX).filter(k => AFX[k].p && !AFX[k].arm && v110ok(AFX[k]) && !(k === 'proj' && tier === 0)), S = Object.keys(AFX).filter(k => !AFX[k].p && !AFX[k].arm && v110ok(AFX[k]) && (!AFX[k].pj || PROJB[base]));   // 1.1.0: armour-only affixes skip weapons
  const take = (pool) => { const k = pool.splice(Math.floor(Math.random() * pool.length), 1)[0]; const [a, b] = AFX[k].t[tier]; w.affixes.push({ id: k, v: irnd(a, b) }); return k; };
  let pre = null, suf = null;
  if (rar === 1) { const m = Math.random(); if (m < 0.4) pre = take(P); else if (m < 0.7) suf = take(S); else { pre = take(P); suf = take(S); } }
  if (rar === 2) { const n = tier >= 4 ? (Math.random() < 0.25 ? 5 : 4) : tier >= 3 ? 4 : irnd(3, 4); take(P); take(S); take(Math.random() < 0.5 ? P : S); for (let i = 3; i < n; i++) take(P.length && S.length ? (Math.random() < 0.5 ? P : S) : P.length ? P : S); }   // 0.9.0: T4 rares roll 4, T5 4-5
  if (rar === 2) w.name = `${pick(RARE1)} ${pick(RARE2)}`;
  else w.name = [pre && AFX[pre].name, BASES[base].name, suf && AFX[suf].name].filter(Boolean).join(' ');
  return w;
}
const afx = (w, id) => w.affixes.filter(a => a.id === id).reduce((s, a) => s + a.v, 0);
const asGear = g => g && g.base ? { weapon: g } : g;
const gsum = (g, id) => SLOTS.reduce((s, k) => s + (g[k] ? afx(g[k], id) : 0), 0);
const gimp = (g, id) => SLOTS.reduce((s, k) => s + (g[k] ? itemImp(g[k])[id] || 0 : 0), 0);
const heroId = () => (R && R.hero) || save.hero || 'wanderer';
function stats(g) {
  g = asGear(g); const w = g.weapon, A = id => gsum(g, id), I = id => gimp(g, id), hp = HEROES[heroId()].p;
  const S = {
    maxHp: 100 + 12 * rank('vit') + I('hp') + (hp.hp || 0), dmg: (1 + 0.08 * rank('might') + A('dmg') / 100), aspd: 1 + 0.07 * rank('haste') + (A('aspd') + I('aspd')) / 100,
    area: 1 + A('area') / 100, crit: (0.05 + 0.04 * rank('keen') + (A('crit') + I('crit')) / 100 + (hp.crit || 0)), critX: 2 + 0.1 * rank('keen'), proj: A('proj'),
    burn: A('burn') / 100 + (hp.burn || 0), burnX: hp.burnX || 1, chain: A('chain') / 100, leech: A('leech') / 100, echo: A('echo') / 100, frost: A('frost') / 100,
    move: (1 + 0.06 * rank('fleet') + (I('move') + A('spd')) / 100) * (hp.move || 1), pickup: 24 * (1 + 0.2 * rank('fleet') + I('pick') / 100 + (hp.pick || 0)), cd: (1 - 0.08 * rank('arcana')) * (1 - I('cd') / 100),
    dr: Math.min(0.6, I('dr') / 100 + (hp.dr || 0)), novaR: 1 + 0.15 * rank('nova'), freeze: 1.4 + 0.3 * rank('nova') + 0.3 * hrank('w_deep'), dashX: 1 + 0.25 * rank('nova'),
    // 0.7.0 hero-tree hooks (0 unless the current hero owns the node)
    shatter: 0.12 * hrank('w_deep'), gemCd: 0.04 * hrank('w_wind'), wild: hrank('p_wild'), heat: hrank('p_heat') ? 0.25 : 0, pin: hrank('r_pin'), deadeye: 0.08 * hrank('r_dead'), iron: 0.08 * hrank('k_iron'), spike: hrank('k_spike'),
    // 1.1.0 shared nodes, new affixes, new hero nodes
    blood: 0.35 * rank('blood'), splint: 0.15 * rank('splinter'), mom: 0.1 * rank('momentum'), gasp: 0.1 * rank('gasp'), greed: 0.1 * rank('midas') + A('greed') / 100,
    eliteD: A('elite') / 100 + 0.08 * hrank('r_mark'), exec: A('exec') / 100, stun: A('stun') / 100, thorns: A('thorns') / 100 + 0.5 * hrank('k_thorn'),
    echoS: hrank('w_echo'), glacier: hrank('w_glacier'), siphon: 0.25 * hrank('w_siphon'), gale: hrank('w_gale'), crater: hrank('p_crater'), pnova: hrank('p_nova'), phoenix: hrank('p_phoenix'),
    vanish: hrank('r_vanish'), hail: hrank('r_hail'), tail: hrank('r_tail'), rally: 0.03 * hrank('k_rally'), bstorm: hrank('k_storm'), bast: hrank('k_bast'), uq: {},
  };
  for (const k of SLOTS) if (g[k] && g[k].uq && UNIQ[g[k].uq]) S.uq[g[k].uq] = 1;   // 1.1.0 uniques
  if (S.uq.ouro) { S.cd *= 0.85; S.maxHp -= 20; }
  const sc = id => setCount(g, id); S.sets = {}; for (const id in SETS) { const n = sc(id); if (n >= 2) S.sets[id] = n; }   // 1.7.0 set bonuses
  if (S.sets.ashen >= 2) { S.maxHp += 40; S.dr = Math.min(0.6, S.dr + 0.08); } if (S.sets.ashen >= 3) { S.iron += 0.15; S.thorns += 1.5; }
  if (S.sets.storm >= 2) S.chain += 0.15; if (S.sets.storm >= 3) S.storm3 = 4;
  if (S.sets.hunt >= 2) { S.aspd += 0.2; S.move *= 1.1; S.deadeye += 0.1; }
  if (S.sets.grave >= 2) { S.blood += 0.6; S.graveAxe = 0.35; S.dmg *= w.base === 'axe' ? 1.15 : 1; }
  if (S.sets.rime >= 2) { S.frost += 0.2; S.rimeX = 0.15; }
  S.burnX *= 1 + 0.15 * hrank('p_fuel'); const ca = 1 + 0.2 * rank('catal'); S.burn *= ca; S.chain *= ca; S.frost *= ca;   // Hot Coals / Catalyst
  if (R && R.buffs) { if (R.buffs.multi > 0) S.proj += 2; if (R.buffs.leech > 0) S.leech += 0.05; if (R.buffs.fury > 0) S.aspd += 0.2; }
  S.maxHp += A('sturdy'); S.cruel = A('cruel') / 100; S.venom = A('venom') / 100; S.warded = Math.min(0.5, A('warded') / 100); S.pres = Math.min(0.75, (A('antid') + I('pres')) / 100);   // 1.10.0
  S.fork = A('fork') / 100; S.rico = A('rico') / 100; S.glass = 0;   // 1.13.2
  if (S.uq.hydra) S.fork = 1; if (S.uq.gallows) S.rico = 1; if (S.uq.lode) S.pickup *= 2.5; if (S.uq.glass) { S.dmg *= 1.6; S.glass = 0.3; } if (S.uq.twinmoon) { S.proj += 1; S.cd *= 1.2; }
  if (!PROJB[w.base]) S.fork = S.rico = 0;
  const B = BASES[w.base]; S.baseDmg = B.dmg * w.power * S.dmg; S.rate = B.rate * S.aspd; S.range = B.range * (MELEE[w.base] ? S.area : 1) * (hp.range || 1) * (1 + A('reach') / 100);
  return S;
}
// one phone-readable number for "is this better?": dps x toughness x speed x cooldowns
function gearPower(g) {
  g = asGear(g); const S = stats(g);
  return Math.round(dpsEst(g) * Math.sqrt(S.maxHp / 100 / (1 - S.dr)) * (0.5 + 0.5 * S.move) * (1 + (1 / S.cd - 1) * 0.4) * (1 + S.leech * 3) * (1 + Math.min(1, S.thorns) * 0.1));
}
/* 1.13.1 STAT COMPARE (Matt): no single POWER judgment. Line-by-line stats of the loadout with this piece vs what is equipped now. */
const CMP_ROWS = [['DPS', (S, g) => dpsEst(g), 0], ['DAMAGE', S => S.baseDmg, 0], ['ATK / S', S => S.rate, 2], ['HP', S => S.maxHp, 0], ['ARMOR', S => S.dr * 100, 0, '%'], ['CRIT', S => S.crit * 100, 0, '%'], ['CRIT DMG', S => S.critX * 100, 0, '%'],
  ['MOVE', S => S.move * 100, 0, '%'], ['COOLDOWN', S => S.cd * 100, 0, '%', 1], ['RANGE', S => S.range, 0], ['PROJ', S => S.proj, 0], ['LEECH', S => S.leech * 100, 1, '%'], ['THORNS', S => S.thorns, 1], ['BURN', S => S.burn * 100, 0, '%'],
  ['CHAIN', S => S.chain * 100, 0, '%'], ['FROST', S => S.frost * 100, 0, '%'], ['ELITE DMG', S => S.eliteD * 100, 0, '%'], ['EXECUTE', S => S.exec * 100, 0, '%'], ['STUN', S => S.stun * 100, 0, '%'], ['POISON', S => (S.venom || 0) * 100, 0, '%'], ['FORK', S => (S.fork || 0) * 100, 0, '%'], ['RICOCHET', S => (S.rico || 0) * 100, 0, '%'], ['WARDED', S => (S.warded || 0) * 100, 0, '%']];
function statDiff(it, gear = R.gear) { const slot = it.slot || 'weapon', had = !!gear[slot], g2 = Object.assign({}, gear, { [slot]: it }), A = stats(asGear(gear)), B = stats(asGear(g2)), out = [];
  for (const [n, f, dp, u, inv] of CMP_ROWS) { const a = +f(A, gear) || 0, b = +f(B, g2) || 0, m = Math.pow(10, dp), d = Math.round((b - a) * m) / m; if (!d && !(n === 'DPS' && slot === 'weapon')) continue;
    out.push({ n, v: Math.round(b * m) / m, d, u: u || '', good: inv ? d < 0 : d > 0, nw: !had }); } return out; }
function statLinesHtml(it, gear = R.gear) { const L = statDiff(it, gear); if (!L.length) return '<div class="tiny">same stats as equipped</div>';
  return '<div class="slines">' + L.map(l => `<div class="sl"><span>${l.n}</span><b>${l.v}${l.u}</b>${l.nw ? '<em class="eq">new</em>' : l.d ? `<em class="${l.good ? 'up' : 'dn'}">${l.good ? '▲' : '▼'} ${l.d > 0 ? '+' : ''}${l.d}${l.u}</em>` : ''}</div>`).join('') + '</div>'; }
function itemDelta(it, gear = R.gear) { const g2 = Object.assign({}, gear, { [it.slot || 'weapon']: it }); return gearPower(g2) - gearPower(gear); }
function loadoutGear() { const g = emptyGear(); for (const w of (save.armory || [])) { const s = w.slot || 'weapon'; if (!g[s]) g[s] = w; } if (!g.weapon) { const base = save.home && save.home.smithy ? save.home.start : 'wand'; g.weapon = Object.assign(plainWeapon(base || 'wand'), { smith: true }); } return g; }   // 1.17.1: stash compare vs the current loadout (what startKit would equip); empty weapon slot uses the smithy starter so stats() never sees a null weapon
function itemCompareHtml(w, gear, locLbl, cand = true) {   // 1.17.1: one compare block, reused by the in-run bag and the stash
  const slot = w.slot || 'weapon', cur = gear[slot], SN = SLOTN[slot].toUpperCase();
  const dd = cand ? itemDelta(w, gear) : 0, g2 = cand ? Object.assign({}, gear, { [slot]: w }) : gear;
  return `<div class="cmp"><div><div class="tiny">${locLbl} · ${SN}</div>${descItem(w)}</div>`
    + (cand ? `<div><div class="tiny">EQUIPPED · ${SN}</div>${cur ? descItem(cur) : '<div class="tiny">(empty slot: free upgrade)</div>'}</div>` : '') + '</div>'
    + (cand ? `<div class="dps">IF EQUIPPED${cur ? ' (vs current)' : ' (empty slot)'}:</div>` + statLinesHtml(w, gear) : `<div class="dps">${slot === 'weapon' ? `~${dpsEst(g2)} DPS` : 'EQUIPPED'}</div>`)
    + `<div class="pw">power ${gearPower(g2)}${cand && dd ? ` (${dd > 0 ? '+' : ''}${dd})` : ''}</div>`; }
function heirValue(w) { return gearPower(startKit(Array.isArray(w) ? w : [w]).gear); }
function dpsEst(g) {
  g = asGear(g); const w = g.weapon;
  const S = stats(g), B = BASES[w.base]; const n = (w.base === 'xbow' && S.uq.widow ? 5 : B.n0) + S.proj; const crit = 1 + S.crit * (S.critX - 1);
  const extra = B.ex; // splash / cleave / pierce value (1.1.0: per base)
  return Math.round(S.baseDmg * S.rate * n * crit * extra * (1 + (S.fork || 0) * 0.8 + (S.rico || 0) * 0.6) * (1 + S.burn * 0.6 + S.chain * 1.8) * (1 + S.eliteD * 0.25 + S.exec * 0.2 + S.stun * 0.8));
}

/* ---------------- audio (1.8.0: procedural Web Audio engine, 100% bundled: no samples, no network) ----------------
   Graph:  voices -> SFX bus ─┐
           music -> MUS bus -> DUCK ─┴-> MASTER -> glue compressor -> peak limiter -> 12 kHz soft low-pass -> speakers
           MUS (and a few sparkly cues) also feed a dark feedback echo ("space") so the mix is not bone-dry.
   SFX: every cue = 1-3 layered voices (tone and/or filtered noise) with a 3-8 ms attack + exponential release (no clicks),
        +-4% pitch jitter, per-cue cooldown, per-cue voice cap and a global voice cap (busy waves can't stack into mush / clipping).
   Music: a generative sequencer per theme (hub, Ashen Field, Bone Crypt, Frost Spire, raid). Every 4-bar phrase rolls a new chord
        progression (never the same one twice in a row), a motif-based melody (A A' B cadence) and "breath" phrases where the lead rests,
        so there is no audible loop. Layers (bass, drums) follow run intensity (horde size, bosses, raids). Crossfades between themes.
   Mute: ♪ (save.sound) = everything off (AudioContext suspended, no CPU). ♫ (save.music) = music off, SFX stay on. */
let AC = null;
const MIX = { master: 1, sfx: 0.95, mus: 0.42, pauseMus: 0.4, maxVoices: 22, look: 0.5, xfade: 1.6 };
const AUD = { G: null, last: {}, live: {}, n: 0, gemN: 0, gemT: -9, mus: null, old: [], seed: (Math.random() * 1e9) >>> 0, played: 0, dropped: 0, I: 0.3, deadAt: 0 };
function audGraph(ctx) {
  const G = { ctx }, gn = v => { const g = ctx.createGain(); g.gain.value = v; return g; };
  G.out = ctx.createBiquadFilter(); G.out.type = 'lowpass'; G.out.frequency.value = 12000; G.out.Q.value = 0.5;   // shaves fizz off square/saw edges
  G.comp = ctx.createDynamicsCompressor(); G.comp.threshold.value = -18; G.comp.knee.value = 10; G.comp.ratio.value = 4; G.comp.attack.value = 0.006; G.comp.release.value = 0.2;
  G.lim = ctx.createDynamicsCompressor(); G.lim.threshold.value = -3; G.lim.knee.value = 0; G.lim.ratio.value = 20; G.lim.attack.value = 0.001; G.lim.release.value = 0.08;
  G.master = gn(MIX.master); G.master.connect(G.comp); G.comp.connect(G.lim); G.lim.connect(G.out); G.out.connect(ctx.destination);
  G.sfx = gn(MIX.sfx); G.sfx.connect(G.master);
  G.mus = gn(MIX.mus); G.duck = gn(1); G.mus.connect(G.duck); G.duck.connect(G.master);
  G.sp = gn(1); const dl = ctx.createDelay(1); dl.delayTime.value = 0.29; const fb = gn(0.32), lp = ctx.createBiquadFilter(); lp.type = 'lowpass'; lp.frequency.value = 2000; const wet = gn(0.3);
  G.sp.connect(dl); dl.connect(lp); lp.connect(fb); fb.connect(dl); lp.connect(wet); wet.connect(G.master);
  G.musSp = gn(0.45); G.duck.connect(G.musSp); G.musSp.connect(G.sp); G.sfxSp = gn(0.3); G.sfxSp.connect(G.sp);
  const sr = ctx.sampleRate, nb = ctx.createBuffer(1, sr * 2, sr), d = nb.getChannelData(0); let b0 = 0;
  for (let i = 0; i < d.length; i++) { const w = Math.random() * 2 - 1; b0 = 0.6 * b0 + 0.4 * w; d[i] = (w * 0.6 + b0 * 0.7) * 0.8; } G.noise = nb;   // slightly darkened white noise
  return G;
}
// one enveloped voice: linear 3-8 ms attack, exponential decay, hard zero after (click-free start AND end)
function aEnv(G, t, a, v, d, r) { const g = G.ctx.createGain(), p = g.gain; p.setValueAtTime(0, t); p.linearRampToValueAtTime(v, t + a); if (r && d - r > a) p.setTargetAtTime(v * 0.7, t + a, (d - r - a) * 0.6), p.linearRampToValueAtTime(v * 0.6, t + d - r);   /* sustained voices (pads / reeds): soft hold, then release */ p.exponentialRampToValueAtTime(0.0001, t + Math.max(d, a + 0.01)); p.setValueAtTime(0, t + Math.max(d, a + 0.01) + 0.005); return g; }
function aFilt(G, n, type, f, q, f1, fd, t) { const F = G.ctx.createBiquadFilter(); F.type = type; F.frequency.setValueAtTime(f, t); if (f1) F.frequency.exponentialRampToValueAtTime(Math.max(30, f1), t + fd); F.Q.value = q || 0.7; n.connect(F); return F; }
function tone(G, dest, t, o) {
  const c = G.ctx, osc = c.createOscillator(); osc.type = o.w || 'triangle'; osc.frequency.setValueAtTime(o.f, t); if (o.f1) osc.frequency.exponentialRampToValueAtTime(Math.max(20, o.f1), t + (o.fd || o.d)); if (o.det) osc.detune.value = o.det;
  let n = osc; if (o.lp) n = aFilt(G, n, 'lowpass', o.lp, o.q, o.lp1, o.d, t);
  const g = aEnv(G, t, o.a || 0.004, o.v, o.d, o.r); n.connect(g); g.connect(dest); if (o.sp && G.sfxSp) g.connect(G.sfxSp); osc.start(t); osc.stop(t + Math.max(o.d, (o.a || 0.004) + 0.01) + 0.03); return g;
}
function nz(G, dest, t, o) {
  const c = G.ctx, s = c.createBufferSource(); s.buffer = G.noise; s.loop = true;
  const n = aFilt(G, s, o.ft || 'bandpass', o.f, o.q || 1, o.f1, o.fd || o.d, t), g = aEnv(G, t, o.a || 0.003, o.v, o.d); n.connect(g); g.connect(dest); if (o.sp && G.sfxSp) g.connect(G.sfxSp);
  s.start(t, Math.random() * 1.5); s.stop(t + Math.max(o.d, (o.a || 0.003) + 0.01) + 0.03); return g;
}
const MIDI = m => 440 * Math.pow(2, (m - 69) / 12);
const arp = (G, D, t, ms, o) => ms.forEach((m, i) => tone(G, D, t + i * (o.st || 0.07), Object.assign({}, o, { f: MIDI(m) * (o.j || 1), v: o.v * (o.fall ? Math.pow(o.fall, i) : 1) })));
/* SFX table. cd = min seconds between two of the same cue, cap = max overlapping copies, pri = survives the global voice cap,
   duck = [music gain, hold s] for big moments. d = longest layer (voice bookkeeping). */
const SFXR = {
  hit:   { cd: 0.05, cap: 3, d: 0.07, p: (G, D, t, j) => { nz(G, D, t, { ft: 'bandpass', f: 2200 * j, f1: 700, q: 1.2, d: 0.05, v: 0.16 }); tone(G, D, t, { w: 'triangle', f: 240 * j, f1: 110, d: 0.06, v: 0.12 }); } },
  kill:  { cd: 0.06, cap: 3, d: 0.12, p: (G, D, t, j) => { tone(G, D, t, { w: 'triangle', f: 380 * j, f1: 90, d: 0.11, v: 0.14 }); nz(G, D, t, { ft: 'lowpass', f: 1800, f1: 300, d: 0.09, v: 0.13 }); } },
  bigkill: { cd: 0.1, cap: 2, pri: 1, d: 0.4, p: (G, D, t, j) => { tone(G, D, t, { w: 'sine', f: 150 * j, f1: 40, d: 0.38, v: 0.3, a: 0.005 }); nz(G, D, t, { ft: 'lowpass', f: 2400, f1: 160, d: 0.32, v: 0.22 }); tone(G, D, t, { w: 'triangle', f: 520 * j, f1: 130, d: 0.14, v: 0.08 }); } },
  shoot: { cd: 0.05, cap: 2, d: 0.07, p: (G, D, t, j) => { tone(G, D, t, { w: 'triangle', f: 700 * j, f1: 360, d: 0.06, v: 0.08 }); nz(G, D, t, { ft: 'highpass', f: 3500, d: 0.03, v: 0.05 }); } },
  eshot: { cd: 0.08, cap: 2, d: 0.12, p: (G, D, t, j) => { tone(G, D, t, { w: 'sine', f: 560 * j, f1: 300, d: 0.11, v: 0.08 }); nz(G, D, t, { ft: 'bandpass', f: 1300, q: 3, d: 0.06, v: 0.04 }); } },
  zap:   { cd: 0.06, cap: 2, d: 0.09, p: (G, D, t, j) => { tone(G, D, t, { w: 'square', f: 1500 * j, f1: 520, d: 0.08, v: 0.05, lp: 3200 }); nz(G, D, t, { ft: 'bandpass', f: 4200, q: 2, d: 0.05, v: 0.06 }); } },
  gem:   { cd: 0.035, cap: 2, d: 0.1, p: (G, D, t) => { const st = [0, 2, 4, 7, 9, 12, 14, 16, 19][AUD.gemN], f = MIDI(84 + st); tone(G, D, t, { w: 'sine', f, d: 0.09, v: 0.07 }); tone(G, D, t + 0.015, { w: 'sine', f: f * 2, d: 0.05, v: 0.025 }); } },
  coin:  { cd: 0.05, cap: 2, d: 0.13, p: (G, D, t, j) => { tone(G, D, t, { w: 'sine', f: 1568 * j, d: 0.05, v: 0.06 }); tone(G, D, t + 0.045, { w: 'sine', f: 2093 * j, d: 0.08, v: 0.055 }); } },
  hurt:  { cd: 0.09, cap: 1, pri: 1, duck: [0.75, 0.15], d: 0.18, p: (G, D, t, j) => { tone(G, D, t, { w: 'sawtooth', f: 170 * j, f1: 70, d: 0.17, v: 0.22, lp: 900 }); nz(G, D, t, { ft: 'lowpass', f: 900, f1: 200, d: 0.12, v: 0.2 }); } },
  dash:  { cd: 0.08, cap: 2, d: 0.16, p: (G, D, t, j) => { nz(G, D, t, { ft: 'bandpass', f: 500 * j, f1: 2600, q: 1.5, d: 0.15, v: 0.16, a: 0.02 }); tone(G, D, t, { w: 'triangle', f: 200 * j, f1: 480, d: 0.1, v: 0.05 }); } },
  nova:  { cd: 0.1, cap: 2, pri: 1, duck: [0.7, 0.2], d: 0.5, p: (G, D, t, j) => { tone(G, D, t, { w: 'sine', f: 170 * j, f1: 42, d: 0.45, v: 0.3, a: 0.005 }); nz(G, D, t, { ft: 'lowpass', f: 3200, f1: 180, d: 0.45, v: 0.22 }); nz(G, D, t, { ft: 'highpass', f: 5000, d: 0.08, v: 0.05 }); } },
  wind:  { cd: 0.12, cap: 2, d: 0.32, p: (G, D, t, j) => { nz(G, D, t, { ft: 'bandpass', f: 380 * j, f1: 1400, q: 2.5, d: 0.3, v: 0.09, a: 0.12 }); tone(G, D, t, { w: 'triangle', f: 160 * j, f1: 330, d: 0.3, v: 0.035, a: 0.1 }); } },
  drop:  { cd: 0.08, cap: 2, d: 0.16, p: (G, D, t, j) => { tone(G, D, t, { w: 'triangle', f: 660 * j, f1: 990 * j, fd: 0.06, d: 0.15, v: 0.08 }); } },
  rare:  { cd: 0.12, cap: 2, pri: 1, d: 0.5, p: (G, D, t, j) => { arp(G, D, t, [79, 86, 91], { w: 'sine', d: 0.3, v: 0.08, st: 0.06, fall: 0.85, sp: 1, j }); nz(G, D, t + 0.1, { ft: 'highpass', f: 7000, d: 0.25, v: 0.025, a: 0.05 }); } },
  unique: { cd: 0.2, cap: 1, pri: 1, duck: [0.45, 0.9], d: 1.1, p: (G, D, t) => { arp(G, D, t, [76, 83, 88, 91, 95], { w: 'sine', d: 0.7, v: 0.09, st: 0.08, fall: 0.9, sp: 1 }); arp(G, D, t, [76, 83, 88, 91, 95].map(m => m + 12), { w: 'sine', d: 0.25, v: 0.025, st: 0.08 }); tone(G, D, t, { w: 'triangle', f: MIDI(52), d: 1, v: 0.12, a: 0.03 }); nz(G, D, t + 0.15, { ft: 'highpass', f: 6500, d: 0.6, v: 0.03, a: 0.1, sp: 1 }); } },
  swap:  { cd: 0.04, cap: 2, d: 0.07, p: (G, D, t, j) => { tone(G, D, t, { w: 'triangle', f: 560 * j, f1: 840 * j, fd: 0.03, d: 0.06, v: 0.07 }); nz(G, D, t, { ft: 'highpass', f: 4500, d: 0.015, v: 0.03 }); } },
  deny:  { cd: 0.1, cap: 1, d: 0.2, p: (G, D, t) => { tone(G, D, t, { w: 'square', f: 196, d: 0.07, v: 0.06, lp: 900 }); tone(G, D, t + 0.09, { w: 'square', f: 165, d: 0.1, v: 0.06, lp: 900 }); } },
  lvl:   { cd: 0.2, cap: 1, pri: 1, duck: [0.5, 0.7], d: 0.8, p: (G, D, t) => { arp(G, D, t, [72, 76, 79, 84], { w: 'triangle', d: 0.35, v: 0.09, st: 0.075, lp: 4000, sp: 1 }); tone(G, D, t + 0.3, { w: 'sine', f: MIDI(96), d: 0.45, v: 0.035 }); } },
  buff:  { cd: 0.15, cap: 1, pri: 1, d: 0.5, p: (G, D, t, j) => { arp(G, D, t, [76, 81, 88], { w: 'sine', d: 0.3, v: 0.08, st: 0.06, sp: 1, j }); } },
  wave:  { cd: 0.5, cap: 1, pri: 1, duck: [0.7, 0.4], d: 0.55, p: (G, D, t) => { tone(G, D, t, { w: 'triangle', f: MIDI(55), d: 0.2, v: 0.1, lp: 1800, a: 0.02 }); tone(G, D, t + 0.17, { w: 'triangle', f: MIDI(60), d: 0.38, v: 0.11, lp: 1800, a: 0.02, sp: 1 }); } },
  event: { cd: 0.3, cap: 1, pri: 1, duck: [0.65, 0.5], d: 0.6, p: (G, D, t) => { arp(G, D, t, [72, 76, 79], { w: 'sine', d: 0.4, v: 0.08, st: 0.1, sp: 1 }); tone(G, D, t, { w: 'triangle', f: MIDI(48), d: 0.5, v: 0.08 }); } },
  boss:  { cd: 0.35, cap: 1, pri: 1, duck: [0.35, 1.4], d: 1.3, p: (G, D, t) => { tone(G, D, t, { w: 'sine', f: 62, f1: 38, d: 1.2, v: 0.34, a: 0.01 }); tone(G, D, t, { w: 'sawtooth', f: 110, f1: 55, d: 0.9, v: 0.09, lp: 500, a: 0.02 }); tone(G, D, t + 0.02, { w: 'sawtooth', f: 116.5, f1: 58, d: 0.9, v: 0.07, lp: 500, a: 0.02 }); nz(G, D, t, { ft: 'lowpass', f: 600, f1: 120, d: 0.9, v: 0.16 }); } },
  revive: { cd: 0.3, cap: 1, pri: 1, duck: [0.45, 0.9], d: 0.9, p: (G, D, t) => { tone(G, D, t, { w: 'sine', f: 220, f1: 880, d: 0.6, v: 0.12, a: 0.03 }); arp(G, D, t + 0.25, [81, 85, 88, 93], { w: 'sine', d: 0.4, v: 0.06, st: 0.06, sp: 1 }); } },
  extract: { cd: 0.5, cap: 1, pri: 1, duck: [0.3, 1.8], d: 1.6, p: (G, D, t) => { arp(G, D, t, [60, 64, 67, 72, 76], { w: 'triangle', d: 0.5, v: 0.09, st: 0.09, lp: 3500, sp: 1 }); [60, 67, 72, 76].forEach(m => tone(G, D, t + 0.45, { w: 'sine', f: MIDI(m), d: 1.1, v: 0.05, a: 0.05 })); nz(G, D, t + 0.4, { ft: 'highpass', f: 6000, d: 0.8, v: 0.025, a: 0.2, sp: 1 }); } },
  ping: { cd: 0.4, cap: 1, pri: 1, d: 0.45, p: (G, D, t) => { arp(G, D, t, [84, 91], { w: 'sine', d: 0.3, v: 0.07, st: 0.08, sp: 1 }); } },   // 1.18.0 objective ping
  death: { cd: 0.5, cap: 1, pri: 1, duck: [0.05, 2.6], d: 2, p: (G, D, t) => { arp(G, D, t, [67, 63, 60, 55], { w: 'triangle', d: 0.55, v: 0.1, st: 0.22, lp: 1600 }); tone(G, D, t + 0.66, { w: 'sine', f: MIDI(36), d: 1.3, v: 0.22, a: 0.02 }); nz(G, D, t, { ft: 'lowpass', f: 700, f1: 100, d: 0.8, v: 0.14 }); } },
};
const SFX_KINDS = Object.keys(SFXR);
function audWake() {   // call from any user gesture: builds the graph once, resumes the context (Android WebView needs a gesture)
  if (!save.sound) return null; try { if (!AC) { AC = new (window.AudioContext || window.webkitAudioContext)(); } if (!AUD.G || AUD.G.ctx !== AC) AUD.G = audGraph(AC); if (AC.state === 'suspended') AC.resume(); } catch (e) { return null; } return AC;
}
function audDuck(amt, hold) { const G = AUD.G; if (!G || !save.music) return; const p = G.duck.gain, now = G.ctx.currentTime; p.cancelScheduledValues(now); p.setValueAtTime(Math.min(1, p.value), now); p.setTargetAtTime(amt, now, 0.025); p.setTargetAtTime(1, now + hold, 0.35); }
function sfx(kind) {
  if (!save.sound) return; const S = SFXR[kind]; if (!S || !audWake() || !AUD.G) return; const G = AUD.G, now = AC.currentTime;
  if (AUD.last[kind] !== undefined && now - AUD.last[kind] < S.cd) return;
  const L = AUD.live[kind] = (AUD.live[kind] || []).filter(e => e > now); let tot = 0; for (const k in AUD.live) tot += AUD.live[k].filter(e => e > now).length;
  if (L.length >= S.cap || (!S.pri && tot >= MIX.maxVoices)) { AUD.dropped++; return; }
  if (kind === 'gem') { AUD.gemN = now - AUD.gemT < 0.5 ? Math.min(8, AUD.gemN + 1) : 0; AUD.gemT = now; }   // pickup streak climbs a pentatonic scale
  AUD.last[kind] = now; const t = now + 0.005; L.push(t + S.d); AUD.played++;
  try { S.p(G, G.sfx, t, 1 + (Math.random() * 2 - 1) * 0.04); if (S.duck) audDuck(S.duck[0], S.duck[1]); } catch (e) {}
}
/* ---------------- music: generative per-theme sequencer ---------------- */
const THEMES = {   // root = MIDI, sc = mode, prog = chord-degree pools (one bar each), breath = 1-in-N phrases the lead rests
  hub:   { name: 'Campfire', bpm: 72, root: 50, sc: [0, 2, 3, 5, 7, 9, 10], prog: [[0, 3, 4, 0], [0, 5, 3, 4], [0, 6, 3, 4], [5, 3, 0, 4], [0, 2, 3, 6], [3, 4, 0, 0]], pad: { w: 'triangle', lp: 900, v: 0.045 }, bass: { w: 'sine', v: 0.12, pat: 'half' }, lead: { w: 'pluck', o: 24, v: 0.07 }, perc: { shk: 0.5 }, amb: 'fire', breath: 3 },
  ash:   { name: 'Ashen Field', bpm: 90, root: 45, sc: [0, 1, 3, 5, 7, 8, 10], prog: [[0, 5, 6, 0], [0, 3, 5, 6], [0, 6, 5, 4], [0, 1, 0, 6], [5, 6, 0, 0], [0, 3, 1, 0]], pad: { w: 'sawtooth', lp: 650, v: 0.034 }, bass: { w: 'triangle', v: 0.13, pat: 'drive' }, lead: { w: 'reed', o: 24, v: 0.055 }, perc: { kick: 1, tom: 1, hat: 0.5 }, amb: 'ember', breath: 4 },
  crypt: { name: 'Bone Crypt', bpm: 76, root: 38, sc: [0, 2, 3, 5, 7, 8, 11], prog: [[0, 5, 4, 0], [0, 3, 4, 0], [0, 5, 1, 4], [0, 6, 4, 4], [3, 4, 0, 0], [0, 1, 4, 0]], pad: { w: 'organ', lp: 1000, v: 0.04 }, bass: { w: 'sine', v: 0.15, pat: 'heart' }, lead: { w: 'bell', o: 36, v: 0.05 }, perc: { kick: 0.8, hat: 0.25 }, amb: 'drip', breath: 3 },
  frost: { name: 'Frost Spire', bpm: 82, root: 40, sc: [0, 2, 3, 5, 7, 9, 10], prog: [[0, 2, 3, 0], [0, 5, 3, 4], [0, 3, 6, 4], [5, 3, 0, 6], [0, 6, 5, 3], [3, 0, 4, 0]], pad: { w: 'glasspad', lp: 2600, v: 0.04 }, bass: { w: 'sine', v: 0.11, pat: 'half' }, lead: { w: 'glass', o: 36, v: 0.05 }, perc: { kick: 0.6, hat: 0.7 }, amb: 'wind', breath: 3 },
  raid:  { name: 'Raid', bpm: 108, root: 41, sc: [0, 1, 3, 5, 7, 8, 10], prog: [[0, 1, 0, 6], [0, 5, 6, 1], [0, 3, 1, 0], [0, 6, 5, 1]], pad: { w: 'sawtooth', lp: 850, v: 0.04 }, bass: { w: 'sawlp', v: 0.13, pat: 'drive' }, lead: { w: 'reed', o: 24, v: 0.06 }, perc: { kick: 1, tom: 1, hat: 1, sn: 1 }, amb: null, breath: 5 },
};
const RHY = [[1, 0, 1, 0, 1, 1, 0, 0], [1, 0, 0, 1, 0, 0, 1, 0], [1, 1, 0, 1, 0, 0, 0, 0], [0, 0, 1, 0, 1, 0, 1, 1], [1, 0, 0, 0, 1, 0, 1, 0], [1, 0, 1, 1, 0, 0, 1, 0], [0, 1, 0, 1, 1, 0, 0, 0]];
function mulb(a) { return () => { a |= 0; a = a + 0x6D2B79F5 | 0; let t = Math.imul(a ^ a >>> 15, 1 | a); t = t + Math.imul(t ^ t >>> 7, 61 | t) ^ t; return ((t ^ t >>> 14) >>> 0) / 4294967296; }; }
const thHash = s => [...s].reduce((h, c) => Math.imul(h ^ c.charCodeAt(0), 16777619), 2166136261);
const scM = (th, i) => th.root + th.sc[((i % 7) + 7) % 7] + 12 * Math.floor(i / 7);
// one 4-bar phrase: progression (never the previous one), A A' B cadence melody on an 8th grid, breath flag, drum variant
function musPhrase(th, k, seed, prev) {
  const r = mulb((seed ^ Math.imul(k + 1, 2654435761) ^ thHash(th.name)) >>> 0), P = th.prog;
  let pi = Math.floor(r() * P.length); if (P.length > 1 && pi === prev) pi = (pi + 1 + Math.floor(r() * (P.length - 1))) % P.length;
  const prog = P[pi], breath = k > 0 && (k % th.breath === th.breath - 1 || r() < 0.12), ra = RHY[Math.floor(r() * RHY.length)], rb = RHY[Math.floor(r() * RHY.length)];
  const mk = (rh, deg, start, cad) => { const out = []; let cur = start; rh.forEach((on, s) => { if (!on) return; if (out.length) cur += [-2, -1, -1, 1, 1, 2, 0][Math.floor(r() * 7)]; if (s % 4 === 0) { const ct = [deg, deg + 2, deg + 4]; cur = ct.reduce((a, b) => Math.abs(b - cur) < Math.abs(a - cur) ? b : a, ct[0]); }
    cur = clamp(cur, deg - 3, deg + 8); let len = 1; for (let q = s + 1; q < 8 && !rh[q]; q++) len++; out.push({ s, len, d: cur }); }); if (cad && out.length) { const l = out[out.length - 1]; l.d = deg + (r() < 0.5 ? 0 : 7) - (deg > 3 ? 7 : 0); } return out; };
  const st0 = prog[0] + 2 + Math.floor(r() * 3), A = mk(ra, prog[0], st0), B = mk(rb, prog[1], st0 + 1);
  const A2 = A.map(n => ({ s: n.s, len: n.len, d: n.d + (prog[2] - prog[0]) + (r() < 0.3 ? (r() < 0.5 ? 1 : -1) : 0) })), C = mk(RHY[(ra === RHY[0] ? 4 : 0)], prog[3], st0, true);
  const bars = [A, B, A2, C].map((notes, i) => ({ deg: prog[i], notes }));
  return { k, pi, prog, breath, drum: Math.floor(r() * 3), fill: r() < 0.5, bars, sig: pi + '|' + bars.map(b => b.notes.map(n => n.s + ':' + n.d).join(',')).join('/') };
}
function musVoice(G, D, t, kind, f, d, v) {   // instrument palette (all oscillators; no samples)
  if (kind === 'pluck') { tone(G, D, t, { w: 'triangle', f, d: Math.min(d, 0.7), v, lp: 2600, lp1: 700, a: 0.004 }); tone(G, D, t, { w: 'sine', f: f * 2, d: 0.12, v: v * 0.3 }); }
  else if (kind === 'reed') { const r = Math.min(0.15, d * 0.4); tone(G, D, t, { w: 'square', f, d, v: v * 0.8, lp: 1500, a: 0.03, r }); tone(G, D, t, { w: 'triangle', f: f * 1.003, d, v: v * 0.6, a: 0.03, r }); }
  else if (kind === 'bell') { tone(G, D, t, { w: 'sine', f, d: Math.max(0.8, d), v }); tone(G, D, t, { w: 'sine', f: f * 2.76, d: 0.35, v: v * 0.35 }); tone(G, D, t, { w: 'sine', f: f * 5.4, d: 0.12, v: v * 0.12 }); }
  else if (kind === 'glass') { tone(G, D, t, { w: 'sine', f, d: Math.max(0.6, d), v }); tone(G, D, t, { w: 'sine', f: f * 4, d: 0.25, v: v * 0.25 }); tone(G, D, t + 0.01, { w: 'sine', f: f * 1.006, d: Math.max(0.6, d), v: v * 0.4 }); }
  else if (kind === 'organ') { const r = d * 0.3; tone(G, D, t, { w: 'triangle', f, d, v, a: 0.25, r }); tone(G, D, t, { w: 'sine', f: f * 2, d, v: v * 0.5, a: 0.25, r }); tone(G, D, t, { w: 'sine', f: f * 0.5, d, v: v * 0.6, a: 0.3, r }); }
  else if (kind === 'glasspad') { const r = d * 0.35; tone(G, D, t, { w: 'sine', f, d, v, a: 0.5, r }); tone(G, D, t, { w: 'triangle', f: f * 2.003, d, v: v * 0.3, a: 0.6, lp: 2600, r }); }
  else if (kind === 'sawlp') tone(G, D, t, { w: 'sawtooth', f, d, v, lp: 420, a: 0.01 });
  else tone(G, D, t, { w: kind, f, d, v, a: Math.min(0.3, d * 0.25), lp: kind === 'sawtooth' || kind === 'square' ? 900 : 0, r: d > 1.2 ? d * 0.3 : 0 });
}
function musBar(G, D, th, ph, b, t0, I) {   // schedules one bar of `ph` (bar b) at t0 with intensity I (0..1)
  const beat = 60 / th.bpm, bar = beat * 4, e = beat / 2, B = ph.bars[b], deg = B.deg, last = b === 3; let n = 0;
  const chord = [deg, deg + 2, deg + 4].map(i => { let m = scM(th, i) + 12; while (m > 66) m -= 12; while (m < 50) m += 12; return m; });
  if (th.pad.w === 'glasspad') chord[1] = scM(th, deg + 1) + 24 > 70 ? scM(th, deg + 1) + 12 : scM(th, deg + 1) + 24;   // sus2 colour for frost
  for (const m of chord) { musVoice(G, D, t0, th.pad.w, MIDI(m), bar * 1.15, th.pad.v); n++; }
  const bm = scM(th, deg) - 12 * (scM(th, deg) - th.root >= 7 ? 1 : 0), bf = MIDI(bm), bw = th.bass.w, bv = th.bass.v;
  if (th.bass.pat === 'half') { musVoice(G, D, t0, bw, bf, beat * 1.9, bv); musVoice(G, D, t0 + beat * 2, bw, b % 2 && I > 0.4 ? bf * 1.5 : bf, beat * 1.9, bv * 0.85); n += 2; }
  else if (th.bass.pat === 'heart') { for (const q of [0, 2]) { musVoice(G, D, t0 + q * beat, bw, bf, beat * 0.5, bv); musVoice(G, D, t0 + q * beat + beat * 0.35, bw, bf, beat * 0.6, bv * 0.7); n += 2; } }
  else { const st = I > 0.55 ? 1 : 2; for (let s = 0; s < 8; s += st) { musVoice(G, D, t0 + s * e, bw, s === 4 && I > 0.7 ? bf * 2 : bf, e * st * 0.9, bv * (s % 4 ? 0.7 : 1)); n++; } }
  if (!ph.breath && I > 0.12) for (const q of B.notes) { musVoice(G, D, t0 + q.s * e, th.lead.w, MIDI(scM(th, q.d) + th.lead.o - 12), q.len * e * 0.95, th.lead.v); n++; }
  const P = th.perc || {};
  if (P.kick && I >= 0.3) { const ks = ph.drum === 2 && I > 0.6 ? [0, 3, 4, 6] : ph.drum === 1 ? [0, 4, 5] : [0, 4]; for (const s of ks) { tone(G, D, t0 + s * e, { w: 'sine', f: 120, f1: 42, fd: 0.12, d: 0.22, v: 0.15 * P.kick, a: 0.002 }); n++; } }
  if (P.sn && I >= 0.4) for (const s of [2, 6]) { nz(G, D, t0 + s * e, { ft: 'bandpass', f: 1800, q: 0.8, d: 0.12, v: 0.1 }); tone(G, D, t0 + s * e, { w: 'triangle', f: 200, f1: 150, d: 0.08, v: 0.06 }); n += 2; }
  if (P.hat && I >= 0.35) for (let s = 1; s < 8; s += 2) { if (((s * 7 + b * 3 + ph.k) % 10) / 10 < P.hat * I + 0.2) { nz(G, D, t0 + s * e, { ft: 'highpass', f: 7500, d: 0.035, v: 0.035 }); n++; } }
  if (P.shk && b % 2 === 1) for (const s of [2, 3, 6]) { nz(G, D, t0 + s * e, { ft: 'bandpass', f: 5000, q: 1, d: 0.06, v: 0.02 * P.shk, a: 0.01 }); n++; }
  if (P.tom && last && ph.fill && I >= 0.45) for (const [s, f] of [[5, 160], [6, 130], [7, 100]]) { tone(G, D, t0 + s * e, { w: 'sine', f, f1: f * 0.6, d: 0.18, v: 0.13, a: 0.003 }); nz(G, D, t0 + s * e, { ft: 'lowpass', f: 900, d: 0.06, v: 0.05 }); n += 2; }
  const am = th.amb, r = mulb((ph.k * 31 + b * 7 + 11) >>> 0);
  if (am === 'fire' || am === 'ember') { const c = am === 'fire' ? 5 : 3; for (let i = 0; i < c; i++) { nz(G, D, t0 + r() * bar, { ft: 'highpass', f: 2500 + r() * 3000, d: 0.012 + r() * 0.02, v: 0.02 + r() * 0.03, a: 0.001 }); n++; } if (am === 'fire' && b === 0) { nz(G, D, t0, { ft: 'lowpass', f: 400, d: bar * 4, v: 0.025, a: 1 }); n++; } }
  else if (am === 'wind') { nz(G, D, t0, { ft: 'bandpass', f: b % 2 ? 900 : 420, f1: b % 2 ? 420 : 900, fd: bar, q: 4, d: bar * 1.1, v: 0.035, a: bar * 0.4 }); n++; }
  else if (am === 'drip' && r() < 0.7) { const tt = t0 + r() * bar; tone(G, D, tt, { w: 'sine', f: 1800 + r() * 900, f1: 1100, d: 0.07, v: 0.025 }); n++; }
  return n;
}
function musWant() {
  if (mode === 'run' && R) return R.raid ? 'raid' : THEMES[save.map] ? save.map : 'ash';
  if (mode === 'dead' && AC && AC.currentTime - AUD.deadAt < 3.5) return null;   // let the death / extract stinger breathe
  return 'hub';
}
function musIntensity() {
  if (mode !== 'run' || !R) return 0.25; if (paused) return 0.1; if (R.raid) return 1;
  let big = 0; for (const e of R.E) if (e.boss || e.mini || e.warden || e.raidBoss) { big = 1; break; }
  return clamp(0.35 + Math.min(0.3, R.E.length / 140) + 0.3 * big + (R.gate && R.gate.sealed ? 0.1 : 0), 0, 1);
}
function musStop(st, fade) { if (!st || !AUD.G) return; const now = AUD.G.ctx.currentTime, p = st.g.gain; p.cancelScheduledValues(now); p.setValueAtTime(p.value, now); p.linearRampToValueAtTime(0, now + fade); const g = st.g; setTimeout(() => { try { g.disconnect(); } catch (e) {} }, (fade + 4) * 1000); }
function musTick() {   // called every frame: keeps ~0.5 s of music scheduled ahead (bar-sized chunks)
  const on = save.sound && save.music && AC && AUD.G && AC.state === 'running', want = on ? musWant() : null, G = AUD.G;
  if (G) { const tg = on ? MIX.mus * (mode === 'run' && paused ? MIX.pauseMus : 1) : 0; if (Math.abs(G.mus.gain.value - tg) > 0.001 && AUD.musTg !== tg) { AUD.musTg = tg; G.mus.gain.setTargetAtTime(tg, G.ctx.currentTime, 0.15); } }
  if (!AUD.mus && !want) return; if (AUD.mus && AUD.mus.id !== want) { musStop(AUD.mus, want ? MIX.xfade : 0.6); AUD.mus = null; }
  if (!want) return; const now = AC.currentTime;
  if (!AUD.mus) { const g = AC.createGain(); g.gain.setValueAtTime(0, now); g.gain.linearRampToValueAtTime(1, now + MIX.xfade); g.connect(G.mus); const th = THEMES[want]; AUD.mus = { id: want, th, g, k: 0, b: 0, next: now + 0.08, ph: musPhrase(th, 0, AUD.seed, -1), bars: 0 }; }
  const M = AUD.mus; AUD.I += (musIntensity() - AUD.I) * 0.05; if (M.next < now - 0.25) M.next = now + 0.05;   // resync after a suspend / hitch
  while (M.next < now + MIX.look) { musBar(G, M.g, M.th, M.ph, M.b, M.next, AUD.I); M.next += 240 / M.th.bpm; M.bars++; if (++M.b > 3) { M.b = 0; M.k++; M.ph = musPhrase(M.th, M.k, AUD.seed, M.ph.pi); } }
}
function audApply() {   // after ♪ / ♫ changes or app focus
  if (!save.sound) { if (AUD.mus) { musStop(AUD.mus, 0.15); AUD.mus = null; } if (AC && AC.state === 'running') { const c = AC; setTimeout(() => { if (!save.sound && c.state === 'running') c.suspend(); }, 250); } return; }
  audWake(); if (!save.music && AUD.mus) { musStop(AUD.mus, 0.5); AUD.mus = null; }
}
// offline render (tests + NOTES numbers): same graph + recipes into an OfflineAudioContext; returns peak / rms / click metrics
async function audRender(play, secs) {
  const OC = window.OfflineAudioContext || window.webkitOfflineAudioContext; const ctx = new OC(2, Math.ceil(44100 * secs), 44100), G = audGraph(ctx); play(G); const buf = await ctx.startRendering();
  const d = buf.getChannelData(0), d1 = buf.getChannelData(1); let pk = 0, ss = 0, clip = 0, nan = 0;
  for (let i = 0; i < d.length; i++) { const x = Math.max(Math.abs(d[i]), Math.abs(d1[i])); if (!Number.isFinite(x)) { nan++; continue; } if (x > pk) pk = x; if (x >= 0.999) clip++; ss += d[i] * d[i]; }
  let head = 0; for (let i = 0; i < 8; i++) head = Math.max(head, Math.abs(d[i])); let tail = 0; for (let i = d.length - 256; i < d.length; i++) tail = Math.max(tail, Math.abs(d[i]));
  return { peak: +pk.toFixed(4), rms: +Math.sqrt(ss / d.length).toFixed(4), clip, nan, head: +head.toFixed(5), tail: +tail.toFixed(5), len: d.length };
}
const audRenderSfx = (kind, secs = (SFXR[kind].d + 0.6)) => audRender(G => SFXR[kind].p(G, G.sfx, 0.01, 1), secs);
const audRenderMusic = (id, bars = 8, I = 0.6, seed = 7) => { const th = THEMES[id]; return audRender(G => { let ph = musPhrase(th, 0, seed, -1), t = 0.02; for (let i = 0; i < bars; i++) { musBar(G, G.mus, th, ph, i % 4, t, I); t += 240 / th.bpm; if (i % 4 === 3) ph = musPhrase(th, (i + 1) / 4, seed, ph.pi); } }, bars * 240 / th.bpm + 1.5); };

/* ---------------- canvas / view ---------------- */
const cv = $('#cv'), ctx = cv.getContext('2d');
let VW = 400, VH = 180, SCALE = 2;
/* ---------------- 1.9.2 RESOLUTION POLISH (layout / safe area / SCALE only; locked by Matt) ----------------
   SCALE RULE: one game pixel = DSCALE whole *device* pixels (no fractional scaling, so every pixel is the same size: crisp on 2.625x / 2.75x / 3.5x screens).
     DSCALE = round(deviceHeight / 180), minus one if that leaves fewer than 150 game rows (never below 1). => every phone shows ~180 rows (the 400x180 design view):
     HD+ (720 px tall) = 4, FHD+ (1080) = 6, 1.5K (1220-1280) = 7, QHD+ (1440) = 8 -> VH 174..183. VW = ceil(deviceWidth / DSCALE) (20:9 = 400, 19.5:9 = 390, 21:9 = 420).
     Worst case 720x320 CSS @2x = 4 -> 360x160.
     SCALE (CSS px per game px, used by touch input) = DSCALE / devicePixelRatio. The canvas sits at the top-left corner (the < 1 game px of overflow is off the right / bottom edge).
   SAFE AREA: the native shell (MainActivity) draws edge-to-edge under the camera cutout with the status + nav bars hidden (immersive sticky), consumes the insets so the
     WebView never pads twice, and pushes ONE set of insets to JS as window.__phNI = { l, t, r, b, gb } in CSS px: cutout + rounded-corner allowance (l/t/r/b) and the bottom
     gesture strip (gb). JS takes max(native, env(safe-area-inset-*)) (env covers a plain browser / PWA), writes --sa-l/t/r/b/gb CSS vars for the DOM, and SA (game px) for the
     canvas HUD, which draws inside the usable rect (playfield still fills the whole screen). */
const SA = { l: 0, t: 0, r: 0, b: 0, css: { l: 0, t: 0, r: 0, b: 0, gb: 0 }, src: 'none' };
const VIEW_RULE = { target: 180, minVH: 150 };
let DSCALE = 4, FVW = 400, FVH = 180, HUDO = { x: 0, y: 0 };
function viewScale(cssW, cssH, dpr = 1) {
  const dw = Math.round(cssW * dpr), dh = Math.round(cssH * dpr); let ds = Math.max(1, Math.round(dh / VIEW_RULE.target)); if (ds > 1 && dh / ds < VIEW_RULE.minVH) ds--;
  return { ds, dw, dh, VW: Math.ceil(dw / ds), VH: Math.ceil(dh / ds), scale: ds / dpr };
}
let saProbe = null;
function envInsets() {
  try { if (!saProbe) { saProbe = document.createElement('div'); saProbe.id = 'saProbe'; saProbe.style.cssText = 'position:fixed;left:0;top:0;width:0;height:0;visibility:hidden;pointer-events:none;padding:env(safe-area-inset-top,0px) env(safe-area-inset-right,0px) env(safe-area-inset-bottom,0px) env(safe-area-inset-left,0px)'; document.body.appendChild(saProbe); }
    const c = getComputedStyle(saProbe); return { l: parseFloat(c.paddingLeft) || 0, t: parseFloat(c.paddingTop) || 0, r: parseFloat(c.paddingRight) || 0, b: parseFloat(c.paddingBottom) || 0 }; } catch (e) { return { l: 0, t: 0, r: 0, b: 0 }; }
}
function readInsets() {
  const e = envInsets(), n = window.__phNI || null, T = window.__phTestInsets || null, num = v => Math.max(0, Math.min(200, +v || 0));
  const m = k => Math.max(num(e[k]), n ? num(n[k]) : 0, T ? num(T[k]) : 0);
  return { l: m('l'), t: m('t'), r: m('r'), b: m('b'), gb: Math.max(n ? num(n.gb) : 0, T ? num(T.gb) : 0), src: T ? 'test' : n ? 'native' : (e.l || e.t || e.r || e.b) ? 'env' : 'none' };
}
function applyInsets() {
  const I = readInsets(), q = v => Math.ceil(v / SCALE - 0.01); SA.css = I; SA.src = I.src; SA.l = q(I.l); SA.t = q(I.t); SA.r = q(I.r); SA.b = q(I.b);
  const st = document.documentElement.style; for (const k of ['l', 't', 'r', 'b', 'gb']) st.setProperty('--sa-' + k, I[k] + 'px');
}
var HUDLOG = null, INHUD = false; const hudLog = on => { const l = HUDLOG; HUDLOG = on ? [] : null; return l; };   // headless test hook (var: text() can run before this line)
const hudRect = () => ({ x: SA.l, y: SA.t, w: VW - SA.l - SA.r, h: VH - SA.t - SA.b });
function resize() {   // 1.9.2: whole-device-pixel SCALE + safe-area insets (rules above)
  const w = innerWidth, h = innerHeight, dpr = window.devicePixelRatio || 1, V = viewScale(w, h, dpr); DSCALE = V.ds; SCALE = V.scale;
  VW = V.VW; VH = V.VH; FVW = VW; FVH = VH; if (cv.width !== VW) cv.width = VW; if (cv.height !== VH) cv.height = VH; cv.style.width = (VW * DSCALE / dpr) + 'px'; cv.style.height = (VH * DSCALE / dpr) + 'px'; ctx.imageSmoothingEnabled = false;
  applyInsets(); document.documentElement.style.setProperty('--hudTop', ((34 + SA.t) * SCALE) + 'px');
}
addEventListener('resize', resize); addEventListener('orientationchange', () => setTimeout(resize, 120)); addEventListener('phinsets', resize);   // phinsets: MainActivity pushed new insets
try { if (window.visualViewport) visualViewport.addEventListener('resize', resize); } catch (e) {}
resize(); for (const ms of [60, 400, 1200]) setTimeout(resize, ms);   // the WebView can report its final size a beat after load

/* ---------------- run state ---------------- */
/* 0.5.0 bestiary. role = job on the field:
   swarm   fast + fragile, arrives in packs          tank    bulky, slow, knockback-resistant, heavy contact damage
   grunt   plain melee                               charger stops, flashes + shows its dash line (wind-up), dashes straight, then recovers
   ranged  keeps its distance, strafes, aims (aim line + glow) then fires a visible projectile
   mini    map mini-boss (act = which AI it runs), every 5 waves offset from the Colossus (waves 3, 8, 13 ...) */
const ETYPES = {
  slime:  { name: 'SLIME', role: 'swarm', hp: 14, spd: 20, dmg: 8, xp: 1, r: 4, spr: 'slime' },
  rat:    { name: 'ASH RAT', role: 'swarm', hp: 6, spd: 46, dmg: 3, xp: 1, r: 3, spr: 'rat', pack: [3, 4], col: 14 },
  bat:    { name: 'BAT', role: 'swarm', hp: 8, spd: 44, dmg: 5, xp: 1, r: 4, spr: 'bat', pack: [2, 3] },
  skel:   { name: 'SKELETON', role: 'grunt', hp: 30, spd: 28, dmg: 12, xp: 2, r: 4, spr: 'skel' },
  brute:  { name: 'BRUTE', role: 'tank', hp: 120, spd: 17, dmg: 20, xp: 6, r: 7, spr: 'brute', kbr: 0.35 },
  golem:  { name: 'RIME GOLEM', role: 'tank', hp: 160, spd: 13, dmg: 20, xp: 8, r: 8, spr: 'golem', kbr: 0.25, chillHit: 1.5, col: 10 },
  boar:   { name: 'CINDER BOAR', role: 'charger', hp: 40, spd: 24, dmg: 14, xp: 4, r: 5, spr: 'boar', wind: 0.75, dash: 210, dashT: 0.5, trig: 115, col: 3 },
  hound:  { name: 'BONE HOUND', role: 'charger', hp: 34, spd: 27, dmg: 13, xp: 4, r: 5, spr: 'wolf', pal: 'h', wind: 0.65, dash: 220, dashT: 0.45, trig: 110, col: 12 },
  wolf:   { name: 'FROST WOLF', role: 'charger', hp: 32, spd: 30, dmg: 13, xp: 4, r: 5, spr: 'wolf', wind: 0.6, dash: 235, dashT: 0.42, trig: 120, col: 13 },
  imp:    { name: 'EMBER IMP', role: 'ranged', hp: 20, spd: 26, dmg: 10, xp: 3, r: 4, spr: 'imp', shot: 'ember', keep: 82, aim: 0.6, cd: [2.6, 3.6], ps: 80, col: 2 },
  caster: { name: 'BONE CASTER', role: 'ranged', hp: 24, spd: 24, dmg: 11, xp: 3, r: 4, spr: 'caster', shot: 'bone', keep: 92, aim: 0.65, cd: [2.8, 3.8], ps: 85, col: 1 },
  wisp:   { name: 'FROST WISP', role: 'ranged', hp: 16, spd: 34, dmg: 8, xp: 3, r: 4, spr: 'wisp', shot: 'ice', keep: 88, aim: 0.5, cd: [2.4, 3.2], ps: 95, col: 11 },
  warlord:{ name: 'ASH WARLORD', role: 'mini', act: 'charger', hp: 750, spd: 22, dmg: 20, xp: 50, r: 9, sc: 2.2, spr: 'boar', pal: 'g', kbr: 0, wind: 0.7, dash: 230, dashT: 0.55, trig: 160, chain: 2, col: 4 },
  lich:   { name: 'BONE LICH', role: 'mini', act: 'ranged', hp: 450, spd: 20, dmg: 13, xp: 50, r: 8, sc: 2, spr: 'caster', pal: 'b', kbr: 0, shot: 'soul', keep: 70, stand: true, aim: 0.8, cd: [2.8, 3.4], ps: 62, fan: 7, col: 5 },
  troll:  { name: 'FROST TROLL', role: 'mini', act: 'slam', hp: 1100, spd: 18, dmg: 26, xp: 50, r: 10, sc: 2.1, spr: 'golem', pal: 'n', kbr: 0, chillHit: 2, slamR: 52, col: 11 },
  // 1.1.0 bestiary additions
  mason:  { name: 'CINDER MASON', role: 'builder', hp: 46, spd: 20, dmg: 10, xp: 5, r: 5, spr: 'mason', keep: 105, kbr: 0.6, col: 14 },
  tick:   { name: 'BLAST TICK', role: 'bomber', hp: 12, spd: 40, dmg: 22, xp: 2, r: 3, spr: 'tick', pack: [2, 3], boomR: 26, arm: 0.7, col: 3 },
  bloat:  { name: 'CORPSE BLOAT', role: 'splitter', hp: 70, spd: 15, dmg: 14, xp: 5, r: 6, spr: 'bloat', kbr: 0.5, split: 4, col: 6 },
  maggot: { name: 'GRAVE MAGGOT', role: 'swarm', hp: 5, spd: 48, dmg: 4, xp: 1, r: 2, spr: 'maggot', col: 12 },
  wraith: { name: 'WRAITH', role: 'blinker', hp: 28, spd: 28, dmg: 12, xp: 3, r: 4, spr: 'wraith', blink: [4.5, 6.5], col: 1 },
  oracle: { name: 'RIME ORACLE', role: 'support', hp: 44, spd: 22, dmg: 8, xp: 5, r: 5, spr: 'oracle', keep: 120, pulseR: 70, col: 10 },
  goblin: { name: 'GOLD GOBLIN', role: 'event', hp: 70, spd: 44, dmg: 0, xp: 12, r: 4, spr: 'goblin' },
  // 0.8.0 distant installations: static, drawn by drawInst, logic in updateInst. Not kills / not in the bestiary.
  barracks: { name: 'BARRACKS', role: 'struct', hp: 260, spd: 0, dmg: 0, xp: 0, r: 13, spr: 'slime', col: 2 },   // 0.9.0: 160 -> 260 + 20% armour
  catapult: { name: 'CATAPULT', role: 'struct', hp: 220, spd: 0, dmg: 0, xp: 0, r: 12, spr: 'slime', col: 3 },   // 0.9.0: 180 -> 220, fires from 330-400px
  // 0.9.0 Gear Check boss (waves 20 / 40 / 60 ...): HP / damage set in spawnWarden, logic in wardenStep
  warden:   { name: 'WARDEN', role: 'boss', hp: 1, spd: 30, dmg: 22, xp: 0, r: 9, spr: 'golem', kbr: 0, col: 4 },
  // 1.4.0 raid bosses (HP / size / speed set per RAIDS entry in spawnRaidBoss) + raid adds. Not in any wave table.
  ashmaw:   { name: 'ASHMAW', role: 'raid', hp: 1, spd: 22, dmg: 20, xp: 0, r: 15, spr: 'rb_ashmaw', kbr: 0, col: 3 },
  morthal:  { name: 'MORTHAL', role: 'raid', hp: 1, spd: 20, dmg: 20, xp: 0, r: 14, spr: 'rb_morthal', kbr: 0, col: 13 },
  glacia:   { name: 'GLACIA', role: 'raid', hp: 1, spd: 24, dmg: 20, xp: 0, r: 13, spr: 'rb_glacia', kbr: 0, col: 11 },
  vael:     { name: 'VAEL', role: 'raid', hp: 1, spd: 26, dmg: 20, xp: 0, r: 15, spr: 'rb_vael', kbr: 0, col: 1 },
  morr:     { name: 'MORRGHAST', role: 'raid', hp: 1, spd: 24, dmg: 20, xp: 0, r: 16, spr: 'rb_morr', kbr: 0, col: 4 },
  pylon:    { name: 'BONE PYLON', role: 'pylon', hp: 70, spd: 0, dmg: 0, xp: 6, r: 6, spr: 'pylon', kbr: 0, col: 5 },
  hexorb:   { name: 'HEX ORB', role: 'hexer', hp: 40, spd: 20, dmg: 9, xp: 4, r: 4, spr: 'vorb', kbr: 0.4, col: 1 },   // 1.9.4 (spawned by updateHex, not in the wave tables; drawn by drawHexOrb)
  vorb:     { name: 'VOID ORB', role: 'orb', hp: 20, spd: 30, dmg: 0, xp: 2, r: 4, spr: 'vorb', kbr: 0.5, col: 1 },
};
const SHOTC = { bone: PAL[12], ember: PAL[3], ice: PAL[11], soul: PAL[5] };
/* per-map wave tables: [type, first wave, weight(wave)]. early = waves 1-3, mid 4-8, late 9+.
   swarm = surge-ring types, vanguard = tougher types mixed into the surge ring from wave 4, mini = this map's mini-boss */
const TABLES = {   // 1.1.0 refresh: new foes join mid-run and the old swarm thins out late (waves 15+), so late waves read differently
  ash: { mini: 'warlord', swarm: ['slime', 'rat'], vanguard: ['boar', 'brute', 'tick'], start: ['slime', 'slime', 'rat'], cast: [
    ['slime', 1, w => Math.max(1, 10 - 0.8 * w)],
    ['rat',   1, w => w < 15 ? Math.min(9, 2.5 + 0.8 * w) : Math.max(4, 9 - 0.3 * (w - 15))],
    ['boar',  3, w => 1.5 + 0.35 * w],
    ['bat',   4, w => 3],
    ['tick',  4, w => Math.min(6, 1 + 0.3 * w)],
    ['brute', 5, w => 1 + 0.25 * w],
    ['mason', 6, w => Math.min(3, 0.6 + 0.1 * w)],
    ['imp',   7, w => 1.5 + 0.3 * w],
    ['oracle', 11, w => Math.min(3, 0.8 + 0.08 * w)]] },
  crypt: { mini: 'lich', swarm: ['slime', 'bat'], vanguard: ['skel', 'hound', 'bloat'], start: ['slime', 'skel'], cast: [
    ['skel',   1, w => w < 14 ? 5.5 + 0.45 * w : Math.max(5, 11.8 - 0.4 * (w - 14))],
    ['slime',  1, w => Math.max(1, 6 - 0.4 * w)],
    ['caster', 2, w => 1 + 0.3 * w],
    ['bat',    2, w => 4],
    ['bloat',  4, w => Math.min(6, 1 + 0.25 * w)],
    ['hound',  5, w => 1.5 + 0.35 * w],
    ['wraith', 6, w => 1 + 0.25 * w],
    ['brute',  7, w => 0.8 + 0.2 * w],
    ['mason', 10, w => Math.min(3, 0.6 + 0.08 * w)]] },
  frost: { mini: 'troll', swarm: ['bat'], vanguard: ['wolf', 'golem', 'wraith'], start: ['bat'], cast: [
    ['bat',   1, w => w < 12 ? 9 + 0.3 * w : Math.max(5, 12.6 - 0.4 * (w - 12))],
    ['slime', 1, w => Math.max(0, 4 - 0.5 * w)],
    ['wisp',  2, w => 1.5 + 0.4 * w],
    ['golem', 3, w => 1 + 0.25 * w],
    ['tick',  3, w => Math.min(6, 1.5 + 0.3 * w)],
    ['wolf',  5, w => 2 + 0.35 * w],
    ['oracle', 6, w => Math.min(3, 0.8 + 0.1 * w)],
    ['wraith', 9, w => 1 + 0.2 * w],
    ['brute', 9, w => 0.6 + 0.15 * w],
    ['mason', 11, w => Math.min(3, 0.6 + 0.08 * w)]] },
};
Object.assign(ETYPES, {   // 1.10.0 bestiary additions (+ raid bosses 6-8)
  spitter:   { name: 'VENOM SPITTER', role: 'ranged', hp: 22, spd: 24, dmg: 9, xp: 3, r: 4, spr: 'spitter', shot: 'venom', keep: 90, aim: 0.7, cd: [3, 4], ps: 70, col: 6, poison: 1, hint: 'ITS SPIT POISONS - SIDESTEP THE VIOLET GLOB' },
  adder:     { name: 'BLIGHT ADDER', role: 'weaver', hp: 18, spd: 34, dmg: 7, xp: 2, r: 4, spr: 'adder', pack: [2, 3], col: 7, poison: 1, lungeR: 30, rear: 0.4, lunge: 150, lungeT: 0.25 },
  blightcap: { name: 'BLIGHTCAP', role: 'burster', hp: 55, spd: 15, dmg: 6, xp: 5, r: 5, spr: 'blightcap', kbr: 0.7, col: 1 },
  phalanx:   { name: 'SHIELD PHALANX', role: 'guard', hp: 64, spd: 21, dmg: 12, xp: 5, r: 5, spr: 'phalanx', kbr: 0.3, col: 13 },
  hurler:    { name: 'RUBBLE HURLER', role: 'lobber', hp: 50, spd: 18, dmg: 15, xp: 5, r: 5, spr: 'hurler', keep: 115, kbr: 0.6, col: 3 },
  vexmire:   { name: 'VEXMIRE', role: 'raid', hp: 1, spd: 20, dmg: 20, xp: 0, r: 15, spr: 'rb_vexmire', kbr: 0, col: 1 },
  kharos:    { name: 'KHAROS', role: 'raid', hp: 1, spd: 28, dmg: 20, xp: 0, r: 14, spr: 'rb_kharos', kbr: 0, col: 10 },
  skarn:     { name: 'SKARN', role: 'raid', hp: 1, spd: 22, dmg: 20, xp: 0, r: 16, spr: 'rb_skarn', kbr: 0, col: 12 },
});
const CAST110 = {   // 1.10.0: each map gains 4 new kinds mid / late, so late waves get denser in KINDS (ash 9 -> 13, crypt 9 -> 13, frost 10 -> 14)
  ash:   [['adder', 5, w => Math.min(5, 1 + 0.25 * w)], ['blightcap', 7, w => Math.min(3, 0.6 + 0.1 * w)], ['hurler', 9, w => Math.min(3, 0.5 + 0.1 * w)], ['spitter', 12, w => Math.min(4, 0.8 + 0.12 * w)]],
  crypt: [['spitter', 3, w => 1 + 0.25 * w], ['blightcap', 5, w => Math.min(3.5, 0.7 + 0.12 * w)], ['phalanx', 8, w => Math.min(4, 0.8 + 0.15 * w)], ['adder', 11, w => Math.min(5, 1 + 0.2 * w)]],
  frost: [['hurler', 4, w => Math.min(3.5, 0.8 + 0.12 * w)], ['phalanx', 6, w => Math.min(4, 0.8 + 0.15 * w)], ['blightcap', 8, w => Math.min(3, 0.6 + 0.1 * w)], ['adder', 10, w => Math.min(5, 1 + 0.2 * w)]],
};
const VAN110 = { ash: ['adder'], crypt: ['phalanx'], frost: ['phalanx'] };
if (!window.__phLegacy) for (const m in CAST110) { TABLES[m].cast.push(...CAST110[m]); TABLES[m].vanguard.push(...VAN110[m]); }
const MINI_WAVE = w => w % 5 === 3;   // waves 3, 8, 13, 18 ... (Colossus keeps 5, 10, 15 ...)
const ROLE_HINT = { swarm: 'THEY COME IN PACKS', grunt: 'HOLD THE LINE', tank: 'HEAVY HITTER - KEEP AWAY', charger: 'DODGE THE CHARGE LINE', ranged: 'DODGE THE SHOTS',
  builder: 'RAISES WALLS - DASH THROUGH THEM', bomber: 'BLOWS UP - KILL IT OR BACK OFF', splitter: 'BURSTS INTO MAGGOTS', blinker: 'BLINKS NEXT TO YOU - WATCH THE MARK', support: 'SHIELDS ITS PACK - KILL IT FIRST', weaver: 'POISON BITE - DASH SHEDS THE STACKS', burster: 'BURSTS INTO POISON WHEN IT DIES - KILL IT AT RANGE OR STEP AWAY', guard: 'SHIELD BLOCKS THE FRONT - CIRCLE IT', lobber: 'LOBS ROCKS - LEAVE THE SHADOW', hexer: 'STEP OUT OF ITS RING - SIDESTEP ITS BOLT' };   // 1.1.0
const WAVE_LEN = 30;
let R = null, mode = 'hub', paused = false;
const input = { mx: 0, my: 0, keys: {}, stick: null };

function newRun(opt = {}) {
  { const el = document.getElementById('pickov'); if (el) el.hidden = true; }   // 1.14.1: a stale reward pick never survives into a new run
  const RD = opt.raid ? RAID_BY[opt.raid] : null;   // 1.4.0 raid: sealed arena, fixed band wave, raid kit
  const W = RD ? 0 : opt.portal || 0, kit = RD ? raidKit(RD.W, rmStats(rmTier(RD.id)).qm) : startKit(kitArm()), w = kit.weapon, hero = save.heroes[save.hero] ? save.hero : 'wanderer', map = RD ? RD.map : mapsOpen().includes(save.map) ? save.map : 'ash';
  R = { hero, map, M: RD ? Object.assign({}, MAPS[map], { name: RD.arena, hp: 1, loot: 1, spd: 1, dmg: 1, dens: 1, lvl: 0, wd: 1, rise: 1 })   /* 1.5.0: raids ignore zone threat */ : MAPS[map], gear: kit.gear, pend: [], filtered: 0, junked: 0, lives: save.home.life, revives: 0, gold: 0, buffs: {}, frzT: 6, ev: null, evT: 40, evLast: null, evWon: 0, C: [], heirStart: SLOTS.some(k => kit.gear[k] && kit.gear[k].heir),
    t: W ? (W - 1) * WAVE_LEN + 0.5 : 0, wave: W || 1, t0: W ? (W - 1) * WAVE_LEN + 0.5 : 0, w0: W || 1, portal: W ? { W, cost: opt.cost || 0 } : null, gc: null, gcWon: 0, gcLog: [], runBuffs: 0, kills: 0, bosses: 0, xpGained: 0, lvlUps: 0, hxGained: 0, hUps: 0, hLv0: hx(hero).lv, spawnAcc: 0, surged: false, over: false, overT: 0, shake: 0, hitstop: 0, flash: 0, banner: { s: 'WAVE 1', t: 2 },
    p: { x: 0, y: 0, vx: 0, vy: 0, hp: 0, face: 1, inv: 0, hurt: 0, dash: null, anim: 0, atkCd: 0.5, cd1: 0, cd2: 0, aimA: 0, aura: 0, auraT: 0, ward: 0, quick: 0, slowT: 0, mom: 0, galeT: 8, sunT: 5, stillT: 0, auraOn: false, wardOn: false },
    weapon: w, bag: kit.bag, bagNew: 0, S: null, E: [], P: [], EP: [], G: [], I: [], H: [], FX: [], PT: [], TX: [], drops: 0, saveT: 0, eid: 0, minis: 0, rise: [], riseT: 12, hzT: 0.5, onIce: false, bq: [], met: {},
    rq: [], shells: [], gate: null, majCd: 0, barT: EV8.barFirst, catT: EV8.catFirst, gateT: EV8.gateFirst, escSince: EV8.escGap, escVar: null, escN: 0, escWon: 0, instWon: 0, escaped: false, escRes: null,   // 0.8.0
    mk: null, mkT: MK.first, mkN: 0, mkBuys: 0, mkSells: 0, mkSpent: 0, mkEarned: 0, mkGraceCd: 0,   // 1.0.0 market
    walls: [], wallQ: [], wallN: 0, nukes: [], nukeN: 0, uqDrops: 0, hex: {}, hexMax: {}, hexSrc: {}, hexApps: {}, hexN: 0, hexT: HEX.orb.first, zones: [], zoneT: HEX.zone.first, zoneN: 0, zid: 0, zoneMet: {}, tellN: {}, tellMuted: 0, poison: { n: 0, dps: 0, hold: 0, dk: 0, tk: 0.5, dealt: 0, peak: 0 }, poiApps: {}, blights: [], spores: [], lobs: [], blocks: 0, res: defRes(), sig: null, sigT: MSN.first, msN: 0, msWon: 0, msLog: [], kitsUsed: [], pick: null, pickQ: [], rpLog: [], fe: null, feT: FE.first, feN: 0, feWon: 0, feLog: [] };   // 1.14.0 run haul / mage sigil / trial log / deployed kits   // 1.10.0 poison / blightcap / hurler state   // 1.9.4 statuses / hex zones   // 1.1.0
  if (W) { R.barT = R.t + 45; R.catT = R.t + 80; R.gateT = R.t + 120; R.evT = 25; R.mkT = R.t + MK.portalFirst;   // 0.9.0 portal: event clocks restart from the drop (1.0.0: market too)
    if (kit.smith && !kit.smith.heir) { kit.smith.power = +(kit.smith.power * itemPow(Math.max(1, W - PORTAL9.attuneLag))).toFixed(3); kit.smith.name = 'Attuned ' + kit.smith.name; kit.smith.tier = tierOf(Math.max(1, W - PORTAL9.attuneLag)); } }
  R.S = stats(R.gear); R.p.hp = R.S.maxHp;   // 1.13.0: no run-start cover
  if (RD) { R.raid = newRaidState(RD); R.wave = R.w0 = RD.W; R.t = R.t0 = 0; R.p.y = 55; R.lives = Math.min(R.lives, RAID7.lives);   /* 1.7.0 */ R.riseT = 1e9; R.evT = R.barT = R.catT = R.gateT = R.mkT = 1e9; R.majCd = 1e9;
    R.banner = { s: `RAID: ${RD.name} ${RD.title}`, t: 2.6, c: RD.col }; R.bq.push({ s: `${RD.arena} - ${RD.phases.length} PHASES`, t: 1.6, c: '#94b0c2' });
    const nq = SLOTS.filter(k => kit.gear[k] && kit.gear[k].rk).length; if (nq) R.bq.push({ s: `QUARTERMASTER: ${nq} RAID-ISSUED ITEMS`, t: 1.6, c: '#ffcd75' }); { const M = R.raid.rm; if (M.tier) R.bq.push({ s: `REMATCH T${M.tier}: BOSS HP ${rmPct(M.hp)} · HITS ${rmPct(M.dmg)} · LOOT UP`, t: 2, c: '#ffcd75' }); } return; }
  kitsDeploy();   // 1.14.0 crafted field kits (wave runs only)
  if (ON18) init18();   // 1.18.0 heat / solids / flasks
  const st = TABLES[map].start; for (let i = 0; i < 10; i++) { const a = i / 10 * TAU + rnd(-0.2, 0.2); spawnEnemy(st[i % st.length], Math.cos(a) * rnd(110, 150), Math.sin(a) * rnd(80, 110)); }   // 0.5.0: each map opens with its own swarm
  for (const [t, from] of TABLES[map].cast) if (from <= R.wave) R.met[t] = 1;
  if (W) { for (let i = 0; i < PORTAL9.cacheN; i++) { const a = i / PORTAL9.cacheN * TAU - 1.2; dropWeapon(Math.cos(a) * 22, Math.sin(a) * 14, rollItem(Math.max(1, W - PORTAL9.cacheLag), { slot: pick(ARMOR_SLOTS), min: 1 }), true); }   // portal cache: a little behind the fair curve
    R.banner = { s: `PORTAL DROP: WAVE ${W}`, t: 2.6, c: PAL[10] }; R.bq.push({ s: `NEXT GEAR CHECK: WAVE ${nextGear(W)}`, t: 2, c: '#ffcd75' }, { s: 'PORTAL CACHE AT YOUR FEET', t: 1.6, c: '#94b0c2' }); }
  R.bq.push({ s: `EXTRACT TO KEEP GEAR - EXIT GATE AT WAVE ${nextGateWave(R.wave - (isGateWave(R.wave) ? 1 : 0))}`, t: 2, c: PAL[11] });   // 1.7.0
  const nk = SLOTS.filter(k => kit.gear[k] && (kit.gear[k].heir || kit.gear[k].lo)).length + kit.bag.filter(b => b.heir || b.lo).length; if (nk) R.bq.push({ s: `${LOAD.on ? 'LOADOUT' : keepCap() > 1 ? 'FROM THE ARMORY' : 'HEIRLOOM'}: ${nk} ITEM${nk > 1 ? 'S' : ''}`, t: 1.8, c: '#ffcd75' });   // 0.6.0
  if (LOAD.on) R.bq.push({ s: 'DEATH LOSES ALL YOU CARRY - EXTRACT IT', t: 1.8, c: '#94b0c2' });   // 1.13.0
}
function hpMult(w) { return 1 + 0.22 * (w - 1) + 0.02 * (w - 1) ** 2; }
function spawnEnemy(type, x, y, o = {}) {
  if (ON18 && R && !R.raid && ETYPES[type] && ETYPES[type].role !== 'struct') [x, y] = free18(x, y, ETYPES[type].r + 1);   // 1.18.0 never inside a wall / ice
  const T = ETYPES[type], w = R.wave, mw = w + (R.M.lvl || 0), mini = T.role === 'mini', hm = hpMult(mw) * (o.boss ? 40 : o.elite ? 5 : 1) * R.M.hp;   // 1.5.0: zone threat scales from mw (waves deeper)
  const e = { id: ++R.eid, type, x, y, hp: T.hp * hm, maxHp: T.hp * hm, spd: T.spd * (o.elite ? 1.1 : 1) * (1 + 0.012 * Math.min(w, 30)) * (R.M.spd || 1), dmg: T.dmg * (1 + 0.08 * (mw - 1)) * (R.M.dmg || 1) * (o.boss ? 1.8 : o.elite ? 1.5 : 1),
    xp: T.xp * (o.boss ? 60 : o.elite ? 6 : 1) * R.M.loot, r: T.r * (o.boss ? 2.6 : o.elite ? 1.5 : 1), sc: o.boss ? 2.6 : mini ? T.sc : o.elite ? 1.5 : type === 'goblin' ? 1.3 : 1, elite: !!o.elite, boss: !!o.boss, mini,
    spr: T.spr, pal: T.pal || 'n', role: T.role, act: o.boss ? 'boss' : mini ? T.act : T.role, kbr: o.boss ? 0 : T.kbr ?? 1,
    flash: 0, fcd: 0, kx: 0, ky: 0, frozen: 0, chill: 0, burn: null, hitCd: 0, anim: Math.random() * 10, ph: Math.random() * TAU, shootT: o.boss ? rnd(2, 4) : rnd(1.2, 2.6), charge: 0, gob: type === 'goblin', gobT: 22,
    st: 0, stT: 0, cdT: rnd(0.8, 2), dx: 1, dy: 0, chain: T.chain || 0, aim: 0, slam: 0, slamT: rnd(2, 3), sumT: 4, bt: T.role === 'builder' ? rnd(1, 2) : rnd(2, 4), cast: 0, bm: 0, bk: 0, pul: 0, pulT: rnd(2, 4), shT: 0, nukeT: rnd(4, 7) };
  if (T.role === 'guard') { e.guard = true; e.fa = Math.atan2(R.p.y - y, R.p.x - x); }   // 1.10.0 Shield Phalanx facing
  R.E.push(e); return e;
}
function ringPos(dist) { const a = Math.random() * TAU; return [R.p.x + Math.cos(a) * dist, R.p.y + Math.sin(a) * dist]; }
const castAt = (map, w) => (TABLES[map] || TABLES.ash).cast.filter(c => w >= c[1]).map(c => [c[0], c[2](w)]).filter(c => c[1] > 0);
const inCast = (map, t, w) => (TABLES[map] || TABLES.ash).cast.some(c => c[0] === t && w >= c[1]);
function roleCap(role, w) { return role === 'ranged' ? Math.min(10, 2 + Math.floor(w / 2)) : role === 'charger' ? Math.min(12, 3 + Math.floor(w / 2)) : role === 'tank' ? Math.min(8, 1 + Math.floor(w / 3))
  : role === 'builder' ? Math.min(3, 1 + Math.floor(w / 10)) : role === 'support' ? Math.min(3, 1 + Math.floor(w / 12)) : role === 'blinker' ? Math.min(6, 2 + Math.floor(w / 5)) : role === 'bomber' ? Math.min(10, 3 + Math.floor(w / 3)) : role === 'splitter' ? Math.min(6, 1 + Math.floor(w / 4)) : role === 'weaver' ? Math.min(9, 3 + Math.floor(w / 3)) : role === 'burster' ? Math.min(4, 1 + Math.floor(w / 7)) : role === 'guard' ? Math.min(5, 1 + Math.floor(w / 5)) : role === 'lobber' ? Math.min(3, 1 + Math.floor(w / 9)) : 0; }   // 1.1.0 caps for the new roles
function atCap(role) { const c = roleCap(role, R.wave); if (!c) return false; let n = 0; for (const e of R.E) if (e.role === role && !e.elite && !e.boss) n++; return n >= c; }
function pickType(noCap) {   // 0.5.0: weighted pick from this map's table at this wave; capped roles (ranged/charger/tank) fall back to swarm
  const W = castAt(R.map, R.wave); let tot = W.reduce((s, a) => s + a[1], 0), r = Math.random() * tot, k = W[0][0];
  for (const [t, v] of W) { if ((r -= v) < 0) { k = t; break; } }
  if (!noCap && atCap(ETYPES[k].role)) k = (TABLES[R.map] || TABLES.ash).swarm[0];
  return k;
}
function spawnPack(type, x, y) {   // swarm types with a pack size arrive as a little cluster; returns how many spawned
  const T = ETYPES[type], n = T.pack ? irnd(T.pack[0], T.pack[1]) : 1;
  for (let i = 0; i < n; i++) spawnEnemy(type, x + (i ? rnd(-10, 10) : 0), y + (i ? rnd(-8, 8) : 0)); return n;
}
function spawnMini() { const k = (TABLES[R.map] || TABLES.ash).mini, [x, y] = ringPos(spawnDist()); const e = spawnEnemy(k, x, y); if (R.wave < 8) { e.lesser = true; e.hp = e.maxHp *= 0.6; e.dmg *= 0.75; e.chain = Math.min(e.chain, 1); }   // wave-3 visit is a lighter first meeting
  R.banner = { s: `MINI-BOSS: ${ETYPES[k].name}`, t: 2.6, c: PAL[3] }; sfx('boss'); addShake(4); R.majCd = Math.max(R.majCd, 15); return e; }
const onScreen = (e, m = 0) => Math.abs(e.x - R.p.x) < VW / 2 - m && Math.abs(e.y - R.p.y) < VH / 2 - m;
function enemyShoot(e) {
  if (e.hexc && HEX.on && !R.raid) { hexCasterShoot(e); return; }   // 1.9.6
  const T = ETYPES[e.type], p = R.p, oy = e.y - 5 * e.sc, a = Math.atan2(p.y - 4 - oy, p.x - e.x);
  const n = (T.fan && e.lesser ? 5 : T.fan) || ((e.type === 'caster' && R.wave >= 8 ? 3 : 1) + (e.elite ? 2 : 0)), spread = T.fan ? 0.22 : 0.26;
  for (let i = 0; i < n; i++) { const aa = a + (i - (n - 1) / 2) * spread; R.EP.push({ k: T.shot, x: e.x, y: oy, vx: Math.cos(aa) * T.ps, vy: Math.sin(aa) * T.ps, r: T.shot === 'soul' ? 3 : 2, dmg: e.dmg * (T.fan ? 0.6 : 0.8), life: 3.5 }); }
  burst(e.x, oy, SHOTC[T.shot], 5, 25, 0.2); sfx('eshot');
}
/* 0.5.0 light map hazards, deterministic per 64px cell (render + logic agree; nothing near the spawn point).
   ash = ember vents: idle 3s -> glow warning 1s -> erupt 1s, burns the hero AND monsters standing in it.
   frost = ice sheets: the hero moves 38% slower on them. crypt = from wave 3 graves crack open near you and raise skeletons (1.1s telegraph). */
const HZ = 64, VENT_P = 5;
function hazardCell(map, cx, cy) {
  if (Math.abs(cx) <= 1 && Math.abs(cy) <= 1) return null;
  if (map === 'ash') { if (hash(cx + 313, cy - 911) > 0.17) return null; return { k: 'vent', x: cx * HZ + 18 + hash(cx, cy + 5) * 28, y: cy * HZ + 18 + hash(cx + 7, cy) * 28, r: 13, ph: hash(cx - 3, cy + 9) * VENT_P }; }
  if (map === 'frost') { if (hash(cx - 71, cy + 433) > 0.2) return null; return { k: 'ice', x: cx * HZ + 26 + hash(cx, cy + 5) * 12, y: cy * HZ + 26 + hash(cx + 7, cy) * 12, r: 16 + hash(cx, cy - 2) * 6 }; }
  return null;
}
function hazardAt(map, x, y) { const H = hazardCell(map, Math.floor(x / HZ), Math.floor(y / HZ)); if (!H) return null; const dx = (x - H.x) / H.r, dy = (y - H.y) / (H.r * 0.6); return dx * dx + dy * dy <= 1 ? H : null; }
const ventPhase = H => ((R ? R.t : 0) + H.ph) % VENT_P;   // 0-3 idle, 3-4 warning glow, 4-5 erupting
function updateHazards(dt) {
  const p = R.p, w = R.wave;
  R.onIce = R.map === 'frost' && !!hazardAt('frost', p.x, p.y);
  if (R.map === 'ash') { R.hzT -= dt; if (R.hzT <= 0) { R.hzT = 0.5;
    const H = hazardAt('ash', p.x, p.y); if (H && ventPhase(H) >= 4 && p.inv <= 0 && !p.dash) hurt(2 + 0.3 * w);
    for (const e of R.E) { if (e.boss || e.gob || e.inst || e.hp <= 0) continue; const H2 = hazardAt('ash', e.x, e.y); if (H2 && ventPhase(H2) >= 4) hit(e, R.S.baseDmg * 0.6, { proc: false, noCrit: true, col: PAL[3] }); } } }
  if (R.map === 'crypt' && w >= 3) { R.riseT -= dt; if (R.riseT <= 0) { R.riseT = (rnd(10, 13) - Math.min(4, w * 0.2)) * (R.M.rise || 1);
    for (let i = 0, n = w >= 8 ? 2 : 1; i < n; i++) { const [x, y] = ringPos(rnd(55, 110)); R.rise.push({ x, y, t: 1.1, m: 1.1, type: w >= 6 && Math.random() < 0.3 ? 'caster' : 'skel' }); } } }
  for (const q of R.rise) { q.t -= dt; if (Math.random() < 0.4) R.PT.push({ x: q.x + rnd(-5, 5), y: q.y, vx: rnd(-15, 15), vy: rnd(-25, -5), t: 0.35, m: 0.35, c: Math.random() < 0.5 ? '#3b2b2b' : PAL[13], s: 1 });
    if (q.t <= 0) { spawnEnemy(q.type, q.x, q.y); burst(q.x, q.y, PAL[13], 10, 35); } }
  R.rise = R.rise.filter(q => q.t > 0);
}
/* 1.9.4 TELEGRAPH / STATUS PACK (Matt: "punish careless play with readable telegraphs + one status language, not more HP sponges").
   One status table (HEX.st) feeds the Hex Orb, the map hex zones, the HUD tiles, the hero marker and the pause line.
   Statuses are runtime only (R.hex = { key: seconds left }), nothing is saved. Raids get none. __phLegacy turns the pack off for the pre-1.7 suites.
   Hex Orb: a slow flying orb (from wave 4, every map). Near you it stops and shows a 1.6 s ring telegraph (dotted edge + filling disc + its status icon);
   then it pulses: inside the ring (and not dashing / rolling) = its ONE status for 7 s + a light hit. Each spawn takes the next status in the map's rotation.
   Hex zones: timed ground patches with a marching dotted edge + icon + name, 2.5 s warning (no effect) then 11-15 s live. Standing inside keeps the status on;
   it clears ~0.35 s after you step out or the zone ends. Kinds: a CORNER (big rect off one corner of the screen) or a FIELD (ground ellipse). */
const HEX = { on: true,
  st: {
    slow:    { name: 'SLOWED',   d: 'move speed -35%',      c: '#41a6f6', ic: '11111.111...1...1.1.11111' },   // hourglass
    noregen: { name: 'NO REGEN', d: 'no healing of any kind', c: '#a7f070', ic: '.1.1.1111111111.111...1..', x: '....1...1...1...1...1....' },   // heart, red slash
    weak:    { name: 'WEAKENED', d: 'damage dealt -30%',    c: '#ef7d57', ic: '..1....1..1.1.1.111...1..' },   // down arrow
    fragile: { name: 'FRAGILE',  d: 'damage taken +35%',    c: '#b13e53', ic: '111111.1.111.11.1.1...1..' },   // cracked shield
  },
  slowX: 0.65, weakX: 0.7, fragX: 1.35,
  orb: { from: 4, first: 6, cd: [15, 21], max: w => w < 8 ? 1 : w < 16 ? 2 : w < 24 ? 3 : 4,   // 1.12.0: 4 from wave 24
        trig: 50, tele: 1.6, R: 34, dur: 7, rest: [3.5, 5], dmgX: 0.6 },
  zone: { from: 3, first: 12, cd: [22, 30], max: 2, warn: 2.5, life: { rect: 15, field: 11 }, linger: 0.35, r: 36, over: 90 },
  order: { ash: ['fragile', 'slow', 'noregen', 'weak'], crypt: ['noregen', 'weak', 'fragile', 'slow'], frost: ['slow', 'fragile', 'noregen', 'weak'] },   // orb status rotation per map
  zones: {   // [kind, status, from wave] taken in turn
    ash:   [['rect', 'noregen', 3], ['field', 'slow', 3], ['field', 'fragile', 6], ['field', 'weak', 9]],
    crypt: [['rect', 'noregen', 3], ['field', 'weak', 4], ['field', 'fragile', 7], ['field', 'slow', 9]],
    frost: [['field', 'slow', 3], ['rect', 'noregen', 4], ['field', 'fragile', 7], ['field', 'weak', 9]] },
  tint: { ash: '#ef7d57', crypt: '#94b0c2', frost: '#f4f4f4' },   // map tint on the zone dither (the status colour stays the same everywhere)
};
if (window.__phLegacy) HEX.on = false;
const hexOn = k => !!(R && R.hex && R.hex[k] > 0);
/* 1.12.0 STATUS STACKS (like poison): a fresh hit of a status that is already on adds a stack (cap 5) and refreshes the timer.
   Standing in a hex cloud adds +1 stack every 2 s inside. When the timer runs out with 2+ stacks it drops ONE stack and the rest last another 3 s
   (5 stacks = the hit's time + 12 s of tail), so camping under statuses keeps getting worse and takes a while to wear off.
   Per stack n: SLOWED move x(0.65 - 0.075(n-1)) -> 0.35 at 5 | WEAKENED dmg x(0.70 - 0.075(n-1)) -> 0.40 at 5 | FRAGILE taken x(1 + 0.35n) -> 2.75 at 5
   NO REGEN: healing stays OFF at any count (canHeal unchanged); from 2 stacks it ROTS: 1% max HP / s per stack above 1 (4% / s at 5), 0.5 s ticks, ignores DR, never below 1 HP. */
const HXS = { on: !window.__phLegacy, max: 5, step: 3, zoneEvery: 2, slowPer: 0.075, slowMin: 0.35, weakPer: 0.075, weakMin: 0.4, fragPer: 0.35, rot: 0.01, rotTick: 0.5 };
const hexN = k => hexOn(k) ? (HXS.on ? Math.max(1, (R.hexSt && R.hexSt[k]) || 1) : 1) : 0;
const hexSlowMul = () => { const n = hexN('slow'); return n ? Math.max(HXS.slowMin, HEX.slowX - HXS.slowPer * (n - 1)) : 1; };
const hexWeakMul = () => { const n = hexN('weak'); return n ? Math.max(HXS.weakMin, HEX.weakX - HXS.weakPer * (n - 1)) : 1; };
const hexFragMul = () => { const n = hexN('fragile'); return n ? 1 + (HEX.fragX - 1) * n : 1; };
const hexRotDps = () => { const n = hexN('noregen'); return n >= 2 && R ? R.S.maxHp * HXS.rot * (n - 1) : 0; };
function hexStack(k, src) {   // +1 stack on a status that is already on (cap HXS.max)
  if (!HXS.on || !R.hex[k] || !(R.hex[k] > 0)) return 0; if (!R.hexSt) R.hexSt = {}; const n0 = R.hexSt[k] || 1, n = Math.min(HXS.max, n0 + 1); R.hexSt[k] = n; R.hexPeak = Math.max(R.hexPeak || 0, n);
  if (n > n0) { const p = R.p; addText(p.x, p.y - 22, `${HEX.st[k].name} x${n}`, HEX.st[k].c); burst(p.x, p.y - 4, HEX.st[k].c, 6, 30, 0.25); R.hexStacks = (R.hexStacks || 0) + 1;
    if (!R.met.hexstack) { R.met.hexstack = 1; R.bq.push({ s: 'STATUSES STACK: EACH HIT MAKES IT WORSE', t: 1.8, c: HEX.st[k].c }, { s: 'DODGE THE BOLTS, LEAVE THE CLOUDS', t: 1.5, c: '#94b0c2' }); } }
  return n - n0;
}
const HEXLOG = [];   // test hook: the last 300 fresh status applications { k, src, t }
function applyHex(k, t, src) {
  if (!HEX.st[k] || !R || R.over) return false; const was = R.hex[k] > 0, p = R.p; if (!R.hexSt) R.hexSt = {};
  if (!was) R.hexSt[k] = 1; else if (src !== 'zone') hexStack(k, src);   // 1.12.0: re-hit = +1 stack (clouds stack on a timer in updateHex)
  R.hex[k] = Math.max(R.hex[k] || 0, t); R.hexMax[k] = Math.max(was ? R.hexMax[k] || 0 : 0, R.hex[k]); R.hexSrc[k] = src;
  if (!was) { addText(p.x, p.y - 22, HEX.st[k].name + '!', HEX.st[k].c); burst(p.x, p.y - 4, HEX.st[k].c, 10, 35, 0.3); if (src === 'orb') sfx('zap'); }
  if (!was) { R.hexApps[src] = (R.hexApps[src] || 0) + 1; HEXLOG.push({ k, src, t: +R.t.toFixed(2) }); if (HEXLOG.length > 300) HEXLOG.shift(); } return true;
}
function hexNext() { const o = HEX.order[R.map] || HEX.order.ash; return o[R.hexN++ % o.length]; }
function spawnHexOrb(k, x, y) {
  if (x === undefined) [x, y] = ringPos(spawnDist());
  const e = spawnEnemy('hexorb', x, y); e.hexo = true; e.hx = HEX.st[k] ? k : hexNext(); e.hst = 0; e.hT = 0; e.hTM = HEX.orb.tele; e.pulses = 0; e.hits = 0; e.bolts = 0; e.boltT = rnd(HEX.bolt.orbFirst[0], HEX.bolt.orbFirst[1]);   // 1.9.6 status bolts
  if (!R.met.hexorb) { R.met.hexorb = 1; R.bq.push({ s: 'NEW FOE: HEX ORB', t: 1.8, c: PAL[11] }, { s: ROLE_HINT.hexer, t: 1.6, c: '#94b0c2' }); }
  return e;
}
function hexStep(e, dt, d, ux, uy) {   // slow flier: wobble in -> stop + ring telegraph -> pulse -> drift (rest) -> again
  const O = HEX.orb; let sp = e.spd; e.ph += dt * 2; const s = Math.sin(e.ph) * 0.5, nx = ux - uy * s, ny = uy + ux * s, l = Math.hypot(nx, ny) || 1; ux = nx / l; uy = ny / l;
  if (Math.random() < 0.35) R.PT.push({ x: e.x + rnd(-2, 2), y: e.y - 9, vx: -ux * 10, vy: rnd(-6, 2), t: 0.5, m: 0.5, c: HEX.st[e.hx].c, s: 1 });   // status-coloured trail
  if (e.hst === 1) { sp = 0; e.hT -= dt; if (e.hT <= 0) hexPulse(e); }
  else if (e.hst === 3) { sp = 0; orbBoltStep(e, dt, d); }   // 1.9.6 bolt aim
  else if (e.hst === 2) { e.hT -= dt; sp *= 0.6; if (e.hT <= 0) e.hst = 0; }
  else if (d < O.trig && onScreen(e, 6)) { e.hst = 1; e.hT = e.hTM = O.tele; sp = 0; sfx('wind'); }
  else if (orbBoltStep(e, dt, d)) sp = 0;
  return [sp, ux, uy];
}
const inHexRing = (e, x, y) => ((x - e.x) / HEX.orb.R) ** 2 + ((y - e.y) / (HEX.orb.R * 0.6)) ** 2 <= 1;
function hexPulse(e) {
  const O = HEX.orb, p = R.p, c = HEX.st[e.hx].c; e.hst = 2; e.hT = rnd(O.rest[0], O.rest[1]); e.pulses++;
  R.FX.push({ k: 'ring', x: e.x, y: e.y, r: O.R, t: 0.3, m: 0.3, c }); burst(e.x, e.y - 8, c, 16, 50, 0.35); sfx('nova');
  if (inHexRing(e, p.x, p.y) && !p.dash && !R.over) { e.hits++; applyHex(e.hx, O.dur, 'orb'); if (p.inv <= 0) hurt(e.dmg * O.dmgX); return true; }
  return false;
}
function updateHex(dt) {
  const p = R.p;
  if (!R.hexSt) R.hexSt = {};
  for (const k in R.hex) { R.hex[k] -= dt; if (R.hex[k] <= 0 && HXS.on && (R.hexSt[k] || 1) > 1 && !R.over) { R.hexSt[k]--; R.hex[k] = HXS.step; R.hexMax[k] = HXS.step; continue; }   // 1.12.0: drop one stack, the rest linger
    if (R.hex[k] <= 0) { delete R.hex[k]; delete R.hexSt[k]; if ((R.hexMax[k] || 0) > 1.5 && !R.over) addText(p.x, p.y - 22, HEX.st[k].name + ' FADES', '#94b0c2'); delete R.hexMax[k]; delete R.hexSrc[k]; } }
  if (R.raid || !HEX.on) return;
  const w = R.wave, O = HEX.orb, Z = HEX.zone;
  if (w >= O.from) { R.hexT -= dt; if (R.hexT <= 0) { R.hexT = rnd(O.cd[0], O.cd[1]) - Math.min(4, 0.1 * w); if (R.E.filter(e => e.hexo && e.hp > 0).length < O.max(w)) spawnHexOrb(); } }
  if (w >= Z.from) { R.zoneT -= dt; if (R.zoneT <= 0) { R.zoneT = rnd(Z.cd[0], Z.cd[1]); if (R.zones.length < Z.max) spawnZone(); } }
  if (w >= HEX.bolt.cFrom) { R.hcT = (R.hcT ?? HEX.bolt.cFirst) - dt; if (R.hcT <= 0) { R.hcT = rnd(HEX.bolt.cT[0], HEX.bolt.cT[1]) * HEX.bolt.cdX(w, 12); if (R.E.filter(e => e.hexc && e.hp > 0).length < HEX.bolt.cMax(w)) hexTouchCaster(); } }   // 1.9.6 hex casters
  for (const z of R.zones) { z.t += dt; z.on = z.t >= z.warn && z.t < z.warn + z.life; driftZone(z, dt); z.in = z.on && !R.over && inZone(z, p.x, p.y); if (z.in) { z.inT += dt; applyHex(z.k, Z.linger, 'zone'); z.stT = (z.stT || 0) + dt; if (z.stT >= HXS.zoneEvery) { z.stT -= HXS.zoneEvery; hexStack(z.k, 'zone'); } } else z.stT = 0; }
  { const rd = hexRotDps(); if (rd > 0 && !R.over) { R.rotT = (R.rotT ?? HXS.rotTick) - dt; if (R.rotT <= 0) { R.rotT += HXS.rotTick; const h0 = p.hp; if (p.hp > 1) p.hp = Math.max(1, p.hp - rd * HXS.rotTick); R.rotDealt = (R.rotDealt || 0) + h0 - p.hp; if (h0 - p.hp >= 0.5) addText(p.x - 6, p.y - 14, Math.round(h0 - p.hp), HEX.st.noregen.c); } } else R.rotT = HXS.rotTick; }   // 1.12.0 NO REGEN rot
  R.zones = R.zones.filter(z => z.t < z.warn + z.life);
}
/* 1.9.6 HEX FEEL PASS (Matt playtest): clouds not boxes, some fields drift after you, and real status projectiles.
   Zones are now CLOUDS: a union of ellipse puffs (puff ry = 0.72 x its rx) rasterised once at spawn into a 1 px mask; the mask IS the hitbox
   (inZone reads it) and the art (soft fill + map dither + bright edge with a marching sparkle + dark under-edge + status tile).
   - NO REGEN corner: same footprint as 1.9.4 (bounding box off one screen corner) but filled with jittered puffs, scalloped inner edges
     and a big rounded bite out of the corner nearest you (60 x 40 px), so it reads as a fog bank, not a rectangle. Static.
   - slow / fragile / weak fields: one core puff (0.62 r) + 7 ring puffs; always inside the old r = 36 ellipse. From wave 5, half of them DRIFT:
     after the warning they creep toward you at 9 px/s (hero walks 55, 36 when SLOWED) and can only turn 0.55 rad/s; on contact the heading locks for 2 s, so they lag,
     overshoot and pass through you if you stand still; a short side-step always clears them. Drifting clouds leave a wisp trail and their tag grows a small arrow showing where they head.
   - STATUS BOLTS (HEX.bolt): a slow 3 px orb in the status colour with a dark rim and its glyph ring. On hit = that ONE status for 5 s + a light hit.
     Speed 52 px/s, 5 px hitbox (art is bigger than the hitbox), 4.2 s life; nova / revive clear them like any shot; dashing (i-frames) passes through.
     Fired by (a) the Hex Orb from range: when 60-150 px away it stops for a 1.1 s telegraph (aim line of status dots + growing charge, aim locks for the
     last 35 %), then fires one bolt and rests; the close-range ring pulse is unchanged; (b) HEX CASTERS: from wave 6 a ranged foe gets hex-touched every
     10-14 s (1 at a time, 2 from wave 12): status glyph over its head, and its shots become a single 1.0 s-telegraphed status bolt, 2.5 s slower cadence than its normal volley (~6-7 s). */
Object.assign(HEX, {
  bolt: { spd: 52, r: 3, hit: 5, life: 4.2, dur: 5, dmgX: 0.5, tele: 1.1, lock: 0.35, orbMin: 60, orbMax: 150, orbCd: [4.5, 6.5], orbFirst: [1.2, 2.2], rest: [2, 3],
    cFrom: 6, cAim: 1.0, cExtra: 2.5, cT: [10, 14], cFirst: 8, cMax: w => w < 12 ? 1 : w < 20 ? 2 : w < 28 ? 3 : 4, cDmgX: 0.7,
    // 1.12.0 late-game threat: casters fire 2 bolts from wave 18, 3 from 28 (fan 0.2 rad, every line telegraphed); orbs fire a 3-fan from wave 14;
    // orb bolt cooldown and the hex-touch interval shrink 2.5% / wave past 10 / 12 (floor 55%); from wave 20 elites can be hex-touched too.
    fan: 0.2, cFan: w => w < 18 ? 1 : w < 28 ? 2 : 3, oFan: w => w < 14 ? 1 : 3, cdX: (w, from) => Math.max(0.55, 1 - 0.025 * Math.max(0, w - from)), eliteFrom: 20 },
  cloud: { puffRy: 0.72, bite: [60, 40] },
  drift: { from: 5, p: 0.5, spd: 9, turn: 0.55, inX: 0.6, lock: 2 },
});
HEX.zone.cloud = true;
const canHeal = () => !hexOn('noregen') && !(R && R.p && R.p.artNoRegen > 0);   // 1.9.6 + 1.16.0 artillery no-regen ground
const hexLeechMul = e => canHeal() ? (e && e.warden ? WD.leechMul : 1) : 0;   // life steal multiplier: 0 while NO REGEN, else warden resist
function puffMask(z) {   // rasterise z.pf (puffs relative to the mask origin) -> z.mk (Uint8Array), z.mw x z.mh, edge list z.ed
  const W = z.mw, H = z.mh, m = new Uint8Array(W * H), ry = HEX.cloud.puffRy;
  for (const f of z.pf) { const rx = f.r, rr = f.r * ry; for (let y = Math.max(0, Math.floor(f.y - rr)); y <= Math.min(H - 1, Math.ceil(f.y + rr)); y++) for (let x = Math.max(0, Math.floor(f.x - rx)); x <= Math.min(W - 1, Math.ceil(f.x + rx)); x++)
    if (((x + 0.5 - f.x) / rx) ** 2 + ((y + 0.5 - f.y) / rr) ** 2 <= 1) m[y * W + x] = 1; }
  const ed = [], at = (x, y) => x >= 0 && y >= 0 && x < W && y < H && m[y * W + x];
  for (let y = 0; y < H; y++) for (let x = 0; x < W; x++) if (m[y * W + x] && !(at(x - 1, y) && at(x + 1, y) && at(x, y - 1) && at(x, y + 1))) ed.push(x, y);
  z.mk = m; z.ed = ed; z.cv = null; return z;
}
function cornerPuffs(z) {   // fog bank filling the corner box, scalloped, with a rounded bite out of the corner nearest the hero
  const w = z.w, h = z.h, ry = HEX.cloud.puffRy, [B1, B2] = HEX.cloud.bite, pf = [];
  for (let gy = 0; gy <= h + 8; gy += 15) for (let gx = 0; gx <= w + 10; gx += 20) {
    let r = rnd(16, 25), cx = clamp(gx + rnd(-5, 5), r, w - r), cy = clamp(gy + rnd(-4, 4), r * ry, h - r * ry);
    const u = z.sx > 0 ? cx : w - cx, v = z.sy > 0 ? cy : h - cy;   // distance from the inner (hero-side) edges
    if (u < B1 && v < B2 && ((B1 - u) / B1) ** 2 + ((B2 - v) / B2) ** 2 > 0.8) continue;   // the bite
    if (u < 30 || v < 24) { r *= rnd(0.55, 1.05); const iu = rnd(0, 14), iv = rnd(0, 10); if (u < 30) cx += z.sx * iu; if (v < 24) cy += z.sy * iv; }   // ragged, billowing inner edges
    pf.push({ x: cx, y: cy, r });
  }
  z.pf = pf; z.mw = w; z.mh = h; z.mx0 = 0; z.my0 = 0; return puffMask(z);
}
function fieldPuffs(z) {   // core puff + 7 ring puffs, never past the old r x 0.6r ellipse
  const r = z.r, ry = HEX.cloud.puffRy, W = Math.ceil(r) * 2 + 2, H = Math.ceil(r * 0.6) * 2 + 2, ox = W / 2, oy = H / 2, pf = [{ x: ox, y: oy, r: r * 0.62 }], a0 = Math.random() * TAU;
  for (let i = 0; i < 7; i++) { const a = a0 + i / 7 * TAU + rnd(-0.25, 0.25), dr = rnd(0.36, 0.46) * r, pr = Math.min(rnd(0.34, 0.5) * r, 0.83 * (r - dr), r - dr - 0.5);
    pf.push({ x: ox + Math.cos(a) * dr, y: oy + Math.sin(a) * dr * 0.6, r: pr }); }
  z.pf = pf; z.mw = W; z.mh = H; z.mx0 = -ox; z.my0 = -oy; return puffMask(z);
}
function spawnZone(kind, k, o = {}) {
  const Z = HEX.zone, p = R.p, auto = !kind;
  if (!kind) { const L = (HEX.zones[R.map] || HEX.zones.ash).filter(a => R.wave >= a[2]); if (!L.length) return null; const a = L[R.zoneN++ % L.length]; kind = a[0]; k = a[1]; }
  let z;
  if (kind === 'rect') { const sx = Math.random() < 0.5 ? -1 : 1, sy = Math.random() < 0.5 ? -1 : 1, xa = p.x + sx * VW * 0.1, xb = p.x + sx * (VW * 0.5 + Z.over), ya = p.y + sy * VH * 0.12, yb = p.y + sy * (VH * 0.5 + Z.over * 0.7);
    z = { kind, k, x: Math.round(Math.min(xa, xb)), y: Math.round(Math.min(ya, yb)), w: Math.round(Math.abs(xb - xa)), h: Math.round(Math.abs(yb - ya)), sx, sy }; cornerPuffs(z); }
  else { const mv = Math.hypot(input.mx, input.my) > 0.2, a = mv ? Math.atan2(input.my, input.mx) + rnd(-0.6, 0.6) : Math.random() * TAU, dd = rnd(44, 70);
    z = { kind: 'field', k, x: Math.round(p.x + Math.cos(a) * dd), y: Math.round(p.y + Math.sin(a) * dd * 0.7), r: Z.r }; fieldPuffs(z);
    const D = HEX.drift; z.drift = o.drift !== undefined ? !!o.drift : auto && R.wave >= D.from && Math.random() < D.p; if (z.drift) { z.hd = Math.atan2(p.y - z.y, p.x - z.x); z.moved = 0; } }
  Object.assign(z, { id: ++R.zid, t: 0, warn: Z.warn, life: Z.life[z.kind], on: false, in: false, inT: 0 }); R.zones.push(z);
  if (!R.zoneMet[z.k]) { R.zoneMet[z.k] = 1; R.bq.push({ s: `HEX CLOUD: ${HEX.st[z.k].name}`, t: 1.6, c: HEX.st[z.k].c }, { s: z.kind === 'rect' ? 'A CORNER IS FOGGED - KEEP OUT' : 'STEP OUT OF THE CLOUD', t: 1.4, c: '#94b0c2' }); }
  if (z.drift && !R.zoneMet.drift) { R.zoneMet.drift = 1; R.bq.push({ s: 'THIS CLOUD DRIFTS AFTER YOU - SIDESTEP', t: 1.6, c: HEX.st[z.k].c }); }
  return z;
}
const inZone = (z, x, y) => { if (!z.mk) return false; const ix = Math.floor(x - z.x - z.mx0), iy = Math.floor(y - z.y - z.my0); return ix >= 0 && iy >= 0 && ix < z.mw && iy < z.mh && z.mk[iy * z.mw + ix] === 1; };
function driftZone(z, dt) {   // creeps toward the hero with a capped turn rate: lags, overshoots, never sticks
  if (!z.drift || !z.on || R.over) return; const D = HEX.drift, p = R.p, want = Math.atan2(p.y - z.y, p.x - z.x);
  if (z.in && !z.wasIn) z.lockT = D.lock; z.wasIn = z.in; if (z.lockT > 0) z.lockT -= dt;   // on contact it keeps going straight for a while: overshoots instead of orbiting you
  else { const da = ((want - z.hd + Math.PI) % TAU + TAU) % TAU - Math.PI; z.hd += clamp(da, -D.turn * dt, D.turn * dt); }
  const sp = D.spd * (z.in ? D.inX : 1) * dt; z.x += Math.cos(z.hd) * sp; z.y += Math.sin(z.hd) * sp * 0.7; z.moved += sp;
  if (Math.random() < 0.25) R.PT.push({ x: z.x - Math.cos(z.hd) * z.r * 0.8 + rnd(-6, 6), y: z.y - Math.sin(z.hd) * z.r * 0.5 + rnd(-4, 4), vx: -Math.cos(z.hd) * 8, vy: -Math.sin(z.hd) * 6, t: 0.7, m: 0.7, c: HEX.st[z.k].c, s: 1 });
}
/* ---- status bolts ---- */
function hexBolt(src, k, x, y, a, dmg) {
  const B = HEX.bolt, b = { k: 'hex', hx: k, src, x, y, vx: Math.cos(a) * B.spd, vy: Math.sin(a) * B.spd, r: B.r, dmg, life: B.life, ph: Math.random() * TAU };
  R.EP.push(b); burst(x, y, HEX.st[k].c, 8, 30, 0.25); sfx('eshot'); R.hexBolts = (R.hexBolts || 0) + 1; return b;
}
/* 1.13.2 ELITE / BOSS VOLLEYS (Matt): from wave VOL.w elites / mini-bosses / Colossus (not Wardens / raids / installations) cast every VOL.cd s when near:
   0.9 s tell (hazard sigil over the head + a fan of aim lines) -> FAN: VOL.n status bolts (hex system: NO REGEN / SLOWED / ... rotation) at x VOL.spd speed;
   or from wave VOL.ballW (40%): a BIG SLOW BALL (r 7, 26 px/s) that leaves a harmful trail (puddles 2.4 s: tick VOL.trailX x its dmg / 0.5 s + SLOWED). */
const VOL = { w: 12, cd: [7, 10], tele: 0.9, n: 6, nBoss: 8, spd: 1.5, fan: 0.14, range: 170, ballW: 15, ballP: 0.4, ballSpd: 26, ballR: 7, ballX: 1.2, trailDt: 0.22, trailLife: 2.4, trailR: 9, trailX: 0.25, tick: 0.5 };
function volleyStep(e, dt, pd) { if (!(e.elite || e.boss || e.mini) || R.wave < VOL.w || e.inst || e.warden || e.raidBoss || e.hexo || R.raid) return; const p = R.p;
  if (e.volT === undefined) e.volT = rnd(VOL.cd[0], VOL.cd[1]) * 0.6;
  if (e.volC > 0) { e.volC -= dt; if (e.volC > VOL.tele * 0.35) e.volA = Math.atan2(p.y - 4 - (e.y - 8), p.x - e.x); if (e.volC <= 0) volleyFire(e); return; }
  e.volT -= dt; if (e.volT <= 0 && pd < VOL.range && onScreen(e, 8)) { e.volT = rnd(VOL.cd[0], VOL.cd[1]); e.volC = VOL.tele; e.volK = R.wave >= VOL.ballW && Math.random() < VOL.ballP ? 'ball' : 'fan'; e.volH = hexNext(); e.volA = Math.atan2(p.y - 4 - (e.y - 8), p.x - e.x); sfx('wind');
    if (e.volK === 'ball') tell('bigball', { s: 'SLOW ORB: ITS TRAIL BURNS, STEP OFF THE PATH', t: 2, c: PAL[2] }); else tell('volley', { s: 'STATUS VOLLEY: SLIP BETWEEN THE BOLTS', t: 2, c: HEX.st[e.volH].c }); } }
function volleyFire(e) { const x = e.x, y = e.y - 8; R.volN = (R.volN || 0) + 1;
  if (e.volK === 'ball') { R.EP.push({ k: 'bigball', x, y, vx: Math.cos(e.volA) * VOL.ballSpd, vy: Math.sin(e.volA) * VOL.ballSpd, r: VOL.ballR, dmg: e.dmg * VOL.ballX, life: 9, trT: 0, hx: e.volH }); burst(x, y, PAL[2], 14, 40, 0.3); sfx('boss'); R.ballN = (R.ballN || 0) + 1; return; }
  const n = e.boss ? VOL.nBoss : VOL.n; for (let i = 0; i < n; i++) { const b = hexBolt('elite', e.volH, x, y, e.volA + (i - (n - 1) / 2) * VOL.fan, e.dmg * HEX.bolt.dmgX); b.vx *= VOL.spd; b.vy *= VOL.spd; } }
function trailStep(dt) { const T = R.trails || (R.trails = []), p = R.p;
  for (const b of R.EP) if (b.k === 'bigball') { b.trT -= dt; if (b.trT <= 0) { b.trT = VOL.trailDt; T.push({ x: b.x, y: b.y + 4, t: VOL.trailLife, m: VOL.trailLife, dmg: b.dmg * VOL.trailX, hx: b.hx }); } }
  for (const t of T) t.t -= dt; R.trails = T.filter(t => t.t > 0); p.trCd = Math.max(0, (p.trCd || 0) - dt);
  if (p.trCd <= 0 && p.inv <= 0) { const t = R.trails.find(t => (t.x - p.x) ** 2 + ((t.y - p.y) / 0.7) ** 2 < VOL.trailR * VOL.trailR); if (t) { p.trCd = VOL.tick; hurt(t.dmg); applyHex('slow', 1.2, 'trail'); R.trailHits = (R.trailHits || 0) + 1; } } }
function drawVolley(now, X, Y) { for (const t of R.trails || []) { const k = t.t / t.m, c = HEX.st[t.hx] ? HEX.st[t.hx].c : PAL[2]; pxEll(X(t.x), Y(t.y), VOL.trailR * (0.6 + 0.4 * k), VOL.trailR * 0.7 * (0.6 + 0.4 * k), dith(c, 0.25 + 0.4 * k)); if (k > 0.5) pxRing(X(t.x), Y(t.y), VOL.trailR, VOL.trailR * 0.7, 1, dith(PAL[2], 0.5 * k)); }
  for (const e of R.E) if (e.volC > 0) { const k = clamp(1 - e.volC / VOL.tele, 0, 1), ex = X(e.x), ey = Y(e.y) - 8, c = HEX.st[e.volH].c, lock = e.volC <= VOL.tele * 0.35;
    if (e.volK === 'ball') { drawAimLine(ex, ey, e.volA, 120, PAL[2], k, lock, now); pxEll(ex, ey, 2 + 5 * k, 2 + 5 * k, dith(PAL[2], 0.5 + 0.4 * k)); }
    else { const n = e.boss ? VOL.nBoss : VOL.n; for (let i = 0; i < n; i++) drawAimLine(ex, ey, e.volA + (i - (n - 1) / 2) * VOL.fan, 90, c, k, lock, now); }
    dangerMark(ex, ey - 8 * e.sc - 10, e.volK === 'ball' ? PAL[2] : c, 1, now); } }
function drawBigBall(b, bx, by, now) { const r = b.r, w = 1 + Math.sin(now / 90) * 0.8; pxEll(bx, by, r + 2 + w, r + 2 + w, dith(PAL[2], 0.35)); pxEll(bx, by, r, r, '#3a0e1c'); pxEll(bx, by, r - 1, r - 1, dith(PAL[2], 0.75)); pxEll(bx - 1, by - 1, r * 0.5, r * 0.5, PAL[3]); ctx.fillStyle = PAL[4]; ctx.fillRect(bx - 2, by - 2, 2, 2); pxRing(bx, by, r + 1, r + 1, 1, PAL[2]); }
function hexBoltHit(b) { const p = R.p; applyHex(b.hx, HEX.bolt.dur, 'bolt'); burst(p.x, p.y - 4, HEX.st[b.hx].c, 12, 40, 0.3); R.hexBoltHits = (R.hexBoltHits || 0) + 1; }
function orbBoltStep(e, dt, d) {   // Hex Orb at range: 1.1 s aim telegraph (direction locks for the last 35%) -> one bolt -> rest
  const B = HEX.bolt, p = R.p;
  if (e.hst === 3) { e.hT -= dt; if (e.hT > B.tele * B.lock) e.ba = Math.atan2(p.y - 4 - (e.y - 10), p.x - e.x); if (e.hT <= 0) { const nf = B.oFan(R.wave); for (let i = 0; i < nf; i++) hexBolt('orb', e.hx, e.x, e.y - 10, e.ba + (i - (nf - 1) / 2) * B.fan, e.dmg * B.dmgX); e.bolts = (e.bolts || 0) + nf; e.hst = 2; e.hT = rnd(B.rest[0], B.rest[1]); e.boltT = rnd(B.orbCd[0], B.orbCd[1]) * B.cdX(R.wave, 10); } return true; }
  if (e.hst === 0) { e.boltT -= dt; if (e.boltT <= 0 && d >= B.orbMin && d <= B.orbMax && onScreen(e, 8) && !R.over) { e.hst = 3; e.hT = e.hTM = B.tele; e.ba = Math.atan2(p.y - 4 - (e.y - 10), p.x - e.x); sfx('wind'); return true; } }
  return false;
}
function hexTouchCaster() {   // give one on-screen, plain ranged foe a status: its shots become telegraphed status bolts
  const B = HEX.bolt, L = R.E.filter(e => e.hp > 0 && e.role === 'ranged' && e.act === 'ranged' && !ETYPES[e.type].poison && (!e.elite || R.wave >= B.eliteFrom) && !e.boss && !e.mini && !e.hexc && onScreen(e, 10));
  if (!L.length) return null; const e = pick(L), o = HEX.order[R.map] || HEX.order.ash; e.hexc = o[(R.hcN = (R.hcN || 0) + 1) % o.length]; burst(e.x, e.y - 6, HEX.st[e.hexc].c, 14, 35, 0.4);
  if (!R.met.hexcaster) { R.met.hexcaster = 1; R.bq.push({ s: 'HEX CASTER: ITS SHOTS CURSE', t: 1.8, c: HEX.st[e.hexc].c }, { s: 'WATCH THE COLOURED LINE - SIDESTEP THE ORB', t: 1.6, c: '#94b0c2' }); }
  return e;
}
function hexCasterShoot(e) { const p = R.p, oy = e.y - 5 * e.sc, B = HEX.bolt, a = e.ba ?? Math.atan2(p.y - 4 - oy, p.x - e.x), nf = B.cFan(R.wave); for (let i = 0; i < nf; i++) hexBolt('caster', e.hexc, e.x, oy, a + (i - (nf - 1) / 2) * B.fan, e.dmg * B.cDmgX); }
/* ---- 1.9.6 drawing ---- */
function cloudCanvas(z) {   // baked once per zone: soft fill (stronger 2 px band inside the rim), map-tint dither, dim rim + dark under-edge
  if (z.cv) return z.cv; const W = z.mw, H = z.mh, m = z.mk, c = document.createElement('canvas'); c.width = W; c.height = H + 1; const x = c.getContext('2d'), id = x.createImageData(W, H + 1), d = id.data;
  const [r, g, b] = hexRGB(HEX.st[z.k].c), [tr, tg, tb] = hexRGB(HEX.tint[R.map] || HEX.tint.ash), at = (i, j) => i >= 0 && j >= 0 && i < W && j < H && m[j * W + i];
  const put = (i, j, R_, G, B_, A) => { const o = (j * W + i) * 4; d[o] = R_; d[o + 1] = G; d[o + 2] = B_; d[o + 3] = A; };
  for (let j = 0; j < H; j++) for (let i = 0; i < W; i++) { if (!m[j * W + i]) { if (j > 0 && at(i, j - 1)) put(i, j, 11, 11, 20, 70); continue; }   // under-edge shadow
    let near = 0; for (let q = 1; q <= 3 && !near; q++) if (!at(i - q, j) || !at(i + q, j) || !at(i, j - q) || !at(i, j + q)) near = q;
    if (near === 1) put(i, j, r, g, b, 150); else if (near) put(i, j, r, g, b, near === 2 ? 95 : 70);
    else if ((i % 3 === 0) && (j % 3 === 0) && ((i / 3 + j / 3) & 1) === 0) put(i, j, tr, tg, tb, 95); else put(i, j, r, g, b, 40); }
  if (H >= 0) for (let i = 0; i < W; i++) if (at(i, H - 1)) put(i, H, 11, 11, 20, 70);
  x.putImageData(id, 0, 0); return (z.cv = c);
}
function drawHexZones(X, Y, now) {
  const hx = X(R.p.x), hy = Y(R.p.y);
  for (const z of R.zones) { if (!z.mk) continue; const S = HEX.st[z.k], c = S.c, warn = z.t < z.warn, left = z.warn + z.life - z.t, blink = (warn || left < 2) && Math.floor(now / (warn ? 120 : 90)) % 2, mo = Math.floor(now / 110);
    const ox = Math.round(X(z.x + z.mx0)), oy = Math.round(Y(z.y + z.my0)); z.sox = ox; z.soy = oy; if (ox > VW || oy > VH || ox + z.mw < 0 || oy + z.mh < 0) continue;   // (screen origin kept for tests)
    const fade = Math.min(1, z.t / 0.4) * (left < 0.5 ? left / 0.5 : 1);
    ctx.globalAlpha = (warn ? 0.45 : 1) * fade; ctx.drawImage(cloudCanvas(z), ox, oy);
    ctx.fillStyle = c; const E = z.ed;   // rim: every edge pixel, a marching sparkle brighter
    ctx.globalAlpha = (blink ? 0.3 : warn ? 0.6 : 0.85) * fade; for (let i = 0; i < E.length; i += 2) { const ex = ox + E[i], ey = oy + E[i + 1]; if (ex < 0 || ey < 0 || ex >= VW || ey >= VH) continue; ctx.fillRect(ex, ey, 1, 1); }
    ctx.fillStyle = '#f4f4f4'; ctx.globalAlpha = (blink ? 0.15 : 0.5) * fade; for (let i = 0; i < E.length; i += 2) { const ex = ox + E[i], ey = oy + E[i + 1]; if ((E[i] + E[i + 1] * 2 + mo) % 9 !== 0 || ex < 0 || ey < 0 || ex >= VW || ey >= VH) continue; ctx.fillRect(ex, ey, 1, 1); }
    let tx, ty;
    if (z.kind === 'rect') { const x0 = X(z.x), y0 = Y(z.y), x1 = x0 + z.w, y1 = y0 + z.h, ax = Math.max(0, x0), ay = Math.max(0, y0), bx = Math.min(VW, x1), by = Math.min(VH, y1); if (bx <= ax || by <= ay) { ctx.globalAlpha = 1; continue; }
      const ins = inZone(z, R.p.x, R.p.y); tx = clamp(hx + (ins ? z.sx * 22 - 4 : z.sx * 30 - 4), ax + 3, bx - 12); ty = clamp(hy + (ins ? z.sy * 16 - 4 : z.sy * 26 - 4), ay + 3, by - 12);
      for (let n = 0; n < 6 && !inZone(z, R.p.x + tx + 4 - hx, R.p.y + ty + 4 - hy); n++) { tx = clamp(tx + z.sx * 8, ax + 3, bx - 12); ty = clamp(ty + z.sy * 5, ay + 3, by - 12); } }   // tag sits on the cloud, near you
    else { tx = X(z.x) - 4; ty = Y(z.y) - 5; }
    ctx.globalAlpha = fade; drawHexTile(z.k, Math.round(tx), Math.round(ty));
    text(ctx, warn ? `${S.name} ${Math.ceil(z.warn - z.t)}` : S.name, Math.round(tx + 4), Math.round(ty) + (ty > VH / 2 ? -8 : 11), c, 1, 'c');
    if (z.drift) { const cx = Math.round(tx) + 4, cy = Math.round(ty) + 4, ux = Math.cos(z.hd), uy = Math.sin(z.hd), bob = Math.floor(now / 250) % 2; ctx.fillStyle = c;   // drift arrow off the tag, pointing where the cloud is heading
      for (const dd of [8, 10, 12]) ctx.fillRect(Math.round(cx + ux * (dd + bob)) , Math.round(cy + uy * (dd + bob)), 1, 1); for (const sg of [-1, 1]) ctx.fillRect(Math.round(cx + ux * (10 + bob) - uy * 2 * sg), Math.round(cy + uy * (10 + bob) + ux * 2 * sg), 1, 1); }
  }
  ctx.globalAlpha = 1;
}
function drawHexBolt(b, bx, by, now) {   // status orb: dark rim, colour core with a white glint, 3 glyph-colour sparks circling, short trail
  const c = HEX.st[b.hx].c, l = Math.hypot(b.vx, b.vy) || 1, ux = b.vx / l, uy = b.vy / l, pul = Math.floor(now / 110) % 2;
  ctx.fillStyle = c; ctx.globalAlpha = 0.45; for (let i = 3; i <= 9; i += 3) ctx.fillRect(Math.round(bx - ux * i), Math.round(by - uy * i), 1, 1); ctx.globalAlpha = 1;
  ctx.fillStyle = '#0b0b14'; ctx.fillRect(bx - 3, by - 2, 7, 5); ctx.fillRect(bx - 2, by - 3, 5, 7);
  ctx.fillStyle = c; ctx.fillRect(bx - 2, by - 1, 5, 3); ctx.fillRect(bx - 1, by - 2, 3, 5); ctx.fillStyle = pul ? '#f4f4f4' : c; ctx.fillRect(bx - 1, by - 1, 1, 1);
  ctx.fillStyle = c; for (let i = 0; i < 3; i++) { const a = now / 160 + i * TAU / 3 + (b.ph || 0); ctx.fillRect(Math.round(bx + Math.cos(a) * 5), Math.round(by + Math.sin(a) * 4), 1, 1); }
}
function drawAimLine(x0, y0, a, L, c, k, lock, now) {   // status-colour dotted aim line + end cap; blinks once the aim is locked
  ctx.fillStyle = c; ctx.globalAlpha = lock && Math.floor(now / 80) % 2 ? 0.55 : 0.35 + 0.6 * k; const s = lock ? 3 : 2, cx = Math.cos(a), cy = Math.sin(a);
  for (let i = 8; i < L; i += 5) ctx.fillRect(Math.round(x0 + cx * i) - (s >> 1), Math.round(y0 + cy * i) - (s >> 1), s, s);
  ctx.globalAlpha = 1;
}
/* 1.10.0 CONTENT DEPTH II (+ POISON). Matt lock via Grok Bot. All runtime, nothing saved (save stays v13).
   POISON (POI): distinct from HEX. Some foes stack poison on you (Blight Adder bite, Venom Spitter glob, Blightcap burst / spores, Vexmire raid venom).
     stacks: +1 per bite / glob (cap 6). Each stack ticks 5% of the applier's hit per second (0.5 s ticks), x (1 - poison resist), x (1 - half your DR), FRAGILE x1.35.
     decay: 2.5 s after the last new stack, it loses 1 stack every 1.2 s (6 stacks clear in ~9.7 s). Poison never takes you below 1 HP (pressure, not a kill).
     counterplay: your quick ability (DASH / METEOR / ROLL / CHARGE) sheds 2 stacks; a Hearth revive clears it; Talisman / of the Antidote resist it.
     HUD: a violet tile with a droplet + the stack count (+ decay bar) in the buff row; violet pips over the hero; violet tick numbers.
   DEATH PUNISH (Blightcap): its burst radius is drawn around it while alive. When it dies the corpse swells for 1.0 s (filling violet ring + "!"), then bursts:
     inside = 3 poison stacks + a hit (1.5x its touch), and a spore cloud lingers 3 s (+1 stack per 0.5 s inside). Kill it at range or step out during the swell.
   NEW FOES: Blight Adder (weaver: serpentine, rears 0.4 s then lunges, poison bite), Venom Spitter (ranged poison globs), Blightcap (death burst),
     Shield Phalanx (guard: its shield blocks 75% of hits from the front +-63 deg, turns 0.9 rad/s, +20% from behind; a returning Chakram hits its back),
     Rubble Hurler (lobber: winds up 0.55 s, lobs a rock at where you are heading; a shadow ring shows the landing for 1.25 s; ice rocks chill on Frost Spire).
   NEW GEAR: Moon Chakram (returning blade, pierces out and back), Blight Darts (twin darts, every hit envenoms: foe DoT 25% weapon dmg / s per stack, 5 stacks, 3 s).
     8 armour bases (one variant per slot, 35% of armour drops). 6 affixes: Cruel, Far-Reaching, of Venom (weapons), Sturdy, Warded, of the Antidote (armour). */
/* 1.12.0 COMBAT CEILING: the cap goes 6 -> 24 (careless late play stacks much higher). Decay scales with the pile so it still clears:
   -1 stack / 1.2 s up to 8 stacks, -2 at 9-16, -3 at 17+. The quick ability sheds max(2, 25% of the stacks). Floor at 1 HP, DASH shed, antidote, revive clear: unchanged. */
const POI = { on: !window.__phLegacy, c: '#c86ad8', lt: '#f0c8f4', dk: '#5d275d', max: 24, shedPct: 0.25, decayN: n => n > 16 ? 3 : n > 8 ? 2 : 1, per: 0.05, tick: 0.5, hold: 2.5, decay: 1.2, floor: 1, shed: 2, drX: 0.5, raidRef: 0.2, raidHit: 2 };
const VEN = { max: 5, per: 0.25, dur: 3, tick: 0.5 };   // foe poison (Blight Darts / of Venom)
const BL = { r: 34, tele: 1.0, stacks: 3, hitX: 1.5, refX: 2, cloud: 3, cloudR: 0.8, tick: 0.5 };
const GUARD = { arc: 1.1, mul: 0.25, back: 1.2, turn: 0.9 };
const LOB = { wind: 0.55, t: 1.25, r: 18, cd: [4, 5.5], range: 190, lead: 18, peak: 46 };
const WEAVE = { cd: [1.2, 2] };
SHOTC.venom = POI.c;
const R110 = () => { if (!R.poison) R.poison = { n: 0, dps: 0, hold: 0, dk: 0, tk: POI.tick, dealt: 0, peak: 0 }; if (!R.poiApps) R.poiApps = {}; if (!R.blights) R.blights = []; if (!R.spores) R.spores = []; if (!R.lobs) R.lobs = []; return R.poison; };
function addPoison(n, ref, src) {
  if (!POI.on || !R || R.over || !(n > 0)) return 0; const P = R110(), was = P.n, p = R.p;
  P.n = Math.min(POI.max, P.n + n); P.dps = Math.max(was > 0 ? P.dps : 0, POI.per * (ref || 0)); P.hold = POI.hold; P.dk = POI.decay; if (!was) P.tk = POI.tick; P.peak = Math.max(P.peak, P.n);
  R.poiApps[src] = (R.poiApps[src] || 0) + 1; addText(p.x, p.y - 22, `POISON x${P.n}`, POI.c); burst(p.x, p.y - 4, POI.c, 6, 25, 0.3);
  if (!R.met.poison) { R.met.poison = 1; R.bq.push({ s: 'POISONED: IT STACKS, THEN WEARS OFF', t: 1.8, c: POI.c }, { s: 'DASH (QUICK ABILITY) SHEDS 2 STACKS', t: 1.6, c: '#94b0c2' }); }
  return P.n - was;
}
function shedPoison(n) { const P = R && R.poison; if (!P || !P.n) return 0; const k = Math.min(n, P.n); P.n -= k; P.shed = (P.shed || 0) + k; if (!P.n) P.dps = 0; addText(R.p.x, R.p.y - 22, `SHED ${k}`, POI.lt); burst(R.p.x, R.p.y - 4, POI.lt, 10, 40, 0.3); return k; }
function poisonTick() {   // one 0.5 s tick: the formula in one place
  const P = R.poison, p = R.p, S = R.S; let d = P.n * P.dps * POI.tick * (1 - (S.pres || 0)) * (1 - Math.min(0.75, S.dr) * POI.drX);
  d *= hexFragMul(); if (R.raid && R.raid.rm) d *= R.raid.rm.dmg;
  const h0 = p.hp; if (p.hp > POI.floor) p.hp = Math.max(POI.floor, p.hp - d); P.dealt += h0 - p.hp; if (h0 - p.hp >= 0.5) addText(p.x + 6, p.y - 14, Math.round(h0 - p.hp), POI.c); return h0 - p.hp;
}
function envenom(e) {
  if (!e || e.hp <= 0 || e.inst) return; const v = e.venom || (e.venom = { n: 0, tk: VEN.tick, t: 0, ref: 0 }); v.n = Math.min(VEN.max, v.n + 1); v.t = VEN.dur; v.ref = Math.max(v.ref, R.S.baseDmg); R.envN = (R.envN || 0) + 1;
}
function guardMul(e, o) {
  if (o.dot) return 1; const sx = o.sx ?? R.p.x, sy = o.sy ?? R.p.y, a = Math.atan2(sy - e.y, sx - e.x), df = Math.abs(Math.atan2(Math.sin(a - e.fa), Math.cos(a - e.fa)));
  if (df < GUARD.arc) { e.blk = 0.15; R.blocks = (R.blocks || 0) + 1; if (!(e.blkT > R.t)) { e.blkT = R.t + 0.5; addText(e.x, e.y - 16, 'BLOCK', PAL[13]); } return GUARD.mul; }
  return df > Math.PI - 0.9 ? GUARD.back : 1;
}
function blightDeath(e) {
  const r = BL.r * (e.elite ? 1.3 : 1); R110(); R.blights.push({ x: e.x, y: e.y, t: BL.tele, m: BL.tele, r, dmg: e.dmg, ref: e.dmg * BL.refX, spr: e.spr, sc: e.sc, elite: e.elite });
  if (!R.met.blightpop) { R.met.blightpop = 1; R.bq.unshift({ s: 'BLIGHTCAP BURSTS WHEN IT DIES: STEP OUT!', t: 1.8, c: POI.c }); }
}
function blightPop(b) {
  const p = R.p; R.FX.push({ k: 'ring', x: b.x, y: b.y, r: b.r, t: 0.35, m: 0.35, c: POI.c }); burst(b.x, b.y - 4, POI.c, 30, 70, 0.5); burst(b.x, b.y - 4, POI.lt, 10, 40, 0.4); addShake(3); sfx('nova');
  R.capPops = (R.capPops || 0) + 1;
  if (inEll(p, b) && !p.dash) { R.capHits = (R.capHits || 0) + 1; addPoison(BL.stacks, b.ref, 'cap'); if (p.inv <= 0) hurt(b.dmg * BL.hitX); }
  R.spores.push({ x: b.x, y: b.y, r: b.r * BL.cloudR, t: BL.cloud, m: BL.cloud, tk: 0, ref: b.ref });
}
function lobRock(e) {
  const p = R.p, mv = Math.hypot(input.mx, input.my) > 0.2, x = p.x + (mv ? input.mx * LOB.lead : 0) + rnd(-4, 4), y = p.y + (mv ? input.my * LOB.lead * 0.8 : 0) + rnd(-3, 3);
  R110(); R.lobs.push({ x0: e.x, y0: e.y - 8 * e.sc, x, y, t: LOB.t, m: LOB.t, r: LOB.r * (e.elite ? 1.3 : 1), dmg: e.dmg, ice: R.map === 'frost' }); R.lobN = (R.lobN || 0) + 1; sfx('eshot');
}
const ACT110 = {   // movement / behaviour for the new roles; returns [speed, ux, uy]
  weaver(e, dt, d, ux, uy, pd, sp) { const T = ETYPES[e.type], p = R.p;
    if (e.st === 1) { e.stT -= dt; if (e.stT > T.rear * 0.4) { e.dx = ux; e.dy = uy; } if (e.stT <= 0) { e.st = 2; e.stT = T.lungeT; sfx('dash'); } return [0, ux, uy]; }
    if (e.st === 2) { e.stT -= dt; if (Math.random() < 0.6) R.PT.push({ x: e.x, y: e.y - 2, vx: -e.dx * 15, vy: 0, t: 0.25, m: 0.25, c: POI.c, s: 1 }); if (e.stT <= 0) { e.st = 3; e.stT = 0.5; } return [T.lunge * (e.chill ? 0.7 : 1), e.dx, e.dy]; }
    if (e.st === 3) { e.stT -= dt; if (e.stT <= 0) { e.st = 0; e.cdT = rnd(WEAVE.cd[0], WEAVE.cd[1]); } return [sp * 0.3, ux, uy]; }
    e.cdT -= dt; if (e.cdT <= 0 && pd < T.lungeR && pd > 8 && onScreen(e)) { e.st = 1; e.stT = T.rear; e.dx = ux; e.dy = uy; sfx('wind'); return [0, ux, uy]; }
    e.ph += dt * 6; const s = Math.sin(e.ph) * 0.9, nx = ux - uy * s, ny = uy + ux * s, l = Math.hypot(nx, ny) || 1; return [sp, nx / l, ny / l]; },
  burster(e, dt, d, ux, uy, pd, sp) { e.ph += dt * 1.5; const s = Math.sin(e.ph) * 0.3, nx = ux - uy * s, ny = uy + ux * s, l = Math.hypot(nx, ny) || 1; if (Math.random() < 0.08) R.PT.push({ x: e.x + rnd(-3, 3), y: e.y - 8, vx: 0, vy: -10, t: 0.6, m: 0.6, c: POI.c, s: 1 }); return [sp, nx / l, ny / l]; },
  guard(e, dt, d, ux, uy, pd, sp) { const a = Math.atan2(uy, ux), df = Math.atan2(Math.sin(a - e.fa), Math.cos(a - e.fa)); e.fa += clamp(df, -GUARD.turn * dt, GUARD.turn * dt); e.blk = Math.max(0, (e.blk || 0) - dt); return [sp, ux, uy]; },
  lobber(e, dt, d, ux, uy, pd, sp) { const T = ETYPES[e.type], keep = T.keep;
    if (e.cast > 0) { e.cast -= dt; if (e.cast <= 0) lobRock(e); return [0, ux, uy]; }
    if (d < keep - 25) { ux = -ux; uy = -uy; sp *= 0.6; } else if (d < keep + 20) { const sd = Math.sin(e.ph + R.t * 0.5) > 0 ? 1 : -1, nx = -uy * sd, ny = ux * sd; ux = nx; uy = ny; sp *= 0.5; }
    e.shootT -= dt; if (e.shootT <= 0 && pd < LOB.range && onScreen(e, 4) && !R.over) { e.cast = LOB.wind; e.shootT = rnd(LOB.cd[0], LOB.cd[1]); sfx('wind'); } return [sp, ux, uy]; },
};
function chakThrow(a) { const p = R.p, S = R.S, n = 1 + S.proj, v = 200;
  for (let i = 0; i < n; i++) { const aa = a + (i - (n - 1) / 2) * 0.32; R.P.push({ k: 'chak', x: p.x, y: p.y - 4, vx: Math.cos(aa) * v, vy: Math.sin(aa) * v, r: 3 * Math.sqrt(S.area), dmg: S.baseDmg, pierce: 999, life: 3, out: S.range / v, ret: false, hit: new Set(), spin: 0 }); } }
function chakStep(b, dt) { const p = R.p; b.spin += dt * 18; b.out -= dt;
  if (!b.ret && b.out <= 0) { b.ret = true; b.hit = new Set(); }
  if (b.ret) { const dx = p.x - b.x, dy = p.y - 4 - b.y, d = Math.hypot(dx, dy) || 1, v = 230; b.vx = dx / d * v; b.vy = dy / d * v; if (d < 8) { b.life = 0; b.back = true; R.chakBack = (R.chakBack || 0) + 1; } } }
function dartsThrow(a) { const p = R.p, S = R.S, n = 2 + S.proj;
  for (let i = 0; i < n; i++) { const aa = a + (i - (n - 1) / 2) * 0.12 + rnd(-0.03, 0.03); R.P.push({ k: 'dart', x: p.x, y: p.y - 4, vx: Math.cos(aa) * 260, vy: Math.sin(aa) * 260, r: 2 * Math.sqrt(S.area), dmg: S.baseDmg, pierce: 0, life: 0.8, hit: new Set() }); } }
function update110(dt) {
  const P = R110(), p = R.p;
  if (P.n > 0) { P.tk -= dt; while (P.tk <= 0 && P.n > 0) { P.tk += POI.tick; poisonTick(); } P.hold -= dt; if (P.hold <= 0) { P.dk -= dt; if (P.dk <= 0) { P.n = Math.max(0, P.n - POI.decayN(P.n)); P.dk = POI.decay; if (!P.n) { P.dps = 0; addText(p.x, p.y - 22, 'POISON FADES', '#94b0c2'); } } } }
  for (const e of R.E) { const v = e.venom; if (!v || e.hp <= 0) continue; v.tk -= dt; if (v.tk <= 0) { v.tk += VEN.tick; hit(e, v.n * VEN.per * v.ref * VEN.tick, { proc: false, noCrit: true, col: POI.c, dot: true }); } v.t -= dt; if (v.t <= 0) e.venom = null; }
  for (const b of R.blights) { b.t -= dt; if (b.t <= 0) blightPop(b); } R.blights = R.blights.filter(b => b.t > 0);
  for (const s of R.spores) { s.t -= dt; if (inEll(p, s) && !p.dash && !R.over) { s.tk -= dt; if (s.tk <= 0) { s.tk = BL.tick; addPoison(1, s.ref, 'spore'); } } else s.tk = Math.min(s.tk, 0.15); } R.spores = R.spores.filter(s => s.t > 0);
  for (const L of R.lobs) { L.t -= dt; if (L.t > 0) continue;
    R.FX.push({ k: 'ring', x: L.x, y: L.y, r: L.r, t: 0.3, m: 0.3, c: L.ice ? PAL[11] : PAL[3] }); burst(L.x, L.y, L.ice ? PAL[12] : '#8b5a2b', 16, 50); addShake(2); sfx('hit');
    if (inEll(p, L) && !p.dash && p.inv <= 0 && !R.over) { R.lobHits = (R.lobHits || 0) + 1; hurt(L.dmg); if (L.ice) p.slowT = Math.max(p.slowT, 1.5); } }
  R.lobs = R.lobs.filter(L => L.t > 0);
}
/* 1.12.0 WARD SHELL (temp-invulnerable foes). From wave 8, outside raids, some foes grow a gold shell on a clear tell:
   who: tanks (Brute, Rime Golem), chargers (Cinder Boar, Bone Hound, Frost Wolf), Corpse Bloat, Shield Phalanx, Rubble Hurler, and from wave 14 any elite (never bosses / minis / wardens / outposts / orbs).
   cycle: every 7-10 s while within 150 px and on screen -> TELL 0.9 s (sprite blinks white, gold ring closes in, "!") -> SHELL 2.2 s
   (every hit is a no-op: "WARDED" + a spark, no damage / knockback / freeze, auto-aim skips it; it moves 1.35x faster at you) -> EXPOSED 1.5 s (+25% damage taken).
   At most 2 shelled at once (3 from wave 14, 5 from wave 24). First time: a two-line hint. */
const SHELL = { on: !window.__phLegacy, from: 8, eliteFrom: 14, types: ['brute', 'golem', 'boar', 'hound', 'wolf', 'bloat'], acts: ['guard', 'lobber'], cd: [7, 10], first: [3, 7], tell: 0.9, dur: 2.2, exposed: 1.5, exposedX: 1.25, spdX: 1.35, tellSpd: 0.6, range: 150, max: w => w < 14 ? 2 : w < 24 ? 3 : 5, c: '#ffcd75', lt: '#fff4c8' };
const shellable = e => !e.boss && !e.mini && !e.warden && !e.inst && !e.hexo && !e.gob && !e.raidBoss && !e.raid && !e.rsh && (SHELL.types.includes(e.type) || SHELL.acts.includes(e.act) || (e.elite && R.wave >= SHELL.eliteFrom));
function shellStep(e, dt, d) {
  if (e.wdX > 0) e.wdX -= dt;
  if (e.wdS === 1) { e.wdK -= dt; if (e.wdK <= 0) { e.wdS = 2; e.wdK = SHELL.dur; e.frozen = 0; e.chill = 0; e.kx = e.ky = 0; R.shellN = (R.shellN || 0) + 1; burst(e.x, e.y - 4 * e.sc, SHELL.c, 14, 45, 0.3); sfx('wind'); } return; }
  if (e.wdS === 2) { e.frozen = 0; e.kx = e.ky = 0; e.wdK -= dt; if (e.wdK <= 0) { e.wdS = 0; e.wdX = SHELL.exposed; e.wdT = rnd(SHELL.cd[0], SHELL.cd[1]); R.FX.push({ k: 'ring', x: e.x, y: e.y, r: 14 * e.sc, t: 0.25, m: 0.25, c: SHELL.c }); burst(e.x, e.y - 4 * e.sc, SHELL.lt, 12, 50, 0.3); addText(e.x, e.y - 8 * e.sc - 6, 'EXPOSED', PAL[2]); } return; }
  if (R.wave < SHELL.from || R.over || !shellable(e)) return;
  if (e.wdT === undefined) e.wdT = rnd(SHELL.first[0], SHELL.first[1]);
  e.wdT -= dt; if (e.wdT > 0) return;
  if (d > SHELL.range || !onScreen(e, 4) || R.E.filter(o => o.wdS > 0 && o.hp > 0).length >= SHELL.max(R.wave)) { e.wdT = 1; return; }
  e.wdS = 1; e.wdK = SHELL.tell; R.shellTells = (R.shellTells || 0) + 1;
  if (!R.met.shell) { R.met.shell = 1; R.bq.push({ s: 'WARDED FOE: GOLD SHELL = IMMUNE', t: 1.8, c: SHELL.c }, { s: 'KITE IT UNTIL THE SHELL BREAKS', t: 1.6, c: '#94b0c2' }); }
}
function drawShell(e, ex, ey, w, h, now) {
  const cy = ey - h / 2, rx = w / 2 + 5, ry = h / 2 + 4;
  if (e.wdS === 1) { const k = clamp(1 - e.wdK / SHELL.tell, 0, 1), s = 2.2 - 1.2 * k; ctx.strokeStyle = SHELL.c; ctx.lineWidth = 1; ctx.globalAlpha = 0.5 + 0.5 * k; ctx.beginPath(); ctx.ellipse(ex, cy, rx * s, ry * s, 0, 0, TAU); ctx.stroke(); ctx.globalAlpha = 1;   // ring closes in
    dangerMark(ex, ey - h - 9, SHELL.c, 1, now); return; }
  if (e.wdS === 2) { ctx.fillStyle = SHELL.c; ctx.globalAlpha = 0.18 + 0.08 * Math.sin(now / 80); ctx.beginPath(); ctx.ellipse(ex, cy, rx, ry, 0, 0, TAU); ctx.fill();
    ctx.globalAlpha = 0.85; ctx.strokeStyle = SHELL.c; ctx.lineWidth = 1; ctx.beginPath(); ctx.ellipse(ex, cy, rx, ry, 0, 0, TAU); ctx.stroke(); ctx.fillStyle = SHELL.lt; dotRing(ex, cy, rx, ry, 8, now / 300); ctx.globalAlpha = 1;
    const sy = ey - h - 10; ctx.fillStyle = '#0b0b14'; ctx.fillRect(ex - 3, sy - 1, 7, 8); ctx.fillStyle = SHELL.c; ctx.fillRect(ex - 2, sy, 5, 4); ctx.fillRect(ex - 1, sy + 4, 3, 1); ctx.fillRect(ex, sy + 5, 1, 1);   // shield glyph
    const bw = 12; ctx.fillStyle = '#0b0b14'; ctx.fillRect(ex - bw / 2 - 1, ey + 2, bw + 2, 3); ctx.fillStyle = SHELL.c; ctx.fillRect(ex - bw / 2, ey + 3, Math.ceil(bw * Math.max(0, e.wdK) / SHELL.dur), 1); }   // time left
}
/* ---- 1.10.0 drawing ---- */
const DROP5 = ['..1..', '.111.', '11111', '11111', '.111.'];
function drawPoisonTile(x, y, now, out) {
  const P = R && R.poison; if (!P || !(P.n > 0)) return x; const full = P.n >= POI.max, two = P.n >= 10, W = two ? 21 : 17;   // 1.12.0: 2 digits from 10 stacks
  if (P.hold <= 0 && P.n <= 1 && Math.floor(now / 160) % 2) ctx.globalAlpha = 0.5;
  ctx.fillStyle = full && Math.floor(now / 140) % 2 ? POI.lt : POI.c; ctx.fillRect(x, y, W, 9); ctx.fillStyle = '#0b0b14'; ctx.fillRect(x + 1, y + 1, W - 2, 7);
  ctx.fillStyle = POI.c; for (let i = 0; i < 25; i++) if (DROP5[Math.floor(i / 5)][i % 5] === '1') ctx.fillRect(x + 2 + (i % 5), y + 2 + Math.floor(i / 5), 1, 1);
  ctx.fillStyle = POI.lt; String(Math.min(99, P.n)).split('').forEach((ch, j) => { const F = FONT[ch]; for (let i = 0; i < 15; i++) if (F[i] === '1') ctx.fillRect(x + 10 + j * 4 + (i % 3), y + 2 + Math.floor(i / 3), 1, 1); });
  ctx.fillStyle = '#0b0b14'; ctx.fillRect(x, y + 9, W, 2); ctx.fillStyle = POI.c; ctx.fillRect(x, y + 10, Math.max(1, Math.ceil(W * (P.hold > 0 ? 1 : P.dk / POI.decay))), 1);
  ctx.globalAlpha = 1; out.push({ k: 'poison', x, y, n: P.n, w: W }); return x + W + 2;
}
function drawPoisonHero(hx, hy, now) {
  const P = R.poison; if (!P || !(P.n > 0) || R.over) return; ctx.fillStyle = POI.c;
  const pn = Math.min(12, P.n), sp = Math.min(0.42, 4.6 / pn); for (let i = 0; i < pn; i++) { const a = -Math.PI / 2 + (i - (pn - 1) / 2) * sp; ctx.fillRect(Math.round(hx + Math.cos(a) * 9) - 1, Math.round(hy - 9 + Math.sin(a) * 9) - 1, 2, 2); }
  if (Math.floor(now / 90) % 3 === 0 && R.PT.length < 480) R.PT.push({ x: R.p.x + rnd(-4, 4), y: R.p.y - rnd(2, 10), vx: 0, vy: -14, t: 0.5, m: 0.5, c: Math.random() < 0.5 ? POI.c : POI.lt, s: 1 });
}
function dotEll(cx, cy, r, n, off, s = 1) { dotRing(cx, cy, r, r * 0.7, n, off, s); }
function drawGround110(X, Y, now) {
  if (!R.blights) return;
  for (const e of R.E) { if (e.role !== 'burster' || e.hp <= 0) continue; const ex = X(e.x), ey = Y(e.y), r = BL.r * (e.elite ? 1.3 : 1), low = e.hp < e.maxHp * 0.4;   // danger radius drawn while it lives
    ctx.fillStyle = POI.c; ctx.globalAlpha = low ? 0.6 + 0.3 * Math.sin(now / 90) : 0.45; dotEll(ex, ey, r, 20, now / 1400, 2); ctx.globalAlpha = 1; }
  for (const s of R.spores) { const sx = X(s.x), sy = Y(s.y), f = Math.min(1, s.t / 0.6); ctx.fillStyle = POI.dk; ctx.globalAlpha = 0.35 * f; ctx.beginPath(); ctx.ellipse(sx, sy, s.r, s.r * 0.7, 0, 0, TAU); ctx.fill();
    ctx.fillStyle = POI.c; ctx.globalAlpha = 0.6 * f; dotEll(sx, sy, s.r, 18, -now / 900); for (let i = 0; i < 7; i++) { const a = hash(i, Math.floor(s.x)) * TAU + now / 700, rr = s.r * 0.7 * hash(i + 4, 3); ctx.fillRect(Math.round(sx + Math.cos(a) * rr), Math.round(sy + Math.sin(a) * rr * 0.7 - (now / 60 + i * 7) % 6), 1, 2); } ctx.globalAlpha = 1; }
  for (const b of R.blights) { const bx = X(b.x), by = Y(b.y), k = 1 - b.t / b.m;   // the swell: filling disc + marching ring = the burst area
    ctx.fillStyle = POI.c; ctx.globalAlpha = 0.12 + 0.3 * k; ctx.beginPath(); ctx.ellipse(bx, by, b.r * k, b.r * 0.7 * k, 0, 0, TAU); ctx.fill(); ctx.globalAlpha = 0.9; dotEll(bx, by, b.r, 26, now / 160, 2); ctx.globalAlpha = 1; }
  for (const L of R.lobs) { const lx = X(L.x), ly = Y(L.y), k = 1 - L.t / L.m, c = L.ice ? PAL[11] : PAL[3];   // landing shadow: shrinking dotted ring + growing shadow
    ctx.fillStyle = '#000'; ctx.globalAlpha = 0.15 + 0.3 * k; ctx.beginPath(); ctx.ellipse(lx, ly, L.r * (0.3 + 0.7 * k), L.r * 0.7 * (0.3 + 0.7 * k), 0, 0, TAU); ctx.fill();
    ctx.fillStyle = c; ctx.globalAlpha = 0.85; dotEll(lx, ly, L.r, 16, now / 200); ctx.globalAlpha = 1; }
}
function drawFoe110(e, ex, ey, w, h, flip, now) {
  if (e.guard) { const ca = Math.cos(e.fa), sa = Math.sin(e.fa), cx = ex + ca * 6, cy = ey - 5 + sa * 3, px = -sa, py = ca, c = e.blk > 0 ? PAL[12] : PAL[13];
    ctx.fillStyle = PAL[13]; ctx.globalAlpha = 0.4; for (let a = -GUARD.arc; a <= GUARD.arc; a += 0.22) ctx.fillRect(Math.round(ex + Math.cos(e.fa + a) * 11), Math.round(ey + Math.sin(e.fa + a) * 7), 1, 1); ctx.globalAlpha = 1;
    for (let i = -4; i <= 4; i++) { ctx.fillStyle = '#0b0b14'; ctx.fillRect(Math.round(cx + px * i * 0.9) - 1, Math.round(cy + py * i * 1.1) - 1, 3, 3); }
    for (let i = -4; i <= 4; i++) { ctx.fillStyle = Math.abs(i) === 4 ? PAL[14] : c; ctx.fillRect(Math.round(cx + px * i * 0.9), Math.round(cy + py * i * 1.1), 2, 1); } }
  if (e.role === 'lobber' && e.cast > 0) { const k = 1 - e.cast / LOB.wind, s = 1 + Math.round(k * 2); ctx.fillStyle = '#0b0b14'; ctx.fillRect(ex - s - 1, ey - h - 4 - s, s * 2 + 2, s * 2 + 2); ctx.fillStyle = R.map === 'frost' ? PAL[11] : '#8b5a2b'; ctx.fillRect(ex - s, ey - h - 3 - s, s * 2, s * 2); dangerMark(ex, ey - h - 14, PAL[3], 1, now); }
  if (e.venom && e.venom.n > 0) { ctx.fillStyle = POI.c; for (let i = 0; i < e.venom.n; i++) ctx.fillRect(Math.round(ex - e.venom.n + i * 2), ey - h - 3, 1, 2); }
}
function drawAir110(X, Y, now) {
  if (!R.lobs) return;
  for (const L of R.lobs) { const k = 1 - L.t / L.m, x = X(L.x0 + (L.x - L.x0) * k), y = Y(L.y0 + (L.y - L.y0) * k) - Math.round(4 * LOB.peak * k * (1 - k));
    ctx.fillStyle = '#0b0b14'; ctx.fillRect(x - 3, y - 3, 6, 6); ctx.fillStyle = L.ice ? PAL[11] : '#8b5a2b'; ctx.fillRect(x - 2, y - 2, 4, 4); ctx.fillStyle = L.ice ? PAL[12] : '#c8a060'; ctx.fillRect(x - 2, y - 2, 2, 1); }
  for (const b of R.blights) { const k = 1 - b.t / b.m, im = IMG[b.spr][Math.floor(now / 70) % 2 && k > 0.5 ? 'w' : 'n'][0], s = b.sc * (1 + 0.6 * k), w = im.width * s, h = im.height * s, bx = X(b.x), by = Y(b.y) + Math.round(Math.sin(now / 40) * k);
    ctx.drawImage(im, Math.round(bx - w / 2), Math.round(by - h), w, h); dangerMark(bx, by - h - 8, POI.c, 1, now); }
}
function drawVenomGlob(b, bx, by, now) { ctx.fillStyle = '#0b0b14'; ctx.fillRect(bx - 2, by - 2, 5, 5); ctx.fillStyle = POI.c; ctx.fillRect(bx - 1, by - 1, 3, 3); ctx.fillStyle = POI.lt; ctx.fillRect(bx, by - 1, 1, 1);
  ctx.fillStyle = POI.c; ctx.fillRect(Math.round(bx - b.vx / 25), Math.round(by - b.vy / 25), 1, 1); if (Math.floor(now / 80) % 2) ctx.fillRect(Math.round(bx - b.vx / 14), Math.round(by - b.vy / 14) + 1, 1, 1); }
function drawP110(b, bx, by, now) {
  if (b.k === 'chak') { const r = Math.max(3, Math.round(b.r)) + 1; ctx.fillStyle = '#0b0b14'; ctx.fillRect(bx - r, by - r, r * 2 + 1, r * 2 + 1);
    for (let i = 0; i < 4; i++) { const a = b.spin + i * Math.PI / 2; ctx.fillStyle = i % 2 ? PAL[13] : PAL[12]; ctx.fillRect(Math.round(bx + Math.cos(a) * (r - 1)), Math.round(by + Math.sin(a) * (r - 1)), 2, 2); } ctx.fillStyle = PAL[11]; ctx.fillRect(bx, by, 1, 1); return; }
  const l = Math.hypot(b.vx, b.vy), ux = b.vx / l, uy = b.vy / l; ctx.fillStyle = PAL[14]; for (let i = 1; i < 5; i++) ctx.fillRect(Math.round(bx - ux * i), Math.round(by - uy * i), 1, 1); ctx.fillStyle = POI.c; ctx.fillRect(bx, by, 2, 1); ctx.fillStyle = PAL[5]; ctx.fillRect(Math.round(bx - ux * 5), Math.round(by - uy * 5), 1, 1);
}
function hexSummary() { if (!R || !R.hex) return ''; return Object.keys(HEX.st).filter(k => R.hex[k] > 0).map(k => `${HEX.st[k].name}${hexN(k) > 1 ? ' x' + hexN(k) : ''} ${R.hexSrc[k] === 'zone' ? 'ZONE' : Math.ceil(R.hex[k]) + 's'}`).join(', '); }
/* ---- 1.9.4 drawing (whole pixels only) ---- */
function drawHexIcon(k, x, y, col) {   // 5x5 status glyph (same art on the HUD tile, the orb and the zone tag)
  const S = HEX.st[k]; x = Math.round(x); y = Math.round(y); ctx.fillStyle = col || S.c; for (let i = 0; i < 25; i++) if (S.ic[i] === '1') ctx.fillRect(x + i % 5, y + Math.floor(i / 5), 1, 1);
  if (S.x) { ctx.fillStyle = '#b13e53'; for (let i = 0; i < 25; i++) if (S.x[i] === '1') ctx.fillRect(x + i % 5, y + Math.floor(i / 5), 1, 1); }
}
function drawHexTile(k, x, y) {   // HUD / zone tag tile: dark tile, status-colour frame + glyph (buff tiles are the inverse: filled colour, dark glyph)
  const c = HEX.st[k].c; ctx.fillStyle = '#0b0b14'; ctx.fillRect(x, y, 9, 9); ctx.fillStyle = c; ctx.fillRect(x, y, 9, 1); ctx.fillRect(x, y + 8, 9, 1); ctx.fillRect(x, y, 1, 9); ctx.fillRect(x + 8, y, 1, 9); drawHexIcon(k, x + 2, y + 2);
}
function dotRing(cx, cy, rx, ry, n, off, s = 1) { for (let i = 0; i < n; i++) { const a = off + i / n * TAU; ctx.fillRect(Math.round(cx + Math.cos(a) * rx) - (s >> 1), Math.round(cy + Math.sin(a) * ry) - (s >> 1), s, s); } }
function drawHexTele(e, ex, ey, now) {   // ground ring: faint range dots while drifting; during the telegraph a filling disc + bright marching dots + blink
  const O = HEX.orb, c = HEX.st[e.hx].c;
  if (e.hst === 3) { const k = clamp(1 - e.hT / e.hTM, 0, 1), nf = HEX.bolt.oFan(R.wave); for (let i = 0; i < nf; i++) drawAimLine(ex, ey - 10, e.ba + (i - (nf - 1) / 2) * HEX.bolt.fan, 150, c, k, e.hT <= e.hTM * HEX.bolt.lock, now); ctx.fillStyle = c; ctx.globalAlpha = 0.28; dotRing(ex, ey, O.R, O.R * 0.6, 14, now / 900); ctx.globalAlpha = 1; return; }   // 1.9.6 bolt telegraph
  if (e.hst === 1) { const k = clamp(1 - e.hT / e.hTM, 0, 1); ctx.fillStyle = c; ctx.globalAlpha = 0.1 + 0.22 * k; ctx.beginPath(); ctx.ellipse(ex, ey, Math.max(1, O.R * k), Math.max(1, O.R * 0.6 * k), 0, 0, TAU); ctx.fill();
    ctx.globalAlpha = k > 0.7 && Math.floor(now / 70) % 2 ? 0.5 : 0.95; dotRing(ex, ey, O.R, O.R * 0.6, 30, now / 400, 2); ctx.globalAlpha = 1; }
  else if (onScreen(e, -20)) { ctx.fillStyle = c; ctx.globalAlpha = 0.28; dotRing(ex, ey, O.R, O.R * 0.6, 14, now / 900); ctx.globalAlpha = 1; }
}
function drawHexOrb(e, ex, ey, now) {
  const c = HEX.st[e.hx].c, bob = Math.round(Math.sin(now / 240 + e.id) * 1.5), oy = ey - 10 + bob, tele = e.hst === 1 || e.hst === 3, fl = e.flash > 0;
  ctx.drawImage(shadowC, ex - 4, ey - 1, 8, 3);
  ctx.fillStyle = '#0b0b14'; ctx.fillRect(ex - 3, oy - 4, 7, 9); ctx.fillRect(ex - 4, oy - 3, 9, 7);
  ctx.fillStyle = fl ? '#f4f4f4' : PAL[1]; ctx.fillRect(ex - 2, oy - 3, 5, 7); ctx.fillRect(ex - 3, oy - 2, 7, 5);
  ctx.fillStyle = c; if (tele && Math.floor(now / 90) % 2) ctx.fillRect(ex - 2, oy - 2, 5, 5); else ctx.fillRect(ex - 1, oy - 1, 3, 3);
  ctx.fillStyle = '#f4f4f4'; ctx.fillRect(ex - 1, oy - 2, 1, 1);
  ctx.fillStyle = c; for (let i = 0; i < 3; i++) { const a = now / 300 + i * TAU / 3 + e.id; ctx.fillRect(Math.round(ex + Math.cos(a) * 6), Math.round(oy + Math.sin(a) * 3), 1, 1); }
  drawHexIcon(e.hx, ex - 2, oy - 11);
  if (tele) dangerMark(ex + 6, oy - 12, PAL[2], 1, now);
  if (e.hst === 3) { const k = clamp(1 - e.hT / e.hTM, 0, 1), rr = 1 + Math.round(k * 4); ctx.fillStyle = c; ctx.globalAlpha = 0.5 + 0.5 * k; dotRing(ex, oy, rr + 2, rr + 2, 8, now / 120); ctx.globalAlpha = 1; }   // 1.9.6 charging
}
function drawHexHero(hx, hy, now) {   // status pixels circling the hero's feet, one colour per active status
  const ks = Object.keys(HEX.st).filter(k => R.hex[k] > 0); if (!ks.length || R.over) return;
  ks.forEach((k, i) => { ctx.fillStyle = HEX.st[k].c; for (let j = 0; j < 2; j++) { const a = now / 260 + (i * 2 + j) * TAU / (ks.length * 2); ctx.fillRect(Math.round(hx + Math.cos(a) * 7), Math.round(hy + Math.sin(a) * 3), 1, 1); } });
}
const spawnDist = () => Math.hypot(VW, VH) / 2 + 16;

/* ---------------- combat ---------------- */
function nearest(x, y, maxD, skip) {
  let best = null, bd = maxD * maxD;
  for (const e of R.E) { if (e.hp <= 0 || e.immune || e.wdS === 2 || (skip && skip.has(e.id))) continue; const d = (e.x - x) ** 2 + (e.y - y) ** 2; if (d < bd) { bd = d; best = e; } }
  return best;
}
function nearestRaider(x, y, maxD) { let best = null, bd = maxD * maxD; for (const e of R.E) { if (!e.raid || e.hp <= 0) continue; const d = (e.x - x) ** 2 + (e.y - y) ** 2; if (d < bd) { bd = d; best = e; } } return best; }   // 0.8.0 auto-aim prefers red-marked raiders
function addText(x, y, s, c, big) { while (R.TX.length >= TX_CAP()) R.TX.shift(); R.TX.push({ x: x + rnd(-3, 3), y, s, c, t: 0.65, big }); }
function burst(x, y, col, n, spd = 40, life = 0.45) { for (let i = 0; i < n && R.PT.length < 500; i++) { const a = Math.random() * TAU, v = rnd(0.3, 1) * spd; R.PT.push({ x, y, vx: Math.cos(a) * v, vy: Math.sin(a) * v, t: rnd(0.5, 1) * life, m: life, c: col, s: Math.random() < 0.3 ? 2 : 1 }); } }
function hit(e, dmg, o = {}) {
  if (e.hp <= 0) return;
  if (e.wdS === 2) { R.shellBlocks = (R.shellBlocks || 0) + 1; if (!(e.wdTx > R.t)) { e.wdTx = R.t + 0.45; addText(e.x, e.y - 8 * e.sc - 6, 'WARDED', SHELL.c); } if (Math.random() < 0.5) burst(e.x, e.y - 4 * e.sc, SHELL.lt, 3, 30, 0.15); return; }   // 1.12.0 ward shell: no damage, no knockback, a spark
  if (e.wdX > 0) dmg *= SHELL.exposedX;   // 1.12.0 shell just broke: EXPOSED
  if (e.immune) { if (!(e.imT > R.t)) { e.imT = R.t + 0.5; addText(e.x, e.y - 8 * e.sc, R.raid && R.raid.trans > 0 ? 'PHASE SHIFT' : 'IMMUNE', PAL[11]); } return; }   // 1.4.0 raid boss: shielded / phase shift
  if (e.vuln > 0) dmg *= RAID.vulnX;   // 1.4.0 shield just broke: exposed
  if (e.raidBoss && R.raid && R.raid.open > 0) dmg *= RAID7.openX;   // 1.7.0 OPEN punish window
  const S = R.S; let crit = false, cc = S.crit;
  if (S.deadeye && Math.hypot(e.x - R.p.x, e.y - R.p.y) > S.range * 0.6) cc += S.deadeye;   // 0.7.0 Ranger Deadeye
  if (S.shatter && e.frozen > 0) dmg *= 1 + S.shatter;   // 0.7.0 Wanderer Deep Freeze
  if (S.rimeX && e.chill > 0) dmg *= 1 + S.rimeX;   // 1.7.0 Rimebound 2pc
  if (S.eliteD && (e.elite || e.boss || e.mini || e.raidBoss)) dmg *= 1 + S.eliteD;   // 1.1.0 Slayer's affix / Ranger Marksman
  if (S.exec && e.hp < e.maxHp * 0.3) dmg *= 1 + S.exec;   // 1.1.0 of Execution
  if (e.shT > 0) dmg *= 1 - ORACLE.sh;
  if (e.guard) dmg *= guardMul(e, o);   // 1.10.0 Shield Phalanx
  if (S.cruel && (e.burn || e.chill > 0 || e.frozen > 0 || (e.venom && e.venom.n > 0))) dmg *= 1 + S.cruel;   // 1.10.0 Cruel
  dmg *= hexWeakMul();   // 1.9.4 WEAKENED   // 1.1.0 Rime Oracle shield
  if (S.uq.tide && o.src === 'chak' && (e.chill > 0 || e.frozen > 0)) dmg *= 1.4;   // 1.13.2 Tidecutter: shatter chilled
  if (S.uq.heart && e.hp > e.maxHp * 0.8) cc = 1;   // 1.13.2 Heartseeker
  if (!o.noCrit && Math.random() < cc) { dmg *= S.critX; crit = true; }
  if (e.inst === 'barracks') dmg *= 1 - INST9.barArmor;   // 0.9.0 armoured barracks
  if (e.inst === 'catapult' && outShielded(e)) dmg *= 1 - OUT7.squadDR;   // 1.7.0 siege squad shield
  e.hp -= dmg; if (e.fcd <= 0) { e.flash = 0.07; e.fcd = e.boss || e.elite || e.mini || e.raidBoss ? 0.22 : 0.1; }
  if (e.raidBoss) raidHpGate(e);   // 1.4.0: phases at HP thresholds (no skipping)
  if (o.kx !== undefined && !e.boss && !e.raidBoss) { const k = (o.kb || 40) * (e.elite ? 0.4 : 1) * (e.kbr ?? 1); e.kx += o.kx * k; e.ky += o.ky * k; }
  addText(e.x, e.y - 8 * e.sc, Math.round(dmg), crit ? '#ffcd75' : o.col || '#f4f4f4', crit);
  if (crit && o.src === 'axe') R.hitstop = Math.max(R.hitstop, 0.03);
  if (crit && S.splint && !o.splint) { let n = 0; for (const q of R.E) { if (n >= 3) break; if (q === e || q.hp <= 0 || q.inst) continue; if (Math.hypot(q.x - e.x, q.y - e.y) < 20 + q.r) { n++; R.FX.push({ k: 'zap', x1: e.x, y1: e.y, x2: q.x, y2: q.y, t: 0.1 }); hit(q, dmg * S.splint, { proc: false, noCrit: true, splint: true, col: '#ffcd75' }); } } }   // 1.1.0 Splinter
  sfx('hit');
  if (crit && S.uq.vamp && canHeal()) R.p.hp = Math.min(S.maxHp, R.p.hp + S.maxHp * 0.01);   // 1.13.2 Crown of the Thirsting
  if (crit && S.uq.glass && e.hp > 0) e.burn = { dps: S.baseDmg * 0.4 * S.burnX, t: 3, tick: 0.5 };   // 1.13.2 Glass Sun
  if (S.uq.tide && o.src === 'chak' && e.hp > 0) e.chill = Math.max(e.chill, 1.5);
  const px = o.sec ? SEC.procX : 1;   // 1.13.2: fork / ricochet secondary hits roll status twice as often; burn uses at least the weapon hit
  if (o.proc !== false) {
    if (S.burn && Math.random() < S.burn * px) { e.burn = { dps: (o.sec ? Math.max(dmg, S.baseDmg) : dmg) * 0.4 * S.burnX, t: 3, tick: 0.5 }; }
    if (S.frost && Math.random() < S.frost * px) { e.chill = 2; burst(e.x, e.y, PAL[11], 4, 20); }
    if (S.leech) { const lm = hexLeechMul(e); if (lm > 0) { const p = R.p; p.hp = Math.min(S.maxHp, p.hp + dmg * S.leech * lm); } }   // 1.9.6: hexLeechMul = 0 under NO REGEN (else warden resist WD.leechMul)   // 0.9.0
    if (S.echo) { R.p.cd1 = Math.max(0, R.p.cd1 - S.echo); R.p.cd2 = Math.max(0, R.p.cd2 - S.echo); }
    if (S.chain && Math.random() < S.chain) chain(e, dmg * 0.6);
    if (S.stun && !e.boss && !e.raidBoss && !e.inst && Math.random() < S.stun * px) e.frozen = Math.max(e.frozen, 0.4);   // 1.1.0 of Thunder
    if (S.uq.pin && o.src === 'flail') e.chill = Math.max(e.chill, 1);
  }
  if ((o.src === 'dart' || (o.proc !== false && S.venom && Math.random() < S.venom * px)) && e.hp > 0 && !o.dot) { envenom(e); if (o.sec && o.src === 'dart') envenom(e); }   // 1.13.2: secondary dart hits add 2 stacks   // 1.10.0 Blight Darts / of Venom
  if (e.hp <= 0) kill(e);
}
/* 1.13.2 FORK / RICOCHET (Matt: straight shooters need answers to flail / axe AoE). Primary projectiles only fork (gen 0); a ricochet re-aims the SAME
   projectile at the nearest unhit foe within RICO.r (75% dmg per bounce, max RICO.max; Gallows Recurve: +15% per bounce instead). Secondary hits carry sec:true. */
function mirrorShot(b) { const p = R.p, t = nearest(p.x, p.y, 220); R.mirN = (R.mirN || 0) + 1; burst(p.x, p.y - 4, '#73eff7', 8, 40, 0.2); addText(p.x, p.y - 16, 'REFLECT', '#73eff7'); if (!t) return; const a = Math.atan2(t.y - p.y, t.x - p.x); R.P.push({ k: 'cbolt', x: p.x, y: p.y - 4, vx: Math.cos(a) * 300, vy: Math.sin(a) * 300, r: 3, dmg: R.S.baseDmg * 2, pierce: 0, life: 1, hit: new Set(), gen: 1 }); }   // 1.13.2 Mirrorplate
function shardRing(n, mul) { const p = R.p, S = R.S; for (let i = 0; i < n; i++) { const a = i * TAU / n + R.t; R.P.push({ k: 'boneP', x: p.x, y: p.y - 4, vx: Math.cos(a) * 210, vy: Math.sin(a) * 210, r: 3, dmg: S.baseDmg * mul, pierce: 1, life: 0.6, hit: new Set(), gen: 1 }); } R.FX.push({ k: 'ring', x: p.x, y: p.y, r: 30, t: 0.2, m: 0.2, c: PAL[12] }); }
function projSplit(b, e) { const S = R.S;
  if (S.rico && (b.bn || 0) < RICO.max && Math.random() < S.rico) { const n = nearest(e.x, e.y, RICO.r, b.hit); if (n) { const sp = Math.max(160, Math.hypot(b.vx, b.vy)), a = Math.atan2(n.y - 4 * n.sc - b.y, n.x - b.x); b.vx = Math.cos(a) * sp; b.vy = Math.sin(a) * sp; b.bn = (b.bn || 0) + 1; b.dmg *= S.uq.gallows ? 1.15 : RICO.mul; b.sec = true; b.life = Math.max(b.life, 0.6); b.tgt = n; if (b.k === 'chak') { b.k = 'arrow'; b.pierce = 0; } if (b.pierce < 0) b.pierce = 0; R.FX.push({ k: 'zap', x1: e.x, y1: e.y, x2: n.x, y2: n.y, t: 0.08 }); R.ricoN = (R.ricoN || 0) + 1; } }
  if (S.fork && !(b.gen > 0) && Math.random() < S.fork) { const a0 = Math.atan2(b.vy, b.vx), sp = Math.hypot(b.vx, b.vy) || 200, k = b.k === 'chak' ? 'arrow' : b.k;
    for (let i = 0; i < FORK.n; i++) { const a = a0 + (i ? FORK.a : -FORK.a); R.P.push({ k, x: b.x, y: b.y, vx: Math.cos(a) * sp, vy: Math.sin(a) * sp, r: b.r, dmg: b.dmg * FORK.mul, pierce: 0, life: FORK.life, hit: new Set(b.hit), gen: FORK.gen, sec: true, splash: b.splash ? b.splash * 0.7 : 0 }); }
    burst(b.x, b.y, PAL[11], 4, 30, 0.15); R.forkN = (R.forkN || 0) + 1; } }
function chain(from, dmg) {
  const seen = new Set([from.id]); let cur = from; sfx('zap');
  for (let i = 0; i < 3; i++) { const n = nearest(cur.x, cur.y, 60, seen); if (!n) break; seen.add(n.id); R.FX.push({ k: 'zap', x1: cur.x, y1: cur.y, x2: n.x, y2: n.y, t: 0.15 }); hit(n, dmg, { proc: false, noCrit: true, col: PAL[11] }); cur = n; }
}
function kill(e) {
  { const S = R.S; if (S.uq.plague && e.venom && e.venom.n > 0) { let k = 0; for (const q of R.E) { if (k >= 2) break; if (q === e || q.hp <= 0 || q.inst) continue; if (Math.hypot(q.x - e.x, q.y - e.y) < 55) { k++; for (let i = 0; i < Math.max(2, e.venom.n >> 1); i++) envenom(q); R.FX.push({ k: 'zap', x1: e.x, y1: e.y, x2: q.x, y2: q.y, t: 0.15 }); } } }   // 1.13.2 Plague Wraps
    if (S.uq.ember && e.burn && !e.inst) { R.FX.push({ k: 'ring', x: e.x, y: e.y, r: 30, t: 0.25, m: 0.25, c: PAL[3] }); burst(e.x, e.y, PAL[4], 10, 50); for (const q of R.E) if (q !== e && q.hp > 0 && Math.hypot(q.x - e.x, q.y - e.y) < 30 + q.r) { hit(q, S.baseDmg * 0.6, { proc: false, noCrit: true, col: PAL[3] }); if (q.hp > 0) q.burn = { dps: S.baseDmg * 0.4 * S.burnX, t: 3, tick: 0.5 }; } } }   // 1.13.2 Emberheart: burning foes burst
  if (R.S.blood && R.p.hp > 0 && canHeal()) R.p.hp = Math.min(R.S.maxHp, R.p.hp + R.S.blood);   // 1.1.0 Bloodlust / Gravewarden 2pc (1.9.6: not under NO REGEN)
  if (e.type === 'mason') { for (const w of R.walls) if (w.src === e.id) w.t = Math.min(w.t, 0.35); R.wallQ = R.wallQ.filter(q => q.src !== e.id); }   // its walls crumble
  if (ETYPES[e.type] && ETYPES[e.type].role === 'burster') blightDeath(e);   // 1.10.0 death punish: the corpse swells, then bursts into poison
  if (R.gate && R.gate.sealed) gateKill(e);   // 1.7.0 gate trials
  if (e.inst) return instKill(e);   // 0.8.0
  if (e.warden) return wardenKill(e);   // 0.9.0
  if (e.raidBoss) return raidKill(e);   // 1.4.0
  R.kills++; save.totalKills++;
  const col = { slime: PAL[6], bat: PAL[1], skel: PAL[13], brute: PAL[3] }[e.type] || PAL[ETYPES[e.type].col ?? 12], big = e.elite || e.boss || e.mini;
  const sk = e.boss ? 'colossus' : e.type; save.slain[sk] = (save.slain[sk] || 0) + 1;   // 0.5.0 bestiary counts
  if (e.burn && R.S.wild) { const rad = 16 + 8 * R.S.wild, S = R.S; R.FX.push({ k: 'ring', x: e.x, y: e.y, r: rad, t: 0.25, m: 0.25, c: PAL[3] });   // 0.7.0 Pyro Wildfire
    for (const o of R.E) if (o !== e && o.hp > 0 && !o.burn && Math.hypot(o.x - e.x, o.y - e.y) < rad + o.r) o.burn = { dps: S.baseDmg * 0.25 * (1 + S.wild) * S.burnX, t: 2, tick: 0.5 }; }
  burst(e.x, e.y, col, e.boss ? 60 : e.mini ? 40 : e.elite ? 24 : 8, e.boss || e.mini ? 90 : 45); burst(e.x, e.y, '#f4f4f4', e.boss ? 20 : e.mini ? 12 : 3, 30, 0.25);
  sfx(big ? 'bigkill' : 'kill'); if (big) { addShake(e.boss ? 8 : e.mini ? 6 : 4); R.hitstop = Math.max(R.hitstop, e.boss ? 0.15 : e.mini ? 0.1 : 0.06); }
  // gems
  let v = e.xp; const n = e.boss ? 12 : e.mini ? 8 : e.elite ? 4 : 1; for (let i = 0; i < n; i++) R.G.push({ x: e.x + rnd(-6, 6) * (n > 1), y: e.y + rnd(-6, 6) * (n > 1), v: Math.max(1, Math.round(v / n)), mag: false });
  if (R.G.length > 350) { const g = R.G.shift(); gainXP(g.v); }
  if (e.burn && R.S.phoenix) R.p.cd1 = Math.max(0, R.p.cd1 - 0.15);   // 1.1.0 Pyro Phoenix
  const SP = ETYPES[e.type].split; if (SP) { const n = SP + (e.elite ? 2 : 0); for (let i = 0; i < n; i++) { const a = i / n * TAU + rnd(-0.3, 0.3), m = spawnEnemy('maggot', e.x + Math.cos(a) * 5, e.y + Math.sin(a) * 4); m.kx = Math.cos(a) * 70; m.ky = Math.sin(a) * 50; } burst(e.x, e.y, PAL[6], 16, 50); }   // 1.1.0 Corpse Bloat
  if (Math.random() < (e.elite ? 0.5 : e.boss || e.mini ? 1 : 0.015)) R.H.push({ x: e.x + 4, y: e.y, t: 30 });
  const dropP = (e.boss || e.elite || e.mini) ? 1 : 0.02 * (1 + 0.25 * rank('scav'));
  if (Math.random() < dropP) {   // first two drops are still the Cleaver then the Bow; after that any of the 9 slots
    const order = ['axe', 'bow']; const base = R.drops < 2 ? order[R.drops] : undefined;
    dropWeapon(e.x, e.y, rollItem(R.wave, { base, min: e.boss ? 2 : e.elite || e.mini ? 1 : 0 }), e.boss || e.mini || !!base);   // 0.6.0: boss / mini-boss / first-two (Cleaver, Bow) drops ignore the loot filter
    if (e.boss || (e.mini && Math.random() < 0.5)) dropWeapon(e.x + 12, e.y, rollItem(R.wave, { slot: pick(ARMOR_SLOTS), min: 1 }), true);
  }
  const uqP = e.boss ? (R.wave >= 10 ? UQ_P.boss : 0) : e.mini ? (R.wave >= 8 ? UQ_P.mini : 0) : e.elite && R.wave >= 15 ? UQ_P.elite : 0; if (uqP && Math.random() < uqP) dropUnique(e.x, e.y - 12);   // 1.1.0
  if (e.boss) { R.bosses++; save.bossKills++; goldDrop(e.x, e.y, 40 + 6 * R.wave, 12); eventWin('BOSS SLAIN!', R.wave >= RUN9.colFrom ? RUN_BUFF : 90); }   // 0.9.0: a wave-10+ Colossus boon lasts the run
  else if (e.gob) { goldDrop(e.x, e.y, 25 + 5 * R.wave, 10); if (R.ev && R.ev.k === 'goblin') { R.ev = null; R.evT = rnd(35, 50); } eventWin('GOBLIN CAUGHT!', 60); }
  else if (e.mini) { R.minis++; save.miniKills++; goldDrop(e.x, e.y, 20 + 4 * R.wave, 8); R.banner = { s: `${ETYPES[e.type].name} SLAIN!`, t: 2.2, c: PAL[3] }; sfx('buff'); }
  else if (e.elite) goldDrop(e.x, e.y, 4 + R.wave, 3);
  else if (Math.random() < 0.06) goldDrop(e.x, e.y, 1 + Math.floor(R.wave / 4), 1);
  resKillDrop(e);   // 1.14.0
}
function goldDrop(x, y, total, n) { const v = Math.max(1, Math.round(total * (R.M ? R.M.loot : 1) * (1 + (R.S ? R.S.greed : 0)) / n)); for (let i = 0; i < n; i++) R.C.push({ x: x + rnd(-8, 8) * (n > 1), y: y + rnd(-8, 8) * (n > 1), v, mag: false }); if (R.C.length > 200) { const c = R.C.shift(); if (c.r) resAdd(c.r, c.v); else addGold(c.v); } }   // 1.1.0: x(1 + greed) = Midas + of Greed
function addGold(v) { R.gold += v; save.gold += v; save.goldTotal += v; }
/* ---- 0.2.0 power-ups + events ---- */
function grantBuff(id, secs = 60) {
  if (!id) { const ids = Object.keys(BUFFS), fresh = ids.filter(k => !(R.buffs[k] > 0)), timed = ids.filter(k => R.buffs[k] !== RUN_BUFF); id = pick(fresh.length ? fresh : timed.length ? timed : ids); }
  R.buffs[id] = Math.max(R.buffs[id] || 0, 0) + secs; refreshStats(); sfx('buff'); burst(R.p.x, R.p.y, BUFFS[id].c, 30, 60);
  addText(R.p.x, R.p.y - 26, BUFFS[id].name, BUFFS[id].c, true); return id;
}
function refreshStats() { const f = R.p.hp / R.S.maxHp; R.S = stats(R.gear); R.p.hp = Math.min(R.S.maxHp, f * R.S.maxHp); }
function eventWin(title, secs) { R.evWon++; save.events++; const id = grantBuff(null, secs); if (secs === RUN_BUFF) R.runBuffs = (R.runBuffs || 0) + 1; R.banner = { s: `${title}  ${BUFFS[id].name} ${secs === RUN_BUFF ? 'FOR THE RUN' : secs + 'S'}`, t: 2.6, c: '#ffcd75' }; return id; }
function eventFail(s) { R.ev = null; R.evT = rnd(30, 45); R.banner = { s, t: 1.8, c: '#94b0c2' }; }
function startEvent(k) {
  if (!R || R.over) return null; if (R.ev) return R.ev;
  if (!k && R.wave >= EV8.escFrom && R.escSince >= EV8.escGap && R.majCd > 0 && majorsActive() < EV8.majMax) { R.evT = R.majCd + 0.5; return null; }   // 0.8.0: escort due but a major just started -> hold the slot, don't burn it
  k = k || (R.wave >= EV8.escFrom && R.escSince >= EV8.escGap && canMajor('escort') ? 'escort' : R.evLast === 'well' ? 'goblin' : R.evLast === 'goblin' ? 'well' : pick(['well', 'goblin']));
  if (k === 'escort' || k === 'mage' || k === 'caravan') return startEscort(k === 'escort' ? null : k);   // 0.8.0: escort shares the well/goblin slot
  R.evLast = k; R.escSince++; sfx('event');
  if (k === 'well') { const [x, y] = objRing18(110); R.ev = { k, x, y, r: 30, t: 25, prog: 0, need: 6 }; R.banner = { s: 'A REGEN WELL BUBBLES UP', t: 2.2, c: '#a7f070' }; }
  else { const [x, y] = objRing18(80); const g = spawnEnemy('goblin', x, y); R.ev = { k, e: g }; R.banner = { s: 'GOLD GOBLIN! CATCH IT', t: 2.2, c: '#ffcd75' }; }
  return R.ev;
}
function updateEvents(dt) {
  const p = R.p, S = R.S;
  if (!R.ev) { if (R.wave >= 2) { R.evT -= dt; if (R.evT <= 0) startEvent(); } return; }
  const ev = R.ev;
  if (ev.k === 'well') {
    ev.t -= dt; const inside = Math.hypot(p.x - ev.x, p.y - ev.y) < ev.r; ev.inside = inside;
    if (inside) { ev.prog += dt; if (canHeal()) p.hp = Math.min(S.maxHp, p.hp + S.maxHp * 0.06 * dt); if (Math.random() < 0.5) R.PT.push({ x: p.x + rnd(-5, 5), y: p.y - rnd(0, 10), vx: 0, vy: -25, t: 0.4, m: 0.4, c: PAL[5], s: 1 }); }
    if (Math.random() < 0.3) R.PT.push({ x: ev.x + rnd(-ev.r, ev.r) * 0.7, y: ev.y + rnd(-ev.r, ev.r) * 0.4, vx: 0, vy: -15, t: 0.5, m: 0.5, c: PAL[11], s: 1 });
    if (ev.prog >= ev.need) { R.ev = null; R.evT = rnd(35, 50); goldDrop(p.x, p.y, 15 + 3 * R.wave, 6); eventWin('WELL BLESSING!', 60); }
    else if (ev.t <= 0) eventFail('THE WELL RUNS DRY');
  } else if (ev.k === 'escort') updateEscort(dt, ev);
  else if (ev.k === 'goblin') { if (!ev.e || ev.e.hp <= 0) { if (ev.e && ev.e.escaped) eventFail('THE GOBLIN GOT AWAY'); else if (R.ev === ev) { R.ev = null; R.evT = rnd(35, 50); } } }
}
/* ---- 0.8.0 events pack (numbers + rationale: DECISIONS.md § 0.8.0 implementation choices) ----
   Director: the escort rides in the classic event slot (well / goblin / escort, one at a time). Installations + exit gate run on their own clocks.
   "Majors" = escort, installations, gate: a new major never starts within majGap s of another (or of a boss / mini-boss spawn), and at most majMax are up
   at once (the gate ignores the cap so it can't be locked out by installations you chose to ignore). */
const EV8 = {
  barFirst: 95, barEvery: 100, barAfterKill: 75, catFirst: 190, catEvery: 110, catAfterKill: 90, gateFirst: 215, gateAgain: 90,
  majGap: 20, majMax: 2, escFrom: 4, escGap: 2, raidMul: 0.6, wardMul: 0.5,
  mage: { hp: 220, need: 14, ward: 56, pulses: [1.5, 5.5, 9.5], frost: 4, frostR: 44, shield: 0.25 },
  caravan: { hp: 260, dist: 320, spd: 24, near: 80, every: 6, pulses: 5, limit: 75 },
  gate: { open: 60, need: 6, r: 24 },
};
const instHp = w => 1 + 0.18 * (w - 1);   // linear, not hpMult: a structure must stay killable with run gear (0.9.0: 0.15 -> 0.18 / wave)
/* 0.9.0 installation tune: ignoring them must hurt. Barracks: armoured (takes 20% less), packs every 9s (7s from w12) that grow +1 every 3 packs, an elite every 4th pack from w6.
   Catapult: deploys 330-400px out (was 230-290), guarded by 3 grunts, shell every 4.8s (3.8s from w12), leading 2nd shell from w8 (was 12), 3rd from w16, 26px circles, 9 + 1.1/wave dmg.
   Inside 70px it can't depress its arm: shells land 90-140px away instead (reward for closing in). */
const INST9 = { barArmor: 0.2, barEvery: 9, barEveryLate: 7, packGrow: 3, packMax: 8, eliteEvery: 4, eliteFrom: 6,
  catNear: [330, 400], catGuards: 3, catEvery: 4.8, catEveryLate: 3.8, lead2: 8, lead3: 16, shellR: 26, shellDmg: w => 9 + 1.1 * w, deadZone: 70, redeploy: 900 };
const barCap = w => w >= 10 ? 2 : 1, catCap = w => w >= 14 ? 2 : 1;
/* 1.16.0 OUTPOSTS: barracks + artillery are far outposts with 8 tiers. Max tier unlocks every ~10 waves (outMaxTier). They start at tier 1 and GROW while ignored (OUT7.grow s per step), capped by the wave gate so a wave-40 citadel matters.
   Barracks: HUT > CAMP > BARRACKS > WAR CAMP > FORT > KEEP > CITADEL > FORTRESS.
   Artillery families (visuals match the unit — NO mage sitting on a catapult):
     T1-3 CATAPULT / CATAPULT SQUAD / HEAVY CAT — sky-arc rocks; some leave ground DoT/slow.
     T4-6 CANNON / CANNON SQUAD / SIEGE CANNON — straight-line shots; can leave ground effects; squads get shield-bearers.
     T7-8 MAGE / ARCHMAGE — arcs + lines; ground debuffs (slow / no-regen / weak / DoT) stack at higher tiers.
   Artillery damage also ramps +OUT7.ramp per second alive. Drawn + labelled per tier; CLEAN HUD keeps only arrows + a short banner. */
const OUT7 = { maxT: 8, grow: [0, 40, 42, 45, 48, 52, 55, 60],
  hpX: [1, 1.45, 2.1, 2.9, 4.0, 5.4, 7.2, 9.5],
  names: { barracks: ['HUT', 'CAMP', 'BARRACKS', 'WAR CAMP', 'FORT', 'KEEP', 'CITADEL', 'FORTRESS'],
    catapult: ['CATAPULT', 'CATAPULT SQUAD', 'HEAVY CAT', 'CANNON', 'CANNON SQUAD', 'SIEGE CANNON', 'MAGE', 'ARCHMAGE'] },
  packX: [1, 1.2, 1.45, 1.7, 2.0, 2.3, 2.7, 3.2], barEvery: [9, 8.2, 7.4, 6.6, 5.9, 5.3, 4.8, 4.3], eliteEvery: [4, 3, 3, 2, 2, 2, 1, 1],
  shellX: [1, 1.35, 1.7, 2.1, 2.5, 3.0, 3.6, 4.3], shellR: [26, 28, 30, 32, 34, 36, 40, 44], extraShells: [0, 0, 1, 0, 1, 2, 2, 3],
  catEvery: [4.8, 4.5, 4.2, 4.0, 3.7, 3.4, 3.1, 2.8], ramp: 0.01, rampMax: 2.5,
  family: ['cat', 'cat', 'cat', 'cannon', 'cannon', 'cannon', 'mage', 'mage'],
  squadAt: [2, 5], squad: 4, squadDR: 0.6,
  far: { barracks: [320, 400], catapult: [380, 460] }, gold: [1, 1.3, 1.7, 2.2, 2.8, 3.5, 4.4, 5.5],
  /* ground FX flags per artillery tier: slow / noregen / weak / dot */
  gfx: [0, 1, 1, 2, 2, 3, 7, 15],
  /* compat aliases used by older comments/tests */
  t2: 10, t3: 20 };
const outMaxTier = (w = (R && R.wave) || 1) => Math.min(OUT7.maxT, 1 + Math.floor(Math.max(0, w - 1) / 10));   // wave 1-10:1 … wave 71+:8
const outTier = e => e.ot || 1;
const outName = e => OUT7.names[e.inst][Math.min(OUT7.maxT, outTier(e)) - 1];
const outFam = e => OUT7.family[Math.min(OUT7.maxT, outTier(e)) - 1];
const outShellX = e => OUT7.shellX[Math.min(OUT7.maxT, outTier(e)) - 1] * Math.min(OUT7.rampMax, 1 + OUT7.ramp * (e.age || 0));
function outGrow(e, quiet) {   // promote one tier (wave-capped): HP keeps its %
  const cap = outMaxTier(R.wave); if (outTier(e) >= cap || outTier(e) >= OUT7.maxT) return false;
  const t = outTier(e) + 1, k = OUT7.hpX[t - 1] / OUT7.hpX[t - 2]; e.ot = t; e.maxHp *= k; e.hp *= k; e.gT = 0; e.r = ETYPES[e.inst].r * (1 + 0.18 * (t - 1));
  if (e.inst === 'catapult' && OUT7.squadAt.includes(t)) outSquad(e);
  if (!quiet) { const fam = outFam(e); R.banner = { s: `THE ${e.inst === 'barracks' ? 'BARRACKS' : fam === 'mage' ? 'MAGE BATTERY' : fam === 'cannon' ? 'CANNON' : 'CATAPULT'} GROWS: ${outName(e)}!`, t: 2, c: PAL[2] };
    evLogPush(R.banner.s); R.bq.length = 0;   // 1.16.0: one short line, no stacked tips in CLEAN
    if (verboseHud()) R.bq.push({ s: e.inst === 'barracks' ? 'MORE PACKS, MORE ELITES - RAZE IT' : fam === 'cat' && t === 2 ? 'SHIELD-BEARERS GUARD IT - KILL THEM FIRST' : fam === 'mage' ? 'HEX GROUND: SLOW / NO-REGEN / WEAK' : 'SHELLS GROW DEADLIER - RAZE IT', t: 2, c: '#ffcd75' });
    addShake(4); sfx('boss'); burst(e.x, e.y - 8, PAL[2], 40, 70); }
  return true;
}
function outSquad(e) { for (let i = 0; i < OUT7.squad; i++) { const a = i / OUT7.squad * TAU + 0.4, g = spawnEnemy(pickType(true), e.x + Math.cos(a) * 26, e.y + Math.sin(a) * 18, { elite: i === 0 }); g.guard = e.id; g.squad = e.id; } }
const outShielded = e => e.inst === 'catapult' && OUT7.squadAt.includes(outTier(e)) && R.E.some(o => o.squad === e.id && o.hp > 0);
function drawOutpost(e, ex, ey, now, F, wind) {   // 1.16.0: family-matched art (no mage perched on a catapult)
  const t = outTier(e), fr = (x, y, w, h, c) => { ctx.fillStyle = c; ctx.fillRect(ex + x, ey + y, w, h); };
  if (e.inst === 'barracks') {
    if (t >= 2) for (const [hx, hy] of [[-30, 6], [24, 8], [-6, 14]]) { fr(hx - 9, hy - 10, 18, 10, '#0b0b14'); fr(hx - 8, hy - 9, 16, 9, F(WOOD2)); fr(hx - 10, hy - 13, 20, 4, F('#5d275d')); fr(hx - 2, hy - 5, 4, 5, wind ? PAL[3] : '#0b0b14'); }
    if (t >= 4) { fr(-18, -28, 10, 18, '#0b0b14'); fr(-17, -27, 8, 17, F('#333c57')); fr(10, -28, 10, 18, '#0b0b14'); fr(11, -27, 8, 17, F('#333c57')); }
    if (t >= 6) { fr(-12, -46, 24, 30, '#0b0b14'); fr(-11, -45, 22, 29, F('#566c86')); for (let i = 0; i < 6; i++) fr(-11 + i * 4, -49, 3, 4, F('#566c86')); fr(-11, -45, 22, 1, F('#94b0c2'));
      fr(-4, -38, 8, 9, '#0b0b14'); fr(-3, -37, 6, 8, wind ? PAL[3] : '#29366f'); }
    if (t >= 7) { fr(-24, -34, 8, 30, '#0b0b14'); fr(-23, -33, 6, 29, F('#333c57')); fr(16, -34, 8, 30, '#0b0b14'); fr(17, -33, 6, 29, F('#333c57')); fr(10, -62, 1, 14, WOOD2); fr(11, -62, 9, 5, PAL[2]); }
    if (t >= 8) { fr(-8, -70, 16, 8, '#0b0b14'); fr(-7, -69, 14, 6, F('#94b0c2')); fr(-2, -78, 4, 8, F(PAL[2])); }
    if (ON18 && t >= WIZ18.barFrom) { const gl = Math.floor(now / 160) % 2; fr(27, -32, 10, 30, '#0b0b14'); fr(28, -31, 8, 29, F('#29366f')); fr(26, -36, 12, 5, '#0b0b14'); fr(27, -35, 10, 3, F('#5d275d')); fr(29, -40, 6, 4, F('#5d275d')); fr(31, -44, 2, 4, F('#5d275d')); fr(31, -46, 2, 2, gl ? PAL[11] : PAL[4]); fr(30, -24, 4, 4, gl ? PAL[11] : '#3b5dc9'); }   // 1.18.0 wizard tower
  } else {
    const fam = outFam(e);
    if (outShielded(e)) { ctx.strokeStyle = PAL[10]; ctx.globalAlpha = 0.5 + 0.3 * Math.sin(now / 120); ctx.lineWidth = 1; ctx.beginPath(); ctx.ellipse(ex, ey - 12, 24, 20, 0, 0, TAU); ctx.stroke(); ctx.globalAlpha = 1; text(ctx, 'SHIELDED', ex, ey + 8, PAL[10], 1, 'c'); }
    if (fam === 'cannon') {   // iron tube on a carriage (replaces the wooden arm look via overlay)
      fr(-14, -18, 28, 8, '#0b0b14'); fr(-13, -17, 26, 6, F('#333c57')); fr(-18, -14, 12, 5, F('#566c86')); fr(4, -15, 16, 4, F('#94b0c2')); fr(18, -16, 6, 6, F('#566c86'));
      if (t >= 6) { fr(-6, -24, 4, 8, F('#333c57')); fr(2, -24, 4, 8, F('#333c57')); }
      if (ON18 && t >= 7) { fr(-12, -30, 24, 10, '#0b0b14'); fr(-11, -29, 22, 8, F('#333c57')); fr(-9, -33, 18, 4, F('#566c86')); fr(-6, -35, 12, 2, F('#94b0c2')); fr(-4, -34, 8, 1, '#0b0b14'); if (t >= 8) { fr(-22, -12, 10, 6, '#0b0b14'); fr(-21, -11, 8, 4, F('#566c86')); fr(14, -12, 10, 6, '#0b0b14'); fr(15, -11, 8, 4, F('#566c86')); fr(-17, -4, 34, 3, F(WOOD2)); } }   // 1.18.0 bombard / grand battery
    } else if (fam === 'mage') {   // free-standing mage / archmage (NOT on a catapult)
      const hv = Math.round(Math.sin(now / 250));
      fr(-10, -8, 20, 6, '#0b0b14'); fr(-9, -7, 18, 4, F('#5d275d'));   // rune circle
      fr(-4, -22 + hv, 8, 12, '#0b0b14'); fr(-3, -21 + hv, 6, 11, F(t >= 8 ? '#29366f' : '#5d275d'));
      fr(-2, -27 + hv, 4, 5, F('#5d275d')); fr(-1, -29 + hv, 2, 2, F('#ffcd75'));
      fr(6, -30 + hv, 1, 18, WOOD); fr(5, -33 + hv, 3, 3, Math.floor(now / 120) % 2 ? PAL[11] : PAL[4]);
      if (t >= 8) { fr(-12, -18 + hv, 4, 4, F(PAL[11])); fr(8, -18 + hv, 4, 4, F(PAL[11])); }
    } else if (t >= 3) {   // heavy catapult: bigger arm tip / counterweight (still a catapult)
      fr(-8, -22, 6, 6, F('#566c86')); fr(6, -10, 8, 5, F(WOOD2));
    }
  }
}

const instCount = k => R.E.reduce((n, e) => n + (e.inst && e.hp > 0 && (!k || e.inst === k) ? 1 : 0), 0);
function majorsActive() { return (R.ev && R.ev.k === 'escort' ? 1 : 0) + (R.gate ? 1 : 0) + instCount(); }
const canMajor = kind => R.majCd <= 0 && (kind === 'gate' || majorsActive() < EV8.majMax);
function farPos(a, b) { if (ON18 && R && !R.raid) return farPos18(a, b); const ang = Math.random() * TAU, d = rnd(a, b); return [R.p.x + Math.cos(ang) * d, R.p.y + Math.sin(ang) * d * 0.8]; }
function spawnInst(k) {
  const [x, y] = farPos(OUT7.far[k][0], OUT7.far[k][1]), e = spawnEnemy(k, x, y); e.inst = k; e.kbr = 0; e.hp = e.maxHp = ETYPES[k].hp * instHp(R.wave) * R.M.hp; e.it = k === 'barracks' ? 4 : 3; e.wind = 0; e.packs = 0; e.ot = 1; e.age = 0; e.gT = 0;   // 1.16.0 far outpost, tier 1
  for (let t = 2; t <= outMaxTier(R.wave); t++) outGrow(e, true);   // late waves: already at the wave-unlocked tier
  if (k === 'catapult') for (let i = 0; i < INST9.catGuards; i++) { const a = i / INST9.catGuards * TAU, g = spawnEnemy(pickType(true), x + Math.cos(a) * 22, y + Math.sin(a) * 14); g.guard = e.id; }   // 0.9.0 guarded
  R.majCd = EV8.majGap; sfx('boss'); addShake(3);
  const sight = k === 'barracks' ? `ENEMY BARRACKS SIGHTED: ${outName(e)}` : `${outFam(e) === 'mage' ? 'MAGE BATTERY' : outFam(e) === 'cannon' ? 'CANNON' : 'CATAPULT'} IN RANGE: ${outName(e)}!`;
  R.banner = { s: sight, t: 2, c: k === 'barracks' ? PAL[2] : PAL[3] }; evLogPush(sight);
  R.bq = R.bq.filter(q => !/BARRACKS SIGHTED|IN RANGE:/.test(q.s || '')); R.bq.unshift({ s: sight, t: 2.2, c: k === 'barracks' ? PAL[2] : PAL[3] });   // 1.16.0: sticky sighting survives a competing banner (well-end etc.)
  if (verboseHud()) R.bq.push({ s: k === 'barracks' ? 'SMASH THE B - IT GROWS IF IGNORED' : 'SHELLS GROW DEADLIER - SMASH THE C', t: 2, c: '#94b0c2' });
  return e;
}
function instKill(e) {
  const w = R.wave, k = e.inst; R.instWon++;
  burst(e.x, e.y - 6, PAL[3], 60, 90); burst(e.x, e.y - 6, '#5a4630', 30, 70); burst(e.x, e.y, '#f4f4f4', 14, 30, 0.25); addShake(7); R.hitstop = Math.max(R.hitstop, 0.1); sfx('boss');
  const ot = outTier(e); goldDrop(e.x, e.y, (20 + 5 * w) * OUT7.gold[ot - 1], 8); const xv = Math.max(1, Math.round((15 + 3 * w) * OUT7.gold[ot - 1] * R.M.loot / 6)); for (let i = 0; i < 6; i++) R.G.push({ x: e.x + rnd(-8, 8), y: e.y + rnd(-8, 8), v: xv, mag: false });
  R.H.push({ x: e.x + 8, y: e.y + 2, t: 30 }); dropWeapon(e.x - 10, e.y + 2, rollItem(w, { min: ot >= 5 ? 2 : 1 }), false); if (ot >= 2) dropWeapon(e.x + 10, e.y + 2, rollItem(w, { slot: pick(ARMOR_SLOTS), min: Math.min(2, ot - 1) }), false);   // 1.16.0: bigger outposts drop more
  if (k === 'barracks') R.barT = Math.max(R.barT, R.t + EV8.barAfterKill); else { R.catT = Math.max(R.catT, R.t + EV8.catAfterKill); R.shells = R.shells.filter(s => s.src !== e.id); }
  const razed = `${k === 'barracks' ? 'BARRACKS RAZED' : outFam(e) === 'mage' ? 'MAGE BANISHED' : outFam(e) === 'cannon' ? 'CANNON SMASHED' : 'CATAPULT SMASHED'}: ${outName(e)}!`;
  R.banner = { s: razed, t: 2, c: '#ffcd75' }; evLogPush(razed);
}
function updateInst(dt) {
  const p = R.p, w = R.wave;
  for (const e of R.E) { if (!e.inst || e.hp <= 0) continue;
    if (Math.hypot(e.x - p.x, e.y - p.y) > (e.inst === 'catapult' ? INST9.redeploy : 700)) { const [x, y] = e.inst === 'catapult' ? farPos(INST9.catNear[0], INST9.catNear[1]) : farPos(250, 300); e.x = x; e.y = y; e.it = Math.max(e.it, 3); continue; }   // you outran it: it redeploys off-screen
    if (e.frozen > 0) { e.frozen -= dt; continue; }   // Nova / freeze pauses it
    e.age = (e.age || 0) + dt; e.gT = (e.gT || 0) + dt; if (outTier(e) < outMaxTier(w) && e.gT >= OUT7.grow[outTier(e)]) outGrow(e);   // 1.16.0 grows while ignored, wave-capped
    e.it -= dt; e.wind = e.it < (e.inst === 'barracks' ? 1.2 : 0.8) ? 1 : 0; if (e.it > 0) continue;
    if (e.inst === 'barracks') { const ot = outTier(e); e.it = Math.min(w >= 12 ? INST9.barEveryLate : INST9.barEvery, OUT7.barEvery[ot - 1]);
      if (R.E.length < Math.min(260, 40 + 12 * w) + 30) { e.packs++; const n = Math.round(Math.min(INST9.packMax, 2 + Math.floor(w / 4) + Math.floor((e.packs - 1) / INST9.packGrow)) * OUT7.packX[ot - 1]); for (let i = 0; i < n; i++) { const m = spawnEnemy(pickType(), e.x + rnd(-10, 10), e.y + 8 + rnd(-3, 6)); m.fromB = e.id; }
        if ((w >= INST9.eliteFrom || ot >= 2) && e.packs % OUT7.eliteEvery[ot - 1] === 0) { const m = spawnEnemy(pickType(true), e.x, e.y + 10, { elite: true }); m.fromB = e.id; } if (ON18) barWiz18(e, ot);   // 0.9.0 escalation
        burst(e.x, e.y - 2, PAL[2], 14, 40); if (onScreen(e, -40)) sfx('wind'); } }
    else { const ot = outTier(e), fam = outFam(e); e.it = Math.min(w >= 12 ? INST9.catEveryLate : INST9.catEvery, OUT7.catEvery[ot - 1]); const mv = input.mx || input.my, close = Math.hypot(p.x - e.x, p.y - e.y) < INST9.deadZone;
      const sh = close ? [0, 1].map(() => { const a = Math.random() * TAU, d = rnd(90, 140); return [e.x + Math.cos(a) * d, e.y + Math.sin(a) * d * 0.7]; }) : [[p.x, p.y]];
      if (!close && w >= INST9.lead2) sh.push(mv ? [p.x + input.mx * 70, p.y + input.my * 70] : [p.x + rnd(-40, 40), p.y + rnd(-30, 30)]);
      if (!close && w >= INST9.lead3) sh.push([p.x + rnd(-60, 60), p.y + rnd(-45, 45)]);
      if (!close) for (let i = 0; i < OUT7.extraShells[ot - 1]; i++) sh.push([p.x + rnd(-70, 70), p.y + rnd(-50, 50)]);
      const fly = fam === 'cannon' ? 0.85 : fam === 'mage' ? 1.2 : 1.5, kind = fam === 'cannon' ? 'line' : fam === 'mage' ? (Math.random() < 0.5 ? 'arc' : 'line') : 'arc';
      for (const [tx, ty] of sh) R.shells.push({ src: e.id, sx: e.x, sy: e.y - 14, x: tx, y: ty, t: fly, m: fly, r: OUT7.shellR[ot - 1], dmg: INST9.shellDmg(w) * outShellX(e), kind, fam, gfx: OUT7.gfx[ot - 1], ot }); sfx('eshot'); }   // 1.16.0 family shots
  }
  for (const s of R.shells) { s.t -= dt; if (s.t > 0) continue;
    R.FX.push({ k: 'fire', x: s.x, y: s.y, r: s.r, ry: 0.7, t: 0.45, m: 0.45, sd: (s.x * 7 + s.y * 3) & 63 }, { k: 'scorch', x: s.x, y: s.y, r: s.r * 0.8, ry: 0.7, t: 1.2, m: 1.2 }); burst(s.x, s.y, s.fam === 'mage' ? PAL[11] : PAL[3], 24, 70); burst(s.x, s.y, '#566c86', 10, 40);
    if (s.gfx) {   // 1.16.0 ground debuff patches
      const life = 2.2 + 0.3 * (s.ot || 1); R.groundFx = R.groundFx || [];
      if (s.gfx & 1) R.groundFx.push({ k: 'slow', x: s.x, y: s.y, r: s.r * 0.9, t: life, m: life });
      if (s.gfx & 2) R.groundFx.push({ k: 'dot', x: s.x, y: s.y, r: s.r * 0.75, t: life, m: life, dps: 4 + (s.ot || 1) });
      if (s.gfx & 4) R.groundFx.push({ k: 'noregen', x: s.x, y: s.y, r: s.r * 0.85, t: life, m: life });
      if (s.gfx & 8) R.groundFx.push({ k: 'weak', x: s.x, y: s.y, r: s.r * 0.85, t: life, m: life });
    }
    if (ON18) burnGround18(s);   // 1.18.0 artillery leaves burning ground
    if (Math.abs(s.x - p.x) < VW / 2 + 30 && Math.abs(s.y - p.y) < VH / 2 + 30) { addShake(4); sfx('nova'); }
    if (Math.hypot((p.x - s.x) / s.r, (p.y - s.y) / (s.r * 0.7)) < 1 && p.inv <= 0 && !p.dash) hurt(s.dmg);
    for (const e of R.E) if (!e.inst && e.hp > 0 && Math.hypot(e.x - s.x, e.y - s.y) < s.r + e.r) hit(e, R.S.baseDmg, { proc: false, noCrit: true, col: PAL[3] }); }
  R.shells = R.shells.filter(s => s.t > 0);
  if (R.groundFx) {   // apply / age ground patches under the player
    for (const g of R.groundFx) { g.t -= dt; if (g.t <= 0) continue; if (Math.hypot(p.x - g.x, p.y - g.y) < g.r) {
      if (g.k === 'slow') p.artSlow = Math.max(p.artSlow || 0, 0.45);
      if (g.k === 'noregen') p.artNoRegen = Math.max(p.artNoRegen || 0, 0.6);
      if (g.k === 'weak') p.artWeak = Math.max(p.artWeak || 0, 0.6);
      if (g.k === 'dot' && p.inv <= 0 && !p.dash) { p.hp = Math.max(1, p.hp - g.dps * dt); }
    } }
    R.groundFx = R.groundFx.filter(g => g.t > 0);
    if (p.artSlow > 0) p.artSlow -= dt; if (p.artNoRegen > 0) p.artNoRegen -= dt; if (p.artWeak > 0) p.artWeak -= dt;
  }
}
/* 1.7.0 EXIT GATES: one every GATE7.every waves (10, 20, 30 ...; a portal drop gets the next one). It rises SEALED: beat its trial to unseal it, then stand in it
   GATE7.need s to EXTRACT (escape bonus + gift + the KEEP picker). Trials rotate kill quota / rune sequence / gate keeper; on a Gear Check wave the Warden is the trial.
   A gate lives GATE7.life s (at least GATE7.openMin s once unsealed); miss it and the next one is 10 waves away. Dying or abandoning without extracting loses EVERY item. */
const GATE7 = { every: 10, life: 120, openMin: 40, need: 5, r: 26, far: [190, 230], quotaR: 110, quota: w => Math.min(60, 15 + Math.round(w * 0.6)), runeN: 3, runeD: 74, runeR: 16, runeStay: 2.2, runePack: w => 4 + Math.floor(w / 6), keeperHp: 7, trials: ['quota', 'runes', 'keeper'] };
const TRIAL_TXT = { quota: 'KILL INSIDE THE RED RING', runes: 'STAND ON THE RUNES IN ORDER', keeper: 'SLAY THE GATE KEEPER', warden: 'BEAT THE GEAR CHECK' };
const isGateWave = w => w > 0 && w % GATE7.every === 0;
const nextGateWave = w => Math.floor(w / GATE7.every) * GATE7.every + GATE7.every;
function openGate(trial) {
  if (!R || R.over || R.raid) return null; const w = R.wave, [x, y] = ON18 && R.gateFore ? [R.gateFore.x, R.gateFore.y] : farPos(GATE7.far[0], GATE7.far[1]);
  trial = trial || (R.gc && R.gc.e && R.gc.e.hp > 0 ? 'warden' : GATE7.trials[Math.floor(w / GATE7.every) % GATE7.trials.length]);
  const g = R.gate = { x, y, r: GATE7.r, open: GATE7.life, prog: 0, need: GATE7.need, surged: false, inside: false, sealed: true, trial, w, cnt: 0, quota: GATE7.quota(w), ri: 0, rp: 0, runes: [], keeper: null };
  if (trial === 'runes') { const a0 = Math.random() * TAU; for (let i = 0; i < GATE7.runeN; i++) { const a = a0 + i / GATE7.runeN * TAU; g.runes.push({ x: x + Math.cos(a) * GATE7.runeD, y: y + Math.sin(a) * GATE7.runeD * 0.7, done: false }); } }
  if (trial === 'keeper') { const k = spawnEnemy(pickType(true), x, y + 16, { elite: true }); k.hp = k.maxHp = k.maxHp * GATE7.keeperHp; k.keeper = true; k.kbr = 0; k.r *= 1.2; k.sc = Math.max(k.sc, 1.8); g.keeper = k; }
  R.gatesSeen = (R.gatesSeen || 0) + 1; R.majCd = Math.max(R.majCd, EV8.majGap); sfx('event');
  const b = escapeBonus(), gb = { s: 'AN EXIT GATE RISES - SEALED', t: 2.6, c: PAL[11] }; if (trial === 'warden') R.bq.push(gb); else R.banner = gb;   // the Gear Check keeps its own banner
  R.bq.push({ s: `TO UNSEAL IT: ${TRIAL_TXT[trial]}`, t: 2.4, c: '#ffcd75' }, { s: `ESCAPE PAYS +${b.g}G +${b.x}XP +${b.gift} GIFT + KEEP GEAR`, t: 2.4, c: '#94b0c2' }); return ON18 && !R.reOpen18 ? gate18Init(g) : g;
}
function gateUnseal(why) {
  const g = R.gate; if (!g || !g.sealed) return false; g.sealed = false; g.open = Math.max(g.open, GATE7.openMin); g.keeper = null; R.gateOpened = (R.gateOpened || 0) + 1;
  R.FX.push({ k: 'ring', x: g.x, y: g.y, r: 60, t: 0.5, m: 0.5, c: PAL[11] }); burst(g.x, g.y - 12, PAL[11], 40, 80); burst(g.x, g.y - 12, '#ffcd75', 20, 50); sfx('revive');
  R.banner = { s: why || 'THE EXIT GATE UNSEALS!', t: 2.4, c: PAL[11] }; R.bq.push({ s: `STAND IN THE GATE ${GATE7.need}S TO EXTRACT`, t: 2.2, c: '#ffcd75' }); return true;
}
function gateKill(e) {   // from kill(): keeper + kill-quota trials
  const g = R.gate; if (!g || !g.sealed) return;
  if (g.trial === 'keeper' && e.keeper) gateUnseal('KEEPER SLAIN: THE GATE UNSEALS!');
  else if (g.trial === 'quota' && Math.hypot(e.x - g.x, (e.y - g.y) / 0.7) < GATE7.quotaR) { g.cnt++; if (g.cnt >= g.quota) gateUnseal('QUOTA MET: THE GATE UNSEALS!'); }
}
function updateGate(dt) {
  const g = R.gate; if (!g) return; const p = R.p;
  g.inside = Math.hypot((p.x - g.x) / g.r, (p.y - g.y) / (g.r * 0.7)) < 1;
  if (Math.random() < (g.sealed ? 0.15 : 0.4)) R.PT.push({ x: g.x + rnd(-9, 9), y: g.y - rnd(4, 24), vx: 0, vy: -12, t: 0.5, m: 0.5, c: g.sealed ? PAL[2] : Math.random() < 0.5 ? PAL[11] : PAL[12], s: 1 });
  g.open -= dt; if (ON18 && !g.sealed && g.inside && g.open < 1) g.open = 1;   // 1.18.0 standing in an open gate holds it
  if (g.sealed) {
    if (g.trial === 'runes') { const ru = g.runes[g.ri]; if (ru && Math.hypot((p.x - ru.x) / GATE7.runeR, (p.y - ru.y) / (GATE7.runeR * 0.7)) < 1) { g.rp += dt;
        if (g.rp >= GATE7.runeStay) { ru.done = true; g.ri++; g.rp = 0; burst(ru.x, ru.y, PAL[11], 24, 60); sfx('zap');
          if (g.ri >= g.runes.length) gateUnseal('RUNES LIT: THE GATE UNSEALS!');
          else { const nx = g.runes[g.ri], n = GATE7.runePack(R.wave), TB = TABLES[R.map] || TABLES.ash, sw = TB.swarm.filter(t => inCast(R.map, t, R.wave)), type = pick(sw.length ? sw : ['slime']);
            for (let i = 0; i < n; i++) { const a = i / n * TAU; spawnEnemy(type, nx.x + Math.cos(a) * 34, nx.y + Math.sin(a) * 24); } R.banner = { s: `RUNE ${g.ri}/${g.runes.length} - GUARDIANS RISE`, t: 1.4, c: '#ffcd75' }; } } }
      else g.rp = Math.max(0, g.rp - dt * 0.6); }
    if (g.trial === 'keeper' && (!g.keeper || g.keeper.hp <= 0 || !R.E.includes(g.keeper))) gateUnseal('KEEPER SLAIN: THE GATE UNSEALS!');
    if (g.trial === 'warden' && !(R.gc && R.gc.e && R.gc.e.hp > 0)) gateUnseal('GEAR CHECK PASSED: THE GATE UNSEALS!');
  } else if (g.inside) { g.prog += dt;
    if (!g.surged) { g.surged = true; const TB = TABLES[R.map] || TABLES.ash, sw = TB.swarm.filter(t => inCast(R.map, t, R.wave)), type = pick(sw.length ? sw : ['slime']), n = 8 + R.wave, d = spawnDist() * 0.8;
      for (let i = 0; i < n; i++) { const a = i / n * TAU; spawnEnemy(type, p.x + Math.cos(a) * d, p.y + Math.sin(a) * d); } R.banner = { s: "THEY WON'T LET YOU LEAVE!", t: 1.8, c: PAL[2] }; sfx('wind'); }
    if (g.prog >= g.need) escapeGate(); }
  else g.prog = Math.max(0, g.prog - dt * 0.5);
  if (R.gate === g && g.open <= 0) { if (g.keeper && g.keeper.hp > 0) g.keeper.keeper = false; R.gate = null; if (ON18) gateMissed18(g); R.banner = { s: `THE EXIT GATE COLLAPSES - NEXT: WAVE ${nextGateWave(R.wave)}`, t: 2.2, c: '#94b0c2' }; }
}
function gateLine(g) { const b = escapeBonus(), bs = `+${b.g}G +${b.x}XP`; if (!g.sealed) return g.inside ? `EXTRACTING ${g.prog.toFixed(1)}/${g.need}S - ${bs}` : `EXIT GATE OPEN ${Math.ceil(g.open)}S - STAND IN IT = EXTRACT`;
  const t = g.trial === 'quota' ? `KILL IN THE RING ${g.cnt}/${g.quota}` : g.trial === 'runes' ? `RUNE ${Math.min(g.ri + 1, g.runes.length)}/${g.runes.length}: STAND ON IT ${g.rp.toFixed(1)}/${GATE7.runeStay}S` : g.trial === 'keeper' ? 'SLAY THE KEEPER' : 'BEAT THE GEAR CHECK';
  return `GATE SEALED ${Math.ceil(g.open)}S - ${t}`; }
function drawGateTrial(g, X, Y, now) {   // sealed gate: chains + the trial on the ground (red quota ring / numbered runes / keeper tether)
  const gx = X(g.x), gy = Y(g.y);
  if (g.trial === 'quota') { ctx.strokeStyle = PAL[2]; ctx.globalAlpha = 0.45 + 0.2 * Math.sin(now / 160); ctx.lineWidth = 1; ctx.setLineDash([4, 3]); ctx.lineDashOffset = now / 70; ctx.beginPath(); ctx.ellipse(gx, gy, GATE7.quotaR, GATE7.quotaR * 0.7, 0, 0, TAU); ctx.stroke(); ctx.setLineDash([]); ctx.globalAlpha = 1;
    text(ctx, `${g.cnt}/${g.quota}`, gx, gy + GATE7.quotaR * 0.7 + 3, PAL[2], 1, 'c'); }
  if (g.trial === 'runes') g.runes.forEach((ru, i) => { const rx = X(ru.x), ry = Y(ru.y), cur = i === g.ri, col = ru.done ? PAL[11] : cur ? '#ffcd75' : '#566c86';
    ctx.fillStyle = col; ctx.globalAlpha = ru.done ? 0.35 : cur ? 0.2 + 0.15 * Math.sin(now / 120) : 0.12; ctx.beginPath(); ctx.ellipse(rx, ry, GATE7.runeR, GATE7.runeR * 0.7, 0, 0, TAU); ctx.fill(); ctx.globalAlpha = 1;
    pxRing(rx, ry, GATE7.runeR, GATE7.runeR * 0.7, 1, col); if (cur && g.rp > 0) pxRing(rx, ry, GATE7.runeR * Math.min(1, g.rp / GATE7.runeStay), GATE7.runeR * 0.7 * Math.min(1, g.rp / GATE7.runeStay), 1, PAL[12]);
    text(ctx, String(i + 1), rx, ry - 3, ru.done ? PAL[11] : col, 1, 'c'); if (cur && Math.floor(now / 300) % 2) text(ctx, 'STAND', rx, ry - 14, '#ffcd75', 1, 'c'); });
  if (g.trial === 'keeper' && g.keeper && g.keeper.hp > 0) { const kx = X(g.keeper.x), ky = Y(g.keeper.y), L = Math.hypot(kx - gx, ky - gy) || 1; ctx.fillStyle = '#ffcd75'; for (let i = 6; i < L; i += 5) ctx.fillRect(Math.round(gx + (kx - gx) * i / L), Math.round(gy - 12 + (ky - gy + 12) * i / L), 2, 1); text(ctx, 'KEEPER', kx, ky - 22 * g.keeper.sc / 1.8, '#ffcd75', 1, 'c'); }
  ctx.fillStyle = '#0b0b14'; for (const dy of [-21, -14, -7]) ctx.fillRect(gx - 9, gy + dy, 18, 2); ctx.fillStyle = '#566c86'; for (const dy of [-21, -14, -7]) for (let i = 0; i < 18; i += 3) ctx.fillRect(gx - 9 + i, gy + dy, 2, 1);   // chains across the arch
  if (Math.floor(now / 400) % 2) text(ctx, 'SEALED', gx, gy + 6, PAL[2], 1, 'c');
}
/* 0.9.0: one formula for the gate preview and the run-end payout. Distance bonus counts waves / minutes actually played (a Portal drop doesn't pre-pay them). */
function distBonus() { const w0 = R.w0 || 1, surv = Math.max(0, R.t - (R.t0 || 0)); return { x: (R.wave - w0) * 8 + Math.floor(surv / 60) * 10, g: (R.wave - w0) * 2, surv, waves: R.wave - w0 + 1 }; }
function escapeBonus() { const d = distBonus(); return { g: Math.round(0.3 * (R.gold + d.g)) + 5 * d.waves, x: Math.round(0.5 * Math.round(d.x * ECON.xp)), gift: `RARE T${tierOf(R.wave) + 1}`, tier: tierOf(R.wave) }; }
function escapeGate() {
  if (!R || R.over) return false; const p = R.p; R.escaped = true; R.gate = null; R.over = true; R.overT = 0; R.flash = 0.4; sfx('extract');
  R.FX.push({ k: 'ring', x: p.x, y: p.y, r: 60, t: 0.5, m: 0.5, c: PAL[11] }); burst(p.x, p.y - 4, PAL[11], 50, 80, 0.8); burst(p.x, p.y - 4, PAL[12], 20, 50, 0.6); for (const b of R.EP) b.life = 0;
  R.banner = { s: 'ESCAPED!', t: 3, c: PAL[11] }; return true;
}
function raidType() {
  const W = castAt(R.map, R.wave).filter(c => ['swarm', 'grunt', 'charger'].includes(ETYPES[c[0]].role)); let r = Math.random() * W.reduce((s, c) => s + c[1], 0);
  for (const [t, v] of W) if ((r -= v) < 0) return t; return W.length ? W[0][0] : 'slime';
}
function startEscort(v, T0, pend) {
  const pre = pend != null ? !!pend : !v, T = clamp(T0 || 3, 1, 6);   // 1.14.2: the director's escort WAITS (RPS.wait s) until you reach it and pick your stakes; an explicit / debug start is live at the neutral T3 with no reward card   // 1.14.1: the director rolls the tier (1 .. msDmax); an explicit / debug start is the neutral T3 (= the 1.14.0 escort)
  if (!R || R.over) return null; if (R.ev) return R.ev;
  v = v || (R.escVar === 'mage' ? 'caravan' : 'mage'); R.escVar = v; R.escN++; R.escSince = 0; R.majCd = EV8.majGap; sfx('event');
  const hm = 1 + 0.1 * (R.wave - 1), say = (a, b) => { R.banner = { s: a, t: 2.4, c: PAL[10] }; R.bq.push({ s: b, t: 2, c: '#94b0c2' }, { s: 'RAIDERS ARE MARKED RED', t: 1.6, c: PAL[2] }); };
  const hx = 1;   // 1.14.1: tier rolled up front (shown on the banner + HUD): harder = bigger / eliter pulses (+ T-2 elites from T3), bigger reward pick; escort HP unchanged
  if (v === 'mage') { const C = EV8.mage, [x, y] = objRing18(70); R.ev = { k: 'escort', v, x, y, r: 6, hp: C.hp * hm * hx, maxHp: C.hp * hm * hx, prog: 0, need: C.need, pi: 0, t: 0, hurtT: 0, ward: false, nT: C.frost, tier: T };
    say(pre ? 'MAGE ESCORT: REACH HER TO PICK A REWARD' : `ESCORT T${T}: PROTECT THE MAGE`, pre ? 'YOUR PICK SETS THE DIFFICULTY · FAIL = NOTHING' : 'STAY IN HER RING'); }
  else { const C = EV8.caravan, [x, y] = objRing18(60), a = Math.random() * TAU;
    R.ev = { k: 'escort', v, x, y, r: 9, sx: x, sy: y, tx: x + Math.cos(a) * C.dist, ty: y + Math.sin(a) * C.dist, hp: C.hp * hm * hx, maxHp: C.hp * hm * hx, t: 0, pT: 2, pn: 0, moving: false, wheel: 0, hurtT: 0, ward: false, tier: T }; road18(R.ev);
    say(pre ? 'CARAVAN: REACH IT TO PICK A REWARD' : `ESCORT T${T}: GUARD THE CARAVAN`, pre ? 'YOUR PICK SETS THE DIFFICULTY · FAIL = NOTHING' : 'IT ONLY ROLLS WHILE YOU STAY CLOSE'); }
  if (pre) { R.ev.pend = RPS.wait; R.ev.tier = 0; }
  return R.ev;
}
function escArm(ev, o) { if (R.ev !== ev) return; const T = o.T; ev.tier = T; ev.reward = o; ev.pend = null; ev.hp = ev.maxHp = ev.maxHp * MSN.hpX[T - 1]; ev.t = 0; ev.pT = 2; ev.prog = 0; ev.pi = 0;
  R.banner = { s: `${ev.v === 'mage' ? 'ESCORT' : 'CARAVAN'} T${T} STARTS: ${o.s}`, t: 2.2, c: MSN.col[T - 1] }; if (T >= RPS.greedT) R.bq.push({ s: 'GREED RING: NO REGEN NEAR IT', t: 1.8, c: PAL[2] }); return ev;
}
function spawnRaiders(ev, n) {
  const a0 = ev.v === 'caravan' ? Math.atan2(ev.ty - ev.y, ev.tx - ev.x) + rnd(-1.2, 1.2) : Math.random() * TAU; let ch = 0;   // caravan raids come from both flanks (odd raiders on the far side)
  for (let i = 0; i < n; i++) { let t = raidType(); if (ETYPES[t].role === 'charger' && ch++) t = (TABLES[R.map] || TABLES.ash).swarm[0];   // at most 1 charger per pulse
    const a = a0 + (ev.v === 'caravan' && i % 2 ? Math.PI : 0) + rnd(-0.45, 0.45), d = rnd(105, 135); R.rq.push({ x: ev.x + Math.cos(a) * d, y: ev.y + Math.sin(a) * d * 0.75, t: 1, m: 1, type: t, ev }); }
  if (!R.banner) R.banner = { s: 'RAIDERS INCOMING!', t: 1.2, c: PAL[2] }; sfx('wind');
}
function escTierPulse(ev, base) { const T = ev.tier || 1; spawnRaiders(ev, Math.round(base * MSN.packX[T - 1]));   // 1.14.1 tiered pulse (x0.7 .. x1.5; + T-3 elites from T4; T3 = the 1.14.0 escort)
  for (let i = 0; i < (T >= 4 ? T - 3 : 0); i++) { const a = Math.random() * TAU, r = rnd(110, 135); R.rq.push({ x: ev.x + Math.cos(a) * r, y: ev.y + Math.sin(a) * r * 0.75, t: 1.2, m: 1.2, type: raidType(), ev, elite: true }); } }
function escortHurt(ev, d) {
  if (ev.ms && ev.ms.d >= MSN.breakD) d *= MSN.breakX;   // 1.14.0 trial D5+: breakers hit her harder
  d *= EV8.raidMul * (ev.ward ? EV8.wardMul : 1); ev.hp -= d; ev.hurtT = 0.15; addText(ev.x, ev.y - 16, Math.round(d), PAL[2]);
}
function escortEnd(ev) { for (const e of R.E) if (e.raid === ev) e.raid = null; R.rq = R.rq.filter(q => q.ev !== ev); }
function escortFail(ev, s) { if (ev.reward) s += ': REWARD LOST'; escortEnd(ev); burst(ev.x, ev.y - 6, '#566c86', 30, 60); burst(ev.x, ev.y - 6, PAL[2], 12, 40); eventFail(s); }
function escortWin(ev) {
  if (ev.ms) return missionWin(ev);   // 1.14.0 mage trial
  const w = R.wave, p = R.p; escortEnd(ev); R.ev = null; R.evT = rnd(35, 50); R.escWon++;
  // 1.14.2: win = exactly the card you picked (the old item / heal / XP / gold / supply crate extras are gone)
  if (ev.v === 'mage') { R.FX.push({ k: 'ring', x: ev.x, y: ev.y, r: 70, t: 0.5, m: 0.5, c: PAL[11] }); burst(ev.x, ev.y - 8, PAL[11], 50, 90); R.flash = 0.15; sfx('nova');   // her parting blast
    for (const e of R.E) { if (e.inst || e.hp <= 0) continue; const d = Math.hypot(e.x - ev.x, e.y - ev.y); if (d < 70 + e.r) { e.frozen = Math.max(e.frozen, e.boss ? 0.5 : 1.5); hit(e, R.S.baseDmg * 3, { proc: false, col: PAL[11] }); } }
    rpWin(ev.reward, ev.x, ev.y, 'MAGE ESCORT', 'TELEPORT COMPLETE!'); }
  else { burst(ev.x, ev.y - 8, PAL[4], 40, 70); rpWin(ev.reward, ev.x, ev.y, 'CARAVAN', 'CARAVAN ARRIVED!'); }   // 1.14.0: + a supply crate (wood / stone / oil) + refugees (people)
}
function escPick(ev, title, src) { R.evWon++; save.events++; R.banner = { s: `${title} CHOOSE A REWARD`, t: 2.6, c: '#ffcd75' }; return rpOpen(src, ev.tier || 1, ev.x, ev.y); }   // 1.14.1: the pause-style pick replaces the random power-up
function updateEscort(dt, ev) {
  const p = R.p; ev.t += dt; ev.hurtT = Math.max(0, ev.hurtT - dt); const near = Math.hypot(p.x - ev.x, p.y - ev.y);
  if (ev.pend != null && !ev.ms) { ev.pend -= dt; ev.ward = false; ev.moving = false;   // 1.14.2: waiting for you (Market-style timer); reach it -> forced stakes pick
    if (near < RPS.r && !ev.asked) { ev.asked = 1; rpPre(ev.v === 'mage' ? 'MAGE ESCORT' : 'CARAVAN', ev.x, ev.y, o => escArm(ev, o)); return; }
    if (ev.pend <= 0) { escortEnd(ev); eventFail(ev.v === 'mage' ? 'THE MAGE MOVES ON' : 'THE CARAVAN LEAVES WITHOUT YOU'); } return; }
  if (ev.tier && !ev.ms) greedRing(ev.tier, near < (ev.v === 'mage' ? EV8.mage.ward : EV8.caravan.near));
  if (ev.hp <= 0) { if (ev.ms) { R.sigT = rnd(MSN.every[0], MSN.every[1]); R.msLog.push(`D${ev.ms.d} FAILED`); } return escortFail(ev, ev.ms ? `MAGE TRIAL D${ev.ms.d} FAILED` : ev.v === 'mage' ? 'THE MAGE HAS FALLEN' : 'THE CARAVAN IS LOST'); }
  if (ev.v === 'mage') { const C = EV8.mage; ev.ward = near < C.ward; ev.prog += dt;
    const PL = ev.ms ? ev.ms.pl : C.pulses; while (ev.pi < PL.length && ev.prog >= PL[ev.pi]) { ev.pi++; if (ev.ms) missionPulse(ev); else escTierPulse(ev, 4 + Math.floor(R.wave / 3)); }
    if (ev.ms) missionAura(ev, near, dt);
    ev.nT -= dt; if (ev.nT <= 0 && ev.ward && !(ev.ms && ev.ms.d >= MSN.noFrostD)) { ev.nT = C.frost; R.FX.push({ k: 'ring', x: ev.x, y: ev.y, r: C.frostR, t: 0.35, m: 0.35, c: PAL[10] }); sfx('zap');   // her frost pulse (only while you stand in her ring): freezes what crowds it
      for (const e of R.E) { if (e.inst || e.hp <= 0 || Math.hypot(e.x - ev.x, e.y - ev.y) > C.frostR + e.r) continue; e.frozen = Math.max(e.frozen, e.boss || e.mini ? 0.3 : 0.9); hit(e, R.S.baseDmg, { proc: false, noCrit: true, col: PAL[10] }); } }
    if (Math.random() < 0.5) { const a = Math.random() * TAU; R.PT.push({ x: ev.x + Math.cos(a) * 10, y: ev.y + Math.sin(a) * 5, vx: 0, vy: -30, t: 0.5, m: 0.5, c: Math.random() < 0.5 ? PAL[11] : PAL[10], s: 1 }); }
    if (ev.prog >= ev.need) escortWin(ev); }
  else { const C = EV8.caravan, dx = ev.tx - ev.x, dy = ev.ty - ev.y, dd = Math.hypot(dx, dy); ev.ward = near < C.near; ev.moving = ev.ward && dd > 2;
    if (ev.moving) { const s = Math.min(dd, C.spd * dt); ev.x += dx / dd * s; ev.y += dy / dd * s; ev.wheel += s; }
    ev.pT -= dt; if (ev.pT <= 0 && ev.pn < C.pulses) { ev.pT = C.every; ev.pn++; escTierPulse(ev, 3 + Math.floor(R.wave / 4)); }
    if (Math.hypot(ev.tx - ev.x, ev.ty - ev.y) <= 2) escortWin(ev);
    else if (ev.t >= C.limit) escortFail(ev, 'THE CARAVAN TURNS BACK'); }
}
function updateDirector(dt) {
  const w = R.wave; R.majCd = Math.max(0, R.majCd - dt);
  for (const q of R.rq) { q.t -= dt; if (q.t <= 0) { const e = spawnEnemy(q.type, q.x, q.y, q.elite ? { elite: true } : {}); if (R.ev === q.ev) e.raid = q.ev; burst(q.x, q.y, PAL[2], 8, 30); } }
  R.rq = R.rq.filter(q => q.t > 0);
  if (R.t >= R.barT) { if (instCount('barracks') >= barCap(w)) R.barT = R.t + EV8.barEvery; else if (canMajor('inst')) { spawnInst('barracks'); R.barT = R.t + EV8.barEvery; } }
  if (R.t >= R.catT) { if (instCount('catapult') >= catCap(w)) R.catT = R.t + EV8.catEvery; else if (canMajor('inst')) { spawnInst('catapult'); R.catT = R.t + EV8.catEvery; } }
  updateInst(dt); updateGate(dt); updateMarket(dt);
}

/* ---- 1.1.0 content depth (numbers + rationale: DECISIONS.md § 1.1.0 implementation choices) ---- */
const UQ_P = { warden: 0.35, boss: 0.1, mini: 0.04, elite: 0.004 };
function dropUnique(x, y, wave) { const it = rollUnique(wave || R.wave); R.uqDrops++; dropWeapon(x, y, it, true); const b = { s: `UNIQUE: ${it.name.toUpperCase()}`, t: 2.4, c: RCOL[3] }; R.bq.unshift(b);   /* queued: shows right after the kill / gear-check banner */ return it; }   // 1.8.0: dropWeapon plays the unique cue
/* Cinder Mason walls: telegraph (dashed orange line, 1.1s) -> stone wall 5.5s that blocks only YOU (monsters climb over).
   Placed 34px ahead of where you're moving (or behind you, away from the mason, if you stand still), perpendicular to that line, 60px long (84 elite).
   Dash / Roll / Charge pass through; a wall never spawns on you; at most 4 up at once and never a 3rd within 70px of you (no boxes); walls crumble when their mason dies. */
const WALL = { life: 5.5, tele: 1.1, len: 60, eliteLen: 84, thick: 3, max: 4, cd: [6, 8], cast: 0.8, range: 170, ahead: 34, near: 2, nearR: 70 };
function raiseWall(e) {
  const p = R.p, mv = Math.hypot(input.mx, input.my) > 0.2; let ux, uy;
  if (mv) { const l = Math.hypot(input.mx, input.my); ux = input.mx / l; uy = input.my / l; } else { const dx = p.x - e.x, dy = p.y - e.y, l = Math.hypot(dx, dy) || 1; ux = dx / l; uy = dy / l; }
  const cx = p.x + ux * WALL.ahead, cy = p.y + uy * WALL.ahead * 0.8, L = (e.elite ? WALL.eliteLen : WALL.len) / 2, nx = -uy, ny = ux;
  const q = { x1: cx - nx * L, y1: cy - ny * L, x2: cx + nx * L, y2: cy + ny * L, t: WALL.tele, m: WALL.tele, src: e.id }; R.wallQ.push(q); sfx('wind');
  if (!R.wallHint) { R.wallHint = true; R.bq.push({ s: 'WALLS BLOCK YOU - DASH / ROLL THROUGH', t: 2.2, c: PAL[3] }); } return q;
}
function segDist(px, py, w) { const dx = w.x2 - w.x1, dy = w.y2 - w.y1, L2 = dx * dx + dy * dy || 1, t = clamp(((px - w.x1) * dx + (py - w.y1) * dy) / L2, 0, 1), cx = w.x1 + dx * t, cy = w.y1 + dy * t; return [Math.hypot(px - cx, py - cy), cx, cy, dx, dy]; }
const wallsNear = (x, y) => R.walls.concat(R.wallQ).filter(w => segDist(x, y, w)[0] < WALL.nearR).length;   // anti-box: two line segments can't enclose you
function pushOutWalls(o, rad) {
  for (const w of R.walls) { if (w.up < 0.3) continue; const [d, cx, cy, dx, dy] = segDist(o.x, o.y, w), m = rad + WALL.thick; if (d >= m) continue;
    let nx, ny; if (d > 0.01) { nx = (o.x - cx) / d; ny = (o.y - cy) / d; } else { const l = Math.hypot(dx, dy) || 1; nx = -dy / l; ny = dx / l; }
    o.x = cx + nx * m; o.y = cy + ny * m; }
}
function updateWalls(dt) {
  for (const q of R.wallQ) { q.t -= dt; if (q.t <= 0) { R.walls.push({ x1: q.x1, y1: q.y1, x2: q.x2, y2: q.y2, t: WALL.life, m: WALL.life, up: 0, src: q.src }); R.wallN++; burst((q.x1 + q.x2) / 2, (q.y1 + q.y2) / 2, '#566c86', 18, 50); addShake(2); sfx('hit'); } }
  R.wallQ = R.wallQ.filter(q => q.t > 0);
  for (const w of R.walls) { w.t -= dt; w.up = Math.min(1, w.up + dt * 5); if (w.t <= 0) burst((w.x1 + w.x2) / 2, (w.y1 + w.y2) / 2, '#566c86', 10, 40); }
  R.walls = R.walls.filter(w => w.t > 0);
}
/* 1.13.1 TELL MUTE (Matt phone test): telegraph / danger TEACHING banners show only the first TELL.max times per run per tell type,
   then go silent for that type; the ground / projectile VFX are untouched. Hub / event / system banners never go through here. */
const TELL = { max: 3 };
function tell(k, bs, how = 'push') { if (!R) return false; const T = R.tellN || (R.tellN = {}); if ((T[k] || 0) >= TELL.max) { R.tellMuted = (R.tellMuted || 0) + 1; return false; } T[k] = (T[k] || 0) + 1;
  bs = Array.isArray(bs) ? bs : [bs]; if (how === 'banner') { R.banner = bs[0]; if (bs.length > 1) R.bq.unshift(...bs.slice(1)); } else if (how === 'unshift') R.bq.unshift(...bs); else R.bq.push(...bs); return true; }
/* Long-telegraph nuke circles: Colossus (wave 10+), wave-12+ elites of the bulky roles, wave-13+ mini-bosses. Never Wardens (their pattern is the gear check).
   2.2s filling red disc on your spot, then a blast for 1.4x the caster's hit. Hurts monsters too (lure them in). */
const NUKE = { t: 2.2, r: 44, rBoss: 54, mul: 1.4, max: 3, bossFrom: 10, eliteFrom: 12, miniFrom: 13, cdBoss: [7, 9], cdElite: [10, 14], range: 170, roles: { tank: 1, support: 1, builder: 1, splitter: 1 } };
const nukeCaster = e => !e.warden && !e.inst && !!((e.boss && R.wave >= NUKE.bossFrom) || (e.mini && R.wave >= NUKE.miniFrom) || (e.elite && R.wave >= NUKE.eliteFrom && NUKE.roles[e.role]));
function spawnNuke(e) {
  const p = R.p, mv = Math.hypot(input.mx, input.my) > 0.2, x = p.x + (mv ? input.mx * 18 : 0), y = p.y + (mv ? input.my * 14 : 0);
  const n = { x, y, r: e.boss ? NUKE.rBoss : NUKE.r, t: NUKE.t, m: NUKE.t, dmg: e.dmg * NUKE.mul, src: e.id }; R.nukes.push(n); R.nukeN++; sfx('wind');
  if (!R.nukeHint && tell('nuke', { s: 'BIG RED CIRCLE: GET OUT BEFORE IT FILLS', t: 2.2, c: PAL[2] }, 'unshift')) R.nukeHint = true; return n;
}
function updateNukes(dt) {
  const p = R.p;
  for (const n of R.nukes) { n.t -= dt; if (n.t > 0) continue;   // 1.6.0: the blast FX is a fire blast + scorch on the real hit ellipse (draw-only)
    R.FX.push({ k: 'fire', x: n.x, y: n.y, r: n.r, ry: 0.7, t: 0.55, m: 0.55, sd: (n.x * 7 + n.y * 3) & 63 }, { k: 'scorch', x: n.x, y: n.y, r: n.r * 0.85, ry: 0.7, t: 1.6, m: 1.6 }); burst(n.x, n.y, PAL[2], 40, 90); burst(n.x, n.y, PAL[4], 20, 60); addShake(6); sfx('nova');
    if (Math.hypot((p.x - n.x) / n.r, (p.y - n.y) / (n.r * 0.7)) < 1 && p.inv <= 0 && !p.dash) hurt(n.dmg);
    for (const e of R.E) if (e.id !== n.src && !e.inst && !e.boss && e.hp > 0 && Math.hypot(e.x - n.x, e.y - n.y) < n.r + e.r) hit(e, R.S.baseDmg, { proc: false, noCrit: true, col: PAL[2] }); }
  R.nukes = R.nukes.filter(n => n.t > 0);
}
function tickBoom(e) {   // Blast Tick: arms (0.7s red circle) when it reaches you, then explodes. Kill it first and it just pops.
  const T = ETYPES[e.type], r = T.boomR * (e.elite ? 1.3 : 1), p = R.p; e.hp = 0; e.boom = true;
  R.FX.push({ k: 'fire', x: e.x, y: e.y, r, ry: 0.7, t: 0.4, m: 0.4, sd: (e.x * 7 + e.y * 3) & 63 }, { k: 'scorch', x: e.x, y: e.y, r: r * 0.8, ry: 0.7, t: 1, m: 1 }); burst(e.x, e.y, PAL[3], 26, 70); burst(e.x, e.y, PAL[4], 10, 40); addShake(3); sfx('nova');
  if (Math.hypot((p.x - e.x) / r, (p.y - e.y) / (r * 0.7)) < 1 && p.inv <= 0 && !p.dash) hurt(e.dmg);
  for (const o of R.E) if (o !== e && o.hp > 0 && !o.inst && !o.boss && Math.hypot(o.x - e.x, o.y - e.y) < r + o.r) hit(o, R.S.baseDmg * 1.2, { proc: false, noCrit: true, col: PAL[3] });
}
const BLINK_T = 0.75;
const ORACLE = { cd: [5, 6.5], cast: 0.6, heal: 0.15, sh: 0.4, shT: 3 };
function oraclePulse(e) {
  const T = ETYPES[e.type]; R.FX.push({ k: 'ring', x: e.x, y: e.y, r: T.pulseR, t: 0.45, m: 0.45, c: PAL[11] }); burst(e.x, e.y - 8, PAL[11], 16, 50); sfx('zap'); let n = 0;
  for (const o of R.E) { if (o === e || o.inst || o.boss || o.hp <= 0 || Math.hypot(o.x - e.x, o.y - e.y) > T.pulseR) continue; o.hp = Math.min(o.maxHp, o.hp + o.maxHp * ORACLE.heal); o.shT = ORACLE.shT; n++; }
  return n;
}
function axeChop(a) {   // 1.7.0 Cleaver cone: half-angle axeHalf(S) (max PI/2 = a half-circle), reach range x area; only foes overlapping you (hug) are hit off-cone
  const p = R.p, S = R.S, rad = S.range; p.axN = (p.axN || 0) + 1; const h = S.uq.bonesaw && p.axN % 3 === 0 ? Math.PI : axeHalf(S); let n = 0; R.FX.push({ k: 'arc', x: p.x, y: p.y - 3, a, r: rad, h, t: 0.16, m: 0.16 });
  for (const e of R.E) { if (e.hp <= 0) continue; const dx = e.x - p.x, dy = e.y - p.y, d = Math.hypot(dx, dy); if (d > rad + e.r) continue;
    let da = Math.atan2(dy, dx) - a; da = Math.atan2(Math.sin(da), Math.cos(da)); if (Math.abs(da) > h && d > e.r + AXE7.hug) continue;
    hit(e, S.baseDmg, { kx: dx / (d || 1), ky: dy / (d || 1), kb: AXE7.kb, src: 'axe' }); n++; }
  addShake(1.5); return n;
}
function flailRing(rad, mul = 1) {   // Chain Flail: one spin hits everything within rad, knockback outward (1.13.2: Twin follow-up spins hit for FLAIL2.twin)
  const p = R.p, S = R.S; p.flN = (p.flN || 0) + 1; const mill = S.uq.mill, quake = mill && p.flN % 4 === 0; if (quake) { R.FX.push({ k: 'ring', x: p.x, y: p.y, r: rad * 1.3, t: 0.3, m: 0.3, c: PAL[13] }); addShake(3); } R.FX.push({ k: 'ball', x: p.x, y: p.y - 3, r: rad, a: p.aimA, t: 0.22, m: 0.22 });
  for (const e of R.E) { if (e.hp <= 0) continue; const dx = e.x - p.x, dy = e.y - p.y, d = Math.hypot(dx, dy); if (d > rad + e.r) continue; hit(e, S.baseDmg * mul, { kx: (mill ? -1 : 1) * dx / (d || 1), ky: (mill ? -1 : 1) * dy / (d || 1), kb: mill ? 45 : S.uq.pin ? 140 : 70, src: 'flail' }); if (quake && e.hp > 0 && !e.boss && !e.raidBoss && !e.inst) e.frozen = Math.max(e.frozen, 0.5); }
  addShake(1);
}

/* ---- 1.0.0 in-run Market (numbers + rationale: DECISIONS.md § 1.0.0 implementation choices) ----
   A travelling stall spawns like a major event (respects the 20s gap, the 2-at-once cap and the gear-check quiet window) but doesn't count toward the cap.
   Walk into its ring: the Market panel opens and time freezes (same as the backpack). LEAVE resumes with a short grace; the stall packs up MK.afterLeave s later.
   Gold = the bank (save.gold), which already includes this run's coins (addGold banks them live). Buying / selling never touches R.gold (escape bonus / run stats) or goldTotal (milestones). */
const MK = { first: 165, portalFirst: 60, every: 150, retry: 8, life: 50, afterLeave: 12, r: 22, near: [150, 190], stock: 6, fromWave: 6,
  TV: [16, 36, 70, 140, 260], RV: [1, 2, 4, 6], afxV: 0.1, buy: 1.3, sell: 0.55, grace: 0.75, graceCd: 6 };
const mkValue = w => Math.round(MK.TV[clamp(w.tier | 0, 0, 4)] * MK.RV[clamp(w.rarity | 0, 0, 3)] * (1 + MK.afxV * (w.affixes ? w.affixes.length : 0)));
const mkBuyPrice = w => Math.max(5, Math.round(mkValue(w) * MK.buy / 5) * 5);
const mkSellPrice = w => Math.max(1, Math.round(mkValue(w) * MK.sell * mkt18()));   // 1.18.0 market stalls
function mkRollStock(wave) {   // 6 items rolled for this wave: 1 weapon, 1 featured Rare (any slot), 4 armour pieces in different slots; all Magic+
  const out = [rollWeapon(wave, { min: 1 }), rollItem(wave, { min: 2 })], sl = ARMOR_SLOTS.slice().sort(() => Math.random() - 0.5);
  for (let i = 0; out.length < MK.stock; i++) out.push(rollArmor(wave, sl[i % sl.length], { min: 1 }));
  return out.map(w => ({ w, price: mkBuyPrice(w) }));
}
function openMarket() {
  if (!R || R.over || R.mk) return null; const [x, y] = ON18 && R.mkFore ? [R.mkFore.x, R.mkFore.y] : farPos(MK.near[0], MK.near[1]); if (ON18) R.mkFore = null;
  R.mk = { x, y, r: MK.r, t: MK.life, stock: mkRollStock(R.wave), inside: false, visits: 0, left: false, wave: R.wave }; R.mkN++; R.majCd = Math.max(R.majCd, EV8.majGap); sfx('event');
  R.banner = { s: 'A TRAVELLING MARKET SETS UP', t: 2.4, c: '#ffcd75' }; R.bq.push({ s: 'WALK INTO THE M STALL TO BUY / SELL', t: 2.2, c: '#94b0c2' }, { s: 'TIME FREEZES WHILE YOU TRADE', t: 1.8, c: '#94b0c2' }); return R.mk;
}
function closeMarketStall(msg) { R.mk = null; R.mkT = R.t + MK.every; if (msg) R.banner = R.banner || { s: msg, t: 1.6, c: '#94b0c2' }; }
function updateMarket(dt) {
  R.mkGraceCd = Math.max(0, R.mkGraceCd - dt); const m = R.mk;
  if (!m) { if (R.t >= R.mkT) { if (R.wave >= MK.fromWave && !(R.gc && R.gc.e && R.gc.e.hp > 0) && R.majCd <= 0 && majorsActive() < EV8.majMax) openMarket(); else R.mkT = R.t + MK.retry; } return; }
  if (R.gc && R.gc.e && R.gc.e.hp > 0) return closeMarketStall('THE MERCHANT FLEES THE WARDEN');   // no shopping through a Gear Check
  m.t -= dt; if (m.t <= 0) return closeMarketStall('THE MARKET PACKS UP');
  const p = R.p, inside = Math.hypot((p.x - m.x) / m.r, (p.y - m.y) / (m.r * 0.7)) < 1;
  if (inside && !m.inside && mode === 'run' && !R.over) openMarketUI();
  m.inside = inside;
  if (Math.random() < 0.15) R.PT.push({ x: m.x + rnd(-12, 12), y: m.y - rnd(14, 26), vx: 0, vy: -10, t: 0.5, m: 0.5, c: '#ffcd75', s: 1 });
}
/* ---- 0.9.0 Gear Check (waves 20 / 40 / 60, then every 20): a fast, telegraphed DPS + survival check that replaces that wave's Colossus.
   HP = WD.hp(w) x map HP (calibrated ~22s of a fair kit's DPS at that wave), 40s CULL timer: when it runs out the warden enrages (x2 damage, x1.6 attack rate,
   x1.5 speed) and soft runs die. Pattern: slam ring (0.9s telegraph) -> dash line (0.6s) -> bullet ring (0.5s glow; 2 rings from tier II, 3 from III). */
const ROMAN = ['', 'I', 'II', 'III', 'IV', 'V', 'VI', 'VII', 'VIII', 'IX', 'X'];
const WD = { every: 20, cull: 40, cyc: [2.3, 2.0, 1.7, 1.55, 1.45], spd: 34, slamR: 58, slamT: 0.9, dashWind: 0.6, dashT: 0.45, dashSp: 300, novaT: 0.5, enrDmg: 2, enrRate: 1.6, enrSpd: 1.5,
  hp: w => w <= 60 ? Math.round(15000 * Math.pow(2.75, (w - 20) / 20) * (1 + 0.0165 * Math.max(0, w - 40))) : Math.round(150872 * Math.pow(2.3, Math.min(1, (w - 60) / 20)) * Math.pow(1.45, Math.max(0, (w - 80) / 20))),  /* 15k / 41k / 151k / 1.5.0: 347k / 503k / 730k at waves 20 / 40 / 60 / 80 / 100 / 120 (x map warden HP) */
  dmg: w => 22 * (1 + 0.08 * (Math.min(w, 60) - 1)) * (1 + 0.009 * Math.max(0, w - 60)),   /* 1.5.0: past 60 a slam stays a ~2-mistake hit on a fair kit instead of a one-shot */ names: ['', 'IRON WARDEN', 'BLOOD WARDEN', 'VOID WARDEN'], leechMul: 0.25, dmgT: t => t <= 1 ? 1 : t === 2 ? 1.1 : 1.3, ddash: 4, ddWind: 0.42 };   // 1.5.0: tier IV+ dashes twice (re-aimed), cycles faster, fires denser rings
const RUN9 = { colFrom: 10, aegis: 0.12 };
const wardenName = t => t <= 3 ? WD.names[t] : `VOID WARDEN ${ROMAN[Math.min(10, t)] || t}`;
const isGearWave = w => w > 0 && w % WD.every === 0;
function spawnWarden(tier) {
  tier = tier || Math.max(1, Math.floor(R.wave / WD.every)); const [x, y] = ringPos(spawnDist() * 0.9), w = R.wave, e = spawnEnemy('warden', x, y, { boss: true });
  e.warden = tier; e.hp = e.maxHp = WD.hp(w) * (R.M.wd || R.M.hp); /* 1.5.0: wardens keep the 1.4 map HP (wd) */ e.dmg = WD.dmg(w) * WD.dmgT(tier); e.spd = WD.spd * (1 + 0.012 * Math.min(w, 30)) * (R.M.spd || 1); e.ws = 0; e.wt = 0; e.atkT = 1.2; e.pat = 0; e.enr = false; e.xp = 400 + 20 * w;
  R.gc = { e, tier, t: WD.cull, w }; R.majCd = Math.max(R.majCd, 45); R.surged = true;
  for (const o of R.E) { if (o === e || o.boss || o.mini || o.inst) continue; const dx = o.x - R.p.x, dy = o.y - R.p.y, dd = Math.hypot(dx, dy) || 1; if (dd < 130) { o.kx += dx / dd * 170; o.ky += dy / dd * 170; o.frozen = Math.max(o.frozen, 1.2); } }   // clear the arena
  R.banner = { s: `GEAR CHECK: ${wardenName(tier)}`, t: 2.8, c: PAL[2] }; R.bq.push({ s: `KILL IT IN ${WD.cull}S OR IT CULLS YOU`, t: 2.2, c: '#ffcd75' }); tell('wslam', { s: 'RED RING = SLAM · RED LINE = DASH', t: 2, c: '#94b0c2' });
  if (tier >= WD.ddash) tell('wdash', { s: 'IT DASHES TWICE - DODGE BOTH LINES', t: 2, c: '#ffcd75' });   // 1.5.0
  sfx('boss'); addShake(8); R.flash = 0.2; return e;
}
function updateWarden(dt) {
  const g = R.gc; if (!g) return; const e = g.e; if (!e || e.hp <= 0 || !R.E.includes(e)) { if (!e || e.hp > 0) R.gc = null; return; }
  if (!e.enr) { g.t -= dt; if (g.t <= 0) { g.t = 0; e.enr = true; e.dmg *= WD.enrDmg; e.spd *= WD.enrSpd; R.banner = { s: 'THE WARDEN CULLS THE WEAK!', t: 2.6, c: PAL[2] }; addShake(8); sfx('boss'); burst(e.x, e.y - 10, PAL[2], 50, 90); } }
}
function wardenStep(e, dt, d, ux, uy) {   // returns [speed, ux, uy]
  const p = R.p, tc = Math.min(WD.cyc.length, e.warden), tr = Math.min(3, e.warden), rate = e.enr ? WD.enrRate : 1; let sp = e.spd;
  if (e.enr && Math.random() < 0.5) R.PT.push({ x: e.x + rnd(-12, 12), y: e.y - rnd(0, 30), vx: 0, vy: -30, t: 0.4, m: 0.4, c: PAL[2], s: 2 });
  if (e.ws === 0) { e.st = 0; e.atkT -= dt * rate;
    if (e.atkT <= 0) { const k = e.pat++ % 3; sfx('wind');
      if (k === 0 && d < 110) { e.ws = 1; e.wt = WD.slamT / rate; }
      else if (k === 2) { e.ws = 4; e.wt = WD.novaT / rate; }
      else { e.ws = 2; e.wt = WD.dashWind / rate; e.dx = ux; e.dy = uy; } } }
  else if (e.ws === 1) { sp = 0; e.wt -= dt; if (e.wt <= 0) { const rr = WD.slamR; R.FX.push({ k: 'ring', x: e.x, y: e.y, r: rr, t: 0.35, m: 0.35, c: PAL[2] }); burst(e.x, e.y, PAL[4], 40, 90); addShake(6); sfx('nova');
      if (Math.hypot((p.x - e.x) / rr, (p.y - e.y) / (rr * 0.6)) < 1 && p.inv <= 0 && !p.dash) { hurt(e.dmg * 1.2); p.slowT = Math.max(p.slowT, 1.5); } e.ws = 0; e.atkT = WD.cyc[tc - 1]; } }
  else if (e.ws === 2) { sp = 0; e.wt -= dt; if (e.wt > WD.dashWind * 0.35 / rate) { e.dx = ux; e.dy = uy; } if (e.wt <= 0) { e.ws = 3; e.wt = WD.dashT; e.st = 2; sfx('dash'); } }
  else if (e.ws === 3) { e.wt -= dt; ux = e.dx; uy = e.dy; sp = WD.dashSp * (e.chill ? 0.7 : 1); e.st = 2; if (Math.random() < 0.7) R.PT.push({ x: e.x - ux * 6, y: e.y, vx: -ux * 20, vy: rnd(-8, 0), t: 0.3, m: 0.3, c: PAL[4], s: 2 });
    if (e.wt <= 0) { if (e.warden >= WD.ddash && !e.dd) { e.dd = 1; e.ws = 2; e.wt = WD.ddWind / rate; e.st = 0; sfx('wind'); } else { e.dd = 0; e.ws = 0; e.st = 0; e.atkT = WD.cyc[tc - 1]; } } }   // 1.5.0 IV+: a second, re-aimed dash
  else if (e.ws === 4) { sp *= 0.2; e.wt -= dt; if (e.wt <= 0) { const n = 14 + 2 * Math.min(5, e.warden), off = Math.random() * TAU;
      for (let r = 0; r < tr; r++) for (let i = 0; i < n; i++) { const a = off + (i + r * 0.5) / n * TAU, v = 62 + r * 14; R.EP.push({ x: e.x, y: e.y - 10, vx: Math.cos(a) * v, vy: Math.sin(a) * v, r: 2, dmg: e.dmg * 0.45, life: 4 }); }
      burst(e.x, e.y - 10, PAL[2], 20, 50); sfx('boss'); e.ws = 0; e.atkT = WD.cyc[tc - 1]; } }
  return [sp, ux, uy];
}
function wardenKill(e) {
  const w = R.wave, tier = e.warden, p = R.p; R.kills++; save.totalKills++; R.bosses++; save.bossKills++; save.slain.warden = (save.slain.warden || 0) + 1;
  const gi = Math.min(5, tier) - 1; save.gc[gi] = (save.gc[gi] || 0) + 1; /* 1.5.0: 80 / 100+ get their own slots */ R.gcWon = (R.gcWon || 0) + 1; R.gc = null; R.gcLog = (R.gcLog || []).concat([`W${w} ${wardenName(tier)}: PASSED`]);
  burst(e.x, e.y, PAL[4], 80, 110); burst(e.x, e.y, '#f4f4f4', 30, 40, 0.3); addShake(10); R.hitstop = 0.2; R.flash = 0.25; sfx('kill'); sfx('revive');
  for (let i = 0; i < 16; i++) R.G.push({ x: e.x + rnd(-10, 10), y: e.y + rnd(-10, 10), v: Math.max(1, Math.round(e.xp * R.M.loot / 16)), mag: true });
  for (let i = 0; i < 2; i++) dropWeapon(e.x - 14 + 28 * i, e.y, rollItem(w + 5, { min: 2 }), true);   // milestone loot: 2 Rares a band ahead (wave+5)
  dropWeapon(e.x, e.y + 12, rollItem(w + 5, { slot: pick(ARMOR_SLOTS), min: 1 }), true);
  if (Math.random() < UQ_P.warden) dropUnique(e.x, e.y - 14, w + 5);   // 1.1.0
  goldDrop(e.x, e.y, 100 + 10 * w, 16); R.H.push({ x: e.x + 8, y: e.y, t: 30 }); if (canHeal()) p.hp = Math.min(R.S.maxHp, p.hp + R.S.maxHp * 0.5); addText(p.x, p.y - 14, '+50% HP', PAL[5], true);
  eventWin('GEAR CHECK PASSED!', RUN_BUFF);
  R.bq.unshift({ s: `STRETCH ${ROMAN[tier + 1] || tier + 1} UNLOCKED: WAVES ${w + 1}-${w + WD.every}`, t: 2.6, c: PAL[5] });
}
/* ---- 1.4.0 RAIDS (data: RAIDS up top; numbers + rationale: DECISIONS.md § 1.4.0 implementation choices) ----
   Challenged from the RAID BOARD (hub 🏆 RAIDS / Trophy Wall card), never mid-run. A raid is its own short run in a sealed elliptical arena:
   no waves, trash, events, Market, gate, installations or director. Hearth lives, buffs, bag and pause work as in any run.
   Kit: your normal start kit (Armory / heirloom + smithy pick) and the Raid Quartermaster fills every EMPTY slot with a Magic item of the raid band
   (the smithy weapon is tuned to the band too). Raid-issued pieces can't be kept or carried out.
   Mechanics hit for a share of your max HP (damage reduction still applies), so they stay readable and dangerous at any gear; the HP race scales with gear.
   Every telegraph is drawn on the ground with a colour + word (OUT / SAFE / countdown) and the raid HUD line always shows the phase + what to do, so BANNER: OFF still plays fair. */
const RAID = { rx: 180, ry: 100, prep: 2.5, trans: 2.2, exitR: 22, exitNeed: 1.5, exitT: 25, vulnT: 4, vulnX: 1.5, rotFirst: 1.6, wLag: 4, aLag: 2, gazeR: 20, gazeStay: 1.5, chillOut: 1.2, voidTick: 0.5, colT: 8, colMin: 0.55 };
const RPCT = { out: 0.5, slam: 0.6, flood: 1.1, toll: 1.1, beam: 0.6, ring: 0.55, gaze: 0.7, chill: 0.45, pool: 0.09, void: 0.14, orb: 0.5, fan: 0.17, nova: 0.14, touch: 0.2 };   // 1.7.0: ~x1.6 (flood / toll miss = death); was out .3 slam .35 flood .7 toll .8 beam .4 ring .35 gaze .45 chill .3 pool .05 void .08 orb .3 fan .1 nova .08 touch .12
/* 1.9.5 RAID REMATCHES (Matt): each raid boss's rematch tier = its saved kill count (save.raids[id].kills, no new save fields).
   Kill #1 = the trophy (unchanged, tier 0 = 1.9.4 numbers exactly). Clear N times = tier N for the next fight: tougher AND better paid.
   Soft cap: eff(n) = n up to 5, then +0.5 per clear to 10 (7.5), then 2.5 x (1 - 10 / n) more past 10, approaching 10. Every knob below is x eff(n).
   Boss: HP +15% · hits +6% · attack gaps -2.5% · telegraph times -1.2% · boss + ice-ring speed +3% per eff.
   Rewards (repeat kill): gold + XP +30% · loot +1 item level · Unique 20% +4% (cap 60%) per eff; 2 Rare drops from eff 3, 3 from eff 7;
   the Raid Quartermaster's Magic fill +1 item level per 2 eff. Only the 5 RAIDS bosses: in-run Colossus / Wardens / minis are untouched. Off under __phLegacy. */
const RM = { on: true, hp: 0.15, dmg: 0.06, gap: 0.025, tele: 0.012, spd: 0.03, gold: 0.3, xp: 0.3, ilvl: 1, uqBase: 0.2, uq: 0.04, uqMax: 0.6, qm: 0.5, d3: 3, d7: 7 };
if (window.__phLegacy) RM.on = false;
const rmEff = n => { n = Math.max(0, Math.floor(+n || 0)); return Math.min(n, 5) + 0.5 * Math.min(5, Math.max(0, n - 5)) + 2.5 * (1 - 10 / (10 + Math.max(0, n - 10))); };
const rmTier = (id, s = save) => RM.on ? raidKills(s, id) : 0;
function rmStats(n) { const e = RM.on ? rmEff(n) : 0, r2 = v => Math.round(v * 100) / 100, r3 = v => Math.round(v * 1000) / 1000;
  return { tier: RM.on ? Math.max(0, n | 0) : 0, eff: r2(e), hp: r2(1 + RM.hp * e), dmg: r2(1 + RM.dmg * e), gap: r3(1 - RM.gap * e), tele: r3(1 - RM.tele * e), spd: r3(1 + RM.spd * e),
    gold: r2(1 + RM.gold * e), xp: r2(1 + RM.xp * e), ilvl: Math.round(RM.ilvl * e), uq: r2(Math.min(RM.uqMax, RM.uqBase + RM.uq * e)), drops: 1 + (e >= RM.d3 ? 1 : 0) + (e >= RM.d7 ? 1 : 0), qm: Math.floor(RM.qm * e) }; }
const rmPct = v => `${v >= 1 ? '+' : '−'}${Math.round(Math.abs(v - 1) * 100)}%`;
const RAID7 = { drPierce: 0.5, sunderT: 4, sunderX: 1.5, punish: 0.5, openT: 1.4, openX: 1.4, hpX: 0.85, lives: 1, gapX: 0.85 };   // 1.7.0 raid lethality: mechanics ignore half your DR; a hit SUNDERS you 4s (next mechanic x1.5) and the boss follows up within 0.5s; after every cast the boss is OPEN 1.4s (x1.4 damage); 1 Hearth revive max; boss HP x0.85, attack gaps x0.85   // raid damage = share of YOUR max HP (before DR): a mechanics check, gear sets the kill speed
const RAID_TILES = {};
const raidTiles = D => RAID_TILES[D.id] || (RAID_TILES[D.id] = mkTiles(D.g));
const raidDef = () => R && R.raid ? R.raid.D : null;
const inEll = (o, z, r = z.r) => ((o.x - z.x) / r) ** 2 + ((o.y - z.y) / (r * 0.7)) ** 2 < 1;
const inArena = (x, y, k = 1) => (x / (RAID.rx * k)) ** 2 + (y / (RAID.ry * k)) ** 2 <= 1;
function arenaClamp(o, pad = 6) { const ax = RAID.rx - pad, ay = RAID.ry - pad, q = (o.x / ax) ** 2 + (o.y / ay) ** 2; if (q > 1) { const s = 1 / Math.sqrt(q); o.x *= s; o.y *= s; } }
function arenaPt(k = 0.8, avoid = null, minD = 0) { for (let i = 0; i < 40; i++) { const a = Math.random() * TAU, rr = Math.sqrt(Math.random()) * k, x = Math.cos(a) * RAID.rx * rr, y = Math.sin(a) * RAID.ry * rr; if (!avoid || avoid.every(o => Math.hypot(x - o.x, (y - o.y) / 0.7) >= minD)) return [x, y]; } const a = Math.random() * TAU; return [Math.cos(a) * RAID.rx * k * 0.7, Math.sin(a) * RAID.ry * k * 0.7]; }
function raidKit(W, qb = 0) {   // Raid Quartermaster: start kit + every empty slot filled at the band; the smithy weapon tuned to the band. rk = raid-issued (never kept)
  const k = startKit(kitArm()), g = k.gear, w = g.weapon;   // 1.13.0: the whole loadout
  const s = k.smith; if (s && !s.heir) { s.power = +(s.power * itemPow(Math.max(1, W - RAID.wLag))).toFixed(3); s.tier = tierOf(W - RAID.wLag); s.name = 'Raid ' + s.name; s.rk = true; }   // equipped, or the spare in the bag behind a kept weapon
  for (const sl of SLOTS) if (!g[sl]) { const it = rollItem(W - RAID.aLag + qb, { slot: sl, min: 1 }); it.rk = true; g[sl] = it; }
  k.weapon = g.weapon; return k;
}
function newRaidState(D) { return { id: D.id, D, rm: rmStats(rmTier(D.id)), ph: 0, prep: RAID.prep, e: null, trans: 0, rot: 0, next: RAID.rotFirst, cast: 0, zones: [], pools: [], beams: [], rings: [], timers: [], fx: [], warm: [], gaze: null, chill: 0, ar: 1, ar0: 1, arT: 0, voidT: 0, grp: 0, shield: false, sub: false, vuln: 0, won: false, first: false, exit: null, t0: 0, killT: 0, hits: 0, phaseAt: [], cue: null, glow: 0, log: [] }; }
const rPhase = RR => RR.D.phases[RR.ph];
function rHurt(pct, why) { const p = R.p, RR = R.raid; if (p.inv > 0 || R.over) return false; RR.lastHit = why || 'zone'; const sx = RR.sunder > 0 ? RAID7.sunderX : 1; R.drPierce = RAID7.drPierce; hurt(pct * sx * R.S.maxHp); R.drPierce = 0; RR.hits++; if (sx > 1) RR.sunderHits = (RR.sunderHits || 0) + 1;   // 1.7.0 punish chain
  RR.sunder = RAID7.sunderT; if (RR.next > RAID7.punish && RR.trans <= 0) RR.next = RAID7.punish; if (why || sx > 1) addText(p.x, p.y - 22, sx > 1 ? 'SUNDERED!' : why, PAL[2], true); return true; }
function spawnRaidBoss() {
  const RR = R.raid, D = RR.D, e = spawnEnemy(D.id, 0, -45);
  e.raidBoss = D.id; e.act = 'raid'; e.heavy = true; e.kbr = 0; e.hp = e.maxHp = D.hp * RAID7.hpX * RR.rm.hp;   /* 1.9.5 rematch tier */   /* 1.7.0: less sponge, more lethal */ e.sc = D.sc; e.r = D.r; e.xp = 0; e.spd = D.spd * RR.rm.spd; e.hitCd = 1; e.dmg = RPCT.touch * R.S.maxHp;
  RR.e = e; RR.t0 = R.t; burst(0, -45, D.col, 60, 90); burst(0, -45, PAL[12], 20, 50); addShake(8); R.flash = 0.2; sfx('boss');
  raidEnterPhase(0, true); return e;
}
function raidEnterPhase(i, start) {
  const RR = R.raid, D = RR.D, P = D.phases[i], e = RR.e; RR.ph = i; RR.rot = 0; RR.next = start ? RAID.rotFirst : RAID.trans + 1; RR.cast = 0; RR.phaseAt[i] = Math.round(R.t - RR.t0);
  RR.cue = { s: P.cue, c: i === 2 ? PAL[2] : i === 1 ? PAL[3] : '#ffcd75' }; RR.log.push(`P${i + 1} ${P.name}`);
  if (!start) { RR.trans = RAID.trans; e.immune = true; RR.zones = []; RR.beams = []; RR.rings = []; RR.timers = []; e.hp = Math.max(1, Math.min(e.hp, e.maxHp * P.at)); R.flash = 0.25; addShake(7); sfx('boss'); burst(e.x, e.y - 10, D.col, 50, 90); R.FX.push({ k: 'ring', x: e.x, y: e.y, r: 70, t: 0.5, m: 0.5, c: D.col }); }
  R.banner = { s: `PHASE ${i + 1}: ${P.name}`, t: 2.4, c: D.col }; R.bq = R.bq.filter(b => !b.raid); tell('cue:' + P.cue, { s: P.cue, t: 2.2, c: RR.cue.c, raid: true }, 'unshift');
  if (D.chill) { if (start) RR.warm = [{ x: -110, y: 20, r: 24 }, { x: 110, y: 20, r: 24 }]; RR.chillT = D.chill[i]; }
  if (D.gaze && D.gaze[i]) { if (!RR.gaze) RR.gaze = { x: e.x, y: e.y, r: RAID.gazeR, sp: D.gaze[i], stay: 0 }; else RR.gaze.sp = D.gaze[i]; }
  if (start) for (const k of P.enter || []) RENTER[k](e, P);
}
const RENTER = {   // phase-enter actions (run when the 2.2s transition ends)
  imps(e) { const n = 3; for (let i = 0; i < n; i++) { const a = i / n * TAU + 0.5; raidRise(e.x + Math.cos(a) * 50, e.y + Math.sin(a) * 34, 'imp', { sh: true }); } },
  pylons(e) { R.raid.sub = true; for (let i = 0; i < 3; i++) { const a = -Math.PI / 2 + i / 3 * TAU, x = Math.cos(a) * RAID.rx * 0.62, y = Math.sin(a) * RAID.ry * 0.62, q = spawnEnemy('pylon', x, y); q.rsh = true; q.heavy = true; q.ax = x; q.ay = y; q.pyT = 3 + i * 1.5; q.hitCd = 99; burst(x, y, PAL[5], 20, 50); } },
  orbs(e) { raidBlink(e); for (let i = 0; i < 5; i++) { const a = i / 5 * TAU, o = spawnEnemy('vorb', Math.cos(a) * RAID.rx * 0.8, Math.sin(a) * RAID.ry * 0.8); o.rsh = true; o.hitCd = 99; burst(o.x, o.y, PAL[1], 14, 40); } },
  brood(e) { for (let i = 0; i < 2; i++) { const x = (i ? 1 : -1) * RAID.rx * 0.6, y = -RAID.ry * 0.35, q = spawnEnemy('pylon', x, y); q.rsh = true; q.heavy = true; q.ax = x; q.ay = y; q.pyT = 3 + i; q.hitCd = 99; }
    for (let i = 0; i < 3; i++) { const a = Math.PI / 2 + (i - 1) * 0.9, o = spawnEnemy('vorb', Math.cos(a) * RAID.rx * 0.85, Math.sin(a) * RAID.ry * 0.85); o.rsh = true; o.hitCd = 99; } },
  collapse() { const RR = R.raid; RR.arT = RAID.colT; RR.ar0 = RR.ar; },
  gaze(e) { const RR = R.raid; if (!RR.gaze) RR.gaze = { x: e.x, y: e.y, r: RAID.gazeR, sp: (RR.D.gaze && RR.D.gaze[RR.ph]) || 34, stay: 0 }; },
  whiteout() { const RR = R.raid; RR.warm = [RR.warm[0] || { x: -110, y: 20, r: 24 }]; RR.warm[0].orbit = 0; R.FX.push({ k: 'ring', x: 110, y: 20, r: 30, t: 0.6, m: 0.6, c: PAL[11] }); burst(110, 20, PAL[12], 30, 60); },
};
function raidRise(x, y, type, o = {}) { arenaClamp(o.pt = { x, y }, 14); R.rise.push({ x: o.pt.x, y: o.pt.y, t: 1.1, m: 1.1, type, raid: true, sh: !!o.sh, el: !!o.el }); }
function raidBlink(e) { const p = R.p; let best = null, bd = -1; for (let i = 0; i < 8; i++) { const a = Math.random() * TAU, x = Math.cos(a) * RAID.rx * 0.75, y = Math.sin(a) * RAID.ry * 0.75, d = Math.hypot(x - p.x, y - p.y); if (d > bd) { bd = d; best = [x, y]; } }
  burst(e.x, e.y - 10, PAL[1], 24, 60); e.x = best[0]; e.y = best[1]; e.kx = e.ky = 0; burst(e.x, e.y - 10, PAL[1], 24, 60); sfx('zap'); }
function rZone(o) { const z = Object.assign({ k: 'out', r: 28, t: 1.7, pct: RPCT.out, col: PAL[3] }, o); if (R.raid.rm) z.t *= R.raid.rm.tele; z.m = z.t; R.raid.zones.push(z); return z; }
function rLeadPt(k = 18) { const p = R.p, mv = Math.hypot(input.mx, input.my) > 0.2; return [p.x + (mv ? input.mx * k : 0), p.y + (mv ? input.my * k * 0.8 : 0)]; }
function rLine(x, y, a, pct = RPCT.beam, o = {}) { const L = 420; const b = (Object.assign({ x1: x - Math.cos(a) * L, y1: y - Math.sin(a) * L, x2: x + Math.cos(a) * L, y2: y + Math.sin(a) * L, w: 8, t: 1.8, m: 1.8, pct, col: '#c77dff' }, o)); const tk = R.raid.rm ? R.raid.rm.tele : 1; b.t *= tk; b.m *= tk; R.raid.beams.push(b); }
const RA = {   // attacks: each returns the boss's cast time (it stands still)
  pools(e) { const D = raidDef(), [lx, ly] = rLeadPt(), pts = [[lx, ly]]; const n = D.W >= 30 ? 4 : 3;
    while (pts.length < n) { const [x, y] = arenaPt(0.9, pts.map(([a, b]) => ({ x: a, y: b })), 50); if (Math.hypot(x - lx, y - ly) < 140) pts.push([x, y]); else if (Math.random() < 0.3) pts.push([x, y]); }
    for (const [x, y] of pts) rZone({ x, y, r: 28, t: 1.7, pct: RPCT.out, col: PAL[3], pool: true, lbl: 'OUT' }); sfx('wind'); return 0.6; },
  fan(e) { const D = raidDef(), p = R.p, shot = D.map === 'frost' ? 'ice' : D.id === 'vael' ? 'soul' : D.id === 'vexmire' ? 'venom' : D.id === 'kharos' ? 'ice' : 'ember', oy = e.y - 5 * e.sc, a = Math.atan2(p.y - 4 - oy, p.x - e.x), n = D.W >= 40 ? 9 : 7;
    for (let i = 0; i < n; i++) { const aa = a + (i - (n - 1) / 2) * 0.2; R.EP.push({ k: shot, x: e.x, y: oy, vx: Math.cos(aa) * 78, vy: Math.sin(aa) * 78, r: shot === 'soul' ? 3 : 2, dmg: RPCT.fan * R.S.maxHp, life: 4 }); }
    burst(e.x, oy, SHOTC[shot], 10, 40); sfx('eshot'); return 0.5; },
  slam(e) { rZone({ x: e.x, y: e.y, r: 66, t: 1.15, pct: RPCT.slam, col: PAL[2], slow: 1.5, lbl: 'OUT', src: e }); sfx('wind'); return 1.25; },
  tide(e) { const RR = R.raid, g = ++RR.grp, p = R.p, n = 2, pts = []; let tries = 0;
    while (pts.length < n && tries++ < 80) { const [x, y] = arenaPt(0.85, [{ x: e.x, y: e.y }, ...pts], 70); if (pts.length || Math.hypot(x - p.x, y - p.y) < 130) pts.push({ x, y }); }
    while (pts.length < n) { const [x, y] = arenaPt(0.8); pts.push({ x, y }); }
    for (const q of pts) rZone({ k: 'safe', x: q.x, y: q.y, r: 26, t: 4, pct: RPCT.flood, col: PAL[5], grp: g, lbl: 'SAFE', why: 'THE TIDE' });
    tell('tide', { s: 'MAGMA TIDE: STAND IN THE GREEN', t: 2, c: PAL[5] }, 'banner'); sfx('boss'); return 1; },
  toll(e) { const RR = R.raid, g = ++RR.grp, p = R.p; let pt = null; for (let i = 0; i < 60 && !pt; i++) { const [x, y] = arenaPt(0.85); if (Math.hypot(x - p.x, y - p.y) > 90) pt = { x, y }; } pt = pt || { x: -p.x * 0.7, y: -p.y * 0.7 };
    rZone({ k: 'safe', x: pt.x, y: pt.y, r: 24, t: 5, pct: RPCT.toll, col: PAL[5], grp: g, lbl: 'LIGHT', why: 'DEATH TOLL' });
    tell('toll', { s: 'DEATH TOLL: REACH THE LIGHT', t: 2.2, c: PAL[5] }, 'banner'); sfx('boss'); return 1; },
  nova(e) { const RR = R.raid; RR.glow = 0.55; sfx('wind'); RR.timers.push({ t: 0.55, f: () => { if (R.raid.e !== e || e.hp <= 0) return; const rings = R.raid.D.W >= 40 ? 3 : 2, n = 14, off = Math.random() * TAU;
      for (let r = 0; r < rings; r++) for (let i = 0; i < n; i++) { const a = off + (i + r * 0.5) / n * TAU, v = 58 + r * 14; R.EP.push({ k: R.raid.D.id === 'vael' ? 'soul' : undefined, x: e.x, y: e.y - 10, vx: Math.cos(a) * v, vy: Math.sin(a) * v, r: 2, dmg: RPCT.nova * R.S.maxHp, life: 4.5 }); }
      burst(e.x, e.y - 10, R.raid.D.col, 20, 50); sfx('boss'); } }); return 0.7; },
  raise(e) { const p = R.p, n = 3; for (let i = 0; i < n; i++) { const a = Math.random() * TAU, d = rnd(45, 75); raidRise(p.x + Math.cos(a) * d, p.y + Math.sin(a) * d * 0.7, Math.random() < 0.3 ? 'caster' : 'skel'); } sfx('wind'); return 0.5; },
  shards(e) { const p = R.p, a0 = Math.atan2(p.y - e.y, p.x - e.x), n = 3; for (let i = 0; i < n; i++) rLine(p.x, p.y, a0 + (i - 1) * 0.55 + (i === 1 ? 0 : rnd(-0.1, 0.1)), RPCT.beam, { w: 7, t: 1.4, m: 1.4, col: PAL[11], ice: true });
    sfx('wind'); return 0.6; },
  icering(e, two) { const RR = R.raid, p = R.p, ga = Math.atan2((p.y - e.y) / 0.7, p.x - e.x) + rnd(-1.2, 1.2), mk = (ga, pre) => RR.rings.push({ x: e.x, y: e.y, r: 8, sp: 72, w: 6, max: 320, pct: RPCT.ring, gapA: ga, gapW: 0.85, pre, pm: pre, hit: false });
    mk(ga, 0.9); if (two === true) mk(ga + Math.PI + rnd(-0.6, 0.6), 2.1); sfx('wind'); return 0.9; },
  icering2(e) { return RA.icering(e, true); },
  beams(e) { const p = R.p, base = Math.random() * Math.PI, n = 3, sp = 52; for (let i = 0; i < n; i++) { const off = (i - 1) * sp + rnd(-8, 8), nx = -Math.sin(base), ny = Math.cos(base) * 0.7; rLine(p.x + nx * off, p.y + ny * off, base, RPCT.beam, { w: 9, t: 1.8, m: 1.8 }); }
    sfx('wind'); return 0.6; },
  cross(e) { const p = R.p, a = Math.random() * Math.PI; for (let i = 0; i < 4; i++) rLine(p.x, p.y, a + i * Math.PI / 4, RPCT.beam, { w: 8, t: 2.0, m: 2.0 }); sfx('wind'); return 0.6; },
  blink(e) { raidBlink(e); return RA.fan(e); },
};
/* ---- 1.10.0 raid attacks (Vexmire / Kharos / Skarn) ---- */
Object.assign(RA, {
  venom(e) { const [lx, ly] = rLeadPt(), pts = [[lx, ly]]; let tries = 0; while (pts.length < 3 && tries++ < 40) { const [x, y] = arenaPt(0.9, pts.map(([a, b]) => ({ x: a, y: b })), 46); pts.push([x, y]); }
    for (const [x, y] of pts) rZone({ x, y, r: 26, t: 1.6, pct: RPCT.out * 0.6, col: POI.c, pool: true, poison: POI.raidHit, lbl: 'OUT' }); burst(e.x, e.y - 12, POI.c, 16, 50); sfx('wind'); return 0.6; },
  strikes(e) { const p = R.p, a = Math.atan2(p.y - e.y, p.x - e.x), n = 7; for (let i = 0; i < n; i++) { const d = 22 + i * 26; rZone({ x: e.x + Math.cos(a) * d, y: e.y + Math.sin(a) * d * 0.8, r: 17, t: 1.0 + i * 0.16, pct: RPCT.out * 0.8, col: PAL[4], lbl: i === 0 ? 'OUT' : '' }); } sfx('zap'); return 0.6; },
  hail(e) { const p = R.p, n = 8; for (let i = 0; i < n; i++) { const a = Math.random() * TAU, d = i === 0 ? 0 : rnd(25, 110); rZone({ x: p.x + Math.cos(a) * d, y: p.y + Math.sin(a) * d * 0.7, r: 16, t: 1.2 + i * 0.14, pct: RPCT.out * 0.7, col: PAL[3], slow: 1, lbl: i === 0 ? 'OUT' : '' }); } sfx('wind'); return 0.6; },
});
function nearestMarked(x, y, maxD) { let best = null, bd = maxD * maxD; for (const e of R.E) { if (!e.rsh || e.hp <= 0) continue; const d = (e.x - x) ** 2 + (e.y - y) ** 2; if (d < bd) { bd = d; best = e; } } return best; }   // auto-aim prefers the cyan-marked shield adds
function raidHpGate(e) {   // called from hit(): floors the HP at the next phase threshold and starts the transition (no phase skipping on a big crit)
  const RR = R.raid; if (!RR || RR.e !== e) return; const ph = RR.D.phases, nx = ph[RR.ph + 1];
  if (nx && e.hp <= e.maxHp * nx.at) { e.hp = e.maxHp * nx.at; raidEnterPhase(RR.ph + 1); }
}
function updateRaid(dt) {
  const RR = R.raid, D = RR.D, p = R.p; arenaClamp(p, 5);
  for (const f of RR.fx) f.t -= dt; RR.fx = RR.fx.filter(f => f.t > 0);
  // grave risers (adds) work in the arena too
  for (const q of R.rise) { q.t -= dt; if (Math.random() < 0.4) R.PT.push({ x: q.x + rnd(-5, 5), y: q.y, vx: rnd(-15, 15), vy: rnd(-25, -5), t: 0.35, m: 0.35, c: Math.random() < 0.5 ? '#3b2b2b' : PAL[13], s: 1 });
    if (q.t <= 0 && !RR.won) { const o = spawnEnemy(q.type, q.x, q.y, { elite: q.el }); o.radd = true; if (q.sh) o.rsh = true; burst(q.x, q.y, PAL[13], 10, 35); } }
  R.rise = R.rise.filter(q => q.t > 0);
  if (RR.won) { const X = RR.exit; X.t -= dt; X.inside = inEll(p, X); X.prog = X.inside ? X.prog + dt : Math.max(0, X.prog - dt * 0.5);
    if (Math.random() < 0.4) R.PT.push({ x: X.x + rnd(-9, 9), y: X.y - rnd(4, 24), vx: 0, vy: -12, t: 0.5, m: 0.5, c: Math.random() < 0.5 ? '#ffcd75' : PAL[12], s: 1 });
    if ((X.prog >= RAID.exitNeed || X.t <= 0) && !R.over) { R.raidOut = true; R.over = true; R.overT = 0.8; R.flash = 0.4; sfx('extract'); burst(p.x, p.y - 4, '#ffcd75', 50, 80, 0.8); R.banner = { s: 'RETURNING TO CAMP', t: 2, c: '#ffcd75' }; }
    return; }
  if (RR.prep > 0) { RR.prep -= dt; if (RR.prep <= 0) spawnRaidBoss(); return; }
  const e = RR.e; if (!e) return; const P = rPhase(RR);
  for (const o of R.E) { if (o.ax !== undefined) { o.x = o.ax; o.y = o.ay; } if (o !== e) arenaClamp(o, 4); }
  arenaClamp(e, 10);
  // shield adds
  const sh = R.E.some(o => o.rsh && o.hp > 0) || R.rise.some(q => q.sh);
  if (RR.shield && !sh) { RR.sub = false; RR.vuln = RAID.vulnT; R.banner = { s: 'SHIELD BROKEN!', t: 2, c: PAL[5] }; tell('shieldhit', { s: 'HIT HIM NOW: +50% DAMAGE', t: 1.8, c: PAL[5], raid: true }, 'unshift'); RR.cue = { s: P.after || P.cue, c: PAL[5] }; sfx('revive'); burst(e.x, e.y - 10, PAL[11], 40, 80); RR.rot = 0; RR.next = 1; }
  RR.shield = sh; RR.vuln = Math.max(0, RR.vuln - dt); RR.glow = Math.max(0, RR.glow - dt);
  e.immune = RR.trans > 0 || RR.shield; e.vuln = RR.vuln; e.rcast = RR.cast; if (RR.sub) e.hitCd = Math.max(e.hitCd, 0.5);
  // timers, zones, pools, beams, rings
  for (const t of RR.timers) { t.t -= dt; if (t.t <= 0) t.f(); } RR.timers = RR.timers.filter(t => t.t > 0);
  const done = new Set();
  for (const z of RR.zones) { if (z.src && z.src.hp > 0) { z.x = z.src.x; z.y = z.src.y; } z.t -= dt; if (z.t > 0) continue; z.done = true;
    if (z.k === 'out') { R.FX.push({ k: 'ring', x: z.x, y: z.y, r: z.r, t: 0.35, m: 0.35, c: z.col }); burst(z.x, z.y, z.col, 26, 70); burst(z.x, z.y, PAL[4], 10, 40); addShake(4); sfx('nova');
      if (z.poison && inEll(p, z) && !p.dash) addPoison(z.poison, R.S.maxHp * POI.raidRef, 'raid');   // 1.10.0 Vexmire venom
      if (inEll(p, z) && !p.dash && rHurt(z.pct)) { if (z.slow) p.slowT = Math.max(p.slowT, z.slow); }
      if (z.pool) RR.pools.push({ x: z.x, y: z.y, r: z.r * 0.8, t: 5, m: 5, stay: 0, tick: 0.25, poison: z.poison }); }
    else if (!done.has(z.grp)) { done.add(z.grp); const G = RR.zones.filter(q => q.grp === z.grp), safe = G.some(q => inEll(p, q));
      R.flash = 0.25; addShake(9); sfx('boss'); for (const q of G) { R.FX.push({ k: 'ring', x: q.x, y: q.y, r: q.r + 6, t: 0.5, m: 0.5, c: PAL[5] }); burst(q.x, q.y, PAL[5], 20, 50); }
      RR.fx.push({ k: 'flood', t: 0.6, m: 0.6, col: D.id === 'morthal' ? PAL[1] : D.id === 'glacia' ? PAL[11] : PAL[3], G: G.map(q => ({ x: q.x, y: q.y, r: q.r })) });
      if (!safe) rHurt(z.pct, z.why); else addText(p.x, p.y - 20, 'SAFE!', PAL[5], true); } }
  RR.zones = RR.zones.filter(z => !z.done);
  for (const q of RR.pools) { q.t -= dt; if (inEll(p, q) && !p.dash) { q.stay += dt; q.tick -= dt; if (q.tick <= 0) { q.tick = 0.5; if (q.poison) addPoison(1, R.S.maxHp * POI.raidRef, 'raid'); else rHurt(RPCT.pool * (1 + q.stay)); } } else { q.stay = 0; q.tick = 0.25; } }
  RR.pools = RR.pools.filter(q => q.t > 0);
  for (const b of RR.beams) { b.t -= dt; if (b.t > 0) continue; b.done = true; RR.fx.push({ k: 'beam', t: 0.3, m: 0.3, x1: b.x1, y1: b.y1, x2: b.x2, y2: b.y2, w: b.w, col: b.col }); addShake(4); sfx('zap');
    if (segDist(p.x, p.y - 3, b)[0] < b.w + 2 && !p.dash) { rHurt(b.pct); if (b.ice) p.slowT = Math.max(p.slowT, 1.5); } }
  RR.beams = RR.beams.filter(b => !b.done);
  for (const g of RR.rings) { if (g.pre > 0) { g.pre -= dt; continue; } g.r += g.sp * (RR.rm ? RR.rm.spd : 1) * dt; const dx = p.x - g.x, dy = (p.y - g.y) / 0.7, d = Math.hypot(dx, dy);
    if (!g.hit && Math.abs(d - g.r) < g.w && !p.dash) { const da = Math.atan2(Math.sin(Math.atan2(dy, dx) - g.gapA), Math.cos(Math.atan2(dy, dx) - g.gapA)); if (Math.abs(da) > g.gapW / 2) { g.hit = true; if (rHurt(g.pct)) p.slowT = Math.max(p.slowT, 1.2); } } }
  RR.rings = RR.rings.filter(g => g.r < g.max);
  // passives: gaze (punish standing still), chill + fires, collapsing edge
  if (RR.gaze) { const G = RR.gaze, dx = p.x - G.x, dy = p.y - G.y, dd = Math.hypot(dx, dy) || 1; if (RR.trans <= 0) { G.x += dx / dd * Math.min(dd, G.sp * dt); G.y += dy / dd * Math.min(dd, G.sp * dt); }
    if (inEll(p, G)) G.stay += dt; else G.stay = Math.max(0, G.stay - dt * 1.5);
    if (G.stay >= RAID.gazeStay) { G.stay = 0; R.FX.push({ k: 'ring', x: G.x, y: G.y, r: G.r + 8, t: 0.4, m: 0.4, c: PAL[2] }); burst(G.x, G.y, PAL[1], 30, 70); burst(G.x, G.y, PAL[2], 14, 50); sfx('nova'); rHurt(RPCT.gaze, 'THE GAZE'); G.x = e.x; G.y = e.y; } }
  if (D.chill) { const W0 = RR.warm[0]; if (W0 && W0.orbit !== undefined) { W0.orbit += dt * 0.22; W0.x = Math.cos(W0.orbit + Math.PI) * RAID.rx * 0.6; W0.y = Math.sin(W0.orbit + Math.PI) * RAID.ry * 0.55; }
    const warm = RR.warm.some(w => inEll(p, w)); RR.chill = clamp(RR.chill + (warm ? -dt / RAID.chillOut : dt / RR.chillT), 0, 1); RR.warmIn = warm;
    if (RR.chill >= 1) { RR.chill = 0.35; p.slowT = Math.max(p.slowT, 2.5); burst(p.x, p.y - 4, PAL[11], 30, 50); sfx('hurt'); rHurt(RPCT.chill, 'FROZEN!'); } }
  if (RR.arT > 0) { RR.arT = Math.max(0, RR.arT - dt); RR.ar = RAID.colMin + (RR.ar0 - RAID.colMin) * (RR.arT / RAID.colT); }
  if (RR.ar < 1) { RR.voidT -= dt; if (!inArena(p.x, p.y, RR.ar) && RR.voidT <= 0) { RR.voidT = RAID.voidTick; rHurt(RPCT.void); R.PT.push({ x: p.x, y: p.y - 6, vx: 0, vy: -20, t: 0.4, m: 0.4, c: PAL[1], s: 2 }); } }
  // transition / rotation
  if (RR.trans > 0) { RR.trans -= dt; if (RR.trans <= 0) { RR.trans = 0; for (const k of P.enter || []) RENTER[k](e, P); RR.next = 0.8; } return; }
  const wasCast = RR.cast > 0; RR.cast = Math.max(0, RR.cast - dt); RR.next -= dt; RR.sunder = Math.max(0, (RR.sunder || 0) - dt); RR.open = Math.max(0, (RR.open || 0) - dt);
  if (wasCast && RR.cast <= 0 && !RR.shield) { RR.open = RAID7.openT; RR.opens = (RR.opens || 0) + 1; R.FX.push({ k: 'ring', x: e.x, y: e.y, r: 34, t: 0.3, m: 0.3, c: '#ffcd75' }); addText(e.x, e.y - 30, 'OPEN!', '#ffcd75', true); }   // 1.7.0 punish window after every cast
  if (RR.next <= 0 && RR.cast <= 0 && !R.over) { const list = RR.shield && P.shieldRot ? P.shieldRot : P.rot, k = list[RR.rot++ % list.length], ct = RA[k](e, P) || 0.5; RR.cast = ct; RR.next = ct + (RR.shield && P.shieldGap ? P.shieldGap : P.gap) * RAID7.gapX * (RR.rm ? RR.rm.gap : 1); RR.last = k; }
}
function raidStep(e, dt, d, ux, uy) {   // boss movement (attacks live in updateRaid); returns [speed, ux, uy]
  const RR = R.raid, D = RR.D, P = rPhase(RR); let sp = e.spd;
  if (RR.trans > 0) { if (P.center || RR.sub) { const cx = 0 - e.x, cy = -20 - e.y, l = Math.hypot(cx, cy); if (l > 3) return [Math.min(110, l * 3), cx / l, cy / l]; } return [0, ux, uy]; }
  if (RR.shield && P.center) { const cx = 0 - e.x, cy = -20 - e.y, l = Math.hypot(cx, cy); return l > 3 ? [Math.min(60, l * 2), cx / l, cy / l] : [0, ux, uy]; }   // channels its shield from the middle
  if (RR.sub || RR.cast > 0) return [0, ux, uy];
  if (D.keep) { if (d < D.keep - 12) { ux = -ux; uy = -uy; sp *= 0.7; } else if (d < D.keep + 18) { const s = Math.sin(R.t * 0.6) > 0 ? 1 : -1, nx = -uy * s, ny = ux * s; ux = nx; uy = ny; sp *= 0.6; } }
  if (Math.random() < 0.25) R.PT.push({ x: e.x + rnd(-10, 10), y: e.y - rnd(4, 30), vx: 0, vy: -16, t: 0.4, m: 0.4, c: D.col, s: 1 });
  return [sp, ux, uy];
}
function raidAddStep(e, dt, d, ux, uy, pd) {   // void orbs drift in and burst; pylons stand and raise bones
  const p = R.p;
  if (e.act === 'orb') { e.ph += dt * 3; const s = Math.sin(e.ph) * 0.5, nx = ux - uy * s, ny = uy + ux * s, l = Math.hypot(nx, ny) || 1;
    if (pd < 11) { e.hp = 0; R.FX.push({ k: 'ring', x: e.x, y: e.y, r: 22, t: 0.3, m: 0.3, c: PAL[1] }); burst(e.x, e.y, PAL[1], 20, 60); sfx('nova'); if (!p.dash) rHurt(RPCT.orb, 'VOID BURST'); return [0, ux, uy]; }
    return [e.spd, nx / l, ny / l]; }
  if (e.act === 'pylon') { e.pyT -= dt; if (e.pyT <= 0) { e.pyT = 7; if (R.E.filter(o => o.radd).length < 10) raidRise(e.x + rnd(-24, 24), e.y + rnd(10, 22), R.raid.D.id === 'morr' ? 'imp' : R.raid.D.id === 'vexmire' ? 'spitter' : 'skel'); } return [0, ux, uy]; }
  return [e.spd, ux, uy];
}
function raidKill(e) {
  const RR = R.raid, D = RR.D, p = R.p, W = D.W; R.kills++; save.totalKills++; save.slain[D.id] = (save.slain[D.id] || 0) + 1;
  if (!save.raids || typeof save.raids !== 'object') save.raids = {};
  const rec = save.raids[D.id] = Object.assign({ kills: 0, firstAt: 0, best: 0, tries: 0 }, save.raids[D.id] || {}), t = Math.max(1, Math.round(R.t - RR.t0)), first = !rec.kills;
  rec.kills++; if (first || !rec.firstAt) rec.firstAt = Date.now(); rec.best = rec.best ? Math.min(rec.best, t) : t;
  RR.won = true; RR.first = first; RR.killT = t; RR.zones = []; RR.beams = []; RR.rings = []; RR.timers = []; RR.pools = []; RR.gaze = null; RR.arT = 0; RR.ar = 1; RR.chill = 0; RR.shield = false; RR.sub = false; R.rise = [];
  for (const o of R.E) if (o !== e && o.hp > 0) { o.hp = 0; burst(o.x, o.y, PAL[13], 8, 30); }
  for (const b of R.EP) b.life = 0;
  burst(e.x, e.y, D.col, 90, 120); burst(e.x, e.y, '#f4f4f4', 30, 50, 0.4); R.FX.push({ k: 'ring', x: e.x, y: e.y, r: 90, t: 0.6, m: 0.6, c: D.col }); addShake(12); R.hitstop = 0.25; R.flash = 0.35; sfx('kill'); sfx('revive');
  const M5 = RR.rm || rmStats(0), xp = first ? 1000 + 40 * W : Math.round((300 + 12 * W) * M5.xp), gd = first ? 250 + 20 * W : Math.round((60 + 5 * W) * M5.gold);   // 1.9.5 rematch pay for (let i = 0; i < 20; i++) R.G.push({ x: e.x + rnd(-14, 14), y: e.y + rnd(-10, 10), v: Math.max(1, Math.round(xp / 20)), mag: true });
  goldDrop(e.x, e.y, gd, 16); for (const c of R.C) c.mag = true; R.H.push({ x: e.x + 10, y: e.y, t: 30 });
  const loot = []; if (first) { loot.push(dropWeapon(e.x - 16, e.y + 4, rollItem(W + 5, { min: 2 }), true), dropWeapon(e.x + 16, e.y + 4, rollItem(W + 5, { slot: pick(ARMOR_SLOTS), min: 2 }), true)); if (Math.random() < 0.6) loot.push(dropUnique(e.x, e.y - 14, W + 5)); }
  else { const iw = W + 3 + M5.ilvl; for (let i = 0; i < M5.drops; i++) loot.push(dropWeapon(e.x + (i - (M5.drops - 1) / 2) * 16, e.y + 6, rollItem(iw, i ? { slot: pick(ARMOR_SLOTS), min: 2 } : { min: 2 }), true)); if (Math.random() < M5.uq) loot.push(dropUnique(e.x, e.y - 14, iw)); }
  RR.pay = { tier: M5.tier, xp, gold: gd, drops: first ? 2 : M5.drops, ilvl: first ? W + 5 : W + 3 + M5.ilvl, uq: first ? 0.6 : M5.uq };
  RR.loot = loot.filter(Boolean).map(it => it.w || it);
  RR.exit = { x: 0, y: 20, r: RAID.exitR, prog: 0, t: RAID.exitT, inside: false };
  R.banner = { s: first ? `TROPHY: ${D.name}` : `${D.name} SLAIN x${rec.kills}`, t: 3, c: '#ffcd75' };
  R.bq = R.bq.filter(b => !b.raid); R.bq.unshift({ s: first ? 'FIRST KILL! MOUNTED ON THE TROPHY WALL' : `BEST ${fmtT(rec.best)}`, t: 2.4, c: PAL[5] }); if (RM.on) R.bq.splice(1, 0, { s: first ? 'REMATCH T1 UNLOCKED: TOUGHER BOSS, BETTER LOOT' : `REMATCH T${M5.tier} CLEARED - NEXT: T${rec.kills}`, t: 2.2, c: '#ffcd75' }); R.bq.push({ s: 'LOOT IT THEN STAND IN THE GOLD RING', t: 2.2, c: '#94b0c2' });
  RR.cue = { s: `TROPHY TAKEN - GRAB THE LOOT - THEN THE GOLD RING (${RAID.exitT}S)`, c: '#ffcd75' };
  persist();
}
/* ---- raid art: arena floor + rim, telegraphs, boss tag, HUD ---- */
function drawRaidArena(X, Y, now) {
  const RR = R.raid, D = RR.D, ox = X(0), oy = Y(0);
  ctx.save(); ctx.fillStyle = 'rgba(5,5,10,.74)'; ctx.beginPath(); ctx.rect(0, 0, VW, VH); ctx.ellipse(ox, oy, RAID.rx, RAID.ry, 0, 0, TAU); ctx.fill('evenodd'); ctx.restore();
  if (RR.ar < 1) { const k = RR.ar; ctx.save(); ctx.fillStyle = 'rgba(40,10,50,.55)'; ctx.beginPath(); ctx.ellipse(ox, oy, RAID.rx, RAID.ry, 0, 0, TAU); ctx.ellipse(ox, oy, RAID.rx * k, RAID.ry * k, 0, 0, TAU); ctx.fill('evenodd'); ctx.restore();
    ctx.strokeStyle = Math.floor(now / 150) % 2 ? PAL[1] : PAL[2]; ctx.lineWidth = 2; ctx.setLineDash([4, 3]); ctx.lineDashOffset = -now / 50; ctx.beginPath(); ctx.ellipse(ox, oy, RAID.rx * k, RAID.ry * k, 0, 0, TAU); ctx.stroke(); ctx.setLineDash([]); ctx.lineWidth = 1;
    for (let i = 0; i < 26; i++) { const a = hash(i, 77) * TAU, rr = k + hash(i, 78) * (1 - k), fx = ox + Math.cos(a + now / 4000) * RAID.rx * rr, fy = oy + Math.sin(a + now / 4000) * RAID.ry * rr; ctx.fillStyle = i % 3 ? PAL[1] : '#0b0b14'; ctx.fillRect(Math.round(fx), Math.round(fy - ((now / 30 + i * 7) % 8)), 1, 2); } }
  const N = 64; for (let i = 0; i < N; i++) { const a = i / N * TAU, px = Math.round(ox + Math.cos(a) * (RAID.rx + 3)), py = Math.round(oy + Math.sin(a) * (RAID.ry + 3)); if (px < -10 || px > VW + 10 || py < -20 || py > VH + 10) continue;
    const h = 4 + Math.floor(hash(i, 11) * 5) + (i % 8 === 0 ? 6 : 0); ctx.fillStyle = '#0b0b14'; ctx.fillRect(px - 3, py - h - 1, 6, h + 2); ctx.fillStyle = '#333c57'; ctx.fillRect(px - 2, py - h, 4, h); ctx.fillStyle = '#566c86'; ctx.fillRect(px - 2, py - h, 1, h);
    if (i % 8 === 0) { const fl = Math.floor(now / 120 + i) % 3; ctx.fillStyle = D.col; ctx.fillRect(px - 1, py - h - 2 - fl, 2, 2 + fl); ctx.globalAlpha = 0.18; ctx.fillRect(px - 4, py - h - 5, 8, 7); ctx.globalAlpha = 1; } }
}
function drawRaidGround(X, Y, now) {
  const RR = R.raid, D = RR.D;
  for (const q of RR.pools) { const qx = X(q.x), qy = Y(q.y), fade = Math.min(1, q.t / 0.6); ctx.globalAlpha = 0.5 * fade; ctx.fillStyle = q.poison ? POI.dk : '#3a140e'; ctx.beginPath(); ctx.ellipse(qx, qy, q.r, q.r * 0.7, 0, 0, TAU); ctx.fill();
    ctx.globalAlpha = (0.35 + 0.15 * Math.sin(now / 120 + q.x)) * fade; ctx.fillStyle = q.poison ? POI.c : PAL[2]; ctx.beginPath(); ctx.ellipse(qx, qy, q.r * 0.75, q.r * 0.5, 0, 0, TAU); ctx.fill();
    ctx.fillStyle = PAL[3]; for (let i = 0; i < 6; i++) { const a = hash(i, Math.floor(q.x)) * TAU + now / 900, rr = q.r * 0.6 * hash(i + 3, 5); ctx.fillRect(Math.round(qx + Math.cos(a) * rr), Math.round(qy + Math.sin(a) * rr * 0.7), 2, 1); } ctx.globalAlpha = 1; }
  for (const w of RR.warm) { const wx = X(w.x), wy = Y(w.y), inn = inEll(R.p, w); ctx.fillStyle = '#ffcd75'; ctx.globalAlpha = inn ? 0.22 : 0.1 + 0.05 * Math.sin(now / 200); ctx.beginPath(); ctx.ellipse(wx, wy, w.r, w.r * 0.7, 0, 0, TAU); ctx.fill();
    ctx.globalAlpha = 0.85; ctx.strokeStyle = inn ? PAL[5] : '#ffcd75'; ctx.setLineDash([3, 2]); ctx.lineDashOffset = -now / 70; ctx.beginPath(); ctx.ellipse(wx, wy, w.r, w.r * 0.7, 0, 0, TAU); ctx.stroke(); ctx.setLineDash([]); ctx.globalAlpha = 1;
    ctx.fillStyle = '#0b0b14'; ctx.fillRect(wx - 5, wy - 6, 10, 6); ctx.fillStyle = '#566c86'; ctx.fillRect(wx - 4, wy - 5, 8, 4); ctx.fillStyle = '#333c57'; ctx.fillRect(wx - 1, wy - 2, 2, 3);
    for (let i = 0; i < 4; i++) { const fl = Math.floor(now / 90 + i * 3) % 4; ctx.fillStyle = i % 2 ? PAL[4] : PAL[3]; ctx.fillRect(wx - 3 + i * 2, wy - 8 - fl, 2, 3 + fl); }
    text(ctx, 'FIRE', wx, wy - 20, '#ffcd75', 1, 'c'); }
  for (const z of RR.zones) { const zx = X(z.x), zy = Y(z.y), k = 1 - z.t / z.m;
    if (z.k === 'safe') { const inn = inEll(R.p, z); ctx.fillStyle = PAL[5]; ctx.globalAlpha = (inn ? 0.32 : 0.16) + 0.08 * Math.sin(now / 90); ctx.beginPath(); ctx.ellipse(zx, zy, z.r, z.r * 0.7, 0, 0, TAU); ctx.fill();
      ctx.globalAlpha = 1; ctx.strokeStyle = inn ? PAL[12] : PAL[5]; ctx.lineWidth = 2; ctx.beginPath(); ctx.ellipse(zx, zy, z.r, z.r * 0.7, 0, 0, TAU); ctx.stroke(); ctx.lineWidth = 1;
      ctx.strokeStyle = PAL[6]; ctx.beginPath(); ctx.ellipse(zx, zy, z.r * (1 - k * 0.85), z.r * 0.7 * (1 - k * 0.85), 0, 0, TAU); ctx.stroke();
      text(ctx, z.lbl || 'SAFE', zx, zy - z.r * 0.7 - 10, PAL[5], 1, 'c'); text(ctx, String(Math.ceil(z.t)), zx, zy - 6, inn ? PAL[12] : PAL[5], 2, 'c'); continue; }
    ctx.fillStyle = z.col; ctx.globalAlpha = 0.12 + 0.3 * k; ctx.beginPath(); ctx.ellipse(zx, zy, z.r * k, z.r * 0.7 * k, 0, 0, TAU); ctx.fill();
    ctx.globalAlpha = 0.95; ctx.strokeStyle = z.col; ctx.lineWidth = 2; ctx.beginPath(); ctx.ellipse(zx, zy, z.r, z.r * 0.7, 0, 0, TAU); ctx.stroke(); ctx.lineWidth = 1; ctx.globalAlpha = 1;
    dangerMark(zx, zy - 4, PAL[4], 2, now); if (z.r >= 40) text(ctx, 'OUT', zx, zy - z.r * 0.7 - 9, z.col, 1, 'c'); }
  for (const b of RR.beams) { const k = 1 - b.t / b.m, x1 = X(b.x1), y1 = Y(b.y1), x2 = X(b.x2), y2 = Y(b.y2), L = Math.hypot(x2 - x1, y2 - y1) || 1, nx = -(y2 - y1) / L * b.w, ny = (x2 - x1) / L * b.w;
    ctx.fillStyle = b.col; ctx.globalAlpha = 0.16 + 0.3 * k; ctx.beginPath(); ctx.moveTo(x1 + nx, y1 + ny); ctx.lineTo(x2 + nx, y2 + ny); ctx.lineTo(x2 - nx, y2 - ny); ctx.lineTo(x1 - nx, y1 - ny); ctx.fill();
    ctx.globalAlpha = 0.9; ctx.strokeStyle = b.t < 0.4 && Math.floor(now / 60) % 2 ? PAL[12] : b.col; ctx.setLineDash([4, 3]); ctx.lineDashOffset = -now / 40; ctx.beginPath(); ctx.moveTo(x1 + nx, y1 + ny); ctx.lineTo(x2 + nx, y2 + ny); ctx.moveTo(x1 - nx, y1 - ny); ctx.lineTo(x2 - nx, y2 - ny); ctx.stroke(); ctx.setLineDash([]); ctx.globalAlpha = 1;
    const mx = clamp((X(R.p.x) - x1) * (x2 - x1) / L / L, 0.05, 0.95); dangerMark(Math.round(x1 + (x2 - x1) * mx), Math.round(y1 + (y2 - y1) * mx) - 8, PAL[4], 1, now); }
  for (const g of RR.rings) { const gx = X(g.x), gy = Y(g.y), pre = g.pre > 0, r = pre ? 14 + 8 * (1 - g.pre / g.pm) : g.r, a0 = g.gapA + g.gapW / 2, a1 = g.gapA - g.gapW / 2 + TAU;
    ctx.strokeStyle = PAL[11]; ctx.globalAlpha = pre ? 0.5 + 0.4 * Math.sin(now / 50) : 0.95; ctx.lineWidth = pre ? 2 : g.w; ctx.beginPath(); ctx.ellipse(gx, gy, r, r * 0.7, 0, a0, a1); ctx.stroke(); ctx.lineWidth = 1;
    if (!pre) { ctx.strokeStyle = PAL[12]; ctx.globalAlpha = 0.8; ctx.beginPath(); ctx.ellipse(gx, gy, r, r * 0.7, 0, a0, a1); ctx.stroke(); }
    ctx.globalAlpha = 1; const gxp = gx + Math.cos(g.gapA) * (r + 10), gyp = gy + Math.sin(g.gapA) * (r + 10) * 0.7; ctx.fillStyle = PAL[5]; ctx.fillRect(Math.round(gxp) - 2, Math.round(gyp) - 2, 5, 5); if (pre || g.r < 120) text(ctx, 'GAP', gxp, gyp - 10, PAL[5], 1, 'c'); }
  if (RR.gaze) { const G = RR.gaze, gx = X(G.x), gy = Y(G.y), k = G.stay / RAID.gazeStay; ctx.fillStyle = PAL[1]; ctx.globalAlpha = 0.18 + 0.4 * k; ctx.beginPath(); ctx.ellipse(gx, gy, G.r, G.r * 0.7, 0, 0, TAU); ctx.fill();
    ctx.globalAlpha = 0.9; ctx.strokeStyle = k > 0.5 && Math.floor(now / 70) % 2 ? PAL[2] : PAL[1]; ctx.lineWidth = 2; ctx.beginPath(); ctx.ellipse(gx, gy, G.r, G.r * 0.7, 0, 0, TAU); ctx.stroke(); ctx.lineWidth = 1; ctx.globalAlpha = 1;
    ctx.fillStyle = PAL[12]; ctx.fillRect(gx - 4, gy - 2, 9, 4); ctx.fillStyle = PAL[2]; ctx.fillRect(gx - 1, gy - 2, 3, 4); ctx.fillStyle = '#0b0b14'; ctx.fillRect(gx, gy - 1, 1, 2); if (k > 0.05) text(ctx, 'MOVE!', gx, gy - G.r * 0.7 - 9, PAL[2], 1, 'c'); }
  for (const f of RR.fx) { const k = f.t / f.m;
    if (f.k === 'beam') { ctx.strokeStyle = f.col; ctx.globalAlpha = k; ctx.lineWidth = f.w * 2 * k + 1; ctx.beginPath(); ctx.moveTo(X(f.x1), Y(f.y1)); ctx.lineTo(X(f.x2), Y(f.y2)); ctx.stroke(); ctx.strokeStyle = PAL[12]; ctx.lineWidth = 1; ctx.beginPath(); ctx.moveTo(X(f.x1), Y(f.y1)); ctx.lineTo(X(f.x2), Y(f.y2)); ctx.stroke(); ctx.globalAlpha = 1; }
    else if (f.k === 'flood') { ctx.save(); ctx.fillStyle = f.col; ctx.globalAlpha = 0.45 * k; ctx.beginPath(); ctx.ellipse(X(0), Y(0), RAID.rx, RAID.ry, 0, 0, TAU); for (const q of f.G) ctx.ellipse(X(q.x), Y(q.y), q.r, q.r * 0.7, 0, 0, TAU); ctx.fill('evenodd'); ctx.restore(); } }
  if (RR.exit) { const X0 = RR.exit, gx = X(X0.x), gy = Y(X0.y); ctx.fillStyle = '#ffcd75'; ctx.globalAlpha = X0.inside ? 0.32 : 0.14 + 0.06 * Math.sin(now / 200); ctx.beginPath(); ctx.ellipse(gx, gy, X0.r, X0.r * 0.7, 0, 0, TAU); ctx.fill();
    ctx.globalAlpha = 0.9; ctx.strokeStyle = X0.inside ? PAL[5] : '#ffcd75'; ctx.setLineDash([3, 3]); ctx.lineDashOffset = -now / 60; ctx.beginPath(); ctx.ellipse(gx, gy, X0.r, X0.r * 0.7, 0, 0, TAU); ctx.stroke(); ctx.setLineDash([]); ctx.globalAlpha = 1;
    ctx.fillStyle = '#0b0b14'; ctx.fillRect(gx - 13, gy - 26, 26, 3); ctx.fillStyle = '#ffcd75'; ctx.fillRect(gx - 12, gy - 25, Math.ceil(24 * Math.min(1, X0.prog / RAID.exitNeed)), 1); text(ctx, 'RETURN', gx, gy - 35, '#ffcd75', 1, 'c'); }
  const e = RR.e; if (e && e.hp > 0 && RR.glow > 0) { ctx.strokeStyle = D.col; ctx.globalAlpha = 0.5 + 0.4 * Math.sin(now / 40); ctx.lineWidth = 2; ctx.beginPath(); ctx.ellipse(X(e.x), Y(e.y) - 10, 34, 16, 0, 0, TAU); ctx.stroke(); ctx.globalAlpha = 1; ctx.lineWidth = 1; }
}
function drawRaidTag(e, ex, ey, w, h, now) {   // boss: coloured ring, name, shield bubble; shield adds: cyan kill-me mark
  if (e.raidBoss) { const D = R.raid.D; ctx.strokeStyle = D.col; ctx.lineWidth = 1; ctx.globalAlpha = 0.6 + 0.3 * Math.sin(now / 90); ctx.beginPath(); ctx.ellipse(ex, ey, w / 2 + 6, Math.max(5, w / 4), 0, 0, TAU); ctx.stroke(); ctx.globalAlpha = 1;
    if (e.immune) { ctx.strokeStyle = PAL[11]; ctx.globalAlpha = 0.45 + 0.25 * Math.sin(now / 70); ctx.lineWidth = 2; ctx.beginPath(); ctx.ellipse(ex, ey - h / 2, w / 2 + 8, h / 2 + 6, 0, 0, TAU); ctx.stroke(); ctx.lineWidth = 1; ctx.globalAlpha = 1; text(ctx, R.raid.trans > 0 ? 'PHASE SHIFT' : 'SHIELDED', ex, ey - h - 21, PAL[11], 1, 'c'); }
    else if (e.vuln > 0 && Math.floor(now / 150) % 2) text(ctx, 'EXPOSED', ex, ey - h - 21, PAL[5], 1, 'c');
    text(ctx, D.name, ex, ey - h - 12, D.col, 1, 'c'); return; }
  if (e.rsh) { const my = ey - h - 7 + (Math.floor(now / 200) % 2); ctx.fillStyle = PAL[11]; ctx.fillRect(ex - 2, my, 5, 1); ctx.fillRect(ex - 1, my + 1, 3, 1); ctx.fillRect(ex, my + 2, 1, 1); ctx.fillRect(ex - 1, my - 1, 3, 1); }
}
function raidHud(y, now) {   // under the timer: boss bar with phase ticks, phase + what to do (always drawn, even with BANNER: OFF), chill meter
  const RR = R.raid, D = RR.D, e = RR.e, bw = 150, bx = Math.round(VW / 2 - bw / 2);
  if (RR.prep > 0) { text(ctx, `${D.name} AWAKENS IN ${Math.ceil(RR.prep)}`, VW / 2, y, D.col, 1, 'c'); return y + 8; }
  if (RR.won) { text(ctx, RR.cue.s, VW / 2, y, '#ffcd75', 1, 'c'); if (RR.exit) edgeArrow(RR.exit.x, RR.exit.y, '#ffcd75', now, 'X'); return y + 8; }
  if (!e) return y;
  ctx.fillStyle = '#0b0b14'; ctx.fillRect(bx - 1, y, bw + 2, 6); ctx.fillStyle = PAL[1]; ctx.fillRect(bx, y + 1, bw, 4); ctx.fillStyle = e.immune ? (Math.floor(now / 120) % 2 ? PAL[11] : PAL[10]) : e.vuln > 0 ? PAL[5] : D.col; ctx.fillRect(bx, y + 1, Math.ceil(bw * Math.max(0, e.hp) / e.maxHp), 4);
  ctx.fillStyle = '#f4f4f4'; for (const P of D.phases) if (P.at < 1) ctx.fillRect(bx + Math.round(bw * P.at), y - 1, 1, 8);
  const P = rPhase(RR); text(ctx, `${D.name} - P${RR.ph + 1}/${D.phases.length} ${P.name}`, VW / 2, y + 8, D.col, 1, 'c');
  const cue = RR.zones.some(z => z.k === 'safe') ? { s: RR.zones.find(z => z.k === 'safe').why === 'DEATH TOLL' ? 'REACH THE LIGHT!' : 'STAND IN THE GREEN!', c: PAL[5], blink: true } : RR.cue;
  if (cue && (!cue.blink || Math.floor(now / 200) % 3)) text(ctx, cue.s, VW / 2, y + 16, cue.c, 1, 'c'); let ny = y + 24;
  if (RR.open > 0 || RR.sunder > 0) { text(ctx, [RR.open > 0 ? `OPEN ${RR.open.toFixed(1)}S - HIT IT` : '', RR.sunder > 0 ? `SUNDERED ${RR.sunder.toFixed(1)}S - DON'T GET HIT` : ''].filter(Boolean).join('  '), VW / 2, ny, RR.sunder > 0 ? PAL[2] : '#ffcd75', 1, 'c'); ny += 8; }   // 1.7.0
  if (D.chill) { const cw = 80, cx = Math.round(VW / 2 - cw / 2); ctx.fillStyle = '#0b0b14'; ctx.fillRect(cx - 1, ny, cw + 2, 4); ctx.fillStyle = '#29366f'; ctx.fillRect(cx, ny + 1, cw, 2); ctx.fillStyle = RR.chill > 0.75 && Math.floor(now / 100) % 2 ? PAL[12] : PAL[11]; ctx.fillRect(cx, ny + 1, Math.ceil(cw * RR.chill), 2);
    text(ctx, RR.warmIn ? 'WARM' : 'COLD', cx + cw + 4, ny - 2, RR.warmIn ? '#ffcd75' : PAL[11], 1, 'l'); ny += 7; for (const w of RR.warm) edgeArrow(w.x, w.y, '#ffcd75', now, 'F'); }
  edgeArrow(e.x, e.y, D.col, now, 'R');
  for (const z of RR.zones) if (z.k === 'safe') edgeArrow(z.x, z.y, PAL[5], now, 'S');
  for (const o of R.E) if (o.rsh) edgeArrow(o.x, o.y, PAL[11], now, o.act === 'pylon' ? 'P' : '');
  return ny;
}
function raidTop(now) {   // replaces WAVE n / BOSS IN n WAVES in a raid
  const RR = R.raid, D = RR.D, s = `RAID: ${D.name}`; text(ctx, s, VW / 2, 4, D.col, 2, 'c');
  text(ctx, `${fmtT(Math.max(0, R.t - (RR.t0 || R.t)))}   ${RR.hits} HITS TAKEN${RR.rm && RR.rm.tier ? `   REMATCH T${RR.rm.tier}` : ''}`, VW / 2, 19, '#94b0c2', 1, 'c');
  if (RR.ar < 1 && !inArena(R.p.x, R.p.y, RR.ar)) text(ctx, 'IN THE VOID - GET TO THE CENTRE', VW / 2, 27, Math.floor(now / 150) % 2 ? PAL[2] : PAL[1], 1, 'c');
  if (D.chill && RR.chill > 0.6) { ctx.fillStyle = PAL[11]; ctx.globalAlpha = (RR.chill - 0.6) * 0.6; ctx.fillRect(0, 0, VW, 4); ctx.fillRect(0, VH - 4, VW, 4); ctx.fillRect(0, 0, 4, VH); ctx.fillRect(VW - 4, 0, 4, VH); ctx.globalAlpha = 1; }
}

/* ---- 0.9.0 Portal Circle: a village building that drops you into a later wave for gold. Level L opens drop waves PORTAL_W[1..L].
   Each use costs portalCost(W) = (20 x W + 100) x (1 + 0.2 x streak), streak = consecutive portal runs (cap 5, a normal run resets it). */
const PORTAL9 = { base: 100, perWave: 20, streak: 0.2, streakCap: 5, cacheN: 3, cacheLag: 6, attuneLag: 7 };
const portalWaves = (s = save) => PORTAL_W.slice(1, ((s.home && s.home.portal) || 0) + 1);
const portalCost = (W, s = save) => Math.round((PORTAL9.perWave * W + PORTAL9.base) * ECON.portalX * (1 + PORTAL9.streak * Math.min(PORTAL9.streakCap, (s.portal && s.portal.streak) || 0)));
function portalPick() { const p = save.portal.pick | 0; return portalWaves().includes(p) ? p : 0; }
function setPortalPick(W) { save.portal.pick = portalWaves().includes(W) ? W : 0; persist(); return save.portal.pick; }
function cyclePortal() { const o = [0, ...portalWaves()], i = o.indexOf(portalPick()); return setPortalPick(o[(i + 1) % o.length]); }
const nextGear = w => Math.max(1, Math.ceil(w / WD.every)) * WD.every;   // the gear-check wave at or after w
function updateBuffs(dt) {
  let ch = false; for (const k in R.buffs) if (R.buffs[k] > 0 && R.buffs[k] !== RUN_BUFF) { R.buffs[k] -= dt; if (R.buffs[k] <= 0) { R.buffs[k] = 0; ch = true; addText(R.p.x, R.p.y - 20, BUFFS[k].name + ' FADES', '#94b0c2'); } }
  if (ch) refreshStats();
  if (R.buffs.freeze > 0) { R.frzT -= dt; if (R.frzT <= 0) { R.frzT = 6; const p = R.p, rad = 70; R.FX.push({ k: 'ring', x: p.x, y: p.y, r: rad, t: 0.35, m: 0.35, c: PAL[10] }); sfx('nova');
    for (const e of R.E) { if (e.gob) continue; const dx = e.x - p.x, dy = e.y - p.y, d = Math.hypot(dx, dy); if (d < rad + e.r) { e.frozen = Math.max(e.frozen, e.boss ? 0.5 : 1.2); hit(e, R.S.baseDmg, { proc: false, col: PAL[10] }); } } } }
}
/* 1.15.0 PoE loot filter (Matt): Settings toggles hide Common / Magic independently (default: hide Common, show Magic = fresh-friendly).
   Items below the floor never show on the ground and never auto-pick. Optional CONVERT (default ON): filtered Common/Magic become gold (salvage %) instead of a grey puff. Rare+ always keep.
   1.16.2: NO bag/pause LOOT cycle — Settings is the only place to change the filter (accidental taps trashed wanted gear).
   lootMin stays mirrored for migration/legacy callers; setLootHide is the Settings path; openBag always re-syncs from lootHideC/M. */
const lootConvOn = () => save.lootConv !== false;
const FILTER_LBL = ['LOOT: SHOW ALL', 'LOOT: HIDE COMMON', 'LOOT: RARE ONLY'];
function lootSyncMin() {   // flags -> lootMin (Magic-only hide: cycle label stays SHOW ALL; lootBlocked still hides Magic via the independent branch)
  if (save.lootHideC && save.lootHideM) save.lootMin = 2; else if (save.lootHideC) save.lootMin = 1; else save.lootMin = 0; return save.lootMin; }
const lootMin = () => [0, 1, 2].includes(save.lootMin) ? save.lootMin : 1;
function lootBlocked(w) { if (isLocked(w)) return false; const r = (w && w.rarity) | 0; if (r >= 2) return false;
  if (save.lootHideM && !save.lootHideC) return r === 1;   // independent: hide Magic, show Common
  return r < lootMin(); }
function lootConvert(x, y, w) { const g = salvageG(w); addGold(g); R.converted = (R.converted || 0) + g; addText(x, y - 8, `+${g}G`, '#ffcd75'); burst(x, y, '#ffcd75', 8, 28, 0.35); sfx('coin'); return g; }
function dropWeapon(x, y, w, force) {
  if (!force && lootBlocked(w)) { R.filtered++; if (lootConvOn() && ((w.rarity | 0) < 2)) lootConvert(x, y, w); else burst(x, y, '#566c86', 6, 25, 0.3); return null; }
  R.drops++; const it = { x, y, w, bob: Math.random() * 6, t: 0, force: !!force }; R.I.push(it);
  if (R.I.length > 10) { const j = R.I.findIndex(o => !o.force); R.I.splice(j < 0 ? 0 : j, 1); } sfx(w.rarity >= 3 ? 'unique' : w.rarity >= 2 ? 'rare' : 'drop');   /* 1.8.0: rarity-tiered loot cue */ burst(x, y, RCOL[w.rarity], 16, 50); return it; }
function setLootMin(v) { v = clamp(v | 0, 0, 2); save.lootMin = v; save.lootHideC = v >= 1; save.lootHideM = v >= 2; persist(); lootPurgeGround(); return save.lootMin; }
function setLootHide(kind, on) { if (kind === 'c') save.lootHideC = !!on; else if (kind === 'm') save.lootHideM = !!on; else if (kind === 'conv') { save.lootConv = !!on; persist(); renderSettings(); return true; }
  lootSyncMin(); persist(); lootPurgeGround(); renderSettings(); return true; }
function lootPurgeGround() { if (!R) return; R.I = R.I.filter(it => { if (it.force || !lootBlocked(it.w)) return true; R.filtered++; if (lootConvOn() && ((it.w.rarity | 0) < 2)) lootConvert(it.x, it.y, it.w); else burst(it.x, it.y, '#566c86', 6, 25, 0.3); return false; }); }
function gainXP(v) {   // 1.7.0: every XP gain x ECON.xp (fractions carry within the run); hero XP is gone (one shared SP pool)
  R.xpC = (R.xpC || 0) + v * ECON.xp; v = Math.floor(R.xpC); R.xpC -= v; if (v <= 0) return;
  R.xpGained += v; const ups = addXP(v), hu = 0;
  if (ups) { R.lvlUps += ups; R.banner = { s: `LEVEL ${save.level}!  +${ups} SKILL POINT`, t: 2.4, c: '#a7f070' }; sfx('lvl'); burst(R.p.x, R.p.y, PAL[5], 30, 60); R.flash = 0.15; }
  if (hu) { R.hUps += hu; R.bq.push({ s: `${HEROES[R.hero].name.toUpperCase()} LV ${hx(R.hero).lv}!  +${hu} HERO POINT`, t: 2.2, c: '#ffcd75' }); if (!ups) { sfx('lvl'); burst(R.p.x, R.p.y, PAL[4], 20, 50); } }
}
function attack() {
  const p = R.p, S = R.S, w = R.weapon, B = BASES[w.base];
  const t = R.E.find(e => e.inst && e.hp > 0 && Math.hypot(e.x - p.x, e.y - p.y) < 50 + e.r) || (R.ev && R.ev.k === 'escort' && nearestRaider(p.x, p.y, S.range)) || (R.raid && nearestMarked(p.x, p.y, S.range * (MELEE[w.base] ? 1.15 : 1))) || nearest(p.x, p.y, S.range * (MELEE[w.base] ? 1.15 : 1)); if (!t) return ON18 ? iceAuto18() : false;   // 0.8.0: standing at an installation, you hit it
  const a = Math.atan2(t.y - p.y, t.x - p.x); p.aimA = a; p.face = Math.cos(a) < 0 ? -1 : 1;
  if (S.storm3 && (R.stormN = (R.stormN || 0) + 1) % S.storm3 === 0) { R.FX.push({ k: 'zap', x1: t.x, y1: t.y - 60, x2: t.x, y2: t.y, t: 0.15 }); burst(t.x, t.y, PAL[11], 10, 40); hit(t, S.baseDmg * 2.5, { proc: false, col: PAL[11] }); chain(t, S.baseDmg); R.stormHits = (R.stormHits || 0) + 1; }   // 1.7.0 Stormcaller 3pc
  if (w.base === 'wand') {
    const seen = new Set(); const targets = [t]; seen.add(t.id);
    for (let i = 0; i < S.proj; i++) { const n = nearest(p.x, p.y, S.range, seen); if (n) { seen.add(n.id); targets.push(n); } else targets.push(t); }
    targets.forEach((tg, i) => { const aa = Math.atan2(tg.y - p.y, tg.x - p.x) + (i && tg === t ? rnd(-0.3, 0.3) : 0); R.P.push({ k: 'bolt', x: p.x, y: p.y - 4, vx: Math.cos(aa) * 170, vy: Math.sin(aa) * 170, r: 2.5 * Math.sqrt(S.area), splash: 12 * S.area, dmg: S.baseDmg, pierce: 0, life: 1.1, hit: new Set(), tgt: tg }); });
  } else if (w.base === 'bow') {
    const n = 3 + S.proj, spread = 0.24;
    for (let i = 0; i < n; i++) { const aa = a + (i - (n - 1) / 2) * spread; R.P.push({ k: 'arrow', x: p.x, y: p.y - 4, vx: Math.cos(aa) * 240, vy: Math.sin(aa) * 240, r: 2 * Math.sqrt(S.area), dmg: S.baseDmg, pierce: 2, life: 0.9, hit: new Set() }); }
  } else if (w.base === 'spear') {   // 1.1.0: line thrust, pierces everything; Twin adds thrusts fanned 0.35 rad apart
    const L = S.range, n = 1 + S.proj;
    for (let s = 0; s < n; s++) { const ca = a + (s - (n - 1) / 2) * 0.35, cx = Math.cos(ca), cy = Math.sin(ca); R.FX.push({ k: 'thrust', x: p.x, y: p.y - 3, a: ca, r: L, t: 0.14, m: 0.14 });
      for (const e of R.E) { if (e.hp <= 0) continue; const dx = e.x - p.x, dy = e.y - p.y, al = dx * cx + dy * cy, pp = Math.abs(-dx * cy + dy * cx); if (al < -4 || al > L + e.r || pp > 6 + e.r) continue; hit(e, S.baseDmg, { kx: cx, ky: cy, kb: 50, src: 'spear' }); }
      if (S.uq.comet) R.P.push({ k: 'arrow', comet: 1, x: p.x, y: p.y - 4, vx: cx * 260, vy: cy * 260, r: 3 * Math.sqrt(S.area), dmg: S.baseDmg * 0.8, pierce: 99, life: L * 2 / 260, hit: new Set() }); }   // 1.13.2 Comet Pike
  } else if (w.base === 'xbow') {   // 1.1.0: 3-bolt burst (5 with Widowmaker) at one target, 0.07s apart
    const n = (S.uq.widow ? 5 : 3) + S.proj;
    for (let i = 0; i < n; i++) R.P.push({ k: 'cbolt', x: p.x, y: p.y - 4, vx: Math.cos(a) * 280, vy: Math.sin(a) * 280, r: 2 * Math.sqrt(S.area), dmg: S.baseDmg, pierce: 0, life: 0.9, hit: new Set(), wait: i * 0.07, tgt: t });
  } else if (w.base === 'flail') {   // 1.1.0: full ring; Twin adds follow-up spins 0.12s apart
    const rad = S.range; flailRing(rad); for (let i = 1; i <= S.proj; i++) R.pend.push({ k: 'flail', t: 0.12 * i, m: 0.12 * i, r: rad, mul: FLAIL2.twin });
  } else if (w.base === 'chakram') { chakThrow(a);   // 1.10.0
  } else if (w.base === 'darts') { dartsThrow(a);   // 1.10.0
  } else {   // 1.7.0 axe: ONE frontal cone (never behind you); Twin = follow-up chops into the same cone, a little wider
    axeChop(a); for (let i = 1; i <= S.proj; i++) R.pend.push({ k: 'axe', t: AXE7.gap * i, m: AXE7.gap * i, a });
  }
  sfx('shoot'); return true;
}
function dashDir() { const p = R.p; let dx = input.mx, dy = input.my; if (!dx && !dy) { const t = nearest(p.x, p.y, 120); if (t) { dx = t.x - p.x; dy = t.y - p.y; } else dx = p.face; } const l = Math.hypot(dx, dy) || 1; return [dx / l, dy / l]; }
const kitOf = () => HEROES[R.hero];
function useA(n) {   // RULE: actives live on the hero; switching hero swaps the whole kit
  if (!R || R.over) return false; const p = R.p, a = n === 1 ? kitOf().a1 : kitOf().a2, key = n === 1 ? 'cd1' : 'cd2';
  if (p[key] > 0) return false; if (ABIL[a.id]() === false) return false; p[key] = a.cd * R.S.cd; if (n === 1 && R.S.mom) p.mom = 3; if (n === 1 && R.S.uq.oath) oathNova(p.x, p.y); if (n === 1) shedPoison(R.poison ? Math.max(POI.shed, Math.ceil(R.poison.n * POI.shedPct)) : POI.shed); /* 1.10.0 quick ability sheds poison */ return true;   // 1.1.0 Momentum
}
function oathNova(x, y) { const S = R.S, rad = 40 * S.area; R.FX.push({ k: 'ring', x, y, r: rad, t: 0.35, m: 0.35, c: PAL[3] }); burst(x, y - 4, PAL[4], 16, 55); R.oathN = (R.oathN || 0) + 1;   // 1.13.2 Oathbreaker
  for (const e of R.E) { const d = Math.hypot(e.x - x, e.y - y); if (e.hp > 0 && d < rad + e.r) { hit(e, S.baseDmg * 1.5, { proc: false, col: PAL[3] }); if (e.hp > 0) e.burn = { dps: S.baseDmg * 0.4 * S.burnX, t: 3, tick: 0.5 }; } } }
const dash = () => useA(1), nova = () => useA(2);
const pendTarget = (range, ahead) => { const p = R.p, t = nearest(p.x, p.y, range); return t ? [t.x, t.y] : [p.x + p.face * ahead, p.y]; };
const ABIL = {
  dash() { const p = R.p; if (p.dash) return false; const [dx, dy] = dashDir(); p.dash = { k: 'dash', dx, dy, t: 0.16 * (1 + 0.2 * hrank('w_stride')), sp: 400, hit: new Set() }; p.inv = 0.45; sfx('dash');
    if (R.S.echoS) R.pend.push({ k: 'echo', x: p.x, y: p.y, t: 0.5, m: 0.5, r: 24, lv: R.S.echoS }); },   // 1.1.0 Echo Step
  roll() { const p = R.p; if (p.dash) return false; const [dx, dy] = dashDir(); p.dash = { k: 'roll', dx, dy, t: 0.22, sp: 430, hit: new Set() }; p.inv = 0.5 + 0.25 * R.S.vanish; p.quick = 2.5 + hrank('r_quick');
    if (R.S.vanish) for (const e of R.E) { if (e.hp <= 0 || Math.hypot(e.x - p.x, e.y - p.y) > 90) continue; if (e.aim > 0) { e.aim = 0; e.shootT = Math.max(e.shootT, 1.2); } if (e.act === 'charger' && e.st === 1) { e.st = 3; e.stT = 0.6; } if (e.cast > 0) e.cast = 0; }   // 1.1.0 Vanish
    const ct = hrank('r_calt'); if (ct) R.pend.push({ k: 'calt', x: p.x, y: p.y, t: 3, m: 3, tick: 0, r: 18, lv: ct }); sfx('dash'); },
  charge() { const p = R.p; if (p.dash) return false; const [dx, dy] = dashDir(); p.dash = { k: 'charge', dx, dy, t: 0.3, sp: 330, hit: new Set() }; p.inv = 0.5; addShake(2); sfx('dash'); },
  nova() { novaBlast(); if (hrank('w_after')) R.pend.push({ k: 'nova2', x: R.p.x, y: R.p.y, t: 0.6, m: 0.6, r: 0 }); if (R.S.glacier) R.pend.push({ k: 'icef', x: R.p.x, y: R.p.y, t: 3, m: 3, tick: 0, r: 40 * R.S.novaR, lv: R.S.glacier }); },   // 1.1.0 Glacier
  meteor() { const [x, y] = pendTarget(170, 50), br = hrank('p_rock'), r = 34 * R.S.novaR * (1 + 0.15 * br); R.pend.push({ k: 'meteor', x, y, t: 0.45, m: 0.45, r, mul: 1 + 0.1 * br, main: true });
    const ns = hrank('p_shower'); if (ns) { const p = R.p, far = R.E.filter(e => e.hp > 0 && Math.hypot(e.x - p.x, e.y - p.y) < 170 && Math.hypot(e.x - x, e.y - y) > r); for (let i = 0; i < ns; i++) { const t = far.length ? far.splice(Math.floor(Math.random() * far.length), 1)[0] : null;
      R.pend.push({ k: 'meteor', x: t ? t.x : x + rnd(-40, 40), y: t ? t.y : y + rnd(-30, 30), t: 0.65 + 0.15 * i, m: 0.65 + 0.15 * i, r: r * 0.6, mul: 0.5 * (1 + 0.1 * br) }); } }
    sfx('event'); },
  rain() { const [x, y] = pendTarget(170, 40), v = hrank('r_volley'), d = 2 + 0.5 * v, rr = 44 * R.S.novaR * (1 + 0.1 * v); R.pend.push({ k: 'rain', x, y, t: d, m: d, tick: 0, r: rr });
    const hl = R.S.hail; if (hl) { const p = R.p, f = R.E.filter(e => e.hp > 0 && Math.hypot(e.x - p.x, e.y - p.y) < 200 && Math.hypot(e.x - x, e.y - y) > 60).sort((a, b) => Math.hypot(a.x - p.x, a.y - p.y) - Math.hypot(b.x - p.x, b.y - p.y))[0], d2 = d * 0.5 * hl;   // 1.1.0 Hailstorm
      R.pend.push({ k: 'rain', x: f ? f.x : x + rnd(-60, 60), y: f ? f.y : y + rnd(-40, 40), t: d2, m: d2, tick: 0, r: rr * 0.7, hail: true }); }
    sfx('shoot'); },
  inferno() { R.p.aura = 4 + hrank('p_walk'); R.p.auraT = 0; R.p.auraOn = true; sfx('nova'); burst(R.p.x, R.p.y, PAL[3], 30, 70); },
  ward() { R.p.ward = 5 + hrank('k_wall'); R.p.wardOn = true; sfx('buff'); burst(R.p.x, R.p.y, PAL[12], 24, 50); },
};
function updateKit(dt) {
  const p = R.p, S = R.S; p.quick = Math.max(0, p.quick - dt);
  for (const q of R.pend) {
    q.t -= dt;
    if (q.k === 'meteor' && q.t <= 0) { R.FX.push({ k: 'fire', x: q.x, y: q.y, r: q.r, ry: 0.7, t: 0.45, m: 0.45, sd: (q.x * 7 + q.y * 3) & 63 }); burst(q.x, q.y, PAL[3], 40, 90); burst(q.x, q.y, PAL[4], 20, 60); addShake(5); sfx('nova');
      for (const e of R.E) { const dx = e.x - q.x, dy = e.y - q.y, d = Math.hypot(dx, dy); if (d > q.r + e.r) continue; hit(e, S.baseDmg * 4 * S.dashX * (q.mul || 1), { kx: dx / (d || 1), ky: dy / (d || 1), kb: 60, col: PAL[3] }); if (e.hp > 0) e.burn = { dps: S.baseDmg * 0.6 * S.burnX, t: 3, tick: 0.5 }; } }
    if (q.k === 'nova2' && q.t <= 0) novaBlast(0.7, 0.5);   // 0.7.0 Wanderer Aftershock
    if (q.k === 'meteor' && q.t <= 0 && q.main && S.crater) R.pend.push({ k: 'crater', x: q.x, y: q.y, t: 3, m: 3, tick: 0.25, r: q.r * 0.7, lv: S.crater });   // 1.1.0 Pyro Crater
    if (q.k === 'echo' && q.t <= 0) { R.FX.push({ k: 'ring', x: q.x, y: q.y, r: q.r, t: 0.3, m: 0.3, c: PAL[11] }); burst(q.x, q.y, PAL[12], 16, 50); sfx('zap');   // 1.1.0 Wanderer Echo Step
      for (const e of R.E) { const dx = e.x - q.x, dy = e.y - q.y, d = Math.hypot(dx, dy); if (d < q.r + e.r) hit(e, S.baseDmg * q.lv * S.dashX, { kx: dx / (d || 1), ky: dy / (d || 1), kb: 50, col: PAL[11] }); } }
    if (q.k === 'flail' && q.t <= 0) flailRing(q.r, q.mul || 1);
    if (q.k === 'axe' && q.t <= 0) axeChop(q.a);   // 1.7.0 Twin follow-up chop
    if (q.k === 'icef' || q.k === 'crater') { q.tick -= dt; if (q.tick <= 0) { q.tick = 0.5; const ice = q.k === 'icef';   // 1.1.0 Glacier / Crater ground zones
      for (const e of R.E) if (e.hp > 0 && !e.inst && Math.hypot(e.x - q.x, (e.y - q.y) / 0.7) < q.r + e.r) { if (ice) e.chill = Math.max(e.chill, 1); hit(e, S.baseDmg * (ice ? 0.25 : 0.3) * q.lv, { proc: false, noCrit: true, col: ice ? PAL[11] : PAL[3] }); if (!ice && e.hp > 0) e.burn = { dps: S.baseDmg * 0.3 * S.burnX, t: 2, tick: 0.5 }; } } }
    if (q.k === 'calt') { q.tick -= dt; if (q.tick <= 0) { q.tick = 0.3; for (const e of R.E) if (e.hp > 0 && Math.hypot(e.x - q.x, e.y - q.y) < q.r + e.r) { e.chill = Math.max(e.chill, 0.6); hit(e, S.baseDmg * 0.4 * q.lv, { proc: false, noCrit: true, col: PAL[13] }); } } }   // 0.7.0 Ranger Caltrops
    if (q.k === 'rain') { q.tick -= dt; while (q.tick <= 0 && q.t > 0) { q.tick += 0.07; const a = Math.random() * TAU, rr = Math.sqrt(Math.random()) * q.r, x = q.x + Math.cos(a) * rr, y = q.y + Math.sin(a) * rr * 0.7;
      R.FX.push({ k: 'drop', x, y, t: 0.12, m: 0.12 }); for (const e of R.E) if (e.hp > 0 && Math.hypot(e.x - x, e.y - y) < 11 + e.r) { hit(e, S.baseDmg * 1.1, { proc: false, col: PAL[13] }); e.chill = Math.max(e.chill, 1); if (S.pin && !e.boss) e.frozen = Math.max(e.frozen, 0.35); } } }
  }
  R.pend = R.pend.filter(q => q.t > 0);
  if (p.aura > 0) { p.aura -= dt; p.auraT -= dt; const rad = 50 * S.novaR * (1 + 0.08 * hrank('p_walk')); if (S.heat) for (const b of R.EP) if (Math.hypot(b.x - p.x, b.y - p.y) < rad) b.life = 0;
    if (Math.random() < 0.9) { const a = Math.random() * TAU; R.PT.push({ x: p.x + Math.cos(a) * rad * Math.random(), y: p.y + Math.sin(a) * rad * 0.7 * Math.random(), vx: 0, vy: -30, t: 0.35, m: 0.35, c: Math.random() < 0.5 ? PAL[3] : PAL[4], s: 2 }); }
    if (p.auraT <= 0) { p.auraT = 0.25; for (const e of R.E) { if (e.hp <= 0) continue; const d = Math.hypot(e.x - p.x, e.y - p.y); if (d < rad + e.r) { hit(e, S.baseDmg * 0.7, { proc: false, col: PAL[3] }); if (e.hp > 0) e.burn = { dps: S.baseDmg * 0.4 * S.burnX, t: 2, tick: 0.5 }; } } } }
  else if (p.auraOn) { p.auraOn = false; if (S.pnova) { const rad = 50 * S.novaR * (1 + 0.08 * hrank('p_walk')); R.FX.push({ k: 'ring', x: p.x, y: p.y, r: rad, t: 0.4, m: 0.4, c: PAL[4] }); burst(p.x, p.y, PAL[3], 40, 90); addShake(5); sfx('nova');   // 1.1.0 Supernova
    for (const e of R.E) { const dx = e.x - p.x, dy = e.y - p.y, d = Math.hypot(dx, dy); if (d < rad + e.r) { hit(e, S.baseDmg * 3, { kx: dx / (d || 1), ky: dy / (d || 1), kb: 70, col: PAL[4] }); if (e.hp > 0) e.burn = { dps: S.baseDmg * 0.5 * S.burnX, t: 3, tick: 0.5 }; } } } }
  if (p.ward > 0) { p.ward -= dt; const ang = R.t * 4, nw = 4 + hrank('k_wall');
    for (let i = 0; i < nw; i++) { const a = ang + i * TAU / nw, sx = p.x + Math.cos(a) * 22, sy = p.y - 4 + Math.sin(a) * 16;
      for (const e of R.E) if (e.hp > 0 && (e.wardCd || 0) <= R.t && Math.hypot(e.x - sx, e.y - 4 - sy) < 7 + e.r) { e.wardCd = R.t + 0.4; const dx = e.x - p.x, dy = e.y - p.y, d = Math.hypot(dx, dy) || 1; hit(e, S.baseDmg * 1.0, { kx: dx / d, ky: dy / d, kb: 80, col: PAL[12] }); }
      for (const b of R.EP) if (Math.hypot(b.x - sx, b.y - sy) < 7) b.life = 0; } }
  else if (p.wardOn) { p.wardOn = false; if (S.bstorm) { const nw = 4 + hrank('k_wall'), ang = R.t * 4; for (let i = 0; i < nw; i++) { const a = ang + i * TAU / nw; R.P.push({ k: 'boneP', x: p.x + Math.cos(a) * 22, y: p.y - 4 + Math.sin(a) * 16, vx: Math.cos(a) * 200, vy: Math.sin(a) * 200, r: 3, dmg: S.baseDmg * S.bstorm, pierce: 2, life: 0.8, hit: new Set() }); } sfx('shoot'); } }   // 1.1.0 Bonestorm
  p.mom = Math.max(0, p.mom - dt);
  if (S.gale) { p.galeT -= dt; if (p.galeT <= 0) { p.galeT = 8; let n = 0; for (const g of [...R.G, ...R.C]) if (Math.abs(g.x - p.x) < VW / 2 + 20 && Math.abs(g.y - p.y) < VH / 2 + 20) { g.mag = true; n++; } if (n) { R.FX.push({ k: 'ring', x: p.x, y: p.y, r: 90, t: 0.35, m: 0.35, c: PAL[12] }); sfx('swap'); } } }   // 1.1.0 Gale Pull
  if (S.uq.stride) { const dd = Math.hypot(p.x - (p.lsx ?? p.x), p.y - (p.lsy ?? p.y)); p.lsx = p.x; p.lsy = p.y; if (dd < 30) p.strD = (p.strD || 0) + dd; if (p.strD >= 70) { p.strD = 0; const t = nearest(p.x, p.y, 150); if (t) { R.FX.push({ k: 'zap', x1: t.x, y1: t.y - 60, x2: t.x, y2: t.y, t: 0.15 }); burst(t.x, t.y, PAL[11], 8, 40); hit(t, S.baseDmg * 1.2, { proc: false, col: PAL[11] }); chain(t, S.baseDmg * 0.6); R.strideN = (R.strideN || 0) + 1; } } }   // 1.13.2 Stormstride
  if (S.uq.lode && (R.gemN || 0) >= 25) { R.gemN = 0; shardRing(10, 1); R.lodeN = (R.lodeN || 0) + 1; }   // 1.13.2 Lodestone
  if (S.uq.sun) { p.sunT -= dt; if (p.sunT <= 0) { p.sunT = 5; const rad = 46 * S.area; R.FX.push({ k: 'ring', x: p.x, y: p.y, r: rad, t: 0.35, m: 0.35, c: PAL[4] }); burst(p.x, p.y - 4, PAL[4], 20, 60);   // 1.1.0 Pocket Sun
    for (const e of R.E) { const dx = e.x - p.x, dy = e.y - p.y, d = Math.hypot(dx, dy); if (d < rad + e.r) { hit(e, S.baseDmg * 1.5, { kx: dx / (d || 1), ky: dy / (d || 1), kb: 40, col: PAL[4] }); if (e.hp > 0) e.burn = { dps: S.baseDmg * 0.4 * S.burnX, t: 2, tick: 0.5 }; } } } }
}
function novaBlast(rm = 1, dm = 1) {
  const p = R.p; const S = R.S; const rad = 64 * S.novaR * rm;
  if (ON18) iceArea18(p.x, p.y, rad, S.baseDmg * 3 * dm);   // 1.18.0 Nova cracks ice
  R.FX.push({ k: 'ring', x: p.x, y: p.y, r: rad, t: 0.4, m: 0.4, c: PAL[11] }); addShake(6); R.flash = 0.12; R.hitstop = 0.05; sfx('nova');
  for (let i = 0; i < 40; i++) { const a = i / 40 * TAU; R.PT.push({ x: p.x, y: p.y, vx: Math.cos(a) * rad * 2.2, vy: Math.sin(a) * rad * 2.2, t: 0.4, m: 0.4, c: i % 2 ? PAL[11] : PAL[12], s: 2 }); }
  for (const e of R.E) { const dx = e.x - p.x, dy = e.y - p.y, d = Math.hypot(dx, dy); if (d > rad + e.r) continue; e.frozen = e.boss ? S.freeze / 2 : S.freeze; hit(e, S.baseDmg * 3 * dm, { kx: dx / (d || 1), ky: dy / (d || 1), kb: 70, col: PAL[11] }); }
  for (const b of R.EP) { if (Math.hypot(b.x - p.x, b.y - p.y) < rad) b.life = 0; }
}
function equipItem(w) {   // returns whatever was in that slot (may be null)
  const slot = w.slot || 'weapon', old = R.gear[slot], hpFrac = R.p.hp / R.S.maxHp; R.gear[slot] = w; if (slot === 'weapon') { R.weapon = w; R.p.atkCd = 0.15; }
  R.S = stats(R.gear); R.p.hp = Math.min(R.S.maxHp, Math.max(1, hpFrac * R.S.maxHp));
  sfx('swap'); burst(R.p.x, R.p.y, RCOL[w.rarity], 20, 50); R.banner = { s: w.name, t: 1.6, c: RCOL[w.rarity] }; return old;
}
const equipWeapon = equipItem;
function bagEquip(i) { const w = R.bag[i]; if (!w || R.over) return false; const old = equipItem(w); if (old) R.bag[i] = old; else R.bag.splice(i, 1); return true; }
function bagUnequip(slot) { const w = R.gear[slot]; if (!w || slot === 'weapon' || R.bag.length >= bagMax() || R.over) return false; R.gear[slot] = null; R.bag.push(w); refreshStats(); sfx('swap'); return true; }
/* 0.6.0 drop rule: JUNK deletes the item (it never lands on the floor, so you can't walk over it again).
   Ground inspect: with the bag open you can EQUIP / TAKE / JUNK loot lying nearby without bagging it first.
   An item swapped out while the bag is full is set down as `left`: it never auto-picks again this run (TAKE it from the ground list if you change your mind). */
function junkFx(w) { R.junked++; sfx('hit'); burst(R.p.x, R.p.y - 4, '#566c86', 10, 30, 0.35); }
function bagDiscard(i) { const w = R.bag[i]; if (!w) return false; if (isLocked(w)) { toast('Locked — unlock first'); sfx('deny'); return false; } R.bag.splice(i, 1); junkFx(w); return true; }
const bagJunk = bagDiscard;
const NEAR_R = 160;
function nearbyLoot() { const p = R.p, d = it => Math.hypot(it.x - p.x, it.y - p.y); return R.I.filter(it => !it.gone && d(it) < NEAR_R).sort((a, b) => d(a) - d(b)).slice(0, 10); }
function groundEquip(it) { if (!it || R.over || !R.I.includes(it)) return false; R.I.splice(R.I.indexOf(it), 1); const old = equipItem(it.w);
  if (old) { if (R.bag.length < bagMax()) R.bag.push(old); else R.I.push({ x: it.x, y: it.y, w: old, bob: Math.random() * 6, t: 0, left: true }); } return true; }
function groundTake(it) { if (!it || R.over || !R.I.includes(it) || R.bag.length >= bagMax()) return false; R.I.splice(R.I.indexOf(it), 1); R.bag.push(it.w); sfx('swap'); return true; }
function groundJunk(it) { if (!it || !R.I.includes(it)) return false; if (isLocked(it.w)) { toast('Locked — unlock first'); sfx('deny'); return false; } R.I.splice(R.I.indexOf(it), 1); junkFx(it.w); return true; }
const worseInBag = () => R.bag.filter(w => !w.heir && !w.lo && !w.uq && !isLocked(w) && itemDelta(w) < 0);   // 1.17.1: never auto-junk a locked item   // 1.13.0: never auto-junk a loadout piece   // 1.1.0: never auto-junk a Unique
function junkWorse() { const bad = worseInBag(); R.bag = R.bag.filter(w => !bad.includes(w)); bad.forEach(junkFx); return bad.length; }
function collect(it) {
  if (!it.force && lootBlocked(it.w)) { it.gone = true; R.filtered++; if (lootConvOn() && ((it.w.rarity | 0) < 2)) lootConvert(it.x, it.y, it.w); else burst(it.x, it.y, '#566c86', 6, 25, 0.3); return false; }   // 1.15.0: never auto-pick below the floor
  R.bag.push(it.w); it.gone = true; R.bagNew++; const up = itemDelta(it.w);
  addText(R.p.x, R.p.y - 18, up > 0 ? '+BAG ▲' : '+BAG', up > 0 ? '#a7f070' : RCOL[it.w.rarity], up > 0);
  sfx('swap'); burst(it.x, it.y, RCOL[it.w.rarity], 12, 40);
}

/* ---------------- update ---------------- */
function update(dt) {
  const p = R.p, S = R.S;
  R.shake = Math.max(0, R.shake - dt * 20); R.flash = Math.max(0, R.flash - dt); if (R.banner) { R.banner.t -= dt; if (R.banner.t <= 0) R.banner = null; } if (!R.banner && R.bq.length) { R.banner = R.bq.shift(); if (R.banner && R.banner.s) evLogPush(R.banner.s); }
  if (R.over) { R.overT += dt; updateFx(dt * 0.4); if (R.overT > 1.6 && mode === 'run') endRun(!R.escaped && !R.raidOut); return; }
  if (R.hitstop > 0) { R.hitstop -= dt; return; }
  R.t += dt; tutTick(dt);
  const hp0 = p.hp, rv0 = R.revives;   // 1.9.4 NO REGEN: no net healing this frame (a Hearth revive still works)   // 1.7.1 coach tips
  // waves
  const w = R.raid ? R.wave : Math.floor(R.t / WAVE_LEN) + 1;   // 1.4.0: a raid has no waves
  if (w !== R.wave) {
    R.wave = w; R.surged = false; R.banner = { s: `WAVE ${w}`, t: 2, c: w % 5 === 0 ? '#b13e53' : '#ffcd75' }; sfx('wave');
    if (save.home.mend && p.hp < S.maxHp && canHeal()) { const h = Math.round(S.maxHp * mendPct() / 100 * save.home.mend); p.hp = Math.min(S.maxHp, p.hp + h); addText(p.x, p.y - 14, `+${h} MEND`, PAL[5]); }
    if (isGearWave(w)) spawnWarden(w / WD.every);   // 0.9.0 Gear Check replaces this wave's Colossus
    if (isGateWave(w) && !R.raid) openGate();   // 1.7.0 exit gate every 10 waves (the Warden is the trial on a Gear Check wave)
    else if (w % 5 === 0) { const [x, y] = ringPos(spawnDist()); spawnEnemy('brute', x, y, { boss: true }); R.banner = { s: `BOSS EVENT: BONE COLOSSUS`, t: 2.6, c: '#b13e53' }; sfx('boss'); addShake(6); R.majCd = Math.max(R.majCd, 15); }
    if (w >= 2) { const [x, y] = ringPos(spawnDist()); spawnEnemy(pickType(true), x, y, { elite: true }); }
    for (const [t, from] of (TABLES[R.map] || TABLES.ash).cast) if (from === w && !R.met[t]) { R.met[t] = 1; const T = ETYPES[t]; R.bq.push({ s: `NEW FOE: ${T.name}`, t: 1.8, c: PAL[11] }, { s: T.hint || ROLE_HINT[T.role], t: 1.4, c: '#94b0c2' }); }   // 0.5.0 intro
  }
  const wt = R.t % WAVE_LEN;
  if (wt > 15 && !R.surged && !R.gc && !R.raid) { R.surged = true; const TB = TABLES[R.map] || TABLES.ash, n = Math.round(Math.min(60, 12 + w * 3) * (R.M.dens || 1)), sw = TB.swarm.filter(t => inCast(R.map, t, w)), type = pick(sw.length ? sw : ['slime']), d = spawnDist() * 0.85;
    for (let i = 0; i < n; i++) { const a = i / n * TAU; spawnEnemy(type, p.x + Math.cos(a) * d, p.y + Math.sin(a) * d); }
    const vg = TB.vanguard.filter(t => inCast(R.map, t, w)), k = w >= 4 && vg.length ? Math.min(6, Math.floor(w / 3)) : 0;   // 0.5.0: tougher map types ride in the ring from wave 4
    for (let i = 0; i < k; i++) { const a = (i + 0.5) / k * TAU; spawnEnemy(vg[i % vg.length], p.x + Math.cos(a) * d * 1.08, p.y + Math.sin(a) * d * 1.08); }
    if (MINI_WAVE(w)) spawnMini();
    if (w >= 6) { const [x, y] = ringPos(spawnDist()); spawnEnemy(pickType(true), x, y, { elite: true }); }
    if (w >= 13) { const [x, y] = ringPos(spawnDist()); spawnEnemy(pickType(true), x, y, { elite: true }); }
    if (!MINI_WAVE(w)) R.banner = R.banner || { s: 'THE HORDE SURGES', t: 1.5, c: '#ef7d57' }; }
  const dn = R.M.dens || 1, rate = Math.min(14, 1.6 + 0.55 * w) * (R.gc ? 0.35 : 1) * dn * (ON18 ? heatX18() : 1), cap = Math.round(Math.min(260, 40 + 12 * w) * dn);   // 0.9.0: trash thins out during a Gear Check. 1.5.0: x zone horde (dens)
  if (!R.raid) R.spawnAcc += dt * rate; while (R.spawnAcc >= 1) { R.spawnAcc--; if (R.E.length < cap) { const [x, y] = ringPos(spawnDist()); R.spawnAcc -= spawnPack(pickType(), x, y) - 1; } }
  if (R.raid) updateRaid(dt); else { updateHazards(dt); updateEvents(dt); msStep(dt); feStep(dt); updateDirector(dt); if (ON18) update18(dt); } updateBuffs(dt); updateHex(dt); update110(dt); updateKit(dt); updateWarden(dt); updateWalls(dt); updateNukes(dt);   // 1.1.0 walls + nukes
  // player
  let mx = input.mx, my = input.my; const kx = (input.keys.d || input.keys.arrowright ? 1 : 0) - (input.keys.a || input.keys.arrowleft ? 1 : 0), ky = (input.keys.s || input.keys.arrowdown ? 1 : 0) - (input.keys.w || input.keys.arrowup ? 1 : 0);
  if (kx || ky) { const l = Math.hypot(kx, ky); mx = kx / l; my = ky / l; input.mx = mx; input.my = my; } else if (!input.stick) { input.mx = input.my = 0; mx = my = 0; }
  p.inv = Math.max(0, p.inv - dt); p.hurt = Math.max(0, p.hurt - dt); p.slowT = Math.max(0, (p.slowT || 0) - dt); p.cd1 = Math.max(0, p.cd1 - dt); p.cd2 = Math.max(0, p.cd2 - dt);
  if (p.dash) {
    const D = p.dash, sp = D.sp || 400; p.x += D.dx * sp * dt; p.y += D.dy * sp * dt; D.t -= dt;
    if (Math.random() < 0.8) R.PT.push({ x: p.x, y: p.y - 4, vx: 0, vy: 0, t: 0.25, m: 0.25, c: D.k === 'roll' ? PAL[6] : D.k === 'charge' ? PAL[13] : PAL[11], s: 2 });
    if (D.k !== 'roll') for (const e of R.E) if (!D.hit.has(e.id) && Math.hypot(e.x - p.x, e.y - p.y) < e.r + 8) { D.hit.add(e.id);
      if (D.k === 'charge') { const kr = hrank('k_ram'); hit(e, S.baseDmg * 3 * S.dashX * (1 + 0.15 * kr), { kx: D.dx, ky: D.dy, kb: 140 }); e.frozen = Math.max(e.frozen, (e.boss ? 0.3 : 0.8) + 0.25 * kr);
        if (S.rally && canHeal() && (D.heal = (D.heal || 0) + 1) <= 5) { p.hp = Math.min(S.maxHp, p.hp + S.maxHp * S.rally); addText(p.x, p.y - 14, '+' + Math.round(S.maxHp * S.rally), PAL[5]); } }   // 1.1.0 Rally
      else hit(e, S.baseDmg * 2.5 * S.dashX, { kx: D.dx, ky: D.dy, kb: 60 }); }
    if (D.t <= 0) { p.dash = null;
      if (D.k !== 'roll') { const qk = D.k === 'charge' ? hrank('k_quake') : 0, rime = D.k === 'dash' && hrank('w_rime'), rr = D.k === 'charge' ? 32 * (1 + 0.3 * qk) : 26 * (1 + 0.15 * hrank('w_stride')), mul = D.k === 'charge' ? 1.2 : 1; R.FX.push({ k: 'ring', x: p.x, y: p.y, r: rr, t: 0.25, m: 0.25, c: PAL[12] }); addShake(3);
        for (const e of R.E) { const dx = e.x - p.x, dy = e.y - p.y, d = Math.hypot(dx, dy); if (d < rr + e.r) { if (rime) e.frozen = Math.max(e.frozen, e.boss ? 0.3 : 0.8); if (qk) e.chill = Math.max(e.chill, 2); hit(e, S.baseDmg * S.dashX * mul, { kx: dx / (d || 1), ky: dy / (d || 1), kb: 80 }); } } } }
  } else { const sp = 55 * S.move * (S.gasp && p.hp < S.maxHp * 0.35 ? 1 + S.gasp : 1) * Math.min(p.slowT > 0 ? 0.65 : 1, R.onIce ? 0.62 : 1) * hexSlowMul() * (p.artSlow > 0 ? 0.55 : 1) * (ON18 ? move18() : 1); p.x += mx * sp * dt; p.y += my * sp * dt; if (mx || my) { p.anim += dt * 8; if (Math.abs(mx) > 0.2) p.face = mx < 0 ? -1 : 1; } }   // 1.1.0 Last Gasp · 1.16.0 artSlow
  if (ON18) { const n18 = pushOut18(p, 4); if (n18 && p.dash && n18.s.k === 'ice' && !p.dash.ice18) { p.dash.ice18 = 1; iceHit18(n18.s, S.baseDmg * 2.5 * S.dashX); } }   // 1.18.0 crypt walls + ice blocks
  if (!p.dash && !S.uq.regret) pushOutWalls(p, 4);   // 1.1.0 walls block you (dash / roll / charge phase through; Mason's Regret walks through)
  p.stillT = (mx || my || p.dash) ? 0 : p.stillT + dt;
  p.atkCd -= dt; if (p.atkCd <= 0) { if (attack()) p.atkCd = 1 / (S.rate * (p.quick > 0 ? 1.6 : 1) * (p.mom > 0 ? 1 + S.mom : 1) * (S.tail && (mx || my) ? 1.15 : 1)); else p.atkCd = 0.05; }   // 1.1.0 Momentum / Tailwind
  // enemies
  const grid = new Map(), cell = 16, key = (x, y) => (Math.floor(x / cell) * 73856093) ^ (Math.floor(y / cell) * 19349663);
  for (const e of R.E) { const k = key(e.x, e.y); let a = grid.get(k); if (!a) grid.set(k, a = []); a.push(e); }
  const far = spawnDist() * 1.6;
  for (const e of R.E) {
    e.flash = Math.max(0, e.flash - dt); e.fcd -= dt; e.hitCd = Math.max(0, e.hitCd - dt); e.chill = Math.max(0, e.chill - dt); if (e.shT > 0) e.shT = Math.max(0, e.shT - dt);
    if (e.burn) { e.burn.t -= dt; e.burn.tick -= dt; if (Math.random() < 0.3) R.PT.push({ x: e.x + rnd(-3, 3), y: e.y - 4, vx: 0, vy: -20, t: 0.3, m: 0.3, c: Math.random() < 0.5 ? PAL[3] : PAL[4], s: 1 });
      if (e.burn.tick <= 0) { e.burn.tick = 0.5; hit(e, e.burn.dps * 0.5, { proc: false, noCrit: true, col: PAL[3] }); } if (e.burn && e.burn.t <= 0) e.burn = null; if (e.hp <= 0) continue; }
    if (e.inst) continue;   // 0.8.0 installations: logic in updateInst
    let dx = p.x - e.x, dy = p.y - e.y, d = Math.hypot(dx, dy) || 1; const pd = d;
    if (e.gob) { const off = Math.abs(e.x - p.x) > VW / 2 + 8 || Math.abs(e.y - p.y) > VH / 2 + 8; if (off) e.gobT -= dt; if (e.gobT <= 0 || d > far * 1.5) { e.hp = 0; e.escaped = true; continue; } }
    else if (d > far && !e.boss && !e.mini && !e.fromB && !e.guard && !R.raid && !(e.raid && e.raid === R.ev)) { const [x, y] = ON18 ? free18(...ringPos(spawnDist()), e.r + 1) : ringPos(spawnDist()); e.x = x; e.y = y; continue; }   // 0.8.0 raiders; 1.16.0 barracks packs / catapult guards stay at the outpost
    const RV = e.raid && e.raid === R.ev ? e.raid : (e.raid = null);   // 0.8.0 escort raiders head for the escort, not you
    if (RV) { dx = RV.x - e.x; dy = RV.y - e.y; d = Math.hypot(dx, dy) || 1; }
    e.x += e.kx * dt; e.y += e.ky * dt; e.kx *= Math.pow(0.0005, dt); e.ky *= Math.pow(0.0005, dt);
    if (e.raidBoss && e.frozen > 0) e.frozen = Math.min(e.frozen, 0.25);   // 1.4.0: raid bosses shrug off freezes
    if (SHELL.on && !R.raid) shellStep(e, dt, pd);   // 1.12.0 ward shell (tell -> immune -> exposed)
    if (e.frozen > 0) { e.frozen -= dt; continue; }
    e.anim += dt * (e.type === 'bat' || e.type === 'rat' || e.type === 'tick' || e.type === 'maggot' ? 10 : e.st === 2 ? 14 : 5);
    volleyStep(e, dt, pd);   // 1.13.2
    if (!R.raid && nukeCaster(e)) { e.nukeT -= dt; if (e.nukeT <= 0) { e.nukeT = e.boss ? rnd(NUKE.cdBoss[0], NUKE.cdBoss[1]) : rnd(NUKE.cdElite[0], NUKE.cdElite[1]); if (pd < NUKE.range && R.nukes.length < NUKE.max && !R.over) spawnNuke(e); } }   // 1.1.0
    let sp = e.spd * (e.chill ? 0.55 : 1), ux = dx / d, uy = dy / d;
    if (R.buffs.slow > 0 && d < 60 && !e.gob) sp *= 0.5;
    if (e.wdS === 2) sp *= SHELL.spdX; else if (e.wdS === 1) sp *= SHELL.tellSpd;   // 1.12.0 shelled foes press in: kite
    if (e.gob) { ux = -ux; uy = -uy; e.ph += dt * 2.5; const s = Math.sin(e.ph) * 0.8; const nx = ux - uy * s, ny = uy + ux * s, l = Math.hypot(nx, ny); ux = nx / l; uy = ny / l; if (d > 140) sp *= 0.35; if (Math.random() < 0.2) R.PT.push({ x: e.x, y: e.y - 3, vx: 0, vy: 0, t: 0.4, m: 0.4, c: PAL[4], s: 1 }); }
    if (e.type === 'bat') { e.ph += dt * 4; const s = Math.sin(e.ph) * 0.7; const nx = ux - uy * s, ny = uy + ux * s; const l = Math.hypot(nx, ny); ux = nx / l; uy = ny / l; }
    if (e.warden) { [sp, ux, uy] = wardenStep(e, dt, d, ux, uy); }   // 0.9.0
    else if (e.act === 'raid') { [sp, ux, uy] = raidStep(e, dt, d, ux, uy); }   // 1.4.0
    else if (e.act === 'orb' || e.act === 'pylon') { [sp, ux, uy] = raidAddStep(e, dt, d, ux, uy, pd); }
    else if (e.hexo) { [sp, ux, uy] = hexStep(e, dt, pd, ux, uy); }   // 1.9.4 Hex Orb
    else if (e.boss) {
      e.shootT -= dt;
      if (e.charge > 0) { e.charge -= dt; sp *= 3.4; if (Math.random() < 0.5) R.PT.push({ x: e.x, y: e.y, vx: 0, vy: 0, t: 0.3, m: 0.3, c: PAL[1], s: 2 }); }
      if (e.shootT <= 0) { e.shootT = 3.2; const n = 14, off = Math.random() * TAU; for (let i = 0; i < n; i++) { const a = off + i / n * TAU; R.EP.push({ x: e.x, y: e.y - 6, vx: Math.cos(a) * 60, vy: Math.sin(a) * 60, r: 2, dmg: e.dmg * 0.6, life: 4 }); } sfx('boss'); if (Math.random() < 0.5) e.charge = 0.9; }
    } else if (e.act === 'charger') {   // 0.5.0: chase -> wind-up (stops, flashes, shows dash line; direction locks for the last 35%) -> straight dash -> recover
      const T = ETYPES[e.type]; e.cdT -= dt;
      if (e.st === 0) { if (e.cdT <= 0 && d < T.trig && d > 14 && onScreen(e)) { e.st = 1; e.stT = T.wind; e.dx = ux; e.dy = uy; sp = 0; sfx('wind'); } }
      else if (e.st === 1) { e.stT -= dt; sp = 0; if (e.stT > T.wind * 0.35) { e.dx = ux; e.dy = uy; } if (e.stT <= 0) { e.st = 2; e.stT = T.dashT; sfx('dash'); } }
      else if (e.st === 2) { e.stT -= dt; ux = e.dx; uy = e.dy; sp = T.dash * (R.M.spd || 1) * (e.chill ? 0.7 : 1); if (Math.random() < 0.7) R.PT.push({ x: e.x - ux * 4, y: e.y, vx: -ux * 20, vy: rnd(-8, 0), t: 0.3, m: 0.3, c: PAL[T.col ?? 13], s: e.mini ? 2 : 1 });
        if (e.stT <= 0) { if (e.chain > 0) { e.chain--; e.st = 1; e.stT = T.wind * 0.55; } else { e.st = 3; e.stT = e.mini ? 0.9 : 0.75; } } }
      else { e.stT -= dt; sp *= 0.2; if (e.stT <= 0) { e.st = 0; e.cdT = e.mini ? rnd(2, 3) : rnd(2.5, 4); e.chain = e.lesser ? Math.min(1, T.chain || 0) : T.chain || 0; } }
    } else if (e.act === 'ranged') {   // keep distance, strafe, aim (telegraph) then fire
      const T = ETYPES[e.type], keep = T.keep;
      if (d < keep - 25 && !T.stand) { ux = -ux; uy = -uy; sp *= 0.6; }   // backs off slowly: you can still run it down
      else if (d < keep + 20) { const sd = Math.sin(e.ph + R.t * 0.5) > 0 ? 1 : -1, nx = -uy * sd, ny = ux * sd; ux = nx; uy = ny; sp *= 0.5; }
      e.shootT -= dt;
      if (e.aim > 0) { e.aim -= dt; sp *= e.hexc ? 0 : 0.15; if (e.hexc && e.aim > e.aimM * HEX.bolt.lock) e.ba = Math.atan2(p.y - 4 - (e.y - 5 * e.sc), p.x - e.x); if (e.aim <= 0) enemyShoot(e); }   // 1.9.6 hex casters stand still + lock aim
      else if (e.shootT <= 0 && d < keep + 70 && onScreen(e, 4)) { e.aim = e.aimM = e.hexc ? HEX.bolt.cAim : T.aim; e.ba = Math.atan2(p.y - 4 - (e.y - 5 * e.sc), p.x - e.x); e.shootT = rnd(T.cd[0], T.cd[1]) + (e.hexc ? HEX.bolt.cExtra : 0); }
      if (e.mini) { e.sumT -= dt; if (e.sumT <= 0) { e.sumT = 9; for (let i = 0; i < 3; i++) R.rise.push({ x: e.x + rnd(-30, 30), y: e.y + rnd(-20, 20), t: 1.1, m: 1.1, type: 'skel' }); } }
    } else if (e.act === 'slam') {   // Frost Troll: chase, then a 1s ground-slam telegraph (growing ring) -> damage + chill inside
      const T = ETYPES[e.type]; e.slamT -= dt;
      if (e.slam > 0) { e.slam -= dt; sp = 0; if (e.slam <= 0) { const rr = T.slamR; R.FX.push({ k: 'ring', x: e.x, y: e.y, r: rr, t: 0.35, m: 0.35, c: PAL[11] }); burst(e.x, e.y, PAL[12], 30, 80); addShake(5); sfx('nova');
        const dd = Math.hypot((p.x - e.x) / rr, (p.y - e.y) / (rr * 0.6)); if (dd < 1 && p.inv <= 0) { hurt(e.dmg * 0.9); p.slowT = Math.max(p.slowT, 2); } } }
      else if (e.slamT <= 0 && d < 70) { e.slam = 1.0; e.slamT = rnd(3.5, 5); sfx('wind'); }
    } else if (e.act === 'builder' || e.act === 'support') {   // 1.1.0 Cinder Mason / Rime Oracle: hang back like casters, then cast
      const T = ETYPES[e.type], keep = T.keep;
      if (d < keep - 25) { ux = -ux; uy = -uy; sp *= 0.6; } else if (d < keep + 20) { const sd = Math.sin(e.ph + R.t * 0.5) > 0 ? 1 : -1, nx = -uy * sd, ny = ux * sd; ux = nx; uy = ny; sp *= 0.5; }
      if (e.act === 'builder') { if (e.cast > 0) { sp = 0; e.cast -= dt; if (e.cast <= 0) raiseWall(e); }
        else { e.bt -= dt; if (e.bt <= 0) { e.bt = 1; if (pd < WALL.range && onScreen(e) && R.walls.length + R.wallQ.length < WALL.max && wallsNear(p.x, p.y) < WALL.near) { e.cast = WALL.cast; e.bt = rnd(WALL.cd[0], WALL.cd[1]); } } } }
      else { if (e.pul > 0) { sp = 0; e.pul -= dt; if (e.pul <= 0) oraclePulse(e); }
        else { e.pulT -= dt; if (e.pulT <= 0) { e.pulT = rnd(ORACLE.cd[0], ORACLE.cd[1]); if (R.E.some(o => o !== e && !o.inst && !o.boss && o.hp > 0 && Math.hypot(o.x - e.x, o.y - e.y) < T.pulseR)) e.pul = ORACLE.cast; } } }
    } else if (e.act === 'bomber') {   // 1.1.0 Blast Tick
      const T = ETYPES[e.type];
      if (e.bm > 0) { sp = 0; e.bm -= dt; if (e.bm <= 0) { tickBoom(e); continue; } }
      else if (pd < T.boomR * 0.85 && onScreen(e)) { e.bm = T.arm * (e.elite ? 1.15 : 1); e.bmM = e.bm; sfx('wind'); }
    } else if (e.act === 'blinker') {   // 1.1.0 Wraith: marks a spot next to you (0.75s), fades, re-appears there
      const T = ETYPES[e.type];
      if (e.bk > 0) { sp = 0; e.bk -= dt; if (e.bk <= 0) { burst(e.x, e.y - 5, PAL[1], 10, 40); e.x = e.tx; e.y = e.ty; e.kx = e.ky = 0; e.hitCd = Math.max(e.hitCd, 0.4); burst(e.x, e.y - 5, PAL[1], 14, 50); sfx('zap'); e.bt = rnd(T.blink[0], T.blink[1]); } }
      else { e.bt -= dt; if (e.bt <= 0) { if (pd > 60 && onScreen(e, -30) && !RV) { const mv = Math.hypot(input.mx, input.my) > 0.2, a = mv ? Math.atan2(input.my, input.mx) + rnd(-0.5, 0.5) : Math.random() * TAU; e.tx = p.x + Math.cos(a) * 30; e.ty = p.y + Math.sin(a) * 22; e.bk = BLINK_T; sfx('wind'); } else e.bt = 1; } }
    }
    if (ACT110[e.act] && !e.warden && !e.raidBoss && !e.hexo) [sp, ux, uy] = ACT110[e.act](e, dt, d, ux, uy, pd, sp);   // 1.10.0 new roles
    e.x += ux * sp * dt; e.y += uy * sp * dt;
    // separation
    const gx = Math.floor(e.x / cell), gy = Math.floor(e.y / cell);
    for (let ox = -1; ox <= 1; ox++) for (let oy = -1; oy <= 1; oy++) { const a = grid.get(((gx + ox) * 73856093) ^ ((gy + oy) * 19349663)); if (!a) continue;
      for (const o of a) { if (o === e) continue; const sx = e.x - o.x, sy = e.y - o.y, sd = sx * sx + sy * sy, rr = e.r + o.r; if (sd < rr * rr && sd > 0.0001) { const q = Math.sqrt(sd), push = (rr - q) * 0.5 * (e.heavy ? 0 : o.boss || o.mini || o.inst || o.heavy ? 2 : e.boss || e.mini ? 0.1 : 1); e.x += sx / q * push; e.y += sy / q * push; } } }
    if (ON18) enemyWall18(e, dt, sp);   // 1.18.0 walls / ice block monsters too
    // contact damage
    if (RV && d < e.r + RV.r + 3 && e.hitCd <= 0) { e.hitCd = 0.8; escortHurt(RV, e.dmg * (e.st === 2 ? 1.2 : 1)); }
    if (!e.gob && !e.hexo && pd < e.r + 4 && e.hitCd <= 0 && p.inv <= 0) { e.hitCd = 0.7; hurt(e.dmg * (e.st === 2 ? 1.2 : e.role === 'ranged' || e.role === 'builder' || e.role === 'support' ? 0.6 : 1)); { const pz = ETYPES[e.type].poison; if (pz && !e.boss && e.role !== 'ranged') addPoison(pz, e.dmg, 'bite'); }   /* 1.10.0 */ const ch = ETYPES[e.type].chillHit; if (ch && !e.boss) p.slowT = Math.max(p.slowT, ch);
      if (S.thorns > 0 && e.hp > 0) hit(e, S.baseDmg * S.thorns, { proc: false, noCrit: true, col: PAL[13] }); }   // 1.1.0 Thorns
  }
  R.E = R.E.filter(e => e.hp > 0);
  // player projectiles
  for (const b of R.P) {
    if (b.wait > 0) { b.wait -= dt; b.x = p.x; b.y = p.y - 4; if (b.tgt && b.tgt.hp > 0) { const aa = Math.atan2(b.tgt.y - 4 * b.tgt.sc - b.y, b.tgt.x - b.x), sp = Math.hypot(b.vx, b.vy); b.vx = Math.cos(aa) * sp; b.vy = Math.sin(aa) * sp; } if (b.wait <= 0) sfx('shoot'); continue; }   // 1.1.0 crossbow burst
    if (b.k === 'bolt' && b.tgt && b.tgt.hp > 0) { const a = Math.atan2(b.tgt.y - b.y, b.tgt.x - b.x), sp = Math.hypot(b.vx, b.vy); const ca = Math.atan2(b.vy, b.vx); let da = Math.atan2(Math.sin(a - ca), Math.cos(a - ca)); const na = ca + clamp(da, -6 * dt, 6 * dt); b.vx = Math.cos(na) * sp; b.vy = Math.sin(na) * sp; }
    if (b.k === 'chak') chakStep(b, dt);   // 1.10.0 returning chakram
    b.x += b.vx * dt; b.y += b.vy * dt; b.life -= dt;
    if (ON18 && b.life > 0 && proj18(b, true)) { if (b.k === 'chak') { if (!b.ret) { b.ret = true; b.hit = new Set(); } b.x -= b.vx * dt; b.y -= b.vy * dt; } else b.life = 0; }   // 1.18.0 solids stop shots
    if (b.k === 'bolt' && Math.random() < 0.6) R.PT.push({ x: b.x, y: b.y, vx: rnd(-8, 8), vy: rnd(-8, 8), t: 0.2, m: 0.2, c: Math.random() < 0.5 ? PAL[3] : PAL[4], s: 1 });
    for (const e of R.E) {
      if (e.hp <= 0 || b.hit.has(e.id) || b.life <= 0) continue; if ((e.x - b.x) ** 2 + (e.y - 4 * e.sc - b.y) ** 2 > (e.r + b.r + 2) ** 2) continue;
      b.hit.add(e.id); const l = Math.hypot(b.vx, b.vy) || 1;
      hit(e, b.dmg, { kx: b.vx / l, ky: b.vy / l, kb: b.k === 'arrow' ? 25 : 35, src: b.k, sec: b.sec, sx: b.x - b.vx / l * 8, sy: b.y - b.vy / l * 8 });   // 1.10.0: src (darts) + where it came from (phalanx shield)
      if (b.k === 'bolt') { R.FX.push({ k: 'ring', x: b.x, y: b.y, r: b.splash, t: 0.18, m: 0.18, c: PAL[3] }); burst(b.x, b.y, PAL[4], 6, 40, 0.25);
        for (const o of R.E) if (o !== e && o.hp > 0 && Math.hypot(o.x - b.x, o.y - b.y) < b.splash + o.r) hit(o, b.dmg * 0.5, { proc: false, kx: (o.x - b.x) / b.splash, ky: (o.y - b.y) / b.splash, kb: 30 });
        b.life = 0; }
      else if (--b.pierce < 0) b.life = 0;
      if (b.k !== 'boneP') projSplit(b, e);   // 1.13.2 fork / ricochet
    }
  }
  R.P = R.P.filter(b => b.life > 0);
  trailStep(dt);   // 1.13.2 slow-orb trails
  for (const b of R.EP) { b.x += b.vx * dt; b.y += b.vy * dt; b.life -= dt; if (ON18 && b.life > 0 && proj18(b, false)) b.life = 0; if ((!ON18 || b.life > 0) && p.inv <= 0 && Math.hypot(b.x - p.x, b.y - (p.y - 4)) < (b.k === 'hex' ? HEX.bolt.hit : b.r + 4)) { b.life = 0; if (R.S.uq.mirror && Math.random() < 0.25) { mirrorShot(b); continue; } if (b.k === 'hex') hexBoltHit(b); hurt(b.dmg * (1 - (R.S.warded || 0))); if (b.k === 'venom') addPoison(1, b.dmg / 0.8, R.raid ? 'raid' : 'spit');   /* 1.10.0 Warded + venom globs */ if (b.k === 'ice') p.slowT = Math.max(p.slowT, 1.5); } }   // 1.9.6 status bolts
  R.EP = R.EP.filter(b => b.life > 0);
  // pickups
  for (const g of R.G) { const dx = p.x - g.x, dy = p.y - 3 - g.y, d = Math.hypot(dx, dy); if (d < S.pickup) g.mag = true; if (g.mag) { const sp = 160; g.x += dx / d * sp * dt; g.y += dy / d * sp * dt; if (d < 5) { g.v = -g.v; gainXP(-g.v); R.gemN = (R.gemN || 0) + 1; if (S.gemCd) p.cd1 = Math.max(0, p.cd1 - S.gemCd); if (S.siphon && canHeal()) p.hp = Math.min(S.maxHp, p.hp + S.siphon); sfx('gem'); } } }   // 1.1.0 Siphon
  R.G = R.G.filter(g => g.v > 0);
  for (const c of R.C) { const dx = p.x - c.x, dy = p.y - 3 - c.y, d = Math.hypot(dx, dy); if (d < S.pickup * 1.2) c.mag = true; if (c.mag) { c.x += dx / d * 170 * dt; c.y += dy / d * 170 * dt; if (d < 5) { if (c.r) { resAdd(c.r, c.v); addText(c.x, c.y - 8, `+${c.v} ${RES.t[c.r].n}`, RES.t[c.r].c); } else addGold(c.v); c.v = 0; sfx('coin'); } } }
  R.C = R.C.filter(c => c.v > 0);
  for (const h of R.H) { h.t -= dt; if (Math.hypot(p.x - h.x, p.y - h.y) < 10 && canHeal()) { h.t = 0; const hh = Math.round(25 * (1 + 4 * S.gasp)); p.hp = Math.min(S.maxHp, p.hp + hh); addText(p.x, p.y - 12, '+' + hh, PAL[5]); burst(p.x, p.y, PAL[2], 10, 30); sfx('gem'); } }
  R.H = R.H.filter(h => h.t > 0);
  for (const it of R.I) { it.t += dt; const d2 = (it.x - p.x) ** 2 + (it.y - p.y) ** 2;
    if (d2 < 13 * 13 && it.t > 0.25 && !it.hold && !it.left) { if (R.bag.length < bagMax()) collect(it); else if (!it.full) { it.full = true; addText(p.x, p.y - 22, 'BAG FULL', '#b13e53', true); } }
    else if (d2 > 30 * 30) it.full = it.hold = false; }
  R.I = R.I.filter(it => !it.gone);
  if (hexOn('noregen') && p.hp > hp0 && R.revives === rv0) p.hp = hp0;
  updateFx(dt);
  R.saveT += dt; if (R.saveT > 5) { R.saveT = 0; persist(); }
}
function hurt(d) {
  if (R.adAsk === 'revive') return;   // 1.9.0: frozen while the revive offer is open (1.14.1: a reward pick pauses the loop instead)
  const p = R.p, S = R.S; d *= 1 - (1 - (R.drPierce || 0)) * Math.min(0.75, S.dr + (R.buffs.aegis > 0 ? RUN9.aegis : 0) + (R.ev && R.ev.k === 'escort' && R.ev.v === 'mage' && R.ev.ward ? EV8.mage.shield : 0) + (p.ward > 0 ? 0.4 : 0) + (p.aura > 0 ? S.heat : 0) + (S.iron && p.hp < S.maxHp * 0.5 ? S.iron : 0) + (S.bast && p.stillT >= 0.6 ? 0.15 : 0));   // 1.1.0 Bastion (inside the 75% cap)
  if (S.spike && p.ward > 0) { const e = nearest(p.x, p.y, 26); if (e) { const dx = e.x - p.x, dy = e.y - p.y, dd = Math.hypot(dx, dy) || 1; hit(e, S.baseDmg * 2, { kx: dx / dd, ky: dy / dd, kb: 120, col: PAL[12] }); } }   // 0.7.0 Knight Spiked Ward
  if (R.raid && R.raid.rm) d *= R.raid.rm.dmg;   // 1.9.5 rematch tier: every hit in the raid (mechanics, boss touch, shots, adds)
  if (S.glass) d *= 1 + S.glass;   // 1.13.2 Glass Sun
  if (S.uq.thornh && !(p.thT > R.t)) { p.thT = R.t + 1; shardRing(8, 1); R.thornN = (R.thornN || 0) + 1; }   // 1.13.2 Thornheart
  d *= hexFragMul();   // 1.9.4 FRAGILE (after damage reduction); 1.12.0 x(1 + 0.35 per stack)
  if (p.artWeak > 0) d *= 1.35;   // 1.16.0 artillery WEAK ground
  p.hp -= d; p.hurt = 0.25; p.inv = Math.max(p.inv, 0.12); addShake(3); sfx('hurt'); addText(p.x, p.y - 12, Math.round(d), '#b13e53');
  if (p.hp <= 0 && R.lives > 0) { R.lives--; R.revives++; if (R.poison) R.poison.n = 0;   /* 1.10.0 */ p.hp = R.S.maxHp * reviveHp(); p.inv = 2.5; R.flash = 0.3; addShake(8); sfx('revive');
    R.FX.push({ k: 'ring', x: p.x, y: p.y, r: 80, t: 0.5, m: 0.5, c: PAL[4] }); burst(p.x, p.y, PAL[4], 40, 80); for (const b of R.EP) b.life = 0;
    for (const e of R.E) { const dx = e.x - p.x, dy = e.y - p.y, dd = Math.hypot(dx, dy) || 1; if (dd < 80 && !e.boss && !e.heavy) { e.kx += dx / dd * 160; e.ky += dy / dd * 160; e.frozen = Math.max(e.frozen, 1); } }
    R.banner = { s: `HEARTH REVIVE! ${R.lives} LI${R.lives === 1 ? 'FE' : 'VES'} LEFT`, t: 2.4, c: '#ffcd75' }; return; }
  if (p.hp <= 0 && reviveOffer()) return;   // 1.9.0: once per run, after Hearth lives: ad revive (Premium: free, instant)
  if (p.hp <= 0) fallDown();
}
function fallDown() { const p = R.p; p.hp = 0; R.over = true; R.overT = 0; burst(p.x, p.y, PAL[2], 40, 70, 0.8); burst(p.x, p.y, PAL[12], 20, 50, 0.6); addShake(10); R.banner = { s: 'YOU FELL', t: 3, c: '#b13e53' }; }
function updateFx(dt) {
  for (const q of R.PT) { q.x += q.vx * dt; q.y += q.vy * dt; q.vx *= 0.9; q.vy *= 0.9; q.t -= dt; }
  R.PT = R.PT.filter(q => q.t > 0);
  for (const f of R.FX) f.t -= dt; R.FX = R.FX.filter(f => f.t > 0);
  for (const t of R.TX) { t.y -= 18 * dt; t.t -= dt; } R.TX = R.TX.filter(t => t.t > 0);
}

/* ---------------- render ---------------- */
const mkTiles = G => [0, 1, 2, 3].map(v => { const c = document.createElement('canvas'); c.width = c.height = 16; const x = c.getContext('2d'); x.fillStyle = G[0]; x.fillRect(0, 0, 16, 16);
  let s = v * 977 + 13; const r = () => (s = (s * 16807) % 2147483647) / 2147483647;
  for (let i = 0; i < 14; i++) { x.fillStyle = r() < 0.5 ? G[1] : G[2]; x.fillRect(Math.floor(r() * 16), Math.floor(r() * 16), r() < 0.3 ? 2 : 1, 1); }
  if (v === 3) { x.fillStyle = G[3]; x.fillRect(3, 5, 6, 3); x.fillRect(4, 4, 4, 5); } return c; });
const TILES = Object.fromEntries(Object.keys(MAPS).map(m => [m, mkTiles(MAPS[m].g)]));
const hash = (x, y) => { let h = (x * 374761393 + y * 668265263) | 0; h = (h ^ (h >>> 13)) * 1274126177 | 0; return ((h ^ (h >>> 16)) >>> 0) / 4294967296; };
/* 1.17.1 screen shake: cap amplitude and do not re-trigger while a shake is already playing, so late-wave axe/kill spam does not feel like lag. Visual only. Settings toggle defaults ON. */
const SHAKE = { cap: 5, busy: 0.35, decay: 20 };
const shakeOn = () => save.shake !== false;
function setShake(on) { save.shake = !!on; if (!on && R) R.shake = 0; persist(); renderSettings(); return shakeOn(); }
function addShake(n) { if (!R || !shakeOn()) return; n = Math.min(+n || 0, SHAKE.cap); if (n <= 0 || R.shake > SHAKE.busy) return; R.shake = Math.max(R.shake, n); }
function render(now) {
  ctx.fillStyle = '#0b0b14'; ctx.fillRect(0, 0, VW, VH);
  if (!R) return;
  const p = R.p; const amp = (shakeOn() && R.shake) ? Math.min(R.shake, SHAKE.cap) : 0, sx = amp ? rnd(-amp, amp) : 0, sy = amp ? rnd(-amp, amp) : 0;
  R.camX = R.raid ? -p.x * 0.25 : 0; R.camY = R.raid ? -p.y * 0.25 - 16 : 0;   // 1.4.0 raid: camera leans to the arena centre and sits lower so the boss isn't under the HUD
  const cx = Math.round(p.x + R.camX - VW / 2 + sx), cy = Math.round(p.y + R.camY - VH / 2 + sy);
  const X = x => Math.round(x - cx), Y = y => Math.round(y - cy);
  // ground
  const tx0 = Math.floor(cx / 16), ty0 = Math.floor(cy / 16), tiles = R.raid ? raidTiles(R.raid.D) : TILES[R.map] || TILES.ash, cr = R.map === 'crypt', fz = R.map === 'frost';
  for (let ty = ty0; ty <= ty0 + VH / 16 + 1; ty++) for (let tx = tx0; tx <= tx0 + VW / 16 + 1; tx++) {
    const h = hash(tx, ty); ctx.drawImage(tiles[h < 0.05 ? 3 : Math.floor(h * 97) % 3], tx * 16 - cx, ty * 16 - cy);
    const h2 = hash(tx + 999, ty - 77);
    if (h2 < 0.10) { const d = cr ? (h2 < 0.04 ? 'skull' : h2 < 0.07 ? 'stone' : 'bone') : fz ? (h2 < 0.035 ? 'crystal' : h2 < 0.075 ? 'drift' : h2 < 0.09 ? 'stone' : 'bone') : h2 < 0.05 ? 'tuft' : h2 < 0.075 ? 'stone' : h2 < 0.088 ? 'ash' : 'skull'; ctx.drawImage(IMG[d].n[0], tx * 16 - cx + Math.floor(h2 * 900) % 12, ty * 16 - cy + Math.floor(h2 * 3100) % 12); }
  }
  if (R.raid) drawRaidArena(X, Y, now);   // 1.4.0 sealed arena
  // 0.5.0 map hazards (ember vents / ice sheets) + crypt grave risers
  if (R.map !== 'crypt' && !R.raid) for (let gy = Math.floor(cy / HZ) - 1; gy <= Math.floor((cy + VH) / HZ); gy++) for (let gx = Math.floor(cx / HZ) - 1; gx <= Math.floor((cx + VW) / HZ); gx++) {
    const H = hazardCell(R.map, gx, gy); if (!H) continue; const hx = X(H.x), hy = Y(H.y), ry = H.r * 0.6;
    if (H.k === 'ice') { ctx.fillStyle = PAL[11]; ctx.globalAlpha = 0.22; ctx.beginPath(); ctx.ellipse(hx, hy, H.r, ry, 0, 0, TAU); ctx.fill(); ctx.globalAlpha = 0.45; ctx.strokeStyle = PAL[12]; ctx.lineWidth = 1; ctx.stroke();
      ctx.globalAlpha = 0.8; ctx.fillStyle = PAL[12]; ctx.fillRect(hx - 6, hy - 2, 5, 1); ctx.fillRect(hx + 3, hy + 2, 4, 1); if (Math.floor(now / 300 + gx * 7 + gy) % 6 === 0) ctx.fillRect(hx + Math.round((hash(gx, gy) - 0.5) * H.r), hy - 1, 1, 1); ctx.globalAlpha = 1; }
    else drawVent(H, hx, hy, ventPhase(H), now, gx, gy);   // 1.6.0 pixel vent: stone lip, glowing cracks, dithered heat, flame tongues (same 3s / 1s / 1s cycle)
  }
  if (ON18) draw18Terrain(X, Y, now, cx, cy);   // 1.18.0 roads / walls / ice / fire pits
  drawHexZones(X, Y, now);   // 1.9.4
  drawGround110(X, Y, now);   // 1.10.0 blightcap radius / swell / spores, hurler shadows
  for (const q of R.rise) { const k = 1 - q.t / q.m, rx = X(q.x), ry2 = Y(q.y); ctx.fillStyle = '#2a1e1e'; ctx.fillRect(rx - 6, ry2 - 2, 12, 4); ctx.fillStyle = PAL[13]; ctx.fillRect(rx - 3, ry2 - 7, 6, 5); ctx.fillStyle = PAL[15]; ctx.fillRect(rx - 2, ry2 - 6, 1, 1);
    ctx.fillStyle = PAL[2]; ctx.globalAlpha = 0.4 + 0.4 * Math.sin(now / 60); ctx.fillRect(rx - 5 + Math.round(k * 2), ry2 - 1, 3, 1); ctx.fillRect(rx + 1, ry2, 4, 1); ctx.globalAlpha = 1;
    if (k > 0.5) { ctx.fillStyle = PAL[12]; ctx.fillRect(rx - 4, ry2 - 1 - Math.round((k - 0.5) * 8), 1, 2); ctx.fillRect(rx + 3, ry2 - 1 - Math.round((k - 0.5) * 6), 1, 2); } }
  // 0.5.0 telegraphs on the ground: charger dash lines, ranged aim lines, troll slam rings
  for (const e of R.E) { const T = ETYPES[e.type], ex = X(e.x), ey = Y(e.y);
    if (e.warden) { drawWardenTele(e, ex, ey, now); continue; }
    if (e.hexo) { drawHexTele(e, ex, ey, now); continue; }   // 1.9.4   // 0.9.0
    if (e.act === 'charger' && e.st === 1) { const L = T.dash * T.dashT, lock = e.stT <= T.wind * 0.35; ctx.fillStyle = lock ? PAL[2] : PAL[3]; ctx.globalAlpha = lock ? 0.9 : 0.55;
      for (let i = 6; i < L; i += 4) ctx.fillRect(Math.round(ex + e.dx * i) - (e.mini ? 1 : 0), Math.round(ey + e.dy * i) - (e.mini ? 1 : 0), e.mini ? 3 : 2, e.mini ? 3 : 2);
      ctx.fillRect(Math.round(ex + e.dx * L) - 2, Math.round(ey + e.dy * L) - 2, 5, 5); ctx.globalAlpha = 1; }
    else if (e.act === 'ranged' && e.aim > 0 && e.hexc) { const oy = Y(e.y - 5 * e.sc), k = clamp(1 - e.aim / e.aimM, 0, 1); { const nf = HEX.bolt.cFan(R.wave); for (let i = 0; i < nf; i++) drawAimLine(ex, oy, e.ba + (i - (nf - 1) / 2) * HEX.bolt.fan, 150, HEX.st[e.hexc].c, k, e.aim <= e.aimM * HEX.bolt.lock, now); } }   // 1.9.6 hex caster: status-colour aim line
    else if (e.act === 'ranged' && e.aim > 0) { const oy = Y(e.y - 5 * e.sc), tx = X(p.x), ty = Y(p.y - 4), L = Math.hypot(tx - ex, ty - oy) || 1, k = clamp(1 - e.aim / T.aim, 0, 1); ctx.fillStyle = SHOTC[T.shot]; ctx.globalAlpha = 0.4 + 0.5 * k;
      for (let i = 8; i < L - 4; i += 5) ctx.fillRect(Math.round(ex + (tx - ex) * i / L), Math.round(oy + (ty - oy) * i / L), 1, 1); ctx.globalAlpha = 1; }
    else if (e.act === 'slam' && e.slam > 0) { const k = clamp(1 - e.slam, 0, 1), rr = T.slamR; ctx.fillStyle = PAL[2]; ctx.globalAlpha = 0.12 + 0.18 * k; ctx.beginPath(); ctx.ellipse(ex, ey, rr * k, rr * 0.6 * k, 0, 0, TAU); ctx.fill();
      ctx.globalAlpha = 0.7; ctx.strokeStyle = PAL[2]; ctx.lineWidth = 1; ctx.beginPath(); ctx.ellipse(ex, ey, rr, rr * 0.6, 0, 0, TAU); ctx.stroke(); ctx.globalAlpha = 1; } }
  drawGround11(X, Y, now);   // 1.1.0
  if (R.raid) drawRaidGround(X, Y, now);   // 1.4.0 telegraphs
  // event: regen well
  if (R.ev && R.ev.k === 'well') { const ev = R.ev, wx = X(ev.x), wy = Y(ev.y);
    ctx.strokeStyle = ev.inside ? PAL[5] : PAL[11]; ctx.globalAlpha = 0.35 + 0.2 * Math.sin(now / 160); ctx.lineWidth = 1; ctx.beginPath(); ctx.ellipse(wx, wy, ev.r, ev.r * 0.6, 0, 0, TAU); ctx.stroke(); ctx.globalAlpha = 1;
    ctx.fillStyle = '#0b0b14'; ctx.fillRect(wx - 9, wy - 6, 18, 10); ctx.fillStyle = PAL[14]; ctx.fillRect(wx - 8, wy - 5, 16, 8); ctx.fillStyle = PAL[13]; ctx.fillRect(wx - 8, wy - 5, 16, 2);
    ctx.fillStyle = PAL[9]; ctx.fillRect(wx - 6, wy - 3, 12, 3); ctx.fillStyle = PAL[11]; ctx.fillRect(wx - 5 + Math.floor(now / 200) % 8, wy - 3, 2, 1);
    const k = ev.prog / ev.need; ctx.fillStyle = '#0b0b14'; ctx.fillRect(wx - 11, wy - 12, 22, 3); ctx.fillStyle = PAL[5]; ctx.fillRect(wx - 10, wy - 11, Math.ceil(20 * k), 1); }
  drawGround8(X, Y, now); if (ON18) draw18Ground(X, Y, now);   // 0.8.0 gate / escort ring + route / raider cracks / catapult impact zones
  for (const c of R.C) { if (c.r) { drawResChip(X(c.x), Y(c.y), c.r, now); continue; } ctx.drawImage(IMG.coin.n[0], X(c.x) - 2, Y(c.y) - 3 + (Math.floor(now / 150 + c.x) % 4 === 0 ? -1 : 0)); }
  // items
  for (const it of R.I) {
    const bob = it.left ? 0 : Math.round(Math.sin(now / 250 + it.bob) * 1.5), col = RCOL[it.w.rarity];
    if (it.left) ctx.globalAlpha = 0.5; else { ctx.fillStyle = col; ctx.globalAlpha = 0.25 + 0.15 * Math.sin(now / 150 + it.bob); ctx.fillRect(X(it.x) - 1, Y(it.y) - 40, 3, 36); ctx.globalAlpha = it.left ? 0.5 : 1; } // loot beam (none on items you left)
    drawLoot(it.w, X(it.x), Y(it.y), bob, col, now, it.left);   // 1.6.0 rarity rim + chunky icon (was a flat 12px box)
    ctx.globalAlpha = 1;
  }
  for (const h of R.H) drawGroundHeart(h, X, Y, now);   // 1.9.1: 2x heart + pink pedestal + bob; soft pulse in the last 5 s (was a hard blink)
  for (const g of R.G) { const c = g.v >= 20 ? PAL[2] : g.v >= 5 ? PAL[5] : PAL[11]; const gx = X(g.x), gy = Y(g.y); ctx.fillStyle = '#0b0b14'; ctx.fillRect(gx - 2, gy - 1, 5, 3); ctx.fillRect(gx - 1, gy - 2, 3, 5); ctx.fillStyle = c; ctx.fillRect(gx - 1, gy, 3, 1); ctx.fillRect(gx, gy - 1, 1, 3); if (Math.floor(now / 200 + g.x) % 5 === 0) { ctx.fillStyle = '#f4f4f4'; ctx.fillRect(gx, gy - 1, 1, 1); } }
  for (const q of R.pend) { if (q.k === 'nova2' || q.k === 'flail' || q.k === 'axe') continue; const qx = X(q.x), qy = Y(q.y);
    if (q.k === 'crater') { drawCrater(q, qx, qy, now); continue; }   // 1.6.0
    if (q.k === 'meteor') { drawMeteorTele(q, qx, qy, now); continue; }   // 1.6.0
    if (q.k === 'icef' || q.k === 'crater') { const ice = q.k === 'icef'; ctx.fillStyle = ice ? PAL[11] : PAL[3]; ctx.globalAlpha = 0.18 * Math.min(1, q.t); ctx.beginPath(); ctx.ellipse(qx, qy, q.r, q.r * 0.7, 0, 0, TAU); ctx.fill(); ctx.globalAlpha = 0.5 * Math.min(1, q.t); ctx.strokeStyle = ice ? PAL[12] : PAL[4]; ctx.stroke(); ctx.globalAlpha = 1; continue; }   // 1.1.0
    if (q.k === 'echo') { ctx.drawImage(IMG['hero_' + R.hero].w[0], qx - 5, qy - 12); continue; } if (q.k === 'calt') { ctx.fillStyle = PAL[13]; ctx.globalAlpha = Math.min(1, q.t); for (let i = 0; i < 9; i++) ctx.fillRect(Math.round(qx + Math.cos(i * 2.4) * q.r * 0.8 * hash(i, 9)), Math.round(qy + Math.sin(i * 2.4) * q.r * 0.5 * hash(i, 8)), 2, 1); ctx.globalAlpha = 1; continue; } ctx.strokeStyle = q.k === 'meteor' ? PAL[3] : PAL[13]; ctx.globalAlpha = 0.4 + 0.3 * Math.sin(now / 60); ctx.lineWidth = 1;
    ctx.beginPath(); ctx.ellipse(qx, qy, q.r * (q.k === 'meteor' ? 1 - 0.5 * q.t / q.m : 1), q.r * 0.6 * (q.k === 'meteor' ? 1 - 0.5 * q.t / q.m : 1), 0, 0, TAU); ctx.stroke(); ctx.globalAlpha = 1;
    if (q.k === 'meteor') { const h = q.t / q.m * 90; ctx.fillStyle = PAL[3]; ctx.fillRect(qx + h * 0.4 - 3, qy - h - 3, 6, 6); ctx.fillStyle = PAL[4]; ctx.fillRect(qx + h * 0.4 - 1, qy - h - 1, 2, 2); } }
  if (p.aura > 0) drawAura(X(p.x), Y(p.y), 50 * R.S.novaR * (1 + 0.08 * hrank('p_walk')), 35 * R.S.novaR * (1 + 0.08 * hrank('p_walk')), now);   // 1.6.0 Inferno: pixel ring of flame (same radius)
  if (R.buffs.slow > 0) { ctx.strokeStyle = PAL[11]; ctx.globalAlpha = 0.18 + 0.08 * Math.sin(now / 200); ctx.lineWidth = 1; ctx.beginPath(); ctx.ellipse(X(p.x), Y(p.y), 60, 40, 0, 0, TAU); ctx.stroke(); ctx.globalAlpha = 1; }
  // actors (y-sorted)
  const list = R.E.slice(); list.push(p); if (R.ev && R.ev.k === 'escort') list.push(R.ev); list.sort((a, b) => a.y - b.y);
  for (const e of list) {
    if (e.inst) { drawInst(e, X, Y, now); continue; } if (e === R.ev) { drawEscort(e, X, Y, now); continue; }
    if (e === p) { drawHero(X, Y, now); drawHexHero(X(p.x), Y(p.y), now); drawPoisonHero(X(p.x), Y(p.y), now); if ((p.slowT > 0 || R.onIce) && !R.over) { ctx.fillStyle = PAL[11]; for (let i = 0; i < 3; i++) ctx.fillRect(X(p.x) - 5 + i * 4 + (Math.floor(now / 150) + i) % 2, Y(p.y) - 1 - ((Math.floor(now / 120) + i) % 3), 1, 1); } continue; }
    if (e.hexo) { drawHexOrb(e, X(e.x), Y(e.y), now); continue; }   // 1.9.4
    const img0 = IMG[e.spr], fr = Math.floor(e.anim) % 2, wind = (e.st === 1 || e.wdS === 1 || e.slam > 0 || e.cast > 0 || e.pul > 0 || e.bm > 0 || e.rcast > 0) && Math.floor(now / 80) % 3 === 0; const v = e.flash > 0 || wind ? 'w' : e.frozen > 0 ? 'i' : e.warden ? (e.enr && Math.floor(now / 150) % 2 ? 'e' : 'g') : e.boss ? 'b' : e.elite ? 'e' : e.pal || 'n';
    const im = img0[v][fr], w = im.width * e.sc, h = im.height * e.sc, ex = X(e.x), ey = Y(e.y);
    ctx.drawImage(shadowC, ex - 6 * e.sc / 1.5, ey - 1, 12 * e.sc / 1.5, 4);
    if (e.mini) { ctx.strokeStyle = PAL[3]; ctx.lineWidth = 1; ctx.globalAlpha = 0.55 + 0.35 * Math.sin(now / 100 + e.id); ctx.beginPath(); ctx.ellipse(ex, ey, w / 2 + 4, Math.max(4, w / 4), 0, 0, TAU); ctx.stroke(); ctx.beginPath(); ctx.ellipse(ex, ey, w / 2 + 1, Math.max(3, w / 5), 0, 0, TAU); ctx.stroke(); ctx.globalAlpha = 1; }
    if (e.elite || e.boss || e.gob) { ctx.strokeStyle = e.boss ? PAL[2] : PAL[4]; ctx.lineWidth = 1; ctx.globalAlpha = 0.5 + 0.35 * Math.sin(now / 120 + e.id); ctx.beginPath(); ctx.ellipse(ex, ey, w / 2 + 2, Math.max(3, w / 5), 0, 0, TAU); ctx.stroke();
      if (Math.floor(now / 90 + e.id) % 4 === 0) { ctx.fillStyle = e.boss ? PAL[2] : PAL[4]; ctx.fillRect(Math.round(ex + Math.sin(now / 70 + e.id) * w / 2), Math.round(ey - h * 0.5 + Math.cos(now / 90) * h / 2), 1, 1); } ctx.globalAlpha = 1; }
    const flip = e.type !== 'bat' && (e.st === 1 || e.st === 2 ? e.dx < 0 : p.x < e.x);
    if (e.bk > 0) ctx.globalAlpha = clamp(e.bk / BLINK_T, 0.15, 1);   // 1.1.0 wraith fades out before the blink
    else if (e.raidBoss && R.raid && R.raid.sub) ctx.globalAlpha = 0.3;   // 1.4.0 submerged behind its pylons
    if (flip) { ctx.save(); ctx.translate(ex, 0); ctx.scale(-1, 1); ctx.drawImage(im, Math.round(-w / 2), ey - h, w, h); ctx.restore(); } else ctx.drawImage(im, Math.round(ex - w / 2), ey - h, w, h);
    ctx.globalAlpha = 1; if (e.shT > 0) { ctx.fillStyle = PAL[11]; ctx.fillRect(ex - 4, ey - h - 4, 9, 1); ctx.fillRect(ex - 5, ey - h - 3, 1, 2); ctx.fillRect(ex + 5, ey - h - 3, 1, 2); }   // 1.1.0 oracle shield
    if (e.chill > 0 && !e.frozen) { ctx.fillStyle = PAL[11]; ctx.fillRect(ex - 1, ey - h - 3, 2, 2); }
    drawFoe110(e, ex, ey, w, h, flip, now);   // 1.10.0 shield / rock / venom pips
    if (e.wdS) drawShell(e, ex, ey, w, h, now);   // 1.12.0
    if (e.raidBoss || e.rsh) drawRaidTag(e, ex, ey, w, h, now);   // 1.4.0
    if (e.raid) { const my = ey - h - 6 + (Math.floor(now / 200) % 2); ctx.fillStyle = PAL[2]; ctx.fillRect(ex - 2, my, 5, 1); ctx.fillRect(ex - 1, my + 1, 3, 1); ctx.fillRect(ex, my + 2, 1, 1); }   // 0.8.0 raider mark
    if (e.st === 1) dangerMark(ex, ey - h - 8, PAL[2], 1, now);
    if (e.hexc && HEX.on) { const bob = Math.floor(now / 300) % 2; drawHexIcon(e.hexc, ex - 2, ey - h - 9 - bob); ctx.fillStyle = HEX.st[e.hexc].c; for (let i = 0; i < 3; i++) { const a = now / 280 + i * TAU / 3; ctx.fillRect(Math.round(ex + Math.cos(a) * 6), Math.round(ey - h / 2 + Math.sin(a) * 4), 1, 1); } }   // 1.9.6 hex caster mark
    if (e.aim > 0) { const k = clamp(1 - e.aim / (e.aimM || ETYPES[e.type].aim), 0, 1), gs = 1 + Math.round(k * (e.hexc ? 3 : 2)); ctx.fillStyle = e.hexc ? HEX.st[e.hexc].c : SHOTC[ETYPES[e.type].shot]; ctx.fillRect(ex + (flip ? -w / 2 : w / 2) - gs, Math.round(ey - 5 * e.sc) - gs, gs * 2, gs * 2); }
    if (e.warden) { const bw = 40; ctx.strokeStyle = PAL[2]; ctx.lineWidth = 1; ctx.globalAlpha = 0.6 + 0.3 * Math.sin(now / 80); ctx.beginPath(); ctx.ellipse(ex, ey, w / 2 + 6, Math.max(5, w / 4), 0, 0, TAU); ctx.stroke(); ctx.globalAlpha = 1;
      ctx.fillStyle = '#0b0b14'; ctx.fillRect(ex - bw / 2 - 1, ey - h - 6, bw + 2, 3); ctx.fillStyle = PAL[2]; ctx.fillRect(ex - bw / 2, ey - h - 5, Math.ceil(bw * Math.max(0, e.hp) / e.maxHp), 1); text(ctx, wardenName(e.warden), ex, ey - h - 13, PAL[2], 1, 'c'); }
    else if (e.mini) { const bw = 26; ctx.fillStyle = '#0b0b14'; ctx.fillRect(ex - bw / 2 - 1, ey - h - 6, bw + 2, 3); ctx.fillStyle = PAL[3]; ctx.fillRect(ex - bw / 2, ey - h - 5, Math.ceil(bw * e.hp / e.maxHp), 1); text(ctx, ETYPES[e.type].name, ex, ey - h - 13, PAL[3], 1, 'c'); }
    else if (!e.warden && (e.elite || e.boss || e.gob || e.role === 'tank' || e.rsh) && e.hp < e.maxHp) { const bw = e.boss ? 30 : 14; ctx.fillStyle = '#0b0b14'; ctx.fillRect(ex - bw / 2 - 1, ey - h - 6, bw + 2, 3); ctx.fillStyle = e.boss ? PAL[1] : PAL[2]; ctx.fillRect(ex - bw / 2, ey - h - 5, Math.ceil(bw * e.hp / e.maxHp), 1); }
  }
  // projectiles
  for (const b of R.P) { const bx = X(b.x), by = Y(b.y);
    if (b.wait > 0) continue;
    if (b.k === 'cbolt') { const l = Math.hypot(b.vx, b.vy), ux = b.vx / l, uy = b.vy / l; ctx.fillStyle = '#0b0b14'; for (let i = 0; i < 6; i++) ctx.fillRect(Math.round(bx - ux * i) - 1, Math.round(by - uy * i) - 1, 3, 3); ctx.fillStyle = PAL[13]; for (let i = 1; i < 6; i++) ctx.fillRect(Math.round(bx - ux * i), Math.round(by - uy * i), 2, 1); ctx.fillStyle = PAL[2]; ctx.fillRect(bx, by, 2, 2); continue; }
    if (b.k === 'boneP') { ctx.drawImage(IMG.bone.n[0], bx - 2, by - 2); continue; }
    if (b.k === 'chak' || b.k === 'dart') { drawP110(b, bx, by, now); continue; }   // 1.10.0
    if (b.k === 'bolt') { const r = Math.max(1, Math.round(b.r)); ctx.fillStyle = PAL[2]; ctx.fillRect(bx - r - 1, by - r, r * 2 + 2, r * 2); ctx.fillStyle = PAL[3]; ctx.fillRect(bx - r, by - r, r * 2, r * 2); ctx.fillStyle = PAL[4]; ctx.fillRect(bx - 1, by - 1, 2, 2); }
    else { const l = Math.hypot(b.vx, b.vy), ux = b.vx / l, uy = b.vy / l; ctx.fillStyle = PAL[13]; for (let i = 0; i < 6; i++) ctx.fillRect(Math.round(bx - ux * i), Math.round(by - uy * i), 1, 1); ctx.fillStyle = PAL[12]; ctx.fillRect(bx, by, 1 + (b.r > 2.4), 1 + (b.r > 2.4)); ctx.fillStyle = PAL[10]; ctx.fillRect(Math.round(bx - ux * 6), Math.round(by - uy * 6), 1, 1); } }
  for (const b of R.EP) { const bx = X(b.x), by = Y(b.y);   // 0.5.0: projectile look per source
    if (b.k === 'bigball') drawBigBall(b, bx, by, now);   // 1.13.2
    else if (b.k === 'hex') drawHexBolt(b, bx, by, now);   // 1.9.6
    else if (b.k === 'venom') drawVenomGlob(b, bx, by, now);   // 1.10.0
    else if (b.k === 'ember') { ctx.fillStyle = PAL[2]; ctx.fillRect(Math.round(bx - b.vx / 40), Math.round(by - b.vy / 40), 2, 2); ctx.fillStyle = PAL[3]; ctx.fillRect(bx - 1, by - 1, 3, 3); ctx.fillStyle = PAL[4]; ctx.fillRect(bx, by, 1, 1); }
    else if (b.k === 'ice') { ctx.fillStyle = PAL[11]; ctx.fillRect(bx - 2, by, 5, 1); ctx.fillRect(bx, by - 2, 1, 5); ctx.fillStyle = PAL[12]; ctx.fillRect(bx, by, 1, 1); }
    else if (b.k === 'soul') { ctx.fillStyle = PAL[6]; ctx.fillRect(bx - 2, by - 2, 5, 5); ctx.fillStyle = PAL[5]; ctx.fillRect(bx - 1, by - 1, 3, 3); ctx.fillStyle = PAL[12]; ctx.fillRect(bx, by, 1, 1); }
    else ctx.drawImage(IMG.bone.n[0], bx - 2, by - 2); }
  drawAir110(X, Y, now);   // 1.10.0 rocks in flight + swelling blightcap corpses
  drawShells(X, Y, now);
  // fx
  for (const f of R.FX) {
    if (f.k === 'zapl') { drawZapFx(f, X, Y); continue; }   // 1.14.1 obelisk chain
    if (f.k === 'ring') { const k = 1 - f.t / f.m; ctx.strokeStyle = f.c; ctx.globalAlpha = 1 - k; ctx.lineWidth = 2; ctx.beginPath(); ctx.arc(X(f.x), Y(f.y), Math.max(1, f.r * (0.3 + 0.7 * k)), 0, TAU); ctx.stroke(); ctx.globalAlpha = 1; }
    else if (f.k === 'arc') { const k = 1 - f.t / f.m, hh = f.h || 1.4; ctx.fillStyle = PAL[12]; const a0 = f.a - hh, a1 = f.a - hh + 2 * hh * Math.min(1, k * 1.6);   // 1.7.0: the swept arc is the real cone
      for (let a = a0; a < a1; a += 0.09) { for (let rr = f.r * 0.55; rr < f.r; rr += 3) { ctx.globalAlpha = (1 - k) * (rr / f.r); ctx.fillRect(Math.round(X(f.x) + Math.cos(a) * rr), Math.round(Y(f.y) + Math.sin(a) * rr), 2, 2); } } ctx.globalAlpha = 1; }
    else if (f.k === 'drop') { const k = f.t / f.m; ctx.fillStyle = PAL[13]; ctx.fillRect(X(f.x), Y(f.y) - 4 - Math.round(16 * k), 1, 5); ctx.fillStyle = PAL[12]; ctx.fillRect(X(f.x), Y(f.y) - Math.round(16 * k), 1, 1); }
    else if (f.k === 'thrust') { const k = 1 - f.t / f.m, L = f.r * Math.min(1, 0.4 + k * 1.5), cx = Math.cos(f.a), cy = Math.sin(f.a); ctx.globalAlpha = 1 - k * 0.7;   // 1.1.0 spear
      for (let i = 4; i < L; i += 2) { ctx.fillStyle = i > L - 8 ? PAL[12] : PAL[13]; ctx.fillRect(Math.round(X(f.x) + cx * i), Math.round(Y(f.y) + cy * i), i > L - 8 ? 2 : 1, i > L - 8 ? 2 : 1); } ctx.globalAlpha = 1; }
    else if (f.k === 'ball') { const k = 1 - f.t / f.m, a = f.a + k * TAU * 1.1, bx = Math.round(X(f.x) + Math.cos(a) * f.r), by = Math.round(Y(f.y) + Math.sin(a) * f.r * 0.7);   // 1.1.0 flail
      ctx.strokeStyle = PAL[13]; ctx.globalAlpha = 0.35 * (1 - k); ctx.lineWidth = 2; ctx.beginPath(); ctx.ellipse(X(f.x), Y(f.y), f.r, f.r * 0.7, 0, a - 1.6, a); ctx.stroke(); ctx.globalAlpha = 1; ctx.lineWidth = 1;
      ctx.fillStyle = PAL[14]; for (let i = 1; i < 6; i++) ctx.fillRect(Math.round(X(f.x) + Math.cos(a) * f.r * i / 6), Math.round(Y(f.y) + Math.sin(a) * f.r * 0.7 * i / 6), 1, 1);
      ctx.fillStyle = '#0b0b14'; ctx.fillRect(bx - 3, by - 3, 7, 7); ctx.fillStyle = PAL[13]; ctx.fillRect(bx - 2, by - 2, 5, 5); ctx.fillStyle = PAL[12]; ctx.fillRect(bx - 1, by - 2, 2, 1); }
    else if (f.k === 'fire') fireBlast(f, X, Y, now);   // 1.6.0
    else if (f.k === 'zap') { ctx.strokeStyle = PAL[11]; ctx.lineWidth = 1; ctx.beginPath(); ctx.moveTo(X(f.x1), Y(f.y1) - 4); for (let i = 1; i < 4; i++) { const t = i / 4; ctx.lineTo(X(f.x1 + (f.x2 - f.x1) * t) + rnd(-3, 3), Y(f.y1 + (f.y2 - f.y1) * t) - 4 + rnd(-3, 3)); } ctx.lineTo(X(f.x2), Y(f.y2) - 4); ctx.stroke(); }
  }
  for (const q of R.PT) { ctx.globalAlpha = Math.min(1, q.t / q.m * 1.5); ctx.fillStyle = q.c; ctx.fillRect(X(q.x), Y(q.y), q.s, q.s); } ctx.globalAlpha = 1;
  if (ON18) draw18Top(X, Y, now);   // 1.18.0 beacons + linger heat
  for (const t of R.TX) { ctx.globalAlpha = Math.min(1, t.t * 3); text(ctx, t.s, X(t.x), Y(t.y), t.c, t.big ? 2 : 1, 'c'); } ctx.globalAlpha = 1;
  if (fz) { ctx.fillStyle = '#f4f4f4'; for (let i = 0; i < 46; i++) { const sp = 8 + hash(i, 5) * 14, fx = ((hash(i, 3) * 997 + now / 1000 * sp * 0.6 - cx * 0.3) % VW + VW) % VW, fy = ((hash(i, 4) * 991 + now / 1000 * sp - cy * 0.3) % VH + VH) % VH;
    ctx.globalAlpha = 0.35 + 0.4 * hash(i, 6); ctx.fillRect(Math.round(fx + Math.sin(now / 700 + i) * 2), Math.round(fy), hash(i, 8) < 0.2 ? 2 : 1, 1); } ctx.globalAlpha = 1; }   // 0.4.0 Frost Spire snowfall
  // screen fx
  if (R.flash > 0) { ctx.fillStyle = '#f4f4f4'; ctx.globalAlpha = R.flash * 2; ctx.fillRect(0, 0, VW, VH); ctx.globalAlpha = 1; }
  if (p.hurt > 0 || p.hp < R.S.maxHp * 0.25) { const a = p.hurt > 0 ? p.hurt * 1.6 : 0.15 + 0.1 * Math.sin(now / 150); ctx.fillStyle = '#b13e53'; ctx.globalAlpha = a; ctx.fillRect(0, 0, VW, 3); ctx.fillRect(0, VH - 3, VW, 3); ctx.fillRect(0, 0, 3, VH); ctx.fillRect(VW - 3, 0, 3, VH); ctx.globalAlpha = a * 0.4; ctx.fillRect(0, 0, VW, 7); ctx.fillRect(0, VH - 7, VW, 7); ctx.fillRect(0, 0, 7, VH); ctx.fillRect(VW - 7, 0, 7, VH); ctx.globalAlpha = 1; }
  drawHUD(now);
}
/* ---- 1.6.0 art: pixel-crisp fire circles, loot icons, caravan. Draw-only: every hit shape, radius and timing is the gameplay's own. ---- */
const ELL = new Map();
function ellHW(rx, ry) {   // half-width per scanline of a pixel ellipse, rows -ry..ry (cached)
  rx = Math.max(0, Math.round(rx)); ry = Math.max(0, Math.round(ry)); const key = rx * 4096 + ry; let a = ELL.get(key); if (a) return a;
  a = new Int16Array(2 * ry + 1); for (let i = 0; i <= 2 * ry; i++) { const dy = i - ry, t = 1 - (dy / (ry + 0.5)) ** 2; a[i] = Math.floor((rx + 0.5) * Math.sqrt(Math.max(0, t))); }
  if (ELL.size > 4000) ELL.clear(); ELL.set(key, a); return a; }
function pxEll(cx, cy, rx, ry, style) { if (rx < 0.5 || ry < 0.5) return; cx = Math.round(cx); cy = Math.round(cy); const a = ellHW(rx, ry), h = (a.length - 1) >> 1; ctx.fillStyle = style; for (let i = 0; i < a.length; i++) ctx.fillRect(cx - a[i], cy + i - h, 2 * a[i] + 1, 1); }
function pxRing(cx, cy, rx, ry, th, style) {   // crisp th-px ellipse outline, no anti-aliased smear, no diagonal gaps
  if (rx < 0.5 || ry < 0.5) return; cx = Math.round(cx); cy = Math.round(cy); const o = ellHW(rx, ry), h = (o.length - 1) >> 1, irx = Math.round(rx) - th, iry = Math.round(ry) - th, inn = irx >= 0 && iry >= 0 ? ellHW(irx, iry) : null, ih = inn ? (inn.length - 1) >> 1 : -1; ctx.fillStyle = style;
  for (let i = 0; i < o.length; i++) { const dy = i - h, w = o[i], nb = Math.min(i > 0 ? o[i - 1] : -1, i < o.length - 1 ? o[i + 1] : -1), iw = inn && Math.abs(dy) <= ih ? inn[dy + ih] : -1, s = Math.min(w, Math.max(0, Math.min(iw + 1, nb + 1)));
    if (s <= 0) ctx.fillRect(cx - w, cy + dy, 2 * w + 1, 1); else { ctx.fillRect(cx - w, cy + dy, w - s + 1, 1); ctx.fillRect(cx + s, cy + dy, w - s + 1, 1); } } }
const DITH = new Map(), BAYER = [0, 8, 2, 10, 12, 4, 14, 6, 3, 11, 1, 9, 15, 7, 13, 5];
function dith(col, lv) {   // 4x4 ordered-dither fill pattern (lv 0..1): pixel-art translucency instead of blurry alpha
  lv = clamp(Math.round(lv * 16), 0, 16); const key = col + lv; let p = DITH.get(key); if (p) return p; const c = document.createElement('canvas'); c.width = c.height = 4; const x = c.getContext('2d'); x.fillStyle = col;
  for (let i = 0; i < 16; i++) if (BAYER[i] < lv) x.fillRect(i & 3, i >> 2, 1, 1); p = ctx.createPattern(c, 'repeat'); DITH.set(key, p); return p; }
function flameT(x, y, h, sw) {   // pixel flame tongue standing on (x, y): red rim, orange body, yellow core; sw = tip sway -1 / 0 / 1
  h = Math.round(h); if (h < 2) return; x = Math.round(x); y = Math.round(y); const a = Math.max(1, Math.ceil(h * 0.45)), b = Math.max(a + 1, Math.ceil(h * 0.8));
  ctx.fillStyle = PAL[3]; ctx.fillRect(x - 1, y - a, 3, a); ctx.fillRect(x - (sw > 0 ? 0 : 1), y - b, 2, b - a); ctx.fillStyle = PAL[2]; if (h > b) ctx.fillRect(x + sw, y - h, 1, h - b); ctx.fillRect(x - 1, y - 1, 1, 1); ctx.fillRect(x + 1, y - 1, 1, 1);
  ctx.fillStyle = PAL[4]; ctx.fillRect(x, y - a, 1, a); if (h > 5) { ctx.fillStyle = '#f4f4f4'; ctx.fillRect(x, y - 2, 1, 1); } }
/* 1.13.2 DANGER VFX (Matt: the "!" markers read like debug UI). dangerMark = a pixel hazard sigil: dark-backed diamond with a hot core that
   beats faster as it nears, a soft glow halo and an expanding shock ripple. No text glyph. Size sc 1 / 2. */
function dangerMark(x, y, c, sc = 1, now = performance.now()) { x = Math.round(x); y = Math.round(y); const ph = (now % 600) / 600, beat = 0.5 + 0.5 * Math.sin(now / 95), s = (3 + Math.round(beat)) * sc;
  pxRing(x, y, (4 + ph * 9) * sc, (3 + ph * 6) * sc, 1, dith(c, 0.7 * (1 - ph))); ctx.fillStyle = dith(c, 0.3 + 0.25 * beat); diamond(x, y, s + 2 * sc);
  ctx.fillStyle = '#0b0b14'; diamond(x, y, s + 1); ctx.fillStyle = c; diamond(x, y, s); ctx.fillStyle = beat > 0.6 ? '#f4f4f4' : PAL[4]; diamond(x, y, Math.max(1, s - 2 * sc)); }
function diamond(x, y, s) { for (let i = -s; i <= s; i++) { const w = s - Math.abs(i); ctx.fillRect(x - w, y + i, w * 2 + 1, 1); } }
function fireTele(cx, cy, r, ryK, k, now, sd) {   // danger disc on the real hit ellipse; the core fills toward the blast, the rim catches fire
  const ry = r * ryK, end = k > 0.8, bl = Math.floor(now / 90) % 2; k = clamp(k, 0, 1);
  pxEll(cx, cy, r, ry, dith('#1a0a10', 0.5)); pxEll(cx, cy, r, ry, dith(PAL[2], 0.19));
  if (k > 0.04) { pxEll(cx, cy, r * k, ry * k, dith(end && bl ? PAL[3] : PAL[2], end ? 0.69 : 0.5)); pxRing(cx, cy, r * k, ry * k, 1, end ? PAL[4] : PAL[3]); }
  pxRing(cx, cy, r, ry, 2, PAL[2]); if (r > 8) pxRing(cx, cy, r - 2, ry - 2, 1, end && bl ? PAL[3] : '#3a0e1c');
  { const hb = (now % (end ? 260 : 520)) / (end ? 260 : 520); pxRing(cx, cy, r * (1 - hb * 0.85), ry * (1 - hb * 0.85), 1, dith(end ? PAL[4] : PAL[3], 1 - hb * 0.75)); }   // 1.13.2 heartbeat: a ripple closes in from the rim (faster in the last 20%); nothing drawn outside the real hit ellipse
  const n = Math.max(6, Math.round(r / 5)); ctx.fillStyle = PAL[4]; for (let i = 0; i < n; i++) { const a = now / 700 + i * TAU / n; ctx.fillRect(Math.round(cx + Math.cos(a) * (r - 1)) - 1, Math.round(cy + Math.sin(a) * (ry - 1)) - 1, 2, 2); }   // marching rune sparks
  if (k > 0.3) { const m = Math.max(5, Math.round(r / 4)); for (let i = 0; i < m; i++) { const a = (i + hash(i, sd) * 0.6) * TAU / m, fl = Math.floor(now / 110 + i * 3), hh = hash(fl, i + sd);
    flameT(cx + Math.cos(a) * r, cy + Math.sin(a) * ry + 1, (2 + 6 * (k - 0.3)) * (0.6 + 0.6 * hash(i, fl)), hh < 0.33 ? -1 : hh > 0.66 ? 1 : 0); } } }
function fireBlast(f, X, Y, now) {   // detonation on the same ellipse the damage used: white-hot flash, shock ring cooling yellow > orange > red, flame columns, smoke
  const q = 1 - f.t / f.m, cx = X(f.x), cy = Y(f.y), r = f.r, ryK = f.ry || 0.7, ry = r * ryK, sd = f.sd || 0;
  if (q < 0.18) { pxEll(cx, cy, r, ry, dith(PAL[4], 0.31 + (0.18 - q) * 2)); pxEll(cx, cy, r * 0.5, ry * 0.5, dith(PAL[4], 0.75)); if (q < 0.08) pxEll(cx, cy, r * 0.28, ry * 0.28, '#f4f4f4'); }
  const rr = r * (0.55 + 0.45 * Math.min(1, q * 2.2)); if (q < 0.9) pxRing(cx, cy, rr, rr * ryK, q < 0.35 ? 3 : q < 0.65 ? 2 : 1, q < 0.3 ? PAL[4] : q < 0.6 ? PAL[3] : PAL[2]);
  if (q < 0.8) { const n = Math.max(5, Math.round(r / 3.5)); for (let i = 0; i < n; i++) { const a = hash(i, sd) * TAU, d = Math.sqrt(hash(sd, i + 7)) * 0.85, fl = Math.floor(now / 90 + i);
    flameT(cx + Math.cos(a) * r * d, cy + Math.sin(a) * ry * d, (1 - q / 0.8) * (5 + 9 * hash(i + 3, sd)), hash(fl, i) < 0.5 ? 0 : (i % 2 ? 1 : -1)); } }
  if (q > 0.4) { ctx.fillStyle = '#566c86'; ctx.globalAlpha = Math.min(1, (1 - q) * 1.6); for (let i = 0; i < 7; i++) { const a = hash(i + 20, sd) * TAU, d = hash(sd, i + 30) * 0.7; ctx.fillRect(Math.round(cx + Math.cos(a) * r * d), Math.round(cy + Math.sin(a) * ry * d - (q - 0.4) * 26 - 4), 2 + (i % 2), 2); } ctx.globalAlpha = 1; } }
function drawScorch(f, X, Y, now) { const cx = X(f.x), cy = Y(f.y), a = Math.min(1, f.t / (f.m * 0.6)); ctx.globalAlpha = a; pxEll(cx, cy, f.r, f.r * (f.ry || 0.7), dith('#0b0b14', 0.56));
  for (let i = 0; i < 6; i++) if (Math.floor(now / 140 + i * 5) % 3) { ctx.fillStyle = i % 2 ? PAL[3] : PAL[2]; ctx.fillRect(Math.round(cx + (hash(i, f.m * 10) - 0.5) * f.r * 1.4), Math.round(cy + (hash(i + 4, f.m * 10) - 0.5) * f.r * 0.9), 1, 1); } ctx.globalAlpha = 1; }
function drawVent(H, hx, hy, ph, now, gx, gy) {   // ember vent: idle 0-3 (cracks breathe) > warn 3-4 (heat dithers in, rim blinks, sparks) > erupt 4-5 (fire)
  const r = H.r, ry = Math.round(r * 0.6), hot = ph >= 4, warn = ph >= 3 && !hot, w = warn ? ph - 3 : 0, bl = Math.floor(now / 90) % 2, sd = gx * 31 + gy * 17;
  pxEll(hx, hy, r + 1, ry + 1, '#333c57'); pxEll(hx, hy + 1, r, ry, '#14100f'); ctx.fillStyle = '#566c86'; ctx.fillRect(hx - 6, hy - ry - 1, 4, 1); ctx.fillRect(hx + 3, hy - ry - 1, 3, 1); ctx.fillRect(hx - r, hy - 1, 1, 2);
  if (warn) pxEll(hx, hy + 1, r - 1, ry - 1, dith(PAL[2], 0.25 + 0.45 * w));
  if (hot) { pxEll(hx, hy + 1, r, ry, dith(PAL[2], 0.75)); pxEll(hx, hy + 1, r * 0.6, ry * 0.6, dith(PAL[3], 0.62)); }
  ctx.fillStyle = hot ? PAL[4] : warn ? (bl ? PAL[4] : PAL[3]) : (Math.floor(now / 700 + gx) % 3 ? PAL[2] : '#7a2a3a');
  ctx.fillRect(hx - 8, hy, 6, 1); ctx.fillRect(hx - 3, hy - 2, 1, 3); ctx.fillRect(hx + 1, hy + 1, 7, 1); ctx.fillRect(hx + 4, hy - 3, 1, 3);
  if (warn || hot) pxRing(hx, hy, r + 1, ry + 1, 1, hot ? PAL[4] : (bl ? PAL[3] : PAL[2]));
  if (warn) { ctx.fillStyle = PAL[4]; for (let i = 0; i < 3 + Math.floor(w * 4); i++) { const t = (now / 14 + i * 37) % 16; ctx.fillRect(hx + Math.round((hash(i, sd) - 0.5) * r * 1.4), hy - Math.round(t), 1, 1); } }
  if (hot) { const fl = Math.floor(now / 80); for (let i = 0; i < 7; i++) { const fx = hx + Math.round((hash(i, sd) - 0.5) * r * 1.5), fy = hy + 1 + Math.round((hash(i + 3, sd) - 0.3) * ry * 0.8); flameT(fx, fy, 5 + 8 * hash(i + 9, fl), hash(fl, i) < 0.33 ? -1 : hash(fl, i) > 0.66 ? 1 : 0); }
    ctx.fillStyle = PAL[4]; for (let i = 0; i < 4; i++) { const t = (now / 9 + i * 53) % 24; ctx.fillRect(hx + Math.round((hash(i + 40, sd) - 0.5) * r), hy - 6 - Math.round(t), 1, 1); } } }
function drawCrater(q, qx, qy, now) {   // Pyro Crater: molten pool (same r, 0.7 ellipse as its tick)
  const a = Math.min(1, q.t), ry = q.r * 0.7; ctx.globalAlpha = a; pxEll(qx, qy, q.r, ry, dith(PAL[2], 0.44)); pxEll(qx, qy, q.r * 0.6, ry * 0.6, dith(PAL[3], 0.5)); pxRing(qx, qy, q.r, ry, 1, PAL[3]);
  ctx.fillStyle = PAL[4]; for (let i = 0; i < 5; i++) if (Math.floor(now / 160 + i * 3) % 3 === 0) ctx.fillRect(Math.round(qx + (hash(i, q.m) - 0.5) * q.r * 1.2), Math.round(qy + (hash(i + 5, q.m) - 0.5) * ry), 1, 1);
  const fl = Math.floor(now / 100); for (let i = 0; i < 4; i++) flameT(qx + (hash(i + 9, q.m) - 0.5) * q.r * 1.3, qy + (hash(i + 13, q.m) - 0.5) * ry, 3 + 3 * hash(i, fl), 0); ctx.globalAlpha = 1; }
function drawMeteorTele(q, qx, qy, now) {   // Meteor: closing target ring + falling rock with a fire trail (same 0.45s fall)
  const s = 1 - 0.5 * q.t / q.m, bl = Math.floor(now / 70) % 2; pxEll(qx, qy, q.r * s, q.r * 0.6 * s, dith(PAL[3], 0.19)); pxRing(qx, qy, q.r * s, q.r * 0.6 * s, 1, bl ? PAL[4] : PAL[3]);
  ctx.fillStyle = PAL[4]; for (const [dx, dy] of [[-1, 0], [1, 0], [0, -1], [0, 1]]) ctx.fillRect(Math.round(qx + dx * q.r * s) - (dx ? 0 : 1), Math.round(qy + dy * q.r * 0.6 * s) - (dy ? 0 : 1), dx ? 1 : 3, dy ? 1 : 3);
  const h = q.t / q.m * 90, mx = Math.round(qx + h * 0.4), my = Math.round(qy - h); for (let i = 1; i <= 4; i++) { ctx.fillStyle = i < 2 ? PAL[3] : PAL[2]; ctx.fillRect(mx + i * 2 - 2, my - i * 5 - 2, 5 - i, 5 - i); }
  ctx.fillStyle = '#0b0b14'; ctx.fillRect(mx - 4, my - 4, 8, 8); ctx.fillStyle = PAL[3]; ctx.fillRect(mx - 3, my - 3, 6, 6); ctx.fillStyle = PAL[4]; ctx.fillRect(mx - 2, my - 1, 3, 3); ctx.fillStyle = '#f4f4f4'; ctx.fillRect(mx - 1, my, 1, 1); }
function drawAura(cx, cy, rx, ry, now) {   // Inferno: dithered heat + a ring of flame tongues (same radius as the burn)
  pxEll(cx, cy, rx, ry, dith(PAL[3], 0.12)); pxRing(cx, cy, rx, ry, 1, Math.floor(now / 120) % 2 ? PAL[3] : PAL[2]);
  const m = Math.max(8, Math.round(rx / 4)), fl = Math.floor(now / 100); for (let i = 0; i < m; i++) { const a = i * TAU / m + now / 900; flameT(cx + Math.cos(a) * rx, cy + Math.sin(a) * ry + 1, 3 + 4 * hash(i, fl), hash(fl, i) < 0.5 ? 0 : (i % 2 ? 1 : -1)); } }
function drawLoot(w, ix, iy, bob, col, now, left) {   // ground drop: shadow, rarity rim around the icon silhouette, chunky icon
  const im = itemImg(w), ox = ix - 5, oy = iy - 13 + bob, rim = silh(im, col);
  ctx.drawImage(shadowC, ix - 6, iy - 2);
  for (const [dx, dy] of [[1, 0], [-1, 0], [0, 1], [0, -1]]) ctx.drawImage(rim, ox + dx, oy + dy);
  ctx.drawImage(im, ox, oy);
  if (!left && w.rarity >= 2) { const g = Math.floor(now / 90) % 24; if (g < 10) { ctx.fillStyle = '#f4f4f4'; ctx.fillRect(ox + g, oy + 9 - g, 1, 1); } } }   // Rare / Unique: a glint runs across the icon
function drawCaravan(ev, ex, ey, now) {   // covered wagon (spoked wheels turn with the distance rolled) + walking ox + driver; flips with the route
  const f = ev.tx < ev.sx ? -1 : 1, hurt = ev.hurtT > 0, wf = Math.floor(ev.wheel / 3) % 2, step = ev.moving ? Math.floor(now / 160) % 2 : 0, bump = ev.moving && Math.floor(now / 240) % 2 ? -1 : 0;
  const wag = IMG.caravan.n[wf], ox = IMG.cox.n[step], W0 = -24, oxX = 3, oxY = -11;
  const put = (im, x, y) => { const dx = f > 0 ? ex + x : ex - x - im.width; if (f > 0) ctx.drawImage(im, dx, ey + y); else { ctx.save(); ctx.translate(dx + im.width, 0); ctx.scale(-1, 1); ctx.drawImage(im, 0, ey + y); ctx.restore(); }
    if (hurt) { const s = silh(im, '#f4f4f4'); if (f > 0) ctx.drawImage(s, dx, ey + y); else { ctx.save(); ctx.translate(dx + im.width, 0); ctx.scale(-1, 1); ctx.drawImage(s, 0, ey + y); ctx.restore(); } } };
  pxEll(ex - 4 * f, ey, 24, 3, dith('#0b0b14', 0.5));
  put(ox, oxX, oxY); put(wag, W0, -20 + bump);
  ctx.fillStyle = '#3d2a1a'; ctx.fillRect(f > 0 ? ex + 1 : ex - 4, ey - 7 + bump, 4, 1);   // tongue to the yoke
  if (ev.moving && Math.floor(now / 200) % 3 === 0) { ctx.fillStyle = '#6e5a3e'; ctx.fillRect(ex - f * 22, ey - 1, 2, 1); ctx.fillRect(ex - f * 12, ey, 1, 1); }   // dust
  return ey - 30; }
/* ---- 1.1.0 art: walls, nuke circles, new-foe telegraphs ---- */
const WALLC = { ash: ['#566c86', '#333c57', PAL[3]], crypt: ['#94b0c2', '#566c86', PAL[12]], frost: ['#73eff7', '#41a6f6', PAL[12]] };
function drawGround11(X, Y, now) {
  const C = WALLC[R.map] || WALLC.ash;
  for (const q of R.wallQ) { const k = 1 - q.t / q.m, L = Math.hypot(q.x2 - q.x1, q.y2 - q.y1) || 1; ctx.fillStyle = Math.floor(now / 90) % 2 ? PAL[3] : PAL[2]; ctx.globalAlpha = 0.45 + 0.5 * k;
    for (let i = 0; i < L; i += 4) ctx.fillRect(Math.round(X(q.x1 + (q.x2 - q.x1) * i / L)) - 1, Math.round(Y(q.y1 + (q.y2 - q.y1) * i / L)) - 1, 3, 2);
    ctx.globalAlpha = 1; dangerMark(X((q.x1 + q.x2) / 2), Y((q.y1 + q.y2) / 2) - 9, PAL[3], 1, now); }
  for (const w of R.walls) { const L = Math.hypot(w.x2 - w.x1, w.y2 - w.y1) || 1, hgt = Math.round(9 * w.up), fade = w.t < 0.6 ? w.t / 0.6 : 1; ctx.globalAlpha = fade;
    for (let i = 0; i <= L; i += 4) { const bx = Math.round(X(w.x1 + (w.x2 - w.x1) * i / L)), by = Math.round(Y(w.y1 + (w.y2 - w.y1) * i / L)), j = (i / 4) | 0;
      ctx.fillStyle = '#0b0b14'; ctx.fillRect(bx - 3, by - hgt - 1, 6, hgt + 3); ctx.fillStyle = C[j % 3 === 1 ? 1 : 0]; ctx.fillRect(bx - 2, by - hgt, 4, hgt + 1); ctx.fillStyle = C[2]; if (j % 4 === 0) ctx.fillRect(bx - 1, by - hgt + 2, 1, 2); }
    ctx.globalAlpha = 1; }
  for (const f of R.FX) if (f.k === 'scorch') drawScorch(f, X, Y, now);   // 1.6.0 blast scorch (under everything)
  drawVolley(now, X, Y);   // 1.13.2
  for (const n of R.nukes) { const nx = X(n.x), ny = Y(n.y), k = 1 - n.t / n.m; fireTele(nx, ny, n.r, 0.7, k, now, (n.x * 7 + n.y * 3) & 63);   // 1.6.0 pixel fire circle (same r / 0.7 ellipse as the hit)
    dangerMark(nx, ny - 3, PAL[4], 2, now); }
  for (const e of R.E) { const ex = X(e.x), ey = Y(e.y);
    if (e.bm > 0) { const T = ETYPES[e.type], r = T.boomR * (e.elite ? 1.3 : 1), k = 1 - e.bm / (e.bmM || T.arm); fireTele(ex, ey, r, 0.7, k, now, e.id & 63); }   // 1.6.0
    else if (e.bk > 0) { const tx = X(e.tx), ty = Y(e.ty), k = e.bk / BLINK_T; ctx.strokeStyle = PAL[1]; ctx.globalAlpha = 0.9; ctx.beginPath(); ctx.ellipse(tx, ty, 4 + 10 * k, 3 + 6 * k, 0, 0, TAU); ctx.stroke();
      ctx.fillStyle = Math.floor(now / 80) % 2 ? PAL[1] : PAL[12]; for (let i = -3; i <= 3; i++) { ctx.fillRect(tx + i, ty + i - 2, 1, 1); ctx.fillRect(tx + i, ty - i - 2, 1, 1); } ctx.globalAlpha = 1; }
    else if (e.pul > 0) { const r = ETYPES[e.type].pulseR * (1 - e.pul / ORACLE.cast); ctx.strokeStyle = PAL[11]; ctx.globalAlpha = 0.6; ctx.beginPath(); ctx.ellipse(ex, ey, r, r * 0.7, 0, 0, TAU); ctx.stroke(); ctx.globalAlpha = 1; }
    else if (e.cast > 0 && Math.floor(now / 100) % 2) { ctx.fillStyle = PAL[3]; ctx.fillRect(ex - 1, ey - 22, 3, 3); } }
}
/* ---- 0.8.0 event art (procedural pixels; silhouettes read at phone size) ---- */
function drawWardenTele(e, ex, ey, now) {   // 0.9.0 Gear Check telegraphs: slam ring, dash line, bullet-ring glow
  if (e.ws === 1) { const k = clamp(1 - e.wt / (WD.slamT / (e.enr ? WD.enrRate : 1)), 0, 1), rr = WD.slamR; ctx.fillStyle = PAL[2]; ctx.globalAlpha = 0.15 + 0.25 * k; ctx.beginPath(); ctx.ellipse(ex, ey, rr * k, rr * 0.6 * k, 0, 0, TAU); ctx.fill();
    ctx.globalAlpha = 0.9; ctx.strokeStyle = PAL[2]; ctx.lineWidth = 1; ctx.beginPath(); ctx.ellipse(ex, ey, rr, rr * 0.6, 0, 0, TAU); ctx.stroke(); ctx.globalAlpha = 1; }
  else if (e.ws === 2) { const L = WD.dashSp * WD.dashT, lock = e.wt <= WD.dashWind * 0.35; ctx.fillStyle = lock ? PAL[2] : PAL[3]; ctx.globalAlpha = lock ? 0.95 : 0.6;
    for (let i = 10; i < L; i += 4) ctx.fillRect(Math.round(ex + e.dx * i) - 1, Math.round(ey + e.dy * i) - 1, 3, 3); ctx.fillRect(Math.round(ex + e.dx * L) - 3, Math.round(ey + e.dy * L) - 3, 7, 7); ctx.globalAlpha = 1; }
  else if (e.ws === 4) { ctx.strokeStyle = PAL[2]; ctx.globalAlpha = 0.5 + 0.4 * Math.sin(now / 40); ctx.lineWidth = 2; ctx.beginPath(); ctx.ellipse(ex, ey - 10, 30, 14, 0, 0, TAU); ctx.stroke(); ctx.globalAlpha = 1; }
}
function drawGround8(X, Y, now) {
  if (R.mk) drawMarket(R.mk, X, Y, now);   // 1.0.0
  const g = R.gate; if (g) { const gx = X(g.x), gy = Y(g.y);
    ctx.fillStyle = PAL[11]; ctx.globalAlpha = g.inside ? 0.3 : 0.12 + 0.06 * Math.sin(now / 200); ctx.beginPath(); ctx.ellipse(gx, gy, g.r, g.r * 0.7, 0, 0, TAU); ctx.fill();
    ctx.globalAlpha = 0.85; ctx.strokeStyle = g.sealed ? PAL[2] : g.inside ? PAL[5] : PAL[11]; ctx.lineWidth = 1; ctx.setLineDash([3, 3]); ctx.lineDashOffset = -now / 60; ctx.beginPath(); ctx.ellipse(gx, gy, g.r, g.r * 0.7, 0, 0, TAU); ctx.stroke(); ctx.setLineDash([]); ctx.globalAlpha = 1;
    ctx.fillStyle = '#333c57'; ctx.fillRect(gx - 14, gy - 26, 5, 26); ctx.fillRect(gx + 9, gy - 26, 5, 26); ctx.fillRect(gx - 16, gy - 31, 32, 6);
    ctx.fillStyle = PAL[14]; ctx.fillRect(gx - 13, gy - 25, 1, 24); ctx.fillRect(gx + 10, gy - 25, 1, 24); ctx.fillRect(gx - 15, gy - 30, 30, 1);
    for (let i = 0; i < 16; i++) { const a = now / 300 + i * 0.9, rr = 2 + (i % 5) * 1.5; ctx.fillStyle = i % 3 ? PAL[11] : PAL[12]; ctx.globalAlpha = 0.5 + 0.5 * Math.sin(now / 150 + i); ctx.fillRect(Math.round(gx + Math.cos(a) * rr), Math.round(gy - 13 + Math.sin(a) * rr * 1.6), 1 + (i % 2), 1 + (i % 2)); } ctx.globalAlpha = 1;
    ctx.fillStyle = '#0b0b14'; ctx.fillRect(gx - 13, gy - 37, 26, 3); ctx.fillStyle = PAL[11]; ctx.fillRect(gx - 12, gy - 36, Math.ceil(24 * g.prog / g.need), 1);
    text(ctx, g.sealed ? 'EXIT - SEALED' : 'EXIT - OPEN', gx, gy - 45, g.sealed ? PAL[2] : PAL[11], 1, 'c'); if (g.sealed) drawGateTrial(g, X, Y, now);   // 1.7.0
    const b = escapeBonus(), l1 = `+${b.g}G  +${b.x}XP`, l2 = `+${b.gift} GIFT`, bw = Math.max(l1.length, l2.length) * 4 + 6;   // 0.9.0 escape bonus, readable before you commit
    ctx.fillStyle = 'rgba(11,11,20,.8)'; ctx.fillRect(gx - bw / 2, gy - 66, bw, 19); ctx.strokeStyle = g.inside ? PAL[5] : '#ffcd75'; ctx.lineWidth = 1; ctx.strokeRect(gx - bw / 2 + 0.5, gy - 65.5, bw - 1, 18);
    text(ctx, l1, gx, gy - 64, '#ffcd75', 1, 'c'); text(ctx, l2, gx, gy - 56, RCOL[2], 1, 'c'); }
  drawSigil(X, Y, now);   // 1.14.0
  drawFe(X, Y, now);   // 1.14.1 field events
  const ev = R.ev; if (ev && ev.k === 'escort') { const ex = X(ev.x), ey = Y(ev.y), wr = ev.v === 'mage' ? EV8.mage.ward : EV8.caravan.near; if (ev.ms) drawTrialAura(ev, ex, ey, now); else if (ev.tier >= RPS.greedT) drawGreed(ex, ey, wr, now);
    ctx.strokeStyle = ev.ward ? PAL[10] : '#94b0c2'; ctx.globalAlpha = ev.ward ? 0.6 : 0.35 + 0.2 * Math.sin(now / 180); ctx.lineWidth = 1; ctx.setLineDash([2, 4]); ctx.lineDashOffset = 0; ctx.beginPath(); ctx.ellipse(ex, ey, wr, wr * 0.65, 0, 0, TAU); ctx.stroke(); ctx.setLineDash([]); ctx.globalAlpha = 1;
    if (ev.v === 'caravan') { const tx = X(ev.tx), ty = Y(ev.ty), L = Math.hypot(tx - ex, ty - ey) || 1; ctx.fillStyle = '#ffcd75'; ctx.globalAlpha = 0.55; for (let i = 14; i < L; i += 7) ctx.fillRect(Math.round(ex + (tx - ex) * i / L), Math.round(ey + (ty - ey) * i / L), 2, 1); ctx.globalAlpha = 1;
      ctx.fillStyle = WOOD2; ctx.fillRect(tx, ty - 20, 1, 20); ctx.fillStyle = PAL[10]; ctx.fillRect(tx + 1, ty - 20, 8, 5 + Math.floor(now / 200) % 2); ctx.fillStyle = '#ffcd75'; ctx.fillRect(tx + 4, ty - 19, 2, 2); text(ctx, 'CAMP', tx, ty - 28, '#ffcd75', 1, 'c'); }
    else for (let i = 0; i < 12; i++) { const a = now / 400 + i * TAU / 12; ctx.fillStyle = i % 2 ? PAL[5] : PAL[10]; ctx.fillRect(Math.round(ex + Math.cos(a) * 12), Math.round(ey + Math.sin(a) * 6), 2, 1); } }
  for (const q of R.rq) { const k = 1 - q.t / q.m; ctx.strokeStyle = PAL[2]; ctx.globalAlpha = 0.5 + 0.4 * Math.sin(now / 50); ctx.lineWidth = 1; ctx.beginPath(); ctx.ellipse(X(q.x), Y(q.y), 3 + 5 * k, 2 + 3 * k, 0, 0, TAU); ctx.stroke(); ctx.globalAlpha = 1; }
  for (const s of R.shells) { const sx = X(s.x), sy = Y(s.y), k = 1 - s.t / s.m; fireTele(sx, sy, s.r, 0.7, k, now, (s.x * 7 + s.y * 3) & 63);   // 1.6.0
    dangerMark(sx, sy - 3, PAL[4], 1, now); }
}
function drawShells(X, Y, now) {
  for (const s of R.shells) { const k = 1 - s.t / s.m, arc = (s.kind || 'arc') === 'arc', lift = arc ? Math.sin(k * Math.PI) * 110 : 0;
    const bx = X(s.sx + (s.x - s.sx) * k), by = Y(s.sy + (s.y - s.sy) * k - lift);
    if (!arc) { ctx.strokeStyle = s.fam === 'mage' ? PAL[11] : '#94b0c2'; ctx.globalAlpha = 0.35; ctx.beginPath(); ctx.moveTo(X(s.sx), Y(s.sy)); ctx.lineTo(bx, by); ctx.stroke(); ctx.globalAlpha = 1; }
    ctx.fillStyle = '#0b0b14'; ctx.fillRect(bx - 3, by - 3, 7, 7);
    ctx.fillStyle = s.fam === 'mage' ? '#5d275d' : s.fam === 'cannon' ? '#566c86' : '#566c86'; ctx.fillRect(bx - 2, by - 2, 5, 5);
    ctx.fillStyle = s.fam === 'mage' ? PAL[11] : PAL[3]; ctx.fillRect(bx - 1, by - 1, 2, 2); }
  if (R.groundFx) for (const g of R.groundFx) { const a = Math.min(1, g.t / Math.max(0.01, g.m)) * 0.35; ctx.globalAlpha = a; ctx.strokeStyle = g.k === 'slow' ? PAL[10] : g.k === 'noregen' ? PAL[11] : g.k === 'weak' ? PAL[4] : PAL[2];
    ctx.lineWidth = 1; ctx.beginPath(); ctx.ellipse(X(g.x), Y(g.y), g.r, g.r * 0.65, 0, 0, TAU); ctx.stroke(); ctx.globalAlpha = 1; }
}
function drawInst(e, X, Y, now) {
  const ex = X(e.x), ey = Y(e.y), fl = e.flash > 0, wind = e.wind && Math.floor(now / 90) % 2, col = e.inst === 'barracks' ? PAL[2] : PAL[3], F = c => fl ? '#f4f4f4' : c;
  ctx.drawImage(shadowC, ex - 18, ey - 2, 36, 7);
  ctx.strokeStyle = col; ctx.lineWidth = 1; ctx.globalAlpha = 0.45 + 0.35 * Math.sin(now / 130); ctx.beginPath(); ctx.ellipse(ex, ey, 22, 8, 0, 0, TAU); ctx.stroke(); ctx.globalAlpha = 1;
  let top;
  if (e.inst === 'barracks') {
    ctx.fillStyle = F(WOOD2); ctx.fillRect(ex - 15, ey - 16, 30, 16); ctx.fillStyle = F(WOOD); for (let i = 0; i < 6; i++) ctx.fillRect(ex - 14 + i * 6, ey - 15, 1, 14);
    ctx.fillStyle = F('#5d275d'); for (let i = 0; i < 6; i++) ctx.fillRect(ex - 17 + i * 2, ey - 19 - i, 34 - i * 4, 1); ctx.fillRect(ex - 17, ey - 19, 34, 3);
    ctx.fillStyle = wind ? PAL[3] : '#0b0b14'; ctx.fillRect(ex - 3, ey - 9, 6, 9); if (wind) { ctx.fillStyle = PAL[4]; ctx.fillRect(ex - 2, ey - 8, 4, 2); }
    ctx.fillStyle = '#0b0b14'; ctx.fillRect(ex - 11, ey - 12, 4, 3); ctx.fillRect(ex + 7, ey - 12, 4, 3); ctx.fillStyle = PAL[2]; ctx.fillRect(ex - 10, ey - 11, 2, 1); ctx.fillRect(ex + 8, ey - 11, 2, 1);
    ctx.fillStyle = WOOD2; ctx.fillRect(ex + 12, ey - 36, 1, 17); ctx.fillStyle = PAL[2]; ctx.fillRect(ex + 13, ey - 36, 8, 4 + Math.floor(now / 160) % 2); ctx.fillStyle = '#0b0b14'; ctx.fillRect(ex + 16, ey - 35, 2, 2);
    top = ey - 30;
  } else {
    const f = R.p.x < e.x ? -1 : 1, back = clamp(1 - e.it / 3, 0, 1), th = -1.2 - 1.7 * back + (wind ? 0.1 : 0), px = ex - 2 * f, py = ey - 14;
    ctx.fillStyle = '#0b0b14'; ctx.fillRect(ex - 16, ey - 9, 32, 6); ctx.fillStyle = F('#b07a3b'); ctx.fillRect(ex - 15, ey - 8, 30, 4); ctx.fillStyle = F(WOOD); ctx.fillRect(ex - 15, ey - 5, 30, 1);
    ctx.fillStyle = '#0b0b14'; ctx.fillRect(ex - 6, ey - 18, 12, 10); ctx.fillStyle = F(WOOD); ctx.fillRect(ex - 5, ey - 17, 2, 9); ctx.fillRect(ex + 3, ey - 17, 2, 9); ctx.fillRect(ex - 5, ey - 15, 10, 2);   // A-frame
    for (const wx of [-12, 6]) { ctx.fillStyle = '#0b0b14'; ctx.fillRect(ex + wx - 1, ey - 5, 8, 7); ctx.fillStyle = F('#94b0c2'); ctx.fillRect(ex + wx, ey - 4, 6, 5); ctx.fillStyle = '#333c57'; ctx.fillRect(ex + wx + 2, ey - 2, 2, 1); }
    ctx.fillStyle = '#0b0b14'; for (let i = 0; i < 19; i++) ctx.fillRect(Math.round(px + Math.cos(th) * i * f) - 1, Math.round(py + Math.sin(th) * i) - 1, 4, 4);
    ctx.fillStyle = F(wind ? PAL[3] : '#d09050'); for (let i = 0; i < 19; i++) ctx.fillRect(Math.round(px + Math.cos(th) * i * f), Math.round(py + Math.sin(th) * i), 2, 2);
    const bx = Math.round(px + Math.cos(th) * 19 * f), by = Math.round(py + Math.sin(th) * 19); ctx.fillStyle = '#0b0b14'; ctx.fillRect(bx - 3, by - 3, 7, 6); ctx.fillStyle = F(WOOD); ctx.fillRect(bx - 2, by - 2, 5, 4);
    if (back > 0.4) { ctx.fillStyle = '#566c86'; ctx.fillRect(bx - 2, by - 5, 5, 4); ctx.fillStyle = PAL[3]; ctx.fillRect(bx - 1, by - 4, 2, 1); }
    top = ey - 38;
  }
  drawOutpost(e, ex, ey, now, F, wind); const ot0 = outTier(e); if (e.inst === 'barracks' && ot0 >= 6) top = ey - 70; else if (e.inst === 'barracks' && ot0 >= 4) top = Math.min(top, ey - 50); else if (e.inst === 'catapult' && outFam(e) === 'mage') top = Math.min(top, ey - 46); else if (ot0 >= 3) top = Math.min(top, ey - 42);   // 1.16.0
  if (e.frozen > 0) { ctx.fillStyle = PAL[11]; ctx.globalAlpha = 0.35; ctx.fillRect(ex - 16, ey - 20, 32, 20); ctx.globalAlpha = 1; }
  const bw = 30; ctx.fillStyle = '#0b0b14'; ctx.fillRect(ex - bw / 2 - 1, top, bw + 2, 3); ctx.fillStyle = col; ctx.fillRect(ex - bw / 2, top + 1, Math.ceil(bw * Math.max(0, e.hp) / e.maxHp), 1);
  const ot = outTier(e); text(ctx, `${outName(e)} ${'!'.repeat(Math.min(5, ot))}`, ex, top - 8, ot >= 6 ? PAL[2] : col, 1, 'c');
  if (ot < outMaxTier(R.wave)) { const k = Math.min(1, (e.gT || 0) / OUT7.grow[ot]); ctx.fillStyle = '#0b0b14'; ctx.fillRect(ex - 16, top + 4, 32, 3); ctx.fillStyle = k > 0.75 && Math.floor(now / 120) % 2 ? PAL[4] : PAL[2]; ctx.fillRect(ex - 15, top + 5, Math.ceil(30 * k), 1); }
  if (e.inst === 'catapult' && outShellX(e) > 1.05 && verboseHud()) text(ctx, `DMG X${outShellX(e).toFixed(1)}`, ex, top - 16, PAL[4], 1, 'c');
}
function drawEscort(ev, X, Y, now) {
  const ex = X(ev.x), ey = Y(ev.y), F = c => ev.hurtT > 0 ? '#f4f4f4' : c; let top;
  if (ev.v === 'mage') ctx.drawImage(shadowC, ex - 9, ey - 1, 18, 5);
  if (ev.v === 'mage') { const hv = Math.round(Math.sin(now / 250)) - 1, k = Math.min(1, ev.prog / ev.need);
    ctx.fillStyle = PAL[11]; ctx.globalAlpha = 0.12 + 0.25 * k; ctx.fillRect(ex - 1 - Math.round(2 * k), ey - 70, 2 + Math.round(4 * k), 60); ctx.globalAlpha = 1;   // teleport beam grows with the cast
    ctx.fillStyle = F(PAL[9]); ctx.fillRect(ex - 4, ey - 9 + hv, 8, 9); ctx.fillRect(ex - 5, ey - 3 + hv, 10, 3); ctx.fillStyle = F(PAL[11]); ctx.fillRect(ex - 5, ey - 1 + hv, 10, 1); ctx.fillRect(ex - 1, ey - 8 + hv, 2, 6);
    ctx.fillStyle = F(PAL[8]); ctx.fillRect(ex - 3, ey - 14 + hv, 6, 5); ctx.fillRect(ex - 2, ey - 17 + hv, 4, 3); ctx.fillRect(ex - 1, ey - 19 + hv, 2, 2); ctx.fillStyle = F('#ffcd75'); ctx.fillRect(ex - 2, ey - 12 + hv, 4, 2);
    ctx.fillStyle = F(WOOD); ctx.fillRect(ex + 5, ey - 17 + hv, 1, 17); ctx.fillStyle = Math.floor(now / 150) % 2 ? PAL[11] : PAL[12]; ctx.fillRect(ex + 4, ey - 20 + hv, 3, 3);
    top = ey - 28; }
  else top = drawCaravan(ev, ex, ey, now);   // 1.6.0 covered wagon + ox + driver (was flat boxes)
  const bw = 24; ctx.fillStyle = '#0b0b14'; ctx.fillRect(ex - bw / 2 - 1, top, bw + 2, ev.v === 'mage' ? 5 : 3); ctx.fillStyle = ev.hp / ev.maxHp < 0.35 ? PAL[2] : PAL[5]; ctx.fillRect(ex - bw / 2, top + 1, Math.ceil(bw * Math.max(0, ev.hp) / ev.maxHp), 1);
  if (ev.v === 'mage') { ctx.fillStyle = PAL[11]; ctx.fillRect(ex - bw / 2, top + 3, Math.ceil(bw * Math.min(1, ev.prog / ev.need)), 1); }
  text(ctx, ev.ms ? `TRIAL D${ev.ms.d}` : ev.v === 'mage' ? 'MAGE' : 'CARAVAN', ex, top - 8, ev.ms ? MSN.col[ev.ms.d - 1] : PAL[10], 1, 'c');
  if (!ev.ward && Math.floor(now / 300) % 2) text(ctx, ev.v === 'caravan' ? 'COME CLOSER' : 'GUARD ME', ex, top - 16, '#f4f4f4', 1, 'c');
}
function drawMarket(m, X, Y, now) {   // 1.0.0 stall: gold ring, striped awning, merchant, goods, coin sign + timer bar
  const gx = Math.round(X(m.x)), gy = Math.round(Y(m.y)), fr = (x, y, w, h, c) => { ctx.fillStyle = c; ctx.fillRect(gx + x, gy + y, w, h); };
  ctx.fillStyle = '#ffcd75'; ctx.globalAlpha = m.inside ? 0.25 : 0.08 + 0.05 * Math.sin(now / 200); ctx.beginPath(); ctx.ellipse(gx, gy, m.r, m.r * 0.7, 0, 0, TAU); ctx.fill();
  ctx.globalAlpha = 0.85; ctx.strokeStyle = '#ffcd75'; ctx.lineWidth = 1; ctx.setLineDash([3, 3]); ctx.lineDashOffset = -now / 80; ctx.beginPath(); ctx.ellipse(gx, gy, m.r, m.r * 0.7, 0, 0, TAU); ctx.stroke(); ctx.setLineDash([]); ctx.globalAlpha = 1;
  ctx.drawImage(shadowC, gx - 16, gy - 2, 32, 6);
  fr(-13, -22, 2, 22, '#0b0b14'); fr(11, -22, 2, 22, '#0b0b14'); fr(-12, -21, 1, 21, WOOD); fr(12, -21, 1, 21, WOOD);
  fr(-16, -27, 32, 6, '#0b0b14'); for (let i = 0; i < 8; i++) fr(-15 + i * 4, -26, 4, 4, i % 2 ? '#f4f4f4' : PAL[2]); for (let i = 0; i < 8; i++) fr(-14 + i * 4, -22, 2, 1, i % 2 ? '#f4f4f4' : PAL[2]);
  const bob = Math.floor(now / 400) % 2; fr(-3, -15 - bob, 6, 5, '#0b0b14'); fr(-2, -14 - bob, 4, 4, '#ffcd75'); fr(-3, -17 - bob, 6, 2, PAL[1]); fr(-1, -12 - bob, 1, 1, '#0b0b14'); fr(1, -12 - bob, 1, 1, '#0b0b14');
  fr(-12, -10, 24, 10, '#0b0b14'); fr(-11, -9, 22, 8, WOOD2); fr(-11, -9, 22, 2, WOOD);
  [RCOL[0], RCOL[1], RCOL[2], PAL[5]].forEach((c, i) => fr(-9 + i * 5, -12, 3, 2, c));
  ctx.drawImage(IMG.coin.n[0], gx - 2, gy - 36 + (Math.floor(now / 250) % 2));
  text(ctx, 'MARKET', gx, gy - 46, '#ffcd75', 1, 'c');
  fr(-13, -30, 26, 3, '#0b0b14'); ctx.fillStyle = m.left ? PAL[2] : '#ffcd75'; ctx.fillRect(gx - 12, gy - 29, Math.ceil(24 * Math.max(0, m.t) / MK.life), 1);
  if (!m.inside && Math.floor(now / 350) % 2) text(ctx, 'WALK IN', gx, gy + 14, '#f4f4f4', 1, 'c');
}
/* 1.11.2 (Matt phone test): the objective stack starts right under the WAVE / timer row (y 21; 35 in a raid, under RAID / timer / void lines) instead of y 35 / 43, so event lines + banners stay in the top band, off the hero. Narrow views (< 300 wide) keep the old y 43 so the centre lines clear the weapon name. */
const HUD_TOP = { run: 21, raid: 35, narrow: 43, minW: 300 };
const hudTop = () => R && R.raid ? HUD_TOP.raid : VW < HUD_TOP.minW ? HUD_TOP.narrow : HUD_TOP.run;
/* 1.16.0 CLEAN HUD (default): HP / gold / wave + objective arrows. VERBOSE HUD (Settings, off by default) restores weapon name, gear pips, buff icons, kill count, teaching text, stacked tips. */
const verboseHud = () => !!save.verboseHud;
const TX_CAP = () => verboseHud() ? 60 : 18;
function evLogPush(s) { if (!R) return; R.evLog = R.evLog || []; R.evLog.unshift({ s: String(s).slice(0, 64), t: R.t | 0 }); if (R.evLog.length > 24) R.evLog.length = 24; }
function setVerboseHud(on) { save.verboseHud = !!on; persist(); renderSettings(); return save.verboseHud; }
function hud8(now, y0 = hudTop()) {   // 1.16.0: CLEAN = arrows + short objective; VERBOSE restores threat spam lines
  let y = y0; const nb = instCount('barracks'), nc = instCount('catapult'), V = verboseHud();
  if (R.raid) y = raidHud(y, now);
  if ((nb || nc) && V) { const O = R.E.filter(e => e.inst && e.hp > 0), worst = O.reduce((a, e) => outTier(e) > outTier(a) ? e : a, O[0]), nx = O.filter(e => outTier(e) < outMaxTier(R.wave)).map(e => OUT7.grow[outTier(e)] - e.gT), gs = nx.length ? ` - GROWS ${Math.max(0, Math.ceil(Math.min(...nx)))}S` : '';
    text(ctx, `${O.length > 1 ? O.length + ' OUTPOSTS' : outName(worst)}${O.some(e => e.inst === 'catapult') ? ` - SHELLS X${Math.max(...O.filter(e => e.inst === 'catapult').map(outShellX), 1).toFixed(1)}` : ''}${gs}`, VW / 2, y, outTier(worst) >= 6 ? PAL[2] : PAL[3], 1, 'c'); y += 8; }
  if (R.gate) { const g = R.gate; if (V) { text(ctx, gateLine(g), VW / 2, y, g.sealed ? '#ffcd75' : PAL[11], 1, 'c'); y += 8; } edgeArrow(g.x, g.y, g.sealed ? '#ffcd75' : PAL[11], now, 'G'); }
  if (R.mk) { const m = R.mk; if (V) { text(ctx, m.left ? `MARKET CLOSING ${Math.ceil(m.t)}S` : `MARKET ${Math.ceil(m.t)}S`, VW / 2, y, '#ffcd75', 1, 'c'); y += 8; } edgeArrow(m.x, m.y, '#ffcd75', now, 'M'); }
  if (R.gc && R.gc.e && R.gc.e.hp > 0) { const g = R.gc, e = g.e, bw = 120, bx = VW / 2 - bw / 2;
    ctx.fillStyle = '#0b0b14'; ctx.fillRect(bx - 1, y, bw + 2, 5); ctx.fillStyle = PAL[1]; ctx.fillRect(bx, y + 1, bw, 3); ctx.fillStyle = e.enr ? (Math.floor(now / 120) % 2 ? PAL[2] : PAL[4]) : PAL[2]; ctx.fillRect(bx, y + 1, Math.ceil(bw * Math.max(0, e.hp) / e.maxHp), 3);
    text(ctx, e.enr ? `${wardenName(g.tier)} - CULLING!` : `GEAR CHECK - CULL ${Math.ceil(g.t)}S`, VW / 2, y + 7, e.enr ? PAL[2] : '#ffcd75', 1, 'c'); edgeArrow(e.x, e.y, PAL[2], now, 'W'); y += 15; }
  for (const e of R.E) if (e.inst) edgeArrow(e.x, e.y, outTier(e) >= 6 ? PAL[2] : e.inst === 'barracks' ? PAL[2] : PAL[3], now, (e.inst === 'barracks' ? 'B' : (outFam(e) === 'mage' ? 'M' : outFam(e) === 'cannon' ? 'N' : 'C')) + outTier(e));
  return y;
}
function edgeArrow(tx, ty, c, now, lbl) {
  const p = R.p, dx = tx - p.x - (R.camX || 0), dy = ty - p.y - (R.camY || 0), ox = FVW / 2 - HUDO.x, oy = FVH / 2 - HUDO.y;   // 1.9.2: the hero sits at the full-screen centre; arrows clamp to the safe rect
  if (Math.abs(dx) < FVW / 2 - 10 && Math.abs(dy) < FVH / 2 - 10 && ox + dx > 10 && ox + dx < VW - 10 && oy + dy > 10 && oy + dy < VH - 10) return;
  const a = Math.atan2(dy, dx), m = 14, ca = Math.cos(a), sn = Math.sin(a), kx = ca > 1e-6 ? (VW - m - ox) / ca : ca < -1e-6 ? (m - ox) / ca : Infinity, ky = sn > 1e-6 ? (VH - m - oy) / sn : sn < -1e-6 ? (m - oy) / sn : Infinity, k = Math.max(0, Math.min(kx, ky));
  const ax = ox + ca * k, ay0 = oy + sn * k, ay = !lbl ? ay0 : Math.abs(ax - VW / 2) < 135 ? Math.max(80, ay0) : ax < 170 ? Math.max(66, ay0) : ay0, s = 5 + (Math.floor(now / 200) % 2);
  const sub18 = ON18 ? arrowSub18(lbl, tx, ty) : '';
  if (HUDLOG) HUDLOG.push({ k: 'arrow', s: lbl || '', x: Math.round(ax) + HUDO.x, y: Math.round(ay) + HUDO.y, sub: sub18 });   // 1.9.2 test hook
  ctx.fillStyle = c; ctx.beginPath(); ctx.moveTo(ax + Math.cos(a) * s, ay + Math.sin(a) * s); ctx.lineTo(ax + Math.cos(a + 2.4) * s, ay + Math.sin(a + 2.4) * s); ctx.lineTo(ax + Math.cos(a - 2.4) * s, ay + Math.sin(a - 2.4) * s); ctx.fill();
  if (lbl) text(ctx, lbl, Math.round(ax - Math.cos(a) * 10), Math.round(ay - Math.sin(a) * 10) - 3, c, 1, 'c');   // 0.8.0 marker letter
  if (sub18) { const lx = clamp(Math.round(ax - Math.cos(a) * 10), 2 + sub18.length * 2, VW - 2 - sub18.length * 2); text(ctx, sub18, lx, Math.round(ay - Math.sin(a) * 10) + 4, c, 1, 'c'); }   // 1.18.0 distance (+ gate time)
}
/* ---------------- 1.9.1 POLISH (visual / UX only; locked by Matt) ----------------
   1) HELD WEAPON FACES THE AIM: every hand weapon (bow, xbow, wand, axe, spear, flail) is pre-rotated to one of 16 directions (22.5° steps) with
      super-sampled nearest-neighbour (no smoothing, integer placement) and mirrored across its own axis when aiming left so it never hangs upside down.
      Sprites are cached per base + direction; it draws behind the hero when aiming up. Purely cosmetic: shots still use p.aimA exactly as before.
   2) GROUND HEARTS: 2x heart (+1 px glint) on a soft pink pedestal + halo, loot-style bob; the last 5 s is a soft pulse (never fully gone) instead of a hard every-other-frame blink.
   3) COMPACT RUN HUD: drops the BOSS / GEAR CHECK IN n WAVES line, the gold readout (run + bank; both are on the pause card now), GEAR n/9 + KEPT n text,
      and the weapon KEPT tag. WAVE is scale 1. Buffs are tiny coloured icons (glyph + 1px time bar, gold frame = for the run); names + times live on the pause card. */
const WPN_A0 = { chakram: 0, darts: -Math.PI / 4, bow: Math.PI, xbow: -Math.PI / 2, wand: -Math.PI / 4, axe: -Math.PI / 2, spear: -Math.PI / 4, flail: -Math.PI / 4 };   // the way each 8x8 hand sprite points as drawn
const WPN_DIRS = 16, WPN_CACHE = new Map();
const wpnDir = a => ((Math.round(a / (TAU / WPN_DIRS)) % WPN_DIRS) + WPN_DIRS) % WPN_DIRS;
function wpnSprite(base, aimA) {
  const d = wpnDir(aimA), key = base + ':' + d; let W = WPN_CACHE.get(key); if (W) return W;
  const im = (IMG[base] || IMG.wand).n[0], a0 = WPN_A0[base] !== undefined ? WPN_A0[base] : 0, ang = d * TAU / WPN_DIRS, flip = Math.cos(ang) < -1e-6, r = ang - a0;
  const sw = im.width, sh = im.height, sd = im.getContext('2d').getImageData(0, 0, sw, sh).data, N = Math.ceil(Math.hypot(sw, sh)) + 2, c = document.createElement('canvas'); c.width = c.height = N;
  const x = c.getContext('2d'), out = x.createImageData(N, N), cr = Math.cos(r), sr = Math.sin(r), c2 = Math.cos(2 * a0), s2 = Math.sin(2 * a0), SS = 4;
  for (let j = 0; j < N; j++) for (let i = 0; i < N; i++) { const cnt = new Map(); let op = 0;
    for (let sj = 0; sj < SS; sj++) for (let si = 0; si < SS; si++) { const vx = i + (si + 0.5) / SS - N / 2, vy = j + (sj + 0.5) / SS - N / 2;
      let ux = vx * cr + vy * sr, uy = -vx * sr + vy * cr; if (flip) { const fx = ux * c2 + uy * s2, fy = ux * s2 - uy * c2; ux = fx; uy = fy; }   // inverse rotate, then mirror across the sprite's own axis
      const px = Math.floor(ux + sw / 2), py = Math.floor(uy + sh / 2); if (px < 0 || py < 0 || px >= sw || py >= sh) continue; const o = (py * sw + px) * 4; if (sd[o + 3] < 128) continue;
      op++; const k = (sd[o] << 16) | (sd[o + 1] << 8) | sd[o + 2]; cnt.set(k, (cnt.get(k) || 0) + 1); }
    if (op * 16 < 6 * SS * SS) continue; let best = 0, bn = -1; for (const [k, n] of cnt) if (n > bn) { bn = n; best = k; }
    const o = (j * N + i) * 4; out.data[o] = best >> 16; out.data[o + 1] = (best >> 8) & 255; out.data[o + 2] = best & 255; out.data[o + 3] = 255; }
  x.putImageData(out, 0, 0); W = { c, d, ang, flip, r, base }; WPN_CACHE.set(key, W); return W;
}
function drawHeldWeapon(hx, hy, a) {   // centre stays where the 1.9.0 upright sprite sat: (hx + cos a * 7, hy - 6 + sin a * 5)
  const W = wpnSprite(R.weapon.base, a), wx = Math.round(hx + Math.cos(a) * 7 - W.c.width / 2), wy = Math.round(hy - 6 + Math.sin(a) * 5 - W.c.height / 2);
  ctx.drawImage(W.c, wx, wy); R.p.wpnDrawn = { base: W.base, d: W.d, ang: W.ang, flip: W.flip, x: wx, y: wy };
}
/* ground hearts */
let HEART2 = null; const heartBig = () => { if (HEART2) return HEART2; const s = IMG.heart.n[0], c = document.createElement('canvas'); c.width = s.width * 2; c.height = s.height * 2; const x = c.getContext('2d'); x.imageSmoothingEnabled = false; x.drawImage(s, 0, 0, c.width, c.height); x.fillStyle = '#f4f4f4'; x.fillRect(2, 2, 1, 1); return HEART2 = c; };   // nearest-neighbour 2x canvas + 1 px glint
const heartAlpha = (h, now) => h.t >= 5 ? 1 : 0.55 + 0.45 * (0.5 + 0.5 * Math.cos(now / (h.t < 2 ? 70 : 130)));   // soft pulse 0.55..1, quicker in the last 2 s
function drawGroundHeart(h, X, Y, now) {
  const hx = X(h.x), hy = Y(h.y), bob = Math.round(Math.sin(now / 250 + h.x) * 1.5), a = heartAlpha(h, now), g = 0.22 + 0.1 * Math.sin(now / 180 + h.x);
  ctx.fillStyle = '#ff7b9c'; ctx.globalAlpha = g * a; const by = hy - 13 + Math.min(0, bob);   // halo rows never overlap the pedestal rows (no double-alpha seams)
  ctx.fillRect(hx - 5, hy - 2, 11, 1); ctx.fillRect(hx - 7, hy - 1, 15, 2); ctx.fillRect(hx - 5, hy + 1, 11, 1);   // pedestal
  ctx.fillRect(hx - 3, by, 7, 1); ctx.fillRect(hx - 5, by + 1, 11, 2); ctx.fillRect(hx - 6, by + 3, 13, 5); ctx.fillRect(hx - 5, by + 8, 11, 2); ctx.fillRect(hx - 3, by + 10, 7, 1);   // soft rounded halo behind the heart
  ctx.globalAlpha = Math.min(1, g * a * 2); ctx.fillRect(hx - 3, hy - 1, 7, 2);
  ctx.globalAlpha = a; ctx.drawImage(heartBig(), hx - 5, hy - 12 + bob); ctx.globalAlpha = 1;
}
/* compact HUD: buff icons */
const BUFF_GLYPH = { multi: 'M', slow: 'S', leech: 'L', freeze: 'F', fury: '!', aegis: 'A' };
function drawBuffIcons(x0, y, now) {
  const out = []; let x = x0; if (!R.buffMax) R.buffMax = {};
  for (const k in R.buffs) { const v = R.buffs[k]; if (!(v > 0) || !BUFFS[k]) continue; const run = v === RUN_BUFF; if (!run) R.buffMax[k] = Math.max(R.buffMax[k] || 0, v); else delete R.buffMax[k];
    if (!run && v < 3 && Math.floor(now / 160) % 2) ctx.globalAlpha = 0.45;
    const gl = BUFF_GLYPH[k] || BUFFS[k].name[0], F = FONT[gl] || '';
    ctx.fillStyle = run ? '#ffcd75' : '#0b0b14'; ctx.fillRect(x, y, 9, 9); ctx.fillStyle = BUFFS[k].c; ctx.fillRect(x + 1, y + 1, 7, 7);   // tile: buff colour, dark frame (gold frame = for the run)
    ctx.fillStyle = '#0b0b14'; for (let i = 0; i < 15; i++) if (F[i] === '1') ctx.fillRect(x + 3 + (i % 3), y + 2 + Math.floor(i / 3), 1, 1);   // bare 3x5 glyph (no text outline, so it fits the tile)
    if (!run) { ctx.fillStyle = '#0b0b14'; ctx.fillRect(x, y + 9, 9, 2); ctx.fillStyle = BUFFS[k].c; ctx.fillRect(x, y + 10, Math.max(1, Math.ceil(9 * Math.min(1, v / (R.buffMax[k] || v)))), 1); }
    ctx.globalAlpha = 1; out.push({ k, x, y, run, gl }); x += 11; }
  if (R.hex) for (const k in HEX.st) { const v = R.hex[k]; if (!(v > 0)) continue; const zone = R.hexSrc[k] === 'zone';   // 1.9.4 status tiles share the row (dark tile + colour frame = bad)
    const n = hexN(k), tw = n >= 2 ? 14 : 9; if (!zone && v < 2 && n < 2 && Math.floor(now / 160) % 2) ctx.globalAlpha = 0.45; drawHexTile(k, x, y);
    if (n >= 2) { const F = FONT[String(n)]; ctx.fillStyle = '#0b0b14'; ctx.fillRect(x + 9, y, 5, 9); ctx.fillStyle = HEX.st[k].c; ctx.fillRect(x + 9, y, 5, 1); ctx.fillRect(x + 9, y + 8, 5, 1); ctx.fillRect(x + 13, y, 1, 9); for (let i = 0; i < 15; i++) if (F[i] === '1') ctx.fillRect(x + 9 + (i % 3), y + 2 + Math.floor(i / 3), 1, 1); }   // 1.12.0 stack count
    ctx.fillStyle = '#0b0b14'; ctx.fillRect(x, y + 9, tw, 2); ctx.fillStyle = HEX.st[k].c; ctx.fillRect(x, y + 10, zone ? tw : Math.max(1, Math.ceil(tw * Math.min(1, v / (R.hexMax[k] || v)))), 1);
    ctx.globalAlpha = 1; out.push({ k, x, y, hex: true, zone, n, w: tw }); x += tw + 2; }
  x = drawPoisonTile(x, y, now, out);   // 1.10.0 poison: violet tile, droplet + stack count
  for (const k in R.buffMax) if (!(R.buffs[k] > 0)) delete R.buffMax[k];
  R.hudBuffs = out; return out;
}
function buffSummary() { const a = []; for (const k in R.buffs) { const v = R.buffs[k]; if (v > 0 && BUFFS[k]) a.push(`${BUFFS[k].name} ${v === RUN_BUFF ? 'RUN' : Math.ceil(v) + 's'}`); } return a.join(', '); }
function pauseRunLine() {   // what the Compact HUD stopped showing, readable while paused
  const n = SLOTS.filter(k => R.gear[k]).length, hs = SLOTS.filter(k => R.gear[k] && R.gear[k].heir).length, lo = SLOTS.filter(k => R.gear[k] && R.gear[k].lo).length, parts = [`Gold ${R.gold} this run (bank ${save.gold})`, `Gear ${n}/9${hs ? ` (${hs} ★ kept)` : lo ? ` (${lo} from loadout)` : ''}`];
  if (!R.raid) { const nb = 4 - ((R.wave - 1) % 5); if (nb > 0) parts.push(`${isGearWave(R.wave + nb) ? 'Gear Check' : 'Boss'} in ${nb} wave${nb > 1 ? 's' : ''}`); else parts.push('Boss wave now'); }
  const b = buffSummary(); parts.push(b ? `Buffs: ${b}` : 'No buffs'); const hxs = hexSummary(); if (hxs) parts.push(`Hexed: ${hxs}`); if (R.poison && R.poison.n > 0) parts.push(`Poison: ${R.poison.n} stack${R.poison.n > 1 ? 's' : ''}`); return parts.join(' · ');
}
/* headless test hook: records every canvas text string while on */
var TXTLOG = null; const txtLog = on => { const l = TXTLOG; TXTLOG = on ? [] : null; return l; };   // var: text() can run before this line during boot

function drawHero(X, Y, now) {
  const p = R.p; if (R.over) return; if (p.inv > 0 && !p.dash && Math.floor(now / 60) % 2) return;
  const fr = (input.mx || input.my) ? Math.floor(p.anim) % 2 : 0; const im = IMG['hero_' + R.hero][p.hurt > 0.15 || (p.dash && p.dash.k !== 'roll') ? 'w' : 'n'][fr];
  const hx = X(p.x), hy = Y(p.y); ctx.drawImage(shadowC, hx - 6, hy - 1);
  const bob = fr ? 1 : 0;
  const a = p.aimA, back = Math.sin(a) < -0.35; if (back) drawHeldWeapon(hx, hy, a);   // 1.9.1: aiming up = weapon behind the hero
  if (p.face < 0) { ctx.save(); ctx.translate(hx, 0); ctx.scale(-1, 1); ctx.drawImage(im, -5, hy - 12 - bob); ctx.restore(); } else ctx.drawImage(im, hx - 5, hy - 12 - bob);
  // weapon in hand: 1.9.1 rotated (16 directions, pixel-crisp) to face p.aimA, mirrored when aiming left
  if (!back) drawHeldWeapon(hx, hy, a);
  if (p.ward > 0) { const ang = R.t * 4, nw = 4 + hrank('k_wall'); for (let i = 0; i < nw; i++) { const aa = ang + i * TAU / nw; ctx.drawImage(IMG.bone.n[0], Math.round(hx + Math.cos(aa) * 22) - 2, Math.round(hy - 4 + Math.sin(aa) * 16) - 2); } }
}
function drawHUD(now) {   // 1.9.2: the run HUD draws inside the safe rect (cutout / rounded corners); VW / VH read as the usable size while it draws
  const fw = VW, fh = VH, H = hudRect(); FVW = fw; FVH = fh; HUDO = { x: H.x, y: H.y }; R.hudRect = H;
  ctx.save(); ctx.translate(H.x, H.y); VW = H.w; VH = H.h;
  INHUD = true; try { drawHUDin(now); } finally { INHUD = false; VW = fw; VH = fh; ctx.restore(); HUDO = { x: 0, y: 0 }; }
}
function drawHUDin(now) {
  const p = R.p, S = R.S, V = verboseHud();
  // xp strip (always — tiny)
  ctx.fillStyle = '#0b0b14'; ctx.fillRect(0, 0, VW, 3); ctx.fillStyle = PAL[11]; ctx.fillRect(0, 0, Math.floor(VW * save.xp / need(save.level)), 2);
  // hp (always)
  const hw = 70; ctx.fillStyle = '#0b0b14'; ctx.fillRect(4, 12, hw + 2, 7); ctx.fillStyle = PAL[1]; ctx.fillRect(5, 13, hw, 5); ctx.fillStyle = PAL[2]; ctx.fillRect(5, 13, Math.ceil(hw * p.hp / S.maxHp), 5); ctx.fillStyle = PAL[3]; ctx.fillRect(5, 13, Math.ceil(hw * p.hp / S.maxHp), 1);
  text(ctx, `${Math.ceil(p.hp)}/${S.maxHp}`, 6, 12, '#f4f4f4');
  for (let i = 0; i < R.lives; i++) ctx.drawImage(IMG.heart.n[0], 78 + i * 7, 13);
  // resources: gold (CLEAN + VERBOSE)
  text(ctx, `${nfmt(R.gold | 0)}G`, 4, 22, '#ffcd75');
  if (V) { text(ctx, `LV ${save.level}`, 4, 4, '#73eff7'); ctx.drawImage(itemImg(R.weapon), 3, 30); text(ctx, R.weapon.name, 15, 32, RCOL[R.weapon.rarity]);
    SLOTS.forEach((k, i) => { const it = R.gear[k], x = 4 + i * 6; ctx.fillStyle = '#0b0b14'; ctx.fillRect(x, 42, 5, 5); ctx.fillStyle = it ? RCOL[it.rarity] : '#333c57'; ctx.fillRect(x + 1, 43, 3, 3); if (it && it.heir) { ctx.fillStyle = '#ffcd75'; ctx.fillRect(x + 2, 41, 1, 1); } });
    drawBuffIcons(4, 50, now); }
  if ((R.map !== 'ash' || R.raid) && V) text(ctx, R.M.name, VW / 2, VH - 9, '#566c86', 1, 'c');
  // wave (always)
  if (R.raid) raidTop(now); else text(ctx, `WAVE ${R.wave}`, VW / 2, 5, R.wave % 5 === 0 ? '#b13e53' : '#ffcd75', 1, 'c');
  if (!R.raid && V) text(ctx, `${fmtT(R.t)}   ${R.kills} KILLS`, VW / 2, 13, '#94b0c2', 1, 'c');
  else if (!R.raid) text(ctx, fmtT(R.t), VW / 2, 13, '#94b0c2', 1, 'c');
  for (const e of R.E) if (e.mini) edgeArrow(e.x, e.y, PAL[3], now);
  for (const n of R.nukes) edgeArrow(n.x, n.y, PAL[2], now);
  let evLine = false; if (R.ev) { const ev = R.ev; let tx, ty, s, c;
    if (ev.k === 'well') { tx = ev.x; ty = ev.y; s = V ? `REGEN WELL ${ev.prog.toFixed(1)}/${ev.need}S  ${Math.ceil(ev.t)}` : `WELL ${Math.ceil(ev.t)}S`; c = '#a7f070'; }
    else if (ev.k === 'escort') { tx = ev.x; ty = ev.y; c = PAL[10]; const hp = `HP ${Math.max(0, Math.ceil(ev.hp / ev.maxHp * 100))}%`;
      s = V ? (ev.pend != null && !ev.ms ? `${ev.v === 'mage' ? 'MAGE ESCORT' : 'CARAVAN'}: REACH IT  ${Math.max(0, Math.ceil(ev.pend))}S` : ev.ms ? `MAGE TRIAL D${ev.ms.d} ${Math.floor(Math.min(ev.need, ev.prog))}/${ev.need}S  ${hp}` : ev.v === 'mage' ? `MAGE T${ev.tier || 1} ${Math.floor(Math.min(ev.need, ev.prog))}/${ev.need}S  ${hp}` : `CARAVAN T${ev.tier || 1} ${hp}`) : (ev.v === 'mage' ? 'MAGE' : 'CARAVAN'); }
    else if (ev.e) { tx = ev.e.x; ty = ev.e.y; s = V ? `GOLD GOBLIN ${Math.ceil(ev.e.hp / ev.e.maxHp * 100)}%` : 'GOBLIN'; c = '#ffcd75'; }
    if (s) { text(ctx, s, VW / 2, hudTop(), c, 1, 'c'); edgeArrow(tx, ty, c, now, ev.k === 'escort' ? 'E' : ON18 && ev.k === 'well' ? 'R' : ''); evLine = true; } }
  else if (R.sig && !R.raid) { const g = R.sig, c = MSN.col[g.d - 1]; text(ctx, V ? `MAGE SIGIL D${g.d}: STEP ON IT  ${Math.ceil(g.t)}` : `SIGIL ${Math.ceil(g.t)}S`, VW / 2, hudTop(), c, 1, 'c'); edgeArrow(g.x, g.y, c, now, 'M'); evLine = true; }
  let feL = false; if (R.fe && !R.raid) { const c = FE[R.fe.k].c; text(ctx, V ? feLine() : FE[R.fe.k].name || 'EVENT', VW / 2, hudTop() + (evLine ? 8 : 0), c, 1, 'c'); edgeArrow(R.fe.x, R.fe.y, c, now, 'F'); feL = true; }
  const hy = hud8(now, hudTop() + (evLine ? 8 : 0) + (feL ? 8 : 0));
  if (ON18) hud18(now);   // 1.18.0 foretold gates, flasks, heat, pings
  drawBanner(hy);
  if (input.stick) { const s = input.stick; ctx.globalAlpha = 0.5; ctx.strokeStyle = '#94b0c2'; ctx.lineWidth = 1; ctx.beginPath(); ctx.arc(Math.round(s.ox - HUDO.x) + 0.5, Math.round(s.oy - HUDO.y) + 0.5, 20, 0, TAU); ctx.stroke(); ctx.fillStyle = '#f4f4f4'; ctx.fillRect(Math.round(s.ox - HUDO.x + input.mx * 18) - 4, Math.round(s.oy - HUDO.y + input.my * 18) - 4, 8, 8); ctx.globalAlpha = 1; }
  else if (R.t < 6 && V) { ctx.globalAlpha = 0.5 + 0.3 * Math.sin(now / 200); text(ctx, 'DRAG LEFT SIDE TO MOVE', VW * 0.22, VH - 16, '#94b0c2', 1, 'c'); ctx.globalAlpha = 1; }
}

/* 1.3.0 announcement banner: the ONE canvas draw site for R.banner (R.bq feeds it via the timer in update()). The timer / queue run the same in every mode, so Off just never draws. */
const bannerMode = () => BANNER_MODES.includes(save.banner) ? save.banner : 'normal';
function bannerLayout(b, mode = bannerMode(), hudY = hudTop()) {   // 1.11.2: Normal / Small / Top all sit under the HUD lines (Normal / Small used to sit at 30% height, right over the hero)
  if (!b || mode === 'off') return null; const n = b.s.length, y = hudY + 1, base = y > VH * 0.34 ? 1 : n > 46 ? 1 : n > 22 ? 2 : 3;   // a deep HUD stack (4+ lines) shrinks the banner to scale 1 so it stops above the hero
  if (mode === 'small') return { x: VW / 2, y, sc: Math.max(1, Math.min(2, base) - 1), a: 0.85 };   // one step under Normal (2->1, long stays 1), a touch see-through
  if (mode === 'top') return { x: VW / 2, y, sc: Math.min(2, Math.max(1, base - 1)), a: 1 };
  return { x: VW / 2, y, sc: Math.min(2, base), a: 1 };   // Normal: the bigger look, capped at scale 2 so it never dominates the field
}
function drawBanner(hudY) {
  const b = R && R.banner; if (b && !verboseHud() && b.t > 2) b.t = Math.min(b.t, 2);   // 1.16.0 CLEAN: auto-fade ~2s
  const L = bannerLayout(b, bannerMode(), hudY); R.bannerDrawn = L ? { s: b.s, y: L.y, sc: L.sc } : null; if (!L) return;
  const sc = verboseHud() ? L.sc : 1, line = (!verboseHud() && b.s.length > 42) ? b.s.slice(0, 40) + '…' : b.s;
  ctx.globalAlpha = Math.min(1, b.t * 2) * L.a; text(ctx, line, L.x, L.y, b.c || '#ffcd75', sc, 'c'); ctx.globalAlpha = 1;   // 1.16.0 CLEAN: one draw site, short line
}
function cycleBanner() { save.banner = BANNER_MODES[(BANNER_MODES.indexOf(bannerMode()) + 1) % BANNER_MODES.length]; persist(); setBannerBtns(); return save.banner; }
function setBannerBtns() { const l = 'BANNER: ' + BANNER_LBL[bannerMode()]; for (const id of ['#bBanner', '#bBannerP']) { const e = $(id); if (e) { e.textContent = l; e.setAttribute('aria-label', 'Announcement banners: ' + BANNER_LBL[bannerMode()].toLowerCase() + ' (tap to change)'); } } }
/* ---------------- HUD buttons ---------------- */
const bA1 = $('#bA1'), bA2 = $('#bA2');
const heroIcon = (id, sc = 6) => bigIcon(IMG['hero_' + id].n[0], sc);
function setKitButtons(id) { const H = HEROES[id] || HEROES.wanderer;
  [[bA1, H.a1], [bA2, H.a2]].forEach(([el, a]) => { el.querySelector('.ico').style.backgroundImage = `url(${bigIcon(IMG[a.ico].n[0], 4)})`; el.querySelector('.lbl').textContent = a.name; el.setAttribute('aria-label', a.name); });
  const bb = document.querySelector('#bBag'), bi = bb && bb.querySelector('.bagico'); if (bi && IMG.satchel) bi.style.backgroundImage = `url(${bigIcon(IMG.satchel.n[0], 3)})`; }
setKitButtons(save.hero);
$('#heroIco').style.backgroundImage = `url(${heroIcon(save.hero)})`;
function updAbil(el, cd, max) { const c = el.querySelector('.cd'); if (cd > 0) { c.style.setProperty('--p', (cd / max * 100) + '%'); c.textContent = Math.ceil(cd); el.classList.remove('ready'); } else { c.style.setProperty('--p', '0%'); c.textContent = ''; el.classList.add('ready'); } }
/* ---------------- backpack: paper doll (9 slots) + bag grid ---------------- */
let bagOpen = false, sel = { k: 'gear', s: 'weapon' }, junkArm = false;   // 0.6.0: sel.k = 'gear' (sel.s) | 'bag' (sel.i) | 'ground' (sel.it)
const bBag = $('#bBag');
function updBagBtn() { if (!R) return; const t = `${R.bag.length}/${bagMax()}`; if (bBag.dataset.t !== t + R.bagNew) { bBag.dataset.t = t + R.bagNew; const ct = bBag.querySelector('.bagct'); if (ct) ct.textContent = t; bBag.setAttribute('aria-label', `Backpack ${R.bag.length}/${bagMax()} (loot filter: Settings only)`); bBag.classList.toggle('new', R.bagNew > 0); bBag.classList.toggle('full', R.bag.length >= bagMax()); } }
function afxList(w) { const imp = itemImp(w), il = Object.keys(imp).map(k => `<li class="imp">${IMPN[k](imp[k])}</li>`).join('');
  return il + (w.affixes.length ? w.affixes.map(a => `<li>${AFX[a.id].fmt(a.v)}</li>`).join('') : (w.slot || 'weapon') === 'weapon' ? `<li class="plain">${BASES[w.base].desc}</li>` : '') + (w.uq && UNIQ[w.uq] && !UNIQ[w.uq].set ? `<li class="uq">★ ${UNIQ[w.uq].d}</li>` : '') + setLine(w, R && R.gear ? R.gear : null); }   // 1.7.0 set lines
function tile(w, attr, sel, extra = '') { return `<button class="tile ${RCLS[w.rarity]}${sel ? ' sel' : ''}${isLocked(w) ? ' locked' : ''}" ${attr}><i style="background-image:url(${bigIcon(itemImg(w), 3)})"></i>${isLocked(w) ? '<b class="lk" aria-label="Locked">🔒</b>' : ''}${w.heir ? '<b class="hs">★</b>' : w.lo ? '<b class="hs lo">▸</b>' : ''}${extra}</button>`; }
const descItem = it => `<b style="color:${RCOL[it.rarity]}">${it.heir ? '★ ' : ''}${it.name}</b><div class="tiny">${RNAME[it.rarity]} ${itemBase(it)} · T${it.tier + 1}${TIER_TAG[it.tier] ? ' ' + TIER_TAG[it.tier] : ''}${it.heir ? ' · kept' : it.lo ? ' · loadout (lost if you die)' : it.rk ? ' · raid-issued' : it.smith ? ' · smithy' : ''}</div><ul>${afxList(it)}</ul>`;
const dEm = d => `<em class="${d > 0 ? 'up' : d < 0 ? 'dn' : ''}">${d > 0 ? '▲' : d < 0 ? '▼' : '='}</em>`;
function selItem() { return sel.k === 'bag' ? R.bag[sel.i] : sel.k === 'ground' ? (R.I.includes(sel.it) ? sel.it.w : null) : R.gear[sel.s]; }
function fixSel() {
  if (sel.k === 'bag' && !R.bag[sel.i]) sel = R.bag.length ? { k: 'bag', i: Math.min(sel.i, R.bag.length - 1) } : { k: 'gear', s: 'weapon' };
  if (sel.k === 'ground' && !R.I.includes(sel.it)) { const n = nearbyLoot(); sel = n.length ? { k: 'ground', it: n[0] } : R.bag.length ? { k: 'bag', i: 0 } : { k: 'gear', s: 'weapon' }; }
}
function renderBag() {
  fixSel(); const G = R.gear, near = nearbyLoot();
  $('#gearGrid').innerHTML = DOLL.map(k => G[k] ? tile(G[k], `data-s="${k}"`, sel.k === 'gear' && sel.s === k)
    : `<button class="tile empty${sel.k === 'gear' && sel.s === k ? ' sel' : ''}" data-s="${k}"><i style="background-image:url(${bigIcon(IMG['it_' + (k === 'weapon' ? 'wand' : k)].n[0], 3)})"></i></button>`).join('');
  let h = R.bag.map((w, i) => tile(w, `data-i="${i}"`, sel.k === 'bag' && sel.i === i, dEm(itemDelta(w)))).join('');
  for (let i = R.bag.length; i < bagMax(); i++) h += `<div class="tile empty"></div>`;
  $('#bagList').innerHTML = h; $('#bagCount').textContent = `${R.bag.length}/${bagMax()}`;
  $('#groundList').innerHTML = near.length ? near.map((it, j) => tile(it.w, `data-g="${j}"`, sel.k === 'ground' && sel.it === it, dEm(itemDelta(it.w))).replace('class="tile ', `class="tile${it.left ? ' left' : ''} `)).join('') : '<div class="tiny none">nothing nearby</div>';
  $('#groundLbl').textContent = `ON THE GROUND ${near.length ? '(' + near.length + ')' : ''}`;
  $('#bagList').querySelectorAll('button.tile').forEach(b => b.onclick = () => { sel = { k: 'bag', i: +b.dataset.i }; junkArm = false; renderBag(); });
  $('#gearGrid').querySelectorAll('button.tile').forEach(b => b.onclick = () => { sel = { k: 'gear', s: b.dataset.s }; junkArm = false; renderBag(); });
  $('#groundList').querySelectorAll('button.tile').forEach(b => b.onclick = () => { sel = { k: 'ground', it: near[+b.dataset.g] }; junkArm = false; renderBag(); });
  const w = selItem(), cand = sel.k !== 'gear', slot = w ? (w.slot || 'weapon') : sel.s, cur = G[slot], SN = SLOTN[slot].toUpperCase();
  let d;
  if (!w) d = `<div class="cmp"><div><div class="tiny">${SN} · EMPTY</div><div class="tiny">${SLOTN[slot]} loot drops from elites, bosses and monsters. Walk over it to bag it.</div></div></div>`;
  else d = itemCompareHtml(w, G, sel.k === 'ground' ? (sel.it.left ? 'ON THE GROUND · LEFT' : 'ON THE GROUND') : cand ? 'IN BAG' : 'EQUIPPED', cand);
  if (!cand && !R.bag.length && !near.length) d += '<div class="tiny">Walk over dropped gear to bag it. No need to stop.</div>';
  if (sel.k === 'ground') d += `<div class="tiny">EQUIP or JUNK it right here: it never takes a bag slot.${R.bag.length >= bagMax() ? ' Bag full: the item you swap out is left on the ground (it won\'t auto-pick again).' : ''}</div>`;
  $('#bagDetail').innerHTML = d;
  const eq = $('#bEquip'), tk = $('#bTake'), jk = $('#bDiscard'), ja = $('#bJunkAll'), nb = worseInBag().length;
  if (cand) { eq.textContent = 'EQUIP'; eq.disabled = !w; } else { eq.textContent = 'TO BAG'; eq.disabled = !w || sel.s === 'weapon' || R.bag.length >= bagMax(); }
  tk.hidden = sel.k !== 'ground'; tk.disabled = !w || R.bag.length >= bagMax();
  jk.textContent = 'JUNK'; jk.disabled = !cand || !w || isLocked(w);
  const lk = $('#bLock'); if (lk) { lk.hidden = !w; lk.textContent = w && isLocked(w) ? 'UNLOCK' : 'LOCK'; lk.disabled = !w; lk.classList.toggle('on', !!(w && isLocked(w))); }
  ja.disabled = !nb; ja.textContent = junkArm && nb ? `SURE? ${nb}` : `JUNK ▼ ${nb || ''}`.trim(); ja.classList.toggle('arm', junkArm && nb > 0);
  lootSyncMin(); const bn = $('#bagLootNote'); if (bn) bn.textContent = FILTER_LBL[lootMin()].replace('LOOT: ', '') + ' · set in Settings';   // 1.16.2: read-only; no tap-to-cycle in bag/pause
}
function openBag() {
  // 1.16.2: Settings-only LOOT. Never mutate lootHideC/M/Conv or call setLootMin here (a stray tap must not switch the filter).
  if (mode !== 'run' || !R || R.over || bagOpen || mkOpen || R.adAsk || !$('#settings').hidden) return;
  if (paused) setPause(false);
  input.stick = null; input.mx = input.my = 0; if (input) input.lastTap = 0;
  bagOpen = true; paused = true; R.bagNew = 0; junkArm = false;
  lootSyncMin(); persist(); lootPurgeGround();   // read Settings flags; applies purge only, never flips the filter
  if (R.bag.length) { let b = 0, bd = -1e9; R.bag.forEach((w, i) => { const d = itemDelta(w); if (d > bd) { bd = d; b = i; } }); sel = { k: 'bag', i: b }; }
  else { const n = nearbyLoot(); sel = n.length ? { k: 'ground', it: n[0] } : { k: 'gear', s: 'weapon' }; }
  renderBag(); $('#bag').hidden = false; updBagBtn();
}
function closeBag() { if (!bagOpen) return; bagOpen = false; paused = false; $('#bag').hidden = true; last = performance.now(); }
function bindTap(el, fn) { el.addEventListener('pointerdown', e => { e.preventDefault(); e.stopPropagation(); fn(); }); }
bindTap(bA1, () => { if (mode === 'run' && !paused) useA(1); });
bindTap(bA2, () => { if (mode === 'run' && !paused) useA(2); });
bindTap(bBag, () => openBag());
$('#bEquip').onclick = () => { junkArm = false; let ok = false;
  if (sel.k === 'bag') ok = bagEquip(sel.i); else if (sel.k === 'ground') { const sl = sel.it.w.slot || 'weapon'; ok = groundEquip(sel.it); if (ok) sel = { k: 'gear', s: sl }; } else ok = bagUnequip(sel.s);
  if (ok) { renderBag(); updBagBtn(); } };
$('#bTake').onclick = () => { junkArm = false; if (sel.k === 'ground' && groundTake(sel.it)) { sel = { k: 'bag', i: R.bag.length - 1 }; renderBag(); updBagBtn(); } };
$('#bDiscard').onclick = () => { junkArm = false; const ok = sel.k === 'bag' ? bagDiscard(sel.i) : sel.k === 'ground' ? groundJunk(sel.it) : false; if (ok) { renderBag(); updBagBtn(); } };
$('#bLock').onclick = () => { const w = selItem(); if (!w) return; toggleLock(w); sfx('swap'); toast(isLocked(w) ? 'Locked' : 'Unlocked'); renderBag(); updBagBtn(); };
$('#bJunkAll').onclick = () => { if (!junkArm) { junkArm = worseInBag().length > 0; renderBag(); return; } junkArm = false; const n = junkWorse(); if (n) toast(`Junked ${n} worse item${n > 1 ? 's' : ''}`); renderBag(); updBagBtn(); };
$('#bBagClose').onclick = () => closeBag();
bindTap($('#bPause'), () => setPause(true));

/* ---------------- 1.0.0 Market panel (time frozen, like the backpack) ---------------- */
let mkOpen = false, mkSel = { k: 'stock', i: 0 };   // mkSel.k = 'stock' (i) | 'bag' (i) | 'gear' (s)
function mkNoSell(w, gearSlot) { if (!w) return 'Nothing selected.'; if (gearSlot === 'weapon') return 'You can\'t sell the weapon in your hands: equip another one first.'; if (isLocked(w)) return 'Locked items can\'t be sold. Unlock them first.'; if (w.heir) return '★ Kept Armory items can\'t be sold mid-run (the Armory keeps them for your next run).';   /* 1.13.0: loadout pieces sell like any other */ return ''; }
function mkSelItem() { if (!R || !R.mk) return null; if (mkSel.k === 'stock') { const st = R.mk.stock[mkSel.i]; return st ? st.w : null; } return mkSel.k === 'bag' ? R.bag[mkSel.i] || null : R.gear[mkSel.s] || null; }
function mkFixSel() { const m = R.mk; if (!m) return;
  if (mkSel.k === 'stock' && !m.stock[mkSel.i]) mkSel = m.stock.length ? { k: 'stock', i: Math.min(mkSel.i, m.stock.length - 1) } : R.bag.length ? { k: 'bag', i: 0 } : { k: 'gear', s: 'weapon' };
  if (mkSel.k === 'bag' && !R.bag[mkSel.i]) mkSel = R.bag.length ? { k: 'bag', i: Math.min(mkSel.i, R.bag.length - 1) } : m.stock.length ? { k: 'stock', i: 0 } : { k: 'gear', s: 'weapon' };
  if (mkSel.k === 'gear' && !R.gear[mkSel.s]) mkSel = { k: 'gear', s: 'weapon' }; }
const priceTag = (v, cls = '') => `<b class="pr${cls}">${v}</b>`;
function renderMarket() {
  if (!R || !R.mk) return; mkFixSel(); const m = R.mk, G = R.gear, gold = save.gold;
  $('#mkGold').textContent = `BANK ${nfmt(gold)}G`; $('#mkTime').textContent = m.left ? `· stall closes ${Math.ceil(m.t)}s after you leave` : '· time is frozen';
  $('#mkStock').innerHTML = m.stock.length ? m.stock.map((st, i) => tile(st.w, `data-m="${i}"`, mkSel.k === 'stock' && mkSel.i === i, dEm(itemDelta(st.w)) + priceTag(st.price, gold < st.price ? ' no' : ''))).join('') : '<div class="tiny none">SOLD OUT</div>';
  $('#mkBag').innerHTML = R.bag.map((w, i) => tile(w, `data-i="${i}"`, mkSel.k === 'bag' && mkSel.i === i, dEm(itemDelta(w)) + (w.heir ? '' : priceTag('+' + mkSellPrice(w), ' sell')))).join('') + (R.bag.length ? '' : '<div class="tiny none">bag empty</div>');
  $('#mkGear').innerHTML = DOLL.filter(k => G[k]).map(k => tile(G[k], `data-s="${k}"`, mkSel.k === 'gear' && mkSel.s === k, mkNoSell(G[k], k) ? '' : priceTag('+' + mkSellPrice(G[k]), ' sell'))).join('');
  $('#mkBagLbl').textContent = `YOUR BAG ${R.bag.length}/${bagMax()} · SELL`;
  $('#mkStock').querySelectorAll('button.tile').forEach(b => b.onclick = () => { mkSel = { k: 'stock', i: +b.dataset.m }; renderMarket(); });
  $('#mkBag').querySelectorAll('button.tile').forEach(b => b.onclick = () => { mkSel = { k: 'bag', i: +b.dataset.i }; renderMarket(); });
  $('#mkGear').querySelectorAll('button.tile').forEach(b => b.onclick = () => { mkSel = { k: 'gear', s: b.dataset.s }; renderMarket(); });
  const w = mkSelItem(), A = $('#mA'), Bt = $('#mB'); let d = '';
  if (!w) d = `<div class="tiny">${m.stock.length ? 'Tap an item.' : 'Sold out. Sell your spare loot, or LEAVE to fight on.'}</div>`;
  else { const slot = w.slot || 'weapon', SN = SLOTN[slot].toUpperCase(), cand = mkSel.k !== 'gear', cur = G[slot], dd = cand ? itemDelta(w) : 0, g2 = cand ? Object.assign({}, G, { [slot]: w }) : G;
    d = (cand ? `<div class="dps">IF EQUIPPED${cur ? ' (vs current)' : ' (empty slot)'}:</div>` + statLinesHtml(w, G) : `<div class="dps">${slot === 'weapon' ? `~${dpsEst(g2)} DPS` : 'EQUIPPED'}</div>`) + `<div class="pw">power ${gearPower(g2)}${cand && dd ? ` (${dd > 0 ? '+' : ''}${dd})` : ''}</div>` + `<div class="cmp"><div><div class="tiny">${mkSel.k === 'stock' ? 'FOR SALE' : mkSel.k === 'bag' ? 'IN BAG' : 'EQUIPPED'} · ${SN}</div>${descItem(w)}</div>` + (cand ? `<div><div class="tiny">EQUIPPED · ${SN}</div>${cur ? descItem(cur) : '<div class="tiny">(empty slot: free upgrade)</div>'}</div>` : '') + '</div>';
    if (mkSel.k === 'stock') { const st = m.stock[mkSel.i]; d = `<div class="tiny mkline">PRICE <b class="gold">${st.price}G</b> · you have <b class="${gold >= st.price ? 'gold' : 'c-bad'}">${nfmt(gold)}G</b> · sells back for ${mkSellPrice(w)}G</div>` + d; }
    else { const why = mkNoSell(w, mkSel.k === 'gear' ? mkSel.s : null); d = `<div class="tiny mkline">${why ? `<span class="c-bad">${why}</span>` : `SELLS FOR <b class="gold">+${mkSellPrice(w)}G</b> (a stall would ask ~${mkBuyPrice(w)}G)`}</div>` + d; } }
  $('#mkDetail').innerHTML = d; A.hidden = Bt.hidden = false;
  if (!w) { A.hidden = Bt.hidden = true; }
  else if (mkSel.k === 'stock') { const st = m.stock[mkSel.i], slot = w.slot || 'weapon', poor = gold < st.price, roomEq = !G[slot] || R.bag.length < bagMax();
    A.textContent = poor ? `NEED ${st.price}G` : roomEq ? `BUY + EQUIP ${st.price}G` : 'BAG FULL'; A.disabled = poor || !roomEq;
    Bt.textContent = R.bag.length >= bagMax() ? 'BAG FULL' : 'BUY TO BAG'; Bt.disabled = poor || R.bag.length >= bagMax(); }
  else { const why = mkNoSell(w, mkSel.k === 'gear' ? mkSel.s : null); A.textContent = why ? 'CAN\'T SELL' : `SELL +${mkSellPrice(w)}G`; A.disabled = !!why;
    if (mkSel.k === 'bag') { Bt.textContent = 'EQUIP'; Bt.disabled = false; } else Bt.hidden = true; }
}
function mkBuy(i, equip) {
  const m = R && R.mk, st = m && m.stock[i]; if (!st || R.over || save.gold < st.price) return false; const w = st.w, slot = w.slot || 'weapon';
  if (equip ? (R.gear[slot] && R.bag.length >= bagMax()) : R.bag.length >= bagMax()) return false;
  save.gold -= st.price; R.mkSpent += st.price; R.mkBuys++; m.stock.splice(i, 1);
  if (equip) { const old = equipItem(w); if (old) R.bag.push(old); } else R.bag.push(w);
  sfx('drop'); persist(); return true;
}
function mkSell(k, ref) {
  if (!R || !R.mk || R.over) return 0; const w = k === 'bag' ? R.bag[ref] : k === 'gear' ? R.gear[ref] : null; if (!w || mkNoSell(w, k === 'gear' ? ref : null)) return 0;
  const g = mkSellPrice(w); if (k === 'bag') R.bag.splice(ref, 1); else { R.gear[ref] = null; refreshStats(); }
  save.gold += g; R.mkEarned += g; R.mkSells++; sfx('gem'); persist(); return g;
}
function openMarketUI() {
  if (mode !== 'run' || !R || !R.mk || R.over || mkOpen || bagOpen) return false; if (paused) { paused = false; $('#pause').hidden = true; }
  mkOpen = true; paused = true; input.stick = null; input.mx = input.my = 0; R.mk.inside = true; R.mk.visits++;
  mkSel = R.mk.stock.length ? { k: 'stock', i: 0 } : R.bag.length ? { k: 'bag', i: 0 } : { k: 'gear', s: 'weapon' };
  if (R.mk.stock.length) { let b = 0, bd = -1e9; R.mk.stock.forEach((st, i) => { const d = save.gold >= st.price ? itemDelta(st.w) : -1e8; if (d > bd) { bd = d; b = i; } }); mkSel = { k: 'stock', i: b }; }   // pre-select the best affordable upgrade
  renderMarket(); $('#market').hidden = false; sfx('swap'); return true;
}
function closeMarketUI() {
  if (!mkOpen) return false; mkOpen = false; paused = false; $('#market').hidden = true; last = performance.now();
  if (R && R.mk) { const m = R.mk; if (!m.left) { m.left = true; m.t = Math.min(m.t, MK.afterLeave); R.bq.push({ s: `MARKET CLOSES IN ${Math.ceil(m.t)}S`, t: 1.4, c: '#94b0c2' }); } }
  if (R && R.mkGraceCd <= 0) { R.p.inv = Math.max(R.p.inv, MK.grace); R.mkGraceCd = MK.graceCd; }   // short grace so leaving can't hand you a free hit
  return true;
}
$('#mA').onclick = () => { if (!R || !R.mk) return; let ok = false;
  if (mkSel.k === 'stock') { const sl = (R.mk.stock[mkSel.i] || {}).w; ok = mkBuy(mkSel.i, true); if (ok && sl) mkSel = { k: 'gear', s: sl.slot || 'weapon' }; }
  else ok = !!mkSell(mkSel.k, mkSel.k === 'bag' ? mkSel.i : mkSel.s);
  if (ok) { renderMarket(); updBagBtn(); } };
$('#mB').onclick = () => { if (!R || !R.mk) return; let ok = false;
  if (mkSel.k === 'stock') { ok = mkBuy(mkSel.i, false); if (ok) mkSel = { k: 'bag', i: R.bag.length - 1 }; }
  else if (mkSel.k === 'bag') { const w = R.bag[mkSel.i]; ok = bagEquip(mkSel.i); if (ok && w) mkSel = { k: 'gear', s: w.slot || 'weapon' }; }
  if (ok) { renderMarket(); updBagBtn(); } };
$('#mLeave').onclick = () => closeMarketUI();

/* ---------------- input ---------------- */
const toView = e => [e.clientX / SCALE, e.clientY / SCALE];
cv.parentElement.addEventListener('pointerdown', e => {
  if (mode !== 'run' || paused) return; const [x, y] = toView(e);
  if (x < VW * 0.6 && !input.stick) { input.stick = { id: e.pointerId, ox: x, oy: y }; input.mx = input.my = 0; }
});
addEventListener('pointermove', e => { const s = input.stick; if (!s || e.pointerId !== s.id) return; const [x, y] = toView(e); let dx = x - s.ox, dy = y - s.oy; const d = Math.hypot(dx, dy);
  if (d > 26) { s.ox = x - dx / d * 26; s.oy = y - dy / d * 26; } const m = Math.min(1, d / 18); if (d < 3) { input.mx = input.my = 0; return; } input.mx = dx / d * m; input.my = dy / d * m; });
const endStick = e => { if (input.stick && e.pointerId === input.stick.id) { input.stick = null; input.mx = input.my = 0; } };
addEventListener('pointerup', endStick); addEventListener('pointercancel', endStick);
addEventListener('keydown', e => { const k = e.key.toLowerCase(); if (guideOpen) { if (k === 'escape') { e.preventDefault(); closeGuide(); } else if (k === 'tab') { const a = [...$('#guide').querySelectorAll('button,input,[tabindex="0"]')], i = a.indexOf(document.activeElement); e.preventDefault(); a[(i + (e.shiftKey ? -1 : 1) + a.length) % a.length].focus(); } return; } input.keys[k] = true;
  if (mode === 'run') { if (mkOpen) { if (k === 'escape' || k === 'enter') { e.preventDefault(); closeMarketUI(); } return; }
    if (bagOpen) { if (k === 'escape' || k === 'i' || k === 'tab' || k === 'b') { e.preventDefault(); closeBag(); } else if (k === 'e') $('#bEquip').click(); else if (k === 'x') $('#bDiscard').click(); else if (k === 't' && !$('#bTake').hidden) $('#bTake').click(); return; }
    if (k === 'escape' || k === 'p') setPause(!paused); else if (!paused) { if (k === 'j' || k === ' ') useA(1); if (k === 'k') useA(2); if (k === 'i' || k === 'tab' || k === 'b' || k === 'f') { e.preventDefault(); openBag(); } } } });
addEventListener('keyup', e => { input.keys[e.key.toLowerCase()] = false; });
document.addEventListener('visibilitychange', () => { try { if (AC) { if (document.hidden) AC.suspend(); else if (save.sound) AC.resume(); } } catch (e) {} if (document.hidden) { persist(); if (mode === 'run' && R && !R.over && !bagOpen && !mkOpen) setPause(true); } });
try { const App = window.Capacitor?.Plugins?.App; if (App) App.addListener('backButton', () => { if (guideOpen) { closeGuide(); return; } if (mode === 'run') { if (mkOpen) closeMarketUI(); else if (bagOpen) closeBag(); else setPause(!paused); } else if (!$('#hub').hidden) App.exitApp(); else showScreen('hub'); }); } catch (e) {}

/* ---------------- screens ---------------- */
const SCREENS = ['hub', 'skills', 'unlocks', 'howto', 'pause', 'dead', 'bag', 'home', 'heroes', 'market', 'wipe', 'raids', 'settings', 'stash'];   // 1.11.0: + stash   // 1.9.0: + settings
let homeTick = null;
function showScreen(id) { SCREENS.forEach(s => $('#' + s).hidden = s !== id); clearInterval(homeTick); homeTick = null; if (id === 'hub') renderHub(); tutHub(); if (id === 'skills') renderSkills(); if (id === 'unlocks') renderUnlocks(); if (id === 'heroes') renderHeroes(); if (id === 'wipe') renderWipe(); if (id === 'raids') renderRaids(); if (id === 'stash') renderStash(); if (id === 'home') { renderHome(); homeTick = setInterval(renderHome, 1000); } vDrawT = 0; }
/* ---- 1.7.1 onboarding ---- */
let tutPg = 0, coach = null;
const tutOn = () => !window.__phNoTut && save.tut && !save.tut.done;
function tutRender() { const el = $('#tut'); if (!el) return; const T = save.tut, wrap = T.ran;   // intro pages, or the one village wrap-up card after the guided run
  const [h, b] = wrap ? ['NICE RUN', 'That is the loop: fight, <b>extract</b>, keep gear, spend gold. Tap <b>VILLAGE</b> to build (cards show gold + milestone ✓/✗). <b>HOW TO</b> has every rule; <b>REPLAY TUTORIAL</b> lives there too.'] : TUT_PAGES[tutPg];
  $('#tutStep').textContent = wrap ? 'TUTORIAL · DONE' : `TUTORIAL · ${tutPg + 1}/${TUT_PAGES.length}`; $('#tutH').textContent = h; $('#tutB').innerHTML = b;
  $('#tutBack').hidden = wrap || tutPg === 0; $('#tutNext').hidden = wrap || tutPg >= TUT_PAGES.length - 1; $('#tutGo').hidden = wrap || tutPg < TUT_PAGES.length - 1; $('#tutDone').hidden = !wrap; $('#tutSkip').hidden = wrap; }
function tutHub() { const el = $('#tut'); if (!el) return; const show = tutOn() && !$('#hub').hidden && mode !== 'run' && (!save.tut.intro || save.tut.ran); el.hidden = !show; if (show) tutRender(); }
function tutSkip() { save.tut = Object.assign(defTut(true), { seen: save.tut.seen || {} }); persist(); coachHide(); tutHub(); return true; }
function tutDone() { save.tut.done = true; persist(); tutHub(); return true; }
function tutStart() { save.tut.intro = true; persist(); $('#tut').hidden = true; return startRun(); }
function tutReplay() { save.tut = defTut(false); tutPg = 0; persist(); showScreen('hub'); return true; }
function coachShow(t) { coach = { id: t.id, s: t.s, t: 6.5 }; const el = $('#coach'); if (el) { $('#coachTxt').textContent = t.s; el.hidden = false; } }
function coachHide() { coach = null; const el = $('#coach'); if (el) el.hidden = true; }
function tutTick(dt) {   // called every sim step of a run; guided-run tips only (intro seen, guided run not finished, not a raid)
  if (!tutOn() || !save.tut.intro || save.tut.ran || !R || R.raid) { if (coach) coachHide(); return; }
  if (coach) { coach.t -= dt; if (coach.t <= 0) coachHide(); else return; }
  const T = TUT_TIPS.find(t => !save.tut.seen[t.id] && t.when(R)); if (T) { save.tut.seen[T.id] = 1; coachShow(T); } }
function tutRunEnd() {   // run-end screen line for the guided run; marks it finished (the hub then shows the wrap-up card)
  const el = $('#deadTut'); if (!el) return; const g = tutOn() && save.tut.intro && !save.tut.ran && R && !R.raid; el.hidden = !g; coachHide(); if (!g) return;
  el.innerHTML = LOAD.on ? `<b class="gold">TUTORIAL:</b> ${R.banked ? 'you extracted, so everything you carried is now banked in your STASH. Tap ▲ LOADOUT to take a piece into the next run.' : 'you fell before extracting, so everything you carried is gone (the ad can save one piece). Extract through an exit gate to bank gear into your STASH.'}` : `<b class="gold">TUTORIAL:</b> ${R.banked ? 'you extracted, so nothing was lost.' : 'you fell before extracting.'} Tick what to <b>KEEP</b> below: kept items are equipped next run.`;
  save.tut.ran = true; persist(); }
function toast(s) { const t = $('#toast'); t.textContent = s; t.hidden = false; clearTimeout(toast.h); toast.h = setTimeout(() => t.hidden = true, 2200); }
function renderHub() {
  const bb = $('#hubBeta'); if (bb) { bb.textContent = BETA_BANNER; bb.hidden = false; }
  $('#ver').textContent = VERSION; $('#hPrem').textContent = (isPremium() ? '★ PREMIUM' : '') + (save.cheers ? `${isPremium() ? ' ' : ''}♥ ${save.cheers}` : ''); $('#hLv').textContent = `LV ${save.level}`; $('#hXp').style.width = (save.xp / need(save.level) * 100) + '%';
  $('#hXpTxt').textContent = `SHARED ${save.xp}/${need(save.level)} XP · ${save.sp} shared point${save.sp === 1 ? '' : 's'}`;
  const hq = hx(save.hero), hs = HTREE[save.hero].reduce((a, n) => a + (hq.n[n.id] || 0), 0); $('#spBadge').textContent = save.sp || ''; $('#hpBadge').textContent = '';
  $('#hHeroLv').innerHTML = `<span class="htag">ONE SKILL POOL</span> ${save.sp} pt${save.sp === 1 ? '' : 's'} · shared + hero trees`; $('#bSnd').textContent = save.sound ? '♪ ON' : '♪ OFF'; setBannerBtns(); setMusBtns();
  const tp = tavernPending(); $('#homeBadge').textContent = tp ? `+${tp}` : villageReady() ? '!' : ''; $('#hGold').textContent = nfmt(save.gold);
  const H = HEROES[save.hero]; $('#heroIco').style.backgroundImage = `url(${heroIcon(save.hero)})`; $('#hName').textContent = H.name.toUpperCase();
  $('#hKitA').textContent = `${H.a1.name} · ${H.a2.name} · ${H.pas.name}`;
  const k = startKit(), kept = save.armory, spare = !k.weapon.smith, nm = keepCap() > 1 ? 'ARMORY' : 'HEIRLOOM';   // 0.6.0: say where each start item comes from
  if (LOAD.on) { $('#hKit').innerHTML = `Start: <span class="src">▸ LOADOUT ${kept.length}/${keepCap()}</span> ${kept.length ? `${kept.map(w => `<b style="color:${RCOL[w.rarity]}">${w.name}</b>`).join(', ')} <span class="c-bad">(lost if you die)</span>` : 'empty'} · <span class="src">SMITHY</span> ${k.smith.name}${spare ? ' (spare in bag)' : ''} · <span class="src">STASH</span> ${save.stash.length}/${stashCap()}${save.home.life ? ` · ♥ ${save.home.life}` : ''}`; $('#stashLbl').textContent = `▣ STASH ${save.stash.length}`; }   // 1.13.0
  else $('#hKit').innerHTML = `Start: ${kept.length ? `<span class="src">${nm}</span> ${kept.map(w => `<b style="color:${RCOL[w.rarity]}">★ ${w.name}</b> (${SLOTN[w.slot || 'weapon']})`).join(', ')} · ` : ''}<span class="src">SMITHY</span> ${k.smith.name}${spare ? ' (spare in bag)' : ''}${save.home.life ? ` · ♥ ${save.home.life} extra li${save.home.life > 1 ? 'ves' : 'fe'}` : ''}`;
  { const el = $('#hRes'); if (el) el.innerHTML = resLine(save.res, true) + (kitsOwned().length ? ` · <span class="src">KITS</span> ${kitsOwned().map(k => KITS[k].n).join(', ')}` : ''); }   // 1.14.0
  const pw = portalPick(), pc = pw ? portalCost(pw) : 0;   // 0.9.0 portal
  $('#bStart').textContent = pw ? `PORTAL · WAVE ${pw} · ${nfmt(pc)}G` : `START RUN · ${MAPS[save.map].name.toUpperCase()}`; $('#bStart').classList.toggle('portal', !!pw); $('#bMap').hidden = mapsOpen().length < 2;
  $('#bPortal').hidden = !save.home.portal; $('#bPortal').textContent = pw ? `⊙ W${pw}` : '⊙ OFF'; $('#bPortal').classList.toggle('on', !!pw);
  $('#hPortal').hidden = !pw; $('#hPortal').innerHTML = pw ? `<span class="src">PORTAL</span> ${MAPS[save.map].name} from <b>wave ${pw}</b> · <b class="${save.gold >= pc ? 'gold' : 'c-bad'}">−${pc}g</b> (bank ${save.gold})${save.portal.streak ? ` · streak x${(1 + PORTAL9.streak * Math.min(PORTAL9.streakCap, save.portal.streak)).toFixed(1)}` : ''} · next gear check <b>wave ${nextGear(pw)}</b> · portal cache + kit` : '';
  const zm = MAPS[save.map], zt = zm.threat || 1, zs = zt < 2 ? '' : `+${zm.lvl} waves, +${Math.round((zm.hp - 1) * 100)}% HP, +${Math.round((zm.dmg - 1) * 100)}% dmg, +${Math.round((zm.dens - 1) * 100)}% mobs, +${Math.round((zm.loot - 1) * 100)}% loot`;   // 1.5.0 zone threat: one line (or folded into the portal line) so the hub never grows
  $('#hMap').hidden = zt < 2 || !!pw; $('#hMap').className = `kit tiny zone z${zt}`; $('#hMap').innerHTML = zt < 2 ? '' : `<span class="src">ZONE ${ZONE_TAG[zt]}</span> ${zs}`;
  if (pw && zt >= 2) $('#hPortal').innerHTML = $('#hPortal').innerHTML.replace(' · portal cache + kit', ` · <span class="zt z${zt}">ZONE ${ZONE_TAG[zt]}</span>`);
  $('#homeLbl').textContent = `VILLAGE ${villageScore()}/${VMAX}`;
  $('#bRaid').hidden = !raidBoardVisible(); $('#raidLbl').textContent = `🏆 RAIDS ${raidTotal(save)}/${RAIDS.length}`; $('#raidBadge').textContent = raidReady() ? '!' : '';   // 1.4.0
  $('#best').innerHTML = save.runs ? `BEST: WAVE ${save.best.wave} · ${fmtT(save.best.time)} · ${save.best.kills} KILLS<br>RUNS ${save.runs} · SLAIN ${save.totalKills} · BOSSES ${save.bossKills}${raidTotal(save) ? ` · RAID TROPHIES ${raidTotal(save)}/${RAIDS.length}` : ''}` : 'The ash fields stir. Survive as long as you can.';
  drawVillage($('#hubVillage'), performance.now());
}
let skSel = 'vit', skTab = 'shared', hkSel = null;
function canLearn(s) { return save.sp > 0 && rank(s.id) < s.max && (!s.req || rank(s.req) > 0); }
function setSkTab(t) { skTab = t === 'hero' ? 'hero' : 'shared'; renderSkills(); }
function drawLines(tree, list, rk, needR) {
  requestAnimationFrame(() => { const svg = $('#treeLines'), tb = tree.getBoundingClientRect(); let h = '';
    for (const s of list) if (s.req) { const ea = tree.querySelector(`[data-id="${s.req}"]`), eb = tree.querySelector(`[data-id="${s.id}"]`); if (!ea || !eb) continue; const a = ea.getBoundingClientRect(), b = eb.getBoundingClientRect(), on = rk(s.req) >= (typeof needR === 'function' ? needR(s) : needR);
      h += `<line x1="${a.left + a.width / 2 - tb.left}" y1="${a.top + a.height / 2 - tb.top}" x2="${b.left + b.width / 2 - tb.left}" y2="${b.top + b.height / 2 - tb.top}" stroke="${rk(s.id) ? '#38b764' : on ? '#ffcd75' : '#566c86'}" stroke-width="4" stroke-dasharray="${rk(s.id) ? '' : '4 4'}"/>`; }
    svg.innerHTML = h; });
}
function nodeBtn(s, r, locked, sel) { const b = document.createElement('button');
  b.className = 'node' + (locked ? ' locked' : '') + (r ? ' has' : '') + (r >= s.max ? ' max' : '') + (sel ? ' sel' : ''); b.style.gridColumn = s.col + 1; b.dataset.id = s.id;
  b.innerHTML = `<span class="ni">${s.ico}</span><span>${s.name.length > 9 ? s.name.slice(0, 8) + '.' : s.name}</span><span class="nr">${r}/${s.max}</span>`; return b; }
function renderSkills() {
  const tree = $('#tree'), hero = skTab === 'hero', H = HEROES[save.hero], q = hx(save.hero);
  tree.querySelectorAll('.node,.thead').forEach(n => n.remove()); tree.classList.toggle('htree', hero); $('#skills').classList.toggle('hero', hero);
  $('#tabShared').classList.toggle('on', !hero); $('#tabHero').classList.toggle('on', hero);
  $('#tabShared').innerHTML = `SHARED <span class="badge">${save.sp || ''}</span>`; $('#tabHero').innerHTML = `${H.name.toUpperCase()} <span class="badge">${save.sp || ''}</span>`;   // 1.7.0 one pool
  $('#skTitle').textContent = hero ? `${H.name.toUpperCase()} TREE` : 'SHARED TREE';
  $('#skPts').textContent = `LV ${save.level} · ${save.sp} pt${save.sp === 1 ? '' : 's'} (one pool)`;
  $('#heroChips').hidden = !hero; $('#bRespec').hidden = false; $('#hxBar').hidden = true;   // 1.7.0: no hero XP bar, respec on both tabs
  if (!hero) {
    for (const s of SKILLS) { const b = nodeBtn(s, rank(s.id), s.req && rank(s.req) === 0, skSel === s.id); b.style.gridRow = s.row + 1; b.onclick = () => { skSel = s.id; renderSkills(); }; tree.appendChild(b); }
    drawLines(tree, SKILLS, rank, 1);
    const s = SK[skSel], r = rank(s.id);
    $('#skDetail').innerHTML = `<div class="tiny src">SHARED · every hero</div><h3>${s.ico} ${s.name} <span class="tiny">${r}/${s.max}</span></h3><p>${s.per}</p><p>Now: <b>${r ? s.d(r) : '—'}</b></p>${r < s.max ? `<p>Next: <b>${s.d(r + 1)}</b></p>` : '<p><b>MAXED</b></p>'}${s.req && !rank(s.req) ? `<p class="c-rare">Needs 1 point in ${SK[s.req].name}</p>` : ''}<p class="tiny">One skill pool: 1 point per account level, spent here or on any hero tree. ${SKILLS.length} nodes · ${SKILLS.reduce((a, n) => a + n.max, 0)} ranks.</p>`;
    $('#skDetail').insertAdjacentHTML('beforeend', `<button class="pxbtn small" data-guide="skill-${s.id}">GUIDE · ${s.name}</button>`); $('#bLearn').disabled = !canLearn(s); $('#bLearn').textContent = save.sp ? 'LEARN (1 PT)' : 'NO POINTS'; return;
  }
  const T = HTREE[save.hero]; if (!hkSel || !T.some(n => n.id === hkSel)) hkSel = T[0].id;
  HCOLS[save.hero].forEach((c, i) => { const d = document.createElement('div'); d.className = 'thead'; d.style.gridColumn = i + 1; d.style.gridRow = 1; d.textContent = c; tree.appendChild(d); });
  const hr = id => q.n[id] || 0;
  for (const n of T) { const b = nodeBtn(n, hr(n.id), n.req && hr(n.req) < hreqR(n), hkSel === n.id); b.style.gridRow = n.row + 2; b.onclick = () => { hkSel = n.id; renderSkills(); }; tree.appendChild(b); }
  drawLines(tree, T, hr, hreqR);
  $('#heroChips').innerHTML = HERO_IDS.filter(h => save.heroes[h]).map(h => `<button class="chip${h === save.hero ? ' on' : ''}" data-h="${h}">${HEROES[h].name}</button>`).join('') + (HERO_IDS.some(h => !save.heroes[h]) ? '<span class="tiny">recruit more at the Hero Hall</span>' : '');
  $('#heroChips').querySelectorAll('[data-h]').forEach(b => b.onclick = () => { if (b.dataset.h !== save.hero && selectHero(b.dataset.h)) { setKitButtons(save.hero); sfx('swap'); toast(`${HEROES[save.hero].name} will lead the next run`); } renderSkills(); });
  const n = HN[hkSel], r = hr(n.id);
  $('#skDetail').innerHTML = `<div class="tiny src hsrc">${H.name.toUpperCase()} ONLY · ${HCOLS[save.hero][n.col]}</div><h3>${n.ico} ${n.name} <span class="tiny">${r}/${n.max}</span></h3><p>${n.per}</p><p>Now: <b>${r ? n.d(r) : '—'}</b></p>${r < n.max ? `<p>Next: <b>${n.d(r + 1)}</b></p>` : '<p><b>MAXED</b></p>'}${n.req && hr(n.req) < hreqR(n) ? `<p class="c-rare">Needs ${hreqR(n)} rank${hreqR(n) > 1 ? 's' : ''} in ${HN[n.req].name}</p>` : ''}<p class="tiny">Same point pool as the shared tree (1 per account level). Ranks here only work while ${H.name} leads the run.</p>`;
  $('#skDetail').insertAdjacentHTML('beforeend', `<button class="pxbtn small" data-guide="skill-${n.id}">GUIDE · ${n.name}</button>`); $('#bLearn').disabled = !canLearnH(n); $('#bLearn').textContent = save.sp ? 'LEARN (1 PT)' : 'NO POINTS';
}
$('#tabShared').onclick = () => setSkTab('shared'); $('#tabHero').onclick = () => setSkTab('hero');
$('#bLearn').onclick = () => { if (skTab === 'hero') { if (learnH(hkSel)) { sfx('lvl'); renderSkills(); } return; } const s = SK[skSel]; if (!canLearn(s)) return; save.sp--; save.skills[s.id] = rank(s.id) + 1; persist(); sfx('lvl'); renderSkills(); };
$('#bRespec').onclick = () => { const hs = HERO_IDS.reduce((a, h) => a + Object.values(hx(h).n).reduce((x, y) => x + y, 0), 0), spent = Object.values(save.skills).reduce((a, b) => a + b, 0) + hs; if (!spent) { toast('No points spent yet'); return; } if (!confirm(`RESPEC: refund all ${spent} points (shared tree + every hero tree) into the one pool? (free)`)) return; save.sp += spent; save.skills = {}; for (const h of HERO_IDS) hx(h).n = {}; persist(); renderSkills(); };   // 1.7.0 one pool: respec refunds everything

/* 1.0.0 hub RESET PROGRESS: two steps (CONTINUE, then type WIPE). Clears the one save key and reloads first-launch defaults (sound + loot filter too). Never during a run. */
const WIPE_WORD = 'WIPE';
function wipeSummary() { const s = save, hl = HERO_IDS.filter(h => s.heroes[h]).map(h => `${HEROES[h].name} LV ${hx(h).lv}`).join(', '), sp = Object.values(s.skills).reduce((a, b) => a + b, 0) + s.sp;
  return [`Account LV ${s.level} · ${sp} shared skill point${sp === 1 ? '' : 's'}`, `Heroes + hero trees: ${hl}`, `${nfmt(s.gold)} gold in the bank`, `Village ${villageScore()}/${VMAX} (all buildings, Portal Circle L${s.home.portal || 0})`, `Armory: ${s.armory.length} kept item${s.armory.length === 1 ? '' : 's'}`,
    `Bests: wave ${s.best.wave} · ${s.runs} runs · ${nfmt(s.totalKills)} slain · bestiary`, `Portal: ${s.portal.uses} uses · Gear checks passed: ${s.gc.reduce((a, b) => a + b, 0)}`, `Maps opened: ${mapsOpen().length}/${Object.keys(MAPS).length} · settings (sound, loot filter, banners)`]; }
function renderWipe() { $('#wipeList').innerHTML = wipeSummary().map(l => `<li>${l}</li>`).join(''); $('#wipeList').hidden = $('#wipeHint').hidden = false; $('#wipeS1').hidden = false; $('#wipeS2').hidden = true; $('#wipeIn').value = ''; $('#bWipe2').disabled = true; }
const wipeReady = () => $('#wipeIn').value.trim().toUpperCase() === WIPE_WORD;
function wipeSave() {
  if (mode === 'run') return false; try { localStorage.removeItem(SKEY); } catch (e) {}
  const prem = save.premium === true; save = defSave(); save.premium = prem; persist(); mode = 'hub';   // 1.9.0: Premium is a purchase, kept R = null; skSel = 'vit'; skTab = 'shared'; hkSel = null; keepPicks = []; heirOpts = []; heirEq = 0; vSel = null;
  setKitButtons(save.hero); showScreen('hub'); toast('Progress wiped: fresh start'); return true;
}
$('#bWipe').onclick = () => { if (mode !== 'run') showScreen('wipe'); };
$('#bWipe1').onclick = () => { $('#wipeS1').hidden = true; $('#wipeS2').hidden = false; $('#wipeList').hidden = $('#wipeHint').hidden = true; $('#wipeIn').value = ''; $('#bWipe2').disabled = true; try { $('#wipeIn').focus(); } catch (e) {} };
$('#wipeIn').oninput = () => { $('#bWipe2').disabled = !wipeReady(); };
$('#bWipe2').onclick = () => { if (wipeReady()) wipeSave(); };
$('#bWipeNo').onclick = $('#bWipeNo1').onclick = () => openSettings();   // 1.9.0: back to Settings (RESET PROGRESS lives there)
function renderUnlocks() {
  const g = VILLAGE.gate.levels[0], items = [{ kind: 'MAP', name: 'Ashen Field', need: 'Starting map', st: 'PLAYABLE', open: true },
    { kind: 'MAP', name: 'Bone Crypt', need: MAPS.crypt.d, open: !!save.home.gate, st: save.home.gate ? 'PLAYABLE · pick it on START' : `Build the WAYGATE: ${g.need} (${g.prog(save)}) + ${g.cost}g` },
    { kind: 'MAP', name: 'Frost Spire', need: MAPS.frost.d, open: save.home.gate >= 2, st: save.home.gate >= 2 ? 'PLAYABLE · pick it on START' : `Upgrade the WAYGATE to tier 2: ${VILLAGE.gate.levels[1].need} (${VILLAGE.gate.levels[1].prog(save)}) + ${nfmt(VILLAGE.gate.levels[1].cost)}g${save.home.gate ? '' : ' (build the Waygate first)'}` },
    ...HERO_IDS.map(id => { const H = HEROES[id], own = !!save.heroes[id]; return { kind: 'HERO', name: H.name, need: `${H.a1.name} + ${H.a2.name} · ${H.pas.name}`, open: own,
      st: own ? (save.hero === id ? 'PLAYABLE · SELECTED' : 'PLAYABLE · choose at the Hero Hall') : `Hero Hall + ${H.gate.need} (${H.gate.prog(save)}) + ${nfmt(H.gate.cost)}g` }; }),
    ...RAIDS.map(D => { const open = raidOpenFor(save, D.id), k = raidKills(save, D.id); return { kind: 'RAID', name: `${D.name}, ${D.title.toLowerCase()}`, need: `${D.arena} · band wave ${D.W} · ${D.phases.length} phases`, open,   // 1.4.0
      st: k ? `★ TROPHY · ${k} kill${k > 1 ? 's' : ''} · CHALLENGE AGAIN from 🏆 RAIDS` : open ? 'OPEN · CHALLENGE it from 🏆 RAIDS' : D.gate.map(g => `${g.ok(save) ? '✓' : '✗'} ${g.need} (${g.prog(save)})`).join(' · ') }; })];
  $('#unlockList').innerHTML = items.map(u => `<div class="card ul ${u.open ? '' : 'off'}"><span class="tiny">${u.kind}</span><h3>${u.open ? '' : '🔒 '}${u.name}</h3><span class="tiny">${u.need}</span><div class="st">${u.st}</div></div>`).join('');
}
function renderHeroes() {
  const hall = !!save.home.hall; $('#heroGold').textContent = `${nfmt(save.gold)} gold`;
  $('#heroNote').textContent = hall ? 'Each hero has its own two abilities and a passive. Your pick is used from the next run.' : `Build the HERO HALL in the village (${nfmt(VILLAGE.hall.levels[0].cost)}g + ${VILLAGE.hall.levels[0].need.toLowerCase()}) to recruit new heroes.`;
  const ck = (ok, s) => `<span class="${ok ? 'ok' : 'no'}">${ok ? '✓' : '✗'} ${s}</span>`;
  $('#heroList').innerHTML = HERO_IDS.map(id => { const H = HEROES[id], own = !!save.heroes[id], cur = save.hero === id; let act;
    if (own) act = cur ? `<button class="pxbtn small" disabled>SELECTED</button>` : `<button class="pxbtn small go" data-pick="${id}">CHOOSE</button>`;
    else { const G = H.gate; act = `<div class="gate">${ck(hall, 'Hero Hall')} ${ck(G.ok(save), `${G.need} (${G.prog(save)})`)} ${ck(save.gold >= G.cost, nfmt(G.cost) + 'g')}</div><button class="pxbtn small${heroCan(id) ? ' go' : ''}" data-recruit="${id}" ${heroCan(id) ? '' : 'disabled'}>RECRUIT ${nfmt(G.cost)}G</button>`; }
    return `<div class="card hcard${cur ? ' cur' : ''}${own ? '' : ' off'}" data-h="${id}"><i style="background-image:url(${heroIcon(id, 5)})"></i><div class="bt"><h3>${H.name}${cur ? ' <span class="tiny">★ SELECTED</span>' : ''}</h3><p class="tiny">${H.d}</p>`
      + `<p><button class="guideLink" data-guide="ability-${H.a1.id}">${H.a1.name} ?</button> <span class="tiny">${H.a1.cd}s</span> ${H.a1.d}</p><p><button class="guideLink" data-guide="ability-${H.a2.id}">${H.a2.name} ?</button> <span class="tiny">${H.a2.cd}s</span> ${H.a2.d}</p><p><button class="guideLink" data-guide="passive-${id}">${H.pas.name} ?</button> <span class="tiny">passive</span> ${H.pas.d}</p><div class="row">${act}</div></div></div>`; }).join('');
  $('#heroList').querySelectorAll('[data-pick]').forEach(b => b.onclick = () => { if (selectHero(b.dataset.pick)) { sfx('swap'); setKitButtons(save.hero); toast(`${HEROES[save.hero].name} will lead the next run`); } renderHeroes(); });
  $('#heroList').querySelectorAll('[data-recruit]').forEach(b => b.onclick = () => { const id = b.dataset.recruit; if (recruit(id)) { selectHero(id); setKitButtons(id); sfx('lvl'); toast(`${HEROES[id].name} recruited and selected!`); } renderHeroes(); });
}
document.querySelectorAll('.back').forEach(b => b.onclick = () => showScreen('hub')); $('#wipe .back').onclick = () => openSettings();
$('#bHome').onclick = () => showScreen('home'); $('#bRaid').onclick = () => showScreen('raids'); $('#bSkills').onclick = () => showScreen('skills'); $('#bUnlocks').onclick = () => showScreen('unlocks'); $('#bHow').onclick = () => showScreen('howto');
$('#tutNext').onclick = () => { tutPg = Math.min(TUT_PAGES.length - 1, tutPg + 1); sfx('swap'); tutRender(); }; $('#tutBack').onclick = () => { tutPg = Math.max(0, tutPg - 1); tutRender(); }; $('#tutSkip').onclick = () => { tutSkip(); toast('Tutorial skipped (HOW TO -> REPLAY TUTORIAL)'); }; $('#tutGo').onclick = () => tutStart(); $('#tutDone').onclick = () => tutDone(); $('#coachSkip').onclick = e => { e.stopPropagation(); tutSkip(); toast('Tutorial skipped'); }; $('#bTutReplay').onclick = () => tutReplay();   // 1.7.1
$('#bHero').onclick = () => showScreen('heroes');
$('#bMap').onclick = () => { const m = mapsOpen(); setMap(m[(m.indexOf(save.map) + 1) % m.length]); renderHub(); sfx('swap'); };
$('#bSnd').onclick = () => toggleSound();   // ♪ = master mute (SFX + music), as before; same code path as SETTINGS ♪   // ♪ = master mute (SFX + music), as before
const toggleMusic = () => { save.music = !save.music; persist(); audApply(); renderHub(); setMusBtns(); sfx('swap'); toast(save.music ? 'Music on' : 'Music off (sound effects stay on)'); return save.music; };   // 1.8.0 ♫
function setMusBtns() { const l = save.music ? '♫ ON' : '♫ OFF'; $('#bMus').textContent = l; $('#bMusP').textContent = `MUSIC: ${save.music ? 'ON' : 'OFF'}${save.sound ? '' : ' (♪ is off)'}`; $('#bMus').classList.toggle('dim', !save.sound); }
$('#bMus').onclick = toggleMusic; $('#bMusP').onclick = toggleMusic;
$('#bBanner').onclick = () => { cycleBanner(); sfx('swap'); };   // 1.3.0
$('#bBannerP').onclick = () => { cycleBanner(); sfx('swap'); };
$('#bStart').onclick = () => startRun();   // 1.13.0: no run-start cover dialog
$('#bStash').onclick = () => showScreen('stash'); $('#stAuto').onclick = () => { const n = autoKit(); sfx('swap'); toast(`Auto-kit: ${n} piece${n === 1 ? '' : 's'} in your loadout`); stSel = null; renderStash(); };
$('#bPortal').onclick = () => { cyclePortal(); renderHub(); sfx('swap'); };
$('#bResume').onclick = () => setPause(false);
$('#bAbandon').onclick = () => { paused = false; endRun(false); };
$('#bHub').onclick = () => backToCamp();   // 1.9.0: interstitial (when due) before the camp

/* ---------------- village (homestead) — 0.4.0: 400x200 world, pannable view, tiers, scenic layers, build animations ---------------- */
const VWW = 400, VWH = 200, WOOD = '#8b5a2b', WOOD2 = '#5a4630', DIRT = '#6e5a3e', DIRT2 = '#7d6848';
let vSel = null, vDrawT = 0, vCam = { x: 16, y: 28 }, vPan = null, vAnim = null, vDrag = null;
// plots in world space (x, y = top-left, w x h box). cards = village/home cards that live on this plot (first = the plot's own)
const VPLOTS = [
  { k: 'tower', x: 14, y: 54, w: 24, h: 24, lbl: 'TOWER', cards: ['tower'] },
  { k: 'hall', x: 58, y: 54, w: 24, h: 24, lbl: 'HALL', cards: ['hall'] },
  { k: 'tavern', x: 100, y: 36, w: 36, h: 42, lbl: 'TAVERN', cards: ['tavern', 'inn', 'slayer'] },
  { k: 'smithy', x: 150, y: 54, w: 24, h: 24, lbl: 'SMITHY', cards: ['smithy', 'forge'] },
  { k: 'gate', x: 192, y: 54, w: 24, h: 24, lbl: 'WAYGATE', cards: ['gate'] },
  { k: 'watch', x: 234, y: 42, w: 20, h: 36, lbl: 'WATCH', cards: ['watch'] },
  { k: 'market', x: 268, y: 56, w: 84, h: 22, lbl: 'MARKET', cards: ['market'] },
  { k: 'hearth', x: 26, y: 104, w: 24, h: 24, lbl: 'HEARTH', cards: ['hearth', 'fire'] },
  { k: 'garden', x: 66, y: 106, w: 60, h: 30, lbl: 'GARDEN', cards: ['garden'] },
  { k: 'statue', x: 166, y: 108, w: 24, h: 24, lbl: 'STATUE', cards: ['statue'] },
  { k: 'fountain', x: 212, y: 118, w: 24, h: 16, lbl: 'FOUNTAIN', cards: ['fountain'] },
  { k: 'trophy', x: 262, y: 108, w: 24, h: 20, lbl: 'TROPHIES', cards: ['trophy'] },
  { k: 'armory', x: 296, y: 100, w: 36, h: 30, lbl: 'ARMORY', cards: ['armory'] },   // 0.6.0
  { k: 'portal', x: 220, y: 146, w: 28, h: 24, lbl: 'PORTAL', cards: ['portal'] },   // 0.9.0 below the plaza
  // line decorations: the box is the sign / tap anchor, the pieces spread across the town
  { k: 'wall', x: 6, y: 98, w: 10, h: 14, line: true, lbl: 'WALL', cards: ['wall'] },
  { k: 'banners', x: 372, y: 60, w: 10, h: 18, line: true, lbl: 'BANNERS', cards: ['banners'] },
  { k: 'lanterns', x: 136, y: 98, w: 10, h: 14, line: true, lbl: 'LANTERNS', cards: ['lanterns'] },
];
const PLOT_OF = Object.fromEntries(VPLOTS.flatMap(P => P.cards.map(c => [c, P])));
const BANNERS = [46, 88, 143, 222, 258, 358, 384], LANTERNS = [8, 58, 132, 160, 244, 292, 330, 374];
const PLAZA = { x: 200, y: 128, rx: 54, ry: 20 };
const COTTAGES = [[240, 10, 'r1'], [336, 120, 'n'], [366, 106, 'r2'], [300, 142, 'r3'], [338, 150, 'r1'], [372, 138, 'n'], [4, 134, 'r2'], [40, 154, 'r3'], [140, 152, 'n'], [252, 152, 'r1'], [70, 12, 'r2'], [332, 14, 'n']];
const inBox = (px, py, x, y, w, h) => px >= x && px < x + w && py >= y && py < y + h;
function vBlocked(px, py) {   // keep trees off roads, plots, plaza, stream, pen and cottages
  if (py > 72 && py < 104) return true; if (py > 168 && py < 196) return true; if (px > 186 && px < 214 && py > 90) return true;
  if (((px - PLAZA.x) / (PLAZA.rx + 8)) ** 2 + ((py - PLAZA.y) / (PLAZA.ry + 10)) ** 2 < 1) return true;
  if (inBox(px, py, 58, 98, 76, 76)) return true;
  if (VPLOTS.some(P => inBox(px, py, P.x - 8, P.y - 10, P.w + 14, P.h + 14))) return true;
  if (inBox(px, py, 160, 0, 32, 38) || inBox(px, py, 124, 132, 20, 20)) return true;   // 1.2.0 windmill + well
  return COTTAGES.some(([cx, cy]) => inBox(px, py, cx - 8, cy - 10, 30, 30));
}
const VTREES = (() => { const out = []; for (let i = 0; i < 900 && out.length < 64; i++) { const tx = 2 + Math.floor(hash(i, 41) * (VWW - 10)), ty = 6 + Math.floor(hash(i, 43) * (VWH - 16)); if (!vBlocked(tx + 3, ty + 4) && !out.some(([a, b]) => Math.abs(a - tx) < 8 && Math.abs(b - ty) < 7)) out.push([tx, ty, hash(i, 47)]); } return out; })();
const vPts = (k, l) => ON18 && k === 'apoth' ? 0 : ON18 && k === 'watch' ? Math.min(l || 0, 1) : k === 'portal' ? PORTAL_OLD.slice(1).filter(w => w <= PORTAL_W[clamp(l | 0, 0, PORTAL_W.length - 1)]).length : Math.min(l || 0, VILLAGE[k].levels.length);   // 1.14.0: the 11-band portal still scores its 6 classic milestones (21/31/41/61/81/101), so village N/34 is unchanged
const VMAX = 3 + VKEYS.reduce((n, k) => n + vPts(k, VILLAGE[k].levels.length), 0);
function villageScore() { const h = save.home; return 2 + (h.smithy ? 1 : 0) + VKEYS.reduce((n, k) => n + vPts(k, h[k] || 0), 0); }
function villageReady() { return VKEYS.some(villageCan) || HERO_IDS.some(heroCan) || (!save.home.smithy && save.gold >= HOME.smithy.cost); }
function plotState(k) { const h = save.home; if (k === 'tavern' || k === 'hearth') return 1; if (k === 'smithy') return h.smithy ? 1 : 0; if (k === 'tower') return -1; return h[k] || 0; }
function plotReady(k) { if (VILLAGE[k]) return villageCan(k); if (k === 'smithy') return !save.home.smithy && save.gold >= HOME.smithy.cost; return false; }
const plotUpgrade = P => P.cards.some(c => VILLAGE[c] && villageCan(c));
function camFor(c, now) {
  const mx = VWW - c.width, my = VWH - c.height;
  if (c.id === 'hubVillage') return { x: Math.round(clamp(mx / 2 + mx / 2 * 0.95 * Math.sin(now / 9000), 0, mx)), y: Math.round(clamp(my / 2 + my / 2 * 0.9 * Math.sin(now / 13000 + 1), 0, my)) };
  if (vPan) { const k = clamp((performance.now() - vPan.t0) / 450, 0, 1), e = 1 - (1 - k) ** 3; vCam.x = vPan.fx + (vPan.tx - vPan.fx) * e; vCam.y = vPan.fy + (vPan.ty - vPan.fy) * e; if (k >= 1) vPan = null; }
  vCam.x = clamp(vCam.x, 0, mx); vCam.y = clamp(vCam.y, 0, my); return { x: Math.round(vCam.x), y: Math.round(vCam.y) };
}
function panTo(k, instant) { const P = PLOT_OF[k] || VPLOTS.find(p => p.k === k), c = $('#villageCv'); if (!P || !c) return;
  const tx = clamp(P.x + P.w / 2 - c.width / 2, 0, VWW - c.width), ty = clamp(P.y + P.h / 2 - c.height / 2, 0, VWH - c.height);
  if (instant) { vCam.x = tx; vCam.y = ty; vPan = null; } else vPan = { fx: vCam.x, fy: vCam.y, tx, ty, t0: performance.now() }; }
// build / upgrade animation: built = brand-new plot (rise from scaffold + dust), otherwise an upgrade (flash + sparkles)
function vAnimate(k, t0 = performance.now(), fresh) { const P = PLOT_OF[k]; if (!P) return; vAnim = { k: P.k, t0, fresh: !!fresh }; }
const fr = (x, c, X, Y, w, h) => { x.fillStyle = c; x.fillRect(X, Y, w, h); };
/* ---------------- 1.2.0 village art kit: memoised 1-px pieces, light from the top-left, growth layers keyed on villageScore() ---------------- */
const VCACHE = new Map();
function vMemo(key, w, h, draw) { let c = VCACHE.get(key); if (c) return c; c = document.createElement('canvas'); c.width = Math.max(1, w); c.height = Math.max(1, h); const x = c.getContext('2d'); x.imageSmoothingEnabled = false; draw(x); VCACHE.set(key, c); if (VCACHE.size > 260) VCACHE.delete(VCACHE.keys().next().value); return c; }
// ramps: [outline, shade, mid, light]
const VR = { red: ['#3b1a2a', '#7a2a3f', '#b13e53', '#ef7d57'], blue: ['#141a3a', '#29366f', '#3b5dc9', '#41a6f6'], teal: ['#10292e', '#1d4f57', '#257179', '#3e9a9e'], plum: ['#1f0f24', '#3d1a40', '#5d275d', '#8a4a80'],
  slate: ['#1a1c2c', '#333c57', '#566c86', '#94b0c2'], thatch: ['#2e2216', '#6b5232', '#9a7840', '#c8a060'], plat: ['#333c57', '#94b0c2', '#c8d6e0', '#f4f4f4'], gold: ['#4a2a10', '#a0602a', '#ef9d47', '#ffcd75'], moss: ['#10241a', '#1f4a2a', '#38704a', '#5a9a5a'] };
const VWALL = { plaster: ['#4a3424', '#b8a888', '#e0d2b0', '#f4ead0'], stone: ['#1a1c2c', '#333c57', '#566c86', '#94b0c2'], wood: ['#2e2216', '#5a4630', '#8b5a2b', '#a8743a'], cream: ['#4a3424', '#c8a878', '#e8cc98', '#f8e4b8'] };
const VROOF_OF = { n: 'red', r1: 'blue', r2: 'teal', r3: 'plum' };
const roadTier = sc => sc >= 24 ? 3 : sc >= 16 ? 2 : sc >= 8 ? 1 : 0;   // dirt path -> gravel road -> cobbles -> dressed stone
const homeTier = sc => sc >= 22 ? 2 : sc >= 11 ? 1 : 0;                // cottages: thatch shacks -> tiled cottages -> two-storey townhouses
const ROAD_N = ['DIRT PATH', 'GRAVEL ROAD', 'COBBLES', 'DRESSED STONE'];
function vWin(x, wx, wy, gw, gh, lit, o, R) {
  fr(x, '#2e2216', wx - 1, wy - 1, gw + 2, gh + 2); fr(x, lit ? '#ffcd75' : '#29366f', wx, wy, gw, gh);
  if (lit) { fr(x, '#ef9d47', wx, wy + gh - 1, gw, 1); fr(x, '#f4ead0', wx, wy, 1, 1); } else { fr(x, '#3b5dc9', wx, wy + gh - 1, gw, 1); fr(x, '#41a6f6', wx, wy, 1, 1); }
  if (gw >= 4) fr(x, '#5a4630', wx + (gw >> 1), wy, 1, gh); if (gh >= 4) fr(x, '#5a4630', wx, wy + (gh >> 1), gw, 1);
  fr(x, '#94b0c2', wx - 1, wy + gh + 1, gw + 2, 1);
  if (o.shut) { fr(x, R[1], wx - 2, wy - 1, 1, gh + 2); fr(x, R[1], wx + gw + 1, wy - 1, 1, gh + 2); fr(x, R[2], wx - 2, wy, 1, 1); fr(x, R[2], wx + gw + 1, wy, 1, 1); }
  if (o.boxes) { fr(x, '#5a4630', wx - 1, wy + gh + 2, gw + 2, 1); for (let i = 0; i < gw + 2; i++) fr(x, i % 2 ? '#38b764' : ['#b13e53', '#ffcd75', '#e8a0b0'][(wx + i) % 3], wx - 1 + i, wy + gh + 1, 1, 1); }
}
// one parametric building: w x wh walls (fl floors) under an rh-tall roof ('side' trapezoid, 'gable' front triangle); X = left, B = ground line
function drawHouse(x, X, B, o) {
  const { w, wh, rh } = o, R = VR[o.roof] || VR.red, M = VWALL[o.wall] || VWALL.plaster, top = B - wh, rt = top - rh, fl = o.fl || 1, fh = Math.floor((wh - 2) / fl), ov = o.ov ?? 2;
  x.fillStyle = 'rgba(6,10,16,.34)'; x.fillRect(X + 2, B, w + 1, 2); x.fillRect(X + w, top + 1, 2, wh);   // cast shadow (down-right)
  fr(x, M[0], X, top, w, wh); fr(x, M[2], X + 1, top, w - 2, wh - 1); fr(x, M[3], X + 1, top, 1, wh - 1); fr(x, M[1], X + w - 2, top, 1, wh - 1);
  if (o.wall === 'stone') for (let yy = top + 2, r = 0; yy < B - 2; yy += 3, r++) { fr(x, M[1], X + 1, yy, w - 2, 1); for (let xx = X + 1 + (r % 2) * 2; xx < X + w - 1; xx += 4) { fr(x, M[1], xx, yy - 2, 1, 2); if (hash(xx, yy) < 0.4) fr(x, M[3], xx + 1, yy - 2, 1, 1); } }
  else if (o.wall === 'wood') for (let xx = X + 3; xx < X + w - 1; xx += 3) { fr(x, M[1], xx, top, 1, wh - 2); if (hash(xx, top) < 0.5) fr(x, M[0], xx - 1, top + 2 + Math.floor(hash(xx, 3) * (wh - 5)), 1, 1); }
  else { for (let i = 0; i < w * wh / 9; i++) fr(x, M[1], X + 1 + Math.floor(hash(i, X + w) * (w - 2)), top + Math.floor(hash(i, B + wh) * (wh - 2)), 1, 1);
    if (o.timber) { const T = '#4a3424'; fr(x, T, X + 1, top, 1, wh - 2); fr(x, T, X + w - 2, top, 1, wh - 2); fr(x, T, X + 1, top, w - 2, 1); for (let f = 1; f < fl; f++) fr(x, T, X + 1, B - 2 - fh * f, w - 2, 1);
      if (fl > 1) for (let f = 1; f < fl; f++) { const y0 = B - 2 - fh * (f + 1) + 1, y1 = B - 2 - fh * f; for (let k = 0; k < y1 - y0; k++) { fr(x, T, X + 2 + k, y0 + k, 1, 1); fr(x, T, X + w - 3 - k, y0 + k, 1, 1); } } } }
  for (let xx = X; xx < X + w; xx += 3) { fr(x, '#566c86', xx, B - 2, 3, 2); fr(x, '#94b0c2', xx, B - 2, 2, 1); fr(x, '#333c57', xx + 2, B - 2, 1, 2); }   // foundation
  fr(x, M[0], X, B - 1, w, 1);
  const dw = o.dw || (w >= 24 ? 6 : 4), dh = Math.min(o.dh || 7, fh), dx = o.door === 'l' ? X + 3 : o.door === 'r' ? X + w - dw - 3 : X + ((w - dw) >> 1), dy = B - 2 - dh;
  if (o.door) { fr(x, '#2e2216', dx - 1, dy - 1, dw + 2, dh + 1); fr(x, o.doorC || '#8b5a2b', dx, dy, dw, dh); for (let i = 1; i < dw; i += 2) fr(x, '#5a4630', dx + i, dy + 1, 1, dh - 1); fr(x, '#2e2216', dx, dy, 1, 1); fr(x, '#2e2216', dx + dw - 1, dy, 1, 1);
    fr(x, '#ffcd75', dx + dw - 2, dy + (dh >> 1) + 1, 1, 1); fr(x, '#c8d6e0', dx - 1, B - 2, dw + 2, 1); if (dw >= 6) fr(x, '#2e2216', dx + (dw >> 1), dy, 1, dh); }
  const gw = o.big ? 5 : 3, gh = 4;
  for (let f = 0; f < fl; f++) { const n = o.win ?? 2, wy = f === 0 && o.door ? Math.max(top + 2, dy + 1) : B - 2 - fh * (f + 1) + Math.max(1, (fh - gh) >> 1);
    for (let i = 0; i < n; i++) { const wx = X + Math.round((i + 1) * w / (n + 1)) - (gw >> 1); if (f === 0 && o.door && wx + gw + 1 > dx - 1 && wx - 1 < dx + dw + 1) continue; if (wy < top + 1) continue; vWin(x, wx, wy, gw, gh, o.lit && hash(i + f * 7, w + wh) > 0.25, o, R); } }
  x.fillStyle = 'rgba(6,10,16,.3)'; x.fillRect(X + 1, top, w - 2, 1);   // eave shadow
  const slope = o.slope ?? 0.6;
  for (let r = 0; r < rh; r++) { const y = rt + r;
    if (o.style === 'gable') { const cx = X + w / 2, half = Math.max(1, Math.round((r + 1) * (w / 2 + ov) / rh)), L = Math.round(cx - half), RR = Math.round(cx + half), t = Math.min(3, half);
      if (r === rh - 1) { fr(x, R[0], X - ov, y, w + ov * 2, 1); fr(x, R[1], X - ov + 1, y, w + ov * 2 - 2, 1); continue; }
      fr(x, M[2], L, y, RR - L, 1); if (o.timber && o.wall !== 'stone') fr(x, '#4a3424', Math.floor(cx), y, 1, 1); else if (o.wall === 'stone' && r % 3 === 2) fr(x, M[1], L, y, RR - L, 1);
      fr(x, R[0], L, y, 1, 1); fr(x, R[3], L + 1, y, Math.max(0, t - 1), 1); fr(x, R[2], RR - t, y, Math.max(0, t - 1), 1); fr(x, R[0], RR - 1, y, 1, 1);
      if (r % 2 === 0) { fr(x, R[2], L + 2, y, 1, 1); fr(x, R[1], RR - 2, y, 1, 1); } continue; }
    const inset = Math.round((rh - 1 - r) * slope), L = X - ov + inset, RR = X + w + ov - inset, W = RR - L; if (W <= 0) continue;
    if (r === 0 || r === rh - 1) { fr(x, R[0], L, y, W, 1); if (r === rh - 1 && o.roof === 'thatch') for (let xx = L; xx < RR; xx++) if (hash(xx, y) < 0.45) fr(x, R[1], xx, y + 1, 1, 1); continue; }
    if (o.roof === 'thatch') { for (let xx = L + 1; xx < RR - 1; xx++) { const hv = hash(xx * 3, y), lit = xx < L + W * 0.4; fr(x, hv < 0.22 ? R[1] : hv > (lit ? 0.6 : 0.86) ? R[3] : R[2], xx, y, 1, 1); } if (r === 1) fr(x, R[1], L + 1, y, W - 2, 1); }
    else { const sub = (r - 1) % 3, band = Math.floor((r - 1) / 3); fr(x, sub === 2 ? R[1] : R[2], L + 1, y, W - 2, 1);
      if (r === 1) fr(x, R[3], L + 1, y, W - 2, 1);
      else if (sub === 0) { fr(x, R[3], L + 1, y, Math.round(W * 0.35), 1); for (let xx = L + 2 + (band % 2) * 2; xx < RR - 1; xx += 4) fr(x, R[1], xx, y, 1, 2); }
      fr(x, R[1], RR - 3, y, 2, 1); }
    fr(x, R[0], L, y, 1, 1); fr(x, R[0], RR - 1, y, 1, 1); }
  if (o.style === 'gable' && rh >= 8) { const cx = Math.floor(X + w / 2); fr(x, '#2e2216', cx - 2, rt + Math.round(rh * 0.5) - 1, 5, 5); fr(x, o.lit ? '#ffcd75' : '#29366f', cx - 1, rt + Math.round(rh * 0.5), 3, 3); fr(x, '#5a4630', cx, rt + Math.round(rh * 0.5), 1, 3); }
  if (o.chim >= 0) { const cx = X + o.chim, ch = Math.max(5, Math.round(rh * 0.55)) + 2; fr(x, '#1a1c2c', cx - 1, rt - 3, 5, ch + 1); fr(x, '#566c86', cx, rt - 2, 3, ch); fr(x, '#94b0c2', cx, rt - 2, 1, ch); fr(x, '#333c57', cx + 2, rt - 2, 1, ch); fr(x, '#333c57', cx - 1, rt - 3, 5, 1); fr(x, '#0b0b14', cx, rt - 3, 3, 1); }
}
function vHouse(x, X, B, o) { const ov = o.ov ?? 2, W = o.w + ov * 2 + 8, H = o.wh + o.rh + 9, ox = ov + 4, oy = H - 3; x.drawImage(vMemo('H' + JSON.stringify(o), W, H, c => drawHouse(c, ox, oy, o)), X - ox, B - oy); return { cx: X + (o.chim ?? -9) + 1, cy: B - o.wh - o.rh - 4 }; }
function vSmoke(x, cx, cy, now, n = 3, seed = 0, a = 0.5) { for (let k = 0; k < n; k++) { const t = (now / 1300 + k / n + seed * 0.37) % 1, s = t < 0.5 ? 2 : 3; x.fillStyle = `rgba(196,200,214,${a * (1 - t)})`; x.fillRect(Math.round(cx + Math.sin(t * 5 + seed) * 2 + t * 3), Math.round(cy - t * 13), s, s); } }
function vShadow(x, cx, by, rw, a = 0.3) { x.fillStyle = `rgba(6,10,16,${a})`; x.fillRect(cx - rw, by - 1, rw * 2, 2); x.fillRect(cx - rw + 1, by - 2, rw * 2 - 2, 1); }
// trees: oak / pine / bush / fruit, plus autumn + blossom variants (memoised)
const TREE_R = [['#10261a', '#1f5a34', '#38b764', '#a7f070'], ['#0d2018', '#1a4a2c', '#2a7a44', '#5aa860'], ['#3a1a14', '#8b3a2a', '#ef7d57', '#ffcd75'], ['#3a2030', '#9a5a7a', '#e8a0b0', '#f4e0ea']];
function vTreeImg(kind, v, fruit) { return vMemo('T' + kind + v + (fruit ? 'f' : ''), 15, 17, x => {
  x.fillStyle = 'rgba(6,14,10,.38)'; x.fillRect(3, 14, 9, 2); x.fillRect(2, 15, 11, 1);
  if (kind === 'pine') { const P = ['#0b2420', '#164638', '#257159', '#3e9a7e']; fr(x, '#3d2a1a', 7, 12, 2, 3); fr(x, '#5a4630', 7, 12, 1, 3);
    [[0, 4, 2], [3, 4, 4], [6, 5, 5], [9, 4, 6]].forEach(([y0, n, mh]) => { for (let r = 0; r < n; r++) { const hw = Math.max(1, Math.round((r + 1) / n * mh)), y = y0 + r; for (let xx = 7 - hw; xx <= 8 + hw - 1; xx++) fr(x, r === n - 1 ? P[0] : xx < 7 ? (xx === 7 - hw ? P[3] : P[2]) : xx === 8 + hw - 1 ? P[0] : P[1], xx, y, 1, 1); } }); fr(x, '#a7f070', 7, 0, 1, 1); return; }
  const R = TREE_R[v] || TREE_R[0], small = kind === 'bush', cx = 7, cy = small ? 11 : 6, rr = small ? 3.4 : 5.2;
  if (!small) { fr(x, '#3d2a1a', 6, 9, 3, 6); fr(x, '#5a4630', 6, 9, 1, 6); fr(x, '#3d2a1a', 5, 14, 5, 1); }
  const inC = (X, Y) => { const dx = X - cx, dy = (Y - cy) * (small ? 1.25 : 1.05), a = Math.atan2(dy, dx), b = rr + Math.sin(a * 5 + v) * 0.7; return dx * dx + dy * dy <= b * b; };
  for (let Y = 0; Y < 15; Y++) for (let X = 0; X < 15; X++) { if (!inC(X, Y)) continue; const edge = !inC(X + 1, Y) || !inC(X, Y + 1), l = (-(X - cx) * 0.7 - (Y - cy) * 0.8) / rr + (hash(X * 5 + v, Y) - 0.5) * 0.5;
    fr(x, edge && l < 0.2 ? R[0] : l > 0.55 ? R[3] : l > -0.1 ? R[2] : R[1], X, Y, 1, 1); }
  if (fruit) for (const [a, b] of [[4, 5], [9, 4], [7, 8], [10, 7], [5, 8]]) fr(x, small ? '#ef7d57' : '#b13e53', a, b - (small ? -4 : 0), 1, 1);
}); }
function vTree(x, tx, ty, kind, i, fruit, sc = 0) { const k = kind < 0.28 ? 'pine' : kind > 0.9 ? 'bush' : 'oak', v = hash(i, 91) < 0.07 ? 2 : sc >= 20 && hash(i, 93) > 0.86 ? 3 : i % 3 ? 0 : 1; x.drawImage(vTreeImg(k, k === 'pine' ? 0 : v, fruit), tx - 4, ty - 6); }
// villagers: 3x7 folk with hair / hats / tools; kids are 3x5
const FOLK_SH = ['#b13e53', '#3b5dc9', '#38b764', '#5d275d', '#ef7d57', '#257179', '#e0d2b0', '#ffcd75'], FOLK_HAIR = ['#3d2a1a', '#1a1c2c', '#ffcd75', '#ef7d57', '#94b0c2', '#5a4630'];
function vPerson(x, px, py, i, walk, kid) { const leg = walk && Math.floor(walk) % 2, sh = FOLK_SH[i % 8], hr = FOLK_HAIR[(i * 7 + 3) % 6], pants = i % 3 ? '#333c57' : '#5a4630';
  x.fillStyle = 'rgba(6,10,16,.3)'; x.fillRect(px - 1, py + (kid ? 5 : 7), 5, 1);
  if (kid) { fr(x, hr, px, py, 3, 1); fr(x, '#f8d8a8', px, py + 1, 3, 1); fr(x, sh, px, py + 2, 3, 2); fr(x, '#333c57', px + (leg ? 0 : 1), py + 4, 1, 1); fr(x, '#333c57', px + (leg ? 2 : 1), py + 4, 1, 1); return; }
  const hat = i % 5 === 1, hood = i % 7 === 4; fr(x, hood ? sh : hr, px, py, 3, 1); if (hat) { fr(x, '#c8a060', px - 1, py, 5, 1); fr(x, '#9a7840', px, py - 1, 3, 1); }
  fr(x, '#f8d8a8', px, py + 1, 3, 1); fr(x, hood ? sh : hr, px, py + 1, 1, 1); fr(x, sh, px, py + 2, 3, 3); fr(x, '#f8d8a8', px - (leg ? 1 : 0), py + 3, 1, 1); fr(x, 'rgba(0,0,0,.25)', px + 2, py + 2, 1, 3);
  if (i % 6 === 2) fr(x, '#5a4630', px + 3, py + 2 - (leg ? 0 : 1), 1, 4); else if (i % 6 === 5) { fr(x, '#c8a060', px + 3, py + 3, 2, 2); fr(x, '#8b5a2b', px + 3, py + 3, 2, 1); }
  fr(x, pants, px, py + 5, 3, 1); fr(x, '#2e2216', px + (leg ? 0 : 1), py + 6, 1, 1); fr(x, '#2e2216', px + (leg ? 2 : 1), py + 6, 1, 1); }
const spr = (x, k, v, f, X, Y, flip) => { const im = IMG[k][v || 'n'][f % IMG[k].n.length]; if (!flip) return x.drawImage(im, Math.round(X), Math.round(Y)); x.save(); x.scale(-1, 1); x.drawImage(im, -Math.round(X) - im.width, Math.round(Y)); x.restore(); };
function vSign(x, cx, by, ready, now, small) {   // `!` = can build now, `?` = milestone or gold missing
  const glow = ready && Math.floor(now / 300) % 2; fr(x, '#3d2a1a', cx - 1, by - 8, 2, 8); fr(x, '#8b5a2b', cx - 1, by - 8, 1, 8);
  fr(x, '#0b0b14', cx - 6, by - 14, 12, 8); fr(x, glow ? '#ffcd75' : ready ? '#ef7d57' : '#c8a878', cx - 5, by - 13, 10, 6); fr(x, glow ? '#f4ead0' : ready ? '#ffcd75' : '#e8cc98', cx - 5, by - 13, 10, 1);
  text(x, ready ? '!' : '?', cx, by - 13, ready ? '#0b0b14' : '#4a3424', 1, 'c'); fr(x, '#5a4630', cx - 5, by - 8, 1, 1); fr(x, '#5a4630', cx + 4, by - 8, 1, 1);
  if (!small) fr(x, '#4a3a28', cx - 9, by, 18, 3);
}
function vLot(x, P, cx, by) {   // staked-out empty lot: tilled earth, corner stakes + string, stones and planks waiting
  const pw = Math.min(P.w - 2, 46), L = cx - (pw >> 1), T = by - 9; fr(x, '#3d2e20', L, T, pw, 9); fr(x, '#4a3a28', L + 1, T + 1, pw - 2, 7);
  for (let i = 0; i < pw / 3; i++) fr(x, '#5a4630', L + 2 + i * 3, T + 2 + (i % 3) * 2, 2, 1);
  for (const [sx, sy] of [[L - 1, T - 2], [L + pw, T - 2], [L - 1, by - 2], [L + pw, by - 2]]) { fr(x, '#8b5a2b', sx, sy, 1, 4); fr(x, '#f4ead0', sx, sy, 1, 1); }
  fr(x, 'rgba(244,234,208,.55)', L, T - 1, pw, 1); fr(x, 'rgba(244,234,208,.55)', L, by - 1, pw, 1);
  fr(x, '#566c86', L + pw - 7, by - 4, 3, 2); fr(x, '#94b0c2', L + pw - 7, by - 4, 2, 1); fr(x, '#566c86', L + pw - 5, by - 3, 3, 2);
  fr(x, '#8b5a2b', L + 2, by - 3, 8, 1); fr(x, '#a8743a', L + 3, by - 4, 8, 1); fr(x, '#5a4630', L + 2, by - 2, 8, 1);
}
// statue: the Colossus sheet (brute) re-carved at 2x with chisel lighting (stone, later gilded)
function vStatueImg(gold) { return vMemo('S' + (gold ? 'g' : 's'), 26, 26, x => {
  const src = SPR.brute[0], R = gold ? ['#4a2a10', '#a0602a', '#ef9d47', '#ffcd75', '#f4ead0'] : ['#1a1c2c', '#4e6078', '#7a8aa6', '#a8bcd0', '#e0ecf4'];
  const at = (X, Y) => { X -= 1; Y -= 1; if (X < 0 || Y < 0 || X >= 24 || Y >= 24) return '.'; return src[Y >> 1][X >> 1]; }, inn = (X, Y) => at(X, Y) !== '.';
  for (let Y = 0; Y < 26; Y++) for (let X = 0; X < 26; X++) { const ch = at(X, Y); if (ch === '.') continue;
    const edge = !inn(X - 1, Y) || !inn(X + 1, Y) || !inn(X, Y - 1) || !inn(X, Y + 1); let c;
    if (edge) c = R[0]; else if (ch === '0') c = gold ? '#5a3214' : '#333c57'; else if (!inn(X - 1, Y - 1) || !inn(X - 2, Y - 1)) c = R[4]; else if (!inn(X + 1, Y + 1) || !inn(X + 2, Y + 1)) c = R[1]; else c = ch === 'c' ? R[4] : ch === '2' || ch === '1' ? R[1] : (X + Y) % 7 === 0 ? R[3] : R[2];
    fr(x, c, X, Y, 1, 1); }
  if (!gold) { for (const [a, b] of [[7, 21], [8, 22], [17, 21], [18, 20], [5, 14]]) fr(x, '#38704a', a, b, 1, 1); fr(x, '#333c57', 14, 6, 1, 3); fr(x, '#333c57', 15, 9, 1, 2); }
}); }
// ---- ground: cached per score (grass noise, flowers, stream banks, roads by tier, bridge) ----
const vNoise = (X, Y, s, sd) => { const gx = Math.floor(X / s), gy = Math.floor(Y / s), fx = X / s - gx, fy = Y / s - gy, a = hash(gx + sd, gy), b = hash(gx + 1 + sd, gy), c = hash(gx + sd, gy + 1), d = hash(gx + 1 + sd, gy + 1), u = fx * fx * (3 - 2 * fx), v = fy * fy * (3 - 2 * fy); return a + (b - a) * u + (c - a) * v + (a - b - c + d) * u * v; };
const streamTop = X => 179 + Math.round(Math.sin(X / 18) * 2), streamBot = X => 190 + Math.round(Math.sin(X / 23 + 1) * 1.5);
const hexRGB = h => [parseInt(h.slice(1, 3), 16), parseInt(h.slice(3, 5), 16), parseInt(h.slice(5, 7), 16)];
const VPROPS = [   // static props that move in as the town grows: [sprite, x, y, min score]
  ['well', 129, 138, 6], ['barrel', 140, 72, 4], ['barrel', 145, 73, 9], ['crate', 260, 72, 10], ['sack', 264, 69, 13], ['hay', 54, 140, 10], ['hay', 48, 145, 15], ['barrel', 330, 135, 18], ['crate', 284, 124, 20], ['sack', 52, 124, 12], ['cart', 356, 98, 26], ['barrel', 18, 80, 22]];
const MILL = { x: 168, y: 4, sc: 18 };
function vRoadMask() { const m = new Uint8Array(VWW * VWH), box = (a, b, w, h) => { for (let y = Math.max(0, b); y < Math.min(VWH, b + h); y++) for (let X = Math.max(0, a); X < Math.min(VWW, a + w); X++) m[y * VWW + X] = 1; };
  box(0, 84, VWW, 12); box(197, 146, 6, 32); box(190, 94, 20, 18);
  for (const P of VPLOTS) { if (P.line || P.k === 'statue' || P.k === 'fountain') continue; const cx = Math.round(P.x + P.w / 2); if (P.y < 84) box(cx - 2, P.y + P.h - 2, 4, 86 - (P.y + P.h) + 2); else box(cx - 2, 94, 4, P.y - 94 + 3); }
  for (let y = 0; y < VWH; y++) for (let X = 0; X < VWW; X++) if (((X - PLAZA.x) / PLAZA.rx) ** 2 + ((y - PLAZA.y) / PLAZA.ry) ** 2 < 1) m[y * VWW + X] = 2;
  return m; }
let VMASK = null;
function vGroundC(sc) { if (!VCACHE.has('G' + sc)) for (const k of [...VCACHE.keys()]) if (k[0] === 'G') VCACHE.delete(k);   // keep one 400x200 ground at a time
  return vMemo('G' + sc, VWW, VWH, x => {
  const t = roadTier(sc), id = x.createImageData(VWW, VWH), D = id.data, M = VMASK || (VMASK = vRoadMask()), G = ['#132619', '#18301f', '#1d3a25', '#22442b', '#284f32', '#2f5a39'].map(hexRGB), lush = Math.min(1, sc / 31) * 0.08;
  const C = {}, cc = h => C[h] || (C[h] = hexRGB(h)), put = (X, Y, c) => { const i = (Y * VWW + X) * 4; D[i] = c[0]; D[i + 1] = c[1]; D[i + 2] = c[2]; D[i + 3] = 255; }, inM = (X, Y) => X >= 0 && Y >= 0 && X < VWW && Y < VWH && M[Y * VWW + X];
  for (let Y = 0; Y < VWH; Y++) for (let X = 0; X < VWW; X++) {
    const n = vNoise(X, Y, 26, 11) * 0.55 + vNoise(X, Y, 8, 37) * 0.35 + hash(X, Y) * 0.2 + lush, gi = clamp(Math.floor(n * 5.2) - 1, 0, 5); put(X, Y, G[gi]);
    const m = M[Y * VWW + X]; if (!m) continue; const edge = !inM(X - 1, Y) || !inM(X + 1, Y) || !inM(X, Y - 1) || !inM(X, Y + 1), up = !inM(X, Y - 1), h = hash(X * 7, Y * 3);
    let c;
    if (t === 0) { if (edge && h < 0.4) continue; c = edge ? '#5a4630' : h < 0.1 ? '#7d6848' : h < 0.13 ? '#8a7a5e' : h > 0.94 ? '#5e4c34' : '#6e5a3e'; if (!edge && (Y === 87 || Y === 92) && hash(X >> 2, Y) > 0.25) c = '#5a4a32'; }
    else if (t === 1) { c = edge ? (up ? '#94b0c2' : '#566c86') : h < 0.16 ? '#94b0c2' : h > 0.9 ? '#566c86' : h > 0.82 ? '#6a5a44' : '#7a6a52'; if (edge && X % 3 === 0) c = '#333c57'; if (!edge && (Y === 87 || Y === 92) && hash(X >> 2, Y) > 0.4) c = '#6a5a44'; }
    else if (t === 2) { const row = Math.floor(Y / 3), off = (row % 2) * 2 + Math.floor(hash(row, 7) * 3), lx = (X + off) % 4, ly = Y % 3, col = Math.floor((X + off) / 4);
      c = edge ? (up ? '#94b0c2' : '#1f2538') : lx === 3 || ly === 2 ? '#333c57' : lx === 0 && ly === 0 ? '#94b0c2' : ['#566c86', '#5e7090', '#4e6078', '#6a7a94'][Math.floor(hash(col, row) * 4)];
      if (m === 2 && !edge) { const d = Math.hypot((X - PLAZA.x) / PLAZA.rx, (Y - PLAZA.y) / PLAZA.ry); if (d > 0.46 && d < 0.52 && ly !== 2) c = '#94b0c2'; if (d < 0.1) c = lx === 3 || ly === 2 ? '#333c57' : '#c8d6e0'; } }
    else { const row = Math.floor(Y / 5), off = (row % 2) * 4, lx = (X + off) % 8, ly = Y % 5, col = Math.floor((X + off) / 8);
      c = edge ? (up ? '#c8d6e0' : '#333c57') : lx === 7 || ly === 4 ? '#3a4458' : ly === 0 ? '#c8d6e0' : lx === 6 || ly === 3 ? '#6c8098' : ['#94b0c2', '#8aa0b4', '#a0b8c8'][Math.floor(hash(col, row) * 3)];
      if (m === 2 && !edge) { const d = Math.hypot((X - PLAZA.x) / PLAZA.rx, (Y - PLAZA.y) / PLAZA.ry);
        if (d < 0.16) c = d < 0.07 ? '#ef7d57' : (Math.floor(Math.atan2(Y - PLAZA.y, (X - PLAZA.x) / 2.6) / (Math.PI / 4) + 8) % 2 ? '#ffcd75' : '#b13e53');
        else if (d < 0.21) c = '#566c86'; else if (Math.abs(d - 0.58) < 0.035 || Math.abs(d - 0.9) < 0.035) c = (X + Y) % 6 === 0 ? '#ffcd75' : '#566c86'; } }
    put(X, Y, cc(c)); }
  for (let X = 0; X < VWW; X++) { const a = streamTop(X), b = streamBot(X); put(X, a - 2, cc('#14281a')); put(X, a - 1, cc(t >= 2 ? '#8a7a5e' : '#4a3a28'));   // stream: banks, shallows, deep middle
    for (let Y = a; Y <= b; Y++) { const k = (Y - a) / (b - a); put(X, Y, cc(k < 0.12 ? '#41a6f6' : k < 0.3 ? '#3b5dc9' : k < 0.75 ? '#29366f' : '#3b5dc9')); } put(X, b + 1, cc('#4a3a28')); put(X, b + 2, cc('#14281a')); }
  x.putImageData(id, 0, 0);
  for (let i = 0; i < 900; i++) { const X = Math.floor(hash(i, 101) * VWW), Y = Math.floor(hash(i, 103) * VWH); if (M[Y * VWW + X] || (Y > 175 && Y < 195)) continue; const c = i % 3 ? '#356842' : '#3f7a4c';   // grass tufts
    if (i % 5 === 0) { fr(x, '#0f2015', X, Y + 1, 3, 1); fr(x, c, X, Y, 1, 1); fr(x, c, X + 2, Y, 1, 1); fr(x, c, X + 1, Y - 1, 1, 1); } else fr(x, c, X, Y, 1, 1); }
  for (let i = 0; i < 60; i++) { const X = Math.floor(hash(i, 107) * VWW), Y = Math.floor(hash(i, 109) * VWH); if (vBlocked(X, Y)) continue; fr(x, '#566c86', X, Y, 2, 1); fr(x, '#94b0c2', X, Y, 1, 1); fr(x, '#1a1c2c', X, Y + 1, 2, 1); }
  const FL = ['#ffcd75', '#f4f4f4', '#b13e53', '#73eff7', '#ef7d57', '#e8a0b0', '#41a6f6'];   // wildflowers bloom as the village grows (clusters)
  for (let i = 0; i < sc * 7; i++) { const X = Math.floor(hash(i, 21) * VWW), Y = Math.floor(hash(i, 23) * VWH); if (vBlocked(X, Y) || vBlocked(X + 2, Y + 2)) continue; const c = FL[i % FL.length];
    fr(x, '#2a7a44', X, Y + 1, 1, 1); fr(x, c, X, Y, 1, 1); if (i % 2) { fr(x, '#2a7a44', X + 2, Y + 2, 1, 1); fr(x, c, X + 2, Y + 1, 1, 1); } if (i % 3 === 0) fr(x, FL[(i + 3) % FL.length], X - 1, Y + 2, 1, 1); }
  for (let i = 0; i < 46; i++) { const X = Math.floor(hash(i, 121) * VWW); if (X > 184 && X < 216) continue; const Y = i % 2 ? streamTop(X) - 1 : streamBot(X) + 1;   // reeds, lily pads, stones
    if (i % 4 < 2) { fr(x, '#38b764', X, Y - 3, 1, 3); fr(x, '#2a7a44', X + 1, Y - 2, 1, 2); if (i % 3 === 0) fr(x, '#8b5a2b', X, Y - 4, 1, 2); }
    else if (i % 4 === 2) { const ly = streamTop(X) + 3 + (i % 3); fr(x, '#2a7a44', X, ly + 1, 3, 1); fr(x, '#38b764', X, ly, 2, 1); if (sc >= 12 && i % 3 === 0) fr(x, '#e8a0b0', X + 1, ly, 1, 1); }
    else { fr(x, '#566c86', X, Y - 1, 3, 2); fr(x, '#94b0c2', X, Y - 1, 1, 1); } }
  const bt = 176, bb = 192;   // bridge: planks + rails -> stone bridge with parapets once the roads are cobbled
  if (t < 2) { fr(x, '#2e2216', 190, bt, 20, bb - bt); for (let y = bt; y < bb; y += 2) { fr(x, y % 4 ? '#8b5a2b' : '#a8743a', 191, y, 18, 1); fr(x, '#5a4630', 191 + (y % 3) * 5, y, 1, 1); }
    for (const rx of [189, 209]) { fr(x, '#5a4630', rx, bt - 1, 2, bb - bt + 2); fr(x, '#8b5a2b', rx, bt - 1, 1, bb - bt + 2); for (let y = bt - 2; y < bb + 1; y += 5) fr(x, '#3d2a1a', rx - 1, y, 3, 2); } }
  else { fr(x, '#1a1c2c', 187, bt - 1, 26, bb - bt + 3); for (let y = bt; y < bb + 1; y++) for (let X = 190; X < 210; X++) fr(x, (X + (Math.floor(y / 3) % 2) * 3) % 6 === 5 || y % 3 === 2 ? '#566c86' : '#94b0c2', X, y, 1, 1);
    for (const rx of [187, 210]) { fr(x, '#566c86', rx, bt - 2, 3, bb - bt + 4); fr(x, '#c8d6e0', rx, bt - 2, 3, 1); fr(x, '#c8d6e0', rx, bt - 2, 1, bb - bt + 4); for (let y = bt; y < bb + 2; y += 4) fr(x, '#333c57', rx, y, 3, 1); }
    x.fillStyle = 'rgba(10,14,30,.45)'; x.fillRect(181, streamTop(181) + 2, 6, 8); x.fillRect(213, streamTop(213) + 2, 6, 8); }
  if (t >= 3) for (let X = 20; X < VWW - 20; X += 26) { if (VPLOTS.some(P => !P.line && Math.abs(P.x + P.w / 2 - X) < 9)) continue; for (const Y of [81, 97]) { fr(x, '#3d2a1a', X, Y + 1, 7, 1); for (let k = 0; k < 7; k++) fr(x, k % 2 ? '#38b764' : FL[(X + k) % FL.length], X + k, Y - (k % 2), 1, 1); } }   // t3 flower beds
}); }
// ---- per-building art ----
function drawPlot(x, P, now, h, sc) {
  const st = plotState(P.k), cx = Math.round(P.x + P.w / 2), by = P.y + P.h;
  if (st === 0) { if (P.line) { vSign(x, cx, by, plotReady(P.k), now, true); return; } vLot(x, P, cx, by); vSign(x, cx, by - 6, plotReady(P.k), now, true); return; }
  if (P.line) return;   // drawn by drawLines
  switch (P.k) {
    case 'tower': {   // locked: a ruined mage tower stump, rubble, vines, a faint arcane glint
      vShadow(x, cx + 2, by, 13); const L = P.x + 4, W = 16;
      for (let r = 0; r < 18; r++) { const y = by - 1 - r, wl = W - (r > 10 ? Math.round(hash(r, 5) * 6) : 0), off = r > 10 ? Math.round(hash(r, 6) * 3) : 0; if (r > 16 && hash(r, 9) < 0.5) continue;
        fr(x, '#1a1c2c', L + off, y, wl, 1); fr(x, r % 3 === 2 ? '#333c57' : '#566c86', L + off + 1, y, wl - 2, 1); fr(x, '#94b0c2', L + off + 1, y, 1, 1); if (r % 3 === 0) for (let k = L + off + 2 + (r % 2) * 2; k < L + off + wl - 2; k += 4) fr(x, '#333c57', k, y, 1, 1); }
      fr(x, '#0b0b14', cx - 2, by - 8, 4, 7); fr(x, '#1a1c2c', cx - 1, by - 9, 2, 1); fr(x, '#0b0b14', cx + 3, by - 15, 2, 3);
      for (let i = 0; i < 14; i++) { const vx = L + 1 + Math.floor(hash(i, 61) * (W - 2)), vy = by - 2 - Math.floor(hash(i, 62) * 14); fr(x, i % 2 ? '#38b764' : '#257179', vx, vy, 1, 2 + (i % 3)); if (i % 4 === 0) fr(x, '#a7f070', vx, vy, 1, 1); }
      for (const [a, b, w2] of [[P.x - 2, by - 3, 4], [P.x + 21, by - 4, 3], [P.x + 17, by - 2, 3], [P.x, by - 1, 2]]) { fr(x, '#566c86', a, b, w2, 2); fr(x, '#94b0c2', a, b, 1, 1); fr(x, '#1a1c2c', a, b + 2, w2, 1); }
      if (Math.floor(now / 500) % 3 === 0) { x.globalAlpha = 0.6; fr(x, '#5d275d', cx - 2, by - 7, 4, 4); x.globalAlpha = 1; fr(x, '#b13e53', cx - 1, by - 6, 2, 2); fr(x, '#f4f4f4', cx, by - 6, 1, 1); }
      break; }
    case 'hall': {   // Hero Hall: stone long-hall under a plum gable, gold crest, banners at the doors
      vHouse(x, P.x, by, { w: 24, wh: 12, rh: 12, roof: 'plum', wall: 'stone', style: 'gable', door: 'c', dw: 6, dh: 7, win: 2, lit: true, ov: 3 });
      fr(x, '#ffcd75', cx - 1, by - 26, 2, 3);
      for (const bx of [P.x - 3, P.x + P.w + 2]) { const sd = bx < cx ? 1 : -3, wv = Math.round(Math.sin(now / 260 + bx) * 0.6); fr(x, '#3d2a1a', bx, by - 16, 1, 16); fr(x, '#ffcd75', bx, by - 17, 1, 1);
        fr(x, '#b13e53', bx + sd, by - 15 + wv, 3, 6); fr(x, '#ffcd75', bx + sd + 1, by - 13 + wv, 1, 2); fr(x, '#7a2a3f', bx + sd, by - 9 + wv, 1, 1); fr(x, '#7a2a3f', bx + sd + 2, by - 9 + wv, 1, 1); }
      fr(x, '#ffcd75', cx - 4, by - 12, 8, 1); break; }
    case 'tavern': {
      const inn = h.inn || 0, R = h.slayer ? 'plat' : 'red';
      const o = inn >= 2 ? { w: 36, wh: 22, rh: 12, fl: 2, roof: R, wall: 'plaster', timber: true, door: 'c', dw: 6, win: 3, big: true, lit: true, chim: 6, boxes: true, shut: true }
        : inn ? { w: 32, wh: 21, rh: 11, fl: 2, roof: R, wall: 'plaster', timber: true, door: 'c', dw: 5, win: 3, lit: true, chim: 25, shut: true }
          : { w: 30, wh: 13, rh: 12, roof: R, wall: 'plaster', timber: true, door: 'c', dw: 5, win: 2, big: true, lit: true, chim: 22 };
      const X0 = P.x + ((P.w - o.w) >> 1), m = vHouse(x, X0, by, o), top = by - o.wh - o.rh;
      vSmoke(x, m.cx, m.cy, now, inn >= 2 ? 5 : 3, 1, 0.55);
      if (inn >= 2) { fr(x, '#1a1c2c', X0 + 28, top - 3, 5, 9); fr(x, '#566c86', X0 + 29, top - 2, 3, 8); fr(x, '#94b0c2', X0 + 29, top - 2, 1, 8); fr(x, '#0b0b14', X0 + 29, top - 3, 3, 1); vSmoke(x, X0 + 30, top - 4, now, 3, 4, 0.5); }
      const step = Math.floor((o.w - 6) / 5), BC = ['#b13e53', '#41a6f6', '#a7f070', '#ffcd75', '#73eff7'];   // bunting: one pennant per tavern level
      if (h.tavern > 1) fr(x, '#e0d2b0', X0 + 4, by - o.wh - 1, step * (h.tavern - 1), 1);
      for (let i = 0; i < h.tavern; i++) { const fx = X0 + 3 + i * step, fy = by - o.wh - 1 + (Math.floor(now / 300 + i) % 2); fr(x, BC[i], fx, fy, 3, 1); fr(x, BC[i], fx + 1, fy + 1, 1, 1); }
      const sx = X0 - 6, sy = by - 14; fr(x, '#3d2a1a', sx, sy - 1, 7, 1); fr(x, '#3d2a1a', sx + 1, sy, 1, 2); fr(x, '#3d2a1a', sx + 4, sy, 1, 2);   // hanging mug sign
      fr(x, '#2e2216', sx, sy + 2, 6, 6); fr(x, '#8b5a2b', sx + 1, sy + 3, 4, 4); fr(x, '#ffcd75', sx + 2, sy + 4, 2, 2); fr(x, '#f4f4f4', sx + 2, sy + 4, 2, 1); fr(x, '#ffcd75', sx + 4, sy + 4, 1, 1);
      spr(x, 'barrel', 'n', 0, X0 + o.w + 1, by - 5); if (inn) spr(x, 'barrel', 'n', 0, X0 + o.w + 1, by - 10);
      if (inn) { const fl = 0.45 + 0.3 * Math.sin(now / 260); x.globalAlpha = fl * 0.3; fr(x, '#ffcd75', X0 + 2, by - 7, o.w - 4, 5); x.globalAlpha = 1;
        const ix = X0 + (o.w >> 1); fr(x, '#0b0b14', ix - 7, by - o.wh + 1, 15, 7); fr(x, '#5a4630', ix - 6, by - o.wh + 2, 13, 5); text(x, 'INN', ix + 1, by - o.wh + 1, '#ffcd75', 1, 'c');
        if (inn >= 2) { fr(x, '#3d2a1a', X0 + 1, by - 12, o.w - 2, 1); for (let k = X0 + 2; k < X0 + o.w - 2; k += 3) fr(x, '#8b5a2b', k, by - 14, 1, 2); fr(x, '#8b5a2b', X0 + 1, by - 15, o.w - 2, 1);
          for (const tx of [P.x - 12, P.x - 4]) { fr(x, '#5a4630', tx, by - 3, 6, 2); fr(x, '#3d2a1a', tx + 1, by - 1, 1, 1); fr(x, '#3d2a1a', tx + 4, by - 1, 1, 1); fr(x, '#ffcd75', tx + 1, by - 4, 1, 1); fr(x, '#f4f4f4', tx + 4, by - 4, 1, 1); } }
        spr(x, 'vcat', 'n', Math.floor(now / 400) % 2, X0 + o.w + 6, by - 4); }
      if (h.slayer) { for (const d of [-1, 1]) { fr(x, '#f4f4f4', cx + d * 3 - (d < 0 ? 1 : 0), by - o.wh - 3, 2, 2); fr(x, '#c8d6e0', cx + d * 5 - (d < 0 ? 0 : 1), by - o.wh - 5, 1, 2); }
        fr(x, '#0b0b14', cx - 15, by + 1, 30, 7); text(x, 'SLAYER', cx, by + 1, '#73eff7', 1, 'c'); if (Math.floor(now / 150) % 2) fr(x, '#f4f4f4', P.x + Math.floor(hash(Math.floor(now / 150), 3) * P.w), top + Math.floor(hash(Math.floor(now / 150), 4) * 8), 1, 1); }
      break; }
    case 'smithy': {
      const fg = h.forge || 0;
      if (fg) { const fx = P.x + 24; vShadow(x, fx + 7, by, 7); fr(x, '#1a1c2c', fx, by - 17, 13, 17); for (let r = 0; r < 16; r++) fr(x, r % 3 === 2 ? '#333c57' : '#566c86', fx + 1, by - 16 + r, 11, 1); fr(x, '#94b0c2', fx + 1, by - 16, 1, 16);
        fr(x, '#1a1c2c', fx + 7, by - 26, 5, 10); fr(x, '#566c86', fx + 8, by - 25, 3, 9); fr(x, '#94b0c2', fx + 8, by - 25, 1, 9); fr(x, '#333c57', fx + 6, by - 26, 7, 1);
        fr(x, '#0b0b14', fx + 3, by - 10, 7, 7); const gl = 0.6 + 0.4 * Math.sin(now / 180); x.globalAlpha = gl; fr(x, '#ef7d57', fx + 4, by - 9, 5, 6); fr(x, '#ffcd75', fx + 5, by - 6, 3, 3); x.globalAlpha = gl * 0.22; fr(x, '#ef7d57', fx - 2, by - 13, 17, 14); x.globalAlpha = 1;
        vSmoke(x, fx + 9, by - 28, now, 4, 2, 0.55);
        if (fg >= 2) { const rg = Math.floor(now / 250) % 4; for (let i = 0; i < 4; i++) if (i !== rg) fr(x, '#73eff7', fx + 2 + i * 3, by - 15, 1, 1); x.globalAlpha = 0.25 + 0.2 * Math.sin(now / 300); fr(x, '#73eff7', P.x + 12, by - 6, 10, 5); x.globalAlpha = 1; } }
      vShadow(x, cx + 2, by, 13); const L = P.x, T = by - 15;   // open-front shed: plank back wall, posts, slate lean-to roof, coal hearth, anvil, quench barrel, tools, smith
      fr(x, '#2e2216', L, T, 24, 15); fr(x, '#3d2a1a', L + 1, T + 1, 22, 13); for (let k = L + 3; k < L + 23; k += 3) fr(x, '#2e2216', k, T + 1, 1, 13);
      fr(x, '#566c86', L + 1, by - 9, 10, 8); fr(x, '#94b0c2', L + 1, by - 9, 10, 1); fr(x, '#0b0b14', L + 3, by - 7, 6, 4); const cg = 0.6 + 0.4 * Math.sin(now / 140); x.globalAlpha = cg; fr(x, '#b13e53', L + 3, by - 5, 6, 2); fr(x, '#ef7d57', L + 4, by - 6, 4, 2); fr(x, '#ffcd75', L + 5, by - 5, 2, 1); x.globalAlpha = 0.18 * cg; fr(x, '#ef7d57', L, T + 2, 24, 13); x.globalAlpha = 1;
      for (let k = 0; k < 4; k++) { fr(x, '#5a4630', L + 13 + k * 2, T + 2, 1, 5); fr(x, '#94b0c2', L + 13 + k * 2, T + 6, 1, 2); }
      for (const px2 of [L, L + 23]) { fr(x, '#5a4630', px2, T, 1, 15); fr(x, '#8b5a2b', px2, T, 1, 1); }
      for (let r = 0; r < 6; r++) { const y = T - 6 + r, inset = 5 - r; fr(x, VR.slate[0], L - 2 + inset, y, 28 - inset * 2, 1); if (r && r < 5) { fr(x, r % 2 ? VR.slate[2] : VR.slate[1], L - 1 + inset, y, 26 - inset * 2, 1); fr(x, VR.slate[3], L - 1 + inset, y, 7, 1); } }
      fr(x, 'rgba(6,10,16,.35)', L + 1, T, 22, 1);
      x.drawImage(IMG.anvil[fg >= 2 ? 'i' : 'n'][0], cx + 1, by - 4); spr(x, 'barrel', 'n', 0, L + P.w - 5, by - 5); fr(x, '#3b5dc9', L + P.w - 4, by - 5, 2, 1);
      const n = 1 + fg * 2; for (let i = 0; i < n + 2; i++) if (Math.floor(now / 250 + i) % 2) fr(x, i % 2 ? '#ffcd75' : '#ef7d57', cx + Math.floor(hash(Math.floor(now / 250) + i * 7, 9) * 8) - 1, by - 6 - Math.floor(hash(i, Math.floor(now / 250)) * 6), 1, 1);
      const sw = Math.floor(now / 350) % 2; vPerson(x, cx - 4, by - 8, 2, 0); fr(x, '#94b0c2', cx - 1 + (sw ? 2 : 0), by - 8 + (sw ? 3 : 0), 2, 1);
      break; }
    case 'gate': { const fz = h.gate >= 2, L = P.x, T = by - 22;   // Waygate: stone arch, keystone, swirling rift; Frost: snowcap, ice crystals
      vShadow(x, cx + 2, by, 13);
      for (let r = 0; r < 22; r++) { const y = T + r; for (let X = L; X < L + 24; X++) { const dx = X - cx + 0.5; if (r < 2 && Math.abs(dx) > 8) continue; if (r > 4 && Math.abs(dx) < 7 && (r > 9 || dx * dx / 49 + (r - 10) ** 2 / 36 < 1)) continue;
        const edge = Math.abs(dx) > 11 || r === 0 || (Math.abs(dx) < 8 && r > 3 && (r > 9 || dx * dx / 64 + (r - 10) ** 2 / 42 < 1));
        fr(x, edge ? '#1a1c2c' : r % 3 === 2 || (Math.floor((X + (Math.floor(r / 3) % 2) * 2) / 4) % 3 === 0 && (X + (Math.floor(r / 3) % 2) * 2) % 4 === 0) ? '#566c86' : dx < 0 ? '#94b0c2' : '#7a8aa6', X, y, 1, 1); } }
      fr(x, '#ffcd75', cx - 1, T + 2, 2, 3); fr(x, '#ef9d47', cx, T + 3, 1, 2);
      const sw = now / 300; x.fillStyle = fz ? '#1d4f57' : '#29366f'; x.fillRect(cx - 6, T + 10, 12, 12); x.fillRect(cx - 5, T + 7, 10, 3);
      for (let i = 0; i < 22; i++) { const a = sw * (i % 2 ? -1 : 1) + i * 0.75, rr = 1 + (i % 6); fr(x, [fz ? '#f4f4f4' : '#41a6f6', '#73eff7', fz ? '#c8d6e0' : '#8a4a80'][i % 3], Math.round(cx + Math.cos(a) * rr * 0.9), Math.round(T + 15 + Math.sin(a) * rr * 1.1), 1, 1); }
      for (const vx of [L + 1, L + 21]) for (let k = 0; k < 6; k++) fr(x, k % 2 ? '#38b764' : '#257179', vx + (k % 2), by - 2 - k * 3, 1, 2);
      if (fz) { for (let X = L + 2; X < L + 22; X++) fr(x, '#f4f4f4', X, T + (Math.abs(X - cx) > 8 ? 2 : 0) + (hash(X, 1) < 0.3 ? 1 : 0), 1, 1); x.drawImage(IMG.crystal.n[0], L - 5, by - 5); x.drawImage(IMG.crystal.n[0], L + 24, by - 5); x.drawImage(IMG.crystal.n[0], L + 19, by - 4);
        for (let i = 0; i < 4; i++) { const t = (now / 1500 + i / 4) % 1; fr(x, '#f4f4f4', L + Math.floor(hash(i, 71) * 24), T + Math.floor(t * 22), 1, 1); } }
      break; }
    case 'watch': { const L = P.x + 2, T = P.y + 2;   // timber watchtower: braced legs, ladder, railing, peaked roof, beacon, guard, pennant
      vShadow(x, cx + 3, by, 9);
      for (const lx of [L + 1, L + 14]) { fr(x, '#3d2a1a', lx, T + 12, 2, by - T - 12); fr(x, '#8b5a2b', lx, T + 12, 1, by - T - 12); }
      for (let k = 0; k < 3; k++) { const y0 = T + 14 + k * 7; for (let j = 0; j < 12; j++) { fr(x, '#5a4630', L + 3 + j, y0 + Math.floor(j * 0.5), 1, 1); fr(x, '#5a4630', L + 14 - j, y0 + Math.floor(j * 0.5), 1, 1); } fr(x, '#6b4423', L + 1, y0 - 1, 15, 1); }
      for (let y = T + 12; y < by; y += 2) fr(x, '#a8743a', L + 7, y, 3, 1); fr(x, '#5a4630', L + 6, T + 12, 1, by - T - 12); fr(x, '#5a4630', L + 10, T + 12, 1, by - T - 12);
      fr(x, '#2e2216', L - 1, T + 6, 19, 7); fr(x, '#8b5a2b', L, T + 7, 17, 5); for (let k = L + 1; k < L + 17; k += 3) fr(x, '#5a4630', k, T + 7, 1, 5); fr(x, '#a8743a', L, T + 7, 17, 1);
      const f = Math.floor(now / 140) % 3; x.globalAlpha = 0.22 + 0.1 * f; fr(x, '#ffcd75', L + 4, T - 3, 10, 9); x.globalAlpha = 1; fr(x, '#566c86', L + 7, T + 4, 4, 2); fr(x, f ? '#ffcd75' : '#ef7d57', L + 8, T + 1 - f, 2, 3 + f); fr(x, '#b13e53', L + 7, T + 3, 1, 1);
      for (let r = 0; r < 6; r++) { const y = T - 8 + r, hw = Math.round(r * 1.6) + 1; fr(x, VR.red[0], L + 8 - hw, y, hw * 2 + 1, 1); if (r) fr(x, r % 2 ? VR.red[2] : VR.red[1], L + 9 - hw, y, hw * 2 - 1, 1); if (r > 1) fr(x, VR.red[3], L + 9 - hw, y, 2, 1); }
      fr(x, '#5a4630', L + 1, T - 2, 1, 8); fr(x, '#5a4630', L + 15, T - 2, 1, 8);
      fr(x, '#3d2a1a', L + 8, T - 14, 1, 6); const wv = Math.floor(now / 200) % 2; fr(x, '#41a6f6', L + 9, T - 14 + wv, 4, 2); fr(x, '#41a6f6', L + 13, T - 13 + wv, 1, 1);
      const g = Math.round(Math.sin(now / 1200) * 4); vPerson(x, L + 3 + (g + 4), T, 4, 0); fr(x, '#94b0c2', L + 6 + g + 4, T - 2, 1, 7);
      break; }
    case 'market': { const l = h.market;   // striped stalls with goods and keepers; Busy Market adds a third stall, crates and shoppers
      const stall = (sx, ci, goods, keeper) => { const C = [['#b13e53', '#f4ead0'], ['#3b5dc9', '#f4ead0'], ['#38b764', '#ffcd75']][ci]; vShadow(x, sx + 12, by, 12);
        fr(x, '#3d2a1a', sx + 1, by - 17, 1, 17); fr(x, '#3d2a1a', sx + 22, by - 17, 1, 17); vPerson(x, sx + 10, by - 14, keeper, 0);
        fr(x, '#2e2216', sx, by - 8, 24, 7); fr(x, '#8b5a2b', sx + 1, by - 7, 22, 5); fr(x, '#a8743a', sx + 1, by - 8, 22, 1); for (let k = sx + 4; k < sx + 22; k += 5) fr(x, '#5a4630', k, by - 6, 1, 4);
        goods.forEach((g, k) => { const gx = sx + 3 + k * 5; fr(x, g, gx, by - 10, 3, 2); fr(x, g, gx + 1, by - 11, 1, 1); fr(x, 'rgba(255,255,255,.6)', gx, by - 10, 1, 1); });
        fr(x, '#1a1c2c', sx - 1, by - 22, 26, 1); for (let k = 0; k < 26; k++) { const s2 = Math.floor(k / 3) % 2; fr(x, C[s2], sx - 1 + k, by - 21, 1, 4); if (k % 3 === 1) fr(x, C[s2], sx - 1 + k, by - 17, 1, 1); } fr(x, 'rgba(255,255,255,.28)', sx - 1, by - 21, 26, 1); fr(x, 'rgba(0,0,0,.25)', sx - 1, by - 18, 26, 1); };
      stall(P.x + 1, 0, ['#b13e53', '#a7f070', '#ffcd75', '#ef7d57'], 0); stall(P.x + 30, 1, ['#94b0c2', '#73eff7', '#c8d6e0', '#94b0c2'], 3);
      if (l >= 2) { stall(P.x + 59, 2, ['#e8a0b0', '#41a6f6', '#ffcd75', '#8a4a80'], 5); spr(x, 'crate', 'n', 0, P.x - 7, by - 4); spr(x, 'crate', 'n', 0, P.x - 6, by - 8); spr(x, 'sack', 'n', 0, P.x + 26, by - 4); spr(x, 'barrel', 'n', 0, P.x + 85, by - 5); spr(x, 'sack', 'n', 0, P.x + 55, by - 4);
        for (let i = 0; i < 4; i++) { const t = now / 1000 * (6 + i * 3) + i * 30, px = P.x + (t % 84); vPerson(x, Math.round(px), by + 1, i + 1, t / 3, i === 3); } }
      break; }
    case 'hearth': { const fg = h.fire || 0;   // stone hearth-house with a big glowing hearth; tiers add a fire circle, benches, woodpile
      if (fg >= 2) { const pulse = 0.16 + 0.07 * Math.sin(now / 200); x.globalAlpha = pulse; x.fillStyle = '#ef7d57'; x.beginPath(); x.ellipse(cx, by - 6, 24, 15, 0, 0, TAU); x.fill(); x.globalAlpha = 1;
        for (let i = 0; i < 3; i++) { fr(x, '#8b5a2b', P.x + P.w + 2, by - 3 - i * 2, 7, 2); fr(x, '#c8a060', P.x + P.w + 8, by - 3 - i * 2, 1, 2); fr(x, '#3d2a1a', P.x + P.w + 2, by - 2 - i * 2, 7, 1); } }
      vHouse(x, P.x + 1, by, { w: 22, wh: 12, rh: 9, roof: 'slate', wall: 'stone', door: '', win: 0, chim: 16, slope: 0.7 });
      fr(x, '#1a1c2c', cx - 5, by - 11, 10, 10); fr(x, '#0b0b14', cx - 4, by - 10, 8, 9); fr(x, '#c8d6e0', cx - 5, by - 12, 10, 1); fr(x, '#94b0c2', cx - 6, by - 11, 1, 9); fr(x, '#94b0c2', cx + 5, by - 11, 1, 9);
      const fl = 0.7 + 0.3 * Math.sin(now / 120); x.globalAlpha = fl; fr(x, '#b13e53', cx - 3, by - 5, 6, 3); fr(x, '#ef7d57', cx - 2, by - 7, 4, 4); fr(x, '#ffcd75', cx - 1, by - 5, 2, 2); x.globalAlpha = 0.2 * fl; fr(x, '#ef7d57', cx - 8, by - 1, 16, 3); x.globalAlpha = 1; fr(x, '#5a4630', cx - 3, by - 2, 6, 1);
      vSmoke(x, P.x + 18, by - 26, now, 3 + fg, 3, 0.6);
      if (fg) { for (let i = 0; i < 9; i++) { const a = Math.PI * (0.1 + 0.8 * i / 8); fr(x, i % 2 ? '#94b0c2' : '#566c86', Math.round(cx + Math.cos(a) * 15) - 1, Math.round(by + 1 + Math.sin(a) * 3), 3, 2); }
        fr(x, '#8b5a2b', P.x - 7, by - 3, 6, 2); fr(x, '#5a4630', P.x - 7, by - 1, 1, 1); fr(x, '#5a4630', P.x - 2, by - 1, 1, 1); }
      const n = 2 + h.life + h.mend + fg * 3; for (let i = 0; i < n; i++) { const t = (now / 400 + i / n) % 1; fr(x, t < 0.5 ? '#ffcd75' : '#ef7d57', cx - 3 - fg + Math.round(hash(i, Math.floor(now / 120)) * (6 + fg * 2)), by - 8 - Math.round(t * (6 + fg * 4)), 1, 1); }
      break; }
    case 'garden': { const l = h.garden;
      for (let X = P.x; X < P.x + P.w; X += 4) { fr(x, '#5a4630', X, P.y + 1, 1, 3); fr(x, '#a8743a', X, P.y + 1, 1, 1); fr(x, '#5a4630', X, by - 3, 1, 3); fr(x, '#a8743a', X, by - 3, 1, 1); }
      fr(x, '#8b5a2b', P.x, P.y + 2, P.w, 1); fr(x, '#8b5a2b', P.x, by - 2, P.w, 1); fr(x, '#5a4630', P.x, P.y + 2, 1, P.h - 3); fr(x, '#5a4630', P.x + P.w - 1, P.y + 2, 1, P.h - 3);
      const crops = [(X, Y) => { fr(x, '#1f5a34', X, Y + 1, 3, 1); fr(x, '#38b764', X, Y, 3, 1); fr(x, '#a7f070', X + 1, Y, 1, 1); }, (X, Y) => { fr(x, '#38b764', X, Y - 1, 1, 2); fr(x, '#38b764', X + 2, Y - 1, 1, 2); fr(x, '#ef7d57', X + 1, Y + 1, 1, 1); }, (X, Y) => { fr(x, '#ef7d57', X, Y, 3, 2); fr(x, '#ffcd75', X, Y, 1, 1); fr(x, '#38b764', X + 1, Y - 1, 1, 1); }];
      for (let r = 0; r < 3; r++) { const ry = P.y + 6 + r * 8; fr(x, '#2e2216', P.x + 3, ry - 1, P.w - 6, 6); fr(x, '#4a3424', P.x + 4, ry, P.w - 8, 4); for (let k = P.x + 5; k < P.x + P.w - 5; k += 2) fr(x, '#3d2a1a', k, ry + 3, 1, 1);
        for (let i = 0; i < 12; i++) crops[(r + (i > 5 ? 1 : 0)) % 3](P.x + 6 + i * 4, ry + 1); }
      for (let i = 0; i < 3; i++) { const sx2 = P.x + P.w - 5 + i * 2; fr(x, '#2a7a44', sx2, P.y - 5 + i, 1, 8 - i); fr(x, '#ffcd75', sx2 - 1, P.y - 8 + i, 3, 3); fr(x, '#5a4630', sx2, P.y - 7 + i, 1, 1); }
      spr(x, 'scarecrow', 'n', 0, P.x + 26, P.y - 3);
      for (let i = 0; i < 3; i++) { const hop = Math.floor(now / 300 + i * 2) % 4 === 0, s = Math.sin(now / 1600 + i), px = P.x + 10 + i * 14 + Math.round(s * 5); spr(x, 'vhen', 'n', hop ? 1 : 0, px, by + 1, s < 0); }
      for (let i = 0; i < 3; i++) { const bx = Math.round(P.x + 20 + Math.sin(now / 900 + i * 3) * 22), byy = Math.round(P.y + 4 + Math.cos(now / 700 + i) * 7), c = ['#73eff7', '#ffcd75', '#f4f4f4'][i]; fr(x, c, bx, byy, 1, 1); if (Math.floor(now / 120 + i) % 2) { fr(x, c, bx - 1, byy - 1, 1, 1); fr(x, c, bx + 1, byy - 1, 1, 1); } }
      if (l >= 2) { for (let i = 0; i < 4; i++) vTree(x, P.x + 6 + i * 14, by + 9, 0.5, i, true, 31);
        const py = by + 20; for (let X = P.x + 2; X <= P.x + 57; X += 5) { fr(x, '#5a4630', X, py - 1, 1, 3); fr(x, '#5a4630', X, py + 15, 1, 3); } fr(x, '#a8743a', P.x + 2, py, 56, 1); fr(x, '#a8743a', P.x + 2, py + 16, 56, 1); fr(x, '#8b5a2b', P.x + 2, py, 1, 17); fr(x, '#8b5a2b', P.x + 57, py, 1, 17);
        fr(x, '#5a4630', P.x + 46, py + 10, 8, 3); fr(x, '#3b5dc9', P.x + 47, py + 10, 6, 1); spr(x, 'hay', 'n', 0, P.x + 5, py + 10);
        for (let i = 0; i < 3; i++) { const s = Math.sin(now / 2200 + i * 2), sx2 = P.x + 10 + i * 12 + Math.round(s * 5), sy = py + 4 + (i % 2) * 5; spr(x, 'vsheep', 'n', Math.floor(now / 500 + i) % 2, sx2, sy, s < 0); } }
      break; }
    case 'statue': { const g = h.statue >= 2;   // the Bone Colossus on a stepped plinth with a plaque
      vShadow(x, cx + 3, by, 16, 0.35);
      fr(x, '#1a1c2c', P.x - 4, by - 4, P.w + 8, 4); fr(x, '#566c86', P.x - 3, by - 4, P.w + 6, 3); fr(x, '#94b0c2', P.x - 3, by - 4, P.w + 6, 1);
      fr(x, '#1a1c2c', P.x - 1, by - 8, P.w + 2, 4); fr(x, '#566c86', P.x, by - 8, P.w, 3); fr(x, '#c8d6e0', P.x, by - 8, P.w, 1); fr(x, '#333c57', P.x + P.w - 2, by - 7, 2, 3);
      fr(x, '#1a1c2c', cx - 4, by - 7, 8, 3); fr(x, g ? '#ffcd75' : '#94b0c2', cx - 3, by - 6, 6, 1);
      x.drawImage(vStatueImg(g), P.x - 1, P.y - 7);
      if (g) { for (let i = 0; i < 6; i++) { const a = i / 6 * TAU + 0.3, fx = Math.round(cx + Math.cos(a) * 17), fy = Math.round(by - 2 + Math.sin(a) * 4); fr(x, '#2a7a44', fx, fy + 1, 2, 1); fr(x, ['#b13e53', '#ffcd75', '#f4f4f4'][i % 3], fx, fy, 2, 1); }
        if (Math.floor(now / 200) % 3 === 0) fr(x, '#f4f4f4', P.x + Math.floor(hash(Math.floor(now / 200), 1) * P.w), P.y + Math.floor(hash(Math.floor(now / 200), 2) * P.w * 0.7) - 4, 1, 1); }
      break; }
    case 'fountain': {   // two-tier stone fountain: basin rim, rippling pool, column, upper bowl, arcing jets, coins
      const bx = cx, byy = by - 5; vShadow(x, bx + 2, by, 14, 0.3);
      const ell = (c, rx, ry, dy = 0, half) => { x.fillStyle = c; x.beginPath(); x.ellipse(bx, byy + dy, rx, ry, 0, 0, half ? Math.PI : TAU); x.fill(); };
      ell('#1a1c2c', 14, 6); ell('#94b0c2', 13, 5, -1); ell('#566c86', 13, 4, 1, true); ell('#29366f', 11, 3.5, -1); ell('#3b5dc9', 10, 2.5, -1.5);
      for (let i = 0; i < 2; i++) { const rp = (now / 1400 + i / 2) % 1; x.strokeStyle = `rgba(115,239,247,${0.55 * (1 - rp)})`; x.lineWidth = 1; x.beginPath(); x.ellipse(bx, byy - 1, 2 + rp * 8, 0.8 + rp * 2.2, 0, 0, TAU); x.stroke(); }
      if (Math.floor(now / 300) % 4 === 0) fr(x, '#ffcd75', bx - 6 + Math.floor(hash(Math.floor(now / 300), 5) * 12), byy - 1, 1, 1); fr(x, '#ffcd75', bx + 5, byy, 1, 1); fr(x, '#ffcd75', bx - 7, byy - 2, 1, 1);
      fr(x, '#1a1c2c', bx - 2, byy - 9, 4, 8); fr(x, '#94b0c2', bx - 1, byy - 9, 2, 8); fr(x, '#566c86', bx, byy - 9, 1, 8);
      fr(x, '#1a1c2c', bx - 6, byy - 11, 12, 3); fr(x, '#c8d6e0', bx - 5, byy - 11, 10, 1); fr(x, '#3b5dc9', bx - 4, byy - 10, 8, 1); fr(x, '#566c86', bx - 5, byy - 9, 10, 1);
      fr(x, '#73eff7', bx - 1, byy - 15, 2, 4); fr(x, '#f4f4f4', bx, byy - 16, 1, 2);
      for (let i = 0; i < 12; i++) { const t = (now / 700 + i / 12) % 1, side = i % 2 ? 1 : -1, sp = 4 + (i % 3) * 2; fr(x, i % 3 ? '#73eff7' : '#f4f4f4', Math.round(bx + side * t * sp), Math.round(byy - 16 + 14 * t * t + (i % 3 ? 0 : 3 * t)), 1, 1); }
      for (let i = 0; i < 6; i++) { const t = (now / 500 + i / 6) % 1, a = i / 6 * TAU; fr(x, '#73eff7', Math.round(bx + Math.cos(a) * 6), Math.round(byy - 8 + t * 6), 1, 1); }
      break; }
    case 'armory': { const l = h.armory || 0, bx = P.x + 4, w = 28;   // stone armory with a shield crest; the Museum adds columns, a gold frieze and glass cases
      vHouse(x, bx, by - 6, { w, wh: 13, rh: 11, roof: l >= 2 ? 'teal' : 'slate', wall: 'stone', style: 'gable', door: 'c', dw: 6, dh: 8, doorC: '#5a4630', win: 2, lit: l >= 2 });
      const cyy = by - 6 - 13 - 7; fr(x, '#1a1c2c', P.x + 15, cyy - 1, 7, 8); fr(x, '#b13e53', P.x + 16, cyy, 5, 5); fr(x, '#ffcd75', P.x + 18, cyy, 1, 6); fr(x, '#ffcd75', P.x + 16, cyy + 2, 5, 1); fr(x, '#b13e53', P.x + 17, cyy + 5, 3, 1);
      for (const sx of [P.x - 1, P.x + P.w]) { fr(x, '#5a4630', sx, by - 18, 1, 12); fr(x, '#94b0c2', sx - 1, by - 19, 3, 2); fr(x, '#c8d6e0', sx, by - 21, 1, 2); }
      if (l >= 2) { for (const cx2 of [bx - 3, bx + 5, bx + w - 8, bx + w]) { fr(x, '#566c86', cx2, by - 20, 3, 14); fr(x, '#f4f4f4', cx2, by - 20, 1, 14); fr(x, '#94b0c2', cx2 + 1, by - 20, 1, 14); fr(x, '#c8d6e0', cx2 - 1, by - 21, 5, 1); fr(x, '#566c86', cx2 - 1, by - 7, 5, 1); }
        fr(x, '#ffcd75', bx - 3, by - 22, w + 6, 1); fr(x, '#ef9d47', bx - 3, by - 21, w + 6, 1); if (Math.floor(now / 220) % 4 === 0) fr(x, '#f4f4f4', bx + Math.floor(hash(Math.floor(now / 220), 7) * w), by - 30 + Math.floor(hash(Math.floor(now / 220), 8) * 8), 1, 1); }
      fr(x, '#1a1c2c', P.x - 1, by - 6, P.w + 2, 6); fr(x, '#566c86', P.x, by - 6, P.w, 5); fr(x, '#94b0c2', P.x, by - 6, P.w, 1);
      (save.armory || []).slice(0, 4).forEach((wq, i) => { const ix = P.x + 1 + i * 9; if (l >= 2) { fr(x, 'rgba(115,239,247,.25)', ix - 1, by - 16, 10, 10); fr(x, '#73eff7', ix - 1, by - 16, 10, 1); fr(x, '#f4f4f4', ix - 1, by - 16, 1, 1); }
        x.drawImage((IMG[itemIco(wq)] || IMG[wq.slot]).n[0], ix, by - 15 + (Math.floor(now / 600 + i) % 2)); fr(x, RCOL[wq.rarity], ix + 2, by - 6, 4, 1); });
      break; }
    case 'portal': { const l = h.portal || 0, py = by - 9, sw = (now / 260) % TAU;   // ring of standing stones around a swirl; Greater adds runes, Elder a sky beam
      x.fillStyle = '#1a1c2c'; x.beginPath(); x.ellipse(cx, py, 15, 7, 0, 0, TAU); x.fill(); x.fillStyle = '#29366f'; x.beginPath(); x.ellipse(cx, py, 12, 5, 0, 0, TAU); x.fill(); x.fillStyle = '#3b5dc9'; x.beginPath(); x.ellipse(cx, py, 7, 3, 0, 0, TAU); x.fill();
      for (let i = 0; i < 18; i++) { const a = sw * (i % 2 ? 1 : -1) + i * 0.9, rr = 2 + (i % 5) * 2; fr(x, ['#41a6f6', '#73eff7', '#a7f070', '#f4f4f4'][i % (l >= 2 ? 4 : 2)], Math.round(cx + Math.cos(a) * rr), Math.round(py + Math.sin(a) * rr * 0.45), 1, 1); }
      const n = 4 + l * 2, stones = []; for (let i = 0; i < n; i++) { const a = i / n * TAU + 0.3; stones.push([i, Math.round(cx + Math.cos(a) * 14), Math.round(py + Math.sin(a) * 7)]); } stones.sort((p, q) => p[2] - q[2]);
      for (const [i, sx, sy] of stones) { const ht = 7 + (i % 2) * 2 + (l >= 3 ? 2 : 0); x.fillStyle = 'rgba(6,10,16,.35)'; x.fillRect(sx, sy, 4, 1);
        fr(x, '#1a1c2c', sx - 2, sy - ht - 1, 5, ht + 1); fr(x, '#566c86', sx - 1, sy - ht, 3, ht); fr(x, '#94b0c2', sx - 1, sy - ht, 1, ht); fr(x, '#333c57', sx + 1, sy - ht + 1, 1, ht - 1); fr(x, '#c8d6e0', sx - 1, sy - ht, 2, 1);
        if (l >= 2 && Math.floor(now / 200 + i) % 3) fr(x, l >= 4 ? '#b55088' : '#73eff7', sx, sy - ht + 2, 1, 2); if (l >= 4) fr(x, '#9d5cc2', sx - 1, sy - ht - 1, 3, 1); }   // 1.5.0 astral rune caps
      if (l >= 3) { x.globalAlpha = 0.16 + 0.1 * Math.sin(now / 180); fr(x, l >= 5 ? '#9d5cc2' : '#41a6f6', cx - 3, P.y - 20, 6, py - P.y + 20); fr(x, '#f4f4f4', cx - 1, P.y - 20, 2, py - P.y + 20); x.globalAlpha = 1; }
      if (l >= 6) for (let i = 0; i < 6; i++) { const a = now / 600 + i / 6 * TAU; fr(x, i % 2 ? '#b55088' : '#f4f4f4', Math.round(cx + Math.cos(a) * 19), Math.round(py - 6 + Math.sin(a) * 6), 1, 1); }   // 1.5.0 abyss motes
      break; }
    case 'trophy': { const n = clamp(Math.floor(save.bossKills / 5), 1, 6), L = P.x, T = P.y;   // roofed trophy board: skulls, crossed blades, torches
      vShadow(x, cx + 2, by, 13); for (const px2 of [L + 1, L + 21]) { fr(x, '#3d2a1a', px2, T, 2, P.h); fr(x, '#8b5a2b', px2, T, 1, P.h); }
      fr(x, '#2e2216', L, T + 1, 24, 15); fr(x, '#5a4630', L + 1, T + 2, 22, 13); for (let k = T + 4; k < T + 15; k += 3) fr(x, '#3d2a1a', L + 1, k, 22, 1);
      for (let r = 0; r < 4; r++) fr(x, r === 0 ? VR.red[0] : r % 2 ? VR.red[2] : VR.red[1], L - 2 + r, T - 3 + r, 28 - r * 2, 1);
      for (let k = 0; k < 9; k++) { fr(x, '#c8d6e0', L + 7 + k, T + 3 + Math.floor(k * 1.2), 1, 1); fr(x, '#c8d6e0', L + 16 - k, T + 3 + Math.floor(k * 1.2), 1, 1); } fr(x, '#8b5a2b', L + 6, T + 2, 2, 2); fr(x, '#8b5a2b', L + 16, T + 2, 2, 2);
      for (let i = 0; i < n; i++) x.drawImage(IMG.skull.n[0], L + 3 + (i % 3) * 7, T + 4 + Math.floor(i / 3) * 6);
      if (raidTotal(save)) RAIDS.forEach((D, i) => { const px = RAIDS.length > 5 ? (L + 10 - Math.round((RAIDS.length - 1) * 2.6) + i * 5.2 | 0) : (L - 4 + i * 6.5 | 0), k = raidKills(save, D.id) > 0;   // 1.10.0: plinths tighten to fit 8   // 1.4.0 raid plinths: one per raid boss, its head once slain
        fr(x, '#2b2b3a', px, by - 1, 5, 2); fr(x, '#566c86', px + 1, by - 4, 3, 3); fr(x, '#94b0c2', px + 1, by - 4, 1, 3);
        if (k) { x.globalAlpha = 0.25 + 0.15 * Math.sin(now / 300 + i); fr(x, D.col, px - 1, by - 11, 7, 7); x.globalAlpha = 1; x.drawImage(IMG[D.ico].n[0], px, by - 10); const rk = RM.on ? raidKills(save, D.id) : 0, pp = rk >= 10 ? 3 : rk >= 5 ? 2 : rk >= 2 ? 1 : 0; for (let j = 0; j < pp; j++) fr(x, rk >= 10 ? '#f4f4f4' : '#ffcd75', px + 1 + j, by - 13, 1, 1); /* 1.9.5 rematch pips: 2+ / 5+ / 10+ kills, white at 10 */ } else fr(x, '#1a1c2c', px + 1, by - 6, 3, 2); });
      for (const tx of [L - 3, L + P.w + 2]) { fr(x, '#3d2a1a', tx, T + 6, 1, 10); const fl = Math.floor(now / 140 + tx) % 3; fr(x, fl ? '#ffcd75' : '#ef7d57', tx, T + 4 - fl, 1, 2 + fl); x.globalAlpha = 0.2; fr(x, '#ffcd75', tx - 2, T + 2, 5, 6); x.globalAlpha = 1; }
      break; }
  }
}
function drawLines(x, h, now, which, rev = 1) {   // banners / lanterns / wall; rev < 1 while their build animation wipes in
  if (which === 'banners' && h.banners) BANNERS.forEach((bx, i) => { if (i / BANNERS.length <= rev) vBanner(x, bx, i, now); });
  if (which === 'lanterns' && h.lanterns) { const pts = lanternPts(); pts.forEach(([lx, ly], i) => { if (i / pts.length <= rev) vLantern(x, lx, ly, i, now); }); }
  if (which === 'wall' && h.wall) vWall(x, h, now, rev);
}
function vBanner(x, bx, i, now) { const col = ['#b13e53', '#3b5dc9', '#38b764', '#5d275d', '#ef7d57', '#257179', '#41a6f6'][i], dk = ['#7a2a3f', '#29366f', '#1f5a34', '#3d1a40', '#a0602a', '#1d4f57', '#29366f'][i];
  fr(x, 'rgba(6,10,16,.3)', bx + 1, 80, 3, 1); fr(x, '#3d2a1a', bx, 61, 1, 19); fr(x, '#8b5a2b', bx, 61, 1, 1); fr(x, '#ffcd75', bx - 1, 59, 3, 1); fr(x, '#ffcd75', bx, 58, 1, 1); fr(x, '#5a4630', bx, 62, 6, 1);
  for (let c = 0; c < 5; c++) { const wv = Math.round(Math.sin(now / 220 + c * 0.9 + i) * 0.8), len = c === 2 ? 9 : c === 1 || c === 3 ? 8 : 7; fr(x, c === 0 ? '#f4ead0' : c === 4 ? dk : col, bx + 1 + c, 63 + wv, 1, len); if (c % 2 === 0) fr(x, dk, bx + 1 + c, 63 + wv + len, 1, 1); }
  const wv = Math.round(Math.sin(now / 220 + 2 + i) * 0.8); fr(x, '#ffcd75', bx + 2, 65 + wv, 3, 3); fr(x, col, bx + 3, 66 + wv, 1, 1); }
const lanternPts = () => [...LANTERNS.map(lx => [lx, 98]), ...[0.6, 2.55, 3.7, 5.7].map(a => [Math.round(PLAZA.x + Math.cos(a) * (PLAZA.rx + 4)) - 3, Math.round(PLAZA.y + Math.sin(a) * (PLAZA.ry + 3)) - 9])];
function vLantern(x, lx, ly, i, now) { const fl = 0.75 + 0.25 * Math.sin(now / 150 + i * 2); x.globalAlpha = 0.14 * fl; x.fillStyle = '#ffcd75'; x.beginPath(); x.ellipse(lx + 3, ly + 2, 9, 6, 0, 0, TAU); x.fill(); x.globalAlpha = 0.12 * fl; x.beginPath(); x.ellipse(lx + 3, ly + 10, 7, 2, 0, 0, TAU); x.fill(); x.globalAlpha = 1;
  fr(x, 'rgba(6,10,16,.3)', lx + 3, ly + 10, 3, 1); fr(x, '#1a1c2c', lx + 2, ly + 4, 2, 7); fr(x, '#566c86', lx + 2, ly + 4, 1, 7); fr(x, '#1a1c2c', lx + 1, ly + 10, 4, 1);
  fr(x, '#1a1c2c', lx, ly - 1, 6, 6); fr(x, '#333c57', lx + 1, ly - 2, 4, 1); fr(x, fl > 0.85 ? '#f4ead0' : '#ffcd75', lx + 1, ly, 4, 4); fr(x, '#ef9d47', lx + 1, ly + 3, 4, 1); fr(x, '#1a1c2c', lx + 3, ly, 1, 4); fr(x, '#ffcd75', lx + 2, ly - 3, 2, 1); }
function vWall(x, h, now, rev) { const stone = h.wall >= 2, gap = j => j > 80 && j < 100, R = Math.min(1, rev);
  if (!stone) { const stake = (X, Y, vert) => { if (vert) { fr(x, '#2e2216', X, Y, 5, 3); fr(x, '#8b5a2b', X, Y, 4, 2); fr(x, '#a8743a', X, Y, 4, 1); fr(x, '#c8a060', X + 4, Y, 1, 2); return; }
      fr(x, '#2e2216', X, Y, 3, 6); fr(x, '#8b5a2b', X, Y + 1, 2, 5); fr(x, '#a8743a', X, Y + 1, 1, 5); fr(x, '#c8a060', X + 1, Y, 1, 1); };
    for (let i = 0; i < VWW; i += 3) { if (i / VWW > rev) break; stake(i, 0); stake(i, VWH - 6); } fr(x, '#5a4630', 0, 3, VWW * R, 1); fr(x, '#5a4630', 0, VWH - 3, VWW * R, 1);
    for (let j = 0; j < VWH; j += 3) { if (gap(j)) continue; if (j / VWH > rev) break; stake(0, j, true); stake(VWW - 5, j, true); }
    for (const gx of [0, VWW - 6]) for (const gy of [74, 100]) { fr(x, '#2e2216', gx, gy, 6, 9); fr(x, '#8b5a2b', gx + 1, gy - 1, 4, 9); fr(x, '#c8a060', gx + 1, gy - 1, 4, 1); }
    return; }
  const seg = (X, Y, w, ht) => { fr(x, '#1a1c2c', X, Y, w, ht); fr(x, '#566c86', X, Y + 1, w, ht - 2); for (let k = 0; k < w; k += 4) fr(x, '#333c57', X + k, Y + 1 + ((k / 4) % 2) * 2, 1, 2); fr(x, '#94b0c2', X, Y + 1, w, 1); };
  for (let i = 0; i < VWW; i += 6) { if (i / VWW > rev) break; seg(i, 0, 6, 6); if ((i / 6) % 2 === 0) { fr(x, '#1a1c2c', i, 5, 3, 2); fr(x, '#566c86', i, 5, 3, 1); } seg(i, VWH - 6, 6, 6); if ((i / 6) % 2 === 0) { fr(x, '#1a1c2c', i, VWH - 8, 3, 2); fr(x, '#c8d6e0', i, VWH - 8, 3, 1); } }
  for (let j = 0; j < VWH; j += 6) { if (gap(j)) continue; if (j / VWH > rev) break; seg(0, j, 5, 6); seg(VWW - 5, j, 5, 6); }
  for (const [tx, ty] of [[0, 0], [VWW - 12, 0], [0, VWH - 16], [VWW - 12, VWH - 16], [0, 64], [VWW - 12, 64], [0, 100], [VWW - 12, 100]]) {
    fr(x, 'rgba(6,10,16,.35)', tx + 12, ty + 4, 2, 12); fr(x, '#1a1c2c', tx, ty + 3, 12, 13); fr(x, '#566c86', tx + 1, ty + 4, 10, 11); fr(x, '#94b0c2', tx + 1, ty + 4, 2, 11); fr(x, '#333c57', tx + 9, ty + 4, 2, 11);
    for (let r = ty + 7; r < ty + 15; r += 3) fr(x, '#333c57', tx + 1, r, 10, 1); fr(x, '#0b0b14', tx + 5, ty + 8, 2, 3); fr(x, '#ffcd75', tx + 5, ty + 9, 2, 1);
    for (let r = 0; r < 5; r++) fr(x, r === 0 ? VR.blue[0] : r % 2 ? VR.blue[2] : VR.blue[1], tx + 5 - r, ty - 1 + r, 2 + r * 2, 1); fr(x, VR.blue[3], tx + 4, ty + 1, 1, 2); }
  for (const [fx, col] of [[5, '#b13e53'], [VWW - 7, '#3b5dc9']]) { fr(x, '#3d2a1a', fx, 52, 1, 12); const wv = Math.floor(now / 300) % 2; fr(x, col, fx + (fx < 9 ? 1 : -4), 52 + wv, 4, 3); fr(x, '#ffcd75', fx + (fx < 9 ? 2 : -3), 53 + wv, 1, 1); }
}
function vAmbient(x, now, sc, h, items) {   // critters + passers-by, queued into the y-sorted draw list
  const nv = Math.min(24, 2 + Math.round(sc * 0.75));
  for (let i = 0; i < nv; i++) { const sp = 10 + (i % 4) * 4, dir = i % 2 ? 1 : -1, t = now / 1000 * sp + i * 41, kid = i % 7 === 6;
    if (i % 4 === 3 && sc >= 10) { const a = t / 30 * dir, px = PLAZA.x + Math.cos(a) * (PLAZA.rx - 8), py = PLAZA.y + Math.sin(a) * (PLAZA.ry - 6) - 3; items.push([py + 7, () => vPerson(x, Math.round(px), Math.round(py), i, t / 3, kid)]); continue; }
    const px = dir > 0 ? (t % (VWW + 8)) - 4 : VWW + 4 - (t % (VWW + 8)), py = 84 + (i % 4) * 2;
    items.push([py + 7, () => vPerson(x, Math.round(px), py, i, t / 3, kid)]);
    if (i === 0 && sc >= 14) items.push([py + 7.5, () => { const cxp = Math.round(px) - 14 * dir, hx = cxp + 12 * dir, leg = Math.floor(t) % 2;   // horse + cart behind walker 0
      spr(x, 'cart', 'n', 0, cxp - 5, py + 2, dir < 0); fr(x, 'rgba(6,10,16,.3)', hx - 4, py + 8, 9, 1); fr(x, '#5a4630', hx - 4, py + 2, 8, 4); fr(x, '#8b5a2b', hx - 4, py + 2, 8, 1);
      fr(x, '#5a4630', hx + (dir > 0 ? 3 : -6), py - 1, 3, 4); fr(x, '#2e2216', hx + (dir > 0 ? 5 : -6), py, 1, 2); fr(x, '#2e2216', hx + (dir > 0 ? 3 : -4), py - 2, 1, 2); fr(x, '#2e2216', hx - 4 + (leg ? 0 : 1), py + 6, 1, 2); fr(x, '#2e2216', hx + 2 + (leg ? 1 : 0), py + 6, 1, 2); fr(x, '#2e2216', hx + (dir > 0 ? -5 : 4), py + 2, 1, 3); }]); }
  if (sc >= 5) { const t = now / 1000 * 26, px = VWW + 10 - (t % (VWW + 30)); items.push([96, () => spr(x, 'vdog', 'n', Math.floor(t / 3) % 2, Math.round(px), 92, true)]); }
  if (sc >= 9) { const t = now / 1000 * 22 + 90, px = (t % (VWW + 40)) - 20; items.push([95.5, () => { spr(x, 'vdog', 'n', Math.floor(t / 3) % 2, Math.round(px), 91, false); vPerson(x, Math.round(px) - 8, 89, 13, t / 2.5, true); }]); }
  if (sc >= 8) for (let i = 0; i < 2; i++) { const hx = [138, 362][i], hy = [168, 134][i], wob = Math.sin(now / 1700 + i * 2); items.push([hy + 4, () => spr(x, 'vhen', 'r1', Math.floor(now / 300 + i) % 4 === 0 ? 1 : 0, Math.round(hx + wob * 6), hy, wob < 0)]); }
  if (h.fountain || sc >= 12) for (let i = 0; i < 2 + (sc >= 20 ? 1 : 0); i++) { const dx = ((now / 1000 * (4 + i * 2) + i * 140) % (VWW + 20)) - 10, dy = streamTop(Math.max(0, Math.round(dx))) + 3 + i * 2; items.push([dy + 3, () => spr(x, 'vduck', 'n', Math.floor(now / 700 + i) % 2, Math.round(dx), dy, false)]); }
  if (sc >= 10) for (let i = 0; i < 3 + (sc >= 20 ? 2 : 0); i++) { const t = (now / 1000 * (14 + i * 3) + i * 97) % (VWW + 60) - 30, by2 = 14 + i * 9 + Math.sin(now / 900 + i) * 3; items.push([1e4, () => spr(x, 'vbird', 'n', Math.floor(now / 160 + i) % 2, Math.round(t), Math.round(by2), false)]); }
  if (sc >= 6) for (let i = 0; i < Math.min(8, sc >> 2); i++) { const ax = (hash(i, 141) * VWW) | 0, ay = (hash(i, 143) * 70 + 104) | 0; if (vBlocked(ax, ay)) continue; const bx = Math.round(ax + Math.sin(now / 800 + i) * 6), byy = Math.round(ay + Math.cos(now / 650 + i * 2) * 4), c = ['#f4f4f4', '#ffcd75', '#73eff7', '#e8a0b0'][i % 4];
    items.push([byy, () => { fr(x, c, bx, byy, 1, 1); if (Math.floor(now / 110 + i) % 2) { fr(x, c, bx - 1, byy - 1, 1, 1); fr(x, c, bx + 1, byy - 1, 1, 1); } }]); }
  const fj = Math.floor(now / 2600), ft = (now % 2600) / 600; if (sc >= 7 && ft < 1) { const fx = 30 + Math.floor(hash(fj, 151) * 340); if (fx < 184 || fx > 216) items.push([9e3, () => { const yy = streamTop(fx) + 5 - Math.round(Math.sin(ft * Math.PI) * 5); fr(x, '#94b0c2', fx + Math.round(ft * 4), yy, 2, 1); if (ft > 0.85) fr(x, '#73eff7', fx + 3, streamTop(fx) + 5, 3, 1); }]); }
}
function vMill(x, now) { const { x: X, y: Y } = MILL, cx = X + 8, by = Y + 30;   // windmill on the north meadow (score 18+)
  vShadow(x, cx + 3, by, 9); for (let r = 0; r < 20; r++) { const y = by - 1 - r, hw = 6 - Math.floor(r / 7); fr(x, '#4a3424', cx - hw - 1, y, hw * 2 + 2, 1); fr(x, '#e0d2b0', cx - hw, y, hw * 2, 1); fr(x, '#f4ead0', cx - hw, y, 2, 1); fr(x, '#b8a888', cx + hw - 2, y, 2, 1); }
  fr(x, '#2e2216', cx - 3, by - 7, 6, 6); fr(x, '#8b5a2b', cx - 2, by - 6, 4, 5); vWin(x, cx - 1, by - 15, 3, 3, true, {}, VR.red);
  for (let r = 0; r < 6; r++) fr(x, r ? (r % 2 ? VR.red[2] : VR.red[1]) : VR.red[0], cx - r - 1, by - 26 + r, r * 2 + 2, 1);
  const a0 = now / 1400, hy = by - 22; for (let k = 0; k < 4; k++) { const a = a0 + k * Math.PI / 2, ca = Math.cos(a), sa = Math.sin(a); for (let s = 2; s < 14; s++) { const px = Math.round(cx + ca * s), py = Math.round(hy + sa * s); fr(x, '#5a4630', px, py, 1, 1); if (s > 4) fr(x, '#e0d2b0', Math.round(px - sa * 2), Math.round(py + ca * 2), 1, 1); if (s > 4 && s % 2) fr(x, '#b8a888', Math.round(px - sa), Math.round(py + ca), 1, 1); } }
  fr(x, '#1a1c2c', cx - 1, hy - 1, 2, 2); spr(x, 'sack', 'n', 0, cx + 6, by - 4); spr(x, 'sack', 'n', 0, cx + 9, by - 3); }
function vCottage(x, hx, hy, v, i, sc, now, items) { const tier = homeTier(sc), roof = tier === 0 ? 'thatch' : VROOF_OF[v] || 'red', B = hy + 18;
  const o = tier === 0 ? { w: 16, wh: 9, rh: 7, roof, wall: i % 3 === 0 ? 'stone' : 'wood', door: i % 2 ? 'l' : 'r', dw: 4, dh: 6, win: 1, lit: i % 3 !== 1, chim: i % 2 ? 11 : 2, slope: 0.8 }
    : tier === 1 ? { w: 18, wh: 10, rh: 8, roof, wall: i % 4 === 0 ? 'stone' : i % 4 === 2 ? 'cream' : 'plaster', timber: i % 4 !== 0, door: 'c', dw: 4, dh: 6, win: 2, lit: true, chim: i % 2 ? 13 : 2, shut: i % 2 === 0, slope: 0.7 }
      : { w: 20, wh: 16, rh: 8, fl: 2, roof, wall: i % 4 === 0 ? 'stone' : i % 4 === 2 ? 'cream' : 'plaster', timber: i % 4 !== 0, door: 'c', dw: 4, dh: 6, win: 2, lit: true, chim: i % 2 ? 15 : 2, shut: i % 2 === 0, boxes: true, slope: 0.6 };
  const X = hx + ((20 - o.w) >> 1);
  items.push([B, () => { const m = vHouse(x, X, B, o); if (i % 2 === 0 || tier >= 1) vSmoke(x, m.cx, m.cy, now, 2 + tier, i, 0.45);
    if (tier >= 1) { const k = i % 4; if (k === 0) spr(x, 'barrel', 'n', 0, X + o.w + 1, B - 5); else if (k === 1) { for (let f = -6; f < 0; f += 2) { fr(x, '#a8743a', X + f, B - 4, 1, 4); fr(x, '#c8a060', X + f, B - 4, 1, 1); } fr(x, '#8b5a2b', X - 6, B - 3, 6, 1); }
      else if (k === 2) { for (let w = 0; w < 3; w++) { fr(x, '#8b5a2b', X + o.w + 1, B - 2 - w * 2, 5, 2); fr(x, '#c8a060', X + o.w + 5, B - 2 - w * 2, 1, 2); } } else spr(x, 'crate', 'n', 0, X - 6, B - 4); }
    if (tier >= 2 && i % 3 === 1) { fr(x, '#5a4630', X - 9, B - 9, 1, 9); fr(x, '#5a4630', X - 2, B - 9, 1, 9); fr(x, '#c8d6e0', X - 9, B - 9, 8, 1); fr(x, '#f4f4f4', X - 8, B - 8, 2, 3); fr(x, '#b13e53', X - 5, B - 8, 2, 3); fr(x, '#41a6f6', X - 3, B - 8, 1, 2); } }]); }
function drawVillage(c, now) {
  if (!c) return; const x = c.getContext('2d'), h = save.home, sc = villageScore(), cam = camFor(c, now); x.imageSmoothingEnabled = false;
  const A = vAnim && now >= vAnim.t0 && now - vAnim.t0 < 1600 ? vAnim : null, aE = A ? clamp((now - A.t0) / 900, 0, 1) : 1;
  x.setTransform(1, 0, 0, 1, -cam.x, -cam.y);
  x.drawImage(vGroundC(sc), 0, 0);
  for (let i = 0; i < 34; i++) { const X = Math.floor((hash(i, 31) * VWW + now / 1000 * (6 + hash(i, 32) * 8)) % VWW); if (X > 186 && X < 214) continue; const a = streamTop(X), b = streamBot(X), yy = a + 2 + Math.floor(hash(i, 33) * (b - a - 3)); fr(x, i % 3 ? '#41a6f6' : '#73eff7', X, yy, 2 + (i % 2), 1); }
  // everything standing on the ground is y-sorted by its base line, so folk walk behind / in front of buildings
  const items = [];
  VTREES.slice(0, Math.min(VTREES.length, 14 + sc * 2)).forEach(([tx, ty, kd], i) => items.push([ty + 8, () => vTree(x, tx, ty, kd, i, false, sc)]));
  COTTAGES.slice(0, Math.min(COTTAGES.length, Math.floor(sc / 2.5))).forEach(([hx, hy, v], i) => vCottage(x, hx, hy, v, i, sc, now, items));
  for (const [k, px, py, need] of VPROPS) if (sc >= need) { const im = IMG[k].n[0]; items.push([py + im.height, () => { fr(x, 'rgba(6,10,16,.3)', px + 1, py + im.height, im.width, 1); x.drawImage(im, px, py); }]); }
  if (sc >= MILL.sc) items.push([MILL.y + 30, () => vMill(x, now)]);
  const drawP = P => { const anim = A && A.k === P.k && !P.line ? A : null;
    if (!anim) return drawPlot(x, P, now, h, sc);
    if (anim.fresh && aE < 1) {   // rise out of a scaffold, a builder on the rising beam
      const top = P.y - 14, full = P.y + P.h - top + 10, hh = Math.round(full * aE), ly = P.y + P.h + 2 - hh;
      x.save(); x.beginPath(); x.rect(P.x - 14, P.y + P.h + 3 - hh, P.w + 28, hh + 8); x.clip(); drawPlot(x, P, now, h, sc); x.restore();
      for (const sx of [P.x - 3, P.x + P.w + 1]) { fr(x, '#5a4630', sx, P.y - 4, 2, P.h + 4); fr(x, '#a8743a', sx, P.y - 4, 1, P.h + 4); }
      for (let yy = P.y; yy < P.y + P.h; yy += 6) { fr(x, '#8b5a2b', P.x - 3, yy, P.w + 6, 1); fr(x, '#3d2a1a', P.x - 3, yy + 1, P.w + 6, 1); }
      for (let k = 0; k < Math.min(P.w, P.h); k++) fr(x, '#5a4630', P.x + k, P.y + P.h - 1 - k, 1, 1);
      fr(x, '#ffcd75', P.x - 3, ly, P.w + 6, 1); vPerson(x, P.x + Math.round((P.w - 4) * (0.5 + 0.5 * Math.sin(now / 200))), Math.max(P.y - 8, ly - 7), 2, now / 120);
    } else drawPlot(x, P, now, h, sc); };
  for (const P of VPLOTS) if (!P.line) items.push([P.y + P.h, () => drawP(P)]);
  if (h.banners) { const rev = A && A.k === 'banners' ? aE : 1; BANNERS.forEach((bx, i) => { if (i / BANNERS.length <= rev) items.push([80, () => vBanner(x, bx, i, now)]); }); }
  if (h.lanterns) { const pts = lanternPts(), rev = A && A.k === 'lanterns' ? aE : 1; pts.forEach(([lx, ly], i) => { if (i / pts.length <= rev) items.push([ly + 10, () => vLantern(x, lx, ly, i, now)]); }); }
  vAmbient(x, now, sc, h, items);
  items.sort((p, q) => p[0] - q[0]); for (const it of items) it[1]();
  drawLines(x, h, now, 'wall', A && A.k === 'wall' ? aE : 1);
  if (h.wall) { const t = now / 1000 * 8, gx = 20 + (t % 120 < 60 ? t % 60 : 60 - t % 60) * 5; vPerson(x, Math.round(gx), VWH - 13, 3, t); }   // guard on the south wall
  // signs for line decorations, upgrade bubbles, labels, selection
  for (const P of VPLOTS) { const st = plotState(P.k), cx = Math.round(P.x + P.w / 2), by = P.y + P.h;
    if (P.line) { if (!st) drawPlot(x, P, now, h, sc); }
    else if (st > 0 && plotUpgrade(P)) { const up = Math.floor(now / 300) % 2, my = P.y - 15 - up; fr(x, '#0b0b14', cx - 5, my, 11, 9); fr(x, '#0b0b14', cx - 1, my + 9, 3, 2); fr(x, up ? '#ffcd75' : '#a7f070', cx - 4, my + 1, 9, 7); fr(x, up ? '#f4ead0' : '#d8ffb0', cx - 4, my + 1, 9, 1); fr(x, up ? '#ffcd75' : '#a7f070', cx, my + 8, 1, 2); text(x, '!', cx + 1, my + 1, '#0b0b14', 1, 'c'); }
    const func = ['tower', 'hall', 'tavern', 'smithy', 'gate', 'hearth', 'armory', 'portal'].includes(P.k);
    if (c.id !== 'hubVillage' && (func || !st || vSel && PLOT_OF[vSel] === P) && !(P.k === 'tavern' && h.slayer) && !(P.line && st)) {
      const lbl = P.k === 'smithy' && h.forge ? (h.forge >= 2 ? 'ANVIL' : 'FORGE') : P.k === 'tavern' ? `${h.inn ? (h.inn >= 2 ? 'GRAND INN' : 'INN') : 'TAVERN'} ${h.tavern}` : P.k === 'gate' && h.gate >= 2 ? 'FROST GATE' : P.k === 'armory' && h.armory >= 2 ? 'MUSEUM' : P.k === 'portal' && h.portal >= 2 ? (['GR. PORTAL', 'ELDER PORTAL', 'ASTRAL PORTAL', 'VOID PORTAL', 'ABYSS PORTAL'][Math.min(6, h.portal) - 2]) : P.lbl + (P.k === 'hearth' && h.fire ? ' +' + h.fire : '');
      const ly = P.line ? by + 1 : P.k === 'garden' && h.garden >= 2 ? by + 38 : by + 1; fr(x, 'rgba(11,11,20,.62)', cx - lbl.length * 2 - 1, ly, lbl.length * 4 + 1, 6);
      text(x, lbl, cx, ly, st < 0 ? '#566c86' : st ? '#ffcd75' : '#94b0c2', 1, 'c'); }
    if (vSel && PLOT_OF[vSel] === P) { x.strokeStyle = '#f4f4f4'; x.lineWidth = 1; x.setLineDash([2, 2]); x.lineDashOffset = -Math.floor(now / 120) % 4; x.strokeRect(P.x - 3.5, P.y - 4.5, P.w + 7, P.h + 8); x.setLineDash([]); x.lineDashOffset = 0; } }
  // build / upgrade fx: dust at the base while rising, then sparkles + a flash ring
  if (A) { const P = VPLOTS.find(p => p.k === A.k), age = (now - A.t0) / 1000;
    if (P) { const pts = P.k === 'banners' ? BANNERS.map(b => [b + 3, 70]) : P.k === 'lanterns' ? LANTERNS.map(l => [l + 3, 100]) : P.k === 'wall' ? [[VWW * aE, 2], [VWW * aE, VWH - 3], [2, VWH * aE], [VWW - 2, VWH * aE]] : [[P.x + P.w / 2, P.y + P.h / 2]];
      for (const [px, py] of pts) {
        if (!P.line && age < 1.1) for (let i = 0; i < 14; i++) { const a = hash(i, 81) * Math.PI, r = 4 + age * 20 * hash(i, 82); x.globalAlpha = Math.max(0, 0.75 - age * 0.6); fr(x, i % 3 ? '#94b0c2' : '#c8a878', Math.round(P.x + P.w / 2 + Math.cos(a) * (P.w / 2 + r) * (i % 2 ? 1 : -1)), Math.round(P.y + P.h - 2 - Math.sin(a) * r * 0.4), 2, 2); }
        x.globalAlpha = 1;
        for (let i = 0; i < 10; i++) { const t = (age * 1.6 + hash(i, 83)) % 1, rr = (P.line ? 8 : Math.max(P.w, P.h) * 0.7) * hash(i, 84); if (age > 1.5) break; const sx = Math.round(px + Math.cos(i * 0.8 + age * 3) * rr), sy = Math.round(py - t * 14 + Math.sin(i * 1.3) * rr * 0.5);
          fr(x, i % 2 ? '#ffcd75' : '#f4f4f4', sx, sy, 1, 1); if (i % 3 === 0) { fr(x, '#ffcd75', sx - 1, sy, 3, 1); fr(x, '#ffcd75', sx, sy - 1, 1, 3); } } }
      if (!P.line && (!A.fresh || aE >= 1)) { const k = clamp((age - (A.fresh ? 0.9 : 0)) / 0.6, 0, 1); x.globalAlpha = 0.5 * (1 - k); fr(x, '#f4f4f4', P.x - 2, P.y - 2, P.w + 4, P.h + 4); x.globalAlpha = 1 - k; x.strokeStyle = '#ffcd75'; x.lineWidth = 1; x.beginPath(); x.ellipse(P.x + P.w / 2, P.y + P.h - 2, P.w / 2 + 4 + k * 10, 4 + k * 4, 0, 0, TAU); x.stroke(); x.globalAlpha = 1; } } }
  x.setTransform(1, 0, 0, 1, 0, 0);
  // overlay (screen space): score badge (house icon + progress bar) + pan hints
  const s = `VILLAGE ${sc}/${VMAX}`, bw = s.length * 4 + 14; fr(x, '#0b0b14', 1, 1, bw, 12); fr(x, 'rgba(26,28,44,.92)', 2, 2, bw - 2, 10); fr(x, '#333c57', 2, 2, bw - 2, 1);
  fr(x, VR.red[0], 3, 5, 7, 1); fr(x, VR.red[2], 4, 4, 5, 1); fr(x, VR.red[3], 5, 3, 3, 1); fr(x, '#e0d2b0', 4, 6, 5, 4); fr(x, '#5a4630', 6, 8, 1, 2); fr(x, '#ffcd75', 4, 7, 1, 1); fr(x, '#ffcd75', 8, 7, 1, 1);
  text(x, s, 11, 2, '#f4f4f4'); fr(x, '#1a1c2c', 12, 10, bw - 14, 1); fr(x, sc >= VMAX ? '#a7f070' : '#ffcd75', 12, 10, Math.max(1, Math.round((bw - 14) * sc / VMAX)), 1);
  if (c.id !== 'hubVillage') { x.fillStyle = 'rgba(244,244,244,.55)'; const my = c.height / 2, mx = c.width / 2;
    if (cam.x > 0) { x.beginPath(); x.moveTo(2, my); x.lineTo(6, my - 4); x.lineTo(6, my + 4); x.fill(); } if (cam.x < VWW - c.width) { x.beginPath(); x.moveTo(c.width - 2, my); x.lineTo(c.width - 6, my - 4); x.lineTo(c.width - 6, my + 4); x.fill(); }
    if (cam.y > 0) { x.beginPath(); x.moveTo(mx, 2); x.lineTo(mx - 4, 6); x.lineTo(mx + 4, 6); x.fill(); } if (cam.y < VWH - c.height) { x.beginPath(); x.moveTo(mx, c.height - 2); x.lineTo(mx - 4, c.height - 6); x.lineTo(mx + 4, c.height - 6); x.fill(); }
    if (!vAnim && !save.home.panHint) { fr(x, 'rgba(11,11,20,.7)', c.width - 82, 1, 81, 8); text(x, 'DRAG TO LOOK AROUND', c.width - 3, 2, '#94b0c2', 1, 'r'); } }
}
// canvas client px -> world px (handles object-fit letterboxing)
function vToWorld(c, e) { const r = c.getBoundingClientRect(), s = Math.min(r.width / c.width, r.height / c.height), ox = r.left + (r.width - c.width * s) / 2, oy = r.top + (r.height - c.height * s) / 2;
  return [(e.clientX - ox) / s + Math.round(vCam.x), (e.clientY - oy) / s + Math.round(vCam.y), s]; }
function vHit(wx, wy) { const pad = P => wx >= P.x - 3 && wx <= P.x + P.w + 3 && wy >= P.y - 6 && wy <= P.y + P.h + 8;
  return VPLOTS.find(P => P.line && pad(P)) || VPLOTS.find(P => !P.line && pad(P)) || null; }
function vPick(P) { return P.cards.find(c => VILLAGE[c] && villageCan(c)) || (P.k === 'tavern' && save.home.tavern < HOME.tavern.max ? 'tavern' : null) || P.cards.find(c => VILLAGE[c] && villageNext(c) && plotState(P.k) > 0 && c !== P.k) || P.cards[0]; }
function plotScreen(k) { const c = $('#villageCv'), P = VPLOTS.find(p => p.k === k), r = c.getBoundingClientRect(), s = Math.min(r.width / c.width, r.height / c.height), ox = r.left + (r.width - c.width * s) / 2, oy = r.top + (r.height - c.height * s) / 2;
  return { x: ox + (P.x + P.w / 2 - Math.round(vCam.x)) * s, y: oy + (P.y + P.h / 2 - Math.round(vCam.y)) * s }; }
{ const c = $('#villageCv'); c.style.touchAction = 'none';
  c.addEventListener('pointerdown', e => { vDrag = { id: e.pointerId, sx: e.clientX, sy: e.clientY, cx: vCam.x, cy: vCam.y, moved: false }; vPan = null; try { c.setPointerCapture(e.pointerId); } catch (er) {} });
  c.addEventListener('pointermove', e => { if (!vDrag || e.pointerId !== vDrag.id) return; const s = vToWorld(c, e)[2];
    if (Math.hypot(e.clientX - vDrag.sx, e.clientY - vDrag.sy) > 6) vDrag.moved = true;
    if (vDrag.moved) { vCam.x = clamp(vDrag.cx - (e.clientX - vDrag.sx) / s, 0, VWW - c.width); vCam.y = clamp(vDrag.cy - (e.clientY - vDrag.sy) / s, 0, VWH - c.height); if (!save.home.panHint) { save.home.panHint = 1; persist(); } drawVillage(c, performance.now()); } });
  c.addEventListener('pointerup', e => { const d = vDrag; vDrag = null; if (!d || e.pointerId !== d.id || d.moved) return; const [wx, wy] = vToWorld(c, e), P = vHit(wx, wy); if (!P) return;
    vSel = vPick(P); renderHome(); const el = $(`#homeList [data-b="${vSel}"]`); if (el) el.scrollIntoView({ block: 'nearest', behavior: 'smooth' }); sfx('swap'); });
  c.addEventListener('pointercancel', () => { vDrag = null; }); }
$('#hubVillage').addEventListener('pointerdown', () => showScreen('home'));
function bCard(ico, name, lvl, body, key, cls = '') { return `<div class="card bld${cls}${vSel === key ? ' sel' : ''}" data-b="${key}"><i style="background-image:url(${ico.startsWith('data:') ? ico : bigIcon(IMG[ico].n[0], 5)})"></i><div class="bt"><h3>${name} <span class="tiny">${lvl}</span></h3>${body}</div></div>`; }
function buyBtn(what, label, cost, maxed) { return maxed ? `<button class="pxbtn small" disabled>${label} MAX</button>` : `<button class="pxbtn small${save.gold >= cost ? ' go' : ''}" data-buy="${what}" ${save.gold >= cost ? '' : 'disabled'}>${label} ${nfmt(cost)}G</button>`; }
const ck = (ok, s) => `<span class="${ok ? 'ok' : 'no'}">${ok ? '✓' : '✗'} ${s}</span>`;
function vCard(k) {
  const B = VILLAGE[k], l = save.home[k] || 0, n = villageNext(k), max = B.levels.length, tierOf = B.on;
  const icoImg = k === 'wall' && l >= 2 ? IMG.wall.s[0] : k === 'inn' && save.home.slayer ? IMG.inn.p[0] : B.icoV ? IMG[B.ico][B.icoV][0] : IMG[B.ico].n[0];
  const nm = B.names ? B.names[Math.max(0, l - 1)] : B.name;
  let body = `<p>${B.d}${B.deco ? ' <span class="tiny">(cosmetic)</span>' : ''}</p>`;
  if (B.fx && B.bonus) body += bonus18(B, l, max); else if (B.fx) body += `<p class="tiny">Now: <b>${B.fx(l)}</b>${l < max ? ` · next: <b>${B.fx(l + 1)}</b>` : ''}</p>`;
  if (k === 'hall' && l) body += `<p>Hero: <b>${HEROES[save.hero].name}</b> · ${HERO_IDS.filter(id => save.heroes[id]).length}/${HERO_IDS.length} recruited</p><div class="row"><button class="pxbtn small go" data-go="heroes">CHOOSE HERO ▶</button></div>`;
  if (k === 'gate' && l) body += `<p>Open: <b>Bone Crypt</b>${l >= 2 ? ' and <b>Frost Spire</b>' : ''}. Pick the map with ⇄ next to START.</p><p class="tiny">${zoneLine('crypt').replace('Zone threat', 'Bone Crypt: zone threat')}${l >= 2 ? '<br>' + zoneLine('frost').replace('Zone threat', 'Frost Spire: zone threat') : ''}</p>${l < 2 ? `<p class="tiny">Tier 2 opens the <b>Frost Spire</b>: ${MAPS.frost.d}.</p>` : ''}`;
  if (k === 'armory' && LOAD.on) { const A = save.armory, cap = keepCap();   // 1.13.0 loadout slots + stash
    body += `<p class="tiny">▸ Loadout <b>${A.length}/${cap}</b> slots (stash pieces you take into a run) · stash <b>${save.stash.length}/${stashCap()}</b>. Loadout pieces are equipped at START and are <b>lost if you die</b> with them; extract to bank everything.</p><div class="arm">${A.map(w => `<span class="armi">${tile(w, '', false, '')}<span class="tiny" style="color:${RCOL[w.rarity]}">${w.name}<br><span class="sb">${SLOTN[w.slot || 'weapon']} · T${w.tier + 1}</span></span></span>`).join('') || '<span class="tiny">empty</span>'}</div><div class="row"><button class="pxbtn small go" data-go="stash">OPEN STASH ▶</button><button class="pxbtn small" id="bArmClose" aria-label="Close Armory">◀ CLOSE</button></div>`; }
  else if (k === 'armory') { const A = save.armory, cap = keepCap();   // 0.6.0 keep-set lives here
    body += `<p class="tiny">Kept for the next run <b>${A.length}/${cap}</b>${l ? '' : ' (camp heirloom slot)'}: equipped at run start. Choose them on the run-end screen. <b>Extract</b> to lose nothing; die or abandon without extracting and <b>one random ★ heirloom</b> is destroyed (you still keep from the rest).</p><div class="arm">${A.map((w, i) => `<span class="armi">${tile(w, `data-unkeep="${i}" aria-label="Remove ${w.name}"`, false, '<em class="x">✕</em>')}<span class="tiny" style="color:${RCOL[w.rarity]}">${w.name}<br><span class="sb">${SLOTN[w.slot || 'weapon']} · T${w.tier + 1}</span><span class="sd">${afxLine(w)}</span></span></span>`).join('') || '<span class="tiny">empty</span>'}</div>`; }
  if (k === 'trophy') body += `<p class="tiny">Raid trophies <b>${raidTotal(save)}/${RAIDS.length}</b>${raidTotal(save) ? ': ' + RAIDS.filter(D => raidKills(save, D.id)).map(D => `<b style="color:${D.col}">${D.name}</b> x${raidKills(save, D.id)}${RM.on ? ` (rematch T${raidKills(save, D.id)})` : ''}`).join(', ') : ''}</p>${raidBoardVisible() ? '<div class="row"><button class="pxbtn small go" data-go="raids">RAID BOARD ▶</button></div>' : ''}`;   // 1.4.0
  if (k === 'portal') { const P9 = save.portal;   // 0.9.0
    body += `<p class="tiny">${l ? portalWaves().map(W => `wave <b>${W}</b>: <b>${nfmt(portalCost(W))}g</b>/use`).join(' · ') + ` · pick it with ⊙ next to START` : 'Gold per use: (100 x wave + 500), +20% for each portal run in a row (a normal run resets it).'}${P9.uses ? ` · used <b>${P9.uses}</b>x, <b>${nfmt(P9.spent)}g</b> spent` : ''}</p>`; }
  if (n) { const mOk = n.ok(save), gOk = save.gold >= n.cost && resHas(n.res), nn = B.names ? B.names[l] : null;
    body += `<div class="gate">${nn && l ? `<b>Next: ${nn}</b> ` : ''}${ck(mOk, `${n.need} (${n.prog(save)})`)} ${ck(save.gold >= n.cost, nfmt(n.cost) + 'g')}${n.res ? ' ' + ck(resHas(n.res), resTxt(n.res)) : ''}</div><div class="row"><button class="pxbtn small${mOk && gOk ? ' go' : ''}" data-buy="${k}" ${mOk && gOk ? '' : 'disabled'}>${l ? 'UPGRADE' : tierOf ? 'UPGRADE' : 'BUILD'} ${nfmt(n.cost)}G</button></div>`; }
  const lv = l ? (max > 1 ? `${tierOf ? 'TIER' : 'LV'} ${l}/${max}` : 'BUILT') : tierOf ? `TIER 0/${max}` : 'EMPTY PLOT';
  return bCard(bigIcon(icoImg, 5), nm, lv, body, k, (l ? '' : ' unbuilt') + (tierOf ? ' tier' : ''));
}
const CARD_ORDER = [['tavern', 'inn', 'slayer', 'hearth', 'fire', 'smithy', 'forge', 'hall', 'gate', 'armory', 'portal', 'workshop'], ['wall', 'statue', 'garden', 'banners', 'lanterns', 'fountain', 'market', 'watch', 'trophy']];
function renderHome() {
  const h = save.home, tp = tavernPending(), cap = HOME.tavern.cap(h.tavern);
  $('#homeGold').textContent = `${nfmt(save.gold)} gold`; $('#homeScore').textContent = `· village ${villageScore()}/${VMAX} · tap a plot, drag to look around`;
  const A = save.armory, kc = keepCap();
  if (LOAD.on) $('#homeHeir').innerHTML = `▸ Loadout ${A.length}/${kc}${A.length ? `: ${A.map(w => `<b style="color:${RCOL[w.rarity]}">${w.name}</b>`).join(', ')}` : ''} · stash ${save.stash.length}/${stashCap()}. Extract to bank everything; die and you lose all you carried.`;
  else $('#homeHeir').innerHTML = A.length ? `Kept for the next run (${A.length}/${kc}): ${A.map(w => `<b style="color:${RCOL[w.rarity]}">★ ${w.name}</b> (${SLOTN[w.slot || 'weapon']}: ${afxLine(w)})`).join(', ')}. Equipped at run start; die without extracting and one random ★ heirloom is destroyed.` : `Nothing kept. Extract through an exit gate to keep ${kc === 1 ? 'one item (any slot) as an heirloom; build the ARMORY to keep 3' : `up to ${kc} items in the Armory`}.`;
  const tavIco = bigIcon((h.inn ? IMG.inn : IMG.tavern)[h.slayer ? 'p' : 'n'][0], 5), tavName = (h.slayer ? 'SLAYER ' : '') + (h.inn ? VILLAGE.inn.names[h.inn - 1] : 'TAVERN');
  const cards = {
    tavern: () => bCard(tavIco, tavName, `LV ${h.tavern}/${HOME.tavern.max}`, `<p>Brews gold while you're away: <b>+${HOME.tavern.rate(h.tavern)}/min</b>, stores up to ${cap}.${h.inn ? ` <span class="tiny">(inn x${INN_MULT[h.inn]})</span>` : ''}</p><div class="bar gold"><i style="width:${tp / cap * 100}%"></i></div><p class="tiny">${tp}/${cap} stored</p><div class="row"><button id="bCollect" class="pxbtn small go" ${tp ? '' : 'disabled'}>COLLECT ${tp}G</button>${buyBtn('tavern', 'UPGRADE', h.tavern < HOME.tavern.max ? HOME.tavern.cost(h.tavern) : 0, h.tavern >= HOME.tavern.max)}</div>`, 'tavern'),
    hearth: () => bCard('hearth', h.fire ? VILLAGE.fire.names[h.fire - 1] : 'HEARTH', '', `<p>Extra lives <b>${h.life}/${HOME.life.max}</b>: revive at ${reviveHp() * 100}% HP once per life, each run.</p><p>Wave mend <b>${h.mend}/${HOME.mend.max}</b>: heal ${mendPct() * h.mend}% max HP at each new wave <span class="tiny">(${mendPct()}% per rank)</span>.</p><div class="row">${buyBtn('life', '+LIFE', h.life < HOME.life.max ? HOME.life.cost(h.life) : 0, h.life >= HOME.life.max)}${buyBtn('mend', '+MEND', h.mend < HOME.mend.max ? HOME.mend.cost(h.mend) : 0, h.mend >= HOME.mend.max)}</div>`, 'hearth'),
    smithy: () => bCard('smithy', h.forge ? VILLAGE.forge.names[h.forge - 1] : 'SMITHY', h.smithy ? 'BUILT' : 'RUINS', h.smithy ? `<p>Pick your plain starting weapon${h.forge ? ` (<b>+${Math.round((FORGE_POW[h.forge] - 1) * 100)}% power</b> from the forge)` : ''}. If you kept a weapon (heirloom / Armory), this one comes along as a spare in your bag.</p>${ON18 ? smithLine18() : ''}<div class="row">${Object.keys(BASES).map(b => `<button class="pxbtn small${h.start === b ? ' go' : ''}" data-start="${b}">${BASES[b].name}</button>`).join('')}</div>` : `<p>Rebuild the forge to choose your starting weapon (Wand, Cleaver, Bow, Spear, Bolt Thrower or Flail).</p>${ON18 ? smithLine18() : ''}<div class="row">${buyBtn('smithy', 'BUILD', HOME.smithy.cost, false)}</div>`, 'smithy', h.smithy ? '' : ' unbuilt'),
  };
  cards.workshop = workshopCard;   // 1.14.0
  let html = `<div class="sect tiny">FUNCTIONAL · buildings and tiers that change your runs</div>` + CARD_ORDER[0].map(k => cards[k] ? cards[k]() : vCard(k)).join('');
  html += `<div class="sect tiny">PRESTIGE · cosmetic, fills the town as you progress</div>` + CARD_ORDER[1].map(vCard).join('');
  html += `<div class="card bld off${vSel === 'tower' ? ' sel' : ''}" data-b="tower"><i style="background-image:url(${bigIcon(IMG.tower.s[0], 5)})"></i><div class="bt"><h3>WIZARD TOWER <span class="tiny">🔒 RUINS</span></h3><p>Swap and remap abilities. Coming in a later build.</p></div></div>`;
  const list = $('#homeList'), st = list.scrollTop; list.innerHTML = html; list.scrollTop = st;
  const c = $('#bCollect'); if (c) c.onclick = () => { const g = collectTavern(); if (g) { sfx('coin'); toast(`+${g} gold from the tavern`); } renderHome(); };
  list.querySelectorAll('[data-buy]').forEach(b => b.onclick = e => { e.stopPropagation(); const k = b.dataset.buy, P = PLOT_OF[k], fresh = P && plotState(P.k) === 0;
    if (homeBuy(k)) { sfx('lvl'); vSel = k; const lv = save.home[k], nm = VILLAGE[k] && VILLAGE[k].names ? VILLAGE[k].names[lv - 1] : VILLAGE[k] ? VILLAGE[k].name : k.toUpperCase();
      toast(VILLAGE[k] ? `${nm} ${lv > 1 || VILLAGE[k].on ? 'upgraded' : 'built'}!${k === 'gate' && lv === 2 ? ' Frost Spire open.' : ''}` : 'Upgraded!'); if (P) { panTo(k); vAnimate(k, performance.now(), fresh); } } renderHome(); });
  list.querySelectorAll('[data-unkeep]').forEach(b => b.onclick = e => { e.stopPropagation(); const i = +b.dataset.unkeep, w = save.armory[i]; if (!w || !confirm(`Take ${w.name} out of the Armory? It will be gone.`)) return; save.armory.splice(i, 1); persist(); sfx('hit'); toast(`${w.name} removed`); renderHome(); });
  list.querySelectorAll('[data-craft]').forEach(b => b.onclick = e => { e.stopPropagation(); const k = b.dataset.craft; if (kitCraft(k)) { sfx('lvl'); toast(`${KITS[k].n} crafted (${save.kits[k]}/${KIT_MAX})`); } else sfx('deny'); renderHome(); });   // 1.14.0
  list.querySelectorAll('[data-start]').forEach(b => b.onclick = e => { e.stopPropagation(); h.start = b.dataset.start; persist(); sfx('swap'); renderHome(); });
  list.querySelectorAll('[data-go]').forEach(b => b.onclick = e => { e.stopPropagation(); showScreen(b.dataset.go); });
  const ac = $('#bArmClose'); if (ac) ac.onclick = e => { e.stopPropagation(); vSel = null; renderHome(); };
  list.querySelectorAll('.bld[data-b]').forEach(el => el.onclick = () => { const k = el.dataset.b; if (vSel === k) return; vSel = k; panTo(k); list.querySelectorAll('.bld.sel').forEach(o => o.classList.remove('sel')); el.classList.add('sel'); });
  drawVillage($('#villageCv'), performance.now());
}
/* 0.6.0 run-end keep picker: tick up to keepCap() items (1 = the classic heirloom radio). Best set is pre-ticked (greedy by next-run power). The ticks ARE save.armory. */
let keepPicks = [], heirOpts = [], heirEq = 0, heirFocus = -1;
const afxLine = w => { const imp = itemImp(w); return [...Object.keys(imp).map(k => IMPN[k](imp[k])), ...w.affixes.map(a => AFX[a.id].fmt(a.v)), ...(w.uq && UNIQ[w.uq] ? ['★ ' + UNIQ[w.uq].d] : []), ...(w.uq && UNIQ[w.uq] && UNIQ[w.uq].set ? [`SET ${SETS[UNIQ[w.uq].set].name}`] : [])].join(' · ') || ((w.slot || 'weapon') === 'weapon' ? BASES[w.base].desc : 'no affixes'); };   // 1.7.0 one-line item details
function heirDetailHtml(w) { if (!w) return '<span class="tiny">Tap an item to see its full details.</span>'; return `${descItem(w)}<div class="tiny">Next-run power with it kept: <b>${heirValue(w)}</b>${w.gift ? ' · gate gift' : ''}</div>`; }
/* 1.11.0: the 1.7.1 DEATH RULE (one random ★ heirloom destroyed, the rest keepable through the KEEP picker) is REMOVED. 1.13.0: see LOAD / loadEnd / renderOutcome. */
const carryN = () => R ? [...SLOTS.map(k => R.gear[k]).filter(Boolean), ...R.bag].filter(w => !w.heir && !w.rk && !w.smith).length : 0;   // 1.13.0: everything at risk (loadout pieces included)
function renderLost(L) {   // 1.7.0: no extract, nothing to keep (1.7.1: unused by endRun, kept for ECON.deathLose = Infinity style retunes)
  $('#keepTitle').innerHTML = '<b class="c-bad">NOT EXTRACTED · EVERYTHING IS LOST</b> · only an EXIT GATE (every 10 waves) or a won raid banks gear';
  $('#heirList').innerHTML = L.length ? L.map(w => `<div class="slot lostit ${RCLS[w.rarity]}"><i style="background-image:url(${bigIcon(itemImg(w), 3)})"></i><span class="sn" style="color:${RCOL[w.rarity]}">${w.heir ? '★ ' : ''}${w.name}</span><span class="sb">${itemBase(w)} · T${w.tier + 1} · LOST</span><em>✕</em></div>`).join('') : '<div class="tiny none">You carried nothing.</div>';
  $('#heirDetail').innerHTML = ''; $('#heirNote').textContent = save.home.smithy ? 'Next run starts with your smithy pick only.' : 'Next run starts with a plain Ember Wand.';
}
function bestKeep(opts, cap) { const pk = [], kitP = ids => gearPower(startKit(ids.map(j => opts[j])).gear);
  for (let n = 0; n < cap; n++) { let bi = -1, bv = n ? kitP(pk) : -1; for (let i = 0; i < opts.length; i++) { if (pk.includes(i)) continue; const v = kitP([...pk, i]); if (v > bv) { bv = v; bi = i; } } if (bi < 0) break; pk.push(bi); }
  return pk; }
function renderHeir() {
  if (LOAD.on && R && R.out) return renderOutcome();   // 1.11.0 / 1.13.0
  const cap = keepCap(), dl = R && !R.banked, LI = dl ? R.lostItems || [] : [], HS = dl && R.heirSaved, ask = dl && R.heirAsk && LI.length;   // 1.9.0 heirloom save offer   // 1.7.1: a non-extract end shows the destroyed heirloom on top, then the normal picker
  $('#keepTitle').innerHTML = dl ? `<b class="c-bad">NOT EXTRACTED · ${HS ? `<span class="c-rare">★ ${HS.w.name} SAVED (${HS.how === 'premium' ? 'PREMIUM' : 'AD'})</span>` : ask ? `★ ${LI[0].name} WILL BE DESTROYED · WATCH AN AD TO SAVE IT` : LI.length ? `LOST ★ ${LI.map(w => w.name).join(', ')}` : 'NO HEIRLOOM TO LOSE'}</b> · keep ${cap > 1 ? `up to ${cap}` : 'one'} of the rest · extract next time to lose nothing` : cap > 1 ? `<b class="c-rare">EXTRACTED · KEEP UP TO ${cap} · ARMORY</b> · tap to tick / untick · equipped when your next run starts` : `<b class="c-rare">EXTRACTED · KEEP ONE HEIRLOOM</b> · it will be equipped when your next run starts`;
  $('#heirList').innerHTML = LI.map(w => ask ? lostRow(w).replace('DESTROYED (random heirloom)', 'AT STAKE (random heirloom)') : lostRow(w)).join('')
    + heirOpts.map((w, i) => `<button class="slot ${RCLS[w.rarity]}${keepPicks.includes(i) ? ' sel' : ''}" data-h="${i}"><i style="background-image:url(${bigIcon(itemImg(w), 3)})"></i><span class="sn" style="color:${RCOL[w.rarity]}">${w.heir ? '★ ' : ''}${w.name}</span><span class="sb">${i < heirEq ? 'EQUIPPED · ' : ''}${w.gift ? 'GATE GIFT · ' : ''}${itemBase(w)} · T${w.tier + 1} · next-run power ${heirValue(w)}</span><span class="sd">${afxLine(w)}</span><em>${keepPicks.includes(i) ? (cap > 1 ? '✓ KEEP' : 'KEEP') : ''}</em></button>`).join('')
    + `<button class="slot${!keepPicks.length ? ' sel' : ''}" data-h="-1"><i></i><span class="sn">Keep nothing</span><span class="sb">${save.home.smithy ? 'start with your smithy pick' : 'start with a plain Ember Wand'}</span><em></em></button>`;
  $('#heirList').querySelectorAll('button.slot').forEach(b => b.onclick = () => { heirFocus = +b.dataset.h; toggleKeep(+b.dataset.h); });
  $('#heirAd').hidden = !ask; if (ask) $('#bHeirAd').textContent = `▶ WATCH AD · SAVE ★ ${LI[0].name}`;   // 1.9.0 offer row (above the picker)
  $('#heirDetail').innerHTML = heirDetailHtml(heirOpts[heirFocus] || heirOpts[keepPicks[0]]);   // 1.7.0 full details of the tapped (or first kept) item
  const K = keepPicks.map(i => heirOpts[i]);
  $('#heirNote').textContent = K.length ? `Keeping ${K.length}/${cap}: ${K.map(w => `${w.name} (${SLOTN[w.slot || 'weapon']})`).join(', ')}. Everything else is lost.${cap === 1 ? ' Build the ARMORY in the village to keep 3.' : ''}` : 'Everything is lost with the run.';
}
function setKeep(ids) { keepPicks = ids.filter(i => heirOpts[i]).slice(0, keepCap()); save.armory = keepPicks.map(i => cleanW(heirOpts[i])); persist(); renderHeir(); }
function toggleKeep(i) { const cap = keepCap();
  if (i < 0) return setKeep([]);
  if (keepPicks.includes(i)) return setKeep(cap === 1 ? [i] : keepPicks.filter(j => j !== i));
  if (cap === 1) return setKeep([i]);
  if (keepPicks.length >= cap) { toast(`Armory full (${cap}/${cap}): untick one first`); sfx('deny'); return; }
  setKeep([...keepPicks, i]); }
const setHeir = i => setKeep(i >= 0 ? [i] : []);   // 0.5-era hook: keep exactly one (or nothing)
/* ---- 1.4.0 RAID BOARD: the trophy ladder (lock state, gates ✓/✗, trophy record, CHALLENGE) ---- */
const raidBoardVisible = () => save.bossKills >= 1 || raidTotal(save) > 0 || RAID_IDS.some(id => raidOpenFor(save, id));
const raidReady = () => RAID_IDS.some(id => raidOpenFor(save, id) && !raidKills(save, id));
const fmtDay = ms => { if (!ms) return ''; const d = new Date(ms); return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`; };
function rmBoardLine(n) {   // 1.9.5: the ladder on the card: what this tier fights like + what the next clear pays (vs the tier before)
  const M = rmStats(n), L = rmStats(Math.max(0, n - 1)), up = (a, b) => a > b ? ' <b class="rmup">↑</b>' : '', N = rmStats(n + 1);
  return `<p class="rmline">⚔ <b>REMATCH TIER ${n}</b> (${n} clear${n === 1 ? '' : 's'}) · boss HP <b>${rmPct(M.hp)}</b> · hits <b>${rmPct(M.dmg)}</b> · casts <b>${rmPct(1 / M.gap)}</b> faster</p>`
    + `<p class="rmnext">NEXT CLEAR REWARDS ↑ · gold + XP <b>×${M.gold.toFixed(2)}</b>${up(M.gold, L.gold)} · <b>${M.drops}</b> Rare${M.drops > 1 ? 's' : ''}${up(M.drops, L.drops)} at <b>+${3 + M.ilvl}</b> item lv${up(M.ilvl, L.ilvl)} · Unique <b>${Math.round(M.uq * 100)}%</b>${up(M.uq, L.uq)} · Quartermaster <b>+${M.qm}</b> lv${up(M.qm, L.qm)}<br><span class="tiny">then T${n + 1}: HP ${rmPct(N.hp)} · hits ${rmPct(N.dmg)}${n >= 10 ? ' (soft cap: smaller steps now)' : ''}</span></p>`;
}
function renderRaids() {
  const n = raidTotal(save); $('#raidSum').textContent = `trophies ${n}/${RAIDS.length}`;
  $('#raidNote').innerHTML = `A separate trophy ladder: a short fight in a sealed arena against one staged boss. No waves, no Market, no events. You bring your <b>${LOAD.on ? 'loadout' : 'Armory / heirloom'}</b> and <b>smithy</b> weapon (tuned to the raid band); the <b>Raid Quartermaster</b> fills every empty slot with Magic gear (raid-issued gear stays behind). Hearth lives work. XP and gold are always kept; ${LOAD.on ? 'a <b>won</b> raid banks everything you carry, a <b>lost</b> one loses it all (the death ad can save one piece)' : 'loot you picked up is kept as usual'}. <b style="color:#ef7d57">Orange / red = get out</b> · <b style="color:#a7f070">green = stand in</b> · <b style="color:#73eff7">cyan ring = find the GAP</b> · <b style="color:#c77dff">purple = keep off</b>${RAIDS.length > 5 ? ' · <b style="color:#c86ad8">violet = poison (DASH sheds stacks)</b>' : ''}.`;
  $('#raidList').innerHTML = RAIDS.map((D, i) => {
    const rec = raidRec(save, D.id), open = raidOpenFor(save, D.id), won = rec.kills > 0, at = rec.tries ? ` · attempts ${rec.tries}` : '';
    const ph = D.phases.map((P, j) => `<b>P${j + 1}</b> ${P.name}${j ? ` (${Math.round(P.at * 100)}%)` : ''}`).join(' · ');
    const gate = D.gate.map(g => ck(g.ok(save), `${g.need} (${g.prog(save)})`)).join(' ');
    const tro = won ? `<p class="trophy">★ TROPHY · first kill ${fmtDay(rec.firstAt)} · kills <b>${rec.kills}</b> · best <b>${fmtT(rec.best)}</b>${at}</p>` : `<p class="tiny">First kill: a trophy on the Trophy Wall + 2 Rares (60% a Unique) + gold and XP${at}</p>`;
    return `<div class="card hcard rcard${open ? '' : ' off'}${won ? ' won' : ''}" data-r="${D.id}"><i style="background-image:url(${bigIcon(IMG[D.spr].n[0], 3)})"></i><div class="bt"><h3 style="color:${D.col}">${i + 1}. ${D.name} <span class="tiny">${D.title}</span>${RM.on && won ? `<span class="rmtier">T${rec.kills}</span>` : ''}</h3><p class="tiny">${D.arena} · band wave <b>${D.W}</b> · ${D.phases.length} phases</p><p>${D.d}</p><p class="tiny">${ph}</p>${tro}${RM.on && won ? rmBoardLine(rec.kills) : ''}<div class="gate">${gate}</div><div class="row"><button class="pxbtn small${open ? ' go' : ''}" data-raid="${D.id}" ${open ? '' : 'disabled'}>${open ? (won ? (RM.on ? `⚔ REMATCH T${rec.kills}` : '⚔ CHALLENGE AGAIN') : '⚔ CHALLENGE') : '🔒 LOCKED'}</button></div></div></div>`; }).join('');
  $('#raidList').querySelectorAll('[data-raid]').forEach(b => b.onclick = () => startRaid(b.dataset.raid));   // 1.13.0: no cover dialog
}
function startRaid(id, opt = {}) {
  const D = RAID_BY[id]; if (!D || !raidOpenFor(save, id)) { toast('That raid is still locked'); sfx('deny'); return false; }
  audWake();
  if (!save.raids || typeof save.raids !== 'object') save.raids = {};
  const rec = save.raids[id] = Object.assign({ kills: 0, firstAt: 0, best: 0, tries: 0 }, save.raids[id] || {}); rec.tries++;   // a raid doesn't touch the portal streak
  newRun({ raid: id }); setKitButtons(R.hero); mode = 'run'; paused = false; SCREENS.forEach(s => $('#' + s).hidden = true); $('#hudBtns').hidden = false; save.runs++; persist(); last = performance.now(); return true;
}
function raidSummary(RR) {
  const D = RR.D, n = D.phases.length, rec = raidRec(save, D.id), e = RR.e, pct = e ? Math.max(0, Math.ceil(e.hp / e.maxHp * 100)) : 100;
  return `<b style="color:${D.col}">RAID: ${D.name}</b> ${D.title.toLowerCase()} · ${RR.won ? `<b class="c-rare">SLAIN in ${fmtT(RR.killT)}</b>${RR.first ? ' · <b class="gold">FIRST KILL: trophy mounted on the Trophy Wall</b>' : ` · kill #${rec.kills}${RR.pay && RR.pay.tier ? ` (rematch T${RR.pay.tier})` : ''} · best ${fmtT(rec.best)}`}` : `reached <b>P${RR.ph + 1}/${n} ${D.phases[RR.ph].name}</b> · boss at <b>${pct}%</b>`} · hits taken <b>${RR.hits}</b>${RR.loot && RR.loot.length ? `<br>Raid loot: ${RR.loot.map(w => `<b style="color:${RCOL[w.rarity]}">${w.name}</b>`).join(', ')}` : ''}<br>`;
}
function startRun(opt = {}) {
  audWake();
  const W = portalPick(); let cost = 0;   // 0.9.0: pay for the portal on confirm, before the run starts
  if (W) { cost = portalCost(W); if (save.gold < cost) { toast(`The portal needs ${cost} gold (you have ${save.gold})`); sfx('deny'); return false; }
    save.gold -= cost; save.portal.uses++; save.portal.spent += cost; save.portal.streak++; }
  else save.portal.streak = 0;
  newRun({ portal: W, cost }); setKitButtons(R.hero); mode = 'run'; paused = false; SCREENS.forEach(s => $('#' + s).hidden = true); $('#hudBtns').hidden = false; save.runs++; persist(); last = performance.now();
}
/* 1.13.1 CHARACTER STATS (Matt): PoE / Diablo style read-only sheet, opened from the pause menu (the run stays paused). Live effective values,
   split into HERO + SKILLS (your weapon alone) and GEAR (the rest of the kit), plus every active buff / debuff with stacks. */
const CHAR_ROWS = [['FORK CHANCE', S => (S.fork || 0) * 100, 0, '%'], ['RICOCHET CHANCE', S => (S.rico || 0) * 100, 0, '%'],['DAMAGE / HIT', S => S.baseDmg, 0], ['ATTACKS / S', S => S.rate, 2], ['DPS (est.)', (S, g) => dpsEst(g), 0], ['CRIT CHANCE', S => S.crit * 100, 0, '%'], ['CRIT DAMAGE', S => S.critX * 100, 0, '%'],
  ['PROJECTILES', S => S.proj, 0, '', 0, 1], ['RANGE', S => S.range, 0], ['MOVE SPEED', S => S.move * 100, 0, '%'], ['COOLDOWNS', S => S.cd * 100, 0, '%'], ['ARMOR (DR)', S => S.dr * 100, 0, '%'],
  ['POISON RESIST', S => (S.pres || 0) * 100, 0, '%'], ['HEX WARD', S => (S.warded || 0) * 100, 0, '%'], ['LIFE STEAL', S => S.leech * 100, 1, '%'], ['THORNS', S => S.thorns, 1], ['BURN ON HIT', S => S.burn * 100, 0, '%'],
  ['CHAIN LIGHTNING', S => S.chain * 100, 0, '%'], ['FROST', S => S.frost * 100, 0, '%'], ['ELITE DAMAGE', S => S.eliteD * 100, 0, '%'], ['EXECUTE', S => S.exec * 100, 0, '%'], ['STUN', S => S.stun * 100, 0, '%'], ['POISON ON HIT', S => (S.venom || 0) * 100, 0, '%']];
const CHAR_CORE = ['DAMAGE / HIT', 'ATTACKS / S', 'DPS (est.)', 'CRIT CHANCE', 'CRIT DAMAGE', 'MOVE SPEED', 'COOLDOWNS', 'ARMOR (DR)', 'POISON RESIST', 'HEX WARD', 'LIFE STEAL'];   // always listed, even at 0
function charSheet() { if (!R) return { rows: [], st: [] }; const g = R.gear, S = R.S || stats(g), B = stats(asGear({ weapon: g.weapon })), rows = [];
  rows.push({ n: 'HP', v: `${Math.ceil(R.p.hp)} / ${Math.round(S.maxHp)}`, b: Math.round(B.maxHp), g: Math.round(S.maxHp - B.maxHp) });
  for (const [n, f, dp, u = ''] of CHAR_ROWS) { const m = Math.pow(10, dp), v = Math.round((+f(S, g) || 0) * m) / m, b = Math.round((+f(B, { weapon: g.weapon }) || 0) * m) / m; if (!v && !b && !CHAR_CORE.includes(n)) continue; rows.push({ n, v: v + u, b: b + u, g: Math.round((v - b) * m) / m }); }
  const st = []; for (const k in (R.hex || {})) if (R.hex[k] > 0 && HEX.st[k]) st.push({ n: HEX.st[k].name, c: HEX.st[k].c, x: (R.hexSt && R.hexSt[k]) || 1, t: R.hex[k], bad: 1 });
  if (R.poison && R.poison.n > 0) st.push({ n: 'POISONED', c: POI.c, x: R.poison.n, t: 0, bad: 1 });
  for (const k in (R.buffs || {})) { const v = R.buffs[k]; if (v > 0 && BUFFS[k]) st.push({ n: BUFFS[k].name, c: BUFFS[k].c, x: 0, t: v === RUN_BUFF ? -1 : v }); }
  if (R.p.inv > 0) st.push({ n: 'INVULNERABLE', c: '#73eff7', x: 0, t: R.p.inv }); return { rows, st }; }
function renderChar() { const C = charSheet(); const log = (R && R.evLog) ? R.evLog.slice(0, 12).map(e => `<div class="tiny">${e.s}</div>`).join('') : '<div class="tiny">No events yet.</div>';
  $('#charBody').innerHTML = `<div class="chgrid"><div class="chh"><span>STAT</span><b>NOW</b><i>HERO+SKILLS</i><i>GEAR</i></div>` + C.rows.map(r => `<div class="chr"><button class="guideLink" data-guide="stat-${r.n}" aria-label="Guide: ${r.n}">${r.n} ?</button><b>${r.v}</b><i>${r.b}</i><i class="${r.g > 0 ? 'c-good' : r.g < 0 ? 'c-bad' : ''}">${r.g > 0 ? '+' : ''}${r.g || '-'}</i></div>`).join('') + `</div><div class="evlog"><b class="gold">EVENT LOG</b>${log}</div>`
  + `<div class="tiny chst">ACTIVE EFFECTS</div>` + (C.st.length ? C.st.map(e => `<div class="chr"><span style="color:${e.c}">${e.bad ? '▼ ' : '▲ '}${e.n}</span><b>${e.x ? 'x' + e.x : ''}</b><i>${e.t < 0 ? 'RUN' : e.t > 0 ? Math.ceil(e.t) + 's' : ''}</i></div>`).join('') : '<div class="tiny">none</div>'); }
let charOpen = false;
function openChar() { if (mode !== 'run' || !R || !paused) return false; charOpen = true; renderChar(); $('#pause').hidden = true; $('#charov').hidden = false; return true; }
function closeChar() { if (!charOpen) return; charOpen = false; $('#charov').hidden = true; if (mode === 'run' && paused) $('#pause').hidden = false; }
function setPause(on) {
  if (guideOpen) { if (!on) closeGuide(); return; }
  if (mode !== 'run' || !R || R.over || bagOpen || mkOpen || R.adAsk) return; if (charOpen) { closeChar(); return; } if (!on && !$('#settings').hidden) { closeSettings(); return; } paused = on; input.stick = null; input.mx = input.my = 0;
  $('#pause').hidden = !on; if (on) { lootSyncMin(); setBannerBtns(); setMusBtns(); $('#pauseInfo').textContent = `${HEROES[R.hero].name} · ${R.M.name} · ${R.raid ? `Raid ${R.raid.D.name} P${R.raid.ph + 1}/${R.raid.D.phases.length}` : `Wave ${R.wave}`} · ${fmtT(R.t)} · +${R.xpGained} XP this run${R.raid ? '' : ` · ${R.gate ? (R.gate.sealed ? 'exit gate SEALED' : 'exit gate OPEN') : `next exit gate: wave ${nextGateWave(R.wave)}`}`} · ${LOAD.on ? `ending now loses all ${carryN()} item${carryN() === 1 ? '' : 's'} you carry (loadout too)` : 'ending now destroys one random ★ heirloom'}`; $('#pauseRun').textContent = pauseRunLine(); { const hl = resLine(R.res); if (hl) $('#pauseInfo').textContent += ` · haul: ${hl.replace(/<[^>]+>/g, '')}`; } persist(); }   // 1.9.1
}
function endRun(died) {
  rpClose();   // 1.14.1
  mode = 'dead'; charOpen = false; $('#charov').hidden = true; $('#hudBtns').hidden = true; bagOpen = false; $('#bag').hidden = true; $('#pause').hidden = true; mkOpen = false; $('#market').hidden = true;
  const DB = distBonus(), bonus = Math.round(DB.x * ECON.xp); const before = save.level; R.xpGained += bonus; R.lvlUps += addXP(bonus);   // 1.7.0: distance XP x0.5, no hero XP
  const gBonus = DB.g; addGold(gBonus);
  let esc = null; if (R.escaped) { const g = Math.round(0.3 * R.gold) + 5 * DB.waves, x = Math.round(0.5 * bonus), gift = rollItem(R.wave, { min: 2 }); addGold(g); R.xpGained += x; R.lvlUps += addXP(x); gift.gift = true; esc = R.escRes = { g, x, gift }; }   // 0.8.0 exit-gate cash-out
  const prevUnl = UNLOCKS.filter(u => u.ok(save)).map(u => u.id);
  const RR = R.raid, nb = !RR && (R.wave > save.best.wave || DB.surv > save.best.time);   // 0.9.0: best time = time actually survived (portal drops don't pre-pay it)
  if (!RR) { save.best.wave = Math.max(save.best.wave, R.wave); save.best.time = Math.max(save.best.time, DB.surv); if (R.portal) save.portal.best = Math.max(save.portal.best || 0, R.wave); }   // 1.4.0: a raid isn't a wave run
  if (R.gc && R.gc.e && R.gc.e.hp > 0) R.gcLog.push(`W${R.gc.w} ${wardenName(R.gc.tier)}: FAILED`); save.best.kills = Math.max(save.best.kills, R.kills);
  const newUnl = UNLOCKS.filter(u => u.ok(save) && !prevUnl.includes(u.id)); newUnl.forEach(u => save.unlocked[u.id] = true); persist();
  const RB = resBank(R.escaped || !!(RR && RR.won) || !ECON.extract);   // 1.14.0 haul -> stockpile (half if not extracted)
  const eq = SLOTS.map(k => R.gear[k]).filter(Boolean); let OUT_LINE = ''; const banked = R.escaped || !!(RR && RR.won) || !ECON.extract, lostN = [...eq, ...R.bag].filter(w => !w.rk).length, lostKept = [...eq, ...R.bag].filter(w => w.heir).length; R.banked = banked;   // 1.7.0 extract = gate escape or a won raid
  if (LOAD.on) { const O = loadEnd(banked, eq, R.escRes); OUT_LINE = banked ? `<span class="c-rare">${R.escaped || (RR && RR.won) ? 'Extracted' : 'Kept'}: everything banked · <b>${O.add.length - O.over.length}</b> into the stash${O.back.length ? ` · <b>${O.back.length}</b> back in the loadout` : ''}${O.over.length ? ` · stash full: ${O.over.length} salvaged (+${O.overG}g)` : ''}.</span>` : `<span class="lost c-bad">NOT EXTRACTED: everything you carried is lost (<b>${O.lost.length}</b> item${O.lost.length === 1 ? '' : 's'})${saveOneOk() ? ` · you may save ONE piece (${isPremium() ? 'Premium: free' : 'one ad'})` : ''}. No extract bonus or gate gift.</span>`; }   // 1.13.0 extract redesign
  $('#deadTitle').textContent = RR ? (RR.won ? (RR.first ? 'TROPHY EARNED!' : 'RAID CLEARED') : died ? 'RAID FAILED' : 'RAID ABANDONED') : died ? 'YOU FELL' : R.escaped ? 'EXTRACTED!' : 'RUN ABANDONED';
  $('#deadStats').innerHTML = `${RR ? raidSummary(RR) : ''}${HEROES[R.hero].name} · ${R.M.name}<br>${RR ? 'Band wave' : 'Wave'} <b>${R.wave}</b>${R.portal ? ` (portal from ${R.portal.W}, −${nfmt(R.portal.cost)}g)` : ''} · <b>${fmtT(DB.surv)}</b> · <b>${R.kills}</b> kills${R.bosses ? ` · <b>${R.bosses}</b> boss` : ''}${R.minis ? ` · <b>${R.minis}</b> mini-boss` : ''}${nb ? ' · <b>NEW BEST</b>' : ''}<br>
    XP earned <b>+${R.xpGained}</b> (incl. +${bonus} distance bonus)<br>
    ${R.lvlUps ? `Level up! <b>LV ${before} → ${save.level}</b> · <b>+${R.lvlUps} skill point${R.lvlUps > 1 ? 's' : ''}</b><br>` : `LV ${save.level} · ${save.xp}/${need(save.level)} XP<br>`}
    <span class="tiny">One skill pool: spend points on the shared tree or any hero tree.</span><br>
    Gold <b>+${R.gold}</b> (incl. +${gBonus} distance) · bank <b>${save.gold}</b>${R.evWon ? ` · events won <b>${R.evWon}</b>` : ''}${R.revives ? ` · revives used <b>${R.revives}</b>` : ''}<br>
    ${RB.line ? `Resources ${RB.line}<br>` : ''}${R.rpLog && R.rpLog.length ? `Reward picks: ${R.rpLog.join(' · ')}<br>` : ''}${R.feN ? `Field events <b>${R.feWon || 0}/${R.feN}</b>${R.feLog && R.feLog.length ? ': ' + R.feLog.join(' · ') : ''}<br>` : ''}${R.msN ? `Mage trials <b>${R.msWon}/${R.msN}</b>: ${R.msLog.join(' · ')}<br>` : ''}
    ${esc ? `<b class="c-rare">Escaped:</b> +<b>${esc.g}</b> gold · +<b>${esc.x}</b> XP · gift <b style="color:${RCOL[esc.gift.rarity]}">${esc.gift.name}</b><br>` : ''}${R.gcLog.length ? `Gear check: ${R.gcLog.map(s => `<b class="${/PASSED/.test(s) ? 'c-rare' : 'c-bad'}">${s}</b>`).join(' · ')}<br>` : ''}${R.runBuffs ? `Run boons earned <b>${R.runBuffs}</b><br>` : ''}${R.mkBuys || R.mkSells ? `Market: bought <b>${R.mkBuys}</b> (−${R.mkSpent}g) · sold <b>${R.mkSells}</b> (+${R.mkEarned}g)<br>` : ''}${R.escN || R.instWon ? `Escorts <b>${R.escWon}/${R.escN}</b> · installations razed <b>${R.instWon}</b><br>` : ''}
    ${newUnl.map(u => `★ Milestone met: <b>${u.name}</b> (${u.where})<br>`).join('')}
    ${R.filtered || R.junked || R.converted ? `Loot: <b>${R.filtered || 0}</b> filtered${R.converted ? ` → <b>+${R.converted}g</b>` : ''} · <b>${R.junked || 0}</b> junked<br>` : ''}
    ${LOAD.on ? OUT_LINE : `<span class="lost">${R.escaped || (RR && RR.won) ? 'Extracted' : 'Kept'}: ${eq.length} equipped${R.bag.length ? ` + ${R.bag.length} in bag` : ''} - keep ${keepCap() > 1 ? `up to ${keepCap()} items in the Armory` : 'one heirloom'}; the rest is lost.</span>`}`;

  const eqK = eq.filter(w => !w.rk); heirFocus = -1;
  if (LOAD.on) { heirOpts = []; heirEq = 0; keepPicks = []; renderOutcome(); }   // 1.13.0: no KEEP picker; extract = bank all, death = all lost (+ death ad: save one)
  else if (banked) { heirOpts = [...eqK, ...R.bag.filter(w => !w.rk), ...(esc ? [esc.gift] : [])]; heirEq = eqK.length; /* 1.4.0: raid-issued gear can't be kept */ setKeep(bestKeep(heirOpts, keepCap())); }
  else { /* 1.11.0: the 1.7.1 random-heirloom death path was removed; with LOAD off (legacy) every end is banked */ heirOpts = []; heirEq = 0; setKeep([]); }
  tutRunEnd(); $('#dead').hidden = false;
  if (AC) AUD.deadAt = AC.currentTime; if (!(R.escaped || (RR && RR.won))) sfx(died ? 'death' : 'deny');   // 1.8.0: death stinger (extract / raid win already played theirs); music rests 3.5 s
}

/* 1.13.0 LOADOUT + STASH (see LOAD at the top). No insurance, no cover fee. Junk / overflow salvage pays 25% of the Market value (mkValue). */
const salvageG = w => Math.max(1, Math.round(mkValue(w) * LOAD.salvage));   // camp JUNK / stash overflow pays 25% of value (the Market buys at 55%)
function kitArm() { const A = save.armory || []; return LOAD.on ? A.map((w, i) => Object.assign(cleanW(w), { aix: i })) : A; }   // 1.13.0: the whole loadout rides along (aix = its loadout slot); nothing is paid, nothing protected
const canWear = w => save.armory.length < keepCap() || save.armory.some(a => (a.slot || 'weapon') === (w.slot || 'weapon'));
function stashTrim(floor = 0) { const S = save.stash, cap = Math.max(stashCap(), floor), out = []; let g = 0;   // 1.11.1: never salvages below what was already stored   // over the cap: salvage the lowest-value pieces
  while (S.length > cap) { let bi = -1; for (let i = 0; i < S.length; i++) if (!isLocked(S[i]) && (bi < 0 || mkValue(S[i]) < mkValue(S[bi]))) bi = i; if (bi < 0) break; const w = S.splice(bi, 1)[0], v = salvageG(w); g += v; out.push({ w, g: v }); }
  if (g) save.gold += g; return { out, g }; }
function stashToArm(i) { const S = save.stash, A = save.armory, w = S[i]; if (!w) return false;
  if (A.length < keepCap()) { S.splice(i, 1); A.push(w); persist(); return 'add'; }
  const j = A.findIndex(a => (a.slot || 'weapon') === (w.slot || 'weapon')); if (j < 0) return false;
  S[i] = A[j]; A[j] = w; uvSweep(); persist(); return 'swap'; }
function armToStash(j) { const A = save.armory, w = A[j]; if (!w) return false; if (uvOn() && isUq(w)) { A.splice(j, 1); save.uniq.push(w); persist(); return 'uniq'; }   // 1.11.1: Premium Uniques go to their tab
  if (save.stash.length >= stashCap()) return false; A.splice(j, 1); save.stash.push(w); persist(); return true; }
function stashJunk(i) { const w = save.stash[i]; if (!w) return 0; if (isLocked(w)) { toast('Locked — unlock first'); sfx('deny'); return 0; } save.stash.splice(i, 1); const g = salvageG(w); save.gold += g; persist(); return g; }
function autoKit() { const uv = uvOn(), pool = [...save.armory, ...save.stash, ...(uv ? save.uniq : [])], kc = keepCap(), pk = bestKeep(pool, kc), sc = stashCap();   // 1.11.1: Premium also kits from the Uniques tab
  const toSt = i => !(uv && isUq(pool[i])), left = () => pool.filter((_, i) => !pk.includes(i) && toSt(i)).length;
  const rest = pool.map((_, i) => i).filter(i => !pk.includes(i) && toSt(i)).sort((a, b) => mkValue(pool[b]) - mkValue(pool[a]));
  while (left() > sc && pk.length < kc && rest.length) pk.push(rest.shift());   // never push the stash over its cap
  save.armory = pk.map(i => pool[i]); save.stash = pool.filter((_, i) => !pk.includes(i) && toSt(i)); if (uv) save.uniq = pool.filter((_, i) => !pk.includes(i) && !toSt(i)); persist(); return pk.length; }
/* run end (1.13.0): EXTRACT banks everything (loadout pieces you still carry -> back into the loadout, the rest + the gate gift -> stash / ★ UNIQUES);
   DEATH / ABANDON / RAID FAIL: everything carried is gone and the loadout is empty (the stash is never touched). Smithy pick + raid-issued gear never count. */
function loadEnd(banked, eq, esc) {
  const A = save.armory, mine = [...eq, ...R.bag].filter(w => !w.rk && !w.smith && !w.heir), back = mine.filter(w => w.lo), rest = mine.filter(w => !w.lo);
  const left = A.filter((_, i) => !back.some(c => c.aix === i));   // loadout pieces sold / dropped / junked during the run
  const O = R.out = { banked, back: [], left, stash0: save.stash.length, add: [], over: [], overG: 0, lost: [], uq: [], saved: null, saveBy: null, saveOff: false, pick: -1 };
  if (banked) { const kA = back.map(cleanW), cap = keepCap(); save.armory = kA.slice(0, cap); O.back = save.armory.slice();
    O.add = [...kA.slice(cap), ...rest, ...(esc ? [esc.gift] : [])].map(w => Object.assign(cleanW(w), w.gift ? { gift: true } : {}));
    if (uvOn()) { O.uq = O.add.filter(isUq); save.uniq.push(...O.uq); }   // 1.11.1: Premium Uniques skip the stash (endless tab, never salvaged)
    save.stash.push(...O.add.filter(w => !O.uq.includes(w))); const T = stashTrim(O.stash0); O.over = T.out; O.overG = T.g; }
  else { save.armory = []; O.lost = mine.map(w => Object.assign(cleanW(w), w.lo ? { lo: true } : {}));
    O.lost.forEach((w, i) => { if (O.pick < 0 || mkValue(w) > mkValue(O.lost[O.pick])) O.pick = i; }); }   // death ad: the most valuable piece is pre-picked
  persist(); return O; }
/* 1.13.0 DEATH AD · SAVE ONE: after a non-extract end, ONCE, pick one lost piece and watch a rewarded ad to bank it (Premium: free, no ad).
   Where it lands: Premium Unique -> ★ UNIQUES tab; else the stash; a full stash -> the loadout if it has room; else the stash's weakest piece is salvaged (25%) to make room.
   A closed-early ad saves nothing and the offer stays; LET IT ALL GO closes it. __phNoAds (pre-1.9 suites) = no offer for free players. Separate from the mid-run revive. */
const saveOneOk = () => { const O = R && R.out; return !!(LOAD.on && LOAD.saveOne && O && !O.banked && !O.saved && !O.saveOff && O.lost.length && ((isPremium() && LOAD.premFree) || !adsOff())); };
function saveOnePut(w) { const it = cleanW(w);
  if (uvOn() && isUq(it)) { save.uniq.push(it); return { to: 'uniq', it }; }
  if (save.stash.length < stashCap()) { save.stash.push(it); return { to: 'stash', it }; }
  if (save.armory.length < keepCap()) { save.armory.push(it); return { to: 'loadout', it }; }
  const S = save.stash; let bi = 0; for (let i = 1; i < S.length; i++) if (mkValue(S[i]) < mkValue(S[bi])) bi = i; const o = S.splice(bi, 1)[0], g = salvageG(o); save.gold += g; S.push(it); return { to: 'stash', it, over: { w: o, g } }; }
function saveOne(i, done) { const O = R && R.out; i = i == null ? O && O.pick : i;
  if (!saveOneOk() || !O.lost[i]) { if (done) done(false); return false; }
  const fin = (got, by) => { if (!got || !R || R.out !== O || O.saved) { if (R && R.out === O) renderOutcome(); if (done) done(false); return; }
    const w = O.lost.splice(i, 1)[0], r = saveOnePut(w); O.saved = r; O.saveBy = by; O.pick = -1; MONST.save = (MONST.save || 0) + 1; persist(); sfx('extract');
    toast(`★ ${w.name} saved → ${r.to === 'uniq' ? '★ UNIQUES' : r.to === 'loadout' ? 'LOADOUT (stash full)' : 'STASH'}`); renderOutcome(); if (done) done(true); };
  if (isPremium() && LOAD.premFree) { fin(true, 'premium'); return true; }
  ADS.rewarded('save', got => fin(got, 'ad')); return true; }
const outRow = (w, tag, cls = '', em = '') => `<div class="slot ${RCLS[w.rarity]} ${cls}"><i style="background-image:url(${bigIcon(itemImg(w), 3)})"></i><span class="sn" style="color:${RCOL[w.rarity]}">${cls === 'insd' ? '★ ' : ''}${w.name}</span><span class="sb">${tag} · ${itemBase(w)} · T${w.tier + 1}</span><span class="sd">${afxLine(w)}</span><em>${em}</em></div>`;
const osec = (t, c = '') => `<div class="osec tiny ${c}">${t}</div>`;
function renderOutcome() { const O = R && R.out; if (!O) return false; const sc = stashCap(), kc = keepCap(), n = k => `${k} item${k === 1 ? '' : 's'}`; let h = ''; $('#heirAd').hidden = true;
  if (O.banked) {
    $('#keepTitle').innerHTML = `<b class="c-rare">EXTRACTED · EVERYTHING BANKED</b> · ${n(O.add.length - O.uq.length - O.over.filter(o => O.add.includes(o.w)).length)} into the STASH (${save.stash.length}/${sc})${O.uq.length ? ` · <b class="c-unique">${O.uq.length} into ★ UNIQUES</b>` : ''}${O.back.length ? ` · ${O.back.length} back in the loadout` : ''}`;
    const live = O.add.filter(w => save.stash.includes(w));
    if (live.length) h += osec(`INTO THE STASH · <b>▲ LOADOUT</b> = take it next run (loadout ${save.armory.length}/${kc}) · <b>JUNK</b> = gold now`) + live.map(w => { const i = save.stash.indexOf(w), ok = canWear(w); return outRow(w, `STASH${w.gift ? ' · GATE GIFT' : ''}`, '', `<button class="pxbtn mini" data-ow="${i}"${ok ? '' : ' disabled'}>▲ LOADOUT</button><button class="pxbtn mini arm" data-oj="${i}">JUNK +${salvageG(w)}</button>`); }).join('');
    const uql = O.uq.filter(w => save.uniq.includes(w));
    if (uql.length) h += osec(`★ UNIQUES TAB (PREMIUM) · endless, never salvaged · collected ${uqSeen().size}/${uqTotal()}`, 'gold') + uql.map(w => { const i = save.uniq.indexOf(w), ok = canWear(w); return outRow(w, 'UNIQUES TAB', '', `<button class="pxbtn mini" data-ouw="${i}"${ok ? '' : ' disabled'}>▲ LOADOUT</button>`); }).join('');
    if (O.back.length) h += osec(`▸ BACK IN YOUR LOADOUT · ready for the next run (still lost if you die with it)`) + O.back.map(w => outRow(w, 'LOADOUT', 'homeit', '▸')).join('');
    if (O.over.length) h += osec(`STASH FULL (${sc}) · SALVAGED THE WEAKEST · +${O.overG}g`, 'c-bad') + O.over.map(o => outRow(o.w, `SALVAGED +${o.g}g`, 'lostit', '✕')).join('');
    if (O.left.length) h += osec('SOLD OR LEFT ON THE FLOOR · gone from your loadout', 'c-bad') + O.left.map(w => outRow(w, 'NOT CARRIED OUT', 'lostit', '✕')).join('');
    $('#heirNote').innerHTML = `Nothing you carried out was lost. Pick your next loadout in the <b>STASH</b> (${kc} slots; the Armory adds more). <button id="bOutStash" class="pxbtn mini">OPEN STASH ▶</button>`;
  } else {
    const can = saveOneOk(), pr = isPremium() && LOAD.premFree, tot = O.lost.length + (O.saved ? 1 : 0), S1 = O.saved;
    $('#keepTitle').innerHTML = `<b class="c-bad">NOT EXTRACTED · EVERYTHING LOST</b> · ${n(tot)} you carried${S1 ? ` · <b class="gold">★ ${S1.it.name} saved</b>` : ' · the stash is untouched'}`;
    if (can) { const pw = O.lost[O.pick]; $('#heirAd').hidden = false; $('#bHeirAd').disabled = !pw; $('#bHeirAd').textContent = pw ? `${pr ? '★ SAVE ONE FREE' : '▶ WATCH AD TO SAVE ONE'} · ${pw.name}` : 'PICK ONE BELOW';
      $('#heirAdTxt').innerHTML = pr ? '<b class="gold">PREMIUM:</b> save ONE lost piece free, no ad. Tap PICK on the one you want.' : 'Once: tap <b>PICK</b> on one lost piece, watch an ad, it goes back to your stash. PREMIUM saves it free.'; $('#bHeirNo').textContent = 'LET IT ALL GO'; }
    if (S1) h += osec(`★ SAVED ${O.saveBy === 'premium' ? '(PREMIUM, FREE)' : 'BY THE AD'} · now in your ${S1.to === 'uniq' ? '★ UNIQUES tab' : S1.to === 'loadout' ? 'loadout (the stash was full)' : 'stash'}`, 'gold') + outRow(S1.it, S1.to === 'uniq' ? 'UNIQUES TAB' : S1.to === 'loadout' ? 'LOADOUT' : 'STASH', 'insd', '★') + (S1.over ? outRow(S1.over.w, `STASH FULL · SALVAGED +${S1.over.g}g`, 'lostit', '✕') : '');
    h += osec(`✕ LOST WITH YOU · everything you carried${can ? ' · <b>WATCH AD TO SAVE ONE</b>' : ''}`, 'c-bad') + (O.lost.length ? O.lost.map((w, i) => outRow(w, w.lo ? 'FROM YOUR LOADOUT · LOST' : 'LOST', 'lostit', can ? `<button class="pxbtn mini${i === O.pick ? ' go' : ''}" data-osp="${i}">${i === O.pick ? '✓ PICKED' : 'PICK'}</button>` : '✕')).join('') : (S1 ? '' : '<div class="tiny none">You carried nothing.</div>'));
    $('#heirNote').innerHTML = `Stash ${save.stash.length}/${sc}${S1 ? '' : ' untouched'}. Only an <b>EXIT GATE</b> (every 10 waves) or a won raid banks what you carry. <button id="bOutStash" class="pxbtn mini">OPEN STASH ▶</button>`;
  }
  $('#heirList').innerHTML = h; $('#heirDetail').innerHTML = '';
  $('#heirList').querySelectorAll('[data-ow]').forEach(b => b.onclick = () => { const w = save.stash[+b.dataset.ow], r = stashToArm(+b.dataset.ow); if (r) { sfx('swap'); toast(r === 'swap' ? `▲ ${w.name} swapped into the loadout (the old piece went to the stash)` : `▲ ${w.name} is in your loadout for the next run`); } renderOutcome(); });
  $('#heirList').querySelectorAll('[data-ouw]').forEach(b => b.onclick = () => { const w = save.uniq[+b.dataset.ouw], r = uniqToArm(+b.dataset.ouw); if (r) { sfx('swap'); toast(`▲ ${w.name} is in your loadout for the next run`); } renderOutcome(); });
  $('#heirList').querySelectorAll('[data-oj]').forEach(b => b.onclick = () => { const w = save.stash[+b.dataset.oj], g = stashJunk(+b.dataset.oj); if (g) { sfx('gem'); toast(`${w.name} junked: +${g} gold`); } renderOutcome(); });
  $('#heirList').querySelectorAll('[data-osp]').forEach(b => b.onclick = () => { O.pick = +b.dataset.osp; sfx('swap'); renderOutcome(); });
  const bs = $('#bOutStash'); if (bs) bs.onclick = () => backToCamp('stash');
  return true; }
$('#bHeirAd').onclick = () => { if (R && R.out && !R.out.banked) saveOne(); };
$('#bHeirNo').onclick = () => { if (R && R.out && !R.out.banked && !R.out.saved) { R.out.saveOff = true; renderOutcome(); } };
/* STASH screen (hub ▣ STASH / Armory card / run-end OPEN STASH) */
let stSel = null, stTab = 's';   // 1.15.0: 's' ALL · 'w' WEAPONS · 'arm' ARMOUR · 'uq' UNIQUES (stash filter) · 'res' RESOURCES · 'u' ★ UNIQUES (Premium)
const ST_TABS = ['s', 'w', 'arm', 'uq', 'res', 'u'];
const stIsWpn = w => (w.slot || 'weapon') === 'weapon';
const stIsArm = w => ARMOR_SLOTS.includes(w.slot || '');
const stIsUq = w => (w.rarity | 0) >= 3 || !!w.uq;
function stView() {   // indices into save.stash for the active typed tab
  const S = save.stash; if (stTab === 'w') return S.map((w, i) => stIsWpn(w) ? i : -1).filter(i => i >= 0);
  if (stTab === 'arm') return S.map((w, i) => stIsArm(w) ? i : -1).filter(i => i >= 0);
  if (stTab === 'uq') return S.map((w, i) => stIsUq(w) ? i : -1).filter(i => i >= 0);
  return S.map((_, i) => i); }
function renderStash() { const A = save.armory, S = save.stash, U = save.uniq, kc = keepCap(), sc = stashCap(), pr = isPremium(), uv = uvOn(), capA = pr ? STASH_CAP_P : STASH_CAP;
  $('#stGold').textContent = `${nfmt(save.gold)} gold`; $('#stInfo').textContent = `· loadout ${A.length}/${kc}: lost if you die, banked if you extract`;
  const L = k => k === 'a' ? A : k === 'u' ? U : S; if (stSel && !L(stSel.k)[stSel.i]) stSel = null;
  if (stSel && stSel.k === 's' && stTab !== 'u' && stTab !== 'res' && !stView().includes(stSel.i)) stSel = null;
  $('#stLoadHd').innerHTML = `<b class="gold">▸ LOADOUT ${A.length}/${kc}</b> · equipped at run start · <span class="c-bad">lost if you die with it</span>${armTier() < 2 ? ` · upgrade the ${armTier() ? 'Artifact Museum' : 'Armory'} for ${KEEP_CAP[armTier() + 1]} slots` : ''}`;
  $('#stLoad').innerHTML = A.map((w, i) => tile(w, `data-sa="${i}"`, stSel && stSel.k === 'a' && stSel.i === i, '')).join('') + Array.from({ length: Math.max(0, kc - A.length) }, () => '<span class="tile empty"><i></i></span>').join('');
  if (LOAD.on && !pr && !U.length && stTab === 'u') { /* keep ★ tab visible when locked */ }
  else if (!ST_TABS.includes(stTab)) stTab = 's';
  const nw = S.filter(stIsWpn).length, na = S.filter(stIsArm).length, nu = S.filter(stIsUq).length;
  const tabs = LOAD.on ? `<span class="sttabs">`
    + `<button class="pxbtn mini${stTab === 's' ? ' on' : ''}" data-stt="s">▣ STASH ${S.length}/${sc}</button>`
    + `<button class="pxbtn mini${stTab === 'w' ? ' on' : ''}" data-stt="w">⚔ WEAPONS ${nw}</button>`
    + `<button class="pxbtn mini${stTab === 'arm' ? ' on' : ''}" data-stt="arm">🛡 ARMOUR ${na}</button>`
    + `<button class="pxbtn mini${stTab === 'uq' ? ' on' : ''}" data-stt="uq">◆ UNIQUES ${nu}</button>`
    + `<button class="pxbtn mini${stTab === 'res' ? ' on' : ''}" data-stt="res">◈ RESOURCES</button>`
    + `<button class="pxbtn mini${stTab === 'u' ? ' on' : ''}" data-stt="u" id="stTabU">★ UNIQUES ${uv || U.length ? U.length : '🔒'}</button>`
    + `</span> ` : '';
  const seen = uqSeen(), tot = uqTotal();
  if (stTab === 'u') {
    $('#stStashHd').innerHTML = tabs + (uv ? `<b class="c-unique">★ UNIQUES ${U.length} · ENDLESS</b> · Premium · every Unique you extract lands here (no cap, never salvaged) · collected <b>${seen.size}/${tot}</b>` : U.length ? `<b class="c-unique">★ UNIQUES ${U.length}</b> · Premium tab: take these out any time` : `<b class="c-unique">★ UNIQUES · PREMIUM</b>`);
    $('#stGrid').innerHTML = uv || U.length ? U.map((w, i) => tile(w, `data-su="${i}"`, stSel && stSel.k === 'u' && stSel.i === i, '')).join('') + Object.keys(UNIQ).filter(k => !seen.has(k)).map(k => `<span class="tile empty miss" title="not found yet"><i></i><em>?</em></span>`).join('')
      : `<div class="card uqlock"><p class="tiny"><b class="gold">★ PREMIUM</b> adds an <b>endless Uniques-only tab</b>: every Unique you extract goes here instead of the stash, never counts against the stash cap and is never salvaged. Collect all ${tot}.</p><p class="tiny">Premium also doubles your stash: <b>${STASH_CAP.join(' / ')} → ${STASH_CAP_P.join(' / ')}</b> (camp / Armory / Museum). One-time, no power for sale.</p><div class="row"><button class="pxbtn small go" id="stSup">♥ SUPPORT THE CREATOR</button></div></div>`;
  } else if (stTab === 'res') {
    $('#stStashHd').innerHTML = tabs + `<b>◈ RESOURCES</b> · stockpile (banked on extract; half lost on death) · craft field kits in the Workshop`;
    $('#stGrid').innerHTML = `<div class="card"><p>${resLine(save.res, true) || '<span class="tiny">empty</span>'}</p><p class="tiny">Wood · Stone · Oil · Jewels · People. Kits owned: ${kitsOwned().map(k => `${KITS[k].n}×${save.kits[k]}`).join(', ') || 'none'}.</p><div class="row"><button class="pxbtn small go" id="stWs">OPEN WORKSHOP ▶</button></div></div>`;
  } else {
    const ix = stView(), label = stTab === 'w' ? 'WEAPONS' : stTab === 'arm' ? 'ARMOUR' : stTab === 'uq' ? 'UNIQUES (STASH)' : 'STASH';
    $('#stStashHd').innerHTML = tabs + `<b>${label} ${stTab === 's' ? `${S.length}/${sc}` : ix.length}</b>${pr && stTab === 's' ? ' <span class="gold">★ PREMIUM SIZE</span>' : ''} · extracted gear waits here (never at risk)${stTab === 's' ? ` · ${armTier() < 2 ? `upgrade the ${armTier() ? 'Artifact Museum' : 'Armory'} for ${capA[armTier() + 1]} slots` : 'Artifact Museum: biggest stash'}${pr ? '' : ` · Premium: ${STASH_CAP_P[armTier()]}`}` : ''}`;
    $('#stGrid').innerHTML = ix.length ? ix.map(i => tile(S[i], `data-ss="${i}"`, stSel && stSel.k === 's' && stSel.i === i, S[i].gift ? '<em>G</em>' : '')).join('') : `<div class="tiny none">${stTab === 's' ? 'Empty. Extract through an exit gate to bank what you carry.' : `No ${label.toLowerCase()} in the stash.`}</div>`;
  }
  const w = stSel ? L(stSel.k)[stSel.i] : null, Geq = loadoutGear(); let d, acts = '';
  if (!w) d = `<p class="tiny">Tap an item. <b>Loadout</b> pieces are equipped when a run starts. Everything you carry, loadout included, is <b class="c-bad">lost if you die</b> (one ad can save one piece) and <b>banked</b> if you extract.</p><p class="tiny">The Armory adds loadout slots (${KEEP_CAP.join(' / ')}) and stash space. Junk pays ${Math.round(LOAD.salvage * 100)}% of value.</p>`;
  else if (stSel.k === 'a') { const toU = uv && isUq(w), canSt = toU || S.length < sc;
    d = itemCompareHtml(w, Geq, '▸ LOADOUT', false) + `<p class="tiny">▸ In your loadout · ${SLOTN[w.slot || 'weapon']} · <span class="c-bad">lost if you die with it</span></p>`;
    acts = `<button class="pxbtn small" id="stToS"${canSt ? '' : ' disabled'}>${toU ? '▼ TO ★ UNIQUES' : '▼ TO STASH'}</button>${canSt ? '' : '<span class="tiny c-bad">Stash is full</span>'}<button class="pxbtn small" id="stLock">${isLocked(w) ? 'UNLOCK' : 'LOCK'}</button>`; }
  else if (stSel.k === 'u') { const j = A.findIndex(a => (a.slot || 'weapon') === (w.slot || 'weapon')), room = A.length < kc, wear = canWear(w);
    d = itemCompareHtml(w, Geq, '★ UNIQUES', true) + `<p class="tiny">★ UNIQUES tab · never salvaged · junk: +${salvageG(w)}g${!wear ? ' · <span class="c-bad">loadout full: no free slot and no same-slot piece to swap</span>' : ''}</p>`;
    acts = `<button class="pxbtn small go" id="stUToA"${wear ? '' : ' disabled'}>${room ? '▲ TO LOADOUT' : j >= 0 ? `▲ SWAP WITH ${A[j].name}` : 'LOADOUT FULL'}</button><button class="pxbtn small" id="stUJunk"${isLocked(w) ? ' disabled' : ''}>${isLocked(w) ? 'LOCKED' : 'JUNK +' + salvageG(w) + 'G'}</button><button class="pxbtn small" id="stLock">${isLocked(w) ? 'UNLOCK' : 'LOCK'}</button>`; }
  else { const j = A.findIndex(a => (a.slot || 'weapon') === (w.slot || 'weapon')), room = A.length < kc, wear = canWear(w);
    d = itemCompareHtml(w, Geq, 'STASH', true) + `<p class="tiny">Stash · safe here · junk: +${salvageG(w)}g${!wear ? ' · <span class="c-bad">loadout full: no free slot and no same-slot piece to swap</span>' : ''}</p>`;
    acts = `<button class="pxbtn small go" id="stToA"${wear ? '' : ' disabled'}>${room ? '▲ TO LOADOUT' : j >= 0 ? `▲ SWAP WITH ${A[j].name}` : 'LOADOUT FULL'}</button><button class="pxbtn small" id="stJunk"${isLocked(w) ? ' disabled' : ''}>${isLocked(w) ? 'LOCKED' : 'JUNK +' + salvageG(w) + 'G'}</button><button class="pxbtn small" id="stLock">${isLocked(w) ? 'UNLOCK' : 'LOCK'}</button>`; }
  $('#stDet').innerHTML = `<div class="stdetbody">${d}</div><div class="stacts" id="stActs">${acts}</div>`;
  bindStashPick($('#stLoad')); bindStashPick($('#stGrid'));
  $('#stLoad').querySelectorAll('[data-sa]').forEach(b => b.onclick = () => stPick('a', +b.dataset.sa));
  $('#stGrid').querySelectorAll('[data-ss]').forEach(b => b.onclick = () => stPick('s', +b.dataset.ss));
  $('#stGrid').querySelectorAll('[data-su]').forEach(b => b.onclick = () => stPick('u', +b.dataset.su));
  $('#stStashHd').querySelectorAll('[data-stt]').forEach(b => b.onclick = () => { stTab = b.dataset.stt; if (stSel && stSel.k !== 'a') stSel = null; sfx('swap'); renderStash(); });
  const sp = $('#stSup'); if (sp) sp.onclick = () => openSupport();
  const ws = $('#stWs'); if (ws) ws.onclick = () => { showScreen('home'); vSel = 'workshop'; renderHome(); };
  const ua = $('#stUToA'); if (ua) ua.onclick = () => { const r = uniqToArm(stSel.i); if (r) { sfx('swap'); stSel = r === 'add' ? { k: 'a', i: save.armory.length - 1 } : stSel; } renderStash(); };
  const uj = $('#stUJunk'); if (uj) uj.onclick = () => { const it = U[stSel.i]; if (!it || isLocked(it) || !confirm(`Junk ${it.name} for ${salvageG(it)} gold? It will be gone.`)) return; const g = uniqJunk(stSel.i); if (g) { sfx('gem'); toast(`+${g} gold`); stSel = null; } renderStash(); };
  const ts = $('#stToS'); if (ts) ts.onclick = () => { const r = armToStash(stSel.i); if (r) { sfx('swap'); stSel = r === 'uniq' ? (stTab = 'u', { k: 'u', i: save.uniq.length - 1 }) : { k: 's', i: save.stash.length - 1 }; } renderStash(); };
  const ta = $('#stToA'); if (ta) ta.onclick = () => { const r = stashToArm(stSel.i); if (r) { sfx('swap'); stSel = r === 'add' ? { k: 'a', i: save.armory.length - 1 } : stSel; } renderStash(); };
  const tj = $('#stJunk'); if (tj) tj.onclick = () => { const it = S[stSel.i]; if (!it || isLocked(it) || !confirm(`Junk ${it.name} for ${salvageG(it)} gold? It will be gone.`)) return; const g = stashJunk(stSel.i); if (g) { sfx('gem'); toast(`+${g} gold`); stSel = null; } renderStash(); };
  const sl = $('#stLock'); if (sl) sl.onclick = () => { if (!w) return; toggleLock(w); persist(); sfx('swap'); toast(isLocked(w) ? 'Locked' : 'Unlocked'); renderStash(); };
  return true; }
function stPick(k, i, fromPtr) {   // 1.17.1: change selection without depending on a click that a scroll can cancel
  stSel = { k, i }; if (!fromPtr) { /* test / mouse .click() path */ } renderStash(); return stSel; }
function bindStashPick(root) {   // root cause of missed stash taps: tiles lived in an overflow:auto column and used only `onclick`.
  // On a real phone a few pixels of finger movement is treated as a scroll, so the click never fires. A mid-gesture
  // renderStash() innerHTML rebuild can also drop the target. Fix: delegated pointerup with a 14px slop, plus onclick for tests.
  if (!root || root.dataset.pickBound) return; root.dataset.pickBound = '1';
  let sx = 0, sy = 0, t = null;
  root.addEventListener('pointerdown', e => { const b = e.target.closest('[data-ss],[data-sa],[data-su]'); if (!b || !root.contains(b)) return; sx = e.clientX; sy = e.clientY; t = b; });
  root.addEventListener('pointerup', e => { const b = e.target.closest('[data-ss],[data-sa],[data-su]'); if (!t || b !== t) { t = null; return; }
    if (Math.hypot(e.clientX - sx, e.clientY - sy) > 14) { t = null; return; }
    const k = b.dataset.sa != null ? 'a' : b.dataset.su != null ? 'u' : 's', i = +(b.dataset.sa != null ? b.dataset.sa : b.dataset.su != null ? b.dataset.su : b.dataset.ss);
    t = null; e.preventDefault(); stPick(k, i, true); }, { passive: false });
  root.addEventListener('pointercancel', () => { t = null; }); }
/* 1.13.0: the RUN-START COVER dialog (START / CHALLENGE insurance picker) is gone. */

/* ---------------- 1.9.0 SETTINGS + MONETIZATION (locked by Matt) ----------------
   SETTINGS screen (hub ⚙ + pause ⚙ SETTINGS): ♪ sound (master mute), ♫ music only, BANNER mode, PREMIUM status / buy / restore, RESET PROGRESS (its one home now), ABOUT.
   ADS (no pay-to-win, nothing for sale but "no ads"):
   - (1.11.1: the INTERSTITIAL every 3rd finished run was REMOVED (Matt). No ad ever plays unless the player asks for one.)
   - (1.11.0: the rewarded SAVE HEIRLOOM offer was removed with the 1.7.1 death rule.) 1.13.0: REWARDED "SAVE ONE" on the death screen (see saveOne): once per lost kit, one piece back to the stash. Premium: free.
   - REWARDED "REVIVE": the first fatal hit of a run (after Hearth lives) pauses and offers an ad revive at MON.reviveHp. Once per run; the 2nd fatal hit = normal death.
   - PREMIUM (one-off IAP, sku MON.sku), 1.11.1 perks: bigger stash (STASH_CAP_P), the endless ★ UNIQUES tab, and the once-per-run revive happens automatically, free, no ad.
     1.13.0: the death-screen SAVE ONE is free too (no ad). (Insurance is gone, so there is no fee to discount.) Bought from Settings or the hub ♥ (Support the creator) dialog.
   - REWARDED "SUPPORT": hub ♥ (Support the creator) → WATCH AN AD = a thank-you + save.cheers++ (no gold / gear / power).
   PROVIDERS: this debug build ships STUBS (in-game dialogs, no SDK, no network, no money). Real hook points: admob() (@capacitor-community/admob style API) and
   billing() (a Play Billing plugin exposing purchase({ sku }) / restore()). Both are only used when MON.live = true AND the native plugin exists.
   Test hooks: __phNoAds (no ad prompts at all = 1.8.0 behaviour; injected for the pre-1.9 suites), __phPremium (force premium),
   __phAdAuto ('ok' | 'skip': stub ads resolve instantly without a dialog). (__phForceAd went with the interstitial in 1.11.1.) */
const MON = { reviveHp: 0.5, reviveInv: 2.5, sku: 'pixelhorde_premium', live: false,   // 1.11.1: interEvery + the interstitial unit removed
  units: { reward: 'ca-app-pub-3940256099942544/5224354917' } };   // Google's public TEST ad units: swap for the real AdMob ids + set live: true once the plugin is in
const MONST = { reward: 0, rewardOk: 0, buy: 0, cheer: 0, last: null };   // session counters (tests / debugging)
const isPremium = () => !!(save.premium || window.__phPremium);
const adsOff = () => !!window.__phNoAds;
const capPlug = n => { const C = window.Capacitor; return MON.live && C && C.Plugins && C.Plugins[n] ? C.Plugins[n] : null; };
const admob = () => capPlug('AdMob'), billing = () => capPlug('Billing');
const adProvider = () => admob() ? 'admob' : 'stub', billProvider = () => billing() ? 'play' : 'stub';
let adCb = null;
function adDlg(o, cb) {   // one in-game dialog for every offer / stub ad / stub purchase (z-index above everything)
  $('#adTag').textContent = o.tag || ''; $('#adH').textContent = o.h; $('#adB').innerHTML = o.b; $('#adYes').textContent = o.yes; $('#adNo').textContent = o.no || ''; $('#adNo').hidden = !o.no;
  const el = $('#adov'); el.dataset.k = o.k || ''; el.hidden = false; adCb = cb; MONST.last = o.k || null; }
function adClose(ok) { const cb = adCb; adCb = null; $('#adov').hidden = true; $('#adov').dataset.k = ''; if (cb) cb(ok); }
$('#adYes').onclick = () => { sfx('swap'); adClose(true); }; $('#adNo').onclick = () => adClose(false);
const ADS = {
  rewarded(kind, done) { MONST.reward++; const fin = g => { if (g) { MONST.rewardOk++; if (R) R.adWatched = true; } done(!!g); };
    const A = admob(); if (A) { Promise.resolve().then(() => A.prepareRewardVideoAd({ adId: MON.units.reward })).then(() => A.showRewardVideoAd()).then(r => fin(!!r)).catch(() => fin(false)); return; }
    if (window.__phAdAuto) return fin(window.__phAdAuto !== 'skip');
    adDlg({ k: 'reward-' + kind, tag: 'AD · DEBUG STUB (no SDK, no network)', h: 'REWARDED AD', b: `In the store build a short AdMob rewarded video plays here. Watch it to the end to <b>${kind === 'revive' ? 'revive' : kind === 'support' ? 'support the creator' : kind === 'save' ? 'save one lost piece' : 'get the reward'}</b>.`, yes: 'FINISH AD ✓', no: 'CLOSE EARLY ✕' }, fin); } };
function grantPremium(src) { save.premium = true; uvSweep(); persist(); MONST.buy++; sfx('extract'); toast('PREMIUM unlocked: bigger stash + ★ UNIQUES tab. Thank you!'); renderSettings(); if (mode !== 'run') renderHub(); if (!$('#supov').hidden) renderSupport(); return src; }   // 1.11.1: stash Uniques move to their tab
function buyPremium(done) {
  const fin = ok => { if (done) done(ok); };
  if (isPremium()) { toast('PREMIUM is already active'); return fin(true); }
  const B = billing(); if (B) { Promise.resolve().then(() => B.purchase({ sku: MON.sku })).then(r => { if (r && (r.owned || r.purchased)) grantPremium('play'); fin(isPremium()); }).catch(() => fin(false)); return; }
  adDlg({ k: 'buy', tag: 'PREMIUM · DEBUG STUB PURCHASE', h: 'GET PREMIUM', b: `One-time purchase that supports the creator. <b>Bigger stash</b> (${STASH_CAP.join(' / ')} → ${STASH_CAP_P.join(' / ')}), an <b>endless ★ UNIQUES</b> stash tab, and the <b>once-per-run revive</b> + the death-screen <b>save one</b> become free (no ad). No gear, gold or power for sale.<br><span class="tiny c-bad">Debug build: FAKE purchase. No Google Play, no money charged; it only sets PREMIUM in your save.</span>`, yes: 'CONFIRM FAKE PURCHASE', no: 'CANCEL' },
    ok => { if (ok) grantPremium('stub'); fin(ok); }); }
function restorePremium() { const B = billing();
  if (B) { Promise.resolve().then(() => B.restore()).then(r => { if (r && (r.owned || (r.skus || []).includes(MON.sku))) grantPremium('restore'); else toast('No purchase to restore'); }).catch(() => toast('Restore failed: try again online')); return; }
  toast(isPremium() ? 'PREMIUM is active on this device' : 'Debug stub: no store connection, nothing to restore'); }
/* revive offer (called by hurt() on the fatal hit, after Hearth lives) */
function doRevive(pct, label, col) { const p = R.p; p.hp = R.S.maxHp * pct; p.inv = MON.reviveInv; R.flash = 0.3; addShake(8); sfx('revive');
  R.FX.push({ k: 'ring', x: p.x, y: p.y, r: 80, t: 0.5, m: 0.5, c: col || PAL[4] }); burst(p.x, p.y, col || PAL[4], 40, 80); for (const b of R.EP) b.life = 0;
  for (const e of R.E) { const dx = e.x - p.x, dy = e.y - p.y, dd = Math.hypot(dx, dy) || 1; if (dd < 80 && !e.boss && !e.heavy) { e.kx += dx / dd * 160; e.ky += dy / dd * 160; e.frozen = Math.max(e.frozen, 1); } }
  R.banner = { s: label, t: 2.4, c: '#ffcd75' }; }
function reviveOffer() {
  if (R && R.pick) { R.pickQ = []; rpChoose(0); }   // 1.14.1: never stack the revive offer on an open reward pick
  if (!R || R.over || R.adRev || adsOff()) return false; R.adRev = true;   // once per run, offered or not
  if (isPremium()) { R.adRevBy = 'premium'; doRevive(MON.reviveHp, 'PREMIUM REVIVE! (once per run)', '#ffcd75'); return true; }
  R.p.hp = 0; R.adAsk = 'revive'; paused = true; input.stick = null; input.mx = input.my = 0;
  adDlg({ k: 'revive', tag: 'YOU ARE DOWN · ONCE PER RUN', h: 'REVIVE?', b: `<b>Do you want to revive instead of dying right now?</b><br>Watch a short ad to get back up with <b>${MON.reviveHp * 100}% HP</b> and ${MON.reviveInv} s of safety. One revive per run, after your Hearth lives.<br><span class="tiny"><b>PREMIUM</b> revives free, no ad. Say no and you fall (everything you carry is lost; an ad can save one piece).</span>`, yes: '▶ WATCH AD · REVIVE', no: 'NO, FALL' },
    ok => ok ? ADS.rewarded('revive', got => reviveEnd(got)) : reviveEnd(false));
  return true; }
function reviveEnd(got) { if (!R || mode !== 'run' || R.adAsk !== 'revive') return false; R.adAsk = null; paused = false; last = performance.now();
  if (got) { R.adRevBy = 'ad'; doRevive(MON.reviveHp, 'AD REVIVE! BACK ON YOUR FEET'); } else fallDown();
  return got; }
/* 1.11.0: the rewarded SAVE HEIRLOOM offer is gone with the 1.7.1 death rule. 1.13.0: the death screen's SAVE ONE (saveOne) is the rewarded surface. */
/* 1.11.1: no interstitial cadence any more; BACK TO CAMP always goes straight home */
function backToCamp(next) { mode = 'hub'; R = null; showScreen(next || 'hub'); return 'hub'; }   // 1.11.0: OPEN STASH from the run-end screen
/* ---------------- 1.11.1 MONETIZATION REMOUNT (Matt, 2026-11-03; replaces the 2026-11-02 store plan) ----------------
   - NO interstitials any more (the every-3-runs BACK TO CAMP ad, MON.interEvery and save.adRuns are gone).
   - (1.13.0: insurance removed entirely, so no fee and no discount.)
   - Hub ♥ SUPPORT = "Support the creator": WATCH AN AD (rewarded stub; reward = a thank-you + the ♥ cheer counter, no gold / gear / power)
     OR BUY PREMIUM (one-time, sets save.premium).
   - PREMIUM unlocks: a bigger stash (STASH_CAP_P 24 / 48 / 80 vs free 12 / 24 / 40) + the endless ★ UNIQUES tab (save.uniq: every Unique you extract
     goes there instead of the stash, no cap, never salvaged) + the once-per-run revive stays free / automatic (1.9.0).
   - Cosmetics parked (no skins). */
const isUq = w => !!w && w.rarity === 3;
const uvOn = () => LOAD.on && isPremium();
const uqSeen = () => new Set([...(save.uniq || []), ...save.stash, ...save.armory].filter(w => isUq(w) && w.uq).map(w => w.uq));
const uqTotal = () => Object.keys(UNIQ).length;
function uvSweep() { if (!uvOn()) return 0; const S = save.stash, mv = S.filter(isUq); if (!mv.length) return 0; save.stash = S.filter(w => !isUq(w)); save.uniq.push(...mv); persist(); return mv.length; }
function uniqToArm(i) { const U = save.uniq, A = save.armory, w = U[i]; if (!w) return false;
  if (A.length < keepCap()) { U.splice(i, 1); A.push(w); persist(); return 'add'; }
  const j = A.findIndex(a => (a.slot || 'weapon') === (w.slot || 'weapon')); if (j < 0) return false; const old = A[j];
  if (isUq(old) && uvOn()) U[i] = old; else { if (save.stash.length >= stashCap()) return false; U.splice(i, 1); save.stash.push(old); }
  A[j] = w; persist(); return 'swap'; }
function uniqJunk(i) { const w = save.uniq[i]; if (!w) return 0; if (isLocked(w)) { toast('Locked — unlock first'); sfx('deny'); return 0; } save.uniq.splice(i, 1); const g = salvageG(w); save.gold += g; persist(); return g; }
/* SUPPORT THE CREATOR (hub ♥ SUPPORT) */
const SUP = { thanks: ['THANK YOU!', 'YOU ROCK!', 'MUCH LOVE!', 'CHEERS!'] };
function renderSupport() { const pr = isPremium(), n = save.cheers || 0;
  $('#supB').innerHTML = `Pixel Horde is made by one person. If you enjoy it, you can say thanks two ways. <b>Nothing here sells power</b>: no gear, gold or XP for money or ads.${n ? `<br><b class="gold">♥ You have cheered ${n} time${n === 1 ? '' : 's'}. Thank you!</b>` : ''}`;
  $('#supAdTxt').innerHTML = 'Watch one short ad. Free for you; it helps the creator. You get a big thank-you and a <b>♥ cheer</b> on your hub. As often as you like.';
  $('#supPremTxt').innerHTML = pr ? '<b class="gold">★ PREMIUM OWNED.</b> Thank you! Bigger stash, endless ★ UNIQUES tab, free revive + free save-one on death.' : `One-time purchase. <b>Bigger stash</b> (${STASH_CAP.join(' / ')} → <b>${STASH_CAP_P.join(' / ')}</b>), an <b>endless ★ UNIQUES</b> stash tab (collect every unique), and your once-per-run <b>revive</b> + the death-screen <b>save one</b> are free (no ad).`;
  $('#supBuy').disabled = pr; $('#supBuy').textContent = pr ? '★ PREMIUM OWNED' : '★ BUY PREMIUM'; $('#supAd').disabled = false; return true; }
function openSupport() { if (mode === 'run') return false; renderSupport(); $('#supov').hidden = false; MONST.last = 'support'; return true; }
function closeSupport() { $('#supov').hidden = true; return true; }
function supportAd(done) { ADS.rewarded('support', got => { if (got) { save.cheers = (save.cheers || 0) + 1; persist(); MONST.cheer++; sfx('extract'); toast(`♥ ${SUP.thanks[(save.cheers - 1) % SUP.thanks.length]} Ad watched: thank you for supporting the creator`); }
  else toast('Ad closed early: no problem, thanks for looking!'); renderSupport(); if (mode === 'hub') renderHub(); if (done) done(got); }); }
$('#bSupport').onclick = () => { sfx('swap'); openSupport(); }; $('#supClose').onclick = () => closeSupport();
$('#supAd').onclick = () => supportAd(); $('#supBuy').onclick = () => buyPremium(() => renderSupport());

const PRIVACY_URL = 'https://mjonathandom-sudo.github.io/habitling-privacy/pixel-horde/';   // 1.16.1 public policy (do not revise content here)
const BETA_BANNER = 'Welcome to beta testing!';   // 1.16.1 hub/start only — exact Matt copy
async function openExt(url) {   // Android-capable external link (Capacitor App.openUrl → browser)
  try { const Cap = typeof window !== 'undefined' && window.Capacitor, App = Cap && Cap.Plugins && Cap.Plugins.App;
    if (App && App.openUrl) { await App.openUrl({ url }); return 'app'; }
  } catch (e) {}
  try { window.open(url, '_blank', 'noopener'); return 'window'; } catch (e2) { location.href = url; return 'loc'; }
}
/* SETTINGS screen */
let setFrom = 'hub';
function renderSettings() { const el = $('#settings'); if (!el) return;
  $('#bSndS').textContent = save.sound ? '♪ ON' : '♪ OFF'; $('#bMusS').textContent = save.music ? '♫ ON' : '♫ OFF'; $('#bMusS').classList.toggle('dim', !save.sound);
  $('#bBannerS').textContent = 'BANNER: ' + BANNER_LBL[bannerMode()]; const pr = isPremium();
  $('#setPrem').textContent = pr ? '★ PREMIUM' : 'FREE'; $('#setPrem').className = pr ? 'gold' : ''; $('#bPremBuy').hidden = pr;
  $('#setPremTxt').innerHTML = pr ? `Thank you! Stash ${STASH_CAP_P.join(' / ')} + endless ★ UNIQUES tab; your once-per-run revive and death save-one are free.` : `No ads between runs, ever. Optional ads only: the revive offer when you go down, the save-one offer when you lose your kit, or the ♥ (Support the creator) button on the hub. PREMIUM (one-time): stash ${STASH_CAP_P.join(' / ')} (free ${STASH_CAP.join(' / ')}) + endless ★ UNIQUES tab + free revive + free death save-one.`;
  const inRun = setFrom === 'pause'; $('#bWipe').disabled = inRun; $('#setWipeTxt').textContent = inRun ? 'finish or abandon the run first' : 'wipes your whole save (2-step confirm)';
  $('#setWhere').textContent = inRun ? 'run paused' : '';
  const bC = $('#bLootC'), bM = $('#bLootM'), bV = $('#bLootConv');   // 1.15.0
  if (bC) { bC.textContent = save.lootHideC ? 'HIDE' : 'SHOW'; bC.classList.toggle('on', !!save.lootHideC); }
  if (bM) { bM.textContent = save.lootHideM ? 'HIDE' : 'SHOW'; bM.classList.toggle('on', !!save.lootHideM); }
  if (bV) { bV.textContent = lootConvOn() ? 'ON' : 'OFF'; bV.classList.toggle('on', lootConvOn()); }
  const tip = $('#setLootTxt'); if (tip) tip.textContent = `Loot filter applies to ground and bag. Floor: ${FILTER_LBL[lootMin()].replace('LOOT: ', '')}. Below floor: never on ground, never auto-pick.${lootConvOn() ? ' Convert → gold.' : ''} Rare+ always keep.`;
  const bH = $('#bVerboseHud'); if (bH) { bH.textContent = verboseHud() ? 'ON' : 'OFF'; bH.classList.toggle('on', verboseHud()); }
  const ht = $('#setHudTxt'); if (ht) ht.textContent = verboseHud() ? 'weapon, gear pips, buffs, kill count, teaching text' : 'CLEAN: HP / gold / wave + arrows (default)';
  const bVb = $('#bVib'); if (bVb) { const on = save.vibrate !== false; bVb.textContent = on ? 'ON' : 'OFF'; bVb.classList.toggle('on', on); }   // 1.18.0
  const bSh = $('#bShake'); if (bSh) { bSh.textContent = shakeOn() ? 'ON' : 'OFF'; bSh.classList.toggle('on', shakeOn()); }
  const sht = $('#setShakeTxt'); if (sht) sht.textContent = shakeOn() ? 'camera kick on hits (capped)' : 'no camera kick';
  $('#setAbout').innerHTML = `<b>PIXEL HORDE</b> v${VERSION} · design + playtests: Matt · pixel art, music and sound effects are all generated in-game (no third-party assets) · <a href="${PRIVACY_URL}" id="bPrivacy" class="privlink">privacy policy</a> · ads: <b>${adProvider()}</b> · store: <b>${billProvider()}</b>${adProvider() === 'stub' ? ' (debug stubs: no real ads, no real purchases)' : ''}`;
  const bp = $('#bPrivacy'); if (bp) bp.onclick = e => { e.preventDefault(); openExt(PRIVACY_URL); }; }
const FB = { to: 'conradimatt@gmail.com', open: false, shot: null };
function captureFeedbackShot() {
  try { const c = document.getElementById('cv') || document.querySelector('canvas#game') || document.querySelector('canvas'); if (!c) return null;
    FB.shot = c.toDataURL('image/png'); return FB.shot; } catch (e) { FB.shot = null; return null; }
}
function openFeedback(from) {
  FB.open = true; FB.from = from || mode; captureFeedbackShot();
  const el = $('#fbov'); if (!el) return false; $('#fbTxt').value = ''; $('#fbStatus').textContent = FB.shot ? 'Screenshot attached.' : 'No screenshot (canvas missing).';
  el.hidden = false; if (mode === 'run' && paused) $('#pause').hidden = true; return true;
}
function closeFeedback() { FB.open = false; const el = $('#fbov'); if (el) el.hidden = true; if (mode === 'run' && paused && !charOpen) $('#pause').hidden = false; }
async function sendFeedback() {
  const body = ($('#fbTxt') && $('#fbTxt').value || '').trim(); if (!body) { toast('Write a short note first'); return false; }
  const ver = `Pixel Horde ${VERSION} (vc45)`; const subj = `[Pixel Horde feedback] ${ver}`;
  const text = `${body}\n\n---\n${ver}\nmode=${mode} wave=${R && R.wave || '-'} map=${save.map} hero=${save.hero}\n`;
  $('#fbStatus').textContent = 'Opening email…';
  const Cap = typeof window !== 'undefined' && window.Capacitor; const plug = Cap && Cap.Plugins && Cap.Plugins.Feedback;
  try {
    if (plug && plug.send) {
      await plug.send({ to: FB.to, subject: subj, body: text, pngBase64: FB.shot || '' });
      toast('Email app opened — tap Send'); closeFeedback(); return true;
    }
  } catch (e) { /* fall through */ }
  // web / smoke fallback: mailto (no attachment) + keep shot in FB for tests
  FB.last = { to: FB.to, subject: subj, body: text, hasShot: !!FB.shot };
  try {
    const mailto = `mailto:${encodeURIComponent(FB.to)}?subject=${encodeURIComponent(subj)}&body=${encodeURIComponent(text.slice(0, 1800))}`;
    if (Cap && Cap.Plugins && Cap.Plugins.App && Cap.Plugins.App.openUrl) await Cap.Plugins.App.openUrl({ url: mailto });
    else window.location.href = mailto;
  } catch (e2) {}
  toast('Compose opened (attach screenshot if needed)'); closeFeedback(); return true;
}
function openSettings() {
  if (mode === 'run') { if (!R || R.over || !paused || bagOpen || mkOpen || R.adAsk) return false; setFrom = 'pause'; $('#pause').hidden = true; $('#settings').hidden = false; }
  else if (mode === 'hub') { setFrom = 'hub'; showScreen('settings'); } else return false;
  renderSettings(); return true; }
function closeSettings() { if (setFrom === 'pause' && mode === 'run') { $('#settings').hidden = true; $('#pause').hidden = !paused; setBannerBtns(); setMusBtns(); lootSyncMin(); if (bagOpen) renderBag(); return 'pause'; }
  showScreen('hub'); return 'hub'; }
const toggleSound = () => { save.sound = !save.sound; persist(); audApply(); renderHub(); sfx('swap'); renderSettings(); return save.sound; };
$('#bCharP').onclick = () => openChar(); $('#bCharX').onclick = () => closeChar();   // 1.13.1
$('#bSet').onclick = () => openSettings(); $('#bSetP').onclick = () => openSettings(); $('#bSetBack').onclick = () => closeSettings();
$('#bFb').onclick = () => openFeedback('hub'); $('#bFbP').onclick = () => openFeedback('pause');
$('#fbSend').onclick = () => sendFeedback(); $('#fbCancel').onclick = () => closeFeedback();
$('#bSndS').onclick = () => toggleSound(); $('#bMusS').onclick = () => { toggleMusic(); renderSettings(); }; $('#bBannerS').onclick = () => { cycleBanner(); sfx('swap'); renderSettings(); };
$('#bLootC').onclick = () => { setLootHide('c', !save.lootHideC); sfx('swap'); toast(save.lootHideC ? 'Commons hidden' : 'Commons shown'); };
$('#bLootM').onclick = () => { setLootHide('m', !save.lootHideM); sfx('swap'); toast(save.lootHideM ? 'Magics hidden' : 'Magics shown'); };
$('#bLootConv').onclick = () => { setLootHide('conv', !lootConvOn()); sfx('swap'); toast(lootConvOn() ? 'Filtered junk → gold' : 'Filtered junk discarded'); };
$('#bVerboseHud').onclick = () => { setVerboseHud(!verboseHud()); sfx('swap'); toast(verboseHud() ? 'VERBOSE HUD on' : 'CLEAN HUD (default)'); };
$('#bShake').onclick = () => { setShake(!shakeOn()); sfx('swap'); toast(shakeOn() ? 'Screen shake on' : 'Screen shake off'); };
$('#bPremBuy').onclick = () => buyPremium(); $('#bPremRestore').onclick = () => restorePremium();


/* ---------------- loop ---------------- */
let last = performance.now(), acc = 0; const STEP = 1 / 60;
function frame(now) {
  const dt = Math.min(0.1, (now - last) / 1000); last = now;
  if (mode === 'run' && R && !paused) { acc += dt; let n = 0; while (acc >= STEP && n++ < 6) { update(STEP); acc -= STEP; if (paused) { acc = 0; break; } }   // 1.0.0: a step that opens the Market stops the batch if (n >= 6) acc = 0;
    updAbil(bA1, R.p.cd1, kitOf().a1.cd * R.S.cd); updAbil(bA2, R.p.cd2, kitOf().a2.cd * R.S.cd); updBagBtn(); }
  render(now); try { musTick(); } catch (e) {}
  if (mode !== 'run' && now - vDrawT > (vAnim && now - vAnim.t0 < 1700 || vPan || vDrag ? 30 : 90)) { vDrawT = now; if (!$('#home').hidden) drawVillage($('#villageCv'), now); else if (!$('#hub').hidden) drawVillage($('#hubVillage'), now); }
  requestAnimationFrame(frame);
}
addEventListener('pointerdown', () => { if (save.sound && (!AC || AC.state !== 'running')) audWake(); }, { passive: true }); addEventListener('keydown', () => { if (save.sound && (!AC || AC.state !== 'running')) audWake(); });   // 1.8.0: first tap unlocks audio (hub music starts)
showScreen('hub'); requestAnimationFrame(frame);

// test hook (harmless in production)
/* ================= 1.14.0: resources · workshop kits · mage trials ================= */
function resHas(c, s = save) { return !c || Object.keys(c).every(k => ((s.res && s.res[k]) || 0) >= c[k]); }
function resPay(c, s = save) { if (!c) return; for (const k in c) s.res[k] = Math.max(0, (s.res[k] || 0) - c[k]); }
function resTxt(c) { return Object.keys(c || {}).map(k => `${c[k]} ${RES.t[k].n.toLowerCase()}`).join(' + '); }
function resLine(r, all) { return RES.ids.filter(k => all || (r && r[k] > 0)).map(k => `<b style="color:${RES.t[k].c}">${nfmt((r && r[k]) || 0)}</b> ${RES.t[k].n.toLowerCase()}`).join(' · '); }
function resAdd(k, v) { if (!R || !RES.t[k] || !(v > 0)) return 0; R.res[k] = (R.res[k] || 0) + v; return v; }
function resRoll(w) { const ok = RES.ids.filter(k => k !== 'people' && w >= RES.t[k].w).concat(w >= RES.t.people.w ? ['people'] : []); let tot = 0; for (const k of ok) tot += 1 / RES.t[k].tier; let r = Math.random() * tot; for (const k of ok) { r -= 1 / RES.t[k].tier; if (r <= 0) return k; } return ok[0]; }
function resAmt(k, w) { return Math.max(1, Math.round(RES.t[k].v * (1 + w / 20) * ((R && R.M && R.M.loot) || 1))); }
function resChip(x, y, k, v) { R.C.push({ x: x + rnd(-8, 8), y: y + rnd(-8, 8), v, r: k, mag: false }); }
function resKillDrop(e) { if (!R || R.raid) return 0; const P = RES.p[e.boss ? 'boss' : e.mini ? 'mini' : e.elite ? 'elite' : 'foe']; if (Math.random() >= P[1]) return 0;
  for (let i = 0; i < P[0]; i++) { const k = resRoll(R.wave); resChip(e.x, e.y, k, resAmt(k, R.wave)); } return P[0]; }
function caravanRes(ev) { const w = R.wave, got = { wood: 6 + Math.floor(w / 2) }; if (w >= RES.t.stone.w) got.stone = 3 + Math.floor(w / 4); if (w >= RES.t.oil.w) got.oil = 2 + Math.floor(w / 8); got.people = 1 + Math.floor(w / 15);
  for (const k in got) resChip(ev.x, ev.y, k, got[k]); R.bq.push({ s: `SUPPLY CRATE: ${resTxt(got).toUpperCase()}`, t: 2, c: RES.t.wood.c }); return got; }
function resBank(full) { const out = {}; let any = 0; for (const k of RES.ids) { const v = Math.floor(((R.res && R.res[k]) || 0) * (full ? 1 : RES.deathKeep)); if (v > 0) { save.res[k] = (save.res[k] || 0) + v; out[k] = v; any = 1; } } persist();
  const haul = RES.ids.some(k => R.res && R.res[k] > 0); R.resBanked = out;
  return { out, line: haul ? `+${any ? resLine(out) : 'nothing'} banked${full ? '' : ' <span class="c-bad">(half lost: not extracted)</span>'}` : '' }; }
function drawResChip(x, y, k, now) { const c = RES.t[k].c, b = Math.floor(now / 150 + x) % 4 === 0 ? -1 : 0; ctx.fillStyle = '#0b0b14'; ctx.fillRect(x - 3, y - 3 + b, 6, 6); ctx.fillStyle = c; ctx.fillRect(x - 2, y - 2 + b, 4, 4); ctx.fillStyle = '#f4f4f4'; ctx.fillRect(x - 2, y - 2 + b, 1, 1); }
/* workshop */
function kitCan(k) { return !!KITS[k] && ((save.kits && save.kits[k]) || 0) < KIT_MAX && resHas(KITS[k].cost); }
function kitCraft(k) { if (!kitCan(k)) return false; resPay(KITS[k].cost); save.kits[k] = (save.kits[k] || 0) + 1; persist(); return true; }
function kitsOwned() { return Object.keys(KITS).filter(k => (save.kits && save.kits[k]) > 0); }
function kitsDeploy() { if (!R || R.raid) return []; const used = [];
  for (const k of kitsOwned()) { const K = KITS[k]; save.kits[k]--; if (!save.kits[k]) delete save.kits[k]; used.push(k);
    if (K.buff) { R.buffs[K.buff[0]] = Math.max(R.buffs[K.buff[0]] || 0, 0) + K.buff[1]; } if (K.life) R.lives += K.life; }
  if (used.length) { R.S = stats(R.gear); R.p.hp = R.S.maxHp; R.bq.push({ s: `FIELD KITS: ${used.map(k => KITS[k].n).join(' · ')}`, t: 2.2, c: RES.t.wood.c }); persist(); }
  R.kitsUsed = used; return used; }
function workshopCard() { const sel = vSel === 'workshop';
  const rows = Object.keys(KITS).map(k => { const K = KITS[k], n = (save.kits && save.kits[k]) || 0, can = kitCan(k);
    return `<p><b>${K.n}</b> <span class="tiny">x${n}/${KIT_MAX}</span> · ${K.d}<br><span class="tiny">${ck(resHas(K.cost), resTxt(K.cost))}</span> <button class="pxbtn small${can ? ' go' : ''}" data-craft="${k}" ${can ? '' : 'disabled'}>${n >= KIT_MAX ? 'FULL' : 'CRAFT'}</button></p>`; }).join('');
  return `<div class="card ws${sel ? ' sel' : ''}" data-ws="1"><i style="background-image:url(${bigIcon(IMG.smithy.n[0], 5)})"></i><div class="bt"><h3>WORKSHOP <span class="tiny">FIELD KITS</span></h3><p>Stockpile: ${resLine(save.res, true)}</p><p class="tiny">Resources drop in runs (wood from wave 1, stone 5, oil 12, jewels 20, people 30; caravans bring a crate + refugees). Extract to bank the whole haul; die and half is lost. Every kit you own deploys one charge at the start of your next wave run.</p>${rows}</div></div>`; }
/* mage trials */
function msDmax(w) { return clamp(1 + Math.ceil(w / 4), 2, 6); }
function spawnSigil(d) { if (!R || R.raid) return null; const [x, y] = objRing18(rnd(80, 110)); d = d || 1 + Math.floor(Math.random() * msDmax(R.wave)); R.sig = { x, y, d, t: MSN.life, m: MSN.life, warn: 0 };
  if (!R.sigSeen) { R.sigSeen = 1; R.bq.push({ s: `MAGE SIGIL D${d}: STEP ON IT TO START A TRIAL`, t: 2.2, c: MSN.col[d - 1] }); } sfx('event'); return R.sig; }
function msStep(dt) { if (!R || R.raid || R.over) return; const g = R.sig;
  if (!g) { if (R.wave >= MSN.from && !(R.ev && R.ev.ms)) { R.sigT -= dt; if (R.sigT <= 0) spawnSigil(); } return; }
  g.t -= dt; if (g.t <= 0) { R.sig = null; R.sigT = rnd(MSN.every[0], MSN.every[1]); return; }
  const p = R.p; if (Math.hypot(p.x - g.x, (p.y - g.y) / 0.7) < MSN.r) { if (R.ev) { if (!g.warn) { g.warn = 1; R.bq.push({ s: 'FINISH THE CURRENT EVENT FIRST', t: 1.6, c: '#94b0c2' }); } } else startMission(g); } }
function startMission(g) { if (!R || R.ev) return null; R.sig = null; const d = clamp(g.d | 0, 1, 6), C = EV8.mage, hm = 1 + 0.1 * (R.wave - 1), need = MSN.needB + MSN.needD * d, n = 2 + Math.ceil(d / 2);
  const pl = []; for (let i = 0; i < n; i++) pl.push(+(0.5 + i * (need - 3) / n).toFixed(2));
  R.ev = { k: 'escort', v: 'mage', ms: { d, pl }, x: g.x, y: g.y, r: 6, hp: C.hp * hm * MSN.hpX[d - 1], maxHp: C.hp * hm * MSN.hpX[d - 1], prog: 0, need, pi: 0, t: 0, hurtT: 0, ward: false, nT: C.frost };
  R.msN++; R.majCd = EV8.majGap; sfx('event');
  R.banner = { s: `MAGE TRIAL D${d}: DEFEND HER ${need}S`, t: 2.4, c: MSN.col[d - 1] };
  const rules = [`REWARD X${MSN.rewX[d - 1]}: GOLD · XP · A BOON`]; if (d >= MSN.eliteD) rules.push('ELITES JOIN EVERY PULSE'); if (d >= MSN.auraD) rules.push('SNARE AURA: STAY IN HER RING'); if (d >= MSN.breakD) rules.push('BREAKERS: SHE TAKES +50%');
  for (const s of rules) R.bq.push({ s, t: 1.8, c: s.startsWith('REWARD') ? '#ffcd75' : PAL[2] }); return R.ev; }
function missionPulse(ev) { const d = ev.ms.d; spawnRaiders(ev, Math.round((4 + Math.floor(R.wave / 3)) * MSN.packX[d - 1]));
  const ne = d >= MSN.eliteD ? d - 2 : 0; for (let i = 0; i < ne; i++) { const a = Math.random() * TAU, r = rnd(110, 135); R.rq.push({ x: ev.x + Math.cos(a) * r, y: ev.y + Math.sin(a) * r * 0.75, t: 1.2, m: 1.2, type: raidType(), ev, elite: true }); } }
function missionAura(ev, near, dt) { if (ev.ms.d < MSN.auraD) return false; ev.ms.snare = near > EV8.mage.ward && near < MSN.auraR; if (ev.ms.snare) { applyHex('slow', 0.5, 'zone'); return true; } return false; }
function msReward(d, r = Math.random()) { const pRev = d >= 3 ? 0.06 * d : 0, pAura = d >= 2 ? 0.12 + 0.08 * d : 0; return r < pRev ? 'revive' : r < pRev + pAura ? 'aura' : 'buff'; }
function missionWin(ev) { const w = R.wave, p = R.p, d = ev.ms.d, m = MSN.rewX[d - 1]; escortEnd(ev); R.ev = null; R.evT = rnd(35, 50); R.sigT = rnd(MSN.every[0], MSN.every[1]); R.msWon++; R.evWon++; save.events++;
  goldDrop(ev.x, ev.y, Math.round((30 + 6 * w) * m), 10);
  const xv = Math.max(1, Math.round((20 + 8 * w) * m * R.M.loot / 8)); for (let i = 0; i < 8; i++) R.G.push({ x: ev.x + rnd(-10, 10), y: ev.y + rnd(-8, 8), v: xv, mag: true });
  R.FX.push({ k: 'ring', x: ev.x, y: ev.y, r: 70, t: 0.5, m: 0.5, c: PAL[11] }); burst(ev.x, ev.y - 8, MSN.col[d - 1], 50, 90); R.flash = 0.15; sfx('nova');
  for (const e of R.E) { if (e.inst || e.hp <= 0) continue; if (Math.hypot(e.x - ev.x, e.y - ev.y) < 70 + e.r) { e.frozen = Math.max(e.frozen, e.boss ? 0.5 : 1.5); hit(e, R.S.baseDmg * 3, { proc: false, col: PAL[11] }); } }
  const k = msReward(d); let s;
  if (k === 'revive') { R.lives++; s = '+1 REVIVE'; sfx('revive'); }
  else if (k === 'aura') { const id = grantBuff(pick(MSN.auras), RUN_BUFF); R.runBuffs = (R.runBuffs || 0) + 1; s = `${BUFFS[id].name} FOR THE RUN`; }
  else { const sec = 30 + 15 * d, id = grantBuff(null, sec); s = `${BUFFS[id].name} ${sec}S`; }
  R.msLog.push(`D${d} ${s}`); R.banner = { s: `TRIAL D${d} WON! ${s}`, t: 2.6, c: '#ffcd75' }; return k; }
function drawTrialAura(ev, ex, ey, now) { if (ev.ms.d < MSN.auraD) return; const r = MSN.auraR; ctx.strokeStyle = '#b55088'; ctx.globalAlpha = 0.35 + 0.2 * Math.sin(now / 160); ctx.lineWidth = 1; ctx.setLineDash([3, 3]); ctx.lineDashOffset = -now / 60; ctx.beginPath(); ctx.ellipse(ex, ey, r, r * 0.65, 0, 0, TAU); ctx.stroke(); ctx.setLineDash([]); ctx.globalAlpha = 1; }
function drawSigil(X, Y, now) { const g = R.sig; if (!g) return; const x = X(g.x), y = Y(g.y), c = MSN.col[g.d - 1], fade = g.t < 8 && Math.floor(now / 160) % 2;
  ctx.globalAlpha = fade ? 0.45 : 1; ctx.strokeStyle = '#0b0b14'; ctx.lineWidth = 3; ctx.beginPath(); ctx.ellipse(x, y, MSN.r, MSN.r * 0.6, 0, 0, TAU); ctx.stroke(); ctx.strokeStyle = c; ctx.lineWidth = 1; ctx.beginPath(); ctx.ellipse(x, y, MSN.r, MSN.r * 0.6, 0, 0, TAU); ctx.stroke();
  for (let i = 0; i < 6; i++) { const a = now / 600 + i * TAU / 6; ctx.fillStyle = i < g.d ? c : '#333c57'; ctx.fillRect(Math.round(x + Math.cos(a) * (MSN.r - 3)) - 1, Math.round(y + Math.sin(a) * (MSN.r - 3) * 0.6) - 1, 2, 2); }
  const hv = Math.round(Math.sin(now / 250)); ctx.fillStyle = PAL[9]; ctx.fillRect(x - 3, y - 9 + hv, 6, 8); ctx.fillStyle = PAL[8]; ctx.fillRect(x - 2, y - 13 + hv, 4, 4); ctx.fillRect(x - 1, y - 15 + hv, 2, 2); ctx.fillStyle = c; ctx.fillRect(x + 4, y - 15 + hv, 2, 2);
  text(ctx, `D${g.d} X${MSN.rewX[g.d - 1]}`, x, y - 24, c, 1, 'c'); ctx.globalAlpha = 1; }

/* ================= 1.14.1: reward picks on missions · field events (Matt lock 2026-11-04) ================= */
/* REWARD PICK: a mission-shaped event (caravan escort, mage teleport escort, SUPPLY DROP, HOLD THE LINE) rolls a TIER T1-T6 shown before you commit
   (max T rises with the wave like the mage sigil). Harder tier = bigger / eliter raider pulses and a frailer objective. Win = the run PAUSES and you pick 1 of 3:
   RESOURCES (always offered: a crate of the best tier-appropriate resource) + 2 of GOLD / XP / BOON, each x MSN.rewX[T] (x0.5 .. x3).
   Mage trials keep their 1.14.0 payout (gold + XP + boon, no resources). */
const RP = { from: 1, gold: w => 45 + 9 * w, xp: w => 24 + 9 * w, res: 5, buffS: T => 40 + 15 * T, auraT: 4 };
function rpTier(w) { return 1 + Math.floor(Math.random() * msDmax(w)); }
function rpResKind(T, w) { const ok = RES.ids.filter(k => w >= RES.t[k].w); return ok[Math.min(ok.length - 1, Math.max(0, Math.ceil(T / 6 * ok.length) - 1))]; }
function rpAll(T, w) { const m = MSN.rewX[clamp(T, 1, 6) - 1], k = rpResKind(T, w), rv = Math.max(1, Math.round(RES.t[k].v * RP.res * (1 + w / 20) * m));
  return { res: { k: 'res', r: k, v: rv }, gold: { k: 'gold', v: Math.round(RP.gold(w) * m), s: '' }, xp: { k: 'xp', v: Math.max(8, Math.round(RP.xp(w) * m)), s: '' },
    buff: T >= RP.auraT ? { k: 'aura', id: pick(MSN.auras), v: RUN_BUFF } : { k: 'buff', id: pick(Object.keys(BUFFS)), v: RP.buffS(T) } }; }
/* 1.14.2 STAKES (pre-pick): 3 cards, each its own tier (low / mid / max for this wave) and kind (RESOURCES always + 2 of gold / XP / boon). The picked card's tier = the mission difficulty. */
const RPS = { wait: 30, r: 30, greedT: 5 };
function rpStakes(src, x, y) { const w = R.wave, Tm = msDmax(w), lo = Tm >= 5 && Math.random() < 0.5 ? 2 : 1, mid = clamp(Math.round((lo + Tm) / 2), lo, Tm), tiers = [lo, mid, Tm].sort(() => Math.random() - 0.5);
  const kinds = ['res'].concat(['gold', 'xp', 'buff'].sort(() => Math.random() - 0.5).slice(0, 2)), opts = kinds.map((q, i) => { const o = rpAll(tiers[i], w)[q]; o.T = tiers[i]; o.s = rpTxt(o); return o; });
  opts.sort((a, b) => a.T - b.T); return { src, T: 0, m: 0, x, y, opts, pre: 1 }; }
function rpDiff(T) { return `OBJECTIVE HP X${MSN.hpX[T - 1]} · RAIDERS X${MSN.packX[T - 1]}${T >= 4 ? ' · ELITES' : ''}${T >= RPS.greedT ? ' · GREED RING: NO REGEN / LIFESTEAL' : ''}`; }
function rpPre(src, x, y, cb) { if (!R || R.over) return null; const of = rpStakes(src, x, y); of.cb = cb;
  if (R.pick || R.adAsk) { (R.pickQ = R.pickQ || []).push(of); return of; } R.pick = of; R.adAsk = 'pick'; if (mode === 'run') { paused = true; input.stick = null; input.mx = input.my = 0; } rpRender(); sfx('event'); return of; }
function rpGrant(o, x, y, src) { if (o.k === 'res') { for (let n = 0, left = o.v, per = Math.max(1, Math.ceil(o.v / 4)); left > 0; n++) { const v = Math.min(per, left); resChip(x, y, o.r, v); left -= v; } }
  else if (o.k === 'gold') goldDrop(x, y, o.v / ((R.M ? R.M.loot : 1) * (1 + (R.S ? R.S.greed : 0))), 10);
  else if (o.k === 'xp') { const v = Math.max(1, Math.round(o.v / 8)); for (let n = 0; n < 8; n++) R.G.push({ x: x + rnd(-10, 10), y: y + rnd(-8, 8), v, mag: true }); }
  else { grantBuff(o.id, o.v); if (o.v === RUN_BUFF) R.runBuffs = (R.runBuffs || 0) + 1; }
  (R.rpLog = R.rpLog || []).push(`${src} T${o.T}: ${o.s}`); return o; }
function rpWin(o, x, y, src, title) { R.evWon++; save.events++; if (o) { rpGrant(o, x, y, src); R.banner = { s: `${title} ${o.s}`, t: 2.6, c: '#ffcd75' }; } else R.banner = { s: title, t: 2.4, c: '#ffcd75' }; return o; }
function greedRing(T, inside) { if (T >= RPS.greedT && inside) applyHex('noregen', 0.3, 'zone'); }
function drawGreed(ex, ey, r, now) { ctx.strokeStyle = PAL[2]; ctx.globalAlpha = 0.4 + 0.25 * Math.sin(now / 140); ctx.lineWidth = 1; ctx.setLineDash([2, 3]); ctx.lineDashOffset = now / 50; ctx.beginPath(); ctx.ellipse(ex, ey, r + 3, (r + 3) * 0.65, 0, 0, TAU); ctx.stroke(); ctx.setLineDash([]); ctx.globalAlpha = 1; }
function rpOffer(src, T, x, y) { const w = R.wave, m = MSN.rewX[clamp(T, 1, 6) - 1];
  const all = rpAll(T, w), _x = { gold: { k: 'gold', v: Math.round(RP.gold(w) * m), s: '' }, xp: { k: 'xp', v: Math.max(8, Math.round(RP.xp(w) * m)), s: '' },
    buff: T >= RP.auraT ? { k: 'aura', id: pick(MSN.auras), v: RUN_BUFF } : { k: 'buff', id: pick(Object.keys(BUFFS)), v: RP.buffS(T) } };
  const two = ['gold', 'xp', 'buff'].sort(() => Math.random() - 0.5).slice(0, 2), opts = [all.res].concat(two.map(q => all[q]));
  for (const o of opts) o.s = rpTxt(o); return { src, T, m, x, y, opts }; }
function rpTxt(o) { return o.k === 'res' ? `+${o.v} ${RES.t[o.r].n}` : o.k === 'gold' ? `+${o.v} GOLD` : o.k === 'xp' ? `+${o.v} XP` : o.k === 'aura' ? `${BUFFS[o.id].name} FOR THE RUN` : `${BUFFS[o.id].name} ${o.v}S`; }
function rpOpen(src, T, x, y) { if (!R || R.over) return null; const of = rpOffer(src, T, x == null ? R.p.x : x, y == null ? R.p.y : y);
  if (R.pick || R.adAsk) { (R.pickQ = R.pickQ || []).push(of); return of; } R.pick = of; R.adAsk = 'pick'; if (mode === 'run') { paused = true; input.stick = null; input.mx = input.my = 0; } rpRender(); sfx('event'); return of; }
function rpRender() { const el = $('#pickov'); if (!el) return; const of = R && R.pick; if (!of) { el.hidden = true; return; }
  $('#pickHead').innerHTML = of.pre ? `${of.src} <span class="tiny">CHOOSE YOUR STAKES · WIN = THIS REWARD · FAIL = NOTHING</span>` : `${of.src} <span class="tiny">T${of.T} · REWARD X${of.m}</span>`;
  $('#pickBody').innerHTML = of.opts.map((o, i) => { const c = o.k === 'res' ? RES.t[o.r].c : o.k === 'gold' ? '#ffcd75' : o.k === 'xp' ? '#a7f070' : BUFFS[o.id].c, lab = o.k === 'res' ? 'RESOURCES' : o.k === 'aura' ? 'RUN AURA' : o.k === 'buff' ? 'BOON' : o.k.toUpperCase();
    return `<button class="pxbtn pkopt" data-pick="${i}" style="border-color:${c}"><span class="tiny">${lab}</span><b style="color:${c}">${o.s}</b>${of.pre ? `<span class="tiny" style="color:${MSN.col[o.T - 1]}">T${o.T} · REWARD X${MSN.rewX[o.T - 1]}</span><span class="tiny">${rpDiff(o.T)}</span>` : ''}${o.k === 'res' ? '<span class="tiny">banks on extract</span>' : o.id ? `<span class="tiny">${BUFFS[o.id].d}</span>` : ''}</button>`; }).join('');
  el.hidden = false; for (const b of el.querySelectorAll('[data-pick]')) b.onclick = () => rpChoose(+b.dataset.pick); }
function rpChoose(i) { if (!R || !R.pick) return false; const of = R.pick, o = of.opts[clamp(i | 0, 0, of.opts.length - 1)];
  if (of.pre) { R.pick = null; R.adAsk = null; $('#pickov').hidden = true; if (mode === 'run') { paused = false; last = performance.now(); } if (of.cb) of.cb(o); R.bq.push({ s: `STAKES T${o.T}: ${o.s}`, t: 2, c: '#ffcd75' });
    if (R.pickQ && R.pickQ.length) { R.pick = R.pickQ.shift(); R.adAsk = 'pick'; if (mode === 'run') paused = true; rpRender(); } return o; }
  if (o.k === 'res') { for (let n = 0, left = o.v, per = Math.max(1, Math.ceil(o.v / 4)); left > 0; n++) { const v = Math.min(per, left); resChip(of.x, of.y, o.r, v); left -= v; } }
  else if (o.k === 'gold') goldDrop(of.x, of.y, o.v / ((R.M ? R.M.loot : 1) * (1 + (R.S ? R.S.greed : 0))), 10);
  else if (o.k === 'xp') { const v = Math.max(1, Math.round(o.v / 8)); for (let n = 0; n < 8; n++) R.G.push({ x: of.x + rnd(-10, 10), y: of.y + rnd(-8, 8), v, mag: true }); }
  else { grantBuff(o.id, o.v); if (o.v === RUN_BUFF) R.runBuffs = (R.runBuffs || 0) + 1; }
  (R.rpLog = R.rpLog || []).push(`${of.src} T${of.T}: ${o.s}`); R.banner = { s: `REWARD: ${o.s}`, t: 2, c: '#ffcd75' };
  R.pick = null; R.adAsk = null; $('#pickov').hidden = true; if (mode === 'run') { paused = false; last = performance.now(); }
  if (R.pickQ && R.pickQ.length) { R.pick = R.pickQ.shift(); R.adAsk = 'pick'; if (mode === 'run') paused = true; rpRender(); } return o; }
function rpClose() { const el = $('#pickov'); if (el) el.hidden = true; if (R && R.adAsk === 'pick') R.adAsk = null; if (R) { R.pick = null; R.pickQ = []; } }

/* FIELD EVENTS: a second, independent event layer (wave 2+, one at a time, every 38-58 s; the classic well / goblin / escort slot is untouched).
   Each has a ground ring in its own colour (dashes march while you are inside), an object, a progress bar and a HUD line + edge arrow 'F'. */
const FE = { from: 2, first: 40, every: [38, 58], life: 32,
  kinds: ['altar', 'cache', 'banner', 'obelisk', 'vein', 'chest'], from_: { altar: 2, cache: 3, banner: 4, obelisk: 2, vein: 2, chest: 3 },
  altar: { r: 20, need: 2, cost: 0.25, fury: 90, gold: w => 20 + 4 * w, c: '#b13e53', n: 'BLOOD ALTAR' },
  cache: { r: 22, drop: 1.6, need: 5, pack: w => 3 + Math.floor(w / 4), every: 1.8, c: '#ef7d57', n: 'SUPPLY DROP', hit: w => 12 + w },
  banner: { r: 40, need: 14, limit: 40, every: 4, pack: w => 3 + Math.floor(w / 4), c: '#ffcd75', n: 'HOLD THE LINE' },
  obelisk: { r: 22, need: 3, zaps: 3, gap: 0.8, range: 150, n_: 12, dmg: 4, stun: 1, c: '#41a6f6', n: 'STORM OBELISK' },
  vein: { r: 22, need: 6, every: 1.5, c: '#94b0c2', n: 'RICH VEIN' },
  chest: { r: 16, need: 1.5, good: 0.55, c: '#b55088', n: 'CURSED CHEST' } };
function feStart(k) { if (!R || R.raid || R.over || R.fe) return R && R.fe; const w = R.wave;
  k = k || pick(FE.kinds.filter(q => w >= FE.from_[q] && q !== R.feLast)); R.feLast = k; const C = FE[k], [x, y] = objRing18(rnd(90, 125));
  const f = R.fe = { k, x, y, r: C.r, t: FE.life, prog: 0, need: C.need, st: 0, inside: false, tier: 0, pend: k === 'cache' || k === 'banner' ? 1 : 0, sT: 0, n: 0 };
  if (k === 'cache') { f.st = -1; f.drop = C.drop; f.t = FE.life + C.drop; }
  if (k === 'banner') f.t = C.limit;
  R.feN = (R.feN || 0) + 1; sfx('event');
  const tip = { altar: 'BLEED 25% HP FOR FURY + GOLD', cache: 'REACH IT: PICK YOUR REWARD, THEN CRACK IT 5S', banner: 'REACH IT: PICK YOUR REWARD, THEN HOLD THE RING 14S', obelisk: 'CHARGE IT 3S: CHAIN LIGHTNING', vein: 'MINE IT 6S: RESOURCES (THE NOISE DRAWS FOES)', chest: 'OPEN IT: TREASURE... OR A CURSE' }[k];
  R.banner = { s: `${C.n}!`, t: 2.2, c: C.c }; R.bq.push({ s: tip, t: 2.2, c: '#94b0c2' }); return f; }
function feAsk(f, src) { if (f.inside && !f.asked) { f.asked = 1; rpPre(src, f.x, f.y, o => feArm(f, o)); } }   // 1.14.2 forced stakes pick on approach
function feArm(f, o) { if (R.fe !== f) return; f.tier = o.T; f.reward = o; f.pend = 0; f.prog = 0; f.st = 0; f.sT = 0; f.n = 0; f.t = f.k === 'banner' ? FE.banner.limit : FE.life; R.banner = { s: `${FE[f.k].n} T${o.T}: ${o.s}`, t: 2.2, c: MSN.col[o.T - 1] }; if (o.T >= RPS.greedT) R.bq.push({ s: 'GREED RING: NO REGEN INSIDE', t: 1.8, c: PAL[2] }); return f; }
function feEnd(s, c) { const f = R.fe; R.fe = null; R.feT = rnd(FE.every[0], FE.every[1]); if (s) R.banner = { s, t: 2, c: c || '#94b0c2' }; return f; }
function fePack(f, n, elite) { for (let i = 0; i < n; i++) { const a = Math.random() * TAU, d = rnd(95, 130); R.rq.push({ x: f.x + Math.cos(a) * d, y: f.y + Math.sin(a) * d * 0.75, t: 1, m: 1, type: raidType(), ev: 'fe', elite: !!elite }); } }
function feTierPack(f, base) { const T = f.tier || 1; fePack(f, Math.round(base * MSN.packX[T - 1])); if (T >= MSN.eliteD) fePack(f, T - 2, true); }
function feStep(dt) { if (!R || R.raid || R.over) return;
  if (!R.fe) { if (R.wave >= FE.from && !window.__phNoFe) { R.feT = (R.feT == null ? FE.first : R.feT) - dt; if (R.feT <= 0) feStart(); } return; }
  const f = R.fe, p = R.p, C = FE[f.k], w = R.wave; f.t -= dt; f.inside = Math.hypot(p.x - f.x, (p.y - f.y) / 0.7) < f.r;
  if (Math.random() < 0.25) R.PT.push({ x: f.x + rnd(-f.r, f.r) * 0.7, y: f.y + rnd(-f.r, f.r) * 0.4, vx: 0, vy: -14, t: 0.5, m: 0.5, c: C.c, s: 1 });
  if (f.k === 'altar') { if (f.inside) { f.prog += dt; if (f.prog >= f.need) { const d = Math.max(0, Math.min(p.hp - 1, p.hp * C.cost)); p.hp -= d; addText(p.x, p.y - 16, `-${Math.round(d)}`, PAL[2], true); grantBuff('fury', C.fury); goldDrop(f.x, f.y, C.gold(w), 6); burst(f.x, f.y - 6, PAL[2], 40, 70); R.flash = 0.12; sfx('nova'); R.feWon = (R.feWon || 0) + 1; (R.feLog = R.feLog || []).push('ALTAR'); return feEnd('BLOOD PAID: FURY 90S + GOLD', C.c); } } else f.prog = Math.max(0, f.prog - dt); }
  else if (f.k === 'cache') { if (f.st < 0) { f.drop -= dt; if (f.drop <= 0) { f.st = 0; addShake(4); burst(f.x, f.y, PAL[3], 24, 60); R.FX.push({ k: 'ring', x: f.x, y: f.y, r: C.r, t: 0.35, m: 0.35, c: PAL[3] }); sfx('nova'); if (Math.hypot(p.x - f.x, (p.y - f.y) / 0.7) < C.r && p.inv <= 0 && !p.dash) hurt(C.hit(w)); } return; }
    if (f.pend) { feAsk(f, 'SUPPLY DROP'); if (f.t <= 0) return feEnd('THE SUPPLY DROP IS LOOTED BY OTHERS'); return; } greedRing(f.tier, f.inside);
    if (f.inside) { if (!f.st) { f.st = 1; feTierPack(f, C.pack(w)); } f.prog += dt; f.sT -= dt; if (f.sT <= 0) { f.sT = C.every; if (f.n++ < 3) feTierPack(f, Math.ceil(C.pack(w) / 2)); } }
    if (f.prog >= f.need) { burst(f.x, f.y - 6, PAL[3], 40, 80); R.feWon = (R.feWon || 0) + 1; (R.feLog = R.feLog || []).push(`DROP T${f.tier}`); feEnd('', C.c); rpWin(f.reward, f.x, f.y, 'SUPPLY DROP', 'SUPPLY DROP CRACKED!'); return; }
    if (f.t <= 0) return feEnd('THE SUPPLY DROP IS LOOTED BY OTHERS: REWARD LOST'); }
  else if (f.k === 'banner') { if (f.pend) { feAsk(f, 'HOLD THE LINE'); if (f.t <= 0) return feEnd('THE BANNER IS TAKEN DOWN'); return; } greedRing(f.tier, f.inside);
    if (f.inside) { f.prog += dt; f.st = 1; } if (f.st) { f.sT -= dt; if (f.sT <= 0) { f.sT = C.every; feTierPack(f, C.pack(w)); } }
    if (f.prog >= f.need) { R.FX.push({ k: 'ring', x: f.x, y: f.y, r: C.r, t: 0.5, m: 0.5, c: C.c }); burst(f.x, f.y - 10, C.c, 50, 90); R.feWon = (R.feWon || 0) + 1; (R.feLog = R.feLog || []).push(`LINE T${f.tier}`); feEnd('', C.c); rpWin(f.reward, f.x, f.y, 'HOLD THE LINE', 'THE LINE HELD!'); return; }
    if (f.t <= 0) return feEnd('THE BANNER FALLS: REWARD LOST'); }
  else if (f.k === 'obelisk') { if (f.st === 0) { if (f.inside) f.prog += dt; else f.prog = Math.max(0, f.prog - dt * 0.5); if (f.prog >= f.need) { f.st = 1; f.n = 0; f.sT = 0; } }
    else { f.sT -= dt; if (f.sT <= 0) { f.sT = C.gap; f.n++; feZap(f); if (f.n >= C.zaps) { R.feWon = (R.feWon || 0) + 1; (R.feLog = R.feLog || []).push('OBELISK'); return feEnd('THE STORM IS SPENT', C.c); } } return; }
    if (f.t <= 0) return feEnd('THE OBELISK GOES DARK'); }
  else if (f.k === 'vein') { if (f.inside) { f.prog += dt; f.sT -= dt; if (f.sT <= 0) { f.sT = C.every; fePack(f, 1 + Math.floor(w / 10)); } if (Math.random() < 0.3) burst(f.x, f.y - 4, C.c, 2, 30); }
    if (f.prog >= f.need) { const got = {}; for (let i = 0; i < 4; i++) { const k = resRoll(w), v = resAmt(k, w) * 2; got[k] = (got[k] || 0) + v; resChip(f.x, f.y, k, v); } burst(f.x, f.y, '#94b0c2', 30, 60); R.feWon = (R.feWon || 0) + 1; (R.feLog = R.feLog || []).push('VEIN'); return feEnd(`VEIN MINED: ${resTxt(got).toUpperCase()}`, C.c); }
    if (f.t <= 0) return feEnd('THE VEIN CRUMBLES'); }
  else if (f.k === 'chest') { if (f.inside) { f.prog += dt; if (f.prog >= f.need) { (R.feLog = R.feLog || []).push('CHEST'); R.feWon = (R.feWon || 0) + 1;
      if (Math.random() < C.good) { goldDrop(f.x, f.y, 30 + 7 * w, 10); dropWeapon(f.x + 8, f.y, rollItem(w, { min: 2 }), false); burst(f.x, f.y - 6, '#ffcd75', 40, 70); return feEnd('TREASURE! GOLD + A RARE ITEM', '#ffcd75'); }
      applyHex('weak', 8, 'zone'); fePack(f, 2, true); goldDrop(f.x, f.y, 15 + 3 * w, 5); burst(f.x, f.y - 6, '#b55088', 40, 70); addShake(4); sfx('boss'); return feEnd('CURSED! WEAKENED + ELITES', PAL[2]); } } else f.prog = Math.max(0, f.prog - dt);
    if (f.t <= 0) return feEnd('THE CHEST SINKS AWAY'); }
  if (f.k === 'altar' && f.t <= 0) return feEnd('THE ALTAR CRUMBLES');
}
function feZap(f) { const C = FE.obelisk; let n = 0; const tg = R.E.filter(e => !e.inst && e.hp > 0 && Math.hypot(e.x - f.x, e.y - f.y) < C.range).sort((a, b) => Math.hypot(a.x - f.x, a.y - f.y) - Math.hypot(b.x - f.x, b.y - f.y)).slice(0, C.n_);
  let px = f.x, py = f.y - 20; for (const e of tg) { R.FX.push({ k: 'zapl', x1: px, y1: py, x2: e.x, y2: e.y - 4, t: 0.25, m: 0.25 }); px = e.x; py = e.y - 4; e.frozen = Math.max(e.frozen || 0, e.boss || e.mini ? 0.3 : C.stun); hit(e, R.S.baseDmg * C.dmg, { proc: false, col: PAL[10] }); n++; }
  burst(f.x, f.y - 20, PAL[10], 20, 60); R.flash = 0.08; sfx('zap'); return n; }
function drawFe(X, Y, now) { const f = R.fe; if (!f) return; const C = FE[f.k], x = X(f.x), y = Y(f.y), c = C.c, fr = (a, b, w, h, col) => { ctx.fillStyle = col; ctx.fillRect(Math.round(x + a), Math.round(y + b), w, h); };
  if (f.k === 'cache' && f.st < 0) { const k = 1 - f.drop / C.drop; fireTele(x, y, C.r * (0.4 + 0.6 * k), 0.7, k, now); dangerMark(x, y - 2, PAL[3], 1, now); fr(-4, -10 - (1 - k) * 60, 8, 7, '#0b0b14'); fr(-3, -9 - (1 - k) * 60, 6, 5, WOOD2); return; }
  ctx.strokeStyle = '#0b0b14'; ctx.lineWidth = 3; ctx.globalAlpha = 0.6; ctx.beginPath(); ctx.ellipse(x, y, f.r, f.r * 0.7, 0, 0, TAU); ctx.stroke();
  ctx.strokeStyle = c; ctx.lineWidth = 1; ctx.globalAlpha = f.inside ? 0.95 : 0.45 + 0.2 * Math.sin(now / 160); if (f.inside) { ctx.setLineDash([3, 2]); ctx.lineDashOffset = -now / 50; } ctx.beginPath(); ctx.ellipse(x, y, f.r, f.r * 0.7, 0, 0, TAU); ctx.stroke(); ctx.setLineDash([]); ctx.globalAlpha = 1;
  const hv = Math.round(Math.sin(now / 250));
  if (f.k === 'altar') { fr(-7, -8, 14, 9, '#0b0b14'); fr(-6, -7, 12, 7, '#566c86'); fr(-6, -7, 12, 1, '#94b0c2'); fr(-4, -10 + hv, 8, 3, PAL[2]); if (Math.floor(now / 200) % 3 === 0) fr(-1, -4, 2, 3 + hv, PAL[2]); }
  else if (f.k === 'cache') { fr(-6, -9, 12, 10, '#0b0b14'); fr(-5, -8, 10, 8, WOOD2); fr(-5, -5, 10, 1, '#0b0b14'); fr(-1, -8, 2, 8, '#ffcd75'); fr(-8, -14 + hv, 2, 6, '#f4f4f4'); fr(-6, -14 + hv, 4, 2, PAL[3]); }
  else if (f.k === 'banner') { fr(-1, -26, 2, 26, '#0b0b14'); fr(0, -25, 1, 25, WOOD2); const wv = Math.floor(now / 180) % 2; fr(1, -25, 10, 7, '#0b0b14'); fr(1, -24, 9 + wv, 5, c); fr(3, -23, 3, 3, PAL[2]); }
  else if (f.k === 'obelisk') { fr(-4, -24, 8, 25, '#0b0b14'); fr(-3, -23, 6, 23, '#333c57'); fr(-3, -23, 1, 23, '#566c86'); const lit = f.st ? 1 : f.prog / f.need; for (let i = 0; i < 4; i++) fr(-1, -20 + i * 5, 2, 2, i < lit * 4 ? (Math.floor(now / 90) % 2 ? PAL[11] : PAL[10]) : '#29366f'); fr(-2, -28 + hv, 4, 4, PAL[10]); }
  else if (f.k === 'vein') { fr(-8, -6, 16, 7, '#0b0b14'); fr(-7, -5, 14, 5, '#566c86'); fr(-4, -9, 8, 4, '#0b0b14'); fr(-3, -8, 6, 3, '#566c86'); const sp = Math.floor(now / 160) % 4; fr(-5 + sp * 2, -4, 2, 2, '#73eff7'); fr(2, -7, 1, 1, '#ffcd75'); fr(-2, -3, 1, 1, PAL[3]); }
  else if (f.k === 'chest') { fr(-6, -8, 12, 9, '#0b0b14'); fr(-5, -7, 10, 7, '#5d275d'); fr(-5, -7, 10, 2, c); fr(-1, -5, 2, 3, '#ffcd75'); if (Math.floor(now / 300) % 2) text(ctx, '?', x, y - 18 + hv, c, 1, 'c'); }
  if (f.tier >= RPS.greedT) drawGreed(x, y, f.r, now);
  if (f.k !== 'obelisk' || !f.st) { const k = Math.min(1, f.prog / f.need); fr(-11, -34, 22, 3, '#0b0b14'); fr(-10, -33, Math.ceil(20 * k), 1, c); }
  text(ctx, f.tier ? `${C.n} T${f.tier}` : C.n, x, y + f.r * 0.7 + 3, c, 1, 'c'); }
function feLine() { const f = R.fe; if (!f) return ''; const C = FE[f.k], s = Math.max(0, Math.ceil(f.t)), pr = `${f.prog.toFixed(1)}/${f.need}S`;
  if (f.pend && f.st >= 0) return `${C.n}: REACH IT TO PICK YOUR STAKES  ${s}S`;
  return f.k === 'cache' ? (f.st < 0 ? 'SUPPLY DROP INCOMING - STAND CLEAR' : `SUPPLY DROP T${f.tier} (X${MSN.rewX[f.tier - 1]}) ${pr}  ${s}`) : f.k === 'banner' ? `HOLD THE LINE T${f.tier} (X${MSN.rewX[f.tier - 1]}) ${pr}  ${s}` : f.k === 'obelisk' && f.st ? 'STORM OBELISK: DISCHARGING' : `${C.n} ${pr}  ${s}`; }
function drawZapFx(fx, X, Y) { const a = fx.t / fx.m, x1 = X(fx.x1), y1 = Y(fx.y1), x2 = X(fx.x2), y2 = Y(fx.y2); ctx.strokeStyle = a > 0.5 ? '#f4f4f4' : PAL[10]; ctx.lineWidth = 1; ctx.beginPath(); ctx.moveTo(x1, y1);
  for (let i = 1; i < 4; i++) ctx.lineTo(x1 + (x2 - x1) * i / 4 + rnd(-4, 4), y1 + (y2 - y1) * i / 4 + rnd(-4, 4)); ctx.lineTo(x2, y2); ctx.stroke(); }
/* 1.17.0 read-only encyclopedia. No combat/save mutations. Formula literals are pinned by smoke1170. */
const guideEsc = s => String(s).replace(/[&<>"']/g, c => ({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]));
const guidePct = n => +(n * 100).toFixed(3);
function guideEntries() {
  const E = [], add = (id, section, name, effect, scaling, example) => E.push({id, section, name, effect, scaling, example});
  const st = (name, effect, scaling, example) => add('stat-' + name, 'Stats', name, effect, scaling, example);
  st('HP', 'Your health; reaching zero uses a revive if available, otherwise you fall.', 'Max HP = 100 + 12 × Vitality rank + armour HP implicits + Sturdy + hero HP. Bulwark adds 40; Ouroboros subtracts 20; Ashen 2pc adds 40. Healing cannot exceed max HP. NO REGEN blocks heals (not revives).', 'Vitality rank 2 alone raises 100 HP to 124.');
  st('DAMAGE / HIT', 'Weapon damage before critical hits and target-specific modifiers. Abilities also use this number.', 'Weapon base damage × item power × (1 + 0.08 × Might rank + total damage affix / 100). Glass Sun then ×1.6; Gravewarden 2pc ×1.15 for axes. Elite, execute, afflicted, frozen and target defenses are applied later in hit().', 'A 10-damage base at power 2 with Might rank 1 gives 21.6 before other modifiers.');
  st('ATTACKS / S', 'How often the automatic weapon pattern fires, not the number of individual projectiles.', 'Base rate × (1 + 0.07 × Haste rank + (Swift + attack-speed implicits)/100 + Fury bonus + Huntsman bonus). Roll multiplies this by 1.6; Momentum by (1 + 0.1 × rank) for 3s; Tailwind by 1.15 while moving. These temporary multipliers are not in the sheet rate.', 'A base rate of 2 with Haste 1 fires 2.14 patterns/s before temporary multipliers.');
  st('DPS (est.)', 'A comparison heuristic, NOT a measured damage meter or a promise against one target.', 'dpsEst multiplies damage, rate, base pattern count + bonus projectiles, expected crit and per-weapon cleave/pierce weighting, then estimated fork, ricochet, burn, chain, elite, execute and stun value. It omits positioning, misses, many unique effects, poison and target defenses.', 'Two weapons with equal single-hit damage can show different estimates because their patterns differ.');
  st('CRIT CHANCE', 'Chance for an eligible hit to deal critical damage. A roll above 100% is still only one crit.', '5% + 4 percentage points × Executioner rank + gear crit / 100 + Eagle Eye. Deadeye and Huntsman add chance beyond 60% of range; Heartseeker forces crit above 80% target HP. noCrit hits cannot crit.', '5% base + Executioner rank 2 = 13% before gear.');
  st('CRIT DAMAGE', 'Multiplier on a critical hit, not an extra additive damage roll.', '2 + 0.1 × Executioner rank. Other hit modifiers still apply. Splinter uses the resulting crit damage as its splash input.', 'At rank 2, a 10-damage eligible crit becomes 22 before target modifiers.');
  st('PROJECTILES', 'Bonus projectiles / swings above the weapon’s own pattern.', `Sum of Twin affixes; MULTI-SHOT adds 2; Twin Moons adds 1. Base counts: ${Object.entries(BASES).map(([k,b]) => k + ' ' + b.n0).join(', ')}. Axes widen the cone and add follow-up chops; flail follow-up spins hit at ${guidePct(FLAIL2.twin)}% damage.`, 'A base bow pattern plus 1 Twin fires one more arrow; this is not a second ability slot.');
  st('RANGE', 'Auto-target range; melee range also grows with area.', 'Base range × Area (melee only) × hero range multiplier × (1 + Far-Reaching / 100). Eagle Eye gives ×1.25. Projectile travel lifetime is separately defined, so sheet range is not a guarantee of travel distance.', '100 base range with Eagle Eye and 20% reach becomes 150.');
  st('AREA', 'A size multiplier, not square-area math and not a universal ability radius multiplier.', '1 + total Vast / 100. It scales melee reach, several weapon splash sizes and some unique rings; projectile collision radii use its square root. The big-ability radius multiplier instead comes from Frostbinder and hero nodes.', '50% Vast gives ×1.5 melee reach; it does not make Nova radius ×1.5.');
  st('MOVE SPEED', 'Movement multiplier before terrain, debuffs and conditional boosts.', ' (1 + 0.06 × Fleetfoot rank + (move implicits + Fleet)/100) × hero move. Huntsman 2pc multiplies by 1.1. Low-health Last Gasp, ice, SLOWED and artillery slow apply in movement separately.', 'Fleetfoot 1 alone makes the sheet show 106%.');
  st('PICKUP', 'Radius for collecting gems and coins.', '24 × (1 + 0.2 × Fleetfoot rank + pickup implicit/100 + Drifter 0.2); Lodestone multiplies by 2.5. Gale Pull periodically magnetises visible gems and coins.', 'Drifter alone gives 28.8px pickup radius.');
  st('COOLDOWNS', 'Ability cooldown multiplier: lower is better. The cooldown is assigned after a successful cast.', '(1 − 0.08 × Arcana rank) × (1 − cooldown implicits/100); Ouroboros ×0.85; Twin Moons ×1.2. No global minimum clamp. Echo subtracts seconds per eligible hit; Wayfarer gems and Phoenix can cut quick cooldown.', 'Arcana 2 alone makes a 5s Dash cooldown 4.2s.');
  st('ARMOR (DR)', 'Flat damage reduction, not an armour-versus-level formula.', 'Gear DR implicits + Bulwark; base capped at 60% (Ashen 2pc adds 8 points within that cap). Conditional Ward 40%, Heat Shield 25%, Iron Will, Bastion, Aegis and escort ward add up to a final 75% cap. Raid mechanic damage via rHurt halves effective DR (not every raid damage path). Fragile and Glass Sun multiply damage after DR. Poison uses a separate formula.', '20% DR turns a normal 100 hit into 80, before Fragile or other multipliers.');
  st('POISON RESIST', 'Reduces poison ticks on you, not enemy poison duration or the number of stacks.', `Antidote affixes + poison-resist implicits, capped at ${guidePct(0.75)}%. Tick = stacks × stored DPS/stack × ${POI.tick}s × (1 − resist) × (1 − min(0.75, base DR) × ${POI.drX}), then Fragile and raid rematch damage.`, '50% poison resist halves the tick before other factors.');
  st('HEX WARD', 'The sheet label means WARDED projectile damage reduction. It does NOT prevent hex statuses.', 'Sum Warded affixes, capped at 50%, applied to enemy projectile damage before hurt(). Status bolts can still apply their status. This is separate from Bone Ward and gold enemy shells.', '30% Warded turns a 10-damage projectile into 7 before normal DR.');
  st('LIFE STEAL', 'Heals a fraction of damage from proc-enabled hits only.', 'Sum Leech / 100; VAMPIRIC adds 0.05. NO REGEN sets healing to zero; Wardens apply their leech resistance. Healing caps at max HP. Burn/chain/other proc:false hits do not leech.', 'A 100-damage eligible hit with 5% leech heals 5 HP on a normal foe.');
  st('THORNS', 'Retaliation damage to melee attackers; sheet value is weapon-damage multiples.', 'Thorns affixes / 100 + 0.5 × Bone Knight Thorns rank; Ashen 3pc adds 1.5. Uses current base weapon damage and hit modifiers. Spiked Ward and Thornheart are separate reactions.', 'A sheet value of 1.5 means 150% weapon damage, not 1.5%.');
  st('BURN ON HIT', 'Chance to ignite on a proc-enabled hit.', 'Embers + Kindling chances, multiplied by (1 + 0.2 × Catalyst rank). Secondary projectiles multiply this chance by ' + SEC.procX + '. A normal proc stores 40% of that hit as burn DPS, multiplied by burnX; see Ignite.', '20% chance with Catalyst 1 becomes 24%, not 40%.');
  st('CHAIN LIGHTNING', 'Chance for a proc-enabled hit to jump to nearby foes.', 'Storms + Stormcaller 2pc, then Catalyst multiplier. Chain checks do NOT use the secondary-projectile chance multiplier. Up to 3 new foes within 60px per hop; each receives 60% input hit damage via noncrit, proc:false hits (other hit modifiers still apply).', 'A 100-damage hit supplies 60 damage to each chain hop before target modifiers.');
  st('FROST', 'Chance to chill on proc-enabled hits.', 'Frost + Rimebound 2pc, then Catalyst multiplier; secondary hits ×' + SEC.procX + ' chance. Chill timer is set to 2s. No stacks; normal movement ×0.55 while chilled (some rushes ×0.7). See Frozen for movement lock.', '20% Frost and Catalyst 2 gives 28% chance.');
  st('ELITE DAMAGE', 'Bonus damage against priority targets, not normal trash.', 'Slayer’s /100 + 0.08 × Marksman rank; hit multiplier (1 + bonus) on elite, boss, mini-boss and raidBoss flags. No timed stacks or cooldown.', '30% elite damage turns 100 into 130 against an elite before other modifiers.');
  st('EXECUTE', 'Extra damage below a threshold, not an instant-kill chance.', 'Sum Execution /100. Applies when target HP is strictly below 30% max HP; damage × (1 + bonus).', '50% Execute changes a 100 hit to 150 on a foe at 29% HP.');
  st('STUN', 'Chance to stop eligible enemies with the frozen timer.', 'Thunder chance; secondary hits ×' + SEC.procX + '. On proc, timer becomes at least 0.4s. Excludes bosses, raid bosses and installations. No stacking duration addition.', 'A foe with 0.1s remaining gets 0.4s, not 0.5s.');
  st('POISON ON HIT', 'Chance to envenom a living foe; Blight Darts also apply it intrinsically.', `Sum Venom /100, secondary chance ×${SEC.procX}; Catalyst does not multiply Venom. Each application adds one stack up to ${VEN.max}, refreshes ${VEN.dur}s and keeps the highest weapon-damage reference. Secondary darts add two stacks.`, 'Two dart hits give 2 stacks, not 2 independent poison timers.');
  st('FORK CHANCE', 'Primary projectile hits may create shards; melee cannot fork.', `${FORK.n} shards at ${guidePct(FORK.mul)}% projectile damage; life ${FORK.life}s. Only generation 0 forks. Secondary status chance ×${SEC.procX} for burn/frost/stun/venom, NOT chain. Hydra forces chance to 100%.`, 'A 100-damage projectile creates 55-damage shards before hit modifiers.');
  st('RICOCHET CHANCE', 'Projectile redirects toward a new unhit foe; melee cannot ricochet.', `Up to ${RICO.max} bounces, nearest unhit foe within ${RICO.r}px. Each bounce ×${RICO.mul} damage; Gallows instead ×1.15 and forces chance to 100%. Secondary status rolls as for Fork.`, '100 damage becomes 75 after one normal bounce, 56.25 after two.');
  const act = {
    dash: ['Invulnerable movement with contact damage and an end shockwave.', '400px/s for 0.16 × (1 + 0.2 × Long Stride rank)s; invulnerable 0.45s. Contact: 2.5 × weapon damage × quick-damage multiplier. End: 1 × weapon damage × quick multiplier; radius 26 × (1 + 0.15 × Long Stride). Rime Step freezes landing foes 0.8s (bosses 0.3s).', 'At 10 weapon damage with no ranks, contact input is 25 and landing input is 10.'],
    nova: ['Instant frost blast; freezes and removes enemy projectiles in range.', 'Radius 64 × (1 + 0.15 × Frostbinder rank). Damage input 3 × weapon damage. Freeze 1.4 + 0.3 × Frostbinder + 0.3 × Deep Freeze rank seconds; bosses get half. Aftershock repeats after 0.6s at 70% size and 50% damage.', '10 weapon damage supplies 30 blast damage before crit and target modifiers.'],
    meteor: ['Delayed impact on the nearest target area; ignites survivors.', 'Delay 0.45s; radius 34 × big-radius multiplier × (1 + 0.15 × Big Rock rank). Input damage 4 × weapon damage × quick multiplier × (1 + 0.1 × Big Rock). Burn DPS = weapon damage × 0.6 × burnX for 3s. Shower follow-ups use 50% impact damage.', '10 weapon damage without ranks supplies 40 impact damage.'],
    inferno: ['Fire aura around you; repeatedly hits and ignites.', 'Lasts 4 + Firewalk rank seconds. Radius 50 × big-radius multiplier × (1 + 0.08 × Firewalk). Every 0.25s input damage = 0.7 × weapon damage (can crit, no on-hit procs); burn = 0.4 × weapon damage × burnX DPS for 2s. Heat Shield adds 25% DR within the cap and destroys shots in the aura.', '10 weapon damage supplies 7 damage per aura hit before crit and target modifiers.'],
    roll: ['Invulnerable evasive movement with an attack-speed window.', '430px/s for 0.22s; invulnerability 0.5 + 0.25 × Vanish rank seconds. Attack speed ×1.6 for 2.5 + Quickdraw rank seconds. No direct roll damage. Caltrops scale with weapon damage.', 'Quickdraw rank 2 makes the speed window 4.5s.'],
    rain: ['Random small arrow impacts over a target area; chills those actually hit.', 'Duration 2 + 0.5 × Volley rank seconds; radius 44 × big-radius multiplier × (1 + 0.1 × Volley). Impact every 0.07s at a random point, hit radius 11px + enemy radius, damage input 1.1 × weapon damage (can crit, no procs), chill at least 1s. Pinning Rain freezes non-bosses at least 0.35s; not every arrow hits every foe.', '10 weapon damage supplies 11 damage per arrow that connects, not guaranteed area-wide DPS.'],
    charge: ['Invulnerable rush, contact damage, stun and landing shockwave.', '330px/s for 0.3s; invulnerable 0.5s. Contact input 3 × weapon damage × quick multiplier × (1 + 0.15 × Battering Ram). Freeze at least 0.8 + 0.25 × Ram rank seconds (bosses 0.3 + 0.25 × Ram rank seconds). Landing input 1.2 × weapon damage × quick multiplier, radius 32 × (1 + 0.3 × Quake). Quake chills 2s; Rally heals per contact up to 5 foes.', '10 weapon damage without ranks supplies 30 contact damage and 12 landing damage.'],
    ward: ['Orbiting shields hit enemies, destroy shots and reduce damage taken.', '4 + Bone Wall rank shields for 5 + Bone Wall rank seconds; +40% DR inside the 75% total cap. Each enemy can be hit once per 0.4s, input 1 × weapon damage. Spiked Ward retaliates; Bonestorm fires the shields outward when it ends.', 'Bone Wall rank 2 gives 6 shields for 7s.']
  };
  for (const [hid,H] of Object.entries(HEROES)) {
    for (const a of [H.a1,H.a2]) { const d = act[a.id]; add('ability-'+a.id,'Abilities',H.name+' · '+a.name,d[0],d[1]+` Base cooldown ${a.cd}s × COOLDOWNS; no resource cost. ${a === H.a1 ? 'Quick ability also sheds max(' + POI.shed + ', ceil(stacks × ' + POI.shedPct + ')) poison stacks and triggers Momentum.' : ''} Damage examples exclude crit and target modifiers.`,d[2]); }
    add('passive-'+hid,'Abilities',H.name+' · '+H.pas.name,H.pas.d,'Always active only while this hero leads; no cooldown or rank. Hero-tree and gear modifiers combine as described in Stats.',hid === 'wanderer' ? 'Base 24px pickup becomes '+ +(24*(1+H.p.pick)).toFixed(3)+'px.' : hid === 'pyro' ? 'Kindling multiplies an otherwise 10 DPS ignite to 15 DPS before Hot Coals.' : hid === 'ranger' ? '100 base range becomes 125 before Reach.' : '100 starting HP becomes 140 before gear.');
  }
  const skillExtra = {
    nova:'Big-radius multiplier also affects Meteor. Quick damage multiplier is 1 + 0.25 × rank; Roll has no direct damage.',
    catal:'Only ignite, chill and chain chance are multiplied. Does not scale stun, venom, fork or ricochet.',
    scav:'Normal kill drop chance = 0.02 × (1 + 0.25 × rank); guaranteed boss / elite / mini drops are separate. Rare chance = 0.06 + 0.05 × tier + 0.04 × rank; Magic band = 0.42 + 0.06 × tier + 0.06 × rank (tier index 0–4).',
    splinter:'Uses 0.15 × rank of the crit’s resulting damage as input to new noncrit, proc:false hits; target modifiers run again. Up to 3 neighbours within 20px + radius.',
    w_echo:'Input weapon damage × rank × quick-damage multiplier; 24px radius; delay 0.5s.',
    w_glacier:'Radius 40 × big-radius multiplier; 3s field, ticks every 0.5s; chill at least 1s. Noncrit, no procs.',
    p_crater:'Radius 70% of main meteor; first tick after 0.25s then every 0.5s. Also applies a 2s ignite at 0.3 × weapon damage × burnX DPS. Noncrit, no procs.',
    p_wild:'Ordinary enemy kill flow only (not installations, Wardens or raid bosses); only spreads to foes not already burning. Spread DPS = weapon damage × 0.25 × (1 + rank) × burnX for 2s; radius 16 + 8 × rank.',
    p_phoenix:'A burning ordinary enemy kill cuts Meteor cooldown 0.15s, floored at zero. Installations, Wardens and raid bosses use early-return kill handlers and do not trigger this cut.',
    p_nova:'Radius same as Inferno; ignite DPS = weapon damage × 0.5 × burnX for 3s. Blast can crit and proc.',
    r_calt:'18px radius; chill at least 0.6s per hit; first tick immediately then every 0.3s. Noncrit, no procs.',
    k_rally:'Heals 0.03 × rank × max HP per rush contact, up to 5 foes; blocked by NO REGEN.',
    k_spike:'On hurt() during Ward hits the nearest foe within 26px for 2 × weapon damage; this is not guaranteed to be the original attacker.',
    k_storm:'Fires 4 + Bone Wall rank projectiles outward, each at weapon damage × Bonestorm rank, pierce 2, life 0.8s.',
    blood:'Per-kill healing is blocked by NO REGEN; Gravewarden 2pc adds 0.6 HP.',
    w_siphon:'Per XP gem collected, blocked by NO REGEN.',
    k_iron:'Applies strictly below 50% HP, inside total 75% DR cap.',
    k_bast:'Applies after standing still 0.6s, inside total 75% DR cap.'
  };
  for (const [who,T] of [['Shared',SKILLS],...Object.entries(HTREE).map(([h,t])=>[HEROES[h].name,t])]) for (const s of T) {
    add('skill-'+s.id,'Abilities',who+' · '+s.name,skillExtra[s.id] || s.per,`Source: ${who} skill rank (one shared point pool). Rank cap ${s.max}. `+ Array.from({length:s.max},(_,i)=>`Rank ${i+1}: ${s.d(i+1)}.`).join(' ')+' '+(skillExtra[s.id] || '')+' Passive node or modifier to the named ability; no separate cast button/cooldown. Damage uses current weapon damage before hit modifiers unless stated otherwise.',`At rank 1: ${s.d(1)}. No other bonuses assumed.`);
  }
  const hxCommon = `Cap ${HXS.max} stacks. Re-hit adds a stack and refreshes to the longer remaining/application time. Orb application ${HEX.orb.dur}s; bolt ${HEX.bolt.dur}s; cloud refresh ${HEX.zone.linger}s and adds a stack every ${HXS.zoneEvery}s. Timer expiry drops one stack, then lasts another ${HXS.step}s until cleared. Not saved between runs.`;
  add('status-slow','Status effects','SLOWED','Reduces your movement.',`Movement × max(${HXS.slowMin}, ${HEX.slowX} − ${HXS.slowPer} × (stacks − 1)). `+hxCommon,`At 1 stack move ×${HEX.slowX}; at ${HXS.max} stacks ×${+Math.max(HXS.slowMin,HEX.slowX-HXS.slowPer*(HXS.max-1)).toFixed(3)}.`);
  add('status-weak','Status effects','WEAKENED','Reduces outgoing damage through hit().',`Damage × max(${HXS.weakMin}, ${HEX.weakX} − ${HXS.weakPer} × (stacks − 1)). `+hxCommon,`At 1 stack a 100 input becomes ${100*HEX.weakX} before other modifiers.`);
  add('status-fragile','Status effects','FRAGILE','Increases damage taken after normal DR; also affects poison ticks.',`Damage × (1 + ${+(HEX.fragX-1).toFixed(2)} × stacks). `+hxCommon,`At ${HXS.max} stacks damage ×${+(1+(HEX.fragX-1)*HXS.max).toFixed(2)}.`);
  add('status-noregen','Status effects','NO REGEN / Rot','Blocks all ordinary healing, life steal included. Multiple stacks also rot health.',`From 2 stacks, rot = max HP × ${HXS.rot} × (stacks − 1) per second in ${HXS.rotTick}s ticks; ignores DR, never below 1 HP. Revives still work. `+hxCommon,'At 100 max HP and 3 stacks, rot drains 2 HP/s before the 1 HP floor.');
  add('status-poison','Status effects','POISONED (you)','Stacks from adders, spitters, blightcaps and poison pools. Does not kill on its own.',`Cap ${POI.max}. Stored DPS/stack = highest active application reference × ${POI.per}; new hits refresh ${POI.hold}s hold. Then lose ${POI.decayN(24)}/${POI.decayN(12)}/${POI.decayN(1)} stacks per ${POI.decay}s at >16 / >8 / otherwise. Ticks every ${POI.tick}s; resist and half base DR reduce ticks; Fragile and rematch damage multiply them. Floor ${POI.floor} HP. Any successful quick ability sheds max(${POI.shed}, ceil(stacks × ${POI.shedPct})).`,'24 stacks: a quick ability sheds 6, leaving 18. With no defenses, reference 20 gives 1 DPS/stack.');
  add('status-venom','Status effects','Envenomed (foe poison)', 'Blight Darts and Venom apply stacking damage to living enemies, not installations.',`Cap ${VEN.max}; each hit refreshes ${VEN.dur}s; highest weapon damage reference retained. Tick input = reference × ${VEN.per} × stacks × ${VEN.tick} every ${VEN.tick}s. Noncrit and no procs; hit() still applies target and WEAKENED modifiers.`,'10 weapon damage with 2 stacks supplies 2.5 damage per 0.5s tick before modifiers.');
  add('status-burn','Status effects','Ignite / Burning','A single burn object on a foe, NOT additive independent stacks.', 'Normal proc: 40% of hit damage × burnX DPS for 3s, ticking every 0.5s. A later ignite replaces the old one (even if weaker). Kindling ×1.5 and Hot Coals ×(1 + 0.15 × rank) scale burnX. Meteor, Inferno, craters, uniques and Wildfire use their own coefficients/durations. Ticks do not crit or proc, but hit() modifiers run again.', 'An unmodified normal 100-damage hit stores 40 DPS, supplying 20 per tick.');
  add('status-chill','Status effects','Chilled / Frozen / Stunned','Chill slows enemies; frozen/stunned enemies stop moving and acting.', 'Chill normal movement ×0.55 (some rushes ×0.7). Frozen movement is zero; stun uses the same timer. Timers count down, not independent stacks. Normal Frost sets chill to 2s; abilities often take the max of current and new duration. Nova gives bosses half freeze; the update loop caps raid-boss freeze at 0.25s. Thunder excludes bosses, raid bosses and installations.', 'Two Frost procs refresh 2s rather than adding up to 4s.');
  add('status-inv','Status effects','Invulnerable','Most enemy collision/projectile/hazard checks skip you while the invulnerability timer is positive.', 'Dash/roll/charge and revives grant timed invulnerability; taking damage grants at least 0.12s. It is not a universal poison/rot cleanse: poison and rot use their own tick paths. No stack count; grants set or extend the timer depending on source.', 'Dash gives 0.45s invulnerability, but does not remove a hex.');
  add('status-shell','Status effects','Enemy gold shell / EXPOSED','Gold shell blocks hit() damage and knockback; kite it rather than attacking through it.', `Shell lasts ${SHELL.dur}s. After it breaks, hit damage ×${SHELL.exposedX} for ${SHELL.exposed}s. Separate from raid immunity, raid OPEN windows, Warded affixes and Bone Ward.`, `A 100 hit while exposed supplies ${100*SHELL.exposedX} damage before other modifiers.`);
  add('status-sunder','Status effects','Raid SUNDER','A raid mechanic hit makes the next mechanic hit harder.', `After a mechanic hits, SUNDER lasts ${RAID7.sunderT}s. Further rHurt mechanic damage while active is multiplied by ${RAID7.sunderX}; it refreshes the timer. Separate from FRAGILE; no stack count. The boss follows up after ${RAID7.punish}s.`, `A mechanic with 100 pre-defense input becomes ${100*RAID7.sunderX} while sundered.`);
  add('status-open','Status effects','Raid OPEN / shield vulnerability','A boss recovery window rewards hitting it after a cast.', `Raid OPEN lasts ${RAID7.openT}s after an unshielded cast finishes and multiplies hit damage by ${RAID7.openX}. A separate raid shield-break vulnerability lasts ${RAID.vulnT}s at ×${RAID.vulnX}; immunity/phase-shift blocks hit damage entirely. These are separate flags, not stacking counters.`, `A 100 input hit against an OPEN boss supplies ${100*RAID7.openX} before other modifiers.`);
  add('status-artillery','Status effects','Artillery ground effects','Artillery ground can slow you, block heals, drain HP or make you take more damage; WEAK ground is not the outgoing-damage WEAKENED hex.', 'While artSlow timer is active, movement ×0.55; while artWeak is active, hurt() damage taken ×1.35 after DR and FRAGILE. Inside a patch, SLOW refreshes to 0.45s, NO REGEN and WEAK to 0.6s. Patch life = 2.2 + 0.3 × outpost tier seconds. Damage ground drains (4 + tier) HP/s directly, ignoring DR but never below 1 HP; invulnerability/dashing avoids that drain. No additive stack counter. Step out of the marked ground.', 'A normal 100 post-DR hit becomes 135 with artillery WEAK ground before any additional factors.');
  for (const [id,b] of Object.entries(BUFFS)) add('buff-'+id,'Status effects',b.name,b.d,`Source: event reward / run boon. One timer per kind; repeated grants add duration, not effect strength; temporary rewards use the awarded duration, RUN boons last the run. ${id==='multi'?'Adds 2 bonus projectiles / swings.':id==='leech'?'Adds 5 percentage points life steal.':id==='fury'?'Adds 20 percentage points attack speed.':id==='aegis'?'Adds '+guidePct(RUN9.aegis)+' points DR inside the 75% cap.':id==='slow'?'Nearby enemies move ×0.5 within 60px (except goblins).':id==='freeze'?'Periodic 6s pulse freezes nearby enemies within 70px for 1.2s (bosses 0.5s), plus 1 × weapon damage.':''}`,`One ${b.name} icon means one active timer, not two additive copies.`);
  if (ON18) guide18(add);   // 1.18.0 THREATS + BURNING / FROZEN
  return E;
}
let guideOpen = false, guideFrom = null, guideFocus = null, guideSection = 'Stats';
function renderGuide(target) {
  const q = $('#guideSearch').value.trim().toLowerCase(), all = guideEntries();
  const entries = all.filter(e => q ? [e.name,e.effect,e.scaling,e.example,e.section].join(' ').toLowerCase().includes(q) : e.section === guideSection);
  $('#guideCount').textContent = `${entries.length} ${entries.length === 1 ? 'entry' : 'entries'}${q ? ' · all sections' : ''}`;
  $('#guideTabs').querySelectorAll('[data-section]').forEach(b => { b.classList.toggle('on', !q && b.dataset.section === guideSection); b.setAttribute('aria-pressed', String(!q && b.dataset.section === guideSection)); });
  $('#guideBody').innerHTML = entries.length ? entries.map(e => `<article class="guideEntry" id="guide-${guideEsc(e.id)}" tabindex="-1"><div class="tiny gold">${e.section}</div><h3>${guideEsc(e.name)}</h3><p>${guideEsc(e.effect)}</p><p><b>Scaling / rules:</b> ${guideEsc(e.scaling)}</p><p class="guideExample"><b>Example:</b> ${guideEsc(e.example)}</p></article>`).join('') : '<p id="guideEmpty" role="status">No entries found. Try damage, poison or Nova.</p>';
  $('#guideBody').scrollTop = 0;
  if (target) { const entry = document.getElementById('guide-'+target); if (entry) { entry.scrollIntoView({block:'start'}); entry.focus({preventScroll:true}); } }
}
function openGuide(id) {
  if (guideOpen || (mode === 'run' && (!paused || bagOpen || mkOpen || R.over))) return false;
  guideFrom = !$('#charov').hidden ? $('#charov') : [...document.querySelectorAll('.screen')].find(e => !e.hidden);
  if (!guideFrom) return false;
  guideFocus = document.activeElement; guideFrom.hidden = true; guideOpen = true;
  const entry = id && guideEntries().find(e=>e.id===id); guideSection = entry ? entry.section : 'Stats'; $('#guideSearch').value = '';
  $('#guide').hidden = false; renderGuide(entry && entry.id); if (!entry) $('#guideClose').focus(); return true;
}
function closeGuide() {
  if (!guideOpen) return false; guideOpen = false; $('#guide').hidden = true;
  if (guideFrom) guideFrom.hidden = false; if (guideFocus && guideFocus.isConnected) guideFocus.focus({preventScroll:true}); guideFrom = null; return true;
}
$('#bGuide').onclick = $('#bGuideP').onclick = () => openGuide();
$('#guideClose').onclick = closeGuide; $('#guideSearch').oninput = () => renderGuide();
$('#guideTabs').querySelectorAll('[data-section]').forEach(b => b.onclick = () => { guideSection = b.dataset.section; $('#guideSearch').value = ''; renderGuide(); });
document.addEventListener('click', e => { const b = e.target.closest('[data-guide]'); if (b) openGuide(b.dataset.guide); });

window.__ph = { guideEntries, openGuide, closeGuide, renderGuide, get guideOpen() { return guideOpen; }, RPS, rpStakes, rpPre, rpGrant, rpWin, rpDiff, escArm, feArm, startEscort, RP, FE, rpTier, rpOffer, rpOpen, rpChoose, rpClose, rpResKind, feStart, feStep, feZap, feLine, drawFe, get pick() { return R && R.pick; }, RES, KITS, KIT_MAX, MSN, PORTAL_T, PORTAL_OLD, defRes, resHas, resPay, resAdd, resTxt, resLine, resRoll, resKillDrop, resBank, caravanRes, kitCraft, kitCan, kitsOwned, kitsDeploy, msStep, spawnSigil, startMission, missionPulse, missionAura, missionWin, msReward, msDmax, drawSigil, VOL, volleyStep, volleyFire, trailStep, projSplit, mirrorShot, shardRing, oathNova, dangerMark, FORK, RICO, SEC, FLAIL2, PROJB, UQ2, charSheet, openChar, closeChar, get charOpen() { return charOpen; }, tell, TELL, statDiff, statLinesHtml, CMP_ROWS, itemCompareHtml, loadoutGear, isLocked, setLocked, toggleLock, isUqItem, addShake, SHAKE, shakeOn, setShake, stPick, bindStashPick, spawnNuke, cleanW, refreshStats, ARMOR_SLOTS, LOAD, STASH_CAP, stashCap, armTier, salvageG, kitArm, canWear, stashTrim, stashToArm, armToStash, stashJunk, autoKit, loadEnd, saveOne, saveOneOk, saveOnePut, renderOutcome, renderStash, carryN, descItem, tile, get stSel() { return stSel; }, set stSel(v) { stSel = v; }, POI, VEN, BL, GUARD, LOB, ARMB, armBase, CAST110, RAIDS110, addPoison, shedPoison, poisonTick, envenom, guardMul, blightDeath, blightPop, lobRock, ACT110, chakThrow, dartsThrow, update110, drawPoisonTile, itemImp, itemIco, itemBase, canHeal, hexLeechMul, puffMask, cornerPuffs, fieldPuffs, driftZone, hexBolt, hexBoltHit, orbBoltStep, hexTouchCaster, hexCasterShoot, enemyShoot, cloudCanvas, RM, rmEff, rmStats, rmTier, rmBoardLine, HEX, HEXLOG, hexOn, applyHex, spawnHexOrb, hexPulse, inHexRing, spawnZone, inZone, updateHex, hexSummary, econX, econCost, hudLog, SA, VIEW_RULE, viewScale, readInsets, applyInsets, hudRect, resize, edgeArrow, get SCALE() { return SCALE; }, get DSCALE() { return DSCALE; }, get HUDO() { return HUDO; }, RCOL, wpnSprite, wpnDir, WPN_A0, WPN_DIRS, drawHeldWeapon, heartAlpha, heartBig, drawBuffIcons, buffSummary, pauseRunLine, txtLog, BUFF_GLYPH, MON, MONST, ADS, isPremium, adsOff, adProvider, billProvider, adDlg, adClose, buyPremium, grantPremium, restorePremium, reviveOffer, reviveEnd, doRevive, fallDown, backToCamp, STASH_CAP_P, premOf, isUq, uvOn, uqSeen, uqTotal, uvSweep, uniqToArm, uniqJunk, SUP, renderSupport, openSupport, closeSupport, supportAd, get stTab() { return stTab; }, set stTab(v) { stTab = v; }, openSettings, closeSettings, renderSettings, toggleSound, verboseHud, setVerboseHud, outMaxTier, outFam, evLogPush, openFeedback, closeFeedback, sendFeedback, captureFeedbackShot, get FB() { return FB; }, get setFrom() { return setFrom; }, AUD, MIX, SFXR, SFX_KINDS, THEMES, musPhrase, musBar, musWant, musIntensity, musTick, audWake, audApply, audGraph, audRender, audRenderSfx, audRenderMusic, toggleMusic, setMusBtns, sfx, get AC() { return AC; }, TUT_TIPS, TUT_PAGES, tutOn, tutHub, tutSkip, tutDone, tutStart, tutReplay, tutTick, tutRunEnd, defTut, get coach() { return coach; }, get tutPg() { return tutPg; }, ECON_: () => ECON, itemImg, olRows, silh, ellHW, pxEll, pxRing, dith, fireTele, fireBlast, drawVent, drawCaravan, drawLoot, ZONE_TAG, zoneLine, hpMult, SKILLS, SK, UNIQ, rollUnique, dropUnique, BASES, MELEE, WALL, NUKE, ORACLE, BLINK_T, UQ_P, raiseWall, pushOutWalls, wallsNear, segDist, updateWalls, spawnNuke, updateNukes, nukeCaster, tickBoom, oraclePulse, flailRing, attack, kill, hreqR, HREQ_R, renderSkills, get skSel() { return skSel; }, set skSel(v) { skSel = v; }, get hkSel() { return hkSel; }, set hkSel(v) { hkSel = v; }, MK, mkValue, mkBuyPrice, mkSellPrice, mkRollStock, openMarket, updateMarket, openMarketUI, closeMarketUI, renderMarket, mkBuy, mkSell, mkNoSell, get mkOpen() { return mkOpen; }, get mkSel() { return mkSel; }, set mkSel(v) { mkSel = v; }, wipeSave, wipeSummary, BANNER_MODES, bannerMode, bannerLayout, drawBanner, HUD_TOP, hudTop, HXS, hexN, hexStack, hexSlowMul, hexWeakMul, hexFragMul, hexRotDps, SHELL, shellable, shellStep, cycleBanner, setBannerBtns, SAVE_V, get VW() { return VW; }, get VH() { return VH; }, renderWipe, WIPE_WORD, SKEY, defSave, get paused() { return paused; }, hurt, dpsEst, tierOf, itemPow, TIER_TAG, IMP_T, AFX, WD, RUN9, INST9, RUN_BUFF, spawnWarden, wardenName, isGearWave, escapeBonus, distBonus, PORTAL_W, PORTAL9, portalWaves, portalCost, portalPick, setPortalPick, cyclePortal, newRun, eventWin, nextGear, get R() { return R; }, HTREE, HN, hx, hrank, hneed, need, addHeroXP, learnH, canLearnH, setSkTab, get skTab() { return skTab; }, renderHub, ETYPES, TABLES, castAt, pickType, spawnEnemy, spawnMini, hazardAt, hazardCell, ventPhase, roleCap, MINI_WAVE, update: dt => update(dt), get save() { return save; }, get mode() { return mode; }, step: (n, dt = STEP) => { for (let i = 0; i < n; i++) update(dt); }, dash, nova, useA, openBag, closeBag, bagEquip, bagDiscard, bagUnequip, get bagOpen() { return bagOpen; }, BAG_MAX, bagMax, rollWeapon, rollItem, rollArmor, dropWeapon, startRun, stats, gearPower, itemDelta, heirValue, setPause, input, persist, endRun, startEvent, hit, EV8, startEscort, spawnInst, openGate, escapeGate, updateDirector, majorsActive, canMajor, instCount, grantBuff, tavernPending, collectTavern, homeBuy, villageBuy, villageCan, villageScore, recruit, selectHero, setMap, mapsOpen, setHeir, setKeep, toggleKeep, bestKeep, keepCap, get keepPicks() { return keepPicks; }, get heir() { return save.armory[0] || null; }, setLootMin, setLootHide, lootMin, lootBlocked, lootConvOn, lootPurgeGround, lootSyncMin, stView, ST_TABS, nearbyLoot, groundEquip, groundTake, groundJunk, junkWorse, worseInBag, KEEP_CAP, renderBag, startKit, showScreen, migrate, get heirPick() { return keepPicks.length ? keepPicks[0] : -1; }, get heirOpts() { return heirOpts; }, BUFFS, HOME, HEROES, VILLAGE, SLOTS, ARMOR, MAPS, VERSION, PRIVACY_URL, BETA_BANNER, openExt, IMG, VPLOTS, drawVillage, drawPlot, roadTier, homeTier, ROAD_N, VPROPS, MILL, VCACHE, vGroundC, vHouse, lanternPts, VMAX, VWW, VWH, vCam, panTo, plotScreen, vAnimate, mendPct, reviveHp, INN_MULT, villageNext, PLOT_OF, get vSel() { return vSel; }, set vSel(v) { vSel = v; }, renderHome, RAIDS, RAID_BY, RAID_IDS, RAID, RPCT, RA, RENTER, raidOpenFor, raidKills, raidTotal, raidRec, raidKit, startRaid, renderRaids, raidSummary, spawnRaidBoss, raidEnterPhase, updateRaid, raidHpGate, raidKill, raidBoardVisible, raidReady, inEll, inArena, rZone, rLine, raidTop, raidHud, renderUnlocks, vCard, UNLOCKS,
  ECON, GATE7, TRIAL_TXT, isGateWave, nextGateWave, gateUnseal, gateKill, updateGate, gateLine, OUT7, outTier, outName, outGrow, outShellX, outShielded, outMaxTier, outFam, instKill, updateInst, AXE7, axeHalf, axeChop, SETS, setCount, setLine, afxLine, heirDetailHtml, renderLost, renderHeir, RAID7, rHurt, gainXP, addXP, get heirFocus() { return heirFocus; }, set heirFocus(v) { heirFocus = v; } };   // 1.7.0
/* ================= 1.18.0 systems (all gated on ON18; raids are untouched) ================= */
const on18 = () => ON18 && R && !R.raid;
const compass18 = (dx, dy) => { const a = Math.atan2(dy, dx), i = ((Math.round(a / (Math.PI / 4)) % 8) + 8) % 8; return ['EAST', 'SOUTH-EAST', 'SOUTH', 'SOUTH-WEST', 'WEST', 'NORTH-WEST', 'NORTH', 'NORTH-EAST'][i]; };
const meters18 = (x, y) => Math.round(Math.hypot(x - R.p.x, y - R.p.y) / 10);
function driftA18() { return DRIFT18.a[R.map] ?? 0; }
function aheadA18() { R.drift18 = R.drift18 || { n: 0, ahead: 0 }; const ah = Math.random() < DRIFT18.bias; R.drift18.n++; if (ah) R.drift18.ahead++; return ah ? driftA18() + rnd(-DRIFT18.cone, DRIFT18.cone) : Math.random() * TAU; }
function objRing18(d) { if (!on18()) return ringPos(d); const a = aheadA18(); return free18(R.p.x + Math.cos(a) * d, R.p.y + Math.sin(a) * d, 24); }
function farPos18(a, b) { const ang = aheadA18(), d = rnd(a, b); return free18(R.p.x + Math.cos(ang) * d, R.p.y + Math.sin(ang) * d * 0.8, 30); }
function init18() {
  if (!on18()) return; const p = R.p;
  R.m18 = { heat: 0, peak: 0, ax: p.x, ay: p.y, stay: 0, packT: HEAT18.packEvery, biteT: 0.5, wizT: 12, fireT: FIRE18.tick, burnT: 0.5, warned: false, seen: new Set(), packs: 0, fireHits: 0, burnHits: 0, fireMob: 0 };
  R.ice18 = new Map(); R.cr18 = new Map(); R.zone18 = []; R.spell18 = []; R.burn18 = []; R.gateRe = null; R.gateFore = null; R.mkFore = null; R.ping18 = [];
  const ap = clamp(save.home.apoth | 0, 0, 3); R.flask18 = { n: FLASK18.n[ap], max: FLASK18.n[ap], heal: FLASK18.heal[ap], used: 0 };
  R.bq.push({ s: `THE HORDE DRIFTS ${DRIFT18.name[R.map] || 'EAST'}: OBJECTIVES LIE AHEAD`, t: 2.4, c: HEAT18.col[R.map] || '#ffcd75' });
}
/* ---- solids: crypt streets (walls / buildings) + frost ice blocks ---- */
function crChunk18(i, j) {
  const key = i + ',' + j; let L = R.cr18.get(key); if (L) return L; L = [];
  const C = CRYPT18.C, x0 = i * C, y0 = j * C, h = hash(i * 7 + 3, j * 13 - 5), h2 = hash(i * 11 - 1, j * 5 + 9), W = 8;
  const add = (x, y, w, hh, k) => L.push({ x: x0 + x, y: y0 + y, w, h: hh, k, key: key + ':' + L.length });
  const near = i >= -1 && i <= 0 && j >= -1 && j <= 0;   // the four blocks around the start crossroads stay open graveyard
  L.pat = near ? 'yard0' : h < 0.30 ? 'maus' : h < 0.55 ? 'walled' : h < 0.80 ? 'corr' : 'grave';
  if (L.pat === 'maus') add(60 + Math.round(h2 * 8), 56, 100, 92, 'bld');
  else if (L.pat === 'walled') { const a = 32, b = 192, g = 34, m = (a + b) / 2, ns = h2 < 0.5;
    // top / bottom walls (gap in the middle when ns), left / right walls (gap when !ns)
    if (ns) { add(a, a, m - g / 2 - a, W, 'wall'); add(m + g / 2, a, b - m - g / 2, W, 'wall'); add(a, b - W, m - g / 2 - a, W, 'wall'); add(m + g / 2, b - W, b - m - g / 2, W, 'wall'); add(a, a, W, b - a, 'wall'); add(b - W, a, W, b - a, 'wall'); }
    else { add(a, a, b - a, W, 'wall'); add(a, b - W, b - a, W, 'wall'); add(a, a, W, m - g / 2 - a, 'wall'); add(a, m + g / 2, W, b - m - g / 2, 'wall'); add(b - W, a, W, m - g / 2 - a, 'wall'); add(b - W, m + g / 2, W, b - m - g / 2, 'wall'); }
    add(m - 10, m - 8, 20, 14, 'bld'); }
  else if (L.pat === 'corr') { if (h2 < 0.5) { add(36, 74, 152, 10, 'wall'); add(36, 140, 152, 10, 'wall'); } else { add(74, 36, 10, 152, 'wall'); add(140, 36, 10, 152, 'wall'); } }
  else if (L.pat === 'grave') { add(70, 70, 10, 10, 'wall'); add(144, 144, 10, 10, 'wall'); }
  R.cr18.set(key, L); return L;
}
function iceRect18(cx, cy) {
  if (Math.abs(cx) <= 2 && Math.abs(cy) <= 2) return null; const h = hash(cx * 5 + 17, cy * 9 - 23); if (h >= ICE18.dens) return null;
  const key = 'i' + cx + ',' + cy, st = R.ice18.get(key); if (st && st.hp <= 0) return null; const C = ICE18.cell, wide = hash(cx + 101, cy - 77) < 0.4, w = wide ? 30 : 18, hh = 12;
  return { x: cx * C + 24 - w / 2 + Math.round((hash(cx, cy + 5) - 0.5) * 10), y: cy * C + 24 - hh / 2 + Math.round((hash(cx - 9, cy + 13) - 0.5) * 14), w, h: hh, k: 'ice', key, cx, cy };
}
function sol18(x0, y0, x1, y1) {   // every solid rect overlapping the box
  const out = []; if (!on18()) return out;
  if (R.map === 'crypt') { const C = CRYPT18.C; for (let i = Math.floor(x0 / C); i <= Math.floor(x1 / C); i++) for (let j = Math.floor(y0 / C); j <= Math.floor(y1 / C); j++) for (const s of crChunk18(i, j)) if (s.x < x1 && s.x + s.w > x0 && s.y < y1 && s.y + s.h > y0) out.push(s); }
  else if (R.map === 'frost') { const C = ICE18.cell; for (let i = Math.floor((x0 - 20) / C); i <= Math.floor((x1 + 20) / C); i++) for (let j = Math.floor((y0 - 10) / C); j <= Math.floor((y1 + 10) / C); j++) { const s = iceRect18(i, j); if (s && s.x < x1 && s.x + s.w > x0 && s.y < y1 && s.y + s.h > y0) out.push(s); } }
  return out;
}
const inSolid18 = (x, y, r = 0) => sol18(x - r, y - r, x + r, y + r).some(s => x + r > s.x && x - r < s.x + s.w && y + r > s.y && y - r < s.y + s.h);
function free18(x, y, r = 6) {   // nearest free spot (spiral search, then the nearest road)
  if (!on18() || !inSolid18(x, y, r)) return [x, y];
  for (let k = 1; k <= 40; k++) { const a = k * 2.39996, d = 10 * Math.sqrt(k) * 2.2, nx = x + Math.cos(a) * d, ny = y + Math.sin(a) * d; if (!inSolid18(nx, ny, r)) return [nx, ny]; }
  const C = CRYPT18.C; return [Math.round(x / C) * C, y];
}
function pushOut18(o, r) {   // circle vs rects; returns the last push normal (or null)
  if (!on18()) return null; let n = null;
  for (const s of sol18(o.x - r, o.y - r, o.x + r, o.y + r)) {
    const qx = clamp(o.x, s.x, s.x + s.w), qy = clamp(o.y, s.y, s.y + s.h), dx = o.x - qx, dy = o.y - qy, d = Math.hypot(dx, dy);
    if (d >= r) continue;
    if (d > 0.001) { o.x = qx + dx / d * r; o.y = qy + dy / d * r; n = { x: dx / d, y: dy / d, s }; }
    else { const l = o.x - s.x, rr = s.x + s.w - o.x, t = o.y - s.y, b = s.y + s.h - o.y, m = Math.min(l, rr, t, b);
      if (m === l) { o.x = s.x - r; n = { x: -1, y: 0, s }; } else if (m === rr) { o.x = s.x + s.w + r; n = { x: 1, y: 0, s }; } else if (m === t) { o.y = s.y - r; n = { x: 0, y: -1, s }; } else { o.y = s.y + s.h + r; n = { x: 0, y: 1, s }; } }
  }
  return n;
}
function iceHit18(s, dmg) {
  if (!s || s.k !== 'ice') return false; let st = R.ice18.get(s.key); if (!st) R.ice18.set(s.key, st = { hp: ICE18.hp(R.wave), m: ICE18.hp(R.wave) });
  if (st.hp <= 0) return false; st.hp -= dmg; st.fl = 0.12; R.iceDmg18 = (R.iceDmg18 || 0) + dmg;
  const cx = s.x + s.w / 2, cy = s.y + s.h / 2; if (Math.random() < 0.6) burst(cx, cy - 4, PAL[11], 4, 30, 0.3);
  if (st.hp <= 0) { st.hp = 0; R.iceBroken18 = (R.iceBroken18 || 0) + 1; burst(cx, cy - 4, PAL[11], 22, 70, 0.6); burst(cx, cy - 4, PAL[12], 12, 50, 0.5); sfx('kill'); addText(cx, cy - 12, 'SHATTER', PAL[11]); }
  return true;
}
function iceArea18(x, y, rad, dmg) { if (!on18() || R.map !== 'frost') return 0; let n = 0; for (const s of sol18(x - rad, y - rad, x + rad, y + rad)) { const qx = clamp(x, s.x, s.x + s.w), qy = clamp(y, s.y, s.y + s.h); if (Math.hypot(qx - x, qy - y) < rad && iceHit18(s, dmg)) n++; } return n; }
function iceAuto18() {   // attack() found no enemy: chip the nearest ice block in reach
  if (!on18() || R.map !== 'frost') return false; const p = R.p, S = R.S, w = R.weapon, mel = !!MELEE[w.base], reach = mel ? Math.min(60, S.range * 1.15) : Math.min(140, S.range);
  let best = null, bd = 1e9; for (const s of sol18(p.x - reach, p.y - reach, p.x + reach, p.y + reach)) { const qx = clamp(p.x, s.x, s.x + s.w), qy = clamp(p.y, s.y, s.y + s.h), d = Math.hypot(qx - p.x, qy - p.y); if (d < reach && d < bd) { bd = d; best = { s, qx, qy }; } }
  if (!best) return false; const a = Math.atan2(best.qy - p.y, best.qx - p.x); p.aimA = a; p.face = Math.cos(a) < 0 ? -1 : 1;
  if (mel) { R.FX.push({ k: 'thrust', x: p.x, y: p.y - 3, a, r: Math.max(12, bd), t: 0.14, m: 0.14 }); iceHit18(best.s, S.baseDmg * 1.5); sfx('hit'); }
  else { R.P.push({ k: 'arrow', x: p.x, y: p.y - 4, vx: Math.cos(a) * 240, vy: Math.sin(a) * 240, r: 2, dmg: S.baseDmg, pierce: 0, life: 0.9, hit: new Set() }); sfx('shoot'); }
  return true;
}
function proj18(b, mine) {   // a shot touching a solid stops (player shots chip ice)
  if (!on18() || R.map === 'ash') return false; const gx = b.x, gy = b.y + 4, s = sol18(gx - 1, gy - 1, gx + 1, gy + 1).find(q => gx >= q.x && gx <= q.x + q.w && gy >= q.y && gy <= q.y + q.h);
  if (!s) return false; R.projBlocked18 = (R.projBlocked18 || 0) + 1; burst(b.x, b.y, s.k === 'ice' ? PAL[11] : '#566c86', 4, 30, 0.25);
  if (mine && s.k === 'ice') iceHit18(s, b.dmg || R.S.baseDmg);
  return true;
}
function enemyWall18(e, dt, sp) {   // enemies are pushed out of solids and slide along them toward you; bosses smash ice
  if (e.hexo || e.type === 'bat' || e.type === 'wisp') return;
  const n = pushOut18(e, Math.max(3, e.r)); if (!n) return; e.wallT18 = (e.wallT18 || 0) + dt;
  if (n.s.k === 'ice' && (e.boss || e.raidBoss)) { iceHit18(n.s, 1e9); return; }
  const tx = -n.y, ty = n.x, dx = R.p.x - e.x, dy = R.p.y - e.y, sg = tx * dx + ty * dy >= 0 ? 1 : -1, v = (e.spd || 20) * 0.8 * dt;
  if (n.s.k === 'ice' && hash(e.id, 3) < 0.35) return;   // some mobs get stuck on the ice
  e.x += tx * sg * v; e.y += ty * sg * v; pushOut18(e, Math.max(3, e.r));
}
/* ---- fire pits (ash) ---- */
function pitCell18(cx, cy) {
  if (Math.abs(cx) <= 1 && Math.abs(cy) <= 1) return null; const h = hash(cx * 3 + 11, cy * 5 - 7); if (h >= FIRE18.dens) return null;
  if (hazardCell('ash', cx, cy)) return null; const C = 64;
  return { x: cx * C + 32 + Math.round((hash(cx + 3, cy) - 0.5) * 20), y: cy * C + 32 + Math.round((hash(cx, cy + 3) - 0.5) * 20), r: FIRE18.r };
}
function pitAt18(x, y) { if (!on18() || R.map !== 'ash') return null; const C = 64, cx = Math.floor(x / C), cy = Math.floor(y / C);
  for (let i = cx - 1; i <= cx + 1; i++) for (let j = cy - 1; j <= cy + 1; j++) { const P = pitCell18(i, j); if (P && Math.hypot((x - P.x) / P.r, (y - P.y) / (P.r * 0.6)) < 1) return P; } return null; }
function pitFind18(x, y, rad = 400) { const C = 64; let best = null, bd = 1e9; for (let i = Math.floor((x - rad) / C); i <= Math.floor((x + rad) / C); i++) for (let j = Math.floor((y - rad) / C); j <= Math.floor((y + rad) / C); j++) { const P = pitCell18(i, j); if (P) { const d = Math.hypot(P.x - x, P.y - y); if (d < bd) { bd = d; best = P; } } } return best; }
/* ---- artillery burning ground ---- */
function burnGround18(s) { if (!on18()) return; const t = ART18.burnT + ART18.burnPer * (s.ot || 1); R.burn18.push({ x: s.x, y: s.y, r: s.r * ART18.burnR, t, m: t, dps: s.dmg * ART18.burnX, tick: 0 }); }
/* ---- the wizard ---- */
const wizN18 = () => R.E.reduce((n, e) => n + (e.type === 'wizard' && e.hp > 0 ? 1 : 0), 0);
function spawnWiz18(x, y) { if (x === undefined) { const a = aheadA18(), d = spawnDist(); [x, y] = free18(R.p.x + Math.cos(a) * d, R.p.y + Math.sin(a) * d, 6); }
  const e = spawnEnemy('wizard', x, y); e.wT = rnd(2, 3.5); e.wN = Math.floor(Math.random() * 3);
  if (!R.wizSeen18) { R.wizSeen18 = 1; R.bq.push({ s: 'A WIZARD JOINS THE HORDE', t: 2, c: '#3b5dc9' }, { s: 'ITS SPELLS MARK THE GROUND - STEP OUT', t: 2, c: '#ffcd75' }); } return e; }
function barWiz18(e, ot) { if (ON18 && ot >= WIZ18.barFrom && e.packs % WIZ18.barEvery === 0 && wizN18() < WIZ18.cap(R.wave) + 1) { const m = spawnWiz18(e.x + 14, e.y + 12); m.fromB = e.id; } }
function wizStep18(e, dt, d, ux, uy, pd, sp) {
  if (e.cast > 0) { e.cast -= dt; return [0, ux, uy]; }   // channelling: the warning is already on the ground
  if (d < WIZ18.keep - 25) { ux = -ux; uy = -uy; sp *= 0.7; } else if (d < WIZ18.keep + 25) { const sd = Math.sin(e.ph + R.t * 0.4) > 0 ? 1 : -1, nx = -uy * sd, ny = ux * sd; ux = nx; uy = ny; sp *= 0.5; }
  e.wT -= dt; if (e.wT <= 0) { if (pd < WIZ18.range && onScreen(e, 4)) wizCast18(e); else e.wT = 0.8; }
  return [sp, ux, uy];
}
function wizCast18(e, k) {
  const p = R.p, pool = ['cloud', 'freeze', 'weak'].concat(R.wave >= WIZ18.wallsFrom ? ['fwall', 'lwall'] : []);
  k = k || pool[(e.wN++) % pool.length]; const tx = p.x + (input.mx || 0) * 18, ty = p.y + (input.my || 0) * 12, wall = k === 'fwall' || k === 'lwall', tele = wall ? WIZ18.wallTele : WIZ18.tele;
  const S = { k, x: tx, y: ty, t: tele, m: tele, src: e, dmg: e.dmg, r: k === 'cloud' ? WIZ18.cloud.r : k === 'freeze' ? WIZ18.freeze.r : WIZ18.weak.r };
  if (wall) { const a = Math.atan2(ty - e.y, tx - e.x), nx = -Math.sin(a), ny = Math.cos(a), L = (k === 'fwall' ? WIZ18.fwall.len : WIZ18.lwall.len) / 2; Object.assign(S, { x1: tx - nx * L, y1: ty - ny * L, x2: tx + nx * L, y2: ty + ny * L }); }
  R.spell18.push(S); e.cast = tele; e.wT = rnd(WIZ18.cd[0], WIZ18.cd[1]) * (R.wave >= 30 ? 0.8 : 1); R.wizCasts18 = (R.wizCasts18 || 0) + 1; sfx('wind'); return S;
}
const segD18 = (px, py, s) => { const vx = s.x2 - s.x1, vy = s.y2 - s.y1, L2 = vx * vx + vy * vy || 1, t = clamp(((px - s.x1) * vx + (py - s.y1) * vy) / L2, 0, 1); return Math.hypot(px - (s.x1 + vx * t), py - (s.y1 + vy * t)); };
const inEl18 = (x, y, z) => Math.hypot((x - z.x) / z.r, (y - z.y) / (z.r * 0.7)) < 1;
function spellLand18(S) {
  const p = R.p, safe = p.inv > 0 || p.dash; R.spellLand18 = (R.spellLand18 || 0) + 1;
  if (S.k === 'cloud') R.zone18.push({ k: 'noregen', x: S.x, y: S.y, r: S.r, t: WIZ18.cloud.life, m: WIZ18.cloud.life });
  else if (S.k === 'freeze') { R.zone18.push({ k: 'chill', x: S.x, y: S.y, r: S.r, t: WIZ18.freeze.life, m: WIZ18.freeze.life }); burst(S.x, S.y, PAL[11], 16, 50); }
  else if (S.k === 'weak') { R.FX.push({ k: 'ring', x: S.x, y: S.y, r: S.r, t: 0.35, m: 0.35, c: HEX.st.weak.c }); if (inEl18(p.x, p.y, S) && !safe) { applyHex('weak', WIZ18.weak.dur, 'wizard'); R.wizHits18 = (R.wizHits18 || 0) + 1; } }
  else if (S.k === 'fwall') R.zone18.push({ k: 'fwall', x1: S.x1, y1: S.y1, x2: S.x2, y2: S.y2, t: WIZ18.fwall.life, m: WIZ18.fwall.life, dmg: S.dmg * WIZ18.fwall.x, tick: 0 });
  else if (S.k === 'lwall') { R.FX.push({ k: 'zap', x1: S.x1, y1: S.y1, x2: S.x2, y2: S.y2, t: 0.25 }); addShake(3); sfx('zap');
    if (segD18(p.x, p.y, S) < 9 && !safe) { hurt(S.dmg * WIZ18.lwall.x); R.wizHits18 = (R.wizHits18 || 0) + 1; } }
}
/* ---- objective pings ---- */
function vib18(ms) { R.vib18 = (R.vib18 || 0) + 1; if (save.vibrate === false) return false; try { if (navigator.vibrate) navigator.vibrate(ms); } catch (e) {} R.vibOn18 = (R.vibOn18 || 0) + 1; return true; }
function objSpawn18(lbl, x, y, c) {
  if (!on18()) return; const s = `NEW: ${lbl} ${meters18(x, y)}M ${compass18(x - R.p.x, y - R.p.y)}`;
  R.bq.push({ s, t: 2.2, c: c || '#ffcd75' }); R.ping18.push({ x, y, c: c || '#ffcd75', t: 1.6, m: 1.6 }); sfx('ping'); vib18(40);
  (R.pingLog18 = R.pingLog18 || []).push(s); if (typeof window.__ph !== 'undefined' && window.__ph) (window.__ph.PING18 = window.__ph.PING18 || []).push(s);
}
function objList18() {   // [ref, label, x, y, colour] for every live objective
  const L = [], g = R.gate; if (g) L.push([g, 'EXIT GATE', g.x, g.y, g.sealed ? PAL[2] : PAL[11]]);
  if (R.mk) L.push([R.mk, 'MARKET', R.mk.x, R.mk.y, '#ffcd75']);
  const ev = R.ev; if (ev) { if (ev.k === 'well') L.push([ev, 'REGEN WELL', ev.x, ev.y, '#a7f070']); else if (ev.k === 'escort') L.push([ev, ev.v === 'mage' ? 'MAGE ESCORT' : 'CARAVAN', ev.x, ev.y, PAL[10]]); else if (ev.e) L.push([ev, 'GOLD GOBLIN', ev.e.x, ev.e.y, '#ffcd75']); }
  if (R.sig) L.push([R.sig, 'MAGE SIGIL', R.sig.x, R.sig.y, '#b55088']);
  if (R.fe) L.push([R.fe, FE[R.fe.k].name || 'EVENT', R.fe.x, R.fe.y, FE[R.fe.k].c]);
  for (const e of R.E) if (e.inst && e.hp > 0) L.push([e, outName(e), e.x, e.y, e.inst === 'barracks' ? PAL[2] : PAL[3]]);
  return L;
}
/* ---- gates: countdown, hold-open, one replacement ahead ---- */
function gate18Init(g) { if (!on18()) return g; const sc = SCOUT18.gate[clamp(save.home.watch | 0, 0, 3)]; g.open = (g.re18 ? GATE18.reLife : GATE7.life) + sc; g.m18 = g.open; g.scout18 = sc; R.gateFore = null; return g; }
function gateMissed18(g) { if (!on18()) return; if (!g.re18 && !g.esc) { R.gateRe = { at: R.t + GATE18.reDelay, w: R.wave }; R.bq.push({ s: `ANOTHER GATE WILL RISE AHEAD IN ${GATE18.reDelay}S`, t: 2.2, c: PAL[11] }); } R.gatesMissed18 = (R.gatesMissed18 || 0) + 1; }
function openGateRe18() { R.gateRe = null; R.reOpen18 = true; const g = openGate(); R.reOpen18 = false; if (g) { g.re18 = 1; gate18Init(g); R.banner = { s: 'A NEW EXIT GATE RISES AHEAD', t: 2.4, c: PAL[11] }; } return g; }
/* ---- update ---- */
function heatX18() { return R && R.m18 && !R.raid ? 1 + HEAT18.spawnX * R.m18.heat : 1; }
function move18() { if (!on18() || !R.m18) return 1; let m = hexOn('chill') ? WIZ18.freeze.x : 1; if (R.map === 'frost' && R.m18.heat > HEAT18.biteAt) m *= 1 - HEAT18.frostSlow * (R.m18.heat - HEAT18.biteAt) / (1 - HEAT18.biteAt); return m; }
function update18(dt) {
  if (!on18()) return; if (!R.m18) init18(); const H = R.m18, p = R.p, S = R.S, w = R.wave;
  // momentum heat
  if (Math.hypot(p.x - H.ax, p.y - H.ay) > HEAT18.r) { H.ax = p.x; H.ay = p.y; H.stay = 0; } else H.stay += dt;
  if (H.stay > HEAT18.grace && !R.mk?.inside) H.heat = Math.min(1, H.heat + HEAT18.rise * dt); else H.heat = Math.max(0, H.heat - HEAT18.decay * dt);
  H.peak = Math.max(H.peak, H.heat);
  if (H.heat >= HEAT18.biteAt && !H.warned) { H.warned = true; R.banner = { s: `${HEAT18.name[R.map]} GATHER - KEEP MOVING`, t: 2, c: HEAT18.col[R.map] }; }
  if (H.heat < 0.2) H.warned = false;
  if (H.heat >= HEAT18.packAt) { H.packT -= dt; if (H.packT <= 0) { H.packT = HEAT18.packEvery; H.packs++; const TB = TABLES[R.map] || TABLES.ash, sw = TB.swarm.filter(t => inCast(R.map, t, w)), type = pick(sw.length ? sw : ['slime']), n = HEAT18.pack(w), a0 = Math.random() * TAU, d = spawnDist() * 0.9;
      for (let i = 0; i < n; i++) { const a = a0 + i * 0.25; spawnEnemy(type, p.x + Math.cos(a) * d, p.y + Math.sin(a) * d); } } } else H.packT = HEAT18.packEvery;
  if (H.heat > HEAT18.biteAt) { H.biteT -= dt; if (H.biteT <= 0) { H.biteT = 0.5; const k = (H.heat - HEAT18.biteAt) / (1 - HEAT18.biteAt);
      if (R.map === 'ash' && p.inv <= 0) { p.hp -= S.maxHp * HEAT18.ashBurn * k * 0.5; H.bitN = (H.bitN || 0) + 1; if (p.hp <= 0) hurt(0.01); }
      else if (R.map === 'crypt' && p.hp > 1) { p.hp = Math.max(1, p.hp - S.maxHp * HEAT18.fogRot * k * 0.5); H.bitN = (H.bitN || 0) + 1; } } }
  const hc = HEAT18.col[R.map] || '#ef7d57';
  if (H.heat > 0.15 && Math.random() < H.heat * 0.9) { const a = Math.random() * TAU, d = rnd(10, 90); R.PT.push({ x: p.x + Math.cos(a) * d, y: p.y + Math.sin(a) * d * 0.7, vx: rnd(-6, 6), vy: R.map === 'frost' ? rnd(8, 20) : -rnd(8, 18), t: 0.9, m: 0.9, c: hc, s: 1 }); }
  if (Math.random() < 0.25) { const da = driftA18(), ox = rnd(-VW / 2, VW / 2), oy = rnd(-VH / 2, VH / 2); R.PT.push({ x: p.x + ox, y: p.y + oy, vx: Math.cos(da) * 26, vy: Math.sin(da) * 26, t: 1.2, m: 1.2, c: R.map === 'frost' ? '#f4f4f4' : R.map === 'crypt' ? '#566c86' : '#94b0c2', s: 1 }); }
  // fire pits + burning ground
  H.fireT -= dt; if (H.fireT <= 0) { H.fireT = FIRE18.tick;
    if (R.map === 'ash') { if (!p.dash && p.inv <= 0 && pitAt18(p.x, p.y)) { hurt(S.maxHp * FIRE18.pct + FIRE18.flat(w)); applyHex('burn', FIRE18.burnT, 'zone'); H.fireHits++; burst(p.x, p.y - 2, PAL[3], 8, 40); }
      for (const e of R.E) if (!e.inst && !e.boss && !e.raidBoss && e.hp > 0 && pitAt18(e.x, e.y)) { hit(e, S.baseDmg * FIRE18.mobX, { proc: false, noCrit: true, col: PAL[3] }); H.fireMob++; } } }
  for (const b of R.burn18) { b.t -= dt; b.tick -= dt; if (b.tick <= 0 && inEl18(p.x, p.y, b)) { b.tick = 0.5; if (!p.dash && p.inv <= 0) { hurt(b.dps * 0.5); applyHex('burn', 1.5, 'zone'); H.burnHits++; } } if (Math.random() < 0.3) R.PT.push({ x: b.x + rnd(-b.r, b.r) * 0.8, y: b.y + rnd(-b.r, b.r) * 0.5, vx: 0, vy: -18, t: 0.4, m: 0.4, c: Math.random() < 0.5 ? PAL[3] : PAL[4], s: 1 }); }
  R.burn18 = R.burn18.filter(b => b.t > 0);
  if (hexOn('burn')) { H.burnT -= dt; if (H.burnT <= 0) { H.burnT = 0.5; if (p.hp > 1) p.hp = Math.max(1, p.hp - S.maxHp * FIRE18.burnPct * 0.5); if (Math.random() < 0.8) R.PT.push({ x: p.x + rnd(-3, 3), y: p.y - 6, vx: 0, vy: -20, t: 0.3, m: 0.3, c: PAL[3], s: 1 }); } }
  // wizards + spells + spell zones
  if (w >= WIZ18.from) { H.wizT -= dt; if (H.wizT <= 0) { H.wizT = rnd(WIZ18.every[0], WIZ18.every[1]); if (wizN18() < WIZ18.cap(w)) spawnWiz18(); } }
  for (const s of R.spell18) { if (!s.src || s.src.hp <= 0 || !R.E.includes(s.src)) { s.t = -1; s.fizz = 1; R.spellFizz18 = (R.spellFizz18 || 0) + 1; burst(s.x, s.y, '#5d275d', 10, 30); continue; } s.t -= dt; if (s.t <= 0) spellLand18(s); }
  R.spell18 = R.spell18.filter(s => s.t > 0);
  for (const z of R.zone18) { z.t -= dt; if (z.t <= 0) continue;
    if (z.k === 'noregen' && inEl18(p.x, p.y, z)) applyHex('noregen', 0.5, 'zone');
    else if (z.k === 'chill' && inEl18(p.x, p.y, z)) applyHex('chill', 0.5, 'zone');
    else if (z.k === 'fwall') { z.tick -= dt; if (z.tick <= 0 && segD18(p.x, p.y, z) < 8 && !p.dash && p.inv <= 0) { z.tick = 0.4; hurt(z.dmg); applyHex('burn', FIRE18.burnT, 'zone'); R.wizHits18 = (R.wizHits18 || 0) + 1; }
      if (Math.random() < 0.6) { const t = Math.random(); R.PT.push({ x: z.x1 + (z.x2 - z.x1) * t, y: z.y1 + (z.y2 - z.y1) * t, vx: 0, vy: -24, t: 0.4, m: 0.4, c: Math.random() < 0.5 ? PAL[3] : PAL[4], s: 2 }); } } }
  R.zone18 = R.zone18.filter(z => z.t > 0);
  for (const st of R.ice18.values()) if (st.fl > 0) st.fl -= dt;
  // gates: foretelling (scout tower) + the replacement gate
  const sc = clamp(save.home.watch | 0, 0, 3), lead = SCOUT18.lead[sc];
  if (R.gateRe && R.t >= R.gateRe.at && !R.gate && !R.over) openGateRe18();
  if (R.gateRe && R.gate && !R.gate.re18 && R.gate.w !== R.gateRe.w) R.gateRe = null;   // the regular gate came first
  const gW = nextGateWave(R.wave), gAt = (gW - 1) * WAVE_LEN; if (lead > 0 && !R.gateFore && gW > R.wave && gAt > R.t && gAt - R.t <= lead) { const [x, y] = farPos18(GATE7.far[0], GATE7.far[1]); R.gateFore = { x, y, at: gAt }; R.foreN18 = (R.foreN18 || 0) + 1; R.bq.push({ s: `SCOUTS: AN EXIT GATE RISES IN ${Math.ceil(gAt - R.t)}S`, t: 2, c: PAL[11] }); }
  if (lead > 0 && !R.mk && !R.mkFore && R.mkT > R.t && R.mkT - R.t <= lead) { const [x, y] = farPos18(MK.near[0], MK.near[1]); R.mkFore = { x, y, at: R.mkT }; R.bq.push({ s: `SCOUTS: A MARKET SETS UP IN ${Math.ceil(R.mkT - R.t)}S`, t: 2, c: '#ffcd75' }); }
  if (R.gateFore && R.gateFore.at < R.t - 30) R.gateFore = null; if (R.mkFore && (R.mk || R.mkFore.at < R.t - 30)) R.mkFore = null;
  // flask
  const F = R.flask18; if (F && F.n > 0 && p.hp > 0 && p.hp < S.maxHp * FLASK18.at && canHeal() && !R.over) { F.n--; F.used++; const hv = Math.round(S.maxHp * F.heal); p.hp = Math.min(S.maxHp, p.hp + hv); addText(p.x, p.y - 16, `+${hv} FLASK`, PAL[5], true); burst(p.x, p.y - 4, PAL[5], 20, 50); sfx('revive'); }
  // new objective pings
  for (const [ref, lbl, x, y, c] of objList18()) if (!H.seen.has(ref)) { H.seen.add(ref); objSpawn18(lbl, x, y, c); }
  for (const q of R.ping18) q.t -= dt; R.ping18 = R.ping18.filter(q => q.t > 0);
}
/* ---- drawing ---- */
function draw18Terrain(X, Y, now, cx, cy) {
  if (!on18()) return; const x0 = cx - 40, y0 = cy - 40, x1 = cx + VW + 40, y1 = cy + VH + 60;
  if (R.map === 'crypt') { const C = CRYPT18.C, rd = CRYPT18.road;
    ctx.fillStyle = '#2b2436'; for (let i = Math.floor(x0 / C); i <= Math.floor(x1 / C) + 1; i++) ctx.fillRect(Math.round(X(i * C - rd)), 0, rd * 2, VH);
    for (let j = Math.floor(y0 / C); j <= Math.floor(y1 / C) + 1; j++) ctx.fillRect(0, Math.round(Y(j * C - rd)), VW, rd * 2);
    ctx.fillStyle = '#3a3046'; for (let i = Math.floor(x0 / C); i <= Math.floor(x1 / C) + 1; i++) for (let yy = Math.floor(y0 / 8) * 8; yy < y1; yy += 8) { const o = (yy / 8) & 1 ? 4 : 0; for (let xx = -rd + o; xx < rd; xx += 8) ctx.fillRect(Math.round(X(i * C + xx)), Math.round(Y(yy)), 7, 7); }
    for (let j = Math.floor(y0 / C); j <= Math.floor(y1 / C) + 1; j++) for (let xx = Math.floor(x0 / 8) * 8; xx < x1; xx += 8) { const o = (xx / 8) & 1 ? 4 : 0; for (let yy = -rd + o; yy < rd; yy += 8) ctx.fillRect(Math.round(X(xx)), Math.round(Y(j * C + yy)), 7, 7); }
    for (let i = Math.floor(x0 / C); i <= Math.floor(x1 / C); i++) for (let j = Math.floor(y0 / C); j <= Math.floor(y1 / C); j++) { const L = crChunk18(i, j);
      if (L.pat === 'grave' || L.pat === 'yard0' || L.pat === 'walled') for (let t = 0; t < 6; t++) { const tx = i * C + 48 + Math.floor(hash(i * 31 + t, j) * 128), ty = j * C + 48 + Math.floor(hash(i, j * 29 + t) * 128); if (inSolid18(tx, ty, 4)) continue; const sx = Math.round(X(tx)), sy = Math.round(Y(ty)); ctx.fillStyle = '#0b0b14'; ctx.fillRect(sx - 3, sy - 7, 6, 8); ctx.fillStyle = '#566c86'; ctx.fillRect(sx - 2, sy - 6, 4, 6); ctx.fillStyle = '#94b0c2'; ctx.fillRect(sx - 1, sy - 5, 2, 1); } } }
  for (const s of sol18(x0, y0, x1, y1)) { const sx = Math.round(X(s.x)), sy = Math.round(Y(s.y));
    if (s.k === 'wall') { const hh = 12; ctx.fillStyle = '#0b0b14'; ctx.fillRect(sx - 1, sy - hh - 1, s.w + 2, s.h + hh + 2); ctx.fillStyle = '#3e3550'; ctx.fillRect(sx, sy - hh, s.w, s.h + hh); ctx.fillStyle = '#5a4d70'; ctx.fillRect(sx, sy - hh, s.w, s.h);
      ctx.fillStyle = '#2a2338'; for (let yy = 4; yy < hh; yy += 4) for (let xx = (yy & 4 ? 0 : 3); xx < s.w; xx += 6) ctx.fillRect(sx + xx, sy - hh + s.h + yy - 4, 1, 3); }
    else if (s.k === 'bld') { const hh = 22; ctx.fillStyle = '#0b0b14'; ctx.fillRect(sx - 1, sy - hh - 1, s.w + 2, s.h + hh + 2); ctx.fillStyle = '#333c57'; ctx.fillRect(sx, sy + s.h - hh, s.w, hh); ctx.fillStyle = '#5d275d'; ctx.fillRect(sx, sy - hh, s.w, s.h); ctx.fillStyle = '#7a3a7a'; for (let xx = 2; xx < s.w; xx += 6) ctx.fillRect(sx + xx, sy - hh, 2, s.h);
      ctx.fillStyle = '#0b0b14'; const dw = Math.min(10, s.w / 3); ctx.fillRect(sx + Math.round(s.w / 2 - dw / 2), sy + s.h - 12, Math.round(dw), 12); ctx.fillStyle = PAL[12]; if (s.w > 30) { ctx.fillRect(sx + Math.round(s.w / 2) - 2, sy + s.h - hh + 3, 4, 3); ctx.fillStyle = '#0b0b14'; ctx.fillRect(sx + Math.round(s.w / 2) - 1, sy + s.h - hh + 4, 1, 1); ctx.fillRect(sx + Math.round(s.w / 2) + 1, sy + s.h - hh + 4, 1, 1); } }
    else if (s.k === 'ice') { const st = R.ice18.get(s.key), f = st ? st.hp / st.m : 1, hh = 8; ctx.fillStyle = '#0b0b14'; ctx.fillRect(sx - 1, sy - hh - 1, s.w + 2, s.h + hh + 2); ctx.fillStyle = st && st.fl > 0 ? '#f4f4f4' : '#41a6f6'; ctx.fillRect(sx, sy + s.h - hh, s.w, hh); ctx.fillStyle = st && st.fl > 0 ? '#f4f4f4' : '#73eff7'; ctx.fillRect(sx, sy - hh, s.w, s.h);
      ctx.fillStyle = '#f4f4f4'; ctx.fillRect(sx + 1, sy - hh + 1, s.w - 2, 1); ctx.fillRect(sx + 2, sy - hh + 3, 2, 2);
      if (f < 0.75) { ctx.fillStyle = '#29366f'; ctx.fillRect(sx + Math.round(s.w * 0.3), sy - hh + 2, 1, s.h + hh - 3); if (f < 0.45) { ctx.fillRect(sx + Math.round(s.w * 0.6), sy - hh + 4, 1, s.h + hh - 6); ctx.fillRect(sx + Math.round(s.w * 0.3), sy - 2, Math.round(s.w * 0.3), 1); } } } }
  if (R.map === 'ash') { const C = 64; for (let i = Math.floor(x0 / C); i <= Math.floor(x1 / C); i++) for (let j = Math.floor(y0 / C); j <= Math.floor(y1 / C); j++) { const P = pitCell18(i, j); if (!P) continue; const px = Math.round(X(P.x)), py = Math.round(Y(P.y));
      ctx.fillStyle = '#566c86'; ctx.beginPath(); ctx.ellipse(px, py, P.r + 3, P.r * 0.6 + 2, 0, 0, TAU); ctx.fill(); ctx.fillStyle = '#1a1c2c'; ctx.beginPath(); ctx.ellipse(px, py, P.r, P.r * 0.6, 0, 0, TAU); ctx.fill();
      ctx.fillStyle = '#b13e53'; ctx.beginPath(); ctx.ellipse(px, py, P.r - 3, P.r * 0.6 - 2, 0, 0, TAU); ctx.fill();
      for (let f = 0; f < 7; f++) { const ph = (now / 140 + f * 1.7 + i) % 3, fx = px - P.r + 4 + ((f * 5 + i * 3) % (P.r * 2 - 6)), fh = 3 + Math.round(4 * Math.abs(Math.sin(now / 120 + f))); ctx.fillStyle = ph < 1 ? PAL[4] : PAL[3]; ctx.fillRect(fx, py - fh, 2, fh); }
      ctx.globalAlpha = 0.18 + 0.08 * Math.sin(now / 200 + i); ctx.fillStyle = PAL[3]; ctx.beginPath(); ctx.ellipse(px, py - 4, P.r + 8, P.r * 0.6 + 6, 0, 0, TAU); ctx.fill(); ctx.globalAlpha = 1; } }
}
function draw18Ground(X, Y, now) {
  if (!on18()) return;
  for (const b of R.burn18) { const bx = X(b.x), by = Y(b.y), a = Math.min(1, b.t / 0.6); ctx.globalAlpha = 0.35 * a; ctx.fillStyle = PAL[3]; ctx.beginPath(); ctx.ellipse(bx, by, b.r, b.r * 0.7, 0, 0, TAU); ctx.fill(); ctx.globalAlpha = 0.8 * a;
    for (let f = 0; f < 8; f++) { const fa = f / 8 * TAU + b.x, fx = Math.round(bx + Math.cos(fa) * b.r * 0.6), fy = Math.round(by + Math.sin(fa) * b.r * 0.4), fh = 2 + Math.round(3 * Math.abs(Math.sin(now / 110 + f))); ctx.fillStyle = f & 1 ? PAL[4] : PAL[3]; ctx.fillRect(fx, fy - fh, 2, fh); } ctx.globalAlpha = 1; }
  for (const z of R.zone18) { const a = Math.min(1, z.t / 0.5);
    if (z.k === 'fwall' || z.k === 'lwall') { const L = Math.hypot(z.x2 - z.x1, z.y2 - z.y1) || 1; for (let i = 0; i <= L; i += 5) { const fx = Math.round(X(z.x1 + (z.x2 - z.x1) * i / L)), fy = Math.round(Y(z.y1 + (z.y2 - z.y1) * i / L)), fh = 4 + Math.round(4 * Math.abs(Math.sin(now / 90 + i))); ctx.globalAlpha = a; ctx.fillStyle = '#0b0b14'; ctx.fillRect(fx - 1, fy - fh - 1, 4, fh + 2); ctx.fillStyle = (i / 5) & 1 ? PAL[4] : PAL[3]; ctx.fillRect(fx, fy - fh, 2, fh); } ctx.globalAlpha = 1; continue; }
    const col = z.k === 'noregen' ? HEX.st.noregen.c : PAL[11], zx = X(z.x), zy = Y(z.y); ctx.globalAlpha = 0.28 * a; ctx.fillStyle = col; ctx.beginPath(); ctx.ellipse(zx, zy, z.r, z.r * 0.7, 0, 0, TAU); ctx.fill(); ctx.globalAlpha = 0.8 * a; ctx.strokeStyle = col; ctx.lineWidth = 1; ctx.setLineDash([3, 2]); ctx.lineDashOffset = now / 80; ctx.beginPath(); ctx.ellipse(zx, zy, z.r, z.r * 0.7, 0, 0, TAU); ctx.stroke(); ctx.setLineDash([]); ctx.globalAlpha = 1;
    drawHexIcon(z.k, Math.round(zx) - 2, Math.round(zy) - 3, col); }
  for (const s of R.spell18) { const f = 1 - s.t / s.m, col = s.k === 'cloud' ? HEX.st.noregen.c : s.k === 'freeze' ? PAL[11] : s.k === 'weak' ? HEX.st.weak.c : s.k === 'fwall' ? PAL[3] : PAL[11], blink = Math.floor(now / 90) % 2;
    if (s.x1 !== undefined) { ctx.strokeStyle = col; ctx.globalAlpha = 0.35 + 0.5 * f; ctx.lineWidth = 3; ctx.setLineDash([4, 3]); ctx.lineDashOffset = -now / 50; ctx.beginPath(); ctx.moveTo(X(s.x1), Y(s.y1)); ctx.lineTo(X(s.x2), Y(s.y2)); ctx.stroke(); ctx.setLineDash([]); ctx.lineWidth = 1; ctx.globalAlpha = 1;
      if (blink) text(ctx, s.k === 'fwall' ? 'FIRE WALL' : 'LIGHTNING', Math.round(X(s.x)), Math.round(Y(s.y)) - 14, col, 1, 'c'); continue; }
    const zx = X(s.x), zy = Y(s.y); ctx.globalAlpha = 0.15 + 0.25 * f; ctx.fillStyle = col; ctx.beginPath(); ctx.ellipse(zx, zy, s.r * f, s.r * 0.7 * f, 0, 0, TAU); ctx.fill(); ctx.globalAlpha = 0.9; ctx.strokeStyle = col; ctx.lineWidth = 1; ctx.beginPath(); ctx.ellipse(zx, zy, s.r, s.r * 0.7, 0, 0, TAU); ctx.stroke(); ctx.globalAlpha = 1;
    if (blink) dangerMark(zx, zy - 4, col, 1, now); }
  for (const [, , x, y, c] of objList18()) { const ph = (now % 1200) / 1200, bx = Math.round(X(x)), by = Math.round(Y(y)); ctx.strokeStyle = c; ctx.globalAlpha = 0.6 * (1 - ph); ctx.lineWidth = 1; ctx.beginPath(); ctx.ellipse(bx, by, 10 + 34 * ph, (10 + 34 * ph) * 0.7, 0, 0, TAU); ctx.stroke(); ctx.globalAlpha = 1; }
  const g = R.gate; if (g && g.m18) { const gx = Math.round(X(g.x)), gy = Math.round(Y(g.y)), f = clamp(g.open / g.m18, 0, 1), fad = g.open < GATE18.fade, c = fad ? (Math.floor(now / 150) % 2 ? PAL[2] : '#ffcd75') : PAL[11];
    ctx.strokeStyle = '#0b0b14'; ctx.lineWidth = 3; ctx.beginPath(); ctx.arc(gx, gy - 12, 22, 0, TAU); ctx.stroke(); ctx.strokeStyle = c; ctx.lineWidth = 2; ctx.beginPath(); ctx.arc(gx, gy - 12, 22, -Math.PI / 2, -Math.PI / 2 + TAU * f); ctx.stroke(); ctx.lineWidth = 1;
    text(ctx, fmtT(Math.max(0, g.open)), gx, gy - 80, c, 1, 'c'); if (fad) { ctx.globalAlpha = 0.25 + 0.2 * Math.sin(now / 70); ctx.fillStyle = '#1a1c2c'; ctx.fillRect(gx - 14, gy - 34, 28, 34); ctx.globalAlpha = 1; text(ctx, 'FADING', gx, gy + 10, c, 1, 'c'); } }
  if (R.gateFore) { const fx = Math.round(X(R.gateFore.x)), fy = Math.round(Y(R.gateFore.y)); ctx.strokeStyle = '#ffcd75'; ctx.setLineDash([2, 3]); ctx.beginPath(); ctx.ellipse(fx, fy, GATE7.r, GATE7.r * 0.7, 0, 0, TAU); ctx.stroke(); ctx.setLineDash([]); text(ctx, `GATE IN ${Math.max(0, Math.ceil(R.gateFore.at - R.t))}S`, fx, fy - 10, '#ffcd75', 1, 'c'); }
}
function draw18Top(X, Y, now) {
  if (!on18()) return;
  for (const [, , x, y, c] of objList18()) { const bx = Math.round(X(x)), by = Math.round(Y(y)), a = 0.25 + 0.2 * Math.sin(now / 220); ctx.globalAlpha = a; ctx.fillStyle = c; ctx.fillRect(bx - 1, by - 110, 3, 96); ctx.globalAlpha = a * 0.5; ctx.fillRect(bx - 3, by - 110, 7, 96); ctx.globalAlpha = 1; }
  const H = R.m18; if (H && H.heat > 0.05) { const c = HEAT18.col[R.map] || PAL[3], a = Math.min(0.42, H.heat * 0.42); ctx.globalAlpha = a; ctx.fillStyle = c; const e = 6 + Math.round(H.heat * 18);
    ctx.fillRect(0, 0, VW, e); ctx.fillRect(0, VH - e, VW, e); ctx.fillRect(0, 0, e, VH); ctx.fillRect(VW - e, 0, e, VH); ctx.globalAlpha = a * 0.5; ctx.fillRect(0, 0, VW, VH); ctx.globalAlpha = 1;
    if (H.heat > 0.2) { ctx.strokeStyle = c; ctx.globalAlpha = 0.5; ctx.setLineDash([3, 4]); ctx.beginPath(); ctx.ellipse(X(H.ax), Y(H.ay), HEAT18.r, HEAT18.r * 0.7, 0, 0, TAU); ctx.stroke(); ctx.setLineDash([]); ctx.globalAlpha = 1; } }
}
function hud18(now) {
  if (!on18()) return; const p = R.p;
  if (R.gateFore) edgeArrow(R.gateFore.x, R.gateFore.y, '#ffcd75', now, 'G?');
  if (R.mkFore) edgeArrow(R.mkFore.x, R.mkFore.y, '#ffcd75', now, 'M?');
  const F = R.flask18; if (F && F.max) for (let i = 0; i < F.max; i++) { const x = 80 + R.lives * 7 + i * 6, on = i < F.n; ctx.fillStyle = '#0b0b14'; ctx.fillRect(x, 12, 5, 7); ctx.fillStyle = on ? '#b13e53' : '#333c57'; ctx.fillRect(x + 1, 14, 3, 4); ctx.fillStyle = on ? '#f4f4f4' : '#566c86'; ctx.fillRect(x + 2, 12, 1, 2); }
  const H = R.m18; if (H && H.heat > 0.1) { const c = HEAT18.col[R.map] || PAL[3]; text(ctx, `${HEAT18.name[R.map]} ${Math.round(H.heat * 100)}% - MOVE ON`, VW / 2, VH - 18, c, 1, 'c'); if (HUDLOG) HUDLOG.push({ k: 'heat', s: HEAT18.name[R.map], v: H.heat }); }
  const ox = FVW / 2 - HUDO.x, oy = FVH / 2 - HUDO.y;
  for (const q of R.ping18) { const sx = clamp(ox + q.x - p.x, 14, VW - 14), sy = clamp(oy + q.y - p.y, 14, VH - 14), f = 1 - q.t / q.m; ctx.strokeStyle = q.c; ctx.globalAlpha = 1 - f; ctx.lineWidth = 2; ctx.beginPath(); ctx.arc(sx, sy, 6 + 26 * f, 0, TAU); ctx.stroke(); ctx.lineWidth = 1; ctx.globalAlpha = 1; }
}
function arrowSub18(lbl, tx, ty) { if (!on18() || !lbl) return ''; const m = `${meters18(tx, ty)}M`;
  if (lbl === 'G' && R.gate) return `${m} ${fmtT(Math.max(0, R.gate.open))}`; if (lbl === 'G?' && R.gateFore) return `IN ${Math.max(0, Math.ceil(R.gateFore.at - R.t))}S`; if (lbl === 'M?' && R.mkFore) return `IN ${Math.max(0, Math.ceil(R.mkFore.at - R.t))}S`; return m; }
/* ---- village ---- */
const mkt18 = () => ON18 ? MKT18[clamp(save.home.market | 0, 0, 2)] : 1;
function bonus18(B, l, max) { return `<p class="tiny bonus18">BONUS T${l}: <b>${B.fx(l)}</b>${l < max ? ` · NEXT T${l + 1}: <b>${B.fx(l + 1)}</b>` : ' · <b>MAX</b>'}</p>`; }
function smithLine18() { const t = smithT18(); return `<p class="tiny bonus18">BONUS: <b>upgrade costs -${Math.round(SMITH18[t] * 100)}%</b> (village builds, tavern, hearth)${t < 3 ? ` · NEXT: <b>-${Math.round(SMITH18[t + 1] * 100)}%</b> ${t === 0 ? '(build the smithy)' : '(forge tier)'}` : ' · <b>MAX</b>'}</p>`; }
function guide18(add) {
  add('status-burning', 'Status effects', 'BURNING (you)', 'Fire pits, burning artillery ground and wizard fire walls set you alight.', `Burns ${FIRE18.burnPct * 100}% max HP per second in 0.5s ticks while active (cannot kill on its own, floor 1 HP). Fire pits: ${FIRE18.burnT}s.`, 'Step off the fire; it fades in seconds.');
  add('status-frozen', 'Status effects', 'FROZEN (you)', 'Standing in a wizard freeze patch.', `Move speed ×${WIZ18.freeze.x} while inside and 0.5s after leaving.`, 'Dash out of the patch.');
  add('threat-wizard', 'Threats', 'WIZARD', 'A robed caster on foot (not on a catapult). Keeps its distance and marks the ground where you stand before every spell.', `From wave ${WIZ18.from}, one every ${WIZ18.every[0]}-${WIZ18.every[1]}s (max ${WIZ18.cap(1)}/${WIZ18.cap(20)}/${WIZ18.cap(35)} at waves 8/20/35); barracks T${WIZ18.barFrom}+ add one every ${WIZ18.barEvery}rd pack. Cast every ${WIZ18.cd[0]}-${WIZ18.cd[1]}s; ${WIZ18.tele}s warning (${WIZ18.wallTele}s for walls). Spells: NO REGEN cloud r${WIZ18.cloud.r} ${WIZ18.cloud.life}s · FREEZE patch r${WIZ18.freeze.r} ${WIZ18.freeze.life}s · WEAKNESS burst r${WIZ18.weak.r} ${WIZ18.weak.dur}s · wave ${WIZ18.wallsFrom}+: FIRE WALL ${WIZ18.fwall.len}px ${WIZ18.fwall.life}s, LIGHTNING WALL ${WIZ18.lwall.len}px ${WIZ18.lwall.x * 100}% damage. Killing it fizzles its pending spells.`, 'Step out of the mark; kill it first.');
  add('threat-barracks', 'Threats', 'BARRACKS LADDER', 'Enemy outposts grow a tier about every 10 waves until razed; from ' + OUT7.names.barracks[WIZ18.barFrom - 1] + ' (T' + WIZ18.barFrom + ') a purple wizard tower stands beside it.', `Tiers: ${OUT7.names.barracks.join(' > ')}. Packs every ${OUT7.barEvery[0]}s (T1) down to ${OUT7.barEvery[7]}s (T8); from T${WIZ18.barFrom} every ${WIZ18.barEvery}rd pack brings a WIZARD.`, 'Raze outposts early.');
  add('threat-artillery', 'Threats', 'CATAPULT / CANNON', 'Artillery is pure damage now: big impacts that leave the ground burning.', `Burning ground r = ${ART18.burnR * 100}% of the blast, lasts ${ART18.burnT}s + ${ART18.burnPer}s per tier, ${ART18.burnX * 100}% of shell damage per second in 0.5s ticks + BURNING. Ladder: CATAPULT, CATAPULT SQUAD, HEAVY CAT, CANNON, CANNON SQUAD, SIEGE CANNON, BOMBARD, GRAND BATTERY.`, 'Raze it or keep moving.');
  add('threat-heat', 'Threats', 'LINGERING (heat)', 'Staying in one spot builds map heat: more spawns and a map hazard. It fades once you move on.', `Grace ${HEAT18.grace}s inside ${HEAT18.r}px, then +${(HEAT18.rise * 100).toFixed(1)}%/s; decays ${HEAT18.decay * 100}%/s. Spawn rate ×(1 + ${HEAT18.spawnX} × heat); from ${HEAT18.packAt * 100}% a pack every ${HEAT18.packEvery}s; from ${HEAT18.biteAt * 100}%: Ash CINDERS up to ${HEAT18.ashBurn * 100}% max HP/s, Crypt GRAVE FOG rot up to ${HEAT18.fogRot * 100}%/s, Frost WHITEOUT up to -${HEAT18.frostSlow * 100}% move.`, 'Follow the drift: objectives lie ahead.');
  add('threat-pits', 'Threats', 'FIRE PITS (Ash)', 'Burning pits in the ash wastes. Stepping in hurts for real.', `Every ${FIRE18.tick}s inside: ${FIRE18.pct * 100}% max HP + (1 + 0.2 × wave), through damage reduction, + BURNING ${FIRE18.burnT}s. Monsters take ${FIRE18.mobX * 100}% weapon damage per tick. Dash over them.`, '');
  add('threat-ice', 'Threats', 'ICE BLOCKS (Frost)', 'Solid ice blocks: they stop you, monsters and projectiles. Break them.', `HP ${ICE18.hp(0)} + 10 × wave (fixed when first hit). Your shots, melee swings (when no foe is in reach), Nova and dash chip them; bosses smash straight through. Ice sheets still slow.`, '');
  add('threat-crypt', 'Threats', 'CRYPT STREETS', 'The Bone Crypt is a walled city: mausoleums, yards and corridors between cobbled roads.', `${CRYPT18.C}px blocks with ${CRYPT18.road * 2}px roads. Walls block you, monsters and shots; nothing spawns inside them; the caravan keeps to the roads.`, '');
  add('threat-gates', 'Threats', 'FLEETING GATES', 'Exit gates fade. A missed gate is gone, but one more rises ahead later, then the regular schedule carries on.', `Life ${GATE7.life}s + Scout Tower (+${SCOUT18.gate.slice(1).join('/')}s). Missed: a replacement after ${GATE18.reDelay}s (${GATE18.reLife}s life + scout). Standing inside an unsealed gate holds it open.`, 'The edge arrow shows distance and time left.');
}
/* ---- crypt caravan keeps to the roads ---- */
function road18(ev) { if (!on18() || R.map !== 'crypt' || !ev || ev.v !== 'caravan') return; const C = CRYPT18.C, ax = Math.round(ev.x / C) * C, ay = Math.round(ev.y / C) * C, L = EV8.caravan.dist, dir = Math.random() < 0.5 ? -1 : 1;
  if (Math.abs(ev.y - ay) < Math.abs(ev.x - ax)) { ev.y = ay; ev.sx = ev.x; ev.sy = ay; ev.tx = ev.x + dir * L; ev.ty = ay; } else { ev.x = ax; ev.sx = ax; ev.sy = ev.y; ev.tx = ax; ev.ty = ev.y + dir * L; } ev.road18 = 1; }
/* ---- 1.18.0 wiring (runs once at load) ---- */
if (ON18) {
  HEX.st.burn = { name: 'BURNING', d: 'fire damage over time', c: '#ef7d57', ic: '..1...111.11111.111.1.1.1' };
  HEX.st.chill = { name: 'FROZEN', d: 'move speed -55%', c: '#73eff7', ic: '1.1.1.111.11111.111.1.1.1' };
  ETYPES.wizard = { name: 'WIZARD', role: 'wizard', hp: 60, spd: 22, dmg: 12, xp: 8, r: 5, spr: 'wizard', col: 9, kbr: 0.6, hint: 'ITS SPELLS MARK THE GROUND - STEP OUT' };
  ACT110.wizard = wizStep18;
  OUT7.names.catapult = ['CATAPULT', 'CATAPULT SQUAD', 'HEAVY CAT', 'CANNON', 'CANNON SQUAD', 'SIEGE CANNON', 'BOMBARD', 'GRAND BATTERY'];
  OUT7.family = ['cat', 'cat', 'cat', 'cannon', 'cannon', 'cannon', 'cannon', 'cannon'];
  OUT7.gfx = [0, 0, 0, 0, 0, 0, 0, 0];   // artillery = pure damage + burning ground (status effects moved to the wizard)
  CARD_ORDER[1] = CARD_ORDER[1].filter(k => k !== 'market' && k !== 'watch'); CARD_ORDER[0].splice(CARD_ORDER[0].indexOf('forge') + 1, 0, 'market', 'watch', 'apoth');
  { const G = VPLOTS.find(P => P.k === 'garden'); G.cards.push('apoth'); PLOT_OF.apoth = G; }
  { const tb = $('#guideTabs'); if (tb && !tb.querySelector('[data-section="Threats"]')) { tb.insertAdjacentHTML('beforeend', '<button class="pxbtn small" data-section="Threats">THREATS</button>'); const b = tb.querySelector('[data-section="Threats"]'); b.onclick = () => { guideSection = 'Threats'; $('#guideSearch').value = ''; renderGuide(); }; } }
  { const r = $('#setVibRow'); if (r) r.hidden = false; const b = $('#bVib'); if (b) b.onclick = () => { save.vibrate = save.vibrate === false; persist(); sfx('swap'); if (save.vibrate) { try { navigator.vibrate && navigator.vibrate(40); } catch (e) {} } renderSettings(); toast(save.vibrate ? 'Vibration on' : 'Vibration off'); }; }
}
else { const r = $('#setVibRow'); if (r) r.remove(); }   // the 1.17 suites see the old Settings rows
Object.assign(window.__ph, { PRICE181, ON18, DRIFT18, HEAT18, GATE18, FIRE18, ICE18, CRYPT18, ART18, WIZ18, MKT18, SMITH18, FLASK18, SCOUT18, init18, update18, heatX18, move18, objRing18, farPos18, free18, sol18, inSolid18, pushOut18, crChunk18, iceRect18, iceHit18, iceArea18, iceAuto18, proj18,
  pitCell18, pitAt18, pitFind18, burnGround18, spawnWiz18, wizCast18, spellLand18, wizN18, objSpawn18, objList18, gate18Init, gateMissed18, openGateRe18, mkt18, smithT18, disc18, bonus18, smithLine18, road18, vib18, compass18, meters18, arrowSub18,
  vCard: typeof vCard === 'function' ? vCard : undefined, mkSellPrice, villageScore: typeof villageScore === 'function' ? villageScore : undefined, VMAX, VILLAGE, HOME, CARD_ORDER, VPLOTS, PLOT_OF, migrate, defSave, SAVE_V, ETYPES, HEX, attack, novaBlast, openMarket, openGate });
})();
