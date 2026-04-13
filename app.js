// ========== FIREBASE / DATA MANAGEMENT ==========
const firebaseConfig = {
  apiKey: "AIzaSyCJqp4e8BMkEbOO3ErWXJiz0zx9J3pxl34",
  authDomain: "a-boost.firebaseapp.com",
  projectId: "a-boost",
  storageBucket: "a-boost.firebasestorage.app",
  messagingSenderId: "431608615443",
  appId: "1:431608615443:web:5fb112e76f2d6ef3b7e5e6",
  measurementId: "G-7TFBPDR74Q"
};

firebase.initializeApp(firebaseConfig);
const fsdb = firebase.firestore();
const dataRef = fsdb.collection('app').doc('data');

const STATE = { members: [], events: [], transactions: [], opinions: [], todos: [], notice: '' };

dataRef.get().then(snap => {
  if (!snap.exists) dataRef.set(STATE);
});

dataRef.onSnapshot(snap => {
  if (!snap.exists) return;
  const data = snap.data();
  STATE.members = data.members || [];
  STATE.events = data.events || [];
  STATE.transactions = data.transactions || [];
  STATE.opinions = data.opinions || [];
  STATE.todos = data.todos || [];
  STATE.notice = data.notice || '';
  updateDashboard();
  renderTodos();
  renderMembers();
  renderCalendar();
  renderTransactions();
  renderOpinions();
});

const DB = {
  get: (key) => STATE[key] || [],
  getStr: (key) => STATE[key] || '',
  set: (key, data) => {
    STATE[key] = data;
    dataRef.set({ [key]: data }, { merge: true });
  },
  setStr: (key, val) => {
    STATE[key] = val;
    dataRef.set({ [key]: val }, { merge: true });
  },
};

function genId() {
  return Date.now().toString(36) + Math.random().toString(36).slice(2, 5);
}

// ========== NAVIGATION ==========
document.querySelectorAll('.nav-btn').forEach(btn => {
  btn.addEventListener('click', () => {
    document.querySelectorAll('.nav-btn').forEach(b => b.classList.remove('active'));
    document.querySelectorAll('.page').forEach(p => p.classList.remove('active'));
    btn.classList.add('active');
    document.getElementById('page-' + btn.dataset.page).classList.add('active');
    if (btn.dataset.page === 'schedule') renderCalendar();
  });
});

// ========== DASHBOARD ==========
function updateDashboard() {
  const members = DB.get('members').filter(m => m.status === 'active');
  const events = DB.get('events');
  const transactions = DB.get('transactions');
  const opinions = DB.get('opinions');

  document.getElementById('stat-members').textContent = members.length;

  const now = new Date();
  const thisMonth = events.filter(e => {
    const d = new Date(e.date);
    return d.getMonth() === now.getMonth() && d.getFullYear() === now.getFullYear();
  });
  document.getElementById('stat-events').textContent = thisMonth.length;

  const balance = transactions.reduce((sum, t) => {
    return t.type === 'income' ? sum + Number(t.amount) : sum - Number(t.amount);
  }, 0);
  document.getElementById('stat-balance').textContent = '¥' + balance.toLocaleString();
  document.getElementById('stat-opinions').textContent = opinions.length;

  // Upcoming events
  const upcoming = events
    .filter(e => new Date(e.date) >= new Date(now.toDateString()))
    .sort((a, b) => new Date(a.date) - new Date(b.date))
    .slice(0, 5);

  const upcomingEl = document.getElementById('upcoming-events');
  if (upcoming.length === 0) {
    upcomingEl.innerHTML = '<p class="empty-msg">直近のイベントはありません</p>';
  } else {
    upcomingEl.innerHTML = upcoming.map(e => `
      <div class="event-list-item">
        <span class="event-date-badge">${formatDate(e.date)}</span>
        <div>
          <div class="event-list-title">${esc(e.title)}</div>
          <div class="event-list-meta">${e.time ? e.time + (e.endtime ? ' – ' + e.endtime : '') : ''} ${e.location ? '📍' + esc(e.location) : ''}</div>
        </div>
      </div>
    `).join('');
  }

  // Recent transactions
  const recent = [...transactions].sort((a, b) => new Date(b.date) - new Date(a.date)).slice(0, 5);
  const recentEl = document.getElementById('recent-transactions');
  if (recent.length === 0) {
    recentEl.innerHTML = '<p class="empty-msg">収支記録はありません</p>';
  } else {
    recentEl.innerHTML = recent.map(t => `
      <div class="event-list-item">
        <span class="event-date-badge">${formatDate(t.date)}</span>
        <div style="flex:1">
          <div class="event-list-title">${esc(t.desc)}</div>
          <div class="event-list-meta">${t.category}</div>
        </div>
        <span class="${t.type === 'income' ? 'amount-income' : 'amount-expense'}">
          ${t.type === 'income' ? '+' : '-'}¥${Number(t.amount).toLocaleString()}
        </span>
      </div>
    `).join('');
  }

  document.getElementById('notice-board').value = DB.getStr('notice');
}

