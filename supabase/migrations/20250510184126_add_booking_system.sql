create table "public"."appointments" (
    "id" uuid not null default uuid_generate_v4(),
    "booking_id" uuid not null,
    "date" date not null,
    "start_time" time without time zone not null,
    "end_time" time without time zone not null,
    "status" text not null,
    "created_at" timestamp with time zone not null default timezone('utc'::text, now()),
    "updated_at" timestamp with time zone not null default timezone('utc'::text, now())
);


alter table "public"."appointments" enable row level security;

create table "public"."booking_payments" (
    "id" uuid not null default uuid_generate_v4(),
    "booking_id" uuid not null,
    "payment_method_id" uuid not null,
    "amount" numeric(10,2) not null,
    "tip_amount" numeric(10,2) not null default 0,
    "service_fee" numeric(10,2) not null,
    "status" text not null,
    "stripe_payment_intent_id" text,
    "created_at" timestamp with time zone not null default timezone('utc'::text, now()),
    "updated_at" timestamp with time zone not null default timezone('utc'::text, now())
);


alter table "public"."booking_payments" enable row level security;

create table "public"."booking_services" (
    "id" uuid not null default uuid_generate_v4(),
    "booking_id" uuid not null,
    "service_id" uuid not null,
    "price" numeric(10,2) not null,
    "duration" integer not null,
    "created_at" timestamp with time zone not null default timezone('utc'::text, now())
);


alter table "public"."booking_services" enable row level security;

create table "public"."bookings" (
    "id" uuid not null default uuid_generate_v4(),
    "client_id" uuid not null,
    "professional_profile_id" uuid not null,
    "status" text not null,
    "notes" text,
    "created_at" timestamp with time zone not null default timezone('utc'::text, now()),
    "updated_at" timestamp with time zone not null default timezone('utc'::text, now())
);


alter table "public"."bookings" enable row level security;

alter table "public"."payment_methods" add column "is_online" boolean not null default false;

CREATE UNIQUE INDEX appointments_booking_id_key ON public.appointments USING btree (booking_id);

CREATE UNIQUE INDEX appointments_pkey ON public.appointments USING btree (id);

CREATE UNIQUE INDEX booking_payments_booking_id_key ON public.booking_payments USING btree (booking_id);

CREATE UNIQUE INDEX booking_payments_pkey ON public.booking_payments USING btree (id);

CREATE UNIQUE INDEX booking_services_pkey ON public.booking_services USING btree (id);

CREATE UNIQUE INDEX bookings_pkey ON public.bookings USING btree (id);

alter table "public"."appointments" add constraint "appointments_pkey" PRIMARY KEY using index "appointments_pkey";

alter table "public"."booking_payments" add constraint "booking_payments_pkey" PRIMARY KEY using index "booking_payments_pkey";

alter table "public"."booking_services" add constraint "booking_services_pkey" PRIMARY KEY using index "booking_services_pkey";

alter table "public"."bookings" add constraint "bookings_pkey" PRIMARY KEY using index "bookings_pkey";

alter table "public"."appointments" add constraint "appointments_booking_id_fkey" FOREIGN KEY (booking_id) REFERENCES bookings(id) not valid;

alter table "public"."appointments" validate constraint "appointments_booking_id_fkey";

alter table "public"."appointments" add constraint "appointments_booking_id_key" UNIQUE using index "appointments_booking_id_key";

alter table "public"."appointments" add constraint "appointments_status_check" CHECK ((status = ANY (ARRAY['upcoming'::text, 'completed'::text, 'cancelled'::text]))) not valid;

alter table "public"."appointments" validate constraint "appointments_status_check";

alter table "public"."booking_payments" add constraint "booking_payments_booking_id_fkey" FOREIGN KEY (booking_id) REFERENCES bookings(id) not valid;

alter table "public"."booking_payments" validate constraint "booking_payments_booking_id_fkey";

alter table "public"."booking_payments" add constraint "booking_payments_booking_id_key" UNIQUE using index "booking_payments_booking_id_key";

alter table "public"."booking_payments" add constraint "booking_payments_payment_method_id_fkey" FOREIGN KEY (payment_method_id) REFERENCES payment_methods(id) not valid;

alter table "public"."booking_payments" validate constraint "booking_payments_payment_method_id_fkey";

alter table "public"."booking_payments" add constraint "booking_payments_status_check" CHECK ((status = ANY (ARRAY['pending'::text, 'completed'::text, 'failed'::text, 'refunded'::text]))) not valid;

alter table "public"."booking_payments" validate constraint "booking_payments_status_check";

alter table "public"."booking_services" add constraint "booking_services_booking_id_fkey" FOREIGN KEY (booking_id) REFERENCES bookings(id) not valid;

