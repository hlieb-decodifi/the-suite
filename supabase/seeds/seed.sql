-- supabase/seed.sql
-- Core data: Payment methods, Subscription plans, Admin configs, and Users

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
('Monthly', 'Standard monthly subscription', 7.99, 'month', 'price_1S50bHLMOPuguC73nAT6QPxH', true),
('Yearly', 'Standard yearly subscription', 75.00, 'year', 'price_1S50atLMOPuguC73Ujmb976p', true);


/**
* ADMIN CONFIGS
* Define admin configs
*/
insert into admin_configs (key, value, description, data_type) values
  ('min_reviews_to_display', '5', 'Minimum number of reviews before displaying professional reviews publicly', 'integer'),
  ('service_fee_dollars', '1.0', 'Service fee charged on transactions', 'decimal'),
  ('max_portfolio_photos', '20', 'Maximum number of portfolio photos per professional', 'integer'),
  ('max_services_default', '50', 'Default maximum number of services per professional', 'integer'),
  ('review_edit_window_days', '7', 'Number of days clients can edit their reviews after creation', 'integer');

/**
* ADMIN USER
* Create admin user (essential system account)
*/

-- Create admin user
DO $$
DECLARE
    admin_user_id uuid := gen_random_uuid();
BEGIN
    -- Create the auth user for admin
    INSERT INTO auth.users (
        instance_id,
        id,
        aud,
        role,
        email,
        encrypted_password,
        email_confirmed_at,
        recovery_sent_at,
        last_sign_in_at,
        raw_app_meta_data,
        raw_user_meta_data,
        created_at,
        updated_at,
        confirmation_token,
        email_change,
        email_change_token_new,
        recovery_token
    ) VALUES (
        '00000000-0000-0000-0000-000000000000',
        admin_user_id,
        'authenticated',
        'authenticated',
        'admin@decodifi.uk',
        extensions.crypt('mHMGB1uzkdfQ16xU', extensions.gen_salt('bf')),
        current_timestamp,
        current_timestamp,
        current_timestamp,
        '{"provider":"email","providers":["email"]}',
        '{"first_name": "Admin", "last_name": "User", "role": "admin"}',
        current_timestamp,
        current_timestamp,
        '',
        '',
        '',
        ''
    );
    
    -- Create email identity for the admin user
    INSERT INTO auth.identities (
        id,
        user_id,
        identity_data,
        provider_id,
        provider,
        last_sign_in_at,
        created_at,
        updated_at
    ) VALUES (
        gen_random_uuid(),
        admin_user_id,
        format('{"sub":"%s","email":"%s"}', admin_user_id::text, 'admin@decodifi.uk')::jsonb,
        admin_user_id,
        'email',
        current_timestamp,
        current_timestamp,
        current_timestamp
    );
    
    -- Manually assign admin role (bypassing trigger security)
    -- Admin role cannot be set via metadata for security reasons
    INSERT INTO public.user_roles (user_id, role)
    VALUES (admin_user_id, 'admin')
    ON CONFLICT (user_id) DO UPDATE SET role = 'admin', updated_at = NOW();
    
    RAISE NOTICE 'Admin user created successfully!';
    RAISE NOTICE 'Admin User ID: %', admin_user_id;
    RAISE NOTICE 'Email: admin@decodifi.uk';
    RAISE NOTICE 'Password: mHMGB1uzkdfQ16xU';
    RAISE NOTICE 'Role: admin';
    
END $$;