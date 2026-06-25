import apiClient from './client';

// ?? Types matching API Spec response schema ???????????????????????????????????
export interface BranchRisk {
  branch_name: string;
  risk_score: number;
  overlapping_branches: string[];
  critical_files: string[];
}

export interface BranchRiskResponse {
  data: BranchRisk[];
}

// ?? Fetch branch risk list for a given repo ???????????????????????????????????
export const fetchBranchRisks = async (repoId: string): Promise<BranchRisk[]> => {
  const response = await apiClient.get<BranchRiskResponse>(
    \/repos/\/risk/branches\
  );
  return response.data.data;
};

// ?? Trigger on-demand AST analysis ???????????????????????????????????????????
export interface OnDemandAnalysisRequest {
  base_commit: string;
  target_commit: string;
}

export interface OnDemandAnalysisResponse {
  base_commit: string;
  target_commit: string;
  ast_diff_tree: unknown[];
  semantic_conflicts: unknown[];
  message?: string;
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
