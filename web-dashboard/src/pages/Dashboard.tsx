import { useState } from 'react';
import { useQuery } from '@tanstack/react-query';
import { fetchBranchRisks, BranchRisk } from '../api/risk';

const DEMO_REPO_ID = 'demo-repo-1';

// ?? Risk badge color based on score ??????????????????????????????????????????
const getRiskColor = (score: number): string => {
  if (score >= 0.75) return '#ef4444';
  if (score >= 0.5) return '#f97316';
  if (score >= 0.25) return '#eab308';
  return '#22c55e';
};

const getRiskLabel = (score: number): string => {
  if (score >= 0.75) return 'CRITICAL';
  if (score >= 0.5) return 'HIGH';
  if (score >= 0.25) return 'MEDIUM';
  return 'LOW';
};

// ?? BranchRiskRow component ???????????????????????????????????????????????????
const BranchRiskRow = ({ branch }: { branch: BranchRisk }) => (
  <tr style={{ borderBottom: '1px solid #2d2d2d' }}>
    <td style={{ padding: '12px 16px', fontFamily: 'monospace', color: '#a78bfa' }}>
      {branch.branch_name}
    </td>
    <td style={{ padding: '12px 16px' }}>
      <span style={{
        backgroundColor: getRiskColor(branch.risk_score),
        color: '#fff',
        padding: '2px 10px',
        borderRadius: '9999px',
        fontSize: '12px',
        fontWeight: 700,
      }}>
        {getRiskLabel(branch.risk_score)} ({(branch.risk_score * 100).toFixed(0)}%)
      </span>
    </td>
    <td style={{ padding: '12px 16px', color: '#9ca3af', fontSize: '13px' }}>
      {branch.overlapping_branches.join(', ') || '—'}
    </td>
    <td style={{ padding: '12px 16px', fontFamily: 'monospace', fontSize: '12px', color: '#6ee7b7' }}>
      {branch.critical_files.join(', ') || '—'}
    </td>
  </tr>
);

// ?? Dashboard page ????????????????????????????????????????????????????????????
const Dashboard = () => {
  const [repoId] = useState(DEMO_REPO_ID);

  const { data, isLoading, isError, refetch } = useQuery({
    queryKey: ['branchRisks', repoId],
    queryFn: () => fetchBranchRisks(repoId),
    refetchInterval: 30000,
  });

  return (
    <div style={{ minHeight: '100vh', backgroundColor: '#0f0f0f', color: '#f3f4f6', fontFamily: 'Inter, sans-serif' }}>

      {/* ?? Header ??????????????????????????????????????????????????????????? */}
      <header style={{ backgroundColor: '#1a1a1a', borderBottom: '1px solid #2d2d2d', padding: '16px 32px', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
        <div>
          <h1 style={{ margin: 0, fontSize: '20px', fontWeight: 700, color: '#a78bfa' }}>
            ? PMCS Dashboard
          </h1>
          <p style={{ margin: '2px 0 0', fontSize: '13px', color: '#6b7280' }}>
            Predictive Merge Conflict Solver
          </p>
        </div>
        <button
          onClick={() => refetch()}
          style={{ backgroundColor: '#7c3aed', color: '#fff', border: 'none', borderRadius: '6px', padding: '8px 16px', cursor: 'pointer', fontSize: '13px' }}
        >
          ? Refresh
        </button>
      </header>

      {/* ?? Main Content ????????????????????????????????????????????????????? */}
      <main style={{ padding: '32px' }}>
        <h2 style={{ fontSize: '16px', fontWeight: 600, marginBottom: '16px', color: '#e5e7eb' }}>
          Branch Collision Risk — <span style={{ color: '#6b7280', fontFamily: 'monospace' }}>{repoId}</span>
        </h2>

        {isLoading && (
          <p style={{ color: '#6b7280' }}>Analyzing branches...</p>
        )}

        {isError && (
          <div style={{ backgroundColor: '#1f1f1f', border: '1px solid #ef4444', borderRadius: '8px', padding: '16px', color: '#ef4444' }}>
            ? Failed to fetch risk data. Ensure the API Gateway is running.
          </div>
        )}

        {data && (
          <div style={{ backgroundColor: '#1a1a1a', borderRadius: '8px', border: '1px solid #2d2d2d', overflow: 'hidden' }}>
            <table style={{ width: '100%', borderCollapse: 'collapse' }}>
              <thead>
                <tr style={{ backgroundColor: '#111', textAlign: 'left' }}>
                  <th style={{ padding: '12px 16px', fontSize: '12px', color: '#6b7280', textTransform: 'uppercase', letterSpacing: '0.05em' }}>Branch</th>
                  <th style={{ padding: '12px 16px', fontSize: '12px', color: '#6b7280', textTransform: 'uppercase', letterSpacing: '0.05em' }}>Risk Score</th>
                  <th style={{ padding: '12px 16px', fontSize: '12px', color: '#6b7280', textTransform: 'uppercase', letterSpacing: '0.05em' }}>Overlapping Branches</th>
                  <th style={{ padding: '12px 16px', fontSize: '12px', color: '#6b7280', textTransform: 'uppercase', letterSpacing: '0.05em' }}>Critical Files</th>
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
