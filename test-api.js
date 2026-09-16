// test-api.js - Automated test suite for Student Management System
const assert = require('node:assert');

const BASE_URL = 'http://localhost:3000';

// Cookie extractor helper
function getCookie(headers) {
  const setCookie = headers.get('set-cookie');
  if (!setCookie) return null;
  const match = setCookie.match(/session_token=([^;]+)/);
  return match ? match[1] : null;
}

async function runTests() {
  console.log(' Starting Student Portal End-to-End API Verification...\n');

  // Test 1: Admin Login
  console.log('1. Testing Admin Login (admin / admin123)...');
  const adminLoginRes = await fetch(`${BASE_URL}/api/auth/login`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ roll_no: 'admin', password: 'admin123' })
  });
  assert.strictEqual(adminLoginRes.status, 200, 'Admin login failed');
  const adminLoginData = await adminLoginRes.json();
  assert.strictEqual(adminLoginData.user.role, 'admin');
  const adminCookie = getCookie(adminLoginRes.headers);
  assert.ok(adminCookie, 'Session cookie missing for admin');
  console.log('   Admin login verified successfully.\n');

  // Test 2: Admin lists students
  console.log('2. Testing Admin Get Students & Stats...');
  const getStudentsRes = await fetch(`${BASE_URL}/api/students`, {
    headers: { 'Cookie': `session_token=${adminCookie}` }
  });
  assert.strictEqual(getStudentsRes.status, 200);
  const studentsData = await getStudentsRes.json();
  assert.ok(Array.isArray(studentsData.students));
  assert.ok(studentsData.stats.totalStudents > 0);
  console.log(`   Fetched ${studentsData.students.length} students. Total in stats: ${studentsData.stats.totalStudents}.\n`);

  // Test 3: Admin registers new student
  console.log('3. Testing Admin Create Student...');
  const newStudent = {
    roll_no: '2024TEST001',
    name: 'Kavita Iyer',
    password: 'KavitaPass#2024',
    cgpa: 8.92,
    attendance: 87.5,
    department: 'Artificial Intelligence'
  };
  const createRes = await fetch(`${BASE_URL}/api/students`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'Cookie': `session_token=${adminCookie}`
    },
    body: JSON.stringify(newStudent)
  });
  assert.strictEqual(createRes.status, 201, 'Failed to create student');
  const createData = await createRes.json();
  const createdStudentId = createData.studentId;
  assert.ok(createdStudentId, 'Student ID missing in creation response');
  console.log(`   Student created with ID ${createdStudentId}.\n`);

  // Test 4: Prevent Duplicate Roll Number
  console.log('4. Testing Duplicate Roll Number Conflict Prevention...');
  const dupRes = await fetch(`${BASE_URL}/api/students`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'Cookie': `session_token=${adminCookie}`
    },
    body: JSON.stringify(newStudent)
  });
  assert.strictEqual(dupRes.status, 409, 'Expected 409 Conflict for duplicate roll number');
  console.log('   Duplicate roll prevention verified.\n');

  // Test 5: Student Login with Roll Number and Generated Password
  console.log('5. Testing Student Login with Roll Number (ID) and Password...');
  const studentLoginRes = await fetch(`${BASE_URL}/api/auth/login`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ roll_no: '2024TEST001', password: 'KavitaPass#2024' })
  });
  assert.strictEqual(studentLoginRes.status, 200, 'Student login failed');
  const studentLoginData = await studentLoginRes.json();
  assert.strictEqual(studentLoginData.user.role, 'student');
  assert.strictEqual(studentLoginData.user.name, 'Kavita Iyer');
  const studentCookie = getCookie(studentLoginRes.headers);
  console.log('   Student login verified.\n');

  // Test 6: Student Dashboard Access
  console.log('6. Testing Student Dashboard Details...');
  const studentDashRes = await fetch(`${BASE_URL}/api/student/dashboard`, {
    headers: { 'Cookie': `session_token=${studentCookie}` }
  });
  assert.strictEqual(studentDashRes.status, 200);
  const dashData = await studentDashRes.json();
  assert.strictEqual(dashData.student.roll_no, '2024TEST001');
  assert.strictEqual(dashData.student.attendance, 87.5);
  assert.strictEqual(dashData.student.cgpa, 8.92);
  assert.strictEqual(dashData.analytics.isEligible, true);
  console.log(`   Student Dashboard verified: Attendance=${dashData.student.attendance}%, CGPA=${dashData.student.cgpa}, Eligibility=${dashData.analytics.isEligible}.\n`);

  // Test 7: Student Authorization Barrier (Cannot access Admin endpoint)
  console.log('7. Testing Access Control Barrier (Student forbidden from /api/students)...');
  const forbiddenRes = await fetch(`${BASE_URL}/api/students`, {
    headers: { 'Cookie': `session_token=${studentCookie}` }
  });
  assert.strictEqual(forbiddenRes.status, 403, 'Student should not be able to access admin endpoint');
  console.log('   Security barrier verified: 403 Forbidden received.\n');

  // Test 8: Student Updates Password
  console.log('8. Testing Student Changing Password...');
  const changePassRes = await fetch(`${BASE_URL}/api/student/change-password`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'Cookie': `session_token=${studentCookie}`
    },
    body: JSON.stringify({
      currentPassword: 'KavitaPass#2024',
      newPassword: 'BrandNewPassword@999'
    })
  });
  assert.strictEqual(changePassRes.status, 200);
  console.log('   Password changed successfully.\n');

  // Test 9: Old password fails, new password works
  console.log('9. Testing Login with New Password...');
  const oldLoginRes = await fetch(`${BASE_URL}/api/auth/login`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ roll_no: '2024TEST001', password: 'KavitaPass#2024' })
  });
  assert.strictEqual(oldLoginRes.status, 401, 'Old password should fail');

  const newLoginRes = await fetch(`${BASE_URL}/api/auth/login`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ roll_no: '2024TEST001', password: 'BrandNewPassword@999' })
  });
  assert.strictEqual(newLoginRes.status, 200, 'New password login failed');
  console.log('   New password login verified.\n');

  // Test 10: Admin Updates Student Details
  console.log('10. Testing Admin Update Student (CGPA & Attendance)...');
  const updateRes = await fetch(`${BASE_URL}/api/students/${createdStudentId}`, {
    method: 'PUT',
    headers: {
      'Content-Type': 'application/json',
      'Cookie': `session_token=${adminCookie}`
    },
    body: JSON.stringify({
      name: 'Kavita Iyer (Updated)',
      cgpa: 9.15,
      attendance: 91.0,
      department: 'Artificial Intelligence & Robotics'
    })
  });
  assert.strictEqual(updateRes.status, 200);
  console.log('   Student updated successfully.\n');

  // Test 11: Admin Deletes Student
  console.log('11. Testing Admin Delete Student...');
  const deleteRes = await fetch(`${BASE_URL}/api/students/${createdStudentId}`, {
    method: 'DELETE',
    headers: { 'Cookie': `session_token=${adminCookie}` }
  });
  assert.strictEqual(deleteRes.status, 200);
  console.log('   Student deleted successfully.\n');

  // Test 12: Deleted student cannot log in
  console.log('12. Verifying Deleted Student Cannot Log In...');
  const postDeleteLogin = await fetch(`${BASE_URL}/api/auth/login`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ roll_no: '2024TEST001', password: 'BrandNewPassword@999' })
  });
  assert.strictEqual(postDeleteLogin.status, 401);
  console.log('   Deleted student login correctly rejected (401).\n');

  console.log(' ALL 12 API VERIFICATION TESTS PASSED SUCCESSFULLY! ');
}

runTests().catch(err => {
  console.error('\n Test execution failed:', err);
  process.exit(1);
});
