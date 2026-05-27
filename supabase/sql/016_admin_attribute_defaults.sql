alter table public.admin_attributes
  add column if not exists type_id uuid references public.admin_attribute_types(id) on delete set null;

insert into public.admin_attributes (name, slug, description, type_id)
values
  (
    'Color',
    'color',
    'Choose available product colors.',
    (select id from public.admin_attribute_types where slug = 'color')
  ),
  (
    'Text',
    'text',
    'Free text attributes like Custom Engraving.',
    (select id from public.admin_attribute_types where slug = 'text')
  )
on conflict (slug) do nothing;

with color_attribute as (
  select id from public.admin_attributes where slug = 'color'
)
insert into public.admin_attribute_options (attribute_id, name, slug, color_hex, sort_order)
select id, 'Black', 'black', '#111827', 1 from color_attribute
union all
select id, 'White', 'white', '#f9fafb', 2 from color_attribute
union all
select id, 'Red', 'red', '#ef4444', 3 from color_attribute
union all
select id, 'Blue', 'blue', '#3b82f6', 4 from color_attribute
union all
select id, 'Green', 'green', '#22c55e', 5 from color_attribute
union all
select id, 'Multicolor', 'multicolor', 'multicolor', 6 from color_attribute
on conflict (attribute_id, slug) do nothing;
