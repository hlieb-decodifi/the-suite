-- supabase/seed.sql

-- Clear existing data from payment_methods to avoid duplicates if script is run multiple times
-- Be cautious with DELETE in production environments!
DELETE FROM public.payment_methods;

-- Insert default payment methods
INSERT INTO public.payment_methods (name) VALUES
('Credit Card'),
('Cash')
ON CONFLICT (name) DO NOTHING; -- Avoid errors if they somehow already exist

-- You can add other seed data for other tables here if needed 