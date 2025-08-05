create type "public"."support_request_category" as enum ('booking_issue', 'payment_issue', 'profile_issue', 'technical_issue', 'service_quality', 'billing_dispute', 'account_access', 'refund_request', 'other');

create type "public"."support_request_priority" as enum ('low', 'medium', 'high', 'urgent');

create type "public"."support_request_status" as enum ('pending', 'in_progress', 'resolved', 'closed');

drop trigger if exists "update_refunds_updated_at" on "public"."refunds";

drop policy "Clients can create refund requests for eligible appointments" on "public"."refunds";

drop policy "Clients can view their own refund requests" on "public"."refunds";

drop policy "Professionals can update refund requests for their appointments" on "public"."refunds";

drop policy "Professionals can view refund requests for their appointments" on "public"."refunds";

revoke delete on table "public"."refunds" from "anon";

revoke insert on table "public"."refunds" from "anon";

revoke references on table "public"."refunds" from "anon";

revoke select on table "public"."refunds" from "anon";

revoke trigger on table "public"."refunds" from "anon";

revoke truncate on table "public"."refunds" from "anon";

revoke update on table "public"."refunds" from "anon";

revoke delete on table "public"."refunds" from "authenticated";

revoke insert on table "public"."refunds" from "authenticated";

revoke references on table "public"."refunds" from "authenticated";

revoke select on table "public"."refunds" from "authenticated";

revoke trigger on table "public"."refunds" from "authenticated";

revoke truncate on table "public"."refunds" from "authenticated";

revoke update on table "public"."refunds" from "authenticated";

revoke delete on table "public"."refunds" from "service_role";

revoke insert on table "public"."refunds" from "service_role";

revoke references on table "public"."refunds" from "service_role";

revoke select on table "public"."refunds" from "service_role";

revoke trigger on table "public"."refunds" from "service_role";

revoke truncate on table "public"."refunds" from "service_role";

revoke update on table "public"."refunds" from "service_role";

alter table "public"."refunds" drop constraint "client_is_client";

alter table "public"."refunds" drop constraint "professional_is_professional";

alter table "public"."refunds" drop constraint "refunds_appointment_id_fkey";

alter table "public"."refunds" drop constraint "refunds_appointment_id_key";

alter table "public"."refunds" drop constraint "refunds_booking_payment_id_fkey";

alter table "public"."refunds" drop constraint "refunds_client_id_fkey";

alter table "public"."refunds" drop constraint "refunds_professional_id_fkey";

alter table "public"."refunds" drop constraint "refunds_status_check";

alter table "public"."refunds" drop constraint "valid_refund_amount";

alter table "public"."conversations" drop constraint "unique_conversation";

drop function if exists "public"."can_create_refund"(p_appointment_id uuid, p_client_id uuid);

drop function if exists "public"."update_refunds_updated_at"();

alter table "public"."refunds" drop constraint "refunds_pkey";

drop index if exists "public"."idx_refunds_appointment_id";

drop index if exists "public"."idx_refunds_client_id";

drop index if exists "public"."idx_refunds_created_at";

drop index if exists "public"."idx_refunds_professional_id";

drop index if exists "public"."idx_refunds_status";

drop index if exists "public"."idx_refunds_stripe_refund_id";

drop index if exists "public"."refunds_appointment_id_key";

drop index if exists "public"."refunds_pkey";

drop index if exists "public"."unique_conversation";

drop table "public"."refunds";

create table "public"."support_requests" (
    "id" uuid not null default uuid_generate_v4(),
    "client_id" uuid not null,
    "professional_id" uuid,
    "conversation_id" uuid not null,
    "title" text not null,
    "description" text not null,
    "category" support_request_category not null default 'other'::support_request_category,
    "priority" support_request_priority not null default 'medium'::support_request_priority,
    "status" support_request_status not null default 'pending'::support_request_status,
    "booking_id" uuid,
    "appointment_id" uuid,
    "booking_payment_id" uuid,
    "requested_amount" numeric(10,2),
    "original_amount" numeric(10,2),
    "transaction_fee" numeric(10,2) default 0,
    "refund_amount" numeric(10,2),
    "stripe_refund_id" text,
    "professional_notes" text,
    "declined_reason" text,
    "processed_at" timestamp with time zone,
    "resolved_at" timestamp with time zone,
    "resolved_by" uuid,
    "resolution_notes" text,
    "created_at" timestamp with time zone not null default timezone('utc'::text, now()),
    "updated_at" timestamp with time zone not null default timezone('utc'::text, now())
);


