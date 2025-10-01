create extension if not exists "uuid-ossp";

create extension if not exists "moddatetime" with schema "extensions";


create table "public"."addresses" (
    "id" uuid not null default uuid_generate_v4(),
    "country" text,
    "state" text,
    "city" text,
    "street_address" text,
    "apartment" text,
    "latitude" numeric(10,8),
    "longitude" numeric(11,8),
    "google_place_id" text,
    "created_at" timestamp with time zone not null default timezone('utc'::text, now()),
    "updated_at" timestamp with time zone not null default timezone('utc'::text, now())
);


alter table "public"."addresses" enable row level security;

create table "public"."admin_configs" (
    "id" uuid not null default uuid_generate_v4(),
    "key" text not null,
    "value" text not null,
    "description" text not null,
    "data_type" text not null,
    "created_at" timestamp with time zone not null default timezone('utc'::text, now()),
    "updated_at" timestamp with time zone not null default timezone('utc'::text, now())
);


alter table "public"."admin_configs" enable row level security;

create table "public"."appointments" (
    "id" uuid not null default uuid_generate_v4(),
    "booking_id" uuid not null,
    "start_time" timestamp with time zone not null,
    "end_time" timestamp with time zone not null,
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
    "stripe_payment_method_id" text,
    "stripe_checkout_session_id" text,
    "deposit_amount" numeric(10,2) not null default 0,
    "balance_amount" numeric(10,2) not null default 0,
    "payment_type" text not null default 'full'::text,
    "requires_balance_payment" boolean not null default false,
    "created_at" timestamp with time zone not null default timezone('utc'::text, now()),
    "updated_at" timestamp with time zone not null default timezone('utc'::text, now()),
    "capture_method" text default 'automatic'::text,
    "authorization_expires_at" timestamp with time zone,
    "pre_auth_scheduled_for" timestamp with time zone,
    "capture_scheduled_for" timestamp with time zone,
    "captured_at" timestamp with time zone,
    "pre_auth_placed_at" timestamp with time zone,
    "balance_notification_sent_at" timestamp with time zone,
    "refunded_amount" numeric(10,2) not null default 0,
    "refund_reason" text,
    "refunded_at" timestamp with time zone,
    "refund_transaction_id" text
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

create table "public"."client_profiles" (
    "id" uuid not null default uuid_generate_v4(),
    "user_id" uuid not null,
    "phone_number" text,
    "location" text,
    "address_id" uuid,
    "created_at" timestamp with time zone not null default timezone('utc'::text, now()),
    "updated_at" timestamp with time zone not null default timezone('utc'::text, now())
);


alter table "public"."client_profiles" enable row level security;

create table "public"."contact_inquiries" (
    "id" uuid not null default uuid_generate_v4(),
    "name" text not null,
    "email" text not null,
    "phone" text,
    "subject" text not null,
    "message" text not null,
    "urgency" text not null default 'medium'::text,
    "status" text not null default 'new'::text,
    "user_id" uuid,
    "page_url" text,
    "user_agent" text,
    "attachments" jsonb default '[]'::jsonb,
    "admin_notes" text,
    "assigned_to" uuid,
    "resolved_at" timestamp with time zone,
    "created_at" timestamp with time zone not null default timezone('utc'::text, now()),
    "updated_at" timestamp with time zone not null default timezone('utc'::text, now())
);


alter table "public"."contact_inquiries" enable row level security;

create table "public"."conversations" (
    "id" uuid not null default uuid_generate_v4(),
    "client_id" uuid not null,
    "professional_id" uuid not null,
    "created_at" timestamp with time zone not null default timezone('utc'::text, now()),
    "updated_at" timestamp with time zone not null default timezone('utc'::text, now())
);


alter table "public"."conversations" enable row level security;

create table "public"."customers" (
    "id" uuid not null default uuid_generate_v4(),
    "user_id" uuid not null,
    "stripe_customer_id" text not null,
    "created_at" timestamp with time zone not null default timezone('utc'::text, now())
);


alter table "public"."customers" enable row level security;

create table "public"."email_templates" (
    "id" uuid not null default uuid_generate_v4(),
    "name" text not null,
    "description" text,
    "tag" text not null,
    "sender_name" text not null,
    "sender_email" text not null,
    "reply_to" text,
    "subject" text not null,
    "html_content" text not null,
    "to_field" text not null,
    "is_active" boolean not null default true,
    "created_at" timestamp with time zone not null default timezone('utc'::text, now()),
    "updated_at" timestamp with time zone not null default timezone('utc'::text, now())
);


alter table "public"."email_templates" enable row level security;

create table "public"."legal_documents" (
    "id" uuid not null default uuid_generate_v4(),
    "type" text not null,
    "title" text not null,
    "content" text not null,
    "version" integer not null default 1,
    "is_published" boolean not null default false,
    "effective_date" timestamp with time zone,
    "created_by" uuid,
    "created_at" timestamp with time zone not null default timezone('utc'::text, now()),
    "updated_at" timestamp with time zone not null default timezone('utc'::text, now())
);


alter table "public"."legal_documents" enable row level security;

create table "public"."message_attachments" (
    "id" uuid not null default gen_random_uuid(),
    "message_id" uuid not null,
    "url" text not null,
    "type" text not null,
    "file_name" text not null,
    "file_size" integer not null,
    "created_at" timestamp with time zone not null default timezone('utc'::text, now()),
    "updated_at" timestamp with time zone not null default timezone('utc'::text, now())
);


alter table "public"."message_attachments" enable row level security;

create table "public"."messages" (
    "id" uuid not null default uuid_generate_v4(),
    "conversation_id" uuid not null,
    "sender_id" uuid not null,
    "content" text not null,
    "is_read" boolean not null default false,
    "created_at" timestamp with time zone not null default timezone('utc'::text, now()),
    "updated_at" timestamp with time zone not null default timezone('utc'::text, now())
);


alter table "public"."messages" enable row level security;

create table "public"."payment_methods" (
    "id" uuid not null default uuid_generate_v4(),
    "name" text not null,
    "is_online" boolean not null default false,
    "created_at" timestamp with time zone not null default timezone('utc'::text, now())
);


alter table "public"."payment_methods" enable row level security;

create table "public"."portfolio_photos" (
    "id" uuid not null default uuid_generate_v4(),
    "user_id" uuid not null,
    "url" text not null,
    "filename" text not null,
    "description" text,
    "order_index" integer not null default 0,
    "created_at" timestamp with time zone not null default timezone('utc'::text, now()),
    "updated_at" timestamp with time zone not null default timezone('utc'::text, now())
);


alter table "public"."portfolio_photos" enable row level security;

create table "public"."professional_payment_methods" (
    "id" uuid not null default uuid_generate_v4(),
    "professional_profile_id" uuid not null,
    "payment_method_id" uuid not null,
    "created_at" timestamp with time zone not null default timezone('utc'::text, now())
);


alter table "public"."professional_payment_methods" enable row level security;

create table "public"."professional_profiles" (
    "id" uuid not null default uuid_generate_v4(),
    "user_id" uuid not null,
    "description" text,
    "profession" text,
    "appointment_requirements" text,
    "phone_number" text,
    "working_hours" jsonb,
    "timezone" text,
    "location" text,
    "address_id" uuid,
    "facebook_url" text,
    "instagram_url" text,
    "tiktok_url" text,
    "is_published" boolean default false,
    "is_subscribed" boolean default false,
    "stripe_account_id" text,
    "stripe_connect_status" text not null default 'not_connected'::text,
    "stripe_connect_updated_at" timestamp with time zone,
    "requires_deposit" boolean not null default false,
    "deposit_type" text default 'percentage'::text,
    "deposit_value" numeric(10,2),
    "allow_messages" boolean not null default true,
    "hide_full_address" boolean not null default false,
    "cancellation_policy_enabled" boolean not null default false,
    "cancellation_24h_charge_percentage" numeric(5,2) not null default 50.00,
    "cancellation_48h_charge_percentage" numeric(5,2) not null default 25.00,
    "created_at" timestamp with time zone not null default timezone('utc'::text, now()),
    "updated_at" timestamp with time zone not null default timezone('utc'::text, now())
);


alter table "public"."professional_profiles" enable row level security;

create table "public"."professional_subscriptions" (
    "id" uuid not null default uuid_generate_v4(),
    "professional_profile_id" uuid not null,
    "subscription_plan_id" uuid not null,
    "status" text not null,
    "start_date" timestamp with time zone not null default timezone('utc'::text, now()),
    "end_date" timestamp with time zone,
    "stripe_subscription_id" text,
    "cancel_at_period_end" boolean not null default false,
    "created_at" timestamp with time zone not null default timezone('utc'::text, now()),
    "updated_at" timestamp with time zone not null default timezone('utc'::text, now())
);


alter table "public"."professional_subscriptions" enable row level security;

create table "public"."profile_photos" (
    "id" uuid not null default uuid_generate_v4(),
    "user_id" uuid not null,
    "url" text not null,
    "filename" text not null,
    "created_at" timestamp with time zone not null default timezone('utc'::text, now()),
    "updated_at" timestamp with time zone not null default timezone('utc'::text, now())
);


alter table "public"."profile_photos" enable row level security;

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

create table "public"."reviews" (
    "id" uuid not null default uuid_generate_v4(),
    "appointment_id" uuid not null,
    "client_id" uuid not null,
    "professional_id" uuid not null,
    "score" integer not null,
    "message" text not null,
    "created_at" timestamp with time zone not null default timezone('utc'::text, now()),
    "updated_at" timestamp with time zone not null default timezone('utc'::text, now())
);


alter table "public"."reviews" enable row level security;

create table "public"."roles" (
    "id" uuid not null default uuid_generate_v4(),
    "name" text not null,
    "created_at" timestamp with time zone not null default timezone('utc'::text, now()),
    "updated_at" timestamp with time zone not null default timezone('utc'::text, now())
);


alter table "public"."roles" enable row level security;

create table "public"."service_limits" (
    "id" uuid not null default uuid_generate_v4(),
    "professional_profile_id" uuid not null,
    "max_services" integer not null default 50,
    "created_at" timestamp with time zone not null default timezone('utc'::text, now()),
    "updated_at" timestamp with time zone not null default timezone('utc'::text, now())
);


alter table "public"."service_limits" enable row level security;

create table "public"."services" (
    "id" uuid not null default uuid_generate_v4(),
    "professional_profile_id" uuid not null,
    "name" text not null,
    "description" text,
    "price" numeric(10,2) not null,
    "duration" integer not null,
    "stripe_product_id" text,
    "stripe_price_id" text,
    "stripe_status" text not null default 'draft'::text,
    "stripe_sync_status" text not null default 'pending'::text,
    "stripe_sync_error" text,
    "stripe_synced_at" timestamp with time zone,
    "created_at" timestamp with time zone not null default timezone('utc'::text, now()),
    "updated_at" timestamp with time zone not null default timezone('utc'::text, now())
);


alter table "public"."services" enable row level security;

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

create table "public"."users" (
    "id" uuid not null,
    "first_name" text not null,
    "last_name" text not null,
    "role_id" uuid not null,
    "created_at" timestamp with time zone not null default timezone('utc'::text, now()),
    "updated_at" timestamp with time zone not null default timezone('utc'::text, now())
);


alter table "public"."users" enable row level security;

CREATE OR REPLACE FUNCTION public.is_client(user_uuid uuid)
 RETURNS boolean
 LANGUAGE plpgsql
 SECURITY DEFINER
AS $function$
declare
  is_client boolean;
begin
  select exists(
    select 1 from users
    join roles on users.role_id = roles.id
    where users.id = user_uuid
    and roles.name = 'client'
  ) into is_client;
  
  return is_client;
end;
$function$
;

CREATE OR REPLACE FUNCTION public.is_professional(user_uuid uuid)
 RETURNS boolean
 LANGUAGE plpgsql
 SECURITY DEFINER
AS $function$
declare
  is_professional boolean;
begin
  select exists(
    select 1 from users
    join roles on users.role_id = roles.id
    where users.id = user_uuid
    and roles.name = 'professional'
  ) into is_professional;
  
  return is_professional;
end;
$function$
;

CREATE UNIQUE INDEX addresses_pkey ON public.addresses USING btree (id);

CREATE UNIQUE INDEX admin_configs_key_key ON public.admin_configs USING btree (key);

CREATE UNIQUE INDEX admin_configs_pkey ON public.admin_configs USING btree (id);

CREATE UNIQUE INDEX appointments_pkey ON public.appointments USING btree (id);

CREATE UNIQUE INDEX booking_payments_booking_id_key ON public.booking_payments USING btree (booking_id);

CREATE UNIQUE INDEX booking_payments_pkey ON public.booking_payments USING btree (id);

CREATE UNIQUE INDEX booking_services_pkey ON public.booking_services USING btree (id);

CREATE UNIQUE INDEX bookings_pkey ON public.bookings USING btree (id);

CREATE UNIQUE INDEX client_profiles_pkey ON public.client_profiles USING btree (id);

CREATE UNIQUE INDEX client_profiles_user_id_key ON public.client_profiles USING btree (user_id);

CREATE UNIQUE INDEX contact_inquiries_pkey ON public.contact_inquiries USING btree (id);

CREATE UNIQUE INDEX conversations_pkey ON public.conversations USING btree (id);

CREATE UNIQUE INDEX customers_pkey ON public.customers USING btree (id);

CREATE UNIQUE INDEX customers_user_id_key ON public.customers USING btree (user_id);

CREATE UNIQUE INDEX email_templates_pkey ON public.email_templates USING btree (id);

CREATE INDEX idx_addresses_coordinates ON public.addresses USING btree (latitude, longitude) WHERE ((latitude IS NOT NULL) AND (longitude IS NOT NULL));

CREATE INDEX idx_addresses_google_place_id ON public.addresses USING btree (google_place_id) WHERE (google_place_id IS NOT NULL);

CREATE INDEX idx_admin_configs_key ON public.admin_configs USING btree (key);

CREATE INDEX idx_booking_payments_capture_scheduled ON public.booking_payments USING btree (capture_scheduled_for) WHERE ((capture_scheduled_for IS NOT NULL) AND (status = ANY (ARRAY['pending'::text, 'authorized'::text])));

CREATE INDEX idx_booking_payments_pre_auth_scheduled ON public.booking_payments USING btree (pre_auth_scheduled_for) WHERE ((pre_auth_scheduled_for IS NOT NULL) AND (status = ANY (ARRAY['incomplete'::text, 'pending'::text])));

CREATE INDEX idx_booking_payments_refunded_at ON public.booking_payments USING btree (refunded_at) WHERE (refunded_at IS NOT NULL);

CREATE INDEX idx_booking_payments_stripe_checkout_session_id ON public.booking_payments USING btree (stripe_checkout_session_id) WHERE (stripe_checkout_session_id IS NOT NULL);

CREATE INDEX idx_contact_inquiries_assigned_to ON public.contact_inquiries USING btree (assigned_to);

CREATE INDEX idx_contact_inquiries_created_at ON public.contact_inquiries USING btree (created_at);

CREATE INDEX idx_contact_inquiries_status ON public.contact_inquiries USING btree (status);

CREATE INDEX idx_contact_inquiries_user_id ON public.contact_inquiries USING btree (user_id);

CREATE INDEX idx_conversations_client_id ON public.conversations USING btree (client_id);

CREATE INDEX idx_conversations_professional_id ON public.conversations USING btree (professional_id);

CREATE INDEX idx_email_templates_is_active ON public.email_templates USING btree (is_active);

CREATE INDEX idx_email_templates_tag ON public.email_templates USING btree (tag);

CREATE INDEX idx_legal_documents_published ON public.legal_documents USING btree (type, is_published) WHERE (is_published = true);

CREATE INDEX idx_legal_documents_type ON public.legal_documents USING btree (type);

CREATE INDEX idx_messages_conversation_id ON public.messages USING btree (conversation_id);

CREATE INDEX idx_messages_created_at ON public.messages USING btree (created_at);

CREATE INDEX idx_messages_sender_id ON public.messages USING btree (sender_id);

CREATE INDEX idx_professional_profiles_stripe_account_id ON public.professional_profiles USING btree (stripe_account_id) WHERE (stripe_account_id IS NOT NULL);

CREATE INDEX idx_professional_profiles_stripe_connect_status ON public.professional_profiles USING btree (stripe_connect_status);

CREATE INDEX idx_refunds_appointment_id ON public.refunds USING btree (appointment_id);

CREATE INDEX idx_refunds_client_id ON public.refunds USING btree (client_id);

CREATE INDEX idx_refunds_created_at ON public.refunds USING btree (created_at);

CREATE INDEX idx_refunds_professional_id ON public.refunds USING btree (professional_id);

CREATE INDEX idx_refunds_status ON public.refunds USING btree (status);

CREATE INDEX idx_refunds_stripe_refund_id ON public.refunds USING btree (stripe_refund_id) WHERE (stripe_refund_id IS NOT NULL);

CREATE INDEX idx_reviews_appointment_id ON public.reviews USING btree (appointment_id);

CREATE INDEX idx_reviews_client_id ON public.reviews USING btree (client_id);

CREATE INDEX idx_reviews_created_at ON public.reviews USING btree (created_at);

CREATE INDEX idx_reviews_professional_id ON public.reviews USING btree (professional_id);

CREATE INDEX idx_reviews_score ON public.reviews USING btree (score);

CREATE INDEX idx_services_stripe_product_id ON public.services USING btree (stripe_product_id) WHERE (stripe_product_id IS NOT NULL);

CREATE INDEX idx_services_stripe_status ON public.services USING btree (stripe_status);

CREATE INDEX idx_services_stripe_sync_status ON public.services USING btree (stripe_sync_status);

CREATE UNIQUE INDEX legal_documents_pkey ON public.legal_documents USING btree (id);

CREATE UNIQUE INDEX message_attachments_pkey ON public.message_attachments USING btree (id);

CREATE UNIQUE INDEX messages_pkey ON public.messages USING btree (id);

CREATE UNIQUE INDEX payment_methods_name_key ON public.payment_methods USING btree (name);

CREATE UNIQUE INDEX payment_methods_pkey ON public.payment_methods USING btree (id);

CREATE UNIQUE INDEX portfolio_photos_pkey ON public.portfolio_photos USING btree (id);

CREATE UNIQUE INDEX professional_payment_methods_pkey ON public.professional_payment_methods USING btree (id);

CREATE UNIQUE INDEX professional_profiles_pkey ON public.professional_profiles USING btree (id);

CREATE UNIQUE INDEX professional_profiles_user_id_key ON public.professional_profiles USING btree (user_id);

CREATE UNIQUE INDEX professional_subscriptions_pkey ON public.professional_subscriptions USING btree (id);

CREATE UNIQUE INDEX profile_photos_pkey ON public.profile_photos USING btree (id);

CREATE UNIQUE INDEX profile_photos_user_id_key ON public.profile_photos USING btree (user_id);

CREATE UNIQUE INDEX refunds_appointment_id_key ON public.refunds USING btree (appointment_id);

CREATE UNIQUE INDEX refunds_pkey ON public.refunds USING btree (id);

CREATE UNIQUE INDEX reviews_appointment_id_key ON public.reviews USING btree (appointment_id);

CREATE UNIQUE INDEX reviews_pkey ON public.reviews USING btree (id);

CREATE UNIQUE INDEX roles_name_key ON public.roles USING btree (name);

CREATE UNIQUE INDEX roles_pkey ON public.roles USING btree (id);

CREATE UNIQUE INDEX service_limits_pkey ON public.service_limits USING btree (id);

CREATE UNIQUE INDEX service_limits_professional_profile_id_key ON public.service_limits USING btree (professional_profile_id);

CREATE UNIQUE INDEX services_pkey ON public.services USING btree (id);

CREATE UNIQUE INDEX subscription_plans_pkey ON public.subscription_plans USING btree (id);

CREATE UNIQUE INDEX unique_conversation ON public.conversations USING btree (client_id, professional_id);

CREATE UNIQUE INDEX unique_professional_payment_method ON public.professional_payment_methods USING btree (professional_profile_id, payment_method_id);

CREATE UNIQUE INDEX unique_published_per_type ON public.legal_documents USING btree (type, is_published);

CREATE UNIQUE INDEX unique_template_name ON public.email_templates USING btree (name);

CREATE UNIQUE INDEX unique_template_tag ON public.email_templates USING btree (tag);

CREATE UNIQUE INDEX users_pkey ON public.users USING btree (id);

alter table "public"."addresses" add constraint "addresses_pkey" PRIMARY KEY using index "addresses_pkey";

alter table "public"."admin_configs" add constraint "admin_configs_pkey" PRIMARY KEY using index "admin_configs_pkey";

alter table "public"."appointments" add constraint "appointments_pkey" PRIMARY KEY using index "appointments_pkey";

alter table "public"."booking_payments" add constraint "booking_payments_pkey" PRIMARY KEY using index "booking_payments_pkey";

alter table "public"."booking_services" add constraint "booking_services_pkey" PRIMARY KEY using index "booking_services_pkey";

alter table "public"."bookings" add constraint "bookings_pkey" PRIMARY KEY using index "bookings_pkey";

alter table "public"."client_profiles" add constraint "client_profiles_pkey" PRIMARY KEY using index "client_profiles_pkey";

alter table "public"."contact_inquiries" add constraint "contact_inquiries_pkey" PRIMARY KEY using index "contact_inquiries_pkey";

alter table "public"."conversations" add constraint "conversations_pkey" PRIMARY KEY using index "conversations_pkey";

alter table "public"."customers" add constraint "customers_pkey" PRIMARY KEY using index "customers_pkey";

alter table "public"."email_templates" add constraint "email_templates_pkey" PRIMARY KEY using index "email_templates_pkey";

alter table "public"."legal_documents" add constraint "legal_documents_pkey" PRIMARY KEY using index "legal_documents_pkey";

alter table "public"."message_attachments" add constraint "message_attachments_pkey" PRIMARY KEY using index "message_attachments_pkey";

alter table "public"."messages" add constraint "messages_pkey" PRIMARY KEY using index "messages_pkey";

alter table "public"."payment_methods" add constraint "payment_methods_pkey" PRIMARY KEY using index "payment_methods_pkey";

alter table "public"."portfolio_photos" add constraint "portfolio_photos_pkey" PRIMARY KEY using index "portfolio_photos_pkey";

alter table "public"."professional_payment_methods" add constraint "professional_payment_methods_pkey" PRIMARY KEY using index "professional_payment_methods_pkey";

alter table "public"."professional_profiles" add constraint "professional_profiles_pkey" PRIMARY KEY using index "professional_profiles_pkey";

alter table "public"."professional_subscriptions" add constraint "professional_subscriptions_pkey" PRIMARY KEY using index "professional_subscriptions_pkey";

alter table "public"."profile_photos" add constraint "profile_photos_pkey" PRIMARY KEY using index "profile_photos_pkey";

alter table "public"."refunds" add constraint "refunds_pkey" PRIMARY KEY using index "refunds_pkey";

alter table "public"."reviews" add constraint "reviews_pkey" PRIMARY KEY using index "reviews_pkey";

alter table "public"."roles" add constraint "roles_pkey" PRIMARY KEY using index "roles_pkey";

alter table "public"."service_limits" add constraint "service_limits_pkey" PRIMARY KEY using index "service_limits_pkey";

alter table "public"."services" add constraint "services_pkey" PRIMARY KEY using index "services_pkey";

alter table "public"."subscription_plans" add constraint "subscription_plans_pkey" PRIMARY KEY using index "subscription_plans_pkey";

alter table "public"."users" add constraint "users_pkey" PRIMARY KEY using index "users_pkey";

alter table "public"."admin_configs" add constraint "admin_configs_data_type_check" CHECK ((data_type = ANY (ARRAY['integer'::text, 'decimal'::text, 'boolean'::text, 'text'::text]))) not valid;

alter table "public"."admin_configs" validate constraint "admin_configs_data_type_check";

alter table "public"."admin_configs" add constraint "admin_configs_key_key" UNIQUE using index "admin_configs_key_key";

alter table "public"."appointments" add constraint "appointments_booking_id_fkey" FOREIGN KEY (booking_id) REFERENCES bookings(id) not valid;

alter table "public"."appointments" validate constraint "appointments_booking_id_fkey";

alter table "public"."appointments" add constraint "appointments_status_check" CHECK ((status = ANY (ARRAY['completed'::text, 'cancelled'::text, 'ongoing'::text]))) not valid;

alter table "public"."appointments" validate constraint "appointments_status_check";

alter table "public"."booking_payments" add constraint "booking_payments_booking_id_fkey" FOREIGN KEY (booking_id) REFERENCES bookings(id) not valid;

alter table "public"."booking_payments" validate constraint "booking_payments_booking_id_fkey";

alter table "public"."booking_payments" add constraint "booking_payments_booking_id_key" UNIQUE using index "booking_payments_booking_id_key";

alter table "public"."booking_payments" add constraint "booking_payments_capture_method_check" CHECK ((capture_method = ANY (ARRAY['automatic'::text, 'manual'::text]))) not valid;

alter table "public"."booking_payments" validate constraint "booking_payments_capture_method_check";

alter table "public"."booking_payments" add constraint "booking_payments_payment_method_id_fkey" FOREIGN KEY (payment_method_id) REFERENCES payment_methods(id) not valid;

alter table "public"."booking_payments" validate constraint "booking_payments_payment_method_id_fkey";

alter table "public"."booking_payments" add constraint "booking_payments_payment_type_check" CHECK ((payment_type = ANY (ARRAY['full'::text, 'deposit'::text, 'balance'::text]))) not valid;

alter table "public"."booking_payments" validate constraint "booking_payments_payment_type_check";

alter table "public"."booking_payments" add constraint "booking_payments_refund_amount_check" CHECK (((refunded_amount >= (0)::numeric) AND (refunded_amount <= ((amount + tip_amount) + service_fee)))) not valid;

alter table "public"."booking_payments" validate constraint "booking_payments_refund_amount_check";

alter table "public"."booking_payments" add constraint "booking_payments_status_check" CHECK ((status = ANY (ARRAY['incomplete'::text, 'pending'::text, 'completed'::text, 'failed'::text, 'refunded'::text, 'partially_refunded'::text, 'deposit_paid'::text, 'awaiting_balance'::text, 'authorized'::text, 'pre_auth_scheduled'::text]))) not valid;

alter table "public"."booking_payments" validate constraint "booking_payments_status_check";

alter table "public"."booking_services" add constraint "booking_services_booking_id_fkey" FOREIGN KEY (booking_id) REFERENCES bookings(id) not valid;

alter table "public"."booking_services" validate constraint "booking_services_booking_id_fkey";

alter table "public"."booking_services" add constraint "booking_services_service_id_fkey" FOREIGN KEY (service_id) REFERENCES services(id) not valid;

alter table "public"."booking_services" validate constraint "booking_services_service_id_fkey";

alter table "public"."bookings" add constraint "bookings_client_id_fkey" FOREIGN KEY (client_id) REFERENCES users(id) not valid;

alter table "public"."bookings" validate constraint "bookings_client_id_fkey";

alter table "public"."bookings" add constraint "bookings_professional_profile_id_fkey" FOREIGN KEY (professional_profile_id) REFERENCES professional_profiles(id) not valid;

alter table "public"."bookings" validate constraint "bookings_professional_profile_id_fkey";

alter table "public"."bookings" add constraint "bookings_status_check" CHECK ((status = ANY (ARRAY['pending_payment'::text, 'pending'::text, 'confirmed'::text, 'completed'::text, 'cancelled'::text]))) not valid;

alter table "public"."bookings" validate constraint "bookings_status_check";

alter table "public"."client_profiles" add constraint "client_profiles_address_id_fkey" FOREIGN KEY (address_id) REFERENCES addresses(id) not valid;

alter table "public"."client_profiles" validate constraint "client_profiles_address_id_fkey";

alter table "public"."client_profiles" add constraint "client_profiles_user_id_fkey" FOREIGN KEY (user_id) REFERENCES users(id) not valid;

alter table "public"."client_profiles" validate constraint "client_profiles_user_id_fkey";

alter table "public"."client_profiles" add constraint "client_profiles_user_id_key" UNIQUE using index "client_profiles_user_id_key";

alter table "public"."contact_inquiries" add constraint "contact_inquiries_assigned_to_fkey" FOREIGN KEY (assigned_to) REFERENCES auth.users(id) not valid;

alter table "public"."contact_inquiries" validate constraint "contact_inquiries_assigned_to_fkey";

alter table "public"."contact_inquiries" add constraint "contact_inquiries_status_check" CHECK ((status = ANY (ARRAY['new'::text, 'in_progress'::text, 'resolved'::text, 'closed'::text]))) not valid;

alter table "public"."contact_inquiries" validate constraint "contact_inquiries_status_check";

alter table "public"."contact_inquiries" add constraint "contact_inquiries_urgency_check" CHECK ((urgency = ANY (ARRAY['low'::text, 'medium'::text, 'high'::text]))) not valid;

alter table "public"."contact_inquiries" validate constraint "contact_inquiries_urgency_check";

alter table "public"."contact_inquiries" add constraint "contact_inquiries_user_id_fkey" FOREIGN KEY (user_id) REFERENCES auth.users(id) not valid;

alter table "public"."contact_inquiries" validate constraint "contact_inquiries_user_id_fkey";

alter table "public"."conversations" add constraint "client_is_client" CHECK (is_client(client_id)) not valid;

alter table "public"."conversations" validate constraint "client_is_client";

alter table "public"."conversations" add constraint "conversations_client_id_fkey" FOREIGN KEY (client_id) REFERENCES users(id) not valid;

alter table "public"."conversations" validate constraint "conversations_client_id_fkey";

alter table "public"."conversations" add constraint "conversations_professional_id_fkey" FOREIGN KEY (professional_id) REFERENCES users(id) not valid;

alter table "public"."conversations" validate constraint "conversations_professional_id_fkey";

alter table "public"."conversations" add constraint "professional_is_professional" CHECK (is_professional(professional_id)) not valid;

alter table "public"."conversations" validate constraint "professional_is_professional";

alter table "public"."conversations" add constraint "unique_conversation" UNIQUE using index "unique_conversation";

alter table "public"."customers" add constraint "customers_user_id_fkey" FOREIGN KEY (user_id) REFERENCES users(id) not valid;

alter table "public"."customers" validate constraint "customers_user_id_fkey";

alter table "public"."customers" add constraint "customers_user_id_key" UNIQUE using index "customers_user_id_key";

alter table "public"."email_templates" add constraint "unique_template_name" UNIQUE using index "unique_template_name";

alter table "public"."email_templates" add constraint "unique_template_tag" UNIQUE using index "unique_template_tag";

alter table "public"."legal_documents" add constraint "legal_documents_created_by_fkey" FOREIGN KEY (created_by) REFERENCES users(id) not valid;

alter table "public"."legal_documents" validate constraint "legal_documents_created_by_fkey";

alter table "public"."legal_documents" add constraint "legal_documents_type_check" CHECK ((type = ANY (ARRAY['terms_and_conditions'::text, 'privacy_policy'::text]))) not valid;

alter table "public"."legal_documents" validate constraint "legal_documents_type_check";

alter table "public"."legal_documents" add constraint "unique_published_per_type" UNIQUE using index "unique_published_per_type" DEFERRABLE INITIALLY DEFERRED;

alter table "public"."message_attachments" add constraint "message_attachments_file_size_check" CHECK ((file_size > 0)) not valid;

alter table "public"."message_attachments" validate constraint "message_attachments_file_size_check";

alter table "public"."message_attachments" add constraint "message_attachments_message_id_fkey" FOREIGN KEY (message_id) REFERENCES messages(id) ON DELETE CASCADE not valid;

alter table "public"."message_attachments" validate constraint "message_attachments_message_id_fkey";

alter table "public"."message_attachments" add constraint "message_attachments_type_check" CHECK ((type = 'image'::text)) not valid;

alter table "public"."message_attachments" validate constraint "message_attachments_type_check";

alter table "public"."messages" add constraint "messages_conversation_id_fkey" FOREIGN KEY (conversation_id) REFERENCES conversations(id) not valid;

alter table "public"."messages" validate constraint "messages_conversation_id_fkey";

alter table "public"."messages" add constraint "messages_sender_id_fkey" FOREIGN KEY (sender_id) REFERENCES users(id) not valid;

alter table "public"."messages" validate constraint "messages_sender_id_fkey";

alter table "public"."payment_methods" add constraint "payment_methods_name_key" UNIQUE using index "payment_methods_name_key";

alter table "public"."portfolio_photos" add constraint "portfolio_photos_user_id_fkey" FOREIGN KEY (user_id) REFERENCES users(id) not valid;

alter table "public"."portfolio_photos" validate constraint "portfolio_photos_user_id_fkey";

alter table "public"."portfolio_photos" add constraint "user_is_professional" CHECK (is_professional(user_id)) not valid;

alter table "public"."portfolio_photos" validate constraint "user_is_professional";

alter table "public"."professional_payment_methods" add constraint "professional_payment_methods_payment_method_id_fkey" FOREIGN KEY (payment_method_id) REFERENCES payment_methods(id) not valid;

alter table "public"."professional_payment_methods" validate constraint "professional_payment_methods_payment_method_id_fkey";

alter table "public"."professional_payment_methods" add constraint "professional_payment_methods_professional_profile_id_fkey" FOREIGN KEY (professional_profile_id) REFERENCES professional_profiles(id) not valid;

alter table "public"."professional_payment_methods" validate constraint "professional_payment_methods_professional_profile_id_fkey";

alter table "public"."professional_payment_methods" add constraint "unique_professional_payment_method" UNIQUE using index "unique_professional_payment_method";

alter table "public"."professional_profiles" add constraint "chk_cancellation_24h_percentage" CHECK (((cancellation_24h_charge_percentage >= (0)::numeric) AND (cancellation_24h_charge_percentage <= (100)::numeric))) not valid;

alter table "public"."professional_profiles" validate constraint "chk_cancellation_24h_percentage";

alter table "public"."professional_profiles" add constraint "chk_cancellation_48h_percentage" CHECK (((cancellation_48h_charge_percentage >= (0)::numeric) AND (cancellation_48h_charge_percentage <= (100)::numeric))) not valid;

alter table "public"."professional_profiles" validate constraint "chk_cancellation_48h_percentage";

alter table "public"."professional_profiles" add constraint "chk_cancellation_policy_logic" CHECK ((cancellation_24h_charge_percentage >= cancellation_48h_charge_percentage)) not valid;

alter table "public"."professional_profiles" validate constraint "chk_cancellation_policy_logic";

alter table "public"."professional_profiles" add constraint "professional_profiles_address_id_fkey" FOREIGN KEY (address_id) REFERENCES addresses(id) not valid;

alter table "public"."professional_profiles" validate constraint "professional_profiles_address_id_fkey";

alter table "public"."professional_profiles" add constraint "professional_profiles_check" CHECK (((requires_deposit = false) OR ((requires_deposit = true) AND (deposit_type = 'percentage'::text) AND (deposit_value >= (0)::numeric) AND (deposit_value <= (100)::numeric)) OR ((requires_deposit = true) AND (deposit_type = 'fixed'::text) AND (deposit_value >= (0)::numeric)))) not valid;

alter table "public"."professional_profiles" validate constraint "professional_profiles_check";

alter table "public"."professional_profiles" add constraint "professional_profiles_deposit_type_check" CHECK ((deposit_type = ANY (ARRAY['percentage'::text, 'fixed'::text]))) not valid;

alter table "public"."professional_profiles" validate constraint "professional_profiles_deposit_type_check";

alter table "public"."professional_profiles" add constraint "professional_profiles_stripe_connect_status_check" CHECK ((stripe_connect_status = ANY (ARRAY['not_connected'::text, 'pending'::text, 'complete'::text]))) not valid;

alter table "public"."professional_profiles" validate constraint "professional_profiles_stripe_connect_status_check";

alter table "public"."professional_profiles" add constraint "professional_profiles_user_id_fkey" FOREIGN KEY (user_id) REFERENCES users(id) not valid;

alter table "public"."professional_profiles" validate constraint "professional_profiles_user_id_fkey";

alter table "public"."professional_profiles" add constraint "professional_profiles_user_id_key" UNIQUE using index "professional_profiles_user_id_key";

alter table "public"."professional_subscriptions" add constraint "professional_subscriptions_professional_profile_id_fkey" FOREIGN KEY (professional_profile_id) REFERENCES professional_profiles(id) not valid;

alter table "public"."professional_subscriptions" validate constraint "professional_subscriptions_professional_profile_id_fkey";

alter table "public"."professional_subscriptions" add constraint "professional_subscriptions_status_check" CHECK ((status = ANY (ARRAY['active'::text, 'cancelled'::text, 'expired'::text]))) not valid;

alter table "public"."professional_subscriptions" validate constraint "professional_subscriptions_status_check";

alter table "public"."professional_subscriptions" add constraint "professional_subscriptions_subscription_plan_id_fkey" FOREIGN KEY (subscription_plan_id) REFERENCES subscription_plans(id) not valid;

alter table "public"."professional_subscriptions" validate constraint "professional_subscriptions_subscription_plan_id_fkey";

alter table "public"."profile_photos" add constraint "profile_photos_user_id_fkey" FOREIGN KEY (user_id) REFERENCES users(id) not valid;

alter table "public"."profile_photos" validate constraint "profile_photos_user_id_fkey";

alter table "public"."profile_photos" add constraint "profile_photos_user_id_key" UNIQUE using index "profile_photos_user_id_key";

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

alter table "public"."reviews" add constraint "client_is_client" CHECK (is_client(client_id)) not valid;

alter table "public"."reviews" validate constraint "client_is_client";

alter table "public"."reviews" add constraint "professional_is_professional" CHECK (is_professional(professional_id)) not valid;

alter table "public"."reviews" validate constraint "professional_is_professional";

alter table "public"."reviews" add constraint "reviews_appointment_id_fkey" FOREIGN KEY (appointment_id) REFERENCES appointments(id) not valid;

alter table "public"."reviews" validate constraint "reviews_appointment_id_fkey";

alter table "public"."reviews" add constraint "reviews_appointment_id_key" UNIQUE using index "reviews_appointment_id_key";

alter table "public"."reviews" add constraint "reviews_client_id_fkey" FOREIGN KEY (client_id) REFERENCES users(id) not valid;

alter table "public"."reviews" validate constraint "reviews_client_id_fkey";

alter table "public"."reviews" add constraint "reviews_professional_id_fkey" FOREIGN KEY (professional_id) REFERENCES users(id) not valid;

alter table "public"."reviews" validate constraint "reviews_professional_id_fkey";

alter table "public"."reviews" add constraint "reviews_score_check" CHECK (((score >= 1) AND (score <= 5))) not valid;

alter table "public"."reviews" validate constraint "reviews_score_check";

alter table "public"."roles" add constraint "roles_name_key" UNIQUE using index "roles_name_key";

alter table "public"."service_limits" add constraint "service_limits_professional_profile_id_fkey" FOREIGN KEY (professional_profile_id) REFERENCES professional_profiles(id) not valid;

alter table "public"."service_limits" validate constraint "service_limits_professional_profile_id_fkey";

alter table "public"."service_limits" add constraint "service_limits_professional_profile_id_key" UNIQUE using index "service_limits_professional_profile_id_key";

alter table "public"."services" add constraint "services_professional_profile_id_fkey" FOREIGN KEY (professional_profile_id) REFERENCES professional_profiles(id) not valid;

alter table "public"."services" validate constraint "services_professional_profile_id_fkey";

alter table "public"."services" add constraint "services_stripe_status_check" CHECK ((stripe_status = ANY (ARRAY['draft'::text, 'active'::text, 'inactive'::text]))) not valid;

alter table "public"."services" validate constraint "services_stripe_status_check";

alter table "public"."services" add constraint "services_stripe_sync_status_check" CHECK ((stripe_sync_status = ANY (ARRAY['pending'::text, 'synced'::text, 'error'::text]))) not valid;

alter table "public"."services" validate constraint "services_stripe_sync_status_check";

alter table "public"."subscription_plans" add constraint "subscription_plans_interval_check" CHECK (("interval" = ANY (ARRAY['month'::text, 'year'::text]))) not valid;

alter table "public"."subscription_plans" validate constraint "subscription_plans_interval_check";

alter table "public"."users" add constraint "users_id_fkey" FOREIGN KEY (id) REFERENCES auth.users(id) not valid;

alter table "public"."users" validate constraint "users_id_fkey";

alter table "public"."users" add constraint "users_role_id_fkey" FOREIGN KEY (role_id) REFERENCES roles(id) not valid;

alter table "public"."users" validate constraint "users_role_id_fkey";

set check_function_bodies = off;

CREATE OR REPLACE FUNCTION public.calculate_payment_schedule(appointment_start_time timestamp with time zone, appointment_end_time timestamp with time zone)
 RETURNS TABLE(pre_auth_date timestamp with time zone, capture_date timestamp with time zone, should_pre_auth_now boolean)
 LANGUAGE plpgsql
AS $function$
declare
  six_days_before timestamp with time zone;
  twelve_hours_after_end timestamp with time zone;
begin
  -- Calculate 6 days before appointment start (for pre-auth)
  six_days_before := appointment_start_time - interval '6 days';
  
  -- Calculate 12 hours after appointment END (for capture)
  twelve_hours_after_end := appointment_end_time + interval '12 hours';
  
  -- Determine if we should place pre-auth now (if appointment is within 6 days)
  return query select 
    six_days_before as pre_auth_date,
    twelve_hours_after_end as capture_date,
    (now() >= six_days_before) as should_pre_auth_now;
end;
$function$
;

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

CREATE OR REPLACE FUNCTION public.can_create_review(p_appointment_id uuid, p_client_id uuid)
 RETURNS boolean
 LANGUAGE plpgsql
 SECURITY DEFINER
AS $function$
declare
  appointment_computed_status text;
  appointment_client_id uuid;
  appointment_professional_id uuid;
  existing_review_count integer;
begin
  -- Get appointment details
  select a.computed_status, b.client_id, pp.user_id into appointment_computed_status, appointment_client_id, appointment_professional_id
  from appointments_with_status a
  join bookings b on a.booking_id = b.id
  join professional_profiles pp on b.professional_profile_id = pp.id
  where a.id = p_appointment_id;
  
  -- Check if appointment exists
  if appointment_computed_status is null then
    return false;
  end if;
  
  -- Check if appointment is completed
  if appointment_computed_status != 'completed' then
    return false;
  end if;
  
  -- Check if requesting user is the client for this appointment
  if appointment_client_id != p_client_id then
    return false;
  end if;
  
  -- Check if review already exists for this appointment
  select count(*) into existing_review_count
  from reviews
  where appointment_id = p_appointment_id;
  
  if existing_review_count > 0 then
    return false;
  end if;
  
  return true;
end;
$function$
;

CREATE OR REPLACE FUNCTION public.check_portfolio_photo_limit()
 RETURNS trigger
 LANGUAGE plpgsql
AS $function$
declare
  max_photos integer;
begin
  -- Get the maximum portfolio photos from configuration
  select get_admin_config('max_portfolio_photos', '20')::integer into max_photos;
  
  if (select count(*) from portfolio_photos where user_id = new.user_id) >= max_photos then
    raise exception 'Maximum of % portfolio photos allowed per professional', max_photos;
  end if;
  return new;
end;
$function$
;

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
    and a.status != 'cancelled'
    and b.status not in ('pending_payment', 'cancelled')
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

CREATE OR REPLACE FUNCTION public.check_service_limit()
 RETURNS trigger
 LANGUAGE plpgsql
AS $function$
declare
  current_count integer;
  max_allowed integer;
begin
  -- Get current service count
  select count(*) into current_count
  from services
  where professional_profile_id = new.professional_profile_id;
  
  -- Get the limit for this professional
  max_allowed := get_service_limit(new.professional_profile_id);
  
  if current_count >= max_allowed then
    raise exception 'Maximum of % services allowed for this professional. Contact support to increase your limit.', max_allowed;
  end if;
  
  return new;
end;
$function$
;

CREATE OR REPLACE FUNCTION public.get_admin_config(config_key text, default_value text DEFAULT NULL::text)
 RETURNS text
 LANGUAGE plpgsql
 SECURITY DEFINER
AS $function$
declare
  config_value text;
begin
  select value into config_value
  from admin_configs
  where key = config_key;
  
  return coalesce(config_value, default_value);
end;
$function$
;

CREATE OR REPLACE FUNCTION public.get_appointment_computed_status(p_start_time timestamp with time zone, p_end_time timestamp with time zone, p_status text)
 RETURNS text
 LANGUAGE plpgsql
AS $function$
declare
  current_datetime timestamptz;
begin
  -- If appointment is cancelled, return cancelled
  if p_status = 'cancelled' then
    return 'cancelled';
  end if;

  current_datetime := now();

  -- If appointment hasn't started yet, it's upcoming
  if current_datetime < p_start_time then
    return 'upcoming';
  end if;

  -- If appointment has ended, it's completed
  if current_datetime > p_end_time then
    return 'completed';
  end if;

  -- If we're between start and end time, it's still considered upcoming
  return 'upcoming';
end;
$function$
;

CREATE OR REPLACE FUNCTION public.get_appointment_status(p_date date, p_start_time time without time zone, p_end_time time without time zone, p_status text)
 RETURNS text
 LANGUAGE plpgsql
AS $function$
declare
  appointment_start_datetime timestamp with time zone;
  appointment_end_datetime timestamp with time zone;
  current_datetime timestamp with time zone;
begin
  -- If appointment is cancelled, return cancelled
  if p_status = 'cancelled' then
    return 'cancelled';
  end if;

  -- Convert appointment date and times to timestamps
  appointment_start_datetime := (p_date || ' ' || p_start_time)::timestamp with time zone;
  appointment_end_datetime := (p_date || ' ' || p_end_time)::timestamp with time zone;
  current_datetime := timezone('utc'::text, now());

  -- If appointment hasn't started yet, it's upcoming
  if current_datetime < appointment_start_datetime then
    return 'upcoming';
  end if;

  -- If appointment has ended, it's completed
  if current_datetime > appointment_end_datetime then
    return 'completed';
  end if;

  -- If we're between start and end time, it's in progress (treat as upcoming)
  return 'upcoming';
end;
$function$
;

CREATE OR REPLACE FUNCTION public.get_professional_rating_stats(p_professional_id uuid)
 RETURNS TABLE(average_rating numeric, total_reviews integer, five_star integer, four_star integer, three_star integer, two_star integer, one_star integer)
 LANGUAGE plpgsql
 SECURITY DEFINER
AS $function$
begin
  return query
  select 
    round(avg(r.score), 2) as average_rating,
    count(r.id)::integer as total_reviews,
    count(case when r.score = 5 then 1 end)::integer as five_star,
    count(case when r.score = 4 then 1 end)::integer as four_star,
    count(case when r.score = 3 then 1 end)::integer as three_star,
    count(case when r.score = 2 then 1 end)::integer as two_star,
    count(case when r.score = 1 then 1 end)::integer as one_star
  from reviews r
  where r.professional_id = p_professional_id;
end;
$function$
;

CREATE OR REPLACE FUNCTION public.get_service_limit(prof_profile_id uuid)
 RETURNS integer
 LANGUAGE plpgsql
 SECURITY DEFINER
AS $function$
declare
  limit_value integer;
  default_limit integer;
begin
  -- Get custom limit if set
  select max_services into limit_value
  from service_limits
  where professional_profile_id = prof_profile_id;
  
  -- Get default limit from admin configuration
  select get_admin_config('max_services_default', '50')::integer into default_limit;
  
  -- Return custom limit if set, otherwise return admin-configured default
  return coalesce(limit_value, default_limit);
end;
$function$
;

CREATE OR REPLACE FUNCTION public.handle_legal_document_versioning()
 RETURNS trigger
 LANGUAGE plpgsql
AS $function$
begin
  -- If creating a new document for an existing type, increment version
  if tg_op = 'INSERT' then
    select coalesce(max(version), 0) + 1 into new.version
    from legal_documents
    where type = new.type;
    
    -- If setting as published, unpublish all other documents of the same type
    if new.is_published = true then
      update legal_documents
      set is_published = false, updated_at = timezone('utc'::text, now())
      where type = new.type and id != new.id;
    end if;
  end if;
  
  -- If updating to published, unpublish all other documents of the same type
  if tg_op = 'UPDATE' and new.is_published = true and old.is_published = false then
    update legal_documents
    set is_published = false, updated_at = timezone('utc'::text, now())
    where type = new.type and id != new.id;
  end if;
  
  return new;
end;
$function$
;

CREATE OR REPLACE FUNCTION public.handle_new_client()
 RETURNS trigger
 LANGUAGE plpgsql
 SECURITY DEFINER
AS $function$
declare
  client_role_id uuid;
begin
  -- Only proceed if the role was changed to client
  select id into client_role_id from roles where name = 'client';
  
  if new.role_id = client_role_id then
    -- Create client profile if it doesn't exist
    insert into client_profiles (user_id)
    values (new.id)
    on conflict (user_id) do nothing;
  end if;
  
  return new;
end;
$function$
;

CREATE OR REPLACE FUNCTION public.handle_new_professional()
 RETURNS trigger
 LANGUAGE plpgsql
 SECURITY DEFINER
AS $function$
declare
  professional_role_id uuid;
begin
  -- Only proceed if the role was changed to professional
  select id into professional_role_id from roles where name = 'professional';
  
  if new.role_id = professional_role_id then
    -- Create professional profile if it doesn't exist
    insert into professional_profiles (user_id)
    values (new.id)
    on conflict (user_id) do nothing;
  end if;
  
  return new;
end;
$function$
;

CREATE OR REPLACE FUNCTION public.handle_new_user()
 RETURNS trigger
 LANGUAGE plpgsql
 SECURITY DEFINER
AS $function$
declare
  user_role_id uuid;
  role_name text;
  first_name_val text;
  last_name_val text;
begin
  -- Get the role from metadata with better error handling
  role_name := new.raw_user_meta_data->>'role';
  
  -- Log for debugging
  RAISE NOTICE 'Raw user meta data: %', new.raw_user_meta_data;
  RAISE NOTICE 'Role name extracted: %', role_name;
  
  -- Extract first and last name from metadata (handles both custom signup and OAuth)
  first_name_val := coalesce(
    new.raw_user_meta_data->>'first_name',
    new.raw_user_meta_data->>'given_name',
    split_part(new.raw_user_meta_data->>'name', ' ', 1),
    split_part(new.raw_user_meta_data->>'full_name', ' ', 1),
    ''
  );
  
  last_name_val := coalesce(
    new.raw_user_meta_data->>'last_name',
    new.raw_user_meta_data->>'family_name',
    case when new.raw_user_meta_data->>'name' is not null then
      trim(substr(new.raw_user_meta_data->>'name', length(split_part(new.raw_user_meta_data->>'name', ' ', 1)) + 2))
    when new.raw_user_meta_data->>'full_name' is not null then
      trim(substr(new.raw_user_meta_data->>'full_name', length(split_part(new.raw_user_meta_data->>'full_name', ' ', 1)) + 2))
    else ''
    end,
    ''
  );
  
  -- For OAuth users without role metadata, we'll handle them in the callback
  -- For regular signups, validate the role
  if role_name is not null then
    -- Validate the role with better error message
    if role_name != 'client' and role_name != 'professional' then
      RAISE NOTICE 'Invalid role specified: %', role_name;
      role_name := 'client'; -- Default to client if not specified properly
    end if;
    
    -- Get the corresponding role ID with fully qualified schema
    select id into user_role_id from public.roles where name = role_name;
    
    if user_role_id is null then
      RAISE EXCEPTION 'Could not find role_id for role: %', role_name;
    end if;
    
    -- Insert the user with the specified role
    begin
    insert into public.users (
      id, 
      first_name, 
      last_name, 
      role_id
    )
    values (
      new.id, 
      first_name_val,
      last_name_val,
      user_role_id
    );
    exception when others then
      RAISE EXCEPTION 'Error creating user record: %', SQLERRM;
    end;
    
    -- Create the appropriate profile based on role
    begin
    if role_name = 'professional' then
        insert into public.professional_profiles (user_id)
      values (new.id);
    elsif role_name = 'client' then
        insert into public.client_profiles (user_id)
      values (new.id);
    end if;
    exception when others then
      RAISE EXCEPTION 'Error creating profile record: %', SQLERRM;
    end;
  else
    -- OAuth user without role metadata - create basic user record without role
    -- Role will be assigned later in the callback
    RAISE NOTICE 'OAuth user detected, creating basic user record without role';
    
    begin
    insert into public.users (
      id, 
      first_name, 
      last_name, 
      role_id
    )
    values (
      new.id, 
      first_name_val,
      last_name_val,
      (select id from public.roles where name = 'client' limit 1) -- Temporary default role
    );
    exception when others then
      RAISE EXCEPTION 'Error creating OAuth user record: %', SQLERRM;
    end;
    
    -- Create default client profile (will be updated in callback if needed)
    begin
    insert into public.client_profiles (user_id)
    values (new.id);
    exception when others then
      RAISE EXCEPTION 'Error creating OAuth client profile: %', SQLERRM;
    end;
  end if;
  
  return new;
end;
$function$
;

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

CREATE OR REPLACE FUNCTION public.insert_address_and_return_id(p_country text DEFAULT NULL::text, p_state text DEFAULT NULL::text, p_city text DEFAULT NULL::text, p_street_address text DEFAULT NULL::text, p_apartment text DEFAULT NULL::text, p_latitude numeric DEFAULT NULL::numeric, p_longitude numeric DEFAULT NULL::numeric, p_google_place_id text DEFAULT NULL::text)
 RETURNS uuid
 LANGUAGE plpgsql
 SECURITY DEFINER
AS $function$
declare
  new_id uuid;
begin
  insert into addresses (
    country, 
    state, 
    city, 
    street_address,
    apartment,
    latitude,
    longitude,
    google_place_id
  ) values (
    p_country, 
    p_state, 
    p_city, 
    p_street_address,
    p_apartment,
    p_latitude,
    p_longitude,
    p_google_place_id
  ) returning id into new_id;
  
  return new_id;
end;
$function$
;

CREATE OR REPLACE FUNCTION public.set_admin_config(config_key text, config_value text)
 RETURNS boolean
 LANGUAGE plpgsql
 SECURITY DEFINER
AS $function$
begin
  insert into admin_configs (key, value, description, data_type)
  values (config_key, config_value, 'Auto-created configuration', 'text')
  on conflict (key)
  do update set 
    value = config_value,
    updated_at = timezone('utc'::text, now());
    
  return true;
end;
$function$
;

CREATE OR REPLACE FUNCTION public.update_admin_configs_updated_at()
 RETURNS trigger
 LANGUAGE plpgsql
AS $function$
begin
  new.updated_at = timezone('utc'::text, now());
  return new;
end;
$function$
;

CREATE OR REPLACE FUNCTION public.update_contact_inquiries_updated_at()
 RETURNS trigger
 LANGUAGE plpgsql
AS $function$
begin
  new.updated_at = timezone('utc'::text, now());
  return new;
end;
$function$
;

CREATE OR REPLACE FUNCTION public.update_conversation_timestamp()
 RETURNS trigger
 LANGUAGE plpgsql
AS $function$
begin
  update conversations
  set updated_at = timezone('utc'::text, now())
  where id = new.conversation_id;
  return new;
end;
$function$
;

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

CREATE OR REPLACE FUNCTION public.update_reviews_updated_at()
 RETURNS trigger
 LANGUAGE plpgsql
AS $function$
begin
  new.updated_at = timezone('utc'::text, now());
  return new;
end;
$function$
;

CREATE OR REPLACE FUNCTION public.update_service_limit(prof_profile_id uuid, new_limit integer)
 RETURNS boolean
 LANGUAGE plpgsql
 SECURITY DEFINER
AS $function$
begin
  -- Validate input
  if new_limit < 1 then
    raise exception 'Service limit must be at least 1';
  end if;
  
  -- Insert or update the service limit
  insert into service_limits (professional_profile_id, max_services)
  values (prof_profile_id, new_limit)
  on conflict (professional_profile_id)
  do update set 
    max_services = new_limit,
    updated_at = timezone('utc'::text, now());
    
  return true;
end;
$function$
;

create or replace view "public"."appointments_with_status" as  SELECT a.id,
    a.booking_id,
    a.start_time,
    a.end_time,
    a.status,
    a.created_at,
    a.updated_at,
    get_appointment_computed_status(a.start_time, a.end_time, a.status) AS computed_status
   FROM appointments a;


grant delete on table "public"."addresses" to "anon";

grant insert on table "public"."addresses" to "anon";

grant references on table "public"."addresses" to "anon";

grant select on table "public"."addresses" to "anon";

grant trigger on table "public"."addresses" to "anon";

grant truncate on table "public"."addresses" to "anon";

grant update on table "public"."addresses" to "anon";

grant delete on table "public"."addresses" to "authenticated";

grant insert on table "public"."addresses" to "authenticated";

grant references on table "public"."addresses" to "authenticated";

grant select on table "public"."addresses" to "authenticated";

grant trigger on table "public"."addresses" to "authenticated";

grant truncate on table "public"."addresses" to "authenticated";

grant update on table "public"."addresses" to "authenticated";

grant delete on table "public"."addresses" to "service_role";

grant insert on table "public"."addresses" to "service_role";

grant references on table "public"."addresses" to "service_role";

grant select on table "public"."addresses" to "service_role";

grant trigger on table "public"."addresses" to "service_role";

grant truncate on table "public"."addresses" to "service_role";

grant update on table "public"."addresses" to "service_role";

grant delete on table "public"."admin_configs" to "anon";

grant insert on table "public"."admin_configs" to "anon";

grant references on table "public"."admin_configs" to "anon";

grant select on table "public"."admin_configs" to "anon";

grant trigger on table "public"."admin_configs" to "anon";

grant truncate on table "public"."admin_configs" to "anon";

grant update on table "public"."admin_configs" to "anon";

grant delete on table "public"."admin_configs" to "authenticated";

grant insert on table "public"."admin_configs" to "authenticated";

grant references on table "public"."admin_configs" to "authenticated";

grant select on table "public"."admin_configs" to "authenticated";

grant trigger on table "public"."admin_configs" to "authenticated";

grant truncate on table "public"."admin_configs" to "authenticated";

grant update on table "public"."admin_configs" to "authenticated";

grant delete on table "public"."admin_configs" to "service_role";

grant insert on table "public"."admin_configs" to "service_role";

grant references on table "public"."admin_configs" to "service_role";

grant select on table "public"."admin_configs" to "service_role";

grant trigger on table "public"."admin_configs" to "service_role";

grant truncate on table "public"."admin_configs" to "service_role";

grant update on table "public"."admin_configs" to "service_role";

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

grant delete on table "public"."client_profiles" to "anon";

grant insert on table "public"."client_profiles" to "anon";

grant references on table "public"."client_profiles" to "anon";

grant select on table "public"."client_profiles" to "anon";

grant trigger on table "public"."client_profiles" to "anon";

grant truncate on table "public"."client_profiles" to "anon";

grant update on table "public"."client_profiles" to "anon";

grant delete on table "public"."client_profiles" to "authenticated";

grant insert on table "public"."client_profiles" to "authenticated";

grant references on table "public"."client_profiles" to "authenticated";

grant select on table "public"."client_profiles" to "authenticated";

grant trigger on table "public"."client_profiles" to "authenticated";

grant truncate on table "public"."client_profiles" to "authenticated";

grant update on table "public"."client_profiles" to "authenticated";

grant delete on table "public"."client_profiles" to "service_role";

grant insert on table "public"."client_profiles" to "service_role";

grant references on table "public"."client_profiles" to "service_role";

grant select on table "public"."client_profiles" to "service_role";

grant trigger on table "public"."client_profiles" to "service_role";

grant truncate on table "public"."client_profiles" to "service_role";

grant update on table "public"."client_profiles" to "service_role";

grant delete on table "public"."contact_inquiries" to "anon";

grant insert on table "public"."contact_inquiries" to "anon";

grant references on table "public"."contact_inquiries" to "anon";

grant select on table "public"."contact_inquiries" to "anon";

grant trigger on table "public"."contact_inquiries" to "anon";

grant truncate on table "public"."contact_inquiries" to "anon";

grant update on table "public"."contact_inquiries" to "anon";

grant delete on table "public"."contact_inquiries" to "authenticated";

grant insert on table "public"."contact_inquiries" to "authenticated";

grant references on table "public"."contact_inquiries" to "authenticated";

grant select on table "public"."contact_inquiries" to "authenticated";

grant trigger on table "public"."contact_inquiries" to "authenticated";

grant truncate on table "public"."contact_inquiries" to "authenticated";

grant update on table "public"."contact_inquiries" to "authenticated";

grant delete on table "public"."contact_inquiries" to "service_role";

grant insert on table "public"."contact_inquiries" to "service_role";

grant references on table "public"."contact_inquiries" to "service_role";

grant select on table "public"."contact_inquiries" to "service_role";

grant trigger on table "public"."contact_inquiries" to "service_role";

grant truncate on table "public"."contact_inquiries" to "service_role";

grant update on table "public"."contact_inquiries" to "service_role";

grant delete on table "public"."conversations" to "anon";

grant insert on table "public"."conversations" to "anon";

grant references on table "public"."conversations" to "anon";

grant select on table "public"."conversations" to "anon";

grant trigger on table "public"."conversations" to "anon";

grant truncate on table "public"."conversations" to "anon";

grant update on table "public"."conversations" to "anon";

grant delete on table "public"."conversations" to "authenticated";

grant insert on table "public"."conversations" to "authenticated";

grant references on table "public"."conversations" to "authenticated";

grant select on table "public"."conversations" to "authenticated";

grant trigger on table "public"."conversations" to "authenticated";

grant truncate on table "public"."conversations" to "authenticated";

grant update on table "public"."conversations" to "authenticated";

grant delete on table "public"."conversations" to "service_role";

grant insert on table "public"."conversations" to "service_role";

grant references on table "public"."conversations" to "service_role";

grant select on table "public"."conversations" to "service_role";

grant trigger on table "public"."conversations" to "service_role";

grant truncate on table "public"."conversations" to "service_role";

grant update on table "public"."conversations" to "service_role";

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

grant delete on table "public"."email_templates" to "anon";

grant insert on table "public"."email_templates" to "anon";

grant references on table "public"."email_templates" to "anon";

grant select on table "public"."email_templates" to "anon";

grant trigger on table "public"."email_templates" to "anon";

grant truncate on table "public"."email_templates" to "anon";

grant update on table "public"."email_templates" to "anon";

grant delete on table "public"."email_templates" to "authenticated";

grant insert on table "public"."email_templates" to "authenticated";

grant references on table "public"."email_templates" to "authenticated";

grant select on table "public"."email_templates" to "authenticated";

grant trigger on table "public"."email_templates" to "authenticated";

grant truncate on table "public"."email_templates" to "authenticated";

grant update on table "public"."email_templates" to "authenticated";

grant delete on table "public"."email_templates" to "service_role";

grant insert on table "public"."email_templates" to "service_role";

grant references on table "public"."email_templates" to "service_role";

grant select on table "public"."email_templates" to "service_role";

grant trigger on table "public"."email_templates" to "service_role";

grant truncate on table "public"."email_templates" to "service_role";

grant update on table "public"."email_templates" to "service_role";

grant delete on table "public"."legal_documents" to "anon";

grant insert on table "public"."legal_documents" to "anon";

grant references on table "public"."legal_documents" to "anon";

grant select on table "public"."legal_documents" to "anon";

grant trigger on table "public"."legal_documents" to "anon";

grant truncate on table "public"."legal_documents" to "anon";

grant update on table "public"."legal_documents" to "anon";

grant delete on table "public"."legal_documents" to "authenticated";

grant insert on table "public"."legal_documents" to "authenticated";

grant references on table "public"."legal_documents" to "authenticated";

grant select on table "public"."legal_documents" to "authenticated";

grant trigger on table "public"."legal_documents" to "authenticated";

grant truncate on table "public"."legal_documents" to "authenticated";

grant update on table "public"."legal_documents" to "authenticated";

grant delete on table "public"."legal_documents" to "service_role";

grant insert on table "public"."legal_documents" to "service_role";

grant references on table "public"."legal_documents" to "service_role";

grant select on table "public"."legal_documents" to "service_role";

grant trigger on table "public"."legal_documents" to "service_role";

grant truncate on table "public"."legal_documents" to "service_role";

grant update on table "public"."legal_documents" to "service_role";

grant delete on table "public"."message_attachments" to "anon";

grant insert on table "public"."message_attachments" to "anon";

grant references on table "public"."message_attachments" to "anon";

grant select on table "public"."message_attachments" to "anon";

grant trigger on table "public"."message_attachments" to "anon";

grant truncate on table "public"."message_attachments" to "anon";

grant update on table "public"."message_attachments" to "anon";

grant delete on table "public"."message_attachments" to "authenticated";

grant insert on table "public"."message_attachments" to "authenticated";

grant references on table "public"."message_attachments" to "authenticated";

grant select on table "public"."message_attachments" to "authenticated";

grant trigger on table "public"."message_attachments" to "authenticated";

grant truncate on table "public"."message_attachments" to "authenticated";

grant update on table "public"."message_attachments" to "authenticated";

grant delete on table "public"."message_attachments" to "service_role";

grant insert on table "public"."message_attachments" to "service_role";

grant references on table "public"."message_attachments" to "service_role";

grant select on table "public"."message_attachments" to "service_role";

grant trigger on table "public"."message_attachments" to "service_role";

grant truncate on table "public"."message_attachments" to "service_role";

grant update on table "public"."message_attachments" to "service_role";

grant delete on table "public"."messages" to "anon";

grant insert on table "public"."messages" to "anon";

grant references on table "public"."messages" to "anon";

grant select on table "public"."messages" to "anon";

grant trigger on table "public"."messages" to "anon";

grant truncate on table "public"."messages" to "anon";

grant update on table "public"."messages" to "anon";

grant delete on table "public"."messages" to "authenticated";

grant insert on table "public"."messages" to "authenticated";

grant references on table "public"."messages" to "authenticated";

grant select on table "public"."messages" to "authenticated";

grant trigger on table "public"."messages" to "authenticated";

grant truncate on table "public"."messages" to "authenticated";

grant update on table "public"."messages" to "authenticated";

grant delete on table "public"."messages" to "service_role";

grant insert on table "public"."messages" to "service_role";

grant references on table "public"."messages" to "service_role";

grant select on table "public"."messages" to "service_role";

grant trigger on table "public"."messages" to "service_role";

grant truncate on table "public"."messages" to "service_role";

grant update on table "public"."messages" to "service_role";

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

grant delete on table "public"."portfolio_photos" to "anon";

grant insert on table "public"."portfolio_photos" to "anon";

grant references on table "public"."portfolio_photos" to "anon";

grant select on table "public"."portfolio_photos" to "anon";

grant trigger on table "public"."portfolio_photos" to "anon";

grant truncate on table "public"."portfolio_photos" to "anon";

grant update on table "public"."portfolio_photos" to "anon";

grant delete on table "public"."portfolio_photos" to "authenticated";

grant insert on table "public"."portfolio_photos" to "authenticated";

grant references on table "public"."portfolio_photos" to "authenticated";

grant select on table "public"."portfolio_photos" to "authenticated";

grant trigger on table "public"."portfolio_photos" to "authenticated";

grant truncate on table "public"."portfolio_photos" to "authenticated";

grant update on table "public"."portfolio_photos" to "authenticated";

grant delete on table "public"."portfolio_photos" to "service_role";

grant insert on table "public"."portfolio_photos" to "service_role";

grant references on table "public"."portfolio_photos" to "service_role";

grant select on table "public"."portfolio_photos" to "service_role";

grant trigger on table "public"."portfolio_photos" to "service_role";

grant truncate on table "public"."portfolio_photos" to "service_role";

grant update on table "public"."portfolio_photos" to "service_role";

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

grant delete on table "public"."professional_profiles" to "anon";

grant insert on table "public"."professional_profiles" to "anon";

grant references on table "public"."professional_profiles" to "anon";

grant select on table "public"."professional_profiles" to "anon";

grant trigger on table "public"."professional_profiles" to "anon";

grant truncate on table "public"."professional_profiles" to "anon";

grant update on table "public"."professional_profiles" to "anon";

grant delete on table "public"."professional_profiles" to "authenticated";

grant insert on table "public"."professional_profiles" to "authenticated";

grant references on table "public"."professional_profiles" to "authenticated";

grant select on table "public"."professional_profiles" to "authenticated";

grant trigger on table "public"."professional_profiles" to "authenticated";

grant truncate on table "public"."professional_profiles" to "authenticated";

grant update on table "public"."professional_profiles" to "authenticated";

grant delete on table "public"."professional_profiles" to "service_role";

grant insert on table "public"."professional_profiles" to "service_role";

grant references on table "public"."professional_profiles" to "service_role";

grant select on table "public"."professional_profiles" to "service_role";

grant trigger on table "public"."professional_profiles" to "service_role";

grant truncate on table "public"."professional_profiles" to "service_role";

grant update on table "public"."professional_profiles" to "service_role";

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

grant delete on table "public"."profile_photos" to "anon";

grant insert on table "public"."profile_photos" to "anon";

grant references on table "public"."profile_photos" to "anon";

grant select on table "public"."profile_photos" to "anon";

grant trigger on table "public"."profile_photos" to "anon";

grant truncate on table "public"."profile_photos" to "anon";

grant update on table "public"."profile_photos" to "anon";

grant delete on table "public"."profile_photos" to "authenticated";

grant insert on table "public"."profile_photos" to "authenticated";

grant references on table "public"."profile_photos" to "authenticated";

grant select on table "public"."profile_photos" to "authenticated";

grant trigger on table "public"."profile_photos" to "authenticated";

grant truncate on table "public"."profile_photos" to "authenticated";

grant update on table "public"."profile_photos" to "authenticated";

grant delete on table "public"."profile_photos" to "service_role";

grant insert on table "public"."profile_photos" to "service_role";

grant references on table "public"."profile_photos" to "service_role";

grant select on table "public"."profile_photos" to "service_role";

grant trigger on table "public"."profile_photos" to "service_role";

grant truncate on table "public"."profile_photos" to "service_role";

grant update on table "public"."profile_photos" to "service_role";

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

grant delete on table "public"."reviews" to "anon";

grant insert on table "public"."reviews" to "anon";

grant references on table "public"."reviews" to "anon";

grant select on table "public"."reviews" to "anon";

grant trigger on table "public"."reviews" to "anon";

grant truncate on table "public"."reviews" to "anon";

grant update on table "public"."reviews" to "anon";

grant delete on table "public"."reviews" to "authenticated";

grant insert on table "public"."reviews" to "authenticated";

grant references on table "public"."reviews" to "authenticated";

grant select on table "public"."reviews" to "authenticated";

grant trigger on table "public"."reviews" to "authenticated";

grant truncate on table "public"."reviews" to "authenticated";

grant update on table "public"."reviews" to "authenticated";

grant delete on table "public"."reviews" to "service_role";

grant insert on table "public"."reviews" to "service_role";

grant references on table "public"."reviews" to "service_role";

grant select on table "public"."reviews" to "service_role";

grant trigger on table "public"."reviews" to "service_role";

grant truncate on table "public"."reviews" to "service_role";

grant update on table "public"."reviews" to "service_role";

grant delete on table "public"."roles" to "anon";

grant insert on table "public"."roles" to "anon";

grant references on table "public"."roles" to "anon";

grant select on table "public"."roles" to "anon";

grant trigger on table "public"."roles" to "anon";

grant truncate on table "public"."roles" to "anon";

grant update on table "public"."roles" to "anon";

grant delete on table "public"."roles" to "authenticated";

grant insert on table "public"."roles" to "authenticated";

grant references on table "public"."roles" to "authenticated";

grant select on table "public"."roles" to "authenticated";

grant trigger on table "public"."roles" to "authenticated";

grant truncate on table "public"."roles" to "authenticated";

grant update on table "public"."roles" to "authenticated";

grant delete on table "public"."roles" to "service_role";

grant insert on table "public"."roles" to "service_role";

grant references on table "public"."roles" to "service_role";

grant select on table "public"."roles" to "service_role";

grant trigger on table "public"."roles" to "service_role";

grant truncate on table "public"."roles" to "service_role";

grant update on table "public"."roles" to "service_role";

grant delete on table "public"."service_limits" to "anon";

grant insert on table "public"."service_limits" to "anon";

grant references on table "public"."service_limits" to "anon";

grant select on table "public"."service_limits" to "anon";

grant trigger on table "public"."service_limits" to "anon";

grant truncate on table "public"."service_limits" to "anon";

grant update on table "public"."service_limits" to "anon";

grant delete on table "public"."service_limits" to "authenticated";

grant insert on table "public"."service_limits" to "authenticated";

grant references on table "public"."service_limits" to "authenticated";

grant select on table "public"."service_limits" to "authenticated";

grant trigger on table "public"."service_limits" to "authenticated";

grant truncate on table "public"."service_limits" to "authenticated";

grant update on table "public"."service_limits" to "authenticated";

grant delete on table "public"."service_limits" to "service_role";

grant insert on table "public"."service_limits" to "service_role";

grant references on table "public"."service_limits" to "service_role";

grant select on table "public"."service_limits" to "service_role";

grant trigger on table "public"."service_limits" to "service_role";

grant truncate on table "public"."service_limits" to "service_role";

grant update on table "public"."service_limits" to "service_role";

grant delete on table "public"."services" to "anon";

grant insert on table "public"."services" to "anon";

grant references on table "public"."services" to "anon";

grant select on table "public"."services" to "anon";

grant trigger on table "public"."services" to "anon";

grant truncate on table "public"."services" to "anon";

grant update on table "public"."services" to "anon";

grant delete on table "public"."services" to "authenticated";

grant insert on table "public"."services" to "authenticated";

grant references on table "public"."services" to "authenticated";

grant select on table "public"."services" to "authenticated";

grant trigger on table "public"."services" to "authenticated";

grant truncate on table "public"."services" to "authenticated";

grant update on table "public"."services" to "authenticated";

grant delete on table "public"."services" to "service_role";

grant insert on table "public"."services" to "service_role";

grant references on table "public"."services" to "service_role";

grant select on table "public"."services" to "service_role";

grant trigger on table "public"."services" to "service_role";

grant truncate on table "public"."services" to "service_role";

grant update on table "public"."services" to "service_role";

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

grant delete on table "public"."users" to "anon";

grant insert on table "public"."users" to "anon";

grant references on table "public"."users" to "anon";

grant select on table "public"."users" to "anon";

grant trigger on table "public"."users" to "anon";

grant truncate on table "public"."users" to "anon";

grant update on table "public"."users" to "anon";

grant delete on table "public"."users" to "authenticated";

grant insert on table "public"."users" to "authenticated";

grant references on table "public"."users" to "authenticated";

grant select on table "public"."users" to "authenticated";

grant trigger on table "public"."users" to "authenticated";

grant truncate on table "public"."users" to "authenticated";

grant update on table "public"."users" to "authenticated";

grant delete on table "public"."users" to "service_role";

grant insert on table "public"."users" to "service_role";

grant references on table "public"."users" to "service_role";

grant select on table "public"."users" to "service_role";

grant trigger on table "public"."users" to "service_role";

grant truncate on table "public"."users" to "service_role";

grant update on table "public"."users" to "service_role";

create policy "Anyone can view addresses of published professionals"
on "public"."addresses"
as permissive
for select
to public
using ((EXISTS ( SELECT 1
   FROM professional_profiles
  WHERE ((professional_profiles.address_id = addresses.id) AND (professional_profiles.is_published = true)))));


create policy "Users can create addresses"
on "public"."addresses"
as permissive
for insert
to authenticated
with check (true);


create policy "Users can delete addresses linked to their profile"
on "public"."addresses"
as permissive
for delete
to public
using (((EXISTS ( SELECT 1
   FROM client_profiles
  WHERE ((client_profiles.address_id = addresses.id) AND (client_profiles.user_id = auth.uid())))) OR (EXISTS ( SELECT 1
   FROM professional_profiles
  WHERE ((professional_profiles.address_id = addresses.id) AND (professional_profiles.user_id = auth.uid()))))));


create policy "Users can update addresses linked to their profile"
on "public"."addresses"
as permissive
for update
to public
using (((EXISTS ( SELECT 1
   FROM client_profiles
  WHERE ((client_profiles.address_id = addresses.id) AND (client_profiles.user_id = auth.uid())))) OR (EXISTS ( SELECT 1
   FROM professional_profiles
  WHERE ((professional_profiles.address_id = addresses.id) AND (professional_profiles.user_id = auth.uid()))))));


create policy "Users can view addresses linked to their profile"
on "public"."addresses"
as permissive
for select
to public
using (((EXISTS ( SELECT 1
   FROM client_profiles
  WHERE ((client_profiles.address_id = addresses.id) AND (client_profiles.user_id = auth.uid())))) OR (EXISTS ( SELECT 1
   FROM professional_profiles
  WHERE ((professional_profiles.address_id = addresses.id) AND (professional_profiles.user_id = auth.uid()))))));


create policy "Admins can manage configurations"
on "public"."admin_configs"
as permissive
for all
to public
using ((EXISTS ( SELECT 1
   FROM (users u
     JOIN roles r ON ((u.role_id = r.id)))
  WHERE ((u.id = auth.uid()) AND (r.name = 'admin'::text)))));


create policy "Anyone can read admin configurations"
on "public"."admin_configs"
as permissive
for select
to public
using (true);


create policy "Clients can create appointments for their bookings"
on "public"."appointments"
as permissive
for insert
to public
with check ((EXISTS ( SELECT 1
   FROM bookings
  WHERE ((bookings.id = appointments.booking_id) AND (bookings.client_id = auth.uid())))));


create policy "Clients can update their appointments"
on "public"."appointments"
as permissive
for update
to public
using ((EXISTS ( SELECT 1
   FROM bookings
  WHERE ((bookings.id = appointments.booking_id) AND (bookings.client_id = auth.uid())))));


create policy "Clients can view their appointments"
on "public"."appointments"
as permissive
for select
to public
using ((EXISTS ( SELECT 1
   FROM bookings
  WHERE ((bookings.id = appointments.booking_id) AND (bookings.client_id = auth.uid())))));


create policy "Professionals can update appointments for their profile"
on "public"."appointments"
as permissive
for update
to public
using ((EXISTS ( SELECT 1
   FROM (bookings b
     JOIN professional_profiles pp ON ((b.professional_profile_id = pp.id)))
  WHERE ((b.id = appointments.booking_id) AND (pp.user_id = auth.uid())))));


create policy "Professionals can view appointments for their profile"
on "public"."appointments"
as permissive
for select
to public
using ((EXISTS ( SELECT 1
   FROM (bookings b
     JOIN professional_profiles pp ON ((b.professional_profile_id = pp.id)))
  WHERE ((b.id = appointments.booking_id) AND (pp.user_id = auth.uid())))));


create policy "Clients can create booking payments for their bookings"
on "public"."booking_payments"
as permissive
for insert
to public
with check ((EXISTS ( SELECT 1
   FROM bookings
  WHERE ((bookings.id = booking_payments.booking_id) AND (bookings.client_id = auth.uid())))));


create policy "Professionals can update payment amounts for ongoing appointmen"
on "public"."booking_payments"
as permissive
for update
to public
using ((EXISTS ( SELECT 1
   FROM ((bookings b
     JOIN appointments a ON ((a.booking_id = b.id)))
     JOIN professional_profiles pp ON ((b.professional_profile_id = pp.id)))
  WHERE ((b.id = booking_payments.booking_id) AND (pp.user_id = auth.uid()) AND (get_appointment_computed_status(a.start_time, a.end_time, a.status) = 'ongoing'::text)))))
with check ((EXISTS ( SELECT 1
   FROM ((bookings b
     JOIN appointments a ON ((a.booking_id = b.id)))
     JOIN professional_profiles pp ON ((b.professional_profile_id = pp.id)))
  WHERE ((b.id = booking_payments.booking_id) AND (pp.user_id = auth.uid()) AND (get_appointment_computed_status(a.start_time, a.end_time, a.status) = 'ongoing'::text)))));


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


create policy "Professionals can create booking services for their bookings"
on "public"."booking_services"
as permissive
for insert
to public
with check ((EXISTS ( SELECT 1
   FROM (bookings b
     JOIN professional_profiles pp ON ((b.professional_profile_id = pp.id)))
  WHERE ((b.id = booking_services.booking_id) AND (pp.user_id = auth.uid())))));


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


create policy "Clients can create their own profile"
on "public"."client_profiles"
as permissive
for insert
to public
with check ((auth.uid() = user_id));


create policy "Clients can update their own profile"
on "public"."client_profiles"
as permissive
for update
to public
using ((auth.uid() = user_id));


create policy "Clients can view and update their own profile"
on "public"."client_profiles"
as permissive
for select
to public
using ((auth.uid() = user_id));


create policy "Professionals can view client profiles for shared appointments"
on "public"."client_profiles"
as permissive
for select
to public
using ((EXISTS ( SELECT 1
   FROM (bookings b
     JOIN professional_profiles pp ON ((b.professional_profile_id = pp.id)))
  WHERE ((b.client_id = client_profiles.user_id) AND (pp.user_id = auth.uid())))));


create policy "Admins can update inquiries"
on "public"."contact_inquiries"
as permissive
for update
to public
using ((EXISTS ( SELECT 1
   FROM (users u
     JOIN roles r ON ((u.role_id = r.id)))
  WHERE ((u.id = auth.uid()) AND (r.name = 'admin'::text)))));


create policy "Admins can view all inquiries"
on "public"."contact_inquiries"
as permissive
for select
to public
using ((EXISTS ( SELECT 1
   FROM (users u
     JOIN roles r ON ((u.role_id = r.id)))
  WHERE ((u.id = auth.uid()) AND (r.name = 'admin'::text)))));


create policy "Anyone can create inquiries"
on "public"."contact_inquiries"
as permissive
for insert
to public
with check (true);


create policy "Users can view their own inquiries"
on "public"."contact_inquiries"
as permissive
for select
to public
using ((user_id = auth.uid()));


create policy "Users can create conversations based on appointment history or "
on "public"."conversations"
as permissive
for insert
to public
with check ((is_client(client_id) AND is_professional(professional_id) AND ((((auth.uid() = client_id) OR (auth.uid() = professional_id)) AND (EXISTS ( SELECT 1
   FROM bookings b
  WHERE ((b.client_id = conversations.client_id) AND (b.professional_profile_id IN ( SELECT professional_profiles.id
           FROM professional_profiles
          WHERE (professional_profiles.user_id = conversations.professional_id))))))) OR ((auth.uid() = client_id) AND (NOT (EXISTS ( SELECT 1
   FROM bookings b
  WHERE ((b.client_id = conversations.client_id) AND (b.professional_profile_id IN ( SELECT professional_profiles.id
           FROM professional_profiles
          WHERE (professional_profiles.user_id = conversations.professional_id))))))) AND (EXISTS ( SELECT 1
   FROM professional_profiles
  WHERE ((professional_profiles.user_id = conversations.professional_id) AND (professional_profiles.allow_messages = true))))))));


create policy "Users can view their own conversations"
on "public"."conversations"
as permissive
for select
to public
using (((auth.uid() = client_id) OR (auth.uid() = professional_id)));


create policy "Users can create their own customer record"
on "public"."customers"
as permissive
for insert
to public
with check ((auth.uid() = user_id));


create policy "Users can update their own customer record"
on "public"."customers"
as permissive
for update
to public
using ((auth.uid() = user_id));


create policy "Users can view their own customer data"
on "public"."customers"
as permissive
for select
to public
using ((auth.uid() = user_id));


create policy "Admins can manage email templates"
on "public"."email_templates"
as permissive
for all
to public
using ((EXISTS ( SELECT 1
   FROM (users u
     JOIN roles r ON ((u.role_id = r.id)))
  WHERE ((u.id = auth.uid()) AND (r.name = 'admin'::text)))));


create policy "Anyone can view active email templates"
on "public"."email_templates"
as permissive
for select
to public
using ((is_active = true));


create policy "Anyone can view published legal documents"
on "public"."legal_documents"
as permissive
for select
to public
using ((is_published = true));


create policy "Users can insert attachments in their conversations"
on "public"."message_attachments"
as permissive
for insert
to public
with check ((EXISTS ( SELECT 1
   FROM (messages m
     JOIN conversations c ON ((c.id = m.conversation_id)))
  WHERE ((m.id = message_attachments.message_id) AND ((c.client_id = auth.uid()) OR (c.professional_id = auth.uid()))))));


create policy "Users can view attachments in their conversations"
on "public"."message_attachments"
as permissive
for select
to public
using ((EXISTS ( SELECT 1
   FROM (messages m
     JOIN conversations c ON ((c.id = m.conversation_id)))
  WHERE ((m.id = message_attachments.message_id) AND ((c.client_id = auth.uid()) OR (c.professional_id = auth.uid()))))));


create policy "Users can send messages in their conversations"
on "public"."messages"
as permissive
for insert
to public
with check (((auth.uid() = sender_id) AND (EXISTS ( SELECT 1
   FROM conversations
  WHERE ((conversations.id = messages.conversation_id) AND ((conversations.client_id = auth.uid()) OR (conversations.professional_id = auth.uid())))))));


create policy "Users can update their own messages"
on "public"."messages"
as permissive
for update
to public
using (((auth.uid() = sender_id) OR (EXISTS ( SELECT 1
   FROM conversations
  WHERE ((conversations.id = messages.conversation_id) AND ((conversations.client_id = auth.uid()) OR (conversations.professional_id = auth.uid())))))));


create policy "Users can view messages in their conversations"
on "public"."messages"
as permissive
for select
to public
using ((EXISTS ( SELECT 1
   FROM conversations
  WHERE ((conversations.id = messages.conversation_id) AND ((conversations.client_id = auth.uid()) OR (conversations.professional_id = auth.uid()))))));


create policy "Anyone can view available payment methods"
on "public"."payment_methods"
as permissive
for select
to public
using (true);


create policy "Anyone can view portfolio photos of published professionals"
on "public"."portfolio_photos"
as permissive
for select
to public
using ((EXISTS ( SELECT 1
   FROM professional_profiles
  WHERE ((professional_profiles.user_id = portfolio_photos.user_id) AND (professional_profiles.is_published = true)))));


create policy "Professionals can delete their own portfolio photos"
on "public"."portfolio_photos"
as permissive
for delete
to public
using ((auth.uid() = user_id));


create policy "Professionals can insert their own portfolio photos"
on "public"."portfolio_photos"
as permissive
for insert
to public
with check ((auth.uid() = user_id));


create policy "Professionals can update their own portfolio photos"
on "public"."portfolio_photos"
as permissive
for update
to public
using ((auth.uid() = user_id));


create policy "Professionals can view their own portfolio photos"
on "public"."portfolio_photos"
as permissive
for select
to public
using ((auth.uid() = user_id));


create policy "Anyone can view payment methods of published professionals"
on "public"."professional_payment_methods"
as permissive
for select
to public
using ((EXISTS ( SELECT 1
   FROM professional_profiles
  WHERE ((professional_profiles.id = professional_payment_methods.professional_profile_id) AND (professional_profiles.is_published = true)))));


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


create policy "Anyone can view published professional profiles"
on "public"."professional_profiles"
as permissive
for select
to public
using ((is_published = true));


create policy "Professionals can create their own profile"
on "public"."professional_profiles"
as permissive
for insert
to public
with check ((auth.uid() = user_id));


create policy "Professionals can update their own profile"
on "public"."professional_profiles"
as permissive
for update
to public
using ((auth.uid() = user_id));


create policy "Professionals can view their own profile"
on "public"."professional_profiles"
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


create policy "Anyone can view profile photos of published professionals"
on "public"."profile_photos"
as permissive
for select
to public
using ((EXISTS ( SELECT 1
   FROM professional_profiles
  WHERE ((professional_profiles.user_id = profile_photos.user_id) AND (professional_profiles.is_published = true)))));


create policy "Users can delete their own profile photo"
on "public"."profile_photos"
as permissive
for delete
to public
using ((auth.uid() = user_id));


create policy "Users can insert their own profile photo"
on "public"."profile_photos"
as permissive
for insert
to public
with check ((auth.uid() = user_id));


create policy "Users can update their own profile photo"
on "public"."profile_photos"
as permissive
for update
to public
using ((auth.uid() = user_id));


create policy "Users can view profile photos of other users in their conversat"
on "public"."profile_photos"
as permissive
for select
to public
using ((EXISTS ( SELECT 1
   FROM conversations
  WHERE (((conversations.client_id = auth.uid()) AND (conversations.professional_id = profile_photos.user_id)) OR ((conversations.professional_id = auth.uid()) AND (conversations.client_id = profile_photos.user_id))))));


create policy "Users can view their own profile photo"
on "public"."profile_photos"
as permissive
for select
to public
using ((auth.uid() = user_id));


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


create policy "Anyone can view reviews for published professionals"
on "public"."reviews"
as permissive
for select
to public
using ((EXISTS ( SELECT 1
   FROM professional_profiles pp
  WHERE ((pp.user_id = reviews.professional_id) AND (pp.is_published = true)))));


create policy "Clients can create reviews for completed appointments"
on "public"."reviews"
as permissive
for insert
to public
with check (((auth.uid() = client_id) AND can_create_review(appointment_id, client_id)));


create policy "Clients can update their own reviews"
on "public"."reviews"
as permissive
for update
to public
using (((auth.uid() = client_id) AND (created_at > (now() - make_interval(days => (get_admin_config('review_edit_window_days'::text, '7'::text))::integer)))));


create policy "Clients can view their own reviews"
on "public"."reviews"
as permissive
for select
to public
using ((auth.uid() = client_id));


create policy "Professionals can view their own reviews"
on "public"."reviews"
as permissive
for select
to public
using ((auth.uid() = professional_id));


create policy "Anyone can view roles"
on "public"."roles"
as permissive
for select
to public
using (true);


create policy "Professionals can view their own service limits"
on "public"."service_limits"
as permissive
for select
to public
using ((EXISTS ( SELECT 1
   FROM professional_profiles
  WHERE ((professional_profiles.id = service_limits.professional_profile_id) AND (professional_profiles.user_id = auth.uid())))));


create policy "Anyone can view services from published professionals"
on "public"."services"
as permissive
for select
to public
using ((EXISTS ( SELECT 1
   FROM professional_profiles
  WHERE ((professional_profiles.id = services.professional_profile_id) AND (professional_profiles.is_published = true)))));


create policy "Professionals can manage their own services"
on "public"."services"
as permissive
for all
to public
using ((EXISTS ( SELECT 1
   FROM professional_profiles
  WHERE ((professional_profiles.id = services.professional_profile_id) AND (professional_profiles.user_id = auth.uid())))));


create policy "Professionals can view their own services"
on "public"."services"
as permissive
for select
to public
using ((EXISTS ( SELECT 1
   FROM professional_profiles
  WHERE ((professional_profiles.id = services.professional_profile_id) AND (professional_profiles.user_id = auth.uid())))));


create policy "Anyone can view subscription plans"
on "public"."subscription_plans"
as permissive
for select
to public
using (true);


create policy "Anyone can view user data for published professionals"
on "public"."users"
as permissive
for select
to public
using ((id IN ( SELECT professional_profiles.user_id
   FROM professional_profiles
  WHERE (professional_profiles.is_published = true))));


create policy "Professionals can view user data for clients with shared appoin"
on "public"."users"
as permissive
for select
to public
using ((EXISTS ( SELECT 1
   FROM (bookings b
     JOIN professional_profiles pp ON ((b.professional_profile_id = pp.id)))
  WHERE ((b.client_id = users.id) AND (pp.user_id = auth.uid())))));


create policy "Users can update their own basic data"
on "public"."users"
as permissive
for update
to public
using ((auth.uid() = id))
with check (((auth.uid() = id) AND (role_id IS NOT NULL)));


create policy "Users can view other users in their conversations"
on "public"."users"
as permissive
for select
to public
using ((EXISTS ( SELECT 1
   FROM conversations
  WHERE (((conversations.client_id = auth.uid()) AND (conversations.professional_id = users.id)) OR ((conversations.professional_id = auth.uid()) AND (conversations.client_id = users.id))))));


create policy "Users can view their own data"
on "public"."users"
as permissive
for select
to public
using ((auth.uid() = id));


CREATE TRIGGER update_admin_configs_updated_at BEFORE UPDATE ON public.admin_configs FOR EACH ROW EXECUTE FUNCTION update_admin_configs_updated_at();

CREATE TRIGGER enforce_no_double_booking BEFORE INSERT OR UPDATE ON public.appointments FOR EACH ROW EXECUTE FUNCTION check_professional_availability();

CREATE TRIGGER handle_updated_at BEFORE UPDATE ON public.appointments FOR EACH ROW EXECUTE FUNCTION moddatetime('updated_at');

CREATE TRIGGER update_contact_inquiries_updated_at BEFORE UPDATE ON public.contact_inquiries FOR EACH ROW EXECUTE FUNCTION update_contact_inquiries_updated_at();

CREATE TRIGGER handle_updated_at BEFORE UPDATE ON public.email_templates FOR EACH ROW EXECUTE FUNCTION moddatetime('updated_at');

CREATE TRIGGER legal_document_versioning_trigger BEFORE INSERT OR UPDATE ON public.legal_documents FOR EACH ROW EXECUTE FUNCTION handle_legal_document_versioning();

CREATE TRIGGER handle_updated_at BEFORE UPDATE ON public.message_attachments FOR EACH ROW EXECUTE FUNCTION moddatetime('updated_at');

CREATE TRIGGER update_conversation_on_new_message AFTER INSERT ON public.messages FOR EACH ROW EXECUTE FUNCTION update_conversation_timestamp();

CREATE TRIGGER enforce_portfolio_photo_limit BEFORE INSERT ON public.portfolio_photos FOR EACH ROW EXECUTE FUNCTION check_portfolio_photo_limit();

CREATE TRIGGER payment_method_stripe_sync_trigger AFTER INSERT OR DELETE OR UPDATE ON public.professional_payment_methods FOR EACH ROW EXECUTE FUNCTION handle_payment_method_stripe_changes();

CREATE TRIGGER professional_profile_stripe_sync_trigger AFTER UPDATE ON public.professional_profiles FOR EACH ROW EXECUTE FUNCTION handle_professional_profile_stripe_changes();

CREATE TRIGGER after_professional_subscription_delete AFTER DELETE ON public.professional_subscriptions FOR EACH ROW EXECUTE FUNCTION update_professional_subscription_status();

CREATE TRIGGER after_professional_subscription_insert AFTER INSERT ON public.professional_subscriptions FOR EACH ROW EXECUTE FUNCTION update_professional_subscription_status();

CREATE TRIGGER after_professional_subscription_update AFTER UPDATE ON public.professional_subscriptions FOR EACH ROW EXECUTE FUNCTION update_professional_subscription_status();

CREATE TRIGGER update_refunds_updated_at BEFORE UPDATE ON public.refunds FOR EACH ROW EXECUTE FUNCTION update_refunds_updated_at();

CREATE TRIGGER update_reviews_updated_at BEFORE UPDATE ON public.reviews FOR EACH ROW EXECUTE FUNCTION update_reviews_updated_at();

CREATE TRIGGER enforce_service_limit BEFORE INSERT ON public.services FOR EACH ROW EXECUTE FUNCTION check_service_limit();

CREATE TRIGGER service_stripe_sync_trigger BEFORE INSERT OR UPDATE ON public.services FOR EACH ROW EXECUTE FUNCTION handle_service_stripe_sync();

CREATE TRIGGER on_user_role_change AFTER UPDATE OF role_id ON public.users FOR EACH ROW EXECUTE FUNCTION handle_new_professional();

CREATE TRIGGER on_user_role_change_to_client AFTER UPDATE OF role_id ON public.users FOR EACH ROW EXECUTE FUNCTION handle_new_client();


