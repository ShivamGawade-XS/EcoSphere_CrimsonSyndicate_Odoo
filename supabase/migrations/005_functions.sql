-- ============================================================
-- 005_functions.sql
-- EcoSphere AI — Database Functions & Triggers
-- ============================================================

-- ─── ESG Score Calculator ─────────────────────────────────────
CREATE OR REPLACE FUNCTION calculate_department_scores(
  p_org_id      UUID,
  p_period_start DATE,
  p_period_end   DATE
)
RETURNS VOID AS $$
DECLARE
  dept RECORD;
  env_score   NUMERIC;
  social_score NUMERIC;
  gov_score   NUMERIC;
  total_score NUMERIC;
  org_weights RECORD;
BEGIN
  -- Get org weights
  SELECT env_weight, social_weight, gov_weight
  INTO org_weights
  FROM organizations WHERE id = p_org_id;

  FOR dept IN SELECT * FROM departments WHERE org_id = p_org_id AND status = 'active' LOOP
    
    -- ─── Environmental Score ───────────────────────────────
    DECLARE
      goal_count INT := 0;
      total_deduction NUMERIC := 0;
      goal RECORD;
      ratio NUMERIC;
      deduction NUMERIC;
    BEGIN
      FOR goal IN
        SELECT * FROM environmental_goals
        WHERE org_id = p_org_id 
          AND (department_id = dept.id OR department_id IS NULL)
          AND status = 'active'
          AND start_date <= p_period_end
      LOOP
        goal_count := goal_count + 1;
        ratio := CASE WHEN goal.target_value > 0 
                      THEN goal.current_value / goal.target_value 
                      ELSE 1 END;
        IF ratio > 1.0 THEN
          deduction := LEAST((ratio - 1.0) * 30, 30);
          total_deduction := total_deduction + deduction;
        END IF;
      END LOOP;
      
      env_score := CASE WHEN goal_count = 0 THEN 70
                        ELSE GREATEST(0, LEAST(100, 100 - total_deduction))
                   END;
    END;

    -- ─── Social Score ──────────────────────────────────────
    DECLARE
      dept_employee_count INT;
      csr_participants INT;
      training_completions INT;
      diversity_score NUMERIC := 70;  -- default
      csr_rate NUMERIC;
      training_rate NUMERIC;
    BEGIN
      dept_employee_count := GREATEST(1, dept.employee_count);
      
      SELECT COUNT(DISTINCT ep.employee_id)
      INTO csr_participants
      FROM employee_participations ep
      JOIN csr_activities ca ON ca.id = ep.activity_id
      WHERE ep.org_id = p_org_id
        AND ep.approval_status = 'approved'
        AND ca.department_id = dept.id
        AND ep.created_at BETWEEN p_period_start AND p_period_end;
      
      csr_rate := LEAST(1.0, csr_participants::NUMERIC / dept_employee_count);
      training_rate := 0.5;  -- placeholder until training table
      
      social_score := GREATEST(0, LEAST(100,
        (csr_rate * 40) + (training_rate * 30) + (diversity_score * 0.30)
      ));
    END;

    -- ─── Governance Score ──────────────────────────────────
    DECLARE
      active_policy_count INT;
      acknowledged_count INT;
      scheduled_audits INT;
      completed_audits INT;
      issue_penalty NUMERIC := 0;
      issue RECORD;
      policy_rate NUMERIC;
      audit_rate NUMERIC;
    BEGIN
      SELECT COUNT(*) INTO active_policy_count
      FROM esg_policies WHERE org_id = p_org_id AND status = 'active';
      
      IF active_policy_count > 0 THEN
        SELECT COUNT(*) INTO acknowledged_count
        FROM policy_acknowledgements pa
        JOIN profiles p ON p.id = pa.employee_id
        WHERE pa.org_id = p_org_id AND p.department_id = dept.id;
        
        policy_rate := LEAST(1.0, acknowledged_count::NUMERIC / 
          GREATEST(1, dept.employee_count * active_policy_count));
      ELSE
        policy_rate := 1.0;
      END IF;
      
      SELECT COUNT(*) INTO scheduled_audits
      FROM audits WHERE org_id = p_org_id AND department_id = dept.id
        AND scheduled_date BETWEEN p_period_start AND p_period_end;
      
      SELECT COUNT(*) INTO completed_audits
      FROM audits WHERE org_id = p_org_id AND department_id = dept.id
        AND status = 'completed'
        AND scheduled_date BETWEEN p_period_start AND p_period_end;
      
      audit_rate := CASE WHEN scheduled_audits = 0 THEN 1.0
                         ELSE completed_audits::NUMERIC / scheduled_audits
                    END;
      
      FOR issue IN
        SELECT severity, status FROM compliance_issues
        WHERE org_id = p_org_id AND department_id = dept.id
          AND status NOT IN ('resolved')
      LOOP
        issue_penalty := issue_penalty + CASE issue.severity
          WHEN 'critical' THEN 15
          WHEN 'high'     THEN 10
          WHEN 'medium'   THEN 5
          WHEN 'low'      THEN 2
          ELSE 0
        END;
        IF issue.status = 'overdue' THEN
          issue_penalty := issue_penalty + 5;
        END IF;
      END LOOP;
      
      gov_score := GREATEST(0, LEAST(100,
        (policy_rate * 40) + (audit_rate * 30) + 30 - issue_penalty
      ));
    END;

    -- ─── Total Score ───────────────────────────────────────
    total_score := (env_score * org_weights.env_weight / 100.0)
                 + (social_score * org_weights.social_weight / 100.0)
                 + (gov_score * org_weights.gov_weight / 100.0);

    -- ─── Upsert Score ──────────────────────────────────────
    INSERT INTO department_scores (
      org_id, department_id,
      env_score, social_score, gov_score, total_score,
      period_start, period_end
    ) VALUES (
      p_org_id, dept.id,
      ROUND(env_score, 2), ROUND(social_score, 2),
      ROUND(gov_score, 2), ROUND(total_score, 2),
      p_period_start, p_period_end
    )
    ON CONFLICT DO NOTHING;

  END LOOP;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;


