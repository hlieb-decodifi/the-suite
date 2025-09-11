drop trigger if exists "after_professional_subscription_delete" on "public"."professional_subscriptions";

drop trigger if exists "after_professional_subscription_insert" on "public"."professional_subscriptions";

drop trigger if exists "after_professional_subscription_update" on "public"."professional_subscriptions";

drop policy "Admins can manage user roles" on "public"."user_roles";

drop function if exists "public"."update_professional_subscription_status"();

alter table "public"."professional_profiles" drop column "is_subscribed";

set check_function_bodies = off;

CREATE OR REPLACE FUNCTION public.is_professional_subscribed(prof_profile_id uuid)
 RETURNS boolean
 LANGUAGE plpgsql
 SECURITY DEFINER
AS $function$
declare
  has_active_subscription boolean;
begin
  select exists(
    select 1 from professional_subscriptions
    where professional_profile_id = prof_profile_id
    and status = 'active'
    and (end_date is null or end_date > now())
  ) into has_active_subscription;
  
  return has_active_subscription;
end;
$function$
;

CREATE OR REPLACE FUNCTION public.is_professional_user_subscribed(prof_user_id uuid)
 RETURNS boolean
 LANGUAGE plpgsql
 SECURITY DEFINER
AS $function$
declare
  has_active_subscription boolean;
  prof_profile_id uuid;
begin
  -- Get the professional profile ID for this user
  select pp.id into prof_profile_id
  from professional_profiles pp
  where pp.user_id = prof_user_id;
  
  if prof_profile_id is null then
    return false;
  end if;
  
  -- Check for active subscription
  select exists(
    select 1 from professional_subscriptions
    where professional_profile_id = prof_profile_id
    and status = 'active'
    and (end_date is null or end_date > now())
  ) into has_active_subscription;
  
  return has_active_subscription;
end;
$function$
;

CREATE OR REPLACE FUNCTION public.handle_professional_profile_stripe_changes()
 RETURNS trigger
 LANGUAGE plpgsql
AS $function$
begin
  -- Mark all services for re-sync when key fields change that affect Stripe status
  if (old.is_published is distinct from new.is_published or 
      old.stripe_connect_status is distinct from new.stripe_connect_status) then
    
    update services 
    set stripe_sync_status = 'pending', 
        updated_at = timezone('utc'::text, now())
    where professional_profile_id = new.id;
  end if;
  
  return new;
end;
$function$
;

create policy "Admins can manage user roles"
on "public"."user_roles"
as permissive
for all
to public
using (is_admin(auth.uid()));



