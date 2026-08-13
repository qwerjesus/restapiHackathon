const express = require('express');
const cors = require('cors');

const eventsRoutes = require('./routes/events.routes');
const placesRoutes = require('./routes/places.routes');
const foodRoutes = require('./routes/food.routes');
const recommendationsRoutes = require('./routes/recommendations.routes');

const app = express();

app.use(cors());
app.use(express.json());
app.use(express.urlencoded({ extended: true }));

// Healthcheck endpoint
app.get('/health', (req, res) => {
  res.status(200).json({
    status: 'UP',
    timestamp: new Date().toISOString()
  });
});

// API Routes
app.use('/api/events', eventsRoutes);
app.use('/api/places', placesRoutes);
app.use('/api/food', foodRoutes);
app.use('/api/recommendations', recommendationsRoutes);

// 404 Route Handler
app.use((req, res, next) => {
  res.status(404).json({
    success: false,
    error: {
      code: 'RESOURCE_NOT_FOUND',
      message: `Cannot ${req.method} ${req.originalUrl}`
    }
  });
});

// Global Error Handler
app.use((err, req, res, next) => {
  const statusCode = err.statusCode || 500;
  const errorCode = err.code || (statusCode === 404 ? 'RESOURCE_NOT_FOUND' : 'INTERNAL_ERROR');
  const errorMessage = err.message || 'An unexpected internal error occurred.';

  res.status(statusCode).json({
    success: false,
    error: {
      code: errorCode,
      message: errorMessage
    }
  });
});

module.exports = app;
