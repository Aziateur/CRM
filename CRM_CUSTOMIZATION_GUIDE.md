# Dalio CRM — Customization Guide

Everything you can configure, edit, and personalize in the CRM.

---

## 1. Settings → Pipeline

### Pipeline Stages
| What | How |
|------|-----|
| Create/edit/delete stages | Pipeline Editor |
| Set stage name, color, position | Inline editing |
| Mark stages as Won / Lost / Default | Toggle flags per stage |
| Reorder stages | Drag or arrow buttons |

**Stored in:** `pipeline_stages` table (Supabase)

### Custom Fields
| What | How |
|------|-----|
| Add custom fields to Leads, Contacts, or Opportunities | Field Editor |
| Field types: Text, Number, Select, Multi-select, Date, Boolean, URL, Email | Type picker |
| Configure select options (add/reorder/delete choices) | Options Manager |
| Set field as required or optional | Toggle |

**Stored in:** `field_definitions` table (Supabase)

### Tags
| What | How |
|------|-----|
| Create named tags with colors | Tag Manager |
| Edit tag name/color | Inline |
| Delete unused tags | Delete button |
| Assign tags to leads via bulk actions or Lead Drawer | Bulk Actions Bar / Lead Drawer |

**Stored in:** `tags` + `lead_tags` tables (Supabase)

---

## 2. Settings → Automation

### Message Templates
| What | How |
|------|-----|
| Create email/SMS/script templates | Template Manager |
| Use variables: `{{company}}`, `{{contact_name}}`, etc. | Template body |
| Set template type (Email, SMS, Script) | Type selector |

**Stored in:** `templates` table (Supabase)

### Workflow Rules
| What | How |
|------|-----|
| Create automation rules: Trigger → Action | Workflow Editor |
| **Triggers:** Stage change, Outcome logged, Tag added/removed, Field changed, Lead created | Trigger picker |
| **Actions:** Change stage, Add/remove tag, Create task, Update field, Send notification, Enroll in sequence | Action picker |
| Configure trigger conditions and action parameters | Config fields |
| Toggle workflows active/inactive | Switch |

**Stored in:** `workflows` table (Supabase)

---

## 3. Settings → Sequences

### Multi-Step Outreach Sequences
| What | How |
|------|-----|
| Create named sequences | Sequence Manager |
| Add steps: Call, Email, SMS, Task, Wait | Step editor |
| Set delay between steps (in days) | Delay input |
| Link steps to message templates | Template selector |
| Enroll/unenroll leads from Lead Drawer | Sequence Enrollment panel |

**Stored in:** `sequences` + `sequence_steps` + `sequence_enrollments` tables (Supabase)

---

## 4. Settings → Framework

The sales methodology engine. **Fully customizable, stored in `localStorage`.**

### Phases
| What | How |
|------|-----|
| Create/edit/delete named phases (e.g. "Ramp", "Cruise", "Push") | Phase editor |
| Set **Why** (bottleneck hypothesis), **Do** (behavior per call), **Win** (success definition) | Text inputs |
| Set **Exit Criteria** (when to move to next phase) | Text input |
| Choose **Primary Goal**: Calls, Actions, Wins, or Meetings Booked | Dropdown |
| Set **Target** number per period | Number input |
| Set **Period**: Today, This Week, or Rolling N Days | Period picker |
| Assign **Focus Lever** (which skill to practice) | Lever dropdown |
| Assign **Action Checkbox** and **Win Checkbox** (markers) | Marker dropdowns |
| Reorder phases | Arrow buttons |
| Set active phase | Phase selector |

### Markers
| What | How |
|------|-----|
| Create Y/N observations recorded per call | Marker editor |
| Set label and definition (shown as tooltip in call logger) | Inline inputs |
| Delete markers (blocked if used by a phase) | Delete button |

### Levers
| What | How |
|------|-----|
| Create behavior reminders shown during calls | Lever editor |
| Set label and coaching prompt | Inline inputs |
| Reorder levers | Arrow buttons |
| Delete levers (blocked if used by a phase) | Delete button |

### Advanced
| What | How |
|------|-----|
| Edit entire framework as raw JSON | JSON Editor (collapsible) |
| Export/Import framework config via clipboard | Copy/Paste buttons |

---

## 5. Settings → KB Config

### Category Types
Manage the dropdown options used throughout the Knowledge Base:

| Category Type | Controls |
|---------------|----------|
| **Segments** | ICP segments (e.g., SMB, Mid-Market, Enterprise) |
| **Intel Categories** | Industry intel grouping (e.g., Competitor, Market Trend) |
| **Script Section Types** | Section types for structured scripts (e.g., Opener, Discovery) |
| **Segment Dossier Sections** | Per-segment entry types (e.g., Language Bank, Mindset Notes) |
| **Friction Categories** | Types of friction/blockers |
| **Root Cause Types** | Why friction occurs |
| **Sales Stages** | Script stages (e.g., Cold Open, Follow-up) |

**Each category:** Add, rename, reorder, archive, or delete values. All dropdowns update automatically.

### Tab Visibility
| What | How |
|------|-----|
| Show/hide individual KB tabs | Toggle switches |
| Rename tab labels | Inline text edit |

**Stored in:** `categories` + `tab_config` tables (Supabase)

---

## 6. Settings → Templates (Review Templates)

