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

CREATE UNIQUE INDEX email_templates_pkey ON public.email_templates USING btree (id);

CREATE INDEX idx_email_templates_is_active ON public.email_templates USING btree (is_active);

CREATE INDEX idx_email_templates_tag ON public.email_templates USING btree (tag);

CREATE UNIQUE INDEX unique_template_name ON public.email_templates USING btree (name);

CREATE UNIQUE INDEX unique_template_tag ON public.email_templates USING btree (tag);

alter table "public"."email_templates" add constraint "email_templates_pkey" PRIMARY KEY using index "email_templates_pkey";

alter table "public"."email_templates" add constraint "unique_template_name" UNIQUE using index "unique_template_name";

alter table "public"."email_templates" add constraint "unique_template_tag" UNIQUE using index "unique_template_tag";

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


CREATE TRIGGER handle_updated_at BEFORE UPDATE ON public.email_templates FOR EACH ROW EXECUTE FUNCTION moddatetime('updated_at');


