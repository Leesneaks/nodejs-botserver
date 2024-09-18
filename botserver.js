const { execSync } = require('child_process');

function checkAndInstallDependencies() {
    try {
        require.resolve('ws');
    } catch (e) {
        console.log('ws module not found. Installing...');
        execSync('npm install ws', { stdio: 'inherit' });
        console.log('ws module installed successfully.');
    }
}

checkAndInstallDependencies();

const WebSocket = require('ws');

const server = new WebSocket.Server({
    port: 8000,
    maxPayload: 64 * 1024,
});

let connections = 0;
let exceptions = 0;
let blocked = 0;
const channels = {};

function millis() {
    return Date.now();
}

function dispatchMessage(ws, message) {
    if (!channels[ws.userData.channel]) return;

    channels[ws.userData.channel].forEach((client) => {
        if (client !== ws) {
            client.send(JSON.stringify(message));
        }
    });
}

function processMessage(ws, message) {
    const userData = ws.userData;
    const msg = JSON.parse(message);

    if (!userData.name || !userData.channel) {
        if (msg.type !== 'init') {
            return ws.close();
        }

        userData.name = msg.name;
        userData.channel = msg.channel;
        userData.lastPingSent = millis();

        if (!channels[userData.channel]) {
            channels[userData.channel] = new Set();
        }
        channels[userData.channel].add(ws);

        console.log(`${userData.name} has joined channel: ${userData.channel}`);
        return;
    }

    if (userData.packetsTime < Math.floor(Date.now() / 1000)) {
        userData.packetsTime = Math.floor(Date.now() / 1000) + 1;
        userData.packets = 0;
    }

    userData.packets += 1;
    if (userData.packets > 100 || message.length > 64 * 1024) {
        blocked += 1;
        return ws.close();
    }

    if (msg.type === 'ping') {
        userData.lastPing = millis() - userData.lastPingSent;
        return;
    }

    if (msg.type !== 'message') {
        return ws.close();
    }

    const response = {
        type: 'message',
        id: ++ws.messageId,
        name: userData.name,
        topic: msg.topic,
    };

    if (!msg.topic || msg.topic.length > 30) {
        return ws.close();
    }

    if (msg.topic === 'list') {
        const users = Array.from(channels[userData.channel]).map(client => client.userData.name);
        response.message = users;
        ws.send(JSON.stringify(response));
        return;
    }

    response.message = msg.message;
    dispatchMessage(ws, response);
}

function sendPing() {
    Object.keys(channels).forEach((channel) => {
        channels[channel].forEach((ws) => {
            const userData = ws.userData;
            userData.lastPingSent = millis();
            ws.send(JSON.stringify({ type: 'ping', ping: userData.lastPing }));
        });
    });
}

server.on('connection', (ws) => {
    connections += 1;
    console.log(`Client connected. Total connections: ${connections}`);

    ws.userData = {
        name: '',
        channel: '',
        lastPing: 0,
        lastPingSent: 0,
        packets: 0,
        packetsTime: 0,
    };

    ws.messageId = 0;

    ws.on('message', (message) => {
        if (message.length > 64 * 1024) {
            blocked += 1;
            return ws.close();
        }

        try {
            processMessage(ws, message);
        } catch (error) {
            exceptions += 1;
            ws.close();
        }
    });

    ws.on('close', () => {
        const { name, channel } = ws.userData;
        if (channels[channel]) {
            channels[channel].delete(ws);
            if (channels[channel].size === 0) {
                delete channels[channel];
            }
        }
        console.log(`${name} has disconnected from channel: ${channel}`);
        connections -= 1;
    });

    ws.on('error', (error) => {
        console.error(`WebSocket error: ${error.message}`);
    });
});

setInterval(sendPing, 1000);

setInterval(() => {
    console.log(`Connections: ${connections}, Exceptions: ${exceptions}, Blocked: ${blocked}, Channels: ${Object.keys(channels).length}`);
}, 5000);

console.log('WebSocket server running on port 8000');