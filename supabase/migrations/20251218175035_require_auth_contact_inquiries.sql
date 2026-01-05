-- Delete all existing contact inquiries since user_id will become NOT NULL
-- and existing inquiries may have NULL user_id values
delete from "public"."contact_inquiries";

drop policy "Anyone can create valid inquiries" on "public"."contact_inquiries";

alter table "public"."contact_inquiries" drop constraint "check_email_length";

alter table "public"."contact_inquiries" drop constraint "check_message_length";

alter table "public"."contact_inquiries" drop constraint "check_name_length";

alter table "public"."contact_inquiries" drop constraint "check_phone_length";

alter table "public"."contact_inquiries" drop constraint "check_subject_length";

drop function if exists "public"."get_contact_inquiry_stats"(time_window_hours integer);

drop index if exists "public"."idx_contact_inquiries_created_at_desc";

alter table "public"."contact_inquiries" drop column "user_agent";

alter table "public"."contact_inquiries" alter column "user_id" set not null;


  create policy "Authenticated users can create inquiries"
  on "public"."contact_inquiries"
  as permissive
  for insert
  to public
with check ((auth.uid() = user_id));



