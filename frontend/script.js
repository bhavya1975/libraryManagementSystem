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
  } else if (role === 'user') {
    const adminPages = ['add-book.html', 'issue-book.html', 'return-book.html', 'add-librarian.html', 'register-member.html', 'overdue.html', 'history.html'];
    const currentPath = window.location.pathname.split('/').pop();
    if (adminPages.includes(currentPath)) {
      window.location.href = 'index.html';
    }
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
  
  let navHtml = `
    <div style="text-align: center; margin-bottom: 2rem;">
      <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 100 100" style="width:64px;height:64px;margin-bottom:10px;filter:drop-shadow(0 0 10px var(--primary));">
        <defs>
          <linearGradient id="logograd" x1="0%" y1="0%" x2="100%" y2="100%">
            <stop offset="0%" style="stop-color:var(--primary);stop-opacity:1" />
            <stop offset="100%" style="stop-color:var(--primary-hover);stop-opacity:1" />
          </linearGradient>
        </defs>
        <path fill="url(#logograd)" d="M50 8C27 8 8 20 8 40v42c0 3 4 5 7 4 10-3 23-5 35-5s25 2 35 5c3 1 7-1 7-4V40C92 20 73 8 50 8zm-2 74c-12 0-24 2-32 4V42c6-3 17-6 32-6v46zm36 4c-8-2-20-4-32-4V36c15 0 26 3 32 6v44z"/>
        <path fill="var(--success)" d="M45 15h10v10H45z" />
      </svg>
      <h1 style="margin:0;font-size:1.5rem;font-weight:700;color:#fff;background:-webkit-linear-gradient(45deg, var(--primary), var(--primary-hover));-webkit-background-clip:text;-webkit-text-fill-color:transparent;">Library DBMS</h1>
    </div>
  `;
  
  const links = [];
  links.push({ href: 'index.html', label: 'Dashboard' });
  links.push({ href: 'search-book.html', label: 'Search Books' });

  if (role === 'admin') {
    links.push({ href: 'register-member.html', label: 'Register Member' });
    links.push({ href: 'add-book.html', label: 'Add Book' });
    links.push({ href: 'issue-book.html', label: 'Issue Book' });
    links.push({ href: 'return-book.html', label: 'Return Book' });
    links.push({ href: 'add-librarian.html', label: 'Add Librarian' });
    links.push({ href: 'overdue.html', label: 'Global Overdue' });
    links.push({ href: 'history.html', label: 'Global History' });
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