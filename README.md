# 螢火平台 · Firefly ABA MVP (Phase 0)

平板優先的 ABA 訓練系統 MVP，對應《專案主藍圖》修訂後的 Phase 0 範圍：

- **DTT 離散嘗試訓練（圖形指認）**：確定性規則引擎（FSM）完全在瀏覽器本機執行。無錯誤學習、四級提示層級依目標各自追蹤、自動提示褪除與錯誤修正、代幣經濟、FCT 休息卡（BCBA 授權參數）、個案中止權（assent）。
- **MSWO 偏好評估**：多刺激不替換流程，記錄選擇順位與互動時長，計算偏好階層矩陣；DTT 自動採用最高偏好項目作為主要增強物。
- **數據儀表板**：所有統計由真實試驗紀錄計算（正確率趨勢、反應分類分佈、各目標褪除進度、會話列表），支援 JSON 匯出 / 匯入。
- **參數設定**：感官設定檔（低刺激模式、語音開關）與 DTT / FCT 授權參數。

隱私設計（修訂 D1）：不採集影像與音訊；語音 SD 由瀏覽器本機合成；所有資料僅存於 localStorage，不傳輸至任何伺服器。純靜態網站，無後端、無雲端模型呼叫（Phase 0 定義）。

## 本機執行

直接用瀏覽器開啟 `index.html` 即可（無需建置工具、無相依套件）。

## 部署到 GitHub Pages（三種擇一）

### 方法一：GitHub 網頁介面（最簡單）
1. 在 GitHub 建立新 repo（例如 `firefly-aba-mvp`，Public）。
2. 把本資料夾內所有檔案拖曳上傳（或用下方 git 指令推送）。
3. Repo → Settings → Pages → Build and deployment：
   - Source 選 **Deploy from a branch**
   - Branch 選 **main**，資料夾選 **/(root)** → Save
4. 約一分鐘後網站上線：`https://<你的帳號>.github.io/firefly-aba-mvp/`

### 方法二：git 指令
```bash
cd firefly-aba-mvp
git init
git add .
git commit -m "Firefly ABA MVP: DTT engine, MSWO, dashboard, settings"
git branch -M main
git remote add origin https://github.com/<你的帳號>/firefly-aba-mvp.git
git push -u origin main
# 然後到 Settings → Pages 依方法一第 3 步設定
```

### 方法三：GitHub CLI（有裝 `gh` 的話）
```bash
cd firefly-aba-mvp
git init && git add . && git commit -m "Firefly ABA MVP"
gh repo create firefly-aba-mvp --public --source=. --push
# 再到 Settings → Pages 啟用即可
```

repo 內已含 `.github/workflows/pages.yml`：若你在 Settings → Pages 把 Source 改選 **GitHub Actions**，每次 push 到 main 會自動部署，不需再手動設定分支。`.nojekyll` 已附上，避免 Pages 的 Jekyll 處理。

## 專案結構

```
index.html            應用外殼（五個視圖）
css/app.css           設計系統（螢火視覺語彙）
js/items.js           刺激物 SVG 資產庫（DTT 目標 × 6、MSWO 增強物 × 5）
js/store.js           本機資料層（localStorage + 降級、匯出匯入）
js/engine.js          DTT 確定性規則引擎（L1 邊緣層，修訂 A1）
js/mswo.js            MSWO 偏好評估
js/dashboard.js       真實資料統計與 SVG 圖表
js/app.js             導覽與設定綁定
docs/                 架構分冊與風險審查（08 為完整修訂方案）
schemas/              資料契約（匯出格式對齊 dtt_trial.schema.json）
```

## 與藍圖的對應

| 藍圖概念 | MVP 落地 |
|---|---|
| L1 邊緣規則引擎（修訂 A1） | `engine.js` FSM，全部決策本機執行，零雲端呼叫 |
| 無錯誤學習 / 提示褪除 | 每目標 L3→L0 獨立追蹤，連續達標 N 次褪除、錯誤回升 |
| 代幣經濟 + 動態增強物 | 集滿代幣觸發，增強物取自 MSWO 矩陣最高偏好項 |
| FCT 休息卡（修訂 C3） | 次數 / 時長為 BCBA 授權參數，引擎唯讀 |
| Assent 中止權（修訂 C6） | 「我不想玩了」恆為可用，中止原因寫入會話紀錄 |
| 感官設定檔（修訂 C2） | 低刺激模式預設開啟，音量上限 0.85 |
| 資料契約 | 匯出 JSON 欄位對齊 `schemas/dtt_trial.schema.json` |
| 隱私（修訂 D1） | 無影音採集、資料不出裝置 |

## 後續（Phase 1+）

閘道層與雲端摘要（`docs/03`、`docs/04`）需要後端與金鑰管理，不屬於靜態 Pages 範圍；屆時建議另建 API 服務，前端維持本 repo。

---
本工具僅供工程與教學展示，不構成醫療建議；臨床干預方案請諮詢持證行為分析師（BCBA）。
