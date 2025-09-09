-- Remove redundant RLS policies for appointment updates
drop policy if exists "Professionals can update appointments for their profile" on appointments;
drop policy if exists "Clients can update their appointments" on appointments;
