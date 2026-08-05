/* 螢火平台 MVP · MSWO 多刺激不替換偏好評估
   流程：五項刺激 → 「選一個」 → 互動計時（dwell）→ 「玩好了」移除不替換 → 重排 → 重複
   偏好指數 = 0.6 × 順位分 + 0.4 × 正規化互動時長（見 docs/05） */
(function(global){
"use strict";
const $ = s => document.querySelector(s);
const ITEMS = global.FF_ITEMS.MSWO_ITEMS;
const Store = global.FF_STORE;

const M = { active:false, remaining:[], results:[], round:0, playingKey:null, playStart:0, dwellTick:null };
let ui = {};

function bindUI(){
  ui = {
    stage: $("#mswoStage"), cards: $("#mswoCards"), bubble: $("#mswoBubble"),
    round: $("#mswoRound"), dwell: $("#mswoDwell"),
    startBtn: $("#mswoStart"), doneBtn: $("#mswoDone"),
    overlay: $("#mswoOverlay"), overlayText: $("#mswoOverlayText"),
    prefTable: $("#prefTable")
  };
  ui.startBtn.addEventListener("click", start);
  ui.doneBtn.addEventListener("click", finishInteraction);
  renderPrefTable();
}

function shuffle(a){ a=a.slice(); for(let i=a.length-1;i>0;i--){const j=Math.floor(Math.random()*(i+1));[a[i],a[j]]=[a[j],a[i]];} return a; }
function say(t){ ui.bubble.textContent = t; ui.bubble.classList.add("show"); global.FF_SPEAK(t); }

function start(){
  M.active = true; M.remaining = shuffle(ITEMS); M.results = []; M.round = 0;
  ui.startBtn.disabled = true;
  nextRound();
}
function nextRound(){
  if(M.remaining.length===0){ complete(); return; }
  M.round++;
  ui.round.textContent = M.round;
  renderCards();
  say(M.round===1 ? "選一個你想玩的！" : "再選一個！");
}
function renderCards(){
  ui.cards.innerHTML = "";
  shuffle(M.remaining).forEach(item=>{
    const b = document.createElement("button");
    b.className = "stimcard"; b.dataset.key = item.key;
    b.innerHTML = `<svg viewBox="0 0 100 100">${item.svg}</svg><div class="nm">${item.name}</div>`;
    b.addEventListener("click", ()=>pick(item, b));
    ui.cards.appendChild(b);
  });
}
function pick(item, btn){
  if(M.playingKey) return; // 互動期間限制同時接觸其他選項
  M.playingKey = item.key; M.playStart = performance.now();
  [...ui.cards.children].forEach(c=>{ if(c!==btn){ c.style.opacity=".3"; c.disabled=true; } });
  btn.classList.add("playing");
  say(`你選了${item.name}！`);
  ui.doneBtn.hidden = false;
  M.dwellTick = setInterval(()=>{
    const s = ((performance.now()-M.playStart)/1000).toFixed(1);
    ui.dwell.textContent = `互動計時 ${s}s`;
  },100);
}
function finishInteraction(){
  if(!M.playingKey) return;
  clearInterval(M.dwellTick); ui.dwell.textContent = "";
  const dwell = (performance.now()-M.playStart)/1000;
  const item = ITEMS.find(i=>i.key===M.playingKey);
  M.results.push({ stimulus_item_id:item.key, name:item.name, rank:M.results.length+1, dwell_s:+dwell.toFixed(1) });
  M.remaining = M.remaining.filter(i=>i.key!==M.playingKey); // 不替換
  M.playingKey = null;
  ui.doneBtn.hidden = true;
  nextRound();
}
function complete(){
  M.active = false;
  const n = M.results.length;
  const maxDwell = Math.max(...M.results.map(r=>r.dwell_s), 0.1);
  M.results.forEach(r=>{
    const rankScore = (n - r.rank + 1) / n;           // 先選 → 高分
    const dwellScore = r.dwell_s / maxDwell;          // 正規化互動時長
    r.preference_index = +(0.6*rankScore + 0.4*dwellScore).toFixed(2);
  });
  M.results.sort((a,b)=>b.preference_index - a.preference_index);
  const pref = { assessed_at: new Date().toISOString(), method:"MSWO", items:M.results };
  Store.setPreference(pref);
  Store.addSession({ session_id: global.FF_UUID(), module:"mswo",
    started_at: pref.assessed_at, ended_at: pref.assessed_at, trials: [], result: pref });
  ui.overlayText.innerHTML = `✦ 評估完成 ✦<small>最高偏好：「${M.results[0].name}」（指數 ${M.results[0].preference_index}）。DTT 模組將自動採用為主要增強物。</small>`;
  ui.overlay.classList.add("show");
  global.FF_SPEAK("全部玩完了，謝謝你！");
  setTimeout(()=>ui.overlay.classList.remove("show"), 3200);
  ui.startBtn.disabled = false;
  ui.cards.innerHTML = ""; ui.round.textContent = "–";
  renderPrefTable();
  if(global.FF_APP) global.FF_APP.refreshHome();
}
function renderPrefTable(){
  const pref = Store.getPreference();
  if(!pref){ ui.prefTable.innerHTML = `<p style="color:var(--ink-soft);font-size:13.5px">尚未執行評估。</p>`; return; }
  const rows = pref.items.map((r,i)=>`
    <tr><td>${i+1}. ${r.name} ${i===0?'<span class="tag honey">主要增強物</span>':""}</td>
    <td style="width:40%"><div class="bar ${i===0?"honey":""}"><i style="width:${Math.round(r.preference_index*100)}%"></i></div></td>
    <td class="mono">${r.preference_index}</td><td class="mono">${r.dwell_s}s</td></tr>`).join("");
  ui.prefTable.innerHTML = `<table><tr><th>刺激物（依偏好排序）</th><th>偏好指數</th><th>指數</th><th>互動時長</th></tr>${rows}</table>
  <div class="note">評估時間：${new Date(pref.assessed_at).toLocaleString("zh-TW")} · 演算法：順位分 0.6 + 正規化互動時長 0.4（可於 docs/05 調整權重）。</div>`;
}

global.FF_MSWO = { bindUI, renderPrefTable };
})(window);
