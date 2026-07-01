import { useState, useEffect } from 'react';
import { Link } from 'react-router-dom';
import Layout from '../components/Layout';
import WebcamCapture from '../components/WebcamCapture';
import { api, getGeolocation, formatDateTime } from '../utils/api';
import { useAuth } from '../context/AuthContext';

function normalizeDashboardStats(raw) {
  if (!raw) return null;

  const totalEmployees = raw.totalEmployees ?? 0;
  const presentToday = raw.presentToday ?? 0;

  return {
    date: raw.date ?? new Date().toISOString().split('T')[0],
    totalEmployees,
    presentToday,
    absentToday: raw.absentToday ?? Math.max(totalEmployees - presentToday, 0),
    lateArrivals: raw.lateArrivals ?? 0,
    checkedOutToday: raw.checkedOutToday ?? 0,
    stillWorking: raw.stillWorking ?? presentToday,
    attendanceRate:
      raw.attendanceRate ??
      (totalEmployees ? Math.round((presentToday / totalEmployees) * 100) : 0),
    employees: raw.employees ?? [],
    presentList: raw.presentList ?? [],
    absentList: raw.absentList ?? [],
    lateList: raw.lateList ?? [],
    recentCheckIns: raw.recentCheckIns ?? [],
    departmentBreakdown: raw.departmentBreakdown ?? [],
    weeklyTrend: raw.weeklyTrend ?? [],
  };
}

const CARD_CONFIG = {
  total: {
    label: 'Total Employees',
    color: 'blue',
    key: 'totalEmployees',
    listKey: 'employees',
    description: 'All active employees in the organization',
  },
  present: {
    label: 'Present Today',
    color: 'green',
    key: 'presentToday',
    listKey: 'presentList',
    description: 'Employees who checked in today',
  },
  absent: {
    label: 'Absent Today',
    color: 'red',
    key: 'absentToday',
    listKey: 'absentList',
    description: 'Employees who have not checked in yet',
  },
  late: {
    label: 'Late Arrivals',
    color: 'orange',
    key: 'lateArrivals',
    listKey: 'lateList',
    description: 'Employees who arrived after their shift grace period',
  },
};

const colorStyles = {
  blue: {
    card: 'border-blue-200 bg-gradient-to-br from-blue-50 to-blue-100/80 text-blue-800 hover:from-blue-100 hover:shadow-blue-100',
    ring: 'ring-blue-400',
    badge: 'bg-blue-100 text-blue-700',
    bar: 'bg-blue-500',
  },
  green: {
    card: 'border-green-200 bg-gradient-to-br from-green-50 to-green-100/80 text-green-800 hover:from-green-100 hover:shadow-green-100',
    ring: 'ring-green-400',
    badge: 'bg-green-100 text-green-700',
    bar: 'bg-green-500',
  },
  red: {
    card: 'border-red-200 bg-gradient-to-br from-red-50 to-red-100/80 text-red-800 hover:from-red-100 hover:shadow-red-100',
    ring: 'ring-red-400',
    badge: 'bg-red-100 text-red-700',
    bar: 'bg-red-500',
  },
  orange: {
    card: 'border-orange-200 bg-gradient-to-br from-orange-50 to-orange-100/80 text-orange-800 hover:from-orange-100 hover:shadow-orange-100',
    ring: 'ring-orange-400',
    badge: 'bg-orange-100 text-orange-700',
    bar: 'bg-orange-500',
  },
};

function StatCard({ config, value, active, onClick }) {
  const styles = colorStyles[config.color];
  return (
    <button
      type="button"
      onClick={onClick}
      className={`rounded-2xl border p-5 text-left shadow-sm transition-all hover:shadow-md ${
        styles.card
      } ${active ? `ring-2 ${styles.ring}` : ''}`}
    >
      <div className="flex items-start justify-between">
        <p className="text-sm font-medium opacity-80">{config.label}</p>
        <span className={`rounded-full px-2 py-0.5 text-[10px] font-semibold uppercase ${styles.badge}`}>
          View
        </span>
      </div>
      <p className="mt-3 text-4xl font-bold tracking-tight">{value ?? 0}</p>
      <p className="mt-2 text-xs opacity-70">Click to see details</p>
    </button>
  );
}

