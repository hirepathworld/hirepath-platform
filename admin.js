import { createClient } from 'https://cdn.jsdelivr.net/npm/@supabase/supabase-js@2/+esm';
const SUPABASE_URL = 'https://xlzqqhhwthglsxwuzxog.supabase.co';
const SUPABASE_PUBLISHABLE_KEY = 'sb_publishable_nV--4uQRFgSozM18c1VvfA_kpsR4DZh';
const ADMIN_EMAIL = 'hirepathofficial@gmail.com';
const supabase = createClient(SUPABASE_URL, SUPABASE_PUBLISHABLE_KEY);
const statuses = ['New', 'Contacted', 'Qualified', 'Interview', 'Placed', 'Rejected'];
let leads = [];
const $ = (id) => document.getElementById(id);
function escapeHtml(value) { return String(value ?? '').replace(/[&<>"']/g, (c) => ({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c])); }
function toLocalDateTime(value) { if (!value) return ''; const d = new Date(value); return new Date(d.getTime() - d.getTimezoneOffset() * 60000).toISOString().slice(0, 16); }
function updateStats() {
  $('totalCount').textContent = leads.length;
  $('newCount').textContent = leads.filter(x => x.status === 'New').length;
  $('contactedCount').textContent = leads.filter(x => x.status === 'Contacted').length;
  $('placedCount').textContent = leads.filter(x => x.status === 'Placed').length;
}
function renderLeads() {
  const query = $('searchInput').value.trim().toLowerCase(); const filter = $('statusFilter').value;
  const shown = leads.filter(l => [l.full_name,l.email,l.phone].some(v => String(v ?? '').toLowerCase().includes(query)) && (!filter || l.status === filter));
  $('leadsBody').innerHTML = shown.map(l => `<tr>
    <td>${escapeHtml(l.full_name)}</td><td>${escapeHtml(l.email)}</td><td>${escapeHtml(l.phone)}</td><td>${escapeHtml(l.service)}</td><td>${escapeHtml(l.lead_source)}</td><td>${l.created_at ? new Date(l.created_at).toLocaleString() : '—'}</td>
    <td><select class="status-select" data-id="${Number(l.id)}" data-field="status">${statuses.map(s => `<option ${l.status === s ? 'selected' : ''}>${s}</option>`).join('')}</select></td>
    <td><input class="cell-input followup-input" type="datetime-local" data-id="${Number(l.id)}" data-field="next_follow_up" value="${escapeHtml(toLocalDateTime(l.next_follow_up))}" aria-label="Follow-up date"></td>
    <td><input class="cell-input assigned-input" type="text" data-id="${Number(l.id)}" data-field="assigned_to" value="${escapeHtml(l.assigned_to)}" placeholder="Employee name" aria-label="Assigned employee"></td>
    <td><textarea class="cell-input notes-input" data-id="${Number(l.id)}" data-field="notes" placeholder="Add notes..." aria-label="Lead notes">${escapeHtml(l.notes)}</textarea></td>
  </tr>`).join('');
  $('empty').hidden = shown.length !== 0;
}
async function requireAdmin() {
  const { data: { session }, error } = await supabase.auth.getSession();
  if (error || !session || session.user.email?.toLowerCase() !== ADMIN_EMAIL) { await supabase.auth.signOut(); location.replace('/admin-login.html'); return false; }
  $('adminEmail').textContent = session.user.email; return true;
}
async function loadLeads() {
  $('notice').textContent = 'Loading enquiries...';
  const { data, error } = await supabase.from('crm_leads').select('id,full_name,email,phone,service,lead_source,status,created_at,next_follow_up,assigned_to,notes').order('created_at', { ascending: false });
  if (error) { console.error(error); $('notice').textContent = `Could not load enquiries: ${error.message}. Check admin RLS policies.`; leads = []; updateStats(); renderLeads(); return; }
  leads = data ?? []; $('notice').textContent = `${leads.length} enquiry record(s) loaded.`; updateStats(); renderLeads();
}
async function saveField(input) {
  const id = Number(input.dataset.id); const field = input.dataset.field;
  let value = input.value;
  if (field === 'next_follow_up') value = value ? new Date(value).toISOString() : null;
  if (field === 'assigned_to' || field === 'notes') value = value.trim() || null;
  if (!['status','next_follow_up','assigned_to','notes'].includes(field)) return;
  input.disabled = true; $('notice').textContent = 'Saving lead details...';
  const { error } = await supabase.from('crm_leads').update({ [field]: value }).eq('id', id);
  input.disabled = false;
  if (error) { console.error(error); $('notice').textContent = `Save failed: ${error.message}`; await loadLeads(); return; }
  const lead = leads.find(x => Number(x.id) === id); if (lead) lead[field] = value;
  $('notice').textContent = `${field === 'next_follow_up' ? 'Follow-up date' : field === 'assigned_to' ? 'Employee assignment' : field === 'notes' ? 'Notes' : 'Lead status'} saved.`;
  updateStats(); if (field === 'status') renderLeads();
}
$('logoutButton').addEventListener('click', async () => { await supabase.auth.signOut(); location.replace('/admin-login.html'); });
$('refreshButton').addEventListener('click', loadLeads);
$('searchInput').addEventListener('input', renderLeads); $('statusFilter').addEventListener('change', renderLeads);
$('leadsBody').addEventListener('change', e => { const input = e.target.closest('[data-id][data-field]'); if (input) saveField(input); });
if (await requireAdmin()) await loadLeads();
