alter table "public"."legal_documents" drop constraint "legal_documents_type_check";

alter table "public"."legal_documents" add constraint "legal_documents_type_check" CHECK ((type = ANY (ARRAY['terms_and_conditions'::text, 'privacy_policy'::text, 'copyright_policy'::text]))) not valid;

alter table "public"."legal_documents" validate constraint "legal_documents_type_check";

create policy "Admins can insert legal documents"
on "public"."legal_documents"
as permissive
for insert
to public
with check ((EXISTS ( SELECT 1
   FROM user_roles ur
  WHERE ((ur.user_id = auth.uid()) AND (ur.role = 'admin'::text)))));


create policy "Admins can update legal documents"
on "public"."legal_documents"
as permissive
for update
to public
using ((EXISTS ( SELECT 1
   FROM user_roles ur
  WHERE ((ur.user_id = auth.uid()) AND (ur.role = 'admin'::text)))));


create policy "Admins can view all legal documents"
on "public"."legal_documents"
as permissive
for select
to public
using ((EXISTS ( SELECT 1
   FROM user_roles ur
  WHERE ((ur.user_id = auth.uid()) AND (ur.role = 'admin'::text)))));



