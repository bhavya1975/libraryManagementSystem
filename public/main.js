const apiBase = '/api';

const viewContainer = document.getElementById('view-container');

document.querySelectorAll('nav button').forEach((btn) => {
  btn.addEventListener('click', () => {
    loadView(btn.dataset.view);
  });
});

function setStatus(el, message, ok = true) {
  el.textContent = message;
  el.className = 'status ' + (ok ? 'ok' : 'error');
}

function loadView(view) {
  if (view === 'dashboard') {
    viewContainer.innerHTML = `
      <section class="card">
        <h2>Dashboard</h2>
        <p>Use the navigation buttons above to manage books, members, issues, returns, and overdue items.</p>
      </section>
    `;
  } else if (view === 'add-book') {
    renderAddBook();
  } else if (view === 'register-member') {
    renderRegisterMember();
  } else if (view === 'issue-book') {
    renderIssueBook();
  } else if (view === 'return-book') {
    renderReturnBook();
  } else if (view === 'search-book') {
    renderSearchBook();
  } else if (view === 'overdue') {
    renderOverdue();
  } else if (view === 'categories') {
    renderCategories();
  } else if (view === 'authors') {
    renderAuthors();
  } else if (view === 'fines') {
    renderFines();
  }
}

async function renderAddBook() {
  viewContainer.innerHTML = 'Loading...';
  
  try {
    const [catRes, authRes] = await Promise.all([
      fetch(`${apiBase}/categories`),
      fetch(`${apiBase}/authors`)
    ]);
    const categories = await catRes.json();
    const authors = await authRes.json();
    
    viewContainer.innerHTML = `
      <section class="card">
        <h2>Add Book</h2>
        <form id="add-book-form">
          <label>Title <input name="title" required /></label>
          <label>ISBN <input name="isbn" required /></label>
          <label>Publisher <input name="publisher" /></label>
          <label>Publication Year <input name="publication_year" type="number" /></label>
          <label>Category 
            <select name="category_id" required>
              <option value="">Select a category</option>
              ${categories.map(c => `<option value="${c.category_id}">${c.category_name}</option>`).join('')}
            </select>
          </label>
          <label>Authors 
            <select name="author_ids" multiple>
              ${authors.map(a => `<option value="${a.author_id}">${a.name}</option>`).join('')}
            </select>
            <small>(Hold Ctrl/Cmd to select multiple)</small>
          </label>
          <label>Number of Initial Copies <input name="number_of_copies" type="number" value="1" min="1" required /></label>
          <button class="primary" type="submit">Save</button>
        </form>
        <div id="add-book-status" class="status"></div>
      </section>
    `;

    const form = document.getElementById('add-book-form');
    const status = document.getElementById('add-book-status');
    form.addEventListener('submit', async (e) => {
      e.preventDefault();
      const formData = new FormData(form);
      
      const author_ids = Array.from(form.author_ids.selectedOptions).map(opt => Number(opt.value));

      const payload = {
        title: formData.get('title'),
        isbn: formData.get('isbn'),
        publisher: formData.get('publisher'),
        publication_year: formData.get('publication_year')
          ? Number(formData.get('publication_year'))
          : null,
        category_id: Number(formData.get('category_id')),
        author_ids,
        number_of_copies: Number(formData.get('number_of_copies'))
      };

      try {
        const res = await fetch(`${apiBase}/books`, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify(payload)
        });
        const data = await res.json();
        if (res.ok) {
          setStatus(status, 'Book added successfully with its copies');
          form.reset();
        } else {
          setStatus(status, data.message || 'Error adding book', false);
        }
      } catch (err) {
        setStatus(status, 'Network error', false);
      }
    });
  } catch (err) {
    viewContainer.innerHTML = '<div class="status error">Error loading form data</div>';
  }
}

async function renderCategories() {
  viewContainer.innerHTML = `
    <section class="card">
      <h2>Categories</h2>
      <form id="add-category-form">
        <label>Category Name <input name="category_name" required /></label>
        <button class="primary" type="submit">Add Category</button>
      </form>
      <div id="category-status" class="status"></div>
      <table id="category-table">
        <thead>
          <tr>
            <th>ID</th>
            <th>Name</th>
          </tr>
        </thead>
        <tbody></tbody>
      </table>
    </section>
  `;

  const form = document.getElementById('add-category-form');
  const status = document.getElementById('category-status');
  const tbody = document.querySelector('#category-table tbody');

  async function loadCategories() {
    try {
      const res = await fetch(`${apiBase}/categories`);
      const data = await res.json();
      tbody.innerHTML = data.map(c => `<tr><td>${c.category_id}</td><td>${c.category_name}</td></tr>`).join('');
    } catch (e) {
      setStatus(status, 'Failed to load categories', false);
    }
  }

  form.addEventListener('submit', async (e) => {
    e.preventDefault();
    const formData = new FormData(form);
    try {
      const res = await fetch(`${apiBase}/categories`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ category_name: formData.get('category_name') })
      });
      const data = await res.json();
      if (res.ok) {
        setStatus(status, 'Category added');
        form.reset();
        loadCategories();
      } else {
        setStatus(status, data.message || 'Error', false);
      }
    } catch (err) {
      setStatus(status, 'Network error', false);
    }
  });

  loadCategories();
}

