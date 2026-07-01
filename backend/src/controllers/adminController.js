const pool = require('../config/db');

async function getSetupData(_req, res) {
  try {
    const [departments, branches, shifts, rules] = await Promise.all([
      pool.query('SELECT id, name FROM departments ORDER BY name'),
      pool.query('SELECT * FROM branches ORDER BY name'),
      pool.query(`SELECT s.*, COALESCE(json_agg(ss ORDER BY ss.slot_order)
        FILTER (WHERE ss.id IS NOT NULL), '[]') AS slots
        FROM shifts s LEFT JOIN shift_slots ss ON ss.shift_id = s.id
        GROUP BY s.id ORDER BY s.name`),
      pool.query('SELECT * FROM attendance_rules WHERE id = 1'),
    ]);
    res.json({
      departments: departments.rows,
      branches: branches.rows,
      shifts: shifts.rows,
      rules: rules.rows[0],
    });
  } catch (err) {
    console.error('Setup data error:', err);
    res.status(500).json({ message: 'Unable to load setup data.' });
  }
}

async function createDepartment(req, res) {
  try {
    const result = await pool.query(
      'INSERT INTO departments (name) VALUES ($1) RETURNING id, name',
      [req.body.name.trim()]
    );
    res.status(201).json(result.rows[0]);
  } catch (err) {
    if (err.code === '23505') return res.status(409).json({ message: 'Department already exists.' });
    res.status(500).json({ message: 'Unable to create department.' });
  }
}

async function updateDepartment(req, res) {
  try {
    const result = await pool.query(
      'UPDATE departments SET name = $1 WHERE id = $2 RETURNING id, name',
      [req.body.name.trim(), req.params.id]
    );
    if (result.rows.length === 0) {
      return res.status(404).json({ message: 'Department not found.' });
    }
    await pool.query(
      'UPDATE users SET department = $1 WHERE department_id = $2',
      [result.rows[0].name, req.params.id]
    );
    res.json(result.rows[0]);
  } catch (err) {
    if (err.code === '23505') return res.status(409).json({ message: 'Department name already exists.' });
    res.status(500).json({ message: 'Unable to update department.' });
  }
}

async function deleteDepartment(req, res) {
  try {
    const inUse = await pool.query(
      'SELECT COUNT(*) FROM users WHERE department_id = $1',
      [req.params.id]
    );
    if (parseInt(inUse.rows[0].count, 10) > 0) {
      return res.status(409).json({
        message: 'Cannot delete department. Employees are assigned to it. Reassign them first.',
      });
    }
    const result = await pool.query(
      'DELETE FROM departments WHERE id = $1 RETURNING id',
      [req.params.id]
    );
    if (result.rows.length === 0) {
      return res.status(404).json({ message: 'Department not found.' });
    }
    res.status(204).send();
  } catch (err) {
    res.status(500).json({ message: 'Unable to delete department.' });
  }
}

async function createBranch(req, res) {
  const b = req.body;
  try {
    const result = await pool.query(
      `INSERT INTO branches (name, address_line1, address_line2, city, state, country,
       pincode, latitude, longitude, allowed_radius_meters)
       VALUES ($1,$2,$3,$4,$5,$6,$7,$8,$9,$10) RETURNING *`,
      [b.name, b.addressLine1, b.addressLine2 || null, b.city, b.state,
        b.country || 'India', b.pincode, b.latitude, b.longitude, b.allowedRadiusMeters || 100]
    );
    res.status(201).json(result.rows[0]);
  } catch (err) {
    if (err.code === '23505') return res.status(409).json({ message: 'Branch already exists.' });
    res.status(500).json({ message: 'Unable to create branch.' });
  }
}

