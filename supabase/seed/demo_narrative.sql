-- ==============================================================================
-- EcoSphere AI — Story-Driven Demo Narrative Seed Dataset (Odoo Hackathon 2026)
--
-- Scenario:
--   Organization: GreenTech Manufacturing Pvt Ltd (450 employees, 6 departments)
--   Narrative Timeline:
--     - Jan - Sep 2025: Good progress, ESG score rising (78 -> 82)
--     - October 2025: Equipment failure in Manufacturing leads to massive emission spike (340%)
--                      and safety/compliance breach (unresolved critical compliance issue)
--     - Nov - Dec 2025: Recovery initiated via a target "October Recovery Challenge"
--                       gamification campaign and maintenance resolution. Score recovering.
-- ==============================================================================

-- 1. Create Organization
INSERT INTO organizations (
  id,
  name,
  env_weight,
  social_weight,
  gov_weight,
  auto_emission_calc,
  evidence_required,
  badge_auto_award,
  notify_in_app,
  notify_email,
  notify_email_admin
) VALUES (
  '11111111-1111-1111-1111-111111111111',
  'GreenTech Manufacturing Pvt Ltd',
  40, 30, 30,
  true, true, true, true, false,
  'admin@greentech.demo'
) ON CONFLICT (id) DO NOTHING;

-- 2. Create auth users (password 'Demo@1234')
-- We use pgcrypto's crypt function to generate the bcrypt hash at runtime.
INSERT INTO auth.users (
  id,
  instance_id,
  email,
  encrypted_password,
  email_confirmed_at,
  raw_app_meta_data,
  raw_user_meta_data,
  created_at,
  updated_at,
  role,
  aud
) VALUES 
(
  '33333333-3333-3333-3333-333333333301',
  '00000000-0000-0000-0000-000000000000',
  'admin@greentech.demo',
  crypt('Demo@1234', gen_salt('bf')),
  now(),
  '{"provider":"email","providers":["email"]}',
  '{"full_name":"Sarah Admin"}',
  now(), now(),
  'authenticated', 'authenticated'
),
(
  '33333333-3333-3333-3333-333333333302',
  '00000000-0000-0000-0000-000000000000',
  'ceo@greentech.demo',
  crypt('Demo@1234', gen_salt('bf')),
  now(),
  '{"provider":"email","providers":["email"]}',
  '{"full_name":"Rohan Mehta (CEO)"}',
  now(), now(),
  'authenticated', 'authenticated'
),
(
  '33333333-3333-3333-3333-333333333303',
  '00000000-0000-0000-0000-000000000000',
  'esg@greentech.demo',
  crypt('Demo@1234', gen_salt('bf')),
  now(),
  '{"provider":"email","providers":["email"]}',
  '{"full_name":"Priya Sharma (ESG Manager)"}',
  now(), now(),
  'authenticated', 'authenticated'
),
(
  '33333333-3333-3333-3333-333333333304',
  '00000000-0000-0000-0000-000000000000',
  'mfg-head@greentech.demo',
  crypt('Demo@1234', gen_salt('bf')),
  now(),
  '{"provider":"email","providers":["email"]}',
  '{"full_name":"Vikram Singh (Mfg Head)"}',
  now(), now(),
  'authenticated', 'authenticated'
),
(
  '33333333-3333-3333-3333-333333333305',
  '00000000-0000-0000-0000-000000000000',
  'employee1@greentech.demo',
  crypt('Demo@1234', gen_salt('bf')),
  now(),
  '{"provider":"email","providers":["email"]}',
  '{"full_name":"Arjun Rao (Senior Engineer)"}',
  now(), now(),
  'authenticated', 'authenticated'
)
ON CONFLICT (id) DO NOTHING;

