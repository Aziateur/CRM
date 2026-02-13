
import pg from 'pg';
const { Client } = pg;
import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

// Read .env.local for DATABASE_URL
const envPath = path.resolve(__dirname, '../.env.local');
let databaseUrl = process.env.DATABASE_URL;

if (fs.existsSync(envPath)) {
    const envContent = fs.readFileSync(envPath, 'utf-8');
    const lines = envContent.split('\n');
    for (const line of lines) {
        if (line.startsWith('DATABASE_URL=')) {
            databaseUrl = line.split('=')[1].trim();
            break;
        }
    }
}

if (!databaseUrl) {
    console.error('Error: DATABASE_URL not found in .env.local or environment variables.');
    process.exit(1);
}

// Decode URL encoded characters if present (e.g. %40 for @)
try {
    // Simple check if it looks encoded, specifically targeted at the password part
    // Or just trust the string as is? pg client handles URI encoding usually if formulated correctly.
    // The value in .env.local is: postgresql://postgres:Aztere395733%40@...
    // pg client SHOULD support this.
} catch (e) {
    console.warn('Warning: Could not parse database URL for specialized decoding check.');
}

// Ensure the URL is valid for pg client
console.log(`Connecting to database... (URL length: ${databaseUrl.length})`);

const client = new Client({
    connectionString: databaseUrl,
    ssl: { rejectUnauthorized: false } // Required for Supabase in many environments
});

async function run() {
    await client.connect();
    console.log('Connected successfully.');

    const migrationsDir = path.resolve(__dirname, '../supabase/migrations');
    const files = [
        '20260213000004_allow_project_delete.sql'
    ];

    for (const file of files) {
        console.log(`Applying migration: ${file}...`);
        const filePath = path.join(migrationsDir, file);
        if (!fs.existsSync(filePath)) {
            console.error(`Error: Migration file not found: ${filePath}`);
            process.exit(1);
        }
        const sql = fs.readFileSync(filePath, 'utf-8');

        try {
            await client.query(sql);
            console.log(`Successfully applied: ${file}`);
        } catch (err) {
            console.error(`Error applying migration ${file}:`, err);
            // Don't exit immediately on error if it's "already exists" but pg errors are often cryptic for that.
            // We will exit to be safe.
            process.exit(1);
        }
    }

    console.log('All migrations applied successfully.');
    await client.end();
}

run().catch(err => {
    console.error('Unexpected error:', err);
    process.exit(1);
});
