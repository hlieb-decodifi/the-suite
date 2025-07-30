create table "public"."dummy_table" (
    "id" uuid not null default uuid_generate_v4(),
    "name" text not null,
    "value" integer default 0,
    "is_active" boolean default true,
    "created_at" timestamp with time zone not null default timezone('utc'::text, now()),
    "updated_at" timestamp with time zone not null default timezone('utc'::text, now())
);


alter table "public"."dummy_table" enable row level security;

CREATE UNIQUE INDEX dummy_table_pkey ON public.dummy_table USING btree (id);

alter table "public"."dummy_table" add constraint "dummy_table_pkey" PRIMARY KEY using index "dummy_table_pkey";

grant delete on table "public"."dummy_table" to "anon";

grant insert on table "public"."dummy_table" to "anon";

grant references on table "public"."dummy_table" to "anon";

grant select on table "public"."dummy_table" to "anon";

grant trigger on table "public"."dummy_table" to "anon";

grant truncate on table "public"."dummy_table" to "anon";

grant update on table "public"."dummy_table" to "anon";

grant delete on table "public"."dummy_table" to "authenticated";

grant insert on table "public"."dummy_table" to "authenticated";

grant references on table "public"."dummy_table" to "authenticated";

grant select on table "public"."dummy_table" to "authenticated";

grant trigger on table "public"."dummy_table" to "authenticated";

grant truncate on table "public"."dummy_table" to "authenticated";

grant update on table "public"."dummy_table" to "authenticated";

grant delete on table "public"."dummy_table" to "service_role";

grant insert on table "public"."dummy_table" to "service_role";

grant references on table "public"."dummy_table" to "service_role";

grant select on table "public"."dummy_table" to "service_role";

grant trigger on table "public"."dummy_table" to "service_role";

grant truncate on table "public"."dummy_table" to "service_role";

grant update on table "public"."dummy_table" to "service_role";

create policy "Anyone can view dummy table data"
on "public"."dummy_table"
as permissive
for select
to public
using (true);



