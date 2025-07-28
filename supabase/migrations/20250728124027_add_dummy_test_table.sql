drop policy "Allow all actions on dummy_test_table" on "public"."dummy_test_table";

alter table "public"."dummy_test_table" drop column "value";

alter table "public"."dummy_test_table" add column "active" boolean default true;

alter table "public"."dummy_test_table" add column "description" text;

alter table "public"."dummy_test_table" add column "updated_at" timestamp with time zone not null default timezone('utc'::text, now());

alter table "public"."dummy_test_table" alter column "name" set not null;

create policy "Anyone can view dummy test data"
on "public"."dummy_test_table"
as permissive
for select
to public
using (true);



