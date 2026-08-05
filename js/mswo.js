/* 螢火平台 MVP · MSWO 多刺激不替換偏好評估
   v2：每個刺激物都是可玩的小遊戲。選中後開啟遊戲區，系統記錄
   互動時長（dwell）與互動次數（taps），兩者皆為真實測量。
   偏好指數 = 0.5 × 順位分 + 0.3 × 正規化互動時長 + 0.2 × 正規化互動頻率 */
(function(global){
"use strict";
const $ = s => document.querySelector(s);
const ITEMS = global.FF_ITEMS.MSWO_ITEMS;
const Store = global.FF_STORE;

const M = { active:false, remaining:[], results:[], round:0,
            playingKey:null, playStart:0, dwellTick:null, interactions:0, cleanup:null };
let ui = {};

/* ---------- 低刺激音效（Web Audio，音量上限 0.12，修訂 C2） ---------- */
let actx = null;
function tone(freq, dur, type, vol){
  if(!Store.getSettings().sound) return;
  try{
    actx = actx || new (window.AudioContext || window.webkitAudioContext)();
    if(actx.state === "suspended") actx.resume();
    const o = actx.createOscillator(), g = actx.createGain();
    o.type = type || "sine"; o.frequency.value = freq;
    const v = Math.min(vol || 0.1, 0.12), t = actx.currentTime;
    g.gain.setValueAtTime(0.0001, t);
    g.gain.exponentialRampToValueAtTime(v, t + 0.02);
    g.gain.exponentialRampToValueAtTime(0.0001, t + (dur || 0.2));
    o.connect(g).connect(actx.destination);
    o.start(t); o.stop(t + (dur || 0.2) + 0.05);
  }catch(e){}
}

function bindUI(){
  ui = {
    stage: $("#mswoStage"), cards: $("#mswoCards"), play: $("#playarea"), bubble: $("#mswoBubble"),
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
  ui.play.hidden = true; ui.play.innerHTML = "";
  ui.cards.style.display = "";
  renderCards();
  say(M.round===1 ? "選一個你想玩的！" : "再選一個！");
}
function renderCards(){
  ui.cards.innerHTML = "";
  shuffle(M.remaining).forEach(item=>{
    const b = document.createElement("button");
    b.className = "stimcard"; b.dataset.key = item.key;
    b.innerHTML = `<svg viewBox="0 0 100 100">${item.svg}</svg><div class="nm">${item.name}</div>`;
    b.addEventListener("click", ()=>pick(item));
    ui.cards.appendChild(b);
  });
}

/* ---------- 選中 → 開啟小遊戲 ---------- */
function pick(item){
  if(M.playingKey) return;
  M.playingKey = item.key; M.playStart = performance.now(); M.interactions = 0;
  ui.cards.style.display = "none";
  ui.play.hidden = false;
  say(`你選了${item.name}，玩玩看吧！`);
  ui.doneBtn.hidden = false;
  const hit = ()=>{ M.interactions++; };
  M.cleanup = (GAMES[item.key] || GAMES._fallback)(ui.play, hit, tone);
  M.dwellTick = setInterval(()=>{
    const s = ((performance.now()-M.playStart)/1000).toFixed(1);
    ui.dwell.textContent = `互動 ${s}s · ${M.interactions} 次`;
  },100);
}
function finishInteraction(){
  if(!M.playingKey) return;
  clearInterval(M.dwellTick); ui.dwell.textContent = "";
  if(M.cleanup){ try{ M.cleanup(); }catch(e){} M.cleanup = null; }
  const dwell = (performance.now()-M.playStart)/1000;
  const item = ITEMS.find(i=>i.key===M.playingKey);
  M.results.push({ stimulus_item_id:item.key, name:item.name,
    rank:M.results.length+1, dwell_s:+dwell.toFixed(1), interactions:M.interactions });
  M.remaining = M.remaining.filter(i=>i.key!==M.playingKey); // 不替換
  M.playingKey = null;
  ui.doneBtn.hidden = true;
  nextRound();
}
function complete(){
  M.active = false;
  const n = M.results.length;
  const maxDwell = Math.max(...M.results.map(r=>r.dwell_s), 0.1);
  const maxRate  = Math.max(...M.results.map(r=>r.interactions/Math.max(r.dwell_s,0.5)), 0.1);
  M.results.forEach(r=>{
    const rankScore  = (n - r.rank + 1) / n;                                  // 先選 → 高分
    const dwellScore = r.dwell_s / maxDwell;                                  // 玩多久
    const rateScore  = (r.interactions/Math.max(r.dwell_s,0.5)) / maxRate;    // 玩得多投入
    r.preference_index = +(0.5*rankScore + 0.3*dwellScore + 0.2*rateScore).toFixed(2);
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
  ui.cards.innerHTML = ""; ui.play.hidden = true; ui.play.innerHTML = "";
  ui.round.textContent = "–";
  renderPrefTable();
  if(global.FF_APP) global.FF_APP.refreshHome();
}
function renderPrefTable(){
  const pref = Store.getPreference();
  if(!pref){ ui.prefTable.innerHTML = `<p style="color:var(--ink-soft);font-size:13.5px">尚未執行評估。</p>`; return; }
  const rows = pref.items.map((r,i)=>`
    <tr><td>${i+1}. ${r.name} ${i===0?'<span class="tag honey">主要增強物</span>':""}</td>
    <td style="width:34%"><div class="bar ${i===0?"honey":""}"><i style="width:${Math.round(r.preference_index*100)}%"></i></div></td>
    <td class="mono">${r.preference_index}</td><td class="mono">${r.dwell_s}s</td><td class="mono">${r.interactions ?? "—"} 次</td></tr>`).join("");
  ui.prefTable.innerHTML = `<table><tr><th>刺激物（依偏好排序）</th><th>偏好指數</th><th>指數</th><th>互動時長</th><th>互動次數</th></tr>${rows}</table>
  <div class="note">評估時間：${new Date(pref.assessed_at).toLocaleString("zh-TW")} · 指數 = 順位 0.5 + 互動時長 0.3 + 互動頻率 0.2（權重見 docs/05）。</div>`;
}

/* ================================================================
   五個低刺激小遊戲。每個 mount(area, hit, tone) 回傳 cleanup 函式。
   共同約束（修訂 C2）：無高頻閃爍、音量上限 0.12、色彩取自平台色票。
   ================================================================ */
const GAMES = {

  /* 彩光泡泡：泡泡緩緩上升，點一下戳破 */
  bubbles(area, hit, tone){
    area.innerHTML = `<div class="pa-hint">點泡泡，把它們戳破！</div>`;
    let alive = true;
    const palette = [[159,198,216],[201,169,214],[168,214,182],[226,205,141],[216,169,160]];
    function spawn(){
      if(!alive) return;
      const b = document.createElement("button");
      b.className = "pa-bubble";
      const size = 38 + Math.random()*46;
      b.style.width = b.style.height = size+"px";
      b.style.left = (4 + Math.random()*86) + "%";
      b.style.setProperty("--rise", (5.5 + Math.random()*3).toFixed(1)+"s");
      const c = palette[Math.floor(Math.random()*palette.length)];
      b.style.background = `radial-gradient(circle at 32% 28%, rgba(255,255,255,.95), rgba(${c[0]},${c[1]},${c[2]},.75))`;
      b.setAttribute("aria-label","泡泡");
      b.addEventListener("click", ()=>{
        if(b.dataset.pop) return; b.dataset.pop = "1";
        hit(); tone(460 + Math.random()*280, 0.15, "sine", 0.09);
        b.classList.add("pop"); setTimeout(()=>b.remove(), 200);
      });
      area.appendChild(b);
      setTimeout(()=>{ if(b.isConnected) b.remove(); }, 9500);
    }
    spawn(); spawn();
    const iv = setInterval(spawn, 900);
    return ()=>{ alive=false; clearInterval(iv); };
  },

  /* 音樂盒：六個琴鍵，點了會發出柔和音階 */
  musicbox(area, hit, tone){
    area.innerHTML = `<div class="pa-hint">點琴鍵，彈你自己的歌！</div><div class="pa-keys"></div>`;
    const keys = area.querySelector(".pa-keys");
    const notes = [["Do",262,"#9FC6D8"],["Re",294,"#C9A9D6"],["Mi",330,"#A8D6B6"],
                   ["Sol",392,"#E2CD8D"],["La",440,"#D8A9A0"],["Do′",523,"#9FB8D8"]];
    notes.forEach(([nm,f,c])=>{
      const k = document.createElement("button");
      k.className = "pa-key"; k.style.background = c; k.textContent = nm;
      k.addEventListener("click", ()=>{
        hit(); tone(f, 0.4, "sine", 0.11);
        k.classList.add("on"); setTimeout(()=>k.classList.remove("on"), 200);
      });
      keys.appendChild(k);
    });
    return ()=>{};
  },

  /* 彈跳小火車：點小火車，它會跳一下往前跑，跑到底再繞回來 */
  train_bounce(area, hit, tone){
    const svg = ITEMS.find(i=>i.key==="train_bounce").svg;
    area.innerHTML = `<div class="pa-hint">點小火車，讓它往前跑！</div>
      <div class="pa-track"></div>
      <button class="pa-train" aria-label="小火車"><svg viewBox="0 0 100 100">${svg}</svg></button>`;
    const tr = area.querySelector(".pa-train");
    let x = 4, taps = 0;
    tr.style.left = x + "%";
    tr.addEventListener("click", ()=>{
      hit(); taps++;
      x += 11;
      if(x > 84){ x = 4; tr.style.transition = "none"; tr.style.left = x+"%";
        requestAnimationFrame(()=>{ tr.style.transition = ""; }); }
      else tr.style.left = x + "%";
      tr.classList.remove("hop"); void tr.offsetWidth; tr.classList.add("hop");
      tone(175, 0.12, "triangle", 0.09);
      if(taps % 5 === 0) setTimeout(()=>tone(523, 0.3, "sine", 0.1), 130); // 每五下鳴笛
    });
    return ()=>{};
  },

  /* 發光齒輪：點一下加速，兩個齒輪互相咬合反向轉動，會慢慢減速 */
  gear(area, hit, tone){
    const svg = ITEMS.find(i=>i.key==="gear").svg;
    area.innerHTML = `<div class="pa-hint">點齒輪，讓它們轉起來！</div>
      <div class="pa-gearwrap" role="button" aria-label="齒輪">
        <div class="pa-gear g1"><svg viewBox="0 0 100 100">${svg}</svg></div>
        <div class="pa-gear g2"><svg viewBox="0 0 100 100">${svg}</svg></div>
      </div>`;
    const g1 = area.querySelector(".g1"), g2 = area.querySelector(".g2");
    let v = 0, a = 0, alive = true, raf;
    function loop(){
      if(!alive) return;
      a += v/60; v *= 0.985;
      g1.style.transform = `rotate(${a}deg)`;
      g2.style.transform = `rotate(${-a*1.45}deg)`;
      raf = requestAnimationFrame(loop);
    }
    loop();
    area.querySelector(".pa-gearwrap").addEventListener("click", ()=>{
      hit(); v = Math.min(v + 150, 480);
      tone(280 + v/5, 0.1, "triangle", 0.07);
    });
    return ()=>{ alive=false; if(raf) cancelAnimationFrame(raf); };
  },

  /* 虛擬風車：點一下等於吹一口氣，扇葉加速旋轉後緩緩停下 */
  pinwheel(area, hit, tone){
    area.innerHTML = `<div class="pa-hint">點一下，吹一口氣讓風車轉！</div>
      <div class="pa-pinzone" role="button" aria-label="風車">
        <div class="pa-blades"><svg viewBox="0 0 100 100">
          <path d="M50 50 L50 14 Q70 17 64 38 Z" fill="#7FA8C9"/>
          <path d="M50 50 L86 50 Q83 70 62 64 Z" fill="#A8C9A0"/>
          <path d="M50 50 L50 86 Q30 83 36 62 Z" fill="#C9A0A8"/>
          <path d="M50 50 L14 50 Q17 30 38 36 Z" fill="#C9BC7F"/>
          <circle cx="50" cy="50" r="6" fill="#5B6E65"/></svg></div>
        <div class="pa-stick"></div>
        <div class="pa-puff" aria-hidden="true">呼～</div>
      </div>`;
    const blades = area.querySelector(".pa-blades");
    const puff = area.querySelector(".pa-puff");
    let v = 0, a = 0, alive = true, raf;
    function loop(){
      if(!alive) return;
      a += v/60; v *= 0.988;
      blades.style.transform = `rotate(${a}deg)`;
      raf = requestAnimationFrame(loop);
    }
    loop();
    area.querySelector(".pa-pinzone").addEventListener("click", ()=>{
      hit(); v = Math.min(v + 220, 620);
      tone(660, 0.18, "sine", 0.06);
      puff.classList.remove("go"); void puff.offsetWidth; puff.classList.add("go");
    });
    return ()=>{ alive=false; if(raf) cancelAnimationFrame(raf); };
  },

  _fallback(area, hit){
    area.innerHTML = `<div class="pa-hint">點一點看看！</div>`;
    area.addEventListener("click", hit);
    return ()=>{};
  }
};

global.FF_MSWO = { bindUI, renderPrefTable };
})(window);
