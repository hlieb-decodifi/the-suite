drop policy "Anyone can view professional services" on "public"."professional_services";

drop policy "Professionals can manage their own services" on "public"."professional_services";

drop policy "Anyone can view services" on "public"."services";

drop policy "Professionals can delete their own services" on "public"."services";

revoke delete on table "public"."professional_services" from "anon";

revoke insert on table "public"."professional_services" from "anon";

revoke references on table "public"."professional_services" from "anon";

revoke select on table "public"."professional_services" from "anon";

revoke trigger on table "public"."professional_services" from "anon";

revoke truncate on table "public"."professional_services" from "anon";

revoke update on table "public"."professional_services" from "anon";

revoke delete on table "public"."professional_services" from "authenticated";

revoke insert on table "public"."professional_services" from "authenticated";

revoke references on table "public"."professional_services" from "authenticated";

revoke select on table "public"."professional_services" from "authenticated";

revoke trigger on table "public"."professional_services" from "authenticated";

revoke truncate on table "public"."professional_services" from "authenticated";

revoke update on table "public"."professional_services" from "authenticated";

revoke delete on table "public"."professional_services" from "service_role";

revoke insert on table "public"."professional_services" from "service_role";

revoke references on table "public"."professional_services" from "service_role";

revoke select on table "public"."professional_services" from "service_role";

revoke trigger on table "public"."professional_services" from "service_role";

revoke truncate on table "public"."professional_services" from "service_role";

revoke update on table "public"."professional_services" from "service_role";

alter table "public"."professional_services" drop constraint "professional_services_professional_profile_id_fkey";

alter table "public"."professional_services" drop constraint "professional_services_service_id_fkey";

alter table "public"."professional_services" drop constraint "professional_services_pkey";

drop index if exists "public"."professional_services_pkey";

drop table "public"."professional_services";

alter table "public"."services" add column "professional_profile_id" uuid not null;

alter table "public"."services" add constraint "services_professional_profile_id_fkey" FOREIGN KEY (professional_profile_id) REFERENCES professional_profiles(id) not valid;

alter table "public"."services" validate constraint "services_professional_profile_id_fkey";

set check_function_bodies = off;

CREATE OR REPLACE FUNCTION public.check_service_limit()
 RETURNS trigger
 LANGUAGE plpgsql
AS $function$
begin
  if (select count(*) from services where professional_profile_id = new.professional_profile_id) >= 10 then
    raise exception 'Maximum of 10 services allowed per professional';
  end if;
  return new;
end;
$function$
;

create policy "Professionals can manage their own services"
on "public"."services"
as permissive
for all
to public
using ((EXISTS ( SELECT 1
   FROM professional_profiles
  WHERE ((professional_profiles.id = services.professional_profile_id) AND (professional_profiles.user_id = auth.uid())))));


CREATE TRIGGER enforce_service_limit BEFORE INSERT ON public.services FOR EACH ROW EXECUTE FUNCTION check_service_limit();


