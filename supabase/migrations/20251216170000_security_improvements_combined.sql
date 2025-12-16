-- Combined Security Improvements Migration
-- This migration combines 4 separate security-focused migrations:
-- 1. Restrict service delete policy (prevent hard deletes)
-- 2. Restrict address insert policy (prevent direct creation)
-- 3. Restrict support request update policy (prevent direct updates)
-- 4. Secure contact inquiries (prevent spam, add validation)

-- =============================================================================
-- 1. SERVICES TABLE SECURITY IMPROVEMENTS
-- =============================================================================

-- Drop the old broad policy
drop policy "Professionals can manage their own services" on "public"."services";

-- Prevent hard delete of services via RLS
create policy "Prevent hard delete of services via RLS"
  on "public"."services"
  as permissive
  for delete
  to public
using (false);

-- Allow professionals to insert their own services
create policy "Professionals can insert their own services"
  on "public"."services"
  as permissive
  for insert
  to public
with check ((EXISTS ( SELECT 1
   FROM public.professional_profiles
  WHERE ((professional_profiles.id = services.professional_profile_id) AND (professional_profiles.user_id = auth.uid())))));

-- Allow professionals to update their own services
create policy "Professionals can update their own services"
  on "public"."services"
  as permissive
  for update
  to public
using ((EXISTS ( SELECT 1
   FROM public.professional_profiles
  WHERE ((professional_profiles.id = services.professional_profile_id) AND (professional_profiles.user_id = auth.uid())))))
with check ((EXISTS ( SELECT 1
   FROM public.professional_profiles
  WHERE ((professional_profiles.id = services.professional_profile_id) AND (professional_profiles.user_id = auth.uid())))));

-- Allow professionals to view their own services
create policy "Professionals can view their own services"
  on "public"."services"
  as permissive
  for select
  to public
using ((EXISTS ( SELECT 1
   FROM public.professional_profiles
  WHERE ((professional_profiles.id = services.professional_profile_id) AND (professional_profiles.user_id = auth.uid())))));

-- =============================================================================
-- 2. ADDRESSES TABLE SECURITY IMPROVEMENTS
-- =============================================================================

-- Drop the old permissive policy
drop policy "Users can create addresses" on "public"."addresses";

-- Prevent direct address creation via RLS
create policy "Prevent direct address creation via RLS"
  on "public"."addresses"
  as permissive
  for insert
  to authenticated
with check (false);

-- =============================================================================
-- 3. SUPPORT REQUESTS TABLE SECURITY IMPROVEMENTS
-- =============================================================================

-- Drop the old policy that allowed professionals to update support requests
drop policy "Professionals can update support request status and resolution" on "public"."support_requests";

-- Prevent direct support request updates via RLS
create policy "Prevent direct support request updates via RLS"
  on "public"."support_requests"
  as permissive
  for update
  to public
using (false);

-- =============================================================================
-- 4. CONTACT INQUIRIES TABLE SECURITY IMPROVEMENTS
-- =============================================================================

-- Drop the existing overly permissive policy
drop policy if exists "Anyone can create inquiries" on contact_inquiries;

-- Create a new policy with proper validation constraints
create policy "Anyone can create valid inquiries" on contact_inquiries
  for insert with check (
    -- Basic field validation
    length(name) > 0 and length(name) <= 200 and
    length(email) > 0 and length(email) <= 255 and
    length(subject) > 0 and length(subject) <= 500 and
    length(message) > 10 and length(message) <= 10000 and
    
    -- Email format validation (basic)
    email ~ '^[A-Za-z0-9._%+-]+@[A-Za-z0-9.-]+\.[A-Za-z]{2,}$' and
    
    -- Urgency validation (ensure it's one of the allowed values)
    urgency in ('low', 'medium', 'high') and
    
    -- Status validation (ensure it's one of the allowed values)
    status in ('new', 'in_progress', 'resolved', 'closed') and
    
    -- Phone validation (if provided, should not be empty)
    (phone is null or (phone is not null and length(phone) > 0 and length(phone) <= 50))
  );

-- Add comment explaining the security measures
comment on policy "Anyone can create valid inquiries" on contact_inquiries is 
'Allows unauthenticated users to create contact inquiries with strict validation. Rate limiting is enforced at the application level.';

-- Add additional constraints at the table level for extra security
alter table contact_inquiries 
  add constraint check_name_length check (length(name) > 0 and length(name) <= 200),
  add constraint check_email_length check (length(email) > 0 and length(email) <= 255),
  add constraint check_subject_length check (length(subject) > 0 and length(subject) <= 500),
  add constraint check_message_length check (length(message) > 10 and length(message) <= 10000),
  add constraint check_phone_length check (phone is null or length(phone) <= 50);

-- Create an index on created_at for monitoring and cleanup
create index if not exists idx_contact_inquiries_created_at_desc on contact_inquiries(created_at desc);

-- Create a function to help with monitoring suspicious activity
create or replace function get_contact_inquiry_stats(
  time_window_hours integer default 24
)
returns table(
  total_inquiries bigint,
  unique_emails bigint,
  avg_message_length numeric,
  suspicious_patterns text[]
) as $$
declare
  cutoff_time timestamp with time zone;
  patterns text[] := '{}';
begin
  cutoff_time := now() - (time_window_hours || ' hours')::interval;
  
  -- Get basic stats
  select 
    count(*),
    count(distinct email),
    avg(length(message))
  into total_inquiries, unique_emails, avg_message_length
  from contact_inquiries
  where created_at >= cutoff_time;
  
  -- Check for suspicious patterns
  -- Pattern 1: Same email with many submissions
  if exists (
    select 1 from contact_inquiries 
    where created_at >= cutoff_time 
    group by email 
    having count(*) > 3
  ) then
    patterns := array_append(patterns, 'Multiple submissions from same email');
  end if;
  
  -- Pattern 2: Very short messages (potential spam)
  if exists (
    select 1 from contact_inquiries 
    where created_at >= cutoff_time 
    and length(message) < 20
  ) then
    patterns := array_append(patterns, 'Very short messages detected');
  end if;
  
  -- Pattern 3: Identical messages
  if exists (
    select message from contact_inquiries 
    where created_at >= cutoff_time 
    group by message 
    having count(*) > 2
  ) then
    patterns := array_append(patterns, 'Duplicate messages detected');
  end if;
  
  suspicious_patterns := patterns;
  return next;
end;
$$ language plpgsql security definer;

-- Grant execute permission to authenticated users (for admin monitoring)
grant execute on function get_contact_inquiry_stats(integer) to authenticated;

-- Add a comment explaining the monitoring function
comment on function get_contact_inquiry_stats(integer) is 
'Returns statistics about contact inquiries to help identify potential spam or abuse patterns. Intended for admin monitoring.';
