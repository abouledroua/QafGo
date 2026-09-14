import pool from '../config/db.js';
import fs from 'fs';
import path from 'path';

/**
 * Safely escape a SQL value for MySQL INSERT statements
 */
export const escapeSqlValue = (val) => {
  if (val === null || val === undefined) {
    return 'NULL';
  }
  if (typeof val === 'boolean') {
    return val ? '1' : '0';
  }
  if (typeof val === 'number') {
    if (isNaN(val) || !isFinite(val)) return 'NULL';
    return String(val);
  }
  if (val instanceof Date) {
    const pad = (n) => String(n).padStart(2, '0');
    const y = val.getFullYear();
    const m = pad(val.getMonth() + 1);
    const d = pad(val.getDate());
    const h = pad(val.getHours());
    const mi = pad(val.getMinutes());
    const s = pad(val.getSeconds());
    return `'${y}-${m}-${d} ${h}:${mi}:${s}'`;
  }
  if (Buffer.isBuffer(val)) {
    return `X'${val.toString('hex')}'`;
  }
  if (typeof val === 'object') {
    try {
      const jsonStr = JSON.stringify(val);
      return `'${jsonStr.replace(/[\0\x08\x09\x1a\n\r"'\\\%]/g, (char) => {
        switch (char) {
          case "\0": return "\\0";
          case "\x08": return "\\b";
          case "\x09": return "\\t";
          case "\x1a": return "\\z";
          case "\n": return "\\n";
          case "\r": return "\\r";
          case "\"":
          case "'":
          case "\\":
          case "%": return "\\" + char;
          default: return char;
        }
      })}'`;
    } catch {
      return "''";
    }
  }

  // String escaping
  const str = String(val);
  const escaped = str.replace(/[\0\x08\x09\x1a\n\r"'\\\%]/g, (char) => {
    switch (char) {
      case "\0": return "\\0";
      case "\x08": return "\\b";
      case "\x09": return "\\t";
      case "\x1a": return "\\z";
      case "\n": return "\\n";
      case "\r": return "\\r";
      case "\"":
      case "'":
      case "\\":
      case "%": return "\\" + char;
      default: return char;
    }
  });
  return `'${escaped}'`;
};

/**
 * Generate a complete, standalone SQL dump of the database
 */
