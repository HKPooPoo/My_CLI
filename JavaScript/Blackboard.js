/**
 * BlackboardUI - Reusable Blackboard Component
 * Each instance manages its own context (e.g., 'log', 'todo')
 */
class BlackboardUI {
    constructor(dm, context, elements) {
        this.dm = dm;
        this.context = context;

        // DOM Elements (passed in or looked up by suffix)
        this.input = elements.input;
        this.btnPush = elements.btnPush;
        this.btnPull = elements.btnPull;
        this.stackStatus = elements.stackStatus;

        this._init();
    }

    _init() {
        // Initial Load
        this.input.value = this.dm.getDisplayContent(this.context);
        this.updateStackInfo();

        // Input Handling
        this.input.addEventListener('input', (e) => {
            this.dm.updateDraft(this.context, e.target.value);
        });

        // Push (Swipe Up)
        this.btnPush.addEventListener('click', () => {
            const res = this.dm.push(this.context);
            if (res.action !== 'ignore') {
                this.input.value = res.content;
                this.updateStackInfo();
            } else {
                this.btnPush.style.borderColor = 'var(--text-red)';
                setTimeout(() => this.btnPush.style.borderColor = '', 300);
            }
        });

        // Pull (Swipe Down)
        this.btnPull.addEventListener('click', () => {
            const res = this.dm.pull(this.context);
            if (res.action !== 'stop') {
                this.input.value = res.content;
                this.updateStackInfo();
            } else {
                this.btnPull.style.borderColor = 'var(--text-red)';
                setTimeout(() => this.btnPull.style.borderColor = '', 300);
            }
        });
    }

    updateStackInfo() {
        this.stackStatus.textContent = this.dm.getStackStatus(this.context);
    }

    // Refresh display (e.g., after checkout)
    refresh() {
        this.input.value = this.dm.getDisplayContent(this.context);
        this.updateStackInfo();
    }

    // Clear this blackboard
    clear() {
        this.dm.clearBlackboardData(this.context);
        this.input.value = '';
        this.updateStackInfo();
    }
}


/**
 * BlackboardManager
 * Encapsulates the main application logic, event listeners, and UI components
 * related to the Blackboard notification, authentication, and sync systems.
 */
class BlackboardManager {
    constructor() {
        this.dm = new DataManager();
        this.boards = {}; // Store BlackboardUI instances

        this.elements = {
            statusDiv: document.getElementById('login-status'),
            dbStatusDiv: document.getElementById('db-status'),
            notifArea: document.getElementById('notification-area'),
            authTitle: document.querySelector('.auth-title'),
            // Login UI
            authUsername: document.getElementById('auth-username'),
            authPassword: document.getElementById('auth-password'),
            btnLogin: document.getElementById('btn-login'),
            btnRegister: document.getElementById('btn-register'), // Note: this might be re-wrapped by MultiStepButton logic which doesn't replace element but adds listener
            btnLogout: document.getElementById('btn-logout'),
            // Sync Buttons
            btnCommit: document.getElementById('btn-commit'),
            btnCheckout: document.getElementById('btn-checkout'),
            btnWipe: document.getElementById('btn-wipe')
        };

        this.init();
    }

    init() {
        this.initBlackboards();
        this.initStatusCheck();
        this.initAuthListeners();
        this.initSyncListeners();
        this.initWipeListener();
    }

    // --- Sub-Components Initialization ---
    initBlackboards() {
        this.boards.log = new BlackboardUI(this.dm, 'log', {
            input: document.getElementById('blackboard-input-log'),
            btnPush: document.getElementById('btn-push-log'),
            btnPull: document.getElementById('btn-pull-log'),
            stackStatus: document.getElementById('stack-status-log')
        });

        this.boards.todo = new BlackboardUI(this.dm, 'todo', {
            input: document.getElementById('blackboard-input-todo'),
            btnPush: document.getElementById('btn-push-todo'),
            btnPull: document.getElementById('btn-pull-todo'),
            stackStatus: document.getElementById('stack-status-todo')
        });
    }

    // --- Status & Notifications ---
    showNotification(message, isError = false) {
        const toast = document.createElement('div');
        toast.className = `retro-toast ${isError ? 'error' : ''}`;
        toast.textContent = `> ${message}`;

        this.elements.notifArea.appendChild(toast);

        // Auto remove
        setTimeout(() => {
            toast.style.animation = 'fadeOut 0.5s ease-out forwards';
            setTimeout(() => toast.remove(), 500);
        }, 3000);
    }