alter table "public"."support_requests" enable row level security;

alter table "public"."conversations" add column "purpose" text default 'general'::text;

CREATE INDEX idx_support_requests_appointment_id ON public.support_requests USING btree (appointment_id);

CREATE INDEX idx_support_requests_booking_id ON public.support_requests USING btree (booking_id);

CREATE INDEX idx_support_requests_category ON public.support_requests USING btree (category);

CREATE INDEX idx_support_requests_client_id ON public.support_requests USING btree (client_id);

CREATE INDEX idx_support_requests_conversation_id ON public.support_requests USING btree (conversation_id);

CREATE INDEX idx_support_requests_created_at ON public.support_requests USING btree (created_at);

CREATE INDEX idx_support_requests_priority ON public.support_requests USING btree (priority);

CREATE INDEX idx_support_requests_professional_id ON public.support_requests USING btree (professional_id);

CREATE INDEX idx_support_requests_status ON public.support_requests USING btree (status);

CREATE INDEX idx_support_requests_stripe_refund_id ON public.support_requests USING btree (stripe_refund_id) WHERE (stripe_refund_id IS NOT NULL);

CREATE UNIQUE INDEX refund_appointment_unique ON public.support_requests USING btree (appointment_id);

CREATE UNIQUE INDEX support_requests_pkey ON public.support_requests USING btree (id);

CREATE UNIQUE INDEX unique_conversation ON public.conversations USING btree (client_id, professional_id, purpose);

alter table "public"."support_requests" add constraint "support_requests_pkey" PRIMARY KEY using index "support_requests_pkey";

alter table "public"."support_requests" add constraint "client_is_client" CHECK (is_client(client_id)) not valid;

alter table "public"."support_requests" validate constraint "client_is_client";

alter table "public"."support_requests" add constraint "professional_is_professional" CHECK (((professional_id IS NULL) OR is_professional(professional_id))) not valid;

alter table "public"."support_requests" validate constraint "professional_is_professional";

alter table "public"."support_requests" add constraint "refund_appointment_unique" UNIQUE using index "refund_appointment_unique" DEFERRABLE INITIALLY DEFERRED;

alter table "public"."support_requests" add constraint "refund_fields_consistency" CHECK (((category <> 'refund_request'::support_request_category) OR ((appointment_id IS NOT NULL) AND (booking_payment_id IS NOT NULL) AND (original_amount IS NOT NULL)))) not valid;

alter table "public"."support_requests" validate constraint "refund_fields_consistency";

alter table "public"."support_requests" add constraint "resolved_by_is_professional" CHECK (((resolved_by IS NULL) OR is_professional(resolved_by))) not valid;

alter table "public"."support_requests" validate constraint "resolved_by_is_professional";

alter table "public"."support_requests" add constraint "resolved_status_consistency" CHECK ((((status = ANY (ARRAY['resolved'::support_request_status, 'closed'::support_request_status])) AND (resolved_at IS NOT NULL) AND (resolved_by IS NOT NULL)) OR ((status <> ALL (ARRAY['resolved'::support_request_status, 'closed'::support_request_status])) AND (resolved_at IS NULL)))) not valid;

alter table "public"."support_requests" validate constraint "resolved_status_consistency";

alter table "public"."support_requests" add constraint "support_requests_appointment_id_fkey" FOREIGN KEY (appointment_id) REFERENCES appointments(id) not valid;

alter table "public"."support_requests" validate constraint "support_requests_appointment_id_fkey";

