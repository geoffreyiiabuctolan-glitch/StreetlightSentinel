(function() {
    let cameraStream = null;
    let retryCount = 0;
    const maxRetries = 10;

    function initSettings() {
        const openBtn = document.getElementById('openCameraBtn');
        if (!openBtn && retryCount < maxRetries) {
            retryCount++;
            setTimeout(initSettings, 100);
            return;
        }
        if (!openBtn) {
            console.error('Settings elements not found after retries');
            return;
        }
        attachListeners();
    }

    function attachListeners() {
        document.querySelectorAll('.settings-tab').forEach(tab => {
            tab.addEventListener('click', () => {
                document.querySelectorAll('.settings-tab').forEach(t => t.classList.remove('active'));
                tab.classList.add('active');
                document.querySelectorAll('.settings-tab-content').forEach(c => c.classList.remove('active'));
                document.getElementById(tab.dataset.tab + 'Tab').classList.add('active');
                if (tab.dataset.tab === 'profile') window.initProfile();
            });
        });

        document.getElementById('openCameraBtn').addEventListener('click', async () => {
            try {
                cameraStream = await navigator.mediaDevices.getUserMedia({ video: true });
                const video = document.getElementById('cameraPreview');
                video.srcObject = cameraStream;
                video.style.display = 'block';
                document.getElementById('openCameraBtn').style.display = 'none';
                document.getElementById('capturePhotoBtn').style.display = 'inline-block';
                document.getElementById('usePhotoBtn').style.display = 'none';
            } catch (err) {
                alert('Could not access camera. Please check permissions.');
            }
        });

        document.getElementById('capturePhotoBtn').addEventListener('click', () => {
            const video = document.getElementById('cameraPreview');
            const canvas = document.getElementById('cameraCanvas');
            const context = canvas.getContext('2d');
            canvas.width = video.videoWidth;
            canvas.height = video.videoHeight;
            context.drawImage(video, 0, 0, canvas.width, canvas.height);
            const dataUrl = canvas.toDataURL('image/jpeg', 0.8);
            document.getElementById('profileAvatar').src = dataUrl;
            if (cameraStream) {
                cameraStream.getTracks().forEach(track => track.stop());
                cameraStream = null;
            }
            video.style.display = 'none';
            document.getElementById('capturePhotoBtn').style.display = 'none';
            document.getElementById('usePhotoBtn').style.display = 'inline-block';
            document.getElementById('openCameraBtn').style.display = 'inline-block';
            window.capturedAvatar = dataUrl;
        });

        document.getElementById('usePhotoBtn').addEventListener('click', () => {
            document.getElementById('usePhotoBtn').style.display = 'none';
            alert('Photo selected. Click Save Changes to update your profile.');
        });

        document.getElementById('saveProfileBtn').addEventListener('click', () => {
            const msg = document.getElementById('profileMessage');
            const name = document.getElementById('profileName').value.trim();
            const phone = document.getElementById('profilePhone').value.trim();
            const currentPw = document.getElementById('profileCurrentPw').value;
            const newPw = document.getElementById('profileNewPw').value;
            const confirmPw = document.getElementById('profileConfirmPw').value;

            if (!name) { msg.innerHTML = 'Name cannot be empty.'; return; }
            if (!phone) { msg.innerHTML = 'Phone cannot be empty.'; return; }

            let users = JSON.parse(localStorage.getItem('streetlight_users'));
            let user = users.find(u => u.username === window.currentUser.username);
            if (!user) return;

            if (newPw || confirmPw || currentPw) {
                if (!currentPw) { msg.innerHTML = 'Current password required.'; return; }
                if (currentPw !== user.password) { msg.innerHTML = 'Current password incorrect.'; return; }
                if (newPw !== confirmPw) { msg.innerHTML = 'New passwords do not match.'; return; }
                if (newPw.length < 6) { msg.innerHTML = 'Password must be at least 6 characters.'; return; }
                user.password = newPw;
            }

            user.name = name;
            user.phone = phone;
            if (window.capturedAvatar) {
                user.avatar = window.capturedAvatar;
                delete window.capturedAvatar;
            }

            localStorage.setItem('streetlight_users', JSON.stringify(users));
            window.currentUser = user;
            msg.innerHTML = 'Profile updated successfully.';
            msg.style.color = 'var(--green)';
        });
    }

    window.initProfile = function() {
        if (!window.currentUser) return;
        const user = window.currentUser;
        document.getElementById('profileAvatar').src = user.avatar || '';
        document.getElementById('profileName').value = user.name || '';
        document.getElementById('profilePhone').value = user.phone || '';
        document.getElementById('profileCurrentPw').value = '';
        document.getElementById('profileNewPw').value = '';
        document.getElementById('profileConfirmPw').value = '';
        document.getElementById('profileMessage').innerHTML = '';
        if (cameraStream) {
            cameraStream.getTracks().forEach(track => track.stop());
            cameraStream = null;
        }
        document.getElementById('cameraPreview').style.display = 'none';
        document.getElementById('capturePhotoBtn').style.display = 'none';
        document.getElementById('usePhotoBtn').style.display = 'none';
        document.getElementById('openCameraBtn').style.display = 'inline-block';
    };

    initSettings();
})();