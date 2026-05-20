const fs = require('fs');
const path = require('path');

const logsDir = path.join(process.cwd(), 'logs');
const logFile = path.join(logsDir, 'app.log');

if (!fs.existsSync(logsDir)) {
  fs.mkdirSync(logsDir, { recursive: true });
}

function writeLog(level, message, extra = {}) {
  const record = {
    timestamp: new Date().toISOString(),
    level,
    message,
    ...extra
  };

  const line = `${JSON.stringify(record)}\n`;

  fs.appendFileSync(logFile, line, { encoding: 'utf8' });

  if (level === 'error') {
    console.error(record);
  } else {
    console.log(record);
  }
}

module.exports = {
  info: (message, extra) => writeLog('info', message, extra),
  warn: (message, extra) => writeLog('warn', message, extra),
  error: (message, extra) => writeLog('error', message, extra)
};
