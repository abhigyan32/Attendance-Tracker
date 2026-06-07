const bcrypt = require('bcryptjs');
const { validationResult } = require('express-validator');
const pool = require('../config/db');

async function getProfile(req, res) {
  try {
    const result = await pool.query(
      `SELECT id, employee_id, name, email, role, department, status, created_at
       FROM users WHERE id = $1`,
      [req.user.id]
    );

    if (result.rows.length === 0) {
      return res.status(404).json({ message: 'User not found.' });
    }

    const user = result.rows[0];
    res.json({
      id: user.id,
      employeeId: user.employee_id,
      name: user.name,
      email: user.email,
      role: user.role,
      department: user.department,
      status: user.status,
      createdAt: user.created_at,
    });
  } catch (err) {
    console.error('Get profile error:', err);
    res.status(500).json({ message: 'Server error.' });
  }
}

async function getAllUsers(req, res) {
  try {
    const result = await pool.query(
      `SELECT id, employee_id, name, email, role, department, status, created_at
       FROM users ORDER BY created_at DESC`
    );

    res.json(
      result.rows.map((u) => ({
        id: u.id,
        employeeId: u.employee_id,
        name: u.name,
        email: u.email,
        role: u.role,
        department: u.department,
        status: u.status,
        createdAt: u.created_at,
      }))
    );
  } catch (err) {
    console.error('Get all users error:', err);
    res.status(500).json({ message: 'Server error.' });
  }
}

async function createUser(req, res) {
  const errors = validationResult(req);
  if (!errors.isEmpty()) {
    return res.status(400).json({ errors: errors.array() });
  }

  const { employeeId, name, email, password, role, department } = req.body;

  try {
    const existing = await pool.query(
      'SELECT id FROM users WHERE email = $1 OR employee_id = $2',
      [email.toLowerCase(), employeeId]
    );

    if (existing.rows.length > 0) {
      return res.status(409).json({ message: 'Email or Employee ID already exists.' });
    }

    const passwordHash = await bcrypt.hash(password, 12);
    const result = await pool.query(
      `INSERT INTO users (employee_id, name, email, password_hash, role, department)
       VALUES ($1, $2, $3, $4, $5, $6)
       RETURNING id, employee_id, name, email, role, department, status, created_at`,
      [employeeId, name, email.toLowerCase(), passwordHash, role || 'employee', department]
    );

    const u = result.rows[0];
    res.status(201).json({
      id: u.id,
      employeeId: u.employee_id,
      name: u.name,
      email: u.email,
      role: u.role,
      department: u.department,
      status: u.status,
      createdAt: u.created_at,
    });
  } catch (err) {
    console.error('Create user error:', err);
    res.status(500).json({ message: 'Server error.' });
  }
}

async function updateUser(req, res) {
  const errors = validationResult(req);
  if (!errors.isEmpty()) {
    return res.status(400).json({ errors: errors.array() });
  }

  const { id } = req.params;
  const { name, email, role, department, password } = req.body;

  try {
    const fields = [];
    const values = [];
    let idx = 1;

    if (name) {
      fields.push(`name = $${idx++}`);
      values.push(name);
    }
    if (email) {
      fields.push(`email = $${idx++}`);
      values.push(email.toLowerCase());
    }
    if (role) {
      fields.push(`role = $${idx++}`);
      values.push(role);
    }
    if (department) {
      fields.push(`department = $${idx++}`);
      values.push(department);
    }
    if (password) {
      const passwordHash = await bcrypt.hash(password, 12);
      fields.push(`password_hash = $${idx++}`);
      values.push(passwordHash);
    }

    if (fields.length === 0) {
      return res.status(400).json({ message: 'No fields to update.' });
    }

    values.push(id);
    const result = await pool.query(
      `UPDATE users SET ${fields.join(', ')} WHERE id = $${idx}
       RETURNING id, employee_id, name, email, role, department, status, created_at`,
      values
    );

    if (result.rows.length === 0) {
      return res.status(404).json({ message: 'User not found.' });
    }

    const u = result.rows[0];
    res.json({
      id: u.id,
      employeeId: u.employee_id,
      name: u.name,
      email: u.email,
      role: u.role,
      department: u.department,
      status: u.status,
      createdAt: u.created_at,
    });
  } catch (err) {
    console.error('Update user error:', err);
    res.status(500).json({ message: 'Server error.' });
  }
}

async function disableUser(req, res) {
  const { id } = req.params;

  try {
    const result = await pool.query(
      `UPDATE users SET status = 'disabled' WHERE id = $1
       RETURNING id, employee_id, name, email, role, department, status`,
      [id]
    );

    if (result.rows.length === 0) {
      return res.status(404).json({ message: 'User not found.' });
    }

    const u = result.rows[0];
    res.json({
      id: u.id,
      employeeId: u.employee_id,
      name: u.name,
      email: u.email,
      role: u.role,
      department: u.department,
      status: u.status,
    });
  } catch (err) {
    console.error('Disable user error:', err);
    res.status(500).json({ message: 'Server error.' });
  }
}

module.exports = {
  getProfile,
  getAllUsers,
  createUser,
  updateUser,
  disableUser,
};
