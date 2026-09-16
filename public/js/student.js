// student.js - Student Portal client logic

const studentLogoutBtn = document.getElementById('studentLogoutBtn');
const profileAvatar = document.getElementById('profileAvatar');
const profileName = document.getElementById('profileName');
const profileRollBadge = document.getElementById('profileRollBadge');
const profileDept = document.getElementById('profileDept');
const profileRollVal = document.getElementById('profileRollVal');

const attendanceBadge = document.getElementById('attendanceBadge');
const attendancePercent = document.getElementById('attendancePercent');
const attendanceProgressBar = document.getElementById('attendanceProgressBar');
const classesAttended = document.getElementById('classesAttended');
const classesMissed = document.getElementById('classesMissed');

const attendanceNoticeBox = document.getElementById('attendanceNoticeBox');
const attendanceNoticeIcon = document.getElementById('attendanceNoticeIcon');
const attendanceNoticeTitle = document.getElementById('attendanceNoticeTitle');
const attendanceNoticeDesc = document.getElementById('attendanceNoticeDesc');

const cgpaScore = document.getElementById('cgpaScore');
const cgpaTierBadge = document.getElementById('cgpaTierBadge');
const cgpaProgressBar = document.getElementById('cgpaProgressBar');

// Change Password Modal elements
const openChangePasswordBtn = document.getElementById('openChangePasswordBtn');
const changePasswordModal = document.getElementById('changePasswordModal');
const closePassModalBtn = document.getElementById('closePassModalBtn');
const cancelPassBtn = document.getElementById('cancelPassBtn');
const changePasswordForm = document.getElementById('changePasswordForm');
const currentPasswordInput = document.getElementById('currentPassword');
const newPasswordInput = document.getElementById('newPassword');
const passModalAlert = document.getElementById('passModalAlert');

document.addEventListener('DOMContentLoaded', async () => {
  await loadStudentDashboard();
  setupEventListeners();
});

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

  setTimeout(() => toast.classList.remove('translate-y-2'), 10);
  setTimeout(() => {
    toast.classList.add('opacity-0', 'translate-y-2');
    setTimeout(() => toast.remove(), 300);
  }, 3500);
}

// Fetch dashboard data
async function loadStudentDashboard() {
  try {
    const res = await fetch('/api/student/dashboard');
    if (!res.ok) {
      window.location.replace('/index.html');
      return;
    }

    const data = await res.json();
    const { student, analytics } = data;

    // Profile details
    const initials = student.name
      .split(' ')
      .map(part => part[0])
      .join('')
      .substring(0, 2)
      .toUpperCase();
    
    profileAvatar.textContent = initials || 'ST';
    profileName.textContent = student.name;
    profileRollBadge.textContent = `Roll No: ${student.roll_no}`;
    profileRollVal.textContent = student.roll_no;
    profileDept.innerHTML = `<i class="fa-solid fa-building-columns text-xs text-indigo-400"></i> <span>Department: ${escapeHtml(student.department || 'Computer Science')}</span>`;

    // Attendance details
    const attVal = student.attendance;
    attendancePercent.textContent = `${attVal.toFixed(1)}%`;
    attendanceProgressBar.style.width = `${Math.min(attVal, 100)}%`;

    if (analytics.isEligible) {
      attendanceBadge.className = 'px-3 py-1 rounded-full text-xs font-semibold bg-emerald-500/10 text-emerald-400 border border-emerald-500/20';
      attendanceBadge.textContent = 'Eligible for Exams';
      attendanceProgressBar.className = 'h-full bg-emerald-500 rounded-full transition-all duration-700';

      attendanceNoticeBox.className = 'mt-6 p-4 rounded-2xl text-xs flex items-start gap-3 border bg-emerald-950/40 border-emerald-500/30 text-emerald-300';
      attendanceNoticeIcon.className = 'fa-solid fa-circle-check mt-0.5 text-base text-emerald-400';
      attendanceNoticeTitle.textContent = 'Regular Status: Attendance Requirement Satisfied';
      attendanceNoticeDesc.textContent = `You have maintained ${attVal.toFixed(1)}% attendance, which exceeds the mandatory 75% institution threshold.`;
    } else {
      attendanceBadge.className = 'px-3 py-1 rounded-full text-xs font-semibold bg-amber-500/10 text-amber-400 border border-amber-500/20';
      attendanceBadge.textContent = 'Low Attendance Warning';
      attendanceProgressBar.className = 'h-full bg-amber-500 rounded-full transition-all duration-700';

      attendanceNoticeBox.className = 'mt-6 p-4 rounded-2xl text-xs flex items-start gap-3 border bg-amber-950/40 border-amber-500/30 text-amber-300';
      attendanceNoticeIcon.className = 'fa-solid fa-triangle-exclamation mt-0.5 text-base text-amber-400';
      attendanceNoticeTitle.textContent = 'Warning: Attendance Below 75%';
      attendanceNoticeDesc.textContent = `Your current attendance is ${attVal.toFixed(1)}%. You must attend additional upcoming sessions to meet the minimum threshold for final examination hall tickets.`;
    }

    classesAttended.textContent = `${analytics.attendedClassesEst} / ${analytics.totalClassesEst}`;
    classesMissed.textContent = `${analytics.missedClassesEst} / ${analytics.totalClassesEst}`;

    // CGPA details
    cgpaScore.textContent = student.cgpa.toFixed(2);
    cgpaProgressBar.style.width = `${Math.min((student.cgpa / 10.0) * 100, 100)}%`;
    cgpaTierBadge.textContent = analytics.gradeTier;

  } catch (err) {
    console.error('Error loading student dashboard:', err);
    window.location.replace('/index.html');
  }
}

function escapeHtml(str) {
  if (!str) return '';
  return str.replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;').replace(/"/g, '&quot;');
}

function setupEventListeners() {
  // Logout
  if (studentLogoutBtn) {
    studentLogoutBtn.addEventListener('click', async () => {
      await fetch('/api/auth/logout', { method: 'POST' });
      window.location.replace('/index.html');
    });
  }

  // Change Password Modal
  if (openChangePasswordBtn) {
    openChangePasswordBtn.addEventListener('click', () => {
      changePasswordForm.reset();
      passModalAlert.classList.add('hidden');
      changePasswordModal.classList.remove('hidden');
    });
  }

  if (closePassModalBtn) {
    closePassModalBtn.addEventListener('click', () => changePasswordModal.classList.add('hidden'));
  }
  if (cancelPassBtn) {
    cancelPassBtn.addEventListener('click', () => changePasswordModal.classList.add('hidden'));
  }

  if (changePasswordForm) {
    changePasswordForm.addEventListener('submit', async (e) => {
      e.preventDefault();
      const currentPassword = currentPasswordInput.value;
      const newPassword = newPasswordInput.value;

      const submitBtn = document.getElementById('submitPassBtn');
      submitBtn.disabled = true;

      try {
        const res = await fetch('/api/student/change-password', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ currentPassword, newPassword })
        });

        const data = await res.json();
        if (!res.ok) throw new Error(data.error || 'Failed to update password');

        showToast('Password updated successfully!', 'success');
        changePasswordModal.classList.add('hidden');
      } catch (err) {
        passModalAlert.className = 'my-4 p-3 rounded-xl text-xs flex items-center gap-2 border bg-red-950/60 border-red-600/60 text-red-300';
        passModalAlert.innerHTML = `<i class="fa-solid fa-triangle-exclamation"></i><span>${err.message}</span>`;
        passModalAlert.classList.remove('hidden');
      } finally {
        submitBtn.disabled = false;
      }
    });
  }
}
