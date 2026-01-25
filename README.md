# My CLI - Web Terminal Project

> [!NOTE]
> 本項目是一個受 **Fallout 4 Pip-Boy** 啟發的復古風格 Web 終端介面。
> 結合了 CRT 螢幕濾鏡、機械音效與命令行式的交互體驗。

## 1. 專案簡介 (Introduction)
這是一個基於 Web 的單頁應用 (SPA)，模擬了復古電腦終端機的操作體驗。
*   **視覺風格:** Phosphor Green (磷光綠) 文字、黑色背景、掃描線與噪點特效。
*   **核心功能:** 
    *   **Blackboard:** 支援離線存取與雲端同步的記事本。
    *   **指令式導航:** 模仿 Pip-Boy 的多層級選單系統。
    *   **沉浸式體驗:** 全程操作伴隨機械音效與視覺回饋。

## 2. 先決條件與環境 (Prerequisites)
要運行此專案，您需要具備以下環境：

1.  **Web Server (Apache):**
    *   推薦使用 **XAMPP**。
    *   預設路徑: `C:\xampp\htdocs\My`。
    *   確保 Port 80 可用。
2.  **Database (MySQL):**
    *   Port 3306。
    *   資料庫名稱: `my_cli_db`。
    *   使用者: `root`, 密碼: (參考 `PHP/db.php`)。
3.  **瀏覽器:** 支援 ES6 JavaScript 與 AudioContext 的現代瀏覽器 (Chrome/Edge 推薦)。

## 3. 系統架構 (Architecture)

### 前端 (Frontend)
*   **語言:** Vanilla HTML5, CSS3, JavaScript (ES6+)。
*   **特色:** 無須編譯 (No build step)，直接運行。
*   **狀態管理:** 自定義 `DataManager` 類別，優先快取於 `localStorage`。

### 後端 (Backend)
*   **語言:** Native PHP (7.4+)。
*   **資料庫:** MySQL (InnoDB)。
*   **API:** RESTful 風格 JSON API (`/PHP/*.php`)。

## 4. 組件詳解 (Components)

### 4.1 核心邏輯 (Core Logic)

#### `JavaScript/DataManager.js`
雖然是前端檔案，但它是整個應用的**資料中樞**。
*   **職責:** 負責所有資料的 CRUD (新增/讀取/更新/刪除)。
*   **Offline-First:** 資料預設存於 `localStorage` (`wpp_blackboard_data`)，確保無網路可用。
*   **API 橋接:** 封裝了 `fetch` 請求至 `PHP/` 端點 (如 `auth.php`, `sync.php`)。
*   **邏輯:**
    *   `push()`: 將當前草稿 (Active Draft) 存入歷史堆疊 (History Stack)。
    *   `pull()`: 讀取歷史堆疊中的舊資料。
    *   `commit()` / `checkout()`: 處理與 MySQL 資料庫的同步。

#### `JavaScript/Navi.js`
負責**導航與互動體驗**。
*   **職責:** 處理選單切換 (Navi / Sub-Navi)、頁面路由、滑鼠滾輪與觸控互動。
*   **特性:**
    *   **Glitch Effect:** 頁面切換時觸發 CRT 雜訊特效 (`triggerGlitchEffect`)。
    *   **Sound Engine:** 根據 `data-sound` 屬性播放對應音效。
    *   **Press Start:** 處理首次進入網站的互動，解決瀏覽器自動播放音效的限制。

#### `JavaScript/Preloader.js`
負責**資源預載**。
*   **邏輯:** 應用啟動時立即透過 `new Audio()` 強制載入所有音效檔 (`./Sound/*.mp3`) 並存入全域快取 `window.ag_audioCache`，避免操作延遲。

### 4.2 UI 組件 (UI Components)

#### `JavaScript/Blackboard.js`
**黑板 (Blackboard)** 頁面的 UI 控制器。
*   **功能:** 連接 DOM 元素 (`textarea`, buttons) 與 `DataManager`。
*   **監聽:** 處理 Push (上滑) / Pull (下滑) 按鈕點擊，即時更新輸入框內容。
*   **狀態顯示:** 更新左下角的 `[DB: ONLINE/OFFLINE]` 與右上角的堆疊狀態 (`ACTIVE DRAFT` / `HISTORY VIEW`)。

#### `JavaScript/MultiStepButton.js`
實現 **Titanfall 風格** 的多段式確認按鈕。
*   **邏輯:** 按鈕需要連續點擊多次才能觸發最終動作。
*   **狀態:** `Default` -> `Click x 3` -> `Click x 2` -> `Click x 1` -> `Action`。
*   **用途:** 用於危險操作 (如 `WIPE MEMORY`) 或重要操作 (如 `COMMIT`, `LOGOUT`)，增加操作的儀式感與安全性。

### 4.3 後端服務 (Backend Services)

#### `PHP/db.php`
資料庫連線設定檔。
*   使用 `PDO` 建立 MySQL 連線。
*   設定 CORS Headers 允許跨域請求 (開發用)。

#### `PHP/auth.php`
認證服務。
*   **Ping:** 檢查資料庫連線狀況。
*   **Register:** 建立新用戶 (Level 1)。
*   **Login:** 驗證帳號密碼，返回用戶等級。

#### `PHP/sync.php`
同步服務。
*   **Commit (上傳):** 採用**事務 (Transaction)** 處理。先刪除該用戶所有舊紀錄，再插入當前所有紀錄 (Active + History)。確保資料絕對一致。
*   **Checkout (下載):** 讀取該用戶所有紀錄並回傳給前端。

### 4.4 資料庫 (Database)

#### `MySQL/init.sql`
初始化腳本。
*   `users`: 儲存用戶資訊，包含 `level` (權限等級)。
*   `blackboards`: 儲存黑板內容，使用 `slot_type` 區分 'active_draft' (當前草稿) 與 'history' (歷史)。

## 5. 環境工具 (Environment Tools)

*   **`check_env.bat`**: Windows 批次檔，快速檢查 Apache 與 MySQL 是否運行中。
*   **`launch_backend.ps1`**: PowerShell 自動化腳本。
    1.  檢查並啟動 XAMPP (Apache/MySQL)。
    2.  啟動 `cloudflared` 建立穿透隧道。
    3.  解析 `tunnel.log` 獲取公開 URL。
    4.  自動開啟瀏覽器。

## 6. 使用說明 (Usage)
1.  執行 `launch_backend.ps1` 啟動所有服務。
2.  點擊 "PRESS START" 進入系統。
3.  使用上方導航列切換功能。
4.  在 Blackboard 輸入內容，點擊 "PUSH" 存檔，"PULL" 查看歷史。
5.  在 MISC 頁面登入後，可使用 COMMIT/CHECKOUT 同步資料。
