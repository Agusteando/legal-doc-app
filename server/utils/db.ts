import mysql from 'mysql2/promise';
import { useRuntimeConfig } from '#imports';

let pool: mysql.Pool;

export const getDb = () => {
  if (!pool) {
    const config = useRuntimeConfig();
    pool = mysql.createPool({
      host: config.dbHost,
      port: parseInt(config.dbPort),
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