async function updateBranch(req, res) {
  const b = req.body;
  try {
    const result = await pool.query(
      `UPDATE branches SET
        name = $1, address_line1 = $2, address_line2 = $3, city = $4, state = $5,
        country = $6, pincode = $7, latitude = $8, longitude = $9, allowed_radius_meters = $10
       WHERE id = $11 RETURNING *`,
      [b.name, b.addressLine1, b.addressLine2 || null, b.city, b.state,
        b.country || 'India', b.pincode, b.latitude, b.longitude,
        b.allowedRadiusMeters || 100, req.params.id]
    );
    if (result.rows.length === 0) {
      return res.status(404).json({ message: 'Branch not found.' });
    }
    res.json(result.rows[0]);
  } catch (err) {
    if (err.code === '23505') return res.status(409).json({ message: 'Branch name already exists.' });
    res.status(500).json({ message: 'Unable to update branch.' });
  }
}

async function deleteBranch(req, res) {
  try {
    const inUse = await pool.query(
      'SELECT COUNT(*) FROM users WHERE branch_id = $1',
      [req.params.id]
    );
    if (parseInt(inUse.rows[0].count, 10) > 0) {
      return res.status(409).json({
        message: 'Cannot delete branch. Employees are assigned to it. Reassign them first.',
      });
    }
    const result = await pool.query(
      'DELETE FROM branches WHERE id = $1 RETURNING id',
      [req.params.id]
    );
    if (result.rows.length === 0) {
      return res.status(404).json({ message: 'Branch not found.' });
    }
    res.status(204).send();
  } catch (err) {
    res.status(500).json({ message: 'Unable to delete branch.' });
  }
}

async function createShift(req, res) {
  const { name, startTime, endTime, graceMinutes, halfDayMinutes, fullDayMinutes,
    overtimeAfterMinutes, isSplit, slots = [] } = req.body;
  const client = await pool.connect();
  try {
    await client.query('BEGIN');
    const result = await client.query(
      `INSERT INTO shifts (name, start_time, end_time, grace_minutes, half_day_minutes,
       full_day_minutes, overtime_after_minutes, is_split)
       VALUES ($1,$2,$3,$4,$5,$6,$7,$8) RETURNING *`,
      [name, startTime, endTime, graceMinutes || 0, halfDayMinutes || 240,
        fullDayMinutes || 480, overtimeAfterMinutes || 540, !!isSplit]
    );
    for (let i = 0; i < slots.length; i += 1) {
      await client.query(
        'INSERT INTO shift_slots (shift_id, slot_order, start_time, end_time) VALUES ($1,$2,$3,$4)',
        [result.rows[0].id, i + 1, slots[i].startTime, slots[i].endTime]
      );
    }
    await client.query('COMMIT');
    res.status(201).json(result.rows[0]);
  } catch (err) {
    await client.query('ROLLBACK');
    if (err.code === '23505') return res.status(409).json({ message: 'Shift already exists.' });
    res.status(500).json({ message: 'Unable to create shift.' });
  } finally {
    client.release();
  }
}

async function updateShift(req, res) {
  const { name, startTime, endTime, graceMinutes, halfDayMinutes, fullDayMinutes,
    overtimeAfterMinutes, isSplit, slots = [] } = req.body;
  const client = await pool.connect();
  try {
    await client.query('BEGIN');
    const result = await client.query(
      `UPDATE shifts SET
        name = $1, start_time = $2, end_time = $3, grace_minutes = $4,
        half_day_minutes = $5, full_day_minutes = $6, overtime_after_minutes = $7, is_split = $8
       WHERE id = $9 RETURNING *`,
      [name, startTime, endTime, graceMinutes || 0, halfDayMinutes || 240,
        fullDayMinutes || 480, overtimeAfterMinutes || 540, !!isSplit, req.params.id]
    );
    if (result.rows.length === 0) {
      await client.query('ROLLBACK');
      return res.status(404).json({ message: 'Shift not found.' });
    }
    await client.query('DELETE FROM shift_slots WHERE shift_id = $1', [req.params.id]);
    for (let i = 0; i < slots.length; i += 1) {
      await client.query(
        'INSERT INTO shift_slots (shift_id, slot_order, start_time, end_time) VALUES ($1,$2,$3,$4)',
        [req.params.id, i + 1, slots[i].startTime, slots[i].endTime]
      );
    }
    await client.query('COMMIT');
    res.json(result.rows[0]);
  } catch (err) {
    await client.query('ROLLBACK');
    if (err.code === '23505') return res.status(409).json({ message: 'Shift name already exists.' });
    res.status(500).json({ message: 'Unable to update shift.' });
  } finally {
    client.release();
  }
}

