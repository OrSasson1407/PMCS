import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useQuery } from '@tanstack/react-query';
import { fetchRepos, fetchRiskHistory, RiskEvent, Repo } from '../api/risk';
import { clearToken } from '../api/auth';

const getStatusColor = (status: string): string => {
  switch (status) {
    case 'OPEN':            return '#ef4444';
    case 'RESOLVED_MANUAL': return '#22c55e';
    case 'RESOLVED_AI':     return '#a78bfa';
    default:                return '#6b7280';
  }
};

const getScoreColor = (score: number): string => {
  if (score >= 0.75) return '#ef4444';
  if (score >= 0.50) return '#f97316';
  if (score >= 0.25) return '#eab308';
  return '#22c55e';
};

const RiskEventRow = ({ event }: { event: RiskEvent }) => (
  <tr style={{ borderBottom: '1px solid #1f1f1f' }}>
    <td style={{ padding: '12px 16px', fontFamily: 'monospace', fontSize: '11px', color: '#6b7280' }}>
      {event.id.slice(0, 8)}...
    </td>
    <td style={{ padding: '12px 16px', fontFamily: 'monospace', fontSize: '12px', color: '#a78bfa' }}>
      {event.branch_a_name ?? event.branch_a_id.slice(0, 8)}
    </td>
    <td style={{ padding: '12px 16px', color: '#4b5563', fontSize: '12px', textAlign: 'center' }}>vs</td>
    <td style={{ padding: '12px 16px', fontFamily: 'monospace', fontSize: '12px', color: '#a78bfa' }}>
      {event.branch_b_name ?? event.branch_b_id.slice(0, 8)}
    </td>
    <td style={{ padding: '12px 16px' }}>
      <span style={{ color: getScoreColor(event.probability_score), fontWeight: 700, fontSize: '13px' }}>
        {(event.probability_score * 100).toFixed(0)}%
      </span>
    </td>
    <td style={{ padding: '12px 16px' }}>
      <span style={{
        backgroundColor: getStatusColor(event.status) + '22',
        color: getStatusColor(event.status),
        padding: '3px 10px',
        borderRadius: '9999px',
        fontSize: '11px',
        fontWeight: 600,
        textTransform: 'uppercase',
      }}>
        {event.status.replace('_', ' ')}
      </span>
    </td>
    <td style={{ padding: '12px 16px', color: '#4b5563', fontSize: '11px' }}>
      {new Date(event.created_at).toLocaleString()}
    </td>
  </tr>
);

