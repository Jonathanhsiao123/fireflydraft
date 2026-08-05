# 01 · 系統架構總覽 (Overview + TODO)

## Overview
三層解耦：L1 邊緣感知 (AR 裝置端，確定性即時邏輯)、L2 智慧閘道 (模型路由 / 節流 / 備援)、L3 認知中樞 (Fable 5 非同步深度分析)。層間契約以結構化衍生特徵為唯一傳輸物，原始影音不出 L1。

硬性規則 (來自 08 風險審查)：
- SLA < 5 秒的決策一律 L1 本地執行，不得等待雲端。
- 安全拒絕不自動改道，僅可用性失敗允許備援。
- L3 一切輸出進 BCBA 審核佇列後才可生效。

介面契約 (草案)：
- L1 → L2：`SessionPayload` (batch, protobuf)、`EventStream` (低頻遙測)
- L2 → L3：`WeeklyAnalysisPayload` (見 schemas/weekly_payload.schema.json)
- L3 → 審核佇列：`StrategyProposal` (含證據引用與自主驗證紀錄)

## TODO
- [ ] 確定 L1 目標硬體 (Phase 0：iPad + ARKit / Android + ARCore 二選一)
- [ ] 定義 L1/L2 之間的離線佇列與重送機制 (at-least-once + 冪等鍵)
- [ ] 撰寫層間 protobuf IDL 與版本演進策略
- [ ] 閘道選型評估 (自建 vs LiteLLM vs 企業級 AI gateway)
- [ ] 建立端到端延遲預算表 (渲染 16ms / 規則判定 50ms / 雲端批次不限)
- [ ] 災難情境演練腳本：雲端全斷線 72 小時，療程不得中斷
