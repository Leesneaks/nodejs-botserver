module.exports = async ({ config, utils, state }) => {
    const requiredMeta = ['name', 'version', 'description'];

    state.loadedModules?.forEach(({ file, meta }) => {
        const missing = requiredMeta.filter(k => !meta?.[k]);

        if (missing.length) {
            utils.log.warn(`Plugin "${file}" missing meta: ${missing.join(', ')}`);
        }

        if (meta?.version && !/^\d+\.\d+\.\d+$/.test(meta.version)) {
            utils.log.warn(`Plugin "${file}" has invalid version format (expected semver): ${meta.version}`);
        }

        if (typeof meta?.name !== 'string' || meta.name.trim() === '') {
            utils.log.warn(`Plugin "${file}" has an invalid or empty name`);
        }

        if (typeof meta?.enabled !== 'boolean') {
            utils.log.dim(`Plugin "${file}" missing "enabled" flag (defaulting to true)`);
        }
    });
};

module.exports.meta = {
    name: 'plugin-validator',
    description: 'Checks all loaded plugins for required metadata fields and formatting.',
    author: 'Lee',
    version: '1.0.0',
    priority: 99,
    enabled: true
};
