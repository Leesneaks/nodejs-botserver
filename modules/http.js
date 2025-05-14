module.exports = async ({ config, utils, state }) => {
    const express = require('express');
    const path = require('path');
    const http = require('http');
    const apiRouter = express.Router();

    const app = express();
    const httpServer = http.createServer(app);

    app.use((req, res, next) => {
        const ip = req.ip.replace('::ffff:', '');
        if (req.path === '/' && !config.HTTP_ALLOWED_IPS.includes(ip)) {
            state.httpBlockedRequests++;
            return res.status(403).json({ error: 'Access denied' });
        }

        if (req.path === '/') state.httpAllowedRequests++;
        next();
    });

    const publicPath = path.resolve(__dirname, '..', 'public');
    app.use(express.static(publicPath));
    app.use(express.json());

    apiRouter.get('/stats', (req, res) => {
        const { characters, channels, connections, exceptions, blocked, packets, httpAllowedRequests, httpBlockedRequests } = state;
        const channelDetails = {};
        const users = [];

        for (const [channelName, clients] of Object.entries(channels)) {
            channelDetails[channelName] = {
                users: clients.size,
                created: clients.created
                    ? utils.formatTimestamp(clients.created)
                    : 'Unknown'
            };

            for (const ws of clients) {
                if (ws.userData?.name) {
                    users.push({
                        name: ws.userData.name,
                        channel: channelName,
                        ping: ws.userData.lastPing || 0,
                        messages: ws.userData.messagesSent || 0,
                        packets: ws.userData.totalPackets || 0,
                        connectedTime: utils.timeAgo(ws.userData.activeTime)
                    });
                }
            }
        }

        const stats = {
            connections,
            exceptions,
            blocked,
            packets,
            httpAllowedRequests,
            httpBlockedRequests,
            channelCount: Object.keys(channels).length,
            channelDetails,
            timestamp: Date.now(),
            wsStarted: state.wsStartTime ? utils.formatTimestamp(state.wsStartTime) : 'N/A',
            wsUptime: utils.timeAgo(state.wsStartTime || Date.now()),
            wsUptimeMs: state.wsStartTime ? Date.now() - state.wsStartTime : 0,
            users,
            characters: Object.values(characters).map(c => ({
                name: c.name,
                level: c.level,
                vocation: c.vocation,
                healthPercent: c.healthPercent,
                manaPercent: c.manaPercent,
                location: c.location,
                lastUpdate: c.lastUpdate
            })),
        };

        res.json(stats);
    });

    app.use('/api', apiRouter);

    await new Promise((resolve, reject) => {
        const host = config.HOST || 'localhost';
        httpServer.listen(config.HTTP_PORT, () => {
            utils.log.success(`HTTP server running at http://${host}:${config.HTTP_PORT}`);
            resolve();
        }).on('error', (err) => {
            if (err.code === 'EADDRINUSE') {
                reject(new Error(`Port ${config.HTTP_PORT} is already in use.`));
            } else {
                reject(err);
            }
        });
    });
};

module.exports.deps = ['express'];
