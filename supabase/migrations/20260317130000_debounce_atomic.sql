-- RPC atômico para debounce de mensagens WhatsApp
-- Resolve race condition: usa SELECT ... FOR UPDATE para garantir que
-- apenas UM request se torna "líder" do debounce window.

CREATE OR REPLACE FUNCTION public.debounce_add_message(
  p_remote_jid TEXT,
  p_message TEXT,
  p_debounce_ms INT DEFAULT 4000
)
RETURNS JSONB
LANGUAGE plpgsql
AS $$
DECLARE
  v_session RECORD;
  v_now TIMESTAMPTZ := now();
  v_debounce_until TIMESTAMPTZ;
  v_pending JSONB;
  v_is_leader BOOLEAN := FALSE;
BEGIN
  -- Tentar obter lock exclusivo na sessão (FOR UPDATE garante serialização)
  SELECT id, pending_messages, debounce_until
  INTO v_session
  FROM public.sessions
  WHERE remote_jid = p_remote_jid
  FOR UPDATE;

  IF NOT FOUND THEN
    -- Criar sessão nova — este é o líder
    v_debounce_until := v_now + (p_debounce_ms || ' milliseconds')::INTERVAL;
    INSERT INTO public.sessions (remote_jid, pending_messages, debounce_until, updated_at)
    VALUES (p_remote_jid, jsonb_build_array(p_message), v_debounce_until, v_now)
    ON CONFLICT (remote_jid) DO UPDATE SET
      pending_messages = jsonb_build_array(p_message),
      debounce_until = v_debounce_until,
      updated_at = v_now;

    RETURN jsonb_build_object('is_leader', TRUE, 'debounce_ms', p_debounce_ms);
  END IF;

  -- Sessão existe — adicionar mensagem ao buffer
  v_pending := COALESCE(v_session.pending_messages, '[]'::JSONB) || jsonb_build_array(p_message);

  IF v_session.debounce_until IS NOT NULL AND v_session.debounce_until > v_now THEN
    -- Já tem um líder esperando — apenas salvar no buffer
    UPDATE public.sessions
    SET pending_messages = v_pending, updated_at = v_now
    WHERE id = v_session.id;

    RETURN jsonb_build_object('is_leader', FALSE, 'debounce_ms', 0);
  ELSE
    -- Ninguém esperando — este request é o novo líder
    v_debounce_until := v_now + (p_debounce_ms || ' milliseconds')::INTERVAL;
    UPDATE public.sessions
    SET pending_messages = v_pending,
        debounce_until = v_debounce_until,
        updated_at = v_now
    WHERE id = v_session.id;

    RETURN jsonb_build_object('is_leader', TRUE, 'debounce_ms', p_debounce_ms);
  END IF;
END;
$$;

-- RPC para coletar mensagens após debounce (o líder chama isso depois de esperar)
CREATE OR REPLACE FUNCTION public.debounce_collect_messages(
  p_remote_jid TEXT
)
RETURNS JSONB
LANGUAGE plpgsql
AS $$
DECLARE
  v_session RECORD;
  v_messages JSONB;
BEGIN
  -- Lock exclusivo para garantir leitura+limpeza atômica
  SELECT id, pending_messages
  INTO v_session
  FROM public.sessions
  WHERE remote_jid = p_remote_jid
  FOR UPDATE;

  IF NOT FOUND THEN
    RETURN '[]'::JSONB;
  END IF;

  v_messages := COALESCE(v_session.pending_messages, '[]'::JSONB);

  -- Limpar buffer e debounce
  UPDATE public.sessions
  SET pending_messages = '[]'::JSONB,
      debounce_until = NULL,
      updated_at = now()
  WHERE id = v_session.id;

  RETURN v_messages;
END;
$$;
