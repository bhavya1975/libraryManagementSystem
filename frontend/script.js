const API_BASE = '/api';

function showStatus(id, message, isSuccess) {
  const el = document.getElementById(id);
  if (!el) return;
  el.textContent = message;
  el.className = `status show ${isSuccess ? 'success' : 'error'}`;
  setTimeout(() => {
    el.className = 'status';
  }, 5000);
}

async function fetchDropdownData() {
  // Common utility for forms needing dynamic data
}