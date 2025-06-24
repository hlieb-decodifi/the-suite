create policy "Anyone can view addresses of published professionals"
on "public"."addresses"
as permissive
for select
to public
using ((EXISTS ( SELECT 1
   FROM professional_profiles
  WHERE ((professional_profiles.address_id = addresses.id) AND (professional_profiles.is_published = true)))));



