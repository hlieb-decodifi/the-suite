set check_function_bodies = off;

CREATE OR REPLACE FUNCTION public.get_appointment_computed_status(p_date date, p_start_time time without time zone, p_end_time time without time zone, p_status text)
 RETURNS text
 LANGUAGE plpgsql
AS $function$
declare
  appointment_start_datetime timestamp with time zone;
  appointment_end_datetime timestamp with time zone;
  current_datetime timestamp with time zone;
begin
  -- If appointment is cancelled, return cancelled
  if p_status = 'cancelled' then
    return 'cancelled';
  end if;

  -- Convert appointment date and times to timestamps in UTC
  appointment_start_datetime := (p_date || ' ' || p_start_time)::timestamp at time zone 'UTC';
  appointment_end_datetime := (p_date || ' ' || p_end_time)::timestamp at time zone 'UTC';
  current_datetime := now() at time zone 'UTC';

  -- If appointment hasn't started yet, it's upcoming
  if current_datetime < appointment_start_datetime then
    return 'upcoming';
  end if;

  -- If appointment has ended, it's completed
  if current_datetime > appointment_end_datetime then
    return 'completed';
  end if;

  -- If we're between start and end time, it's in progress (treat as upcoming)
  return 'upcoming';
end;
$function$
;

CREATE OR REPLACE FUNCTION public.get_appointment_status(p_date date, p_start_time time without time zone, p_end_time time without time zone, p_status text)
 RETURNS text
 LANGUAGE plpgsql
AS $function$
declare
  appointment_start_datetime timestamp with time zone;
  appointment_end_datetime timestamp with time zone;
  current_datetime timestamp with time zone;
begin
  -- If appointment is cancelled, return cancelled
  if p_status = 'cancelled' then
    return 'cancelled';
  end if;

  -- Convert appointment date and times to timestamps
  appointment_start_datetime := (p_date || ' ' || p_start_time)::timestamp with time zone;
  appointment_end_datetime := (p_date || ' ' || p_end_time)::timestamp with time zone;
  current_datetime := timezone('utc'::text, now());

  -- If appointment hasn't started yet, it's upcoming
  if current_datetime < appointment_start_datetime then
    return 'upcoming';
  end if;

  -- If appointment has ended, it's completed
  if current_datetime > appointment_end_datetime then
    return 'completed';
  end if;

  -- If we're between start and end time, it's in progress (treat as upcoming)
  return 'upcoming';
end;
$function$
;

create or replace view "public"."appointments_with_status" as  SELECT a.id,
    a.booking_id,
    a.date,
    a.start_time,
    a.end_time,
    a.status,
    a.created_at,
    a.updated_at,
    get_appointment_computed_status(a.date, a.start_time, a.end_time, a.status) AS computed_status
   FROM appointments a;

-- Grant permissions to use the view
grant select on appointments_with_status to authenticated;

CREATE TRIGGER handle_updated_at BEFORE UPDATE ON public.appointments FOR EACH ROW EXECUTE FUNCTION moddatetime('updated_at');


