0. UI

模仿Fallout 4 Pip Boy操作邏輯
CLI風格
綠色主色調
復古終端機背景條紋
模擬切換訊號噪音
Fallout 4 Pip Boy切換音效

結構:
    header
        img
    content
        navi
            sub-navi
        page-container
            background-img
            page
    footer

（待定）CLI塊狀閃爍游標 用戶未互動網頁時預設在頁面的結尾Footer閃爍，停留在用戶最後互動位置閃爍，例如當用戶選擇navi-item，游標停留在激活的sub-navi-item的font的尾部閃爍
（待定）首次訪問網站的指引系統

sub-navi互動方式:
    1. 點擊
    2. 橫向滾動
    直接參考Pip Boy

1. 賬號系統

注冊只需要賬號名字密碼
只要賬號名字不重複即可注冊
賬號名字密碼無需限制
賬號等級：
    未注冊賬號: 0級
    已注冊賬號: 1級
    開發者（我）: 10級

2. Blackboard

作爲訪問網站的首頁
訪問網站時顯示Press Start Page，需要點擊後才能繼續，一來繞過Chrome Auto Play來期望在初時播放navi-item-1的音效（注意在點擊Pess Start後再激活Navi-item-1 as Blackboard）
即時記事黑板
電腦端能輸入文本
手機端能輸入文本+塗鴉
Blackboard上劃以切換至空白新黑板；下劃回到先前黑板，最多保存十個回溯記錄
未登錄用戶能隨時訪問網站Blackboard紀事，保存到本地
已登錄用戶能自動同步Blackboard(s)到伺服器
允許

Consider the scenario:
1. User first access to the website
2. User entered 'Hello World' at blackboard
3. User push (scroll up) the blackboard
4. User get a blank blackboard
5. User entered 'Hello World 2' on the blackboard
6. User closed the website
7. User access the website, and see 'Hello World 2' on the page of blackboard
8. User pull (scroll down) and see 'Hello World'
9. User closed the website
10. User access the website, and see 'Hello World' on the page of blackboard
11. User push and see 'Hello World 2'
12. User get to Misc to regester
13. User sucesfully regestered
14. User clicked 'Checkout' button, and system showed message 'There have no commitment'
15. User figured out that there exist options to 'Commit' and 'Checkout'
16. User clicked 'Commit'
17. User user second device and login with regestered id and password
18. User clicked 'Checkout', and back to blackboard, finally sees 'Hello World 2' on the page

3. Walkie-Typie

三個sub-navi:
    1. Add
    2. List
    3. Text

諧音Walkie-Talkie
文本版綫上文字交流頁面

List頁面内容:
    左方:
        Column Attribute:
            Name, Description
    右方:
        （待定）對方大頭照
        Name, Description

List互動方式:
    1. Moving Highlight Cursor，當scrolling behaviour時，高亮選定對象
    2. 保留現代互動方式，即點擊

Text頁面内容:
    1. 已連結對象
    2. 對方的Blackboard，位居相對上方
    3. 己方的Blackboard，位居相對下方

Text互動方式（待商議）:
    1. 己方可翻動雙方Balckboard
    2. 己方僅可以edit自己的Blackboard

選定Texting對象:
    1. 在List將Highlight Block對準對象
    2. Swap to Text Page
    3. Done!

以highlight block '調頻' -> Text Page 更新應該要有延遲來規避頻繁更新請求
更新時帶有噪音動畫（重用crt-noise）
Delete Button需要被連續按下三次才能執行刪除，參考自Titanfall 2 彈射，每次按的動作後都會顯示不同内容，例如'REMOVE'（預設樣式）->'REMOVEx3'（第一次按擊後）->'REMOVEx2'->'REMOVE!'；REMOVE的重置不綁定選定對象，換言之，只要按下三次刪除後，切換到其他對象，在重置時間過去之前單擊即可刪除
用戶列表: 分爲白名單與普通名單；普通名單接收並列出所有；白名單object選定自普通名單
命名: 名單=Scan；白名單=Memory；最後修改時間=Signal
不用自定義排序，統一以最後聯絡排序

4. Broadcast

高級賬號用於發佈消息給所有用戶的頁面
可安插音頻
基於Blackboard邏輯，低級賬號不能修改

