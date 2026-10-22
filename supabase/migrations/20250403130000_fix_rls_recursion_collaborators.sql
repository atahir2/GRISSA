-- Fix: "infinite recursion detected in policy for relation assessment_collaborators"
-- Cause: RLS policies subqueried assessment_collaborators from within policies on the same table
-- (and assessments ↔ collaborators cross-checks), re-entering RLS indefinitely.
-- Fix: SECURITY DEFINER helpers read membership without applying RLS.

CREATE OR REPLACE FUNCTION public.rls_user_has_assessment_access(p_assessment_id uuid)
RETURNS boolean
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT EXISTS (
    SELECT 1 FROM public.assessments a
    WHERE a.id = p_assessment_id
      AND a.owner_user_id = auth.uid()
  )
  OR EXISTS (
    SELECT 1 FROM public.assessment_collaborators ac
    WHERE ac.assessment_id = p_assessment_id
      AND ac.user_id = auth.uid()
  );
$$;

CREATE OR REPLACE FUNCTION public.rls_user_can_edit_assessment(p_assessment_id uuid)
RETURNS boolean
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT EXISTS (
    SELECT 1 FROM public.assessments a
    WHERE a.id = p_assessment_id
      AND a.owner_user_id = auth.uid()
  )
  OR EXISTS (
    SELECT 1 FROM public.assessment_collaborators ac
    WHERE ac.assessment_id = p_assessment_id
      AND ac.user_id = auth.uid()
      AND ac.role IN ('owner', 'editor')
  );
$$;

GRANT EXECUTE ON FUNCTION public.rls_user_has_assessment_access(uuid) TO authenticated;
GRANT EXECUTE ON FUNCTION public.rls_user_can_edit_assessment(uuid) TO authenticated;

-- assessment_collaborators
DROP POLICY IF EXISTS "Collaborators read team" ON public.assessment_collaborators;

CREATE POLICY "Collaborators read team"
  ON public.assessment_collaborators
  FOR SELECT
  TO authenticated
  USING (public.rls_user_has_assessment_access(assessment_collaborators.assessment_id));

-- assessments
DROP POLICY IF EXISTS "Users read owned or shared assessments" ON public.assessments;
DROP POLICY IF EXISTS "Owners and editors update assessments" ON public.assessments;

CREATE POLICY "Users read owned or shared assessments"
  ON public.assessments
  FOR SELECT
  TO authenticated
  USING (public.rls_user_has_assessment_access(assessments.id));

CREATE POLICY "Owners and editors update assessments"
  ON public.assessments
  FOR UPDATE
  TO authenticated
  USING (public.rls_user_can_edit_assessment(assessments.id));

-- assessment_scope_selections
DROP POLICY IF EXISTS "Shared read scope selections" ON public.assessment_scope_selections;
DROP POLICY IF EXISTS "Owners and editors write scope selections" ON public.assessment_scope_selections;
DROP POLICY IF EXISTS "Owners and editors update scope selections" ON public.assessment_scope_selections;
DROP POLICY IF EXISTS "Owners and editors delete scope selections" ON public.assessment_scope_selections;

CREATE POLICY "Shared read scope selections"
  ON public.assessment_scope_selections
  FOR SELECT
  TO authenticated
  USING (public.rls_user_has_assessment_access(assessment_scope_selections.assessment_id));

CREATE POLICY "Owners and editors write scope selections"
  ON public.assessment_scope_selections
  FOR INSERT
  TO authenticated
  WITH CHECK (public.rls_user_can_edit_assessment(assessment_scope_selections.assessment_id));

CREATE POLICY "Owners and editors update scope selections"
  ON public.assessment_scope_selections
  FOR UPDATE
  TO authenticated
  USING (public.rls_user_can_edit_assessment(assessment_scope_selections.assessment_id))
  WITH CHECK (public.rls_user_can_edit_assessment(assessment_scope_selections.assessment_id));

CREATE POLICY "Owners and editors delete scope selections"
  ON public.assessment_scope_selections
  FOR DELETE
  TO authenticated
  USING (public.rls_user_can_edit_assessment(assessment_scope_selections.assessment_id));

-- assessment_answers
DROP POLICY IF EXISTS "Shared read answers" ON public.assessment_answers;
DROP POLICY IF EXISTS "Owners and editors write answers" ON public.assessment_answers;
DROP POLICY IF EXISTS "Owners and editors update answers" ON public.assessment_answers;
DROP POLICY IF EXISTS "Owners and editors delete answers" ON public.assessment_answers;

CREATE POLICY "Shared read answers"
  ON public.assessment_answers
  FOR SELECT
  TO authenticated
  USING (public.rls_user_has_assessment_access(assessment_answers.assessment_id));

CREATE POLICY "Owners and editors write answers"
  ON public.assessment_answers
  FOR INSERT
  TO authenticated
  WITH CHECK (public.rls_user_can_edit_assessment(assessment_answers.assessment_id));

CREATE POLICY "Owners and editors update answers"
  ON public.assessment_answers
  FOR UPDATE
  TO authenticated
  USING (public.rls_user_can_edit_assessment(assessment_answers.assessment_id))
  WITH CHECK (public.rls_user_can_edit_assessment(assessment_answers.assessment_id));

CREATE POLICY "Owners and editors delete answers"
  ON public.assessment_answers
  FOR DELETE
  TO authenticated
  USING (public.rls_user_can_edit_assessment(assessment_answers.assessment_id));

-- assessment_action_items
DROP POLICY IF EXISTS "Shared read action items" ON public.assessment_action_items;
DROP POLICY IF EXISTS "Owners and editors write action items" ON public.assessment_action_items;
DROP POLICY IF EXISTS "Owners and editors update action items" ON public.assessment_action_items;
DROP POLICY IF EXISTS "Owners and editors delete action items" ON public.assessment_action_items;

CREATE POLICY "Shared read action items"
  ON public.assessment_action_items
  FOR SELECT
  TO authenticated
  USING (public.rls_user_has_assessment_access(assessment_action_items.assessment_id));

CREATE POLICY "Owners and editors write action items"
  ON public.assessment_action_items
  FOR INSERT
  TO authenticated
  WITH CHECK (public.rls_user_can_edit_assessment(assessment_action_items.assessment_id));

CREATE POLICY "Owners and editors update action items"
  ON public.assessment_action_items
  FOR UPDATE
  TO authenticated
  USING (public.rls_user_can_edit_assessment(assessment_action_items.assessment_id))
  WITH CHECK (public.rls_user_can_edit_assessment(assessment_action_items.assessment_id));

CREATE POLICY "Owners and editors delete action items"
  ON public.assessment_action_items
  FOR DELETE
  TO authenticated
  USING (public.rls_user_can_edit_assessment(assessment_action_items.assessment_id));
