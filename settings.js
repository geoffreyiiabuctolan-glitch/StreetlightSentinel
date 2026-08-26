(function() {
    let cameraStream = null;

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
                showToast('Could not access camera. Please check permissions.', 'error');
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
            showToast('Photo selected. Click Save Changes to update your profile.', 'info');
        });

        document.getElementById('saveProfileBtn').addEventListener('click', async () => {
            const msg = document.getElementById('profileMessage');
            const name = document.getElementById('profileName').value.trim();
            const phone = document.getElementById('profilePhone').value.trim();
            const currentPw = document.getElementById('profileCurrentPw').value;
            const newPw = document.getElementById('profileNewPw').value;
            const confirmPw = document.getElementById('profileConfirmPw').value;

            if (!name) { msg.innerHTML = 'Name cannot be empty.'; return; }
            if (!phone) { msg.innerHTML = 'Phone cannot be empty.'; return; }

            // Update password via Firebase Auth (if any password field is filled)
            if (newPw || confirmPw || currentPw) {
                if (!currentPw) { msg.innerHTML = 'Current password required.'; return; }
                if (newPw !== confirmPw) { msg.innerHTML = 'New passwords do not match.'; return; }
                if (newPw.length < 6) { msg.innerHTML = 'Password must be at least 6 characters.'; return; }

                const user = firebase.auth().currentUser;
                const credential = firebase.auth.EmailAuthProvider.credential(user.email, currentPw);
                try {
                    await user.reauthenticateWithCredential(credential);
                    await user.updatePassword(newPw);
                } catch (error) {
                    msg.innerHTML = error.message;
                    return;
                }
            }

            // Update Firestore profile (name, phone, avatar)
            if (!window.currentUser) return;
            let userData = { ...window.currentUser };
            userData.name = name;
            userData.phone = phone;
            if (window.capturedAvatar) {
                userData.avatar = window.capturedAvatar;
                delete window.capturedAvatar;
            }

            await window.saveUser(userData);
            window.currentUser = userData;
            msg.innerHTML = 'Profile updated successfully.';
            msg.style.color = 'var(--green)';
        });

        // Notifications tab (local storage only)
        const quietHoursCheck = document.getElementById('quietHours');
        if (quietHoursCheck) {
            quietHoursCheck.addEventListener('change', (e) => {
                const quietInputs = document.getElementById('quietHoursInput');
                quietInputs.style.display = e.target.checked ? 'flex' : 'none';
            });
        }

        document.getElementById('saveNotifications')?.addEventListener('click', () => {
            const email = document.getElementById('emailNotify').checked;
            const sms = document.getElementById('smsNotify').checked;
            const browser = document.getElementById('browserNotify').checked;
            const quiet = document.getElementById('quietHours').checked;
            const sound = document.getElementById('alertSound').value;
            const volume = document.getElementById('volumeSlider').value;
            localStorage.setItem('notif_email', email);
            localStorage.setItem('notif_sms', sms);
            localStorage.setItem('notif_browser', browser);
            localStorage.setItem('quiet_hours', quiet);
            localStorage.setItem('alert_sound', sound);
            localStorage.setItem('volume', volume);
            showToast('Notification preferences saved', 'success');
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

    if (document.readyState === 'loading') {
        document.addEventListener('DOMContentLoaded', attachListeners);
    } else {
        attachListeners();
    }
})();