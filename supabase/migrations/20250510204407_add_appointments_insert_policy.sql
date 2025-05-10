create policy "Clients can create appointments for their bookings"
on "public"."appointments"
as permissive
for insert
to public
with check ((EXISTS ( SELECT 1
   FROM bookings
  WHERE ((bookings.id = appointments.booking_id) AND (bookings.client_id = auth.uid())))));



