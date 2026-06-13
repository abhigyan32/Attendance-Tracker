import { useState, useEffect } from 'react';
import Layout from '../components/Layout';
import WebcamCapture from '../components/WebcamCapture';
import { api, getGeolocation, formatDateTime } from '../utils/api';
import { useAuth } from '../context/AuthContext';

export default function Dashboard() {
  const { user } = useAuth();
  const [status, setStatus] = useState(null);
  const [loading, setLoading] = useState(true);
  const [actionLoading, setActionLoading] = useState(false);
  const [error, setError] = useState('');
  const [showWebcam, setShowWebcam] = useState(false);
  const [location, setLocation] = useState(null);
  const [cameraMode, setCameraMode] = useState('check-in');
  const [toast, setToast] = useState('');

  const showToast = (message) => {
    setToast(message);
    window.setTimeout(() => setToast(''), 4000);
  };

  const fetchStatus = async () => {
    try {
      const data = await api.getTodayStatus();
      setStatus(data);
    } catch (err) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchStatus();
  }, []);

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
      await fetchStatus();
      showToast('Checked in successfully.');
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
      await fetchStatus();
      showToast('Checked out successfully.');
    } catch (err) {
      setError(err.message);
    } finally {
      setActionLoading(false);
    }
  };

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
      <div className="mb-8">
        <h1 className="text-2xl font-bold text-gray-900">Welcome, {user?.name}</h1>
        <p className="text-gray-600">{new Date().toLocaleDateString('en-US', { weekday: 'long', year: 'numeric', month: 'long', day: 'numeric' })}</p>
      </div>

      {error && (
        <div className="mb-6 rounded-lg bg-red-50 p-4 text-sm text-red-700">{error}</div>
      )}

      {toast && <div className="fixed right-5 top-5 z-50 flex items-center gap-4 rounded-lg bg-green-600 px-4 py-3 text-sm font-medium text-white shadow-lg"><span>{toast}</span><button onClick={() => setToast('')} className="text-lg leading-none" aria-label="Close">X</button></div>}

      <div className="grid gap-6 md:grid-cols-2">
        <div className="rounded-xl bg-white p-6 shadow-sm">
          <h2 className="mb-4 text-lg font-semibold">Today&apos;s Attendance</h2>

          <div className="mb-6 space-y-3">
            <div className="flex items-center justify-between rounded-lg bg-gray-50 p-3">
              <span className="text-sm text-gray-600">Check-In</span>
              <span className="text-sm font-medium">
                {status?.checkedIn ? formatDateTime(status.record.checkIn) : 'Not checked in'}
              </span>
            </div>
            <div className="flex items-center justify-between rounded-lg bg-gray-50 p-3">
              <span className="text-sm text-gray-600">Check-Out</span>
              <span className="text-sm font-medium">
                {status?.checkedOut ? formatDateTime(status.record.checkOut) : 'Not checked out'}
              </span>
            </div>
            {status?.record?.workingHours && (
              <div className="flex items-center justify-between rounded-lg bg-green-50 p-3">
                <span className="text-sm text-green-700">Working Hours</span>
                <span className="text-sm font-medium text-green-700">{status.record.workingHours}</span>
              </div>
            )}
          </div>

          <div className="flex gap-3">
            {!status?.checkedIn && (
              <button
                onClick={handleCheckInClick}
                disabled={actionLoading}
                className="flex-1 rounded-lg bg-green-600 py-3 text-sm font-semibold text-white hover:bg-green-700 disabled:opacity-50"
              >
                {actionLoading ? 'Processing...' : 'Check In'}
              </button>
            )}
            {status?.checkedIn && !status?.checkedOut && (
              <button
                onClick={handleCheckOut}
                disabled={actionLoading}
                className="flex-1 rounded-lg bg-orange-600 py-3 text-sm font-semibold text-white hover:bg-orange-700 disabled:opacity-50"
              >
                {actionLoading ? 'Processing...' : 'Check Out'}
              </button>
            )}
            {status?.checkedOut && (
              <div className="flex-1 rounded-lg bg-gray-100 py-3 text-center text-sm font-medium text-gray-600">
                Attendance completed for today
              </div>
            )}
          </div>
        </div>

        <div className="rounded-xl bg-white p-6 shadow-sm">
          <h2 className="mb-4 text-lg font-semibold">Quick Info</h2>
          <div className="space-y-3 text-sm">
            <div className="flex justify-between">
              <span className="text-gray-600">Employee ID</span>
              <span className="font-medium">{user?.employeeId}</span>
            </div>
            <div className="flex justify-between">
              <span className="text-gray-600">Department</span>
              <span className="font-medium">{user?.department}</span>
            </div>
            <div className="flex justify-between">
              <span className="text-gray-600">Status</span>
              <span className={`font-medium ${status?.record?.status === 'Late' ? 'text-orange-600' : 'text-green-600'}`}>
                {status?.record?.status || 'Not marked'}
              </span>
            </div>
          </div>

          <div className="mt-6 rounded-lg border border-blue-100 bg-blue-50 p-4 text-xs text-blue-800">
            <p className="font-medium">Note:</p>
            <p className="mt-1">Check-in requires location access and a webcam selfie for verification.</p>
          </div>
        </div>
      </div>

      {showWebcam && (
        <WebcamCapture mode={cameraMode} onCapture={cameraMode === 'check-out' ? completeCheckOut : handleCheckIn} onClose={() => setShowWebcam(false)} />
      )}
    </Layout>
  );
}
