-- Harden anonymous feedback inserts.
-- Replaces permissive WITH CHECK (true) policy with constrained checks.

alter table if exists public.feedback enable row level security;

drop policy if exists "Enable insert for anonymous users" on public.feedback;
drop policy if exists "allow_insert_anon_feedback" on public.feedback;

create policy "allow_insert_anon_feedback"
on public.feedback
for insert
to anon
with check (
  feedback_type = any (array['Issue', 'Feature', 'Suggestion', 'Recipe'])
  and char_length(btrim(coalesce(description, ''))) between 3 and 2000
);

-- Limit anon writes to feedback input columns only.
do $$
begin
  revoke insert on table public.feedback from anon;

  if exists (
    select 1
    from information_schema.columns
    where table_schema = 'public'
      and table_name = 'feedback'
      and column_name = 'app_version'
  ) then
    execute 'grant insert (feedback_type, description, app_version) on table public.feedback to anon';
  else
    execute 'grant insert (feedback_type, description) on table public.feedback to anon';
  end if;
end
$$;
