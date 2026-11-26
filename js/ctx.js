/* =====================================================================
   ctx.js — shared late-bound context for game modules
   main.js populates this object as systems come online; feature
   modules (quests, npc, homes, minigames, inventory) read from it at
   runtime so cross-module calls stay decoupled at import time.
   ===================================================================== */
export const ctx = {};

export const $ = (id) => document.getElementById(id);
