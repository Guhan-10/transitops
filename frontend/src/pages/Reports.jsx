import { useEffect, useState } from 'react';
import client from '../api/client';
import { StatusBadge } from './Dashboard';

export default function Reports() {
  const [data,    setData]    = useState([]);
  const [loading, setLoading] = useState(true);
  const [error,   setError]   = useState('');

  useEffect(() => {
    client.get('/reports/summary')
      .then(r => { setData(r.data); setLoading(false); })
      .catch(() => { setError('Failed to load report data'); setLoading(false); });
  }, []);

  function handleCsvDownload() {
    const token = localStorage.getItem('transitops_token');
    // Open in new tab; browser will handle the download
    const url = 'http://localhost:3001/api/reports/csv';
    fetch(url, { headers: { Authorization: `Bearer ${token}` } })
      .then(r => r.blob())
      .then(blob => {
        const link = document.createElement('a');
        link.href = URL.createObjectURL(blob);
        link.download = 'transitops_report.csv';
        link.click();
        URL.revokeObjectURL(link.href);
      })
      .catch(() => alert('CSV export failed'));
  }

  // Fleet utilization from summary
  const totalVehicles = data.length;
  const onTripCount   = data.filter(v => v.status === 'On Trip').length;
  const utilPct       = totalVehicles > 0 ? Math.round((onTripCount / totalVehicles) * 100) : 0;

  return (
    <div>
      <div className="flex flex-wrap items-center justify-between gap-3 mb-6">
        <h1 className="text-xl font-bold text-gray-900">Reports &amp; Analytics</h1>
        <button id="btn-csv-export" onClick={handleCsvDownload}
          className="bg-green-600 hover:bg-green-700 text-white text-sm font-medium px-4 py-2 rounded-lg">
          ↓ Export CSV
        </button>
      </div>

      {/* Summary stats */}
      <div className="grid grid-cols-2 sm:grid-cols-3 gap-4 mb-6">
        <div className="bg-blue-50 border border-blue-200 rounded-xl p-4">
          <p className="text-xs text-blue-600 uppercase font-semibold tracking-wide">Total Vehicles</p>
          <p className="text-2xl font-bold text-blue-800 mt-1">{totalVehicles}</p>
        </div>
        <div className="bg-green-50 border border-green-200 rounded-xl p-4">
          <p className="text-xs text-green-600 uppercase font-semibold tracking-wide">Fleet Utilization</p>
          <p className="text-2xl font-bold text-green-800 mt-1">{utilPct}%</p>
        </div>
        <div className="bg-gray-50 border border-gray-200 rounded-xl p-4">
          <p className="text-xs text-gray-600 uppercase font-semibold tracking-wide">Total Ops Cost</p>
          <p className="text-2xl font-bold text-gray-800 mt-1">
            ₹{data.reduce((s, v) => s + Number(v.total_operational_cost), 0).toLocaleString()}
          </p>
        </div>
      </div>

      {loading && <p className="text-gray-400">Loading…</p>}
      {error   && <p className="text-red-600">{error}</p>}

      {!loading && !error && (
        <div className="bg-white rounded-xl border border-gray-200 overflow-x-auto">
          <table className="min-w-full text-sm">
            <thead className="bg-gray-50 border-b border-gray-200">
              <tr>
                {[
                  'Vehicle', 'Status', 'Odometer',
                  'Total Revenue', 'Fuel Cost', 'Maint. Cost', 'Other', 'Total Ops Cost',
                  'Fuel Eff. (km/L)', 'ROI'
                ].map(h => (
                  <th key={h} className="px-4 py-3 text-left text-xs font-semibold text-gray-500 uppercase tracking-wide whitespace-nowrap">{h}</th>
                ))}
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-100">
              {data.length === 0 && (
                <tr><td colSpan={10} className="px-4 py-8 text-center text-gray-400">No data</td></tr>
              )}
              {data.map(v => (
                <tr key={v.id} className="hover:bg-gray-50">
                  <td className="px-4 py-3">
                    <div className="font-medium">{v.name}</div>
                    <div className="text-xs text-gray-400">{v.registration_number}</div>
                  </td>
                  <td className="px-4 py-3"><StatusBadge status={v.status} /></td>
                  <td className="px-4 py-3 text-right">{Number(v.odometer).toLocaleString()}</td>
                  <td className="px-4 py-3 text-right">₹{Number(v.total_revenue).toLocaleString()}</td>
                  <td className="px-4 py-3 text-right">₹{Number(v.total_fuel_cost).toLocaleString()}</td>
                  <td className="px-4 py-3 text-right">₹{Number(v.total_maintenance_cost).toLocaleString()}</td>
                  <td className="px-4 py-3 text-right">₹{Number(v.total_expense_cost).toLocaleString()}</td>
                  <td className="px-4 py-3 text-right font-semibold">₹{Number(v.total_operational_cost).toLocaleString()}</td>
                  <td className="px-4 py-3 text-right">{v.fuel_efficiency}</td>
                  <td className={`px-4 py-3 text-right font-semibold ${Number(v.roi) >= 0 ? 'text-green-700' : 'text-red-600'}`}>
                    {(Number(v.roi) * 100).toFixed(1)}%
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </div>
  );
}