function saveNotice() {
  DB.setStr('notice', document.getElementById('notice-board').value);
  showToast('お知らせを保存しました');
}

// ========== MEMBERS ==========
function renderMembers() {
  const query = (document.getElementById('member-search')?.value || '').toLowerCase();
  const members = DB.get('members').filter(m => {
    if (!query) return true;
    return (m.name + m.grade + m.role + m.dept + m.email).toLowerCase().includes(query);
  }).sort((a, b) => {
    const g = (a.grade || '').localeCompare(b.grade || '', 'ja');
    if (g !== 0) return g;
    return (a.name || '').localeCompare(b.name || '', 'ja');
  });

  const tbody = document.getElementById('members-tbody');
  if (members.length === 0) {
    tbody.innerHTML = '<tr><td colspan="6" class="empty-msg">メンバーはいません</td></tr>';
    return;
  }
  tbody.innerHTML = members.map((m, i) => `
    <tr>
      <td>${i + 1}</td>
      <td><strong>${esc(m.name)}</strong></td>
      <td>${m.grade || '-'}</td>
      <td>${esc(m.dept) || '-'}</td>
      <td>${esc(m.email) || '-'}</td>
      <td>
        <button class="btn btn-outline btn-sm" onclick="editMember('${m.id}')">編集</button>
        <button class="btn btn-danger btn-sm" onclick="deleteMember('${m.id}')">削除</button>
      </td>
    </tr>
  `).join('');
}

function saveInlineMember() {
  const name = document.getElementById('if-name').value.trim();
  if (!name) { alert('名前を入力してください'); return; }
  const id = document.getElementById('inline-edit-id').value;
  const members = DB.get('members');
  const member = {
    id: id || genId(),
    name,
    grade: document.getElementById('if-grade').value,
    dept: document.getElementById('if-dept').value.trim(),
    email: document.getElementById('if-line').value.trim(),
  };
  if (id) {
    const idx = members.findIndex(m => m.id === id);
    members[idx] = member;
  } else {
    members.push(member);
  }
  DB.set('members', members);
  cancelInlineEdit();
  renderMembers();
  updateDashboard();
  showToast(id ? 'メンバーを更新しました' : 'メンバーを追加しました');
}

function cancelInlineEdit() {
  document.getElementById('inline-form-title').textContent = 'メンバー追加';
  document.getElementById('inline-edit-id').value = '';
  document.getElementById('if-name').value = '';
  document.getElementById('if-grade').value = '1年';
  document.getElementById('if-dept').value = '';
  document.getElementById('if-line').value = '';
  document.getElementById('inline-cancel-btn').style.display = 'none';
}

function statusLabel(s) {
  return { active: '在籍中', inactive: '休会中', alumni: 'OB/OG' }[s] || s;
}

function saveMember() {
  const name = document.getElementById('m-name').value.trim();
  if (!name) { alert('名前を入力してください'); return; }
  const id = document.getElementById('member-edit-id').value;
  const members = DB.get('members');
  const member = {
    id: id || genId(),
    name,
    grade: document.getElementById('m-grade').value,
    dept: document.getElementById('m-dept').value.trim(),
    email: document.getElementById('m-email').value.trim(),
  };
  if (id) {
    const idx = members.findIndex(m => m.id === id);
    members[idx] = member;
  } else {
    members.push(member);
  }
  DB.set('members', members);
  closeModal('member-modal');
  renderMembers();
  updateDashboard();
  showToast(id ? 'メンバーを更新しました' : 'メンバーを追加しました');
}

