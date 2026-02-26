# Dalio CRM — Complete Parameter Report

> Copy-paste this to any AI assistant. It contains every configurable parameter, the exact database column names, valid values, defaults, and constraints. Use it to set up the CRM incrementally — one section at a time.

---

## SECTION 1: PIPELINE STAGES

**Table:** `pipeline_stages`
**UI Path:** Settings → Pipeline → Pipeline Editor

| DB Column | Type | Required | Default | Valid Values | Description |
|-----------|------|----------|---------|-------------|-------------|
| `id` | UUID | auto | auto-generated | — | Primary key |
| `project_id` | UUID | yes | from session | — | Scoping |
| `name` | text | yes | — | any string | Stage display name |
| `position` | integer | yes | next available | 0, 1, 2, 3... | Display order (ascending) |
| `default_probability` | integer | no | 0 | 0–100 | Close probability percentage |
| `color` | text | no | `#6b7280` | hex color string | Stage color |
| `is_won` | boolean | no | false | true/false | Marks this stage as "deal won" |
| `is_lost` | boolean | no | false | true/false | Marks this stage as "deal lost" |
| `created_at` | timestamptz | auto | now() | — | Row creation time |

**Default rows (seeded on first use):**
```
Position 0: name="New",            color="#6b7280", probability=0,   is_won=false, is_lost=false
Position 1: name="Contacted",      color="#3b82f6", probability=10,  is_won=false, is_lost=false
Position 2: name="Interested",     color="#8b5cf6", probability=30,  is_won=false, is_lost=false
Position 3: name="Meeting Booked", color="#f59e0b", probability=60,  is_won=false, is_lost=false
Position 4: name="Won",            color="#22c55e", probability=100, is_won=true,  is_lost=false
Position 5: name="Lost",           color="#ef4444", probability=0,   is_won=false, is_lost=true
```

**Color palette available in UI:**
`#6b7280` `#3b82f6` `#8b5cf6` `#f59e0b` `#22c55e` `#ef4444` `#ec4899` `#14b8a6` `#f97316` `#06b6d4`

**Constraints:**
- At least one stage should exist
- Only one stage should have `is_won=true`
- Only one stage should have `is_lost=true`
- `position` must be unique within a project

---

## SECTION 2: TAGS

**Table:** `tags`
**Join table:** `lead_tags` (lead_id, tag_id)
**UI Path:** Settings → Pipeline → Tag Manager

| DB Column | Type | Required | Default | Valid Values | Description |
|-----------|------|----------|---------|-------------|-------------|
| `id` | UUID | auto | auto-generated | — | Primary key |
| `project_id` | UUID | yes | from session | — | Scoping |
| `name` | text | yes | — | any string | Tag display name |
| `color` | text | no | `#6b7280` | hex color string | Tag color badge |
| `created_at` | timestamptz | auto | now() | — | Row creation time |

**No defaults — created by user.**

---

## SECTION 3: CUSTOM FIELDS

**Table:** `field_definitions`
**UI Path:** Settings → Pipeline → Field Editor

| DB Column | Type | Required | Default | Valid Values | Description |
|-----------|------|----------|---------|-------------|-------------|
| `id` | UUID | auto | auto-generated | — | Primary key |
| `project_id` | UUID | yes | from session | — | Scoping |
| `entity_type` | text | yes | `"lead"` | `"lead"`, `"contact"`, `"opportunity"` | Which entity this field belongs to |
| `field_key` | text | yes | slugified from label | lowercase_underscored | Stable identifier (used in JSONB storage) |
| `field_label` | text | yes | — | any string | Display label |
| `field_type` | text | yes | — | `"text"`, `"number"`, `"select"`, `"multi_select"`, `"date"`, `"boolean"`, `"url"`, `"email"` | Input type |
| `options` | jsonb | no | null | string array e.g. `["A","B","C"]` | Required for `select` and `multi_select` types |
| `is_required` | boolean | no | false | true/false | Whether field is mandatory |
| `position` | integer | no | next available | 0, 1, 2... | Display order |
| `created_at` | timestamptz | auto | now() | — | Row creation time |

**Field type details:**
| `field_type` | UI Control | `options` needed? | Stored as |
|-------------|-----------|-------------------|-----------|
| `text` | Single-line text input | No | string |
| `number` | Numeric input | No | number |
| `select` | Dropdown (pick one) | Yes — string array | string |
| `multi_select` | Multi-choice checkboxes | Yes — string array | string array |
| `date` | Date picker | No | ISO date string |
| `boolean` | Toggle switch / checkbox | No | true/false |
| `url` | Text input, opens in new tab | No | string |
| `email` | Text input, opens mailto | No | string |

**No defaults — created by user.**

---

## SECTION 4: KB CATEGORIES

**Table:** `categories`
**UI Path:** Settings → KB Config → Category Types

| DB Column | Type | Required | Default | Valid Values | Description |
|-----------|------|----------|---------|-------------|-------------|
| `id` | UUID | auto | auto-generated | — | Primary key |
| `project_id` | UUID | yes | from session | — | Scoping |
| `category_type` | text | yes | — | see category types below | Which category group this belongs to |
| `name` | text | yes | — | any string | Display name |
| `slug` | text | auto | auto-generated from name | lowercase-hyphenated | URL-safe identifier |
| `icon` | text | no | `"📄"` | any emoji | Category icon |
| `color` | text | no | null | hex color string or null | Category color |
| `description` | text | no | null | any string or null | Tooltip/help text |
| `sort_order` | integer | no | auto | 0, 1, 2... | Display order |
| `is_active` | boolean | no | true | true/false | false = archived |
| `metadata` | jsonb | no | `{}` | any JSON object | Extensible data |
| `created_at` | timestamptz | auto | now() | — | Row creation time |
| `updated_at` | timestamptz | auto | now() | — | Last update time |

