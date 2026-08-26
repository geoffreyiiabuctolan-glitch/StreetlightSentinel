(function() {
    let unsubscribe = null;

    window.loadUserTickets = async function() {
        // Guard: if no user or no username, exit
        if (!window.currentUser || !window.currentUser.username) {
            document.getElementById('userTicketList').innerHTML = '<p>Please log in to see your tickets.</p>';
            return;
        }
        if (unsubscribe) unsubscribe();

        unsubscribe = db.collection('tickets')
            .where('user', '==', window.currentUser.username)
            .onSnapshot(snapshot => {
                let tix = snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() }));
                renderUserTickets(tix);
            }, error => {
                console.error("User tickets listener error:", error);
                showToast('Error loading tickets', 'error');
            });
    };

    function renderUserTickets(tix) {
        let list = document.getElementById('userTicketList');
        list.innerHTML = '';
        if (!tix.length) { list.innerHTML = '<p>No tickets yet.</p>'; return; }
        tix.sort((a, b) => b.id - a.id);
        tix.forEach(t => {
            let div = document.createElement('div');
            div.className = 'ticket-card';
            let replyHtml = t.reply ? `<div class="admin-reply-box"><p><i class="fas fa-reply" style="color:var(--green);"></i> Admin Response:</p><div class="reply-content">${t.reply}</div></div>` : '';
            div.innerHTML = `<div class="header"><strong>${t.type}</strong> <span class="ticket-type-badge">${t.status}</span></div><p>${t.description}</p>${replyHtml}`;
            list.appendChild(div);
        });
    }

    document.getElementById('sendTicketBtn').addEventListener('click', async () => {
        if (!window.currentUser) {
            showToast('Please log in first', 'error');
            return;
        }
        let type = document.getElementById('ticketType').value;
        let desc = document.getElementById('ticketDesc').value;
        if (!desc) {
            showToast('Please describe the issue', 'error');
            return;
        }
        let newTicket = {
            id: Date.now(),
            user: window.currentUser.username,
            name: window.currentUser.name,
            phone: window.currentUser.phone,
            type,
            description: desc,
            status: 'open',
            reply: ''
        };
        await window.saveTicket(newTicket);
        showToast('Ticket sent', 'success');
        document.getElementById('ticketDesc').value = '';
        // Listener updates UI
    });

    window.unloadUserTickets = function() {
        if (unsubscribe) {
            unsubscribe();
            unsubscribe = null;
        }
    };
})();