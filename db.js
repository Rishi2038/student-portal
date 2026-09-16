const { DatabaseSync } = require('node:sqlite');
const path = require('node:path');
const bcrypt = require('bcryptjs');

const dbPath = path.join(__dirname, 'students.db');
const db = new DatabaseSync(dbPath);

// Initialize schema
function initDb() {
  db.exec(`
    CREATE TABLE IF NOT EXISTS users (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      roll_no TEXT UNIQUE NOT NULL,
      name TEXT NOT NULL,
      password_hash TEXT NOT NULL,
      role TEXT NOT NULL DEFAULT 'student',
      cgpa REAL NOT NULL DEFAULT 0.0,
      attendance REAL NOT NULL DEFAULT 0.0,
      department TEXT DEFAULT 'Computer Science',
      created_at DATETIME DEFAULT CURRENT_TIMESTAMP
    );
  `);

  // Check if admin exists
  const checkAdmin = db.prepare('SELECT * FROM users WHERE roll_no = ?').get('admin');
  if (!checkAdmin) {
    const adminHash = bcrypt.hashSync('admin123', 10);
    db.prepare(`
      INSERT INTO users (roll_no, name, password_hash, role, cgpa, attendance, department)
      VALUES (?, ?, ?, 'admin', 0.0, 0.0, 'Administration')
    `).run('admin', 'System Administrator', adminHash);
    console.log('Default admin created: admin / admin123');
  }

  // Seed sample students if database is fresh
  const studentCount = db.prepare('SELECT COUNT(*) as count FROM users WHERE role = ?').get('student');
  if (studentCount.count === 0) {
    const sampleStudents = [
      {
        roll_no: '2024CS001',
        name: 'Aarav Sharma',
        password: 'pass@2024CS001',
        cgpa: 9.25,
        attendance: 94.0,
        department: 'Computer Science & Engineering'
      },
      {
        roll_no: '2024CS002',
        name: 'Priya Patel',
        password: 'pass@2024CS002',
        cgpa: 8.70,
        attendance: 86.5,
        department: 'Computer Science & Engineering'
      },
      {
        roll_no: '2024CS003',
        name: 'Rohan Verma',
        password: 'pass@2024CS003',
        cgpa: 6.80,
        attendance: 64.0, // warning state (< 75%)
        department: 'Information Technology'
      },
      {
        roll_no: '2024CS004',
        name: 'Sneha Reddy',
        password: 'pass@2024CS004',
        cgpa: 9.65,
        attendance: 98.0,
        department: 'Data Science & AI'
      }
    ];

    const insertStmt = db.prepare(`
      INSERT INTO users (roll_no, name, password_hash, role, cgpa, attendance, department)
      VALUES (?, ?, ?, 'student', ?, ?, ?)
    `);

    for (const student of sampleStudents) {
      const hash = bcrypt.hashSync(student.password, 10);
      insertStmt.run(student.roll_no, student.name, hash, student.cgpa, student.attendance, student.department);
    }
    console.log('Sample students seeded.');
  }
}

initDb();

module.exports = {
  db,
  // Helper queries
  getUserByRoll: (roll_no) => db.prepare('SELECT * FROM users WHERE roll_no = ?').get(roll_no),
  getUserById: (id) => db.prepare('SELECT * FROM users WHERE id = ?').get(id),
  getAllStudents: (search = '') => {
    if (search && search.trim()) {
      const param = `%${search.trim()}%`;
      return db.prepare(`
        SELECT id, roll_no, name, cgpa, attendance, department, created_at
        FROM users
        WHERE role = 'student' AND (roll_no LIKE ? OR name LIKE ? OR department LIKE ?)
        ORDER BY roll_no ASC
      `).all(param, param, param);
    }
    return db.prepare(`
      SELECT id, roll_no, name, cgpa, attendance, department, created_at
      FROM users
      WHERE role = 'student'
      ORDER BY roll_no ASC
    `).all();
  },
  createStudent: (studentData) => {
    const { roll_no, name, password, cgpa, attendance, department } = studentData;
    const hash = bcrypt.hashSync(password, 10);
    const stmt = db.prepare(`
      INSERT INTO users (roll_no, name, password_hash, role, cgpa, attendance, department)
      VALUES (?, ?, ?, 'student', ?, ?, ?)
    `);
    const result = stmt.run(
      roll_no.trim(),
      name.trim(),
      hash,
      parseFloat(cgpa) || 0.0,
      parseFloat(attendance) || 0.0,
      (department || 'General').trim()
    );
    return result.lastInsertRowid;
  },
  updateStudent: (id, studentData) => {
    const { name, cgpa, attendance, department, password } = studentData;
    if (password && password.trim()) {
      const hash = bcrypt.hashSync(password.trim(), 10);
      const stmt = db.prepare(`
        UPDATE users
        SET name = ?, cgpa = ?, attendance = ?, department = ?, password_hash = ?
        WHERE id = ? AND role = 'student'
      `);
      return stmt.run(name.trim(), parseFloat(cgpa), parseFloat(attendance), (department || 'General').trim(), hash, id);
    } else {
      const stmt = db.prepare(`
        UPDATE users
        SET name = ?, cgpa = ?, attendance = ?, department = ?
        WHERE id = ? AND role = 'student'
      `);
      return stmt.run(name.trim(), parseFloat(cgpa), parseFloat(attendance), (department || 'General').trim(), id);
    }
  },
  deleteStudent: (id) => {
    const stmt = db.prepare("DELETE FROM users WHERE id = ? AND role = 'student'");
    return stmt.run(id);
  },
  updatePassword: (id, newPassword) => {
    const hash = bcrypt.hashSync(newPassword, 10);
    const stmt = db.prepare('UPDATE users SET password_hash = ? WHERE id = ?');
    return stmt.run(hash, id);
  },
  getStats: () => {
    const totalStudents = db.prepare("SELECT COUNT(*) as count FROM users WHERE role = 'student'").get().count;
    const avgStats = db.prepare(`
      SELECT 
        AVG(cgpa) as avgCgpa, 
        AVG(attendance) as avgAttendance,
        SUM(CASE WHEN attendance < 75 THEN 1 ELSE 0 END) as lowAttendanceCount
      FROM users 
      WHERE role = 'student'
    `).get();
    return {
      totalStudents,
      avgCgpa: avgStats.avgCgpa ? Number(avgStats.avgCgpa.toFixed(2)) : 0,
      avgAttendance: avgStats.avgAttendance ? Number(avgStats.avgAttendance.toFixed(1)) : 0,
      lowAttendanceCount: avgStats.lowAttendanceCount || 0
    };
  }
};
