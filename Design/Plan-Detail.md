# My CLI - Detailed Development Plan

## 1. 專案概述 (Overview)
本專案旨在構建一個具有強烈 **Fallout Pip-Boy 風格** 的個人 Web 終端。核心理念是將復古的 CRT 顯示器美學與現代 Web 技術結合，提供獨特的記事 (Blackboard) 與通訊 (Walkie-Typie) 體驗。

---

## 2. 功能規格 (Features & Specifications)

### 2.1 UI/UX 設計理念
*   **視覺風格**:
    *   極簡 CLI (Command Line Interface) 風格。
    *   主色調: 磷光綠 (Phosphor Green) 與 黑色背景。
    *   特效: CRT 掃描線 (Scanline)、螢幕邊緣暈影、信號切換噪聲 (Static Noise)。
*   **交互邏輯**:
    *   **導航**: 模仿 Pip-Boy 旋鈕操作。
        *   Desktop: 滑鼠滾輪控制 Sub-Navi 橫向滾動。
        *   Mobile: 觸摸滑動 (Swipe) 控制，帶有機械段落感 (Snap)。
    *   **音效**: 每個導航動作與頁面切換均伴隨 Pip-Boy 風格音效 (需解決瀏覽器 Auto-play 限制)。

### 2.2 核心功能模組

#### A. 啟動頁面 (Press Start System)
*   **功能**: 作為網站入口，全屏覆蓋 (Privacy Mask) 且無法進行導航操作。
*   **目的**:
    1.  **隱私保護 (Privacy Mask)**: 隱藏實際內容，直到用戶主動訪問。
    2.  **繞過自動播放限制 (Bypass Auto-play Restriction)**: 
        *   瀏覽器限制: 加載時 JS 自動激活 Navi-Item-1 的音效會被瀏覽器攔截 (Case 2)。
        *   解決方案: 初始狀態不激活任何 Navi-Item -> 用戶點擊 "Press Start" -> 瀏覽器解鎖 AudioContext -> JS 隨即激活 Navi-Item-1 並成功播放音效。

#### B. 賬號系統 (Account System)
*   **註冊流程**: 
    *   極簡設計，僅需「用戶名 + 密碼」。
    *   唯一限制: 用戶名不可重複。
*   **權限等級**:
    *   **Level 0 (Guest)**: 未註冊/未登錄。數據僅保存在本地 (Local Storage)。
    *   **Level 1 (User)**: 已註冊用戶。數據可同步至伺服器。
    *   **Level 10 (Developer)**: 管理員權限 (我)。可發布 Broadcast。

#### C. Blackboard (即時記事黑板)
*   **定位**: 網站的首頁 (Home)。
*   **功能**:
    *   **輸入**:
        *   Desktop: 純文本輸入。
        *   Mobile: 文本 + 手繪塗鴉 (Canvas)。
    *   **版本控制**:
        *   **上劃 (Swipe Up)**: 存檔當前黑板並切換至一張新黑板。
        *   **下劃 (Swipe Down)**: 回溯查看歷史黑板 (最多保留 10 份歷史記錄)。
    *   **數據存儲**:
        *   **Offline-First**: 優先寫入瀏覽器 LocalStorage，保證無網絡可用。
        *   **Sync**: Level 1 用戶可手動同步至 MySQL 數據庫 (Manual Sync via Commit/Checkout)。

#### D. Walkie-Typie (通訊系統)
*   **概念**: 諧音 Walkie-Talkie (對講機) 的文字版交流工具。
*   **Sub-Navi 結構**:
    1.  **Add**: 連線協議 (輸入 ID 建立連線)。
    2.  **Frequency**: 通訊錄列表 (前身為 List)。
    3.  **Text**: 交流介面。
