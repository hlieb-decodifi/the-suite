create table "public"."admin_configs" (
    "id" uuid not null default uuid_generate_v4(),
    "key" text not null,
    "value" text not null,
    "description" text not null,
    "data_type" text not null,
    "created_at" timestamp with time zone not null default timezone('utc'::text, now()),
    "updated_at" timestamp with time zone not null default timezone('utc'::text, now())
);


alter table "public"."admin_configs" enable row level security;

create table "public"."reviews" (
    "id" uuid not null default uuid_generate_v4(),
    "appointment_id" uuid not null,
    "client_id" uuid not null,
    "professional_id" uuid not null,
    "score" integer not null,
    "message" text not null,
    "created_at" timestamp with time zone not null default timezone('utc'::text, now()),
    "updated_at" timestamp with time zone not null default timezone('utc'::text, now())
);


alter table "public"."reviews" enable row level security;

CREATE UNIQUE INDEX admin_configs_key_key ON public.admin_configs USING btree (key);

CREATE UNIQUE INDEX admin_configs_pkey ON public.admin_configs USING btree (id);

CREATE INDEX idx_admin_configs_key ON public.admin_configs USING btree (key);

CREATE INDEX idx_reviews_appointment_id ON public.reviews USING btree (appointment_id);

CREATE INDEX idx_reviews_client_id ON public.reviews USING btree (client_id);

CREATE INDEX idx_reviews_created_at ON public.reviews USING btree (created_at);

CREATE INDEX idx_reviews_professional_id ON public.reviews USING btree (professional_id);

CREATE INDEX idx_reviews_score ON public.reviews USING btree (score);

CREATE UNIQUE INDEX reviews_appointment_id_key ON public.reviews USING btree (appointment_id);

CREATE UNIQUE INDEX reviews_pkey ON public.reviews USING btree (id);

alter table "public"."admin_configs" add constraint "admin_configs_pkey" PRIMARY KEY using index "admin_configs_pkey";

alter table "public"."reviews" add constraint "reviews_pkey" PRIMARY KEY using index "reviews_pkey";

alter table "public"."admin_configs" add constraint "admin_configs_data_type_check" CHECK ((data_type = ANY (ARRAY['integer'::text, 'decimal'::text, 'boolean'::text, 'text'::text]))) not valid;

alter table "public"."admin_configs" validate constraint "admin_configs_data_type_check";

alter table "public"."admin_configs" add constraint "admin_configs_key_key" UNIQUE using index "admin_configs_key_key";

alter table "public"."reviews" add constraint "client_is_client" CHECK (is_client(client_id)) not valid;

alter table "public"."reviews" validate constraint "client_is_client";

alter table "public"."reviews" add constraint "professional_is_professional" CHECK (is_professional(professional_id)) not valid;

alter table "public"."reviews" validate constraint "professional_is_professional";

alter table "public"."reviews" add constraint "reviews_appointment_id_fkey" FOREIGN KEY (appointment_id) REFERENCES appointments(id) not valid;

alter table "public"."reviews" validate constraint "reviews_appointment_id_fkey";

alter table "public"."reviews" add constraint "reviews_appointment_id_key" UNIQUE using index "reviews_appointment_id_key";

alter table "public"."reviews" add constraint "reviews_client_id_fkey" FOREIGN KEY (client_id) REFERENCES users(id) not valid;

alter table "public"."reviews" validate constraint "reviews_client_id_fkey";

alter table "public"."reviews" add constraint "reviews_professional_id_fkey" FOREIGN KEY (professional_id) REFERENCES users(id) not valid;

alter table "public"."reviews" validate constraint "reviews_professional_id_fkey";

alter table "public"."reviews" add constraint "reviews_score_check" CHECK (((score >= 1) AND (score <= 5))) not valid;

alter table "public"."reviews" validate constraint "reviews_score_check";

set check_function_bodies = off;

CREATE OR REPLACE FUNCTION public.can_create_review(p_appointment_id uuid, p_client_id uuid)
 RETURNS boolean
 LANGUAGE plpgsql
 SECURITY DEFINER
AS $function$
declare
  appointment_status text;
  appointment_client_id uuid;
  appointment_professional_id uuid;
  existing_review_count integer;
