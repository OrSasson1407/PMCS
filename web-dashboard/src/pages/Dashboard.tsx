import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useQuery } from '@tanstack/react-query';
import { fetchBranchRisks, fetchRepos, BranchRisk, Repo } from '../api/risk';
import { clearToken } from '../api/auth';

const POLL_INTERVAL = 30000;

const getRiskColor = (score: number): string => {
  if (score >= 0.75) return '#ef4444';
  if (score >= 0.50) return '#f97316';
  if (score >= 0.25) return '#eab308';
  return '#22c55e';
};

const getRiskLabel = (score: number): string => {
  if (score >= 0.75) return 'CRITICAL';
  if (score >= 0.50) return 'HIGH';
  if (score >= 0.25) return 'MEDIUM';
  return 'LOW';
};

const RiskBar = ({ score }: { score: number }) => (
  <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
    <div style={{ flex: 1, backgroundColor: '#2d2d2d', borderRadius: '9999px', height: '6px' }}>
      <div style={{ width: `${score * 100}%`, backgroundColor: getRiskColor(score), height: '6px', borderRadius: '9999px', transition: 'width 0.3s ease' }} />
    </div>
    <span style={{ color: getRiskColor(score), fontSize: '12px', fontWeight: 700, minWidth: '100px' }}>
      {getRiskLabel(score)} {(score * 100).toFixed(0)}%
    </span>
  </div>
);

const BranchRiskRow = ({ branch }: { branch: BranchRisk }) => (
  <tr style={{ borderBottom: '1px solid #1f1f1f' }}>
    <td style={{ padding: '14px 16px', fontFamily: 'monospace', color: '#a78bfa', fontSize: '13px' }}>
      {branch.branch_name}
    </td>
    <td style={{ padding: '14px 16px', minWidth: '220px' }}>
      <RiskBar score={branch.risk_score} />
    </td>
    <td style={{ padding: '14px 16px', color: '#6b7280', fontSize: '12px', textAlign: 'center' }}>
      {(branch as any).open_conflict_count ?? 0}
    </td>
    <td style={{ padding: '14px 16px', fontFamily: 'monospace', fontSize: '11px', color: '#6b7280' }}>
      {branch.latest_commit?.slice(0, 8) ?? '—'}
    </td>
  </tr>
);

const RepoSelector = ({ repos, selected, onSelect }: {
  repos: Repo[];
  selected: string;
  onSelect: (id: string) => void;
}) => (
  <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
    <label style={{ color: '#6b7280', fontSize: '12px', textTransform: 'uppercase', letterSpacing: '0.05em' }}>Repository</label>
    <select
      value={selected}
      onChange={e => onSelect(e.target.value)}
      style={{ backgroundColor: '#1f1f1f', color: '#f3f4f6', border: '1px solid #2d2d2d', borderRadius: '6px', padding: '6px 12px', fontSize: '13px', cursor: 'pointer' }}
    >
      {repos.map(r => (
        <option key={r.id} value={r.id}>{r.name}</option>
      ))}
    </select>
  </div>
);