function editMember(id) {
  const m = DB.get('members').find(m => m.id === id);
  if (!m) return;
  document.getElementById('inline-form-title').textContent = 'メンバー編集';
  document.getElementById('inline-edit-id').value = m.id;
  document.getElementById('if-name').value = m.name;
  document.getElementById('if-grade').value = m.grade || 'B1';
  document.getElementById('if-dept').value = m.dept || '';
  document.getElementById('if-line').value = m.email || '';
  document.getElementById('inline-cancel-btn').style.display = 'inline-block';
  document.getElementById('if-name').focus();
  document.getElementById('page-members').scrollTop = 0;
  window.scrollTo({ top: 0, behavior: 'smooth' });
}

function deleteMember(id) {
  if (!confirm('このメンバーを削除しますか？')) return;
  DB.set('members', DB.get('members').filter(m => m.id !== id));
  renderMembers();
  updateDashboard();
  showToast('メンバーを削除しました');
}

// ========== SCHEDULE ==========
let currentDate = new Date();

function changeMonth(delta) {
  currentDate.setMonth(currentDate.getMonth() + delta);
  renderCalendar();
}

function renderCalendar() {
  const year = currentDate.getFullYear();
  const month = currentDate.getMonth();
  const events = DB.get('events');
  const today = new Date();

  document.getElementById('calendar-title').textContent =
    `${year}年 ${month + 1}月`;

  const firstDay = new Date(year, month, 1).getDay();
  const daysInMonth = new Date(year, month + 1, 0).getDate();
  const dayNames = ['日', '月', '火', '水', '木', '金', '土'];

  let html = dayNames.map((d, i) => `<div class="calendar-day-header" style="${i===0?'color:#fca5a5':i===6?'color:#93c5fd':''}">${d}</div>`).join('');

  for (let i = 0; i < firstDay; i++) {
    html += '<div class="calendar-cell empty"></div>';
  }

  for (let d = 1; d <= daysInMonth; d++) {
    const dateStr = `${year}-${String(month + 1).padStart(2, '0')}-${String(d).padStart(2, '0')}`;
    const dayEvents = events.filter(e => e.date === dateStr);
    const dow = new Date(year, month, d).getDay();
    const isToday = d === today.getDate() && month === today.getMonth() && year === today.getFullYear();
    const cls = ['calendar-cell', isToday ? 'today' : '', dow === 0 ? 'sunday' : dow === 6 ? 'saturday' : ''].filter(Boolean).join(' ');

    html += `<div class="${cls}">
      <span class="date-num">${d}</span>
      ${dayEvents.map(e => `<span class="cal-event ${e.type}" title="${esc(e.title)}" onclick="viewEvent('${e.id}')">${esc(e.title)}</span>`).join('')}
    </div>`;
  }

  document.getElementById('calendar').innerHTML = html;
  renderEvents();
}

function renderEvents() {
  const filter = document.getElementById('event-filter')?.value || 'all';
  const events = DB.get('events')
    .filter(e => filter === 'all' || e.type === filter)
    .sort((a, b) => new Date(a.date) - new Date(b.date));

  const el = document.getElementById('events-list');
  if (events.length === 0) {
    el.innerHTML = '<p class="empty-msg">イベントはありません</p>';
    return;
  }
  const members = DB.get('members');
  el.innerHTML = events.map(e => {
    const coordinators = (e.coordinatorIds || [])
      .map(cid => members.find(m => m.id === cid))
      .filter(Boolean)
      .map(m => esc(m.name))
      .join('、');
    return `
    <div class="event-list-item">
      <span class="event-date-badge">${formatDate(e.date)}</span>
      <div style="flex:1">
        <div class="event-list-title">
          <span class="badge badge-${e.type}">${typeLabel(e.type)}</span>
          ${esc(e.title)}
        </div>
        <div class="event-list-meta">
          ${e.time ? '🕐 ' + e.time + (e.endtime ? ' – ' + e.endtime : '') : ''}
          ${e.location ? ' 📍' + esc(e.location) : ''}
          ${coordinators ? ' 👤イベント係: ' + coordinators : ''}
        </div>
        ${e.desc ? `<div class="event-list-meta" style="margin-top:2px">${esc(e.desc)}</div>` : ''}
      </div>
      <div style="display:flex;gap:4px">
        <button class="btn btn-outline btn-sm" onclick="editEvent('${e.id}')">編集</button>
        <button class="btn btn-danger btn-sm" onclick="deleteEvent('${e.id}')">削除</button>
      </div>
    </div>
  `;}).join('');
}

