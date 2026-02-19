import mysql from 'mysql2/promise';
import path from 'path';
import dotenv from 'dotenv';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

dotenv.config({ path: path.resolve(__dirname, '.env') });

const pool = mysql.createPool(process.env.MYSQL_URL);


async function query(sql, params) {
  const [rows] = await pool.execute(sql, params);
  return rows;
}

export { pool, query };