### Category Type: `segment`
**Purpose:** ICP market segments for lead classification
**Used in:** Lead Drawer segment dropdown, ICP tab, script filtering
**Default seeds:**
```
sort_order=0: name="Unknown",        icon="❓", color="#6b7280"
sort_order=1: name="Trucking",       icon="🚛", color="#3b82f6"
sort_order=2: name="Home Services",  icon="🏠", color="#22c55e"
sort_order=3: name="Construction",   icon="🏗️", color="#f59e0b"
sort_order=4: name="Other",          icon="📋", color="#8b5cf6"
```

### Category Type: `root_cause_type`
**Purpose:** Why friction occurs (diagnosis)
**Used in:** Friction log entries
**Default seeds:**
```
sort_order=0: name="Script Issue",      icon="📝", color="#ef4444", description="The script didn't work for this situation"
sort_order=1: name="ICP Mismatch",      icon="🎯", color="#f97316", description="Lead didn't match ideal customer profile"
sort_order=2: name="Knowledge Gap",     icon="📚", color="#eab308", description="Didn't know enough about industry/competitor/product"
sort_order=3: name="Skill Gap",         icon="🎓", color="#14b8a6", description="Need to practice this technique"
sort_order=4: name="Market Condition",  icon="📈", color="#6366f1", description="External factor (timing, economy, etc.)"
sort_order=5: name="Bad Data",          icon="⚠️", color="#ec4899", description="Wrong number, wrong contact, outdated info"
sort_order=6: name="Process Issue",     icon="⚙️", color="#64748b", description="Workflow or process needs improvement"
```

### Category Type: `intel_category`
**Purpose:** Grouping for industry intelligence entries
**Used in:** Industry Intel tab
**Default seeds:**
```
sort_order=0: name="How Their Business Works",          icon="🏭", color="#3b82f6", description="Revenue model, operations, day-in-the-life"
sort_order=1: name="Competitor Landscape",              icon="🏢", color="#ef4444", description="Who they compare you to, alternatives they use"
sort_order=2: name="Market Trends & Conditions",        icon="📊", color="#8b5cf6", description="Industry shifts, economic factors, seasonal patterns"
sort_order=3: name="Objection Patterns",                icon="🛡️", color="#f59e0b", description="Common pushbacks and what's really behind them"
sort_order=4: name="Pricing & Deal Intelligence",       icon="💰", color="#22c55e", description="What they pay, budget cycles, deal structures"
sort_order=5: name="Regulations & Compliance",          icon="📜", color="#06b6d4", description="Rules, mandates, certifications affecting their industry"
sort_order=6: name="Technology & Tools They Use",       icon="💻", color="#14b8a6", description="Software, hardware, systems in their workflow"
sort_order=7: name="Buying Process & Decision Chain",   icon="🔗", color="#f97316", description="Who decides, who influences, how they buy"
```

### Category Type: `script_stage`
**Purpose:** Which conversation stage a script targets
**Used in:** Scripts tab — stage filter
**Default seeds:**
```
sort_order=0: name="Cold Open",    icon="🎤", color="#3b82f6"
sort_order=1: name="Discovery",    icon="🔍", color="#8b5cf6"
sort_order=2: name="Value Prop",   icon="💎", color="#22c55e"
sort_order=3: name="Close / CTA",  icon="🎯", color="#f59e0b"
```

### Category Type: `script_section_type`
**Purpose:** Structural sections within a script
**Used in:** Scripts tab — section editor
**Default seeds:**
```
sort_order=0: name="Opener",                    icon="🎤", color="#3b82f6", description="Opening line / cold intro"
sort_order=1: name="Connection Questions",      icon="🤝", color="#8b5cf6", description="Build rapport, find common ground"
sort_order=2: name="Discovery / Qualification", icon="🔍", color="#06b6d4", description="Uncover pain, qualify the opportunity"
sort_order=3: name="Value Proposition",         icon="💎", color="#22c55e", description="Pitch the value, tie to their pain"
sort_order=4: name="Objection Handling",        icon="🛡️", color="#f59e0b", description="Responses to common pushbacks"
sort_order=5: name="Close",                     icon="🎯", color="#ef4444", description="Ask for the meeting / next step"
sort_order=6: name="Voicemail Script",          icon="📞", color="#64748b", description="Message to leave on voicemail"
sort_order=7: name="Full Script",               icon="📄", color="#6b7280", description="Complete script (migrated from flat format)"
```

### Category Type: `segment_section_type`
**Purpose:** Per-segment knowledge dossier section types
**Used in:** ICP tab — segment dossier entries
**Default seeds:**
```
sort_order=0: name="Language Bank",    icon="💬", color="#3b82f6", description="Phrases, sentences, and terminology this segment uses"
sort_order=1: name="Mindset Notes",    icon="🧠", color="#8b5cf6", description="How they think, what motivates them, what they fear"
sort_order=2: name="Market Recap",     icon="📰", color="#22c55e", description="Current state of this market — trends, news, conditions"
```

### Category Type: `friction_type`
**Purpose:** Types of blockers encountered in calls
**Used in:** Friction tab
**Default seeds:**
```
sort_order=0: name="Got Stuck",          icon="🧱", color="#ef4444"
sort_order=1: name="Wrong Approach",     icon="🔄", color="#f97316"
sort_order=2: name="Knowledge Missing",  icon="❓", color="#eab308"
sort_order=3: name="Timing Issue",       icon="⏰", color="#6366f1"
```

---

## SECTION 5: KB TAB VISIBILITY

**Table:** `kb_tab_config`
**UI Path:** Settings → KB Config → Tab Visibility

| DB Column | Type | Required | Default | Valid Values | Description |
|-----------|------|----------|---------|-------------|-------------|
| `id` | UUID | auto | auto-generated | — | Primary key |
| `project_id` | UUID | yes | from session | — | Scoping |
| `slug` | text | yes | — | `"playbook"`, `"scripts"`, `"icp"`, `"intel"`, `"friction"`, `"metrics"` | Fixed tab identifier |
| `label` | text | yes | — | any string | Customizable display name |
| `sort_order` | integer | no | auto | 0, 1, 2... | Display order |
| `is_visible` | boolean | no | true | true/false | Whether tab is shown |

