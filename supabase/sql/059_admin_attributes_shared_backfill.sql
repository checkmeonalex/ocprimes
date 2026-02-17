-- Convert existing admin-owned attributes/options to shared records (created_by = null)
-- so vendors can reliably see shared attributes without role lookup dependency.

update public.admin_attributes as a
set created_by = null
from public.user_roles as ur
where a.created_by = ur.user_id
  and ur.role = 'admin';

update public.admin_attribute_options as o
set created_by = null
from public.user_roles as ur
where o.created_by = ur.user_id
  and ur.role = 'admin';
