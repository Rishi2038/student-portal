const express = require('express');
const cookieParser = require('cookie-parser');
const path = require('node:path');
const bcrypt = require('bcryptjs');
const db = require('./db');
const {
  createToken,
  authMiddleware,
  requireAuth,
  requireAdmin,
  requireStudent
} = require('./auth');

const app = express();
const PORT = process.env.PORT || 3000;

app.use(express.json());
app.use(express.urlencoded({ extended: true }));
app.use(cookieParser());
app.use(authMiddleware);

// Serve static frontend assets
app.use(express.static(path.join(__dirname, 'public')));

// ================= AUTH ROUTES ================= //

// Login endpoint (Admin or Student)
app.post('/api/auth/login', (req, res) => {
  const { roll_no, password } = req.body;

  if (!roll_no || !password) {
    return res.status(400).json({ error: 'Please provide both ID / Roll Number and Password.' });
  }

  // Look up user (trimmed)
  const trimmedRoll = roll_no.trim();
  const user = db.getUserByRoll(trimmedRoll);

  if (!user) {
    return res.status(401).json({ error: 'Invalid Roll Number or Password.' });
  }

  const isMatch = bcrypt.compareSync(password, user.password_hash);
  if (!isMatch) {
    return res.status(401).json({ error: 'Invalid Roll Number or Password.' });
  }

  // Create token and set cookie
  const token = createToken({
    id: user.id,
    roll_no: user.roll_no,
    role: user.role
  });

  res.cookie('session_token', token, {
    httpOnly: true,
    maxAge: 24 * 60 * 60 * 1000,
    sameSite: 'lax',
    secure: false // true if HTTPS
  });

  res.json({
    success: true,
    user: {
      id: user.id,
      roll_no: user.roll_no,
      name: user.name,
      role: user.role,
      department: user.department
    }
  });
});

// Logout endpoint
app.post('/api/auth/logout', (req, res) => {
  res.clearCookie('session_token');
  res.json({ success: true, message: 'Logged out successfully.' });
});

// Get current session user
app.get('/api/auth/me', (req, res) => {
  if (req.user) {
    res.json({ authenticated: true, user: req.user });
  } else {
    res.json({ authenticated: false, user: null });
  }
});

// ================= ADMIN ROUTES ================= //

// Get all students + system stats
app.get('/api/students', requireAdmin, (req, res) => {
  const search = req.query.search || '';
  const students = db.getAllStudents(search);
  const stats = db.getStats();
  res.json({ students, stats });
});

// Add a new student
app.post('/api/students', requireAdmin, (req, res) => {
  let { roll_no, name, password, cgpa, attendance, department } = req.body;

  if (!roll_no || !roll_no.trim()) {
    return res.status(400).json({ error: 'Roll number is required.' });
  }
  if (!name || !name.trim()) {
    return res.status(400).json({ error: 'Student name is required.' });
  }
  if (!password || password.length < 4) {
    return res.status(400).json({ error: 'Password must be at least 4 characters.' });
  }

  roll_no = roll_no.trim();
  const existing = db.getUserByRoll(roll_no);
  if (existing) {
    return res.status(409).json({ error: `Student with roll number "${roll_no}" already exists.` });
  }

  const numCgpa = parseFloat(cgpa) || 0.0;
  const numAttendance = parseFloat(attendance) || 0.0;

  if (numCgpa < 0 || numCgpa > 10) {
    return res.status(400).json({ error: 'CGPA must be between 0.0 and 10.0.' });
  }
  if (numAttendance < 0 || numAttendance > 100) {
    return res.status(400).json({ error: 'Attendance must be between 0% and 100%.' });
  }

  try {
    const studentId = db.createStudent({
      roll_no,
      name,
      password,
      cgpa: numCgpa,
      attendance: numAttendance,
      department: department || 'Computer Science'
    });

    res.status(201).json({
      success: true,
      message: 'Student created successfully.',
      studentId
    });
  } catch (err) {
    console.error('Error creating student:', err);
    res.status(500).json({ error: 'Failed to create student.' });
  }
});

