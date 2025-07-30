set check_function_bodies = off;

CREATE OR REPLACE FUNCTION public.get_admin_dashboard_data(start_date text DEFAULT NULL::text, end_date text DEFAULT NULL::text)
 RETURNS jsonb
 LANGUAGE plpgsql
 SECURITY DEFINER
AS $function$
declare
  from_date timestamptz;
  to_date timestamptz;
  default_end text;
  default_start text;
  bookings_per_day jsonb;
begin
  -- Default to last 30 days if not provided
  default_end := to_char(now(), 'YYYY-MM-DD');
  default_start := to_char(now() - interval '29 days', 'YYYY-MM-DD');
  from_date := coalesce(
    (start_date::date at time zone 'UTC')::timestamptz,
    (default_start::date at time zone 'UTC')::timestamptz
  );
  to_date := coalesce(
    (end_date::date at time zone 'UTC')::timestamptz + interval '1 day' - interval '1 millisecond',
    (default_end::date at time zone 'UTC')::timestamptz + interval '1 day' - interval '1 millisecond'
  );

  -- Bookings per day as JSONB
  select coalesce(
    jsonb_object_agg(day, count), '{}'
  )
  into bookings_per_day
  from (
    select to_char(created_at, 'YYYY-MM-DD') as day, count(*)::int
    from bookings
    where created_at >= from_date and created_at <= to_date
    group by day
    order by day
  ) t;

  return jsonb_build_object(
    'totalBookings', (select count(*) from bookings),
    'newBookings', (select count(*) from bookings where created_at >= from_date and created_at <= to_date),
    'bookingsPerDay', bookings_per_day,
    'totalClients', (select count(*) from client_profiles),
    'newClients', (select count(*) from client_profiles where created_at >= from_date and created_at <= to_date),
    'totalProfessionals', (select count(*) from professional_profiles),
    'newProfessionals', (select count(*) from professional_profiles where created_at >= from_date and created_at <= to_date),
    'totalChats', (select count(*) from conversations),
    'newChats', (select count(*) from conversations where created_at >= from_date and created_at <= to_date),
    'totalRefunds', (select count(*) from refunds),
    'newRefunds', (select count(*) from refunds where created_at >= from_date and created_at <= to_date)
  );
end;
$function$
;

CREATE OR REPLACE FUNCTION public.is_admin(user_uuid uuid)
 RETURNS boolean
 LANGUAGE plpgsql
 SECURITY DEFINER
AS $function$
declare
  is_admin boolean;
begin
  select exists(
    select 1 from users
    join roles on users.role_id = roles.id
    where users.id = user_uuid
    and roles.name = 'admin'
  ) into is_admin;
  
  return is_admin;
end;
$function$
;