export const generateDatabaseDumpSql = async () => {
  const connection = await pool.getConnection();
  try {
    const [dbNameRows] = await connection.query('SELECT DATABASE() AS db_name');
    const dbName = dbNameRows[0]?.db_name || 'qafgo_db';

    const now = new Date();
    const dumpHeader = [
      '-- ------------------------------------------------------',
      '-- QafGo Platform - Complete MySQL Database Backup',
      `-- Database: \`${dbName}\``,
      `-- Generated on: ${now.toISOString()} (${now.toLocaleString('ar-DZ')})`,
      '-- ------------------------------------------------------',
      '',
      '/*!40101 SET @OLD_CHARACTER_SET_CLIENT=@@CHARACTER_SET_CLIENT */;',
      '/*!40101 SET @OLD_CHARACTER_SET_RESULTS=@@CHARACTER_SET_RESULTS */;',
      '/*!40101 SET @OLD_COLLATION_CONNECTION=@@COLLATION_CONNECTION */;',
      '/*!50503 SET NAMES utf8mb4 */;',
      '/*!40014 SET @OLD_TIME_ZONE=@@TIME_ZONE */;',
      "/*!40014 SET TIME_ZONE='+00:00' */;",
      '/*!40014 SET @OLD_UNIQUE_CHECKS=@@UNIQUE_CHECKS, UNIQUE_CHECKS=0 */;',
      '/*!40014 SET @OLD_FOREIGN_KEY_CHECKS=@@FOREIGN_KEY_CHECKS, FOREIGN_KEY_CHECKS=0 */;',
      "/*!40101 SET @OLD_SQL_MODE=@@SQL_MODE, SQL_MODE='NO_AUTO_VALUE_ON_ZERO' */;",
      '/*!40111 SET @OLD_SQL_NOTES=@@SQL_NOTES, SQL_NOTES=0 */;',
      '',
      `CREATE DATABASE /*!32312 IF NOT EXISTS*/ \`${dbName}\` /*!40100 DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci */;`,
      `USE \`${dbName}\`;`,
      ''
    ].join('\n');

    // Retrieve all base tables
    const [tables] = await connection.query(
      `SHOW FULL TABLES WHERE Table_type = 'BASE TABLE'`
    );

    const parts = [dumpHeader];
    let totalTablesCount = 0;

    for (const tableRow of tables) {
      const tableName = Object.values(tableRow)[0];
      totalTablesCount++;

      // 1. Get CREATE TABLE statement
      const [createRows] = await connection.query(`SHOW CREATE TABLE \`${tableName}\``);
      const createTableSql = createRows[0]['Create Table'];

      parts.push([
        '',
        '-- ------------------------------------------------------',
        `-- Table structure for table \`${tableName}\``,
        '-- ------------------------------------------------------',
        `DROP TABLE IF EXISTS \`${tableName}\`;`,
        '/*!40101 SET @saved_cs_client     = @@character_set_client */;',
        '/*!50503 SET character_set_client = utf8mb4 */;',
        `${createTableSql};`,
        '/*!40101 SET character_set_client = @saved_cs_client */;',
        '',
        '-- ------------------------------------------------------',
        `-- Dumping data for table \`${tableName}\``,
        '-- ------------------------------------------------------',
        `LOCK TABLES \`${tableName}\` WRITE;`,
        `/*!40000 ALTER TABLE \`${tableName}\` DISABLE KEYS */;`
      ].join('\n'));

      // 2. Fetch data in chunks
      const CHUNK_SIZE = 500;
      let offset = 0;
      let hasMore = true;

      while (hasMore) {
        const [rows] = await connection.query(
          `SELECT * FROM \`${tableName}\` LIMIT ? OFFSET ?`,
          [CHUNK_SIZE, offset]
        );

        if (rows.length === 0) {
          hasMore = false;
          break;
        }

        const insertStatements = [];
        const columns = Object.keys(rows[0]).map((c) => `\`${c}\``).join(', ');

        const valueRows = rows.map((r) => {
          const vals = Object.values(r).map(escapeSqlValue).join(', ');
          return `(${vals})`;
        });

        insertStatements.push(
          `INSERT INTO \`${tableName}\` (${columns}) VALUES\n${valueRows.join(',\n')};`
        );

        parts.push(insertStatements.join('\n'));

        if (rows.length < CHUNK_SIZE) {
          hasMore = false;
        } else {
          offset += CHUNK_SIZE;
        }
      }

      parts.push([
        `/*!40000 ALTER TABLE \`${tableName}\` ENABLE KEYS */;`,
        'UNLOCK TABLES;',
        ''
      ].join('\n'));
    }

    const dumpFooter = [
      '',
      '-- ------------------------------------------------------',
      '/*!40103 SET TIME_ZONE=@OLD_TIME_ZONE */;',
      '/*!40101 SET SQL_MODE=@OLD_SQL_MODE */;',
      '/*!40014 SET FOREIGN_KEY_CHECKS=@OLD_FOREIGN_KEY_CHECKS */;',
      '/*!40014 SET UNIQUE_CHECKS=@OLD_UNIQUE_CHECKS */;',
      '/*!40101 SET CHARACTER_SET_CLIENT=@OLD_CHARACTER_SET_CLIENT */;',
      '/*!40101 SET CHARACTER_SET_RESULTS=@OLD_CHARACTER_SET_RESULTS */;',
      '/*!40101 SET COLLATION_CONNECTION=@OLD_COLLATION_CONNECTION */;',
      '/*!40111 SET SQL_NOTES=@OLD_SQL_NOTES */;',
      `-- Dump completed on: ${new Date().toISOString()}`,
      '-- ------------------------------------------------------'
    ].join('\n');

    parts.push(dumpFooter);

    return {
      sql: parts.join('\n'),
      tablesCount: totalTablesCount,
      database: dbName,
      generatedAt: now
    };
  } finally {
    connection.release();
  }
};

/**
 * Creates database backup file inside:
 * [destinationFolderPath] / [Year] / [YYYYMMDD] / sauvegarde_[YYYYMMDD]_[HHmm].sql
 * e.g., '2026/20260914/sauvegarde_20260914_2117.sql'
 */
export const createDatabaseBackupFile = async (destinationFolderPath) => {
  if (!destinationFolderPath || typeof destinationFolderPath !== 'string') {
    throw new Error('مسار مجلد النسخ الاحتياطي غير محدد أو غير صالح');
  }

  // Resolve absolute path
  const baseDir = path.resolve(destinationFolderPath);

  // Generate date/time components
  const now = new Date();
  const pad = (n) => String(n).padStart(2, '0');
  const year = String(now.getFullYear());
  const month = pad(now.getMonth() + 1);
  const day = pad(now.getDate());
  const hours = pad(now.getHours());
  const minutes = pad(now.getMinutes());

  const dateFolder = `${year}${month}${day}`; // e.g. 20260914
  const fileName = `sauvegarde_${dateFolder}_${hours}${minutes}.sql`; // e.g. sauvegarde_20260914_2117.sql

  // Relative path matching user requirement: 'Year/date/file.sql' -> e.g. '2026/20260914/sauvegarde_20260914_2117.sql'
  const relativeFolderPath = path.join(year, dateFolder);
  const targetDir = path.join(baseDir, relativeFolderPath);
  const targetFilePath = path.join(targetDir, fileName);
  const relativeFilePath = path.join(year, dateFolder, fileName).replace(/\\/g, '/');

  // Ensure target directories exist recursively
  if (!fs.existsSync(targetDir)) {
    fs.mkdirSync(targetDir, { recursive: true });
  }

  // Generate complete SQL dump
  const dump = await generateDatabaseDumpSql();

  // Write file atomically (or directly with utf8 encoding)
  fs.writeFileSync(targetFilePath, dump.sql, { encoding: 'utf8' });

  const stats = fs.statSync(targetFilePath);

  return {
    success: true,
    filePath: targetFilePath,
    relativeFilePath,
    fileName,
    folderPath: targetDir,
    sizeBytes: stats.size,
    tablesCount: dump.tablesCount,
    timestamp: now
  };
};