alter table "public"."support_requests" add constraint "support_requests_booking_id_fkey" FOREIGN KEY (booking_id) REFERENCES bookings(id) not valid;

alter table "public"."support_requests" validate constraint "support_requests_booking_id_fkey";

alter table "public"."support_requests" add constraint "support_requests_booking_payment_id_fkey" FOREIGN KEY (booking_payment_id) REFERENCES booking_payments(id) not valid;

alter table "public"."support_requests" validate constraint "support_requests_booking_payment_id_fkey";

alter table "public"."support_requests" add constraint "support_requests_client_id_fkey" FOREIGN KEY (client_id) REFERENCES users(id) not valid;

alter table "public"."support_requests" validate constraint "support_requests_client_id_fkey";

alter table "public"."support_requests" add constraint "support_requests_conversation_id_fkey" FOREIGN KEY (conversation_id) REFERENCES conversations(id) not valid;

alter table "public"."support_requests" validate constraint "support_requests_conversation_id_fkey";

alter table "public"."support_requests" add constraint "support_requests_professional_id_fkey" FOREIGN KEY (professional_id) REFERENCES users(id) not valid;

alter table "public"."support_requests" validate constraint "support_requests_professional_id_fkey";

alter table "public"."support_requests" add constraint "support_requests_resolved_by_fkey" FOREIGN KEY (resolved_by) REFERENCES users(id) not valid;

alter table "public"."support_requests" validate constraint "support_requests_resolved_by_fkey";

alter table "public"."support_requests" add constraint "valid_refund_amount" CHECK (((category <> 'refund_request'::support_request_category) OR (requested_amount IS NULL) OR ((requested_amount > (0)::numeric) AND (requested_amount <= original_amount)))) not valid;

alter table "public"."support_requests" validate constraint "valid_refund_amount";

alter table "public"."conversations" add constraint "unique_conversation" UNIQUE using index "unique_conversation";

set check_function_bodies = off;

CREATE OR REPLACE FUNCTION public.can_create_refund_request(p_appointment_id uuid, p_client_id uuid)
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
  
  -- Check if refund request already exists for this appointment
  select count(*) into existing_refund_count
  from support_requests
  where appointment_id = p_appointment_id and category = 'refund_request';
  
  if existing_refund_count > 0 then
    return false;
  end if;
  
  return true;
end;
$function$
;

CREATE OR REPLACE FUNCTION public.check_support_request_messaging()
 RETURNS trigger
 LANGUAGE plpgsql
AS $function$
declare
  support_request_status support_request_status;
begin
  -- Check if this conversation is linked to a support request
  select sr.status into support_request_status
  from support_requests sr
  where sr.conversation_id = new.conversation_id;
  
  -- If linked to support request and it's resolved/closed, prevent new messages
  if support_request_status in ('resolved', 'closed') then
    raise exception 'Cannot send messages to a % support request', support_request_status;
  end if;
  
  return new;
end;
$function$
;

CREATE OR REPLACE FUNCTION public.create_support_conversation(p_client_id uuid, p_professional_id uuid DEFAULT NULL::uuid, p_purpose text DEFAULT 'support_request'::text)
 RETURNS uuid
 LANGUAGE plpgsql
 SECURITY DEFINER
AS $function$
declare
  conversation_uuid uuid;
  default_professional_id uuid;
begin
  -- If no professional specified, use a default support professional or admin
  if p_professional_id is null then
    -- Find first admin user to handle support requests
    select u.id into default_professional_id
    from users u
    join roles r on u.role_id = r.id
    where r.name = 'admin'
    limit 1;
    
    -- If no admin found, find any professional
    if default_professional_id is null then
      select u.id into default_professional_id
      from users u
      join roles r on u.role_id = r.id
      where r.name = 'professional'
      limit 1;
    end if;
    
    p_professional_id := default_professional_id;
  end if;
  
  -- Create a new conversation with specific purpose
  -- Note: Support requests always create new conversations for isolation
  insert into conversations (client_id, professional_id, purpose)
  values (p_client_id, p_professional_id, p_purpose)
  on conflict (client_id, professional_id, purpose) 
  do update set updated_at = timezone('utc'::text, now())
  returning id into conversation_uuid;
  
  return conversation_uuid;
