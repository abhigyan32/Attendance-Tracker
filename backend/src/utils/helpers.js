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
  const checkInHour = new Date(record.check_in_time).getHours();
  const checkInMinute = new Date(record.check_in_time).getMinutes();
  if (checkInHour > 9 || (checkInHour === 9 && checkInMinute > 30)) {
    return 'Late';
  }
  return 'Present';
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
};
