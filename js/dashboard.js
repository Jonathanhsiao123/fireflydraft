/* 螢火平台 MVP · 數據儀表板：一切統計由本機真實試驗紀錄計算 */
(function(global){
"use strict";
const $ = s => document.querySelector(s);
const Store = global.FF_STORE;
const ITEMS = global.FF_ITEMS.DTT_ITEMS;

function bindUI(){
  $("#exportBtn").addEventListener("click", exportJSON);
  $("#importFile").addEventListener("change", importJSON);
  $("#wipeBtn").addEventListener("click", ()=>{
    if(confirm("確定清除此瀏覽器內的所有會話與偏好資料？此動作無法復原。")){
      Store.wipe(); render(); if(global.FF_APP){ global.FF_APP.refreshHome(); global.FF_APP.loadSettings(); }
      if(global.FF_MSWO) global.FF_MSWO.renderPrefTable();
    }
  });
}

function dttTrials(){
  return Store.dttSessions().flatMap(s=>s.trials.filter(t=>t.target_skill_domain==="noun_picture_identification"));
}

function render(){
  const sessions = Store.dttSessions();
  const trials = dttTrials();
  $("#dSessions").textContent = sessions.length;
  $("#dTrials").textContent = trials.length;
  const indep = trials.filter(t=>t.response_classification==="correct").length;
  $("#dAcc").textContent = trials.length ? Math.round(100*indep/trials.length)+"%" : "—";
  const lats = trials.filter(t=>typeof t.response_latency_ms==="number").map(t=>t.response_latency_ms);
  $("#dLat").textContent = lats.length ? Math.round(lats.reduce((a,b)=>a+b,0)/lats.length)+" ms" : "—";
  renderAccChart(sessions);
  renderClsChart(trials);
  renderLevels(sessions);
  renderSessionList();
}

/* 折線圖：各會話獨立正確率 */
function renderAccChart(sessions){
  const el = $("#chartAcc");
  const pts = sessions.map(s=>{
    const t = s.trials.filter(x=>x.target_skill_domain==="noun_picture_identification");
    return t.length ? Math.round(100*t.filter(x=>x.response_classification==="correct").length/t.length) : null;
  }).filter(v=>v!==null);
  if(pts.length===0){ el.innerHTML = `<p style="color:var(--ink-soft);font-size:13.5px">完成第一場 DTT 會話後，趨勢線會出現在這裡。</p>`; return; }
  const W=520,H=200,pad=36;
  const xs = i => pts.length===1 ? W/2 : pad + i*(W-pad-14)/(pts.length-1);
  const ys = v => H-24 - (v/100)*(H-48);
  const line = pts.map((v,i)=>`${i?"L":"M"}${xs(i).toFixed(1)},${ys(v).toFixed(1)}`).join(" ");
  const dots = pts.map((v,i)=>`<circle cx="${xs(i).toFixed(1)}" cy="${ys(v).toFixed(1)}" r="4.5" fill="#3E6B5C"/>
    <text x="${xs(i).toFixed(1)}" y="${(ys(v)-10).toFixed(1)}" font-size="10.5" font-family="IBM Plex Mono" fill="#5B6E65" text-anchor="middle">${v}%</text>`).join("");
  el.innerHTML = `<svg viewBox="0 0 ${W} ${H}" style="width:100%" role="img" aria-label="獨立正確率趨勢">
    <g stroke="#DFE9E3">${[0,50,100].map(v=>`<line x1="${pad}" y1="${ys(v)}" x2="${W-10}" y2="${ys(v)}"/>`).join("")}</g>
    <g font-size="10" font-family="IBM Plex Mono" fill="#5B6E65">${[0,50,100].map(v=>`<text x="4" y="${ys(v)+3}">${v}%</text>`).join("")}</g>
    <path d="${line}" fill="none" stroke="#3E6B5C" stroke-width="3" stroke-linecap="round"/>${dots}</svg>`;
}

/* 橫條圖：反應分類分佈 */
function renderClsChart(trials){
  const el = $("#chartCls");
  if(trials.length===0){ el.innerHTML = `<p style="color:var(--ink-soft);font-size:13.5px">尚無資料。</p>`; return; }
  const kinds = [
    ["correct","獨立正確","#3E6B5C"],["prompted_correct","提示下正確","#6E5B94"],
    ["incorrect","錯誤","#B5544D"],["no_response","無反應","#8A6516"]
  ];
  const total = trials.length;
  el.innerHTML = kinds.map(([k,zh,color])=>{
    const n = trials.filter(t=>t.response_classification===k).length;
    const pct = Math.round(100*n/total);
    return `<div style="display:flex;align-items:center;gap:10px;padding:7px 0">
      <span style="width:110px;font-size:13px">${zh}</span>
      <div class="bar" style="flex:1"><i style="width:${pct}%;background:${color}"></i></div>
      <span class="mono" style="width:86px;text-align:right">${n} 筆 · ${pct}%</span></div>`;
  }).join("");
}

/* 各目標提示層級 */
function renderLevels(sessions){
  const el = $("#targetLevels");
  const last = sessions.slice(-1)[0];
  if(!last || !last.levelsAtEnd){ el.innerHTML = `<p style="color:var(--ink-soft);font-size:13.5px">尚無資料。</p>`; return; }
  const rows = ITEMS.map(it=>{
    const lv = last.levelsAtEnd[it.key] ?? "—";
    const pct = lv==="—" ? 0 : Math.round(100*(3-lv)/3);
    return `<tr><td>${it.name}</td>
      <td style="width:44%"><div class="bar"><i style="width:${pct}%"></i></div></td>
      <td class="mono">L${lv}${lv===0?' <span class="tag">已獨立</span>':""}</td></tr>`;
  }).join("");
  el.innerHTML = `<table><tr><th>目標</th><th>褪除進度（L3 → L0）</th><th>層級</th></tr>${rows}</table>`;
}

function renderSessionList(){
  const el = $("#sessionList");
  const all = Store.allSessions().slice().reverse();
  if(all.length===0){ el.innerHTML = `<p style="color:var(--ink-soft);font-size:13.5px">尚無資料。</p>`; return; }
  const rows = all.map(s=>{
    const d = new Date(s.started_at).toLocaleString("zh-TW",{month:"2-digit",day:"2-digit",hour:"2-digit",minute:"2-digit"});
    if(s.module==="mswo") return `<tr><td class="mono">${d}</td><td><span class="tag ai">MSWO</span></td><td>最高偏好：${s.result?.items?.[0]?.name ?? "—"}</td></tr>`;
    const t = s.trials, ind = t.filter(x=>x.response_classification==="correct").length;
    const reason = s.end_reason==="assent_withdrawn" ? ' <span class="tag clay">個案中止</span>' : "";
    return `<tr><td class="mono">${d}</td><td><span class="tag">DTT</span></td><td>${t.length} 試驗 · 獨立 ${t.length?Math.round(100*ind/t.length):0}%${reason}</td></tr>`;
  }).join("");
  el.innerHTML = `<table><tr><th>時間</th><th>模組</th><th>摘要</th></tr>${rows}</table>`;
}

/* 匯出 / 匯入 */
function exportJSON(){
  const blob = new Blob([Store.exportJSON()], {type:"application/json"});
  const a = document.createElement("a");
  a.href = URL.createObjectURL(blob);
  a.download = `firefly-export-${Store.getSettings().pseudonym}-${new Date().toISOString().slice(0,10)}.json`;
  a.click(); URL.revokeObjectURL(a.href);
}
function importJSON(e){
  const f = e.target.files[0]; if(!f) return;
  const r = new FileReader();
  r.onload = ()=>{
    try{ const n = Store.importJSON(r.result); alert(`匯入完成，目前共 ${n} 場會話。`); render();
      if(global.FF_APP){ global.FF_APP.refreshHome(); global.FF_APP.loadSettings(); }
      if(global.FF_MSWO) global.FF_MSWO.renderPrefTable();
    }catch(err){ alert("匯入失敗："+err.message); }
    e.target.value = "";
  };
  r.readAsText(f);
}

global.FF_DASH = { bindUI, render };
})(window);
