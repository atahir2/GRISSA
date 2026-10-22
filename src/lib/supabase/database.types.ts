export interface ProfileRow {
  id: string;
  full_name: string | null;
  organisation_name: string | null;
  created_at: string;
  updated_at: string;
}

export interface AssessmentRow {
  id: string;
  organisation_name: string;
  owner_user_id: string;
  created_at: string;
  updated_at: string;
}

export interface AssessmentVersionRow {
  id: string;
  assessment_id: string;
  version_number: number;
  label: string | null;
  status: string;
  created_by: string;
  created_at: string;
  updated_at: string;
}

export interface AssessmentScopeSelectionRow {
  id: string;
  assessment_id: string;
  version_id: string;
  scope_id: string;
  in_scope: boolean;
  target_capability: number | null;
  created_at: string;
  updated_at: string;
}

export interface AssessmentAnswerRow {
  id: string;
  assessment_id: string;
  version_id: string;
  question_id: string;
  selected_score: number | null;
  created_at: string;
  updated_at: string;
}

export interface AssessmentActionItemRow {
  id: string;
  assessment_id: string;
  version_id: string;
  question_id: string;
  effort_required: string | null;
  leader: string | null;
  deadline: string | null;
  status: string | null;
  remarks: string | null;
  created_at: string;
  updated_at: string;
}

export interface AssessmentCollaboratorRow {
  id: string;
  assessment_id: string;
  user_id: string;
  role: string;
  invited_by: string | null;
  created_at: string;
  updated_at: string;
}
