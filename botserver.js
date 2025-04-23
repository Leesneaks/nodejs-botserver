const appTitle = 'NodeJS BotServer';
const PORT = 8000;
const statusIntervalMs = 60000; 

const dependencies = ['ws'];
const { execSync } = require('child_process');

const log = (...args) => {
    const now = new Date();
    const time = now.toTimeString().slice(0, 5);
    console.log(`[${time}]`, ...args);
};

function ensureDependencies(modules) {
    const missing = modules.filter(m => {
        try { require.resolve(m); return false; }
        catch { return true; }
    });

    if (missing.length) {
        log(`\x1b[33mMissing dependencies:\x1b[0m ${missing.join(', ')}`);
        log(`\x1b[36mInstalling ${missing.length} module(s)...\x1b[0m`);
        execSync(`npm install ${missing.join(' ')}`, { stdio: 'inherit' });
        log(`\x1b[32m✓ Dependencies installed.\x1b[0m\n`);
    }
}

console.log(`\n\x1b[1m\x1b[34m=== ${appTitle} ===\x1b[0m\n`);

ensureDependencies(dependencies);

const WebSocket = require('ws');

const server = new WebSocket.Server({
    port: PORT,
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

        log(`\x1b[36m${userData.name} has joined channel:\x1b[0m \x1b[35m${userData.channel}\x1b[0m`);
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
    log(`\x1b[33mClient connected.\x1b[0m Total connections: \x1b[36m${connections}\x1b[0m`);

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
        log(`\x1b[31m${name} disconnected from channel:\x1b[0m \x1b[35m${channel}\x1b[0m`);
        connections -= 1;
    });

    ws.on('error', (error) => {
        console.error(`WebSocket error: ${error.message}`);
    });
});

setInterval(sendPing, 1000);

setInterval(() => {
    log(`Connections: ${connections}, Exceptions: ${exceptions}, Blocked: ${blocked}, Channels: ${Object.keys(channels).length}`);
}, statusIntervalMs);

log(`\x1b[32mWebSocket server running on port ${PORT}\x1b[0m`);