drop policy "Anyone can view reviews for published professionals" on "public"."reviews";

create policy "Anyone can view reviews for published professionals"
on "public"."reviews"
as permissive
for select
to public
using ((EXISTS ( SELECT 1
   FROM professional_profiles pp
  WHERE ((pp.user_id = reviews.professional_id) AND (pp.is_published = true)))));



