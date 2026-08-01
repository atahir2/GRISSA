-- Idempotent: ensure authenticated users can INSERT assessments as themselves.
-- If this policy was missing or misapplied, inserts fail with:
-- "new row violates row-level security policy for table assessments"

DROP POLICY IF EXISTS "Users create assessments as owner" ON public.assessments;

CREATE POLICY "Users create assessments as owner"
  ON public.assessments
  FOR INSERT
  TO authenticated
  WITH CHECK (owner_user_id = auth.uid());
