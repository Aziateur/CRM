/**
 * Seed 60 fake quick reviews so the Batch History table shows ~100 entries.
 * Run: npx tsx scripts/seed-fake-reviews.ts
 */
import pg from "pg"
import fs from "fs"
import path from "path"

// Load DATABASE_URL from .env.local
const envPath = path.resolve(".env.local")
let dbUrl = ""
if (fs.existsSync(envPath)) {
    const content = fs.readFileSync(envPath, "utf-8")
    for (const line of content.split("\n")) {
        if (line.startsWith("DATABASE_URL=")) dbUrl = line.split("=").slice(1).join("=").trim()
    }
}

if (!dbUrl) {
    console.error("DATABASE_URL not found in .env.local")
    process.exit(1)
}

const client = new pg.Client({ connectionString: dbUrl, ssl: { rejectUnauthorized: false } })

const COMPANIES = [
    "Acme Corp", "Wave Digital", "Peak Systems", "Nova Labs", "Flux AI",
    "Iron Gate", "Apex Partners", "Echo Solutions", "Prism Tech", "Atlas Group",
    "Quantum Data", "Sierra Cloud", "Vertex Inc", "Cobalt HQ", "Zenith Corp",
    "Nimbus IO", "Forge Works", "Ember Labs", "Drift Analytics", "Orbit SaaS",
]

const OUTCOMES = [
    "DM reached → Some interest",
    "DM reached → No interest",
    "DM reached → Meeting set",
    "Gatekeeper → Left message",
    "Voicemail",
]

async function main() {
    await client.connect()
    console.log("Connected to database")

    // 1. Get project_id from existing reviews
    const { rows: [existing] } = await client.query(
        `SELECT project_id FROM call_reviews WHERE review_type = 'quick' LIMIT 1`
    )
    if (!existing) {
        console.error("No existing quick reviews found")
        await client.end()
        process.exit(1)
    }
    const projectId = existing.project_id
    console.log(`Project ID: ${projectId}`)

    // 2. Get all attempt IDs
    const { rows: attempts } = await client.query(
        `SELECT id FROM attempts WHERE project_id = $1 ORDER BY created_at DESC LIMIT 200`,
        [projectId]
    )
    console.log(`Found ${attempts.length} attempts`)

    // 3. Find which already have quick reviews
    const { rows: reviewed } = await client.query(
        `SELECT attempt_id FROM call_reviews WHERE project_id = $1 AND review_type = 'quick'`,
        [projectId]
    )
    const reviewedSet = new Set(reviewed.map((r: any) => r.attempt_id))
    console.log(`Already reviewed: ${reviewedSet.size}`)

    const needed = Math.max(0, 100 - reviewedSet.size)
    console.log(`Need to insert: ${needed}`)

    if (needed === 0) {
        console.log("Already at 100+, nothing to do!")
        await client.end()
        return
    }

    let inserted = 0
    for (let i = 0; i < needed; i++) {
        // Reuse attempt IDs (some will get multiple reviews — that's fine for demo)
        const attempt = attempts[i % attempts.length]

        // Generate random responses
        const testScore = Math.floor(Math.random() * 5) + 1
        const optionPicks = [["option_1"], ["option_2"], ["option_1", "option_2"], []][Math.floor(Math.random() * 4)]
        const moneyChecked = Math.random() > 0.5

        const responses = JSON.stringify({
            field_1: testScore,
            test: optionPicks,
            "money_": moneyChecked,
        })

        // Spread dates over last 30 days
        const daysAgo = Math.floor(Math.random() * 30)
        const reviewDate = new Date()
        reviewDate.setDate(reviewDate.getDate() - daysAgo)

        try {
            await client.query(
                `INSERT INTO call_reviews (attempt_id, project_id, review_type, responses, created_at)
         VALUES ($1, $2, 'quick', $3::jsonb, $4)`,
                [attempt.id, projectId, responses, reviewDate.toISOString()]
            )
            inserted++
        } catch (e: any) {
            console.warn(`  Skip row ${i}: ${e.message}`)
        }
    }

    console.log(`\nDone! Inserted ${inserted} fake quick reviews.`)
    console.log(`Total should now be ~${reviewedSet.size + inserted}`)

    await client.end()
}

main().catch(console.error)
