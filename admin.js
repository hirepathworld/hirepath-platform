import { createClient } from 'https://cdn.jsdelivr.net/npm/@supabase/supabase-js@2/+esm';
const SUPABASE_URL = 'https://xlzqqhhwthglsxwuzxog.supabase.co';
const SUPABASE_PUBLISHABLE_KEY = 'sb_publishable_nV--4uQRFgSozM18c1VvfA_kpsR4DZh';
const ADMIN_EMAIL = 'hirepathofficial@gmail.com';
const supabase = createClient(SUPABASE_URL, SUPABASE_PUBLISHABLE_KEY);
const statuses = ['New', 'Contacted', 'Qualified', 'Interview', 'Placed', 'Rejected'];
let leads = [];
const $ = (id) => document.getElementById(id);

function escapeHtml(value) {
  return String(value ?? '').replace(/[&<>"']/g, (char) => ({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[char]));
}
function updateStats() {
  $('totalCount').textContent = leads.length;
  $('newCount').textContent = leads.filter(x => x.status === 'New').length;
  $('contactedCount').textContent = leads.filter(x => x.status === 'Contacted').length;
  $('placedCount').textContent = leads.filter(x => x.status === 'Placed').length;
}
function renderLeads() {
  const query = $('searchInput').value.trim().toLowerCase();
  const filter = $('statusFilter').value;
  const shown = leads.filter(lead => {
    const matchesQuery = [lead.full_name, lead.email, lead.phone].some(v => String(v ?? '').toLowerCase().includes(query));
    return matchesQuery && (!filter || lead.status === filter);
  });
  $('leadsBody').innerHTML = shown.map(lead => `<tr>
    <td>${escapeHtml(lead.full_name)}</td><td>${escapeHtml(lead.email)}</td><td>${escapeHtml(lead.phone)}</td>
    <td>${escapeHtml(lead.service)}</td><td>${escapeHtml(lead.lead_source)}</td>
    <td>${lead.created_at ? new Date(lead.created_at).toLocaleString() : '—'}</td>
    <td><select class="status-select" data-id="${Number(lead.id)}" aria-label="Change status for ${escapeHtml(lead.full_name)}">${statuses.map(s => `<option ${lead.status === s ? 'selected' : ''}>${s}</option>`).join('')}</select></td>
  </tr>`).join('');
  $('empty').hidden = shown.length !== 0;
}
async function requireAdmin() {
  const { data: { session }, error } = await supabase.auth.getSession();
  if (error || !session || session.user.email?.toLowerCase() !== ADMIN_EMAIL) {
    await supabase.auth.signOut();
    location.replace('/admin-login.html');
    return false;
  }
  $('adminEmail').textContent = session.user.email;
  return true;
}
async function loadLeads() {
  $('notice').textContent = 'Loading enquiries...';
  const { data, error } = await supabase.from('crm_leads').select('id,full_name,email,phone,service,lead_source,status,created_at').order('created_at', { ascending: false });
  if (error) {
    console.error(error);
    $('notice').textContent = `Could not load enquiries: ${error.message}. Check the admin RLS SQL setup.`;
    leads = []; updateStats(); renderLeads(); return;
  }
  leads = data ?? [];
  $('notice').textContent = `${leads.length} enquiry record(s) loaded.`;
  updateStats(); renderLeads();
}
$('logoutButton').addEventListener('click', async () => { await supabase.auth.signOut(); location.replace('/admin-login.html'); });
$('refreshButton').addEventListener('click', loadLeads);
$('searchInput').addEventListener('input', renderLeads);
$('statusFilter').addEventListener('change', renderLeads);
$('leadsBody').addEventListener('change', async (event) => {
  const select = event.target.closest('select[data-id]');
  if (!select) return;
  const id = Number(select.dataset.id); const status = select.value;
  select.disabled = true; $('notice').textContent = 'Updating status...';
  const { error } = await supabase.from('crm_leads').update({ status }).eq('id', id);
  if (error) {
    console.error(error); $('notice').textContent = `Status update failed: ${error.message}`; await loadLeads(); return;
  }
  const lead = leads.find(item => Number(item.id) === id); if (lead) lead.status = status;
  $('notice').textContent = 'Lead status updated.'; updateStats(); renderLeads();
});
if (await requireAdmin()) await loadLeads();
