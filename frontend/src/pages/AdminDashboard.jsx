import { useState, useEffect } from 'react';
import Layout from '../components/Layout';
import { api } from '../utils/api';

function StatCard({ label, value, color }) {
  const colors = {
    blue: 'bg-blue-50 text-blue-700 border-blue-200',
    green: 'bg-green-50 text-green-700 border-green-200',
    red: 'bg-red-50 text-red-700 border-red-200',
    orange: 'bg-orange-50 text-orange-700 border-orange-200',
  };

  return (
    <div className={`rounded-xl border p-6 ${colors[color]}`}>
      <p className="text-sm font-medium opacity-80">{label}</p>
      <p className="mt-2 text-3xl font-bold">{value}</p>
    </div>
  );
}

export default function AdminDashboard() {
  const [stats, setStats] = useState(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    api.getAdminDashboard()
      .then(setStats)
      .finally(() => setLoading(false));
  }, []);

  return (
    <Layout>
      <h1 className="mb-6 text-2xl font-bold text-gray-900">Admin Dashboard</h1>

      {loading ? (
        <div className="flex justify-center py-20">
          <div className="h-8 w-8 animate-spin rounded-full border-4 border-primary-500 border-t-transparent" />
        </div>
      ) : (
        <div className="grid gap-6 sm:grid-cols-2 lg:grid-cols-4">
          <StatCard label="Total Employees" value={stats.totalEmployees} color="blue" />
          <StatCard label="Present Today" value={stats.presentToday} color="green" />
          <StatCard label="Absent Today" value={stats.absentToday} color="red" />
          <StatCard label="Late Arrivals" value={stats.lateArrivals} color="orange" />
        </div>
      )}
    </Layout>
  );
}
