const path = require('path');
require('dotenv').config({ path: path.resolve(__dirname, '../../Backend/.env') });
require('dotenv').config({ path: path.resolve(__dirname, '../.env') });

const ENV = process.env.TARGET_ENV || 'local';

const configs = {
  local: {
    API_URL: process.env.API_URL || process.env.LOCAL_API_URL,
    JWT_SECRET: process.env.JWT_SECRET || process.env.LOCAL_JWT_SECRET,
    CONCURRENT_USERS: parseInt(process.env.CONCURRENT_USERS || '100', 10),
    DURATION: parseInt(process.env.DURATION || '10', 10),
    RATE: parseInt(process.env.RATE || '0', 10),
    AMOUNT: parseInt(process.env.AMOUNT || '0', 10), 
  },
  production: {
    API_URL: process.env.API_URL || process.env.PROD_API_URL,
    JWT_SECRET: process.env.JWT_SECRET || process.env.PROD_JWT_SECRET,
    CONCURRENT_USERS: parseInt(process.env.CONCURRENT_USERS || '50', 10),
    DURATION: parseInt(process.env.DURATION || '0', 10),
    RATE: parseInt(process.env.RATE || '300', 10),
    AMOUNT: parseInt(process.env.AMOUNT || '2000', 10),
  }
};

const activeConfig = configs[ENV];
if (!activeConfig) {
  throw new Error(`Invalid TARGET_ENV: ${ENV}. Use 'local' or 'production'.`);
}

module.exports = {
  ENV,
  ...activeConfig
};
