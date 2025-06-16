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

CREATE INDEX idx_legal_documents_published ON public.legal_documents USING btree (type, is_published) WHERE (is_published = true);

CREATE INDEX idx_legal_documents_type ON public.legal_documents USING btree (type);

CREATE UNIQUE INDEX legal_documents_pkey ON public.legal_documents USING btree (id);

CREATE UNIQUE INDEX unique_published_per_type ON public.legal_documents USING btree (type, is_published);

alter table "public"."legal_documents" add constraint "legal_documents_pkey" PRIMARY KEY using index "legal_documents_pkey";

alter table "public"."legal_documents" add constraint "legal_documents_created_by_fkey" FOREIGN KEY (created_by) REFERENCES users(id) not valid;

alter table "public"."legal_documents" validate constraint "legal_documents_created_by_fkey";

alter table "public"."legal_documents" add constraint "legal_documents_type_check" CHECK ((type = ANY (ARRAY['terms_and_conditions'::text, 'privacy_policy'::text]))) not valid;

alter table "public"."legal_documents" validate constraint "legal_documents_type_check";

alter table "public"."legal_documents" add constraint "unique_published_per_type" UNIQUE using index "unique_published_per_type" DEFERRABLE INITIALLY DEFERRED;

set check_function_bodies = off;

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

create policy "Anyone can view published legal documents"
on "public"."legal_documents"
as permissive
for select
to public
using ((is_published = true));


CREATE TRIGGER legal_document_versioning_trigger BEFORE INSERT OR UPDATE ON public.legal_documents FOR EACH ROW EXECUTE FUNCTION handle_legal_document_versioning();


