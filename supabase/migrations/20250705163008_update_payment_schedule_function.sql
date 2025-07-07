drop function if exists "public"."calculate_payment_schedule"(appointment_date date, appointment_time time without time zone, duration_minutes integer);

set check_function_bodies = off;

CREATE OR REPLACE FUNCTION public.calculate_payment_schedule(appointment_start_time timestamp with time zone, appointment_end_time timestamp with time zone)
 RETURNS TABLE(pre_auth_date timestamp with time zone, capture_date timestamp with time zone, should_pre_auth_now boolean)
 LANGUAGE plpgsql
AS $function$
declare
  six_days_before timestamp with time zone;
  twelve_hours_after_end timestamp with time zone;
begin
  -- Calculate 6 days before appointment start (for pre-auth)
  six_days_before := appointment_start_time - interval '6 days';
  
  -- Calculate 12 hours after appointment END (for capture)
  twelve_hours_after_end := appointment_end_time + interval '12 hours';
  
  -- Determine if we should place pre-auth now (if appointment is within 6 days)
  return query select 
    six_days_before as pre_auth_date,
    twelve_hours_after_end as capture_date,
    (now() >= six_days_before) as should_pre_auth_now;
end;
$function$
;


