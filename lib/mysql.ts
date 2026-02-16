import mysql from "mysql2/promise"

let pool: mysql.Pool | null = null

export function getPool() {
  if (pool) return pool
  const url = process.env.MYSQL_URL || process.env.DATABASE_URL
  if (!url) throw new Error("MYSQL_URL is not set in environment")

  pool = mysql.createPool(url)
  return pool
}

export async function query(sql: string, params: any[] = []) {
  const p = getPool()
  const [rows] = await p.query(sql, params)
  return rows
}
