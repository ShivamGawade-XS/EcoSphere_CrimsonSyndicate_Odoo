-- ============================================================
-- 006_atomic_redemption.sql
-- EcoSphere AI — Atomic Reward Redemption PostgreSQL Function
-- ============================================================
-- This function deducts points, decrements stock, creates
-- the redemption record, and logs a notification — all inside
-- a single transaction so there are NO race conditions.
-- ============================================================

CREATE OR REPLACE FUNCTION redeem_reward_atomic(
  p_employee_id UUID,
  p_reward_id   UUID,
  p_org_id      UUID
)
RETURNS JSON
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
  v_points_cost   INT;
  v_reward_name   TEXT;
  v_stock         INT;
  v_user_points   INT;
  v_redemption_id UUID;
BEGIN
  -- ─── 1. Lock and fetch reward (SELECT FOR UPDATE prevents race conditions)
  SELECT points_cost, name, stock
  INTO   v_points_cost, v_reward_name, v_stock
  FROM   rewards
  WHERE  id = p_reward_id AND org_id = p_org_id
  FOR UPDATE;

  IF NOT FOUND THEN
    RETURN json_build_object('success', false, 'error', 'Reward not found in your organization');
  END IF;

  IF v_stock IS NOT NULL AND v_stock <= 0 THEN
    RETURN json_build_object('success', false, 'error', 'Reward is out of stock');
  END IF;

  -- ─── 2. Lock and fetch user points (SELECT FOR UPDATE prevents race conditions)
  SELECT total_points
  INTO   v_user_points
  FROM   profiles
  WHERE  id = p_employee_id AND org_id = p_org_id
  FOR UPDATE;

  IF NOT FOUND THEN
    RETURN json_build_object('success', false, 'error', 'Employee profile not found');
  END IF;

  IF v_user_points < v_points_cost THEN
    RETURN json_build_object(
      'success', false,
      'error', format(
        'Insufficient points balance. Required: %s, Available: %s',
        v_points_cost, v_user_points
      )
    );
  END IF;

  -- ─── 3. Deduct points atomically
  UPDATE profiles
  SET    total_points = total_points - v_points_cost,
         updated_at   = now()
  WHERE  id = p_employee_id;

  -- ─── 4. Decrement stock atomically (only if stock is tracked)
  IF v_stock IS NOT NULL THEN
    UPDATE rewards
    SET    stock = stock - 1
    WHERE  id = p_reward_id;
  END IF;

  -- ─── 5. Create redemption record
  INSERT INTO reward_redemptions (org_id, reward_id, employee_id, status)
  VALUES (p_org_id, p_reward_id, p_employee_id, 'pending')
  RETURNING id INTO v_redemption_id;

  -- ─── 6. Log an XP transaction for the audit trail
  INSERT INTO xp_transactions (org_id, employee_id, amount, source_type, source_id, description)
  VALUES (
    p_org_id,
    p_employee_id,
    -v_points_cost,
    'manual',
    v_redemption_id,
    'Points redeemed for reward: ' || v_reward_name
  );

  -- ─── 7. Send in-app notification
  INSERT INTO notifications (org_id, recipient_id, type, title, body)
  VALUES (
    p_org_id,
    p_employee_id,
    'reward_redemption',
    '🎁 Reward Requested: ' || v_reward_name,
    format('%s points deducted. Your request is pending fulfilment.', v_points_cost)
  );

  RETURN json_build_object(
    'success',        true,
    'redemption_id',  v_redemption_id,
    'points_deducted', v_points_cost
  );

EXCEPTION WHEN OTHERS THEN
  -- Roll back all changes on any unexpected error
  RAISE;
END;
$$;

-- Grant execute permission to authenticated role (Edge Functions run as the calling user)
GRANT EXECUTE ON FUNCTION redeem_reward_atomic(UUID, UUID, UUID) TO authenticated;