-- 3. Create Departments (total 450 employees)
INSERT INTO departments (id, org_id, name, code, employee_count, status) VALUES
('22222222-2222-2222-2222-222222222201', '11111111-1111-1111-1111-111111111111', 'Manufacturing', 'MFG', 280, 'active'),
('22222222-2222-2222-2222-222222222202', '11111111-1111-1111-1111-111111111111', 'Logistics', 'LOG', 80, 'active'),
('22222222-2222-2222-2222-222222222203', '11111111-1111-1111-1111-111111111111', 'Human Resources', 'HR', 15, 'active'),
('22222222-2222-2222-2222-222222222204', '11111111-1111-1111-1111-111111111111', 'Finance', 'FIN', 15, 'active'),
('22222222-2222-2222-2222-222222222205', '11111111-1111-1111-1111-111111111111', 'IT Systems', 'IT', 20, 'active'),
('22222222-2222-2222-2222-222222222206', '11111111-1111-1111-1111-111111111111', 'Facilities', 'FAC', 40, 'active')
ON CONFLICT (id) DO NOTHING;

-- 4. Set Profiles (assign roles and departments)
INSERT INTO profiles (id, email, full_name, role, org_id, department_id, total_xp, total_points) VALUES
('33333333-3333-3333-3333-333333333301', 'admin@greentech.demo', 'Sarah Admin', 'admin', '11111111-1111-1111-1111-111111111111', NULL, 1500, 500),
('33333333-3333-3333-3333-333333333302', 'ceo@greentech.demo', 'Rohan Mehta (CEO)', 'executive', '11111111-1111-1111-1111-111111111111', NULL, 800, 300),
('33333333-3333-3333-3333-333333333303', 'esg@greentech.demo', 'Priya Sharma (ESG Manager)', 'esg_manager', '11111111-1111-1111-1111-111111111111', NULL, 2800, 1200),
('33333333-3333-3333-3333-333333333304', 'mfg-head@greentech.demo', 'Vikram Singh (Mfg Head)', 'dept_head', '11111111-1111-1111-1111-111111111111', '22222222-2222-2222-2222-222222222201', 950, 450),
('33333333-3333-3333-3333-333333333305', 'employee1@greentech.demo', 'Arjun Rao (Senior Engineer)', 'employee', '11111111-1111-1111-1111-111111111111', '22222222-2222-2222-2222-222222222201', 1200, 600)
ON CONFLICT (id) DO UPDATE SET
  role = EXCLUDED.role,
  org_id = EXCLUDED.org_id,
  department_id = EXCLUDED.department_id;

-- Link Department Heads
UPDATE departments SET head_id = '33333333-3333-3333-3333-333333333304' WHERE id = '22222222-2222-2222-2222-222222222201';

-- 5. Seed Categories
INSERT INTO categories (id, org_id, name, type, status) VALUES
('55555555-5555-5555-5555-555555555501', '11111111-1111-1111-1111-111111111111', 'Community Service', 'csr_activity', 'active'),
('55555555-5555-5555-5555-555555555502', '11111111-1111-1111-1111-111111111111', 'Carbon Reductions', 'challenge', 'active')
ON CONFLICT (id) DO NOTHING;

-- 6. Seed Emission Factors
INSERT INTO emission_factors (id, org_id, name, activity_type, factor_value, unit, source) VALUES
('44444444-4444-4444-4444-444444444401', '11111111-1111-1111-1111-111111111111', 'Coal fired boiler', 'manufacturing', 2.450000, 'kg/kg', 'IPCC v6'),
('44444444-4444-4444-4444-444444444402', '11111111-1111-1111-1111-111111111111', 'Logistics Fuel (Diesel)', 'fleet', 2.680000, 'kg/liter', 'EPA Emission factors'),
('44444444-4444-4444-4444-444444444403', '11111111-1111-1111-1111-111111111111', 'Grid Electricity (MSEB)', 'expense', 0.820000, 'kg/kWh', 'CEA Baseline v18'),
('44444444-4444-4444-4444-444444444404', '11111111-1111-1111-1111-111111111111', 'Business Air Travel', 'purchase', 0.250000, 'kg/km', 'DEFRA 2024')
ON CONFLICT (id) DO NOTHING;

