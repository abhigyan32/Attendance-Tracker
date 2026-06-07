import { useState, useEffect } from 'react';
import Layout from '../components/Layout';
import { api, formatDateTime } from '../utils/api';
export default function Profile() {
  const [profile, setProfile] = useState(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    api.getProfile()
      .then(setProfile)
      .finally(() => setLoading(false));
  }, []);

  if (loading) {
    return (
      <Layout>
        <div className="flex justify-center py-20">
          <div className="h-8 w-8 animate-spin rounded-full border-4 border-primary-500 border-t-transparent" />
        </div>
      </Layout>
    );
  }

  return (
    <Layout>
      <h1 className="mb-6 text-2xl font-bold text-gray-900">My Profile</h1>

      <div className="mx-auto max-w-lg rounded-xl bg-white p-8 shadow-sm">
        <div className="mb-6 flex items-center gap-4">
          <div className="flex h-16 w-16 items-center justify-center rounded-full bg-primary-100 text-2xl font-bold text-primary-700">
            {profile?.name?.charAt(0)}
          </div>
          <div>
            <h2 className="text-xl font-semibold">{profile?.name}</h2>
            <p className="text-sm text-gray-500">{profile?.email}</p>
          </div>
        </div>

        <div className="space-y-4">
          {[
            { label: 'Employee ID', value: profile?.employeeId },
            { label: 'Department', value: profile?.department },
            { label: 'Role', value: profile?.role },
            { label: 'Status', value: profile?.status },
            { label: 'Member Since', value: formatDateTime(profile?.createdAt) },
          ].map((item) => (
            <div key={item.label} className="flex justify-between border-b border-gray-100 pb-3">
              <span className="text-sm text-gray-600">{item.label}</span>
              <span className="text-sm font-medium capitalize">{item.value}</span>
            </div>
          ))}
        </div>
      </div>
    </Layout>
  );
}
