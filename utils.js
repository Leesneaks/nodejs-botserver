const { execSync } = require('child_process');
const fs = require('fs');
const path = require('path');

module.exports = {
    log: {
        info: (...args) => console.log(`[${new Date().toTimeString().slice(0, 5)}]`, ...args),
        warn: (...args) => console.warn(`\x1b[33m[WARN]`, ...args, '\x1b[0m'),
        success: (...args) => console.log(`\x1b[32m[SUCCESS]`, ...args, '\x1b[0m'),
        dim: (...args) => console.log(`\x1b[2m`, ...args, '\x1b[0m'),
        title: (text) => console.log(`\n\x1b[1m\x1b[34m=== ${text} ===\x1b[0m\n`)
    },

    formatTimestamp(date = new Date()) {
        const d = new Date(date);
        const pad = n => String(n).padStart(2, '0');
        return `${pad(d.getDate())}.${pad(d.getMonth() + 1)}.${d.getFullYear()} ${pad(d.getHours())}:${pad(d.getMinutes())}:${pad(d.getSeconds())}`;
    },

    timeAgo(date) {
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
    },

    ensureDependencies(modules) {
        const missing = modules.filter(m => {
            try { require.resolve(m); return false; } catch { return true; }
        });

        if (missing.length) {
            this.log.warn(`Missing: ${missing.join(', ')}`);
            execSync(`npm install ${missing.join(' ')}`, { stdio: 'inherit' });
            this.log.success(`Installed: ${missing.join(', ')}`);
        }
    },

    async loadModules({ config, utils, state, modulesDir = 'modules' }) {
        const fullPath = path.join(__dirname, modulesDir);
        const moduleFiles = fs.readdirSync(fullPath).filter(f => f.endsWith('.js'));

        const modules = [];
        const allDeps = new Set();

        for (const file of moduleFiles) {
            const modulePath = path.join(fullPath, file);
            try {
                const mod = require(modulePath);
                if (typeof mod === 'function') {
                    if (Array.isArray(mod.deps)) {
                        mod.deps.forEach(dep => allDeps.add(dep));
                    }
                    modules.push({ file, init: mod });
                }
            } catch (err) {
                utils.log.warn(`⚠️ Failed to parse ${file}: ${err.message}`);
            }
        }

        utils.ensureDependencies([...allDeps]);

        for (const { file, init } of modules) {
            try {
                await init({ config, utils, state });
                utils.log.success(`✓ Loaded: ${file}`);
            } catch (err) {
                utils.log.warn(`⚠️ Failed to load ${file}: ${err.message}`);
            }
        }

    }
};
