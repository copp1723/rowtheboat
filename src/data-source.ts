import 'reflect-metadata';
import { DataSource } from 'typeorm';
import { SecretVault } from './entities/SecretVault';
import dotenv from 'dotenv';

dotenv.config();

const dbConfig = {
  type: 'postgres' as const,
  host: process.env.DB_HOST || 'localhost',
  port: parseInt(process.env.DB_PORT || '5432'),
  username: process.env.DB_USER || 'postgres',
  password: process.env.DB_PASSWORD || '',
  database: process.env.DB_NAME || 'agentflow',
  entities: [SecretVault],
  synchronize: false,
  migrations: ['src/migrations/*.js'],
  migrationsRun: false,
};

export const AppDataSource = new DataSource(dbConfig);
