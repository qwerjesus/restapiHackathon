require('dotenv').config();

module.exports = {
  port: parseInt(process.env.PORT, 10) || 3000,
  visitCartagenaUrl: process.env.VISIT_CARTAGENA_URL || 'https://prd.visitcartagena.com.co',
  defaultDateWindowPastDays: parseInt(process.env.DEFAULT_DATE_WINDOW_PAST_DAYS, 10) || 730,
  defaultDateWindowFutureDays: parseInt(process.env.DEFAULT_DATE_WINDOW_FUTURE_DAYS, 10) || 365,
  requestTimeout: 10000
};
