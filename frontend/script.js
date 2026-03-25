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

function checkAuth() {
  const role = localStorage.getItem('role');
  if (!role && !window.location.href.includes('login.html')) {
    window.location.href = 'login.html';
  }
}

function logout() {
  localStorage.clear();
  window.location.href = 'login.html';
}

function renderNav() {
  const role = localStorage.getItem('role') || 'user';
  const sidebar = document.getElementById('sidebar');
  if (!sidebar) return;

  const currentPath = window.location.pathname.split('/').pop() || 'index.html';
  
  let navHtml = `<h1>Library DBMS</h1>`;
  
  const links = [];
  links.push({ href: 'index.html', label: 'Dashboard' });
  links.push({ href: 'search-book.html', label: 'Search Books' });
  links.push({ href: 'register-member.html', label: 'Register Member' });

  if (role === 'admin') {
    links.push({ href: 'add-book.html', label: 'Add Book' });
    links.push({ href: 'issue-book.html', label: 'Issue Book' });
    links.push({ href: 'return-book.html', label: 'Return Book' });
    links.push({ href: 'add-librarian.html', label: 'Add Librarian' });
    links.push({ href: 'overdue.html', label: 'Global Overdue' });
  } else if (role === 'user') {
    links.push({ href: 'my-books.html', label: 'My Issued Books' });
    links.push({ href: 'my-overdue.html', label: 'My Overdue' });
  }

  links.forEach(l => {
    const active = currentPath === l.href ? 'class="active"' : '';
    navHtml += `<a href="${l.href}" ${active}>${l.label}</a>`;
  });

  navHtml += `<a href="#" onclick="logout()" style="margin-top: auto; color: #ff5555;">Logout</a>`;
  
  sidebar.innerHTML = navHtml;
}

// Automatically check auth and render nav on page load
document.addEventListener('DOMContentLoaded', () => {
  if (!window.location.href.includes('login.html')) {
    checkAuth();
    renderNav();
  }
});