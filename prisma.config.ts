import 'dotenv/config';
import { defineConfig } from 'prisma/config';

export default defineConfig({
  schema: 'src/infrastructure/database/prisma/schema.prisma',
  migrations: {
    seed: 'tsx src/infrastructure/database/prisma/seed.ts',
  },
});
