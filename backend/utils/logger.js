function log(level, event, data = {}) {
  const entry = {
    timestamp: new Date().toISOString(),
    level,
    event,
    ...data,
  };
  console.log(JSON.stringify(entry));
}

function logInfo(event, data) {
  log('info', event, data);
}

function logWarn(event, data) {
  log('warn', event, data);
}

function logError(event, data) {
  log('error', event, data);
}

module.exports = {
  logInfo,
  logWarn,
  logError,
};
