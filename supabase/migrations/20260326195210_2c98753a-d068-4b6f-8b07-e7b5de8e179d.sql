CREATE POLICY "Owner can delete agent_queries"
ON public.agent_queries
FOR DELETE
TO authenticated
USING (is_owner());