drop policy "Admins can view all support requests" on "public"."support_requests";

drop policy "Professionals can view support requests for their appointments" on "public"."support_requests";

create table "public"."activity_log" (
    "id" uuid not null default uuid_generate_v4(),
    "user_id" uuid,
    "session_id" text,
    "activity_type" text not null,
    "entity_type" text,
    "entity_id" uuid,
    "metadata" jsonb default '{}'::jsonb,
    "ip_address" inet,
    "user_agent" text,
    "referrer" text,
    "created_at" timestamp with time zone not null default timezone('utc'::text, now())
);


alter table "public"."activity_log" enable row level security;

CREATE UNIQUE INDEX activity_log_pkey ON public.activity_log USING btree (id);

CREATE INDEX idx_activity_log_activity_type ON public.activity_log USING btree (activity_type);

CREATE INDEX idx_activity_log_created_at ON public.activity_log USING btree (created_at);

CREATE INDEX idx_activity_log_entity ON public.activity_log USING btree (entity_type, entity_id);

CREATE INDEX idx_activity_log_session_id ON public.activity_log USING btree (session_id);

CREATE INDEX idx_activity_log_user_id ON public.activity_log USING btree (user_id);

alter table "public"."activity_log" add constraint "activity_log_pkey" PRIMARY KEY using index "activity_log_pkey";

alter table "public"."activity_log" add constraint "activity_log_activity_type_check" CHECK ((activity_type = ANY (ARRAY['page_view'::text, 'service_view'::text, 'professional_view'::text, 'booking_started'::text, 'booking_completed'::text, 'booking_cancelled'::text, 'search_performed'::text]))) not valid;

alter table "public"."activity_log" validate constraint "activity_log_activity_type_check";

alter table "public"."activity_log" add constraint "activity_log_entity_type_check" CHECK ((entity_type = ANY (ARRAY['service'::text, 'professional'::text, 'booking'::text]))) not valid;

alter table "public"."activity_log" validate constraint "activity_log_entity_type_check";

alter table "public"."activity_log" add constraint "activity_log_user_id_fkey" FOREIGN KEY (user_id) REFERENCES users(id) not valid;

alter table "public"."activity_log" validate constraint "activity_log_user_id_fkey";

set check_function_bodies = off;

CREATE OR REPLACE FUNCTION public.get_engagement_analytics(start_date timestamp with time zone DEFAULT (now() - '30 days'::interval), end_date timestamp with time zone DEFAULT now(), entity_filter_type text DEFAULT NULL::text, entity_filter_id uuid DEFAULT NULL::uuid)
 RETURNS TABLE(total_service_views bigint, total_professional_views bigint, total_bookings_started bigint, total_bookings_completed bigint, conversion_rate numeric, engagement_rate numeric, bounce_rate numeric)
 LANGUAGE plpgsql
 SECURITY DEFINER
AS $function$
begin
  return query
  select 
    count(case when al.activity_type = 'service_view' then 1 end) as total_service_views,
    count(case when al.activity_type = 'professional_view' then 1 end) as total_professional_views,
    count(case when al.activity_type = 'booking_started' then 1 end) as total_bookings_started,
    count(case when al.activity_type = 'booking_completed' then 1 end) as total_bookings_completed,
    case 
      when count(case when al.activity_type in ('service_view', 'professional_view') then 1 end) > 0 
      then round(
        (count(case when al.activity_type = 'booking_completed' then 1 end)::decimal / 
         count(case when al.activity_type in ('service_view', 'professional_view') then 1 end)::decimal) * 100, 
        2
      )
      else 0.00
    end as conversion_rate,
    case 
      when count(case when al.activity_type in ('service_view', 'professional_view') then 1 end) > 0 
      then round(
        (count(case when al.activity_type in ('booking_started', 'booking_completed') then 1 end)::decimal / 
         count(case when al.activity_type in ('service_view', 'professional_view') then 1 end)::decimal) * 100, 
        2
      )
      else 0.00
    end as engagement_rate,
    case 
      when count(case when al.activity_type in ('service_view', 'professional_view') then 1 end) > 0 
      then round(
        ((count(case when al.activity_type in ('service_view', 'professional_view') then 1 end) - 
          count(case when al.activity_type in ('booking_started', 'booking_completed') then 1 end))::decimal / 
         count(case when al.activity_type in ('service_view', 'professional_view') then 1 end)::decimal) * 100, 
        2
      )
      else 0.00
    end as bounce_rate
  from activity_log al
  where al.created_at >= start_date 
    and al.created_at <= end_date
    and (entity_filter_type is null or al.entity_type = entity_filter_type)
    and (entity_filter_id is null or al.entity_id = entity_filter_id);
