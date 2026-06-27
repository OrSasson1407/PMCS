import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { login, storeToken } from '../api/auth';

const Login = () => {
  const navigate   = useNavigate();
  const [email,    setEmail]    = useState('dev@pmcs.dev');
  const [orgName,  setOrgName]  = useState('Acme Corp');
  const [error,    setError]    = useState('');
  const [loading,  setLoading]  = useState(false);

  const handleLogin = async () => {
    setLoading(true);
    setError('');
    try {
      const res = await login({ email, org_name: orgName });
      storeToken(res.token);
      navigate('/dashboard');
    } catch {
      setError('Login failed. Check your email and organization name.');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div style={{ minHeight: '100vh', backgroundColor: '#0f0f0f', display: 'flex', alignItems: 'center', justifyContent: 'center', fontFamily: 'Inter, sans-serif' }}>
      <div style={{ backgroundColor: '#1a1a1a', border: '1px solid #2d2d2d', borderRadius: '12px', padding: '40px', width: '100%', maxWidth: '400px' }}>
        <h1 style={{ color: '#a78bfa', fontSize: '24px', fontWeight: 700, marginBottom: '8px' }}>⚡ PMCS</h1>
        <p style={{ color: '#6b7280', fontSize: '14px', marginBottom: '32px' }}>Predictive Merge Conflict Solver</p>

        <div style={{ marginBottom: '16px' }}>
          <label style={{ display: 'block', color: '#9ca3af', fontSize: '12px', marginBottom: '6px', textTransform: 'uppercase', letterSpacing: '0.05em' }}>Email</label>
          <input
            type="email"
            value={email}
            onChange={e => setEmail(e.target.value)}
            style={{ width: '100%', backgroundColor: '#111', border: '1px solid #2d2d2d', borderRadius: '6px', padding: '10px 12px', color: '#f3f4f6', fontSize: '14px', boxSizing: 'border-box' }}
          />
        </div>

        <div style={{ marginBottom: '24px' }}>
          <label style={{ display: 'block', color: '#9ca3af', fontSize: '12px', marginBottom: '6px', textTransform: 'uppercase', letterSpacing: '0.05em' }}>Organization</label>
          <input
            type="text"
            value={orgName}
            onChange={e => setOrgName(e.target.value)}
            style={{ width: '100%', backgroundColor: '#111', border: '1px solid #2d2d2d', borderRadius: '6px', padding: '10px 12px', color: '#f3f4f6', fontSize: '14px', boxSizing: 'border-box' }}
          />
        </div>

        {error && <p style={{ color: '#ef4444', fontSize: '13px', marginBottom: '16px' }}>{error}</p>}

        <button
          onClick={handleLogin}
          disabled={loading}
          style={{ width: '100%', backgroundColor: loading ? '#4c1d95' : '#7c3aed', color: '#fff', border: 'none', borderRadius: '6px', padding: '12px', cursor: loading ? 'not-allowed' : 'pointer', fontSize: '14px', fontWeight: 600 }}
        >
          {loading ? 'Signing in...' : 'Sign In'}
        </button>
      </div>
    </div>
  );
};

export default Login;
