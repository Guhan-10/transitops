import { useEffect, useState } from 'react';
import client from '../api/client';
import { Modal } from './Vehicles';

const EMPTY_FUEL = { vehicle_id: '', trip_id: '', liters: '', cost: '', log_date: '' };
const EMPTY_EXP  = { vehicle_id: '', type: '', amount: '', expense_date: '' };

export default function FuelExpenses() {
  const [tab,      setTab]      = useState('fuel');
  const [vehicles, setVehicles] = useState([]);
  const [trips,    setTrips]    = useState([]);
  const [fuels,    setFuels]    = useState([]);
  const [expenses, setExpenses] = useState([]);
  const [summary,  setSummary]  = useState([]);
  const [modal,    setModal]    = useState(null);
  const [fuelForm, setFuelForm] = useState(EMPTY_FUEL);
  const [expForm,  setExpForm]  = useState(EMPTY_EXP);
  const [error,    setError]    = useState('');
  const [loading,  setLoading]  = useState(false);

  function loadAll() {
    client.get('/vehicles').then(r => setVehicles(r.data)).catch(() => {});
    client.get('/trips',   { params: { status: 'Completed' } }).then(r => setTrips(r.data)).catch(() => {});
    client.get('/fuel-logs').then(r => setFuels(r.data)).catch(() => {});
    client.get('/expenses').then(r => setExpenses(r.data)).catch(() => {});
    client.get('/reports/summary').then(r => setSummary(r.data)).catch(() => {});
  }
  useEffect(loadAll, []);

  async function handleFuelSubmit(e) {
    e.preventDefault();
    setLoading(true); setError('');
    try {
      await client.post('/fuel-logs', fuelForm);
      loadAll(); setModal(null); setFuelForm(EMPTY_FUEL);
    } catch (err) {
      setError(err.response?.data?.error || 'Error logging fuel');
    } finally { setLoading(false); }
  }

  async function handleExpSubmit(e) {
    e.preventDefault();
    setLoading(true); setError('');
    try {
      await client.post('/expenses', expForm);
      loadAll(); setModal(null); setExpForm(EMPTY_EXP);
    } catch (err) {
      setError(err.response?.data?.error || 'Error logging expense');
    } finally { setLoading(false); }
  }

  return (
    <div>
      <h1 className="text-xl font-bold text-gray-900 mb-4">Fuel &amp; Expenses</h1>

      {/* Operational Cost Rollup */}
      <div className="bg-white rounded-xl border border-gray-200 overflow-x-auto mb-6">
        <div className="px-4 py-3 border-b border-gray-200">
          <h2 className="text-sm font-semibold text-gray-700">Total Operational Cost per Vehicle</h2>
        </div>
        <table className="min-w-full text-sm">
          <thead className="bg-gray-50 border-b border-gray-200">
            <tr>
              {['Vehicle','Fuel Cost','Maint. Cost','Other Expenses','Total Ops Cost'].map(h => (
                <th key={h} className="px-4 py-3 text-left text-xs font-semibold text-gray-500 uppercase tracking-wide whitespace-nowrap">{h}</th>
              ))}
            </tr>
          </thead>
          <tbody className="divide-y divide-gray-100">
            {summary.length === 0 && (
              <tr><td colSpan={5} className="px-4 py-6 text-center text-gray-400">No data</td></tr>
            )}
            {summary.map(s => (
              <tr key={s.id} className="hover:bg-gray-50">
                <td className="px-4 py-3">
                  <div className="font-medium">{s.name}</div>
                  <div className="text-xs text-gray-400">{s.registration_number}</div>
                </td>
                <td className="px-4 py-3 text-right">₹{Number(s.total_fuel_cost).toLocaleString()}</td>
                <td className="px-4 py-3 text-right">₹{Number(s.total_maintenance_cost).toLocaleString()}</td>
                <td className="px-4 py-3 text-right">₹{Number(s.total_expense_cost).toLocaleString()}</td>
                <td className="px-4 py-3 text-right font-semibold">₹{Number(s.total_operational_cost).toLocaleString()}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      {/* Tabs */}
      <div className="flex border-b border-gray-200 mb-4">
        {['fuel','expenses'].map(t => (
          <button key={t} id={`tab-${t}`} onClick={() => setTab(t)}
            className={`pb-2 px-4 text-sm font-medium capitalize border-b-2 transition-colors ${
              tab === t ? 'border-blue-600 text-blue-600' : 'border-transparent text-gray-500 hover:text-gray-700'
            }`}>
            {t === 'fuel' ? 'Fuel Logs' : 'Other Expenses'}
          </button>
        ))}
      </div>

      {tab === 'fuel' && (
        <>
          <div className="flex justify-end mb-3">
            <button id="btn-add-fuel" onClick={() => { setFuelForm(EMPTY_FUEL); setError(''); setModal('fuel'); }}
              className="bg-blue-600 hover:bg-blue-700 text-white text-sm font-medium px-4 py-2 rounded-lg">
              + Log Fuel
            </button>
          </div>
          <div className="bg-white rounded-xl border border-gray-200 overflow-x-auto">
            <table className="min-w-full text-sm">
              <thead className="bg-gray-50 border-b border-gray-200">
                <tr>
                  {['Vehicle','Trip','Liters','Cost','Date'].map(h => (
                    <th key={h} className="px-4 py-3 text-left text-xs font-semibold text-gray-500 uppercase tracking-wide">{h}</th>
                  ))}
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-100">
                {fuels.length === 0 && (
                  <tr><td colSpan={5} className="px-4 py-6 text-center text-gray-400">No fuel logs</td></tr>
                )}
                {fuels.map(f => (
                  <tr key={f.id} className="hover:bg-gray-50">
                    <td className="px-4 py-3">{f.vehicle_name}</td>
                    <td className="px-4 py-3">{f.trip_id ? `#${f.trip_id}` : '—'}</td>
                    <td className="px-4 py-3 text-right">{Number(f.liters).toLocaleString()}</td>
                    <td className="px-4 py-3 text-right">₹{Number(f.cost).toLocaleString()}</td>
                    <td className="px-4 py-3">{f.log_date?.slice(0,10)}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </>
      )}

      {tab === 'expenses' && (
        <>
          <div className="flex justify-end mb-3">
            <button id="btn-add-expense" onClick={() => { setExpForm(EMPTY_EXP); setError(''); setModal('expense'); }}
              className="bg-blue-600 hover:bg-blue-700 text-white text-sm font-medium px-4 py-2 rounded-lg">
              + Log Expense
            </button>
          </div>
          <div className="bg-white rounded-xl border border-gray-200 overflow-x-auto">
            <table className="min-w-full text-sm">
              <thead className="bg-gray-50 border-b border-gray-200">
                <tr>
                  {['Vehicle','Type','Amount','Date'].map(h => (
                    <th key={h} className="px-4 py-3 text-left text-xs font-semibold text-gray-500 uppercase tracking-wide">{h}</th>
                  ))}
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-100">
                {expenses.length === 0 && (
                  <tr><td colSpan={4} className="px-4 py-6 text-center text-gray-400">No expenses</td></tr>
                )}
                {expenses.map(ex => (
                  <tr key={ex.id} className="hover:bg-gray-50">
                    <td className="px-4 py-3">{ex.vehicle_name}</td>
                    <td className="px-4 py-3">{ex.type}</td>
                    <td className="px-4 py-3 text-right">₹{Number(ex.amount).toLocaleString()}</td>
                    <td className="px-4 py-3">{ex.expense_date?.slice(0,10)}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </>
      )}

      {/* Fuel modal */}
      {modal === 'fuel' && (
        <Modal title="Log Fuel" onClose={() => setModal(null)}>
          <form onSubmit={handleFuelSubmit} className="space-y-3">
            <div>
              <label className="block text-xs font-medium text-gray-600 mb-1">Vehicle</label>
              <select id="fuel-vehicle-id" required value={fuelForm.vehicle_id}
                onChange={e => setFuelForm(f => ({ ...f, vehicle_id: e.target.value }))}
                className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500">
                <option value="">Select vehicle…</option>
                {vehicles.map(v => <option key={v.id} value={v.id}>{v.name} ({v.registration_number})</option>)}
              </select>
            </div>
            <div>
              <label className="block text-xs font-medium text-gray-600 mb-1">Trip (optional)</label>
              <select id="fuel-trip-id" value={fuelForm.trip_id}
                onChange={e => setFuelForm(f => ({ ...f, trip_id: e.target.value }))}
                className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500">
                <option value="">— No trip —</option>
                {trips.map(t => <option key={t.id} value={t.id}>#{t.id} {t.source} → {t.destination}</option>)}
              </select>
            </div>
            {[
              { name: 'liters',   label: 'Liters',   required: true },
              { name: 'cost',     label: 'Cost (₹)',  required: true },
              { name: 'log_date', label: 'Date',      type: 'date', required: true },
            ].map(({ name, label, type='number', required }) => (
              <div key={name}>
                <label className="block text-xs font-medium text-gray-600 mb-1">{label}</label>
                <input id={`fuel-${name}`} type={type} required={required} min="0"
                  value={fuelForm[name]} onChange={e => setFuelForm(f => ({ ...f, [e.target.name]: e.target.value }))}
                  name={name}
                  className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500" />
              </div>
            ))}
            {error && <p className="text-xs text-red-600 bg-red-50 rounded p-2">{error}</p>}
            <div className="flex justify-end gap-2 pt-2">
              <button type="button" onClick={() => setModal(null)}
                className="px-4 py-2 text-sm border border-gray-300 rounded-lg hover:bg-gray-50">Cancel</button>
              <button id="btn-save-fuel" type="submit" disabled={loading}
                className="px-4 py-2 text-sm bg-blue-600 text-white rounded-lg hover:bg-blue-700 disabled:bg-blue-400">
                {loading ? 'Saving…' : 'Log Fuel'}
              </button>
            </div>
          </form>
        </Modal>
      )}

      {/* Expense modal */}
      {modal === 'expense' && (
        <Modal title="Log Expense" onClose={() => setModal(null)}>
          <form onSubmit={handleExpSubmit} className="space-y-3">
            <div>
              <label className="block text-xs font-medium text-gray-600 mb-1">Vehicle</label>
              <select id="expense-vehicle-id" required value={expForm.vehicle_id}
                onChange={e => setExpForm(f => ({ ...f, vehicle_id: e.target.value }))}
                className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500">
                <option value="">Select vehicle…</option>
                {vehicles.map(v => <option key={v.id} value={v.id}>{v.name} ({v.registration_number})</option>)}
              </select>
            </div>
            {[
              { name: 'type',         label: 'Expense Type',  type: 'text',   required: true },
              { name: 'amount',       label: 'Amount (₹)',     type: 'number', required: true },
              { name: 'expense_date', label: 'Date',           type: 'date',   required: true },
            ].map(({ name, label, type, required }) => (
              <div key={name}>
                <label className="block text-xs font-medium text-gray-600 mb-1">{label}</label>
                <input id={`expense-${name}`} type={type} required={required} min="0"
                  name={name} value={expForm[name]}
                  onChange={e => setExpForm(f => ({ ...f, [e.target.name]: e.target.value }))}
                  className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500" />
              </div>
            ))}
            {error && <p className="text-xs text-red-600 bg-red-50 rounded p-2">{error}</p>}
            <div className="flex justify-end gap-2 pt-2">
              <button type="button" onClick={() => setModal(null)}
                className="px-4 py-2 text-sm border border-gray-300 rounded-lg hover:bg-gray-50">Cancel</button>
              <button id="btn-save-expense" type="submit" disabled={loading}
                className="px-4 py-2 text-sm bg-blue-600 text-white rounded-lg hover:bg-blue-700 disabled:bg-blue-400">
                {loading ? 'Saving…' : 'Log Expense'}
              </button>
            </div>
          </form>
        </Modal>
      )}
    </div>
  );
}
