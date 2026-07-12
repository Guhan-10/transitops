import { useEffect, useState } from 'react';
import client from '../api/client';
import { StatusBadge } from './Dashboard';
import { Modal } from './Vehicles';

const EMPTY = { vehicle_id: '', description: '', cost: '' };

export default function Maintenance() {
  const [records,  setRecords]  = useState([]);
  const [vehicles, setVehicles] = useState([]);
  const [filterStatus, setFilter] = useState('');
  const [modal,    setModal]    = useState(false);
  const [form,     setForm]     = useState(EMPTY);
  const [error,    setError]    = useState('');
  const [loading,  setLoading]  = useState(false);

  function load() {
    const params = {};
    if (filterStatus) params.status = filterStatus;
    client.get('/maintenance', { params }).then(r => setRecords(r.data)).catch(() => {});
  }
  useEffect(load, [filterStatus]);
  useEffect(() => {
    client.get('/vehicles').then(r => setVehicles(r.data)).catch(() => {});
  }, []);

  async function handleCreate(e) {
    e.preventDefault();
    setLoading(true); setError('');
    try {
      await client.post('/maintenance', form);
      load();
      setModal(false);
      setForm(EMPTY);
    } catch (err) {
      setError(err.response?.data?.error || 'Error creating record');
    } finally { setLoading(false); }
  }

  async function handleClose(id) {
    if (!window.confirm('Close this maintenance record? Vehicle will be set to Available.')) return;
    try {
      await client.post(`/maintenance/${id}/close`);
      load();
    } catch (err) {
      alert(err.response?.data?.error || 'Error closing record');
    }
  }

  return (
    <div>
      <div className="flex flex-wrap items-center justify-between gap-3 mb-6">
        <h1 className="text-xl font-bold text-gray-900">Maintenance</h1>
        <button id="btn-add-maintenance" onClick={() => { setForm(EMPTY); setError(''); setModal(true); }}
          className="bg-blue-600 hover:bg-blue-700 text-white text-sm font-medium px-4 py-2 rounded-lg">
          + New Record
        </button>
      </div>

      <div className="flex gap-3 mb-4">
        <select id="filter-maint-status" value={filterStatus} onChange={e => setFilter(e.target.value)}
          className="border border-gray-300 rounded-lg px-3 py-1.5 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500">
          <option value="">All</option>
          <option value="Open">Open</option>
          <option value="Closed">Closed</option>
        </select>
      </div>

      <div className="bg-white rounded-xl border border-gray-200 overflow-x-auto">
        <table className="min-w-full text-sm">
          <thead className="bg-gray-50 border-b border-gray-200">
            <tr>
              {['Vehicle','Description','Cost','Status','Opened','Closed','Actions'].map(h => (
                <th key={h} className="px-4 py-3 text-left text-xs font-semibold text-gray-500 uppercase tracking-wide whitespace-nowrap">{h}</th>
              ))}
            </tr>
          </thead>
          <tbody className="divide-y divide-gray-100">
            {records.length === 0 && (
              <tr><td colSpan={7} className="px-4 py-8 text-center text-gray-400">No maintenance records</td></tr>
            )}
            {records.map(r => (
              <tr key={r.id} className="hover:bg-gray-50">
                <td className="px-4 py-3">
                  <div className="font-medium">{r.vehicle_name}</div>
                  <div className="text-xs text-gray-400">{r.registration_number}</div>
                </td>
                <td className="px-4 py-3 max-w-xs truncate">{r.description}</td>
                <td className="px-4 py-3 text-right">${Number(r.cost).toLocaleString()}</td>
                <td className="px-4 py-3"><StatusBadge status={r.status} /></td>
                <td className="px-4 py-3 text-xs text-gray-500">{r.created_at?.slice(0,10)}</td>
                <td className="px-4 py-3 text-xs text-gray-500">{r.closed_at?.slice(0,10) || '—'}</td>
                <td className="px-4 py-3">
                  {r.status === 'Open' && (
                    <button id={`btn-close-maint-${r.id}`} onClick={() => handleClose(r.id)}
                      className="text-xs bg-green-600 text-white px-2 py-1 rounded hover:bg-green-700">Close</button>
                  )}
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      {modal && (
        <Modal title="New Maintenance Record" onClose={() => setModal(false)}>
          <form onSubmit={handleCreate} className="space-y-3">
            <div>
              <label className="block text-xs font-medium text-gray-600 mb-1">Vehicle</label>
              <select id="maint-vehicle-id" name="vehicle_id" required value={form.vehicle_id}
                onChange={e => { setForm(f => ({ ...f, vehicle_id: e.target.value })); setError(''); }}
                className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500">
                <option value="">Select vehicle…</option>
                {vehicles.filter(v => v.status !== 'Retired').map(v => (
                  <option key={v.id} value={v.id}>{v.name} ({v.registration_number})</option>
                ))}
              </select>
            </div>
            <div>
              <label className="block text-xs font-medium text-gray-600 mb-1">Description</label>
              <textarea id="maint-description" required value={form.description} rows={3}
                onChange={e => { setForm(f => ({ ...f, description: e.target.value })); setError(''); }}
                className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500" />
            </div>
            <div>
              <label className="block text-xs font-medium text-gray-600 mb-1">Estimated Cost ($)</label>
              <input id="maint-cost" type="number" min="0" value={form.cost}
                onChange={e => { setForm(f => ({ ...f, cost: e.target.value })); setError(''); }}
                className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500" />
            </div>
            {error && <p className="text-xs text-red-600 bg-red-50 rounded p-2">{error}</p>}
            <div className="flex justify-end gap-2 pt-2">
              <button type="button" onClick={() => setModal(false)}
                className="px-4 py-2 text-sm border border-gray-300 rounded-lg hover:bg-gray-50">Cancel</button>
              <button id="btn-save-maintenance" type="submit" disabled={loading}
                className="px-4 py-2 text-sm bg-blue-600 text-white rounded-lg hover:bg-blue-700 disabled:bg-blue-400">
                {loading ? 'Saving…' : 'Create Record'}
              </button>
            </div>
          </form>
        </Modal>
      )}
    </div>
  );
}
