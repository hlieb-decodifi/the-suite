create table "public"."refunds" (
    "id" uuid not null default uuid_generate_v4(),
    "appointment_id" uuid not null,
    "client_id" uuid not null,
    "professional_id" uuid not null,
    "booking_payment_id" uuid not null,
    "reason" text not null,
    "requested_amount" numeric(10,2),
    "original_amount" numeric(10,2) not null,
    "transaction_fee" numeric(10,2) not null default 0,
    "refund_amount" numeric(10,2),
    "status" text not null default 'pending'::text,
    "stripe_refund_id" text,
    "professional_notes" text,
    "declined_reason" text,
    "processed_at" timestamp with time zone,
    "created_at" timestamp with time zone not null default timezone('utc'::text, now()),
    "updated_at" timestamp with time zone not null default timezone('utc'::text, now())
);


alter table "public"."refunds" enable row level security;

CREATE INDEX idx_refunds_appointment_id ON public.refunds USING btree (appointment_id);

CREATE INDEX idx_refunds_client_id ON public.refunds USING btree (client_id);

CREATE INDEX idx_refunds_created_at ON public.refunds USING btree (created_at);

CREATE INDEX idx_refunds_professional_id ON public.refunds USING btree (professional_id);

CREATE INDEX idx_refunds_status ON public.refunds USING btree (status);

CREATE INDEX idx_refunds_stripe_refund_id ON public.refunds USING btree (stripe_refund_id) WHERE (stripe_refund_id IS NOT NULL);

CREATE UNIQUE INDEX refunds_appointment_id_key ON public.refunds USING btree (appointment_id);

CREATE UNIQUE INDEX refunds_pkey ON public.refunds USING btree (id);

alter table "public"."refunds" add constraint "refunds_pkey" PRIMARY KEY using index "refunds_pkey";

alter table "public"."refunds" add constraint "client_is_client" CHECK (is_client(client_id)) not valid;

alter table "public"."refunds" validate constraint "client_is_client";

alter table "public"."refunds" add constraint "professional_is_professional" CHECK (is_professional(professional_id)) not valid;

alter table "public"."refunds" validate constraint "professional_is_professional";

alter table "public"."refunds" add constraint "refunds_appointment_id_fkey" FOREIGN KEY (appointment_id) REFERENCES appointments(id) not valid;

alter table "public"."refunds" validate constraint "refunds_appointment_id_fkey";

alter table "public"."refunds" add constraint "refunds_appointment_id_key" UNIQUE using index "refunds_appointment_id_key";

alter table "public"."refunds" add constraint "refunds_booking_payment_id_fkey" FOREIGN KEY (booking_payment_id) REFERENCES booking_payments(id) not valid;

alter table "public"."refunds" validate constraint "refunds_booking_payment_id_fkey";

alter table "public"."refunds" add constraint "refunds_client_id_fkey" FOREIGN KEY (client_id) REFERENCES users(id) not valid;

alter table "public"."refunds" validate constraint "refunds_client_id_fkey";

alter table "public"."refunds" add constraint "refunds_professional_id_fkey" FOREIGN KEY (professional_id) REFERENCES users(id) not valid;

alter table "public"."refunds" validate constraint "refunds_professional_id_fkey";

alter table "public"."refunds" add constraint "refunds_status_check" CHECK ((status = ANY (ARRAY['pending'::text, 'approved'::text, 'processing'::text, 'completed'::text, 'declined'::text, 'failed'::text]))) not valid;

alter table "public"."refunds" validate constraint "refunds_status_check";

alter table "public"."refunds" add constraint "valid_refund_amount" CHECK (((requested_amount IS NULL) OR ((requested_amount > (0)::numeric) AND (requested_amount <= original_amount)))) not valid;

alter table "public"."refunds" validate constraint "valid_refund_amount";

set check_function_bodies = off;

CREATE OR REPLACE FUNCTION public.can_create_refund(p_appointment_id uuid, p_client_id uuid)
 RETURNS boolean
 LANGUAGE plpgsql
 SECURITY DEFINER
AS $function$
declare
  appointment_status text;
  appointment_client_id uuid;
  payment_method_online boolean;
  payment_status text;
  existing_refund_count integer;
begin
  -- Get appointment and payment details
  select a.status, b.client_id, pm.is_online, bp.status 
  into appointment_status, appointment_client_id, payment_method_online, payment_status
  from appointments a
  join bookings b on a.booking_id = b.id
  join booking_payments bp on b.id = bp.booking_id
  join payment_methods pm on bp.payment_method_id = pm.id
  where a.id = p_appointment_id;
  
  -- Check if appointment exists
  if appointment_status is null then
    return false;
  end if;
  
  -- Check if appointment is completed
  if appointment_status != 'completed' then
    return false;
  end if;
  
  -- Check if requesting user is the client for this appointment
  if appointment_client_id != p_client_id then
    return false;
  end if;
  
  -- Check if payment was made by card (online payment method)
  if payment_method_online != true then
    return false;
  end if;
  
  -- Check if payment was completed
  if payment_status != 'completed' then
    return false;
  end if;
  
  -- Check if refund already exists for this appointment
  select count(*) into existing_refund_count
  from refunds
  where appointment_id = p_appointment_id;
  
  if existing_refund_count > 0 then
    return false;
  end if;
  
  return true;
end;
$function$
;

CREATE OR REPLACE FUNCTION public.update_refunds_updated_at()
 RETURNS trigger
 LANGUAGE plpgsql
AS $function$
begin
  new.updated_at = timezone('utc'::text, now());
  return new;
end;
$function$
;

grant delete on table "public"."refunds" to "anon";

grant insert on table "public"."refunds" to "anon";

grant references on table "public"."refunds" to "anon";

grant select on table "public"."refunds" to "anon";

grant trigger on table "public"."refunds" to "anon";

grant truncate on table "public"."refunds" to "anon";

grant update on table "public"."refunds" to "anon";

grant delete on table "public"."refunds" to "authenticated";

grant insert on table "public"."refunds" to "authenticated";

grant references on table "public"."refunds" to "authenticated";

grant select on table "public"."refunds" to "authenticated";

grant trigger on table "public"."refunds" to "authenticated";

grant truncate on table "public"."refunds" to "authenticated";

grant update on table "public"."refunds" to "authenticated";

grant delete on table "public"."refunds" to "service_role";

grant insert on table "public"."refunds" to "service_role";

grant references on table "public"."refunds" to "service_role";

grant select on table "public"."refunds" to "service_role";

grant trigger on table "public"."refunds" to "service_role";

grant truncate on table "public"."refunds" to "service_role";

grant update on table "public"."refunds" to "service_role";

create policy "Clients can create refund requests for eligible appointments"
on "public"."refunds"
as permissive
for insert
to public
with check (((auth.uid() = client_id) AND can_create_refund(appointment_id, client_id)));


create policy "Clients can view their own refund requests"
on "public"."refunds"
as permissive
for select
to public
using ((auth.uid() = client_id));


create policy "Professionals can update refund requests for their appointments"
on "public"."refunds"
as permissive
for update
to public
using ((auth.uid() = professional_id))
with check ((auth.uid() = professional_id));


create policy "Professionals can view refund requests for their appointments"
on "public"."refunds"
as permissive
for select
to public
using ((auth.uid() = professional_id));


CREATE TRIGGER update_refunds_updated_at BEFORE UPDATE ON public.refunds FOR EACH ROW EXECUTE FUNCTION update_refunds_updated_at();


