window.onload = init;

// Current state tracking
let currentNaviIndex = 0;
let currentSubNaviIndices = {}; // Track current sub-item for each navi item
const audioCache = {}; // Cache for Audio objects

function playAudio(url) {
    if (!url) return;

    if (!audioCache[url]) {
        audioCache[url] = new Audio(url);
    }

    const sound = audioCache[url];
    sound.currentTime = 0;
    sound.play().catch(e => console.log('Audio play failed', e));
}

function init() {
    const navItems = document.querySelectorAll('.navi-item');

    navItems.forEach((item, index) => {
        const naviName = item.getAttribute('data-navi');
        currentSubNaviIndices[naviName] = 0;

        item.addEventListener('click', () => onNaviClick(index));

        const container = item.querySelector('.sub-navi-item-container');
        if (container) {
            container.addEventListener('wheel', (e) => onWheel(e, naviName), { passive: false });

            // Touch Events
            container.addEventListener('touchstart', (e) => {
                touchStartX = e.changedTouches[0].screenX;
            }, { passive: true });

            container.addEventListener('touchend', (e) => {
                touchEndX = e.changedTouches[0].screenX;
                handleTouch(naviName);
            });
        }

        const subItems = item.querySelectorAll('.sub-navi-item');
        subItems.forEach((subItem, subIndex) => {
            subItem.addEventListener('click', (e) => {
                e.stopPropagation();
                onSubNaviClick(naviName, subIndex);
            });
        });
    });

    createGlitchElement();
    // setInitialPage(); // Disable auto-init
    initPressStart(); // Enable Press Start system
    triggerGlitchEffect();
}

// Touch Event Logic
let touchStartX = 0;
let touchEndX = 0;
const minSwipeDistance = 50; // Threshold for valid swipe

function initPressStart() {
    const overlay = document.getElementById('press-start-overlay');
    if (!overlay) return;

    overlay.addEventListener('click', () => {
        overlay.classList.add('hidden');
        setInitialPage();
    });
}

function handleTouch(naviName) {
    const distance = touchEndX - touchStartX;
    const naviItem = document.querySelector(`.navi-item[data-navi="${naviName}"]`);
    const subItems = naviItem.querySelectorAll('.sub-navi-item');
    const totalItems = subItems.length;

    if (totalItems === 0) return;

    const currentIndex = currentSubNaviIndices[naviName] || 0;
    let newIndex = currentIndex;

    // Swift Left (Next Item)
    if (distance < -minSwipeDistance) {
        newIndex = (currentIndex + 1) % totalItems;
    }
    // Swipe Right (Previous Item)
    else if (distance > minSwipeDistance) {
        newIndex = (currentIndex - 1 + totalItems) % totalItems;
    }

    if (newIndex !== currentIndex) {
        currentSubNaviIndices[naviName] = newIndex;
        activateSubItem(subItems[newIndex], naviName, newIndex, true);
    }
}

function createGlitchElement() {
    const glitchElement = document.createElement('div');
    glitchElement.className = 'crt-noise';
    glitchElement.id = 'crt-noise';
    document.body.appendChild(glitchElement);
}

function triggerGlitchEffect() {
    const glitchElement = document.getElementById('crt-noise');
    if (!glitchElement) return;

    glitchElement.classList.remove('active');
    void glitchElement.offsetHeight; // Force reflow
    glitchElement.classList.add('active');

    setTimeout(() => glitchElement.classList.remove('active'), 1200);
}

/*REMEMBER TO SYNC THIS AFTER CHANGES*/
function setInitialPage() {
    /*1*/
    const firstNaviItem = document.querySelector('.navi-item[data-navi="navi-blackboard"]');
    if (!firstNaviItem) return;

    currentNaviIndex = 0;
    activateNaviItem(firstNaviItem, true);

    /*2*/
    const firstSubItem = firstNaviItem.querySelector('.sub-navi-item[data-page="page-blackboard-log"]');
    if (firstSubItem) {
        /*3*/
        activateSubItem(firstSubItem, 'navi-blackboard', 0, true, false);
    }
}