function typeLabel(t) {
  return { practice: '活動', event: 'イベント', meeting: '打合せ', other: 'その他' }[t] || t;
}

function viewEvent(id) {
  const e = DB.get('events').find(e => e.id === id);
  if (e) alert(`${e.title}\n${formatDate(e.date)} ${e.time || ''}\n${e.location || ''}\n${e.desc || ''}`);
}

function populateCoordinatorSelect() {
  const sel = document.getElementById('e-coordinator');
  if (!sel) return;
  const members = DB.get('members');
  const current = Array.from(sel.selectedOptions).map(o => o.value);
  sel.innerHTML = members.map(m =>
    `<option value="${m.id}" ${current.includes(m.id) ? 'selected' : ''}>${esc(m.name)}（${m.grade || ''}）</option>`
  ).join('');
}

function saveEvent() {
  const title = document.getElementById('e-title').value.trim();
  const date = document.getElementById('e-date').value;
  if (!title || !date) { alert('タイトルと日付は必須です'); return; }
  const id = document.getElementById('event-edit-id').value;
  const events = DB.get('events');
  const coordinatorIds = Array.from(document.getElementById('e-coordinator').selectedOptions).map(o => o.value);
  const event = {
    id: id || genId(),
    title,
    date,
    time: document.getElementById('e-time').value,
    endtime: document.getElementById('e-endtime').value,
    type: document.getElementById('e-type').value,
    location: document.getElementById('e-location').value.trim(),
    coordinatorIds,
    desc: document.getElementById('e-desc').value.trim(),
  };
  if (id) {
    const idx = events.findIndex(e => e.id === id);
    events[idx] = event;
  } else {
    events.push(event);
  }
  DB.set('events', events);
  closeModal('event-modal');
  renderCalendar();
  updateDashboard();
  showToast(id ? 'イベントを更新しました' : 'イベントを追加しました');
}

function editEvent(id) {
  const e = DB.get('events').find(e => e.id === id);
  if (!e) return;
  document.getElementById('event-modal-title').textContent = 'イベント編集';
  document.getElementById('event-edit-id').value = e.id;
  document.getElementById('e-title').value = e.title;
  document.getElementById('e-date').value = e.date;
  document.getElementById('e-time').value = e.time;
  document.getElementById('e-endtime').value = e.endtime;
  document.getElementById('e-type').value = e.type;
  document.getElementById('e-location').value = e.location;
  document.getElementById('e-desc').value = e.desc;
  populateCoordinatorSelect();
  const sel = document.getElementById('e-coordinator');
  const ids = e.coordinatorIds || [];
  Array.from(sel.options).forEach(o => { o.selected = ids.includes(o.value); });
  openModal('event-modal');
}

function deleteEvent(id) {
  if (!confirm('このイベントを削除しますか？')) return;
  DB.set('events', DB.get('events').filter(e => e.id !== id));
  renderCalendar();
  updateDashboard();
  showToast('イベントを削除しました');
}

