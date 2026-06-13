function getClientIp(req) {
  const forwarded = req.headers['x-forwarded-for'];
  if (forwarded) {
    return forwarded.split(',')[0].trim();
  }
  return req.ip || req.socket?.remoteAddress || 'unknown';
}

function getTodayDate() {
  return new Date().toISOString().split('T')[0];
}

function calculateWorkingHours(checkIn, checkOut) {
  if (!checkIn || !checkOut) return null;
  const diffMs = new Date(checkOut) - new Date(checkIn);
  const hours = Math.floor(diffMs / (1000 * 60 * 60));
  const minutes = Math.floor((diffMs % (1000 * 60 * 60)) / (1000 * 60));
  return `${hours}h ${minutes}m`;
}

function getAttendanceStatus(record) {
  if (!record.check_in_time) return 'Absent';
  if (!record.check_out_time) return 'Checked In';
  const minutes = (new Date(record.check_out_time) - new Date(record.check_in_time)) / 60000;
  if (record.half_day_minutes && minutes < Number(record.full_day_minutes || 480)) return 'Half Day';
  if (record.overtime_after_minutes && minutes >= Number(record.overtime_after_minutes)) return 'Overtime';
  if (record.start_time) {
    const [hours, mins] = String(record.start_time).split(':').map(Number);
    const checkIn = new Date(record.check_in_time);
    const scheduled = new Date(checkIn);
    scheduled.setHours(hours, mins + Number(record.grace_minutes || 0), 0, 0);
    if (checkIn > scheduled) return 'Late';
  }
  return 'Full Day';
}

function distanceInMeters(lat1, lon1, lat2, lon2) {
  const toRad = (value) => value * Math.PI / 180;
  const earthRadius = 6371000;
  const dLat = toRad(lat2 - lat1);
  const dLon = toRad(lon2 - lon1);
  const a = Math.sin(dLat / 2) ** 2 + Math.cos(toRad(lat1)) * Math.cos(toRad(lat2)) * Math.sin(dLon / 2) ** 2;
  return earthRadius * 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
}

function googleMapsLink(latitude, longitude) {
  if (latitude == null || longitude == null) return null;
  return `https://maps.google.com/?q=${latitude},${longitude}`;
}

module.exports = {
  getClientIp,
  getTodayDate,
  calculateWorkingHours,
  getAttendanceStatus,
  googleMapsLink,
  distanceInMeters,
};
