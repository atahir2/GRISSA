-- Phase 3: versioned assessments — assessment_versions + version_id on runtime rows.

-- ---------------------------------------------------------------------------
-- assessment_versions
-- ---------------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS public.assessment_versions (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  assessment_id UUID NOT NULL REFERENCES public.assessments(id) ON DELETE CASCADE,
  version_number INTEGER NOT NULL,
  label TEXT NULL,
  status TEXT NOT NULL CHECK (status IN ('draft', 'submitted', 'reviewed', 'archived')),
  created_by UUID NOT NULL REFERENCES auth.users(id),
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  UNIQUE(assessment_id, version_number)
);

CREATE INDEX IF NOT EXISTS idx_assessment_versions_assessment_id
  ON public.assessment_versions(assessment_id);

COMMENT ON TABLE public.assessment_versions IS 'Saved snapshots of an assessment over time; runtime state is keyed by version_id.';

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_trigger WHERE tgname = 'assessment_versions_updated_at'
  ) THEN
    CREATE TRIGGER assessment_versions_updated_at
      BEFORE UPDATE ON public.assessment_versions
      FOR EACH ROW EXECUTE PROCEDURE public.set_updated_at();
  END IF;
END $$;

-- One initial version per existing assessment (draft; creator = owner)
INSERT INTO public.assessment_versions (assessment_id, version_number, label, status, created_by)
SELECT a.id, 1, NULL, 'draft', a.owner_user_id
FROM public.assessments a
WHERE NOT EXISTS (
  SELECT 1 FROM public.assessment_versions av
  WHERE av.assessment_id = a.id AND av.version_number = 1
);

-- ---------------------------------------------------------------------------
-- version_id on runtime tables (keep assessment_id for denormalized RLS / queries)
-- ---------------------------------------------------------------------------
ALTER TABLE public.assessment_scope_selections
  ADD COLUMN IF NOT EXISTS version_id UUID REFERENCES public.assessment_versions(id) ON DELETE CASCADE;

ALTER TABLE public.assessment_answers
  ADD COLUMN IF NOT EXISTS version_id UUID REFERENCES public.assessment_versions(id) ON DELETE CASCADE;

ALTER TABLE public.assessment_action_items
  ADD COLUMN IF NOT EXISTS version_id UUID REFERENCES public.assessment_versions(id) ON DELETE CASCADE;

UPDATE public.assessment_scope_selections ass
SET version_id = av.id
FROM public.assessment_versions av
WHERE av.assessment_id = ass.assessment_id
  AND av.version_number = 1
  AND ass.version_id IS NULL;

UPDATE public.assessment_answers aa
SET version_id = av.id
FROM public.assessment_versions av
WHERE av.assessment_id = aa.assessment_id
  AND av.version_number = 1
  AND aa.version_id IS NULL;

UPDATE public.assessment_action_items ai
SET version_id = av.id
FROM public.assessment_versions av
WHERE av.assessment_id = ai.assessment_id
  AND av.version_number = 1
  AND ai.version_id IS NULL;

ALTER TABLE public.assessment_scope_selections
  ALTER COLUMN version_id SET NOT NULL;

ALTER TABLE public.assessment_answers
  ALTER COLUMN version_id SET NOT NULL;

ALTER TABLE public.assessment_action_items
  ALTER COLUMN version_id SET NOT NULL;

-- Replace uniqueness: per-version instead of per-assessment
ALTER TABLE public.assessment_scope_selections
  DROP CONSTRAINT IF EXISTS assessment_scope_selections_assessment_id_scope_id_key;

ALTER TABLE public.assessment_answers
  DROP CONSTRAINT IF EXISTS assessment_answers_assessment_id_question_id_key;

ALTER TABLE public.assessment_action_items
  DROP CONSTRAINT IF EXISTS assessment_action_items_assessment_id_question_id_key;

CREATE UNIQUE INDEX IF NOT EXISTS uq_scope_selections_version_scope
  ON public.assessment_scope_selections(version_id, scope_id);

CREATE UNIQUE INDEX IF NOT EXISTS uq_answers_version_question
  ON public.assessment_answers(version_id, question_id);

CREATE UNIQUE INDEX IF NOT EXISTS uq_action_items_version_question
  ON public.assessment_action_items(version_id, question_id);

CREATE INDEX IF NOT EXISTS idx_assessment_scope_selections_version_id
  ON public.assessment_scope_selections(version_id);

CREATE INDEX IF NOT EXISTS idx_assessment_answers_version_id
  ON public.assessment_answers(version_id);

CREATE INDEX IF NOT EXISTS idx_assessment_action_items_version_id
  ON public.assessment_action_items(version_id);

-- ---------------------------------------------------------------------------
-- RLS helpers for version-scoped rows
-- ---------------------------------------------------------------------------
CREATE OR REPLACE FUNCTION public.rls_user_has_version_access(p_version_id uuid)
RETURNS boolean
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT EXISTS (
    SELECT 1 FROM public.assessment_versions av
    WHERE av.id = p_version_id
      AND public.rls_user_has_assessment_access(av.assessment_id)
  );
$$;

