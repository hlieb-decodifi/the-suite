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
* EMAIL TEMPLATES
* Define email templates
*/
-- Clear existing data from email_templates
DELETE FROM public.email_templates;

-- Insert email templates with simplified structure
INSERT INTO public.email_templates (
  name,
  description,
  tag,
  brevo_template_id,
  dynamic_params,
  is_active
) VALUES
-- Booking related templates
(
  'Booking Cancellation -  Within Accepted Time Period - Professional',
  'Email sent to professionals when a booking is cancelled with accepted time period',
  'BookingCancellationWithinAcceptedTimePeriodProfessional',
  32,
  '[]'::jsonb,
  true
),
(
  'Booking Cancellation -  Within Accepted Time Period - Client',
  'Email sent to clients when a booking is cancelled with accepted time period',
  'BookingCancellationWithinAcceptedTimePeriodClient',
  31,
  '[]'::jsonb,
  true
),
(
  'Booking Confirmation Email - Client',
  'Email sent to clients when a booking is confirmed',
  'BookingConfirmationClient',
  25,
  '[]'::jsonb,
  true
),
(
  'Booking Confirmation Email - Professional',
  'Email sent to professionals when a new booking is made',
  'BookingConfirmationProfessional',
  26,
  '[]'::jsonb,
  true
),
(
  'Appointment Completion - 2h after - Client',
  'Email sent to clients 2 hours after their appointment is completed',
  'AppointmentCompletion2hafterClient',
  35,
  '[]'::jsonb,
  true
),
(
  'Appointment Completion -  2h after - Professional',
  'Email sent to professionals 2 hours after their appointment is completed',
  'AppointmentCompletion2hafterProfessional',
  36,
  '[]'::jsonb,
  true
),


-- Policy related templates
(
  'Booking Cancellation - Less than 24h /48h - Client',
  'Email sent to clients when cancellation fee is charged',
  'BookingCancellationLessthan24h48hclient',
  27,
  '[]'::jsonb,
  true
),
(
  'Booking Cancellation - Less than 24h /48h - Professional',
  'Email sent to professionals when cancellation fee is applied',
  'BookingCancellationLessthan24h48hprofessional',
  30,
  '[]'::jsonb,
  true
),

-- Incident related templates
(
  'Booking Cancellation - No Show - Client',
  'Email sent to clients when marked as no-show',
  'BookingCancellationNoShowClient',
  33,
  '[]'::jsonb,
  true
),
(
  'Booking Cancellation - No Show - Professional',
  'Email sent to professionals when client is marked as no-show',
  'BookingCancellationNoShowProfessional',
  34,
  '[]'::jsonb,
  true
),


-- Contact related templates
(
  'Contact Inquiry - Admin Notification',
  'Email sent to admin when contact form is submitted',
  'ContactInquiryAdmin',
  40,
  '[]'::jsonb,
  true
),
(
  'Contact Inquiry - Confirmation',
  'Email sent to confirm contact form submission',
  'ContactInquiryConfirmation',
  39,
  '[]'::jsonb,
  true
),


-- Support Request related templates
(
  'Support Request - Creation',
  'Email sent to professional when support request is created',
  'SupportRequestCreation',
  41,
  '[]'::jsonb,
  true
),
(
  'Support Request - Refunded - Client',
  'Email sent to client when support request results in refund',
  'SupportRequestRefundedClient',
  42,
  '[]'::jsonb,
  true
),
(
  'Support Request - Refunded - Professional',
  'Email sent to professional when support request results in refund',
  'SupportRequestRefundedProfessional',
  43,
  '[]'::jsonb,
  true
),
(
  'Support Request - Resolved - Client',
  'Email sent to client when support request is resolved without refund',
  'SupportRequestResolvedClient',
  44,
  '[]'::jsonb,
  true
),
(
  'Support Request - Resolved - Professional',
  'Email sent to professional when support request is resolved without refund',
  'SupportRequestResolvedProfessional',
  45,
  '[]'::jsonb,
  true
);

