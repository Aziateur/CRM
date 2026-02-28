import { createClient } from "@supabase/supabase-js"
import * as dotenv from "dotenv"

dotenv.config({ path: ".env.local" })

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL!
const supabaseKey = process.env.SUPABASE_SERVICE_ROLE_KEY! // need service role for raw SQL bypass if any, but we will test standard insertion first
const supabase = createClient(supabaseUrl, supabaseKey)

async function run() {
  console.log("Fetching first project...")
  const { data: project, error: pError } = await supabase.from("projects").select("id").limit(1).single()
  if (pError || !project) { console.log("No project found:", pError); return }

  console.log("Attempting to insert test field...")
  const { data, error } = await supabase.from("field_definitions").insert([{
    entity_type: "lead",
    field_key: `test_field_creation_${Math.random()}`,
    field_label: "Test Field Creation",
    field_type: "text",
    project_id: project.id,
    position: 999
  }]).select().single()

  console.log("Insert Result:")
  console.log(data ? "Success!" : error)

  if (data) {
    console.log("Cleaning up test field...")
    await supabase.from("field_definitions").delete().eq("id", data.id)
  }
}

run()
