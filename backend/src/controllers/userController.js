const bcrypt = require('bcryptjs');
const XLSX = require('xlsx');
const { validationResult } = require('express-validator');
const pool = require('../config/db');

const selectUsers = `SELECT u.id, u.employee_id, u.name, u.email, u.role, u.department,
  u.department_id, u.designation, u.phone, u.address_line1, u.address_line2, u.city,
  u.state, u.country, u.pincode, u.branch_id, b.name AS branch_name, u.shift_id,
  s.name AS shift_name, s.is_split, u.status, u.created_at,
  COALESCE(array_agg(wo.day_of_week) FILTER (WHERE wo.day_of_week IS NOT NULL), '{}') AS week_offs
  FROM users u LEFT JOIN branches b ON b.id = u.branch_id
  LEFT JOIN shifts s ON s.id = u.shift_id
  LEFT JOIN user_week_offs wo ON wo.user_id = u.id`;

function formatUser(u) {
  return {
    id: u.id, employeeId: u.employee_id, name: u.name, email: u.email, role: u.role,
    department: u.department, departmentId: u.department_id, designation: u.designation,
    phone: u.phone, addressLine1: u.address_line1, addressLine2: u.address_line2,
    city: u.city, state: u.state, country: u.country, pincode: u.pincode,
    branchId: u.branch_id, branchName: u.branch_name, shiftId: u.shift_id,
    shiftName: u.shift_name, splitShift: u.is_split, weekOffs: u.week_offs || [],
    status: u.status, createdAt: u.created_at,
  };
}

async function getProfile(req, res) {
  try {
    const result = await pool.query(`${selectUsers} WHERE u.id = $1 GROUP BY u.id, b.name, s.name, s.is_split`, [req.user.id]);
    if (!result.rows.length) return res.status(404).json({ message: 'User not found.' });
    res.json(formatUser(result.rows[0]));
  } catch (err) {
    res.status(500).json({ message: 'Server error.' });
  }
}

async function getAllUsers(_req, res) {
  try {
    const result = await pool.query(`${selectUsers} GROUP BY u.id, b.name, s.name, s.is_split ORDER BY u.created_at DESC`);
    res.json(result.rows.map(formatUser));
  } catch (err) {
    console.error('Get users error:', err);
    res.status(500).json({ message: 'Server error.' });
  }
}

function userValues(body) {
  return [body.employeeId, body.name, body.email.toLowerCase(), body.role || 'employee',
    body.department, body.departmentId || null, body.designation || null, body.phone || null,
    body.addressLine1 || null, body.addressLine2 || null, body.city || null, body.state || null,
    body.country || null, body.pincode || null, body.branchId || null, body.shiftId || null];
}

async function saveWeekOffs(client, userId, weekOffs = []) {
  await client.query('DELETE FROM user_week_offs WHERE user_id = $1', [userId]);
  for (const day of weekOffs) {
    await client.query('INSERT INTO user_week_offs (user_id, day_of_week) VALUES ($1,$2)', [userId, day]);
  }
}

async function createUser(req, res) {
  const errors = validationResult(req);
  if (!errors.isEmpty()) return res.status(400).json({ errors: errors.array() });
  const client = await pool.connect();
  try {
    await client.query('BEGIN');
    const passwordHash = await bcrypt.hash(req.body.password, 12);
    const vals = userValues(req.body);
    const result = await client.query(
      `INSERT INTO users (employee_id,name,email,role,department,department_id,designation,phone,
       address_line1,address_line2,city,state,country,pincode,branch_id,shift_id,password_hash)
       VALUES ($1,$2,$3,$4,$5,$6,$7,$8,$9,$10,$11,$12,$13,$14,$15,$16,$17) RETURNING id`,
      [...vals, passwordHash]
    );
    await saveWeekOffs(client, result.rows[0].id, req.body.weekOffs);
    await client.query('COMMIT');
    res.status(201).json({ id: result.rows[0].id, message: 'Employee created.' });
  } catch (err) {
    await client.query('ROLLBACK');
    if (err.code === '23505') return res.status(409).json({ message: 'Email or Employee ID already exists.' });
    console.error('Create user error:', err);
    res.status(500).json({ message: 'Server error.' });
  } finally { client.release(); }
}

