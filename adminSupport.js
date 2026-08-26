(function() {
    let unsubscribe = null;

    window.loadAllTickets = async function() {
        if (unsubscribe) unsubscribe();

        unsubscribe = db.collection('tickets').onSnapshot(snapshot => {
            let tix = snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() }));
            renderAllTickets(tix);
        }, error => {
            console.error("All tickets listener error:", error);
            showToast('Error loading tickets', 'error');
        });
    };

    function renderAllTickets(tix) {
        let list = document.getElementById('adminTicketList');
        list.innerHTML = '';
        if (!tix.length) { list.innerHTML = '<p>No tickets.</p>'; return; }
        tix.sort((a, b) => b.id - a.id);
        tix.forEach(t => {
            let div = document.createElement('div');
            div.className = 'ticket-card';
            div.setAttribute('data-id', t.id);
            div.innerHTML = `<div class="header"><strong>${t.user}</strong> <span class="ticket-type-badge">${t.type}</span></div><p>${t.description.substring(0,60)}...</p>`;
            div.addEventListener('click', () => showTicketDetail(t));
            list.appendChild(div);
        });
    }

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

    window.replyToTicket = async function(id) {
        let txt = document.getElementById(`reply-${id}`).value;
        if (!txt) {
            showToast('Please enter a reply', 'error');
            return;
        }
        // We need to get the specific ticket to update it
        const snapshot = await db.collection('tickets').doc(id.toString()).get();
        if (!snapshot.exists) return;
        let t = { id: snapshot.id, ...snapshot.data() };
        t.reply = txt;
        t.status = 'closed';
        await window.saveTicket(t);
        // Listener updates UI
        document.getElementById('adminTicketDetail').innerHTML = '<h3>Ticket Details</h3><div>Reply sent. Select another ticket.</div>';
        showToast('Reply sent', 'success');
    };

    window.unloadAllTickets = function() {
        if (unsubscribe) {
            unsubscribe();
            unsubscribe = null;
        }
    };
})();