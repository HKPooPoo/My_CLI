document.addEventListener('DOMContentLoaded', () => {
    const dm = new DataManager();
    const statusDiv = document.getElementById('login-status');
    const dbStatusDiv = document.getElementById('db-status');
    const stackStatus = document.getElementById('stack-status');
    const blackboardInput = document.getElementById('blackboard-input');
    const btnPush = document.getElementById('btn-push');
    const btnPull = document.getElementById('btn-pull');
    const notifArea = document.getElementById('notification-area');

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
        // Elements to toggle
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

            // Hide Login UI, Show Logout
            uiLogin.forEach(el => { if (el) el.style.display = 'none'; });
            uiLogout.forEach(el => { if (el) el.style.display = 'block'; });
        } else {
            statusDiv.textContent = `User: Guest (Lv0)`;
            if (authTitle) authTitle.textContent = 'ACCOUNT AUTHENTICATION';

            // Show Login UI, Hide Logout
            uiLogin.forEach(el => { if (el) el.style.display = 'block'; });
            uiLogout.forEach(el => { if (el) el.style.display = 'none'; });
        }
        updateStackInfo();
    }

    function updateStackInfo() {
        stackStatus.textContent = dm.getStackStatus();
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
    // Periodically check DB (every 30s)
    setInterval(checkDB, 30000);

    // --- Blackboard Logic ---
    // 1. Initial Load
    blackboardInput.value = dm.getDisplayContent();

    // 2. Input Handling
    blackboardInput.addEventListener('input', (e) => {
        const success = dm.updateDraft(e.target.value);
    });

    // 3. Push (Swipe Up)
    btnPush.addEventListener('click', () => {
        const res = dm.push();
        if (res.action !== 'ignore') {
            blackboardInput.value = res.content;
            updateStackInfo();
        } else {
            btnPush.style.borderColor = 'var(--text-red)';
            setTimeout(() => btnPush.style.borderColor = '', 300);
        }
    });

    // 4. Pull (Swipe Down)
    btnPull.addEventListener('click', () => {
        const res = dm.pull();
        if (res.action !== 'stop') {
            blackboardInput.value = res.content;
            updateStackInfo();
        } else {
            btnPull.style.borderColor = 'var(--text-red)';
            setTimeout(() => btnPull.style.borderColor = '', 300);
        }
    });

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
            // Clear inputs
            document.getElementById('auth-username').value = '';
            document.getElementById('auth-password').value = '';
        });
    }

    // --- Commit / Checkout (Titanfall Style) ---
    const btnCommit = document.getElementById('btn-commit');
    new MultiStepButton(btnCommit, ['COMMIT', 'COMMIT x 3', 'COMMIT x 2', 'COMMIT !', 'UPLOADING...'], async () => {
        const res = await dm.commit();
        showNotification(res.message, !res.success);
        checkDB();
    });

    const btnCheckout = document.getElementById('btn-checkout');
    new MultiStepButton(btnCheckout, ['CHECKOUT', 'CHECKOUT x 3', 'CHECKOUT x 2', 'CHECKOUT !', 'DOWNLOADING...'], async () => {
        const res = await dm.checkout();
        if (res.success) {
            // Auto-pull to show the latest log
            const pullRes = dm.pull();
            if (pullRes.action !== 'stop') {
                blackboardInput.value = pullRes.content;
            } else {
                // Fallback if history is empty (shouldn't happen on fresh checkout usually, unless empty DB)
                blackboardInput.value = res.content;
            }
            updateStackInfo();
            showNotification('Checkout Successful. Blackboard Updated.');
        } else {
            showNotification(res.message, true);
        }
        checkDB();
    });

    // --- Wipe Memory ---
    const btnWipe = document.getElementById('btn-wipe');
    new MultiStepButton(btnWipe, ['WIPE LocalStorage', 'WIPE LocalStorage x 3', 'WIPE LocalStorage x 2', 'WIPE LocalStorage !', 'WIPING...'], () => {
        dm.clearBlackboardData();
        blackboardInput.value = '';
        updateStackInfo();
        showNotification('Local Blackboard Memory Wiped.');
    });
});