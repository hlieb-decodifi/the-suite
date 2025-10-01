-- Remove dangerous RLS policies that allow users to directly modify customer records
-- Customer records should only be managed by admin functions via Stripe webhooks

-- Drop existing policies that allow user modifications
drop policy if exists "Users can create their own customer record" on customers;
drop policy if exists "Users can update their own customer record" on customers;

-- The select policy is kept so users can still view their own customer data:
-- "Users can view their own customer data" - this one stays