const Dashboard = () => {
  const navigate = useNavigate();
  const [selectedRepoId, setSelectedRepoId] = useState('');

  const { data: repos, isLoading: reposLoading } = useQuery({
    queryKey: ['repos'],
    queryFn:  fetchRepos,
    onSuccess: (data: Repo[]) => {
      if (data.length > 0 && !selectedRepoId) {
        setSelectedRepoId(data[0].id);
      }
    },
  } as any);

  const selectedRepo = repos?.find((r: Repo) => r.id === selectedRepoId);

  const { data, isLoading, isError, dataUpdatedAt, refetch } = useQuery({
    queryKey:        ['branchRisks', selectedRepoId],
    queryFn:         () => fetchBranchRisks(selectedRepoId),
    enabled:         !!selectedRepoId,
    refetchInterval: POLL_INTERVAL,
    retry:           2,
  });

  const handleLogout = () => {
    clearToken();
    navigate('/login');
  };

  const lastUpdated = dataUpdatedAt
    ? new Date(dataUpdatedAt).toLocaleTimeString()
    : '—';

  return (
    <div style={{ minHeight: '100vh', backgroundColor: '#0f0f0f', color: '#f3f4f6', fontFamily: 'Inter, sans-serif' }}>

      <header style={{ backgroundColor: '#1a1a1a', borderBottom: '1px solid #2d2d2d', padding: '16px 32px', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
        <div>
          <h1 style={{ margin: 0, fontSize: '18px', fontWeight: 700, color: '#a78bfa' }}>⚡ PMCS Dashboard</h1>
          <p style={{ margin: '2px 0 0', fontSize: '12px', color: '#4b5563' }}>Last updated: {lastUpdated} · Auto-refresh every 30s</p>
        </div>
        <div style={{ display: 'flex', gap: '10px', alignItems: 'center' }}>
          {repos && (
            <RepoSelector
              repos={repos}
              selected={selectedRepoId}
              onSelect={setSelectedRepoId}
            />
          )}
          <button onClick={() => navigate('/history')} style={{ backgroundColor: 'transparent', color: '#6b7280', border: '1px solid #2d2d2d', borderRadius: '6px', padding: '7px 14px', cursor: 'pointer', fontSize: '13px' }}>History</button>
          <button onClick={() => refetch()} style={{ backgroundColor: '#1f1f1f', color: '#9ca3af', border: '1px solid #2d2d2d', borderRadius: '6px', padding: '7px 14px', cursor: 'pointer', fontSize: '13px' }}>↻</button>
          <button onClick={handleLogout} style={{ backgroundColor: 'transparent', color: '#6b7280', border: '1px solid #2d2d2d', borderRadius: '6px', padding: '7px 14px', cursor: 'pointer', fontSize: '13px' }}>Sign out</button>
        </div>
      </header>

      <main style={{ padding: '32px' }}>
        <div style={{ marginBottom: '24px' }}>
          <h2 style={{ fontSize: '14px', fontWeight: 600, color: '#6b7280', textTransform: 'uppercase', letterSpacing: '0.05em', margin: 0 }}>Branch Collision Risk</h2>
          {selectedRepo && (
            <p style={{ color: '#4b5563', fontSize: '12px', fontFamily: 'monospace', marginTop: '4px' }}>
              {selectedRepo.vcs_id} · default: {selectedRepo.default_branch}
            </p>
          )}
        </div>

        {(reposLoading || (isLoading && selectedRepoId)) && (
          <div style={{ color: '#6b7280', padding: '40px', textAlign: 'center' }}>Loading...</div>
        )}

        {isError && (
          <div style={{ backgroundColor: '#1f1f1f', border: '1px solid #991b1b', borderRadius: '8px', padding: '16px', color: '#ef4444' }}>
            ⚠ Failed to fetch risk data.
          </div>
        )}

        {!selectedRepoId && !reposLoading && (
          <div style={{ color: '#6b7280', padding: '40px', textAlign: 'center' }}>No repositories found for this organization.</div>
        )}

        {data && data.length === 0 && (
          <div style={{ color: '#6b7280', padding: '40px', textAlign: 'center' }}>No active branches found for this repository.</div>
        )}

        {data && data.length > 0 && (
          <div style={{ backgroundColor: '#141414', borderRadius: '8px', border: '1px solid #1f1f1f', overflow: 'hidden' }}>
            <table style={{ width: '100%', borderCollapse: 'collapse' }}>
              <thead>
                <tr style={{ backgroundColor: '#0f0f0f' }}>
                  <th style={{ padding: '10px 16px', fontSize: '11px', color: '#4b5563', textTransform: 'uppercase', letterSpacing: '0.08em', textAlign: 'left' }}>Branch</th>
                  <th style={{ padding: '10px 16px', fontSize: '11px', color: '#4b5563', textTransform: 'uppercase', letterSpacing: '0.08em', textAlign: 'left' }}>Risk Score</th>
                  <th style={{ padding: '10px 16px', fontSize: '11px', color: '#4b5563', textTransform: 'uppercase', letterSpacing: '0.08em', textAlign: 'center' }}>Conflicts</th>
                  <th style={{ padding: '10px 16px', fontSize: '11px', color: '#4b5563', textTransform: 'uppercase', letterSpacing: '0.08em', textAlign: 'left' }}>Commit</th>
                </tr>
              </thead>
              <tbody>
                {data.map((branch) => (
                  <BranchRiskRow key={branch.branch_name} branch={branch} />
                ))}
              </tbody>
            </table>
          </div>
        )}
      </main>
    </div>
  );
};

export default Dashboard;
