-- ============================================================
-- Phase 7: Metrics foundation tables
-- ============================================================

-- Metric definitions (configurable KPI definitions)
CREATE TABLE IF NOT EXISTS metric_definitions (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  project_id UUID NOT NULL REFERENCES projects(id) ON DELETE CASCADE,
  name TEXT NOT NULL,
  slug TEXT NOT NULL,
  description TEXT,
  unit TEXT DEFAULT '%',
  aggregation TEXT DEFAULT 'avg' CHECK (aggregation IN ('sum', 'avg', 'count', 'min', 'max', 'latest')),
  source TEXT DEFAULT 'manual' CHECK (source IN ('manual', 'computed', 'derived')),
  formula TEXT,
  color TEXT,
  icon TEXT DEFAULT '📊',
  is_active BOOLEAN NOT NULL DEFAULT true,
  sort_order INTEGER DEFAULT 0,
  metadata JSONB DEFAULT '{}',
  created_at TIMESTAMPTZ DEFAULT now(),
  updated_at TIMESTAMPTZ DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_metric_defs_project ON metric_definitions(project_id);
CREATE UNIQUE INDEX IF NOT EXISTS idx_metric_defs_slug ON metric_definitions(project_id, slug);

ALTER TABLE metric_definitions ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "metric_definitions_access" ON metric_definitions;
CREATE POLICY "metric_definitions_access" ON metric_definitions
  FOR ALL USING (is_member_of(project_id));

-- Dashboard widgets (configurable widget slots)
CREATE TABLE IF NOT EXISTS dashboard_widgets (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  project_id UUID NOT NULL REFERENCES projects(id) ON DELETE CASCADE,
  metric_id UUID REFERENCES metric_definitions(id) ON DELETE SET NULL,
  widget_type TEXT NOT NULL DEFAULT 'kpi' CHECK (widget_type IN ('kpi', 'chart_line', 'chart_bar', 'chart_pie', 'distribution', 'sparkline', 'table')),
  title TEXT NOT NULL,
  description TEXT,
  span INTEGER DEFAULT 1 CHECK (span BETWEEN 1 AND 4),
  sort_order INTEGER DEFAULT 0,
  config JSONB DEFAULT '{}',
  is_active BOOLEAN NOT NULL DEFAULT true,
  created_at TIMESTAMPTZ DEFAULT now(),
  updated_at TIMESTAMPTZ DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_dashboard_widgets_project ON dashboard_widgets(project_id);

ALTER TABLE dashboard_widgets ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "dashboard_widgets_access" ON dashboard_widgets;
CREATE POLICY "dashboard_widgets_access" ON dashboard_widgets
  FOR ALL USING (is_member_of(project_id));

-- Metric goals (target values per period)
CREATE TABLE IF NOT EXISTS metric_goals (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  project_id UUID NOT NULL REFERENCES projects(id) ON DELETE CASCADE,
  metric_id UUID NOT NULL REFERENCES metric_definitions(id) ON DELETE CASCADE,
  period TEXT NOT NULL DEFAULT 'monthly' CHECK (period IN ('daily', 'weekly', 'monthly', 'quarterly', 'yearly')),
  target_value NUMERIC NOT NULL,
  start_date DATE NOT NULL,
  end_date DATE,
  notes TEXT,
  created_at TIMESTAMPTZ DEFAULT now(),
  updated_at TIMESTAMPTZ DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_metric_goals_project ON metric_goals(project_id);
CREATE INDEX IF NOT EXISTS idx_metric_goals_metric ON metric_goals(metric_id);

ALTER TABLE metric_goals ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "metric_goals_access" ON metric_goals;
CREATE POLICY "metric_goals_access" ON metric_goals
  FOR ALL USING (is_member_of(project_id));
