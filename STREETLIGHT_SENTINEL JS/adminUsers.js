(function() {
    window.loadUserTable = function() {
        let us = JSON.parse(localStorage.getItem('streetlight_users')) || [];
        let tbody = document.getElementById('userTableBody');
        tbody.innerHTML = '';
        us.forEach(u => {
            let tr = document.createElement('tr');
            let logged = (window.currentUser && window.currentUser.username === u.username) ? 'green' : 'red';
            let workClass = u.workStatus ? 'on' : 'off';
            let workText = u.workStatus ? 'Clocked In' : 'Clocked Out';
            let avatarHtml = u.avatar ? `<img src="${u.avatar}" class="avatar-thumb" alt="avatar">` : '<div class="avatar-placeholder"></div>';
            tr.innerHTML = `
                <td>${avatarHtml}</td>
                <td>${u.username}</td>
                <td>${u.name}</td>
                <td>${u.phone}</td>
                <td>${u.role}</td>
                <td><span class="status-dot ${logged}"></span></td>
                <td>
                    <button class="work-toggle ${workClass}" data-user="${u.username}">${workText}</button>
                </td>
                <td>
                    ${u.username !== 'admin' ? `<button class="delete-user" data-user="${u.username}"><i class="fas fa-trash"></i> Delete</button>` : ''}
                </td>
            `;
            tbody.appendChild(tr);
        });

        document.querySelectorAll('.work-toggle').forEach(btn => {
            btn.addEventListener('click', function(e) {
                e.stopPropagation();
                let un = this.dataset.user;
                let usr = JSON.parse(localStorage.getItem('streetlight_users'));
                let uu = usr.find(x => x.username === un);
                if (uu) {
                    uu.workStatus = !uu.workStatus;
                    localStorage.setItem('streetlight_users', JSON.stringify(usr));
                    if (window.currentUser && window.currentUser.username === un) window.currentUser.workStatus = uu.workStatus;
                    window.loadUserTable();
                }
            });
        });

        document.querySelectorAll('.delete-user').forEach(btn => {
            btn.addEventListener('click', function(e) {
                e.stopPropagation();
                let un = this.dataset.user;
                if (confirm(`Are you sure you want to delete user "${un}"?`)) {
                    let usr = JSON.parse(localStorage.getItem('streetlight_users'));
                    usr = usr.filter(x => x.username !== un);
                    localStorage.setItem('streetlight_users', JSON.stringify(usr));
                    if (window.currentUser && window.currentUser.username === un) {
                        alert('You cannot delete your own account while logged in.');
                        return;
                    }
                    window.loadUserTable();
                }
            });
        });
    };
})();