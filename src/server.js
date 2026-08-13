const app = require('./app');
const config = require('./config/config');

const server = app.listen(config.port, () => {
  console.log(`Cartagena Tourism API running on port ${config.port}`);
});

module.exports = server;
