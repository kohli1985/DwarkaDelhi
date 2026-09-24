-- DelhiDwarka: contact form submissions.
--
-- Backs the public contact form (src/components/ContactForm.tsx). Anyone —
-- including anonymous visitors — can submit one; only the signed-in admin
-- can read or delete them (viewed at /admin/contacts).

create table if not exists contact_submissions (
  id uuid primary key default gen_random_uuid(),
  name text not null,
  email text not null,
  phone text,
  message text not null,
  created_at timestamptz not null default now()
);

create index if not exists contact_submissions_created_at_idx
  on contact_submissions(created_at desc);

alter table contact_submissions enable row level security;

-- anyone, including anonymous visitors, can submit the contact form
create policy "anyone can submit a contact message"
  on contact_submissions for insert
  with check (true);

-- only the signed-in admin can read or delete submissions — no public
-- select policy at all, so submitters can't read each other's messages
create policy "authenticated users read contact submissions"
  on contact_submissions for select
  using (auth.role() = 'authenticated');

create policy "authenticated users delete contact submissions"
  on contact_submissions for delete
  using (auth.role() = 'authenticated');