alter table "public"."booking_services" validate constraint "booking_services_booking_id_fkey";

alter table "public"."booking_services" add constraint "booking_services_service_id_fkey" FOREIGN KEY (service_id) REFERENCES services(id) not valid;

alter table "public"."booking_services" validate constraint "booking_services_service_id_fkey";

alter table "public"."bookings" add constraint "bookings_client_id_fkey" FOREIGN KEY (client_id) REFERENCES users(id) not valid;

alter table "public"."bookings" validate constraint "bookings_client_id_fkey";

alter table "public"."bookings" add constraint "bookings_professional_profile_id_fkey" FOREIGN KEY (professional_profile_id) REFERENCES professional_profiles(id) not valid;

alter table "public"."bookings" validate constraint "bookings_professional_profile_id_fkey";

alter table "public"."bookings" add constraint "bookings_status_check" CHECK ((status = ANY (ARRAY['pending'::text, 'confirmed'::text, 'completed'::text, 'cancelled'::text]))) not valid;

alter table "public"."bookings" validate constraint "bookings_status_check";

set check_function_bodies = off;

CREATE OR REPLACE FUNCTION public.check_professional_availability()
 RETURNS trigger
 LANGUAGE plpgsql
AS $function$
begin
  if exists (
    select 1 from appointments a
    join bookings b on a.booking_id = b.id
    where b.professional_profile_id = (
      select professional_profile_id from bookings where id = new.booking_id
    )
    and a.date = new.date
    and a.status != 'cancelled'
    and a.booking_id != new.booking_id
    and (
      (new.start_time < a.end_time and new.end_time > a.start_time) -- time slots overlap
    )
  ) then
    raise exception 'Professional is already booked for this time slot';
  end if;
  return new;
end;
$function$
;

grant delete on table "public"."appointments" to "anon";

grant insert on table "public"."appointments" to "anon";

grant references on table "public"."appointments" to "anon";

grant select on table "public"."appointments" to "anon";

grant trigger on table "public"."appointments" to "anon";

grant truncate on table "public"."appointments" to "anon";

grant update on table "public"."appointments" to "anon";

grant delete on table "public"."appointments" to "authenticated";

grant insert on table "public"."appointments" to "authenticated";

grant references on table "public"."appointments" to "authenticated";

grant select on table "public"."appointments" to "authenticated";

grant trigger on table "public"."appointments" to "authenticated";

grant truncate on table "public"."appointments" to "authenticated";

grant update on table "public"."appointments" to "authenticated";

grant delete on table "public"."appointments" to "service_role";

grant insert on table "public"."appointments" to "service_role";

grant references on table "public"."appointments" to "service_role";

grant select on table "public"."appointments" to "service_role";

grant trigger on table "public"."appointments" to "service_role";

grant truncate on table "public"."appointments" to "service_role";

grant update on table "public"."appointments" to "service_role";

grant delete on table "public"."booking_payments" to "anon";

grant insert on table "public"."booking_payments" to "anon";

grant references on table "public"."booking_payments" to "anon";

grant select on table "public"."booking_payments" to "anon";

grant trigger on table "public"."booking_payments" to "anon";

grant truncate on table "public"."booking_payments" to "anon";

grant update on table "public"."booking_payments" to "anon";

grant delete on table "public"."booking_payments" to "authenticated";

grant insert on table "public"."booking_payments" to "authenticated";

grant references on table "public"."booking_payments" to "authenticated";

grant select on table "public"."booking_payments" to "authenticated";

grant trigger on table "public"."booking_payments" to "authenticated";

grant truncate on table "public"."booking_payments" to "authenticated";

grant update on table "public"."booking_payments" to "authenticated";

grant delete on table "public"."booking_payments" to "service_role";

grant insert on table "public"."booking_payments" to "service_role";

grant references on table "public"."booking_payments" to "service_role";

grant select on table "public"."booking_payments" to "service_role";

grant trigger on table "public"."booking_payments" to "service_role";

grant truncate on table "public"."booking_payments" to "service_role";

grant update on table "public"."booking_payments" to "service_role";

grant delete on table "public"."booking_services" to "anon";

grant insert on table "public"."booking_services" to "anon";

grant references on table "public"."booking_services" to "anon";

grant select on table "public"."booking_services" to "anon";

grant trigger on table "public"."booking_services" to "anon";

grant truncate on table "public"."booking_services" to "anon";

grant update on table "public"."booking_services" to "anon";

grant delete on table "public"."booking_services" to "authenticated";

grant insert on table "public"."booking_services" to "authenticated";

grant references on table "public"."booking_services" to "authenticated";

grant select on table "public"."booking_services" to "authenticated";

