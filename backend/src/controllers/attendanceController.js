const { validationResult } = require('express-validator');
const pool = require('../config/db');
const {
  getClientIp,
  getTodayDate,
  calculateWorkingHours,
  getAttendanceStatus,
  googleMapsLink,
  distanceInMeters,
} = require('../utils/helpers');

async function validateBranchLocation(userId, latitude, longitude) {
  const result = await pool.query(`SELECT b.name, b.latitude, b.longitude, b.allowed_radius_meters
    FROM users u LEFT JOIN branches b ON b.id = u.branch_id WHERE u.id = $1`, [userId]);
  const branch = result.rows[0];
  if (!branch || branch.latitude == null) {
    return { valid: false, message: 'No active office branch is assigned to your profile.' };
  }
  const distance = distanceInMeters(Number(latitude), Number(longitude), Number(branch.latitude), Number(branch.longitude));
  if (distance > Number(branch.allowed_radius_meters)) {
    return { valid: false, message: `You are ${Math.round(distance)}m from ${branch.name}. Attendance is allowed within ${branch.allowed_radius_meters}m.` };
  }
  return { valid: true };
}

async function checkIn(req, res) {
  const errors = validationResult(req);
  if (!errors.isEmpty()) {
    return res.status(400).json({ errors: errors.array() });
  }

  const { latitude, longitude, accuracy, selfie } = req.body;
  const userId = req.user.id;
  const today = getTodayDate();
  const ip = getClientIp(req);
  const userAgent = req.headers['user-agent'] || 'unknown';

  try {
    const branchCheck = await validateBranchLocation(userId, latitude, longitude);
    if (!branchCheck.valid) return res.status(403).json({ message: branchCheck.message });
    const existing = await pool.query(
      'SELECT id, check_in_time FROM attendance WHERE user_id = $1 AND attendance_date = $2',
      [userId, today]
    );

    if (existing.rows.length > 0 && existing.rows[0].check_in_time) {
      return res.status(409).json({ message: 'You have already checked in today.' });
    }

    let result;
    if (existing.rows.length > 0) {
      result = await pool.query(
        `UPDATE attendance SET
          check_in_time = NOW(),
          check_in_latitude = $1,
          check_in_longitude = $2,
          check_in_accuracy = $3,
          check_in_ip = $4,
          user_agent = $5,
          check_in_selfie = $6
         WHERE user_id = $7 AND attendance_date = $8
         RETURNING *`,
        [latitude, longitude, accuracy, ip, userAgent, selfie || null, userId, today]
      );
    } else {
      result = await pool.query(
        `INSERT INTO attendance
          (user_id, attendance_date, check_in_time, check_in_latitude, check_in_longitude,
           check_in_accuracy, check_in_ip, user_agent, check_in_selfie)
         VALUES ($1, $2, NOW(), $3, $4, $5, $6, $7, $8)
         RETURNING *`,
        [userId, today, latitude, longitude, accuracy, ip, userAgent, selfie || null]
      );
    }

    const record = result.rows[0];
    res.status(201).json(formatAttendanceRecord(record));
  } catch (err) {
    console.error('Check-in error:', err);
    res.status(500).json({ message: 'Server error during check-in.' });
  }
}

async function checkOut(req, res) {
  const errors = validationResult(req);
  if (!errors.isEmpty()) {
    return res.status(400).json({ errors: errors.array() });
  }

  const { latitude, longitude, accuracy, selfie } = req.body;
  const userId = req.user.id;
  const today = getTodayDate();
  const ip = getClientIp(req);

  try {
    const branchCheck = await validateBranchLocation(userId, latitude, longitude);
    if (!branchCheck.valid) return res.status(403).json({ message: branchCheck.message });
    const existing = await pool.query(
      'SELECT * FROM attendance WHERE user_id = $1 AND attendance_date = $2',
      [userId, today]
    );

    if (existing.rows.length === 0 || !existing.rows[0].check_in_time) {
      return res.status(400).json({ message: 'You must check in before checking out.' });
    }

    if (existing.rows[0].check_out_time) {
      return res.status(409).json({ message: 'You have already checked out today.' });
    }

    const result = await pool.query(
      `UPDATE attendance SET
        check_out_time = NOW(),
        check_out_latitude = $1,
        check_out_longitude = $2,
        check_out_accuracy = $3,
        check_out_ip = $4,
        check_out_selfie = $5
       WHERE user_id = $6 AND attendance_date = $7
       RETURNING *`,
      [latitude, longitude, accuracy, ip, selfie, userId, today]
    );

    res.json(formatAttendanceRecord(result.rows[0]));
  } catch (err) {
    console.error('Check-out error:', err);
    res.status(500).json({ message: 'Server error during check-out.' });
  }
}

