# Thesis Progress Dashboard

公開、唯讀的論文研究進度儀表板。首頁同時支援「個人管理」與「教授簡報」模式，呈現加權規劃進度、章節狀態、近期行動、阻塞事項、研究架構與重要決策。

## 更新方式

本專案採半自動更新，唯一的公開進度資料來源是 [`data/status.json`](data/status.json)。Codex 或 Claude 完成實質進度後，依下列流程更新：

1. 對照私有論文專案的 `WORK_SPLIT.md`、`PROJECT_MEMORY.md`、`THESIS_OUTLINE.md` 與 `EXPERIMENT_ARCHITECTURE.md`。
2. 只修改 `data/status.json` 中已確認且適合公開的欄位。
3. 執行測試：

   ```powershell
   node --test
   ```

4. 產生離線可開啟的單一 HTML：

   ```powershell
   node scripts/build.mjs
   ```

5. 推送 `main`；GitHub Actions 會重新測試、建置並部署 GitHub Pages。

## 進度口徑

整體百分比是「人工維護的加權規劃進度」，不是 Git commit 數、字數或時間的自動換算：

| 類別 | 權重 |
|---|---:|
| 研究設計 | 20% |
| 文獻回顧 | 15% |
| 實驗環境與程式 | 20% |
| Pilot 與正式實驗 | 25% |
| 論文撰寫 | 15% |
| 口試與提交 | 5% |

每一類完成率必須由可核對的交付物判定。建置程式會檢查權重合計、完成率範圍、必要欄位及公開安全規則。

## 公開安全界線

此 repository 與 GitHub Pages 網站都是公開的，因此不得公開：

- 姓名、學校、實驗室、教授或其他個人識別資訊
- Notion 頁面、API key、token、密碼或 `.env`
- 私有 repository 連結、本機使用者路徑或內部系統位置
- 實驗 raw logs、模型輸出、canary、個資或尚未審查的敏感資料

`scripts/build.mjs` 會攔截常見的本機路徑、私人服務連結與憑證欄位，但人工審查仍是必要步驟。

## 技術特性

- 無第三方執行期套件
- 無外部 CSS、JavaScript、字型、圖片或 API
- 建置後為單一 `dist/index.html`，可離線開啟
- 響應式桌機／手機版面、鍵盤可操作、減少動態效果與列印樣式
- GitHub Actions 自動驗證與 GitHub Pages 部署

