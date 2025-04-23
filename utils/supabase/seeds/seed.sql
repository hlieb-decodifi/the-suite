-- Insert sample data only if profiles table is empty
DO $$
BEGIN
  IF (SELECT COUNT(*) FROM public.profiles) = 0 THEN
    -- This would normally be handled by the trigger
    -- These are just sample profiles with dummy UUIDs
    INSERT INTO public.profiles (id, email, name, avatar_url)
    VALUES 
      ('00000000-0000-0000-0000-000000000001', 'admin@example.com', 'Admin User', 'https://i.pravatar.cc/150?u=admin'),
      ('00000000-0000-0000-0000-000000000002', 'user@example.com', 'Regular User', 'https://i.pravatar.cc/150?u=user');
  END IF;
END
$$; 