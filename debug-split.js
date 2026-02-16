import fs from "fs"
import path from "path"

const sqlFile = path.join(process.cwd(), "scripts", "create-user-tables.sql")
const sqlContent = fs.readFileSync(sqlFile, "utf-8")

console.log("SQL Content:")
console.log(sqlContent)

console.log("\nSplitting by semicolon...")
const statements = sqlContent
  .split(";")
  .map(s => s.trim())
  .filter(s => s.length > 0 && !s.startsWith("--"))

console.log(`Found ${statements.length} statements:`)
statements.forEach((stmt, i) => {
  console.log(`${i + 1}: ${stmt.substring(0, 100)}...`)
})