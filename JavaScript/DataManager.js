/**
 * DataManager - Handles all data persistence, API communication, and state management.
 * 
 * Responsibilities:
 * 1. LocalStorage Management (User Session, Blackboard Contexts)
 * 2. API Communication (Auth, Sync) with backend PHP
 * 3. Business Logic for Blackboard Stack (Push/Pull/History)
 */
class DataManager {
    constructor() {
        // --- Configuration ---
        // URL updated by Cloudflare Tunnel automatically
        // Docker: Replace by http://localhost:8080/PHP/ if you want to test DB by yourself (without my host)
        // this.apiBase = 'http://localhost:8080/PHP/';
        this.apiBase = 'https://worker-wild-ali-loads.trycloudflare.com/My/PHP/';

        // --- State Initialization ---

        // 1. User Session
        this.userData = JSON.parse(localStorage.getItem('wpp_user_data')) || {
            username: null,
            level: 0,
            isLoggedIn: false
        };

        // 2. Blackboard Contexts (Supports 'log', 'todo', etc.)
        this.blackboards = {};

        // Initialize supported contexts
        this._initBlackboard('log');
        this._initBlackboard('todo');
    }

    // ==========================================
    // SECTION: Internal State Management
    // ==========================================

    _initBlackboard(context) {
        const storageKey = `wpp_blackboard_${context}`;

        // Legacy Migration (Unique to 'log')
        if (context === 'log') {
            const oldData = localStorage.getItem('wpp_blackboard_data');
            if (oldData && !localStorage.getItem(storageKey)) {
                localStorage.setItem(storageKey, oldData);
                localStorage.removeItem('wpp_blackboard_data');
            }
        }

        // Load or Create Default
        this.blackboards[context] = JSON.parse(localStorage.getItem(storageKey)) || {
            current_draft: '',
            history: [],   // Stack: [Newest, ..., Oldest]
            view_index: 0  // 0: Draft, 1+: History[0], etc.
        };
    }

    _getBB(context) {
        if (!this.blackboards[context]) {
            this._initBlackboard(context);
        }
        return this.blackboards[context];
    }

    saveLocal(context = null) {
        // Always save user session
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

    // ==========================================
    // SECTION: Authentication & Network
    // ==========================================

    async checkConnection() {
        const res = await this._post('auth.php', { action: 'ping' });
        return res.success;
    }

    async register(username, password) {
        return await this._post('auth.php', { action: 'register', username, password });
    }

    async login(username, password) {
        const res = await this._post('auth.php', { action: 'login', username, password });
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

    logout() {
        this.userData = { username: null, level: 0, isLoggedIn: false };
        this.saveLocal();
    }

    // ==========================================
    // SECTION: Blackboard Operations (Logic)
    // ==========================================

    /**
     * READ: Get what should be shown on the screen based on view_index
     */
    getDisplayContent(context = 'log') {
        const bb = this._getBB(context);
        if (bb.view_index === 0) {
            return bb.current_draft;
        } else {
            // view_index 1 maps to history[0]
            const historyIndex = bb.view_index - 1;
            if (historyIndex >= 0 && historyIndex < bb.history.length) {
                return bb.history[historyIndex];
            }
            return '';
        }
    }

    /**
     * WRITE: Update the content of the currently viewed slot (Draft or History)
     */
    updateDraft(context = 'log', text) {
        const bb = this._getBB(context);
        if (bb.view_index === 0) {
            bb.current_draft = text;
        } else {
            // Allow editing history items in place
            const historyIndex = bb.view_index - 1;
            if (historyIndex >= 0 && historyIndex < bb.history.length) {
                bb.history[historyIndex] = text;
            }
        }
        this.saveLocal(context);
        return true;
    }

    /**
     * INFO: Get status string like "0" or "3/10"
     */
    getStackStatus(context = 'log') {
        const bb = this._getBB(context);
        if (bb.view_index === 0) {
            return `${bb.history.length}`;
        } else {
            return `${bb.view_index}/${bb.history.length}`;
        }
    }

    /**
     * ACTION: Swipe Up (Push)
     * - If in history: Go back to newer items
     * - If in draft: Save draft to history, clear draft
     */
    push(context = 'log') {
        const bb = this._getBB(context);

        // Case 1: Navigating back towards Draft
        if (bb.view_index > 0) {
            bb.view_index--;
            this.saveLocal(context);
            return { action: 'nav', content: this.getDisplayContent(context) };
        }

        // Case 2: In Draft Mode, try to push to stack
        else {
            // Validation: Don't push empty content
            if (!bb.current_draft || bb.current_draft.trim() === '') {
                return { action: 'ignore', content: bb.current_draft };
            }

            // Push to Stack
            bb.history.unshift(bb.current_draft);

            // Limit Stack Size (Max 10)
            if (bb.history.length > 10) {
                bb.history.pop();
            }

            bb.current_draft = '';
            this.saveLocal(context);
            return { action: 'new', content: '' };
        }
    }

    /**
     * ACTION: Swipe Down (Pull)
     * - Navigate into history (older items)
     */
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

    clearBlackboardData(context = 'log') {
        this.blackboards[context] = {
            current_draft: '',
            history: [],
            view_index: 0
        };
        this.saveLocal(context);
        return true;
    }

    clearAllBlackboardData() {
        for (const ctx in this.blackboards) {
            this.clearBlackboardData(ctx);
        }
        return true;
    }

    // ==========================================
    // SECTION: Cloud Synchronization
    // ==========================================

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

        return await this._post('sync.php', payload);
    }

    async checkout(context = 'log') {
        if (!this.userData.isLoggedIn) return { success: false, message: 'Not logged in' };

        const res = await this._post('sync.php', {
            action: 'checkout',
            username: this.userData.username,
            slot_type: context
        });

        if (res.success) {
            const bb = this._getBB(context);
            bb.current_draft = res.data.current_draft;
            bb.history = res.data.history;
            // Auto-navigate to most recent history if available
            bb.view_index = (bb.history && bb.history.length > 0) ? 1 : 0;
            this.saveLocal(context);
            return { success: true, content: this.getDisplayContent(context) };
        }
        return res;
    }

    // ==========================================
    // SECTION: Private Helpers
    // ==========================================

    async _post(endpoint, data) {
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