begin
  -- Get appointment details
  select a.status, b.client_id, pp.user_id into appointment_status, appointment_client_id, appointment_professional_id
  from appointments a
  join bookings b on a.booking_id = b.id
  join professional_profiles pp on b.professional_profile_id = pp.id
  where a.id = p_appointment_id;
  
  -- Check if appointment exists
  if appointment_status is null then
    return false;
  end if;
  
  -- Check if appointment is completed
  if appointment_status != 'completed' then
    return false;
  end if;
  
  -- Check if requesting user is the client for this appointment
  if appointment_client_id != p_client_id then
    return false;
  end if;
  
  -- Check if review already exists for this appointment
  select count(*) into existing_review_count
  from reviews
  where appointment_id = p_appointment_id;
  
  if existing_review_count > 0 then
    return false;
  end if;
  
  return true;
end;
$function$
;

CREATE OR REPLACE FUNCTION public.get_admin_config(config_key text, default_value text DEFAULT NULL::text)
 RETURNS text
 LANGUAGE plpgsql
 SECURITY DEFINER
AS $function$
declare
  config_value text;
begin
  select value into config_value
  from admin_configs
  where key = config_key;
  
  return coalesce(config_value, default_value);
end;
$function$
;

CREATE OR REPLACE FUNCTION public.get_professional_rating_stats(p_professional_id uuid)
 RETURNS TABLE(average_rating numeric, total_reviews integer, five_star integer, four_star integer, three_star integer, two_star integer, one_star integer)
 LANGUAGE plpgsql
 SECURITY DEFINER
AS $function$
begin
  return query
  select 
    round(avg(r.score), 2) as average_rating,
    count(r.id)::integer as total_reviews,
    count(case when r.score = 5 then 1 end)::integer as five_star,
    count(case when r.score = 4 then 1 end)::integer as four_star,
    count(case when r.score = 3 then 1 end)::integer as three_star,
    count(case when r.score = 2 then 1 end)::integer as two_star,
    count(case when r.score = 1 then 1 end)::integer as one_star
  from reviews r
  where r.professional_id = p_professional_id;
end;
$function$
;

CREATE OR REPLACE FUNCTION public.set_admin_config(config_key text, config_value text)
 RETURNS boolean
 LANGUAGE plpgsql
 SECURITY DEFINER
AS $function$
begin
  insert into admin_configs (key, value, description, data_type)
  values (config_key, config_value, 'Auto-created configuration', 'text')
  on conflict (key)
  do update set 
    value = config_value,
    updated_at = timezone('utc'::text, now());
    
  return true;
end;
$function$
;

CREATE OR REPLACE FUNCTION public.update_admin_configs_updated_at()
 RETURNS trigger
 LANGUAGE plpgsql
AS $function$
begin
  new.updated_at = timezone('utc'::text, now());
  return new;
end;
$function$
;

CREATE OR REPLACE FUNCTION public.update_reviews_updated_at()
 RETURNS trigger
 LANGUAGE plpgsql
AS $function$
begin
  new.updated_at = timezone('utc'::text, now());
  return new;
end;
$function$
;

CREATE OR REPLACE FUNCTION public.check_portfolio_photo_limit()
 RETURNS trigger
 LANGUAGE plpgsql
AS $function$
declare
  max_photos integer;
begin
  -- Get the maximum portfolio photos from configuration
  select get_admin_config('max_portfolio_photos', '20')::integer into max_photos;
  
  if (select count(*) from portfolio_photos where user_id = new.user_id) >= max_photos then
    raise exception 'Maximum of % portfolio photos allowed per professional', max_photos;
  end if;
  return new;
end;
$function$
;

CREATE OR REPLACE FUNCTION public.get_service_limit(prof_profile_id uuid)
 RETURNS integer
 LANGUAGE plpgsql
 SECURITY DEFINER
AS $function$
declare
  limit_value integer;
  default_limit integer;
begin
  -- Get custom limit if set
  select max_services into limit_value
  from service_limits
  where professional_profile_id = prof_profile_id;
  
  -- Get default limit from admin configuration
  select get_admin_config('max_services_default', '50')::integer into default_limit;
  
  -- Return custom limit if set, otherwise return admin-configured default
  return coalesce(limit_value, default_limit);
end;
$function$
;

grant delete on table "public"."admin_configs" to "anon";

