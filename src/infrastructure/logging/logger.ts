import pino from 'pino';

const level =
  process.env.NODE_ENV === 'test' ? 'silent' : process.env.NODE_ENV === 'production' ? 'info' : 'debug';

export const logger = pino({
  level,
  transport:
    process.env.NODE_ENV === 'production' || process.env.NODE_ENV === 'test'
      ? undefined
      : { target: 'pino-pretty', options: { colorize: true } },
});
