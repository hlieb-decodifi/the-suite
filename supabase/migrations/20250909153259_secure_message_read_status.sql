drop policy "Users can update their own messages" on "public"."messages";

create table "public"."message_read_status" (
    "id" uuid not null default uuid_generate_v4(),
    "message_id" uuid not null,
    "user_id" uuid not null,
    "read_at" timestamp with time zone not null default timezone('utc'::text, now()),
    "created_at" timestamp with time zone not null default timezone('utc'::text, now())
);


alter table "public"."message_read_status" enable row level security;

CREATE INDEX idx_message_read_status_message_id ON public.message_read_status USING btree (message_id);

CREATE INDEX idx_message_read_status_read_at ON public.message_read_status USING btree (read_at);

CREATE INDEX idx_message_read_status_user_id ON public.message_read_status USING btree (user_id);

CREATE UNIQUE INDEX unique_message_user_read ON public.message_read_status USING btree (message_id, user_id);

alter table "public"."message_read_status" add constraint "unique_message_user_read" UNIQUE using index "unique_message_user_read";

-- IMPORTANT: Migrate existing read status data before dropping the is_read column
-- This preserves existing message read status when deploying to production
DO $$
BEGIN
  -- Only proceed if is_read column exists (for production deployment)
  IF EXISTS (
    SELECT 1 FROM information_schema.columns 
    WHERE table_name = 'messages' 
    AND column_name = 'is_read'
    AND table_schema = 'public'
  ) THEN
    
    -- Migrate existing read status data
    -- For each message that is marked as read (is_read = true), 
    -- we need to determine which users have read it
    
    -- Insert read status records for messages marked as read
    -- We'll use the conversation participants to determine who has read the message
    INSERT INTO public.message_read_status (message_id, user_id, read_at, created_at)
    SELECT DISTINCT
      m.id as message_id,
      -- For read messages, mark as read by the non-sender participant in the conversation
      CASE 
        WHEN m.sender_id = c.client_id THEN c.professional_id
        ELSE c.client_id
      END as user_id,
      m.updated_at as read_at,  -- Use message updated_at as approximate read time
      timezone('utc'::text, now()) as created_at
    FROM public.messages m
    JOIN public.conversations c ON m.conversation_id = c.id
    WHERE m.is_read = true
    AND m.sender_id != CASE 
      WHEN m.sender_id = c.client_id THEN c.professional_id
      ELSE c.client_id
    END  -- Don't mark messages as read by their own senders
    ON CONFLICT (message_id, user_id) DO NOTHING;  -- Avoid duplicates
    
    -- Log the migration results
    RAISE NOTICE 'Message read status migration completed. Migrated % records from is_read column.',
      (SELECT COUNT(*) FROM public.message_read_status);
      
  ELSE
    RAISE NOTICE 'Message read status migration skipped - is_read column does not exist (already migrated)';
  END IF;
END
$$;

alter table "public"."messages" drop column "is_read";

CREATE UNIQUE INDEX message_read_status_pkey ON public.message_read_status USING btree (id);

alter table "public"."message_read_status" add constraint "message_read_status_pkey" PRIMARY KEY using index "message_read_status_pkey";

alter table "public"."message_read_status" add constraint "message_read_status_message_id_fkey" FOREIGN KEY (message_id) REFERENCES messages(id) not valid;

alter table "public"."message_read_status" validate constraint "message_read_status_message_id_fkey";

alter table "public"."message_read_status" add constraint "message_read_status_user_id_fkey" FOREIGN KEY (user_id) REFERENCES users(id) not valid;

alter table "public"."message_read_status" validate constraint "message_read_status_user_id_fkey";

set check_function_bodies = off;

CREATE OR REPLACE FUNCTION public.get_unread_message_count(p_conversation_id uuid, p_user_id uuid)
 RETURNS integer
 LANGUAGE plpgsql
 SECURITY DEFINER
AS $function$
begin
  return (
    select count(*)::integer
    from messages m
    where m.conversation_id = p_conversation_id
    and m.sender_id != p_user_id  -- Don't count own messages
    and not exists (
      select 1 from message_read_status mrs
      where mrs.message_id = m.id and mrs.user_id = p_user_id
    )
  );
end;
$function$
;

CREATE OR REPLACE FUNCTION public.is_message_read(p_message_id uuid, p_user_id uuid)
 RETURNS boolean
 LANGUAGE plpgsql
 SECURITY DEFINER
AS $function$
begin
  return exists (
    select 1 from message_read_status
    where message_id = p_message_id and user_id = p_user_id
  );
end;
$function$
;

CREATE OR REPLACE FUNCTION public.mark_message_read(p_message_id uuid, p_user_id uuid)
 RETURNS boolean
 LANGUAGE plpgsql
 SECURITY DEFINER
AS $function$
begin
  insert into message_read_status (message_id, user_id)
  values (p_message_id, p_user_id)
  on conflict (message_id, user_id)
  do update set read_at = timezone('utc'::text, now());
  
  return true;
end;
$function$
;

grant delete on table "public"."message_read_status" to "anon";

grant insert on table "public"."message_read_status" to "anon";

grant references on table "public"."message_read_status" to "anon";

grant select on table "public"."message_read_status" to "anon";

grant trigger on table "public"."message_read_status" to "anon";

grant truncate on table "public"."message_read_status" to "anon";

grant update on table "public"."message_read_status" to "anon";

grant delete on table "public"."message_read_status" to "authenticated";

grant insert on table "public"."message_read_status" to "authenticated";

grant references on table "public"."message_read_status" to "authenticated";

grant select on table "public"."message_read_status" to "authenticated";

grant trigger on table "public"."message_read_status" to "authenticated";

grant truncate on table "public"."message_read_status" to "authenticated";

grant update on table "public"."message_read_status" to "authenticated";

grant delete on table "public"."message_read_status" to "service_role";

grant insert on table "public"."message_read_status" to "service_role";

grant references on table "public"."message_read_status" to "service_role";

grant select on table "public"."message_read_status" to "service_role";

grant trigger on table "public"."message_read_status" to "service_role";

grant truncate on table "public"."message_read_status" to "service_role";

grant update on table "public"."message_read_status" to "service_role";

create policy "Users can mark messages as read in their conversations"
on "public"."message_read_status"
as permissive
for insert
to public
with check (((auth.uid() = user_id) AND (EXISTS ( SELECT 1
   FROM (messages m
     JOIN conversations c ON ((c.id = m.conversation_id)))
  WHERE ((m.id = message_read_status.message_id) AND ((c.client_id = auth.uid()) OR (c.professional_id = auth.uid())))))));


create policy "Users can update their own read status"
on "public"."message_read_status"
as permissive
for update
to public
using ((auth.uid() = user_id));


create policy "Users can view read status in their conversations"
on "public"."message_read_status"
as permissive
for select
to public
using ((EXISTS ( SELECT 1
   FROM (messages m
     JOIN conversations c ON ((c.id = m.conversation_id)))
  WHERE ((m.id = message_read_status.message_id) AND ((c.client_id = auth.uid()) OR (c.professional_id = auth.uid()))))));



