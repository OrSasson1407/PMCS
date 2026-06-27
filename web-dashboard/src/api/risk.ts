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

export interface Repo {
  id:             string;
  vcs_id:         string;
  name:           string;
  default_branch: string;
}

export const fetchRepos = async (): Promise<Repo[]> => {
  const response = await apiClient.get<{ repos: Repo[] }>('/repos');
  return response.data.repos;
};

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

export interface RiskEvent {
  id:                string;
  branch_a_id:       string;
  branch_b_id:       string;
  branch_a_name?:    string;
  branch_b_name?:    string;
  probability_score: number;
  status:            'OPEN' | 'RESOLVED_MANUAL' | 'RESOLVED_AI';
  created_at:        string;
}

export const fetchRiskHistory = async (repoId: string): Promise<RiskEvent[]> => {
  const response = await apiClient.get<{ events: RiskEvent[] }>(
    `/repos/${repoId}/risk/history`
  );
  return response.data.events;
};