async function getTodayStatus(req, res) {
  const userId = req.user.id;
  const today = getTodayDate();

  try {
    const result = await pool.query(
      'SELECT * FROM attendance WHERE user_id = $1 AND attendance_date = $2',
      [userId, today]
    );

    if (result.rows.length === 0) {
      return res.json({ checkedIn: false, checkedOut: false, record: null });
    }

    const record = result.rows[0];
    res.json({
      checkedIn: !!record.check_in_time,
      checkedOut: !!record.check_out_time,
      record: formatAttendanceRecord(record),
    });
  } catch (err) {
    console.error('Today status error:', err);
    res.status(500).json({ message: 'Server error.' });
  }
}

async function getHistory(req, res) {
  const userId = req.user.id;
  const { startDate, endDate, month } = req.query;

  try {
    let query = 'SELECT * FROM attendance WHERE user_id = $1';
    const params = [userId];
    let idx = 2;

    if (month) {
      query += ` AND TO_CHAR(attendance_date, 'YYYY-MM') = $${idx++}`;
      params.push(month);
    } else {
      if (startDate) {
        query += ` AND attendance_date >= $${idx++}`;
        params.push(startDate);
      }
      if (endDate) {
        query += ` AND attendance_date <= $${idx++}`;
        params.push(endDate);
      }
    }

    query += ' ORDER BY attendance_date DESC';

    const result = await pool.query(query, params);
    res.json(result.rows.map(formatAttendanceRecord));
  } catch (err) {
    console.error('History error:', err);
    res.status(500).json({ message: 'Server error.' });
  }
}

async function getAdminDashboard(req, res) {
  const today = getTodayDate();

  try {
    const totalEmployees = await pool.query(
      "SELECT COUNT(*) FROM users WHERE role = 'employee' AND status = 'active'"
    );

    const todayAttendance = await pool.query(
      `SELECT a.*, u.name, u.employee_id, u.department, s.start_time, s.grace_minutes,
        s.half_day_minutes, s.full_day_minutes, s.overtime_after_minutes, s.is_split
       FROM attendance a
       JOIN users u ON a.user_id = u.id
       LEFT JOIN shifts s ON s.id = u.shift_id
       WHERE a.attendance_date = $1`,
      [today]
    );

    const presentToday = todayAttendance.rows.filter((r) => r.check_in_time).length;
    const activeEmployees = parseInt(totalEmployees.rows[0].count, 10);
    const absentToday = activeEmployees - presentToday;
    const lateArrivals = todayAttendance.rows.filter((r) => {
      if (!r.check_in_time) return false;
      const h = new Date(r.check_in_time).getHours();
      const m = new Date(r.check_in_time).getMinutes();
      return h > 9 || (h === 9 && m > 30);
    }).length;

    res.json({
      totalEmployees: activeEmployees,
      presentToday,
      absentToday,
      lateArrivals,
    });
  } catch (err) {
    console.error('Admin dashboard error:', err);
    res.status(500).json({ message: 'Server error.' });
  }
}

async function getAdminAttendance(req, res) {
  const { date, userId, department, startDate, endDate } = req.query;

  try {
    let query = `
      SELECT a.*, u.name, u.employee_id, u.department, s.start_time, s.grace_minutes,
        s.half_day_minutes, s.full_day_minutes, s.overtime_after_minutes, s.is_split
      FROM attendance a
      JOIN users u ON a.user_id = u.id
      LEFT JOIN shifts s ON s.id = u.shift_id
      WHERE 1=1
    `;
    const params = [];
    let idx = 1;

    if (date) {
      query += ` AND a.attendance_date = $${idx++}`;
      params.push(date);
    }
    if (userId) {
      query += ` AND a.user_id = $${idx++}`;
      params.push(userId);
    }
    if (department) {
      query += ` AND u.department = $${idx++}`;
      params.push(department);
    }
    if (startDate) {
      query += ` AND a.attendance_date >= $${idx++}`;
      params.push(startDate);
    }
    if (endDate) {
      query += ` AND a.attendance_date <= $${idx++}`;
      params.push(endDate);
    }

    query += ' ORDER BY a.attendance_date DESC, u.name ASC';

    const result = await pool.query(query, params);
    res.json(
      result.rows.map((r) => ({
        id: r.id,
        employeeName: r.name,
        employeeId: r.employee_id,
        department: r.department,
        date: r.attendance_date,
        checkIn: r.check_in_time,
        checkOut: r.check_out_time,
        workingHours: calculateWorkingHours(r.check_in_time, r.check_out_time),
        status: getAttendanceStatus(r),
        checkInLocation: googleMapsLink(r.check_in_latitude, r.check_in_longitude),
        checkOutLocation: googleMapsLink(r.check_out_latitude, r.check_out_longitude),
        checkInIp: r.check_in_ip,
        checkOutIp: r.check_out_ip,
        checkInLatitude: r.check_in_latitude,
        checkInLongitude: r.check_in_longitude,
        checkOutLatitude: r.check_out_latitude,
        checkOutLongitude: r.check_out_longitude,
        userAgent: r.user_agent,
        hasSelfie: !!r.check_in_selfie,
        hasCheckoutSelfie: !!r.check_out_selfie,
        splitAttendance: !!r.is_split,
      }))
    );
  } catch (err) {
    console.error('Admin attendance error:', err);
    res.status(500).json({ message: 'Server error.' });
  }
}

