import { BrowserRouter, Routes, Route, Navigate, NavLink, useNavigate } from 'react-router-dom';
import { AuthProvider, useAuth } from './context/AuthContext';
import Login       from './pages/Login';
import Dashboard   from './pages/Dashboard';
import Vehicles    from './pages/Vehicles';
import Drivers     from './pages/Drivers';
import Trips       from './pages/Trips';
import Maintenance from './pages/Maintenance';
import FuelExpenses from './pages/FuelExpenses';
import Reports     from './pages/Reports';

// ── Private route wrapper ────────────────────────────────────────────────────
function PrivateRoute({ children }) {
  const { user } = useAuth();
  return user ? children : <Navigate to="/login" replace />;
}

// ── Sidebar nav ──────────────────────────────────────────────────────────────
const NAV_ITEMS = [
  { to: '/dashboard',   label: 'Dashboard' },
  { to: '/vehicles',    label: 'Vehicles' },
  { to: '/drivers',     label: 'Drivers' },
  { to: '/trips',       label: 'Trips' },
  { to: '/maintenance', label: 'Maintenance' },
  { to: '/fuel',        label: 'Fuel & Expenses' },
  { to: '/reports',     label: 'Reports' },
];

function Sidebar() {
  const { user, logout } = useAuth();
  const navigate = useNavigate();

  function handleLogout() {
    logout();
    navigate('/login');
  }

  return (
    <aside className="w-56 min-h-screen bg-gray-900 text-white flex flex-col shrink-0">
      <div className="px-4 py-5 border-b border-gray-700">
        <h1 className="text-lg font-bold tracking-tight">TransitOps</h1>
        <p className="text-xs text-gray-400 mt-0.5 truncate">{user?.name}</p>
        <span className="inline-block mt-1 text-xs bg-blue-700 px-2 py-0.5 rounded-full">
          {user?.role}
        </span>
      </div>
      <nav className="flex-1 py-4">
        {NAV_ITEMS.map(({ to, label }) => (
          <NavLink
            key={to}
            to={to}
            className={({ isActive }) =>
              `block px-4 py-2 text-sm rounded-md mx-2 mb-1 transition-colors ${
                isActive
                  ? 'bg-blue-600 text-white font-medium'
                  : 'text-gray-300 hover:bg-gray-700 hover:text-white'
              }`
            }
          >
            {label}
          </NavLink>
        ))}
      </nav>
      <div className="px-4 py-4 border-t border-gray-700">
        <button
          id="btn-logout"
          onClick={handleLogout}
          className="w-full text-sm text-gray-400 hover:text-white hover:bg-gray-700 rounded-md px-3 py-2 text-left transition-colors"
        >
          Sign Out
        </button>
      </div>
    </aside>
  );
}

// ── App shell with sidebar ────────────────────────────────────────────────────
function AppShell({ children }) {
  return (
    <div className="flex min-h-screen bg-gray-50">
      <Sidebar />
      <main className="flex-1 overflow-auto p-6">{children}</main>
    </div>
  );
}

// ── Root ─────────────────────────────────────────────────────────────────────
export default function App() {
  return (
    <BrowserRouter>
      <AuthProvider>
        <Routes>
          <Route path="/login" element={<Login />} />
          <Route
            path="/*"
            element={
              <PrivateRoute>
                <AppShell>
                  <Routes>
                    <Route path="/dashboard"   element={<Dashboard />} />
                    <Route path="/vehicles"    element={<Vehicles />} />
                    <Route path="/drivers"     element={<Drivers />} />
                    <Route path="/trips"       element={<Trips />} />
                    <Route path="/maintenance" element={<Maintenance />} />
                    <Route path="/fuel"        element={<FuelExpenses />} />
                    <Route path="/reports"     element={<Reports />} />
                    <Route path="*"            element={<Navigate to="/dashboard" replace />} />
                  </Routes>
                </AppShell>
              </PrivateRoute>
            }
          />
        </Routes>
      </AuthProvider>
    </BrowserRouter>
  );
}
