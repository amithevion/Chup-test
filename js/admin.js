import { supabase, isConfigured } from './db.js';

const $ = (id) => document.getElementById(id);
const loginCard = $('login-card');
const dashboard = $('dashboard');
const rowsEl = $('rows');
const searchInput = $('search');

let rsvps = [];
let channel = null;

const timeFmt = new Intl.DateTimeFormat('he-IL', {
  day: '2-digit', month: '2-digit', hour: '2-digit', minute: '2-digit',
});

function fatal(msg) {
  $('fatal').textContent = msg;
  $('fatal').hidden = false;
}

function render() {
  const total = rsvps.reduce((sum, r) => sum + r.guest_count, 0);
  $('total-guests').textContent = total;
  $('total-rsvps').textContent = rsvps.length;

  const q = searchInput.value.trim();
  const visible = q ? rsvps.filter((r) => r.full_name.includes(q)) : rsvps;

  rowsEl.replaceChildren(...visible.map((r) => {
    const tr = document.createElement('tr');
    const name = document.createElement('td');
    name.textContent = r.full_name;
    const count = document.createElement('td');
    count.className = 'num';
    count.textContent = r.guest_count;
    const when = document.createElement('td');
    when.className = 'muted';
    when.textContent = timeFmt.format(new Date(r.created_at));
    const actions = document.createElement('td');
    const del = document.createElement('button');
    del.className = 'btn-icon';
    del.title = 'מחיקה';
    del.setAttribute('aria-label', `מחיקת ${r.full_name}`);
    del.textContent = '✕';
    del.onclick = () => removeRsvp(r);
    actions.append(del);
    tr.append(name, count, when, actions);
    return tr;
  }));

  $('empty').hidden = rsvps.length > 0;
}

async function load() {
  const { data, error } = await supabase
    .from('rsvps')
    .select('*')
    .order('created_at', { ascending: false });
  if (error) {
    fatal('שגיאה בטעינת הנתונים: ' + error.message);
    return;
  }
  rsvps = data;
  render();
}

function subscribe() {
  channel = supabase
    .channel('rsvps-live')
    .on('postgres_changes', { event: '*', schema: 'public', table: 'rsvps' }, (payload) => {
      if (payload.eventType === 'INSERT') {
        if (!rsvps.some((r) => r.id === payload.new.id)) rsvps.unshift(payload.new);
      } else if (payload.eventType === 'DELETE') {
        rsvps = rsvps.filter((r) => r.id !== payload.old.id);
      } else if (payload.eventType === 'UPDATE') {
        rsvps = rsvps.map((r) => (r.id === payload.new.id ? payload.new : r));
      }
      render();
    })
    .subscribe((status) => {
      // Resync after a reconnect so nothing missed while offline is lost.
      if (status === 'SUBSCRIBED') load();
    });
}

async function removeRsvp(r) {
  if (!confirm(`למחוק את "${r.full_name}" (${r.guest_count})?`)) return;
  const { error } = await supabase.from('rsvps').delete().eq('id', r.id);
  if (error) {
    alert('המחיקה נכשלה: ' + error.message);
    return;
  }
  rsvps = rsvps.filter((x) => x.id !== r.id);
  render();
}

function exportCsv() {
  const esc = (v) => `"${String(v).replace(/"/g, '""')}"`;
  const lines = [['שם', 'מגיעים', 'נרשם'], ...rsvps.map((r) => [
    r.full_name, r.guest_count, new Date(r.created_at).toLocaleString('he-IL'),
  ])].map((row) => row.map(esc).join(','));
  // BOM so Excel opens Hebrew correctly.
  const blob = new Blob(['﻿' + lines.join('\n')], { type: 'text/csv;charset=utf-8' });
  const a = document.createElement('a');
  a.href = URL.createObjectURL(blob);
  a.download = 'rsvps-peleg.csv';
  a.click();
  URL.revokeObjectURL(a.href);
}

function showDashboard() {
  loginCard.hidden = true;
  dashboard.hidden = false;
  if (!channel) subscribe();
}

function showLogin() {
  dashboard.hidden = true;
  loginCard.hidden = false;
  if (channel) {
    supabase.removeChannel(channel);
    channel = null;
  }
  rsvps = [];
}

async function init() {
  if (!isConfigured) {
    fatal('חסרים פרטי Supabase בקובץ js/config.js');
    return;
  }

  $('login-form').addEventListener('submit', async (e) => {
    e.preventDefault();
    const err = $('login-error');
    err.hidden = true;
    const { error } = await supabase.auth.signInWithPassword({
      email: $('email').value.trim(),
      password: $('password').value,
    });
    if (error) {
      err.textContent = 'אימייל או סיסמה שגויים';
      err.hidden = false;
    }
  });

  $('logout').onclick = () => supabase.auth.signOut();
  $('export').onclick = exportCsv;
  searchInput.addEventListener('input', render);

  supabase.auth.onAuthStateChange((_event, session) => {
    if (session) showDashboard();
    else showLogin();
  });
}

init();