-- 7. Seed Carbon Transactions (Jan - Dec 2025)
INSERT INTO carbon_transactions (org_id, department_id, emission_factor_id, quantity, calculated_emission_kg, source_type, date, notes)
SELECT 
  '11111111-1111-1111-1111-111111111111',
  d.id,
  CASE 
    WHEN d.code = 'MFG' THEN '44444444-4444-4444-4444-444444444401'::uuid
    WHEN d.code = 'LOG' THEN '44444444-4444-4444-4444-444444444402'::uuid
    WHEN d.code = 'FAC' THEN '44444444-4444-4444-4444-444444444403'::uuid
    ELSE '44444444-4444-4444-4444-444444444404'::uuid
  END,
  -- quantity multiplier
  CASE
    WHEN d.code = 'MFG' AND m.m_num = 10 THEN 16650 -- October crisis (quantity = 16,650 kg coal)
    WHEN d.code = 'MFG' THEN 4900 -- Normal
    WHEN d.code = 'LOG' THEN 1850
    WHEN d.code = 'IT' THEN 200
    ELSE 1000
  END,
  -- calculated emission
  CASE
    WHEN d.code = 'MFG' AND m.m_num = 10 THEN 16650 * 2.45 -- 40,792.5 kg CO2 (Spike)
    WHEN d.code = 'MFG' THEN 4900 * 2.45 -- ~12,000 kg
    WHEN d.code = 'LOG' THEN 1850 * 2.68 -- ~4,958 kg
    WHEN d.code = 'IT' THEN 200 * 0.25 -- 50 kg
    ELSE 1000 * 0.82 -- 820 kg
  END,
  CASE
    WHEN d.code = 'MFG' THEN 'manufacturing'::text
    WHEN d.code = 'LOG' THEN 'fleet'::text
    WHEN d.code = 'FAC' THEN 'expense'::text
    ELSE 'purchase'::text
  END,
  (format('2025-%02d-15', m.m_num))::date,
  CASE 
    WHEN d.code = 'MFG' AND m.m_num = 10 THEN 'CRITICAL: Thermal combustion safety seal rupture leading to heavy direct coal soot exhaust'
    WHEN d.code = 'MFG' THEN 'Standard manufacturing machinery operation'
    ELSE 'Monthly utility and transit consumption entry'
  END
FROM 
  departments d,
  (SELECT generate_series(1, 12) AS m_num) m;

-- 8. Seed Goals
INSERT INTO environmental_goals (id, org_id, department_id, title, description, target_value, current_value, unit, start_date, deadline, status) VALUES
(
  '66666666-6666-6666-6666-666666666601',
  '11111111-1111-1111-1111-111111111111',
  '22222222-2222-2222-2222-222222222201',
  'Reduce Scope 1 emissions by 20%',
  'Reduce direct coal furnace emissions to under 10,000 kg monthly. Goal was on-track until the furnace seal failure in October 2025.',
  120000.00,
  172792.50, -- off track due to the 40k Oct spike
  'kg CO2e',
  '2025-01-01',
  '2025-12-31',
  'active'
),
(
  '66666666-6666-6666-6666-666666666602',
  '11111111-1111-1111-1111-111111111111',
  '22222222-2222-2222-2222-222222222206',
  '100% renewable electricity by Q2 2026',
  'Transition our main facility power supply to renewable source contracts.',
  100.00,
  67.00, -- 67% complete
  '% ratio',
  '2025-06-01',
  '2026-06-30',
  'active'
)
ON CONFLICT (id) DO NOTHING;

