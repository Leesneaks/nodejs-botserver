module.exports = async ({ utils, state }) => {
    setInterval(() => {
        utils.logStatus(state, utils);
    }, 60000);
};

module.exports.meta = {
    name: 'uptime-logger',
    version: '1.0.0',
    description: 'Logs server and WS status summary every 60 seconds.',
    author: 'Lee',
    priority: 10,
    enabled: true
};
