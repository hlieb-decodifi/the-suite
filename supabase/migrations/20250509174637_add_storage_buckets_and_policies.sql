create policy "Anyone can view payment methods of published professionals"
on "public"."professional_payment_methods"
as permissive
for select
to public
using ((EXISTS ( SELECT 1
   FROM professional_profiles
  WHERE ((professional_profiles.id = professional_payment_methods.professional_profile_id) AND (professional_profiles.is_published = true)))));



