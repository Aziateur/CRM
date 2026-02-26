// Run the NEPQ sales script migration directly against Supabase
// Usage: node supabase/run-migration.mjs

import { createClient } from '@supabase/supabase-js'
import { readFileSync } from 'fs'
import { join, dirname } from 'path'
import { fileURLToPath } from 'url'

const __dirname = dirname(fileURLToPath(import.meta.url))

// Try to read from .env.local
let supabaseUrl, supabaseKey
try {
    const envContent = readFileSync(join(__dirname, '..', '.env.local'), 'utf8')
    const lines = envContent.split('\n')
    for (const line of lines) {
        if (line.startsWith('NEXT_PUBLIC_SUPABASE_URL=')) {
            supabaseUrl = line.split('=').slice(1).join('=').trim()
        }
        if (line.startsWith('NEXT_PUBLIC_SUPABASE_ANON_KEY=')) {
            supabaseKey = line.split('=').slice(1).join('=').trim()
        }
    }
} catch (e) {
    // If no .env.local, try environment variables
    supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL
    supabaseKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY
}

if (!supabaseUrl || !supabaseKey) {
    console.error('❌ Could not find Supabase credentials.')
    console.error('   Make sure .env.local exists with NEXT_PUBLIC_SUPABASE_URL and NEXT_PUBLIC_SUPABASE_ANON_KEY')
    process.exit(1)
}

console.log(`🔗 Connecting to: ${supabaseUrl}`)

const supabase = createClient(supabaseUrl, supabaseKey)

// Read both SQL files
const schemaSql = readFileSync(join(__dirname, 'migrations', '20260223161200_create_sales_scripts.sql'), 'utf8')
const seedSql = readFileSync(join(__dirname, 'migrations', '20260223161201_seed_nepq_script.sql'), 'utf8')

async function run() {
    console.log('\n📦 Step 1: Creating sales_scripts tables...')
    const { error: schemaError } = await supabase.rpc('exec_sql', { query: schemaSql })

    if (schemaError) {
        // The anon key can't run DDL via rpc. Let's try via the REST endpoint instead.
        console.log('  ⚠️  RPC not available (expected with anon key).')
        console.log('  📋 The SQL files are ready. You can run them via the Supabase Dashboard SQL Editor.')
        console.log(`\n  1. Go to: ${supabaseUrl.replace('.supabase.co', '.supabase.co')}/project/default/sql`)
        console.log('  2. Paste and run the schema file first:')
        console.log(`     ${join(__dirname, 'migrations', '20260223161200_create_sales_scripts.sql')}`)
        console.log('  3. Then paste and run the seed file:')
        console.log(`     ${join(__dirname, 'migrations', '20260223161201_seed_nepq_script.sql')}`)
        return
    }

    console.log('  ✅ Tables created!')

    console.log('\n🌱 Step 2: Seeding NEPQ script data...')
    const { error: seedError } = await supabase.rpc('exec_sql', { query: seedSql })

    if (seedError) {
        console.error('  ❌ Seed error:', seedError.message)
        return
    }

    console.log('  ✅ NEPQ script seeded!')

    // Verify
    const { data, error } = await supabase.from('sales_scripts').select('*')
    console.log('\n📊 Verification:', data ? `${data.length} script(s) in database` : error?.message)
}

run().catch(console.error)
