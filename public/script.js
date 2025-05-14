function showTab(tabId) {
    document.querySelectorAll('.tab-content').forEach(tab => {
        tab.classList.remove('active');
    });
    
    document.querySelectorAll('.tab').forEach(tab => {
        tab.classList.remove('active');
    });
    
    document.getElementById(tabId).classList.add('active');
    
    Array.from(document.querySelectorAll('.tab')).find(tab => 
        tab.getAttribute('onclick').includes(tabId)
    ).classList.add('active');
}

let refreshFailed = false;

function fetchStats() {
    if (refreshFailed) return;
    fetch('/api/stats')
        .then(response => response.json())
        .then(data => {
            document.getElementById('connections').textContent = data.connections;
            document.getElementById('channels').textContent = data.channelCount;
            document.getElementById('packets').textContent = data.packets;
            
            document.getElementById('ws-blocked').textContent = data.blocked;
            document.getElementById('http-allowed').textContent = data.httpAllowedRequests;
            document.getElementById('http-blocked').textContent = data.httpBlockedRequests;

            const channelsBody = document.getElementById('channels-body');
            channelsBody.innerHTML = '';
            
            Object.entries(data.channelDetails).forEach(([name, details]) => {
                const row = document.createElement('tr');
                row.innerHTML = `
                    <td data-label="Name">${name}</td>
                    <td data-label="# of Users">${details.users}</td>
                    <td data-label="Created">${details.created}</td>
                `;

                channelsBody.appendChild(row);
            });
            
            const usersBody = document.getElementById('users-body');
            usersBody.innerHTML = '';
            
            data.users.forEach(user => {
                const row = document.createElement('tr');
                
                row.innerHTML = `
                    <td data-label="Name">${user.name}</td>
                    <td data-label="Channel">${user.channel}</td>
                    <td data-label="Ping">${user.ping} ms</td>
                    <td data-label="Messages">${user.messages}</td>
                    <td data-label="Packets">${user.packets}</td>
                    <td data-label="Connected Time">${user.connectedTime}</td>
                `;
                usersBody.appendChild(row);
            });
            
            const charactersBody = document.getElementById('characters-body');
            charactersBody.innerHTML = '';
            
            data.characters.forEach(character => {
                const row = document.createElement('tr');
                const vocationClass = getVocationClass(character.vocation);
                const vocationName = getVocationName(character.vocation);
                const levelColor = getLevelColor(character.level);
                
                row.innerHTML = `
                    <td data-label="Character">${character.name}</td>
                    <td data-label="Level"><span class="level-badge" style="background-color: ${levelColor}">${character.level}</span></td>
                    <td data-label="Vocation"><span class="vocation-badge ${vocationClass}">${vocationName}</span></td>

                    <td data-label="Health">
                        <div class="progress-container">
                            <div class="hp-bar">
                                <div class="hp-bar-fill" style="width: ${character.healthPercent || 0}%"></div>
                            </div>
                            <div class="progress-label">
                                <span>${character.health || 0}</span>
                                <span>${character.maxHealth || 0}</span>
                            </div>
                        </div>
                    </td>
                    <td data-label="Mana">
                        <div class="progress-container">
                            <div class="mana-bar">
                                <div class="mana-bar-fill" style="width: ${character.manaPercent || 0}%"></div>
                            </div>
                            <div class="progress-label">
                                <span>${character.mana || 0}</span>
                                <span>${character.maxMana || 0}</span>
                            </div>
                        </div>
                    </td>
                    <td data-label="Experience">
                        <div class="progress-container">
                            <div class="exp-bar">
                                <div class="exp-bar-fill" style="width: ${character.expPercent || 0}%"></div>
                            </div>
                            <div class="progress-label">
                                <span>${formatNumber(character.experience || 0)}</span>
                            </div>
                        </div>
                    </td>
                    <td data-label="Location">${character.location || 'Unknown'}</td>
                    <td data-label="Last Update">${character.lastUpdate || 'Never'}</td>
                `;
                charactersBody.appendChild(row);
            });
            
            document.getElementById('ws-uptime').textContent = data.wsUptime || '-';
            document.querySelector('.ws-uptime').setAttribute('title', 'WebSocket Started: ' + (data.wsStarted || 'N/A'));

            document.getElementById('last-updated').textContent = 'Last updated: ' + new Date().toLocaleTimeString();

        })
        .catch(error => {
            console.error('Error fetching stats:', error);
            refreshFailed = true;
            clearInterval(refreshInterval);
        });
}

function getLevelColor(level) {
    const levelNum = parseInt(level) || 0;
    if (levelNum < 50) return '#3498db'; 
    if (levelNum < 100) return '#2ecc71';
    if (levelNum < 200) return '#f39c12';
    return '#e74c3c';
}

function getVocationName(vocId) {
    switch (parseInt(vocId)) {
        case 1: return 'Knight';
        case 2: return 'Paladin';
        case 3: return 'Sorcerer';
        case 4: return 'Druid';
        default: return 'None';
    }
}

function getVocationClass(vocId) {
    switch (parseInt(vocId)) {
        case 1: return 'vocation-knight';
        case 2: return 'vocation-paladin';
        case 3: return 'vocation-sorcerer';
        case 4: return 'vocation-druid';
        default: return 'vocation-none';
    }
}

function formatNumber(num) {
    return new Intl.NumberFormat().format(num);
}

let refreshInterval = null;

function setupRefresh() {
    clearInterval(refreshInterval);

    const enabled = document.getElementById('auto-refresh-toggle').checked;
    const seconds = Math.max(1, parseInt(document.getElementById('refresh-interval').value) || 1);

    if (enabled) {
        refreshInterval = setInterval(fetchStats, seconds * 1000);
    }
}

window.addEventListener('DOMContentLoaded', () => {
    document.getElementById('auto-refresh-toggle').addEventListener('change', setupRefresh);
    document.getElementById('refresh-interval').addEventListener('input', setupRefresh);

    fetchStats();
    setupRefresh();
});
