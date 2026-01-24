class DataManager {
    constructor() {
        // URL updated by Cloudflare Tunnel (Warning: Changes on restart)
        this.apiBase = 'https://often-publish-template-concord.trycloudflare.com/My/PHP/';
        this.userData = JSON.parse(localStorage.getItem('wpp_user_data')) || {
            username: null,
            level: 0,
            isLoggedIn: false
        };

        // Blackboard Data Structure
        // view_index: 0 = Active Draft, 1 = History[0], etc.
        this.bbData = JSON.parse(localStorage.getItem('wpp_blackboard_data')) || {
            current_draft: '',
            history: [],
            view_index: 0
        };
    }

    // --- Persistence ---
    saveLocal() {
        localStorage.setItem('wpp_user_data', JSON.stringify(this.userData));
        localStorage.setItem('wpp_blackboard_data', JSON.stringify(this.bbData));
    }

    // --- Account System ---
    async register(username, password) {
        const res = await this.post('auth.php', { action: 'register', username, password });
        return res;
    }

    async login(username, password) {
        const res = await this.post('auth.php', { action: 'login', username, password });
        if (res.success) {
            this.userData = {
                username: username,
                level: res.level,
                isLoggedIn: true
            };
            this.saveLocal();
        }
        return res;
    }

    async checkConnection() {
        const res = await this.post('auth.php', { action: 'ping' });
        return res.success;
    }

    logout() {
        this.userData = { username: null, level: 0, isLoggedIn: false };
        this.saveLocal();
    }

    // --- Blackboard Logic ---

    // Get content for display based on view_index
    getDisplayContent() {
        if (this.bbData.view_index === 0) {
            return this.bbData.current_draft;
        } else {
            // view_index 1 corresponds to history[0]
            const historyIndex = this.bbData.view_index - 1;
            if (historyIndex >= 0 && historyIndex < this.bbData.history.length) {
                return this.bbData.history[historyIndex];
            }
            return ''; // Should not happen if logic is correct
        }
    }

    // Update content (Allowed for both Active and History)
    updateDraft(text) {
        if (this.bbData.view_index === 0) {
            this.bbData.current_draft = text;
        } else {
            // Update history entry in-place
            const historyIndex = this.bbData.view_index - 1;
            if (historyIndex >= 0 && historyIndex < this.bbData.history.length) {
                this.bbData.history[historyIndex] = text;
            }
        }
        this.saveLocal();
        return true;
    }

    getStackStatus() {
        // Returns string describing current pool status
        if (this.bbData.view_index === 0) {
            const count = this.bbData.history.length;
            // ACTIVE DRAFT shows nothing or just count? User said "Active Draft shows no font, but digits only"
            // Interpreted as just the count of history items? Or count of drafts?
            // "Active Draft shows no font, but digits only"
            // Original: ACTIVE DRAFT [HIST: count/10]
            // New: count
            return `${count}`;
        } else {
            const current = this.bbData.view_index;
            const total = this.bbData.history.length;
            // History View
            return `${current}/${total}`;
        }
    }

    // Clear Local Blackboard Data
    clearBlackboardData() {
        this.bbData = {
            current_draft: '',
            history: [],
            view_index: 0
        };
        this.saveLocal();
        return true;
    }

    // Push (Swipe Up): Save current and move to new
    // If in history, move towards active.
    push() {
        if (this.bbData.view_index > 0) {
            // In history, moving back to future/active
            this.bbData.view_index--;
            this.saveLocal();
            return { action: 'nav', content: this.getDisplayContent() };
        } else {
            // In Active, commit to history and clear

            // VALIDATION: Prevent pushing empty content
            if (!this.bbData.current_draft || this.bbData.current_draft.trim() === '') {
                return { action: 'ignore', content: this.bbData.current_draft };
            }

            // Push current to history (Stack: Add to front/top? User said "Stack".

            // Push current to history (Stack: Add to front/top? User said "Stack". 
            // array.unshift() adds to beginning. array.push() adds to end.
            // If History[0] is newest. "Swipe Down (???) -> view index 1".
            // So View Index 1 should be the one just pushed.
            // So we should use unshift (add to index 0).
            // History = [Newest, ..., Oldest]

            // Limit history to 10
            this.bbData.history.unshift(this.bbData.current_draft);
            if (this.bbData.history.length > 10) {
                this.bbData.history.pop();
            }

            this.bbData.current_draft = '';
            // view_index remains 0
            this.saveLocal();
            return { action: 'new', content: '' };
        }
    }

    // Pull (Swipe Down): View history
    pull() {
        // Check if there is history to view
        // Next index = view_index + 1
        // If next index corresponds to valid history (index - 1 < length)
        const nextIndex = this.bbData.view_index + 1;
        const historyIdx = nextIndex - 1;

        if (historyIdx < this.bbData.history.length) {
            this.bbData.view_index = nextIndex;
            this.saveLocal();
            return { action: 'nav', content: this.bbData.history[historyIdx] };
        } else {
            // End of history
            return { action: 'stop', content: null };
        }
    }

    // --- Sync (Git Style) ---
    async commit() {
        if (!this.userData.isLoggedIn) return { success: false, message: 'Not logged in' };

        // Send: { current_draft, history } (Don't need view_index usually, or maybe user wants to sync that too?
        // Plan says: "sync.php receives ... inserts ...". 
        // We'll send the raw data.

        // Note: The history array in bbData is [Newest, ..., Oldest].
        // PHP expects an array. It inserts them.
        // If PHP inserts in loop, standard array order is preserved in DB insert order?
        // PHP `foreach` iterates 0..N.
        // We need to ensure that when we Checkout (Select All Order By ID ASC), we get [Newest...Oldest]?
        // Or [Oldest...Newest]?
        // Database "ORDER BY created_at" or ID might be safest.

        // Let's send exactly what we have.
        // When checking out, we want to reconstruct `this.bbData.history`.
        const payload = {
            action: 'commit',
            username: this.userData.username,
            data: {
                current_draft: this.bbData.current_draft,
                history: this.bbData.history
            }
        };

        return await this.post('sync.php', payload);
    }

    async checkout() {
        if (!this.userData.isLoggedIn) return { success: false, message: 'Not logged in' };

        const res = await this.post('sync.php', { action: 'checkout', username: this.userData.username });
        if (res.success) {
            // Overwrite local
            this.bbData.current_draft = res.data.current_draft;
            this.bbData.history = res.data.history;
            this.bbData.view_index = 0; // Reset view
            this.saveLocal();
            return { success: true, content: this.getDisplayContent() };
        }
        return res;
    }

    // --- Helper ---
    async post(endpoint, data) {
        try {
            const response = await fetch(this.apiBase + endpoint, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify(data)
            });
            return await response.json();
        } catch (e) {
            console.error('API Error:', e);
            return { success: false, message: 'Connection Error' };
        }
    }
}


