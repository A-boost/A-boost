// ========== DATA MANAGEMENT ==========
const DB = {
  get: (key) => JSON.parse(localStorage.getItem('aboost_' + key) || '[]'),
  set: (key, data) => localStorage.setItem('aboost_' + key, JSON.stringify(data)),
  getStr: (key) => localStorage.getItem('aboost_' + key) || '',
  setStr: (key, val) => localStorage.setItem('aboost_' + key, val),
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
  const docs = DB.get('docs');

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
  document.getElementById('stat-docs').textContent = docs.length;

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
  document.getElementById('if-grade').value = 'B1';
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
  el.innerHTML = events.map(e => `
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
        </div>
        ${e.desc ? `<div class="event-list-meta" style="margin-top:2px">${esc(e.desc)}</div>` : ''}
      </div>
      <div style="display:flex;gap:4px">
        <button class="btn btn-outline btn-sm" onclick="editEvent('${e.id}')">編集</button>
        <button class="btn btn-danger btn-sm" onclick="deleteEvent('${e.id}')">削除</button>
      </div>
    </div>
  `).join('');
}

function typeLabel(t) {
  return { practice: '活動', event: 'イベント', meeting: '打合せ', other: 'その他' }[t] || t;
}

function viewEvent(id) {
  const e = DB.get('events').find(e => e.id === id);
  if (e) alert(`${e.title}\n${formatDate(e.date)} ${e.time || ''}\n${e.location || ''}\n${e.desc || ''}`);
}

