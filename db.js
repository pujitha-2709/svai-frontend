import mysql from 'mysql2/promise';

const pool = mysql.createPool(process.env.MYSQL_URL);

async function query(sql, params) {
  const [rows] = await pool.execute(sql, params);
  return rows;
}

export { pool, query };
export default pool;