    updateStatus() {
        const uiLogin = [
            this.elements.authUsername,
            this.elements.authPassword,
            this.elements.btnLogin,
            this.elements.btnRegister
        ];
        const uiLogout = [this.elements.btnLogout];

        if (this.dm.userData.isLoggedIn) {
            this.elements.statusDiv.innerHTML = `UID:&nbsp;<span class="truncated-name">${this.dm.userData.username}</span>&nbsp;(Lv${this.dm.userData.level})`;
            if (this.elements.authTitle) this.elements.authTitle.textContent = `WELCOME, ${this.dm.userData.username}`;

            uiLogin.forEach(el => { if (el) el.style.display = 'none'; });
            uiLogout.forEach(el => { if (el) el.style.display = 'block'; });
        } else {
            this.elements.statusDiv.textContent = `User: Guest (Lv0)`;
            if (this.elements.authTitle) this.elements.authTitle.textContent = 'ACCOUNT AUTHENTICATION';

            uiLogin.forEach(el => { if (el) el.style.display = 'block'; });
            uiLogout.forEach(el => { if (el) el.style.display = 'none'; });
        }
    }

    async checkDB() {
        const isOnline = await this.dm.checkConnection();
        if (isOnline) {
            this.elements.dbStatusDiv.innerHTML = 'DB:&nbsp;<span class="db-dot online"></span>';
        } else {
            this.elements.dbStatusDiv.innerHTML = 'DB:&nbsp;<span class="db-dot offline"></span>';
        }
    }

    initStatusCheck() {
        this.updateStatus();
        this.checkDB();
        // Bind 'this' to avoid context loss in setInterval
        setInterval(() => this.checkDB(), 30000);
    }

    // --- Auth Logic ---
    getUserParams() {
        return [
            this.elements.authUsername.value,
            this.elements.authPassword.value
        ];
    }

    initAuthListeners() {
        // Login
        this.elements.btnLogin.addEventListener('click', async () => {
            const [u, p] = this.getUserParams();
            if (!u || !p) return this.showNotification('Credentials required.', true);

            const res = await this.dm.login(u, p);
            this.showNotification(res.message, !res.success);
            this.updateStatus();
            this.checkDB();
        });

        // Register (MultiStep)
        new MultiStepButton(this.elements.btnRegister, ['REGISTER', 'REGISTER x 3', 'REGISTER x 2', 'REGISTER !', 'CREATING...'], async () => {
            const [u, p] = this.getUserParams();
            if (!u || !p) return this.showNotification('Credentials required.', true);

            const res = await this.dm.register(u, p);
            this.showNotification(res.message, !res.success);
            this.checkDB();
        });

        // Logout (MultiStep)
        if (this.elements.btnLogout) {
            new MultiStepButton(this.elements.btnLogout, ['LOGOUT', 'LOGOUT x 3', 'LOGOUT x 2', 'LOGOUT !', 'LOGGING OUT...'], () => {
                this.dm.logout();
                this.showNotification('Logged out successfully.');
                this.updateStatus();
                this.elements.authUsername.value = '';
                this.elements.authPassword.value = '';
            });
        }
    }

    // --- Sync Logic ---
    initSyncListeners() {
        // Commit
        new MultiStepButton(this.elements.btnCommit, ['COMMIT', 'COMMIT x 3', 'COMMIT x 2', 'COMMIT !', 'UPLOADING...'], async () => {
            const resLog = await this.dm.commit('log');
            const resTodo = await this.dm.commit('todo');

            if (resLog.success && resTodo.success) {
                this.showNotification('All data committed successfully.');
            } else if (resLog.success) {
                this.showNotification('LOG committed. TODO failed: ' + resTodo.message, true);
            } else if (resTodo.success) {
                this.showNotification('TODO committed. LOG failed: ' + resLog.message, true);
            } else {
                this.showNotification('Commit failed: ' + resLog.message, true);
            }
            this.checkDB();
        });

        // Checkout
        new MultiStepButton(this.elements.btnCheckout, ['CHECKOUT', 'CHECKOUT x 3', 'CHECKOUT x 2', 'CHECKOUT !', 'DOWNLOADING...'], async () => {
            const resLog = await this.dm.checkout('log');
            const resTodo = await this.dm.checkout('todo');

            if (resLog.success || resTodo.success) {
                // Refresh both boards
                this.boards.log.refresh();
                this.boards.todo.refresh();
                this.showNotification('Checkout Successful. Blackboards Updated.');
            } else {
                this.showNotification(resLog.message || resTodo.message, true);
            }
            this.checkDB();
        });
    }

    // --- Wipe Logic ---
    initWipeListener() {
        new MultiStepButton(this.elements.btnWipe, ['WIPE LocalStorage', 'WIPE LocalStorage x 3', 'WIPE LocalStorage x 2', 'WIPE LocalStorage !', 'WIPING...'], () => {
            this.dm.clearAllBlackboardData();
            this.boards.log.refresh();
            this.boards.todo.refresh();
            this.showNotification('All Local Blackboard Memory Wiped.');
        });
    }
}

// --- Main Entry ---
document.addEventListener('DOMContentLoaded', () => {
    window.blackboardManager = new BlackboardManager();
});