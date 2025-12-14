/**
 * Handle database connection errors and provide user-friendly messages
 */
function handleDatabaseError(error, res) {
  // Database connection errors
  if (error.code === 'ECONNREFUSED' || error.code === 'ENOTFOUND') {
    return res.status(503).json({
      error: 'Database connection failed. Please ensure PostgreSQL is running and configured correctly.',
      code: 'DATABASE_CONNECTION_ERROR'
    });
  }

  // Database authentication errors
  if (error.code === '28P01' || error.message.includes('password authentication')) {
    return res.status(503).json({
      error: 'Database authentication failed. Please check your database credentials.',
      code: 'DATABASE_AUTH_ERROR'
    });
  }

  // Database not found
  if (error.code === '3D000' || error.message.includes('does not exist')) {
    return res.status(503).json({
      error: 'Database not found. Please run migrations: npm run migrate',
      code: 'DATABASE_NOT_FOUND'
    });
  }

  // Table/relation does not exist
  if (error.code === '42P01') {
    return res.status(503).json({
      error: 'Database tables not found. Please run migrations: npm run migrate',
      code: 'TABLE_NOT_FOUND'
    });
  }

  // Unique constraint violation
  if (error.code === '23505') {
    return res.status(409).json({
      error: 'Resource already exists',
      code: 'DUPLICATE_ENTRY'
    });
  }

  // Foreign key violation
  if (error.code === '23503') {
    return res.status(400).json({
      error: 'Invalid reference. Related resource does not exist.',
      code: 'FOREIGN_KEY_VIOLATION'
    });
  }

  // Null constraint violation
  if (error.code === '23502') {
    return res.status(400).json({
      error: 'Required field is missing',
      code: 'NULL_CONSTRAINT_VIOLATION'
    });
  }

  // Return false to indicate error was not handled
  return false;
}

/**
 * Express error handler middleware wrapper
 */
function dbErrorHandler(handler) {
  return async (req, res, next) => {
    try {
      await handler(req, res, next);
    } catch (error) {
      const handled = handleDatabaseError(error, res);
      if (!handled) {
        next(error);
      }
    }
  };
}

module.exports = {
  handleDatabaseError,
  dbErrorHandler
};

