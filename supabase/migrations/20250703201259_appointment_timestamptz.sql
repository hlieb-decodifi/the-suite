drop policy "Professionals can update payment amounts for ongoing appointmen" on "public"."booking_payments";

drop view if exists "public"."appointments_with_status";

drop function if exists "public"."get_appointment_computed_status"(p_date date, p_start_time time without time zone, p_end_time time without time zone, p_status text);

-- MODIFIED: Add timezone column first
alter table "public"."appointments" add column "timezone" text not null default 'UTC'::text;

-- MODIFIED: Add temporary timestamptz columns
alter table "public"."appointments" add column "start_time_new" timestamptz;
alter table "public"."appointments" add column "end_time_new" timestamptz;

-- MODIFIED: Convert existing data (combining date + time)
UPDATE appointments 
SET 
  start_time_new = (date + start_time) AT TIME ZONE timezone AT TIME ZONE 'UTC',
  end_time_new = (date + end_time) AT TIME ZONE timezone AT TIME ZONE 'UTC';

-- MODIFIED: Now drop the old columns
alter table "public"."appointments" drop column "date";
alter table "public"."appointments" drop column "start_time";
alter table "public"."appointments" drop column "end_time";

-- MODIFIED: Rename new columns to original names
alter table "public"."appointments" rename column "start_time_new" to "start_time";
alter table "public"."appointments" rename column "end_time_new" to "end_time";

-- MODIFIED: Add NOT NULL constraints
alter table "public"."appointments" alter column "start_time" set not null;
alter table "public"."appointments" alter column "end_time" set not null;

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

  -- If we get here, the appointment is ongoing
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

create policy "Professionals can update payment amounts for ongoing appointmen"
on "public"."booking_payments"
as permissive
for update
to public
using ((EXISTS ( SELECT 1
   FROM ((bookings b
     JOIN appointments a ON ((a.booking_id = b.id)))
     JOIN professional_profiles pp ON ((b.professional_profile_id = pp.id)))
  WHERE ((b.id = booking_payments.booking_id) AND (pp.user_id = auth.uid()) AND (get_appointment_computed_status(a.start_time, a.end_time, a.status) = 'ongoing'::text)))))
with check ((EXISTS ( SELECT 1
   FROM ((bookings b
     JOIN appointments a ON ((a.booking_id = b.id)))
     JOIN professional_profiles pp ON ((b.professional_profile_id = pp.id)))
  WHERE ((b.id = booking_payments.booking_id) AND (pp.user_id = auth.uid()) AND (get_appointment_computed_status(a.start_time, a.end_time, a.status) = 'ongoing'::text)))));

CREATE OR REPLACE FUNCTION public.check_professional_availability()
 RETURNS trigger
 LANGUAGE plpgsql
AS $function$
begin
  if exists (
    select 1 from appointments a
    join bookings b on a.booking_id = b.id
    where b.professional_profile_id = (
      select professional_profile_id from bookings where id = new.booking_id
    )
    and a.status != 'cancelled'
    and b.status not in ('pending_payment', 'cancelled')
    and a.booking_id != new.booking_id
    and (
      (new.start_time < a.end_time and new.end_time > a.start_time) -- time slots overlap
    )
  ) then
    raise exception 'Professional is already booked for this time slot';
  end if;
  return new;
end;
$function$
;