# Dalio CRM — AI Setup Guide

> **Purpose:** This document is a step-by-step reference for an AI assistant to configure the CRM incrementally. Each section is self-contained — you can configure them in any order, one at a time.
>
> **How to use:** Tell your AI "Let's configure Section X" and provide your answers to the questions listed. The AI will then either help you fill in the UI form or generate the SQL/API calls to set things up directly.

---

## Table of Contents

1. [Pipeline Stages](#1-pipeline-stages)
2. [Tags](#2-tags)
3. [Custom Fields](#3-custom-fields)
4. [KB Categories](#4-kb-categories)
5. [KB Tab Visibility](#5-kb-tab-visibility)
6. [Framework — Levers](#6-framework--levers)
7. [Framework — Markers](#7-framework--markers)
8. [Framework — Phases](#8-framework--phases)
9. [Message Templates](#9-message-templates)
10. [Workflow Automation Rules](#10-workflow-automation-rules)
11. [Sequences](#11-sequences)
12. [Review Templates](#12-review-templates)
13. [Playbook Rules](#13-playbook-rules)
14. [Stop Signals](#14-stop-signals)
15. [Knowledge Base — Scripts](#15-knowledge-base--scripts)
16. [Knowledge Base — ICP](#16-knowledge-base--icp)
17. [Knowledge Base — Friction](#17-knowledge-base--friction)
18. [Knowledge Base — Industry Intel](#18-knowledge-base--industry-intel)
19. [Knowledge Base — Metrics](#19-knowledge-base--metrics)
20. [User & Team Setup](#20-user--team-setup)

---

## System Context

- **Database:** Supabase (PostgreSQL). URL: configured in `.env.local` as `NEXT_PUBLIC_SUPABASE_URL`.
- **Frontend:** Next.js app. Settings at `/settings`, Playbook at `/playbook`, Admin at `/admin`.
- **Every data table has a `project_id` column.** All queries are scoped to the active project.
- **Supabase client:** `import { getSupabase } from "@/lib/supabase"` — uses the anon key + session token header.

---

## 1. Pipeline Stages

### What it is
The sales pipeline columns. Every lead sits in one stage at a time. Stages are shown in Kanban view and in the Stage dropdown on leads.

### Where it lives
- **Table:** `pipeline_stages`
- **UI:** Settings → Pipeline tab → Pipeline Editor
- **Code:** `components/pipeline-editor.tsx`, `hooks/use-pipeline-stages.ts`

### Data Structure
```typescript
interface PipelineStage {
  id: string              // UUID, auto-generated
  name: string            // e.g. "New", "Contacted", "Meeting Booked"
  position: number        // 0, 1, 2... controls display order
  defaultProbability: number  // 0-100, used for pipeline math
  color: string           // hex color, e.g. "#3b82f6"
  isWon: boolean          // true = this stage means "deal won"
  isLost: boolean         // true = this stage means "deal lost"
  // Also has: project_id, created_at (auto)
}
```

### Current defaults
| Position | Name | Color | Probability | Won? | Lost? |
|----------|------|-------|-------------|------|-------|
| 0 | New | #6b7280 (gray) | 0% | ❌ | ❌ |
| 1 | Contacted | #3b82f6 (blue) | 10% | ❌ | ❌ |
| 2 | Interested | #8b5cf6 (purple) | 30% | ❌ | ❌ |
| 3 | Meeting Booked | #f59e0b (amber) | 60% | ❌ | ❌ |
| 4 | Won | #22c55e (green) | 100% | ✅ | ❌ |
| 5 | Lost | #ef4444 (red) | 0% | ❌ | ✅ |

### Questions to answer
1. What stages does your sales process have? (List them in order, start to finish)
2. For each stage: what close probability would you assign? (0-100%)
3. Which stage(s) mean "won"?
4. Which stage(s) mean "lost"?
5. What color for each? (or let AI pick a palette)

### How to configure
**Via UI:** Settings → Pipeline → click "Add Stage" or edit existing ones.

**Via SQL (direct):**
```sql
-- Delete existing stages for your project, then insert new ones
DELETE FROM pipeline_stages WHERE project_id = '<YOUR_PROJECT_ID>';

INSERT INTO pipeline_stages (project_id, name, position, default_probability, color, is_won, is_lost)
VALUES
  ('<PROJECT_ID>', 'New', 0, 0, '#6b7280', false, false),
  ('<PROJECT_ID>', 'Contacted', 1, 10, '#3b82f6', false, false),
  -- ... add more stages
;
```

---

## 2. Tags

### What it is
Labels you attach to leads for filtering and grouping. No hierarchy — just flat colored labels.

### Where it lives
- **Table:** `tags` (tag definitions), `lead_tags` (assignments)
- **UI:** Settings → Pipeline tab → Tag Manager
- **Code:** `components/tag-manager.tsx`, `hooks/use-tags.ts`

### Data Structure
```typescript
interface Tag {
  id: string       // UUID
  name: string     // e.g. "Hot Lead", "Call Back Tomorrow"
  color: string    // hex, e.g. "#ef4444"
  // Also: project_id, created_at
}
```

### Questions to answer
1. What tags do you want? (e.g., "Hot", "Cold", "Priority", "VIP", "Do Not Call", etc.)
2. What color for each? (or auto-assign)

### How to configure
**Via UI:** Settings → Pipeline → Tag Manager → type name, pick color, click Add.

**Via SQL:**
```sql
INSERT INTO tags (project_id, name, color) VALUES
  ('<PROJECT_ID>', 'Hot Lead', '#ef4444'),
  ('<PROJECT_ID>', 'Call Back', '#f59e0b'),
  ('<PROJECT_ID>', 'VIP', '#8b5cf6');
```

---

## 3. Custom Fields

### What it is
Extra data fields that appear on leads, contacts, or opportunities. Rendered dynamically via `DynamicFieldRenderer`.

### Where it lives
- **Table:** `field_definitions`
- **UI:** Settings → Pipeline tab → Field Editor
- **Code:** `components/field-editor.tsx`, `components/dynamic-field-renderer.tsx`

### Data Structure
```typescript
type FieldType = "text" | "number" | "select" | "multi_select" | "date" | "boolean" | "url" | "email"

interface FieldDefinition {
  id: string
  entityType: string      // "lead" | "contact" | "opportunity"
  fieldKey: string         // auto-generated slug from label, e.g. "fleet_size"
  fieldLabel: string       // display name, e.g. "Fleet Size"
  fieldType: FieldType
  options?: string[]       // for select/multi_select only
  isRequired: boolean
  position: number         // display order
  // Also: project_id, created_at
}
```

### Questions to answer
For each custom field:
1. **Entity:** Is it for Leads, Contacts, or Opportunities?
2. **Label:** What should it be called? (e.g., "Fleet Size", "Annual Revenue")
3. **Type:** What kind of data? (text, number, select dropdown, multi-select, date, yes/no, URL, email)
4. **Required?** Must the user fill it in?
5. **Options:** (For select/multi_select only) What are the choices?

### Example fields for a trucking sales CRM
| Entity | Label | Type | Options | Required |
|--------|-------|------|---------|----------|
| lead | Fleet Size | number | — | No |
| lead | Service Needed | select | GPS Tracking, Dash Cam, ELD, Fleet Management | No |
| lead | Current Provider | text | — | No |
| lead | Contract End Date | date | — | No |
| contact | Department | select | Operations, IT, Finance, C-Suite | No |

### How to configure
**Via UI:** Settings → Pipeline → Field Editor → select entity tab → Add Field.

**Via SQL:**
```sql
INSERT INTO field_definitions (project_id, entity_type, field_key, field_label, field_type, options, is_required, position)
VALUES
  ('<PROJECT_ID>', 'lead', 'fleet_size', 'Fleet Size', 'number', NULL, false, 0),
  ('<PROJECT_ID>', 'lead', 'service_needed', 'Service Needed', 'select', '["GPS Tracking","Dash Cam","ELD"]', false, 1);
```

---

## 4. KB Categories

### What it is
Dropdown values used throughout the Knowledge Base. There are 7 independent category types. Each type has its own list of named entries with colors and icons.

### Where it lives
- **Table:** `categories`
- **UI:** Settings → KB Config tab → Category Types
- **Code:** `lib/categories.ts`, `components/category-manager.tsx`

### Data Structure
```typescript
interface Category {
  id: string
  projectId: string
  categoryType: string    // one of the 7 types below
  name: string            // display name
  slug: string            // auto-generated URL-safe key
  icon: string            // emoji, e.g. "🏢"
  color: string | null    // hex color
  description: string | null
  sortOrder: number
  isActive: boolean       // archived if false
  metadata: Record<string, unknown>  // extensible
}
```

### The 7 category types

#### 4a. `segment` — ICP Segments
Who you're selling to. Used for lead segmentation.

**Default seeds:** Unknown, SMB, Mid-Market, Enterprise, Other

**Questions:** What market segments do you target? (e.g., "Trucking <50 trucks", "Trucking 50-200", "Enterprise 200+", "Home Services", etc.)

#### 4b. `intel_category` — Industry Intel Categories
How you organize market intelligence.

**Default seeds:** Competitor Movement, Market Trend, Regulation, Technology Shift, Pricing & Deal Intelligence

**Questions:** What categories of intel do you track? (e.g., competitor pricing, industry regulations, tech trends)

#### 4c. `script_section_type` — Script Section Types
How scripts are structured. Each script has sections of these types.

**Default seeds:** Opener, Discovery, Value Prop, Objection Handling, Social Proof, Close, Voicemail Script, Full Script

**Questions:** What sections do your call scripts have?

#### 4d. `segment_section_type` — Segment Dossier Sections
Per-segment knowledge entries (like a briefing doc for each segment).

**Default seeds:** Language That Works, Pains & Priorities, Market Recap

**Questions:** What kind of notes do you keep per segment? (e.g., "Key phrases", "Common objections", "Industry news")

#### 4e. `friction_category` — Friction Categories
Types of blockers/friction you encounter in calls.

**Default seeds:** Got Stuck, Lost Control, Missed Opportunity, Timing Issue

**Questions:** What types of problems do you hit on calls?

#### 4f. `root_cause_type` — Root Cause Types
Why friction happens (diagnosis).

**Default seeds:** Script Issue, Objection Not Handled, Confidence Issue, Poor Discovery, Knowledge Gap, Bad Data, Process Issue

**Questions:** When things go wrong, what are the root causes?

#### 4g. `stage` — Sales Stages (for scripts)
Which stage of the sales conversation a script applies to. Different from pipeline stages — these are *conversation* stages.

**Default seeds:** Cold Open, Follow-up, Re-engagement, Close / CTA

**Questions:** What conversation stages do your scripts target?

### How to configure
**Via UI:** Settings → KB Config → expand each category type → add/edit/reorder/archive.

**Via SQL:**
```sql
INSERT INTO categories (project_id, category_type, name, slug, icon, color, sort_order, is_active, metadata)
VALUES
  ('<PROJECT_ID>', 'segment', 'Trucking SMB', 'trucking-smb', '🚛', '#3b82f6', 0, true, '{}'),
  ('<PROJECT_ID>', 'segment', 'Trucking Enterprise', 'trucking-enterprise', '🏢', '#8b5cf6', 1, true, '{}');
```

---

## 5. KB Tab Visibility

### What it is
Controls which Knowledge Base tabs appear on the Playbook page and what they're called.

### Where it lives
- **Table:** `tab_config`
- **UI:** Settings → KB Config tab → Tab Visibility
- **Code:** `lib/categories.ts` (`TabConfig` type)

### Data Structure
```typescript
interface TabConfig {
  id: string
  projectId: string
  slug: string        // fixed: "playbook", "scripts", "icp", "friction", "metrics"
  label: string       // customizable display name
  sortOrder: number
  isVisible: boolean  // toggle on/off
}
```

### Default tabs
| Slug | Default Label | Visible |
|------|--------------|---------|
| playbook | Playbook | ✅ |
| scripts | Scripts | ✅ |
| icp | ICP | ✅ |
| friction | Friction | ✅ |
| metrics | Metrics & Diagnostics | ✅ |

### Questions to answer
1. Which tabs do you want visible right now? (You can always turn others on later)
2. Do you want to rename any? (e.g., "ICP" → "Target Profile")

---

## 6. Framework — Levers

### What it is
Levers are **behavior reminders** — one-line coaching prompts shown during calls. Each phase focuses on one lever. Think of them as "the skill I'm practicing this week."

### Where it lives
- **Tables:** `frameworks` (root) → `framework_levers` (children)
- **UI:** Settings → Framework tab → Levers section
- **Code:** `lib/framework.ts`

### Data Structure
```typescript
interface Lever {
  key: string       // stable ID, e.g. "call.framing"
  label: string     // display name, e.g. "Framing & Positioning"
  prompt?: string   // one-line coaching reminder shown during dial session
}
```

### Current defaults
| Key | Label | Prompt |
|-----|-------|--------|
| `call.framing` | Framing & Positioning | Lead with their world, not your pitch |
| `call.curiosity` | Curiosity Questions | Ask one question you don't know the answer to |
| `call.qualify` | Qualify Who They Are | Confirm ICP fit before pitching |
| `call.pain` | Pain Extraction | Find the pain behind the stated need |
| `call.adapt` | Adapt Next Line | React to what they said, not your script |

### Questions to answer
1. What sales skills do you want to practice/improve?
2. For each: what's a one-line reminder you'd want to see before every call?
3. Are the defaults good enough to start with?

---

## 7. Framework — Markers

### What it is
Markers are **Y/N observations** you record after each call. They're used by phases as "action checkbox" (did I do the thing?) and "win checkbox" (did it work?).

### Where it lives
- **Table:** `framework_markers`
- **UI:** Settings → Framework tab → Markers section

### Data Structure
```typescript
interface Marker {
  key: string          // stable ID, e.g. "focus_practiced"
  label: string        // shown in checkbox, e.g. "Did the move"
  definition?: string  // tooltip explaining what YES means
}
```

### Current defaults
| Key | Label | Definition |
|-----|-------|-----------|
| `focus_practiced` | Did the move | Did I consciously practice the focus skill on this call? |
| `new_truth_gained` | Got new truth | Did I learn something new about the prospect's real situation? |

### Questions to answer
1. After every call, what Y/N questions do you want to answer?
2. What would "success" look like for each one?
3. Are the defaults good enough to start?

### Examples of custom markers
- "Opened with value" — Did I lead with a relevant insight?
- "Asked for meeting" — Did I explicitly invite them to a meeting?
- "Identified pain" — Did I uncover their actual problem?
- "DM engaged" — Did the decision maker actively engage?

---

## 8. Framework — Phases

### What it is
Phases are **named training modes** your sales process cycles through. Each phase has a goal, a focus lever, a tracking period, and exit criteria. Only one phase is active at a time.

### Where it lives
- **Table:** `framework_phases`
- **UI:** Settings → Framework tab → Phases section

### Data Structure
```typescript
type PrimaryGoal = "reps" | "action" | "win" | "outcome_meetings"
type PeriodConfig =
  | { type: "today" }
  | { type: "iso_week" }
  | { type: "rolling_days"; days: number }

interface Phase {
  key: string               // stable ID
  label: string             // "Call Quality", "Book Meetings", etc.
  whyText: string           // bottleneck hypothesis — why are you in this phase?
  doText: string            // behavioral instruction — what to do each call
  winText: string           // success definition — what does winning look like?
  focusLeverKey: string     // which lever to practice (references a Lever key)
  actionMarkerKey?: string  // "did I do it?" checkbox (references a Marker key)
  winMarkerKey?: string     // "did it work?" checkbox (references a Marker key)
  primaryGoal: PrimaryGoal  // what are we counting?
  target: number            // how many per period?
  period: PeriodConfig      // time window
  exitCriteria?: string     // when to move to next phase
}
```

### Primary Goal options
| Value | Meaning | Example metric |
|-------|---------|---------------|
| `reps` | Total calls made | "Make 40 calls this week" |
| `action` | Calls where you did the lever move | "Practice the opener 30 times" |
| `win` | Calls where the win marker was positive | "Learn something new 25 times" |
| `outcome_meetings` | Meetings booked | "Book 8 meetings this week" |

### Current defaults
| Phase | Why | Primary Goal | Target | Period |
|-------|-----|-------------|--------|--------|
| **Call Quality** | My calls aren't converting — I need better execution | reps (calls) | 40/week | This week |
| **Market Intel** | I don't understand prospects' real situation | win (got new truth) | 25/week | This week |
| **Book Meetings** | I'm connecting but not converting to meetings | outcome_meetings | 8/week | This week |

### Questions to answer
For each phase you want:
1. **Name:** What would you call this mode? (e.g., "Ramp Up", "Discovery Sprint", "Closing Push")
2. **Why:** What bottleneck does this phase address?
3. **Do:** What should the rep do on every call?
4. **Win:** What does success look like?
5. **Focus Lever:** Which lever to practice? (from Section 6)
6. **Action Marker:** Which marker tracks "did I do it?" (from Section 7, or none)
7. **Win Marker:** Which marker tracks "did it work?" (from Section 7, or none)
8. **Goal:** What are you counting? (calls, actions, wins, meetings)
9. **Target:** How many per period?
10. **Period:** Today, this week, or rolling N days?
11. **Exit Criteria:** When should you switch phases?

---

## 9. Message Templates

### What it is
Pre-written email/SMS/call scripts with variable placeholders. Used in sequences and available in the template picker.

### Where it lives
- **Table:** `templates`
- **UI:** Settings → Automation tab → Template Manager
- **Code:** `components/template-manager.tsx`, `hooks/use-templates.ts`

### Data Structure
```typescript
type TemplateCategory = "call" | "email" | "sms" | "note"

interface Template {
  id: string
  name: string            // e.g. "Follow-Up Email"
  category: TemplateCategory
  subject?: string        // email subject line
  body: string            // template text with {{variables}}
  variables: string[]     // extracted from body: ["company", "contact_name"]
  isDefault: boolean
  position: number        // display order
  // Also: project_id, created_at
}
```

### Available variables
`{{company}}`, `{{contact_name}}`, `{{phone}}`, `{{email}}`, `{{segment}}`, `{{stage}}`

### Questions to answer
For each template:
1. **Name:** What's this template called?
2. **Type:** Call script, email, SMS, or note?
3. **Subject:** (Email only) What's the subject line?
4. **Body:** What's the content? Use `{{variable}}` for dynamic parts.

### Example
```
Name: "Cold Follow-Up Email"
Category: email
Subject: "Quick follow-up, {{contact_name}}"
Body: "Hi {{contact_name}},\n\nI reached out earlier regarding {{company}} and wanted to follow up.\n\nWould 15 minutes this week work to discuss?\n\nBest,\n[Your name]"
```

---

## 10. Workflow Automation Rules

### What it is
IF/THEN automation rules. When something happens (trigger), the system does something (action) automatically.

### Where it lives
- **Table:** `workflows`
- **UI:** Settings → Automation tab → Workflow Editor
- **Code:** `components/workflow-editor.tsx`, `lib/workflow-engine.ts`

### Data Structure
```typescript
type WorkflowTriggerType =
  | "stage_change"     // lead moves to a new stage
  | "new_lead"         // lead is created
  | "tag_added"        // tag is attached to a lead
  | "tag_removed"      // tag is removed from a lead
  | "field_changed"    // a field value changes
  | "lead_idle"        // lead hasn't been contacted in X days
  | "task_overdue"     // a task passes its due date
  | "outcome_logged"   // an attempt with specific outcome is logged

type WorkflowActionType =
  | "change_stage"     // move lead to a stage
  | "add_tag"          // attach a tag
  | "remove_tag"       // remove a tag
  | "create_task"      // create a follow-up task
  | "update_field"     // set a field value
  | "send_notification" // show a notification
  | "enroll_sequence"  // enroll lead in a sequence

interface Workflow {
  name: string
  description?: string
  isActive: boolean
  triggerType: WorkflowTriggerType
  triggerConfig: Record<string, unknown>  // depends on trigger type
  actionType: WorkflowActionType
  actionConfig: Record<string, unknown>   // depends on action type
}
```

### Questions to answer
For each rule:
1. **Name:** What do you call this rule?
2. **When:** What event triggers it? (stage change, outcome logged, tag added, etc.)
3. **Condition:** Any specific conditions? (e.g., "only when stage = 'Meeting Booked'")
4. **Then:** What should happen? (add tag, create task, change stage, etc.)

### Examples
| Name | Trigger | Action |
|------|---------|--------|
| "Flag hot lead" | Outcome = "DM reached → Some interest" | Add tag "Hot Lead" |
| "Auto-task on meeting" | Outcome = "Meeting set" | Create task "Prepare deck" |
| "Re-engage idle leads" | Lead idle > 14 days | Add tag "Re-Engage" |
| "Disqualify" | Stage changed to "Lost" | Remove tag "Hot Lead" |

---

## 11. Sequences

### What it is
Multi-step automated outreach campaigns. Each sequence has ordered steps with delays between them. Leads are enrolled individually.

### Where it lives
- **Tables:** `sequences` (definition), `sequence_steps` (steps), `sequence_enrollments` (which leads are enrolled)
- **UI:** Settings → Sequences tab
- **Code:** `components/sequence-editor.tsx`, `hooks/use-sequences.ts`

### Data Structure
```typescript
type SequenceStepType = "call" | "email" | "sms" | "task" | "wait"

interface Sequence {
  name: string              // e.g. "New Lead Nurture"
  description?: string
  isActive: boolean
}

interface SequenceStep {
  position: number          // order in sequence (0, 1, 2...)
  stepType: SequenceStepType
  delayDays: number         // days to wait before this step
  templateId?: string       // link to a message template
  config: Record<string, unknown>
}
```

### Questions to answer
For each sequence:
1. **Name:** What's this sequence?
2. **Steps:** List in order — what type (call/email/SMS/task/wait), how many days delay, which template?

### Example
```
Sequence: "New Lead 5-Touch"
Steps:
  1. Day 0: Call (no template needed)
  2. Day 0: Email → "Cold Intro Email" template
  3. Day 2: Wait
  4. Day 3: Call (follow-up)
  5. Day 3: SMS → "Quick Follow-Up" template
  6. Day 5: Wait
  7. Day 7: Email → "Last Chance" template
```

---

## 12. Review Templates

### What it is
Custom forms used during Batch Review to evaluate calls. Each template defines fields that the rep fills out when reviewing their calls.

### Where it lives
- **Table:** `review_templates`
- **UI:** Settings → Templates tab
- **Code:** `components/review-templates-tab.tsx`, `hooks/use-review-templates.ts`

### Data Structure
```typescript
interface ReviewField {
  key: string
  label: string
  fieldType: "rating" | "text" | "textarea" | "select" | "multi_select" | "boolean" | "number" | "likert"
  section: string           // group fields into visual sections
  config: {
    options?: { value: string; label: string; color?: string; score?: number }[]
    min?: number; max?: number  // for rating/likert
    placeholder?: string
  }
  isRequired: boolean
}

interface ReviewTemplate {
  name: string
  description?: string
  fields: ReviewField[]
  isDefault: boolean
  isLocked: boolean
}
```

### Questions to answer
1. When reviewing a call, what do you want to evaluate?
2. For each evaluation dimension, what type of input? (1-5 rating, select dropdown, yes/no, free text)
3. What sections should group the fields? (e.g., "Execution", "Outcome", "Learning")

### Example review template
```
Name: "Standard Call Review"
Fields:
  - "Overall Rating" (rating 1-5, section: "Quality")
  - "Opener Quality" (select: Weak/OK/Strong, section: "Execution")
  - "Questions Asked" (number, section: "Execution")
  - "DM Engaged?" (boolean, section: "Outcome")
  - "Key Learning" (textarea, section: "Learning")
  - "What To Improve" (textarea, section: "Learning")
```

---

## 13. Playbook Rules

### What it is
Collected wisdom in IF/THEN/BECAUSE format. Rules build your team's institutional knowledge about what works.

### Where it lives
- **Table:** `rules`
- **UI:** Playbook → Rules tab
- **Code:** `app/playbook/page.tsx`

### Data Structure
```typescript
type RuleConfidence = "Low" | "Likely" | "Proven"

interface Rule {
  ifWhen: string              // "IF calling trucking companies with <50 trucks"
  then: string                // "THEN lead with fuel savings, not fleet management"
  because: string             // "BECAUSE small fleets care more about costs than optimization"
  confidence: RuleConfidence  // Low (<3 data points), Likely (3-9), Proven (10+)
  evidenceAttemptIds: string[] // links to specific calls that prove this
  isActive: boolean
}
```

### Questions to answer
Think about your best sales learnings:
1. **IF/WHEN:** Under what condition does this apply?
2. **THEN:** What should you do?
3. **BECAUSE:** Why does it work? What's the evidence?
4. **Confidence:** Have you proven it (10+ calls), is it likely (3-9), or just a hypothesis?

### Examples
| IF/WHEN | THEN | BECAUSE |
|---------|------|---------|
| Calling before 9 AM | Lead with "quick question" opener | They haven't been pitched yet today |
| Gatekeeper says "he's busy" | Ask "what time works better?" | Specific callback time gets 3x more connects |
| DM says "we have a provider" | Ask "what do you wish they did better?" | 70% reveal a gap we can address |

---

## 14. Stop Signals

### What it is
Auto-detected warning patterns that trigger coaching drills. The system monitors your recent calls and alerts you when a negative pattern emerges.

### Where it lives
- **Table:** `stop_signals`
- **UI:** Playbook → Stop Signals tab

### Data Structure
```typescript
interface StopSignal {
  name: string                  // "No Connect Streak"
  description: string           // what this signal means
  triggerCondition: string       // "consecutive_no_connect"
  threshold: number             // how many before triggering (e.g., 5)
  windowSize: number            // look at last N calls (e.g., 10)
  recommendedDrillId?: string   // which drill to practice
  isActive: boolean
}
```

### Questions to answer
1. What negative patterns worry you? (long no-connect streaks, too many rejections, etc.)
2. How many in a row before it should alert you?
3. What's the fix? (change approach, take a break, practice a drill?)

### Examples
| Signal | Trigger | Threshold | Window |
|--------|---------|-----------|--------|
| No Connect Streak | consecutive "No connect" outcomes | 5 | last 10 calls |
| Rejection Spike | "DM reached → No interest" count | 4 | last 10 calls |
| Meeting Slump | 0 meetings | — | last 30 calls |

---

## 15. Knowledge Base — Scripts

### What it is
Structured call scripts organized by section type. Each script can target a specific segment and sales stage.

### Where it lives
- **Table:** `scripts`
- **UI:** Playbook → Scripts tab
- **Code:** `components/kb-scripts-tab.tsx`

### Questions to answer
For each script:
1. What segment is it for? (e.g., "Trucking SMB")
2. What stage? (e.g., "Cold Open")
3. What section type? (Opener, Discovery, Objection Handling, etc.)
4. The actual script text

---

## 16. Knowledge Base — ICP

### What it is
Ideal Customer Profile entries. Detailed notes about who your best customers are and what they care about, organized by segment.

### Where it lives
- **Table:** `icp_entries`
- **UI:** Playbook → ICP tab
- **Code:** `components/kb-icp-tab.tsx`

### Questions to answer
For each segment:
1. **Language that works:** What phrases resonate?
2. **Pains & priorities:** What do they care about most?
3. **Buying signals:** How do you know they're interested?
4. **Disqualifiers:** When should you walk away?

---

## 17. Knowledge Base — Friction

### What it is
A log of friction points — moments in calls where things went wrong. Used for pattern recognition and improvement.

### Where it lives
- **Table:** `friction_log`
- **UI:** Playbook → Friction tab
- **Code:** `components/kb-friction-tab.tsx`

### Questions to answer
1. What are recurring problems you face on calls?
2. For each: what's the root cause?
3. What could fix it?

---

## 18. Knowledge Base — Industry Intel

### What it is
Market intelligence organized by category. Useful for knowing competitor moves, market trends, regulations, etc.

### Where it lives
- **Table:** `industry_intel`
- **UI:** Playbook → Industry Intel tab (shown as one of the KB tabs)
- **Code:** `components/kb-industry-tab.tsx`

### Questions to answer
1. What competitors should you track?
2. What industry trends affect your sales conversations?
3. Any new regulations or technology shifts?

---

## 19. Knowledge Base — Metrics

### What it is
Custom qualitative metrics you track beyond the standard CRM metrics. Could be process quality indicators, lead quality scores, etc.

### Where it lives
- **Table:** `kb_metrics`
- **UI:** Playbook → Metrics tab
- **Code:** `components/kb-metrics-tab.tsx`

### Questions to answer
1. What custom metrics matter to you beyond call count and meeting rate?
2. What are the targets/benchmarks?

---

## 20. User & Team Setup

### What it is
Creating users and assigning them to your project with roles.

### Where it lives
- **Tables:** `users`, `user_projects`
- **UI:** Admin page → Team tab → Create User form
- **RPC:** `create_user_for_project`

### Roles
| Level | Role | Can do |
|-------|------|--------|
| **System** | `superadmin` | See all projects, all users, manage everything |
| **System** | `admin` | Same as superadmin for most features |
| **System** | `user` | Normal user |
| **System** | `service` | Dev/test accounts, only visible to superadmin |
| **Project** | `owner` | Full project control, can add/remove anyone, change roles |
| **Project** | `manager` | Can add reps, see team metrics |
| **Project** | `rep` | Can use the CRM, log calls, manage their leads |

### Questions to answer
For each team member:
1. **Name**
2. **Email** (login)
3. **Password** (auto-generated or custom)
4. **Project Role:** Owner, Manager, or Rep?

### How to configure
**Via UI:** Admin → Team tab → fill in Create User form → click Create → share credentials.

**Via RPC (direct):**
```javascript
const { data } = await supabase.rpc("create_user_for_project", {
  p_creator_id: "YOUR_USER_ID",
  p_project_id: "YOUR_PROJECT_ID",
  p_name: "John Doe",
  p_email: "john@company.com",
  p_password: "SecurePassword123!",
  p_project_role: "rep",
  p_system_role: "user",
})
```

---

## Configuration Order — Recommended

Start with the foundation, then layer on complexity:

### Phase 1: Foundation (set up once)
1. ✅ [Pipeline Stages](#1-pipeline-stages) — define your sales process
2. ✅ [Tags](#2-tags) — basic labeling system
3. ✅ [KB Categories (Segments only)](#4-kb-categories) — who you sell to

### Phase 2: Calling Infrastructure
4. ✅ [Framework Levers](#6-framework--levers) — what skills to practice
5. ✅ [Framework Markers](#7-framework--markers) — what to track per call
6. ✅ [Framework Phases](#8-framework--phases) — training modes

### Phase 3: Knowledge Base
7. ✅ [KB Scripts](#15-knowledge-base--scripts) — call scripts
8. ✅ [Playbook Rules](#13-playbook-rules) — institutional knowledge
9. ✅ [KB ICP](#16-knowledge-base--icp) — target customer profiles

### Phase 4: Automation & Team
10. ✅ [Templates](#9-message-templates) — pre-written messages
11. ✅ [Sequences](#11-sequences) — multi-step campaigns
12. ✅ [Workflows](#10-workflow-automation-rules) — auto-actions
13. ✅ [Users](#20-user--team-setup) — create team accounts

### Phase 5: Refinement (over time)
14. ✅ [Custom Fields](#3-custom-fields) — extra data you realize you need
15. ✅ [Stop Signals](#14-stop-signals) — coaching alerts
16. ✅ [Review Templates](#12-review-templates) — call review forms
17. ✅ [Remaining KB Categories](#4-kb-categories) — fill out as needed
18. ✅ [KB Tab Visibility](#5-kb-tab-visibility) — hide what you don't use yet

---

## Fixed Values (Not Customizable)

These are hardcoded in the app and cannot be changed through the UI:

### Attempt Outcomes (5 fixed options)
1. No connect
2. Gatekeeper only
3. DM reached → No interest
4. DM reached → Some interest
5. Meeting set

### Why Reasons (shown only on "DM reached → No interest")
1. Targeting — Not a fit
2. Value — No pain
3. Trust — Skeptical
4. Money — Locked contract / budget
5. Timing — Bad timing

### Rep Mistakes (optional self-assessment)
1. Weak opener
2. Talked too much
3. Weak questions
4. Didn't ask for meeting

### Contact Roles
- DM (Decision Maker)
- Gatekeeper
- Other

### Constraint Options (lead-level chips)
- Locked contract
- Budget freeze
- Seasonal business
- Needs approval
- Timing dependent
- Switching friction high

### Next Actions (auto-computed from outcome)
- Call again
- Follow up
- Meeting scheduled
- Drop
