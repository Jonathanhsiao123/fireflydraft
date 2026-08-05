/* 螢火平台 MVP · DTT 確定性規則引擎（L1 邊緣層，修訂 A1：不依賴任何雲端）
   有限狀態機：IDLE → SD_PRESENTED → AWAIT_RESPONSE → CONSEQUENCE → (INTERTRIAL | ERROR_CORRECTION | BREAK | ENDED)
   無錯誤學習：提示層級依「目標」各自追蹤；連續達標 fadeStreak 次褪除一級，錯誤或逾時回升一級。 */
(function(global){
"use strict";
const $ = s => document.querySelector(s);
const ITEMS = global.FF_ITEMS.DTT_ITEMS;
const Store = global.FF_STORE;

const E = {
  state: "IDLE",
  session: null,       // 累積中的會話物件
  levels: {},          // {itemKey: 0..3}
  streaks: {},         // {itemKey: 連續達標次數}
  tokens: 0,
  trialNo: 0,
  current: null,       // {target, choices, sdAt, isCorrection}
  timeoutHandle: null,
  restHandle: null,
  breaksLeft: 0,
  cfg: null
};

/* ---------- DOM refs（app.js 載入後綁定） ---------- */
let ui = {};
function bindUI(){
  ui = {
    choices: $("#choices"), bubble: $("#bubble"), slots: $("#slots"),
    overlay: $("#overlay"), overlayText: $("#overlayText"),
    log: $("#log"), ladder: $("#ladder"), ladderTarget: $("#ladderTarget"),
    chipState: $("#chipState"), chipTrial: $("#chipTrial"), chipAcc: $("#chipAcc"), chipLat: $("#chipLat"),
    startBtn: $("#startSession"), endBtn: $("#endSession"),
    breakBtn: $("#breakBtn"), breakLeft: $("#breakLeft"), stopBtn: $("#stopBtn"),
    restTimer: $("#restTimer"), hudLeft: $("#hudLeft")
  };
  ui.startBtn.addEventListener("click", startSession);
  ui.endBtn.addEventListener("click", ()=>endSession("completed_manual"));
  ui.breakBtn.addEventListener("click", useBreakCard);
  ui.stopBtn.addEventListener("click", ()=>endSession("assent_withdrawn"));
}

/* ---------- helpers ---------- */
function say(t, speak){ ui.bubble.textContent = t; ui.bubble.classList.add("show"); if(speak!==false) global.FF_SPEAK(t); }
function log(html){
  if(ui.log.textContent.startsWith("—")) ui.log.textContent = "";
  const d = document.createElement("div"); d.innerHTML = html; ui.log.prepend(d);
}
function chips(){
  const t = E.session ? E.session.trials : [];
  const done = t.filter(x=>["correct","prompted_correct","incorrect","no_response"].includes(x.response_classification));
  const indep = t.filter(x=>x.response_classification==="correct").length;
  ui.chipTrial.textContent = `試驗 ${E.trialNo} / ${E.cfg ? E.cfg.trialsPerSession : 0}`;
  ui.chipAcc.textContent = done.length ? `獨立正確率 ${Math.round(100*indep/done.length)}%` : "獨立正確率 —";
}
function setState(s, label){ E.state = s; ui.chipState.textContent = label; }
function ladder(targetKey){
  const lv = E.levels[targetKey] ?? 0;
  ui.ladder.querySelectorAll(".rung").forEach(r=>r.classList.toggle("now", +r.dataset.lv===lv));
  const item = ITEMS.find(i=>i.key===targetKey);
  ui.ladderTarget.textContent = item ? `· 目前目標：${item.name}（L${lv}）` : "";
}
function renderSlots(){
  ui.slots.innerHTML = "";
  for(let i=0;i<E.cfg.tokensRequired;i++){
    const s = document.createElement("div"); s.className = "slot" + (i<E.tokens?" fill":""); ui.slots.appendChild(s);
  }
}
function shuffle(a){ a=a.slice(); for(let i=a.length-1;i>0;i--){const j=Math.floor(Math.random()*(i+1));[a[i],a[j]]=[a[j],a[i]];} return a; }

/* ---------- session lifecycle ---------- */
function startSession(){
  E.cfg = Object.assign({}, Store.getSettings());
  E.session = {
    session_id: global.FF_UUID(),
    module: "dtt",
    started_at: new Date().toISOString(),
    config: { trialsPerSession:E.cfg.trialsPerSession, tokensRequired:E.cfg.tokensRequired,
              fadeStreak:E.cfg.fadeStreak, timeoutSec:E.cfg.timeoutSec, breakCards:E.cfg.breakCards },
    trials: []
  };
  E.levels = {}; E.streaks = {}; ITEMS.forEach(i=>{ E.levels[i.key]=3; E.streaks[i.key]=0; }); // 新技能自 L3 全提示起步（無錯誤學習）
  // 若過往會話已有紀錄，沿用最近會話結束層級
  const prev = Store.dttSessions().slice(-1)[0];
  if(prev && prev.levelsAtEnd) Object.keys(prev.levelsAtEnd).forEach(k=>{ if(k in E.levels) E.levels[k]=prev.levelsAtEnd[k]; });
  E.tokens = 0; E.trialNo = 0; E.breaksLeft = E.cfg.breakCards;
  ui.startBtn.disabled = true; ui.endBtn.disabled = false;
  ui.breakBtn.hidden = E.breaksLeft<=0; ui.breakLeft.textContent = E.breaksLeft;
  ui.stopBtn.hidden = false;
  ui.log.textContent = "— 尚無試驗 —";
  renderSlots(); chips();
  $("#fadeRuleTxt").textContent = E.cfg.fadeStreak;
  $("#timeoutTxt").textContent = E.cfg.timeoutSec;
  log(`<span class="h">session_start · ${E.session.session_id.slice(0,8)} · 沿用上次結束層級：${prev? "是":"否（全目標 L3 起步）"}</span>`);
  say("我們來玩找圖遊戲吧！", true);
  setTimeout(nextTrial, 1400);
}

function endSession(reason){
  clearTimeout(E.timeoutHandle); clearInterval(E.restHandle);
  if(!E.session){ return; }
  E.session.ended_at = new Date().toISOString();
  E.session.end_reason = reason;
  E.session.levelsAtEnd = Object.assign({}, E.levels);
  // assent：中止時當前未完成試驗記錄為 withdraw
  Store.addSession(E.session);
  const t = E.session.trials, indep = t.filter(x=>x.response_classification==="correct").length;
  const msg = reason==="assent_withdrawn" ? "好的，我們今天到這裡，謝謝你告訴我！" : "今天玩得很棒，下次見！";
  say(msg, true);
  ui.overlayText.innerHTML = `✦ 會話已儲存 ✦<small>${t.length} 筆試驗 · 獨立正確 ${indep} 筆 · 結束原因：${reason==="assent_withdrawn"?"個案中止（assent）":reason==="completed_auto"?"達成試驗數":"手動結束"}</small>`;
  ui.overlay.classList.add("show");
  setTimeout(()=>ui.overlay.classList.remove("show"), 3000);
  log(`<span class="h">session_end · ${reason} · 已寫入本機儲存</span>`);
  E.session = null; E.current = null;
  setState("IDLE","待機");
  ui.startBtn.disabled = false; ui.endBtn.disabled = true;
  ui.breakBtn.hidden = true; ui.stopBtn.hidden = true;
  if(global.FF_APP) global.FF_APP.refreshHome();
}

/* ---------- trial flow ---------- */
function nextTrial(correctionTarget){
  if(!E.session) return;
  if(!correctionTarget && E.trialNo >= E.cfg.trialsPerSession){ endSession("completed_auto"); return; }
  if(!correctionTarget) E.trialNo++; // 錯誤修正試驗不計入會話試驗數（保留完整紀錄，僅不佔額度）
  const pool = shuffle(ITEMS);
  const target = correctionTarget ? ITEMS.find(i=>i.key===correctionTarget) : pool[0];
  const distractors = shuffle(ITEMS.filter(i=>i.key!==target.key)).slice(0,2);
  const choices = shuffle([target, ...distractors]);
  E.current = { target: target.key, choices: choices.map(c=>c.key), isCorrection: !!correctionTarget, sdAt: 0 };
  renderChoices(choices, target.key);
  ladder(target.key);
  const lv = E.levels[target.key];
  say(`把${target.name}指出來`);
  setState("AWAIT_RESPONSE", `等待反應 · L${lv}`);
  E.current.sdAt = performance.now();
  chips();
  clearTimeout(E.timeoutHandle);
  E.timeoutHandle = setTimeout(()=>classify(null), E.cfg.timeoutSec*1000);
}

function renderChoices(choices, targetKey){
  ui.choices.innerHTML = "";
  choices.forEach(item=>{
    const b = document.createElement("button");
    b.className = "obj"; b.dataset.key = item.key; b.setAttribute("aria-label", item.name);
    b.innerHTML = `<svg viewBox="0 0 100 100">${item.svg}</svg>`;
    // 所有選項一律等大等亮呈現，不對目標加任何視覺提示（光暈/箭頭）
    b.addEventListener("click", ()=>classify(item.key));
    ui.choices.appendChild(b);
  });
}

function classify(clickedKey){
  if(E.state!=="AWAIT_RESPONSE" || !E.current || !E.session) return;
  clearTimeout(E.timeoutHandle);
  const latency = Math.round(performance.now() - E.current.sdAt);
  const tKey = E.current.target;
  const lv = E.levels[tKey];
  const item = ITEMS.find(i=>i.key===tKey);
  let cls;
  if(clickedKey===null) cls = "no_response";
  else if(clickedKey===tKey) cls = (lv===0 ? "correct" : "prompted_correct");
  else cls = "incorrect";

  const rec = {
    trial_id: global.FF_UUID(),
    session_id: E.session.session_id,
    target_skill_domain: "noun_picture_identification",
    discriminative_stimulus: { content_text:`把${item.name}指出來`, modality: Store.getSettings().sound?"voice+ar_visual":"ar_visual" },
    prompt_hierarchy_level: lv,
    response_latency_ms: clickedKey===null ? null : latency,
    response_classification: cls,
    applied_consequence: "",
    assent_status: "engaged",
    is_error_correction: E.current.isCorrection,
    ts: new Date().toISOString()
  };

  ui.chipLat.textContent = clickedKey===null ? `延遲 >${E.cfg.timeoutSec}s` : `延遲 ${latency} ms`;
  setState("CONSEQUENCE","派發後果");

  if(cls==="correct" || cls==="prompted_correct"){
    E.streaks[tKey]++;
    rec.applied_consequence = "token+1";
    log(`<span class="${cls==="correct"?"c":"p"}">${cls}</span> · ${item.name} · L${lv} · ${latency}ms · +1 token`);
    say(cls==="correct" ? "太棒了，你自己找到了！" : "很好，跟著提示完成了！");
    // 提示褪除
    if(E.streaks[tKey] >= E.cfg.fadeStreak && lv > 0){
      E.levels[tKey] = lv-1; E.streaks[tKey] = 0;
      log(`<span class="h">prompt_fading · ${item.name} L${lv}→L${lv-1}（連續達標 ${E.cfg.fadeStreak} 次）</span>`);
    }
    E.session.trials.push(rec);
    addToken(()=> setTimeout(()=>nextTrial(), 1100));
  }else{
    // 錯誤修正（無錯誤學習）：層級回升一級，原題重現
    E.streaks[tKey] = 0;
    const newLv = Math.min(3, lv+1);
    E.levels[tKey] = newLv;
    rec.applied_consequence = "error_correction";
    E.session.trials.push(rec);
    log(`<span class="x">${cls}</span> · ${item.name} · L${lv} · ${clickedKey===null?"逾時":latency+"ms"}`);
    log(`<span class="h">error_correction · 環境重置 · 提示回升 L${lv}→L${newLv} · 原題重現</span>`);
    say("沒關係，我們再試一次");
    ui.choices.innerHTML = ""; // 環境重置
    setTimeout(()=>nextTrial(tKey), 1000);
  }
  chips(); ladder(tKey);
}

/* ---------- token economy ---------- */
function addToken(after){
  E.tokens++;
  renderSlots();
  if(E.tokens >= E.cfg.tokensRequired){
    const pref = Store.getPreference();
    const top = pref && pref.items && pref.items[0] ? pref.items[0].name : "柔光星星";
    setTimeout(()=>{
      const low = Store.getSettings().lowStim;
      ui.overlayText.innerHTML = `✦ 做得很好 ✦<small>解鎖增強物：「${top}」${low?"（低刺激模式：柔光 + 短音效，依感官設定檔）":""}</small>`;
      ui.overlay.classList.add("show");
      global.FF_SPEAK("做得很好！");
      log(`<span class="h">token_board 集滿 → 遞送主要增強物：「${top}」${pref?"（來自 MSWO 偏好矩陣）":"（預設，尚未執行 MSWO）"}</span>`);
      setTimeout(()=>{ ui.overlay.classList.remove("show"); E.tokens=0; renderSlots(); if(after) after(); }, 2400);
    }, 450);
  }else if(after) after();
}

/* ---------- FCT 休息卡 ---------- */
function useBreakCard(){
  if(E.breaksLeft<=0 || !E.session || E.state==="BREAK") return;
  E.breaksLeft--;
  ui.breakLeft.textContent = E.breaksLeft;
  if(E.breaksLeft<=0) ui.breakBtn.hidden = true;
  clearTimeout(E.timeoutHandle);
  ui.choices.innerHTML = ""; // 撤除任務（負增強）
  setState("BREAK","休息中");
  say("好的，我們休息一下");
  log(`<span class="p">break_card_used · 撤除任務（負增強）· ${Store.getSettings().breakLenSec}s · 本會話剩 ${E.breaksLeft} 次（BCBA 授權參數）</span>`);
  E.session.trials.push({
    trial_id: global.FF_UUID(), session_id: E.session.session_id,
    target_skill_domain: "fct_break_request",
    response_classification: "correct", prompt_hierarchy_level: 0,
    response_latency_ms: null, applied_consequence: "task_removed_negative_reinforcement",
    assent_status: "engaged", ts: new Date().toISOString()
  });
  let t = Store.getSettings().breakLenSec;
  const chip = ui.restTimer;
  chip.classList.add("show");
  const fmt = n => `休息 ${String(Math.floor(n/60)).padStart(2,"0")}:${String(n%60).padStart(2,"0")}`;
  chip.textContent = fmt(t);
  E.restHandle = setInterval(()=>{
    t--; chip.textContent = fmt(t);
    if(t<=0){
      clearInterval(E.restHandle); chip.classList.remove("show");
      if(!E.session) return;
      say("休息結束，我們慢慢來");
      setTimeout(()=>nextTrial(), 1200);
    }
  },1000);
}

global.FF_ENGINE = { bindUI, isActive: ()=>!!E.session };
})(window);
