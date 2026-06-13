import { useEffect, useState } from 'react';
import { Link, useNavigate, useParams } from 'react-router-dom';
import Layout from '../components/Layout';
import { api } from '../utils/api';

const empty = { employeeId:'', name:'', email:'', password:'', role:'employee', department:'', departmentId:'', designation:'', phone:'', addressLine1:'', addressLine2:'', city:'', state:'', country:'India', pincode:'', branchId:'', shiftId:'', weekOffs:[] };
const days = ['Sunday','Monday','Tuesday','Wednesday','Thursday','Friday','Saturday'];

export default function EmployeeForm() {
  const { id } = useParams();
  const editing = Boolean(id);
  const navigate = useNavigate();
  const [form, setForm] = useState(empty);
  const [setup, setSetup] = useState({ departments:[], branches:[], shifts:[] });
  const [error, setError] = useState('');
  const [saving, setSaving] = useState(false);
  const set = (key, value) => setForm((current) => ({ ...current, [key]: value }));

  useEffect(() => {
    Promise.all([api.getAdminSetup(), editing ? api.getAllUsers() : Promise.resolve([])])
      .then(([data, users]) => {
        setSetup(data);
        if (editing) {
          const user = users.find((item) => item.id === id);
          if (user) setForm({ ...empty, ...user, password:'', weekOffs:(user.weekOffs || []).map(Number) });
        }
      }).catch((err) => setError(err.message));
  }, [editing, id]);

  const chooseDepartment = (departmentId) => {
    const department = setup.departments.find((item) => item.id === departmentId);
    setForm((current) => ({ ...current, departmentId, department: department?.name || '' }));
  };
  const toggleDay = (day) => set('weekOffs', form.weekOffs.includes(day) ? form.weekOffs.filter((item) => item !== day) : [...form.weekOffs, day]);
  const submit = async (event) => {
    event.preventDefault(); setSaving(true); setError('');
    try { if (editing) await api.updateUser(id, form); else await api.createUser(form); navigate('/admin/users'); }
    catch (err) { setError(err.message); } finally { setSaving(false); }
  };
  const resetPassword = async () => {
    const password = prompt('Enter a new password (minimum 6 characters):');
    if (!password) return;
    try { await api.resetPassword(id, password); alert('Password reset successfully.'); } catch (err) { setError(err.message); }
  };
  const field = (label, key, props={}) => <label className="block"><span className="mb-1 block text-xs font-medium text-gray-600">{label}</span><input {...props} value={form[key] || ''} onChange={(e) => set(key,e.target.value)} className="w-full rounded-lg border border-gray-300 px-3 py-2 text-sm" /></label>;

  return <Layout><div className="mx-auto max-w-5xl">
    <div className="mb-6 flex items-center justify-between"><div><h1 className="text-2xl font-bold">{editing ? 'Edit Employee' : 'New Employee'}</h1><p className="text-sm text-gray-500">Personal, office and attendance configuration.</p></div><Link to="/admin/users" className="text-sm text-gray-600 hover:text-gray-900">Back to employees</Link></div>
    {error && <div className="mb-4 rounded-lg bg-red-50 p-3 text-sm text-red-700">{error}</div>}
    <form onSubmit={submit} className="space-y-6">
      <section className="rounded-xl bg-white p-6 shadow-sm"><h2 className="mb-4 font-semibold">Employment</h2><div className="grid gap-4 md:grid-cols-3">
        {field('Employee ID','employeeId',{required:true,disabled:editing})}{field('Full name','name',{required:true})}{field('Email','email',{required:true,type:'email'})}
        {!editing && field('Initial password','password',{required:true,type:'password',minLength:6})}
        <label><span className="mb-1 block text-xs font-medium text-gray-600">Department</span><select required value={form.departmentId} onChange={(e)=>chooseDepartment(e.target.value)} className="w-full rounded-lg border border-gray-300 px-3 py-2 text-sm"><option value="">Select department</option>{setup.departments.map((d)=><option key={d.id} value={d.id}>{d.name}</option>)}</select></label>
        {field('Designation','designation',{placeholder:'Sr Manager, Sales Executive...'})}{field('Phone','phone',{type:'tel'})}
        <label><span className="mb-1 block text-xs font-medium text-gray-600">Application role</span><select value={form.role} onChange={(e)=>set('role',e.target.value)} className="w-full rounded-lg border border-gray-300 px-3 py-2 text-sm"><option value="employee">Employee</option><option value="admin">Admin</option></select></label>
      </div></section>
      <section className="rounded-xl bg-white p-6 shadow-sm"><h2 className="mb-4 font-semibold">Home Address</h2><div className="grid gap-4 md:grid-cols-3">{field('Address line 1','addressLine1')}{field('Address line 2','addressLine2')}{field('City','city')}{field('State','state')}{field('Country','country')}{field('Pincode','pincode')}</div></section>
      <section className="rounded-xl bg-white p-6 shadow-sm"><h2 className="mb-4 font-semibold">Office & Attendance</h2><div className="grid gap-4 md:grid-cols-2">
        <label><span className="mb-1 block text-xs font-medium text-gray-600">Office branch</span><select required value={form.branchId} onChange={(e)=>set('branchId',e.target.value)} className="w-full rounded-lg border border-gray-300 px-3 py-2 text-sm"><option value="">Select branch</option>{setup.branches.map((b)=><option key={b.id} value={b.id}>{b.name} ({b.allowed_radius_meters}m radius)</option>)}</select></label>
        <label><span className="mb-1 block text-xs font-medium text-gray-600">Shift</span><select required value={form.shiftId} onChange={(e)=>set('shiftId',e.target.value)} className="w-full rounded-lg border border-gray-300 px-3 py-2 text-sm"><option value="">Select shift</option>{setup.shifts.map((s)=><option key={s.id} value={s.id}>{s.name} · {String(s.start_time).slice(0,5)}-{String(s.end_time).slice(0,5)}{s.is_split?' · split':''}</option>)}</select></label>
      </div><div className="mt-5"><span className="mb-2 block text-xs font-medium text-gray-600">Weekly offs</span><div className="flex flex-wrap gap-2">{days.map((day,index)=><button type="button" key={day} onClick={()=>toggleDay(index)} className={`rounded-full border px-3 py-1.5 text-xs ${form.weekOffs.includes(index)?'border-primary-600 bg-primary-50 text-primary-700':'border-gray-300'}`}>{day}</button>)}</div></div></section>
      <div className="flex justify-between"><div>{editing && <button type="button" onClick={resetPassword} className="rounded-lg border border-orange-300 px-4 py-2 text-sm font-medium text-orange-700">Reset Password</button>}</div><div className="flex gap-3"><Link to="/admin/users" className="rounded-lg border border-gray-300 px-4 py-2 text-sm">Cancel</Link><button disabled={saving} className="rounded-lg bg-primary-600 px-5 py-2 text-sm font-medium text-white disabled:opacity-50">{saving?'Saving...':'Save Employee'}</button></div></div>
    </form>
  </div></Layout>;
}
