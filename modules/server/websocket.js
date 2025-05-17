module.exports = async ({ config, utils, state }) => {
    const WebSocket = require('ws');

    const server = await new Promise((resolve, reject) => {
        const wss = new WebSocket.Server({
            port: config.WS_PORT,
            maxPayload: config.WS_MAX_PAYLOAD,
        });

        wss.on('listening', () => {
            utils.log.success(`WebSocket server running on port ${config.WS_PORT}`);
            state.wsStartTime = Date.now();
            resolve(wss);
        });

        wss.on('error', (err) => {
            if (err.code === 'EADDRINUSE') {
                return reject(new Error(`Port ${config.WS_PORT} already in use`));
            }
            reject(err);
        });
    });

    const millis = () => Date.now();

    server.on('connection', (ws) => {
        state.connections++;
        utils.log.info(`\x1b[33mClient connected.\x1b[0m Total: \x1b[36m${state.connections}\x1b[0m`);

        ws.userData = {
            name: '',
            channel: '',
            lastPing: 0,
            lastPingSent: 0,
            packets: 0,
            packetsTime: 0,
            totalPackets: 0,
            activeTime: millis(),
            messagesSent: 0
        };

        ws.messageId = 0;

        ws.on('message', (message) => {
            if (message.length > config.WS_MAX_PAYLOAD) {
                state.blocked++;
                return ws.close();
            }

            try {
                processMessage(ws, message);
            } catch (err) {
                state.exceptions++;
                console.error(`JSON parse error: ${err.message}`);
                console.error(`Invalid payload:`, message.toString());
                return ws.close();
            }
        });

        ws.on('close', () => {
            const { name, channel } = ws.userData;
            if (state.channels[channel]) {
                state.channels[channel].delete(ws);
                if (state.channels[channel].size === 0) {
                    delete state.channels[channel];
                }
            }

            utils.log.dim(`\x1b[31m${name} disconnected from channel:\x1b[0m \x1b[35m${channel}\x1b[0m`);
            state.connections--;
        });

        ws.on('error', (error) => {
            console.error(`WebSocket error: ${error.message}`);
        });
    });

    setInterval(sendPing, config.PING_INTERVAL || 1000);

    function sendPing() {
        Object.keys(state.channels).forEach((channel) => {
            state.channels[channel].forEach((ws) => {
                try {
                    ws.userData.lastPingSent = millis();
                    ws.send(JSON.stringify({ type: 'ping', ping: ws.userData.lastPing }));
                } catch {
                    ws.terminate();
                }
            });
        });
    }

    function processMessage(ws, message) {
        state.packets++;

        const userData = ws.userData;
        const msg = JSON.parse(message);

        if (!userData.name || !userData.channel) {
            if (msg.type !== 'init') return ws.close();

            userData.name = msg.name;
            userData.channel = msg.channel;
            userData.lastPingSent = millis();
            userData.activeTime = millis();
            userData.messagesSent = 0;

            if (!state.channels[userData.channel]) {
                state.channels[userData.channel] = new Set();
                state.channels[userData.channel].created = new Date();
            }

            state.channels[userData.channel].add(ws);

            utils.log.info(`\x1b[36m${userData.name} has joined channel:\x1b[0m \x1b[35m${userData.channel}\x1b[0m`);
            return;
        }

        const currentSeconds = Math.floor(Date.now() / 1000);
        if (userData.packetsTime < currentSeconds) {
            userData.packetsTime = currentSeconds + 1;
            userData.packets = 0;
        }

        userData.packets++;
        userData.totalPackets++;

        if (userData.packets > config.WS_MAX_PACKETS || message.length > config.WS_MAX_PAYLOAD) {
            state.blocked++;
            return ws.close();
        }

        if (msg.type === 'ping') {
            userData.lastPing = millis() - userData.lastPingSent;
            return;
        }

        if (msg.type !== 'message') return ws.close();

        const response = {
            type: 'message',
            id: ++ws.messageId,
            name: userData.name,
            topic: msg.topic,
        };

        if (!msg.topic || msg.topic.length > config.WS_MAX_TOPIC_LENGTH) {
            return ws.close();
        }

        if (msg.topic === 'list') {
            const users = Array.from(state.channels[userData.channel]).map(client => client.userData.name);
            response.message = users;
            ws.send(JSON.stringify(response));
            return;
        }

        response.message = msg.message;

        const hook = state.wsTopicHooks?.[msg.topic];
        if (hook) {
            try {
                const r = hook(ws, msg, response);
                if (r === true) return;
            } catch (err) {
                utils.log.warn(`WS Hook Error [${msg.topic}]: ${err.message}`);
            }
        }

        dispatchMessage(ws, response);
        userData.messagesSent++;
    }

    function dispatchMessage(ws, message) {
        const channel = ws.userData.channel;
        if (!state.channels[channel]) return;

        state.channels[channel].forEach((client) => {
            client.send(JSON.stringify(message));
        });
    }
};

module.exports.deps = ['ws'];

module.exports.meta = {
    name: 'websocket-server',
    description: 'WebSocket server for handling real-time client communication, channels, and ping tracking.',
    author: 'Lee',
    version: '1.0.0',
    priority: 60,
    enabled: true
};
