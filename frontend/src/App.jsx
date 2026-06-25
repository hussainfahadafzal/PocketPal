import { Navigate, Route, Routes, useLocation } from 'react-router-dom';
import { useAuth } from './context/AuthContext';
import InstallBanner from './components/InstallBanner';
import BottomNav from './components/BottomNav';
import Spinner from './components/Spinner';
import Login from './pages/Login';
import Register from './pages/Register';
import Onboarding from './pages/Onboarding';
import Dashboard from './pages/Dashboard';
import AddExpense from './pages/AddExpense';
import History from './pages/History';
import Budgets from './pages/Budgets';
import Analysis from './pages/Analysis';
import Score from './pages/Score';
import Jar from './pages/Jar';

function ProtectedRoute({ children }) {
  const { user, loading } = useAuth();

  if (loading) {
    return (
      <div className="min-h-screen bg-bg flex items-center justify-center">
        <Spinner size="lg" />
      </div>
    );
  }

  if (!user) return <Navigate to="/login" replace />;
  return children;
}

const NO_NAV = ['/login', '/register', '/onboarding', '/add'];

export default function App() {
  const location = useLocation();
  const showNav = !NO_NAV.includes(location.pathname);

  return (
    <>
    <Routes>
      <Route path="/login" element={<Login />} />
      <Route path="/register" element={<Register />} />
      <Route
        path="/onboarding"
        element={
          <ProtectedRoute>
            <Onboarding />
          </ProtectedRoute>
        }
      />
      <Route
        path="/dashboard"
        element={
          <ProtectedRoute>
            <Dashboard />
          </ProtectedRoute>
        }
      />
      <Route
        path="/add"
        element={
          <ProtectedRoute>
            <AddExpense />
          </ProtectedRoute>
        }
      />
      <Route
        path="/history"
        element={
          <ProtectedRoute>
            <History />
          </ProtectedRoute>
        }
      />
      <Route
        path="/budgets"
        element={
          <ProtectedRoute>
            <Budgets />
          </ProtectedRoute>
        }
      />
      <Route
        path="/analysis"
        element={
          <ProtectedRoute>
            <Analysis />
          </ProtectedRoute>
        }
      />
      <Route
        path="/score"
        element={
          <ProtectedRoute>
            <Score />
          </ProtectedRoute>
        }
      />
      <Route
        path="/jar"
        element={
          <ProtectedRoute>
            <Jar />
          </ProtectedRoute>
        }
      />
      <Route path="*" element={<Navigate to="/login" replace />} />
    </Routes>
    <InstallBanner />
    {showNav && <BottomNav />}
    </>
  );
}