*   **Frequency 頁面互動**:
    *   **分類**:
        *   **Memory (記憶)**: 白名單 (Whitelist)，手動鎖定的對象，永遠顯示。
        *   **Scan (掃描)**: 普通信號 (Inbox)，顯示所有活動接觸。
    *   **排序**: 統一以 **Signal (最後通訊時間)** 排序。
    *   **操作**:
        *   **Highlight Cursor**: 滾輪/滑動選擇頻率 (對象)。
        *   **Delete Button (Titanfall Eject Style)**: 
            *   需連續點擊三次才能執行刪除。
            *   文字變化: `REMOVE` -> `REMOVEx3` -> `REMOVEx2` -> `REMOVE!`。
            *   **機制**: 刪除狀態是**全局**的 (Global State) 且帶有超時重置。允許在A對象蓄力，切換到B對象執行刪除。
            *   對象: 普通名單被刪除後消失；白名單被刪除後移至普通名單。
*   **Text 頁面互動 (調頻機制)**:
    *   **Tuning Effect**: 
        *   當從列表選定一個新對象並切換至 Text 頁面時，模擬「調頻」過程。
        *   觸發 **CRT 噪音動畫** (`crt-noise`) 與短暫延遲，隨後顯示內容。
        *   若再次進入同一對象 (信號已鎖定)，則無延遲直接顯示。
    *   **雙向黑板**: 上方顯示對方內容 (Read-only)，下方顯示己方內容 (Editable)。

#### E. Broadcast (廣播系統)
*   **權限**: 僅 Level 10 (Developer) 可發布。
*   **功能**: 向所有用戶推送消息 (文本/音頻)。
*   **邏輯**: 基於 Blackboard 的單向只讀版本。

---

## 3. 開發路線圖 (Development Roadmap)

### Phase 1: 基礎交互與框架 (Foundation)
*   **目標**: 完成所有靜態 UI 交互與「Press Start」機制。
*   **任務**:
    1.  [x] [前端] 實作 `Press Start` 覆蓋層 (Overlay) 與點擊進入邏輯。
    2.  [x] [交互] 優化 Mobile 端觸摸滑動 (Touch Event) 支持 (解決 `navi.js` 的缺口)。
    3.  [x] [交互] 完善音效系統 (確保在 Press Start 後解鎖 AudioContext)。
    4.  [ ] [UI] 實現 List 頁面的 Highlight Cursor 滾動效果。

### Phase 2: 本地數據持久化 (Local Data)
*   **目標**: 讓 Blackboard 在不聯網狀態下可用 (Level 0 功能)。
*   **任務**:
    1.  [x] [功能] 構建 Blackboard 編輯器 UI (Textarea)。
    2.  [x] [邏輯] 實現 Blackboard 的 `LocalStorage` 讀寫邏輯。
    3.  [x] [交互] 實現 Blackboard 的上劃/下劃 (版本歷史) 邏輯。

### Phase 3: 後端架構搭建 (Backend Infrastructure)
*   **目標**: 建立用戶系統與數據同步基礎。
*   **任務**:
    1.  [x] [DB] 設計 MySQL 資料庫 (Users, Blackboards 表)。
    2.  [x] [API] 建立 PHP API 基礎結構 (連接 DB, 處理 CORS)。
    3.  [x] [API] 實作 `auth.php` (註冊/登錄) 與 `sync.php` (數據同步)。
    4.  [x] [前端] 實作 `DataManager` JS 模組，負責與 PHP API 通訊。

### Phase 4: 高級功能實作 (Advanced Features)
*   **目標**: 完成 Walkie-Typie 與 Broadcast。
*   **任務**:
    1.  [功能] 實作 Walkie-Typie 的雙向視圖邏輯 (Polling 或 WebSocket)。
    2.  [功能] 實作 Broadcast 發布與接收邏輯。
    3.  [Mobile] (可選) 實作 Blackboard 的 Canvas 塗鴉功能。

### Phase 5: 待辦與優化 (Backlog & Polish - Last Priority)
*   **優先級**: 低 (Last Priority)。
*   **待辦清單**:
    *   CLI 塊狀閃爍游標 (跟隨用戶互動位置)。
    *   首次訪問指引系統 (Tutorial)。
    *   (視覺) 更多 Fallout 風格的微動畫 (如開機/關機 CRT 效果)。

---

## 4. 技術棧 (Tech Stack)
*   **Frontend**: HTML5, CSS3 (Vanilla), JavaScript (Vanilla).
*   **Backend**: PHP (原聲/Native).
*   **Database**: MySQL.
*   **Storage**: LocalStorage (Client), MySQL (Server).
