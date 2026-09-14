import IORedis from 'ioredis';
import { env } from '../../main/config/env';

// BullMQ exige `maxRetriesPerRequest: null` na conexão (ele mesmo controla os
// retries dos comandos bloqueantes que usa por baixo dos panos).
export const createRedisConnection = () => new IORedis(env.redisUrl, { maxRetriesPerRequest: null });
