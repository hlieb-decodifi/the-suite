create table "public"."customers" (
    "id" uuid not null default uuid_generate_v4(),
    "user_id" uuid not null,
    "stripe_customer_id" text not null,
    "created_at" timestamp with time zone not null default timezone('utc'::text, now())
);


alter table "public"."customers" enable row level security;

create table "public"."professional_subscriptions" (
    "id" uuid not null default uuid_generate_v4(),
    "professional_profile_id" uuid not null,
    "subscription_plan_id" uuid not null,
    "status" text not null,
    "start_date" timestamp with time zone not null default timezone('utc'::text, now()),
    "end_date" timestamp with time zone,
    "stripe_subscription_id" text,
    "created_at" timestamp with time zone not null default timezone('utc'::text, now()),
    "updated_at" timestamp with time zone not null default timezone('utc'::text, now())
);


alter table "public"."professional_subscriptions" enable row level security;

create table "public"."subscription_plans" (
    "id" uuid not null default uuid_generate_v4(),
    "name" text not null,
    "description" text,
    "price" numeric(10,2) not null,
    "interval" text not null,
    "stripe_price_id" text,
    "is_active" boolean default true,
    "created_at" timestamp with time zone not null default timezone('utc'::text, now()),
    "updated_at" timestamp with time zone not null default timezone('utc'::text, now())
);


alter table "public"."subscription_plans" enable row level security;

alter table "public"."professional_profiles" alter column "is_subscribed" set default false;

CREATE UNIQUE INDEX customers_pkey ON public.customers USING btree (id);

CREATE UNIQUE INDEX customers_user_id_key ON public.customers USING btree (user_id);

CREATE UNIQUE INDEX professional_subscriptions_pkey ON public.professional_subscriptions USING btree (id);

CREATE UNIQUE INDEX subscription_plans_pkey ON public.subscription_plans USING btree (id);

alter table "public"."customers" add constraint "customers_pkey" PRIMARY KEY using index "customers_pkey";

alter table "public"."professional_subscriptions" add constraint "professional_subscriptions_pkey" PRIMARY KEY using index "professional_subscriptions_pkey";

alter table "public"."subscription_plans" add constraint "subscription_plans_pkey" PRIMARY KEY using index "subscription_plans_pkey";

alter table "public"."customers" add constraint "customers_user_id_fkey" FOREIGN KEY (user_id) REFERENCES users(id) not valid;

alter table "public"."customers" validate constraint "customers_user_id_fkey";

alter table "public"."customers" add constraint "customers_user_id_key" UNIQUE using index "customers_user_id_key";

alter table "public"."professional_subscriptions" add constraint "professional_subscriptions_professional_profile_id_fkey" FOREIGN KEY (professional_profile_id) REFERENCES professional_profiles(id) not valid;

alter table "public"."professional_subscriptions" validate constraint "professional_subscriptions_professional_profile_id_fkey";

alter table "public"."professional_subscriptions" add constraint "professional_subscriptions_status_check" CHECK ((status = ANY (ARRAY['active'::text, 'cancelled'::text, 'expired'::text]))) not valid;

alter table "public"."professional_subscriptions" validate constraint "professional_subscriptions_status_check";

alter table "public"."professional_subscriptions" add constraint "professional_subscriptions_subscription_plan_id_fkey" FOREIGN KEY (subscription_plan_id) REFERENCES subscription_plans(id) not valid;

alter table "public"."professional_subscriptions" validate constraint "professional_subscriptions_subscription_plan_id_fkey";

alter table "public"."subscription_plans" add constraint "subscription_plans_interval_check" CHECK (("interval" = ANY (ARRAY['month'::text, 'year'::text]))) not valid;

alter table "public"."subscription_plans" validate constraint "subscription_plans_interval_check";

set check_function_bodies = off;

CREATE OR REPLACE FUNCTION public.update_professional_subscription_status()
 RETURNS trigger
 LANGUAGE plpgsql
AS $function$
begin
  -- If the subscription is being created or updated
  if (TG_OP = 'INSERT' OR TG_OP = 'UPDATE') then
    -- Set is_subscribed to true if the professional has an active subscription
    update professional_profiles
    set is_subscribed = true, updated_at = now()
    where id = new.professional_profile_id
    and exists (
      select 1 from professional_subscriptions
      where professional_profile_id = new.professional_profile_id
      and status = 'active'
    );
  end if;
  
  -- If the subscription is being deleted or updated (to non-active)
  if (TG_OP = 'DELETE' OR (TG_OP = 'UPDATE' AND new.status != 'active')) then
    -- Set is_subscribed to false if the professional has no active subscriptions
    update professional_profiles
    set is_subscribed = false, updated_at = now()
    where id = CASE WHEN TG_OP = 'DELETE' THEN old.professional_profile_id ELSE new.professional_profile_id END
    and not exists (
      select 1 from professional_subscriptions
      where professional_profile_id = CASE WHEN TG_OP = 'DELETE' THEN old.professional_profile_id ELSE new.professional_profile_id END
      and status = 'active'
    );
  end if;
  
  return CASE WHEN TG_OP = 'DELETE' THEN old ELSE new END;
