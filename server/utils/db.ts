import mysql from 'mysql2/promise';
import { useRuntimeConfig } from '#imports';

let pool: mysql.Pool;

export const getDb = () => {
  if (!pool) {
    const config = useRuntimeConfig();

    if (!config.dbHost) {
      throw new Error("FATAL: DB_HOST environment variable is missing. Please configure your database credentials in Vercel Settings -> Environment Variables.");
    }

    pool = mysql.createPool({
      host: config.dbHost,
      port: parseInt(config.dbPort as string) || 3306,
      user: config.dbUser,
      password: config.dbPassword,
      database: config.dbName,
      waitForConnections: true,
      connectionLimit: 10,
      queueLimit: 0,
      enableKeepAlive: true,
      keepAliveInitialDelay: 0,
    });
  }
  return pool;
};