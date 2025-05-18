import pino, { type Logger } from 'pino';

const loggerOptions: pino.LoggerOptions = {
  level: 'info',
};

const logger: Logger = pino(loggerOptions); // Test direct call

logger.info('Minimal pino logger initialized successfully!');

export default logger;
