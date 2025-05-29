create policy "Users can create their own customer record"
on "public"."customers"
as permissive
for insert
to public
with check ((auth.uid() = user_id));


create policy "Users can update their own customer record"
on "public"."customers"
as permissive
for update
to public
using ((auth.uid() = user_id));