async function renderAuthors() {
  viewContainer.innerHTML = `
    <section class="card">
      <h2>Authors</h2>
      <form id="add-author-form">
        <label>Name <input name="name" required /></label>
        <label>Nationality <input name="nationality" /></label>
        <button class="primary" type="submit">Add Author</button>
      </form>
      <div id="author-status" class="status"></div>
      <table id="author-table">
        <thead>
          <tr>
            <th>ID</th>
            <th>Name</th>
            <th>Nationality</th>
          </tr>
        </thead>
        <tbody></tbody>
      </table>
    </section>
  `;

  const form = document.getElementById('add-author-form');
  const status = document.getElementById('author-status');
  const tbody = document.querySelector('#author-table tbody');

  async function loadAuthors() {
    try {
      const res = await fetch(`${apiBase}/authors`);
      const data = await res.json();
      tbody.innerHTML = data.map(a => `<tr><td>${a.author_id}</td><td>${a.name}</td><td>${a.nationality || ''}</td></tr>`).join('');
    } catch (e) {
      setStatus(status, 'Failed to load authors', false);
    }
  }

  form.addEventListener('submit', async (e) => {
    e.preventDefault();
    const formData = new FormData(form);
    try {
      const res = await fetch(`${apiBase}/authors`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ name: formData.get('name'), nationality: formData.get('nationality') })
      });
      const data = await res.json();
      if (res.ok) {
        setStatus(status, 'Author added');
        form.reset();
        loadAuthors();
      } else {
        setStatus(status, data.message || 'Error', false);
      }
    } catch (err) {
      setStatus(status, 'Network error', false);
    }
  });

  loadAuthors();
}

function renderRegisterMember() {
  viewContainer.innerHTML = `
    <section class="card">
      <h2>Register Member</h2>
      <form id="register-member-form">
        <label>Name <input name="name" required /></label>
        <label>Email <input name="email" type="email" required /></label>
        <label>Phone <input name="phone" /></label>
        <button class="primary" type="submit">Register</button>
      </form>
      <div id="register-member-status" class="status"></div>
    </section>
  `;

  const form = document.getElementById('register-member-form');
  const status = document.getElementById('register-member-status');

  form.addEventListener('submit', async (e) => {
    e.preventDefault();
    const formData = new FormData(form);
    const payload = {
      name: formData.get('name'),
      email: formData.get('email'),
      phone: formData.get('phone')
    };

    try {
      const res = await fetch(`${apiBase}/members`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload)
      });
      const data = await res.json();
      if (res.ok) {
        setStatus(status, 'Member registered successfully');
        form.reset();
      } else {
        setStatus(status, data.message || 'Error registering member', false);
      }
    } catch (err) {
      setStatus(status, 'Network error', false);
    }
  });
}

