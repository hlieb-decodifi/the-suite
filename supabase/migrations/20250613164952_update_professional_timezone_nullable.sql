alter table "public"."professional_profiles" alter column "timezone" drop default;

alter table "public"."professional_profiles" alter column "timezone" drop not null;


