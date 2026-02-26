// Client-side workflow engine: evaluates triggers and executes actions
import type { Workflow, WorkflowTriggerType, Lead } from "@/lib/store"

export interface WorkflowEvent {
  type: WorkflowTriggerType
  leadId: string
  payload: Record<string, unknown>
  timestamp: string
}

type EventHandler = (event: WorkflowEvent) => void

// Simple in-memory event bus
const handlers: EventHandler[] = []

export function onWorkflowEvent(handler: EventHandler) {
  handlers.push(handler)
  return () => {
    const idx = handlers.indexOf(handler)
    if (idx >= 0) handlers.splice(idx, 1)
  }
}

export function emitWorkflowEvent(event: WorkflowEvent) {
  for (const handler of handlers) {
    try {
      handler(event)
    } catch (e) {
      console.warn("[WorkflowEngine] Handler error:", e)
    }
  }
}

export function evaluateTrigger(event: WorkflowEvent, workflow: Workflow): boolean {
  if (event.type !== workflow.triggerType) return false
  if (!workflow.isActive) return false

  const config = workflow.triggerConfig
  const payload = event.payload

  switch (workflow.triggerType) {
    case "stage_change": {
      const fromMatch = !config.from_stage || config.from_stage === payload.from_stage
      const toMatch = !config.to_stage || config.to_stage === payload.to_stage
      return fromMatch && toMatch
    }
    case "new_lead":
      return true // always matches
    case "tag_added":
      return !config.tag_name || config.tag_name === payload.tag_name
    case "tag_removed":
      return !config.tag_name || config.tag_name === payload.tag_name
    case "field_changed": {
      if (config.field_key && config.field_key !== payload.field_key) return false
      if (config.condition === "equals" && config.value !== payload.new_value) return false
      if (config.condition === "greater_than" && Number(payload.new_value) <= Number(config.value)) return false
      return true
    }
    case "outcome_logged":
      return !config.outcome || config.outcome === payload.outcome
    case "lead_idle":
    case "task_overdue":
      return true // these are evaluated on a timer, not on events
    default:
      return false
  }
}

export function describeWorkflow(workflow: Workflow): string {
  const trigger = describeTrigger(workflow)
  const action = describeAction(workflow)
  return `When ${trigger}, then ${action}`
}

function describeTrigger(workflow: Workflow): string {
  const c = workflow.triggerConfig
  switch (workflow.triggerType) {
    case "stage_change":
      if (c.from_stage && c.to_stage) return `lead moves from "${c.from_stage}" to "${c.to_stage}"`
      if (c.to_stage) return `lead moves to "${c.to_stage}"`
      return "lead changes stage"
    case "new_lead":
      return "a new lead is created"
    case "tag_added":
      return c.tag_name ? `tag "${c.tag_name}" is added` : "any tag is added"
    case "tag_removed":
      return c.tag_name ? `tag "${c.tag_name}" is removed` : "any tag is removed"
    case "field_changed":
      return c.field_key ? `"${c.field_key}" changes` : "any field changes"
    case "outcome_logged":
      return c.outcome ? `outcome "${c.outcome}" is logged` : "any call outcome is logged"
    case "lead_idle":
      return `lead is idle for ${c.days || "?"} days`
    case "task_overdue":
      return "a task becomes overdue"
    default:
      return workflow.triggerType
  }
}

function describeAction(workflow: Workflow): string {
  const c = workflow.actionConfig
  switch (workflow.actionType) {
    case "change_stage":
      return `move to "${c.stage_name || "?"}"`
    case "add_tag":
      return `add tag "${c.tag_name || "?"}"`
    case "remove_tag":
      return `remove tag "${c.tag_name || "?"}"`
    case "create_task":
      return `create task "${c.title || "?"}"`
    case "update_field":
      return `set "${c.field_key || "?"}" to "${c.value || "?"}"`
    case "send_notification":
      return `show notification`
    case "enroll_sequence":
      return `enroll in sequence`
    default:
      return workflow.actionType
  }
}