// Update student details
app.put('/api/students/:id', requireAdmin, (req, res) => {
  const id = parseInt(req.params.id, 10);
  const { name, cgpa, attendance, department, password } = req.body;

  if (!name || !name.trim()) {
    return res.status(400).json({ error: 'Student name is required.' });
  }

  const numCgpa = parseFloat(cgpa) || 0.0;
  const numAttendance = parseFloat(attendance) || 0.0;

  if (numCgpa < 0 || numCgpa > 10) {
    return res.status(400).json({ error: 'CGPA must be between 0.0 and 10.0.' });
  }
  if (numAttendance < 0 || numAttendance > 100) {
    return res.status(400).json({ error: 'Attendance must be between 0% and 100%.' });
  }

  try {
    db.updateStudent(id, {
      name,
      cgpa: numCgpa,
      attendance: numAttendance,
      department: department || 'General',
      password: password && password.trim() ? password.trim() : null
    });

    res.json({ success: true, message: 'Student updated successfully.' });
  } catch (err) {
    console.error('Error updating student:', err);
    res.status(500).json({ error: 'Failed to update student.' });
  }
});

// Delete a student
app.delete('/api/students/:id', requireAdmin, (req, res) => {
  const id = parseInt(req.params.id, 10);
  try {
    const result = db.deleteStudent(id);
    if (result.changes === 0) {
      return res.status(404).json({ error: 'Student not found.' });
    }
    res.json({ success: true, message: 'Student removed successfully.' });
  } catch (err) {
    console.error('Error deleting student:', err);
    res.status(500).json({ error: 'Failed to delete student.' });
  }
});

// ================= STUDENT ROUTES ================= //

// Get student's own dashboard details
app.get('/api/student/dashboard', requireStudent, (req, res) => {
  const user = db.getUserById(req.user.id);
  if (!user) {
    return res.status(404).json({ error: 'Student record not found.' });
  }

  const attendance = user.attendance;
  const cgpa = user.cgpa;

  // Grade evaluation
  let gradeTier = 'Pass';
  let gradeBadgeColor = 'emerald';
  if (cgpa >= 9.0) {
    gradeTier = 'Outstanding (O)';
    gradeBadgeColor = 'purple';
  } else if (cgpa >= 8.0) {
    gradeTier = 'Excellent (A+)';
    gradeBadgeColor = 'indigo';
  } else if (cgpa >= 7.0) {
    gradeTier = 'Very Good (A)';
    gradeBadgeColor = 'blue';
  } else if (cgpa >= 6.0) {
    gradeTier = 'Good (B+)';
    gradeBadgeColor = 'amber';
  } else if (cgpa < 5.0) {
    gradeTier = 'Needs Improvement';
    gradeBadgeColor = 'red';
  }

  // Attendance status
  const isEligible = attendance >= 75.0;
  const attendanceStatus = isEligible
    ? 'Eligible for Semester Examinations'
    : 'Attendance Shortage Alert (Under 75% Requirement)';

  res.json({
    student: {
      id: user.id,
      roll_no: user.roll_no,
      name: user.name,
      department: user.department,
      cgpa: user.cgpa,
      attendance: user.attendance,
      created_at: user.created_at
    },
    analytics: {
      gradeTier,
      gradeBadgeColor,
      isEligible,
      attendanceStatus,
      totalClassesEst: 100,
      attendedClassesEst: Math.round(attendance),
      missedClassesEst: Math.max(0, 100 - Math.round(attendance)),
      classesNeededFor75: attendance < 75 ? Math.ceil((75 - attendance) / (1 - 0.75)) : 0
    }
  });
});

// Student password update
app.post('/api/student/change-password', requireStudent, (req, res) => {
  const { currentPassword, newPassword } = req.body;
  if (!currentPassword || !newPassword) {
    return res.status(400).json({ error: 'Please enter current and new passwords.' });
  }
  if (newPassword.length < 4) {
    return res.status(400).json({ error: 'New password must be at least 4 characters long.' });
  }

  const user = db.getUserById(req.user.id);
  const isMatch = bcrypt.compareSync(currentPassword, user.password_hash);
  if (!isMatch) {
    return res.status(400).json({ error: 'Current password is incorrect.' });
  }

  db.updatePassword(user.id, newPassword);
  res.json({ success: true, message: 'Password updated successfully.' });
});

// Fallback to login page for SPA root navigation
app.use((req, res) => {
  res.sendFile(path.join(__dirname, 'public', 'index.html'));
});

// Start server
app.listen(PORT, '0.0.0.0', () => {
  console.log(`===================================================`);
  console.log(` Student Details & Attendance System running on:`);
  console.log(` http://localhost:${PORT}`);
  console.log(` http://127.0.0.1:${PORT}`);
  console.log(`===================================================`);
});
