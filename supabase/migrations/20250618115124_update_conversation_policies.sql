drop policy "Authenticated users can create inquiries" on "public"."contact_inquiries";

drop policy "Service role can create inquiries" on "public"."contact_inquiries";

drop policy "Unauthenticated users can create inquiries" on "public"."contact_inquiries";

drop policy "Clients can create conversations with professionals who allow m" on "public"."conversations";

create policy "Anyone can create inquiries"
on "public"."contact_inquiries"
as permissive
for insert
to public
with check (true);


create policy "Users can create conversations based on appointment history or "
on "public"."conversations"
as permissive
for insert
to public
with check ((is_client(client_id) AND is_professional(professional_id) AND ((((auth.uid() = client_id) OR (auth.uid() = professional_id)) AND (EXISTS ( SELECT 1
   FROM bookings b
  WHERE ((b.client_id = conversations.client_id) AND (b.professional_profile_id IN ( SELECT professional_profiles.id
           FROM professional_profiles
          WHERE (professional_profiles.user_id = conversations.professional_id))))))) OR ((auth.uid() = client_id) AND (NOT (EXISTS ( SELECT 1
   FROM bookings b
  WHERE ((b.client_id = conversations.client_id) AND (b.professional_profile_id IN ( SELECT professional_profiles.id
           FROM professional_profiles
          WHERE (professional_profiles.user_id = conversations.professional_id))))))) AND (EXISTS ( SELECT 1
   FROM professional_profiles
  WHERE ((professional_profiles.user_id = conversations.professional_id) AND (professional_profiles.allow_messages = true))))))));



