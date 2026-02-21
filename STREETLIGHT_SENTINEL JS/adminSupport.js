(function() {
    window.loadAllTickets = function() {
        let tix = JSON.parse(localStorage.getItem('streetlight_tickets')) || [];
        let list = document.getElementById('adminTicketList');
        list.innerHTML = '';
        if (!tix.length) { list.innerHTML = '<p>No tickets.</p>'; return; }
        tix.reverse().forEach(t => {
            let div = document.createElement('div');
            div.className = 'ticket-card';
            div.setAttribute('data-id', t.id);
            div.innerHTML = `<div class="header"><strong>${t.user}</strong> <span class="ticket-type-badge">${t.type}</span></div><p>${t.description.substring(0,60)}...</p>`;
            div.addEventListener('click', () => showTicketDetail(t));
            list.appendChild(div);
        });
    };

    function showTicketDetail(t) {
        let detail = document.getElementById('adminTicketDetail');
        detail.innerHTML = `
            <h3>Ticket from ${t.name} (${t.user})</h3>
            <p><strong>Type:</strong> ${t.type}</p>
            <p><strong>Description:</strong> ${t.description}</p>
            ${t.reply ? `<p><strong>Previous reply:</strong> ${t.reply}</p>` : ''}
            <textarea id="reply-${t.id}" placeholder="Write reply..." rows="4"></textarea>
            <button class="support-btn" onclick="replyToTicket(${t.id})">Send Reply</button>
        `;
    }

    window.replyToTicket = function(id) {
        let txt = document.getElementById(`reply-${id}`).value;
        if (!txt) return alert('Please enter a reply');
        let tix = JSON.parse(localStorage.getItem('streetlight_tickets'));
        let t = tix.find(x => x.id === id);
        if (t) {
            t.reply = txt;
            t.status = 'closed';
            localStorage.setItem('streetlight_tickets', JSON.stringify(tix));
            window.loadAllTickets();
            document.getElementById('adminTicketDetail').innerHTML = '<h3>Ticket Details</h3><div>Reply sent. Select another ticket.</div>';
        }
    };
})();