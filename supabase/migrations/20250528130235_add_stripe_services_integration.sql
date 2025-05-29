alter table "public"."services" add column "stripe_price_id" text;

alter table "public"."services" add column "stripe_product_id" text;

alter table "public"."services" add column "stripe_status" text not null default 'draft'::text;

alter table "public"."services" add column "stripe_sync_error" text;

alter table "public"."services" add column "stripe_sync_status" text not null default 'pending'::text;

alter table "public"."services" add column "stripe_synced_at" timestamp with time zone;

CREATE INDEX idx_services_stripe_product_id ON public.services USING btree (stripe_product_id) WHERE (stripe_product_id IS NOT NULL);

CREATE INDEX idx_services_stripe_status ON public.services USING btree (stripe_status);

CREATE INDEX idx_services_stripe_sync_status ON public.services USING btree (stripe_sync_status);

alter table "public"."services" add constraint "services_stripe_status_check" CHECK ((stripe_status = ANY (ARRAY['draft'::text, 'active'::text, 'inactive'::text]))) not valid;

alter table "public"."services" validate constraint "services_stripe_status_check";

alter table "public"."services" add constraint "services_stripe_sync_status_check" CHECK ((stripe_sync_status = ANY (ARRAY['pending'::text, 'synced'::text, 'error'::text]))) not valid;

alter table "public"."services" validate constraint "services_stripe_sync_status_check";

set check_function_bodies = off;

CREATE OR REPLACE FUNCTION public.handle_payment_method_stripe_changes()
 RETURNS trigger
 LANGUAGE plpgsql
AS $function$
declare
  credit_card_method_id uuid;
  professional_has_credit_card boolean;
begin
  -- Get the credit card payment method ID
  select id into credit_card_method_id 
  from payment_methods 
  where name = 'Credit Card' or name = 'credit card' or name = 'Card'
  limit 1;
  
  if credit_card_method_id is null then
    return coalesce(new, old);
  end if;
  
  -- Check if this change involves the credit card payment method
  if (tg_op = 'INSERT' and new.payment_method_id = credit_card_method_id) or
     (tg_op = 'DELETE' and old.payment_method_id = credit_card_method_id) or
     (tg_op = 'UPDATE' and (old.payment_method_id = credit_card_method_id or new.payment_method_id = credit_card_method_id)) then
    
    -- Mark all services for this professional for re-sync
    update services 
    set stripe_sync_status = 'pending', 
        updated_at = timezone('utc'::text, now())
    where professional_profile_id = coalesce(new.professional_profile_id, old.professional_profile_id);
  end if;
  
  return coalesce(new, old);
end;
$function$
;

CREATE OR REPLACE FUNCTION public.handle_professional_profile_stripe_changes()
 RETURNS trigger
 LANGUAGE plpgsql
AS $function$
begin
  -- Mark all services for re-sync when key fields change that affect Stripe status
  if (old.is_published is distinct from new.is_published or 
      old.is_subscribed is distinct from new.is_subscribed or 
      old.stripe_connect_status is distinct from new.stripe_connect_status) then
    
    update services 
    set stripe_sync_status = 'pending', 
        updated_at = timezone('utc'::text, now())
    where professional_profile_id = new.id;
  end if;
  
  return new;
end;
$function$
;

CREATE OR REPLACE FUNCTION public.handle_service_stripe_sync()
 RETURNS trigger
 LANGUAGE plpgsql
AS $function$
begin
  -- Mark service for Stripe sync on any change
  new.stripe_sync_status = 'pending';
  new.updated_at = timezone('utc'::text, now());
  return new;
end;
$function$
;

CREATE TRIGGER payment_method_stripe_sync_trigger AFTER INSERT OR DELETE OR UPDATE ON public.professional_payment_methods FOR EACH ROW EXECUTE FUNCTION handle_payment_method_stripe_changes();

CREATE TRIGGER professional_profile_stripe_sync_trigger AFTER UPDATE ON public.professional_profiles FOR EACH ROW EXECUTE FUNCTION handle_professional_profile_stripe_changes();

CREATE TRIGGER service_stripe_sync_trigger BEFORE INSERT OR UPDATE ON public.services FOR EACH ROW EXECUTE FUNCTION handle_service_stripe_sync();


