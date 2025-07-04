alter table "public"."appointments" drop constraint "appointments_booking_id_key";

alter table "public"."appointments" drop constraint "appointments_status_check";

drop view if exists "public"."appointments_with_status";

drop index if exists "public"."appointments_booking_id_key";

alter table "public"."appointments" drop column "timezone";

alter table "public"."appointments" alter column "status" drop default;

alter table "public"."appointments" add constraint "appointments_status_check" CHECK ((status = ANY (ARRAY['active'::text, 'completed'::text, 'cancelled'::text, 'ongoing'::text]))) not valid;

alter table "public"."appointments" validate constraint "appointments_status_check";

set check_function_bodies = off;

CREATE OR REPLACE FUNCTION public.get_appointment_computed_status(p_start_time timestamp with time zone, p_end_time timestamp with time zone, p_status text)
 RETURNS text
 LANGUAGE plpgsql
AS $function$
declare
  current_datetime timestamptz;
begin
  -- If appointment is cancelled, return cancelled
  if p_status = 'cancelled' then
    return 'cancelled';
  end if;

  current_datetime := now();

  -- If appointment hasn't started yet, it's upcoming
  if current_datetime < p_start_time then
    return 'upcoming';
  end if;

  -- If appointment has ended, it's completed
  if current_datetime > p_end_time then
    return 'completed';
  end if;

  -- If we're between start and end time, it's ongoing
  return 'ongoing';
end;
$function$
;

create or replace view "public"."appointments_with_status" as  SELECT a.id,
    a.booking_id,
    a.start_time,
    a.end_time,
    a.status,
    a.created_at,
    a.updated_at,
    get_appointment_computed_status(a.start_time, a.end_time, a.status) AS computed_status
   FROM appointments a;



