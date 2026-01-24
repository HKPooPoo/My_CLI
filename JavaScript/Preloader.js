/**
 * Preloader.js
 * Automatically preloads audio assets to prevent latency on first interaction.
 * Crucial for GitHub Pages / Cloud environments.
 */

(function () {
    console.log('[System] Initializing Resource Preloader...');

    const audioAssets = [
        './Sound/UIGeneralCancel.mp3',
        './Sound/UIGeneralFocus.mp3',
        './Sound/UIGeneralOK.mp3',
        './Sound/UIPipboyOK.mp3',
        './Sound/UIPipboyOKPress.mp3',
        './Sound/UISelectOff.mp3',
        './Sound/UISelectOn.mp3'
    ];

    // Global cache to prevent garbage collection
    window.ag_audioCache = [];

    function preloadAudio(url) {
        const audio = new Audio();
        audio.src = url;
        audio.preload = 'auto'; // Hint to browser
        audio.load(); // Force load

        // Keep reference
        window.ag_audioCache.push(audio);
    }

    // Execute
    audioAssets.forEach(assetUrl => {
        try {
            preloadAudio(assetUrl);
        } catch (e) {
            console.warn(`[System] Failed to preload: ${assetUrl}`, e);
        }
    });

    console.log(`[System] Preload queue started for ${audioAssets.length} audio assets.`);
})();
