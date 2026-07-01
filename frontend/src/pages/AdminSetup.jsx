import { useEffect, useState } from 'react';
import Layout from '../components/Layout';
import { api, formatDate } from '../utils/api';

const inputClass = 'w-full rounded-lg border border-gray-300 px-3 py-2 text-sm';

const emptyBranch = {
  name: '',
  addressLine1: '',
  city: '',
  state: '',
  country: 'India',
  pincode: '',
  latitude: '',
  longitude: '',
  allowedRadiusMeters: 100,
};

const emptyShift = {
  name: '',
  startTime: '09:00',
  endTime: '18:00',
  graceMinutes: 15,
  halfDayMinutes: 240,
  fullDayMinutes: 480,
  overtimeAfterMinutes: 540,
  isSplit: false,
  slots: [],
};

function ActionButtons({ onEdit, onDelete, deleteLabel = 'Remove' }) {
  return (
    <div className="flex shrink-0 gap-2">
      {onEdit && (
        <button
          type="button"
          onClick={onEdit}
          className="rounded-md px-2 py-1 text-xs font-medium text-primary-600 hover:bg-primary-50"
        >
          Edit
        </button>
      )}
      <button
        type="button"
        onClick={onDelete}
        className="rounded-md px-2 py-1 text-xs font-medium text-red-600 hover:bg-red-50"
      >
        {deleteLabel}
      </button>
    </div>
  );
}

function ListItem({ children, actions }) {
  return (
    <div className="flex items-center justify-between gap-3 rounded-lg border border-gray-100 bg-gray-50 px-3 py-2.5">
      <div className="min-w-0 flex-1 text-sm text-gray-700">{children}</div>
      {actions}
    </div>
  );
}

