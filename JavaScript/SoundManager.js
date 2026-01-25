/**
 * SoundManager - Universal Audio Trigger System
 * Uses Event Delegation to bind sounds to HTML elements via data attributes.
 * 
 * Usage:
 * <element data-sound-click="./path/to.mp3"> -> Plays on click
 * <element data-sound-hover="./path/to.mp3"> -> Plays on mouseover
 * <element data-sound-input="./path/to.mp3"> -> Plays on keyboard input
 * <element data-sound-volume="0.5">           -> Optional volume override
 */
class SoundManager {
    constructor() {
        this.cache = {}; // Cache Audio objects to avoid reloading
        this.globalVolume = 0.2; // Global Volume Multiplier (0.0 to 1.0)
        this.init();
    }

    init() {
        // Event Delegation: Listen to body to catch all current and future elements

        // 1. Click
        document.body.addEventListener('click', (e) => this.handleInteraction(e, 'click'), true);

        // 2. Hover (mouseenter does not bubble, so we use capture phase 'true' or mouseover)
        // Using mouseover with check to avoid excessive firing
        document.body.addEventListener('mouseover', (e) => this.handleInteraction(e, 'hover'));

        // 3. Input (Typing)
        document.body.addEventListener('input', (e) => this.handleInteraction(e, 'input'));
    }

    handleInteraction(e, eventType) {
        // Find the closest element that has the specific sound attribute
        const target = e.target.closest(`[data-sound-${eventType}]`);

        if (target) {
            // Anti-spam optimization for hover: 
            // If we just played this specific sound on this specific target recently, skip
            if (eventType === 'hover' && target._lastHoverTime && (Date.now() - target._lastHoverTime < 100)) {
                return;
            }
            if (eventType === 'hover') target._lastHoverTime = Date.now();

            const soundPath = target.getAttribute(`data-sound-${eventType}`);
            const volume = parseFloat(target.getAttribute('data-sound-volume')) || 1.0;
            const playbackRate = parseFloat(target.getAttribute('data-sound-speed')) || 1.0;

            this.play(soundPath, { volume, playbackRate });
        }
    }

    play(path, options = {}) {
        if (!path) return;

        // Create or Retrieve from Cache
        if (!this.cache[path]) {
            this.cache[path] = new Audio(path);
        }

        const audio = this.cache[path];

        // Clone node for overlapping sounds (e.g., rapid typing)
        // OR just reset currentTime. Resetting is better for memory, Cloning is better for rapid fire.
        // For UI sounds, cloning is usually safer to prevent cutting off.
        // However, to save memory on mobile/web, let's try strict reset first.

        // Calculate final volume
        const finalVolume = (options.volume || 1.0) * this.globalVolume;

        if (!audio.paused) {
            // If already playing, clone it to allow overlap (Essential for typing)
            const clone = audio.cloneNode();
            clone.volume = finalVolume;
            clone.playbackRate = options.playbackRate || 1.0;
            clone.play().catch(e => console.warn('Sound clone error:', e));
        } else {
            audio.currentTime = 0;
            audio.volume = finalVolume;
            audio.playbackRate = options.playbackRate || 1.0;
            audio.play().catch(e => console.warn('Sound play error:', e));
        }
    }
}

// Auto-initialize when DOM is ready
if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', () => {
        window.soundManager = new SoundManager();
    });
} else {
    window.soundManager = new SoundManager();
}
