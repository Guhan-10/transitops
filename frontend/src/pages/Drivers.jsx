import { useEffect, useState } from 'react';
import client from '../api/client';
import { StatusBadge } from './Dashboard';
import { Modal } from './Vehicles';
const EMPTY = { name: '', license_number: '', license_category: '', license_expiry: '', contact_number: '', safety_score: 100, status: 'Available' };
const STATUSES = ['Available', 'On Trip', 'Off Duty', 'Suspended'];
function expiryClass(dateStr) {
  if (!dateStr) return '';
  const diff = (new Date(dateStr) - new Date()) / (1000 * 60 * 60 * 24);
  if (diff < 0)  return 'bg-red-50 text-red-700 font-semibold';
  if (diff < 30) return 'bg-yellow-50 text-yellow-700 font-semibold';
  return '';
}
export default function Drivers() {
  const [drivers,  setDrivers]  = useState([]);
  const [search,   setSearch]   = useState('');
  const [modal,    setModal]    = useState(null);
  const [form,     setForm]     = useState(EMPTY);
  const [editId,   setEditId]   = useState(null);
  const [error,    setError]    = useState('');
  const [loading,  setLoading]  = useState(false);
  function load() {
    client.get('/drivers').then(r => setDrivers(r.data)).catch(() => {});
  }
  useEffect(load, []);
  function openAdd()   { setForm(EMPTY); setEditId(null); setError(''); setModal('add'); }
  function openEdit(d) { setForm({ ...d, license_expiry: d.license_expiry?.slice(0,10) }); setEditId(d.id); setError(''); setModal('edit'); }
  function closeModal(){ setModal(null); }
  function handleChange(e) { setForm(f => ({ ...f, [e.target.name]: e.target.value })); setError(''); }

  async function handleSubmit(e) {
    e.preventDefault();
    setLoading(true);
    setError('');
    try {
      modal === 'add'
        ? await client.post('/drivers', form)
        : await client.put(`/drivers/${editId}`, form);
      load();
      closeModal();
    } catch (err) {
      setError(err.response?.data?.error || 'Error saving driver');
    } finally {
      setLoading(false);
    }
  }

  async function handleDelete(id) {
    if (!window.confirm('Delete this driver?')) return;
    try {
      await client.delete(`/drivers/${id}`);
      load();
    } catch (err) {
      alert(err.response?.data?.error || 'Error deleting driver');
    }
  }

  const filtered = drivers.filter(d =>
    d.name.toLowerCase().includes(search.toLowerCase()) ||
    d.license_number.toLowerCase().includes(search.toLowerCase())
  );

  return (
    <div>
      <div className="flex flex-wrap items-center justify-between gap-3 mb-6">
        <h1 className="text-xl font-bold text-gray-900">Driver Management</h1>
        <button id="btn-add-driver" onClick={openAdd}
          className="bg-blue-600 hover:bg-blue-700 text-white text-sm font-medium px-4 py-2 rounded-lg">
          + Add Driver
        </button>
      </div>

      <input id="search-drivers" type="text" placeholder="Search by name or license…"
        value={search} onChange={e => setSearch(e.target.value)}
        className="border border-gray-300 rounded-lg px-3 py-1.5 text-sm mb-4 w-full max-w-sm focus:outline-none focus:ring-2 focus:ring-blue-500" />

      <div className="bg-white rounded-xl border border-gray-200 overflow-x-auto">
        <table className="min-w-full text-sm">
          <thead className="bg-gray-50 border-b border-gray-200">
            <tr>
              {['Name','License No.','Category','Expiry','Contact','Safety Score','Status','Actions'].map(h => (
                <th key={h} className="px-4 py-3 text-left text-xs font-semibold text-gray-500 uppercase tracking-wide whitespace-nowrap">{h}</th>
              ))}
            </tr>
          </thead>
          <tbody className="divide-y divide-gray-100">
            {filtered.length === 0 && (
              <tr><td colSpan={8} className="px-4 py-8 text-center text-gray-400">No drivers found</td></tr>
            )}
            {filtered.map(d => (
              <tr key={d.id} className="hover:bg-gray-50">
                <td className="px-4 py-3 font-medium">{d.name}</td>
                <td className="px-4 py-3 font-mono text-xs">{d.license_number}</td>
                <td className="px-4 py-3">{d.license_category}</td>
                <td className={`px-4 py-3 text-xs rounded ${expiryClass(d.license_expiry)}`}>
                  {d.license_expiry?.slice(0,10) || '—'}
                </td>
                <td className="px-4 py-3">{d.contact_number || '—'}</td>
                <td className="px-4 py-3 text-right">{d.safety_score}</td>
                <td className="px-4 py-3"><StatusBadge status={d.status} /></td>
                <td className="px-4 py-3 whitespace-nowrap space-x-2">
                  <button id={`btn-edit-driver-${d.id}`} onClick={() => openEdit(d)}
                    className="text-blue-600 hover:underline text-xs">Edit</button>
                  <button id={`btn-delete-driver-${d.id}`} onClick={() => handleDelete(d.id)}
                    className="text-red-500 hover:underline text-xs">Delete</button>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      {modal && (
        <Modal title={modal === 'add' ? 'Add Driver' : 'Edit Driver'} onClose={closeModal}>
          <form onSubmit={handleSubmit} className="space-y-3">
            {[
              { name: 'name',             label: 'Full Name',         required: true },
              { name: 'license_number',   label: 'License Number',    required: true },
              { name: 'license_category', label: 'License Category',  required: true },
              { name: 'license_expiry',   label: 'License Expiry',    type: 'date', required: true },
              { name: 'contact_number',   label: 'Contact Number' },
              { name: 'safety_score',     label: 'Safety Score',      type: 'number' },
            ].map(({ name, label, type = 'text', required }) => (
              <div key={name}>
                <label className="block text-xs font-medium text-gray-600 mb-1">{label}</label>
                <input id={`driver-${name}`} name={name} type={type} required={required}
                  value={form[name]} onChange={handleChange}
                  className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500" />
              </div>
            ))}
            <div>
              <label className="block text-xs font-medium text-gray-600 mb-1">Status</label>
              <select id="driver-status" name="status" value={form.status} onChange={handleChange}
                className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500">
                {STATUSES.map(s => <option key={s} value={s}>{s}</option>)}
              </select>
            </div>
            {error && <p className="text-xs text-red-600 bg-red-50 rounded p-2">{error}</p>}
            <div className="flex justify-end gap-2 pt-2">
              <button type="button" onClick={closeModal}
                className="px-4 py-2 text-sm border border-gray-300 rounded-lg hover:bg-gray-50">Cancel</button>
              <button id="btn-save-driver" type="submit" disabled={loading}
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
