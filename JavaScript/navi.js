/**
 * NaviManager - Handles the main navigation interactions.
 * Features:
 * 1. Main Navigation clicking
 * 2. Sub-navigation scrolling (Click, Wheel, Touch Swipe)
 * 3. State persistence (remembers sub-menu position)
 * 4. Audio feedback management
 * 5. Visual sync with "Page" visibility
 * 6. CRT Glitch effect coordination
 */
class NaviManager {
    constructor() {
        // State State
        this.currentNaviIndex = 0;
        this.currentSubNaviIndices = {}; // { 'navi-blackboard': 1, ... }
        this.touchStartX = 0;
        this.touchEndX = 0;
        this.minSwipeDistance = 50;

        // Cache
        this.audioCache = {};
        this.navItems = document.querySelectorAll('.navi-item');

        // Initialize
        this.init();
    }

    init() {
        this.setupNaviItems();
        this.createGlitchElement();
        this.initPressStart();
        this.triggerGlitchEffect();
    }

    setupNaviItems() {
        this.navItems.forEach((item, index) => {
            const naviName = item.getAttribute('data-navi');

            // Initialize memory for this navi category
            this.currentSubNaviIndices[naviName] = 0;

            // 1. Main Click Event
            item.addEventListener('click', () => this.handleMainClick(index));

            // 2. Sub-menu Container Events (Wheel & Touch)
            const container = item.querySelector('.sub-navi-item-container');
            if (container) {
                // Wheel Scroll
                container.addEventListener('wheel', (e) => this.handleWheel(e, naviName), { passive: false });

                // Touch Swipe
                container.addEventListener('touchstart', (e) => {
                    this.touchStartX = e.changedTouches[0].screenX;
                }, { passive: true });

                container.addEventListener('touchend', (e) => {
                    this.touchEndX = e.changedTouches[0].screenX;
                    this.handleTouchSwipe(naviName);
                });
            }

            // 3. Sub-item Click Events (Direct Selection)
            const subItems = item.querySelectorAll('.sub-navi-item');
            subItems.forEach((subItem, subIndex) => {
                subItem.addEventListener('click', (e) => {
                    e.stopPropagation(); // Prevent triggering main nav click
                    this.handleSubClick(naviName, subIndex);
                });
            });
        });
    }

    // --- Audio System ---
    playAudio(url) {
        if (!url) return;
        if (!this.audioCache[url]) {
            this.audioCache[url] = new Audio(url);
        }
        const sound = this.audioCache[url];
        sound.currentTime = 0;
        sound.play().catch(e => console.warn('Audio play failed', e));
    }

    // --- Interaction Handlers ---

    // 1. Main Navigation Click
    handleMainClick(index) {
        const clickedItem = this.navItems[index];
        const naviName = clickedItem.getAttribute('data-navi');

        // Toggle Active State
        this.navItems.forEach((item, i) => {
            if (i !== index) item.classList.remove('active');
        });

        const isChanging = this.currentNaviIndex !== index;
        this.currentNaviIndex = index;
        this.activateNaviItem(clickedItem, isChanging);

        // Restore Memory: Activate the last visited sub-item
        const subIndex = this.currentSubNaviIndices[naviName] || 0;
        const subItems = clickedItem.querySelectorAll('.sub-navi-item');
        if (subItems[subIndex]) {
            this.activateSubItem(subItems[subIndex], naviName, subIndex, false, false);
        }
    }

    // 2. Sub Navigation Click
    handleSubClick(naviName, subIndex) {
        this.updateSubIndex(naviName, subIndex);
    }

    // 3. Mouse Wheel Scroll
    handleWheel(event, naviName) {
        event.preventDefault();
        const { subItems, currentIndex, totalItems } = this.getNaviContext(naviName);
        if (totalItems === 0) return;

        const newIndex = event.deltaY > 0
            ? (currentIndex + 1) % totalItems
            : (currentIndex - 1 + totalItems) % totalItems;

        this.updateSubIndex(naviName, newIndex);
    }

    // 4. Touch Swipe
    handleTouchSwipe(naviName) {
        const distance = this.touchEndX - this.touchStartX;
        const { currentIndex, totalItems } = this.getNaviContext(naviName);

        if (totalItems === 0) return;
        let newIndex = currentIndex;

        // Swipe Left -> Next
        if (distance < -this.minSwipeDistance) {
            newIndex = (currentIndex + 1) % totalItems;
        }
        // Swipe Right -> Prev
        else if (distance > this.minSwipeDistance) {
            newIndex = (currentIndex - 1 + totalItems) % totalItems;
        }

        if (newIndex !== currentIndex) {
            this.updateSubIndex(naviName, newIndex);
        }
    }

