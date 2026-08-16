# Thesis Progress Dashboard Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** 建立可公開、安全、半自動更新並由 GitHub Pages 發布的論文進度單頁儀表板。

**Architecture:** 人工維護 `data/status.json`，以無第三方套件的 Node.js 建置程式驗證資料、計算加權進度並嵌入自包含 HTML。GitHub Actions 對每次 `main` push 執行測試、建置與 Pages 部署。

**Tech Stack:** HTML5、CSS、原生 JavaScript、Node.js 20 內建模組、GitHub Actions、GitHub Pages。

## Global Constraints

- 公開資料不得含姓名、學校、實驗室、教授、Notion 連結、私人 repository、本機路徑、憑證或 raw logs。
- 網頁不得連接外部 CSS、JavaScript、字型、圖片或 API。
- 使用臺灣繁體中文；完整區分模型提案、政策通過與模擬執行。
- 進度為人工維護的規劃指標，不得寫成客觀完成度。

---

### Task 1: 建立資料模型與驗證器

**Files:**
- Create: `data/status.json`
- Create: `scripts/build.mjs`
- Create: `tests/dashboard.test.mjs`

**Interfaces:**
- Consumes: `data/status.json` 與 `src/template.html`
- Produces: `validateStatus(status)`, `calculateOverallProgress(milestones)`, `buildDashboard()` 與 `dist/index.html`

- [ ] 先寫測試，涵蓋權重合計 100、完成率 0–100、必要欄位與禁止公開字串。
- [ ] 執行 `node --test`，確認因模組不存在而失敗。
- [ ] 實作最小驗證器與進度計算函式。
- [ ] 再執行 `node --test`，確認資料模型測試通過。
- [ ] Commit：`feat: add validated thesis status model`

### Task 2: 建立響應式單頁 Dashboard

**Files:**
- Create: `src/template.html`
- Modify: `tests/dashboard.test.mjs`

**Interfaces:**
- Consumes: 建置程式注入的 `window.__THESIS_STATUS__`
- Produces: 個人／教授模式、進度視覺、章節狀態、行動清單、研究架構與決策時間軸

- [ ] 增加產出 HTML、無外部請求、必要區塊與可存取控制測試。
- [ ] 執行 `node --test`，確認模板尚未完成而失敗。
- [ ] 實作自包含模板、內嵌 SVG icon sprite、響應式與列印樣式。
- [ ] 執行 `node scripts/build.mjs` 與 `node --test`。
- [ ] Commit：`feat: build responsive thesis dashboard`

### Task 3: 加入 GitHub Pages 與維護說明

**Files:**
- Create: `.github/workflows/pages.yml`
- Create: `README.md`
- Create: `.gitignore`
- Modify: `tests/dashboard.test.mjs`

**Interfaces:**
- Consumes: repository `main` branch
- Produces: 經測試的 `dist/` Pages artifact 與人工更新操作說明

- [ ] 增加 workflow 必要權限、建置命令與 README 更新流程測試。
- [ ] 實作 Pages workflow 與維護文件。
- [ ] 執行完整測試、建置與敏感字串掃描。
- [ ] Commit：`ci: deploy dashboard to GitHub Pages`

### Task 4: 發布與驗證

**Files:**
- No source changes expected unless deployment reveals a defect.

**Interfaces:**
- Consumes: 本地 `main` branch
- Produces: 公開 GitHub repository 與 GitHub Pages URL

- [ ] 建立公開 repository `thesis-progress-dashboard` 並推送 `main`。
- [ ] 在 repository settings 啟用 GitHub Actions Pages source。
- [ ] 等待 workflow 成功，開啟網站並檢查桌面與手機寬度。
- [ ] 若部署失敗，只修正已確認的單一根因，再重新驗證。

