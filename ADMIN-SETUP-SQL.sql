-- HIREPATH admin-only access to CRM leads.
-- Run this in Supabase Dashboard > SQL Editor > New query.
-- This permits only the signed-in admin email to read and update CRM leads.

create policy "HIREPATH admin can view CRM leads"
on public.crm_leads
for select
to authenticated
using ((auth.jwt() ->> 'email') = 'hirepathofficial@gmail.com');

create policy "HIREPATH admin can update CRM lead status"
on public.crm_leads
for update
to authenticated
using ((auth.jwt() ->> 'email') = 'hirepathofficial@gmail.com')
with check ((auth.jwt() ->> 'email') = 'hirepathofficial@gmail.com');