/**
* LEGAL DOCUMENTS
* Define legal documents
*/
-- Clear existing legal documents to avoid duplicates
DELETE FROM public.legal_documents;

-- Insert default legal documents
INSERT INTO public.legal_documents (type, title, content, is_published, effective_date) VALUES
(
  'terms_and_conditions',
  'Terms and Conditions',
  '<h1>Terms and Conditions</h1>
<p>Welcome to our platform. By using our services, you agree to the following terms and conditions.</p>
<h2>1. Acceptance of Terms</h2>
<p>By accessing and using this service, you accept and agree to be bound by the terms and provision of this agreement.</p>
<h2>2. Service Description</h2>
<p>Our platform connects clients with professional service providers.</p>
<h2>3. User Responsibilities</h2>
<p>Users are responsible for maintaining accurate information and professional conduct.</p>
<h2>4. Privacy Protection</h2>
<p>We are committed to protecting your privacy and personal information.</p>
<h2>5. Limitation of Liability</h2>
<p>Our liability is limited to the extent permitted by applicable law.</p>
<p><em>Last updated: ' || to_char(now(), 'Month DD, YYYY') || '</em></p>',
  true,
  timezone('utc'::text, now())
),
(
  'privacy_policy',
  'Privacy Policy',
  '<h1>Privacy Policy</h1>
<p>This Privacy Policy describes how we collect, use, and protect your personal information.</p>
<h2>1. Information We Collect</h2>
<p>We collect information you provide directly to us, such as when you create an account or contact us.</p>
<h2>2. How We Use Your Information</h2>
<p>We use the information we collect to provide, maintain, and improve our services.</p>
<h2>3. Information Sharing</h2>
<p>We do not share your personal information with third parties except as described in this policy.</p>
<h2>4. Data Security</h2>
<p>We implement appropriate security measures to protect your personal information.</p>
<h2>5. Your Rights</h2>
<p>You have the right to access, update, or delete your personal information.</p>
<p><em>Last updated: ' || to_char(now(), 'Month DD, YYYY') || '</em></p>',
  true,
  timezone('utc'::text, now())
);



/**
* STORAGE BUCKETS
* Define storage buckets and their policies
*/
-- Create profile-photos bucket
insert into storage.buckets (id, name, public)
  values ('profile-photos', 'Profile Photos', true); -- TODO: change to false

-- Create portfolio-photos bucket (not public)
insert into storage.buckets (id, name, public)
  values ('portfolio-photos', 'Portfolio Photos', true);

-- Create message-attachments bucket (not public)
insert into storage.buckets (id, name, public)
  values ('message-attachments', 'Message Attachments', true);

-- Policies for profile-photos bucket
create policy "Allow authenticated uploads to profile-photos"
  on storage.objects for insert to authenticated
  with check (
    bucket_id = 'profile-photos' and
    (storage.foldername(name))[1] = auth.uid()::text
  );

create policy "Allow authenticated users to modify their own profile photos"
  on storage.objects for update to authenticated
  with check (
    bucket_id = 'profile-photos' and
    (storage.foldername(name))[1] = auth.uid()::text
  );

create policy "Allow authenticated users to delete their own profile photos"
  on storage.objects for delete to authenticated
  using (
    bucket_id = 'profile-photos' and
    (storage.foldername(name))[1] = auth.uid()::text
  );

create policy "Allow authenticated users to see all profile photos"
  on storage.objects for select to authenticated
  using (
    bucket_id = 'profile-photos'
  );

-- Policies for portfolio-photos bucket
create policy "Allow authenticated uploads to portfolio-photos"
  on storage.objects for insert to authenticated
  with check (
    bucket_id = 'portfolio-photos' and
    (storage.foldername(name))[1] = auth.uid()::text
  );

