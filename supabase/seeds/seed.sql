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
ON CONFLICT (name) DO UPDATE SET 
  description = EXCLUDED.description,
  price = EXCLUDED.price,
  interval = EXCLUDED.interval,
  stripe_price_id = EXCLUDED.stripe_price_id,
  is_active = EXCLUDED.is_active;

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
)
ON CONFLICT (type, is_published) DO UPDATE SET 
  title = EXCLUDED.title,
  content = EXCLUDED.content,
  effective_date = EXCLUDED.effective_date;

-- You can add other seed data for other tables here if needed 