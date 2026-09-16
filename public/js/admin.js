// admin.js - Admin Portal logic

let studentsData = [];
let pendingDeleteId = null;

// Elements
const studentTableBody = document.getElementById('studentTableBody');
const searchInput = document.getElementById('searchInput');
const filterAttendance = document.getElementById('filterAttendance');
const logoutBtn = document.getElementById('logoutBtn');
const adminName = document.getElementById('adminName');

// Stats Elements
const statTotalStudents = document.getElementById('statTotalStudents');
const statAvgAttendance = document.getElementById('statAvgAttendance');
const statAvgCgpa = document.getElementById('statAvgCgpa');
const statLowAttendance = document.getElementById('statLowAttendance');

// Add Modal Elements
const addStudentModal = document.getElementById('addStudentModal');
const openAddStudentModalBtn = document.getElementById('openAddStudentModalBtn');
const closeAddModalBtn = document.getElementById('closeAddModalBtn');
const cancelAddBtn = document.getElementById('cancelAddBtn');
const addStudentForm = document.getElementById('addStudentForm');
const btnGeneratePass = document.getElementById('btnGeneratePass');
const btnCopyGeneratedPass = document.getElementById('btnCopyGeneratedPass');
const newPassInput = document.getElementById('newPassword');
const addModalAlert = document.getElementById('addModalAlert');

// Edit Modal Elements
const editStudentModal = document.getElementById('editStudentModal');
const closeEditModalBtn = document.getElementById('closeEditModalBtn');
const cancelEditBtn = document.getElementById('cancelEditBtn');
const editStudentForm = document.getElementById('editStudentForm');
const btnGenerateEditPass = document.getElementById('btnGenerateEditPass');
const editPassInput = document.getElementById('editPassword');
const editModalAlert = document.getElementById('editModalAlert');

// Delete Modal Elements
const deleteConfirmModal = document.getElementById('deleteConfirmModal');
const cancelDeleteBtn = document.getElementById('cancelDeleteBtn');
const confirmDeleteBtn = document.getElementById('confirmDeleteBtn');
const deleteStudentName = document.getElementById('deleteStudentName');
const deleteStudentRoll = document.getElementById('deleteStudentRoll');

// Initialize
document.addEventListener('DOMContentLoaded', async () => {
  await verifyAdminSession();
  await loadStudents();
  setupEventListeners();
});

// Verify Admin Session
async function verifyAdminSession() {
  try {
    const res = await fetch('/api/auth/me');
    const data = await res.json();
    if (!data.authenticated || data.user.role !== 'admin') {
      window.location.replace('/index.html');
      return;
    }
    if (adminName) adminName.textContent = data.user.name || 'Administrator';
  } catch (err) {
    window.location.replace('/index.html');
  }
}

// Generate random password helper
function generatePassword() {
  const chars = 'ABCDEFGHJKLMNPQRSTUVWXYZabcdefghijkmnpqrstuvwxyz23456789!@#$%';
  let pass = '';
  // Ensure at least one upper, one lower, one number, one symbol
  const uppers = 'ABCDEFGHJKLMNPQRSTUVWXYZ';
  const lowers = 'abcdefghijkmnpqrstuvwxyz';
  const digits = '23456789';
  const symbols = '!@#$%';
  
  pass += uppers[Math.floor(Math.random() * uppers.length)];
  pass += lowers[Math.floor(Math.random() * lowers.length)];
  pass += digits[Math.floor(Math.random() * digits.length)];
  pass += symbols[Math.floor(Math.random() * symbols.length)];

  for (let i = 4; i < 9; i++) {
    pass += chars[Math.floor(Math.random() * chars.length)];
  }
  return pass;
}

// Toast notification helper
function showToast(message, type = 'success') {
  const container = document.getElementById('toastContainer');
  if (!container) return;

  const toast = document.createElement('div');
  toast.className = `pointer-events-auto px-4 py-3 rounded-xl shadow-xl text-xs font-medium border flex items-center gap-2.5 transition-all duration-300 transform translate-y-2 ${
    type === 'success' 
      ? 'bg-slate-900 border-emerald-500/50 text-emerald-300' 
      : 'bg-slate-900 border-red-500/50 text-red-300'
  }`;

  const icon = type === 'success' 
    ? '<i class="fa-solid fa-circle-check text-emerald-400"></i>' 
    : '<i class="fa-solid fa-circle-xmark text-red-400"></i>';

  toast.innerHTML = `${icon}<span>${message}</span>`;
  container.appendChild(toast);

  // Trigger animation
  setTimeout(() => toast.classList.remove('translate-y-2'), 10);

  // Auto remove
  setTimeout(() => {
    toast.classList.add('opacity-0', 'translate-y-2');
    setTimeout(() => toast.remove(), 300);
  }, 3500);
}

