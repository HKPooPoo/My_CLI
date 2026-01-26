# My CLI - Web Terminal Project

> [!NOTE]
> 本項目是一個受 **Fallout 4 Pip-Boy** 與 **Git** 啟發的 Web 終端介面。
> 爲了解決異地記事、文本同步、通訊等問題。
> 本文檔旨在解析系統架構與託管環境的運作機制。

## 1. 專案概述 (Project Overview)
**My CLI (MVP)** 是一個基於 Web 技術 (HTML5/CSS3/JavaScript) 構建的SPA (Single-Page-Application)，模擬了復古電腦終端機的交互體驗。
後端環境由hoster (我) 自行託管，並透過 Cloudflare Tunnel 提供公網訪問。

### 技術棧 (Tech Stack)
*   **Frontend:** HTML5, CSS3, JavaScript. No Build Step.
*   **Backend:** PHP, MySQL.
*   **Infrastructure:** PowerShell Automation, Apache (XAMPP), Cloudflare Tunnel.
*   **Version Control:** Git, GitHub.

---

## 2. 設計靈感 (Design Inspiration)

### 2.1 多段式按鈕 (四段) - **Titanfall 2**
*   參考 Titanfall 的 *Titan Eject* 機制。
*   危險操作 (如 `WIPE MEMORY` 或 `DELETE`) 需連續點擊多次，按鈕狀態隨點擊改變 (`Click x 3` -> `Click x 2` -> `Action`)，防止誤觸。
    *   *Implementation:* `JavaScript/MultiStepButton.js`

### 2.2 Navi Bar & UI/UX - **Fallout 4**
*   參考 Fallout 4 的 *Pip Boy* UI
*   **Navi:** 使用多層 z-index 構成
*   **視覺:** 使用 CSS 模擬掃描線、輝光、螢幕邊緣暈影與信號幹擾效果。
*   **聽覺:** 全局 `AudioContext` 管理。所有 UI 交互 (Hover, Click, Page Switch) 均綁定機械音效。
    *   *Implementation:* `CSS/main.css`, `JavaScript/SoundManager.js`

### 2.3 版本控制邏輯 (Version Control Logic) - **Git**
數據管理採用類似 Git 的分佈式版本控制概念。
*   **流程:** 
    *   `Push`: 將 `Active Draft` (工作區) 提交至 `History Stack` (本地提交)。
    *   `Pull`: 從 `History Stack` 檢出舊版本至 `Active Draft`。
    *   `Commit` (Level 1+<sub>已登入用戶</sub>): 將本地 `History Stack` 推送至遠端 MySQL 資料庫。
    *   `Checkout`: 從遠端資料庫拉取最新數據覆蓋本地。
    *   *Implementation:* `JavaScript/DataManager.js`

---

## 3. 系統架構與託管設施 (System & Infrastructure)

本節說明專案在託管端 (Host Machine) 的運作方式，包含未被 `.gitignore` 排除的關鍵基礎設施工具。

### 3.1 基礎設施自動化 (Infrastructure Automation)
託管者使用自動化腳本來維護開發環境與公網連接：

*   **`launch_backend.ps1` (PowerShell Script):**
    這是託管者的**中央控制臺**：
    1.  **Service Health Check:** 自動檢測 Apache (Port 80) 與 MySQL (Port 3306) 是否存活。
    2.  **Auto-Recovery:** 若服務未運行，自動從 XAMPP 目錄啟動對應進程。
    3.  **Tunneling Orchestration:** 啟動 `cloudflared` 並監控 `tunnel.log`。
    4.  **Hot-Patching:** 實時抓取 Tunnel Public URL，並自動寫入前端的 `DataManager.js`，確保 Frontend API 指向正確的動態地址。

*   **`cloudflared.exe` (Cloudflare Tunnel):**
    *   **作用:** 建立加密通道，將託管者本地的 `localhost:80` 暴露給公網。
    *   **目的:** 允許外部設備 (如手機、訪客) 在無需配置路由器端口轉發 (Port Forwarding) 的情況下訪問本地開發環境。

### 3.2 後端組件 (Backend Components)
*   **PHP API (`PHP/`):** 
    提供的 RESTful 接口 (如 `sync.php`)，運行於託管者的 Apache 伺服器上。
*   **Database (`MySQL/`):** 
    託管者的本地 InnoDB 數據庫，存儲所有用戶 (Level 1+) 的同步數據與 Broadcast 訊息。

---

## 4. 常見問題 (Q&A)

針對使用者或開發者在操作過程中可能遇到的系統行為解釋：

**Q: Header 左下角的 `DB:` 狀態代表什麼意義？**
*   **橙色 CONNECTING...**: 系統正在嘗試與託管者的伺服器建立握手 (Handshake)。
*   **紅色 OFFLINE**: 無法連接到託管伺服器。
    *   *原因:* 通常是因爲託管者 (我) 關閉了伺服器 (PC)；或者我重啓了服務器但忘記Push隨機刷新的 Cloudflared Tunnel URL 導致 PHP 無法被接通。
    *   *影響:* 此時進入 **Local Only** 模式。Blackboard 的本地讀寫 (`Push`/`Pull`) 功能**完全不受影響**，僅無法執行雲端同步 (`Commit`/`Checkout`)。
*   **綠色 ONLINE**: 成功連接至 API。可以使用所有雲端同步功能。

**Q: 為什麼需要 "Press Start"？**
*   為了讓 SFX 如預期般播放，故而設計 Press Start 來引導用戶與瀏覽器互動以 Autoplay Policy；順帶增加敏感信息保護。

---

## 5. 前端開發指南 (Frontend Guide)

前端採用 **Offline-First** 架構，即使後端 API 離線，核心功能仍可正常運作。

### 關鍵目錄結構
```
My/
├── CSS/
│   └── main.css       # 全局樣式、CRT 特效、響應式佈局
├── JavaScript/        # 核心邏輯
│   ├── Navi.js        # 導航與路由 (Router)
│   ├── DataManager.js # 數據層 (Singleton Data Center)
│   └── SoundManager.js# 音效引擎
|   └── ...
└── index.html         # 應用入口、DOM 結構
```

### 核心組件 (Core Components)
*   **`JavaScript/Navi.js`**: 
    *   **路由控制器 (Router):** 監聽導航點擊，控制 `.page` 的顯示/隱藏。 
    *   **Glitch Trigger:** 切換頁面時觸發 CSS 動畫類 (`.glitch-active`)。
*   **`JavaScript/DataManager.js`**: 
    *   **資料中樞:** 負責所有數據的 CRUD 與暫存。
    *   **Persistence:** 優先讀寫 `localStorage` (`wpp_blackboard_data`)。
*   **`JavaScript/Blackboard.js`**: 
    *   **UI Controller:** 負責 DOM 操作，將用戶輸入綁定至 `DataManager`。

---

## 6. 待辦事項 (Pending Tasks)

根據 `Design/Plan.md` 的規劃，以下功能尚待實作：

*   **[Feature] Walkie-Typie (通訊系統):**
    *   點對點文字通訊。
    *   子頁面規劃: `List`, `Connect`, `Text`。
*   **[Feature] Broadcast (廣播系統):**
    *   僅限 Level 10 (開發者/託管者) 使用。
    *   擇一：HTML Hard Coding OR User Level
    *   實作一對多的訊息推送機制。
    *   加入 Audio 功能, such that 能作爲背景音播放。
*   **[UX] User Tutorial (新手引導):**
    *   首次訪問時的交互式教學引導。
    *   替代以文本方式講述操作方式。

---
