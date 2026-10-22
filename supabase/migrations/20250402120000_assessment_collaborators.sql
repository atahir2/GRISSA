-- Phase 2: collaboration, role-based access, RLS for owners/editors/viewers.

-- ---------------------------------------------------------------------------
-- assessment_collaborators
-- ---------------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS public.assessment_collaborators (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  assessment_id UUID NOT NULL REFERENCES public.assessments(id) ON DELETE CASCADE,
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  role TEXT NOT NULL CHECK (role IN ('owner', 'editor', 'reviewer', 'viewer')),
  invited_by UUID REFERENCES auth.users(id) ON DELETE SET NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  UNIQUE(assessment_id, user_id)
);

CREATE INDEX IF NOT EXISTS idx_assessment_collaborators_assessment_id
  ON public.assessment_collaborators(assessment_id);

CREATE INDEX IF NOT EXISTS idx_assessment_collaborators_user_id
  ON public.assessment_collaborators(user_id);

COMMENT ON TABLE public.assessment_collaborators IS 'Per-assessment access: owner is mirrored here alongside invited collaborators.';

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_trigger WHERE tgname = 'assessment_collaborators_updated_at'
  ) THEN
    CREATE TRIGGER assessment_collaborators_updated_at
      BEFORE UPDATE ON public.assessment_collaborators
      FOR EACH ROW EXECUTE PROCEDURE set_updated_at();
  END IF;
END $$;

-- Backfill owner rows for existing assessments
INSERT INTO public.assessment_collaborators (assessment_id, user_id, role, invited_by)
SELECT a.id, a.owner_user_id, 'owner', NULL
FROM public.assessments a
ON CONFLICT (assessment_id, user_id) DO NOTHING;

-- RLS helpers: avoid infinite recursion when policies reference assessment_collaborators
-- from policies on the same table (or assessments ↔ collaborators). SECURITY DEFINER
-- reads membership without re-applying RLS on assessment_collaborators.
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

-- ---------------------------------------------------------------------------
-- RPC: list assessments visible to the current user with resolved role
-- ---------------------------------------------------------------------------
CREATE OR REPLACE FUNCTION public.list_my_assessments()
RETURNS TABLE (
  id uuid,
  organisation_name text,
  created_at timestamptz,
  updated_at timestamptz,
  my_role text,
  owner_user_id uuid
)
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT
    a.id,
    a.organisation_name,
    a.created_at,
    a.updated_at,
    CASE
      WHEN a.owner_user_id = auth.uid() THEN 'owner'::text
      ELSE ac.role::text
    END,
    a.owner_user_id
  FROM public.assessments a
  LEFT JOIN public.assessment_collaborators ac
    ON ac.assessment_id = a.id AND ac.user_id = auth.uid()
  WHERE a.owner_user_id = auth.uid()
     OR ac.user_id IS NOT NULL;
$$;

GRANT EXECUTE ON FUNCTION public.list_my_assessments() TO authenticated;

-- ---------------------------------------------------------------------------
-- RPC: list collaborators (includes email from auth.users)
-- ---------------------------------------------------------------------------
CREATE OR REPLACE FUNCTION public.list_assessment_collaborators(p_assessment_id uuid)
RETURNS TABLE (
  id uuid,
  user_id uuid,
  email text,
  role text,
  invited_by uuid,
  created_at timestamptz
)
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT
    ac.id,
    ac.user_id,
    u.email::text,
    ac.role,
    ac.invited_by,
    ac.created_at
  FROM public.assessment_collaborators ac
  JOIN auth.users u ON u.id = ac.user_id
  WHERE ac.assessment_id = p_assessment_id
    AND (
      EXISTS (
        SELECT 1 FROM public.assessments a
        WHERE a.id = p_assessment_id AND a.owner_user_id = auth.uid()
      )
      OR EXISTS (
        SELECT 1 FROM public.assessment_collaborators ac2
        WHERE ac2.assessment_id = p_assessment_id AND ac2.user_id = auth.uid()
      )
    );
$$;

GRANT EXECUTE ON FUNCTION public.list_assessment_collaborators(uuid) TO authenticated;

-- ---------------------------------------------------------------------------
-- RPC: add collaborator by email (owner only; validated inside)
-- ---------------------------------------------------------------------------
CREATE OR REPLACE FUNCTION public.add_assessment_collaborator_by_email(
  p_assessment_id uuid,
  p_email text,
  p_role text
)
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_owner uuid;
  v_target uuid;
  v_email text;
