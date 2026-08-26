(function() {
    let unsubscribe = null;

    window.loadUserTable = async function() {
        if (unsubscribe) unsubscribe();

        unsubscribe = db.collection('users').onSnapshot(snapshot => {
            const us = snapshot.docs.map(doc => ({ uid: doc.id, ...doc.data() }));
            renderUserTable(us);
        }, error => {
            console.error("User listener error:", error);
            showToast('Error loading users', 'error');
        });
    };

    function renderUserTable(us) {
        let tbody = document.getElementById('userTableBody');
        tbody.innerHTML = '';

        us.forEach(u => {
            let tr = document.createElement('tr');
            let logged = u.workStatus ? 'green' : 'red';
            let workClass = u.workStatus ? 'on' : 'off';
            let workText = u.workStatus ? 'Clocked In' : 'Clocked Out';
            let avatarHtml = u.avatar ? `<img src="${u.avatar}" class="avatar-thumb" alt="avatar">` : '<div class="avatar-placeholder"></div>';

            // Logged In column: just the dot
            let loggedInHtml = `<span class="status-dot ${logged}"></span>`;

            // Work Status column: toggle button
            let workStatusHtml = `<button class="work-toggle ${workClass}" data-uid="${u.uid}">${workText}</button>`;

            // Actions column: delete button (hide for admin)
            let actionsHtml = u.username !== 'admin' 
                ? `<button class="delete-user" data-uid="${u.uid}" data-username="${u.username}"><i class="fas fa-trash"></i> Delete</button>` 
                : '';

            tr.innerHTML = `
                <td>${avatarHtml}</td>
                <td>${u.username}</td>
                <td>${u.email}</td>
                <td>${u.name}</td>
                <td>${u.phone}</td>
                <td>${u.role}</td>
                <td>${loggedInHtml}</td>
                <td>${workStatusHtml}</td>
                <td>${actionsHtml}</td>
            `;
            tbody.appendChild(tr);
        });

        attachUserEvents(us);
    }

    function attachUserEvents(us) {
        document.querySelectorAll('.work-toggle').forEach(btn => {
            btn.addEventListener('click', async function(e) {
                e.stopPropagation();
                let uid = this.dataset.uid;
                let user = us.find(u => u.uid === uid);
                if (user) {
                    user.workStatus = !user.workStatus;
                    await window.saveUser(user);
                }
            });
        });

        document.querySelectorAll('.delete-user').forEach(btn => {
            btn.addEventListener('click', async function(e) {
                e.stopPropagation();
                let uid = this.dataset.uid;
                let username = this.dataset.username;
                if (window.currentUser && window.currentUser.uid === uid) {
                    showToast('You cannot delete your own account.', 'error');
                    return;
                }
                const confirmed = await showConfirmModal(`Are you sure you want to delete user "${username}"?`);
                if (confirmed) {
                    await window.deleteUser(uid);
                }
            });
        });
    }

    window.unloadUserTable = function() {
        if (unsubscribe) {
            unsubscribe();
            unsubscribe = null;
        }
    };
})();