const { isAppError } = require('./app-error');

function sendError(res, status, code, message, details = undefined) {
  const payload = { code, message };
  if (details !== undefined) {
    payload.details = details;
  }
  return res.status(status).json(payload);
}

function sendAppError(res, error) {
  return sendError(res, error.status || 500, error.code || 'INTERNAL_ERROR', error.message || 'Unexpected error', error.details);
}

function sendUnexpectedError(res, error, fallbackMessage) {
  console.error(JSON.stringify({
    level: 'error',
    event: 'UNEXPECTED_ERROR',
    message: error?.message,
    stack: error?.stack,
  }));
  return sendError(res, 500, 'INTERNAL_ERROR', fallbackMessage || 'Unexpected error');
}

function handleRouteError(res, error, fallbackMessage) {
  if (isAppError(error)) {
    return sendAppError(res, error);
  }
  return sendUnexpectedError(res, error, fallbackMessage);
}

module.exports = {
  sendError,
  handleRouteError,
};
