-- ============================================================================
-- COMMUNICATIONS MODULE
-- Email templates, merge fields, scheduling, and delivery tracking
-- ============================================================================

-- ----------------------------------------------------------------------------
-- EMAIL TEMPLATES
-- Stores HTML templates with merge field placeholders
-- ----------------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS email_templates (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  organization_id UUID NOT NULL REFERENCES organizations(id) ON DELETE CASCADE,
  
  -- Identity
  name TEXT NOT NULL,
  description TEXT,
  category TEXT DEFAULT 'general', -- 'performance', 'hr', 'operations', 'general'
  
  -- Content
  subject_template TEXT NOT NULL,
  html_template TEXT NOT NULL,
  
  -- Audience
  recipient_type TEXT NOT NULL DEFAULT 'individual', -- 'individual', 'managers', 'all_team', 'custom'
  
  -- Scheduling
  send_mode TEXT NOT NULL DEFAULT 'manual', -- 'manual', 'scheduled', 'triggered'
  schedule_cron TEXT, -- Cron expression: '0 18 * * 0' = Sunday 6pm
  trigger_event TEXT, -- 'coaching_stage_reached', 'birthday', 'pip_created', etc.
  trigger_conditions JSONB DEFAULT '{}', -- { "min_stage": 2, "tier": 3 }
  
  -- State
  is_active BOOLEAN DEFAULT false,
  is_system BOOLEAN DEFAULT false, -- System templates can't be deleted
  
  -- Audit
  created_at TIMESTAMPTZ DEFAULT now(),
  updated_at TIMESTAMPTZ DEFAULT now(),
  created_by UUID REFERENCES auth.users(id),
  
  -- Constraints
  UNIQUE(organization_id, name)
);

-- Index for quick lookups
CREATE INDEX idx_email_templates_org ON email_templates(organization_id);
CREATE INDEX idx_email_templates_category ON email_templates(organization_id, category);
CREATE INDEX idx_email_templates_trigger ON email_templates(organization_id, trigger_event) WHERE trigger_event IS NOT NULL;

-- ----------------------------------------------------------------------------
-- EMAIL TEMPLATE FIELDS
-- Maps merge placeholders to data paths
-- ----------------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS email_template_fields (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  template_id UUID NOT NULL REFERENCES email_templates(id) ON DELETE CASCADE,
  
  -- Field mapping
  field_tag TEXT NOT NULL, -- '«First_Name»' or '{{first_name}}'
  data_source TEXT NOT NULL, -- 'recipient', 'performance', 'time_off', 'period', etc.
  data_path TEXT NOT NULL, -- 'first_name', 'current_points', 'sick_days_remaining'
  
  -- Transformation
  transform TEXT, -- 'uppercase', 'lowercase', 'date_short', 'date_long', 'percentage', 'currency'
  format_options JSONB DEFAULT '{}', -- { "decimals": 2, "prefix": "$" }
  default_value TEXT, -- Fallback if data is null
  
  -- Constraints
  UNIQUE(template_id, field_tag)
);

CREATE INDEX idx_email_template_fields_template ON email_template_fields(template_id);

-- ----------------------------------------------------------------------------
-- EMAIL SEND LOG
-- Audit trail of all sent emails
-- ----------------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS email_send_log (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  organization_id UUID NOT NULL REFERENCES organizations(id) ON DELETE CASCADE,
  template_id UUID REFERENCES email_templates(id) ON DELETE SET NULL,
  
  -- Recipient
  recipient_email TEXT NOT NULL,
  recipient_name TEXT,
  recipient_id UUID, -- team_member_id if applicable
  
  -- Content (snapshot at send time)
  template_name TEXT NOT NULL,
  subject TEXT NOT NULL,
  
  -- Delivery
  status TEXT NOT NULL DEFAULT 'queued', -- 'queued', 'sent', 'delivered', 'failed', 'bounced'
  provider_message_id TEXT, -- Resend's message ID
  
  -- Timing
  queued_at TIMESTAMPTZ DEFAULT now(),
  sent_at TIMESTAMPTZ,
  delivered_at TIMESTAMPTZ,
  
  -- Error handling
  error_message TEXT,
  retry_count INT DEFAULT 0,
  
  -- Context (for debugging/auditing)
  merge_context JSONB, -- Snapshot of data used for merge
  triggered_by TEXT, -- 'manual', 'schedule', 'trigger:coaching_stage_reached'
  triggered_by_user UUID REFERENCES auth.users(id),
  
  created_at TIMESTAMPTZ DEFAULT now()
);

-- Indexes for common queries
CREATE INDEX idx_email_send_log_org ON email_send_log(organization_id);
CREATE INDEX idx_email_send_log_recipient ON email_send_log(organization_id, recipient_email);
CREATE INDEX idx_email_send_log_template ON email_send_log(template_id);
CREATE INDEX idx_email_send_log_status ON email_send_log(organization_id, status);
CREATE INDEX idx_email_send_log_date ON email_send_log(organization_id, created_at DESC);

