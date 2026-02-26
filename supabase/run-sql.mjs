import { readFileSync } from 'fs'
import { join, dirname } from 'path'
import { fileURLToPath } from 'url'

const __dirname = dirname(fileURLToPath(import.meta.url))
const PROJECT_REF = 'syyrrgxqiqdsmaiiapnw'
const SERVICE_ROLE_KEY = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InN5eXJyZ3hxaXFkc21haWlhcG53Iiwicm9sZSI6InNlcnZpY2Vfcm9sZSIsImlhdCI6MTc3MDI4OTE5OCwiZXhwIjoyMDg1ODY1MTk4fQ.f7KAEtXfOdUG4DN0KZX81cOfUlZBuLSqNA1Dk_gTc4M'

async function runSQL(sql, label) {
    console.log(`\n🔄 Running: ${label}...`)
    const res = await fetch(`https://${PROJECT_REF}.supabase.co/rest/v1/rpc/`, {
        method: 'POST',
        headers: {
            'Content-Type': 'application/json',
            'apikey': SERVICE_ROLE_KEY,
            'Authorization': `Bearer ${SERVICE_ROLE_KEY}`,
        },
        body: JSON.stringify({ query: sql }),
    })

    // The REST API doesn't support raw SQL. Use the postgres HTTP endpoint instead.
    const pgRes = await fetch(`https://${PROJECT_REF}.supabase.co/pg`, {
        method: 'POST',
        headers: {
            'Content-Type': 'application/json',
            'apikey': SERVICE_ROLE_KEY,
            'Authorization': `Bearer ${SERVICE_ROLE_KEY}`,
        },
        body: JSON.stringify({ query: sql }),
    })

    if (!pgRes.ok) {
        // Try the SQL endpoint that Supabase Studio uses
        const sqlRes = await fetch(`https://${PROJECT_REF}.supabase.co/rest/v1/`, {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
                'apikey': SERVICE_ROLE_KEY,
                'Authorization': `Bearer ${SERVICE_ROLE_KEY}`,
                'Prefer': 'return=representation',
            },
            body: sql
        })
        console.log('SQL endpoint status:', sqlRes.status)
    }
}

// Actually use the Supabase Management API to run SQL
async function runSQLViaManagementAPI(sql, label) {
    console.log(`\n🔄 Running: ${label}...`)

    // Get the access token from supabase CLI config
    const { execSync } = await import('child_process')
    const debugOutput = execSync('supabase --debug projects list 2>&1 | head -3', { encoding: 'utf8' })

    // Actually, let's use the supabase CLI's stored access token
    // The management API endpoint for running SQL is:
    // POST https://api.supabase.com/v1/projects/{ref}/database/query

    // Extract access token
    const tokenLine = execSync('supabase --debug db dump --dry-run 2>&1 | grep "HTTP GET"', { encoding: 'utf8' })

    // Better: use the supabase CLI keyring
    const allDebug = execSync('supabase --debug projects list 2>&1', { encoding: 'utf8' })
    const tokenMatch = allDebug.match(/Authorization: Bearer ([^\s"]+)/)

    if (!tokenMatch) {
        console.error('Could not extract access token from CLI')
        // Fallback: use the service role key with the database directly
        return runSQLDirect(sql, label)
    }

    const accessToken = tokenMatch[1]
    console.log('  Using management API with access token')

    const res = await fetch(`https://api.supabase.com/v1/projects/${PROJECT_REF}/database/query`, {
        method: 'POST',
        headers: {
            'Content-Type': 'application/json',
            'Authorization': `Bearer ${accessToken}`,
        },
        body: JSON.stringify({ query: sql }),
    })

    if (!res.ok) {
        const text = await res.text()
        console.error(`  ❌ Error (${res.status}):`, text)
        return false
    }

    const data = await res.json()
    console.log('  ✅ Success!')
    return true
}

async function main() {
    const schemaSQL = readFileSync(join(__dirname, 'migrations', '20260223161200_create_sales_scripts.sql'), 'utf8')
    const seedSQL = readFileSync(join(__dirname, 'migrations', '20260223161201_seed_nepq_script.sql'), 'utf8')

    const ok1 = await runSQLViaManagementAPI(schemaSQL, 'Create sales_scripts tables')
    if (ok1 !== false) {
        await runSQLViaManagementAPI(seedSQL, 'Seed NEPQ script data')
    }
}

main().catch(console.error)
