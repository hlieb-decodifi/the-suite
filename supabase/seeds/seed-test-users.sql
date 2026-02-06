-- supabase/seeds/seed-test-users.sql
-- Test users for development: professional and client accounts with sample data

/**
* DUMMY USERS
* Create test users for development
*/

-- Create dummy professional account with Stripe Connect account and subscription
DO $$
DECLARE
    dummy_user_id uuid := gen_random_uuid();
    monthly_plan_id uuid;
    dummy_address_id uuid;
    dummy_profile_id uuid;
BEGIN
    -- Create the auth user with all required fields
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
        dummy_user_id,
        'authenticated',
        'authenticated',
        'professional@mail.com',
        extensions.crypt('secret', extensions.gen_salt('bf')),
        current_timestamp,
        current_timestamp,
        current_timestamp,
        '{"provider":"email","providers":["email"]}',
        '{"first_name": "John", "last_name": "Doe", "role": "professional"}',
        current_timestamp,
        current_timestamp,
        '',
        '',
        '',
        ''
    );
    
    -- Create email identity for the user
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
        dummy_user_id,
        format('{"sub":"%s","email":"%s"}', dummy_user_id::text, 'professional@mail.com')::jsonb,
        dummy_user_id,
        'email',
        current_timestamp,
        current_timestamp,
        current_timestamp
    );
    
    -- Note: Professional role is set via metadata in raw_user_meta_data above
    -- The trigger will automatically create the role and profile
    
    -- Get the monthly subscription plan ID
    SELECT id INTO monthly_plan_id FROM subscription_plans WHERE name = 'Monthly' AND interval = 'month';
    
    -- Create address for the professional
    INSERT INTO addresses (
        country,
        state,
        city,
        street_address,
        apartment,
        latitude,
        longitude,
        google_place_id
    ) VALUES (
        'United States',
        'California',
        'San Francisco',
        '123 Main Street',
        'Apt 4B',
        37.7749,
        -122.4194,
        'ChIJN1t_tDeuEmsRUsoyG83frY4'
    ) RETURNING id INTO dummy_address_id;
    
    -- Note: The trigger on_auth_user_created will automatically create the user record
    -- and professional profile, so we don't need to insert them manually
    
    -- Get the professional profile ID that was created by the trigger
    SELECT id INTO dummy_profile_id 
    FROM professional_profiles 
    WHERE user_id = dummy_user_id;
    
    -- Update the professional profile with additional details (without Stripe Connect info)
    UPDATE professional_profiles SET
        description = 'Experienced professional with over 10 years in the industry. Specializing in high-quality services and exceptional customer satisfaction.',
        profession = 'Professional Services',
        appointment_requirements = 'Please arrive 10 minutes early for your appointment. Bring any necessary documentation.',
        phone_number = '+1-555-0123',
        working_hours = '{
  "hours": [
    {
      "day": "Monday",
      "enabled": true,
      "endTime": "17:00",
      "startTime": "07:00"
    },
    {
      "day": "Tuesday",
      "enabled": true,
      "endTime": "17:00",
      "startTime": "07:00"
    },
    {
      "day": "Wednesday",
      "enabled": true,
      "endTime": "17:00",
      "startTime": "07:00"
    },
    {
      "day": "Thursday",
      "enabled": true,
      "endTime": "17:00",
      "startTime": "07:00"
    },
    {
      "day": "Friday",
      "enabled": true,
      "endTime": "18:00",
      "startTime": "07:00"
    },
    {
      "day": "Saturday",
      "enabled": true,
      "endTime": "18:00",
      "startTime": "07:30"
    },
    {
      "day": "Sunday",
      "enabled": true,
      "endTime": "17:00",
      "startTime": "08:30"
    }
  ],
  "timezone": "Europe/Warsaw"
}'::jsonb,
        timezone = 'Europe/Warsaw',
        location = 'San Francisco, CA',
        address_id = dummy_address_id,
        facebook_url = 'https://facebook.com/johndoe',
        instagram_url = 'https://instagram.com/johndoe',
        tiktok_url = 'https://tiktok.com/@johndoe',
        is_published = true,
        requires_deposit = true,
        deposit_type = 'percentage',
        deposit_value = 25.00,
        allow_messages = true,
        hide_full_address = false,
        cancellation_policy_enabled = true,
        cancellation_24h_charge_percentage = 50.00,
        cancellation_48h_charge_percentage = 25.00
    WHERE user_id = dummy_user_id;
    
    -- Create Stripe Connect record in the secure table
    INSERT INTO professional_stripe_connect (
        professional_profile_id,
        stripe_account_id,
        stripe_connect_status,
        stripe_connect_updated_at
    ) VALUES (
        dummy_profile_id,
        'acct_1S2DSiLv1JUObFBA',
        'complete',
        NOW()
    );
    
    -- Create active subscription
    INSERT INTO professional_subscriptions (
        professional_profile_id,
        subscription_plan_id,
        status,
        start_date,
        end_date,
        stripe_subscription_id,
        cancel_at_period_end
    ) VALUES (
        dummy_profile_id,
        monthly_plan_id,
        'active',
        NOW(),
        NOW() + INTERVAL '1 month',
        'sub_dummy123456789',
        false
    );
    
    -- Create some sample services
    INSERT INTO services (
        professional_profile_id,
        name,
        description,
        price,
        duration,
        stripe_status,
        stripe_sync_status
    ) VALUES 
    (
        dummy_profile_id,
        'Basic Consultation',
        'Initial consultation to discuss your needs and requirements',
        50.00,
        30,
        'active',
        'synced'
    ),
    (
        dummy_profile_id,
        'Standard Service',
        'Our most popular service package with comprehensive coverage',
        150.00,
        60,
        'active',
        'synced'
    ),
    (
        dummy_profile_id,
        'Premium Service',
        'Premium service with extended duration and additional features',
        250.00,
        90,
        'active',
        'synced'
    );
    
    -- Add some payment methods
    INSERT INTO professional_payment_methods (
        professional_profile_id,
        payment_method_id
    ) 
    SELECT dummy_profile_id, id 
    FROM payment_methods 
    WHERE name IN ('Credit Card', 'Cash', 'Bank Transfer')
    LIMIT 3;
    
    RAISE NOTICE 'Dummy professional account created successfully!';
    RAISE NOTICE 'User ID: %', dummy_user_id;
    RAISE NOTICE 'Profile ID: %', dummy_profile_id;
    RAISE NOTICE 'Email: professional@mail.com';
    RAISE NOTICE 'Password: secret';
    RAISE NOTICE 'Stripe Account: acct_1S2DSiLv1JUObFBA';
    
