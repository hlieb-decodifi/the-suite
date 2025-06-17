create policy "Professionals can create their own profile"
on "public"."professional_profiles"
as permissive
for insert
to public
with check ((auth.uid() = user_id));



