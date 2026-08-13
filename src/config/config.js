const path = require('path');
const dotenv = require('dotenv');

// Explicitly resolve path to .env relative to project root
const envPath = path.resolve(__dirname, '../../.env');
dotenv.config({ path: envPath });

module.exports = {
  port: parseInt(process.env.PORT, 10) || 3000,
  visitCartagenaUrl: process.env.VISIT_CARTAGENA_URL || 'https://prd.visitcartagena.com.co',
  defaultDateWindowPastDays: parseInt(process.env.DEFAULT_DATE_WINDOW_PAST_DAYS, 10) || 730,
  defaultDateWindowFutureDays: parseInt(process.env.DEFAULT_DATE_WINDOW_FUTURE_DAYS, 10) || 365,
  requestTimeout: 10000,
  get geminiApiKey() {
    return process.env.GEMINI_API_KEY || '';
  },
  get geminiModel() {
    return process.env.GEMINI_MODEL || 'gemini-2.5-flash';
  },
  get geminiTimeoutMs() {
    return parseInt(process.env.GEMINI_TIMEOUT_MS, 10) || 10000;
  }
};