grant insert on table "public"."admin_configs" to "anon";

grant references on table "public"."admin_configs" to "anon";

grant select on table "public"."admin_configs" to "anon";

grant trigger on table "public"."admin_configs" to "anon";

grant truncate on table "public"."admin_configs" to "anon";

grant update on table "public"."admin_configs" to "anon";

grant delete on table "public"."admin_configs" to "authenticated";

grant insert on table "public"."admin_configs" to "authenticated";

grant references on table "public"."admin_configs" to "authenticated";

grant select on table "public"."admin_configs" to "authenticated";

grant trigger on table "public"."admin_configs" to "authenticated";

grant truncate on table "public"."admin_configs" to "authenticated";

grant update on table "public"."admin_configs" to "authenticated";

grant delete on table "public"."admin_configs" to "service_role";

grant insert on table "public"."admin_configs" to "service_role";

grant references on table "public"."admin_configs" to "service_role";

grant select on table "public"."admin_configs" to "service_role";

grant trigger on table "public"."admin_configs" to "service_role";

grant truncate on table "public"."admin_configs" to "service_role";

grant update on table "public"."admin_configs" to "service_role";

grant delete on table "public"."reviews" to "anon";

grant insert on table "public"."reviews" to "anon";

grant references on table "public"."reviews" to "anon";

grant select on table "public"."reviews" to "anon";

grant trigger on table "public"."reviews" to "anon";

grant truncate on table "public"."reviews" to "anon";

grant update on table "public"."reviews" to "anon";

grant delete on table "public"."reviews" to "authenticated";

grant insert on table "public"."reviews" to "authenticated";

grant references on table "public"."reviews" to "authenticated";

grant select on table "public"."reviews" to "authenticated";

grant trigger on table "public"."reviews" to "authenticated";

grant truncate on table "public"."reviews" to "authenticated";

grant update on table "public"."reviews" to "authenticated";

grant delete on table "public"."reviews" to "service_role";

grant insert on table "public"."reviews" to "service_role";

grant references on table "public"."reviews" to "service_role";

grant select on table "public"."reviews" to "service_role";

grant trigger on table "public"."reviews" to "service_role";

grant truncate on table "public"."reviews" to "service_role";

grant update on table "public"."reviews" to "service_role";

create policy "Admins can manage configurations"
on "public"."admin_configs"
as permissive
for all
to public
using ((EXISTS ( SELECT 1
   FROM (users u
     JOIN roles r ON ((u.role_id = r.id)))
  WHERE ((u.id = auth.uid()) AND (r.name = 'admin'::text)))));


create policy "Anyone can read admin configurations"
on "public"."admin_configs"
as permissive
for select
to public
using (true);


create policy "Anyone can view reviews for published professionals"
on "public"."reviews"
as permissive
for select
to public
using (((EXISTS ( SELECT 1
   FROM professional_profiles pp
  WHERE ((pp.user_id = reviews.professional_id) AND (pp.is_published = true)))) AND (( SELECT count(*) AS count
   FROM reviews r2
  WHERE (r2.professional_id = reviews.professional_id)) >= (get_admin_config('min_reviews_to_display'::text, '5'::text))::integer)));


create policy "Clients can create reviews for completed appointments"
on "public"."reviews"
as permissive
for insert
to public
with check (((auth.uid() = client_id) AND can_create_review(appointment_id, client_id)));


create policy "Clients can update their own reviews"
on "public"."reviews"
as permissive
for update
to public
using (((auth.uid() = client_id) AND (created_at > (now() - make_interval(days => (get_admin_config('review_edit_window_days'::text, '7'::text))::integer)))));


create policy "Clients can view their own reviews"
on "public"."reviews"
as permissive
for select
to public
using ((auth.uid() = client_id));


create policy "Professionals can view their own reviews"
on "public"."reviews"
as permissive
for select
to public
using ((auth.uid() = professional_id));


CREATE TRIGGER update_admin_configs_updated_at BEFORE UPDATE ON public.admin_configs FOR EACH ROW EXECUTE FUNCTION update_admin_configs_updated_at();

CREATE TRIGGER update_reviews_updated_at BEFORE UPDATE ON public.reviews FOR EACH ROW EXECUTE FUNCTION update_reviews_updated_at();


