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

async function deleteHoliday(req, res) {
  await pool.query('DELETE FROM holidays WHERE id = $1', [req.params.id]);
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

module.exports = { getSetupData, createDepartment, createBranch, createShift,
  getHolidays, createHoliday, deleteHoliday, updateRules };
