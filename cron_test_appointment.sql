-- SQL Query to create a completed appointment that matches the cron job criteria
-- This appointment will be picked up by the balance notification cron job
-- Date: September 3rd, 2025

DO $$
DECLARE
    client_user_id uuid;
    professional_user_id uuid;
    prof_profile_id uuid;
    standard_service_id uuid;
    booking_id uuid;
    appointment_id uuid;
    payment_method_cash_id uuid;
    -- Create appointment that ended 3 hours ago (more than the 2-hour requirement)
    appointment_start_time timestamp with time zone := NOW() - INTERVAL '4 hours';
    appointment_end_time timestamp with time zone := NOW() - INTERVAL '3 hours';
BEGIN
    -- Get existing client and professional user IDs from seed data
    SELECT id INTO client_user_id FROM auth.users WHERE email = 'client@mail.com';
    SELECT id INTO professional_user_id FROM auth.users WHERE email = 'professional@mail.com';

    -- Get professional profile ID
    SELECT id INTO prof_profile_id 
    FROM professional_profiles 
    WHERE user_id = professional_user_id;

    -- Get standard service ID for the professional
    SELECT id INTO standard_service_id 
    FROM services s 
    WHERE s.professional_profile_id = prof_profile_id 
    AND s.name = 'Standard Service' 
    LIMIT 1;

    -- Get Cash payment method ID (for cash payments that trigger cron job)
    SELECT id INTO payment_method_cash_id 
    FROM payment_methods 
    WHERE name = 'Cash' 
    LIMIT 1;

    -- Create a new booking
    INSERT INTO bookings (
        client_id,
        professional_profile_id,
        status,
        notes
    ) VALUES (
        client_user_id,
        prof_profile_id,
        'completed',
        'CRON TEST: Completed appointment for balance notification testing'
    ) RETURNING id INTO booking_id;

    -- Create completed appointment (ended 3 hours ago)
    INSERT INTO appointments (
        booking_id,
        start_time,
        end_time,
        status
    ) VALUES (
        booking_id,
        appointment_start_time,
        appointment_end_time,
        'completed'
    ) RETURNING id INTO appointment_id;

    -- Add the standard service to the booking
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

    -- Create a CASH payment that will trigger the cron job
    -- Cash payments with status='completed' and is_online=false match the cron criteria
    INSERT INTO booking_payments (
        booking_id,
        payment_method_id,
        amount,
        tip_amount,
        service_fee,
        status,
        balance_notification_sent_at, -- NULL so it gets picked up by cron
        stripe_payment_intent_id
    ) VALUES (
        booking_id,
        payment_method_cash_id,
        150.00,
        0.00,  -- No tip initially
        1.00,  -- Service fee
        'completed', -- Completed cash payment
        NULL,  -- THIS IS KEY: NULL means cron job will pick it up
        'cash_payment_cron_test_' || extract(epoch from now())::text
    );

    RAISE NOTICE '=== CRON TEST APPOINTMENT CREATED ===';
    RAISE NOTICE 'Booking ID: %', booking_id;
    RAISE NOTICE 'Appointment ID: %', appointment_id;
    RAISE NOTICE 'Start Time: % (4 hours ago)', appointment_start_time;
    RAISE NOTICE 'End Time: % (3 hours ago)', appointment_end_time;
    RAISE NOTICE 'Status: completed';
    RAISE NOTICE 'Payment: Cash, completed, balance_notification_sent_at = NULL';
    RAISE NOTICE 'This appointment should be picked up by the cron job!';
    RAISE NOTICE 'Review/Tip URL will be: %/bookings/%?showReviewPrompt=true', COALESCE(current_setting('app.base_url', true), 'http://localhost:3000'), appointment_id;
    RAISE NOTICE '===================================';

END $$;
