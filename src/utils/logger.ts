import pino from 'pino';
import pinoHttp from 'pino-http';
import { env, isProd } from '../config/env';

// Structured logger — production: JSON một dòng để aggregate (Loki/Datadog/CloudWatch).
// Dev: pretty-print cho dễ đọc. Set LOG_LEVEL trong .env (trace/debug/info/warn/error/fatal).
export const logger = pino({
  level: env.LOG_LEVEL,
  ...(isProd
    ? {}
    : {
        transport: {
          target: 'pino-pretty',
          options: { colorize: true, translateTime: 'HH:MM:ss.l' },
        },
      }),
  // Tự redact các field nhạy cảm — KHÔNG log password / token / phone.
  redact: {
    paths: [
      'req.headers.authorization',
      'req.headers.cookie',
      '*.password',
      '*.password_hash',
      '*.new_password',
    ],
    censor: '[REDACTED]',
  },
});

// HTTP request logger middleware — log mỗi request 1 dòng JSON.
// pino-http tự correlate request id, trả response time.
export const httpLogger = pinoHttp({
  logger,
  customLogLevel: (_req, res, err) => {
    if (err) return 'error';
    if (res.statusCode >= 500) return 'error';
    if (res.statusCode >= 400) return 'warn';
    return 'info';
  },
  customSuccessMessage: (req, res) =>
    `${req.method} ${req.url} → ${res.statusCode}`,
  customErrorMessage: (req, res, err) =>
    `${req.method} ${req.url} → ${res.statusCode} ${err.message}`,
});
