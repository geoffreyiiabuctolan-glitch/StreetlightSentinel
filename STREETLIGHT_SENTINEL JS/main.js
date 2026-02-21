(function() {
    // ==================== INSPECT PROTECTION ====================
    const ENC_INSPECT_PW = 'QURNSU5PTkxZMDgyMg==';
    const INSPECT_PASSWORD = atob(ENC_INSPECT_PW);
    let lastAuthTime = 0;
    const AUTH_TIMEOUT = 5 * 60 * 1000;

    function isAuthValid() {
        return (Date.now() - lastAuthTime) < AUTH_TIMEOUT;
    }

    function promptForPassword() {
        if (isAuthValid()) return true;
        const entered = prompt('Enter admin password to enable inspect tools:');
        if (entered === INSPECT_PASSWORD) {
            lastAuthTime = Date.now();
            alert('Inspect enabled for this session.');
            return true;
        } else {
            alert('Incorrect password. Inspect tools blocked.');
            return false;
        }
    }

    document.addEventListener('contextmenu', e => !promptForPassword() && e.preventDefault());
    document.addEventListener('keydown', e => {
        if (e.key === 'F12' ||
            (e.ctrlKey && e.shiftKey && e.key === 'I') ||
            (e.ctrlKey && e.shiftKey && e.key === 'J') ||
            (e.ctrlKey && e.key === 'u') ||
            (e.ctrlKey && e.shiftKey && e.key === 'C')) {
            if (!promptForPassword()) e.preventDefault();
        }
    });

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
    const STORAGE_USERS = 'streetlight_users';
    const STORAGE_TICKETS = 'streetlight_tickets';
    const ENC_ADMIN_PW = 'QURNSU4wODIyMTIyMEFETUlO';
    const ENC_USER_PW = 'dXNlcjEyMw==';
    const ENC_SECRET_PASSCODE = 'Njc2OTcw';
    const ADMIN_PASSWORD = atob(ENC_ADMIN_PW);
    const USER_PASSWORD = atob(ENC_USER_PW);
    const SECRET_PASSCODE = atob(ENC_SECRET_PASSCODE);

    // Default avatar (base64 of a simple icon)
    const DEFAULT_AVATAR = 'data:image/svg+xml,%3Csvg xmlns=\'http://www.w3.org/2000/svg\' width=\'100\' height=\'100\' viewBox=\'0 0 100 100\'%3E%3Ccircle cx=\'50\' cy=\'50\' r=\'45\' fill=\'%2322c55e\' /%3E%3Ctext x=\'50\' y=\'70\' font-size=\'40\' text-anchor=\'middle\' fill=\'white\' font-family=\'Arial\'%3E👤%3C/text%3E%3C/svg%3E';

    let users = JSON.parse(localStorage.getItem(STORAGE_USERS)) || [];
    function ensureUser(u, p, n, ph, r) {
        let ex = users.find(x => x.username === u);
        if (ex) {
            ex.password = p;
            ex.role = r;
            ex.name = n;
            ex.phone = ph;
            if (ex.workStatus === undefined) ex.workStatus = false;
            if (!ex.avatar) ex.avatar = DEFAULT_AVATAR;
        } else {
            users.push({ username: u, password: p, name: n, phone: ph, role: r, workStatus: false, avatar: DEFAULT_AVATAR });
        }
    }
    ensureUser('admin', ADMIN_PASSWORD, 'Major Admin', '09123456789', 'admin');
    ensureUser('user', USER_PASSWORD, 'Regular User', '09987654321', 'user');
    localStorage.setItem(STORAGE_USERS, JSON.stringify(users));

    if (!localStorage.getItem(STORAGE_TICKETS)) localStorage.setItem(STORAGE_TICKETS, '[]');

    window.currentUser = null;
    window.map = null;
    window.markers = [];
    window.groups = [
        { id: 'G001', name: 'Plaza', lat: 7.9063, lng: 125.0933, connected: false, subunits: genSub(2) },
        { id: 'G002', name: 'Highway', lat: 7.9100, lng: 125.0950, connected: false, subunits: genSub(0) },
        { id: 'G003', name: 'Residential', lat: 7.9000, lng: 125.0880, connected: false, subunits: genSub(1) },
        { id: 'G004', name: 'School', lat: 7.9150, lng: 125.1000, connected: false, subunits: genSub(0) },
        { id: 'G005', name: 'Market', lat: 7.9020, lng: 125.0980, connected: false, subunits: genSub(3) }
    ];

    function genSub(cnt) {
        let a = [];
        for (let i = 1; i <= 12; i++) {
            let f = null;
            if (i <= cnt) {
                let faults = ['LDR fail', 'PIR fail', 'Voltage drop', 'Current spike', 'LED burnt'];
                f = faults[Math.floor(Math.random() * faults.length)];
            }
            a.push({ id: `SUB-${i}`, fault: f });
        }
        return a;
    }

    // ==================== DOM BUILDERS ====================
    function buildAuthPage() {
        const authPage = document.createElement('div');
        authPage.id = 'authPage';
        authPage.className = 'auth-page';

        const authLeft = document.createElement('div');
        authLeft.className = 'auth-left';
        // Add toggle button
        const toggleBtn = document.createElement('button');
        toggleBtn.className = 'toggle-btn';
        toggleBtn.innerHTML = '<i class="fas fa-chevron-left"></i>';
        toggleBtn.addEventListener('click', () => {
            authLeft.classList.toggle('collapsed');
            const icon = toggleBtn.querySelector('i');
            icon.className = authLeft.classList.contains('collapsed') ? 'fas fa-chevron-right' : 'fas fa-chevron-left';
        });
        authLeft.appendChild(toggleBtn);

        // Tabs
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
            <input type="text" id="loginUsername" placeholder="Username">
            <input type="password" id="loginPassword" placeholder="Password">
            <button class="auth-btn" id="loginBtn">Log In</button>
        `;
        authLeft.appendChild(loginForm);

        const signupForm = document.createElement('div');
        signupForm.id = 'signupForm';
        signupForm.className = 'auth-form';
        signupForm.style.display = 'none';
        signupForm.innerHTML = `
            <input type="text" id="signupName" placeholder="Full Name">
            <input type="text" id="signupUsername" placeholder="Username">
            <input type="password" id="signupPassword" placeholder="Password">
            <input type="tel" id="signupPhone" placeholder="Phone Number">
            <input type="password" id="signupPasscode" placeholder="Secret Passcode">
            <button class="auth-btn" id="signupBtn">Create Account</button>
        `;
        authLeft.appendChild(signupForm);

        const authRight = document.createElement('div');
        authRight.className = 'auth-right';
        authRight.innerHTML = `
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

        // Sidebar with toggle (green)
        const sidebar = document.createElement('div');
        sidebar.className = 'sidebar';
        const toggleBtn = document.createElement('button');
        toggleBtn.className = 'toggle-btn';
        toggleBtn.innerHTML = '<i class="fas fa-chevron-left"></i>';
        toggleBtn.addEventListener('click', () => {
            sidebar.classList.toggle('collapsed');
            const icon = toggleBtn.querySelector('i');
            icon.className = sidebar.classList.contains('collapsed') ? 'fas fa-chevron-right' : 'fas fa-chevron-left';
            if (window.map) setTimeout(() => window.map.invalidateSize(), 200);
        });
        sidebar.appendChild(toggleBtn);

        sidebar.innerHTML += `
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
        `;
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
                        <div class="stat-card"><h4><i class="fas fa-signal"></i> Groups Online</h4><div class="stat-number" id="groupsOnline">0 <span class="stat-unit">/ 5</span></div></div>
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
                                <p>Notification preferences coming soon.</p>
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
                <!-- USER MANAGEMENT VIEW -->
                <div id="adminUsersView" class="view">
                    <h2 style="margin-bottom:24px;"><i class="fas fa-users-cog"></i> User Management</h2>
                    <table class="users-table">
                        <thead>
                            <tr>
                                <th>Avatar</th>
                                <th>Username</th>
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
        `;
        appContainer.appendChild(mainContent);
        return appContainer;
    }

    document.body.appendChild(buildAuthPage());
    document.body.appendChild(buildAppContainer());

    // ==================== GLOBAL FUNCTIONS ====================
    window.showView = function(id) {
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

        if (id === 'supportView' && window.loadUserTickets) window.loadUserTickets();
        if (id === 'adminSupportView' && window.loadAllTickets) window.loadAllTickets();
        if (id === 'adminUsersView' && window.loadUserTable) window.loadUserTable();
        if (id === 'dashboardView') setTimeout(() => { if (window.initMap) window.initMap(); }, 100);
        if (id === 'settingsView') setTimeout(() => { if (window.initProfile) window.initProfile(); }, 100);
    };

    // Navigation
    document.querySelectorAll('.nav-item[data-view]').forEach(item => {
        item.addEventListener('click', e => {
            let v = item.getAttribute('data-view') + 'View';
            window.showView(v);
        });
    });

    // Tab switching (login/signup)
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

    // ==================== AUTH ====================
    window.setWorkStatus = function(u, st) {
        let us = JSON.parse(localStorage.getItem(STORAGE_USERS));
        let user = us.find(x => x.username === u);
        if (user) { user.workStatus = st; localStorage.setItem(STORAGE_USERS, JSON.stringify(us)); }
    };

    document.getElementById('loginBtn').addEventListener('click', () => {
        let u = document.getElementById('loginUsername').value;
        let p = document.getElementById('loginPassword').value;
        let us = JSON.parse(localStorage.getItem(STORAGE_USERS));
        let user = us.find(x => x.username === u && x.password === p);
        if (user) {
            window.setWorkStatus(u, true);
            window.currentUser = user;
            document.getElementById('authPage').style.display = 'none';
            document.getElementById('appContainer').style.display = 'flex';
            if (user.role === 'admin') {
                document.getElementById('adminSupportNav').style.display = 'flex';
                document.getElementById('adminUsersNav').style.display = 'flex';
            } else {
                document.getElementById('adminSupportNav').style.display = 'none';
                document.getElementById('adminUsersNav').style.display = 'none';
            }
            setTimeout(() => { if (window.initMap) window.initMap(); }, 100);
        } else alert('Invalid credentials');
    });

    document.getElementById('signupBtn').addEventListener('click', () => {
        let name = document.getElementById('signupName').value;
        let un = document.getElementById('signupUsername').value;
        let pw = document.getElementById('signupPassword').value;
        let ph = document.getElementById('signupPhone').value;
        let code = document.getElementById('signupPasscode').value;
        if (!name || !un || !pw || !ph || !code) return alert('Fill all fields');
        if (code !== SECRET_PASSCODE) return alert('Invalid passcode');
        let us = JSON.parse(localStorage.getItem(STORAGE_USERS));
        if (us.find(x => x.username === un)) return alert('Username exists');
        us.push({ username: un, password: pw, name, phone: ph, role: 'user', workStatus: false, avatar: DEFAULT_AVATAR });
        localStorage.setItem(STORAGE_USERS, JSON.stringify(us));
        alert('Account created');
        document.getElementById('loginTab').click();
    });

    document.getElementById('logoutNav').addEventListener('click', () => {
        if (window.currentUser) window.setWorkStatus(window.currentUser.username, false);
        window.currentUser = null;
        document.getElementById('appContainer').style.display = 'none';
        document.getElementById('authPage').style.display = 'flex';
        document.getElementById('adminSupportNav').style.display = 'none';
        document.getElementById('adminUsersNav').style.display = 'none';
        ['loginUsername','loginPassword','signupName','signupUsername','signupPassword','signupPhone','signupPasscode'].forEach(id => document.getElementById(id).value = '');
        if (window.map) { window.map.remove(); window.map = null; }
    });

    // ==================== DARK MODE ====================
    const darkToggle = document.getElementById('darkModeToggle');
    darkToggle.addEventListener('click', function() {
        this.classList.toggle('active');
        document.body.classList.toggle('dark');
    });

    document.getElementById('smsToggle').addEventListener('click', function() { this.classList.toggle('active'); });

    // ==================== DATE/TIME ====================
    function updateDateTime() {
        const now = new Date();
        const options = { weekday: 'short', year: 'numeric', month: 'short', day: 'numeric', hour: '2-digit', minute: '2-digit', second: '2-digit' };
        document.querySelector('#liveDateTime span').textContent = now.toLocaleDateString('en-US', options);
    }
    setInterval(updateDateTime, 1000);
    updateDateTime();
})();