const History = () => {
  const navigate = useNavigate();
  const [selectedRepoId, setSelectedRepoId] = useState('');

  const { data: repos, isLoading: reposLoading } = useQuery({
    queryKey: ['repos'],
    queryFn:  fetchRepos,
    onSuccess: (data: Repo[]) => {
      if (data.length > 0 && !selectedRepoId) setSelectedRepoId(data[0].id);
    },
  } as any);

  const { data: events, isLoading, isError, refetch } = useQuery({
    queryKey: ['riskHistory', selectedRepoId],
    queryFn:  () => fetchRiskHistory(selectedRepoId),
    enabled:  !!selectedRepoId,
    refetchInterval: 60000,
  });

  const openCount     = events?.filter(e => e.status === 'OPEN').length ?? 0;
  const resolvedCount = events?.filter(e => e.status !== 'OPEN').length ?? 0;

  return (
    <div style={{ minHeight: '100vh', backgroundColor: '#0f0f0f', color: '#f3f4f6', fontFamily: 'Inter, sans-serif' }}>

      <header style={{ backgroundColor: '#1a1a1a', borderBottom: '1px solid #2d2d2d', padding: '16px 32px', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: '24px' }}>
          <h1 style={{ margin: 0, fontSize: '18px', fontWeight: 700, color: '#a78bfa' }}>⚡ PMCS</h1>
          <nav style={{ display: 'flex', gap: '4px' }}>
            <button onClick={() => navigate('/dashboard')} style={{ backgroundColor: 'transparent', color: '#6b7280', border: 'none', padding: '6px 12px', cursor: 'pointer', borderRadius: '6px', fontSize: '13px' }}>Dashboard</button>
            <button style={{ backgroundColor: '#1f1f1f', color: '#f3f4f6', border: '1px solid #2d2d2d', padding: '6px 12px', cursor: 'pointer', borderRadius: '6px', fontSize: '13px' }}>History</button>
          </nav>
        </div>
        <div style={{ display: 'flex', gap: '10px', alignItems: 'center' }}>
          {repos && (
            <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
              <label style={{ color: '#6b7280', fontSize: '12px' }}>Repo</label>
              <select value={selectedRepoId} onChange={e => setSelectedRepoId(e.target.value)}
                style={{ backgroundColor: '#1f1f1f', color: '#f3f4f6', border: '1px solid #2d2d2d', borderRadius: '6px', padding: '6px 12px', fontSize: '13px' }}>
                {repos.map((r: Repo) => <option key={r.id} value={r.id}>{r.name}</option>)}
              </select>
            </div>
          )}
          <button onClick={() => refetch()} style={{ backgroundColor: '#1f1f1f', color: '#9ca3af', border: '1px solid #2d2d2d', borderRadius: '6px', padding: '7px 14px', cursor: 'pointer', fontSize: '13px' }}>↻</button>
          <button onClick={() => { clearToken(); navigate('/login'); }} style={{ backgroundColor: 'transparent', color: '#6b7280', border: '1px solid #2d2d2d', borderRadius: '6px', padding: '7px 14px', cursor: 'pointer', fontSize: '13px' }}>Sign out</button>
        </div>
      </header>

      <main style={{ padding: '32px' }}>
        <div style={{ display: 'flex', gap: '16px', marginBottom: '24px' }}>
          <div style={{ backgroundColor: '#141414', border: '1px solid #1f1f1f', borderRadius: '8px', padding: '16px 24px', minWidth: '120px' }}>
            <p style={{ margin: 0, color: '#6b7280', fontSize: '11px', textTransform: 'uppercase', letterSpacing: '0.08em' }}>Open</p>
            <p style={{ margin: '4px 0 0', color: '#ef4444', fontSize: '28px', fontWeight: 700 }}>{openCount}</p>
          </div>
          <div style={{ backgroundColor: '#141414', border: '1px solid #1f1f1f', borderRadius: '8px', padding: '16px 24px', minWidth: '120px' }}>
            <p style={{ margin: 0, color: '#6b7280', fontSize: '11px', textTransform: 'uppercase', letterSpacing: '0.08em' }}>Resolved</p>
            <p style={{ margin: '4px 0 0', color: '#22c55e', fontSize: '28px', fontWeight: 700 }}>{resolvedCount}</p>
          </div>
          <div style={{ backgroundColor: '#141414', border: '1px solid #1f1f1f', borderRadius: '8px', padding: '16px 24px', minWidth: '120px' }}>
            <p style={{ margin: 0, color: '#6b7280', fontSize: '11px', textTransform: 'uppercase', letterSpacing: '0.08em' }}>Total</p>
            <p style={{ margin: '4px 0 0', color: '#f3f4f6', fontSize: '28px', fontWeight: 700 }}>{events?.length ?? 0}</p>
          </div>
        </div>

        {(reposLoading || isLoading) && <div style={{ color: '#6b7280', padding: '40px', textAlign: 'center' }}>Loading history...</div>}
        {isError && <div style={{ color: '#ef4444', padding: '16px' }}>⚠ Failed to load risk history.</div>}

        {events && events.length > 0 && (
          <div style={{ backgroundColor: '#141414', borderRadius: '8px', border: '1px solid #1f1f1f', overflow: 'hidden' }}>
            <table style={{ width: '100%', borderCollapse: 'collapse' }}>
              <thead>
                <tr style={{ backgroundColor: '#0f0f0f' }}>
                  {['ID', 'Branch A', '', 'Branch B', 'Score', 'Status', 'Created'].map(h => (
                    <th key={h} style={{ padding: '10px 16px', fontSize: '11px', color: '#4b5563', textTransform: 'uppercase', letterSpacing: '0.08em', textAlign: 'left' }}>{h}</th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {events.map(event => <RiskEventRow key={event.id} event={event} />)}
              </tbody>
            </table>
          </div>
        )}

        {events && events.length === 0 && (
          <div style={{ color: '#6b7280', padding: '40px', textAlign: 'center' }}>No risk events found for this repository.</div>
        )}
      </main>
    </div>
  );
};

export default History;
