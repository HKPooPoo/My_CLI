class DataManager {
    constructor() {
        // URL updated by Cloudflare Tunnel (Warning: Changes on restart)
        this.apiBase = 'https://worker-wild-ali-loads.trycloudflare.com/My/PHP/';
        this.userData = JSON.parse(localStorage.getItem('wpp_user_data')) || {
            username: null,
            level: 0,
            isLoggedIn: false
        };

        // Multi-context Blackboard Data Structure
        // Supports 'log', 'todo', or any future context
        // Migration: If old 'wpp_blackboard_data' exists, migrate it to 'log'
        this.blackboards = {};
        this._initBlackboard('log');
        this._initBlackboard('todo');
    }

    // --- Private: Initialize a blackboard context ---
    _initBlackboard(context) {
        const storageKey = `wpp_blackboard_${context}`;

        // Migration for old data (only for 'log')
        if (context === 'log') {
            const oldData = localStorage.getItem('wpp_blackboard_data');
            if (oldData && !localStorage.getItem(storageKey)) {
                localStorage.setItem(storageKey, oldData);
                localStorage.removeItem('wpp_blackboard_data'); // Clean up old key
            }
        }

        this.blackboards[context] = JSON.parse(localStorage.getItem(storageKey)) || {
            current_draft: '',
            history: [],
            view_index: 0
        };
    }

    // --- Private: Get blackboard data for a context ---
    _getBB(context) {
        if (!this.blackboards[context]) {
            this._initBlackboard(context);
        }
        return this.blackboards[context];
    }

    // --- Persistence ---
    saveLocal(context = null) {
        localStorage.setItem('wpp_user_data', JSON.stringify(this.userData));

        if (context) {
            // Save specific context
            localStorage.setItem(`wpp_blackboard_${context}`, JSON.stringify(this.blackboards[context]));
        } else {
            // Save all contexts
            for (const ctx in this.blackboards) {
                localStorage.setItem(`wpp_blackboard_${ctx}`, JSON.stringify(this.blackboards[ctx]));
            }
        }
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

    // --- Blackboard Logic (Context-aware) ---

    // Get content for display based on view_index
    getDisplayContent(context = 'log') {
        const bb = this._getBB(context);
        if (bb.view_index === 0) {
            return bb.current_draft;
        } else {
            const historyIndex = bb.view_index - 1;
            if (historyIndex >= 0 && historyIndex < bb.history.length) {
                return bb.history[historyIndex];
            }
            return '';
        }
    }

    // Update content (Allowed for both Active and History)
    updateDraft(context = 'log', text) {
        const bb = this._getBB(context);
        if (bb.view_index === 0) {
            bb.current_draft = text;
        } else {
            const historyIndex = bb.view_index - 1;
            if (historyIndex >= 0 && historyIndex < bb.history.length) {
                bb.history[historyIndex] = text;
            }
        }
        this.saveLocal(context);
        return true;
    }

    getStackStatus(context = 'log') {
        const bb = this._getBB(context);
        if (bb.view_index === 0) {
            return `${bb.history.length}`;
        } else {
            return `${bb.view_index}/${bb.history.length}`;
        }
    }

    // Clear Local Blackboard Data for a specific context
    clearBlackboardData(context = 'log') {
        this.blackboards[context] = {
            current_draft: '',
            history: [],
            view_index: 0
        };
        this.saveLocal(context);
        return true;
    }

    // Clear ALL Blackboard Data (all contexts)
    clearAllBlackboardData() {
        for (const ctx in this.blackboards) {
            this.clearBlackboardData(ctx);
        }
        return true;
    }

    // Push (Swipe Up): Save current and move to new
    push(context = 'log') {
        const bb = this._getBB(context);
        if (bb.view_index > 0) {
            bb.view_index--;
            this.saveLocal(context);
            return { action: 'nav', content: this.getDisplayContent(context) };
        } else {
            // VALIDATION: Prevent pushing empty content
            if (!bb.current_draft || bb.current_draft.trim() === '') {
                return { action: 'ignore', content: bb.current_draft };
            }

            // Push current to history (Stack: newest first)
            bb.history.unshift(bb.current_draft);
            if (bb.history.length > 10) {
                bb.history.pop();
            }

            bb.current_draft = '';
            this.saveLocal(context);
            return { action: 'new', content: '' };
        }
    }

    // Pull (Swipe Down): View history
    pull(context = 'log') {
        const bb = this._getBB(context);
        const nextIndex = bb.view_index + 1;
        const historyIdx = nextIndex - 1;

        if (historyIdx < bb.history.length) {
            bb.view_index = nextIndex;
            this.saveLocal(context);
            return { action: 'nav', content: bb.history[historyIdx] };
        } else {
            return { action: 'stop', content: null };
        }
    }

    // --- Sync (Git Style) ---
    // Note: Currently syncs only 'log' context. Can be extended to sync all.
    async commit(context = 'log') {
        if (!this.userData.isLoggedIn) return { success: false, message: 'Not logged in' };

        const bb = this._getBB(context);
        const payload = {
            action: 'commit',
            username: this.userData.username,
            slot_type: context,
            data: {
                current_draft: bb.current_draft,
                history: bb.history
            }
        };

        return await this.post('sync.php', payload);
    }

    async checkout(context = 'log') {
        if (!this.userData.isLoggedIn) return { success: false, message: 'Not logged in' };

        const res = await this.post('sync.php', { action: 'checkout', username: this.userData.username, slot_type: context });
        if (res.success) {
            const bb = this._getBB(context);
            bb.current_draft = res.data.current_draft;
            bb.history = res.data.history;
            // Show most recent history item if available, otherwise show draft
            bb.view_index = (bb.history && bb.history.length > 0) ? 1 : 0;
            this.saveLocal(context);
            return { success: true, content: this.getDisplayContent(context) };
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





