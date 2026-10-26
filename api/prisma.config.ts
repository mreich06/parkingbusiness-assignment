import { existsSync } from 'node:fs';
import { defineConfig, env } from 'prisma/config';

// Prisma does not read .env itself. CI sets the variables directly, without a file
if (existsSync('../.env')) process.loadEnvFile('../.env');

export default defineConfig({
  schema: 'prisma/schema.prisma',
  migrations: { path: 'prisma/migrations' },
  datasource: { url: env('DATABASE_URL') },
});
