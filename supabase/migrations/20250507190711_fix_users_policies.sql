drop policy "Users can update their own basic data" on "public"."users";

create policy "Users can update their own basic data"
on "public"."users"
as permissive
for update
to public
using ((auth.uid() = id))
with check (((auth.uid() = id) AND (role_id IS NOT NULL)));



