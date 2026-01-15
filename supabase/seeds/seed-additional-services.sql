-- Insert 30 additional services for pagination testing
-- Run this after the main seed.sql to add more services to the dummy professional account

DO $$
DECLARE
    dummy_profile_id uuid;
BEGIN
    -- Get the dummy professional profile ID
    SELECT pp.id INTO dummy_profile_id 
    FROM professional_profiles pp
    JOIN auth.users u ON pp.user_id = u.id
    WHERE u.email = 'professional@mail.com'
    LIMIT 1;

    IF dummy_profile_id IS NULL THEN
        RAISE EXCEPTION 'Dummy professional profile not found. Please run seed.sql first.';
    END IF;

    -- Insert 30 additional services
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
        'Service 1',
        'Professional service package with standard features and delivery',
        75.00,
        45,
        'active',
        'synced'
    ),
    (
        dummy_profile_id,
        'Service 2',
        'Comprehensive service offering with enhanced support options',
        120.00,
        60,
        'active',
        'synced'
    ),
    (
        dummy_profile_id,
        'Service 3',
        'Quick consultation service for immediate needs and questions',
        45.00,
        30,
        'active',
        'synced'
    ),
    (
        dummy_profile_id,
        'Service 4',
        'Extended service package with premium features included',
        200.00,
        90,
        'active',
        'synced'
    ),
    (
        dummy_profile_id,
        'Service 5',
        'Standard service with flexible scheduling and delivery options',
        95.00,
        45,
        'active',
        'synced'
    ),
    (
        dummy_profile_id,
        'Service 6',
        'Express service for time-sensitive requirements and urgent needs',
        180.00,
        60,
        'active',
        'synced'
    ),
    (
        dummy_profile_id,
        'Service 7',
        'Basic package suitable for getting started with minimal features',
        60.00,
        30,
        'active',
        'synced'
    ),
    (
        dummy_profile_id,
        'Service 8',
        'Advanced service with specialized tools and expert guidance',
        275.00,
        120,
        'active',
        'synced'
    ),
    (
        dummy_profile_id,
        'Service 9',
        'Mid-tier service offering balanced features and competitive pricing',
        110.00,
        60,
        'active',
        'synced'
    ),
    (
        dummy_profile_id,
        'Service 10',
        'Introductory service ideal for first-time clients and consultations',
        55.00,
        30,
        'active',
        'synced'
    ),
    (
        dummy_profile_id,
        'Service 11',
        'Deluxe service package with comprehensive coverage and support',
        225.00,
        90,
        'active',
        'synced'
    ),
    (
        dummy_profile_id,
        'Service 12',
        'Efficient service designed for quick turnaround and rapid results',
        85.00,
        45,
        'active',
        'synced'
    ),
    (
        dummy_profile_id,
        'Service 13',
        'Complete service solution with end-to-end support and delivery',
        195.00,
        75,
        'active',
        'synced'
    ),
    (
        dummy_profile_id,
        'Service 14',
        'Essential service covering core needs and basic requirements',
        70.00,
        45,
        'active',
        'synced'
    ),
    (
        dummy_profile_id,
        'Service 15',
        'Premium plus service with exclusive features and priority support',
        300.00,
        120,
        'active',
        'synced'
    ),
    (
        dummy_profile_id,
        'Service 16',
        'Flexible service package adaptable to varying client needs',
        130.00,
        60,
        'active',
        'synced'
    ),
    (
        dummy_profile_id,
        'Service 17',
        'Compact service perfect for limited budgets and time constraints',
        50.00,
        30,
        'active',
        'synced'
    ),
    (
        dummy_profile_id,
        'Service 18',
        'Professional grade service with industry-leading quality standards',
        240.00,
        90,
        'active',
        'synced'
    ),
    (
        dummy_profile_id,
        'Service 19',
        'Standard plus service with enhanced features and better value',
        105.00,
        60,
        'active',
        'synced'
    ),
    (
        dummy_profile_id,
        'Service 20',
        'Rapid response service for immediate assistance and quick fixes',
        160.00,
        45,
        'active',
        'synced'
    ),
    (
        dummy_profile_id,
        'Service 21',
        'Comprehensive consultation service with detailed analysis included',
        140.00,
        75,
        'active',
        'synced'
    ),
    (
        dummy_profile_id,
        'Service 22',
        'Economy service offering great value for budget-conscious clients',
        65.00,
        45,
        'active',
        'synced'
    ),
    (
        dummy_profile_id,
        'Service 23',
        'Elite service package designed for discerning clients and high standards',
        350.00,
        120,
        'active',
        'synced'
    ),
    (
        dummy_profile_id,
        'Service 24',
        'Streamlined service focused on efficiency and rapid completion',
        90.00,
        45,
        'active',
        'synced'
    ),
    (
        dummy_profile_id,
        'Service 25',
        'Enhanced service with additional benefits and premium features',
        175.00,
        75,
        'active',
        'synced'
    ),
    (
        dummy_profile_id,
        'Service 26',
        'Standard consultation with follow-up support and documentation',
        80.00,
        60,
        'active',
        'synced'
    ),
    (
        dummy_profile_id,
        'Service 27',
        'Executive service tailored for high-level clients and complex needs',
        400.00,
        150,
        'active',
        'synced'
    ),
    (
        dummy_profile_id,
        'Service 28',
        'Quick service perfect for minor tasks and simple requirements',
        40.00,
        30,
        'active',
        'synced'
    ),
    (
        dummy_profile_id,
        'Service 29',
        'Premium consultation with comprehensive review and recommendations',
        210.00,
        90,
        'active',
        'synced'
    ),
    (
        dummy_profile_id,
        'Service 30',
        'Signature service representing the best of what we offer',
        280.00,
        120,
        'active',
        'synced'
    );

    RAISE NOTICE '30 additional services created successfully for professional profile: %', dummy_profile_id;
    RAISE NOTICE 'Total services for this professional: %', (SELECT COUNT(*) FROM services WHERE professional_profile_id = dummy_profile_id);

END $$;