create policy "Allow authenticated users to modify their own portfolio photos"
  on storage.objects for update to authenticated
  with check (
    bucket_id = 'portfolio-photos' and
    (storage.foldername(name))[1] = auth.uid()::text
  );

create policy "Allow authenticated users to delete their own portfolio photos"
  on storage.objects for delete to authenticated
  using (
    bucket_id = 'portfolio-photos' and
    (storage.foldername(name))[1] = auth.uid()::text
  );

create policy "Allow users to view their own portfolio photos"
  on storage.objects for select to authenticated
  using (
    bucket_id = 'portfolio-photos' and
    (storage.foldername(name))[1] = auth.uid()::text
  );

create policy "Allow viewing portfolio photos of published professionals"
  on storage.objects for select to authenticated
  using (
    bucket_id = 'portfolio-photos' and
    exists (
      select 1 from professional_profiles
      where professional_profiles.user_id::text = (storage.foldername(name))[1]
      and professional_profiles.is_published = true
    )
  );

-- Policies for message-attachments bucket
create policy "Allow authenticated uploads to message-attachments bucket"
  on storage.objects for insert to authenticated
  with check (
    bucket_id = 'message-attachments' and
    (storage.foldername(name))[1] = auth.uid()::text
  );

create policy "Allow users to delete their own message attachments from bucket"
  on storage.objects for delete to authenticated
  using (
    bucket_id = 'message-attachments' and
    (storage.foldername(name))[1] = auth.uid()::text
  );

