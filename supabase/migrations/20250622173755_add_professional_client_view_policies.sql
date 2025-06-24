create policy "Professionals can view client profiles for shared appointments"
on "public"."client_profiles"
as permissive
for select
to public
using ((EXISTS ( SELECT 1
   FROM (bookings b
     JOIN professional_profiles pp ON ((b.professional_profile_id = pp.id)))
  WHERE ((b.client_id = client_profiles.user_id) AND (pp.user_id = auth.uid())))));


create policy "Professionals can view user data for clients with shared appoin"
on "public"."users"
as permissive
for select
to public
using ((EXISTS ( SELECT 1
   FROM (bookings b
     JOIN professional_profiles pp ON ((b.professional_profile_id = pp.id)))
  WHERE ((b.client_id = users.id) AND (pp.user_id = auth.uid())))));



