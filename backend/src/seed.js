const bcrypt = require('bcryptjs');
const fs = require('fs');
const path = require('path');
const pool = require('./config/db');

async function seed() {
  try {
    const schemaPath = path.join(__dirname, '../../database/schema.sql');
    const schema = fs.readFileSync(schemaPath, 'utf8');
    await pool.query(schema);

    const adminHash = await bcrypt.hash('Admin@123', 12);
    const employeeHash = await bcrypt.hash('Employee@123', 12);

    await pool.query(
      `INSERT INTO users (employee_id, name, email, password_hash, role, department)
       VALUES
         ('EMP001', 'Admin User', 'admin@company.com', $1, 'admin', 'Management'),
         ('EMP002', 'John Doe', 'john@company.com', $2, 'employee', 'Engineering'),
         ('EMP003', 'Jane Smith', 'jane@company.com', $2, 'employee', 'Design'),
         ('EMP004', 'Bob Wilson', 'bob@company.com', $2, 'employee', 'Marketing')
       ON CONFLICT (email) DO NOTHING`,
      [adminHash, employeeHash]
    );

    console.log('Database seeded successfully!');
    console.log('\nTest Credentials:');
    console.log('  Admin:    admin@company.com / Admin@123');
    console.log('  Employee: john@company.com / Employee@123');
    console.log('  Employee: jane@company.com / Employee@123');
  } catch (err) {
    console.error('Seed error:', err);
    process.exit(1);
  } finally {
    await pool.end();
  }
}

seed();
