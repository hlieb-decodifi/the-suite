drop policy "Professionals can delete their own services" on "public"."services";

drop policy "Professionals can view their own unpublished services" on "public"."services";

create policy "Professionals can view their own services"
on "public"."services"
as permissive
for select
to public
using ((EXISTS ( SELECT 1
   FROM professional_profiles
  WHERE ((professional_profiles.id = services.professional_profile_id) AND (professional_profiles.user_id = auth.uid())))));


create policy "Anyone can view user data for published professionals"
on "public"."users"
as permissive
for select
to public
using ((EXISTS ( SELECT 1
   FROM professional_profiles
  WHERE ((professional_profiles.user_id = users.id) AND (professional_profiles.is_published = true)))));