### Batch Review Templates
| What | How |
|------|-----|
| Create custom review templates with named fields | Template editor |
| Field types: Rating, Text, Textarea, Select, Multi-select, Boolean, Number, Likert scale | Type picker |
| Group fields into sections | Section assignment |
| Configure select options with labels, colors, and scores | Options editor |
| Set fields as required | Toggle |
| Duplicate existing templates | Duplicate button |
| Lock built-in templates from editing | Auto-locked |

**Stored in:** `review_templates` table (Supabase)

---

## 7. Settings → Profile

| What | How |
|------|-----|
| Edit your display name | Input field |
| Upload/change avatar | Avatar uploader |

**Stored in:** `users` table (Supabase)

---

## 8. Playbook Page

### Rules
| What | How |
|------|-----|
| Create rules in IF/THEN/BECAUSE format | Add Rule form |
| Set confidence level: Hypothesis, Emerging, Proven | Confidence selector |
| Attach evidence (linked attempt IDs) | Evidence drawer |
| Toggle rules active/inactive | Switch |
| Promote proposed rules from Batch Review | Promote button |

### Stop Signals
| What | How |
|------|-----|
| Create warning patterns (e.g., "3 consecutive No connects") | Signal editor |
| Set trigger condition, threshold, window size | Config fields |
| Assign a recommended drill | Drill selector |
| Toggle signals active/inactive | Switch |

### Drills
| What | How |
|------|-----|
| Pre-built practice exercises triggered by stop signals | View-only |
| Types: Gatekeeper failure, No connect streak, DM rejection, Conversion slump, Custom | Trigger types |

**Stored in:** `rules` + `stop_signals` tables (Supabase). Drills are static in code.

---

## 9. Knowledge Base Tabs (Playbook Page)

### Scripts Tab
| What | How |
|------|-----|
| Create structured call scripts with sections | Script editor |
| Organize by section type (Opener, Discovery, Close, etc.) | Section manager |
| Link scripts to segments and stages | Dropdowns |

### ICP Tab
| What | How |
|------|-----|
| Define Ideal Customer Profile entries | ICP editor |
| Add per-segment dossiers with detailed notes | Segment dossier sections |

### Industry Intel Tab
| What | How |
|------|-----|
| Add industry intelligence entries | Intel editor |
| Categorize by intel category | Category dropdown |

### Friction Tab
| What | How |
|------|-----|
| Log friction points / blockers encountered in calls | Friction editor |
| Categorize by friction type and root cause | Category dropdowns |

### Metrics Tab
| What | How |
|------|-----|
| Define and track custom qualitative metrics | Metrics editor |
| Set targets and benchmarks | Number inputs |

**Stored in:** Various KB tables (Supabase) — `scripts`, `icp_entries`, `industry_intel`, `friction_log`, `kb_metrics`

---

## 10. Lead-Level Customization

On each lead (via the Lead Drawer):

| What | How |
|------|-----|
| **Confirmed Facts** (max 5) | Inline editable list |
| **Open Questions** (max 3) | Inline editable list, must start with "Do they / Can they / Will they" |
| **Next Call Objective** | Text input, must start with a verb |
| **Segment** | Dropdown (from KB categories) |
| **Decision Maker** | Yes / No / Unknown toggle |
| **Fleet Owner** | Yes / No / Unknown toggle |
| **Operational Context** | Free text |
| **Constraints** | Chip selector (Locked contract, Budget freeze, etc.) |
| **Opportunity Angle** | Free text |
| **Deal Value** | Number input |
| **Contacts** | Add multiple contacts with name, role (DM/Gatekeeper/Champion/User/Other), phone |
| **Tags** | Multi-select from tag list |
| **Custom Fields** | Dynamic fields from Field Editor |
| **Sequence Enrollment** | Enroll/unenroll from sequences |
| **Tasks** | Create manual tasks, mark as complete |
| **Notes** | Add inline notes to timeline |

**Stored in:** `leads`, `contacts`, `lead_tags`, `tasks`, `lead_activities` tables (Supabase)

---

## 11. Experiments (Batch Review)

| What | How |
|------|-----|
| Create A/B experiments to test approaches | Create Experiment modal |
| Define buckets (variants) to compare | Bucket editor |
| Assign calls to buckets during review | Bucket buttons on review table |
| Track metrics per bucket | Experiment dashboard |

**Stored in:** `experiments` + `experiment_assignments` tables (Supabase)

---

## 12. Admin

| What | How |
|------|-----|
| Create users directly (name, email, password, role) | Create User form |
| Set project role: Owner, Manager, Rep | Role dropdown |
| Change project roles for existing members | Role selector in members table |
| Remove members from project | Remove button |
| **Superadmin only:** View all system users | System Users tab |
| **Superadmin only:** Change system roles (User, Admin, Super Admin) | Role selector |
| **Superadmin only:** Activate/deactivate users | Toggle switch |
| **Superadmin only:** Permanently delete users | Delete button |

**Stored in:** `users` + `user_projects` tables (Supabase)

---

## 13. View Presets (Leads Page)

| What | How |
|------|-----|
| Save current filter + sort as a named preset | Save View button |
| Load saved presets | Preset dropdown |

**Stored in:** `view_presets` table (Supabase)

---

## Quick Reference: Where Things Live

| Storage | What goes there |
|---------|-----------------|
| **Supabase (DB)** | Pipeline stages, custom fields, tags, templates, workflows, sequences, rules, stop signals, KB data, experiments, review templates, categories, users, view presets |
| **localStorage** | Framework config (phases, levers, markers), signal tracking data |
| **Code (static)** | Drills, attempt outcome options (5 fixed), contact roles, field types |
