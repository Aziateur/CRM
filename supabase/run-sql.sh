#!/bin/bash
# Run SQL against Supabase via Management API
TOKEN="sbp_74ce6f8e849fd1b514f3ef578f7c0235d1bbc1e5"
PROJECT="syyrrgxqiqdsmaiiapnw"

run_sql() {
  local label="$1"
  local file="$2"
  echo ""
  echo "🔄 Running: $label..."
  
  # Read SQL file and escape for JSON
  local sql
  sql=$(cat "$file")
  
  # Use python to properly JSON-encode the SQL
  local json_body
  json_body=$(python3 -c "
import json, sys
sql = open('$file').read()
print(json.dumps({'query': sql}))
")
  
  local result
  result=$(curl -s -w "\n%{http_code}" -X POST \
    "https://api.supabase.com/v1/projects/$PROJECT/database/query" \
    -H "Authorization: Bearer $TOKEN" \
    -H "Content-Type: application/json" \
    -d "$json_body" 2>&1)
  
  local http_code
  http_code=$(echo "$result" | tail -1)
  local body
  body=$(echo "$result" | sed '$d')
  
  if [ "$http_code" = "201" ] || [ "$http_code" = "200" ]; then
    echo "  ✅ Success! (HTTP $http_code)"
  else
    echo "  ❌ Error (HTTP $http_code): $body"
  fi
}

SCRIPT_DIR="$(cd "$(dirname "$0")" && pwd)"
run_sql "Create sales_scripts tables" "$SCRIPT_DIR/migrations/20260223161200_create_sales_scripts.sql"
run_sql "Seed NEPQ script data" "$SCRIPT_DIR/migrations/20260223161201_seed_nepq_script.sql"

echo ""
echo "📊 Verifying..."
curl -s -X POST \
  "https://api.supabase.com/v1/projects/$PROJECT/database/query" \
  -H "Authorization: Bearer $TOKEN" \
  -H "Content-Type: application/json" \
  -d '{"query": "SELECT s.title, s.methodology, (SELECT count(*) FROM sales_script_stages WHERE script_id = s.id) as stages, (SELECT count(*) FROM sales_script_sections st JOIN sales_script_stages sg ON st.stage_id = sg.id WHERE sg.script_id = s.id) as sections, (SELECT count(*) FROM sales_script_objections WHERE script_id = s.id) as objections, (SELECT count(*) FROM sales_script_phrases WHERE script_id = s.id) as phrases FROM sales_scripts s"}'

echo ""
echo ""
echo "✅ Done!"
