create index if not exists admin_attributes_created_by_idx
  on public.admin_attributes (created_by);

create index if not exists admin_attribute_options_created_by_idx
  on public.admin_attribute_options (created_by);
