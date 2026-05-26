import express from 'express';
import cors from 'cors';
import helmet from 'helmet';
import routes from './routes';
import { env } from './config/env';
import { errorHandler, notFoundHandler } from './middleware/error';
import { globalLimiter } from './middleware/rateLimit';
import { httpLogger } from './utils/logger';

export function createApp() {
  const app = express();

  // Khi deploy sau reverse proxy (nginx/cloudflare), phải set trust proxy
  // để Express tin X-Forwarded-For. Nếu không, clientIp() sẽ lấy IP của proxy
  // và có thể bị spoof.
  if (env.TRUST_PROXY > 0) {
    app.set('trust proxy', env.TRUST_PROXY);
  }

  // HTTP request logger — phải đặt SỚM để log mọi request kể cả 4xx từ CORS/rate-limit.
  app.use(httpLogger);

  app.use(helmet());

  // CORS — dev mở rộng, production chỉ cho origin trong whitelist.
  if (env.CORS_ORIGINS) {
    const allowed = env.CORS_ORIGINS.split(',').map((s) => s.trim()).filter(Boolean);
    app.use(
      cors({
        origin: (origin, cb) => {
          if (!origin || allowed.includes(origin)) cb(null, true);
          else cb(new Error('Origin không được phép'));
        },
        credentials: true,
      }),
    );
  } else {
    app.use(cors());
  }

  // Giới hạn rõ ràng size body — chống upload payload khổng lồ làm DoS.
  app.use(express.json({ limit: '256kb' }));

  // Rate limit toàn cục — endpoint-specific (login, forgot-password) gắn riêng.
  app.use(globalLimiter);

  app.use('/api', routes);

  app.use(notFoundHandler);
  app.use(errorHandler);

  return app;
}
