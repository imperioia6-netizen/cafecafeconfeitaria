
-- 1. Add debounce columns to sessions table
ALTER TABLE public.sessions ADD COLUMN IF NOT EXISTS pending_messages text[] DEFAULT '{}';
ALTER TABLE public.sessions ADD COLUMN IF NOT EXISTS debounce_until timestamptz DEFAULT NULL;
ALTER TABLE public.sessions ADD COLUMN IF NOT EXISTS debounce_leader_id uuid DEFAULT NULL;

-- 2. Atomic debounce: add message to buffer, return if this request is the leader
CREATE OR REPLACE FUNCTION public.debounce_add_message(
  p_remote_jid text,
  p_message text,
  p_delay_ms int DEFAULT 3000
)
RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_row sessions%ROWTYPE;
  v_leader_id uuid;
  v_is_leader boolean := false;
  v_debounce_until timestamptz;
BEGIN
  -- Lock the session row for atomic update
  SELECT * INTO v_row
  FROM sessions
  WHERE remote_jid = p_remote_jid
  FOR UPDATE;

  IF NOT FOUND THEN
    -- Create session with this message as leader
    v_leader_id := gen_random_uuid();
    v_debounce_until := now() + (p_delay_ms || ' milliseconds')::interval;
    INSERT INTO sessions (remote_jid, memory, pending_messages, debounce_until, debounce_leader_id, updated_at)
    VALUES (p_remote_jid, '{}'::jsonb, ARRAY[p_message], v_debounce_until, v_leader_id, now());
    RETURN jsonb_build_object('is_leader', true, 'leader_id', v_leader_id, 'delay_ms', p_delay_ms);
  END IF;

  -- Session exists. Check if there's an active debounce window
  IF v_row.debounce_until IS NOT NULL AND v_row.debounce_until > now() THEN
    -- Active window: append message, extend deadline, NOT leader
    UPDATE sessions
    SET pending_messages = array_append(COALESCE(pending_messages, '{}'), p_message),
        debounce_until = now() + (p_delay_ms || ' milliseconds')::interval,
        updated_at = now()
    WHERE remote_jid = p_remote_jid;
    RETURN jsonb_build_object('is_leader', false, 'leader_id', v_row.debounce_leader_id, 'delay_ms', 0);
  ELSE
    -- No active window: this request becomes leader
    v_leader_id := gen_random_uuid();
    v_debounce_until := now() + (p_delay_ms || ' milliseconds')::interval;
    UPDATE sessions
    SET pending_messages = ARRAY[p_message],
        debounce_until = v_debounce_until,
        debounce_leader_id = v_leader_id,
        updated_at = now()
    WHERE remote_jid = p_remote_jid;
    RETURN jsonb_build_object('is_leader', true, 'leader_id', v_leader_id, 'delay_ms', p_delay_ms);
  END IF;
END;
$$;

-- 3. Leader collects all accumulated messages and clears the buffer
CREATE OR REPLACE FUNCTION public.debounce_collect_messages(
  p_remote_jid text,
  p_leader_id uuid
)
RETURNS text[]
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_messages text[];
  v_current_leader uuid;
BEGIN
  SELECT debounce_leader_id, pending_messages
  INTO v_current_leader, v_messages
  FROM sessions
  WHERE remote_jid = p_remote_jid
  FOR UPDATE;

  IF NOT FOUND OR v_current_leader IS DISTINCT FROM p_leader_id THEN
    RETURN '{}';
  END IF;

  -- Clear buffer and debounce state
  UPDATE sessions
  SET pending_messages = '{}',
      debounce_until = NULL,
      debounce_leader_id = NULL,
      updated_at = now()
  WHERE remote_jid = p_remote_jid;

  RETURN COALESCE(v_messages, '{}');
END;
$$;
