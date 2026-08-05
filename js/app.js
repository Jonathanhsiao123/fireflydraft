/* 螢火平台 MVP · 應用外殼：導覽、設定綁定、首頁統計 */
(function(global){
"use strict";
const $ = s => document.querySelector(s);
const Store = global.FF_STORE;

function switchView(id){
  document.querySelectorAll(".view").forEach(v=>v.classList.remove("active"));
  $("#view-"+id).classList.add("active");
  document.querySelectorAll(".navbtn").forEach(b=>b.setAttribute("aria-current", b.dataset.view===id ? "true":"false"));
  if(id==="dash") global.FF_DASH.render();
  window.scrollTo({top:0});
}

function refreshHome(){
  const all = Store.allSessions();
  const dtt = Store.dttSessions();
  const trials = dtt.flatMap(s=>s.trials.filter(t=>t.target_skill_domain==="noun_picture_identification"));
  $("#homeSessions").textContent = all.length;
  $("#homeTrials").textContent = trials.length;
  const last = dtt.slice(-1)[0];
  if(last){
    const t = last.trials.filter(x=>x.target_skill_domain==="noun_picture_identification");
    const ind = t.filter(x=>x.response_classification==="correct").length;
    $("#homeAcc").textContent = t.length ? Math.round(100*ind/t.length)+"%" : "—";
    $("#homeAccSub").textContent = "最近一場 DTT 會話";
  }
  $("#pseudLabel").textContent = "個案："+Store.getSettings().pseudonym + (Store.persistent ? "" : "（無持久化，資料不保存）");
}

/* 設定雙向綁定 */
const FIELDS = [
  ["setPseud","pseudonym","text"],["setLowStim","lowStim","check"],["setSound","sound","check"],
  ["setTrials","trialsPerSession","num"],["setTokens","tokensRequired","num"],
  ["setFade","fadeStreak","num"],["setTimeout","timeoutSec","num"],
  ["setBreaks","breakCards","num"],["setBreakLen","breakLenSec","num"]
];
function loadSettings(){
  const s = Store.getSettings();
  FIELDS.forEach(([id,key,type])=>{
    const el = $("#"+id);
    if(type==="check") el.checked = !!s[key]; else el.value = s[key];
  });
}
function bindSettings(){
  FIELDS.forEach(([id,key,type])=>{
    const el = $("#"+id);
    el.addEventListener("change", ()=>{
      let v;
      if(type==="check") v = el.checked;
      else if(type==="num"){ v = +el.value; if(Number.isNaN(v)) return; v = Math.min(+el.max||1e9, Math.max(+el.min||0, v)); el.value = v; }
      else v = el.value.trim() || "PSN-demo";
      Store.setSettings({[key]:v});
      refreshHome();
    });
  });
}

document.addEventListener("DOMContentLoaded", ()=>{
  document.querySelectorAll(".navbtn").forEach(b=>b.addEventListener("click", ()=>switchView(b.dataset.view)));
  document.querySelectorAll(".modcard").forEach(b=>b.addEventListener("click", ()=>switchView(b.dataset.goto)));
  global.FF_ENGINE.bindUI();
  global.FF_MSWO.bindUI();
  global.FF_DASH.bindUI();
  bindSettings(); loadSettings(); refreshHome();
  if(!Store.persistent){
    const n = document.createElement("div");
    n.className = "note warn"; n.style.margin = "0 26px 12px"; n.style.maxWidth = "1048px";
    n.innerHTML = "<b>提醒：</b>此瀏覽器停用了 localStorage，會話資料將不會保存。請改用一般瀏覽模式或匯出 JSON 備份。";
    document.querySelector("main").prepend(n);
  }
});

global.FF_APP = { refreshHome, loadSettings };
})(window);