-- ─── Badge Auto-Award Function ────────────────────────────────
CREATE OR REPLACE FUNCTION check_and_award_badges(p_employee_id UUID)
RETURNS VOID AS $$
DECLARE
  emp RECORD;
  badge RECORD;
  auto_award BOOLEAN;
  challenges_done INT;
  csr_done INT;
BEGIN
  SELECT p.total_xp, p.org_id INTO emp
  FROM profiles p WHERE id = p_employee_id;
  
  SELECT badge_auto_award INTO auto_award
  FROM organizations WHERE id = emp.org_id;
  
  IF NOT auto_award THEN RETURN; END IF;
  
  SELECT COUNT(*) INTO challenges_done
  FROM challenge_participations
  WHERE employee_id = p_employee_id AND approval_status = 'approved';
  
  SELECT COUNT(*) INTO csr_done
  FROM employee_participations
  WHERE employee_id = p_employee_id AND approval_status = 'approved';
  
  FOR badge IN
    SELECT * FROM badges WHERE org_id = emp.org_id
  LOOP
    -- Check if already awarded
    IF EXISTS (SELECT 1 FROM badge_awards WHERE badge_id = badge.id AND employee_id = p_employee_id) THEN
      CONTINUE;
    END IF;
    
    -- Check unlock condition
    IF (badge.unlock_rule_type = 'xp_threshold' AND emp.total_xp >= badge.unlock_rule_value)
    OR (badge.unlock_rule_type = 'challenges_completed' AND challenges_done >= badge.unlock_rule_value)
    OR (badge.unlock_rule_type = 'csr_activities_completed' AND csr_done >= badge.unlock_rule_value)
    THEN
      INSERT INTO badge_awards (org_id, badge_id, employee_id, awarded_by)
      VALUES (emp.org_id, badge.id, p_employee_id, NULL);
      
      INSERT INTO notifications (org_id, recipient_id, type, title, body)
      VALUES (
        emp.org_id, p_employee_id, 'badge_unlocked',
        '🏆 Badge Unlocked: ' || badge.icon || ' ' || badge.name,
        badge.description
      );
    END IF;
  END LOOP;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;


-- ─── Auto-check overdue compliance issues ─────────────────────
CREATE OR REPLACE FUNCTION flag_overdue_issues()
RETURNS INT AS $$
DECLARE
  updated_count INT;
BEGIN
  UPDATE compliance_issues
  SET status = 'overdue', updated_at = now()
  WHERE due_date < CURRENT_DATE
    AND status NOT IN ('resolved', 'overdue')
  RETURNING 1;
  
  GET DIAGNOSTICS updated_count = ROW_COUNT;
  RETURN updated_count;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;