async function deleteShift(req, res) {
  try {
    const inUse = await pool.query(
      'SELECT COUNT(*) FROM users WHERE shift_id = $1',
      [req.params.id]
    );
    if (parseInt(inUse.rows[0].count, 10) > 0) {
      return res.status(409).json({
        message: 'Cannot delete shift. Employees are assigned to it. Reassign them first.',
      });
    }
    const result = await pool.query(
      'DELETE FROM shifts WHERE id = $1 RETURNING id',
      [req.params.id]
    );
    if (result.rows.length === 0) {
      return res.status(404).json({ message: 'Shift not found.' });
    }
    res.status(204).send();
  } catch (err) {
    res.status(500).json({ message: 'Unable to delete shift.' });
  }
}

async function getHolidays(_req, res) {
  try {
    const result = await pool.query(`SELECT h.*, b.name AS branch_name FROM holidays h
      LEFT JOIN branches b ON b.id = h.branch_id ORDER BY holiday_date DESC`);
    res.json(result.rows);
  } catch (err) {
    res.status(500).json({ message: 'Unable to load holidays.' });
  }
}

async function createHoliday(req, res) {
  const { name, holidayDate, branchId, description } = req.body;
  try {
    const result = await pool.query(
      `INSERT INTO holidays (name, holiday_date, branch_id, description)
       VALUES ($1,$2,$3,$4) RETURNING *`,
      [name, holidayDate, branchId || null, description || null]
    );
    res.status(201).json(result.rows[0]);
  } catch (err) {
    if (err.code === '23505') return res.status(409).json({ message: 'Holiday already exists for this date and branch.' });
    res.status(500).json({ message: 'Unable to create holiday.' });
  }
}

async function updateHoliday(req, res) {
  const { name, holidayDate, branchId, description } = req.body;
  try {
    const result = await pool.query(
      `UPDATE holidays SET name = $1, holiday_date = $2, branch_id = $3, description = $4
       WHERE id = $5 RETURNING *`,
      [name, holidayDate, branchId || null, description || null, req.params.id]
    );
    if (result.rows.length === 0) {
      return res.status(404).json({ message: 'Holiday not found.' });
    }
    res.json(result.rows[0]);
  } catch (err) {
    if (err.code === '23505') return res.status(409).json({ message: 'Holiday already exists for this date and branch.' });
    res.status(500).json({ message: 'Unable to update holiday.' });
  }
}

async function deleteHoliday(req, res) {
  const result = await pool.query(
    'DELETE FROM holidays WHERE id = $1 RETURNING id',
    [req.params.id]
  );
  if (result.rows.length === 0) {
    return res.status(404).json({ message: 'Holiday not found.' });
  }
  res.status(204).send();
}

async function updateRules(req, res) {
  const result = await pool.query(
    `UPDATE attendance_rules SET late_grace_occurrences = $1, updated_at = NOW()
     WHERE id = 1 RETURNING *`,
    [req.body.lateGraceOccurrences]
  );
  res.json(result.rows[0]);
}

module.exports = {
  getSetupData,
  createDepartment,
  updateDepartment,
  deleteDepartment,
  createBranch,
  updateBranch,
  deleteBranch,
  createShift,
  updateShift,
  deleteShift,
  getHolidays,
  createHoliday,
  updateHoliday,
  deleteHoliday,
  updateRules,
};