end;
$function$
;

grant delete on table "public"."customers" to "anon";

grant insert on table "public"."customers" to "anon";

grant references on table "public"."customers" to "anon";

grant select on table "public"."customers" to "anon";

grant trigger on table "public"."customers" to "anon";

grant truncate on table "public"."customers" to "anon";

grant update on table "public"."customers" to "anon";

grant delete on table "public"."customers" to "authenticated";

grant insert on table "public"."customers" to "authenticated";

grant references on table "public"."customers" to "authenticated";

grant select on table "public"."customers" to "authenticated";

grant trigger on table "public"."customers" to "authenticated";

grant truncate on table "public"."customers" to "authenticated";

grant update on table "public"."customers" to "authenticated";

grant delete on table "public"."customers" to "service_role";

grant insert on table "public"."customers" to "service_role";

grant references on table "public"."customers" to "service_role";

grant select on table "public"."customers" to "service_role";

grant trigger on table "public"."customers" to "service_role";

grant truncate on table "public"."customers" to "service_role";

grant update on table "public"."customers" to "service_role";

grant delete on table "public"."professional_subscriptions" to "anon";

grant insert on table "public"."professional_subscriptions" to "anon";

grant references on table "public"."professional_subscriptions" to "anon";

grant select on table "public"."professional_subscriptions" to "anon";

grant trigger on table "public"."professional_subscriptions" to "anon";

grant truncate on table "public"."professional_subscriptions" to "anon";

grant update on table "public"."professional_subscriptions" to "anon";

grant delete on table "public"."professional_subscriptions" to "authenticated";

grant insert on table "public"."professional_subscriptions" to "authenticated";

grant references on table "public"."professional_subscriptions" to "authenticated";

grant select on table "public"."professional_subscriptions" to "authenticated";

grant trigger on table "public"."professional_subscriptions" to "authenticated";

grant truncate on table "public"."professional_subscriptions" to "authenticated";

grant update on table "public"."professional_subscriptions" to "authenticated";

grant delete on table "public"."professional_subscriptions" to "service_role";

grant insert on table "public"."professional_subscriptions" to "service_role";

grant references on table "public"."professional_subscriptions" to "service_role";

grant select on table "public"."professional_subscriptions" to "service_role";

grant trigger on table "public"."professional_subscriptions" to "service_role";

grant truncate on table "public"."professional_subscriptions" to "service_role";

grant update on table "public"."professional_subscriptions" to "service_role";

grant delete on table "public"."subscription_plans" to "anon";

grant insert on table "public"."subscription_plans" to "anon";

grant references on table "public"."subscription_plans" to "anon";

grant select on table "public"."subscription_plans" to "anon";

grant trigger on table "public"."subscription_plans" to "anon";

grant truncate on table "public"."subscription_plans" to "anon";

grant update on table "public"."subscription_plans" to "anon";

grant delete on table "public"."subscription_plans" to "authenticated";

grant insert on table "public"."subscription_plans" to "authenticated";

grant references on table "public"."subscription_plans" to "authenticated";

grant select on table "public"."subscription_plans" to "authenticated";

grant trigger on table "public"."subscription_plans" to "authenticated";

grant truncate on table "public"."subscription_plans" to "authenticated";

grant update on table "public"."subscription_plans" to "authenticated";

grant delete on table "public"."subscription_plans" to "service_role";

grant insert on table "public"."subscription_plans" to "service_role";

grant references on table "public"."subscription_plans" to "service_role";

grant select on table "public"."subscription_plans" to "service_role";

grant trigger on table "public"."subscription_plans" to "service_role";

grant truncate on table "public"."subscription_plans" to "service_role";

grant update on table "public"."subscription_plans" to "service_role";

create policy "Users can view their own customer data"
on "public"."customers"
as permissive
for select
to public
using ((auth.uid() = user_id));


create policy "Professionals can view their own subscriptions"
on "public"."professional_subscriptions"
as permissive
for select
to public
using ((EXISTS ( SELECT 1
   FROM professional_profiles
  WHERE ((professional_profiles.id = professional_subscriptions.professional_profile_id) AND (professional_profiles.user_id = auth.uid())))));


create policy "Anyone can view subscription plans"
on "public"."subscription_plans"
as permissive
for select
to public
using (true);


CREATE TRIGGER after_professional_subscription_delete AFTER DELETE ON public.professional_subscriptions FOR EACH ROW EXECUTE FUNCTION update_professional_subscription_status();

CREATE TRIGGER after_professional_subscription_insert AFTER INSERT ON public.professional_subscriptions FOR EACH ROW EXECUTE FUNCTION update_professional_subscription_status();

CREATE TRIGGER after_professional_subscription_update AFTER UPDATE ON public.professional_subscriptions FOR EACH ROW EXECUTE FUNCTION update_professional_subscription_status();


