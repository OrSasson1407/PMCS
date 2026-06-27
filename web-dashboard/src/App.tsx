import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import Dashboard from './pages/Dashboard';
import Login from './pages/Login';
import { getStoredToken } from './api/auth';

const queryClient = new QueryClient({
  defaultOptions: { queries: { retry: 2, staleTime: 15000 } },
});

const PrivateRoute = ({ children }: { children: JSX.Element }) => {
  return getStoredToken() ? children : <Navigate to="/login" replace />;
};

const App = () => (
  <QueryClientProvider client={queryClient}>
    <BrowserRouter>
      <Routes>
        <Route path="/login"     element={<Login />} />
        <Route path="/dashboard" element={<PrivateRoute><Dashboard /></PrivateRoute>} />
        <Route path="*"          element={<Navigate to="/login" replace />} />
      </Routes>
    </BrowserRouter>
  </QueryClientProvider>
);

export default App;