end;
$function$
;

CREATE OR REPLACE FUNCTION public.update_support_request_status(p_request_id uuid, p_new_status support_request_status, p_resolved_by uuid DEFAULT NULL::uuid, p_resolution_notes text DEFAULT NULL::text)
 RETURNS boolean
 LANGUAGE plpgsql
 SECURITY DEFINER
AS $function$
declare
  current_status support_request_status;
begin
  -- Get current status
  select status into current_status
  from support_requests
  where id = p_request_id;
  
  -- Validate status transition
  if current_status = 'closed' then
    raise exception 'Cannot change status of a closed support request';
  end if;
  
  -- Update the support request
  update support_requests
  set 
    status = p_new_status,
    resolved_at = case 
      when p_new_status in ('resolved', 'closed') then timezone('utc'::text, now())
      else null 
    end,
    resolved_by = case 
      when p_new_status in ('resolved', 'closed') then coalesce(p_resolved_by, auth.uid())
      else null 
    end,
    resolution_notes = case 
      when p_new_status in ('resolved', 'closed') then p_resolution_notes
      else resolution_notes 
    end,
    updated_at = timezone('utc'::text, now())
  where id = p_request_id;
  
  return true;
end;
$function$
;

grant delete on table "public"."support_requests" to "anon";

grant insert on table "public"."support_requests" to "anon";

grant references on table "public"."support_requests" to "anon";

grant select on table "public"."support_requests" to "anon";

grant trigger on table "public"."support_requests" to "anon";

grant truncate on table "public"."support_requests" to "anon";

grant update on table "public"."support_requests" to "anon";

grant delete on table "public"."support_requests" to "authenticated";

grant insert on table "public"."support_requests" to "authenticated";

grant references on table "public"."support_requests" to "authenticated";

grant select on table "public"."support_requests" to "authenticated";

grant trigger on table "public"."support_requests" to "authenticated";

grant truncate on table "public"."support_requests" to "authenticated";

grant update on table "public"."support_requests" to "authenticated";

grant delete on table "public"."support_requests" to "service_role";

grant insert on table "public"."support_requests" to "service_role";

grant references on table "public"."support_requests" to "service_role";

grant select on table "public"."support_requests" to "service_role";

grant trigger on table "public"."support_requests" to "service_role";

grant truncate on table "public"."support_requests" to "service_role";

grant update on table "public"."support_requests" to "service_role";

create policy "Clients can create support requests"
on "public"."support_requests"
as permissive
for insert
to public
with check (((auth.uid() = client_id) AND is_client(client_id) AND ((professional_id IS NULL) OR is_professional(professional_id)) AND ((category <> 'refund_request'::support_request_category) OR ((appointment_id IS NOT NULL) AND can_create_refund_request(appointment_id, client_id)))));


create policy "Clients can view their own support requests"
on "public"."support_requests"
as permissive
for select
to public
using ((auth.uid() = client_id));


create policy "Professionals can update support request status and resolution"
on "public"."support_requests"
as permissive
for update
to public
using (((auth.uid() = professional_id) OR (EXISTS ( SELECT 1
   FROM conversations c
  WHERE ((c.id = support_requests.conversation_id) AND (c.professional_id = auth.uid()))))));


create policy "Professionals can view support requests in their conversations"
on "public"."support_requests"
as permissive
for select
to public
using ((EXISTS ( SELECT 1
   FROM conversations c
  WHERE ((c.id = support_requests.conversation_id) AND (c.professional_id = auth.uid())))));


create policy "Professionals can view support requests they are assigned to"
on "public"."support_requests"
as permissive
for select
to public
using ((auth.uid() = professional_id));


CREATE TRIGGER prevent_messaging_resolved_support BEFORE INSERT ON public.messages FOR EACH ROW EXECUTE FUNCTION check_support_request_messaging();


