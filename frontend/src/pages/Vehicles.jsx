import { useEffect, useState } from 'react';
import client from '../api/client';
import { StatusBadge } from './Dashboard';

const EMPTY = { registration_number: '', name: '', type: '', region: '', max_load_capacity: '', odometer: '', acquisition_cost: '', status: 'Available' };
const STATUSES = ['Available', 'On Trip', 'In Shop', 'Retired'];

export default function Vehicles() {
  const [vehicles, setVehicles]   = useState([]);
  const [search,   setSearch]     = useState('');
  const [filterStatus, setFilterStatus] = useState('');
  const [modal,    setModal]      = useState(null); // null | 'add' | 'edit'
  const [form,     setForm]       = useState(EMPTY);
  const [editId,   setEditId]     = useState(null);
  const [error,    setError]      = useState('');
  const [loading,  setLoading]    = useState(false);

  function loadVehicles() {
    const params = {};
    if (filterStatus) params.status = filterStatus;
    client.get('/vehicles', { params }).then(r => setVehicles(r.data)).catch(() => {});
  }
  useEffect(loadVehicles, [filterStatus]);

  function openAdd()      { setForm(EMPTY); setEditId(null); setError(''); setModal('add'); }
  function openEdit(v)    { setForm({ ...v }); setEditId(v.id); setError(''); setModal('edit'); }
  function closeModal()   { setModal(null); }

  function handleChange(e) {
    setForm(f => ({ ...f, [e.target.name]: e.target.value }));
    setError('');
  }

  async function handleSubmit(e) {
    e.preventDefault();
    setLoading(true);
    setError('');
    try {
      if (modal === 'add') {
        await client.post('/vehicles', form);
      } else {
        await client.put(`/vehicles/${editId}`, form);
      }
      loadVehicles();
      closeModal();
    } catch (err) {
      setError(err.response?.data?.error || 'Error saving vehicle');
    } finally {
      setLoading(false);
    }
  }

  async function handleDelete(id) {
    if (!window.confirm('Delete this vehicle?')) return;
    try {
      await client.delete(`/vehicles/${id}`);
      loadVehicles();
    } catch (err) {
      alert(err.response?.data?.error || 'Error deleting vehicle');
    }
  }

  const filtered = vehicles.filter(v =>
    v.registration_number.toLowerCase().includes(search.toLowerCase()) ||
    v.name.toLowerCase().includes(search.toLowerCase()) ||
    v.type.toLowerCase().includes(search.toLowerCase())
  );

  return (
    <div>
      <div className="flex flex-wrap items-center justify-between gap-3 mb-6">
        <h1 className="text-xl font-bold text-gray-900">Vehicle Registry</h1>
        <button id="btn-add-vehicle" onClick={openAdd}
          className="bg-blue-600 hover:bg-blue-700 text-white text-sm font-medium px-4 py-2 rounded-lg transition-colors">
          + Add Vehicle
        </button>
      </div>

      <div className="flex flex-wrap gap-3 mb-4">
        <input id="search-vehicles" type="text" placeholder="Search vehicles…"
          value={search} onChange={e => setSearch(e.target.value)}
          className="border border-gray-300 rounded-lg px-3 py-1.5 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500 flex-1 min-w-48" />
        <select id="filter-vehicle-status" value={filterStatus} onChange={e => setFilterStatus(e.target.value)}
          className="border border-gray-300 rounded-lg px-3 py-1.5 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500">
          <option value="">All statuses</option>
          {STATUSES.map(s => <option key={s} value={s}>{s}</option>)}
        </select>
      </div>

      <div className="bg-white rounded-xl border border-gray-200 overflow-x-auto">
        <table className="min-w-full text-sm">
          <thead className="bg-gray-50 border-b border-gray-200">
            <tr>
              {['Reg. Number','Name','Type','Region','Capacity (kg)','Odometer','Acq. Cost','Status','Actions'].map(h => (
                <th key={h} className="px-4 py-3 text-left text-xs font-semibold text-gray-500 uppercase tracking-wide whitespace-nowrap">{h}</th>
              ))}
            </tr>
          </thead>
          <tbody className="divide-y divide-gray-100">
            {filtered.length === 0 && (
              <tr><td colSpan={9} className="px-4 py-8 text-center text-gray-400">No vehicles found</td></tr>
            )}
            {filtered.map(v => (
              <tr key={v.id} className="hover:bg-gray-50">
                <td className="px-4 py-3 font-mono text-xs">{v.registration_number}</td>
                <td className="px-4 py-3 font-medium">{v.name}</td>
                <td className="px-4 py-3">{v.type}</td>
                <td className="px-4 py-3">{v.region || '—'}</td>
                <td className="px-4 py-3 text-right">{Number(v.max_load_capacity).toLocaleString()}</td>
                <td className="px-4 py-3 text-right">{Number(v.odometer).toLocaleString()}</td>
                <td className="px-4 py-3 text-right">₹{Number(v.acquisition_cost).toLocaleString()}</td>
                <td className="px-4 py-3"><StatusBadge status={v.status} /></td>
                <td className="px-4 py-3 whitespace-nowrap space-x-2">
                  <button id={`btn-edit-vehicle-${v.id}`} onClick={() => openEdit(v)}
                    className="text-blue-600 hover:underline text-xs">Edit</button>
                  <button id={`btn-delete-vehicle-${v.id}`} onClick={() => handleDelete(v.id)}
                    className="text-red-500 hover:underline text-xs">Delete</button>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      {modal && (
        <Modal title={modal === 'add' ? 'Add Vehicle' : 'Edit Vehicle'} onClose={closeModal}>
          <form onSubmit={handleSubmit} className="space-y-3">
            {[
              { name: 'registration_number', label: 'Registration Number', required: true },
              { name: 'name',                label: 'Vehicle Name',        required: true },
              { name: 'type',                label: 'Type',                required: true },
              { name: 'region',              label: 'Region' },
              { name: 'max_load_capacity',   label: 'Max Load Capacity (kg)', type: 'number' },
              { name: 'odometer',            label: 'Current Odometer',       type: 'number' },
              { name: 'acquisition_cost',    label: 'Acquisition Cost (₹)',    type: 'number' },
            ].map(({ name, label, type = 'text', required }) => (
              <div key={name}>
                <label className="block text-xs font-medium text-gray-600 mb-1">{label}</label>
                <input id={`vehicle-${name}`} name={name} type={type} required={required}
                  value={form[name]} onChange={handleChange}
                  className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500" />
              </div>
            ))}
            <div>
              <label className="block text-xs font-medium text-gray-600 mb-1">Status</label>
              <select id="vehicle-status" name="status" value={form.status} onChange={handleChange}
                className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500">
                {STATUSES.map(s => <option key={s} value={s}>{s}</option>)}
              </select>
            </div>
            {error && <p className="text-xs text-red-600 bg-red-50 rounded p-2">{error}</p>}
            <div className="flex justify-end gap-2 pt-2">
              <button type="button" onClick={closeModal}
                className="px-4 py-2 text-sm border border-gray-300 rounded-lg hover:bg-gray-50">Cancel</button>
              <button id="btn-save-vehicle" type="submit" disabled={loading}
                className="px-4 py-2 text-sm bg-blue-600 text-white rounded-lg hover:bg-blue-700 disabled:bg-blue-400">
                {loading ? 'Saving…' : 'Save'}
              </button>
            </div>
          </form>
        </Modal>
      )}
    </div>
  );
}

export function Modal({ title, onClose, children }) {
  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 p-4">
      <div className="bg-white rounded-2xl shadow-xl w-full max-w-md max-h-[90vh] overflow-y-auto">
        <div className="flex items-center justify-between px-6 py-4 border-b border-gray-200">
          <h2 className="text-base font-semibold text-gray-900">{title}</h2>
          <button id="btn-modal-close" onClick={onClose}
            className="text-gray-400 hover:text-gray-600 text-xl leading-none">×</button>
        </div>
        <div className="px-6 py-4">{children}</div>
      </div>
    </div>
  );
}
