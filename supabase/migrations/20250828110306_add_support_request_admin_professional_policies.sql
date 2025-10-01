create policy "Admins can view all support requests"
on "public"."support_requests"
as permissive
for select
to public
using ((EXISTS ( SELECT 1
   FROM (users u
     JOIN roles r ON ((u.role_id = r.id)))
  WHERE ((u.id = auth.uid()) AND (r.name = 'admin'::text)))));


create policy "Professionals can view support requests for their appointments"
on "public"."support_requests"
as permissive
for select
to public
using ((EXISTS ( SELECT 1
   FROM ((appointments a
     JOIN bookings b ON ((a.booking_id = b.id)))
     JOIN professional_profiles pp ON ((b.professional_profile_id = pp.id)))
  WHERE ((a.id = support_requests.appointment_id) AND (pp.user_id = auth.uid())))));



