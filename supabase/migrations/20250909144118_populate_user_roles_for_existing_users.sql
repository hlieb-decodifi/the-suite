-- Data migration to populate user_roles table for existing users
-- This migration is needed because the transition from roles table to user_roles table
-- left existing users without role assignments

-- Insert professional roles for users who have professional profiles
INSERT INTO public.user_roles (user_id, role, created_at, updated_at)
SELECT 
    pp.user_id,
    'professional' as role,
    timezone('utc'::text, now()) as created_at,
    timezone('utc'::text, now()) as updated_at
FROM public.professional_profiles pp
WHERE pp.user_id NOT IN (
    SELECT user_id FROM public.user_roles
)
ON CONFLICT (user_id) DO NOTHING;

-- Insert client roles for users who have client profiles but no role yet
INSERT INTO public.user_roles (user_id, role, created_at, updated_at)
SELECT 
    cp.user_id,
    'client' as role,
    timezone('utc'::text, now()) as created_at,
    timezone('utc'::text, now()) as updated_at
FROM public.client_profiles cp
WHERE cp.user_id NOT IN (
    SELECT user_id FROM public.user_roles
)
ON CONFLICT (user_id) DO NOTHING;

-- Insert default client role for any remaining users without roles
-- This handles users who might exist in auth.users but don't have profiles yet
INSERT INTO public.user_roles (user_id, role, created_at, updated_at)
SELECT 
    u.id as user_id,
    'client' as role,
    timezone('utc'::text, now()) as created_at,
    timezone('utc'::text, now()) as updated_at
FROM public.users u
WHERE u.id NOT IN (
    SELECT user_id FROM public.user_roles
)
ON CONFLICT (user_id) DO NOTHING;

-- Log the results for verification
DO $$
DECLARE
    professional_count integer;
    client_count integer;
    total_count integer;
BEGIN
    SELECT COUNT(*) INTO professional_count FROM public.user_roles WHERE role = 'professional';
    SELECT COUNT(*) INTO client_count FROM public.user_roles WHERE role = 'client';
    SELECT COUNT(*) INTO total_count FROM public.user_roles;
    
    RAISE NOTICE 'User roles migration completed:';
    RAISE NOTICE '- Professional roles: %', professional_count;
    RAISE NOTICE '- Client roles: %', client_count;
    RAISE NOTICE '- Total roles: %', total_count;
END $$;
