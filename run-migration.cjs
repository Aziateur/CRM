const { Client } = require("pg")
const fs = require("fs")
const path = require("path")

async function main() {
    const sqlFile = process.argv[2]
    if (!sqlFile) {
        console.error("Usage: node run-migration.cjs <path-to-sql-file>")
        process.exit(1)
    }

    const sql = fs.readFileSync(path.resolve(sqlFile), "utf8")
    const client = new Client({ connectionString: process.env.DATABASE_URL })
    await client.connect()
    try {
        await client.query(sql)
        console.log("✅ Migration applied successfully")
    } catch (err) {
        console.error("❌ Migration failed:", err.message)
        process.exit(1)
    } finally {
        await client.end()
    }
}

main()
