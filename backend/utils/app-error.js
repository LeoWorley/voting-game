class AppError extends Error {
  constructor(status, code, message, details = undefined) {
    super(message);
    this.name = 'AppError';
    this.status = status;
    this.code = code;
    this.details = details;
  }
}

function isAppError(error) {
  return error instanceof AppError;
}

module.exports = {
  AppError,
  isAppError,
};