// Load Students and Stats
async function loadStudents() {
  try {
    const search = searchInput ? searchInput.value.trim() : '';
    const res = await fetch(`/api/students?search=${encodeURIComponent(search)}`);
    if (!res.ok) throw new Error('Failed to load students');

    const data = await res.json();
    studentsData = data.students || [];

    // Update Stats
    if (data.stats) {
      statTotalStudents.textContent = data.stats.totalStudents;
      statAvgAttendance.textContent = `${data.stats.avgAttendance}%`;
      statAvgCgpa.textContent = data.stats.avgCgpa.toFixed(2);
      statLowAttendance.textContent = data.stats.lowAttendanceCount;
    }

    renderTable();
  } catch (err) {
    console.error(err);
    showToast('Failed to fetch student data', 'error');
  }
}

// Render Table
function renderTable() {
  const filterVal = filterAttendance ? filterAttendance.value : 'all';
  
  let filtered = studentsData;
  if (filterVal === 'eligible') {
    filtered = filtered.filter(s => s.attendance >= 75);
  } else if (filterVal === 'low') {
    filtered = filtered.filter(s => s.attendance < 75);
  }

  if (filtered.length === 0) {
    studentTableBody.innerHTML = `
      <tr>
        <td colspan="6" class="py-8 text-center text-slate-500">
          <i class="fa-regular fa-folder-open mr-2"></i> No student records found.
        </td>
      </tr>
    `;
    return;
  }

  studentTableBody.innerHTML = filtered.map(student => {
    const isGoodAttendance = student.attendance >= 75;
    const attendanceColor = isGoodAttendance ? 'text-emerald-400' : 'text-amber-400';
    const barColor = isGoodAttendance ? 'bg-emerald-500' : 'bg-amber-500';

    return `
      <tr class="hover:bg-slate-800/40 transition">
        <td class="py-3.5 px-4 font-mono font-semibold text-indigo-300">
          <span class="px-2 py-1 bg-indigo-500/10 border border-indigo-500/20 rounded-md text-xs">
            ${student.roll_no}
          </span>
        </td>
        <td class="py-3.5 px-4 font-medium text-white">
          ${escapeHtml(student.name)}
        </td>
        <td class="py-3.5 px-4 text-slate-400 text-xs">
          ${escapeHtml(student.department || 'General')}
        </td>
        <td class="py-3.5 px-4">
          <span class="inline-flex items-center gap-1 font-semibold ${student.cgpa >= 8 ? 'text-purple-400' : student.cgpa >= 6 ? 'text-blue-400' : 'text-slate-300'}">
            <i class="fa-solid fa-star text-[10px] opacity-70"></i>
            ${student.cgpa.toFixed(2)}
          </span>
        </td>
        <td class="py-3.5 px-4">
          <div class="flex items-center gap-3">
            <span class="font-semibold text-xs ${attendanceColor} w-10">
              ${student.attendance.toFixed(1)}%
            </span>
            <div class="w-24 bg-slate-800 rounded-full h-2 overflow-hidden">
              <div class="${barColor} h-2 rounded-full" style="width: ${Math.min(student.attendance, 100)}%"></div>
            </div>
            ${!isGoodAttendance ? '<span class="text-[10px] px-1.5 py-0.5 bg-amber-500/10 text-amber-400 border border-amber-500/20 rounded font-medium">Low</span>' : ''}
          </div>
        </td>
        <td class="py-3.5 px-4 text-right">
          <div class="inline-flex items-center gap-2">
            <button 
              onclick="openEditModal(${student.id})" 
              class="p-2 rounded-lg bg-slate-800 hover:bg-slate-700 text-slate-300 hover:text-white transition cursor-pointer"
              title="Edit Details"
            >
              <i class="fa-solid fa-pen-to-square text-xs"></i>
            </button>
            <button 
              onclick="openDeleteModal(${student.id}, '${escapeQuotes(student.name)}', '${student.roll_no}')" 
              class="p-2 rounded-lg bg-slate-800 hover:bg-red-500/20 text-slate-300 hover:text-red-400 transition cursor-pointer"
              title="Delete Student"
            >
              <i class="fa-solid fa-trash text-xs"></i>
            </button>
          </div>
        </td>
      </tr>
    `;
  }).join('');
}

// Helpers
function escapeHtml(str) {
  if (!str) return '';
  return str.replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;').replace(/"/g, '&quot;');
}

