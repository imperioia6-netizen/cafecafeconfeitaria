ALTER TABLE public.payment_confirmations 
ADD COLUMN order_payload jsonb DEFAULT NULL,
ADD COLUMN remote_jid text DEFAULT NULL;