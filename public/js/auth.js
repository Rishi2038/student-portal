// auth.js - Handles login page logic

const loginForm = document.getElementById('loginForm');
const rollInput = document.getElementById('roll_no');
const passInput = document.getElementById('password');
const alertBox = document.getElementById('alertBox');
const togglePasswordBtn = document.getElementById('togglePassword');
const togglePasswordIcon = document.getElementById('togglePasswordIcon');
const submitBtn = document.getElementById('loginSubmitBtn');

// Toggle password visibility
if (togglePasswordBtn) {
  togglePasswordBtn.addEventListener('click', () => {
    const isPassword = passInput.type === 'password';
    passInput.type = isPassword ? 'text' : 'password';
    togglePasswordIcon.className = isPassword ? 'fa-solid fa-eye-slash' : 'fa-solid fa-eye';
  });
}

// Demo credentials helper
window.fillDemo = function(roll, pass) {
  if (rollInput && passInput) {
    rollInput.value = roll;
    passInput.value = pass;
    showAlert(`Filled credentials for ${roll}! Click "Sign In" to proceed.`, 'info');
  }
};

function showAlert(message, type = 'error') {
  if (!alertBox) return;
  alertBox.classList.remove('hidden', 'bg-red-950/60', 'border-red-600/60', 'text-red-300', 'bg-emerald-950/60', 'border-emerald-600/60', 'text-emerald-300', 'bg-indigo-950/60', 'border-indigo-600/60', 'text-indigo-300');

  let icon = '<i class="fa-solid fa-circle-exclamation mt-0.5"></i>';
  if (type === 'error') {
    alertBox.classList.add('bg-red-950/60', 'border-red-600/60', 'text-red-300');
    icon = '<i class="fa-solid fa-triangle-exclamation mt-0.5"></i>';
  } else if (type === 'success') {
    alertBox.classList.add('bg-emerald-950/60', 'border-emerald-600/60', 'text-emerald-300');
    icon = '<i class="fa-solid fa-circle-check mt-0.5"></i>';
  } else {
    alertBox.classList.add('bg-indigo-950/60', 'border-indigo-600/60', 'text-indigo-300');
    icon = '<i class="fa-solid fa-circle-info mt-0.5"></i>';
  }

  alertBox.innerHTML = `${icon}<div>${message}</div>`;
}

// Check if already authenticated
async function checkCurrentSession() {
  try {
    const res = await fetch('/api/auth/me');
    const data = await res.json();
    if (data.authenticated && data.user) {
      if (data.user.role === 'admin') {
        window.location.replace('/admin.html');
      } else {
        window.location.replace('/student.html');
      }
    }
  } catch (err) {
    // ignore
  }
}

if (loginForm) {
  checkCurrentSession();

  loginForm.addEventListener('submit', async (e) => {
    e.preventDefault();
    const roll_no = rollInput.value.trim();
    const password = passInput.value;

    if (!roll_no || !password) {
      showAlert('Please enter both Roll Number and Password.');
      return;
    }

    submitBtn.disabled = true;
    submitBtn.innerHTML = '<i class="fa-solid fa-circle-notch fa-spin"></i><span>Signing In...</span>';

    try {
      const response = await fetch('/api/auth/login', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ roll_no, password })
      });

      const data = await response.json();

      if (!response.ok) {
        throw new Error(data.error || 'Failed to sign in.');
      }

      showAlert('Login successful! Redirecting...', 'success');

      setTimeout(() => {
        if (data.user.role === 'admin') {
          window.location.href = '/admin.html';
        } else {
          window.location.href = '/student.html';
        }
      }, 500);

    } catch (err) {
      showAlert(err.message, 'error');
      submitBtn.disabled = false;
      submitBtn.innerHTML = '<span>Sign In</span><i class="fa-solid fa-arrow-right text-xs group-hover:translate-x-0.5 transition-transform"></i>';
    }
  });
}
