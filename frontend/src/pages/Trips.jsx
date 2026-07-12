import { useEffect, useState } from 'react';
import client from '../api/client';
import { StatusBadge } from './Dashboard';
import { Modal } from './Vehicles';

const EMPTY_TRIP = { source: '', destination: '', vehicle_id: '', driver_id: '', cargo_weight: '', planned_distance: '', revenue: '' };
const EMPTY_COMPLETE = { final_odometer: '', fuel_consumed: '', fuel_cost: '' };

export default function Trips() {
  const [trips,     setTrips]     = useState([]);
  const [vehicles,  setVehicles]  = useState([]);
  const [drivers,   setDrivers]   = useState([]);
  const [modal,     setModal]     = useState(null); // 'create' | 'complete'
  const [form,      setForm]      = useState(EMPTY_TRIP);
  const [completeForm, setCompleteForm] = useState(EMPTY_COMPLETE);
  const [activeTrip, setActiveTrip] = useState(null);
  const [error,     setError]     = useState('');
  const [loading,   setLoading]   = useState(false);
  const [capacityWarn, setCapacityWarn] = useState('');

  function loadTrips() { client.get('/trips').then(r => setTrips(r.data)).catch(() => {}); }

  useEffect(() => {
    loadTrips();
    // Load only Available vehicles for dropdown
    client.get('/vehicles', { params: { status: 'Available' } }).then(r => setVehicles(r.data)).catch(() => {});
    // Load only Available drivers with valid license
    client.get('/drivers', { params: { status: 'Available' } }).then(r => setDrivers(r.data)).catch(() => {});
  }, []);

  function handleChange(e) {
    const { name, value } = e.target;
    setForm(f => {
      const next = { ...f, [name]: value };
      // Live cargo weight validation
      if (name === 'cargo_weight' || name === 'vehicle_id') {
        const vid = name === 'vehicle_id' ? value : f.vehicle_id;
        const cw  = parseFloat(name === 'cargo_weight' ? value : f.cargo_weight) || 0;
        const veh = vehicles.find(v => String(v.id) === String(vid));
        if (veh && cw > parseFloat(veh.max_load_capacity)) {
          setCapacityWarn(`⚠ Cargo (${cw} kg) exceeds vehicle capacity (${veh.max_load_capacity} kg)`);
        } else {
          setCapacityWarn('');
        }
      }
      return next;
    });
    setError('');
  }

  async function handleCreateTrip(e) {
    e.preventDefault();
    if (capacityWarn) return;
    setLoading(true); setError('');
    try {
      await client.post('/trips', form);
      loadTrips();
      setModal(null);
      setForm(EMPTY_TRIP);
    } catch (err) {
      setError(err.response?.data?.error || 'Error creating trip');
    } finally { setLoading(false); }
  }

  async function handleAction(tripId, action) {
    if (action === 'complete') {
      setActiveTrip(tripId);
      setCompleteForm(EMPTY_COMPLETE);
      setModal('complete');
      return;
    }
    if (!window.confirm(`${action} this trip?`)) return;
    try {
      await client.post(`/trips/${tripId}/${action}`);
      loadTrips();
    } catch (err) {
      alert(err.response?.data?.error || `Error: ${action}`);
    }
  }

  async function handleCompleteSubmit(e) {
    e.preventDefault();
    setLoading(true); setError('');
    try {
      await client.post(`/trips/${activeTrip}/complete`, completeForm);
      loadTrips();
      setModal(null);
    } catch (err) {
      setError(err.response?.data?.error || 'Error completing trip');
    } finally { setLoading(false); }
  }

  const today = new Date().toISOString().slice(0, 10);
  const validDrivers = drivers.filter(d => new Date(d.license_expiry) >= new Date() && d.status === 'Available');

  return (
    <div>
      <div className="flex flex-wrap items-center justify-between gap-3 mb-6">
        <h1 className="text-xl font-bold text-gray-900">Trip Management</h1>
        <button id="btn-create-trip" onClick={() => { setForm(EMPTY_TRIP); setCapacityWarn(''); setError(''); setModal('create'); }}
          className="bg-blue-600 hover:bg-blue-700 text-white text-sm font-medium px-4 py-2 rounded-lg">
          + Create Trip
        </button>
      </div>

      <div className="bg-white rounded-xl border border-gray-200 overflow-x-auto">
        <table className="min-w-full text-sm">
          <thead className="bg-gray-50 border-b border-gray-200">
            <tr>
              {['ID','Route','Vehicle','Driver','Cargo (kg)','Distance','Revenue','Status','Actions'].map(h => (
                <th key={h} className="px-4 py-3 text-left text-xs font-semibold text-gray-500 uppercase tracking-wide whitespace-nowrap">{h}</th>
              ))}
            </tr>
          </thead>
          <tbody className="divide-y divide-gray-100">
            {trips.length === 0 && (
              <tr><td colSpan={9} className="px-4 py-8 text-center text-gray-400">No trips found</td></tr>
            )}
            {trips.map(t => (
              <tr key={t.id} className="hover:bg-gray-50">
                <td className="px-4 py-3 text-gray-500">#{t.id}</td>
                <td className="px-4 py-3">
                  <span className="font-medium">{t.source}</span>
                  <span className="text-gray-400 mx-1">→</span>
                  <span>{t.destination}</span>
                </td>
                <td className="px-4 py-3">{t.vehicle_name} <span className="text-gray-400 text-xs">({t.registration_number})</span></td>
                <td className="px-4 py-3">{t.driver_name}</td>
                <td className="px-4 py-3 text-right">{Number(t.cargo_weight).toLocaleString()}</td>
                <td className="px-4 py-3 text-right">{Number(t.planned_distance).toLocaleString()}</td>
                <td className="px-4 py-3 text-right">₹{Number(t.revenue).toLocaleString()}</td>
                <td className="px-4 py-3"><StatusBadge status={t.status} /></td>
                <td className="px-4 py-3 whitespace-nowrap space-x-2">
                  {t.status === 'Draft' && (
                    <button id={`btn-dispatch-${t.id}`} onClick={() => handleAction(t.id, 'dispatch')}
                      className="text-xs bg-blue-600 text-white px-2 py-1 rounded hover:bg-blue-700">Dispatch</button>
                  )}
                  {t.status === 'Dispatched' && (<>
                    <button id={`btn-complete-${t.id}`} onClick={() => handleAction(t.id, 'complete')}
                      className="text-xs bg-green-600 text-white px-2 py-1 rounded hover:bg-green-700">Complete</button>
                    <button id={`btn-cancel-${t.id}`} onClick={() => handleAction(t.id, 'cancel')}
                      className="text-xs bg-red-500 text-white px-2 py-1 rounded hover:bg-red-600">Cancel</button>
                  </>)}
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      {/* Create Trip Modal */}
      {modal === 'create' && (
        <Modal title="Create Trip" onClose={() => setModal(null)}>
          <form onSubmit={handleCreateTrip} className="space-y-3">
            {[
              { name: 'source',           label: 'Source',           required: true },
              { name: 'destination',      label: 'Destination',      required: true },
              { name: 'planned_distance', label: 'Planned Distance (km)', type: 'number' },
              { name: 'revenue',          label: 'Expected Revenue (₹)',   type: 'number' },
            ].map(({ name, label, type='text', required }) => (
              <div key={name}>
                <label className="block text-xs font-medium text-gray-600 mb-1">{label}</label>
                <input id={`trip-${name}`} name={name} type={type} required={required}
                  value={form[name]} onChange={handleChange}
                  className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500" />
              </div>
            ))}
            <div>
              <label className="block text-xs font-medium text-gray-600 mb-1">Vehicle (Available only)</label>
              <select id="trip-vehicle-id" name="vehicle_id" required value={form.vehicle_id} onChange={handleChange}
                className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500">
                <option value="">Select vehicle…</option>
                {vehicles.map(v => (
                  <option key={v.id} value={v.id}>{v.name} ({v.registration_number}) — cap {v.max_load_capacity} kg</option>
                ))}
              </select>
            </div>
            <div>
              <label className="block text-xs font-medium text-gray-600 mb-1">Cargo Weight (kg)</label>
              <input id="trip-cargo-weight" name="cargo_weight" type="number" min="0" required
                value={form.cargo_weight} onChange={handleChange}
                className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500" />
              {capacityWarn && <p className="text-xs text-yellow-700 mt-1">{capacityWarn}</p>}
            </div>
            <div>
              <label className="block text-xs font-medium text-gray-600 mb-1">Driver (Available + valid license)</label>
              <select id="trip-driver-id" name="driver_id" required value={form.driver_id} onChange={handleChange}
                className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500">
                <option value="">Select driver…</option>
                {validDrivers.map(d => (
                  <option key={d.id} value={d.id}>{d.name} — expires {d.license_expiry?.slice(0,10)}</option>
                ))}
              </select>
            </div>
            {error && <p className="text-xs text-red-600 bg-red-50 rounded p-2">{error}</p>}
            <div className="flex justify-end gap-2 pt-2">
              <button type="button" onClick={() => setModal(null)}
                className="px-4 py-2 text-sm border border-gray-300 rounded-lg hover:bg-gray-50">Cancel</button>
              <button id="btn-save-trip" type="submit" disabled={loading || !!capacityWarn}
                className="px-4 py-2 text-sm bg-blue-600 text-white rounded-lg hover:bg-blue-700 disabled:bg-blue-400">
                {loading ? 'Saving…' : 'Create Trip'}
              </button>
            </div>
          </form>
        </Modal>
      )}

      {/* Complete Trip Modal */}
      {modal === 'complete' && (
        <Modal title="Complete Trip" onClose={() => setModal(null)}>
          <form onSubmit={handleCompleteSubmit} className="space-y-3">
            {[
              { name: 'final_odometer', label: 'Final Odometer Reading', required: true },
              { name: 'fuel_consumed',  label: 'Fuel Consumed (liters)',  required: true },
              { name: 'fuel_cost',      label: 'Fuel Cost (₹)' },
            ].map(({ name, label, required }) => (
              <div key={name}>
                <label className="block text-xs font-medium text-gray-600 mb-1">{label}</label>
                <input id={`complete-${name}`} name={name} type="number" min="0" required={required}
                  value={completeForm[name]}
                  onChange={e => setCompleteForm(f => ({ ...f, [e.target.name]: e.target.value }))}
                  className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500" />
              </div>
            ))}
            {error && <p className="text-xs text-red-600 bg-red-50 rounded p-2">{error}</p>}
            <div className="flex justify-end gap-2 pt-2">
              <button type="button" onClick={() => setModal(null)}
                className="px-4 py-2 text-sm border border-gray-300 rounded-lg hover:bg-gray-50">Cancel</button>
              <button id="btn-confirm-complete" type="submit" disabled={loading}
                className="px-4 py-2 text-sm bg-green-600 text-white rounded-lg hover:bg-green-700 disabled:bg-green-400">
                {loading ? 'Saving…' : 'Complete Trip'}
              </button>
            </div>
          </form>
        </Modal>
      )}
    </div>
  );
}
