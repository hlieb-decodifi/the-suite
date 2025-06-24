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

CREATE UNIQUE INDEX contact_inquiries_pkey ON public.contact_inquiries USING btree (id);

CREATE INDEX idx_contact_inquiries_assigned_to ON public.contact_inquiries USING btree (assigned_to);

CREATE INDEX idx_contact_inquiries_created_at ON public.contact_inquiries USING btree (created_at);

CREATE INDEX idx_contact_inquiries_status ON public.contact_inquiries USING btree (status);

CREATE INDEX idx_contact_inquiries_user_id ON public.contact_inquiries USING btree (user_id);

alter table "public"."contact_inquiries" add constraint "contact_inquiries_pkey" PRIMARY KEY using index "contact_inquiries_pkey";

alter table "public"."contact_inquiries" add constraint "contact_inquiries_assigned_to_fkey" FOREIGN KEY (assigned_to) REFERENCES auth.users(id) not valid;

alter table "public"."contact_inquiries" validate constraint "contact_inquiries_assigned_to_fkey";

alter table "public"."contact_inquiries" add constraint "contact_inquiries_status_check" CHECK ((status = ANY (ARRAY['new'::text, 'in_progress'::text, 'resolved'::text, 'closed'::text]))) not valid;

alter table "public"."contact_inquiries" validate constraint "contact_inquiries_status_check";

alter table "public"."contact_inquiries" add constraint "contact_inquiries_urgency_check" CHECK ((urgency = ANY (ARRAY['low'::text, 'medium'::text, 'high'::text]))) not valid;

alter table "public"."contact_inquiries" validate constraint "contact_inquiries_urgency_check";

alter table "public"."contact_inquiries" add constraint "contact_inquiries_user_id_fkey" FOREIGN KEY (user_id) REFERENCES auth.users(id) not valid;

alter table "public"."contact_inquiries" validate constraint "contact_inquiries_user_id_fkey";

set check_function_bodies = off;

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


create policy "Users can create inquiries"
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


CREATE TRIGGER update_contact_inquiries_updated_at BEFORE UPDATE ON public.contact_inquiries FOR EACH ROW EXECUTE FUNCTION update_contact_inquiries_updated_at();


