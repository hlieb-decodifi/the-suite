drop policy "Anyone can view user data for published professionals" on "public"."users";

drop policy "Users can update their own basic data" on "public"."users";

create policy "Anyone can view user data for published professionals"
on "public"."users"
as permissive
for select
to public
using ((id IN ( SELECT professional_profiles.user_id
   FROM professional_profiles
  WHERE (professional_profiles.is_published = true))));


create policy "Users can update their own basic data"
on "public"."users"
as permissive
for update
to public
using ((auth.uid() = id))
with check (((auth.uid() = id) AND (role_id = ( SELECT users_1.role_id
   FROM users users_1
  WHERE (users_1.id = auth.uid())
 LIMIT 1))));