// ========== ACCOUNTING ==========
function renderTransactions() {
  const filter = document.getElementById('transaction-filter')?.value || 'all';
  const transactions = DB.get('transactions')
    .filter(t => filter === 'all' || t.type === filter)
    .sort((a, b) => new Date(b.date) - new Date(a.date));

  const all = DB.get('transactions');
  const income = all.filter(t => t.type === 'income').reduce((s, t) => s + Number(t.amount), 0);
  const expense = all.filter(t => t.type === 'expense').reduce((s, t) => s + Number(t.amount), 0);
  document.getElementById('total-income').textContent = '¥' + income.toLocaleString();
  document.getElementById('total-expense').textContent = '¥' + expense.toLocaleString();
  document.getElementById('balance-display').textContent = '¥' + (income - expense).toLocaleString();

  const tbody = document.getElementById('transactions-tbody');
  if (transactions.length === 0) {
    tbody.innerHTML = '<tr><td colspan="8" class="empty-msg">収支記録はありません</td></tr>';
    return;
  }
  tbody.innerHTML = transactions.map(t => `
    <tr>
      <td>${formatDate(t.date)}</td>
      <td><span class="${t.type === 'income' ? 'amount-income' : 'amount-expense'}">${t.type === 'income' ? '収入' : '支出'}</span></td>
      <td>${t.category}</td>
      <td>${esc(t.desc)}</td>
      <td class="${t.type === 'income' ? 'amount-income' : 'amount-expense'}">
        ${t.type === 'income' ? '+' : '-'}¥${Number(t.amount).toLocaleString()}
      </td>
      <td>${esc(t.person) || '-'}</td>
      <td>${esc(t.note) || '-'}</td>
      <td>
        <button class="btn btn-outline btn-sm" onclick="editTransaction('${t.id}')">編集</button>
        <button class="btn btn-danger btn-sm" onclick="deleteTransaction('${t.id}')">削除</button>
      </td>
    </tr>
  `).join('');
}

function saveTransaction() {
  const month = document.getElementById('t-month').value;
  const day = document.getElementById('t-day').value;
  const amount = document.getElementById('t-amount').value;
  const desc = document.getElementById('t-desc').value.trim();
  if (!month || !day || !amount || !desc) { alert('日付・金額・内容は必須です'); return; }
  const year = new Date().getFullYear();
  const date = `${year}-${String(month).padStart(2,'0')}-${String(day).padStart(2,'0')}`;
  const id = document.getElementById('t-edit-id').value;
  const transactions = DB.get('transactions');
  const t = {
    id: id || genId(),
    date,
    type: document.getElementById('t-type').value,
    category: document.getElementById('t-category').value,
    amount: Number(amount),
    desc,
    person: document.getElementById('t-person').value.trim(),
    note: document.getElementById('t-note').value.trim(),
  };
  if (id) {
    const idx = transactions.findIndex(t => t.id === id);
    transactions[idx] = t;
  } else {
    transactions.push(t);
  }
  DB.set('transactions', transactions);
  closeModal('transaction-modal');
  renderTransactions();
  updateDashboard();
  showToast(id ? '収支を更新しました' : '収支を追加しました');
}

function editTransaction(id) {
  const t = DB.get('transactions').find(t => t.id === id);
  if (!t) return;
  document.getElementById('transaction-modal-title').textContent = '収支編集';
  document.getElementById('t-edit-id').value = t.id;
  const parts = (t.date || '').split('-');
  document.getElementById('t-month').value = parts[1] ? parseInt(parts[1]) : '';
  document.getElementById('t-day').value = parts[2] ? parseInt(parts[2]) : '';
  document.getElementById('t-type').value = t.type;
  document.getElementById('t-category').value = t.category;
  document.getElementById('t-amount').value = t.amount;
  document.getElementById('t-desc').value = t.desc;
  document.getElementById('t-person').value = t.person;
  document.getElementById('t-note').value = t.note;
  openModal('transaction-modal');
}

function deleteTransaction(id) {
  if (!confirm('この収支記録を削除しますか？')) return;
  DB.set('transactions', DB.get('transactions').filter(t => t.id !== id));
  renderTransactions();
  updateDashboard();
  showToast('収支を削除しました');
}

// ========== TODO ==========
function renderTodos() {
  const todos = DB.get('todos');
  const el = document.getElementById('todo-list');
  if (!el) return;
  if (todos.length === 0) {
    el.innerHTML = '<p class="empty-msg">ToDoはありません</p>';
    return;
  }
  el.innerHTML = todos.map(t => `
    <div style="display:flex;align-items:center;gap:0.5rem;padding:0.4rem 0;border-bottom:1px solid var(--gray-100)">
      <input type="checkbox" ${t.done ? 'checked' : ''} onchange="toggleTodo('${t.id}')" style="width:16px;height:16px;cursor:pointer">
      <span style="flex:1;font-size:0.875rem;${t.done ? 'text-decoration:line-through;color:var(--gray-500)' : ''}">${esc(t.text)}</span>
      ${t.person ? `<span style="font-size:0.75rem;background:var(--primary-light);color:var(--primary);padding:0.15rem 0.5rem;border-radius:4px">${esc(t.person)}</span>` : ''}
      <button class="btn btn-danger btn-sm" onclick="deleteTodo('${t.id}')">削除</button>
    </div>
  `).join('');
}