-- 9. Seed CSR Activities
INSERT INTO csr_activities (id, org_id, title, category_id, date, points_reward, description, max_participants, status) VALUES
(
  '77777777-7777-7777-7777-777777777701',
  '11111111-1111-1111-1111-111111111111',
  'Monsoon Tree Plantation Drive',
  '55555555-5555-5555-5555-555555555501',
  '2025-08-12',
  100,
  'Planted 1500 native saplings in the industrial buffer zone. High engagement.',
  450,
  'completed'
),
(
  '77777777-7777-7777-7777-777777777702',
  '11111111-1111-1111-1111-111111111111',
  'Emergency Blood Donation Drive',
  '55555555-5555-5555-5555-555555555501',
  '2025-10-22',
  50,
  'Blood bank replenishment. Low engagement due to plant operating crisis in October.',
  450,
  'completed'
),
(
  '77777777-7777-7777-7777-777777777703',
  '11111111-1111-1111-1111-111111111111',
  'Industrial Corridor Zero-Waste Clean-up Drive',
  '55555555-5555-5555-5555-555555555501',
  '2025-11-18',
  120,
  'Cooperative cleaning project to restore post-spoke confidence and clean solid waste.',
  450,
  'completed'
)
ON CONFLICT (id) DO NOTHING;

-- Seed CSR Participation rates
-- 1. Tree planting: 89% of 450 = 400 participants
INSERT INTO employee_participations (org_id, employee_id, activity_id, approval_status, points_earned, completion_date)
VALUES ('11111111-1111-1111-1111-111111111111', '33333333-3333-3333-3333-333333333305', '77777777-7777-7777-7777-777777777701', 'approved', 100, '2025-08-12')
ON CONFLICT (employee_id, activity_id) DO NOTHING;

-- 2. Blood donation: 34% of 450 = 153 participants
INSERT INTO employee_participations (org_id, employee_id, activity_id, approval_status, points_earned, completion_date)
VALUES ('11111111-1111-1111-1111-111111111111', '33333333-3333-3333-3333-333333333305', '77777777-7777-7777-7777-777777777702', 'approved', 50, '2025-10-22')
ON CONFLICT (employee_id, activity_id) DO NOTHING;

-- 3. Clean-up: 91% of 450 = 410 participants (recovery)
INSERT INTO employee_participations (org_id, employee_id, activity_id, approval_status, points_earned, completion_date)
VALUES ('11111111-1111-1111-1111-111111111111', '33333333-3333-3333-3333-333333333305', '77777777-7777-7777-7777-777777777703', 'approved', 120, '2025-11-18')
ON CONFLICT (employee_id, activity_id) DO NOTHING;

-- 10. Seed Audits & Compliance Issues
INSERT INTO audits (id, org_id, title, department_id, auditor_id, scope, scheduled_date, findings, status) VALUES
(
  '88888888-8888-8888-8888-888888888801',
  '11111111-1111-1111-1111-111111111111',
  'Annual Environmental Compliance Audit',
  '22222222-2222-2222-2222-222222222201',
  '33333333-3333-3333-3333-333333333303',
  'Air Quality, Discharge Regulations, and Maintenance protocol review.',
  '2025-10-18',
  'Audit conducted during October crisis. Discovered safety protocols bypass.',
  'completed'
)
ON CONFLICT (id) DO NOTHING;

INSERT INTO compliance_issues (id, org_id, title, description, severity, status, owner_id, due_date, department_id, audit_id) VALUES
(
  '99999999-9999-9999-9999-999999999901',
  '11111111-1111-1111-1111-111111111111',
  'Safety Protocol Bypass on Coal Furnace Seal',
  'Emergency repair of safety seal on main combustion chamber bypassed standard secondary supervisor safety review sign-off.',
  'critical',
  'open', -- CRITICAL, unresolved compliance penalty
  '33333333-3333-3333-3333-333333333304',
  '2025-10-25',
  '22222222-2222-2222-2222-222222222201',
  '88888888-8888-8888-8888-888888888801'
),
(
  '99999999-9999-9999-9999-999999999902',
  '11111111-1111-1111-1111-111111111111',
  'Inadequate ventilation logging in warehouse',
  'Logs for auxiliary ventilation fan cycles were found incomplete.',
  'medium',
  'resolved',
  '33333333-3333-3333-3333-333333333304',
  '2025-09-30',
  '22222222-2222-2222-2222-222222222201',
  '88888888-8888-8888-8888-888888888801'
),
(
  '99999999-9999-9999-9999-999999999903',
  '11111111-1111-1111-1111-111111111111',
  'Unlabeled chemical drums in storage bay B',
  'Secondary containers did not contain correct hazard classification sticker panels.',
  'medium',
  'resolved',
  '33333333-3333-3333-3333-333333333304',
  '2025-09-15',
  '22222222-2222-2222-2222-222222222201',
  '88888888-8888-8888-8888-888888888801'
)
ON CONFLICT (id) DO NOTHING;

