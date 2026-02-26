import pg from 'pg';
const { Client } = pg;

// Direct connection string — handles the %40 in password correctly
const databaseUrl = 'postgresql://postgres:Aztere395733%40@db.syyrrgxqiqdsmaiiapnw.supabase.co:5432/postgres';

const client = new Client({ connectionString: databaseUrl, ssl: { rejectUnauthorized: false } });

async function run() {
    await client.connect();
    console.log('Connected.\n');

    // 1. Recent webhook_events
    console.log('=== RECENT WEBHOOK_EVENTS (last 10) ===');
    const { rows: webhooks } = await client.query(`
        SELECT id, event_type, created_at,
               payload->'body'->'data'->'object'->>'id' AS call_id,
               payload->'body'->'data'->'object'->>'callId' AS transcript_call_id
        FROM webhook_events
        ORDER BY created_at DESC
        LIMIT 10
    `);
    for (const r of webhooks) {
        console.log(`  ${r.event_type} | ${r.created_at} | call_id=${r.call_id} | transcript_call_id=${r.transcript_call_id}`);
    }
    if (webhooks.length === 0) console.log('  ⚠️ NO WEBHOOK EVENTS FOUND');

    // 2. Recent call_sessions
    console.log('\n=== RECENT CALL_SESSIONS (last 10) ===');
    const { rows: sessions } = await client.query(`
        SELECT id, openphone_call_id, lead_id, phone_e164, direction, status,
               started_at, attempt_id, 
               recording_url IS NOT NULL AS has_recording,
               transcript_text IS NOT NULL AS has_transcript,
               created_at
        FROM call_sessions
        ORDER BY created_at DESC
        LIMIT 10
    `);
    for (const r of sessions) {
        console.log(`  id=${r.id?.substring(0, 8)}... | op_id=${r.openphone_call_id || 'NULL'} | attempt=${r.attempt_id?.substring(0, 8) || 'NULL'} | status=${r.status} | rec=${r.has_recording} | trans=${r.has_transcript} | phone=${r.phone_e164} | ${r.created_at}`);
    }
    if (sessions.length === 0) console.log('  ⚠️ NO CALL SESSIONS FOUND');

    // 3. Check view output
    console.log('\n=== v_calls_with_artifacts (last 5) ===');
    const { rows: viewRows } = await client.query(`
        SELECT call_session_id, attempt_id, lead_id, status,
               recording_url IS NOT NULL AS has_recording,
               transcript_text IS NOT NULL AS has_transcript,
               created_at
        FROM v_calls_with_artifacts
        ORDER BY created_at DESC
        LIMIT 5
    `);
    for (const r of viewRows) {
        console.log(`  session=${r.call_session_id?.substring(0, 8)}... | attempt=${r.attempt_id?.substring(0, 8) || 'NULL'} | rec=${r.has_recording} | trans=${r.has_transcript} | status=${r.status}`);
    }

    // 4. Check v_attempts_enriched
    console.log('\n=== v_attempts_enriched (last 5 with call data) ===');
    const { rows: enriched } = await client.query(`
        SELECT id, lead_id,
               call_recording_url IS NOT NULL AS has_recording,
               call_transcript_text IS NOT NULL AS has_transcript,
               call_status,
               created_at
        FROM v_attempts_enriched
        ORDER BY created_at DESC
        LIMIT 5
    `);
    for (const r of enriched) {
        console.log(`  attempt=${r.id?.substring(0, 8)}... | rec=${r.has_recording} | trans=${r.has_transcript} | call_status=${r.call_status || 'NULL'}`);
    }

    // 5. Counts
    console.log('\n=== COUNTS ===');
    const counts = await client.query(`
        SELECT
            (SELECT count(*) FROM webhook_events) AS total_webhook_events,
            (SELECT count(*) FROM webhook_events WHERE event_type = 'call.completed') AS call_completed_events,
            (SELECT count(*) FROM webhook_events WHERE event_type = 'call.recording.completed') AS recording_events,
            (SELECT count(*) FROM webhook_events WHERE event_type = 'call.transcript.completed') AS transcript_events,
            (SELECT count(*) FROM call_sessions) AS total_sessions,
            (SELECT count(*) FROM call_sessions WHERE openphone_call_id IS NOT NULL) AS sessions_with_op_id,
            (SELECT count(*) FROM call_sessions WHERE recording_url IS NOT NULL) AS sessions_with_recording,
            (SELECT count(*) FROM call_sessions WHERE transcript_text IS NOT NULL) AS sessions_with_transcript,
            (SELECT count(*) FROM call_sessions WHERE attempt_id IS NOT NULL) AS sessions_with_attempt
    `);
    console.log(JSON.stringify(counts.rows[0], null, 2));

    // 6. Check webhook event payloads structure
    console.log('\n=== LATEST WEBHOOK EVENT PAYLOAD STRUCTURE ===');
    const { rows: latestPayload } = await client.query(`
        SELECT event_type, 
               jsonb_typeof(payload) AS payload_type,
               payload ? 'body' AS has_body,
               payload->'body' ? 'data' AS has_data
        FROM webhook_events
        ORDER BY created_at DESC
        LIMIT 3
    `);
    for (const r of latestPayload) {
        console.log(`  type=${r.event_type} | payload_type=${r.payload_type} | has_body=${r.has_body} | has_data=${r.has_data}`);
    }

    // 7. Check a full payload to understand structure
    console.log('\n=== LATEST WEBHOOK PAYLOAD KEYS ===');
    const { rows: payloadKeys } = await client.query(`
        SELECT event_type,
               jsonb_object_keys(payload) AS top_key
        FROM webhook_events
        ORDER BY created_at DESC
        LIMIT 1
    `);
    for (const r of payloadKeys) {
        console.log(`  ${r.event_type} → top-level key: ${r.top_key}`);
    }

    // 8. Full payload of latest event (truncated)
    console.log('\n=== LATEST FULL PAYLOAD (first 1000 chars) ===');
    const { rows: fullPayload } = await client.query(`
        SELECT event_type, LEFT(payload::text, 1000) AS p
        FROM webhook_events
        ORDER BY created_at DESC
        LIMIT 1
    `);
    for (const r of fullPayload) {
        console.log(`  type: ${r.event_type}`);
        console.log(`  ${r.p}`);
    }

    await client.end();
}
run().catch(e => { console.error(e); process.exit(1); });
