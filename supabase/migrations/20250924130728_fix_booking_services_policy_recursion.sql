drop policy "Clients can create booking services for their bookings" on "public"."booking_services";

drop policy "Professionals can create booking services for their bookings" on "public"."booking_services";

create policy "Clients can create booking services for their bookings"
on "public"."booking_services"
as permissive
for insert
to public
with check ((EXISTS ( SELECT 1
   FROM bookings
  WHERE ((bookings.id = booking_services.booking_id) AND (bookings.client_id = auth.uid())))));


create policy "Professionals can create booking services for their bookings"
on "public"."booking_services"
as permissive
for insert
to public
with check ((EXISTS ( SELECT 1
   FROM (bookings b
     JOIN professional_profiles pp ON ((b.professional_profile_id = pp.id)))
  WHERE ((b.id = booking_services.booking_id) AND (pp.user_id = auth.uid())))));



