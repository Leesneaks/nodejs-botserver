const fs = require('fs');
const path = require('path');

const logDir = path.join(__dirname, '..', 'logs');
if (!fs.existsSync(logDir)) fs.mkdirSync(logDir);

const logFile = fs.createWriteStream(path.join(logDir, 'output.log'), { flags: 'a' });

let utils;
const now = () => utils.formatTimestamp();

function stripAnsi(str) {
    return str.replace(/\x1b\[[0-9;]*m/g, '');
}

function logToFile(type, ...args) {
    const msg = `[${now()}] [${type}] ${stripAnsi(args.join(' '))}\n`;
    logFile.write(msg);
}

function logToConsole(type, color, ...args) {
    const prefix = `[${now()}] [${type}]`;
    console.log(color + prefix, ...args, '\x1b[0m');
}

const logger = {
    info: (...args) => { logToConsole('INFO', '', ...args); logToFile('INFO', ...args); },
    warn: (...args) => { logToConsole('WARN', '\x1b[33m', ...args); logToFile('WARN', ...args); },
    success: (...args) => { logToConsole('SUCCESS', '\x1b[32m', ...args); logToFile('SUCCESS', ...args); },
    dim: (...args) => { logToConsole('DIM', '\x1b[2m', ...args); logToFile('DIM', ...args); },
    title: (text) => {
        const msg = `=== ${text} ===`;
        console.log(`\n\x1b[1m\x1b[34m${msg}\x1b[0m\n`);
        logToFile('TITLE', msg);
    }
};

module.exports = async (ctx) => {
    utils = ctx.utils;
    ctx.utils.log = logger;
};

module.exports.deps = [];
