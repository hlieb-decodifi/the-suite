create table "public"."tips" (
    "id" uuid not null default uuid_generate_v4(),
    "booking_id" uuid not null,
    "client_id" uuid not null,
    "professional_id" uuid not null,
    "amount" numeric(10,2) not null,
    "stripe_payment_intent_id" text,
    "status" text not null default 'pending'::text,
    "refunded_amount" numeric(10,2) not null default 0,
    "refunded_at" timestamp with time zone,
    "stripe_refund_id" text,
    "created_at" timestamp with time zone not null default timezone('utc'::text, now()),
    "updated_at" timestamp with time zone not null default timezone('utc'::text, now())
);


alter table "public"."tips" enable row level security;

CREATE INDEX idx_tips_booking_id ON public.tips USING btree (booking_id);

CREATE INDEX idx_tips_client_id ON public.tips USING btree (client_id);

CREATE INDEX idx_tips_created_at ON public.tips USING btree (created_at);

CREATE INDEX idx_tips_professional_id ON public.tips USING btree (professional_id);

CREATE INDEX idx_tips_status ON public.tips USING btree (status);

CREATE INDEX idx_tips_stripe_payment_intent_id ON public.tips USING btree (stripe_payment_intent_id) WHERE (stripe_payment_intent_id IS NOT NULL);

CREATE UNIQUE INDEX tips_pkey ON public.tips USING btree (id);

alter table "public"."tips" add constraint "tips_pkey" PRIMARY KEY using index "tips_pkey";

alter table "public"."tips" add constraint "client_is_client" CHECK (is_client(client_id)) not valid;

alter table "public"."tips" validate constraint "client_is_client";

alter table "public"."tips" add constraint "professional_is_professional" CHECK (is_professional(professional_id)) not valid;

alter table "public"."tips" validate constraint "professional_is_professional";

alter table "public"."tips" add constraint "tip_refund_amount_check" CHECK (((refunded_amount >= (0)::numeric) AND (refunded_amount <= amount))) not valid;

alter table "public"."tips" validate constraint "tip_refund_amount_check";

alter table "public"."tips" add constraint "tips_amount_check" CHECK ((amount > (0)::numeric)) not valid;

alter table "public"."tips" validate constraint "tips_amount_check";

alter table "public"."tips" add constraint "tips_booking_id_fkey" FOREIGN KEY (booking_id) REFERENCES bookings(id) not valid;

alter table "public"."tips" validate constraint "tips_booking_id_fkey";

alter table "public"."tips" add constraint "tips_client_id_fkey" FOREIGN KEY (client_id) REFERENCES users(id) not valid;

alter table "public"."tips" validate constraint "tips_client_id_fkey";

alter table "public"."tips" add constraint "tips_professional_id_fkey" FOREIGN KEY (professional_id) REFERENCES users(id) not valid;

alter table "public"."tips" validate constraint "tips_professional_id_fkey";

alter table "public"."tips" add constraint "tips_status_check" CHECK ((status = ANY (ARRAY['pending'::text, 'completed'::text, 'failed'::text, 'refunded'::text]))) not valid;

alter table "public"."tips" validate constraint "tips_status_check";

grant delete on table "public"."tips" to "anon";

grant insert on table "public"."tips" to "anon";

grant references on table "public"."tips" to "anon";

grant select on table "public"."tips" to "anon";

grant trigger on table "public"."tips" to "anon";

grant truncate on table "public"."tips" to "anon";

grant update on table "public"."tips" to "anon";

grant delete on table "public"."tips" to "authenticated";

grant insert on table "public"."tips" to "authenticated";

grant references on table "public"."tips" to "authenticated";

grant select on table "public"."tips" to "authenticated";

grant trigger on table "public"."tips" to "authenticated";

grant truncate on table "public"."tips" to "authenticated";

grant update on table "public"."tips" to "authenticated";

grant delete on table "public"."tips" to "service_role";

grant insert on table "public"."tips" to "service_role";

grant references on table "public"."tips" to "service_role";

grant select on table "public"."tips" to "service_role";

grant trigger on table "public"."tips" to "service_role";

grant truncate on table "public"."tips" to "service_role";

grant update on table "public"."tips" to "service_role";

create policy "Clients can create tips for their completed bookings"
on "public"."tips"
as permissive
for insert
to public
with check (((auth.uid() = client_id) AND (EXISTS ( SELECT 1
   FROM (bookings b
     JOIN appointments a ON ((a.booking_id = b.id)))
  WHERE ((b.id = tips.booking_id) AND (b.client_id = auth.uid()) AND (get_appointment_computed_status(a.start_time, a.end_time, a.status) = 'completed'::text))))));


create policy "Users can view tips for their bookings"
on "public"."tips"
as permissive
for select
to public
using ((EXISTS ( SELECT 1
   FROM bookings
  WHERE ((bookings.id = tips.booking_id) AND ((bookings.client_id = auth.uid()) OR (EXISTS ( SELECT 1
           FROM professional_profiles
          WHERE ((professional_profiles.id = bookings.professional_profile_id) AND (professional_profiles.user_id = auth.uid())))))))));