function addTodo() {
  const input = document.getElementById('todo-input');
  const text = input.value.trim();
  if (!text) return;
  const checked = document.querySelectorAll('.todo-person-cb:checked');
  const persons = Array.from(checked).map(cb => cb.value);
  const todos = DB.get('todos');
  todos.push({ id: genId(), text, person: persons.join('・'), done: false });
  DB.set('todos', todos);
  input.value = '';
  document.querySelectorAll('.todo-person-cb').forEach(cb => cb.checked = false);
}

function toggleTodo(id) {
  const todos = DB.get('todos');
  const t = todos.find(t => t.id === id);
  if (t) t.done = !t.done;
  DB.set('todos', todos);
}

function deleteTodo(id) {
  DB.set('todos', DB.get('todos').filter(t => t.id !== id));
}

// ========== OPINIONS ==========
function renderOpinions() {
  const filter = document.getElementById('opinion-event-filter')?.value || 'all';
  const events = DB.get('events').sort((a, b) => new Date(a.date) - new Date(b.date));
  const eventOptions = '<option value="">なし（全体への意見）</option>' +
    events.map(e => `<option value="${e.id}">${formatDate(e.date)} ${esc(e.title)}</option>`).join('');

  // 投稿フォームのイベント選択肢を更新
  const selectEl = document.getElementById('opinion-event-select');
  if (selectEl) selectEl.innerHTML = eventOptions;

  // フィルタードロップダウンを更新
  const filterEl = document.getElementById('opinion-event-filter');
  if (filterEl) {
    const current = filterEl.value;
    filterEl.innerHTML = '<option value="all">すべてのイベント</option>' +
      events.map(e => `<option value="${e.id}">${formatDate(e.date)} ${esc(e.title)}</option>`).join('');
    filterEl.value = current;
  }

  let opinions = DB.get('opinions').sort((a, b) => new Date(b.createdAt) - new Date(a.createdAt));
  if (filter !== 'all') opinions = opinions.filter(o => o.eventId === filter);

  const el = document.getElementById('opinions-list');
  if (!el) return;
  if (opinions.length === 0) {
    el.innerHTML = '<p class="empty-msg">意見・アイデアはまだありません</p>';
    return;
  }
  el.innerHTML = opinions.map(o => {
    const ev = o.eventId ? events.find(e => e.id === o.eventId) : null;
    return `
    <div class="event-list-item" style="align-items:flex-start">
      <span class="event-date-badge">${o.createdAt ? o.createdAt.slice(5,10).replace('-','/') : ''}</span>
      <div style="flex:1">
        <div class="event-list-title">${esc(o.name)}${ev ? ' <span style="color:var(--primary);font-size:0.8rem">— ' + esc(ev.title) + '</span>' : ''}</div>
        <div style="margin-top:0.4rem;font-size:0.875rem;color:var(--gray-700);white-space:pre-wrap">${esc(o.text)}</div>
      </div>
      <button class="btn btn-danger btn-sm" onclick="deleteOpinion('${o.id}')">削除</button>
    </div>
  `;}).join('');
}

function postOpinion() {
  const name = document.getElementById('opinion-name').value.trim();
  const text = document.getElementById('opinion-text').value.trim();
  if (!name) { alert('名前を入力してください'); return; }
  if (!text) { alert('意見・アイデアを入力してください'); return; }
  const eventId = document.getElementById('opinion-event-select').value || null;
  const opinions = DB.get('opinions');
  opinions.push({
    id: genId(),
    name,
    eventId,
    text,
    createdAt: new Date().toISOString().slice(0, 10),
  });
  DB.set('opinions', opinions);
  document.getElementById('opinion-name').value = '';
  document.getElementById('opinion-text').value = '';
  document.getElementById('opinion-event-select').value = '';
  updateDashboard();
  showToast('投稿しました');
}

