import { init as initSentry, captureException } from '@sentry/node';
import { v4 as uuidv4 } from 'uuid';

// Initialize Sentry for error tracking
initSentry({
  dsn: 'YOUR_SENTRY_DSN',
});

// Middleware for structured logging and error handling
export const errorMiddleware = (err, req, res, next) => {
  const correlationId = req.headers['x-correlation-id'] || uuidv4();
  const logObject = {
    status: 'error',
    message: err.message,
    stack: err.stack,
    correlationId,
    path: req.path,
    method: req.method,
  };

  // Log the error (implement your preferred logging method here)
  console.error(JSON.stringify(logObject));

  // Capture the exception in Sentry
  captureException(err);

  // Send a standardized error response
  res.status(500).json({
    status: 'error',
    message: 'An unexpected error occurred.',
    correlationId,
  });
};

// Example usage in an Express app
// import express from 'express';
const app = express();
app.use(express.json());

// Your routes here

// Error handling middleware should be the last middleware added
app.use(errorMiddleware);

// Start the server
const port = process.env.PORT || 3000;
app.listen(port, () => {
  console.log(`Server is running on port ${port}`);
});
