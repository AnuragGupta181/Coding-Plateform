require('dotenv').config();

const isProduction = process.env.NODE_ENV === 'production';

function parseList(value) {
  return value
    ? value.split(',').map((item) => item.trim()).filter(Boolean)
    : [];
}

function requireEnv(name) {
  const value = process.env[name];
  if (!value) {
    throw new Error(`Missing required environment variable: ${name}`);
  }
  return value;
}

const requiredInProduction = ['MONGODB_URI', 'JWT_SECRET', 'EMAIL_USER', 'EMAIL_PASS'];
if (isProduction) {
  requiredInProduction.forEach(requireEnv);
}

const corsOrigins = parseList(process.env.CORS_ORIGIN);

module.exports = {
  env: process.env.NODE_ENV || 'development',
  isProduction,
  port: process.env.PORT || 5000,
  mongoUri: process.env.MONGODB_URI || 'mongodb://localhost:27017/coding-platform',
  registrationMongoUri: process.env.REGISTRATION_MONGODB_URI,
  mongoPoolSize: process.env.MONGO_POOL_SIZE ? parseInt(process.env.MONGO_POOL_SIZE, 10) : (isProduction ? 50 : 10),
  jwtSecret: process.env.JWT_SECRET || 'development-only-jwt-secret',
  corsOrigins,
  email: {
    service: process.env.EMAIL_SERVICE || 'gmail',
    host: process.env.SMTP_HOST,
    port: process.env.SMTP_PORT ? Number(process.env.SMTP_PORT) : undefined,
    secure: process.env.SMTP_SECURE === 'true',
    user: process.env.EMAIL_USER,
    pass: process.env.EMAIL_PASS,
    from: process.env.EMAIL_FROM || process.env.EMAIL_USER
  }
};
