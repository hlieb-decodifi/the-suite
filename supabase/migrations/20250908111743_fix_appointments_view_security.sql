-- Fix appointments_with_status view security setting
-- Change from security_invoker = true to security_invoker = on
-- This follows Supabase's recommendation for better security clarity

drop view if exists appointments_with_status;

create or replace view appointments_with_status 
with (security_invoker = on) as
select 
  a.id,
  a.booking_id,
  a.start_time,
  a.end_time,
  a.status,
  a.created_at,
  a.updated_at,
  get_appointment_computed_status(a.start_time, a.end_time, a.status) as computed_status
from appointments a;

-- Grant permissions to use the view
grant select on appointments_with_status to authenticated;
