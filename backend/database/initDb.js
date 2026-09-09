import fs from 'fs';
import path from 'path';
import mysql from 'mysql2/promise';
import dotenv from 'dotenv';
dotenv.config();

async function init() {
  console.log('Connecting to MySQL server...');
  const connection = await mysql.createConnection({
    host: process.env.DB_HOST || '127.0.0.1',
    port: parseInt(process.env.DB_PORT || '3306', 10),
    user: process.env.DB_USER || 'root',
    password: process.env.DB_PASSWORD || '',
    multipleStatements: true
  });

  console.log('Reading schema.sql...');
  const schemaSql = fs.readFileSync(path.resolve('./database/schema.sql'), 'utf8');

  console.log('Executing schema statements...');
  await connection.query(schemaSql);
  console.log('Schema executed successfully!');

  await connection.end();
}

init().catch(err => {
  console.error('Database initialization failed:', err);
  process.exit(1);
});
