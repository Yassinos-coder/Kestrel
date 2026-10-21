const DEFAULT_PORT = 3000;
const DEFAULT_API_PREFIX = 'api';

export default () => ({
  port: Number(process.env.PORT) || DEFAULT_PORT,
  apiPrefix: process.env.API_PREFIX ?? DEFAULT_API_PREFIX,
  corsOrigins: (process.env.CORS_ORIGINS ?? '')
    .split(',')
    .map((origin) => origin.trim())
    .filter(Boolean),
});
