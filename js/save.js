/* =====================================================================
   save.js — persistence, migration, export & import
   Save format v3 (older unversioned saves are migrated on load):

   {
     v: 3,
     character, cfgs, mode,
     purchases, spent,
     settings: { music, shadows, effects, trail, pet, quality },
     progress: { xp, candies, quests, collected, met, games }
   }
   ===================================================================== */
import { ctx } from './ctx.js';

export const STORE_KEY = 'trepio-doll-v2';
export const SAVE_VERSION = 3;

const DEFAULT_GAMES = { catchBest: 0, raceBest: null, catchFirst: false, raceFirst: false };

/** bring any historical save shape up to v3 */
export function migrate(s, reducedMotion) {
  s = s || {};
  s.settings = { music: true, shadows: true, effects: !reducedMotion, trail: true, pet: null, quality: 'auto', ...(s.settings || {}) };
  s.purchases = s.purchases || {};
  s.spent = s.spent || 0;
  s.progress = s.progress || { xp: 0, candies: 0, quests: {} };
  s.progress.collected = s.progress.collected || {};
  s.progress.met = s.progress.met || {};
  s.progress.games = { ...DEFAULT_GAMES, ...(s.progress.games || {}) };
  s.character = s.character || 'trixie';
  s.cfgs = s.cfgs || {};
  s.mode = s.mode === 'world' ? 'world' : 'studio';
  s.v = SAVE_VERSION;
  return s;
}

export function fresh(reducedMotion) {
  return migrate({
    character: 'trixie',
    cfgs: {},
    mode: 'studio',
    progress: { xp: 0, candies: 0, quests: {}, collected: {}, met: {}, games: { ...DEFAULT_GAMES } },
    purchases: {},
    spent: 0,
    settings: { music: true, shadows: true, effects: !reducedMotion, trail: true, pet: null, quality: 'auto' },
  }, reducedMotion);
}

export function load(reducedMotion) {
  try {
    const raw = localStorage.getItem(STORE_KEY);
    if (raw) return migrate(JSON.parse(raw), reducedMotion);
  } catch { /* ignore */ }
  return fresh(reducedMotion);
}

/** persist current state; called with the live objects */
export function save() {
  try {
    const ser = ctx.progress.serialize();
    ser.collected = ctx.state.progress.collected;
    ser.met = ctx.state.progress.met;
    ser.games = ctx.state.progress.games;
    localStorage.setItem(STORE_KEY, JSON.stringify({
      v: SAVE_VERSION,
      ...ctx.state,
      progress: ser,
    }));
  } catch { /* ignore */ }
}

/** full save as a pretty JSON string (for downloads / clipboard) */
export function exportSave() {
  const ser = ctx.progress.serialize();
  ser.collected = ctx.state.progress.collected;
  ser.met = ctx.state.progress.met;
  ser.games = ctx.state.progress.games;
  return JSON.stringify({ v: SAVE_VERSION, ...ctx.state, progress: ser }, null, 2);
}

/** parse + migrate an exported save. returns { ok, state } or { ok:false, error } */
export function importSave(text) {
  try {
    const data = JSON.parse(text);
    if (!data || typeof data !== 'object') return { ok: false, error: 'Not a valid save file' };
    if (!data.progress && !data.character && !data.settings) return { ok: false, error: 'Not a Trepio save file' };
    const state = migrate(data, false);
    return { ok: true, state };
  } catch (e) {
    return { ok: false, error: 'Could not read the save file' };
  }
}

/** write an imported state to localStorage (page then reloads) */
export function commitImport(state) {
  try {
    localStorage.setItem(STORE_KEY, JSON.stringify({ v: SAVE_VERSION, ...state }));
    return true;
  } catch { return false; }
}
