drop policy "Anyone can create inquiries" on "public"."contact_inquiries";

create policy "Authenticated users can create inquiries"
on "public"."contact_inquiries"
as permissive
for insert
to authenticated
with check (true);


create policy "Service role can create inquiries"
on "public"."contact_inquiries"
as permissive
for insert
to service_role
with check (true);


create policy "Unauthenticated users can create inquiries"
on "public"."contact_inquiries"
as permissive
for insert
to anon
with check (true);



