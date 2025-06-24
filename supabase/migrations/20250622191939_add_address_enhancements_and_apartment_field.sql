alter table "public"."addresses" add column "apartment" text;

alter table "public"."addresses" add column "google_place_id" text;

alter table "public"."addresses" add column "latitude" numeric(10,8);

alter table "public"."addresses" add column "longitude" numeric(11,8);

alter table "public"."professional_profiles" add column "hide_full_address" boolean not null default false;

CREATE INDEX idx_addresses_coordinates ON public.addresses USING btree (latitude, longitude) WHERE ((latitude IS NOT NULL) AND (longitude IS NOT NULL));

CREATE INDEX idx_addresses_google_place_id ON public.addresses USING btree (google_place_id) WHERE (google_place_id IS NOT NULL);


