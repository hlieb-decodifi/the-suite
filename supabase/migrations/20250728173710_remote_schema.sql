create table "public"."dummy_test_table" (
    "id" uuid not null default extensions.uuid_generate_v4(),
    "name" text,
    "value" integer,
    "created_at" timestamp with time zone not null default timezone('utc'::text, now())
);


alter table "public"."dummy_test_table" enable row level security;

CREATE UNIQUE INDEX dummy_test_table_pkey ON public.dummy_test_table USING btree (id);

alter table "public"."dummy_test_table" add constraint "dummy_test_table_pkey" PRIMARY KEY using index "dummy_test_table_pkey";

grant delete on table "public"."dummy_test_table" to "anon";

grant insert on table "public"."dummy_test_table" to "anon";

grant references on table "public"."dummy_test_table" to "anon";

grant select on table "public"."dummy_test_table" to "anon";

grant trigger on table "public"."dummy_test_table" to "anon";

grant truncate on table "public"."dummy_test_table" to "anon";

grant update on table "public"."dummy_test_table" to "anon";

grant delete on table "public"."dummy_test_table" to "authenticated";

grant insert on table "public"."dummy_test_table" to "authenticated";

grant references on table "public"."dummy_test_table" to "authenticated";

grant select on table "public"."dummy_test_table" to "authenticated";

grant trigger on table "public"."dummy_test_table" to "authenticated";

grant truncate on table "public"."dummy_test_table" to "authenticated";

grant update on table "public"."dummy_test_table" to "authenticated";

grant delete on table "public"."dummy_test_table" to "service_role";

grant insert on table "public"."dummy_test_table" to "service_role";

grant references on table "public"."dummy_test_table" to "service_role";

grant select on table "public"."dummy_test_table" to "service_role";

grant trigger on table "public"."dummy_test_table" to "service_role";

grant truncate on table "public"."dummy_test_table" to "service_role";

grant update on table "public"."dummy_test_table" to "service_role";

create policy "Allow all actions on dummy_test_table"
on "public"."dummy_test_table"
as permissive
for all
to public
using (true)
with check (true);



