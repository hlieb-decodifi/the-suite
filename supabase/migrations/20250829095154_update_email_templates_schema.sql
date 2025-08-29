set check_function_bodies = off;

-- Remove old columns from email_templates table
alter table "public"."email_templates" drop column "sender_name";
alter table "public"."email_templates" drop column "sender_email";
alter table "public"."email_templates" drop column "reply_to";
alter table "public"."email_templates" drop column "subject";
alter table "public"."email_templates" drop column "html_content";
alter table "public"."email_templates" drop column "to_field";

-- Add new columns for Brevo template reference
alter table "public"."email_templates" add column "brevo_template_id" integer not null default 0;
alter table "public"."email_templates" add column "dynamic_params" jsonb not null default '[]'::jsonb;

-- Create index for brevo_template_id
create index if not exists "idx_email_templates_brevo_template_id" on "public"."email_templates"("brevo_template_id");

-- Remove the default constraint from brevo_template_id since it should be explicitly set
alter table "public"."email_templates" alter column "brevo_template_id" drop default;


