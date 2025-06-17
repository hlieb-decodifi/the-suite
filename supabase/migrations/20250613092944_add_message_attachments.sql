create extension if not exists "moddatetime" with schema "extensions";


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

CREATE UNIQUE INDEX message_attachments_pkey ON public.message_attachments USING btree (id);

alter table "public"."message_attachments" add constraint "message_attachments_pkey" PRIMARY KEY using index "message_attachments_pkey";

alter table "public"."message_attachments" add constraint "message_attachments_file_size_check" CHECK ((file_size > 0)) not valid;

alter table "public"."message_attachments" validate constraint "message_attachments_file_size_check";

alter table "public"."message_attachments" add constraint "message_attachments_message_id_fkey" FOREIGN KEY (message_id) REFERENCES messages(id) ON DELETE CASCADE not valid;

alter table "public"."message_attachments" validate constraint "message_attachments_message_id_fkey";

alter table "public"."message_attachments" add constraint "message_attachments_type_check" CHECK ((type = 'image'::text)) not valid;

alter table "public"."message_attachments" validate constraint "message_attachments_type_check";

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


CREATE TRIGGER handle_updated_at BEFORE UPDATE ON public.message_attachments FOR EACH ROW EXECUTE FUNCTION moddatetime('updated_at');


