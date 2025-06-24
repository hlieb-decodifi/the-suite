drop policy "Users can create inquiries" on "public"."contact_inquiries";

create policy "Anyone can create inquiries"
on "public"."contact_inquiries"
as permissive
for insert
to public
with check (true);