BEGIN
  v_email := lower(trim(p_email));
  IF p_role NOT IN ('editor', 'reviewer', 'viewer') THEN
    RAISE EXCEPTION 'invalid role';
  END IF;
  SELECT owner_user_id INTO v_owner FROM public.assessments WHERE id = p_assessment_id;
  IF v_owner IS NULL OR v_owner <> auth.uid() THEN
    RAISE EXCEPTION 'not allowed';
  END IF;
  SELECT au.id INTO v_target FROM auth.users au WHERE au.email = v_email;
  IF v_target IS NULL THEN
    RAISE EXCEPTION 'user not found for this email';
  END IF;
  IF v_target = v_owner THEN
    RAISE EXCEPTION 'owner already has access';
  END IF;
  INSERT INTO public.assessment_collaborators (assessment_id, user_id, role, invited_by)
  VALUES (p_assessment_id, v_target, p_role, auth.uid())
  ON CONFLICT (assessment_id, user_id) DO UPDATE
  SET
    role = EXCLUDED.role,
    invited_by = EXCLUDED.invited_by,
    updated_at = now();
END;
$$;

GRANT EXECUTE ON FUNCTION public.add_assessment_collaborator_by_email(uuid, text, text) TO authenticated;

-- ---------------------------------------------------------------------------
-- RLS: assessment_collaborators
-- ---------------------------------------------------------------------------
ALTER TABLE public.assessment_collaborators ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Collaborators read team" ON public.assessment_collaborators;
DROP POLICY IF EXISTS "Owners insert collaborators" ON public.assessment_collaborators;
DROP POLICY IF EXISTS "Owners update collaborators" ON public.assessment_collaborators;
DROP POLICY IF EXISTS "Owners delete collaborators" ON public.assessment_collaborators;

CREATE POLICY "Collaborators read team"
  ON public.assessment_collaborators
  FOR SELECT
  TO authenticated
  USING (public.rls_user_has_assessment_access(assessment_collaborators.assessment_id));

CREATE POLICY "Owners insert collaborators"
  ON public.assessment_collaborators
  FOR INSERT
  TO authenticated
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM public.assessments a
      WHERE a.id = assessment_collaborators.assessment_id
        AND a.owner_user_id = auth.uid()
    )
  );

CREATE POLICY "Owners update collaborators"
  ON public.assessment_collaborators
  FOR UPDATE
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM public.assessments a
      WHERE a.id = assessment_collaborators.assessment_id
        AND a.owner_user_id = auth.uid()
    )
  )
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM public.assessments a
      WHERE a.id = assessment_collaborators.assessment_id
        AND a.owner_user_id = auth.uid()
    )
  );

CREATE POLICY "Owners delete collaborators"
  ON public.assessment_collaborators
  FOR DELETE
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM public.assessments a
      WHERE a.id = assessment_collaborators.assessment_id
        AND a.owner_user_id = auth.uid()
    )
    AND assessment_collaborators.role <> 'owner'
  );

-- ---------------------------------------------------------------------------
-- Replace assessments policies (shared read; owner|editor write)
-- ---------------------------------------------------------------------------
DROP POLICY IF EXISTS "Users own assessments select" ON public.assessments;
DROP POLICY IF EXISTS "Users own assessments insert" ON public.assessments;
DROP POLICY IF EXISTS "Users own assessments update" ON public.assessments;
DROP POLICY IF EXISTS "Users own assessments delete" ON public.assessments;

CREATE POLICY "Users read owned or shared assessments"
  ON public.assessments
  FOR SELECT
  TO authenticated
  USING (public.rls_user_has_assessment_access(assessments.id));

CREATE POLICY "Users create assessments as owner"
  ON public.assessments
  FOR INSERT
  TO authenticated
  WITH CHECK (owner_user_id = auth.uid());

CREATE POLICY "Owners and editors update assessments"
  ON public.assessments
  FOR UPDATE
  TO authenticated
  USING (public.rls_user_can_edit_assessment(assessments.id));

-- Prevent reassignment of owner_user_id (RLS cannot compare OLD vs NEW reliably in WITH CHECK)
CREATE OR REPLACE FUNCTION public.assessments_prevent_owner_change()
RETURNS TRIGGER
LANGUAGE plpgsql
AS $$
BEGIN
  IF NEW.owner_user_id IS DISTINCT FROM OLD.owner_user_id THEN
    RAISE EXCEPTION 'Cannot reassign assessment owner';
  END IF;
  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS assessments_prevent_owner_change ON public.assessments;

CREATE TRIGGER assessments_prevent_owner_change
  BEFORE UPDATE ON public.assessments
  FOR EACH ROW EXECUTE PROCEDURE public.assessments_prevent_owner_change();

CREATE POLICY "Owners delete assessments"
  ON public.assessments
  FOR DELETE
  TO authenticated
  USING (owner_user_id = auth.uid());

-- ---------------------------------------------------------------------------
-- Replace child table policies
-- ---------------------------------------------------------------------------
DROP POLICY IF EXISTS "Users own scope selections" ON public.assessment_scope_selections;
DROP POLICY IF EXISTS "Users own answers" ON public.assessment_answers;
DROP POLICY IF EXISTS "Users own action items" ON public.assessment_action_items;

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
