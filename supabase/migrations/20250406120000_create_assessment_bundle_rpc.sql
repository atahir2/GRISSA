-- Atomic assessment creation for server actions: SECURITY DEFINER bypasses RLS on INSERT
-- while still binding owner to auth.uid() (JWT must be present on the RPC request).

CREATE OR REPLACE FUNCTION public.create_assessment_bundle(p_organisation_name text)
RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  aid uuid;
  v_org text;
  v_created timestamptz;
  v_updated timestamptz;
  uid uuid := auth.uid();
BEGIN
  IF uid IS NULL THEN
    RAISE EXCEPTION 'Not authenticated';
  END IF;
  IF p_organisation_name IS NULL OR length(trim(p_organisation_name)) = 0 THEN
    RAISE EXCEPTION 'Organisation name required';
  END IF;

  INSERT INTO public.assessments (organisation_name, owner_user_id)
  VALUES (trim(p_organisation_name), uid)
  RETURNING id, organisation_name, created_at, updated_at
  INTO aid, v_org, v_created, v_updated;

  INSERT INTO public.assessment_collaborators (assessment_id, user_id, role, invited_by)
  VALUES (aid, uid, 'owner', NULL);

  INSERT INTO public.assessment_versions (assessment_id, version_number, label, status, created_by)
  VALUES (aid, 1, NULL, 'draft', uid);

  RETURN jsonb_build_object(
    'id', aid,
    'organisation_name', v_org,
    'created_at', v_created,
    'updated_at', v_updated
  );
END;
$$;

REVOKE ALL ON FUNCTION public.create_assessment_bundle(text) FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.create_assessment_bundle(text) TO authenticated;

COMMENT ON FUNCTION public.create_assessment_bundle(text) IS
  'Creates assessment, owner collaborator row, and initial draft version in one transaction; uses auth.uid() for ownership.';
