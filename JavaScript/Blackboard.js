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


// --- Main Application Logic ---
document.addEventListener('DOMContentLoaded', () => {
    const dm = new DataManager();
    const statusDiv = document.getElementById('login-status');
    const dbStatusDiv = document.getElementById('db-status');
    const notifArea = document.getElementById('notification-area');

    // --- Blackboard Instances ---
    const logBoard = new BlackboardUI(dm, 'log', {
        input: document.getElementById('blackboard-input-log'),
        btnPush: document.getElementById('btn-push-log'),
        btnPull: document.getElementById('btn-pull-log'),
        stackStatus: document.getElementById('stack-status-log')
    });

    const todoBoard = new BlackboardUI(dm, 'todo', {
        input: document.getElementById('blackboard-input-todo'),
        btnPush: document.getElementById('btn-push-todo'),
        btnPull: document.getElementById('btn-pull-todo'),
        stackStatus: document.getElementById('stack-status-todo')
    });

    // --- Notification System ---
    function showNotification(message, isError = false) {
        const toast = document.createElement('div');
        toast.className = `retro-toast ${isError ? 'error' : ''}`;
        toast.textContent = `> ${message}`;

        notifArea.appendChild(toast);

        // Auto remove
        setTimeout(() => {
            toast.style.animation = 'fadeOut 0.5s ease-out forwards';
            setTimeout(() => toast.remove(), 500);
        }, 3000);
    }

    // --- Status Update & UI Toggle ---
    function updateStatus() {
        const uiLogin = [
            document.getElementById('auth-username'),
            document.getElementById('auth-password'),
            document.getElementById('btn-login'),
            document.getElementById('btn-register')
        ];
        const uiLogout = [document.getElementById('btn-logout')];
        const authTitle = document.querySelector('.auth-title');

        if (dm.userData.isLoggedIn) {
            statusDiv.innerHTML = `UID: <span class="truncated-name">${dm.userData.username}</span> (Lv${dm.userData.level})`;
            if (authTitle) authTitle.textContent = `WELCOME, ${dm.userData.username}`;

            uiLogin.forEach(el => { if (el) el.style.display = 'none'; });
            uiLogout.forEach(el => { if (el) el.style.display = 'block'; });
        } else {
            statusDiv.textContent = `User: Guest (Lv0)`;
            if (authTitle) authTitle.textContent = 'ACCOUNT AUTHENTICATION';

            uiLogin.forEach(el => { if (el) el.style.display = 'block'; });
            uiLogout.forEach(el => { if (el) el.style.display = 'none'; });
        }
    }

    async function checkDB() {
        const isOnline = await dm.checkConnection();
        if (isOnline) {
            dbStatusDiv.innerHTML = 'DB: <span class="db-dot online"></span>';
        } else {
            dbStatusDiv.innerHTML = 'DB: <span class="db-dot offline"></span>';
        }
    }

    // Initial Checks
    updateStatus();
    checkDB();
    setInterval(checkDB, 30000);

    // --- Auth Logic ---
    const userParams = () => [
        document.getElementById('auth-username').value,
        document.getElementById('auth-password').value
    ];

    const btnLogin = document.getElementById('btn-login');
    btnLogin.addEventListener('click', async () => {
        const [u, p] = userParams();
        if (!u || !p) return showNotification('Credentials required.', true);

        const res = await dm.login(u, p);
        showNotification(res.message, !res.success);
        updateStatus();
        checkDB();
    });

    const btnRegister = document.getElementById('btn-register');
    btnRegister.addEventListener('click', async () => {
        const [u, p] = userParams();
        if (!u || !p) return showNotification('Credentials required.', true);

        const res = await dm.register(u, p);
        showNotification(res.message, !res.success);
        checkDB();
    });

    // --- Logout with Triple Click ---
    const btnLogout = document.getElementById('btn-logout');
    if (btnLogout) {
        new MultiStepButton(btnLogout, ['LOGOUT', 'LOGOUT x 3', 'LOGOUT x 2', 'LOGOUT !', 'LOGGING OUT...'], () => {
            dm.logout();
            showNotification('Logged out successfully.');
            updateStatus();
            document.getElementById('auth-username').value = '';
            document.getElementById('auth-password').value = '';
        });
    }

    // --- Commit / Checkout (Titanfall Style) ---
    // Commit and Checkout now sync BOTH log and todo
    const btnCommit = document.getElementById('btn-commit');
    new MultiStepButton(btnCommit, ['COMMIT', 'COMMIT x 3', 'COMMIT x 2', 'COMMIT !', 'UPLOADING...'], async () => {
        const resLog = await dm.commit('log');
        const resTodo = await dm.commit('todo');

        if (resLog.success && resTodo.success) {
            showNotification('All data committed successfully.');
        } else if (resLog.success) {
            showNotification('LOG committed. TODO failed: ' + resTodo.message, true);
        } else if (resTodo.success) {
            showNotification('TODO committed. LOG failed: ' + resLog.message, true);
        } else {
            showNotification('Commit failed: ' + resLog.message, true);
        }
        checkDB();
    });

    const btnCheckout = document.getElementById('btn-checkout');
    new MultiStepButton(btnCheckout, ['CHECKOUT', 'CHECKOUT x 3', 'CHECKOUT x 2', 'CHECKOUT !', 'DOWNLOADING...'], async () => {
        const resLog = await dm.checkout('log');
        const resTodo = await dm.checkout('todo');

        if (resLog.success || resTodo.success) {
            // Refresh both boards
            logBoard.refresh();
            todoBoard.refresh();
            showNotification('Checkout Successful. Blackboards Updated.');
        } else {
            showNotification(resLog.message || resTodo.message, true);
        }
        checkDB();
    });

    // --- Wipe Memory (Wipes ALL blackboards) ---
    const btnWipe = document.getElementById('btn-wipe');
    new MultiStepButton(btnWipe, ['WIPE LocalStorage', 'WIPE LocalStorage x 3', 'WIPE LocalStorage x 2', 'WIPE LocalStorage !', 'WIPING...'], () => {
        dm.clearAllBlackboardData();
        logBoard.refresh();
        todoBoard.refresh();
        showNotification('All Local Blackboard Memory Wiped.');
    });
});