async function renderIssueBook() {
  viewContainer.innerHTML = 'Loading...';
  try {
    const [membersRes, booksRes, libRes] = await Promise.all([
      fetch(`${apiBase}/members`),
      fetch(`${apiBase}/books`),
      fetch(`${apiBase}/librarians`)
    ]);
    const members = await membersRes.json();
    const books = await booksRes.json();
    const librarians = await libRes.json();

    viewContainer.innerHTML = `
      <section class="card">
        <h2>Issue Book</h2>
        <form id="issue-book-form">
          <label>Member
            <select name="member_id" required>
              <option value="">Select Member</option>
              ${members.map(m => `<option value="${m.member_id}">${m.name} (#${m.member_id})</option>`).join('')}
            </select>
          </label>
          <label>Book
            <select id="book-select" name="book_id" required>
              <option value="">Select Book</option>
              ${books.map(b => `<option value="${b.book_id}">${b.title} (${b.isbn})</option>`).join('')}
            </select>
          </label>
          <label>Available Copy
            <select id="copy-select" name="copy_id" required disabled>
              <option value="">Select a book first...</option>
            </select>
          </label>
          <label>Librarian
            <select name="librarian_id" required>
              <option value="">Select Librarian</option>
              ${librarians.map(l => `<option value="${l.librarian_id}">${l.name}</option>`).join('')}
            </select>
          </label>
          <button class="primary" type="submit">Issue Book</button>
        </form>
        <div id="issue-book-status" class="status"></div>
      </section>
    `;

    const form = document.getElementById('issue-book-form');
    const status = document.getElementById('issue-book-status');
    const bookSelect = document.getElementById('book-select');
    const copySelect = document.getElementById('copy-select');

    bookSelect.addEventListener('change', async () => {
      const book_id = bookSelect.value;
      if (!book_id) {
        copySelect.innerHTML = '<option value="">Select a book first...</option>';
        copySelect.disabled = true;
        return;
      }
      try {
        const res = await fetch(`${apiBase}/books/available?book_id=${book_id}`);
        const copies = await res.json();
        if (copies.length === 0) {
          copySelect.innerHTML = '<option value="">No copies available right now.</option>';
          copySelect.disabled = true;
        } else {
          copySelect.innerHTML = copies.map(c => `<option value="${c.copy_id}">Copy #${c.copy_id}</option>`).join('');
          copySelect.disabled = false;
        }
      } catch (err) {
        copySelect.innerHTML = '<option value="">Error loading copies.</option>';
        copySelect.disabled = true;
      }
    });

    form.addEventListener('submit', async (e) => {
      e.preventDefault();
      const formData = new FormData(form);
      const payload = {
        member_id: Number(formData.get('member_id')),
        copy_id: Number(formData.get('copy_id')),
        librarian_id: Number(formData.get('librarian_id'))
      };

      try {
        const res = await fetch(`${apiBase}/issue`, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify(payload)
        });
        const data = await res.json();
        if (res.ok) {
          setStatus(status, 'Book issued successfully');
          form.reset();
          copySelect.innerHTML = '<option value="">Select a book first...</option>';
          copySelect.disabled = true;
        } else {
          setStatus(status, data.message || 'Error issuing book', false);
        }
      } catch (err) {
        setStatus(status, 'Network error', false);
      }
    });
  } catch (err) {
    viewContainer.innerHTML = '<div class="status error">Failed to load issue form data</div>';
  }
}

