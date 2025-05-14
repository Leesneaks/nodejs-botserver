const config = require('./config');
const utils = require('./utils');

const state = {
    connections: 0,
    exceptions: 0,
    blocked: 0,
    packets: 0,
    httpAllowedRequests: 0,
    httpBlockedRequests: 0,
    channels: {},
    characters: {},
    wsStartTime: null
};

(async () => {
    console.clear();
    utils.log.title(config.appTitle);
    await utils.loadModules({ config, utils, state });
})();