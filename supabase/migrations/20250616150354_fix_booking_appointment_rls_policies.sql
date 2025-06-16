drop policy "Professionals can view appointments for their profile" on "public"."appointments";

create policy "Clients can update their appointments"
on "public"."appointments"
as permissive
for update
to public
using ((EXISTS ( SELECT 1
   FROM bookings
  WHERE ((bookings.id = appointments.booking_id) AND (bookings.client_id = auth.uid())))));


create policy "Professionals can update appointments for their profile"
on "public"."appointments"
as permissive
for update
to public
using ((EXISTS ( SELECT 1
   FROM (bookings b
     JOIN professional_profiles pp ON ((b.professional_profile_id = pp.id)))
  WHERE ((b.id = appointments.booking_id) AND (pp.user_id = auth.uid())))));


create policy "Professionals can view appointments for their profile"
on "public"."appointments"
as permissive
for select
to public
using ((EXISTS ( SELECT 1
   FROM (bookings b
     JOIN professional_profiles pp ON ((b.professional_profile_id = pp.id)))
  WHERE ((b.id = appointments.booking_id) AND (pp.user_id = auth.uid())))));