create policy "Allow users to view message attachments in bucket"
  on storage.objects for select to authenticated
  using (
    bucket_id = 'message-attachments'
  );

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
        crypt('secret', gen_salt('bf')),
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
    
    -- Note: Professional role will be set via user_roles table after user creation
    
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
    
    -- Update the professional profile with additional details and Stripe Connect info
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
        stripe_account_id = 'acct_1S2DSiLv1JUObFBA',
        stripe_connect_status = 'complete',
        stripe_connect_updated_at = NOW(),
        requires_deposit = true,
        deposit_type = 'percentage',
        deposit_value = 25.00,
        allow_messages = true,
        hide_full_address = false,
        cancellation_policy_enabled = true,
        cancellation_24h_charge_percentage = 50.00,
        cancellation_48h_charge_percentage = 25.00
    WHERE user_id = dummy_user_id;
    
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
        crypt('secret', gen_salt('bf')),
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
    
    -- Note: Client role will be set via user_roles table after user creation
    
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
    
    -- Create various appointments covering different scenarios
    
    -- 1. Past completed appointment (with payment and review)
    INSERT INTO bookings (
        client_id,
        professional_profile_id,
        status,
        notes
    ) VALUES (
        client_user_id,
        prof_profile_id,
        'completed',
        'Great service, very professional'
    ) RETURNING id INTO booking_id;
    
    INSERT INTO appointments (
        booking_id,
        start_time,
        end_time,
        status
    ) VALUES (
        booking_id,
        NOW() - INTERVAL '7 days' + INTERVAL '10 hours',
        NOW() - INTERVAL '7 days' + INTERVAL '11 hours',
        'completed'
    ) RETURNING id INTO appointment_id;
    
    INSERT INTO booking_services (
        booking_id,
        service_id,
        price,
        duration
    ) VALUES (
        booking_id,
        standard_service_id,
        150.00,
        60
    );
    
    INSERT INTO booking_payments (
        booking_id,
        payment_method_id,
        amount,
        tip_amount,
        service_fee,
        status,
        stripe_payment_intent_id
    ) VALUES (
        booking_id,
        (SELECT id FROM payment_methods WHERE name = 'Credit Card'),
        150.00,
        20.00,
        1.00,
        'completed',
        'pi_completed_123'
    ) RETURNING id INTO booking_payment_id;
    
    -- Add review for completed appointment
    INSERT INTO reviews (
        appointment_id,
        client_id,
        professional_id,
        score,
        message
    ) VALUES (
        appointment_id,
        client_user_id,
        professional_user_id,
        5,
        'Excellent service! Very professional and thorough. Would definitely recommend.'
    );
    
    -- 2. Past cancelled appointment (with cancellation fee)
    INSERT INTO bookings (
        client_id,
        professional_profile_id,
        status,
        notes
    ) VALUES (
        client_user_id,
        prof_profile_id,
        'cancelled',
        'Cancelled due to emergency'
    ) RETURNING id INTO booking_id;
    
    INSERT INTO appointments (
        booking_id,
        start_time,
        end_time,
        status
    ) VALUES (
        booking_id,
        NOW() - INTERVAL '3 days' + INTERVAL '14 hours',
        NOW() - INTERVAL '3 days' + INTERVAL '15 hours',
        'cancelled'
    );
    
    INSERT INTO booking_services (
        booking_id,
        service_id,
        price,
        duration
    ) VALUES (
        booking_id,
        premium_service_id,
        250.00,
        90
    );
    
    INSERT INTO booking_payments (
        booking_id,
        payment_method_id,
        amount,
        tip_amount,
        service_fee,
        status,
        stripe_payment_intent_id,
        refunded_amount,
        refund_reason,
        refunded_at
    ) VALUES (
        booking_id,
        (SELECT id FROM payment_methods WHERE name = 'Credit Card'),
        250.00,
        0.00,
        1.00,
        'partially_refunded',
        'pi_cancelled_456',
        187.50,
        'Cancellation fee applied (25% of service amount)',
        NOW() - INTERVAL '2 days'
    );
    
    -- 3. Upcoming confirmed appointment (with deposit paid)
    INSERT INTO bookings (
        id,
        client_id,
        professional_profile_id,
        status,
        notes
    ) VALUES (
        '0a399b49-4f8c-4064-8bc4-d0629e2dd694',
        client_user_id,
        prof_profile_id,
        'confirmed',
        'Looking forward to the appointment'
    ) RETURNING id INTO booking_id;
    
    INSERT INTO appointments (
        booking_id,
        start_time,
        end_time,
        status
    ) VALUES (
        booking_id,
        NOW() + INTERVAL '2 days' + INTERVAL '9 hours',
        NOW() + INTERVAL '2 days' + INTERVAL '10 hours',
        'ongoing'
    );
    
    INSERT INTO booking_services (
        booking_id,
        service_id,
        price,
        duration
    ) VALUES (
        booking_id,
        basic_service_id,
        50.00,
        30
    );
    
    INSERT INTO booking_payments (
        id,
        booking_id,
        payment_method_id,
        amount,
        tip_amount,
        service_fee,
        status,
        stripe_payment_intent_id,
        stripe_checkout_session_id,
        deposit_amount,
        balance_amount,
        payment_type,
        requires_balance_payment
    ) VALUES (
        '73dc758a-0d9d-4001-8276-679f6ec04504',
        booking_id,
        (SELECT id FROM payment_methods WHERE name = 'Credit Card'),
        51.00,
        0.00,
        1.00,
        'completed',
        'pi_3RsTfxLMOPuguC730nldFayF',
        'cs_test_a1zaEXowPcQaX9Mru09sikilJ5eU3AdvuvPnLuFfKOA83yExY4RHTAmsI7',
        50.00,
        1.00,
        'full',
        true
    );
    
    -- 4. Future appointment (pending payment)
    INSERT INTO bookings (
        client_id,
        professional_profile_id,
        status,
        notes
    ) VALUES (
        client_user_id,
        prof_profile_id,
        'pending_payment',
        'New appointment request'
    ) RETURNING id INTO booking_id;
    
    INSERT INTO appointments (
        booking_id,
        start_time,
        end_time,
        status
    ) VALUES (
        booking_id,
        NOW() + INTERVAL '1 week' + INTERVAL '11 hours',
        NOW() + INTERVAL '1 week' + INTERVAL '12 hours 30 minutes',
        'ongoing'
    );
    
    INSERT INTO booking_services (
        booking_id,
        service_id,
        price,
        duration
    ) VALUES (
        booking_id,
        standard_service_id,
        150.00,
        60
    );
    
    INSERT INTO booking_payments (
        booking_id,
        payment_method_id,
        amount,
        tip_amount,
        service_fee,
        status,
        stripe_checkout_session_id
    ) VALUES (
        booking_id,
        (SELECT id FROM payment_methods WHERE name = 'Credit Card'),
        150.00,
        0.00,
        1.00,
        'incomplete',
        'cs_pending_101'
    );
    
    -- 5. Past no-show appointment
    INSERT INTO bookings (
        client_id,
        professional_profile_id,
        status,
        notes
    ) VALUES (
        client_user_id,
        prof_profile_id,
        'cancelled',
        'Client no-show'
    ) RETURNING id INTO booking_id;
    
    INSERT INTO appointments (
        booking_id,
        start_time,
        end_time,
        status
    ) VALUES (
        booking_id,
        NOW() - INTERVAL '1 day' + INTERVAL '13 hours',
        NOW() - INTERVAL '1 day' + INTERVAL '14 hours',
        'cancelled'
    );
    
    INSERT INTO booking_services (
        booking_id,
        service_id,
        price,
        duration
    ) VALUES (
        booking_id,
        basic_service_id,
        50.00,
        30
    );
    
    INSERT INTO booking_payments (
        booking_id,
        payment_method_id,
        amount,
        tip_amount,
        service_fee,
        status,
        stripe_payment_intent_id,
        refunded_amount,
        refund_reason,
        refunded_at
    ) VALUES (
        booking_id,
        (SELECT id FROM payment_methods WHERE name = 'Credit Card'),
        50.00,
        0.00,
        1.00,
        'partially_refunded',
        'pi_noshow_202',
        25.00,
        'No-show fee applied (50% of service amount)',
        NOW() - INTERVAL '12 hours'
    );
    
    -- 6. Future appointment with pre-auth scheduled
    INSERT INTO bookings (
        client_id,
        professional_profile_id,
        status,
        notes
    ) VALUES (
        client_user_id,
        prof_profile_id,
        'confirmed',
        'Pre-auth appointment'
    ) RETURNING id INTO booking_id;
    
    INSERT INTO appointments (
        booking_id,
        start_time,
        end_time,
        status
    ) VALUES (
        booking_id,
        NOW() + INTERVAL '5 days' + INTERVAL '15 hours',
        NOW() + INTERVAL '5 days' + INTERVAL '16 hours 30 minutes',
        'ongoing'
    );
    
    INSERT INTO booking_services (
        booking_id,
        service_id,
        price,
        duration
    ) VALUES (
        booking_id,
        premium_service_id,
        250.00,
        90
    );
    
    INSERT INTO booking_payments (
        booking_id,
        payment_method_id,
        amount,
        tip_amount,
        service_fee,
        status,
        stripe_payment_intent_id,
        capture_method,
        pre_auth_scheduled_for,
        capture_scheduled_for
    ) VALUES (
        booking_id,
        (SELECT id FROM payment_methods WHERE name = 'Credit Card'),
        250.00,
        30.00,
        1.00,
        'authorized',
        'pi_preauth_303',
        'manual',
        NOW() + INTERVAL '1 day',
        NOW() + INTERVAL '5 days' + INTERVAL '16 hours 30 minutes' + INTERVAL '12 hours'
    );
    
    -- 7. Past completed appointment without review (for testing post-appointment flow)
    INSERT INTO bookings (
        client_id,
        professional_profile_id,
        status,
        notes
    ) VALUES (
        client_user_id,
        prof_profile_id,
        'completed',
        'Completed appointment without review - for testing post-appointment flow'
    ) RETURNING id INTO booking_id;
    
    INSERT INTO appointments (
        booking_id,
        start_time,
        end_time,
        status
    ) VALUES (
        booking_id,
        NOW() - INTERVAL '3 days' + INTERVAL '14 hours',  -- 2 PM, 3 days ago
        NOW() - INTERVAL '3 days' + INTERVAL '15 hours',  -- 3 PM, 3 days ago
        'completed'
    ) RETURNING id INTO appointment_id;
    
    INSERT INTO booking_services (
        booking_id,
        service_id,
        price,
        duration
    ) VALUES (
        booking_id,
        standard_service_id,
        150.00,
        60
    );
    
    INSERT INTO booking_payments (
        booking_id,
        payment_method_id,
        amount,
        tip_amount,
        service_fee,
        status,
        stripe_payment_intent_id
    ) VALUES (
        booking_id,
        (SELECT id FROM payment_methods WHERE name = 'Credit Card'),
        150.00,
        0.00,  -- No tip yet - can be added post-appointment
        1.00,
        'completed',
        'pi_completed_no_review_' || extract(epoch from now())::text
    );
    
    -- NOTE: Intentionally NOT creating a review for this appointment
    
    -- 8. Currently ongoing appointment (for testing Add Additional Services)
    INSERT INTO bookings (
        client_id,
        professional_profile_id,
        status,
        notes
    ) VALUES (
        client_user_id,
        prof_profile_id,
        'confirmed',
        'Currently ongoing appointment - started 30 minutes ago'
    ) RETURNING id INTO booking_id;
    
    INSERT INTO appointments (
        booking_id,
        start_time,
        end_time,
        status
    ) VALUES (
        booking_id,
        NOW() - INTERVAL '30 minutes',  -- Started 30 minutes ago
        NOW() + INTERVAL '30 minutes',  -- Ends in 30 minutes
        'ongoing'
    ) RETURNING id INTO appointment_id;
    
    INSERT INTO booking_services (
        booking_id,
        service_id,
        price,
        duration
    ) VALUES (
        booking_id,
        standard_service_id,
        150.00,
        60
    );
    
    INSERT INTO booking_payments (
        booking_id,
        payment_method_id,
        amount,
        tip_amount,
        service_fee,
        status,
        stripe_payment_intent_id
    ) VALUES (
        booking_id,
        (SELECT id FROM payment_methods WHERE name = 'Credit Card'),
        150.00,
        0.00,
        1.00,
        'completed',
        'pi_ongoing_' || extract(epoch from now())::text
    );
    
    RAISE NOTICE 'All appointments created successfully!';
    RAISE NOTICE 'Created 8 different appointment scenarios:';
    RAISE NOTICE '1. Past completed appointment with review';
    RAISE NOTICE '2. Past cancelled appointment with cancellation fee';
    RAISE NOTICE '3. Upcoming confirmed appointment with deposit';
    RAISE NOTICE '4. Future appointment pending payment';
    RAISE NOTICE '5. Past no-show appointment';
    RAISE NOTICE '6. Future appointment with pre-auth scheduled';
    RAISE NOTICE '7. Past completed appointment without review (for post-appointment flow testing)';
    RAISE NOTICE '8. Currently ongoing appointment (for testing Add Additional Services)';
    
END $$;

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
        'admin@mail.com',
        crypt('secret', gen_salt('bf')),
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
        format('{"sub":"%s","email":"%s"}', admin_user_id::text, 'admin@mail.com')::jsonb,
        admin_user_id,
        'email',
        current_timestamp,
        current_timestamp,
        current_timestamp
    );
    
    -- Note: Admin role will be set via user_roles table after user creation
    
    RAISE NOTICE 'Admin user created successfully!';
    RAISE NOTICE 'Admin User ID: %', admin_user_id;
    RAISE NOTICE 'Email: admin@mail.com';
    RAISE NOTICE 'Password: secret';
    RAISE NOTICE 'Role: admin';
    
END $$;