-- ============================================================================
-- Team Performance Module - Database Migration
-- ============================================================================

-- 1. PERFORMANCE CYCLES
CREATE TABLE IF NOT EXISTS performance_cycles (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  organization_id UUID NOT NULL REFERENCES organizations(id) ON DELETE CASCADE,
  start_date DATE NOT NULL,
  end_date DATE NOT NULL,
  is_current BOOLEAN DEFAULT FALSE,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

CREATE UNIQUE INDEX IF NOT EXISTS idx_unique_current_cycle 
  ON performance_cycles(organization_id) WHERE is_current = TRUE;

CREATE INDEX IF NOT EXISTS idx_performance_cycles_org 
  ON performance_cycles(organization_id);

-- 2. POINT EVENTS
CREATE TABLE IF NOT EXISTS performance_point_events (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  team_member_id UUID NOT NULL REFERENCES organization_team_members(id) ON DELETE CASCADE,
  organization_id UUID NOT NULL REFERENCES organizations(id) ON DELETE CASCADE,
  cycle_id UUID NOT NULL REFERENCES performance_cycles(id) ON DELETE CASCADE,
  event_type TEXT NOT NULL CHECK (event_type IN (
    'no_call_no_show', 'dropped_shift_no_coverage', 'unexcused_absence',
    'tardiness_major', 'tardiness_minor', 'early_departure',
    'late_notification', 'food_safety_violation', 'insubordination'
  )),
  points INTEGER NOT NULL CHECK (points > 0),
  event_date DATE NOT NULL,
  notes TEXT,
  related_shift_id UUID,
  created_by UUID REFERENCES auth.users(id),
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_point_events_member ON performance_point_events(team_member_id);
CREATE INDEX IF NOT EXISTS idx_point_events_org ON performance_point_events(organization_id);
CREATE INDEX IF NOT EXISTS idx_point_events_cycle ON performance_point_events(cycle_id);

-- 3. POINT REDUCTIONS
CREATE TABLE IF NOT EXISTS performance_point_reductions (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  team_member_id UUID NOT NULL REFERENCES organization_team_members(id) ON DELETE CASCADE,
  organization_id UUID NOT NULL REFERENCES organizations(id) ON DELETE CASCADE,
  cycle_id UUID NOT NULL REFERENCES performance_cycles(id) ON DELETE CASCADE,
  reduction_type TEXT NOT NULL CHECK (reduction_type IN (
    'cover_shift_urgent', 'cover_shift_standard', 'stay_late',
    'arrive_early', 'training_mentoring', 'special_event'
  )),
  points INTEGER NOT NULL CHECK (points < 0),
  event_date DATE NOT NULL,
  notes TEXT,
  created_by UUID REFERENCES auth.users(id),
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_point_reductions_member ON performance_point_reductions(team_member_id);
CREATE INDEX IF NOT EXISTS idx_point_reductions_org ON performance_point_reductions(organization_id);
CREATE INDEX IF NOT EXISTS idx_point_reductions_cycle ON performance_point_reductions(cycle_id);

-- 4. COACHING RECORDS
CREATE TABLE IF NOT EXISTS performance_coaching_records (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  team_member_id UUID NOT NULL REFERENCES organization_team_members(id) ON DELETE CASCADE,
  organization_id UUID NOT NULL REFERENCES organizations(id) ON DELETE CASCADE,
  stage INTEGER NOT NULL CHECK (stage BETWEEN 1 AND 5),
  triggered_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT NOW(),
  triggered_points INTEGER NOT NULL,
  status TEXT NOT NULL DEFAULT 'pending' CHECK (status IN ('pending', 'in_progress', 'completed')),
  conversation_scheduled BOOLEAN DEFAULT FALSE,
  conversation_date DATE,
  barriers_discussed BOOLEAN DEFAULT FALSE,
  resources_identified BOOLEAN DEFAULT FALSE,
  strategy_developed BOOLEAN DEFAULT FALSE,
  notes TEXT,
  letter_generated BOOLEAN DEFAULT FALSE,
  letter_url TEXT,
  completed_at TIMESTAMP WITH TIME ZONE,
  completed_by UUID REFERENCES auth.users(id),
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_coaching_records_member ON performance_coaching_records(team_member_id);
CREATE INDEX IF NOT EXISTS idx_coaching_records_org ON performance_coaching_records(organization_id);

-- 5. PERFORMANCE IMPROVEMENT PLANS
CREATE TABLE IF NOT EXISTS performance_improvement_plans (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  team_member_id UUID NOT NULL REFERENCES organization_team_members(id) ON DELETE CASCADE,
  organization_id UUID NOT NULL REFERENCES organizations(id) ON DELETE CASCADE,
  status TEXT NOT NULL DEFAULT 'active' CHECK (status IN ('active', 'completed', 'failed', 'cancelled')),
  start_date DATE NOT NULL,
  end_date DATE NOT NULL,
  goals JSONB NOT NULL DEFAULT '[]'::jsonb,
  milestones JSONB NOT NULL DEFAULT '[]'::jsonb,
  notes TEXT,
  created_by UUID REFERENCES auth.users(id),
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  completed_at TIMESTAMP WITH TIME ZONE,
  outcome TEXT CHECK (outcome IN ('success', 'failure', 'extended'))
);

CREATE INDEX IF NOT EXISTS idx_pips_member ON performance_improvement_plans(team_member_id);
CREATE INDEX IF NOT EXISTS idx_pips_org ON performance_improvement_plans(organization_id);

-- 6. ADD PERFORMANCE CONFIG COLUMN
ALTER TABLE organizations ADD COLUMN IF NOT EXISTS performance_config JSONB DEFAULT NULL;

-- 7. ENABLE RLS
ALTER TABLE performance_cycles ENABLE ROW LEVEL SECURITY;
ALTER TABLE performance_point_events ENABLE ROW LEVEL SECURITY;
ALTER TABLE performance_point_reductions ENABLE ROW LEVEL SECURITY;
ALTER TABLE performance_coaching_records ENABLE ROW LEVEL SECURITY;
ALTER TABLE performance_improvement_plans ENABLE ROW LEVEL SECURITY;

-- 8. RLS POLICIES (using organization_roles which links auth users to orgs)
CREATE POLICY "View performance_cycles" ON performance_cycles FOR SELECT
  USING (organization_id IN (SELECT organization_id FROM organization_roles WHERE user_id = auth.uid()));

CREATE POLICY "Manage performance_cycles" ON performance_cycles FOR ALL
  USING (organization_id IN (SELECT organization_id FROM organization_roles WHERE user_id = auth.uid() AND role IN ('owner', 'admin')));

CREATE POLICY "View performance_point_events" ON performance_point_events FOR SELECT
  USING (organization_id IN (SELECT organization_id FROM organization_roles WHERE user_id = auth.uid()));

CREATE POLICY "Manage performance_point_events" ON performance_point_events FOR ALL
  USING (organization_id IN (SELECT organization_id FROM organization_roles WHERE user_id = auth.uid() AND role IN ('owner', 'admin')));

CREATE POLICY "View performance_point_reductions" ON performance_point_reductions FOR SELECT
  USING (organization_id IN (SELECT organization_id FROM organization_roles WHERE user_id = auth.uid()));

CREATE POLICY "Manage performance_point_reductions" ON performance_point_reductions FOR ALL
  USING (organization_id IN (SELECT organization_id FROM organization_roles WHERE user_id = auth.uid() AND role IN ('owner', 'admin')));

CREATE POLICY "View performance_coaching_records" ON performance_coaching_records FOR SELECT
  USING (organization_id IN (SELECT organization_id FROM organization_roles WHERE user_id = auth.uid()));

CREATE POLICY "Manage performance_coaching_records" ON performance_coaching_records FOR ALL
  USING (organization_id IN (SELECT organization_id FROM organization_roles WHERE user_id = auth.uid() AND role IN ('owner', 'admin')));

CREATE POLICY "View performance_improvement_plans" ON performance_improvement_plans FOR SELECT
  USING (organization_id IN (SELECT organization_id FROM organization_roles WHERE user_id = auth.uid()));

CREATE POLICY "Manage performance_improvement_plans" ON performance_improvement_plans FOR ALL
  USING (organization_id IN (SELECT organization_id FROM organization_roles WHERE user_id = auth.uid() AND role IN ('owner', 'admin')));

-- 9. INITIALIZE MEMPHIS FIRE
DO $$
DECLARE
  v_org_id UUID;
  v_cycle_start DATE;
  v_cycle_end DATE;
BEGIN
  SELECT id INTO v_org_id FROM organizations WHERE name ILIKE '%memphis fire%' LIMIT 1;
  
  IF v_org_id IS NOT NULL THEN
    -- Current quadmester: Jan-Apr, May-Aug, Sep-Dec
    v_cycle_start := DATE_TRUNC('year', CURRENT_DATE) + 
      CASE 
        WHEN EXTRACT(MONTH FROM CURRENT_DATE) <= 4 THEN INTERVAL '0 months'
        WHEN EXTRACT(MONTH FROM CURRENT_DATE) <= 8 THEN INTERVAL '4 months'
        ELSE INTERVAL '8 months'
      END;
    v_cycle_end := v_cycle_start + INTERVAL '4 months' - INTERVAL '1 day';
    
    -- Insert cycle
    INSERT INTO performance_cycles (organization_id, start_date, end_date, is_current)
    SELECT v_org_id, v_cycle_start, v_cycle_end, TRUE
    WHERE NOT EXISTS (SELECT 1 FROM performance_cycles WHERE organization_id = v_org_id AND is_current = TRUE);
    
    -- Set config
    UPDATE organizations SET performance_config = jsonb_build_object(
      'point_values', jsonb_build_object(
        'no_call_no_show', 6, 'dropped_shift_no_coverage', 4, 'unexcused_absence', 2,
        'tardiness_major', 2, 'tardiness_minor', 1, 'early_departure', 2,
        'late_notification', 1, 'food_safety_violation', 3, 'insubordination', 3
      ),
      'reduction_values', jsonb_build_object(
        'cover_shift_urgent', -2, 'cover_shift_standard', -1, 'stay_late', -1,
        'arrive_early', -1, 'training_mentoring', -1, 'special_event', -1
      ),
      'tier_thresholds', jsonb_build_object('tier1_max', 2, 'tier2_max', 5),
      'coaching_thresholds', jsonb_build_object('stage1', 6, 'stage2', 8, 'stage3', 10, 'stage4', 12, 'stage5', 15),
      'cycle_length_months', 4,
      'max_reduction_per_30_days', 3
    ) WHERE id = v_org_id AND performance_config IS NULL;
    
    -- Enable module
    UPDATE organizations SET modules = COALESCE(modules, '{}'::jsonb) || jsonb_build_object(
      'team_performance', jsonb_build_object(
        'enabled', true, 'enabled_at', NOW(), 'compliance_acknowledged', true,
        'permissions', jsonb_build_object('view', 5, 'enable', 1, 'configure', 2, 'use', 4),
        'config', NULL
      )
    ) WHERE id = v_org_id;
  END IF;
END $$;
