import { useEffect, useState } from 'react';
import client from '../api/client';

function KpiCard({ label, value, color = 'blue' }) {
  const colors = {
    blue:   'bg-blue-50  border-blue-200  text-blue-700',
    green:  'bg-green-50 border-green-200 text-green-700',
    yellow: 'bg-yellow-50 border-yellow-200 text-yellow-700',
    red:    'bg-red-50   border-red-200   text-red-700',
    gray:   'bg-gray-50  border-gray-200  text-gray-700',
  };
  return (
    <div className={`rounded-xl border p-5 ${colors[color]}`}>
      <p className="text-xs font-medium uppercase tracking-wide opacity-70">{label}</p>
      <p className="text-3xl font-bold mt-2">{value ?? '—'}</p>
    </div>
  );
}

export default function Dashboard() {
  const [kpi,     setKpi]     = useState(null);
  const [error,   setError]   = useState('');
  const [filters, setFilters] = useState({ type: '', status: '' });
  const [vehicles, setVehicles] = useState([]);

  useEffect(() => {
    client.get('/reports/dashboard')
      .then(r => setKpi(r.data))
      .catch(() => setError('Failed to load KPIs'));
  }, []);

  useEffect(() => {
    const params = {};
    if (filters.type)   params.type   = filters.type;
    if (filters.status) params.status = filters.status;
    client.get('/vehicles', { params }).then(r => setVehicles(r.data)).catch(() => {});
  }, [filters]);

  return (
    <div>
      <h1 className="text-xl font-bold text-gray-900 mb-6">Dashboard</h1>

      {error && <p className="text-red-600 mb-4">{error}</p>}

      {kpi && (
        <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 gap-4 mb-8">
          <KpiCard label="Total Vehicles"        value={kpi.total_vehicles}          color="blue"   />
          <KpiCard label="Available Vehicles"    value={kpi.available_vehicles}      color="green"  />
          <KpiCard label="In Maintenance"        value={kpi.in_maintenance_vehicles} color="yellow" />
          <KpiCard label="On Trip"               value={kpi.on_trip_vehicles}        color="blue"   />
          <KpiCard label="Active Trips"          value={kpi.active_trips}            color="blue"   />
          <KpiCard label="Pending Trips"         value={kpi.pending_trips}           color="yellow" />
          <KpiCard label="Drivers On Duty"       value={kpi.drivers_on_duty}         color="green"  />
          <KpiCard label="Fleet Utilization %"   value={`${kpi.fleet_utilization_pct}%`} color="gray" />
        </div>
      )}

      {/* Filters */}
      <div className="flex flex-wrap gap-3 mb-4 items-center">
        <span className="text-sm font-medium text-gray-600">Filter vehicles:</span>
        <input
          id="filter-type"
          type="text"
          placeholder="Vehicle type…"
          value={filters.type}
          onChange={e => setFilters(f => ({ ...f, type: e.target.value }))}
          className="border border-gray-300 rounded-lg px-3 py-1.5 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
        />
        <select
          id="filter-status"
          value={filters.status}
          onChange={e => setFilters(f => ({ ...f, status: e.target.value }))}
          className="border border-gray-300 rounded-lg px-3 py-1.5 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
        >
          <option value="">All statuses</option>
          {['Available','On Trip','In Shop','Retired'].map(s => (
            <option key={s} value={s}>{s}</option>
          ))}
        </select>
      </div>

      {/* Vehicle summary table */}
      <div className="bg-white rounded-xl border border-gray-200 overflow-x-auto">
        <table className="min-w-full text-sm">
          <thead className="bg-gray-50 border-b border-gray-200">
            <tr>
              {['Registration', 'Name', 'Type', 'Region', 'Status'].map(h => (
                <th key={h} className="px-4 py-3 text-left text-xs font-semibold text-gray-500 uppercase tracking-wide">
                  {h}
                </th>
              ))}
            </tr>
          </thead>
          <tbody className="divide-y divide-gray-100">
            {vehicles.length === 0 && (
              <tr><td colSpan={5} className="px-4 py-6 text-center text-gray-400">No vehicles found</td></tr>
            )}
            {vehicles.map(v => (
              <tr key={v.id} className="hover:bg-gray-50">
                <td className="px-4 py-3 font-mono text-xs">{v.registration_number}</td>
                <td className="px-4 py-3">{v.name}</td>
                <td className="px-4 py-3">{v.type}</td>
                <td className="px-4 py-3">{v.region || '—'}</td>
                <td className="px-4 py-3"><StatusBadge status={v.status} /></td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}

export function StatusBadge({ status }) {
  const map = {
    Available:  'bg-green-100 text-green-800',
    'On Trip':  'bg-blue-100  text-blue-800',
    'In Shop':  'bg-yellow-100 text-yellow-800',
    Retired:    'bg-gray-200   text-gray-600',
    Draft:      'bg-gray-100   text-gray-700',
    Dispatched: 'bg-blue-100   text-blue-800',
    Completed:  'bg-green-100  text-green-800',
    Cancelled:  'bg-red-100    text-red-700',
    Open:       'bg-yellow-100 text-yellow-800',
    Closed:     'bg-green-100  text-green-800',
    Suspended:  'bg-red-100    text-red-800',
    'Off Duty': 'bg-gray-100   text-gray-600',
  };
  return (
    <span className={`inline-flex items-center rounded-full px-2.5 py-0.5 text-xs font-medium ${map[status] || 'bg-gray-100 text-gray-700'}`}>
      {status}
    </span>
  );
}
