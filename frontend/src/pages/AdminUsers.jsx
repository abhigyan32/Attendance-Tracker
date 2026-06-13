import { useEffect, useRef, useState } from 'react';
import { Link } from 'react-router-dom';
import Layout from '../components/Layout';
import { api } from '../utils/api';

export default function AdminUsers() {
  const [users, setUsers] = useState([]);
  const [loading, setLoading] = useState(true);
  const [message, setMessage] = useState('');
  const [error, setError] = useState('');
  const fileRef = useRef(null);

  const load = async () => {
    try { setUsers(await api.getAllUsers()); } catch (err) { setError(err.message); }
    finally { setLoading(false); }
  };
  useEffect(() => { load(); }, []);

  const importEmployees = async (event) => {
    const file = event.target.files?.[0];
    if (!file) return;
    setError(''); setMessage('');
    try {
      const result = await api.bulkCreateUsers(file);
      setMessage(`${result.created} employee(s) created${result.failed.length ? `, ${result.failed.length} row(s) failed` : ''}.`);
      await load();
    } catch (err) { setError(err.message); }
    event.target.value = '';
  };

  const disable = async (id) => {
    if (!confirm('Disable this employee?')) return;
    try { await api.disableUser(id); await load(); } catch (err) { setError(err.message); }
  };

  return <Layout>
    <div className="mb-6 flex flex-wrap items-center justify-between gap-3">
      <div><h1 className="text-2xl font-bold">Employees</h1><p className="text-sm text-gray-500">Manage employee profiles, branches and shifts.</p></div>
      <div className="flex gap-2">
        <input ref={fileRef} type="file" accept=".csv,.xlsx,.xls" onChange={importEmployees} className="hidden" />
        <button onClick={() => fileRef.current?.click()} className="rounded-lg border border-gray-300 bg-white px-4 py-2 text-sm font-medium hover:bg-gray-50">Import CSV / Excel</button>
        <Link to="/admin/users/new" className="rounded-lg bg-primary-600 px-4 py-2 text-sm font-medium text-white hover:bg-primary-700">New Employee</Link>
      </div>
    </div>
    <div className="mb-5 rounded-lg bg-blue-50 p-3 text-xs text-blue-800">Import columns: employeeId, name, email, department, role, designation, phone, password. Password defaults to Welcome@123.</div>
    {message && <div className="mb-4 rounded-lg bg-green-50 p-3 text-sm text-green-700">{message}</div>}
    {error && <div className="mb-4 rounded-lg bg-red-50 p-3 text-sm text-red-700">{error}</div>}
    <div className="overflow-hidden rounded-xl bg-white shadow-sm">
      {loading ? <div className="py-12 text-center text-gray-500">Loading...</div> : <div className="overflow-x-auto"><table className="w-full text-left text-sm">
        <thead className="border-b bg-gray-50 text-xs uppercase text-gray-600"><tr>
          <th className="px-5 py-3">Employee</th><th className="px-5 py-3">Department</th><th className="px-5 py-3">Designation</th><th className="px-5 py-3">Branch / Shift</th><th className="px-5 py-3">Status</th><th className="px-5 py-3">Actions</th>
        </tr></thead>
        <tbody className="divide-y">{users.map((user) => <tr key={user.id} className="hover:bg-gray-50">
          <td className="px-5 py-4"><div className="font-medium">{user.name}</div><div className="text-xs text-gray-500">{user.employeeId} · {user.email}</div></td>
          <td className="px-5 py-4">{user.department}</td><td className="px-5 py-4">{user.designation || '-'}</td>
          <td className="px-5 py-4"><div>{user.branchName || 'Not assigned'}</div><div className="text-xs text-gray-500">{user.shiftName || 'No shift'}</div></td>
          <td className="px-5 py-4"><span className={`rounded-full px-2 py-1 text-xs ${user.status === 'active' ? 'bg-green-100 text-green-700' : 'bg-red-100 text-red-700'}`}>{user.status}</span></td>
          <td className="px-5 py-4"><div className="flex gap-3"><Link className="text-primary-600 hover:underline" to={`/admin/users/${user.id}/edit`}>Edit</Link>{user.status === 'active' && <button className="text-red-600 hover:underline" onClick={() => disable(user.id)}>Disable</button>}</div></td>
        </tr>)}</tbody>
      </table></div>}
    </div>
  </Layout>;
}
