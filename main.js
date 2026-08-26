(function() {
    // ==================== RESOLUTION HELPER ====================
    function adjustLayout() {
        const width = window.innerWidth;
        const height = window.innerHeight;
        const body = document.body;

        // Remove existing resolution classes
        body.classList.remove('res-very-small', 'res-small', 'res-medium', 'res-large', 'short-height');

        // Add class based on width
        if (width < 768) {
            body.classList.add('res-very-small');
        } else if (width < 1024) {
            body.classList.add('res-small');
        } else if (width < 1440) {
            body.classList.add('res-medium');
        } else {
            body.classList.add('res-large');
        }

        // Special class for very short screens (e.g., laptops with low height)
        if (height < 600) {
            body.classList.add('short-height');
        }
    }

    // Run on load and resize
    window.addEventListener('load', adjustLayout);
    window.addEventListener('resize', adjustLayout);

    // ==================== FIREBASE AUTH ====================
    const auth = firebase.auth();
    const db = window.db;

    // ==================== CONFIG ====================
    const ADMIN_EMAIL = 'sentinelstreetlight@gmail.com'; // Your admin email
    const ENC_SECRET_PASSCODE = 'NjcwODIy'; // '670822' in base64
    const SECRET_PASSCODE = atob(ENC_SECRET_PASSCODE);

    // ==================== INSPECT PROTECTION ====================
    const ENC_INSPECT_PW = 'Njc2ODY5'; // '676869' in base64
    const INSPECT_PASSWORD = atob(ENC_INSPECT_PW);
    let lastAuthTime = 0;
    const AUTH_TIMEOUT = 5 * 60 * 1000;

    function isAuthValid() {
        return (Date.now() - lastAuthTime) < AUTH_TIMEOUT;
    }

    async function promptForPassword() {
        if (isAuthValid()) return true;
        const entered = await showPasswordModal('Enter admin password to enable inspect tools:');
        if (entered === INSPECT_PASSWORD) {
            lastAuthTime = Date.now();
            showToast('Inspect enabled for this session.', 'success');
            return true;
        } else {
            showToast('Incorrect password. Inspect tools blocked.', 'error');
            return false;
        }
    }

    document.addEventListener('contextmenu', e => {
        if (!isAuthValid()) {
            e.preventDefault();
            promptForPassword();
        }
    });

    document.addEventListener('keydown', e => {
        if (e.key === 'F12' ||
            (e.ctrlKey && e.shiftKey && e.key === 'I') ||
            (e.ctrlKey && e.shiftKey && e.key === 'J') ||
            (e.ctrlKey && e.key === 'u') ||
            (e.ctrlKey && e.shiftKey && e.key === 'C')) {
            if (!isAuthValid()) {
                e.preventDefault();
                promptForPassword();
            }
        }
    });

    // ==================== CONSOLE PROTECTION ====================
    const CONSOLE_PASSCODE = '676908';
    let consoleAuthTime = 0;
    const CONSOLE_AUTH_TIMEOUT = 5 * 60 * 1000;

    function isConsoleAuthValid() {
        return (Date.now() - consoleAuthTime) < CONSOLE_AUTH_TIMEOUT;
    }

    async function promptForConsolePasscode() {
        if (isConsoleAuthValid()) return true;
        const entered = await showPasswordModal('Enter passcode to access console:');
        if (entered === CONSOLE_PASSCODE) {
            consoleAuthTime = Date.now();
            showToast('Console access enabled for this session.', 'success');
            return true;
        } else {
            showToast('Incorrect passcode. Console access blocked.', 'error');
            return false;
        }
    }

    let devToolsDetected = false;
    function detectDevTools() {
        if (isConsoleAuthValid()) return;
        const start = performance.now();
        debugger;
        const end = performance.now();
        if (end - start > 100) {
            if (!devToolsDetected) {
                devToolsDetected = true;
                promptForConsolePasscode();
            }
        } else {
            devToolsDetected = false;
        }
    }
    setInterval(detectDevTools, 1000);

    // ==================== TOAST NOTIFICATION SYSTEM ====================
    function showToast(message, type = 'success', duration = 3000) {
        const container = document.getElementById('toast-container') || (() => {
            const c = document.createElement('div');
            c.id = 'toast-container';
            c.className = 'toast-container';
            document.body.appendChild(c);
            return c;
        })();

        const toast = document.createElement('div');
        toast.className = `toast ${type}`;
        toast.innerHTML = `
            <i class="fas ${type === 'error' ? 'fa-exclamation-circle' : type === 'warning' ? 'fa-exclamation-triangle' : 'fa-check-circle'}"></i>
            <span class="toast-message">${message}</span>
            <button class="toast-close"><i class="fas fa-times"></i></button>
        `;

        const closeBtn = toast.querySelector('.toast-close');
        closeBtn.addEventListener('click', () => toast.remove());

        container.appendChild(toast);

        setTimeout(() => {
            if (toast.parentNode) toast.remove();
        }, duration);
    }
    window.showToast = showToast;

    // ==================== CUSTOM MODAL SYSTEM ====================
    let modalOverlay = null;
    let modalResolve = null;

    function createModal() {
        if (modalOverlay) return;
        modalOverlay = document.createElement('div');
        modalOverlay.className = 'modal-overlay';
        modalOverlay.innerHTML = `
            <div class="modal-content">
                <h3 id="modalTitle">Enter Code</h3>
                <input type="password" id="modalInput" placeholder="Enter secret code">
                <div class="modal-buttons">
                    <button class="modal-btn secondary" id="modalCancel">Cancel</button>
                    <button class="modal-btn primary" id="modalConfirm">Confirm</button>
                </div>
            </div>
        `;
        document.body.appendChild(modalOverlay);

        const confirmBtn = modalOverlay.querySelector('#modalConfirm');
        const cancelBtn = modalOverlay.querySelector('#modalCancel');
        const input = modalOverlay.querySelector('#modalInput');

        confirmBtn.addEventListener('click', () => {
            const value = input.value;
            modalOverlay.classList.remove('active');
            if (modalResolve) modalResolve(value);
            modalResolve = null;
            input.value = '';
        });

        cancelBtn.addEventListener('click', () => {
            modalOverlay.classList.remove('active');
            if (modalResolve) modalResolve(null);
            modalResolve = null;
            input.value = '';
        });

        modalOverlay.addEventListener('click', (e) => {
            if (e.target === modalOverlay) {
                modalOverlay.classList.remove('active');
                if (modalResolve) modalResolve(null);
                modalResolve = null;
                input.value = '';
            }
        });
    }

    function showPasswordModal(title = 'Enter Code') {
        createModal();
        const overlay = document.querySelector('.modal-overlay');
        const titleEl = document.getElementById('modalTitle');
        const input = document.getElementById('modalInput');
        titleEl.textContent = title;
        input.value = '';
        input.type = 'password';
        overlay.classList.add('active');
        input.focus();
        return new Promise(resolve => {
            modalResolve = resolve;
        });
    }

    function showConfirmModal(message) {
        createModal();
        const overlay = document.querySelector('.modal-overlay');
        const titleEl = document.getElementById('modalTitle');
        const input = document.getElementById('modalInput');
        const confirmBtn = document.getElementById('modalConfirm');
        const cancelBtn = document.getElementById('modalCancel');

        titleEl.textContent = message;
        input.style.display = 'none';
        confirmBtn.textContent = 'Yes';
        cancelBtn.textContent = 'No';

        overlay.classList.add('active');

        return new Promise(resolve => {
            const onConfirm = () => {
                cleanup();
                resolve(true);
            };
            const onCancel = () => {
                cleanup();
                resolve(false);
            };
            const cleanup = () => {
                confirmBtn.removeEventListener('click', onConfirm);
                cancelBtn.removeEventListener('click', onCancel);
                overlay.classList.remove('active');
                input.style.display = 'block';
                confirmBtn.textContent = 'Confirm';
                cancelBtn.textContent = 'Cancel';
            };
            confirmBtn.addEventListener('click', onConfirm);
            cancelBtn.addEventListener('click', onCancel);
        });
    }

    window.showPasswordModal = showPasswordModal;
    window.showConfirmModal = showConfirmModal;

    // ==================== LOAD EXTERNAL RESOURCES ====================
    function loadStylesAndScripts() {
        const links = [
            { rel: 'stylesheet', href: 'https://unpkg.com/leaflet@1.9.4/dist/leaflet.css' },
            { rel: 'stylesheet', href: 'https://cdnjs.cloudflare.com/ajax/libs/font-awesome/6.5.0/css/all.min.css' },
            { rel: 'stylesheet', href: 'https://fonts.googleapis.com/css2?family=Inter:opsz,wght@14..32,400;14..32,500;14..32,600;14..32,700;14..32,800&display=swap' }
        ];
        links.forEach(link => {
            const l = document.createElement('link');
            l.rel = link.rel;
            l.href = link.href;
            document.head.appendChild(l);
        });
        const leafletJS = document.createElement('script');
        leafletJS.src = 'https://unpkg.com/leaflet@1.9.4/dist/leaflet.js';
        leafletJS.defer = true;
        document.head.appendChild(leafletJS);
    }
    loadStylesAndScripts();

    // ==================== STORAGE & GLOBAL VARIABLES ====================
    const DEFAULT_AVATAR = 'data:image/svg+xml,%3Csvg xmlns=\'http://www.w3.org/2000/svg\' width=\'100\' height=\'100\' viewBox=\'0 0 100 100\'%3E%3Ccircle cx=\'50\' cy=\'50\' r=\'45\' fill=\'%2322c55e\' /%3E%3Ctext x=\'50\' y=\'70\' font-size=\'40\' text-anchor=\'middle\' fill=\'white\' font-family=\'Arial\'%3E👤%3C/text%3E%3C/svg%3E';

    window.currentUser = null;      // will hold Firestore user doc
    window.map = null;
    window.markers = [];
    window.groups = [];

    // ==================== FIRESTORE HELPERS ====================
    window.getUsers = async function() {
        const snapshot = await db.collection('users').get();
        return snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() }));
    };

    window.saveUser = async function(user) {
        await db.collection('users').doc(user.uid).set(user);
    };

    window.deleteUser = async function(uid) {
        await db.collection('users').doc(uid).delete();
    };

    window.getTickets = async function() {
        const snapshot = await db.collection('tickets').get();
        return snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() }));
    };

    window.saveTicket = async function(ticket) {
        await db.collection('tickets').doc(ticket.id.toString()).set(ticket);
    };

    // ==================== DOM BUILDERS ====================
    function buildAuthPage() {
        const authPage = document.createElement('div');
        authPage.id = 'authPage';
        authPage.className = 'auth-page';

        const authLeft = document.createElement('div');
        authLeft.className = 'auth-left';
        const toggleBtn = document.createElement('button');
        toggleBtn.className = 'toggle-btn';
        toggleBtn.innerHTML = '<i class="fas fa-chevron-left"></i>';
        toggleBtn.addEventListener('click', function(e) {
            e.stopPropagation();
            this.parentElement.classList.toggle('collapsed');
            const icon = this.querySelector('i');
            icon.className = this.parentElement.classList.contains('collapsed') ? 'fas fa-chevron-right' : 'fas fa-chevron-left';
        });
        authLeft.appendChild(toggleBtn);

        const authTabs = document.createElement('div');
        authTabs.className = 'auth-tabs';
        const loginTab = document.createElement('button');
        loginTab.id = 'loginTab';
        loginTab.className = 'auth-tab active';
        loginTab.textContent = 'Login';
        const signupTab = document.createElement('button');
        signupTab.id = 'signupTab';
        signupTab.className = 'auth-tab';
        signupTab.textContent = 'Sign Up';
        authTabs.appendChild(loginTab);
        authTabs.appendChild(signupTab);
        authLeft.appendChild(authTabs);

        const loginForm = document.createElement('div');
        loginForm.id = 'loginForm';
        loginForm.className = 'auth-form';
        loginForm.innerHTML = `
            <input type="text" id="loginIdentifier" placeholder="Email or Username" required>
            <input type="password" id="loginPassword" placeholder="Password" required>
            <button class="auth-btn" id="loginBtn">Log In</button>
            <button class="auth-btn google-btn" id="googleLoginBtn">
                <i class="fab fa-google"></i> Sign in with Google
            </button>
        `;
        authLeft.appendChild(loginForm);

        const signupForm = document.createElement('div');
        signupForm.id = 'signupForm';
        signupForm.className = 'auth-form';
        signupForm.style.display = 'none';
        signupForm.innerHTML = `
            <input type="text" id="signupName" placeholder="Full Name" required>
            <input type="text" id="signupUsername" placeholder="Username" required>
            <input type="email" id="signupEmail" placeholder="Email" required>
            <input type="password" id="signupPassword" placeholder="Password" required>
            <input type="tel" id="signupPhone" placeholder="Phone Number" required>
            <input type="password" id="signupPasscode" placeholder="Secret Passcode (for admin)">
            <button class="auth-btn" id="signupBtn">Create Account</button>
            <button class="auth-btn google-btn" id="googleSignupBtn">
                <i class="fab fa-google"></i> Sign up with Google
            </button>
        `;
        authLeft.appendChild(signupForm);

        const mobileInfoBtn = document.createElement('button');
        mobileInfoBtn.className = 'mobile-info-btn';
        mobileInfoBtn.setAttribute('aria-label', 'Show information');
        mobileInfoBtn.innerHTML = '<i class="fas fa-info"></i>';
        authLeft.appendChild(mobileInfoBtn);

        const authRight = document.createElement('div');
        authRight.className = 'auth-right';
        const closeInfoBtn = document.createElement('button');
        closeInfoBtn.className = 'close-info-btn';
        closeInfoBtn.setAttribute('aria-label', 'Close information');
        closeInfoBtn.innerHTML = '<i class="fas fa-times"></i>';
        authRight.appendChild(closeInfoBtn);

        authRight.innerHTML += `
            <div class="centered-content">
                <div class="logo-heading-row">
                    <img src="logo.png" alt="Streetlight Sentinel Logo">
                    <h1>STREETLIGHT<br>SENTINEL</h1>
                </div>
                <h2>IoT-Based Streetlight Fault Detection System</h2>
                <div class="text-columns">
                    <div class="left-column">
                        <p>Streetlight Sentinel is a smart, solar-powered IoT monitoring system developed to solve the persistent problems of energy waste and poor maintenance in Philippine streetlighting.</p>
                        <p>Using real-time sensors, GSM/SMS alerts, GIS mapping, and offline capabilities, it enables local governments to detect faults instantly, reduce electricity costs by up to 50%, and ensure safer, better-lit communities.</p>
                        <p><i class="fas fa-envelope"></i> sentinelstreetlight@gmail.com | <i class="fas fa-phone"></i> 09650865965</p>
                    </div>
                    <div class="right-column">
                        <ul class="features-grid">
                            <li><i class="fas fa-sun"></i> Solar Powered</li>
                            <li><i class="fas fa-sms"></i> Instant SMS Alerts</li>
                            <li><i class="fas fa-map-marked-alt"></i> GIS Mapping</li>
                            <li><i class="fas fa-wifi"></i> Offline Ready</li>
                            <li><i class="fas fa-microchip"></i> IoT Sensors</li>
                            <li><i class="fas fa-chart-line"></i> Real-Time Dashboard</li>
                        </ul>
                        <div class="how-it-works">
                            <h3>📖 How to Use</h3>
                            <p><strong>For Administrators:</strong> Log in with your admin credentials to access the full dashboard, manage users, view all support tickets, and monitor all streetlight groups. Use the User Management panel to toggle work status or delete users. You can reply to support tickets from the Admin Support panel.</p>
                            <p><strong>For Regular Users:</strong> After logging in, you can view the live map, check streetlight status, and submit support tickets. Your work status is automatically set to "Clocked In" when you log in. You can see admin replies in the Support Center.</p>
                        </div>
                    </div>
                </div>
                <div class="team">
                    A capstone project by:<br>
                    <strong>Xander Ace T. Ticar • Geoffrey II A. Buctolan • Zxander Barrymore B. Jakosalem</strong>
                </div>
            </div>
            <div class="footer-note">Made by: GIIAB</div>
        `;
        authPage.appendChild(authLeft);
        authPage.appendChild(authRight);
        return authPage;
    }

    function buildAppContainer() {
        const appContainer = document.createElement('div');
        appContainer.id = 'appContainer';
        appContainer.className = 'app-container';

        const sidebar = document.createElement('div');
        sidebar.className = 'sidebar';
        const toggleBtn = document.createElement('button');
        toggleBtn.className = 'toggle-btn';
        toggleBtn.innerHTML = '<i class="fas fa-chevron-left"></i>';
        toggleBtn.addEventListener('click', function(e) {
            e.stopPropagation();
            this.parentElement.classList.toggle('collapsed');
            const icon = this.querySelector('i');
            if (this.parentElement.classList.contains('collapsed')) {
                icon.className = 'fas fa-chevron-right';
            } else {
                icon.className = 'fas fa-chevron-left';
            }
            void this.parentElement.offsetWidth;
            if (window.map) setTimeout(() => window.map.invalidateSize(), 200);
        });
        sidebar.appendChild(toggleBtn);

        sidebar.insertAdjacentHTML('beforeend', `
            <div class="logo-area">
                <div class="streetlight-icon"><div class="head"></div><div class="pole"></div></div>
                <span>Streetlight Sentinel</span>
            </div>
            <div class="nav-item active" data-view="dashboard">
                <i class="fas fa-map-marked-alt"></i>
                <span>Dashboard</span>
            </div>
            <div class="nav-item" data-view="settings">
                <i class="fas fa-sliders-h"></i>
                <span>Settings</span>
            </div>
            <div class="nav-item" data-view="support">
                <i class="fas fa-headset"></i>
                <span>Support</span>
            </div>
            <div id="adminSupportNav" class="nav-item" data-view="adminSupport" style="display: none;">
                <i class="fas fa-ticket-alt"></i>
                <span>Admin Support</span>
            </div>
            <div id="adminUsersNav" class="nav-item" data-view="adminUsers" style="display: none;">
                <i class="fas fa-users-cog"></i>
                <span>User Management</span>
            </div>
            <div class="nav-bottom">
                <div class="nav-item" id="logoutNav">
                    <i class="fas fa-sign-out-alt"></i>
                    <span>Logout</span>
                </div>
            </div>
        `);
        appContainer.appendChild(sidebar);

        const mainContent = document.createElement('div');
        mainContent.className = 'main-content';
        mainContent.innerHTML = `
            <div class="content-header">
                <div class="page-title" id="currentPageTitle"><i class="fas fa-map-marked-alt"></i> Dashboard</div>
                <div class="datetime" id="liveDateTime"><i class="far fa-calendar-alt"></i> <span></span></div>
            </div>
            <div class="view-container">
                <!-- DASHBOARD VIEW -->
                <div id="dashboardView" class="view active-view">
                    <div class="map-header">
                        <div class="map-title"><i class="fas fa-satellite"></i> Live Satellite Map <span class="pulse"></span></div>
                        <div id="connectionStatus" class="connection-status offline"><i class="fas fa-plug"></i> Hardware Offline</div>
                    </div>
                    <div id="gisMap"></div>
                    <div id="groupPanel" class="group-panel" style="display: none;">
                        <div class="panel-header"><span class="group-name"><i class="fas fa-layer-group"></i> <span id="selectedGroupName">Group A</span></span><span class="group-status" id="groupStatusBadge">Normal</span></div>
                        <div class="panel-content">
                            <div class="fault-list"><h4><i class="fas fa-microchip"></i> Subunit Sensors</h4><div id="faultSubunitsList"></div></div>
                            <div class="camera-preview"><i class="fas fa-video"></i><p>Live Camera Feed</p><small>Main unit · ESP32‑CAM</small></div>
                        </div>
                    </div>
                    <div class="dashboard-cards">
                        <div class="stat-card"><h4><i class="fas fa-signal"></i> Groups Online</h4><div class="stat-number" id="groupsOnline">0</div></div>
                        <div class="stat-card"><h4><i class="fas fa-exclamation-circle"></i> Faulty Subunits</h4><div class="stat-number" id="faultyCount">0</div></div>
                        <div class="stat-card"><h4><i class="fas fa-bolt"></i> Energy Saved</h4><div class="stat-number">0 <span class="stat-unit">kWh</span></div></div>
                        <div class="stat-card"><h4><i class="fas fa-bell"></i> Active Alerts</h4><div class="stat-number" id="activeAlerts">0</div></div>
                    </div>
                </div>
                <!-- SETTINGS VIEW -->
                <div id="settingsView" class="view">
                    <h2 style="margin-bottom:24px;"><i class="fas fa-cog"></i> Settings</h2>
                    <div class="settings-container">
                        <div class="settings-tabs">
                            <button class="settings-tab active" data-tab="general">General</button>
                            <button class="settings-tab" data-tab="profile">Profile</button>
                            <button class="settings-tab" data-tab="notifications">Notifications</button>
                        </div>
                        <div class="settings-tab-content active" id="generalTab">
                            <div class="settings-card">
                                <div class="setting-row"><span><i class="fas fa-moon"></i> Dark Mode</span><div id="darkModeToggle" class="toggle-switch"></div></div>
                                <div class="setting-row"><span><i class="fas fa-envelope"></i> SMS Notifications</span><div id="smsToggle" class="toggle-switch active"></div></div>
                                <div class="setting-row"><span><i class="fas fa-sync-alt"></i> Map Refresh</span><select><option>30 sec</option><option>1 min</option><option>5 min</option></select></div>
                            </div>
                        </div>
                        <div class="settings-tab-content" id="profileTab">
                            <div class="settings-card profile-card">
                                <h3>Profile Settings</h3>
                                <div class="profile-avatar">
                                    <img id="profileAvatar" src="" alt="Avatar" class="avatar-img">
                                    <div class="camera-section">
                                        <button id="openCameraBtn" class="support-btn small">Open Camera</button>
                                        <button id="capturePhotoBtn" class="support-btn small" style="display:none;">Capture</button>
                                        <button id="usePhotoBtn" class="support-btn small" style="display:none;">Use This Photo</button>
                                        <video id="cameraPreview" autoplay playsinline style="display:none; width:100%; max-width:300px; border-radius:20px; margin-top:10px;"></video>
                                        <canvas id="cameraCanvas" style="display:none;"></canvas>
                                    </div>
                                </div>
                                <div class="profile-fields">
                                    <label>Name</label>
                                    <input type="text" id="profileName" placeholder="Your name">
                                    <label>Phone</label>
                                    <input type="tel" id="profilePhone" placeholder="Phone number">
                                    <label>Current Password</label>
                                    <input type="password" id="profileCurrentPw" placeholder="Leave blank to keep same">
                                    <label>New Password</label>
                                    <input type="password" id="profileNewPw" placeholder="New password">
                                    <label>Confirm New Password</label>
                                    <input type="password" id="profileConfirmPw" placeholder="Confirm new password">
                                    <button class="support-btn" id="saveProfileBtn">Save Changes</button>
                                    <p id="profileMessage" class="form-message"></p>
                                </div>
                            </div>
                        </div>
                        <div class="settings-tab-content" id="notificationsTab">
                            <div class="settings-card">
                                <h3>Notification Preferences</h3>
                                <div class="notifications-list">
                                    <div class="notification-option">
                                        <div class="option-info">
                                            <i class="fas fa-envelope"></i>
                                            <span>Email Notifications</span>
                                        </div>
                                        <label class="switch">
                                            <input type="checkbox" id="emailNotify" checked>
                                            <span class="slider round"></span>
                                        </label>
                                    </div>
                                    <div class="notification-option">
                                        <div class="option-info">
                                            <i class="fas fa-sms"></i>
                                            <span>SMS Alerts</span>
                                        </div>
                                        <label class="switch">
                                            <input type="checkbox" id="smsNotify" checked>
                                            <span class="slider round"></span>
                                        </label>
                                    </div>
                                    <div class="notification-option">
                                        <div class="option-info">
                                            <i class="fas fa-browser"></i>
                                            <span>Browser Notifications</span>
                                        </div>
                                        <label class="switch">
                                            <input type="checkbox" id="browserNotify">
                                            <span class="slider round"></span>
                                        </label>
                                    </div>
                                    <div class="notification-option">
                                        <div class="option-info">
                                            <i class="fas fa-clock"></i>
                                            <span>Quiet Hours</span>
                                        </div>
                                        <label class="switch">
                                            <input type="checkbox" id="quietHours">
                                            <span class="slider round"></span>
                                        </label>
                                    </div>
                                    <div class="quiet-hours-input" id="quietHoursInput" style="display: none;">
                                        <input type="time" value="22:00"> to <input type="time" value="07:00">
                                    </div>
                                    <div class="notification-option">
                                        <div class="option-info">
                                            <i class="fas fa-bell"></i>
                                            <span>Alert Sound</span>
                                        </div>
                                        <select id="alertSound">
                                            <option>Default</option>
                                            <option>Chime</option>
                                            <option>None</option>
                                        </select>
                                    </div>
                                    <div class="notification-option">
                                        <div class="option-info">
                                            <i class="fas fa-volume-up"></i>
                                            <span>Volume</span>
                                        </div>
                                        <input type="range" min="0" max="100" value="80" id="volumeSlider">
                                    </div>
                                </div>
                                <div class="settings-footer">
                                    <button class="support-btn small" id="saveNotifications">Save Preferences</button>
                                </div>
                            </div>
                        </div>
                    </div>
                </div>
                <!-- SUPPORT VIEW -->
                <div id="supportView" class="view">
                    <h2 style="margin-bottom:24px;"><i class="fas fa-headset"></i> Support Center</h2>
                    <div class="support-container">
                        <div class="ticket-list"><h3>Your Tickets</h3><div id="userTicketList"></div></div>
                        <div class="ticket-detail"><h3>Submit New Ticket</h3><select id="ticketType"><option>Software</option><option>Hardware</option></select><textarea id="ticketDesc" rows="6" placeholder="Describe the issue..."></textarea><button class="support-btn" id="sendTicketBtn">Submit Ticket</button></div>
                    </div>
                </div>
                <!-- ADMIN SUPPORT VIEW -->
                <div id="adminSupportView" class="view">
                    <h2 style="margin-bottom:24px;"><i class="fas fa-ticket-alt"></i> Admin Support Dashboard</h2>
                    <div class="support-container">
                        <div class="ticket-list"><h3>All Tickets</h3><div id="adminTicketList"></div></div>
                        <div class="ticket-detail" id="adminTicketDetail"><h3>Ticket Details</h3><div>Select a ticket to view</div></div>
                    </div>
                </div>
                <!-- USER MANAGEMENT VIEW (9 columns) -->
                <div id="adminUsersView" class="view">
                    <h2 style="margin-bottom:24px;"><i class="fas fa-users-cog"></i> User Management</h2>
                    <div class="table-responsive">
                        <table class="users-table">
                            <colgroup>
                                <col>
                                <col>
                                <col>
                                <col>
                                <col>
                                <col>
                                <col>
                                <col>
                                <col>
                            </colgroup>
                            <thead>
                                <tr>
                                    <th>Avatar</th>
                                    <th>Username</th>
                                    <th>Email</th>
                                    <th>Name</th>
                                    <th>Phone</th>
                                    <th>Role</th>
                                    <th>Logged In</th>
                                    <th>Work Status</th>
                                    <th>Actions</th>
                                </tr>
                            </thead>
                            <tbody id="userTableBody"></tbody>
                        </table>
                    </div>
                </div>
            </div>
        `;
        appContainer.appendChild(mainContent);
        return appContainer;
    }

    // Append to body
    document.body.appendChild(buildAuthPage());
    document.body.appendChild(buildAppContainer());

    // Mobile info toggle
    const mobileInfoBtn = document.querySelector('.mobile-info-btn');
    const authRight = document.querySelector('.auth-right');
    const closeInfoBtn = document.querySelector('.close-info-btn');
    if (mobileInfoBtn && authRight && closeInfoBtn) {
        mobileInfoBtn.addEventListener('click', () => {
            authRight.classList.add('show');
        });
        closeInfoBtn.addEventListener('click', () => {
            authRight.classList.remove('show');
        });
    }

    // ==================== AUTH STATE OBSERVER ====================
    auth.onAuthStateChanged(async (firebaseUser) => {
        if (firebaseUser) {
            // User is signed in
            const userDoc = await db.collection('users').doc(firebaseUser.uid).get();
            if (userDoc.exists) {
                window.currentUser = userDoc.data();
                window.currentUser.uid = firebaseUser.uid;
            } else {
                // This shouldn't happen if we create user doc on signup
                console.warn('User document not found for UID:', firebaseUser.uid);
                await auth.signOut();
                return;
            }

            // Update work status to true on login
            window.currentUser.workStatus = true;
            await db.collection('users').doc(firebaseUser.uid).update({ workStatus: true });

            // Show app
            document.getElementById('authPage').style.display = 'none';
            document.getElementById('appContainer').style.display = 'flex';

            // Show/hide admin nav
            if (window.currentUser.role === 'admin') {
                document.getElementById('adminSupportNav').style.display = 'flex';
                document.getElementById('adminUsersNav').style.display = 'flex';
            } else {
                document.getElementById('adminSupportNav').style.display = 'none';
                document.getElementById('adminUsersNav').style.display = 'none';
            }

            window.showView('dashboardView');
            showToast('Login successful!', 'success');
        } else {
            // User is signed out
            if (window.currentUser) {
                // Optionally set workStatus false on logout (already done in logout handler)
            }
            window.currentUser = null;
            document.getElementById('appContainer').style.display = 'none';
            document.getElementById('authPage').style.display = 'flex';
            document.getElementById('adminSupportNav').style.display = 'none';
            document.getElementById('adminUsersNav').style.display = 'none';
            if (window.map) { window.map.remove(); window.map = null; }
        }
    });

    // ==================== EMAIL/PASSWORD SIGN UP ====================
    document.getElementById('signupBtn').addEventListener('click', async () => {
        const name = document.getElementById('signupName').value.trim();
        const username = document.getElementById('signupUsername').value.trim();
        const email = document.getElementById('signupEmail').value.trim();
        const password = document.getElementById('signupPassword').value;
        const phone = document.getElementById('signupPhone').value.trim();
        const passcode = document.getElementById('signupPasscode').value;

        if (!name || !username || !email || !password || !phone) {
            showToast('Please fill all required fields', 'error');
            return;
        }

        // Check if username already exists
        const users = await window.getUsers();
        if (users.find(u => u.username === username)) {
            showToast('Username already taken', 'error');
            return;
        }

        try {
            const userCred = await auth.createUserWithEmailAndPassword(email, password);
            const uid = userCred.user.uid;

            // Determine role: if email is admin email OR passcode matches, set admin
            let role = 'user';
            if (email === ADMIN_EMAIL || passcode === SECRET_PASSCODE) {
                role = 'admin';
            }

            const newUser = {
                uid,
                username,
                email,
                name,
                phone,
                role,
                workStatus: false,
                avatar: DEFAULT_AVATAR
            };
            await db.collection('users').doc(uid).set(newUser);

            showToast('Account created! You are now logged in.', 'success');
            // Auth state observer will handle the rest
        } catch (error) {
            showToast(error.message, 'error');
        }
    });

    // ==================== EMAIL/USERNAME LOGIN ====================
    document.getElementById('loginBtn').addEventListener('click', async () => {
        const identifier = document.getElementById('loginIdentifier').value.trim();
        const password = document.getElementById('loginPassword').value;

        if (!identifier || !password) {
            showToast('Please enter email/username and password', 'error');
            return;
        }

        let email = identifier;
        // If identifier does not contain '@', treat as username
        if (!identifier.includes('@')) {
            // Query Firestore for username
            const users = await window.getUsers();
            const user = users.find(u => u.username === identifier);
            if (!user) {
                showToast('Username not found', 'error');
                return;
            }
            email = user.email;
        }

        try {
            await auth.signInWithEmailAndPassword(email, password);
            // Auth observer will handle
        } catch (error) {
            showToast(error.message, 'error');
        }
    });

    // ==================== GOOGLE SIGN-IN ====================
    const googleProvider = new firebase.auth.GoogleAuthProvider();

    async function handleGoogleSignIn(isSignUp = false) {
        try {
            const result = await auth.signInWithPopup(googleProvider);
            const user = result.user;
            // Check if user exists in Firestore
            const userDoc = await db.collection('users').doc(user.uid).get();
            if (!userDoc.exists) {
                // New Google user – create profile
                // Generate a username from email (part before @)
                const username = user.email.split('@')[0];
                // Ensure username is unique
                let finalUsername = username;
                let counter = 1;
                const users = await window.getUsers();
                while (users.find(u => u.username === finalUsername)) {
                    finalUsername = `${username}${counter}`;
                    counter++;
                }

                // Determine role: if email is admin email, set admin
                const role = (user.email === ADMIN_EMAIL) ? 'admin' : 'user';

                const newUser = {
                    uid: user.uid,
                    username: finalUsername,
                    email: user.email,
                    name: user.displayName || 'Google User',
                    phone: '',
                    role: role,
                    workStatus: false,
                    avatar: user.photoURL || DEFAULT_AVATAR
                };
                await db.collection('users').doc(user.uid).set(newUser);
            } else {
                // Existing user – optionally update role if email matches admin (in case they weren't admin before)
                if (user.email === ADMIN_EMAIL && userDoc.data().role !== 'admin') {
                    await db.collection('users').doc(user.uid).update({ role: 'admin' });
                }
            }
            // Auth observer will log them in
        } catch (error) {
            showToast(error.message, 'error');
        }
    }

    document.getElementById('googleLoginBtn').addEventListener('click', () => handleGoogleSignIn(false));
    document.getElementById('googleSignupBtn').addEventListener('click', () => handleGoogleSignIn(true));

    // ==================== LOGOUT ====================
    document.getElementById('logoutNav').addEventListener('click', async () => {
        if (window.currentUser) {
            // Set work status false before logout
            await db.collection('users').doc(window.currentUser.uid).update({ workStatus: false });
        }
        await auth.signOut();
        // Clear form fields
        ['loginIdentifier','loginPassword','signupName','signupUsername','signupEmail','signupPassword','signupPhone','signupPasscode'].forEach(id => {
            const el = document.getElementById(id);
            if (el) el.value = '';
        });
        showToast('Logged out successfully', 'success');
    });

    // ==================== VIEW HANDLER ====================
    let currentView = null;
    window.showView = async function(id) {
        if (currentView) {
            const unloadFn = window[`unload${currentView.charAt(0).toUpperCase() + currentView.slice(1)}`];
            if (unloadFn) unloadFn();
        }
        document.querySelectorAll('.view').forEach(v => v.classList.remove('active-view'));
        document.getElementById(id).classList.add('active-view');
        const titleMap = {
            dashboardView: 'Dashboard', settingsView: 'Settings', supportView: 'Support Center',
            adminSupportView: 'Admin Support', adminUsersView: 'User Management'
        };
        document.getElementById('currentPageTitle').innerHTML = `<i class="fas fa-${id === 'dashboardView' ? 'map-marked-alt' : id === 'settingsView' ? 'cog' : id === 'supportView' ? 'headset' : id === 'adminSupportView' ? 'ticket-alt' : 'users-cog'}"></i> ${titleMap[id]}`;
        document.querySelectorAll('.nav-item').forEach(n => n.classList.remove('active'));
        let nav = document.querySelector(`.nav-item[data-view="${id.replace('View','')}"]`);
        if (nav) nav.classList.add('active');
        currentView = id.replace('View', '');

        if (id === 'supportView' && window.loadUserTickets) await window.loadUserTickets();
        if (id === 'adminSupportView' && window.loadAllTickets) await window.loadAllTickets();
        if (id === 'adminUsersView' && window.loadUserTable) await window.loadUserTable();
        if (id === 'dashboardView') setTimeout(() => { if (window.initMap) window.initMap(); }, 100);
        if (id === 'settingsView') setTimeout(() => { if (window.initProfile) window.initProfile(); }, 100);
    };

    document.querySelectorAll('.nav-item[data-view]').forEach(item => {
        item.addEventListener('click', e => {
            let v = item.getAttribute('data-view') + 'View';
            window.showView(v);
        });
    });

    // Tab switching (login/register)
    document.getElementById('loginTab').addEventListener('click', () => {
        document.getElementById('loginTab').classList.add('active');
        document.getElementById('signupTab').classList.remove('active');
        document.getElementById('loginForm').style.display = 'block';
        document.getElementById('signupForm').style.display = 'none';
    });
    document.getElementById('signupTab').addEventListener('click', () => {
        document.getElementById('signupTab').classList.add('active');
        document.getElementById('loginTab').classList.remove('active');
        document.getElementById('loginForm').style.display = 'none';
        document.getElementById('signupForm').style.display = 'block';
    });

    // Dark mode toggle
    const darkToggle = document.getElementById('darkModeToggle');
    if (darkToggle) {
        darkToggle.addEventListener('click', function() {
            this.classList.toggle('active');
            document.body.classList.toggle('dark');
            showToast('Theme toggled', 'success');
        });
    }

    document.getElementById('smsToggle')?.addEventListener('click', function() { this.classList.toggle('active'); });

    // DateTime update
    function updateDateTime() {
        const now = new Date();
        const options = { weekday: 'short', year: 'numeric', month: 'short', day: 'numeric', hour: '2-digit', minute: '2-digit', second: '2-digit' };
        const span = document.querySelector('#liveDateTime span');
        if (span) span.textContent = now.toLocaleDateString('en-US', options);
    }
    setInterval(updateDateTime, 1000);
    updateDateTime();
})();