async function exportAttendance(req, res) {
  const { date, userId, department, startDate, endDate } = req.query;

  try {
    let query = `
      SELECT a.*, u.name, u.employee_id, u.department, s.start_time, s.grace_minutes,
        s.half_day_minutes, s.full_day_minutes, s.overtime_after_minutes, s.is_split
      FROM attendance a
      JOIN users u ON a.user_id = u.id
      LEFT JOIN shifts s ON s.id = u.shift_id
      WHERE 1=1
    `;
    const params = [];
    let idx = 1;

    if (date) {
      query += ` AND a.attendance_date = $${idx++}`;
      params.push(date);
    }
    if (userId) {
      query += ` AND a.user_id = $${idx++}`;
      params.push(userId);
    }
    if (department) {
      query += ` AND u.department = $${idx++}`;
      params.push(department);
    }
    if (startDate) {
      query += ` AND a.attendance_date >= $${idx++}`;
      params.push(startDate);
    }
    if (endDate) {
      query += ` AND a.attendance_date <= $${idx++}`;
      params.push(endDate);
    }

    query += ' ORDER BY a.attendance_date DESC, u.name ASC';

    const result = await pool.query(query, params);

    const headers = [
      'Employee ID',
      'Employee Name',
      'Department',
      'Date',
      'Check In',
      'Check Out',
      'Working Hours',
      'Status',
      'Check In IP',
      'Check Out IP',
      'Check In Location',
      'Check Out Location',
    ];

    const rows = result.rows.map((r) => [
      r.employee_id,
      r.name,
      r.department,
      r.attendance_date,
      r.check_in_time || '',
      r.check_out_time || '',
      calculateWorkingHours(r.check_in_time, r.check_out_time) || '',
      getAttendanceStatus(r),
      r.check_in_ip || '',
      r.check_out_ip || '',
      googleMapsLink(r.check_in_latitude, r.check_in_longitude) || '',
      googleMapsLink(r.check_out_latitude, r.check_out_longitude) || '',
    ]);

    const csv = [headers, ...rows]
      .map((row) => row.map((cell) => `"${String(cell).replace(/"/g, '""')}"`).join(','))
      .join('\n');

    res.setHeader('Content-Type', 'text/csv');
    res.setHeader('Content-Disposition', 'attachment; filename=attendance_export.csv');
    res.send(csv);
  } catch (err) {
    console.error('Export error:', err);
    res.status(500).json({ message: 'Server error.' });
  }
}

function formatAttendanceRecord(record) {
  return {
    id: record.id,
    userId: record.user_id,
    date: record.attendance_date,
    checkIn: record.check_in_time,
    checkOut: record.check_out_time,
    workingHours: calculateWorkingHours(record.check_in_time, record.check_out_time),
    status: getAttendanceStatus(record),
    checkInLatitude: record.check_in_latitude,
    checkInLongitude: record.check_in_longitude,
    checkInAccuracy: record.check_in_accuracy,
    checkInIp: record.check_in_ip,
    checkOutLatitude: record.check_out_latitude,
    checkOutLongitude: record.check_out_longitude,
    checkOutAccuracy: record.check_out_accuracy,
    checkOutIp: record.check_out_ip,
    checkInLocation: googleMapsLink(record.check_in_latitude, record.check_in_longitude),
    checkOutLocation: googleMapsLink(record.check_out_latitude, record.check_out_longitude),
    userAgent: record.user_agent,
    hasSelfie: !!record.check_in_selfie,
    hasCheckoutSelfie: !!record.check_out_selfie,
  };
}

module.exports = {
  checkIn,
  checkOut,
  getTodayStatus,
  getHistory,
  getAdminDashboard,
  getAdminAttendance,
  exportAttendance,
};
