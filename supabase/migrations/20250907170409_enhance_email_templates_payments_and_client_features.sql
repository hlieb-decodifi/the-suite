alter table "public"."booking_payments" add column "deposit_payment_intent_id" text;

alter table "public"."client_profiles" add column "timezone" text default 'UTC'::text;

alter table "public"."email_templates" drop column "html_content";

alter table "public"."email_templates" drop column "reply_to";

alter table "public"."email_templates" drop column "sender_email";

alter table "public"."email_templates" drop column "sender_name";

alter table "public"."email_templates" drop column "subject";

alter table "public"."email_templates" drop column "to_field";

alter table "public"."email_templates" add column "brevo_template_id" integer not null;

alter table "public"."email_templates" add column "dynamic_params" jsonb not null default '[]'::jsonb;

CREATE INDEX idx_email_templates_brevo_template_id ON public.email_templates USING btree (brevo_template_id);

set check_function_bodies = off;

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

  -- If we're between start and end time, it's ongoing
  return 'ongoing';
end;
$function$
;


