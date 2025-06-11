create policy "Users can view profile photos of other users in their conversat"
on "public"."profile_photos"
as permissive
for select
to public
using ((EXISTS ( SELECT 1
   FROM conversations
  WHERE (((conversations.client_id = auth.uid()) AND (conversations.professional_id = profile_photos.user_id)) OR ((conversations.professional_id = auth.uid()) AND (conversations.client_id = profile_photos.user_id))))));


create policy "Users can view other users in their conversations"
on "public"."users"
as permissive
for select
to public
using ((EXISTS ( SELECT 1
   FROM conversations
  WHERE (((conversations.client_id = auth.uid()) AND (conversations.professional_id = users.id)) OR ((conversations.professional_id = auth.uid()) AND (conversations.client_id = users.id))))));