function onNaviClick(index) {
    const navItems = document.querySelectorAll('.navi-item');
    const clickedItem = navItems[index];
    const naviName = clickedItem.getAttribute('data-navi');

    navItems.forEach((item, i) => {
        if (i !== index) item.classList.remove('active');
    });

    const isChanging = currentNaviIndex !== index;
    currentNaviIndex = index;
    activateNaviItem(clickedItem, isChanging);

    const subIndex = currentSubNaviIndices[naviName] || 0;
    const subItems = clickedItem.querySelectorAll('.sub-navi-item');
    if (subItems[subIndex]) {
        activateSubItem(subItems[subIndex], naviName, subIndex, false, false);
    }
}

function onSubNaviClick(naviName, subIndex) {
    const naviItem = document.querySelector(`.navi-item[data-navi="${naviName}"]`);
    const subItems = naviItem.querySelectorAll('.sub-navi-item');

    currentSubNaviIndices[naviName] = subIndex;
    activateSubItem(subItems[subIndex], naviName, subIndex, true);
}

function activateNaviItem(naviItem, playSound = true) {
    naviItem.classList.add('active');

    if (playSound) {
        const soundUrl = naviItem.getAttribute('data-sound-main');
        playAudio(soundUrl);
    }
}



function onWheel(event, naviName) {
    event.preventDefault();

    const naviItem = document.querySelector(`.navi-item[data-navi="${naviName}"]`);
    const subItems = naviItem.querySelectorAll('.sub-navi-item');
    const totalItems = subItems.length;

    if (totalItems === 0) return;

    const currentIndex = currentSubNaviIndices[naviName] || 0;
    const newIndex = event.deltaY > 0
        ? (currentIndex + 1) % totalItems
        : (currentIndex - 1 + totalItems) % totalItems;

    currentSubNaviIndices[naviName] = newIndex;
    activateSubItem(subItems[newIndex], naviName, newIndex, true);
}

function activateSubItem(subItem, naviName, index, triggerGlitch = true, playSound = true) {
    const naviItem = document.querySelector(`.navi-item[data-navi="${naviName}"]`);
    const container = naviItem.querySelector('.sub-navi-item-container');
    const track = naviItem.querySelector('.sub-navi-track');
    const subItems = naviItem.querySelectorAll('.sub-navi-item');

    // Remove active class from all sub-items in this container
    subItems.forEach(item => item.classList.remove('active'));

    // Add active class to current sub-item
    subItem.classList.add('active');

    // Calculate scroll position to center the active item under the parent navi-item
    // The container is centered via left: 50%, translateX(-50%)
    // We want to position the active item at the center of the container

    const itemWidth = subItem.offsetWidth;
    const containerWidth = container.offsetWidth;

    // Calculate offset: sum of widths of all items before the active one
    let offset = 0;
    for (let i = 0; i < index; i++) {
        offset += subItems[i].offsetWidth;
    }

    // We want to center the active item in the container
    // Container center is at containerWidth / 2
    // Active item center should be at: offset + itemWidth / 2
    // So we need to shift the track left by: (offset + itemWidth/2) - containerWidth/2
    const itemCenter = offset + (itemWidth / 2);
    const containerCenter = containerWidth / 2;
    const scrollOffset = containerCenter - itemCenter;

    // Apply transform to the TRACK (items), not the container
    track.style.transform = `translateX(${scrollOffset}px)`;

    if (playSound) {
        const soundUrl = naviItem.getAttribute('data-sound-sub');
        playAudio(soundUrl);
    }

    // Switch page
    const pageName = subItem.getAttribute('data-page');
    switchPage(pageName, triggerGlitch);
}

function switchPage(pageName, triggerGlitch = true) {
    const allPages = document.querySelectorAll('.page');
    allPages.forEach(page => page.classList.remove('active'));

    const targetPage = document.getElementById(pageName);
    if (targetPage) {
        targetPage.classList.add('active');
        if (triggerGlitch) triggerGlitchEffect();
    }
}

/*
Scrolling behavior demonstration based on the 6 steps in comments:

Step1: Initial state - sub-navi-item-1 is centered under parent
            |
            v
            1__2__3_

Step2: Scroll down (right) - move to item 2
            |
            v
         1__2__3__4_

Step3: Scroll down (right) - move to item 3
            |
            v
       1__2__3__4__5

Step4: Scroll down (right) - move to item 4
            |
            v
      _2__3__4__5

Step5: Scroll down (right) - move to item 5
            |
            v
      _3__4__5

Step6: Scroll down (right) - wrap around to item 1
            |
            v
            1__2__3_

When at Step1 and scroll up (left): wrap to Step5 (item 5)
*/