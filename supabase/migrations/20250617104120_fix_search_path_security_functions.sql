-- Fix search_path security vulnerabilities for all functions
-- This prevents schema poisoning attacks by setting an immutable search_path

-- 1. Fix is_professional function
ALTER FUNCTION public.is_professional(uuid) SET search_path = '';

-- 2. Fix is_client function
ALTER FUNCTION public.is_client(uuid) SET search_path = '';

-- 3. Fix get_service_limit function
ALTER FUNCTION public.get_service_limit(uuid) SET search_path = '';

-- 4. Fix check_service_limit function
ALTER FUNCTION public.check_service_limit() SET search_path = '';

-- 5. Fix update_service_limit function
ALTER FUNCTION public.update_service_limit(uuid, integer) SET search_path = '';

-- 6. Fix handle_new_professional function
ALTER FUNCTION public.handle_new_professional() SET search_path = '';

-- 7. Fix handle_new_client function
ALTER FUNCTION public.handle_new_client() SET search_path = '';

-- 8. Fix handle_new_user function
ALTER FUNCTION public.handle_new_user() SET search_path = '';

-- 9. Fix check_portfolio_photo_limit function
ALTER FUNCTION public.check_portfolio_photo_limit() SET search_path = '';

-- 10. Fix update_professional_subscription_status function
ALTER FUNCTION public.update_professional_subscription_status() SET search_path = '';

-- 11. Fix check_professional_availability function
ALTER FUNCTION public.check_professional_availability() SET search_path = '';

-- 12. Fix handle_service_stripe_sync function
ALTER FUNCTION public.handle_service_stripe_sync() SET search_path = '';

-- 13. Fix handle_professional_profile_stripe_changes function
ALTER FUNCTION public.handle_professional_profile_stripe_changes() SET search_path = '';

-- 14. Fix handle_payment_method_stripe_changes function
ALTER FUNCTION public.handle_payment_method_stripe_changes() SET search_path = '';

-- 15. Fix update_conversation_timestamp function
ALTER FUNCTION public.update_conversation_timestamp() SET search_path = '';

-- 16. Fix handle_legal_document_versioning function
ALTER FUNCTION public.handle_legal_document_versioning() SET search_path = '';