function StatusBadge({ status }) {
  const styles = {
    'Full Day': 'bg-green-100 text-green-800',
    Late: 'bg-orange-100 text-orange-800',
    Absent: 'bg-red-100 text-red-800',
    'Checked In': 'bg-blue-100 text-blue-800',
    'Half Day': 'bg-yellow-100 text-yellow-800',
    Overtime: 'bg-purple-100 text-purple-800',
  };
  return (
    <span className={`rounded-full px-2.5 py-0.5 text-xs font-medium ${styles[status] || 'bg-gray-100 text-gray-800'}`}>
      {status}
    </span>
  );
}

function DetailPanel({ config, list, onClose, onOverride }) {
  const styles = colorStyles[config.color];
  return (
    <div className="rounded-2xl border border-gray-200 bg-white shadow-sm">
      <div className="flex items-center justify-between border-b px-5 py-4">
        <div>
          <h2 className="text-lg font-semibold text-gray-900">{config.label}</h2>
          <p className="text-sm text-gray-500">{config.description}</p>
        </div>
        <button
          type="button"
          onClick={onClose}
          className="rounded-lg border px-3 py-1.5 text-sm text-gray-600 hover:bg-gray-50"
        >
          Close
        </button>
      </div>
      {list.length === 0 ? (
        <p className="px-5 py-10 text-center text-sm text-gray-400">No employees in this category.</p>
      ) : (
        <div className="overflow-x-auto">
          <table className="w-full text-left text-sm">
            <thead className="bg-gray-50 text-xs uppercase text-gray-500">
              <tr>
                <th className="px-5 py-3">Employee</th>
                <th className="px-5 py-3">Department</th>
                <th className="px-5 py-3">Check-In</th>
                <th className="px-5 py-3">Check-Out</th>
                <th className="px-5 py-3">Status</th>
                <th className="px-5 py-3">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y">
              {list.map((emp) => (
                <tr key={emp.id} className="hover:bg-gray-50">
                  <td className="px-5 py-3">
                    <div className="font-medium text-gray-900">{emp.name}</div>
                    <div className="text-xs text-gray-500">{emp.employeeId}</div>
                  </td>
                  <td className="px-5 py-3 text-gray-600">{emp.department}</td>
                  <td className="px-5 py-3">{formatDateTime(emp.checkIn)}</td>
                  <td className="px-5 py-3">{formatDateTime(emp.checkOut)}</td>
                  <td className="px-5 py-3">
                    <StatusBadge status={emp.status} />
                  </td>
                  <td className="px-5 py-3">
                    <div className="flex flex-wrap gap-2">
                      <button
                        type="button"
                        onClick={() => onOverride(emp.id, 'present')}
                        className="rounded-md border border-green-200 px-2.5 py-1 text-xs font-medium text-green-700 hover:bg-green-50"
                      >
                        Mark Present
                      </button>
                      <button
                        type="button"
                        onClick={() => onOverride(emp.id, 'absent')}
                        className="rounded-md border border-red-200 px-2.5 py-1 text-xs font-medium text-red-700 hover:bg-red-50"
                      >
                        Mark Absent
                      </button>
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
      <div className={`border-t px-5 py-3 text-xs font-medium ${styles.badge}`}>
        {list.length} employee{list.length !== 1 ? 's' : ''} shown
      </div>
    </div>
  );
}

export default function AdminDashboard() {
  const { user } = useAuth();
  const [stats, setStats] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [activeCard, setActiveCard] = useState(null);
  const [actioningEmployeeId, setActioningEmployeeId] = useState(null);
  const [selfAttendance, setSelfAttendance] = useState(null);
  const [showWebcam, setShowWebcam] = useState(false);
  const [location, setLocation] = useState(null);
  const [cameraMode, setCameraMode] = useState('check-in');
  const [actionLoading, setActionLoading] = useState(false);

  const loadDashboard = async () => {
    setLoading(true);
    setError('');
    try {
      const [dashboardData, attendanceStatus] = await Promise.all([
        api.getAdminDashboard(),
        api.getTodayStatus(),
      ]);
      setStats(normalizeDashboardStats(dashboardData));
      setSelfAttendance(attendanceStatus);
    } catch (err) {
      setStats(null);
      setError(err.message || 'Failed to load dashboard.');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadDashboard();
  }, []);

  const toggleCard = (key) => {
    setActiveCard((current) => (current === key ? null : key));
  };

  const handleOverride = async (userId, status) => {
    setActioningEmployeeId(userId);
    try {
      await api.overrideAttendance({ userId, status, date: stats?.date });
      await loadDashboard();
    } catch (err) {
      setError(err.message || 'Unable to update attendance.');
    } finally {
      setActioningEmployeeId(null);
    }
  };

  const handleCheckInClick = async () => {
    setError('');
    try {
      const loc = await getGeolocation();
      setLocation(loc);
      setCameraMode('check-in');
      setShowWebcam(true);
    } catch (err) {
      setError(err.message);
    }
  };

  const handleCheckIn = async (selfie) => {
    setShowWebcam(false);
    setActionLoading(true);
    setError('');
    try {
      await api.checkIn({ ...location, selfie });
      await loadDashboard();
    } catch (err) {
      setError(err.message);
    } finally {
      setActionLoading(false);
    }
  };

  const handleCheckOut = async () => {
    setError('');
    try {
      const loc = await getGeolocation();
      setLocation(loc);
      setCameraMode('check-out');
      setShowWebcam(true);
    } catch (err) {
      setError(err.message);
    }
  };

  const completeCheckOut = async (selfie) => {
    setShowWebcam(false);
    setActionLoading(true);
    setError('');
    try {
      await api.checkOut({ ...location, selfie });
      await loadDashboard();
    } catch (err) {
      setError(err.message);
    } finally {
      setActionLoading(false);
    }
  };

  const todayLabel = stats?.date
    ? new Date(stats.date).toLocaleDateString('en-US', {
        weekday: 'long',
        year: 'numeric',
        month: 'long',
        day: 'numeric',
      })
    : '';

  return (
    <Layout>
      <div className="mb-6 flex flex-wrap items-end justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">Admin Dashboard</h1>
          <p className="text-sm text-gray-500">{todayLabel}</p>
        </div>
        <div className="flex gap-2">
          <Link
            to="/admin/attendance"
            className="rounded-lg border border-gray-300 px-4 py-2 text-sm font-medium text-gray-700 hover:bg-gray-50"
          >
            View Attendance
          </Link>
          <Link
            to="/admin/users"
            className="rounded-lg bg-primary-600 px-4 py-2 text-sm font-medium text-white hover:bg-primary-700"
          >
            Manage Users
          </Link>
        </div>
      </div>

      {loading ? (
        <div className="flex justify-center py-20">
          <div className="h-8 w-8 animate-spin rounded-full border-4 border-primary-500 border-t-transparent" />
        </div>
      ) : error ? (
        <div className="rounded-xl border border-red-200 bg-red-50 p-8 text-center">
          <p className="text-sm text-red-700">{error}</p>
          <button
            type="button"
            onClick={loadDashboard}
            className="mt-4 rounded-lg bg-primary-600 px-4 py-2 text-sm text-white hover:bg-primary-700"
          >
            Retry
          </button>
        </div>
      ) : !stats ? (
        <div className="rounded-xl border bg-white p-8 text-center text-sm text-gray-500">
          No dashboard data available.
        </div>
      ) : (
        <>
          <section className="mb-6 rounded-2xl border border-blue-100 bg-gradient-to-br from-blue-50 to-white p-6 shadow-sm">
            <div className="flex flex-col gap-4 lg:flex-row lg:items-start lg:justify-between">
              <div>
                <h2 className="text-lg font-semibold text-gray-900">Your Attendance</h2>
                <p className="mt-1 text-sm text-gray-600">Mark your own attendance for today as an admin.</p>
              </div>
              <div className="rounded-xl border border-white/70 bg-white/80 px-4 py-3 shadow-sm">
                <p className="text-sm font-medium text-gray-700">{user?.name || 'Admin'}</p>
                <p className="text-xs text-gray-500">{selfAttendance?.record?.status || 'Not marked'}</p>
              </div>
            </div>

            <div className="mt-5 grid gap-4 md:grid-cols-3">
              <div className="rounded-xl border border-gray-200 bg-white p-4">
                <p className="text-sm text-gray-600">Check-In</p>
                <p className="mt-2 text-sm font-medium text-gray-900">{selfAttendance?.checkedIn ? formatDateTime(selfAttendance.record.checkIn) : 'Not checked in'}</p>
              </div>
              <div className="rounded-xl border border-gray-200 bg-white p-4">
                <p className="text-sm text-gray-600">Check-Out</p>
                <p className="mt-2 text-sm font-medium text-gray-900">{selfAttendance?.checkedOut ? formatDateTime(selfAttendance.record.checkOut) : 'Not checked out'}</p>
              </div>
              <div className="rounded-xl border border-gray-200 bg-white p-4">
                <p className="text-sm text-gray-600">Working Hours</p>
                <p className="mt-2 text-sm font-medium text-gray-900">{selfAttendance?.record?.workingHours || '—'}</p>
              </div>
            </div>

            <div className="mt-5 flex flex-wrap gap-3">
              {!selfAttendance?.checkedIn && (
                <button
                  type="button"
                  onClick={handleCheckInClick}
                  disabled={actionLoading}
                  className="rounded-lg bg-green-600 px-4 py-2 text-sm font-semibold text-white hover:bg-green-700 disabled:opacity-50"
                >
                  {actionLoading ? 'Processing...' : 'Check In'}
                </button>
              )}
              {selfAttendance?.checkedIn && !selfAttendance?.checkedOut && (
                <button
                  type="button"
                  onClick={handleCheckOut}
                  disabled={actionLoading}
                  className="rounded-lg bg-orange-600 px-4 py-2 text-sm font-semibold text-white hover:bg-orange-700 disabled:opacity-50"
                >
                  {actionLoading ? 'Processing...' : 'Check Out'}
                </button>
              )}
              {selfAttendance?.checkedOut && (
                <div className="rounded-lg bg-gray-100 px-4 py-2 text-sm font-medium text-gray-600">
                  Attendance completed for today
                </div>
              )}
            </div>
          </section>

          {/* Summary cards */}
          <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
            {Object.entries(CARD_CONFIG).map(([key, config]) => (
              <StatCard
                key={key}
                config={config}
                value={stats[config.key]}
                active={activeCard === key}
                onClick={() => toggleCard(key)}
              />
            ))}
          </div>

          {/* Detail panel on card click */}
          {activeCard && (
            <div className="mt-6">
              <DetailPanel
                config={CARD_CONFIG[activeCard]}
                list={stats[CARD_CONFIG[activeCard].listKey] || []}
                onClose={() => setActiveCard(null)}
                onOverride={handleOverride}
              />
            </div>
          )}

          {/* Attendance overview + weekly trend */}
          <div className="mt-6 grid gap-6 lg:grid-cols-3">
            <section className="rounded-2xl border bg-white p-6 shadow-sm lg:col-span-1">
              <h2 className="text-lg font-semibold text-gray-900">Today&apos;s Overview</h2>
              <div className="mt-6 flex items-center justify-center">
                <div className="relative h-36 w-36">
                  <svg className="h-full w-full -rotate-90" viewBox="0 0 36 36">
                    <circle cx="18" cy="18" r="15.5" fill="none" stroke="#e5e7eb" strokeWidth="3" />
                    <circle
                      cx="18"
                      cy="18"
                      r="15.5"
                      fill="none"
                      stroke="#22c55e"
                      strokeWidth="3"
                      strokeDasharray={`${stats.attendanceRate} ${100 - stats.attendanceRate}`}
                      strokeLinecap="round"
                    />
                  </svg>
                  <div className="absolute inset-0 flex flex-col items-center justify-center">
                    <span className="text-3xl font-bold text-gray-900">{stats.attendanceRate}%</span>
                    <span className="text-xs text-gray-500">Attendance</span>
                  </div>
                </div>
              </div>
              <div className="mt-6 space-y-3">
                <div className="flex justify-between text-sm">
                  <span className="text-gray-600">Still working</span>
                  <span className="font-semibold text-blue-700">{stats.stillWorking}</span>
                </div>
                <div className="flex justify-between text-sm">
                  <span className="text-gray-600">Checked out</span>
                  <span className="font-semibold text-green-700">{stats.checkedOutToday}</span>
                </div>
                <div className="flex justify-between text-sm">
                  <span className="text-gray-600">On leave / absent</span>
                  <span className="font-semibold text-red-700">{stats.absentToday}</span>
                </div>
              </div>
            </section>

            <section className="rounded-2xl border bg-white p-6 shadow-sm lg:col-span-2">
              <h2 className="text-lg font-semibold text-gray-900">7-Day Attendance Trend</h2>
              <p className="text-sm text-gray-500">Daily present count vs total employees</p>
              <div className="mt-6 flex items-end justify-between gap-2 h-40">
                {stats.weeklyTrend.length === 0 ? (
                  <p className="w-full py-10 text-center text-sm text-gray-400">No trend data yet.</p>
                ) : (
                  stats.weeklyTrend.map((day) => (
                  <div key={day.date} className="flex flex-1 flex-col items-center gap-2">
                    <span className="text-xs font-medium text-gray-700">{day.present}</span>
                    <div className="flex w-full flex-col justify-end rounded-t-lg bg-gray-100" style={{ height: '120px' }}>
                      <div
                        className="w-full rounded-t-lg bg-primary-500 transition-all"
                        style={{
                          height: `${stats.totalEmployees ? (day.present / stats.totalEmployees) * 100 : 0}%`,
                          minHeight: day.present > 0 ? '4px' : '0',
                        }}
                      />
                    </div>
                    <span className="text-[10px] text-gray-500">{day.label}</span>
                  </div>
                  ))
                )}
              </div>
            </section>
          </div>

          {showWebcam && (
            <WebcamCapture
              mode={cameraMode}
              onCapture={cameraMode === 'check-out' ? completeCheckOut : handleCheckIn}
              onClose={() => setShowWebcam(false)}
            />
          )}

          {/* Department breakdown + recent check-ins */}
          <div className="mt-6 grid gap-6 lg:grid-cols-2">
            <section className="rounded-2xl border bg-white p-6 shadow-sm">
              <h2 className="text-lg font-semibold text-gray-900">Department Breakdown</h2>
              <p className="text-sm text-gray-500">Present vs absent by department today</p>
              <div className="mt-5 space-y-4">
                {stats.departmentBreakdown.length === 0 ? (
                  <p className="text-sm text-gray-400">No department data.</p>
                ) : (
                  stats.departmentBreakdown.map((dept) => {
                    const presentPct = dept.total ? Math.round((dept.present / dept.total) * 100) : 0;
                    return (
                      <div key={dept.department}>
                        <div className="mb-1 flex justify-between text-sm">
                          <span className="font-medium text-gray-800">{dept.department}</span>
                          <span className="text-gray-500">
                            {dept.present}/{dept.total} present
                            {dept.late > 0 && (
                              <span className="ml-2 text-orange-600">· {dept.late} late</span>
                            )}
                          </span>
                        </div>
                        <div className="h-2 overflow-hidden rounded-full bg-gray-100">
                          <div
                            className="h-full rounded-full bg-green-500"
                            style={{ width: `${presentPct}%` }}
                          />
                        </div>
                      </div>
                    );
                  })
                )}
              </div>
            </section>

            <section className="rounded-2xl border bg-white p-6 shadow-sm">
              <div className="flex items-center justify-between">
                <div>
                  <h2 className="text-lg font-semibold text-gray-900">Recent Check-Ins</h2>
                  <p className="text-sm text-gray-500">Latest arrivals today</p>
                </div>
                <Link to="/admin/attendance" className="text-sm font-medium text-primary-600 hover:underline">
                  View all
                </Link>
              </div>
              <div className="mt-5 space-y-3">
                {stats.recentCheckIns.length === 0 ? (
                  <p className="py-8 text-center text-sm text-gray-400">No check-ins yet today.</p>
                ) : (
                  stats.recentCheckIns.map((emp) => (
                    <div
                      key={emp.id}
                      className="flex items-center justify-between rounded-xl border border-gray-100 bg-gray-50 px-4 py-3"
                    >
                      <div className="flex items-center gap-3">
                        <div className="flex h-10 w-10 items-center justify-center rounded-full bg-primary-100 text-sm font-bold text-primary-700">
                          {emp.name.charAt(0)}
                        </div>
                        <div>
                          <p className="font-medium text-gray-900">{emp.name}</p>
                          <p className="text-xs text-gray-500">{emp.department}</p>
                        </div>
                      </div>
                      <div className="text-right">
                        <p className="text-sm font-medium text-gray-800">
                          {new Date(emp.checkIn).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                        </p>
                        <StatusBadge status={emp.status} />
                      </div>
                    </div>
                  ))
                )}
              </div>
            </section>
          </div>
        </>
      )}
    </Layout>
  );
}
