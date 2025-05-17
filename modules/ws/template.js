/**
 * WebSocket Plugin Template
 * -------------------------
 * Replace 'template_topic' with the topic you want to handle.
 * Modify the handler logic below to suit your needs.
 */

module.exports = async ({ utils, state }) => {
    utils.registerWsHook('template_topic', (ws, msg, response) => {
        const payload = msg.message;
        const user = ws.userData?.name || 'unknown';

        utils.log.info(`[template_topic] from ${user}:`, JSON.stringify(payload, null, 2));

        return true;
    }, state);
};

module.exports.deps = [];

module.exports.meta = {
    name: 'template',
    description: 'Base WebSocket plugin template. Modify topic and logic as needed.',
    author: 'Lee',
    version: '1.0.0',
    priority: 0,
    enabled: true
};
