(function() {
    let unsubscribeGroups = null;

    // Load groups from Firestore and listen for real-time updates
    function listenToGroups() {
        if (unsubscribeGroups) unsubscribeGroups();

        unsubscribeGroups = db.collection('groups').onSnapshot(snapshot => {
            window.groups = snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() }));
            updateMapAndStats();
        }, error => {
            console.error("Groups listener error:", error);
            showToast('Error loading groups', 'error');
        });
    }

    function updateMapAndStats() {
        if (!window.map) {
            // Map not initialized yet, wait
            return;
        }
        // Clear existing markers
        window.markers.forEach(m => window.map.removeLayer(m));
        window.markers = [];

        window.groups.forEach(g => {
            if (!g.connected) return;
            let fault = g.subunits?.some(s => s.fault) || false;
            let col = fault ? '#ef4444' : '#22c55e';
            let m = L.marker([g.lat, g.lng], {
                icon: L.divIcon({ html: `<div style="background:${col}; width:20px; height:20px; border-radius:50%; border:3px solid white; box-shadow:0 0 10px black;"></div>`, iconSize: [20,20] })
            }).addTo(window.map).bindPopup(`<b>${g.name}</b><br>${fault ? '⚠️ Fault' : '✅ OK'}`);
            m.on('click', () => window.showGroup(g));
            window.markers.push(m);
        });

        window.updateConnection();
        window.updateStats();
    }

    window.updateConnection = function() {
        let el = document.getElementById('connectionStatus');
        let on = window.groups.filter(g => g.connected).length;
        el.className = on > 0 ? 'connection-status' : 'connection-status offline';
        el.innerHTML = on > 0 ? '<i class="fas fa-plug"></i> Hardware Online' : '<i class="fas fa-plug"></i> Hardware Offline';
    };

    window.initMap = function() {
        const mapContainer = document.getElementById('gisMap');
        if (!mapContainer) return;
        if (window.map) { window.map.remove(); window.map = null; }
        window.map = L.map('gisMap').setView([7.9063, 125.0933], 14);
        L.tileLayer('https://server.arcgisonline.com/ArcGIS/rest/services/World_Imagery/MapServer/tile/{z}/{y}/{x}', { maxZoom: 19 }).addTo(window.map);

        // Start listening to groups
        listenToGroups();
    };

    window.showGroup = function(g) {
        let p = document.getElementById('groupPanel');
        p.style.display = 'block';
        document.getElementById('selectedGroupName').innerText = g.name;
        let fault = g.subunits?.some(s => s.fault) || false;
        let badge = document.getElementById('groupStatusBadge');
        badge.innerText = fault ? 'Fault Detected' : 'Normal';
        badge.className = `group-status ${fault ? 'red' : 'green'}`;
        let list = document.getElementById('faultSubunitsList');
        list.innerHTML = '';
        if (g.subunits) {
            g.subunits.forEach(sub => {
                let div = document.createElement('div');
                div.className = 'subunit-item';
                let icon = sub.fault ? '<i class="fas fa-exclamation-triangle" style="color:#ef4444;"></i>' : '<i class="fas fa-check-circle" style="color:#22c55e;"></i>';
                div.innerHTML = `${icon} <span><strong>${sub.id}</strong></span> ${sub.fault ? `<span class="fault-badge">${sub.fault}</span>` : '<span style="color:#22c55e;">OK</span>'}`;
                list.appendChild(div);
            });
        }
    };

    window.updateStats = function() {
        let connected = window.groups.filter(g => g.connected);
        document.getElementById('groupsOnline').innerHTML = connected.length;
        let faults = connected.reduce((a, g) => a + (g.subunits?.filter(s => s.fault).length || 0), 0);
        document.getElementById('faultyCount').innerText = faults;
        document.getElementById('activeAlerts').innerText = connected.filter(g => g.subunits?.some(s => s.fault)).length;
    };

    // Cleanup on unload (if needed)
    window.unloadDashboard = function() {
        if (unsubscribeGroups) {
            unsubscribeGroups();
            unsubscribeGroups = null;
        }
    };
})();