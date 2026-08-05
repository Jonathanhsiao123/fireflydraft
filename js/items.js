/* 螢火平台 MVP · 刺激物資產庫
   DTT 目標物件與 MSWO 增強物皆定義於此，SVG 為低刺激配色。 */
(function(global){
"use strict";

const PROMPT_WRAP = (inner, haloR) => `
  <circle class="halo" cx="50" cy="56" r="${haloR}" fill="none" stroke="#D9A441" stroke-width="5"/>
  <g class="harrow"><path d="M50 -10 L38 6 H46 V18 H54 V6 H62 Z" fill="#D9A441"/></g>
  ${inner}`;

/* ---------- DTT 目標物件（圖形指認技能池） ---------- */
const DTT_ITEMS = [
  { key:"train", name:"紅色的車子", svg: PROMPT_WRAP(`
      <rect x="14" y="46" width="58" height="28" rx="7" fill="#B5544D"/>
      <rect x="20" y="30" width="24" height="20" rx="5" fill="#B5544D"/>
      <rect x="24" y="34" width="14" height="10" rx="3" fill="#EAF2ED"/>
      <path d="M72 54 h12 a6 6 0 0 1 6 6 v14 h-18 Z" fill="#8F3F39"/>
      <circle cx="30" cy="78" r="9" fill="#22312B"/><circle cx="56" cy="78" r="9" fill="#22312B"/><circle cx="80" cy="78" r="7" fill="#22312B"/>
      <circle cx="30" cy="78" r="3.5" fill="#EAF2ED"/><circle cx="56" cy="78" r="3.5" fill="#EAF2ED"/>`, 47) },
  { key:"apple", name:"蘋果", svg: PROMPT_WRAP(`
      <circle cx="50" cy="60" r="26" fill="#C0554E"/><circle cx="42" cy="52" r="8" fill="rgba(255,255,255,.35)"/>
      <path d="M50 34 Q52 24 60 22" stroke="#5A3C22" stroke-width="4" fill="none"/>
      <ellipse cx="63" cy="26" rx="8" ry="5" fill="#3E6B5C" transform="rotate(-25 63 26)"/>`, 44) },
  { key:"block", name:"藍色積木", svg: PROMPT_WRAP(`
      <rect x="26" y="40" width="48" height="44" rx="7" fill="#4C7FA8"/>
      <circle cx="40" cy="36" r="7" fill="#4C7FA8"/><circle cx="60" cy="36" r="7" fill="#4C7FA8"/>
      <rect x="26" y="40" width="48" height="14" rx="7" fill="rgba(255,255,255,.22)"/>`, 44) },
  { key:"banana", name:"香蕉", svg: PROMPT_WRAP(`
      <path d="M24 44 Q30 84 74 78 Q80 80 78 72 Q86 40 62 30 Q68 38 66 48 Q60 70 34 66 Q26 62 24 44Z" fill="#E0C25A"/>
      <path d="M24 44 Q23 38 28 38 L32 42Z" fill="#7A6430"/>`, 44) },
  { key:"star", name:"星星", svg: PROMPT_WRAP(`
      <path d="M50 22 L58 44 L82 45 L63 59 L70 82 L50 68 L30 82 L37 59 L18 45 L42 44 Z" fill="#D9A441"/>
      <path d="M50 22 L58 44 L82 45 L63 59 L50 55Z" fill="rgba(255,255,255,.25)"/>`, 46) },
  { key:"ball", name:"綠色的球", svg: PROMPT_WRAP(`
      <circle cx="50" cy="58" r="26" fill="#3E6B5C"/>
      <path d="M26 52 Q50 42 74 52 M26 66 Q50 76 74 66" stroke="#EAF2ED" stroke-width="3.5" fill="none"/>
      <circle cx="41" cy="49" r="7" fill="rgba(255,255,255,.3)"/>`, 44) }
];

/* ---------- MSWO 刺激物（虛擬增強物庫） ---------- */
const MSWO_ITEMS = [
  { key:"bubbles", name:"彩光泡泡", svg:`
      <circle cx="38" cy="58" r="20" fill="#9FC6D8" opacity=".85"/><circle cx="64" cy="42" r="13" fill="#C9A9D6" opacity=".85"/>
      <circle cx="66" cy="70" r="10" fill="#A8D6B6" opacity=".85"/>
      <circle cx="32" cy="50" r="5" fill="rgba(255,255,255,.7)"/><circle cx="60" cy="38" r="3.4" fill="rgba(255,255,255,.7)"/>` },
  { key:"musicbox", name:"音樂盒", svg:`
      <rect x="22" y="46" width="56" height="34" rx="7" fill="#8A6E5A"/>
      <rect x="22" y="40" width="56" height="12" rx="6" fill="#A5876F"/>
      <path d="M58 20 v18 a6 6 0 1 1 -4 -5.6 V24 l10 -3 v13 a6 6 0 1 1 -4 -5.6 V17Z" fill="#6E5B94"/>` },
  { key:"train_bounce", name:"彈跳小火車", svg:`
      <rect x="18" y="46" width="50" height="24" rx="6" fill="#B5544D"/>
      <rect x="24" y="32" width="20" height="18" rx="4" fill="#B5544D"/><rect x="27" y="36" width="12" height="9" rx="2" fill="#EAF2ED"/>
      <circle cx="32" cy="74" r="8" fill="#22312B"/><circle cx="56" cy="74" r="8" fill="#22312B"/>
      <path d="M74 54 h6 a5 5 0 0 1 5 5 v11 h-11Z" fill="#8F3F39"/>` },
  { key:"gear", name:"發光齒輪", svg:`
      <g fill="#B8A24E"><circle cx="50" cy="55" r="18"/>
      <rect x="46" y="30" width="8" height="10" rx="2"/><rect x="46" y="70" width="8" height="10" rx="2"/>
      <rect x="25" y="51" width="10" height="8" rx="2"/><rect x="65" y="51" width="10" height="8" rx="2"/>
      <rect x="31" y="35" width="9" height="9" rx="2" transform="rotate(45 35 39)"/><rect x="61" y="35" width="9" height="9" rx="2" transform="rotate(-45 65 39)"/>
      <rect x="31" y="67" width="9" height="9" rx="2" transform="rotate(-45 35 71)"/><rect x="61" y="67" width="9" height="9" rx="2" transform="rotate(45 65 71)"/></g>
      <circle cx="50" cy="55" r="8" fill="#F2F5F3"/>` },
  { key:"pinwheel", name:"虛擬風車", svg:`
      <g><path d="M50 52 L50 20 Q66 22 62 40 Z" fill="#7FA8C9"/><path d="M50 52 L82 52 Q80 68 62 64 Z" fill="#A8C9A0"/>
      <path d="M50 52 L50 84 Q34 82 38 64 Z" fill="#C9A0A8"/><path d="M50 52 L18 52 Q20 36 38 40 Z" fill="#C9BC7F"/></g>
      <circle cx="50" cy="52" r="5" fill="#5B6E65"/><rect x="48" y="52" width="4" height="38" rx="2" fill="#8A6E5A"/>` }
];

global.FF_ITEMS = { DTT_ITEMS, MSWO_ITEMS };
})(window);
