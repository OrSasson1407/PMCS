import apiClient from './client';

export interface BranchRisk {
  branch_name:          string;
  risk_score:           number;
  latest_commit?:       string;
  last_updated?:        string;
  open_conflict_count?: number;
  overlapping_branches: string[];
  critical_files:       string[];
}

export interface BranchRiskResponse {
  data:   BranchRisk[];
  source: string;
}

export const fetchBranchRisks = async (repoId: string): Promise<BranchRisk[]> => {
  const response = await apiClient.get<BranchRiskResponse>(
    `/repos/${repoId}/risk/branches`
  );
  return response.data.data;
};

export interface OnDemandAnalysisRequest {
  base_commit:   string;
  target_commit: string;
}

export interface OnDemandAnalysisResponse {
  base_commit:       string;
  target_commit:     string;
  probability_score: number;
  ast_diff_tree:     unknown[];
  critical_files:    string[];
  risk_event_id:     string | null;
  source:            string;
}

export const triggerOnDemandAnalysis = async (
  payload: OnDemandAnalysisRequest
): Promise<OnDemandAnalysisResponse> => {
  const response = await apiClient.post<OnDemandAnalysisResponse>(
    '/ast/analyze/ondemand',
    payload
  );
  return response.data;
};
