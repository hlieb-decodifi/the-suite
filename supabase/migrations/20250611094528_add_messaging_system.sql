create table "public"."conversations" (
    "id" uuid not null default uuid_generate_v4(),
    "client_id" uuid not null,
    "professional_id" uuid not null,
    "created_at" timestamp with time zone not null default timezone('utc'::text, now()),
    "updated_at" timestamp with time zone not null default timezone('utc'::text, now())
);


alter table "public"."conversations" enable row level security;

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

alter table "public"."professional_profiles" add column "allow_messages" boolean not null default false;

CREATE UNIQUE INDEX conversations_pkey ON public.conversations USING btree (id);

CREATE INDEX idx_conversations_client_id ON public.conversations USING btree (client_id);

CREATE INDEX idx_conversations_professional_id ON public.conversations USING btree (professional_id);

CREATE INDEX idx_messages_conversation_id ON public.messages USING btree (conversation_id);

CREATE INDEX idx_messages_created_at ON public.messages USING btree (created_at);

CREATE INDEX idx_messages_sender_id ON public.messages USING btree (sender_id);

CREATE UNIQUE INDEX messages_pkey ON public.messages USING btree (id);

CREATE UNIQUE INDEX unique_conversation ON public.conversations USING btree (client_id, professional_id);

alter table "public"."conversations" add constraint "conversations_pkey" PRIMARY KEY using index "conversations_pkey";

alter table "public"."messages" add constraint "messages_pkey" PRIMARY KEY using index "messages_pkey";

alter table "public"."conversations" add constraint "client_is_client" CHECK (is_client(client_id)) not valid;

alter table "public"."conversations" validate constraint "client_is_client";

alter table "public"."conversations" add constraint "conversations_client_id_fkey" FOREIGN KEY (client_id) REFERENCES users(id) not valid;

alter table "public"."conversations" validate constraint "conversations_client_id_fkey";

alter table "public"."conversations" add constraint "conversations_professional_id_fkey" FOREIGN KEY (professional_id) REFERENCES users(id) not valid;

alter table "public"."conversations" validate constraint "conversations_professional_id_fkey";

alter table "public"."conversations" add constraint "professional_is_professional" CHECK (is_professional(professional_id)) not valid;

alter table "public"."conversations" validate constraint "professional_is_professional";

alter table "public"."conversations" add constraint "unique_conversation" UNIQUE using index "unique_conversation";

alter table "public"."messages" add constraint "messages_conversation_id_fkey" FOREIGN KEY (conversation_id) REFERENCES conversations(id) not valid;

alter table "public"."messages" validate constraint "messages_conversation_id_fkey";

alter table "public"."messages" add constraint "messages_sender_id_fkey" FOREIGN KEY (sender_id) REFERENCES users(id) not valid;

alter table "public"."messages" validate constraint "messages_sender_id_fkey";

set check_function_bodies = off;

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

create policy "Clients can create conversations with professionals who allow m"
on "public"."conversations"
as permissive
for insert
to public
with check (((auth.uid() = client_id) AND is_client(auth.uid()) AND is_professional(professional_id) AND (EXISTS ( SELECT 1
   FROM professional_profiles
  WHERE ((professional_profiles.user_id = conversations.professional_id) AND (professional_profiles.allow_messages = true))))));


create policy "Users can view their own conversations"
on "public"."conversations"
as permissive
for select
to public
using (((auth.uid() = client_id) OR (auth.uid() = professional_id)));


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


CREATE TRIGGER update_conversation_on_new_message AFTER INSERT ON public.messages FOR EACH ROW EXECUTE FUNCTION update_conversation_timestamp();