end;
$function$
;

CREATE OR REPLACE FUNCTION public.get_non_converting_users(start_date timestamp with time zone DEFAULT (now() - '30 days'::interval), end_date timestamp with time zone DEFAULT now(), entity_filter_type text DEFAULT NULL::text, entity_filter_id uuid DEFAULT NULL::uuid)
 RETURNS TABLE(user_id uuid, session_id text, user_name text, service_views bigint, professional_views bigint, bookings_started bigint, bookings_completed bigint, last_activity timestamp with time zone, viewed_entities jsonb)
 LANGUAGE plpgsql
 SECURITY DEFINER
AS $function$
begin
  return query
  with user_activity as (
    select 
      al.user_id,
      al.session_id,
      count(case when al.activity_type = 'service_view' then 1 end) as service_views,
      count(case when al.activity_type = 'professional_view' then 1 end) as professional_views,
      count(case when al.activity_type = 'booking_started' then 1 end) as bookings_started,
      count(case when al.activity_type = 'booking_completed' then 1 end) as bookings_completed,
      max(al.created_at) as last_activity,
      jsonb_agg(
        distinct jsonb_build_object(
          'type', al.entity_type,
          'id', al.entity_id,
          'activity', al.activity_type,
          'timestamp', al.created_at
        )
      ) as viewed_entities
    from activity_log al
    where al.created_at >= start_date 
      and al.created_at <= end_date
      and (entity_filter_type is null or al.entity_type = entity_filter_type)
      and (entity_filter_id is null or al.entity_id = entity_filter_id)
    group by al.user_id, al.session_id
  )
  select 
    ua.user_id,
    ua.session_id,
    case 
      when ua.user_id is not null then concat(u.first_name, ' ', u.last_name)
      else null
    end as user_name,
    ua.service_views,
    ua.professional_views,
    ua.bookings_started,
    ua.bookings_completed,
    ua.last_activity,
    ua.viewed_entities
  from user_activity ua
  left join users u on ua.user_id = u.id
  where (ua.service_views > 0 or ua.professional_views > 0)
    and ua.bookings_completed = 0;
end;
$function$
;

grant delete on table "public"."activity_log" to "anon";

grant insert on table "public"."activity_log" to "anon";

grant references on table "public"."activity_log" to "anon";

grant select on table "public"."activity_log" to "anon";

grant trigger on table "public"."activity_log" to "anon";

grant truncate on table "public"."activity_log" to "anon";

grant update on table "public"."activity_log" to "anon";

grant delete on table "public"."activity_log" to "authenticated";

grant insert on table "public"."activity_log" to "authenticated";

grant references on table "public"."activity_log" to "authenticated";

grant select on table "public"."activity_log" to "authenticated";

grant trigger on table "public"."activity_log" to "authenticated";

grant truncate on table "public"."activity_log" to "authenticated";

grant update on table "public"."activity_log" to "authenticated";

grant delete on table "public"."activity_log" to "service_role";

grant insert on table "public"."activity_log" to "service_role";

grant references on table "public"."activity_log" to "service_role";

grant select on table "public"."activity_log" to "service_role";

grant trigger on table "public"."activity_log" to "service_role";

grant truncate on table "public"."activity_log" to "service_role";

grant update on table "public"."activity_log" to "service_role";

create policy "Admins can view all activity logs"
on "public"."activity_log"
as permissive
for select
to public
using ((EXISTS ( SELECT 1
   FROM (users u
     JOIN roles r ON ((u.role_id = r.id)))
  WHERE ((u.id = auth.uid()) AND (r.name = 'admin'::text)))));


create policy "Anyone can insert activity log entries"
on "public"."activity_log"
as permissive
for insert
to public
with check (true);



