/**
 * Centralized logger — suppresses logs in production.
 * Replace console.log/warn/error with logger.log/warn/error throughout the app.
 */
const isDev = process.env.NODE_ENV !== 'production';

const noop = () => {};

const logger = {
  log: isDev ? console.log.bind(console) : noop,
  warn: isDev ? console.warn.bind(console) : noop,
  error: console.error.bind(console), // Always log errors
  debug: isDev ? console.debug.bind(console) : noop,
  info: isDev ? console.info.bind(console) : noop,
};

export default logger;
