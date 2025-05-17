const fs = require('fs');
const path = require('path');

const logDir = path.join(process.cwd(), 'logs');
if (!fs.existsSync(logDir)) fs.mkdirSync(logDir, { recursive: true });

const logFile = fs.createWriteStream(path.join(logDir, 'output.log'), { flags: 'a' });

let utils;
const now = () => utils.formatTimestamp();

function stripAnsi(str) {
    return typeof str === 'string' ? str.replace(/\x1b\[[0-9;]*m/g, '') : str;
}

function logToFile(type, ...args) {
    const line = `[${now()}] [${type}] ${stripAnsi(args.join(' '))}\n`;
    logFile.write(line);
}

function logToConsole(type = '', color = '', ...args) {
    const time = `[${now()}]`;
    const tag  = type ? ` ${type}` : '';
    console.log(color + time + tag, ...args, '\x1b[0m');
}

const logger = {
    info: (...args) => { logToConsole('ℹ️', '', ...args); logToFile('INFO', ...args); },
    warn: (...args) => { logToConsole('⚠️', '\x1b[33m', ...args); logToFile('WARN', ...args); },
    success: (...args) => { logToConsole('', '\x1b[32m', ...args); logToFile('SUCCESS', ...args); },
    dim: (...args) => { logToConsole('', '\x1b[2m', ...args); logToFile('DIM', ...args); },
    title: (text) => {
        const msg = `=== ${text} ===`;
        console.log(`\n\x1b[1m\x1b[34m${msg}\x1b[0m\n`);
        logToFile('TITLE', msg);
    },
};

module.exports = async (ctx) => {
    utils = ctx.utils;
    ctx.utils.log = logger;
};

module.exports.deps = [];

module.exports.meta = {
    name: 'core-logger',
    description: 'Replaces default console with color-coded and file-persistent logger.',
    author: 'Lee',
    version: '1.0.0',
    priority: 100,
    enabled: true
};
