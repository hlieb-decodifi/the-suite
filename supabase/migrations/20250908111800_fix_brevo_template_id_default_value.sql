-- Fix the brevo_template_id column to have a default value
-- This addresses the issue where the previous migration added a NOT NULL column without a default value

-- First, check if the column exists and update any existing NULL values
UPDATE email_templates SET brevo_template_id = 1 WHERE brevo_template_id IS NULL;

-- Add a default value to the column if it doesn't already have one
ALTER TABLE email_templates ALTER COLUMN brevo_template_id SET DEFAULT 1;
