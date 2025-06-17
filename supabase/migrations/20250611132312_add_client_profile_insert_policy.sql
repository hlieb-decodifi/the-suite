create policy "Clients can create their own profile"
on "public"."client_profiles"
as permissive
for insert
to public
with check ((auth.uid() = user_id));



