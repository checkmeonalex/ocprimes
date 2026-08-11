create table if not exists public.user_body_profiles (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null unique references auth.users(id) on delete cascade,
  gender text not null,
  height_cm numeric(5, 1) not null,
  weight_kg numeric(5, 1) not null,
  estimated_bust_cm numeric(5, 1),
  estimated_waist_cm numeric(5, 1),
  estimated_hip_cm numeric(5, 1),
  -- Optional "Detailed Fit" refinements — override the height/weight
  -- estimate above when present. All nullable: a Quick Fit profile has
  -- none of these set.
  age_range text,
  body_shape text,
  bust_cm numeric(5, 1),
  waist_cm numeric(5, 1),
  hip_cm numeric(5, 1),
  usual_size text,
  fit_preference text,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  constraint user_body_profiles_gender_check check (gender in ('male', 'female')),
  constraint user_body_profiles_height_check check (height_cm > 0 and height_cm < 260),
  constraint user_body_profiles_weight_check check (weight_kg > 0 and weight_kg < 400),
  constraint user_body_profiles_body_shape_check
    check (body_shape is null or body_shape in ('hourglass', 'pear', 'apple', 'rectangle', 'inverted_triangle')),
  constraint user_body_profiles_fit_preference_check
    check (fit_preference is null or fit_preference in ('fitted', 'regular', 'relaxed'))
);

create index if not exists user_body_profiles_user_idx on public.user_body_profiles(user_id);

alter table public.user_body_profiles enable row level security;

drop policy if exists "body profiles owner select" on public.user_body_profiles;
create policy "body profiles owner select"
  on public.user_body_profiles
  for select
  using (auth.uid() = user_id);

drop policy if exists "body profiles owner insert" on public.user_body_profiles;
create policy "body profiles owner insert"
  on public.user_body_profiles
  for insert
  with check (auth.uid() = user_id);

drop policy if exists "body profiles owner update" on public.user_body_profiles;
create policy "body profiles owner update"
  on public.user_body_profiles
  for update
  using (auth.uid() = user_id)
  with check (auth.uid() = user_id);

drop policy if exists "body profiles owner delete" on public.user_body_profiles;
create policy "body profiles owner delete"
  on public.user_body_profiles
  for delete
  using (auth.uid() = user_id);
