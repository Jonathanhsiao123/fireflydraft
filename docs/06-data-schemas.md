# 06 · 全域資料結構 (Overview + TODO)

## Overview
四大實體，JSON Schema 草案見 schemas/：
- dtt_trial.schema.json：試驗原子單位 (trial_id, session_id, target_skill_domain, SD 物件, prompt_hierarchy_level 0-3, response_latency_ms, response_classification 六類, applied_consequence)
- preference_matrix.schema.json：刺激物偏好 (呈現/選擇頻次、平均停留、迴避事件、computed_preference_index 0-1)
- ja_trial.schema.json：RJA/IJA 試驗 (發起主體、目標座標、視線特徵摘要、持續注意時長)
- weekly_payload.schema.json：週期分析酬載 (統計摘要 + 環境脈絡 + ABC 紀錄)

修訂 (08-A4)：eye_gaze_trajectory 原始 60Hz 序列僅存於 L1 本地 (protobuf/Arrow)，上傳欄位改為 gaze_features 統計摘要 (首次注視延遲、轉移次數、停留分佈直方圖)。

## TODO
- [ ] Schema 正式化 (JSON Schema draft 2020-12) + CI 驗證
- [ ] 本地儲存層設計 (SQLite + protobuf blob，加密 at rest)
- [ ] 去識別化欄位清單與雜湊策略 (含 salt 輪換)
- [ ] 資料字典交 BCBA 與法遵雙審