function escapeQuotes(str) {
  if (!str) return '';
  return str.replace(/'/g, "\\'");
}

// Event Listeners setup
function setupEventListeners() {
  // Search and filter
  if (searchInput) {
    let debounce;
    searchInput.addEventListener('input', () => {
      clearTimeout(debounce);
      debounce = setTimeout(() => loadStudents(), 250);
    });
  }

  if (filterAttendance) {
    filterAttendance.addEventListener('change', () => renderTable());
  }

  // Logout
  if (logoutBtn) {
    logoutBtn.addEventListener('click', async () => {
      await fetch('/api/auth/logout', { method: 'POST' });
      window.location.replace('/index.html');
    });
  }

  // Add Modal Toggles
  openAddStudentModalBtn.addEventListener('click', () => {
    addStudentForm.reset();
    addModalAlert.classList.add('hidden');
    // Pre-generate a strong password
    newPassInput.value = generatePassword();
    addStudentModal.classList.remove('hidden');
  });

  closeAddModalBtn.addEventListener('click', () => addStudentModal.classList.add('hidden'));
  cancelAddBtn.addEventListener('click', () => addStudentModal.classList.add('hidden'));

  // Password Generator
  btnGeneratePass.addEventListener('click', () => {
    newPassInput.value = generatePassword();
    showToast('New password generated!', 'success');
  });

  btnCopyGeneratedPass.addEventListener('click', () => {
    if (newPassInput.value) {
      navigator.clipboard.writeText(newPassInput.value);
      showToast('Password copied to clipboard!', 'success');
    }
  });

  // Add Student Submit
  addStudentForm.addEventListener('submit', async (e) => {
    e.preventDefault();
    const roll_no = document.getElementById('newRoll').value.trim();
    const name = document.getElementById('newName').value.trim();
    const cgpa = document.getElementById('newCgpa').value;
    const attendance = document.getElementById('newAttendance').value;
    const department = document.getElementById('newDept').value.trim() || 'Computer Science';
    const password = newPassInput.value;

    const submitBtn = document.getElementById('submitAddStudentBtn');
    submitBtn.disabled = true;

    try {
      const res = await fetch('/api/students', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ roll_no, name, cgpa, attendance, department, password })
      });

      const data = await res.json();
      if (!res.ok) throw new Error(data.error || 'Failed to create student');

      showToast(`Student ${name} (${roll_no}) registered successfully!`, 'success');
      addStudentModal.classList.add('hidden');
      await loadStudents();
    } catch (err) {
      addModalAlert.className = 'my-4 p-3 rounded-xl text-xs flex items-center gap-2 border bg-red-950/60 border-red-600/60 text-red-300';
      addModalAlert.innerHTML = `<i class="fa-solid fa-triangle-exclamation"></i><span>${err.message}</span>`;
      addModalAlert.classList.remove('hidden');
    } finally {
      submitBtn.disabled = false;
    }
  });

  // Edit Modal Toggles
  closeEditModalBtn.addEventListener('click', () => editStudentModal.classList.add('hidden'));
  cancelEditBtn.addEventListener('click', () => editStudentModal.classList.add('hidden'));

  btnGenerateEditPass.addEventListener('click', () => {
    editPassInput.value = generatePassword();
    showToast('New password generated!', 'success');
  });

  // Edit Student Submit
  editStudentForm.addEventListener('submit', async (e) => {
    e.preventDefault();
    const id = document.getElementById('editStudentId').value;
    const name = document.getElementById('editName').value.trim();
    const cgpa = document.getElementById('editCgpa').value;
    const attendance = document.getElementById('editAttendance').value;
    const department = document.getElementById('editDept').value.trim();
    const password = editPassInput.value;

    const submitBtn = document.getElementById('submitEditStudentBtn');
    submitBtn.disabled = true;

    try {
      const res = await fetch(`/api/students/${id}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ name, cgpa, attendance, department, password })
      });

      const data = await res.json();
      if (!res.ok) throw new Error(data.error || 'Failed to update student');

      showToast('Student updated successfully!', 'success');
      editStudentModal.classList.add('hidden');
      await loadStudents();
    } catch (err) {
      editModalAlert.className = 'my-4 p-3 rounded-xl text-xs flex items-center gap-2 border bg-red-950/60 border-red-600/60 text-red-300';
      editModalAlert.innerHTML = `<i class="fa-solid fa-triangle-exclamation"></i><span>${err.message}</span>`;
      editModalAlert.classList.remove('hidden');
    } finally {
      submitBtn.disabled = false;
    }
  });

  // Delete Modal Handlers
  cancelDeleteBtn.addEventListener('click', () => {
    deleteConfirmModal.classList.add('hidden');
    pendingDeleteId = null;
  });

  confirmDeleteBtn.addEventListener('click', async () => {
    if (!pendingDeleteId) return;
    try {
      const res = await fetch(`/api/students/${pendingDeleteId}`, { method: 'DELETE' });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || 'Failed to delete student');

      showToast('Student removed successfully.', 'success');
      deleteConfirmModal.classList.add('hidden');
      pendingDeleteId = null;
      await loadStudents();
    } catch (err) {
      showToast(err.message, 'error');
    }
  });
}

// Global modal triggers
window.openEditModal = function(id) {
  const student = studentsData.find(s => s.id === id);
  if (!student) return;

  document.getElementById('editStudentId').value = student.id;
  document.getElementById('editRoll').value = student.roll_no;
  document.getElementById('editName').value = student.name;
  document.getElementById('editCgpa').value = student.cgpa;
  document.getElementById('editAttendance').value = student.attendance;
  document.getElementById('editDept').value = student.department || '';
  editPassInput.value = '';
  editModalAlert.classList.add('hidden');

  editStudentModal.classList.remove('hidden');
};

window.openDeleteModal = function(id, name, roll) {
  pendingDeleteId = id;
  deleteStudentName.textContent = name;
  deleteStudentRoll.textContent = roll;
  deleteConfirmModal.classList.remove('hidden');
};
