const { execSync } = require('child_process');
const fs = require('fs');
const path = require('path');

const now = () => new Date().toTimeString().slice(0, 8);
const pad = n => String(n).padStart(2, '0');

const log = {
    info: (...a) => console.log(`[${now()}] ℹ️`, ...a),
    warn: (...a) => console.warn(`\x1b[33m[${now()}] ⚠️`, ...a, '\x1b[0m'),
    success: (...a) => console.log(`\x1b[32m[${now()}]`, ...a, '\x1b[0m'),
    dim: (...a) => console.log(`\x1b[2m[${now()}]`, ...a, '\x1b[0m'),
    title: t => console.log(`\n\x1b[1m\x1b[34m[${now()}] === ${t} ===\x1b[0m\n`)
};

function formatTimestamp(date = new Date()) {
    const d = new Date(date);
    return `${pad(d.getDate())}.${pad(d.getMonth() + 1)} ${pad(d.getHours())}:${pad(d.getMinutes())}:${pad(d.getSeconds())}`;
}

function timeAgo(date) {
    const seconds = Math.floor((Date.now() - new Date(date).getTime()) / 1000);
    const units = [
        { label: 'year', secs: 31536000 },
        { label: 'month', secs: 2592000 },
        { label: 'day', secs: 86400 },
        { label: 'hour', secs: 3600 },
        { label: 'minute', secs: 60 },
        { label: 'second', secs: 1 }
    ];

    for (const unit of units) {
        const count = Math.floor(seconds / unit.secs);
        if (count > 0) return `${count} ${unit.label}${count !== 1 ? 's' : ''} ago`;
    }
    return 'just now';
}

function ensureDependencies(modules) {
    const missing = modules.filter(m => {
        try { require.resolve(m); return false; } catch { return true; }
    });

    if (missing.length) {
        log.warn(`Missing: ${missing.join(', ')}`);
        execSync(`npm install ${missing.join(' ')}`, { stdio: 'inherit' });
        log.success(`Installed: ${missing.join(', ')}`);
    }
}

function registerWsHook(topic, handler, state) {
    if (!topic || typeof topic !== 'string') {
        log.warn(`Invalid WS hook topic: ${topic}`);
        return;
    }

    state.wsTopicHooks = state.wsTopicHooks || {};

    if (state.wsTopicHooks[topic]) {
        log.warn(`Duplicate WS hook: ${topic}`);
    }

    state.wsTopicHooks[topic] = handler;
    log.dim(`↳ WS hook registered for topic: ${topic}`);
}

function logStatus(state, utils) {
    const wsUptime = state.wsStartTime ? utils.timeAgo(state.wsStartTime) : 'N/A';
    utils.log.info(
        `WS Connections: ${state.connections}, Exceptions: ${state.exceptions}, Blocked: ${state.blocked}, Packets: ${state.packets}, Channels: ${Object.keys(state.channels).length} | HTTP: ${state.httpAllowedRequests} Allowed, ${state.httpBlockedRequests} Blocked | Uptime: ${wsUptime}`
    );
}

async function loadModules({ config, utils, state, modulesDir = 'modules' }) {
    const fullPath = path.join(__dirname, modulesDir);

    function discoverModules(dir) {
        return fs.readdirSync(dir, { withFileTypes: true }).flatMap(entry => {
            const full = path.join(dir, entry.name);
            return entry.isDirectory()
                ? discoverModules(full)
                : (entry.name.endsWith('.js') ? [full] : []);
        });
    }

    const moduleFiles = discoverModules(fullPath);
    const modules = [];
    const allDeps = new Set();

    for (const modulePath of moduleFiles) {
        try {
            const mod = require(modulePath);
            if (typeof mod === 'function') {
                const meta = mod.meta || {};

                if (meta.enabled === false) {
                    log.dim(`⏭ Skipped (disabled): ${path.relative(fullPath, modulePath)}`);
                    continue;
                }

                if (Array.isArray(mod.deps)) {
                    mod.deps.forEach(dep => allDeps.add(dep));
                }

                modules.push({
                    file: path.relative(fullPath, modulePath),
                    init: mod,
                    meta
                });
            }
        } catch (err) {
            log.warn(`Failed to parse ${path.relative(fullPath, modulePath)}: ${err.message}`);
        }
    }

    ensureDependencies([...allDeps]);
    modules.sort((a, b) => (b.meta.priority || 0) - (a.meta.priority || 0));
    state.loadedModules = modules;

    for (const { file, meta } of modules) {
        const name = meta.name || file;
        const version = meta.version ? ` v${meta.version}` : '';
        log.success(`✓ Loaded: ${name}${version} (${file})`);
    }

    for (const { file, init, meta } of modules) {
        try {
            await init({ config, utils, state });
        } catch (err) {
            log.warn(`Failed to init ${meta.name || file}: ${err.message}`);
        }
    }

}

module.exports = {
    log,
    formatTimestamp,
    timeAgo,
    ensureDependencies,
    registerWsHook,
    loadModules,
    logStatus
};