END $$;

-- Create dummy client account
DO $$
DECLARE
    client_user_id uuid := gen_random_uuid();
    client_address_id uuid;
    client_profile_id uuid;
    professional_user_id uuid;
    prof_profile_id uuid;
    basic_service_id uuid;
    standard_service_id uuid;
    premium_service_id uuid;
    booking_id uuid;
    appointment_id uuid;
    booking_payment_id uuid;
BEGIN
    -- Get the professional user ID that was created above
    SELECT id INTO professional_user_id FROM auth.users WHERE email = 'professional@mail.com';
    SELECT id INTO prof_profile_id FROM professional_profiles WHERE user_id = professional_user_id;
    
    -- Get service IDs
    SELECT id INTO basic_service_id FROM services s WHERE s.professional_profile_id = prof_profile_id AND s.name = 'Basic Consultation' LIMIT 1;
    SELECT id INTO standard_service_id FROM services s WHERE s.professional_profile_id = prof_profile_id AND s.name = 'Standard Service' LIMIT 1;
    SELECT id INTO premium_service_id FROM services s WHERE s.professional_profile_id = prof_profile_id AND s.name = 'Premium Service' LIMIT 1;
    
    -- Create the auth user for client
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
        client_user_id,
        'authenticated',
        'authenticated',
        'client@mail.com',
        extensions.crypt('secret', extensions.gen_salt('bf')),
        current_timestamp,
        current_timestamp,
        current_timestamp,
        '{"provider":"email","providers":["email"]}',
        '{"first_name": "Jane", "last_name": "Smith", "role": "client"}',
        current_timestamp,
        current_timestamp,
        '',
        '',
        '',
        ''
    );
    
    -- Create email identity for the client
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
        client_user_id,
        format('{"sub":"%s","email":"%s"}', client_user_id::text, 'client@mail.com')::jsonb,
        client_user_id,
        'email',
        current_timestamp,
        current_timestamp,
        current_timestamp
    );
    
    -- Note: Client role is set via metadata in raw_user_meta_data above
    -- The trigger will automatically create the role and profile
    
    -- Create address for the client
    INSERT INTO addresses (
        country,
        state,
        city,
        street_address,
        apartment,
        latitude,
        longitude,
        google_place_id
    ) VALUES (
        'United States',
        'California',
        'San Francisco',
        '456 Oak Avenue',
        'Unit 2C',
        37.7849,
        -122.4094,
        'ChIJN1t_tDeuEmsRUsoyG83frY5'
    ) RETURNING id INTO client_address_id;
    
    -- Note: The trigger on_auth_user_created will automatically create the user record
    -- and client profile, so we don't need to insert them manually
    
    -- Get the client profile ID that was created by the trigger
    SELECT id INTO client_profile_id 
    FROM client_profiles 
    WHERE user_id = client_user_id;
    
    -- Update the client profile with additional details
    UPDATE client_profiles SET
        phone_number = '+1-555-0456',
        location = 'San Francisco, CA',
        address_id = client_address_id
    WHERE user_id = client_user_id;
    
    RAISE NOTICE 'Dummy client account created successfully!';
    RAISE NOTICE 'Client User ID: %', client_user_id;
    RAISE NOTICE 'Client Profile ID: %', client_profile_id;
    RAISE NOTICE 'Email: client@mail.com';
    RAISE NOTICE 'Password: secret';
END $$;
