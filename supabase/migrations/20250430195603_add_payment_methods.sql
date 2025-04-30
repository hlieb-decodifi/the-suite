create table "public"."payment_methods" (
    "id" uuid not null default uuid_generate_v4(),
    "name" text not null,
    "created_at" timestamp with time zone not null default timezone('utc'::text, now())
);


alter table "public"."payment_methods" enable row level security;

create table "public"."professional_payment_methods" (
    "id" uuid not null default uuid_generate_v4(),
    "professional_profile_id" uuid not null,
    "payment_method_id" uuid not null,
    "created_at" timestamp with time zone not null default timezone('utc'::text, now())
);


alter table "public"."professional_payment_methods" enable row level security;

CREATE UNIQUE INDEX payment_methods_name_key ON public.payment_methods USING btree (name);

CREATE UNIQUE INDEX payment_methods_pkey ON public.payment_methods USING btree (id);

CREATE UNIQUE INDEX professional_payment_methods_pkey ON public.professional_payment_methods USING btree (id);

CREATE UNIQUE INDEX unique_professional_payment_method ON public.professional_payment_methods USING btree (professional_profile_id, payment_method_id);

alter table "public"."payment_methods" add constraint "payment_methods_pkey" PRIMARY KEY using index "payment_methods_pkey";

alter table "public"."professional_payment_methods" add constraint "professional_payment_methods_pkey" PRIMARY KEY using index "professional_payment_methods_pkey";

alter table "public"."payment_methods" add constraint "payment_methods_name_key" UNIQUE using index "payment_methods_name_key";

alter table "public"."professional_payment_methods" add constraint "professional_payment_methods_payment_method_id_fkey" FOREIGN KEY (payment_method_id) REFERENCES payment_methods(id) not valid;

alter table "public"."professional_payment_methods" validate constraint "professional_payment_methods_payment_method_id_fkey";

alter table "public"."professional_payment_methods" add constraint "professional_payment_methods_professional_profile_id_fkey" FOREIGN KEY (professional_profile_id) REFERENCES professional_profiles(id) not valid;

alter table "public"."professional_payment_methods" validate constraint "professional_payment_methods_professional_profile_id_fkey";

alter table "public"."professional_payment_methods" add constraint "unique_professional_payment_method" UNIQUE using index "unique_professional_payment_method";

grant delete on table "public"."payment_methods" to "anon";

grant insert on table "public"."payment_methods" to "anon";

grant references on table "public"."payment_methods" to "anon";

grant select on table "public"."payment_methods" to "anon";

grant trigger on table "public"."payment_methods" to "anon";

grant truncate on table "public"."payment_methods" to "anon";

grant update on table "public"."payment_methods" to "anon";

grant delete on table "public"."payment_methods" to "authenticated";

grant insert on table "public"."payment_methods" to "authenticated";

grant references on table "public"."payment_methods" to "authenticated";

grant select on table "public"."payment_methods" to "authenticated";

grant trigger on table "public"."payment_methods" to "authenticated";

grant truncate on table "public"."payment_methods" to "authenticated";

grant update on table "public"."payment_methods" to "authenticated";

grant delete on table "public"."payment_methods" to "service_role";

grant insert on table "public"."payment_methods" to "service_role";

grant references on table "public"."payment_methods" to "service_role";

grant select on table "public"."payment_methods" to "service_role";

grant trigger on table "public"."payment_methods" to "service_role";

grant truncate on table "public"."payment_methods" to "service_role";

grant update on table "public"."payment_methods" to "service_role";

grant delete on table "public"."professional_payment_methods" to "anon";

grant insert on table "public"."professional_payment_methods" to "anon";

grant references on table "public"."professional_payment_methods" to "anon";

grant select on table "public"."professional_payment_methods" to "anon";

grant trigger on table "public"."professional_payment_methods" to "anon";

grant truncate on table "public"."professional_payment_methods" to "anon";

grant update on table "public"."professional_payment_methods" to "anon";

grant delete on table "public"."professional_payment_methods" to "authenticated";

grant insert on table "public"."professional_payment_methods" to "authenticated";

grant references on table "public"."professional_payment_methods" to "authenticated";

grant select on table "public"."professional_payment_methods" to "authenticated";

grant trigger on table "public"."professional_payment_methods" to "authenticated";

grant truncate on table "public"."professional_payment_methods" to "authenticated";

grant update on table "public"."professional_payment_methods" to "authenticated";

grant delete on table "public"."professional_payment_methods" to "service_role";

grant insert on table "public"."professional_payment_methods" to "service_role";

grant references on table "public"."professional_payment_methods" to "service_role";

grant select on table "public"."professional_payment_methods" to "service_role";

grant trigger on table "public"."professional_payment_methods" to "service_role";

grant truncate on table "public"."professional_payment_methods" to "service_role";

grant update on table "public"."professional_payment_methods" to "service_role";

create policy "Anyone can view available payment methods"
on "public"."payment_methods"
as permissive
for select
to public
using (true);


create policy "Professionals can manage their own accepted payment methods"
on "public"."professional_payment_methods"
as permissive
for all
to public
using ((EXISTS ( SELECT 1
   FROM professional_profiles
  WHERE ((professional_profiles.id = professional_payment_methods.professional_profile_id) AND (professional_profiles.user_id = auth.uid())))));


create policy "Professionals can view their own accepted payment methods"
on "public"."professional_payment_methods"
as permissive
for select
to public
using ((EXISTS ( SELECT 1
   FROM professional_profiles
  WHERE ((professional_profiles.id = professional_payment_methods.professional_profile_id) AND (professional_profiles.user_id = auth.uid())))));