export default function AdminSetup() {
  const [setup, setSetup] = useState({ departments: [], branches: [], shifts: [], rules: {} });
  const [holidays, setHolidays] = useState([]);
  const [error, setError] = useState('');
  const [success, setSuccess] = useState('');

  const [department, setDepartment] = useState('');
  const [editingDepartment, setEditingDepartment] = useState(null);

  const [branch, setBranch] = useState(emptyBranch);
  const [editingBranchId, setEditingBranchId] = useState(null);

  const [shift, setShift] = useState(emptyShift);
  const [editingShiftId, setEditingShiftId] = useState(null);

  const [holiday, setHoliday] = useState({ name: '', holidayDate: '', branchId: '', description: '' });
  const [editingHolidayId, setEditingHolidayId] = useState(null);

  const load = async () => {
    try {
      const [s, h] = await Promise.all([api.getAdminSetup(), api.getHolidays()]);
      setSetup(s);
      setHolidays(h);
    } catch (err) {
      setError(err.message);
    }
  };

  useEffect(() => {
    load();
  }, []);

  const run = async (action, reset, successMessage) => {
    setError('');
    setSuccess('');
    try {
      await action();
      reset?.();
      await load();
      if (successMessage) setSuccess(successMessage);
    } catch (err) {
      setError(err.message);
    }
  };

  const confirmDelete = (label) => window.confirm(`Are you sure you want to remove "${label}"?`);

  const addSlot = () =>
    setShift({
      ...shift,
      isSplit: true,
      slots: [...shift.slots, { startTime: '09:00', endTime: '13:00' }],
    });

  const removeSlot = (index) =>
    setShift({
      ...shift,
      slots: shift.slots.filter((_, i) => i !== index),
      isSplit: shift.slots.length > 1,
    });

  const startEditBranch = (b) => {
    setEditingBranchId(b.id);
    setBranch({
      name: b.name,
      addressLine1: b.address_line1,
      city: b.city,
      state: b.state,
      country: b.country || 'India',
      pincode: b.pincode,
      latitude: b.latitude,
      longitude: b.longitude,
      allowedRadiusMeters: b.allowed_radius_meters,
    });
  };

  const startEditShift = (s) => {
    setEditingShiftId(s.id);
    setShift({
      name: s.name,
      startTime: String(s.start_time).slice(0, 5),
      endTime: String(s.end_time).slice(0, 5),
      graceMinutes: s.grace_minutes,
      halfDayMinutes: s.half_day_minutes,
      fullDayMinutes: s.full_day_minutes,
      overtimeAfterMinutes: s.overtime_after_minutes,
      isSplit: s.is_split,
      slots: (s.slots || []).map((slot) => ({
        startTime: String(slot.start_time).slice(0, 5),
        endTime: String(slot.end_time).slice(0, 5),
      })),
    });
  };

  const resetBranchForm = () => {
    setBranch(emptyBranch);
    setEditingBranchId(null);
  };

  const resetShiftForm = () => {
    setShift(emptyShift);
    setEditingShiftId(null);
  };

  const resetHolidayForm = () => {
    setHoliday({ name: '', holidayDate: '', branchId: '', description: '' });
    setEditingHolidayId(null);
  };

  const handleBranchSubmit = () =>
    run(
      () =>
        editingBranchId
          ? api.updateBranch(editingBranchId, branch)
          : api.createBranch(branch),
      resetBranchForm,
      editingBranchId ? 'Branch updated.' : 'Branch created.'
    );

  const handleShiftSubmit = () =>
    run(
      () =>
        editingShiftId
          ? api.updateShift(editingShiftId, shift)
          : api.createShift(shift),
      resetShiftForm,
      editingShiftId ? 'Shift updated.' : 'Shift created.'
    );

  const handleHolidaySubmit = () =>
    run(
      () =>
        editingHolidayId
          ? api.updateHoliday(editingHolidayId, holiday)
          : api.createHoliday(holiday),
      resetHolidayForm,
      editingHolidayId ? 'Holiday updated.' : 'Holiday added.'
    );

  const branchFields = [
    'name',
    'addressLine1',
    'city',
    'state',
    'country',
    'pincode',
    'latitude',
    'longitude',
    'allowedRadiusMeters',
  ];

  const shiftFields = [
    'name',
    'startTime',
    'endTime',
    'graceMinutes',
    'halfDayMinutes',
    'fullDayMinutes',
    'overtimeAfterMinutes',
  ];

  return (
    <Layout>
      <div className="mb-6">
        <h1 className="text-2xl font-bold text-gray-900">Attendance Setup</h1>
        <p className="text-sm text-gray-500">Manage branches, shifts, departments, rules and holidays.</p>
      </div>

      {error && (
        <div className="mb-4 rounded-lg bg-red-50 p-3 text-sm text-red-700">{error}</div>
      )}
      {success && (
        <div className="mb-4 rounded-lg bg-green-50 p-3 text-sm text-green-700">{success}</div>
      )}

      <div className="grid gap-6 lg:grid-cols-2">
        {/* Departments */}
        <section className="rounded-xl bg-white p-5 shadow-sm">
          <h2 className="mb-3 font-semibold text-gray-900">Departments</h2>
          <div className="flex gap-2">
            <input
              value={editingDepartment ? editingDepartment.name : department}
              onChange={(e) =>
                editingDepartment
                  ? setEditingDepartment({ ...editingDepartment, name: e.target.value })
                  : setDepartment(e.target.value)
              }
              placeholder="Department name"
              className={inputClass}
            />
            {editingDepartment ? (
              <>
                <button
                  onClick={() =>
                    run(
                      () => api.updateDepartment(editingDepartment.id, { name: editingDepartment.name }),
                      () => setEditingDepartment(null),
                      'Department updated.'
                    )
                  }
                  className="shrink-0 rounded-lg bg-primary-600 px-4 text-sm text-white hover:bg-primary-700"
                >
                  Save
                </button>
                <button
                  onClick={() => setEditingDepartment(null)}
                  className="shrink-0 rounded-lg border px-4 text-sm text-gray-700 hover:bg-gray-50"
                >
                  Cancel
                </button>
              </>
            ) : (
              <button
                onClick={() =>
                  run(
                    () => api.createDepartment({ name: department }),
                    () => setDepartment(''),
                    'Department added.'
                  )
                }
                className="shrink-0 rounded-lg bg-primary-600 px-4 text-sm text-white hover:bg-primary-700"
              >
                Add
              </button>
            )}
          </div>
          <div className="mt-4 space-y-2">
            {setup.departments.length === 0 ? (
              <p className="text-sm text-gray-400">No departments yet.</p>
            ) : (
              setup.departments.map((d) => (
                <ListItem
                  key={d.id}
                  actions={
                    <ActionButtons
                      onEdit={() => setEditingDepartment({ id: d.id, name: d.name })}
                      onDelete={() => {
                        if (confirmDelete(d.name)) {
                          run(
                            () => api.deleteDepartment(d.id),
                            null,
                            'Department removed.'
                          );
                        }
                      }}
                    />
                  }
                >
                  {d.name}
                </ListItem>
              ))
            )}
          </div>
        </section>

        {/* Attendance Rules */}
        <section className="rounded-xl bg-white p-5 shadow-sm">
          <h2 className="mb-3 font-semibold text-gray-900">Attendance Rules</h2>
          <label className="text-xs text-gray-600">Late grace occurrences per month</label>
          <div className="mt-1 flex gap-2">
            <input
              type="number"
              min="0"
              value={setup.rules?.late_grace_occurrences ?? 0}
              onChange={(e) =>
                setSetup({
                  ...setup,
                  rules: { ...setup.rules, late_grace_occurrences: e.target.value },
                })
              }
              className={inputClass}
            />
            <button
              onClick={() =>
                run(
                  () =>
                    api.updateRules({
                      lateGraceOccurrences: Number(setup.rules.late_grace_occurrences),
                    }),
                  null,
                  'Rules saved.'
                )
              }
              className="shrink-0 rounded-lg bg-primary-600 px-4 text-sm text-white hover:bg-primary-700"
            >
              Save
            </button>
          </div>
        </section>

        {/* Branches */}
        <section className="rounded-xl bg-white p-5 shadow-sm lg:col-span-2">
          <h2 className="mb-3 font-semibold text-gray-900">
            {editingBranchId ? 'Edit Branch' : 'New Branch'}
          </h2>
          <div className="grid gap-3 md:grid-cols-4">
            {branchFields.map((key) => (
              <label key={key}>
                <span className="mb-1 block text-xs capitalize text-gray-600">
                  {key.replace(/([A-Z])/g, ' $1')}
                </span>
                <input
                  type={['latitude', 'longitude', 'allowedRadiusMeters'].includes(key) ? 'number' : 'text'}
                  value={branch[key]}
                  onChange={(e) => setBranch({ ...branch, [key]: e.target.value })}
                  className={inputClass}
                />
              </label>
            ))}
          </div>
          <div className="mt-3 flex gap-2">
            <button
              onClick={handleBranchSubmit}
              className="rounded-lg bg-primary-600 px-4 py-2 text-sm text-white hover:bg-primary-700"
            >
              {editingBranchId ? 'Update Branch' : 'Create Branch'}
            </button>
            {editingBranchId && (
              <button
                onClick={resetBranchForm}
                className="rounded-lg border px-4 py-2 text-sm text-gray-700 hover:bg-gray-50"
              >
                Cancel
              </button>
            )}
          </div>

          <div className="mt-4 space-y-2">
            <h3 className="text-sm font-medium text-gray-700">Existing Branches</h3>
            {setup.branches.length === 0 ? (
              <p className="text-sm text-gray-400">No branches yet.</p>
            ) : (
              setup.branches.map((b) => (
                <ListItem
                  key={b.id}
                  actions={
                    <ActionButtons
                      onEdit={() => startEditBranch(b)}
                      onDelete={() => {
                        if (confirmDelete(b.name)) {
                          run(() => api.deleteBranch(b.id), null, 'Branch removed.');
                        }
                      }}
                    />
                  }
                >
                  <span className="font-medium">{b.name}</span>
                  <span className="text-gray-500">
                    {' '}
                    · {b.city} · {b.allowed_radius_meters}m radius
                  </span>
                </ListItem>
              ))
            )}
          </div>
        </section>

        {/* Shifts */}
        <section className="rounded-xl bg-white p-5 shadow-sm lg:col-span-2">
          <h2 className="mb-3 font-semibold text-gray-900">
            {editingShiftId ? 'Edit Shift' : 'New Shift'}
          </h2>
          <div className="grid gap-3 md:grid-cols-4">
            {shiftFields.map((key) => (
              <label key={key}>
                <span className="mb-1 block text-xs text-gray-600">
                  {key.replace(/([A-Z])/g, ' $1')}
                </span>
                <input
                  type={key.includes('Time') ? 'time' : key === 'name' ? 'text' : 'number'}
                  value={shift[key]}
                  onChange={(e) => setShift({ ...shift, [key]: e.target.value })}
                  className={inputClass}
                />
              </label>
            ))}
          </div>

          {shift.slots.length > 0 && (
            <div className="mt-3 space-y-2">
              <p className="text-xs font-medium text-gray-600">Split shift slots</p>
              {shift.slots.map((slot, index) => (
                <div className="flex gap-2" key={index}>
                  <input
                    type="time"
                    value={slot.startTime}
                    onChange={(e) =>
                      setShift({
                        ...shift,
                        slots: shift.slots.map((s, i) =>
                          i === index ? { ...s, startTime: e.target.value } : s
                        ),
                      })
                    }
                    className={inputClass}
                  />
                  <input
                    type="time"
                    value={slot.endTime}
                    onChange={(e) =>
                      setShift({
                        ...shift,
                        slots: shift.slots.map((s, i) =>
                          i === index ? { ...s, endTime: e.target.value } : s
                        ),
                      })
                    }
                    className={inputClass}
                  />
                  <button
                    type="button"
                    onClick={() => removeSlot(index)}
                    className="shrink-0 rounded-lg border px-3 text-sm text-red-600 hover:bg-red-50"
                  >
                    Remove
                  </button>
                </div>
              ))}
            </div>
          )}

          <div className="mt-3 flex gap-2">
            <button
              type="button"
              onClick={addSlot}
              className="rounded-lg border px-4 py-2 text-sm text-gray-700 hover:bg-gray-50"
            >
              Add split slot
            </button>
            <button
              onClick={handleShiftSubmit}
              className="rounded-lg bg-primary-600 px-4 py-2 text-sm text-white hover:bg-primary-700"
            >
              {editingShiftId ? 'Update Shift' : 'Create Shift'}
            </button>
            {editingShiftId && (
              <button
                onClick={resetShiftForm}
                className="rounded-lg border px-4 py-2 text-sm text-gray-700 hover:bg-gray-50"
              >
                Cancel
              </button>
            )}
          </div>

          <div className="mt-4 space-y-2">
            <h3 className="text-sm font-medium text-gray-700">Existing Shifts</h3>
            {setup.shifts.length === 0 ? (
              <p className="text-sm text-gray-400">No shifts yet.</p>
            ) : (
              setup.shifts.map((s) => (
                <ListItem
                  key={s.id}
                  actions={
                    <ActionButtons
                      onEdit={() => startEditShift(s)}
                      onDelete={() => {
                        if (confirmDelete(s.name)) {
                          run(() => api.deleteShift(s.id), null, 'Shift removed.');
                        }
                      }}
                    />
                  }
                >
                  <span className="font-medium">{s.name}</span>
                  <span className="text-gray-500">
                    {' '}
                    · {String(s.start_time).slice(0, 5)}–{String(s.end_time).slice(0, 5)}
                    {s.is_split ? ' (split shift)' : ''}
                  </span>
                </ListItem>
              ))
            )}
          </div>
        </section>

        {/* Holidays */}
        <section className="rounded-xl bg-white p-5 shadow-sm lg:col-span-2">
          <h2 className="mb-3 font-semibold text-gray-900">Holidays</h2>
          <div className="grid gap-3 md:grid-cols-4">
            <input
              placeholder="Holiday name"
              value={holiday.name}
              onChange={(e) => setHoliday({ ...holiday, name: e.target.value })}
              className={inputClass}
            />
            <input
              type="date"
              value={holiday.holidayDate}
              onChange={(e) => setHoliday({ ...holiday, holidayDate: e.target.value })}
              className={inputClass}
            />
            <select
              value={holiday.branchId}
              onChange={(e) => setHoliday({ ...holiday, branchId: e.target.value })}
              className={inputClass}
            >
              <option value="">All branches</option>
              {setup.branches.map((b) => (
                <option key={b.id} value={b.id}>
                  {b.name}
                </option>
              ))}
            </select>
            <div className="flex gap-2">
              <button
                onClick={handleHolidaySubmit}
                className="rounded-lg bg-primary-600 px-4 py-2 text-sm text-white hover:bg-primary-700"
              >
                {editingHolidayId ? 'Update Holiday' : 'Add Holiday'}
              </button>
              {editingHolidayId && (
                <button
                  onClick={resetHolidayForm}
                  className="rounded-lg border px-4 py-2 text-sm text-gray-700 hover:bg-gray-50"
                >
                  Cancel
                </button>
              )}
            </div>
          </div>

          <div className="mt-4 space-y-2">
            <h3 className="text-sm font-medium text-gray-700">Existing Holidays</h3>
            {holidays.length === 0 ? (
              <p className="text-sm text-gray-400">No holidays yet.</p>
            ) : (
              holidays.map((h) => (
                <ListItem
                  key={h.id}
                  actions={
                    <ActionButtons
                      onEdit={() => {
                        setEditingHolidayId(h.id);
                        setHoliday({
                          name: h.name,
                          holidayDate: h.holiday_date ? String(h.holiday_date).slice(0, 10) : '',
                          branchId: h.branch_id || '',
                          description: h.description || '',
                        });
                      }}
                      onDelete={() => {
                        if (confirmDelete(h.name)) {
                          run(() => api.deleteHoliday(h.id), null, 'Holiday removed.');
                        }
                      }}
                    />
                  }
                >
                  <span className="font-medium">{h.name}</span>
                  <span className="text-gray-500">
                    {' '}
                    · {formatDate(h.holiday_date)} · {h.branch_name || 'All branches'}
                  </span>
                </ListItem>
              ))
            )}
          </div>
        </section>
      </div>
    </Layout>
  );
}
