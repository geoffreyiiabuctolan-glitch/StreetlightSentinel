(function() {
    window.loadUserTickets = function() {
        if (!window.currentUser) return;
        let tix = JSON.parse(localStorage.getItem('streetlight_tickets')) || [];
        let userTix = tix.filter(t => t.user === window.currentUser.username);
        let list = document.getElementById('userTicketList');
        list.innerHTML = '';
        if (!userTix.length) { list.innerHTML = '<p>No tickets yet.</p>'; return; }
        userTix.reverse().forEach(t => {
            let div = document.createElement('div');
            div.className = 'ticket-card';
            let replyHtml = t.reply ? `<div class="admin-reply-box"><p><i class="fas fa-reply" style="color:var(--green);"></i> Admin Response:</p><div class="reply-content">${t.reply}</div></div>` : '';
            div.innerHTML = `<div class="header"><strong>${t.type}</strong> <span class="ticket-type-badge">${t.status}</span></div><p>${t.description}</p>${replyHtml}`;
            list.appendChild(div);
        });
    };

    document.getElementById('sendTicketBtn').addEventListener('click', () => {
        if (!window.currentUser) return;
        let type = document.getElementById('ticketType').value;
        let desc = document.getElementById('ticketDesc').value;
        if (!desc) return alert('Describe issue');
        let tix = JSON.parse(localStorage.getItem('streetlight_tickets'));
        tix.push({
            id: Date.now(),
            user: window.currentUser.username,
            name: window.currentUser.name,
            phone: window.currentUser.phone,
            type,
            description: desc,
            status: 'open',
            reply: ''
        });
        localStorage.setItem('streetlight_tickets', JSON.stringify(tix));
        alert('Ticket sent');
        document.getElementById('ticketDesc').value = '';
        window.loadUserTickets();
    });
})();