-- ----------------------------------------------------------------------------
-- EMAIL QUEUE
-- Pending emails waiting to be sent (for scheduled/batch sends)
-- ----------------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS email_queue (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  organization_id UUID NOT NULL REFERENCES organizations(id) ON DELETE CASCADE,
  template_id UUID NOT NULL REFERENCES email_templates(id) ON DELETE CASCADE,
  
  -- Recipient
  recipient_email TEXT NOT NULL,
  recipient_name TEXT,
  recipient_id UUID,
  
  -- Merge data
  merge_context JSONB NOT NULL,
  
  -- Scheduling
  scheduled_for TIMESTAMPTZ NOT NULL,
  priority INT DEFAULT 5, -- 1 = highest, 10 = lowest
  
  -- State
  status TEXT NOT NULL DEFAULT 'pending', -- 'pending', 'processing', 'sent', 'failed'
  attempts INT DEFAULT 0,
  last_attempt_at TIMESTAMPTZ,
  error_message TEXT,
  
  -- Audit
  created_at TIMESTAMPTZ DEFAULT now(),
  created_by UUID REFERENCES auth.users(id)
);

CREATE INDEX idx_email_queue_pending ON email_queue(scheduled_for, priority) WHERE status = 'pending';
CREATE INDEX idx_email_queue_org ON email_queue(organization_id);

-- ----------------------------------------------------------------------------
-- ROW LEVEL SECURITY
-- ----------------------------------------------------------------------------

-- Enable RLS
ALTER TABLE email_templates ENABLE ROW LEVEL SECURITY;
ALTER TABLE email_template_fields ENABLE ROW LEVEL SECURITY;
ALTER TABLE email_send_log ENABLE ROW LEVEL SECURITY;
ALTER TABLE email_queue ENABLE ROW LEVEL SECURITY;

-- Policies for email_templates
CREATE POLICY "Users can view templates in their organization"
  ON email_templates FOR SELECT
  USING (
    organization_id IN (
      SELECT organization_id FROM organization_roles 
      WHERE user_id = auth.uid()
    )
  );

CREATE POLICY "Managers can manage templates"
  ON email_templates FOR ALL
  USING (
    organization_id IN (
      SELECT organization_id FROM organization_roles 
      WHERE user_id = auth.uid()
    )
  );

-- Policies for email_template_fields
CREATE POLICY "Users can view template fields in their organization"
  ON email_template_fields FOR SELECT
  USING (
    template_id IN (
      SELECT id FROM email_templates WHERE organization_id IN (
        SELECT organization_id FROM organization_roles 
        WHERE user_id = auth.uid()
      )
    )
  );

CREATE POLICY "Managers can manage template fields"
  ON email_template_fields FOR ALL
  USING (
    template_id IN (
      SELECT id FROM email_templates WHERE organization_id IN (
        SELECT organization_id FROM organization_roles 
        WHERE user_id = auth.uid()
      )
    )
  );

-- Policies for email_send_log
CREATE POLICY "Users can view send log in their organization"
  ON email_send_log FOR SELECT
  USING (
    organization_id IN (
      SELECT organization_id FROM organization_roles 
      WHERE user_id = auth.uid()
    )
  );

CREATE POLICY "System can insert send log"
  ON email_send_log FOR INSERT
  WITH CHECK (
    organization_id IN (
      SELECT organization_id FROM organization_roles 
      WHERE user_id = auth.uid()
    )
  );

-- Policies for email_queue
CREATE POLICY "Users can view queue in their organization"
  ON email_queue FOR SELECT
  USING (
    organization_id IN (
      SELECT organization_id FROM organization_roles 
      WHERE user_id = auth.uid()
    )
  );

CREATE POLICY "Managers can manage queue"
  ON email_queue FOR ALL
  USING (
    organization_id IN (
      SELECT organization_id FROM organization_roles 
      WHERE user_id = auth.uid()
    )
  );

-- ----------------------------------------------------------------------------
-- TRIGGERS
-- ----------------------------------------------------------------------------

-- Auto-update updated_at on email_templates
CREATE OR REPLACE FUNCTION update_email_templates_updated_at()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = now();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER email_templates_updated_at
  BEFORE UPDATE ON email_templates
  FOR EACH ROW
  EXECUTE FUNCTION update_email_templates_updated_at();

-- ----------------------------------------------------------------------------
-- COMMENTS
-- ----------------------------------------------------------------------------
COMMENT ON TABLE email_templates IS 'Email templates with merge field placeholders for the Communications module';
COMMENT ON TABLE email_template_fields IS 'Maps merge field tags to data source paths';
COMMENT ON TABLE email_send_log IS 'Audit trail of all sent emails';
COMMENT ON TABLE email_queue IS 'Queue for scheduled and batch email sends';
