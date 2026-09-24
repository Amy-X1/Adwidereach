// Standardized application error carrying an HTTP status code.
class ApiError extends Error {
  constructor(statusCode, message, errors = [], extra = {}) {
    super(message);
    this.statusCode = statusCode;
    this.errors = errors;
    Object.assign(this, extra);
    Error.captureStackTrace(this, this.constructor);
  }
}

module.exports = ApiError;