async function renderReturnBook() {
  viewContainer.innerHTML = 'Loading Active Issues...';
  try {
    const res = await fetch(`${apiBase}/issues/current`);
    const issues = await res.json();

    viewContainer.innerHTML = `
      <section class="card">
        <h2>Return Book</h2>
        <form id="return-book-form">
          <label>Active Issue
            <select name="issue_id" required>
              <option value="">Select the book to return...</option>
              ${issues.map(i => `<option value="${i.issue_id}">Copy #${i.copy_id}: ${i.title} - Issued to ${i.member_name} (Issue ID: ${i.issue_id})</option>`).join('')}
            </select>
          </label>
          <button class="primary" type="submit">Return Book</button>
        </form>
        <div id="return-book-status" class="status"></div>
      </section>
    `;

    const form = document.getElementById('return-book-form');
    const status = document.getElementById('return-book-status');

    form.addEventListener('submit', async (e) => {
      e.preventDefault();
      const formData = new FormData(form);
      const payload = {
        issue_id: Number(formData.get('issue_id'))
      };

      try {
        const rRes = await fetch(`${apiBase}/return`, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify(payload)
        });
        const data = await rRes.json();
        if (rRes.ok) {
          setStatus(status, 'Book returned successfully! Refresh page to update list.');
          const option = form.querySelector(`option[value="${payload.issue_id}"]`);
          if (option) option.remove();
        } else {
          setStatus(status, data.message || 'Error returning book', false);
        }
      } catch (err) {
        setStatus(status, 'Network error', false);
      }
    });
  } catch (err) {
    viewContainer.innerHTML = '<div class="status error">Failed to load active issues</div>';
  }
}

async function renderFines() {
  viewContainer.innerHTML = `
    <section class="card">
      <h2>Manage Fines</h2>
      <div id="fine-status" class="status"></div>
      <table id="fine-table">
        <thead>
          <tr>
            <th>Fine ID</th>
            <th>Issue ID</th>
            <th>Member</th>
            <th>Amount</th>
            <th>Status</th>
            <th>Action</th>
          </tr>
        </thead>
        <tbody></tbody>
      </table>
    </section>
  `;

  const status = document.getElementById('fine-status');
  const tbody = document.querySelector('#fine-table tbody');

  async function loadFines() {
    try {
      const res = await fetch(`${apiBase}/fines`);
      const fines = await res.json();
      tbody.innerHTML = fines.map(f => `
        <tr>
          <td>${f.fine_id}</td>
          <td>${f.issue_id}</td>
          <td>${f.member_name}</td>
          <td>$${f.amount.toFixed(2)}</td>
          <td><span class="${f.paid_status === 'paid' ? 'status ok' : 'status error'}">${f.paid_status.toUpperCase()}</span></td>
          <td>
            ${f.paid_status === 'unpaid' ? `<button class="pay-btn primary" data-id="${f.fine_id}">Pay Fine</button>` : 'Resolved'}
          </td>
        </tr>
      `).join('');

      document.querySelectorAll('.pay-btn').forEach(btn => {
        btn.addEventListener('click', async (e) => {
          const fine_id = e.target.getAttribute('data-id');
          try {
            const pres = await fetch(`${apiBase}/fines/${fine_id}/pay`, { method: 'POST' });
            if (pres.ok) {
              setStatus(status, 'Fine marked as paid!');
              loadFines();
            } else {
              setStatus(status, 'Error paying fine', false);
            }
          } catch(err) {
            setStatus(status, 'Network Error', false);
          }
        });
      });
    } catch (err) {
      setStatus(status, 'Failed to load fines', false);
    }
  }

  loadFines();
}

function renderSearchBook() {
  viewContainer.innerHTML = `
    <section class="card">
      <h2>Search Book</h2>
      <form id="search-book-form">
        <label>Title <input name="title" /></label>
        <label>Author <input name="author" /></label>
        <label>Category <input name="category" /></label>
        <button class="primary" type="submit">Search</button>
      </form>
      <div id="search-book-status" class="status"></div>
      <table id="search-book-table">
        <thead>
          <tr>
            <th>ID</th>
            <th>Title</th>
            <th>Authors</th>
            <th>Category</th>
            <th>ISBN</th>
          </tr>
        </thead>
        <tbody></tbody>
      </table>
    </section>
  `;

  const form = document.getElementById('search-book-form');
  const status = document.getElementById('search-book-status');
  const tbody = document.querySelector('#search-book-table tbody');

  form.addEventListener('submit', async (e) => {
    e.preventDefault();
    const formData = new FormData(form);
    const params = new URLSearchParams();
    ['title', 'author', 'category'].forEach((field) => {
      const value = formData.get(field);
      if (value) params.append(field, value);
    });

    try {
      const res = await fetch(`${apiBase}/books?${params.toString()}`);
      const data = await res.json();
      if (!res.ok) {
        setStatus(status, data.message || 'Error searching books', false);
        return;
      }
      setStatus(status, `${data.length} book(s) found`);
      tbody.innerHTML = data
        .map(
          (b) => `
          <tr>
            <td>${b.book_id}</td>
            <td>${b.title}</td>
            <td>${b.authors || ''}</td>
            <td>${b.category_name || ''}</td>
            <td>${b.isbn || ''}</td>
          </tr>
        `
        )
        .join('');
    } catch (err) {
      setStatus(status, 'Network error', false);
    }
  });
}

function renderOverdue() {
  viewContainer.innerHTML = `
    <section class="card">
      <h2>Overdue Books</h2>
      <button class="primary" id="load-overdue">Load Overdue</button>
      <div id="overdue-status" class="status"></div>
      <table id="overdue-table">
        <thead>
          <tr>
            <th>Issue ID</th>
            <th>Member</th>
            <th>Book</th>
            <th>Copy ID</th>
            <th>Issue Date</th>
            <th>Due Date</th>
            <th>Days Overdue</th>
          </tr>
        </thead>
        <tbody></tbody>
      </table>
    </section>
  `;

  const btn = document.getElementById('load-overdue');
  const status = document.getElementById('overdue-status');
  const tbody = document.querySelector('#overdue-table tbody');

  btn.addEventListener('click', async () => {
    try {
      const res = await fetch(`${apiBase}/overdue`);
      const data = await res.json();
      if (!res.ok) {
        setStatus(status, data.message || 'Error loading overdue books', false);
        return;
      }
      setStatus(status, `${data.length} overdue record(s)`);
      tbody.innerHTML = data
        .map(
          (r) => `
          <tr>
            <td>${r.issue_id}</td>
            <td>${r.member_name} (#${r.member_id})</td>
            <td>${r.title}</td>
            <td>${r.copy_id}</td>
            <td>${r.issue_date?.substring(0, 10) || ''}</td>
            <td>${r.due_date?.substring(0, 10) || ''}</td>
            <td>${r.days_overdue}</td>
          </tr>
        `
        )
        .join('');
    } catch (err) {
      setStatus(status, 'Network error', false);
    }
  });
}

// initial view
loadView('dashboard');

