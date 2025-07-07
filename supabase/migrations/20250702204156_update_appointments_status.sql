-- Step 1: Drop the existing constraint first
alter table "public"."appointments" drop constraint "appointments_status_check";

-- Step 2: Update existing data (now that constraint is gone)
UPDATE appointments 
SET status = 'active' 
WHERE status IN ('upcoming', 'completed');

-- Step 3: Update the default value
alter table "public"."appointments" alter column "status" set default 'active'::text;

-- Step 4: Add the new constraint
alter table "public"."appointments" add constraint "appointments_status_check" CHECK ((status = ANY (ARRAY['active'::text, 'cancelled'::text]))) not valid;

-- Step 5: Validate the constraint
alter table "public"."appointments" validate constraint "appointments_status_check";