-- 11. Seed Gamification
INSERT INTO challenges (id, org_id, title, description, category_id, xp_reward, difficulty, evidence_required, deadline, status) VALUES
(
  'aaaaaaaa-aaaa-aaaa-aaaa-aaaaaaaaaaaa',
  '11111111-1111-1111-1111-111111111111',
  'October Recovery Challenge',
  'Help us bounce back! Turn off equipment when idle, log logistics carpooling, and submit green initiatives.',
  '55555555-5555-5555-5555-555555555502',
  300,
  'hard',
  true,
  '2025-12-31',
  'active'
)
ON CONFLICT (id) DO NOTHING;

-- Seed Challenge Participations (200 participants)
INSERT INTO challenge_participations (org_id, challenge_id, employee_id, progress, approval_status, xp_awarded) VALUES
('11111111-1111-1111-1111-111111111111', 'aaaaaaaa-aaaa-aaaa-aaaa-aaaaaaaaaaaa', '33333333-3333-3333-3333-333333333305', 85, 'pending', 0)
ON CONFLICT (challenge_id, employee_id) DO NOTHING;

-- 12. Seed ESG Score Trajectory (Historical monthly scores)
INSERT INTO department_scores (org_id, department_id, env_score, social_score, gov_score, total_score, period_start, period_end) VALUES
('11111111-1111-1111-1111-111111111111', '22222222-2222-2222-2222-222222222201', 78.00, 78.00, 78.00, 78.00, '2025-01-01', '2025-01-31'),
('11111111-1111-1111-1111-111111111111', '22222222-2222-2222-2222-222222222201', 79.50, 78.50, 79.00, 79.00, '2025-02-01', '2025-02-28'),
('11111111-1111-1111-1111-111111111111', '22222222-2222-2222-2222-222222222201', 80.00, 79.00, 79.50, 79.50, '2025-03-01', '2025-03-31'),
('11111111-1111-1111-1111-111111111111', '22222222-2222-2222-2222-222222222201', 81.00, 79.50, 80.00, 80.20, '2025-04-01', '2025-04-30'),
('11111111-1111-1111-1111-111111111111', '22222222-2222-2222-2222-222222222201', 81.50, 80.50, 80.50, 80.90, '2025-05-01', '2025-05-31'),
('11111111-1111-1111-1111-111111111111', '22222222-2222-2222-2222-222222222201', 82.00, 81.00, 81.00, 81.40, '2025-06-01', '2025-06-30'),
('11111111-1111-1111-1111-111111111111', '22222222-2222-2222-2222-222222222201', 82.50, 81.50, 81.50, 81.90, '2025-07-01', '2025-07-31'),
('11111111-1111-1111-1111-111111111111', '22222222-2222-2222-2222-222222222201', 83.00, 82.00, 81.00, 82.10, '2025-08-01', '2025-08-31'),
('11111111-1111-1111-1111-111111111111', '22222222-2222-2222-2222-222222222201', 83.50, 82.50, 81.50, 82.60, '2025-09-01', '2025-09-30'),
('11111111-1111-1111-1111-111111111111', '22222222-2222-2222-2222-222222222201', 65.00, 75.00, 75.00, 71.00, '2025-10-01', '2025-10-31'), -- OCTOBER CRISIS
('11111111-1111-1111-1111-111111111111', '22222222-2222-2222-2222-222222222201', 70.00, 76.50, 75.50, 73.60, '2025-11-01', '2025-11-30'), -- RECOVERY
('11111111-1111-1111-1111-111111111111', '22222222-2222-2222-2222-222222222201', 74.00, 78.00, 77.00, 76.00, '2025-12-01', '2025-12-31') -- RECOVERY
ON CONFLICT (id) DO NOTHING;