async function updateUser(req, res) {
  const client = await pool.connect();
  try {
    await client.query('BEGIN');
    const b = req.body;
    const result = await client.query(
      `UPDATE users SET name=$1,email=$2,role=$3,department=$4,department_id=$5,designation=$6,
       phone=$7,address_line1=$8,address_line2=$9,city=$10,state=$11,country=$12,pincode=$13,
       branch_id=$14,shift_id=$15 WHERE id=$16 RETURNING id`,
      [b.name, b.email.toLowerCase(), b.role, b.department, b.departmentId || null,
        b.designation || null, b.phone || null, b.addressLine1 || null, b.addressLine2 || null,
        b.city || null, b.state || null, b.country || null, b.pincode || null,
        b.branchId || null, b.shiftId || null, req.params.id]
    );
    if (!result.rows.length) { await client.query('ROLLBACK'); return res.status(404).json({ message: 'User not found.' }); }
    await saveWeekOffs(client, req.params.id, b.weekOffs);
    await client.query('COMMIT');
    res.json({ message: 'Employee updated.' });
  } catch (err) {
    await client.query('ROLLBACK');
    if (err.code === '23505') return res.status(409).json({ message: 'Email already exists.' });
    res.status(500).json({ message: 'Server error.' });
  } finally { client.release(); }
}

async function resetPassword(req, res) {
  const hash = await bcrypt.hash(req.body.password, 12);
  const result = await pool.query('UPDATE users SET password_hash=$1 WHERE id=$2 RETURNING id', [hash, req.params.id]);
  if (!result.rows.length) return res.status(404).json({ message: 'User not found.' });
  res.json({ message: 'Password reset successfully.' });
}

async function disableUser(req, res) {
  const result = await pool.query("UPDATE users SET status='disabled' WHERE id=$1 RETURNING id", [req.params.id]);
  if (!result.rows.length) return res.status(404).json({ message: 'User not found.' });
  res.json({ message: 'Employee disabled.' });
}

async function bulkCreateUsers(req, res) {
  if (!req.file) return res.status(400).json({ message: 'CSV or Excel file is required.' });
  let rows;
  try {
    const workbook = XLSX.read(req.file.buffer, { type: 'buffer' });
    rows = XLSX.utils.sheet_to_json(workbook.Sheets[workbook.SheetNames[0]], { defval: '' });
  } catch (_err) {
    return res.status(400).json({ message: 'Unable to read the uploaded file.' });
  }
  const created = [];
  const failed = [];
  for (let i = 0; i < rows.length; i += 1) {
    const raw = Object.fromEntries(Object.entries(rows[i]).map(([k, v]) => [k.trim().toLowerCase().replace(/[ _-]/g, ''), v]));
    const employeeId = String(raw.employeeid || '').trim();
    const name = String(raw.name || '').trim();
    const email = String(raw.email || '').trim().toLowerCase();
    const department = String(raw.department || '').trim();
    const password = String(raw.password || 'Welcome@123');
    if (!employeeId || !name || !email || !department) {
      failed.push({ row: i + 2, employeeId, error: 'employeeId, name, email and department are required' });
      continue;
    }
    try {
      const hash = await bcrypt.hash(password, 12);
      await pool.query(`INSERT INTO users (employee_id,name,email,password_hash,role,department,designation,phone)
        VALUES ($1,$2,$3,$4,$5,$6,$7,$8)`,
      [employeeId, name, email, hash, raw.role === 'admin' ? 'admin' : 'employee', department,
        raw.designation || null, raw.phone ? String(raw.phone) : null]);
      created.push(employeeId);
    } catch (err) {
      failed.push({ row: i + 2, employeeId, error: err.code === '23505' ? 'Duplicate email or employee ID' : 'Database error' });
    }
  }
  res.status(failed.length ? 207 : 201).json({ created: created.length, failed });
}

module.exports = { getProfile, getAllUsers, createUser, updateUser, resetPassword, disableUser, bulkCreateUsers };
