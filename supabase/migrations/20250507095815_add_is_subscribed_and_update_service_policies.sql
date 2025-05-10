alter table "public"."professional_profiles" add column "is_subscribed" boolean default false;

create policy "Anyone can view services from published professionals"
on "public"."services"
as permissive
for select
to public
using ((EXISTS ( SELECT 1
   FROM professional_profiles
  WHERE ((professional_profiles.id = services.professional_profile_id) AND (professional_profiles.is_published = true)))));


create policy "Professionals can delete their own services"
on "public"."services"
as permissive
for delete
to public
using ((EXISTS ( SELECT 1
   FROM professional_profiles
  WHERE ((professional_profiles.id = services.professional_profile_id) AND (professional_profiles.user_id = auth.uid())))));


create policy "Professionals can view their own unpublished services"
on "public"."services"
as permissive
for select
to public
using ((EXISTS ( SELECT 1
   FROM professional_profiles
  WHERE ((professional_profiles.id = services.professional_profile_id) AND (professional_profiles.user_id = auth.uid()) AND ((professional_profiles.is_published = false) OR (professional_profiles.is_published IS NULL))))));