function saveEvent() {
  const title = document.getElementById('e-title').value.trim();
  const date = document.getElementById('e-date').value;
  if (!title || !date) { alert('タイトルと日付は必須です'); return; }
  const id = document.getElementById('event-edit-id').value;
  const events = DB.get('events');
  const event = {
    id: id || genId(),
    title,
    date,
    time: document.getElementById('e-time').value,
    endtime: document.getElementById('e-endtime').value,
    type: document.getElementById('e-type').value,
    location: document.getElementById('e-location').value.trim(),
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
  const date = document.getElementById('t-date').value;
  const amount = document.getElementById('t-amount').value;
  const desc = document.getElementById('t-desc').value.trim();
  if (!date || !amount || !desc) { alert('日付・金額・内容は必須です'); return; }
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
  document.getElementById('t-date').value = t.date;
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

// ========== DOCUMENTS ==========
const TEMPLATES = [
  {
    title: '議事録テンプレート',
    type: '議事録',
    desc: '会議・ミーティング用',
    content: `【議事録】

日時：
場所：
出席者：
欠席者：
議長：
書記：

─────────────────────
■ 議題

1.
2.
3.

─────────────────────
■ 審議・報告内容

1.
  ・
  ・
  決定事項：

2.
  ・
  決定事項：

─────────────────────
■ 次回開催予定

日時：
場所：
議題（予定）：

─────────────────────
以上`
  },
  {
    title: '告知文テンプレート',
    type: '告知文',
    desc: '活動告知・募集用',
    content: `【お知らせ】

タイトル：

─────────────────────
日時：
場所：
対象：
内容：

─────────────────────
【詳細】


─────────────────────
【参加方法】


締め切り：

お問い合わせ：`
  },
  {
    title: '活動報告書テンプレート',
    type: '報告書',
    desc: 'イベント・活動後の報告',
    content: `【活動報告書】

活動名：
実施日時：
実施場所：
参加人数：
担当者：

─────────────────────
■ 活動概要


─────────────────────
■ 活動内容・タイムライン


─────────────────────
■ 収支報告

収入：¥
支出：¥
収支：¥

─────────────────────
■ 成果・反省点


─────────────────────
■ 次回への提案・引き継ぎ事項


作成日：
作成者：`
  },
  {
    title: '部費徴収通知テンプレート',
    type: '告知文',
    desc: '部費・会費徴収用',
    content: `【部費徴収のご案内】

メンバーの皆さんへ

下記の通り部費の徴収を行います。

─────────────────────
■ 徴収額：¥

■ 期間：  年  月分

■ 支払い締め切り：  年  月  日（）

■ 支払い方法：
  □ 現金（会計担当まで直接）
  □ 振込（口座情報は別途連絡）

─────────────────────
不明な点は会計担当までお問い合わせください。

会計担当：
連絡先：`
  }
];

function populateEventSelects() {
  const events = DB.get('events').sort((a, b) => new Date(a.date) - new Date(b.date));
  const options = '<option value="">なし</option>' + events.map(e => `<option value="${e.id}">${formatDate(e.date)} ${esc(e.title)}</option>`).join('');
  const filterOptions = '<option value="all">すべてのイベント</option>' + events.map(e => `<option value="${e.id}">${formatDate(e.date)} ${esc(e.title)}</option>`).join('');
  document.getElementById('doc-event').innerHTML = options;
  document.getElementById('doc-event-filter').innerHTML = filterOptions;
}

function openDocModal() {
  populateEventSelects();
  document.getElementById('doc-modal-title').textContent = '文書作成';
  document.getElementById('doc-edit-id').value = '';
  document.getElementById('doc-title').value = '';
  document.getElementById('doc-type').value = '議事録';
  document.getElementById('doc-content').value = '';
  document.getElementById('doc-event').value = '';
  openModal('doc-modal');
}

function renderDocs() {
  const filter = document.getElementById('doc-event-filter')?.value || 'all';
  const events = DB.get('events');
  let docs = DB.get('docs');
  if (filter !== 'all') docs = docs.filter(d => d.eventId === filter);
  const el = document.getElementById('docs-grid');
  if (docs.length === 0) {
    el.innerHTML = '<p class="empty-msg" style="padding:2rem">文書はありません。「文書作成」または「テンプレート」から作成してください。</p>';
    return;
  }
  el.innerHTML = docs.map(d => {
    const ev = d.eventId ? events.find(e => e.id === d.eventId) : null;
    return `
    <div class="doc-card" onclick="viewDoc('${d.id}')">
      <div class="doc-card-type">${d.type}${ev ? ' | ' + esc(ev.title) : ''}</div>
      <div class="doc-card-title">${esc(d.title)}</div>
      <div class="doc-card-date">${formatDate(d.updatedAt || d.createdAt)}</div>
      <div class="doc-card-actions" onclick="event.stopPropagation()">
        <button class="btn btn-outline btn-sm" onclick="editDoc('${d.id}')">編集</button>
        <button class="btn btn-danger btn-sm" onclick="deleteDoc('${d.id}')">削除</button>
      </div>
    </div>
  `;}).join('');
}

function saveDoc() {
  const title = document.getElementById('doc-title').value.trim();
  if (!title) { alert('タイトルを入力してください'); return; }
  const id = document.getElementById('doc-edit-id').value;
  const docs = DB.get('docs');
  const now = new Date().toISOString().slice(0, 10);
  const doc = {
    id: id || genId(),
    title,
    type: document.getElementById('doc-type').value,
    eventId: document.getElementById('doc-event').value || null,
    content: document.getElementById('doc-content').value,
    createdAt: id ? (docs.find(d => d.id === id)?.createdAt || now) : now,
    updatedAt: now,
  };
  if (id) {
    const idx = docs.findIndex(d => d.id === id);
    docs[idx] = doc;
  } else {
    docs.push(doc);
  }
  DB.set('docs', docs);
  closeModal('doc-modal');
  renderDocs();
  updateDashboard();
  showToast(id ? '文書を更新しました' : '文書を保存しました');
}

function viewDoc(id) {
  const d = DB.get('docs').find(d => d.id === id);
  if (!d) return;
  document.getElementById('doc-view-content').innerHTML = `
    <div style="margin-bottom:1rem">
      <span style="color:var(--primary);font-size:0.8rem;font-weight:500">${d.type}</span>
      <h2 style="margin:0.25rem 0">${esc(d.title)}</h2>
      <small style="color:var(--gray-500)">${formatDate(d.updatedAt || d.createdAt)}</small>
    </div>
    <pre style="white-space:pre-wrap;font-family:inherit;font-size:0.9rem;line-height:1.7;border:1px solid var(--gray-200);padding:1rem;border-radius:8px;background:var(--gray-50)">${esc(d.content)}</pre>
  `;
  document.getElementById('doc-view-modal').dataset.docId = id;
  openModal('doc-view-modal');
}

function editDocFromView() {
  const id = document.getElementById('doc-view-modal').dataset.docId;
  closeModal('doc-view-modal');
  editDoc(id);
}

function printDocFromView() {
  window.print();
}

function editDoc(id) {
  const d = DB.get('docs').find(d => d.id === id);
  if (!d) return;
  populateEventSelects();
  document.getElementById('doc-modal-title').textContent = '文書編集';
  document.getElementById('doc-edit-id').value = d.id;
  document.getElementById('doc-title').value = d.title;
  document.getElementById('doc-type').value = d.type;
  document.getElementById('doc-event').value = d.eventId || '';
  document.getElementById('doc-content').value = d.content;
  openModal('doc-modal');
}

function deleteDoc(id) {
  if (!confirm('この文書を削除しますか？')) return;
  DB.set('docs', DB.get('docs').filter(d => d.id !== id));
  renderDocs();
  updateDashboard();
  showToast('文書を削除しました');
}

function printDoc() {
  window.print();
}

function showTemplates() {
  const el = document.getElementById('template-list');
  el.innerHTML = TEMPLATES.map((t, i) => `
    <div class="template-item" onclick="useTemplate(${i})">
      <div class="template-item-title">${t.title}</div>
      <div class="template-item-desc">${t.desc}</div>
    </div>
  `).join('');
  openModal('template-modal');
}

function useTemplate(idx) {
  const t = TEMPLATES[idx];
  closeModal('template-modal');
  populateEventSelects();
  document.getElementById('doc-modal-title').textContent = '文書作成';
  document.getElementById('doc-edit-id').value = '';
  document.getElementById('doc-title').value = t.title.replace('テンプレート', '');
  document.getElementById('doc-type').value = t.type;
  document.getElementById('doc-event').value = '';
  document.getElementById('doc-content').value = t.content;
  openModal('doc-modal');
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
}

function closeModal(id) {
  document.getElementById(id).style.display = 'none';
  // Reset member form
  if (id === 'member-modal') {
    document.getElementById('member-modal-title').textContent = 'メンバー追加';
    document.getElementById('member-edit-id').value = '';
    ['m-name','m-dept','m-email'].forEach(f => document.getElementById(f).value = '');
    document.getElementById('m-grade').value = 'B1';
  }
  if (id === 'event-modal') {
    document.getElementById('event-modal-title').textContent = 'イベント追加';
    document.getElementById('event-edit-id').value = '';
    ['e-title','e-date','e-time','e-endtime','e-location','e-desc'].forEach(f => document.getElementById(f).value = '');
    document.getElementById('e-type').value = 'practice';
  }
  if (id === 'transaction-modal') {
    document.getElementById('transaction-modal-title').textContent = '収支追加';
    document.getElementById('t-edit-id').value = '';
    ['t-date','t-amount','t-desc','t-person','t-note'].forEach(f => document.getElementById(f).value = '');
    document.getElementById('t-type').value = 'income';
    document.getElementById('t-category').value = '部費';
  }
  if (id === 'doc-modal') {
    document.getElementById('doc-modal-title').textContent = '文書作成';
    document.getElementById('doc-edit-id').value = '';
    document.getElementById('doc-title').value = '';
    document.getElementById('doc-content').value = '';
    document.getElementById('doc-type').value = '議事録';
    document.getElementById('doc-event').value = '';
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
  // Set today's date as default
  const today = new Date().toISOString().slice(0, 10);
  document.getElementById('e-date').value = today;
  document.getElementById('t-date').value = today;

  updateDashboard();
  renderMembers();
  renderCalendar();
  renderTransactions();
  renderDocs();
});
