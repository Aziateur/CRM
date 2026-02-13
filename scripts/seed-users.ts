
import pg from 'pg';
import fs from 'fs';
import path from 'path';

const envPath = path.resolve('.env.local');
let dbUrl = '';
if (fs.existsSync(envPath)) {
    const content = fs.readFileSync(envPath, 'utf-8');
    for (const line of content.split('\n')) {
        if (line.startsWith('DATABASE_URL=')) dbUrl = line.split('=')[1].trim();
    }
}

const client = new pg.Client({ connectionString: dbUrl, ssl: { rejectUnauthorized: false } });

async function seed() {
    await client.connect();
    console.log('Seeding additional users...');

    const users = [
        { email: 'sarah.connor@example.com', name: 'Sarah Connor' },
        { email: 'john.wick@example.com', name: 'John Wick' }
    ];

    for (const u of users) {
        try {
            // Using register_user RPC to handle side effects
            // Using password 'password123'
            const res = await client.query(`SELECT register_user($1, 'password123', $2) as result`, [u.email, u.name]);
            const success = res.rows[0].result.success;
            if (success) {
                console.log(`Created user: ${u.email}`);
            } else {
                console.log(`Failed to create user ${u.email}:`, res.rows[0].result.error);
            }
        } catch (e) {
            console.log(`Error creating user ${u.email}: (likely already exists)`, e.message);
        }
    }

    // Set roles explicitly if needed, but they default to 'user' which is correct.

    // Ensure first user is definitely admin (migration did this, but re-confirm)
    await client.query(`UPDATE users SET system_role = 'admin' WHERE id = (SELECT id FROM users ORDER BY created_at ASC LIMIT 1)`);
    console.log('Admin role confirmed for first user.');

    await client.end();
}

seed().catch(console.error);