    // --- Core Logic ---

    // Update state and UI for a sub-item change
    updateSubIndex(naviName, newIndex) {
        this.currentSubNaviIndices[naviName] = newIndex;

        const naviItem = document.querySelector(`.navi-item[data-navi="${naviName}"]`);
        const subItems = naviItem.querySelectorAll('.sub-navi-item');

        this.activateSubItem(subItems[newIndex], naviName, newIndex, true);
    }

    // Helper to get current context data for a navi item
    getNaviContext(naviName) {
        const naviItem = document.querySelector(`.navi-item[data-navi="${naviName}"]`);
        const subItems = naviItem.querySelectorAll('.sub-navi-item');
        return {
            subItems: subItems,
            totalItems: subItems.length,
            currentIndex: this.currentSubNaviIndices[naviName] || 0
        };
    }

    // --- Visual Activation ---

    activateNaviItem(naviItem, playSound = true) {
        naviItem.classList.add('active');
        if (playSound) {
            this.playAudio(naviItem.getAttribute('data-sound-main'));
        }
    }

    activateSubItem(subItem, naviName, index, triggerGlitch = true, playSound = true) {
        const naviItem = document.querySelector(`.navi-item[data-navi="${naviName}"]`);
        const container = naviItem.querySelector('.sub-navi-item-container');
        const track = naviItem.querySelector('.sub-navi-track');
        const subItems = naviItem.querySelectorAll('.sub-navi-item');

        // UI Reset
        subItems.forEach(item => item.classList.remove('active'));
        subItem.classList.add('active');

        // Center the active item logic
        const itemWidth = subItem.offsetWidth;
        const containerWidth = container.offsetWidth;

        // Calculate offset (width of all previous items)
        let offset = 0;
        for (let i = 0; i < index; i++) {
            offset += subItems[i].offsetWidth;
        }

        const itemCenter = offset + (itemWidth / 2);
        const containerCenter = containerWidth / 2;
        const scrollOffset = containerCenter - itemCenter;

        // Apply Transform
        track.style.transform = `translateX(${scrollOffset}px)`;

        // Audio & Page Switch
        if (playSound) {
            this.playAudio(naviItem.getAttribute('data-sound-sub'));
        }

        const pageName = subItem.getAttribute('data-page');
        this.switchPage(pageName, triggerGlitch);
    }

    switchPage(pageName, triggerGlitch = true) {
        const allPages = document.querySelectorAll('.page');
        allPages.forEach(page => page.classList.remove('active'));

        const targetPage = document.getElementById(pageName);
        if (targetPage) {
            targetPage.classList.add('active');
            if (triggerGlitch) this.triggerGlitchEffect();
        }
    }

    // --- CRT / Glitch / Start Overlay Effects ---

    initPressStart() {
        const overlay = document.getElementById('press-start-overlay');
        if (!overlay) return;
        overlay.addEventListener('click', () => {
            overlay.classList.add('hidden');
            this.setInitialPage();
        });

        // Pending, will cause conflit, since logic = after clicked press-start-overlay then active Blackboard
        // Reset when user leaves the tab/window
        // document.addEventListener('visibilitychange', () => {
        //     if (document.hidden) {
        //         overlay.classList.remove('hidden');
        //     }
        // });
    }

    setInitialPage() {
        // Hardcoded initial state logic (Blackboard -> Log)
        const firstNaviItem = document.querySelector('.navi-item[data-navi="navi-blackboard"]');
        if (!firstNaviItem) return;

        this.currentNaviIndex = 0;
        this.activateNaviItem(firstNaviItem, true);

        const firstSubItem = firstNaviItem.querySelector('.sub-navi-item[data-page="page-blackboard-log"]');
        if (firstSubItem) {
            this.activateSubItem(firstSubItem, 'navi-blackboard', 0, true, false);
        }
    }

    createGlitchElement() {
        const glitchElement = document.createElement('div');
        glitchElement.className = 'crt-noise';
        glitchElement.id = 'crt-noise';
        document.body.appendChild(glitchElement);
    }

    triggerGlitchEffect() {
        const glitchElement = document.getElementById('crt-noise');
        if (!glitchElement) return;

        glitchElement.classList.remove('active');
        void glitchElement.offsetHeight; // Force reflow
        glitchElement.classList.add('active');

        setTimeout(() => glitchElement.classList.remove('active'), 1200);
    }
}

// Start the Manager when DOM is ready
window.onload = () => {
    window.naviManager = new NaviManager();
};