import mysql from 'mysql2/promise';
import dotenv from 'dotenv';
dotenv.config();

const baseConfig = {
  host: process.env.DB_HOST || '127.0.0.1',
  port: parseInt(process.env.DB_PORT || '3306', 10),
  database: process.env.DB_NAME || 'qafgo_db',
  charset: 'utf8mb4',
  waitForConnections: true,
  connectionLimit: 10,
  queueLimit: 0,
  decimalNumbers: true
};

const rootConfig = {
  ...baseConfig,
  user: process.env.DB_USER || 'root',
  password: process.env.DB_PASSWORD !== undefined ? process.env.DB_PASSWORD : ''
};

const fallbackConfig = {
  ...baseConfig,
  user: 'citrus',
  password: 'citrus21012013'
};

let activePool = mysql.createPool(rootConfig);
let hasFallenBack = false;

const isAuthError = (err) => {
  if (!err) return false;
  return (
    err.code === 'ER_ACCESS_DENIED_ERROR' ||
    err.code === 'ER_TABLEACCESS_DENIED_ERROR' ||
    err.code === 'ER_DBACCESS_DENIED_ERROR' ||
    err.code === 'ER_NOT_SUPPORTED_AUTH_MODE' ||
    err.code === 'ECONNREFUSED' ||
    err.errno === 1045 ||
    err.errno === 1142 ||
    err.errno === 1044
  );
};

const switchToFallback = () => {
  if (!hasFallenBack) {
    hasFallenBack = true;
    console.warn(`[DB] Warning: 'root' access denied to database/tables. Switching immediately to user 'citrus'...`);
    activePool = mysql.createPool(fallbackConfig);
  }
  return activePool;
};

// Proxy pool wrapper to transparently intercept and fallback on access denied
const pool = new Proxy({}, {
  get(target, prop) {
    if (prop === 'query' || prop === 'execute') {
      return async (...args) => {
        try {
          return await activePool[prop](...args);
        } catch (err) {
          if (!hasFallenBack && isAuthError(err)) {
            const fallback = switchToFallback();
            return await fallback[prop](...args);
          }
          throw err;
        }
      };
    }
    if (prop === 'getConnection') {
      return async () => {
        let conn;
        try {
          conn = await activePool.getConnection();
        } catch (err) {
          if (!hasFallenBack && isAuthError(err)) {
            const fallback = switchToFallback();
            return await fallback.getConnection();
          }
          throw err;
        }

        // Return a proxy around the connection to catch permission errors during transactions or connection-level queries
        return new Proxy(conn, {
          get(connTarget, connProp) {
            if (connProp === 'query' || connProp === 'execute') {
              return async (...queryArgs) => {
                try {
                  return await connTarget[connProp](...queryArgs);
                } catch (qErr) {
                  if (!hasFallenBack && isAuthError(qErr)) {
                    connTarget.release();
                    const fallback = switchToFallback();
                    const fallbackConn = await fallback.getConnection();
                    return await fallbackConn[connProp](...queryArgs);
                  }
                  throw qErr;
                }
              };
            }
            const cVal = connTarget[connProp];
            return typeof cVal === 'function' ? cVal.bind(connTarget) : cVal;
          }
        });
      };
    }
    const val = activePool[prop];
    return typeof val === 'function' ? val.bind(activePool) : val;
  }
});

export default pool;