CREATE OR REPLACE FUNCTION public.rls_user_can_edit_version(p_version_id uuid)
RETURNS boolean
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT EXISTS (
    SELECT 1 FROM public.assessment_versions av
    WHERE av.id = p_version_id
      AND public.rls_user_can_edit_assessment(av.assessment_id)
  );
$$;

GRANT EXECUTE ON FUNCTION public.rls_user_has_version_access(uuid) TO authenticated;
GRANT EXECUTE ON FUNCTION public.rls_user_can_edit_version(uuid) TO authenticated;

-- ---------------------------------------------------------------------------
-- assessment_versions RLS
-- ---------------------------------------------------------------------------
ALTER TABLE public.assessment_versions ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Versions select" ON public.assessment_versions;
DROP POLICY IF EXISTS "Versions insert" ON public.assessment_versions;
DROP POLICY IF EXISTS "Versions update" ON public.assessment_versions;

CREATE POLICY "Versions select"
  ON public.assessment_versions
  FOR SELECT
  TO authenticated
  USING (public.rls_user_has_assessment_access(assessment_id));

CREATE POLICY "Versions insert"
  ON public.assessment_versions
  FOR INSERT
  TO authenticated
  WITH CHECK (
    public.rls_user_can_edit_assessment(assessment_id)
    AND created_by = auth.uid()
  );

CREATE POLICY "Versions update"
  ON public.assessment_versions
  FOR UPDATE
  TO authenticated
  USING (public.rls_user_can_edit_assessment(assessment_id))
  WITH CHECK (public.rls_user_can_edit_assessment(assessment_id));

-- ---------------------------------------------------------------------------
-- Runtime tables: policies use version_id (owner/editor write; all roles read)
-- ---------------------------------------------------------------------------
DROP POLICY IF EXISTS "Shared read scope selections" ON public.assessment_scope_selections;
DROP POLICY IF EXISTS "Owners and editors write scope selections" ON public.assessment_scope_selections;
DROP POLICY IF EXISTS "Owners and editors update scope selections" ON public.assessment_scope_selections;
DROP POLICY IF EXISTS "Owners and editors delete scope selections" ON public.assessment_scope_selections;

CREATE POLICY "Shared read scope selections"
  ON public.assessment_scope_selections
  FOR SELECT
  TO authenticated
  USING (public.rls_user_has_version_access(version_id));

CREATE POLICY "Owners and editors write scope selections"
  ON public.assessment_scope_selections
  FOR INSERT
  TO authenticated
  WITH CHECK (public.rls_user_can_edit_version(version_id));

CREATE POLICY "Owners and editors update scope selections"
  ON public.assessment_scope_selections
  FOR UPDATE
  TO authenticated
  USING (public.rls_user_can_edit_version(version_id))
  WITH CHECK (public.rls_user_can_edit_version(version_id));

CREATE POLICY "Owners and editors delete scope selections"
  ON public.assessment_scope_selections
  FOR DELETE
  TO authenticated
  USING (public.rls_user_can_edit_version(version_id));

DROP POLICY IF EXISTS "Shared read answers" ON public.assessment_answers;
DROP POLICY IF EXISTS "Owners and editors write answers" ON public.assessment_answers;
DROP POLICY IF EXISTS "Owners and editors update answers" ON public.assessment_answers;
DROP POLICY IF EXISTS "Owners and editors delete answers" ON public.assessment_answers;

CREATE POLICY "Shared read answers"
  ON public.assessment_answers
  FOR SELECT
  TO authenticated
  USING (public.rls_user_has_version_access(version_id));

CREATE POLICY "Owners and editors write answers"
  ON public.assessment_answers
  FOR INSERT
  TO authenticated
  WITH CHECK (public.rls_user_can_edit_version(version_id));

CREATE POLICY "Owners and editors update answers"
  ON public.assessment_answers
  FOR UPDATE
  TO authenticated
  USING (public.rls_user_can_edit_version(version_id))
  WITH CHECK (public.rls_user_can_edit_version(version_id));

CREATE POLICY "Owners and editors delete answers"
  ON public.assessment_answers
  FOR DELETE
  TO authenticated
  USING (public.rls_user_can_edit_version(version_id));

DROP POLICY IF EXISTS "Shared read action items" ON public.assessment_action_items;
DROP POLICY IF EXISTS "Owners and editors write action items" ON public.assessment_action_items;
DROP POLICY IF EXISTS "Owners and editors update action items" ON public.assessment_action_items;
DROP POLICY IF EXISTS "Owners and editors delete action items" ON public.assessment_action_items;

CREATE POLICY "Shared read action items"
  ON public.assessment_action_items
  FOR SELECT
  TO authenticated
  USING (public.rls_user_has_version_access(version_id));

CREATE POLICY "Owners and editors write action items"
  ON public.assessment_action_items
  FOR INSERT
  TO authenticated
  WITH CHECK (public.rls_user_can_edit_version(version_id));

CREATE POLICY "Owners and editors update action items"
  ON public.assessment_action_items
  FOR UPDATE
  TO authenticated
  USING (public.rls_user_can_edit_version(version_id))
  WITH CHECK (public.rls_user_can_edit_version(version_id));

CREATE POLICY "Owners and editors delete action items"
  ON public.assessment_action_items
  FOR DELETE
  TO authenticated
  USING (public.rls_user_can_edit_version(version_id));
