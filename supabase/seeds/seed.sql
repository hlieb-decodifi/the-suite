-- supabase/seed.sql

-- Clear existing data from payment_methods to avoid duplicates if script is run multiple times
-- Be cautious with DELETE in production environments!
DELETE FROM public.payment_methods;

-- Insert default payment methods with proper is_online values
INSERT INTO public.payment_methods (name, is_online) VALUES
('Credit Card', true),
('Cash', false)
ON CONFLICT (name) DO UPDATE SET 
  is_online = EXCLUDED.is_online,
  created_at = public.payment_methods.created_at; -- preserve original creation timestamp

-- Clear existing data from subscription_plans
DELETE FROM public.subscription_plans;

-- Insert subscription plans with Stripe price IDs
INSERT INTO public.subscription_plans (name, description, price, interval, stripe_price_id, is_active) VALUES
('Monthly', 'Standard monthly subscription', 19.99, 'month', 'price_1RRXNtLMOPuguC73GyfxSC26', true),
('Yearly', 'Standard yearly subscription (save 15%)', 199.99, 'year', 'price_1RRXNzLMOPuguC73xExJDINf', true)


-- Insert default service limits (50) for all existing professional profiles
-- This will only insert records for professionals who don't already have a limit set
INSERT INTO service_limits (professional_profile_id, max_services)
SELECT 
    pp.id as professional_profile_id,
    50 as max_services
FROM professional_profiles pp
WHERE NOT EXISTS (
    SELECT 1 
    FROM service_limits sl 
    WHERE sl.professional_profile_id = pp.id
);


-- You can add other seed data for other tables here if needed 