**Default seeds:**
```
slug="playbook",  label="Playbook",              sort_order=0, is_visible=true
slug="scripts",   label="Scripts",               sort_order=1, is_visible=true
slug="icp",       label="ICP & Segments",         sort_order=2, is_visible=true
slug="intel",     label="Industry Intel",         sort_order=3, is_visible=true
slug="friction",  label="Friction",              sort_order=4, is_visible=true
slug="metrics",   label="Metrics & Diagnostics", sort_order=5, is_visible=true
```

---

## SECTION 6: FRAMEWORK — LEVERS

**Table:** `framework_levers`
**Parent table:** `frameworks` (one per project)
**UI Path:** Settings → Framework → Levers

| DB Column | Type | Required | Default | Valid Values | Description |
|-----------|------|----------|---------|-------------|-------------|
| `id` | UUID | auto | auto-generated | — | Primary key |
| `framework_id` | UUID | yes | from parent | — | FK to `frameworks` |
| `project_id` | UUID | yes | from session | — | Scoping |
| `key` | text | yes | — | stable string like `"call.framing"` | Unique stable identifier |
| `label` | text | yes | — | any string | Display name |
| `prompt` | text | no | null | any string or null | One-line coaching reminder shown during calls |
| `sort_order` | integer | yes | auto | 0, 1, 2... | Display order |

**Default seeds:**
```
key="call.framing",   label="Framing & Positioning",  prompt="Lead with their world, not your pitch"
key="call.curiosity",  label="Curiosity Questions",     prompt="Ask one question you don't know the answer to"
key="call.qualify",    label="Qualify Who They Are",    prompt="Confirm ICP fit before pitching"
key="call.pain",       label="Pain Extraction",         prompt="Find the pain behind the stated need"
key="call.adapt",      label="Adapt Next Line",         prompt="React to what they said, not your script"
```

**Constraints:**
- At least 1 lever required
- `key` must be unique within a framework
- Levers cannot be deleted if referenced by a phase's `focus_lever_key`

---

## SECTION 7: FRAMEWORK — MARKERS

**Table:** `framework_markers`
**Parent table:** `frameworks`
**UI Path:** Settings → Framework → Markers

| DB Column | Type | Required | Default | Valid Values | Description |
|-----------|------|----------|---------|-------------|-------------|
| `id` | UUID | auto | auto-generated | — | Primary key |
| `framework_id` | UUID | yes | from parent | — | FK to `frameworks` |
| `project_id` | UUID | yes | from session | — | Scoping |
| `key` | text | yes | — | stable string like `"focus_practiced"` | Unique stable identifier |
| `label` | text | yes | — | any string | Checkbox label shown in call logger |
| `definition` | text | no | null | any string or null | Tooltip explaining what YES means |
| `sort_order` | integer | yes | auto | 0, 1, 2... | Display order |

**Default seeds:**
```
key="focus_practiced",   label="Did the move",    definition="Did I consciously practice the focus skill on this call?"
key="new_truth_gained",  label="Got new truth",   definition="Did I learn something new about the prospect's real situation?"
```

**Constraints:**
- `key` must be unique within a framework
- Markers cannot be deleted if referenced by any phase's `action_marker_key` or `win_marker_key`

---

## SECTION 8: FRAMEWORK — PHASES

**Table:** `framework_phases`
**Parent table:** `frameworks`
**UI Path:** Settings → Framework → Phases

| DB Column | Type | Required | Default | Valid Values | Description |
|-----------|------|----------|---------|-------------|-------------|
| `id` | UUID | auto | auto-generated | — | Primary key |
| `framework_id` | UUID | yes | from parent | — | FK to `frameworks` |
| `project_id` | UUID | yes | from session | — | Scoping |
| `key` | text | yes | — | stable string | Unique stable identifier |
| `label` | text | yes | — | any string | Phase display name |
| `why_text` | text | no | `""` | any string | Bottleneck hypothesis — why are you in this phase? |
| `do_text` | text | no | `""` | any string | Behavioral instruction — what to do each call |
| `win_text` | text | no | `""` | any string | Success definition — what does winning look like? |
| `focus_lever_key` | text | yes | — | must match an existing lever `key` | Which lever to practice during this phase |
| `action_marker_key` | text | no | null | must match an existing marker `key` or null | "Did I do it?" checkbox |
| `win_marker_key` | text | no | null | must match an existing marker `key` or null | "Did it work?" checkbox |
| `primary_goal` | text | yes | `"reps"` | `"reps"`, `"action"`, `"win"`, `"outcome_meetings"` | What metric to count |
| `target` | integer | yes | 40 | 0–999 | Target count per period |
| `period` | jsonb | yes | `{"type":"iso_week"}` | see period values below | Time window |
| `exit_criteria` | text | no | null | any string or null | When to move to next phase |
| `sort_order` | integer | yes | auto | 0, 1, 2... | Display order |

**`primary_goal` values explained:**
| Value | Meaning | Dashboard shows |
|-------|---------|-----------------|
| `"reps"` | Total calls made | Call counter |
| `"action"` | Calls where action marker = YES | Action rate % |
| `"win"` | Calls where win marker = YES | Win rate % |
| `"outcome_meetings"` | Meetings booked | Meeting counter |

**`period` JSONB values:**
| Format | Meaning |
|--------|---------|
| `{"type": "today"}` | Reset daily |
| `{"type": "iso_week"}` | Monday–Sunday week |
| `{"type": "rolling_days", "days": 7}` | Last N days (1–365) |

