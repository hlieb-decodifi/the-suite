drop policy "Clients can view archived services they have bookings for" on "public"."services";

drop policy "Clients can create booking services for their bookings" on "public"."booking_services";

drop policy "Professionals can create booking services for their bookings" on "public"."booking_services";

create policy "Clients can create booking services for their bookings"
on "public"."booking_services"
as permissive
for insert
to public
with check (((EXISTS ( SELECT 1
   FROM bookings
  WHERE ((bookings.id = booking_services.booking_id) AND (bookings.client_id = auth.uid())))) AND (NOT (EXISTS ( SELECT 1
   FROM services s
  WHERE ((s.id = booking_services.service_id) AND (s.is_archived = true)))))));


create policy "Professionals can create booking services for their bookings"
on "public"."booking_services"
as permissive
for insert
to public
with check (((EXISTS ( SELECT 1
   FROM (bookings b
     JOIN professional_profiles pp ON ((b.professional_profile_id = pp.id)))
  WHERE ((b.id = booking_services.booking_id) AND (pp.user_id = auth.uid())))) AND (NOT (EXISTS ( SELECT 1
   FROM services s
  WHERE ((s.id = booking_services.service_id) AND (s.is_archived = true)))))));

-- Add back the client archived services policy that was dropped due to table dependency
create policy "Clients can view archived services they have bookings for"
  on services for select
  using (
    is_archived = true
    and exists (
      select 1 from booking_services bs
      join bookings b on bs.booking_id = b.id
      where bs.service_id = services.id
      and b.client_id = auth.uid()
    )
  );