grant trigger on table "public"."booking_services" to "authenticated";

grant truncate on table "public"."booking_services" to "authenticated";

grant update on table "public"."booking_services" to "authenticated";

grant delete on table "public"."booking_services" to "service_role";

grant insert on table "public"."booking_services" to "service_role";

grant references on table "public"."booking_services" to "service_role";

grant select on table "public"."booking_services" to "service_role";

grant trigger on table "public"."booking_services" to "service_role";

grant truncate on table "public"."booking_services" to "service_role";

grant update on table "public"."booking_services" to "service_role";

grant delete on table "public"."bookings" to "anon";

grant insert on table "public"."bookings" to "anon";

grant references on table "public"."bookings" to "anon";

grant select on table "public"."bookings" to "anon";

grant trigger on table "public"."bookings" to "anon";

grant truncate on table "public"."bookings" to "anon";

grant update on table "public"."bookings" to "anon";

grant delete on table "public"."bookings" to "authenticated";

grant insert on table "public"."bookings" to "authenticated";

grant references on table "public"."bookings" to "authenticated";

grant select on table "public"."bookings" to "authenticated";

grant trigger on table "public"."bookings" to "authenticated";

grant truncate on table "public"."bookings" to "authenticated";

grant update on table "public"."bookings" to "authenticated";

grant delete on table "public"."bookings" to "service_role";

grant insert on table "public"."bookings" to "service_role";

grant references on table "public"."bookings" to "service_role";

grant select on table "public"."bookings" to "service_role";

grant trigger on table "public"."bookings" to "service_role";

grant truncate on table "public"."bookings" to "service_role";

grant update on table "public"."bookings" to "service_role";

create policy "Clients can view their appointments"
on "public"."appointments"
as permissive
for select
to public
using ((EXISTS ( SELECT 1
   FROM bookings
  WHERE ((bookings.id = appointments.booking_id) AND (bookings.client_id = auth.uid())))));


create policy "Professionals can view appointments for their profile"
on "public"."appointments"
as permissive
for select
to public
using ((EXISTS ( SELECT 1
   FROM (bookings
     JOIN professional_profiles ON ((bookings.professional_profile_id = professional_profiles.id)))
  WHERE ((bookings.id = appointments.booking_id) AND (professional_profiles.user_id = auth.uid())))));


create policy "Clients can create booking payments for their bookings"
on "public"."booking_payments"
as permissive
for insert
to public
with check ((EXISTS ( SELECT 1
   FROM bookings
  WHERE ((bookings.id = booking_payments.booking_id) AND (bookings.client_id = auth.uid())))));


create policy "Users can view booking payments for their bookings"
on "public"."booking_payments"
as permissive
for select
to public
using ((EXISTS ( SELECT 1
   FROM bookings
  WHERE ((bookings.id = booking_payments.booking_id) AND ((bookings.client_id = auth.uid()) OR (EXISTS ( SELECT 1
           FROM professional_profiles
          WHERE ((professional_profiles.id = bookings.professional_profile_id) AND (professional_profiles.user_id = auth.uid())))))))));


create policy "Clients can create booking services for their bookings"
on "public"."booking_services"
as permissive
for insert
to public
with check ((EXISTS ( SELECT 1
   FROM bookings
  WHERE ((bookings.id = booking_services.booking_id) AND (bookings.client_id = auth.uid())))));


create policy "Users can view booking services for their bookings"
on "public"."booking_services"
as permissive
for select
to public
using ((EXISTS ( SELECT 1
   FROM bookings
  WHERE ((bookings.id = booking_services.booking_id) AND ((bookings.client_id = auth.uid()) OR (EXISTS ( SELECT 1
           FROM professional_profiles
          WHERE ((professional_profiles.id = bookings.professional_profile_id) AND (professional_profiles.user_id = auth.uid())))))))));


create policy "Clients can create their own bookings"
on "public"."bookings"
as permissive
for insert
to public
with check ((auth.uid() = client_id));


create policy "Clients can update their own bookings"
on "public"."bookings"
as permissive
for update
to public
using ((auth.uid() = client_id));


create policy "Clients can view their own bookings"
on "public"."bookings"
as permissive
for select
to public
using ((auth.uid() = client_id));


create policy "Professionals can view bookings for their profile"
on "public"."bookings"
as permissive
for select
to public
using ((EXISTS ( SELECT 1
   FROM professional_profiles
  WHERE ((professional_profiles.id = bookings.professional_profile_id) AND (professional_profiles.user_id = auth.uid())))));


CREATE TRIGGER enforce_no_double_booking BEFORE INSERT OR UPDATE ON public.appointments FOR EACH ROW EXECUTE FUNCTION check_professional_availability();


