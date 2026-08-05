/* 螢火平台 MVP · 本機資料層
   localStorage 持久化，含降級（無 localStorage 時退回記憶體，資料不落地）。
   對應修訂 D1：不採集影像音訊，資料不離開裝置。 */
(function(global){
"use strict";

const KEY = "firefly_aba_mvp_v1";
const clone = o => JSON.parse(JSON.stringify(o)); // 相容舊平板瀏覽器，不用 structuredClone
let mem = null; // fallback

function canPersist(){
  try{ localStorage.setItem("__ff_t","1"); localStorage.removeItem("__ff_t"); return true; }
  catch(e){ return false; }
}
const PERSIST = canPersist();

const DEFAULTS = {
  version: 1,
  settings: {
    pseudonym: "PSN-demo",
    lowStim: true,
    sound: true,
    trialsPerSession: 20,
    tokensRequired: 5,
    fadeStreak: 4,
    timeoutSec: 10,
    breakCards: 2,
    breakLenSec: 60
  },
  sessions: [],          // {session_id, module, started_at, ended_at, end_reason, trials:[], levelsAtEnd:{}, config:{}}
  preference: null       // {assessed_at, items:[{stimulus_item_id,name,rank,dwell_s,preference_index}]}
};

function load(){
  if(!PERSIST){ if(!mem) mem = clone(DEFAULTS); return mem; }
  try{
    const raw = localStorage.getItem(KEY);
    if(!raw) return clone(DEFAULTS);
    const data = JSON.parse(raw);
    data.settings = Object.assign(clone(DEFAULTS.settings), data.settings||{});
    data.sessions = Array.isArray(data.sessions) ? data.sessions : [];
    return data;
  }catch(e){ return clone(DEFAULTS); }
}
function save(data){
  if(!PERSIST){ mem = data; return; }
  try{ localStorage.setItem(KEY, JSON.stringify(data)); }catch(e){ /* quota */ }
}

const Store = {
  persistent: PERSIST,
  get(){ return load(); },
  getSettings(){ return load().settings; },
  setSettings(patch){
    const d = load(); Object.assign(d.settings, patch); save(d); return d.settings;
  },
  addSession(session){
    const d = load(); d.sessions.push(session); save(d);
  },
  setPreference(pref){
    const d = load(); d.preference = pref; save(d);
  },
  getPreference(){ return load().preference; },
  dttSessions(){ return load().sessions.filter(s=>s.module==="dtt"); },
  allSessions(){ return load().sessions; },
  wipe(){
    if(PERSIST){ try{ localStorage.removeItem(KEY); }catch(e){} }
    mem = null;
  },
  exportJSON(){
    const d = load();
    const payload = {
      exported_at: new Date().toISOString(),
      client_pseudonym_id: d.settings.pseudonym,
      note: "Firefly ABA MVP export. Fields align with schemas/dtt_trial.schema.json. No PII permitted.",
      settings: d.settings,
      preference: d.preference,
      sessions: d.sessions
    };
    return JSON.stringify(payload, null, 2);
  },
  importJSON(text){
    const p = JSON.parse(text);
    if(!p || !Array.isArray(p.sessions)) throw new Error("格式不符：缺少 sessions 陣列");
    const d = load();
    d.settings = Object.assign(d.settings, p.settings||{});
    d.preference = p.preference || d.preference;
    const ids = new Set(d.sessions.map(s=>s.session_id));
    p.sessions.forEach(s=>{ if(!ids.has(s.session_id)) d.sessions.push(s); });
    save(d);
    return d.sessions.length;
  }
};

global.FF_STORE = Store;
global.FF_UUID = function(){
  return (crypto && crypto.randomUUID) ? crypto.randomUUID()
    : "xxxx-4xxx-yxxx".replace(/[xy]/g,c=>{const r=Math.random()*16|0;return (c==="x"?r:(r&0x3|0x8)).toString(16);}) + "-" + Date.now();
};
global.FF_SPEAK = function(text){
  const s = Store.getSettings();
  if(!s.sound || !("speechSynthesis" in window)) return;
  try{
    speechSynthesis.cancel();
    const u = new SpeechSynthesisUtterance(text);
    u.lang = "zh-TW"; u.rate = 0.92; u.pitch = 1.05; u.volume = 0.85; // 音量上限：修訂 C2
    speechSynthesis.speak(u);
  }catch(e){}
};
})(window);