**Active phase:** Set via `frameworks.active_phase_key` (must match one phase's `key`).

**Default seeds:**
```
Phase 1: key="call_quality",  label="Call Quality",   primary_goal="reps",              target=40, period={"type":"iso_week"}
         why_text="My calls aren't converting — I need better execution"
         do_text="Practice the focus skill consciously on every call"
         win_text="High action rate with new truths gained on most connects"
         focus_lever_key="call.framing", action_marker_key="focus_practiced", win_marker_key="new_truth_gained"
         exit_criteria="Action rate > 80% for two weeks and truth rate climbing"

Phase 2: key="market_intel",  label="Market Intel",   primary_goal="win",               target=25, period={"type":"iso_week"}
         why_text="I don't understand enough about prospects' real situation"
         do_text="Ask one question I don't know the answer to on every call"
         win_text="Learn something new on every connected call"
         focus_lever_key="call.curiosity", action_marker_key="focus_practiced", win_marker_key="new_truth_gained"
         exit_criteria="Win rate consistently above 60% of connects"

Phase 3: key="booking",       label="Book Meetings",  primary_goal="outcome_meetings",  target=8,  period={"type":"iso_week"}
         why_text="I'm connecting but not converting to meetings"
         do_text="Ask for the meeting explicitly on every qualified call"
         win_text="Book meetings at a sustainable rate"
         focus_lever_key="call.framing", action_marker_key="focus_practiced"
         exit_criteria="Booking rate above 10% of DM connects for 2 weeks"
```

**Constraints:**
- At least 1 phase required
- `key` must be unique within a framework
- `focus_lever_key` must reference an existing lever
- `action_marker_key` and `win_marker_key` must reference existing markers (or be null)
- `target` must be 0–999
- `period.days` must be 1–365 if `period.type` is `"rolling_days"`

---

## SECTION 9: FRAMEWORK ROOT

**Table:** `frameworks`
**UI Path:** Settings → Framework (Active Phase selector)

| DB Column | Type | Required | Default | Valid Values | Description |
|-----------|------|----------|---------|-------------|-------------|
| `id` | UUID | auto | auto-generated | — | Primary key |
| `project_id` | UUID | yes, unique | from session | — | One framework per project |
| `active_phase_key` | text | yes | first phase key | must match a phase `key` | Currently active phase |
| `signals_started_at` | timestamptz | no | now() | ISO timestamp | When signal tracking started |
| `created_at` | timestamptz | auto | now() | — | Row creation time |
| `updated_at` | timestamptz | auto | now() | — | Last update time |

---

## SECTION 10: MESSAGE TEMPLATES

**Table:** `templates`
**UI Path:** Settings → Automation → Template Manager

| DB Column | Type | Required | Default | Valid Values | Description |
|-----------|------|----------|---------|-------------|-------------|
| `id` | UUID | auto | auto-generated | — | Primary key |
| `project_id` | UUID | yes | from session | — | Scoping |
| `name` | text | yes | — | any string | Template display name |
| `category` | text | yes | — | `"call"`, `"email"`, `"sms"`, `"note"` | Template type |
| `subject` | text | no | null | any string (email subject) | Email subject line only |
| `body` | text | yes | — | any text, supports `[variable]` syntax | Template content |
| `variables` | jsonb | auto | `[]` | string array, auto-extracted from body | e.g. `["company", "contact_name"]` |
| `is_default` | boolean | no | false | true/false | Whether it's a default template |
| `position` | integer | no | auto | 0, 1, 2... | Display order |
| `created_at` | timestamptz | auto | now() | — | Row creation time |

**Variable syntax:** Use `[variable_name]` in body/subject. Variables are auto-extracted. No specific list enforced — any `[word]` becomes a variable.

**No defaults — created by user.**

---

## SECTION 11: WORKFLOW RULES

**Table:** `workflows`
**UI Path:** Settings → Automation → Workflow Editor

| DB Column | Type | Required | Default | Valid Values | Description |
|-----------|------|----------|---------|-------------|-------------|
| `id` | UUID | auto | auto-generated | — | Primary key |
| `project_id` | UUID | yes | from session | — | Scoping |
| `name` | text | yes | — | any string | Workflow display name |
| `description` | text | no | null | any string | What this workflow does |
| `is_active` | boolean | no | true | true/false | Whether workflow is running |
| `trigger_type` | text | yes | — | see trigger types below | What event starts this workflow |
| `trigger_config` | jsonb | no | `{}` | depends on trigger_type | Trigger-specific parameters |
| `action_type` | text | yes | — | see action types below | What the workflow does |
| `action_config` | jsonb | no | `{}` | depends on action_type | Action-specific parameters |
| `execution_count` | integer | auto | 0 | >= 0 | How many times it has run |
| `last_executed_at` | timestamptz | auto | null | — | Last execution timestamp |
| `created_at` | timestamptz | auto | now() | — | Row creation time |

**`trigger_type` values:**
| Value | Meaning | `trigger_config` keys |
|-------|---------|----------------------|
| `"stage_change"` | Lead moves to a new stage | `{ "to_stage": "stage_name" }` |
| `"new_lead"` | A lead is created | `{}` |
| `"tag_added"` | A tag is attached to a lead | `{ "tag": "tag_name" }` |
| `"tag_removed"` | A tag is removed from a lead | `{ "tag": "tag_name" }` |
| `"field_changed"` | A field value changes | `{ "field": "field_key" }` |
| `"lead_idle"` | Lead hasn't been contacted in X days | `{ "days": "14" }` |
| `"task_overdue"` | A task passes its due date | `{}` |
| `"outcome_logged"` | An attempt with specific outcome is logged | `{ "outcome": "Meeting set" }` |

**`action_type` values:**
| Value | Meaning | `action_config` keys |
|-------|---------|---------------------|
| `"change_stage"` | Move lead to a stage | `{ "stage": "stage_name" }` |
| `"add_tag"` | Attach a tag | `{ "tag": "tag_name" }` |
| `"remove_tag"` | Remove a tag | `{ "tag": "tag_name" }` |
| `"create_task"` | Create a follow-up task | `{ "title": "task title", "due_days": "3" }` |
| `"update_field"` | Set a field value | `{ "field": "field_key", "value": "new_value" }` |
| `"send_notification"` | Show a notification | `{ "message": "notification text" }` |
| `"enroll_sequence"` | Enroll lead in a sequence | `{ "sequence_id": "uuid" }` |

**No defaults — created by user.**

---

## SECTION 12: SEQUENCES

### Sequence Definition

**Table:** `sequences`
**UI Path:** Settings → Sequences

| DB Column | Type | Required | Default | Valid Values | Description |
|-----------|------|----------|---------|-------------|-------------|
| `id` | UUID | auto | auto-generated | — | Primary key |
| `project_id` | UUID | yes | from session | — | Scoping |
| `name` | text | yes | — | any string | Sequence display name |
| `description` | text | no | null | any string | What this sequence does |
| `is_active` | boolean | no | true | true/false | Whether sequence accepts enrollments |
| `created_at` | timestamptz | auto | now() | — | Row creation time |

### Sequence Steps

**Table:** `sequence_steps`

| DB Column | Type | Required | Default | Valid Values | Description |
|-----------|------|----------|---------|-------------|-------------|
| `id` | UUID | auto | auto-generated | — | Primary key |
| `sequence_id` | UUID | yes | — | FK to `sequences` | Which sequence this step belongs to |
| `position` | integer | yes | next available | 0, 1, 2... | Step order |
| `step_type` | text | yes | — | `"call"`, `"email"`, `"sms"`, `"task"`, `"wait"` | Type of action |
| `delay_days` | integer | no | 0 | >= 0 | Days to wait before executing this step |
| `template_id` | UUID | no | null | FK to `templates` or null | Link to a message template |
| `config` | jsonb | no | `{}` | any JSON | Step-specific configuration |
| `created_at` | timestamptz | auto | now() | — | Row creation time |

### Sequence Enrollments

**Table:** `sequence_enrollments`

| DB Column | Type | Required | Default | Valid Values | Description |
|-----------|------|----------|---------|-------------|-------------|
| `id` | UUID | auto | auto-generated | — | Primary key |
| `lead_id` | UUID | yes | — | FK to `leads` | Which lead is enrolled |
| `sequence_id` | UUID | yes | — | FK to `sequences` | Which sequence |
| `current_step` | integer | no | 0 | >= 0 | Current position in sequence |
| `status` | text | no | `"active"` | `"active"`, `"paused"`, `"completed"`, `"exited"` | Enrollment status |
| `enrolled_at` | timestamptz | auto | now() | — | When the lead was enrolled |
| `last_step_completed_at` | timestamptz | no | null | — | When the last step was done |
| `next_step_due_at` | timestamptz | no | null | — | When the next step is due |
| `exit_reason` | text | no | null | `"completed"`, free text | Why the lead left the sequence |
| `created_at` | timestamptz | auto | now() | — | Row creation time |

**No defaults — created by user.**

---

## SECTION 13: REVIEW TEMPLATES

### Template

**Table:** `review_templates`
**UI Path:** Settings → Templates

| DB Column | Type | Required | Default | Valid Values | Description |
|-----------|------|----------|---------|-------------|-------------|
| `id` | UUID | auto | auto-generated | — | Primary key |
| `project_id` | UUID | yes | from session | — | Scoping |
| `name` | text | yes | — | any string | Template name |
| `description` | text | no | null | any string | What this template evaluates |
| `version` | integer | no | 1 | >= 1 | Version number (increments when locked template is edited) |
| `is_active` | boolean | no | true | true/false | false = soft-deleted |
| `is_locked` | boolean | no | false | true/false | true = has been used in reviews, edits create new version |
| `applies_to` | text | no | `"deep"` | `"quick"`, `"deep"`, `"both"` | When this template is used |
| `created_at` | timestamptz | auto | now() | — | Row creation time |
| `updated_at` | timestamptz | auto | now() | — | Last update time |

### Review Fields

**Table:** `review_fields`

| DB Column | Type | Required | Default | Valid Values | Description |
|-----------|------|----------|---------|-------------|-------------|
| `id` | UUID | auto | auto-generated | — | Primary key |
| `template_id` | UUID | yes | — | FK to `review_templates` | Which template |
| `project_id` | UUID | yes | from session | — | Scoping |
| `key` | text | yes | — | snake_case string | Stable identifier for this field |
| `label` | text | yes | — | any string | Display label |
| `field_type` | text | yes | — | `"score"`, `"text"`, `"multi_select"`, `"checkbox"`, `"evidence_quote"` | Input type |
| `section` | text | no | null | any string or null | Visual grouping label |
| `config` | jsonb | no | `{}` | see config structure below | Type-specific configuration |
| `sort_order` | integer | yes | auto | 0, 1, 2... | Display order |
| `is_required` | boolean | no | false | true/false | Whether field must be filled |

**`config` structure by field_type:**

| `field_type` | `config` keys | Description |
|-------------|--------------|-------------|
| `"score"` | `min` (int, default 1), `max` (int, default 5), `anchors` (object: `{"1":"Bad","5":"Great"}`) | Numeric rating scale |
| `"text"` | `placeholder` (string), `rows` (int, optional for multiline) | Free text input |
| `"multi_select"` | `options` (array of `{value, label, color?, score?}`) | Multi-choice picker |
| `"checkbox"` | `description` (string), `checkedScore` (int, points when checked, default 0) | Yes/No toggle |
| `"evidence_quote"` | `prompt` (string), `placeholder` (string) | Quote from the call |

**`options` item structure (for `multi_select`):**
```json
{ "value": "strong_opener", "label": "Strong Opener", "color": "#22c55e", "score": 2 }
```

**No defaults — created by user.**

---

## SECTION 14: PLAYBOOK RULES

**Table:** `rules`
**UI Path:** Playbook → Rules tab

| DB Column | Type | Required | Default | Valid Values | Description |
|-----------|------|----------|---------|-------------|-------------|
| `id` | UUID | auto | auto-generated | — | Primary key |
| `project_id` | UUID | yes | from session | — | Scoping |
| `if_when` | text | yes | — | any string | "IF calling trucking companies..." |
| `then_do` | text | yes | — | any string | "THEN lead with fuel savings..." |
| `because` | text | yes | — | any string | "BECAUSE small fleets care about costs..." |
| `confidence` | text | yes | — | `"Low"`, `"Likely"`, `"Proven"` | Evidence level |
| `evidence_attempt_ids` | jsonb | no | `[]` | UUID array | Attempt IDs that prove this rule |
| `is_active` | boolean | no | true | true/false | Whether to show in call prep |
| `created_at` | timestamptz | auto | now() | — | Row creation time |

**Confidence levels:**
| Level | Meaning | Suggested evidence |
|-------|---------|-------------------|
| `"Low"` | Hypothesis, < 3 data points | Just a hunch |
| `"Likely"` | 3–9 confirming calls | Pattern emerging |
| `"Proven"` | 10+ confirming calls | Reliable pattern |

**No defaults — created by user.**

---

## SECTION 15: STOP SIGNALS

**Table:** `stop_signals`
**UI Path:** Playbook → Stop Signals tab

| DB Column | Type | Required | Default | Valid Values | Description |
|-----------|------|----------|---------|-------------|-------------|
| `id` | UUID | auto | auto-generated | — | Primary key |
| `project_id` | UUID | yes | from session | — | Scoping |
| `name` | text | yes | — | any string | Signal display name |
| `description` | text | no | — | any string | What this signal detects |
| `trigger_condition` | text | yes | — | any string | e.g. "consecutive_no_connect" |
| `threshold` | integer | yes | — | >= 1 | How many occurrences before firing |
| `window_size` | integer | yes | — | >= 1 | Look at last N calls |
| `recommended_drill_id` | UUID | no | null | FK to drills or null | Which drill to recommend |
| `is_active` | boolean | no | true | true/false | Whether signal is monitoring |
| `created_at` | timestamptz | auto | now() | — | Row creation time |

**No defaults — created by user.**

---

## SECTION 16: EXPERIMENTS

### Experiment Definition

**Table:** `experiments`
**UI Path:** Batch Review → Experiments tab

| DB Column | Type | Required | Default | Valid Values | Description |
|-----------|------|----------|---------|-------------|-------------|
| `id` | UUID | auto | auto-generated | — | Primary key |
| `project_id` | UUID | yes | from session | — | Scoping |
| `name` | text | yes | — | any string | Experiment name |
| `hypothesis` | text | no | `""` | any string | What you're testing |
| `primary_metric` | text | no | `"dm_engagement"` | `"dm_engagement"`, `"meeting_set"`, `"follow_up_accepted"`, `"custom"` | Primary success metric |
| `success_definition` | text | no | `""` | any string | What counts as a win |
| `sample_size_target` | integer | no | 100 | >= 1 | Target number of calls to test |
| `status` | text | no | `"active"` | `"draft"`, `"active"`, `"paused"`, `"completed"` | Experiment state |
| `scope` | jsonb | no | `{}` | any JSON | Scoping conditions (segment, time, etc.) |
| `protocol` | text | no | `""` | any string | Instructions for the rep |
| `conclusion` | text | no | null | any string | Final conclusion text |
| `conclusion_type` | text | no | null | `"adopt"`, `"iterate"`, `"discard"`, null | Decision made |
| `source_review_id` | UUID | no | null | FK to batch_reviews or null | Which review spawned this experiment |
| `active` | boolean | no | true | true/false | Legacy active flag |
| `created_at` | timestamptz | auto | now() | — | Row creation time |
| `completed_at` | timestamptz | no | null | — | When experiment was concluded |

### Experiment Variants

**Table:** `experiment_variants`

| DB Column | Type | Required | Default | Valid Values | Description |
|-----------|------|----------|---------|-------------|-------------|
| `id` | UUID | auto | auto-generated | — | Primary key |
| `experiment_id` | UUID | yes | — | FK to `experiments` | Which experiment |
| `project_id` | UUID | yes | from session | — | Scoping |
| `name` | text | yes | — | any string | Variant name (e.g. "Control", "New Opener") |
| `description` | text | no | `""` | any string | What this variant does differently |
| `is_control` | boolean | no | false | true/false | Is this the baseline? |
| `protocol` | text | no | `""` | any string | Specific instructions for this variant |

**No defaults — created by user.**

---

## SECTION 17: USER PROFILE

**Table:** `users`
**UI Path:** Settings → Profile

| DB Column | Type | Required | Default | Valid Values | Description |
|-----------|------|----------|---------|-------------|-------------|
| `name` | text | yes | — | any string | Display name |
| `avatar_url` | text | no | null | valid URL or null | Avatar image URL |

**Editable fields only (email, password are set at creation).**

---

## SECTION 18: USER & TEAM MANAGEMENT

**Tables:** `users`, `user_projects`
**UI Path:** Admin → Team tab

### Creating a user (via `create_user_for_project` RPC)

| Parameter | Type | Required | Default | Valid Values | Description |
|-----------|------|----------|---------|-------------|-------------|
| `p_creator_id` | UUID | yes | — | current user's ID | Who is creating this user |
| `p_project_id` | UUID | yes | — | current project ID | Which project to add them to |
| `p_name` | text | yes | — | non-empty string | User's display name |
| `p_email` | text | yes | — | valid email, unique | Login email |
| `p_password` | text | yes | — | min 6 characters | Login password |
| `p_project_role` | text | no | `"rep"` | `"owner"`, `"manager"`, `"rep"` | Role in this project |
| `p_system_role` | text | no | `"user"` | `"superadmin"`, `"admin"`, `"user"` | System-wide role (only superadmins can set non-user) |

**Permission matrix:**
| Creator role | Can create |
|-------------|-----------|
| Project owner | owner, manager, rep |
| Project manager | rep only |
| System superadmin/admin | any role |
| Rep | ❌ cannot create users |

---

## SECTION 18B: MULTI-PROJECT SUPPORT

The CRM supports **multiple independent projects** under one account. Each project is a fully isolated CRM with its own leads, pipeline, tags, framework, etc. Users switch between projects via the **Project Switcher** dropdown at the top of the sidebar.

**Table:** `projects`

| DB Column | Type | Required | Default | Valid Values | Description |
|-----------|------|----------|---------|-------------|-------------|
| `id` | UUID | auto | auto-generated | — | Primary key |
| `name` | text | yes | — | any string | Project display name |
| `description` | text | no | null | any string | Project description |
| `owner_id` | UUID | yes | — | FK to `users` | User who created the project |
| `created_at` | timestamptz | auto | now() | — | Row creation time |

**Project Switcher permission model:**
| User role | Can see projects | Can create projects | Can delete projects |
|-----------|-----------------|--------------------|--------------------|
| `superadmin`/`admin` | All they're enrolled in | ✅ Yes | ✅ Any they're enrolled in |
| Project `owner` | Only enrolled | ✅ Yes | ✅ Only projects they own |
| Project `manager` | Only enrolled | ❌ No | ❌ No |
| Project `rep` | Only enrolled | ❌ No | ❌ No |

**Data isolation:** Every table with `project_id` returns only data for the currently selected project. Switching projects instantly changes all visible data.

---

## SECTION 19: LEAD DATA

**Table:** `leads`
**UI Path:** Lead Drawer (click any lead)

| DB Column | Type | Required | Default | Valid Values | Description |
|-----------|------|----------|---------|-------------|-------------|
| `id` | UUID | auto | auto-generated | — | Primary key |
| `project_id` | UUID | yes | from session | — | Scoping |
| `company` | text | yes | — | any string | Company/lead name |
| `phone` | text | no | — | phone number string | Primary phone |
| `segment` | text | no | `"Unknown"` | any string (from segment categories) | Market segment |
| `is_decision_maker` | text | no | — | `"yes"`, `"no"`, `"unknown"` | DM status |
| `is_fleet_owner` | text | no | — | `"yes"`, `"no"`, `"unknown"` | Fleet owner status |
| `operational_context` | text | no | — | any string | Short paragraph about their operations |
| `constraints` | jsonb | no | — | array of constraint strings | Active constraints |
| `constraint_other` | text | no | — | any string | Custom constraint text |
| `opportunity_angle` | text | no | — | max 100 chars | Single-line opportunity description |
| `confirmed_facts` | jsonb | no | — | string array, max 5 items, 120 chars each | Confirmed facts about the lead |
| `open_questions` | jsonb | no | — | string array, max 3 items | Open questions (must start with Do they/Can they/Will they) |
| `next_call_objective` | text | no | — | must start with a verb | What to accomplish on next call |
| `website` | text | no | — | URL | Company website |
| `email` | text | no | — | email address | Company email |
| `address` | text | no | — | any string | Physical address |
| `lead_source` | text | no | — | any string | Where this lead came from |
| `stage` | text | no | — | pipeline stage name | Current pipeline stage |
| `stage_changed_at` | timestamptz | no | — | — | When stage last changed |
| `deal_value` | numeric | no | — | >= 0 | Deal value in currency |
| `close_probability` | integer | no | — | 0–100 | Close probability % |
| `custom_fields` | jsonb | no | `{}` | key-value object | Custom field values (keys match `field_definitions.field_key`) |
| `created_at` | timestamptz | auto | now() | — | Row creation time |

**Fixed constraint options (hardcoded):**
```
"Locked contract"
"Budget freeze"
"Seasonal business"
"Needs approval"
"Timing dependent"
"Switching friction high"
```

---

## SECTION 20: CONTACTS

**Table:** `contacts`
**UI Path:** Lead Drawer → Contacts section

| DB Column | Type | Required | Default | Valid Values | Description |
|-----------|------|----------|---------|-------------|-------------|
| `id` | UUID | auto | auto-generated | — | Primary key |
| `lead_id` | UUID | yes | — | FK to `leads` | Which lead |
| `name` | text | yes | — | any string | Contact name |
| `role` | text | no | — | `"DM"`, `"Gatekeeper"`, `"Other"` | Contact role (hardcoded) |
| `phone` | text | no | — | phone number string | Contact phone |
| `email` | text | no | — | email address | Contact email |

---

## SECTION 21: FIXED VALUES (NOT CONFIGURABLE)

These are hardcoded in `lib/store.ts` and cannot be changed through any UI or database:

### Attempt Outcomes (5 fixed options, order matters)
```
1. "No connect"
2. "Gatekeeper only"
3. "DM reached → No interest"
4. "DM reached → Some interest"
5. "Meeting set"
```

### Why Reasons (shown only when outcome = "DM reached → No interest")
```
1. "Targeting"    → Not a fit for our product
2. "Value"        → No pain / low priority
3. "Trust"        → Skeptical / doesn't believe us
4. "Money"        → Locked contract / budget issue
5. "Timing"       → Later / bad timing
```

### Rep Mistakes (optional self-assessment per attempt)
```
1. "Weak opener"
2. "Talked too much"
3. "Weak questions"
4. "Didn't ask for meeting"
```

### Next Actions (auto-computed from outcome + why)
```
1. "Call again"            (No connect or Gatekeeper → Call again)
2. "Follow up"             (Some interest → Follow up; No interest + Timing/Money → Follow up)
3. "Meeting scheduled"     (Meeting set → Meeting scheduled)
4. "Drop"                  (No interest + Targeting/Value/Trust → Drop)
```

### Contact Roles (hardcoded)
```
1. "DM"          (Decision Maker)
2. "Gatekeeper"
3. "Other"
```

### What Mattered Most (batch review only)
```
1. "Segment"
2. "Time of day"
3. "Opener"
4. "Question"
5. "Proof point"
6. "Tone/pace"
7. "CTA/close"
```

### Task Types (hardcoded)
```
1. "call_back"
2. "follow_up"
3. "meeting"
4. "email"
5. "custom"
```

### Task Priorities (hardcoded)
```
1. "low"
2. "normal"
3. "high"
```

### Drill Trigger Types (hardcoded)
```
1. "trust"
2. "value"
3. "access"
4. "execution"
5. "closing"
```

### Rule Confidence Levels (hardcoded)
```
1. "Low"
2. "Likely"
3. "Proven"
```

### Experiment Metrics (hardcoded)
```
1. "dm_engagement"
2. "meeting_set"
3. "follow_up_accepted"
4. "custom"
```

### Experiment Statuses (hardcoded)
```
1. "draft"
2. "active"
3. "paused"
4. "completed"
```

### Experiment Conclusion Types (hardcoded)
```
1. "adopt"
2. "iterate"
3. "discard"
```

### Sequence Step Types (hardcoded)
```
1. "call"
2. "email"
3. "sms"
4. "task"
5. "wait"
```

### Sequence Enrollment Statuses (hardcoded)
```
1. "active"
2. "paused"
3. "completed"
4. "exited"
```

### Template Categories (hardcoded)
```
1. "call"
2. "email"
3. "sms"
4. "note"
```

### Workflow Trigger Types (hardcoded)
```
1. "stage_change"
2. "new_lead"
3. "tag_added"
4. "tag_removed"
5. "field_changed"
6. "lead_idle"
7. "task_overdue"
8. "outcome_logged"
```

### Workflow Action Types (hardcoded)
```
1. "change_stage"
2. "add_tag"
3. "remove_tag"
4. "create_task"
5. "update_field"
6. "send_notification"
7. "enroll_sequence"
```

### Field Types (hardcoded)
```
1. "text"
2. "number"
3. "select"
4. "multi_select"
5. "date"
6. "boolean"
7. "url"
8. "email"
```

### Review Field Types (hardcoded)
```
1. "score"
2. "text"
3. "multi_select"
4. "checkbox"
5. "evidence_quote"
```

### Primary Goal Types (hardcoded)
```
1. "reps"
2. "action"
3. "win"
4. "outcome_meetings"
```

### Period Types (hardcoded)
```
1. "today"
2. "iso_week"
3. "rolling_days" (requires additional "days" param: 1-365)
```

### Entity Types for Custom Fields (hardcoded)
```
1. "lead"
2. "contact"
3. "opportunity"
```

### System Roles (hardcoded)
```
1. "superadmin"
2. "admin"
3. "user"
4. "service"    (for test/dev accounts)
```

### Project Roles (hardcoded)
```
1. "owner"
2. "manager"
3. "rep"
```

### Review Template Applies To (hardcoded)
```
1. "quick"
2. "deep"
3. "both"
```

---

## DATABASE TABLE SUMMARY

| Table | Has `project_id`? | Purpose |
|-------|-------------------|---------|
| `pipeline_stages` | ✅ | Sales pipeline columns |
| `tags` | ✅ | Lead labels |
| `lead_tags` | ❌ (uses lead_id + tag_id) | Many-to-many junction |
| `field_definitions` | ✅ | Custom field schemas |
| `categories` | ✅ | KB dropdown values (7 types) |
| `kb_tab_config` | ✅ | KB tab visibility/labels |
| `frameworks` | ✅ (unique) | Root framework config |
| `framework_levers` | ✅ | Behavior reminders |
| `framework_markers` | ✅ | Y/N call observations |
| `framework_phases` | ✅ | Training mode definitions |
| `templates` | ✅ | Message templates |
| `workflows` | ✅ | Automation rules |
| `sequences` | ✅ | Multi-step outreach definitions |
| `sequence_steps` | ❌ (uses sequence_id) | Steps within sequences |
| `sequence_enrollments` | ❌ (uses lead_id + sequence_id) | Lead enrollment tracking |
| `review_templates` | ✅ | Call review form definitions |
| `review_fields` | ✅ | Fields within review templates |
| `rules` | ✅ | IF/THEN/BECAUSE playbook rules |
| `stop_signals` | ✅ | Warning pattern monitors |
| `experiments` | ✅ | A/B experiment definitions |
| `experiment_variants` | ✅ | Variants within experiments |
| `leads` | ✅ | Lead/company records |
| `contacts` | ❌ (uses lead_id) | People at lead companies |
| `attempts` | ✅ | Call attempt logs |
| `tasks` | ❌ (uses lead_id) | Follow-up tasks |
| `users` | ❌ (system-wide) | User accounts |
| `user_projects` | ❌ (uses user_id + project_id) | User-project membership & roles |
| `sessions` | ❌ (uses user_id) | Auth sessions |

---

## CONFIGURATION ORDER (RECOMMENDED)

```
PHASE 1 — FOUNDATION (do these first)
  ├─ Section 1: Pipeline Stages       ← Define your sales funnel
  ├─ Section 2: Tags                  ← Basic labeling
  └─ Section 4: KB Categories (segment type only) ← Who you sell to

PHASE 2 — COACHING FRAMEWORK
  ├─ Section 6: Framework Levers      ← Skills to practice
  ├─ Section 7: Framework Markers     ← What to track per call
  └─ Section 8: Framework Phases      ← Training modes (references levers + markers)

PHASE 3 — KNOWLEDGE BASE
  ├─ Section 4: KB Categories (remaining 6 types) ← Fill out as needed
  ├─ Section 5: KB Tab Visibility     ← Show/hide tabs
  └─ Section 14: Playbook Rules       ← Institutional knowledge

PHASE 4 — AUTOMATION
  ├─ Section 10: Message Templates    ← Pre-written messages
  ├─ Section 12: Sequences            ← Multi-step campaigns (references templates)
  └─ Section 11: Workflow Rules       ← Auto-actions (references stages, tags, sequences)

PHASE 5 — REFINEMENT
  ├─ Section 3: Custom Fields         ← Extra data you realize you need
  ├─ Section 13: Review Templates     ← Call review forms
  ├─ Section 15: Stop Signals         ← Coaching alerts
  ├─ Section 16: Experiments          ← A/B testing
  └─ Section 18: User Management      ← Team accounts
```