function deleteOpinion(id) {
  if (!confirm('この意見を削除しますか？')) return;
  DB.set('opinions', DB.get('opinions').filter(o => o.id !== id));
  renderOpinions();
  updateDashboard();
  showToast('削除しました');
}

// ========== CSV EXPORT ==========
function exportCSV(type) {
  let rows, filename;
  if (type === 'members') {
    const members = DB.get('members');
    rows = [['ID', '名前', '学年', '学科', 'パート/役割', 'メール', '入会年度', 'ステータス', '備考']];
    members.forEach((m, i) => rows.push([i+1, m.name, m.grade, m.dept, m.role, m.email, m.year, statusLabel(m.status), m.note]));
    filename = 'メンバー一覧.csv';
  } else {
    const t = DB.get('transactions');
    rows = [['日付', '種別', 'カテゴリ', '内容', '金額', '担当者', '備考']];
    t.forEach(t => rows.push([t.date, t.type === 'income' ? '収入' : '支出', t.category, t.desc, t.amount, t.person, t.note]));
    filename = '収支記録.csv';
  }
  const csv = rows.map(r => r.map(c => `"${String(c || '').replace(/"/g, '""')}"`).join(',')).join('\n');
  const bom = '\uFEFF';
  const blob = new Blob([bom + csv], { type: 'text/csv;charset=utf-8' });
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url; a.download = filename; a.click();
  URL.revokeObjectURL(url);
}

// ========== MODAL ==========
function openModal(id) {
  document.getElementById(id).style.display = 'flex';
  if (id === 'event-modal') populateCoordinatorSelect();
}

function closeModal(id) {
  document.getElementById(id).style.display = 'none';
  if (id === 'member-modal') {
    document.getElementById('member-modal-title').textContent = 'メンバー追加';
    document.getElementById('member-edit-id').value = '';
    ['m-name','m-dept','m-email'].forEach(f => document.getElementById(f).value = '');
    document.getElementById('m-grade').value = '1年';
  }
  if (id === 'event-modal') {
    document.getElementById('event-modal-title').textContent = 'イベント追加';
    document.getElementById('event-edit-id').value = '';
    ['e-title','e-date','e-time','e-endtime','e-location','e-desc'].forEach(f => document.getElementById(f).value = '');
    document.getElementById('e-type').value = 'practice';
    Array.from(document.getElementById('e-coordinator').options).forEach(o => o.selected = false);
  }
  if (id === 'transaction-modal') {
    document.getElementById('transaction-modal-title').textContent = '収支追加';
    document.getElementById('t-edit-id').value = '';
    ['t-month','t-day','t-amount','t-desc','t-person','t-note'].forEach(f => document.getElementById(f).value = '');
    document.getElementById('t-type').value = 'income';
    document.getElementById('t-category').value = '会費';
  }
}

// Close modal on overlay click
document.querySelectorAll('.modal-overlay').forEach(overlay => {
  overlay.addEventListener('click', e => {
    if (e.target === overlay) closeModal(overlay.id);
  });
});

// ========== TOAST ==========
function showToast(msg) {
  const el = document.createElement('div');
  el.style.cssText = 'position:fixed;bottom:1.5rem;right:1.5rem;background:#1f2937;color:white;padding:0.75rem 1.25rem;border-radius:8px;font-size:0.875rem;z-index:9999;box-shadow:0 4px 12px rgba(0,0,0,0.15);animation:fadeIn 0.2s';
  el.textContent = msg;
  document.body.appendChild(el);
  setTimeout(() => el.remove(), 2500);
}

// ========== UTILS ==========
function esc(str) {
  return String(str || '').replace(/&/g,'&amp;').replace(/</g,'&lt;').replace(/>/g,'&gt;').replace(/"/g,'&quot;');
}

function formatDate(str) {
  if (!str) return '';
  const d = new Date(str + 'T00:00:00');
  return `${d.getMonth()+1}/${d.getDate()}`;
}

// ========== INIT ==========
document.addEventListener('DOMContentLoaded', () => {
  const today = new Date();
  document.getElementById('e-date').value = today.toISOString().slice(0, 10);
  document.getElementById('t-month').value = today.getMonth() + 1;
  document.getElementById('t-day').value = today.getDate();
});
