-- supabase/seeds/seed-infrastructure.sql
-- Infrastructure setup: Email templates, Legal documents, Storage buckets

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
),
(
  'copyright_policy',
  'Copyright Policy',
  '<h1>Copyright Policy</h1>
<p><strong>Last Modified:</strong> June 29, 2025</p>

<h2>Reporting Claims of Copyright Infringement</h2>
<p>We take claims of copyright seriously. We will respond to notices of alleged copyright infringement that comply with applicable law. If you believe any materials accessible on or from this site (the "Website") infringe your copyright, you may request removal of those materials (or access to them) from the Website by submitting written notification to our copyright agent designated below. In accordance with the Online Copyright Infringement Liability Limitation Act on the Digital Millennium Copyright Act (17 U.S.C. § 512) ("DMCA"), the written notice (the "DMCA Notice") must include substantially the following:</p>

<ul>
<li>Your physical or electronic signature.</li>
<li>Identification of the copyrighted work you believe to have been infringed or, if the claim involves multiple works on the Website, a representative list of such works.</li>
<li>Identification of the material you believe to be infringing in a sufficiently precise manner to allow us to locate that material.</li>
<li>Adequate information by which we can contact you (including your name, postal address, telephone number, and if available, email address).</li>
<li>A statement that you have a good faith belief that use of the copyrighted material is not authorized by the copyright owner, its agent, or the law.</li>
<li>A statement that the information in the written notice is accurate.</li>
<li>A statement, under penalty of perjury, that you are authorized to act on behalf of the copyright owner.</li>
</ul>

<p><strong>Our designated copyright agent to receive DMCA Notices is:</strong></p>
<p>[INSERT FIRST AND LAST NAME OF REGISTERED AGENT]<br>
[NAME OF AGENT''S ORGANIZATION]<br>
[PHYSICAL MAIL ADDRESS OF AGENT]<br>
[TELEPHONE NUMBER OF AGENT]<br>
[EMAIL ADDRESS OF AGENT]</p>

<p><em>Last updated: ' || to_char(now(), 'Month DD, YYYY') || '</em></p>',
  true,
  timezone('utc'::text, now())
);


DELETE FROM storage.objects;
DELETE FROM storage.buckets;

/**
* STORAGE BUCKETS
* Define storage buckets and their policies
*/
-- Create profile-photos bucket
insert into storage.buckets (id, name, public)
  values ('profile-photos', 'Profile Photos', true);

-- Create portfolio-photos bucket
insert into storage.buckets (id, name, public)
  values ('portfolio-photos', 'Portfolio Photos', true);

-- Create message-attachments bucket
insert into storage.buckets (id, name, public)
  values ('message-attachments', 'Message Attachments', true);

-- Drop existing policies if they exist
drop policy if exists "Allow authenticated uploads to profile-photos" on storage.objects;
drop policy if exists "Allow authenticated users to modify their own profile photos" on storage.objects;
drop policy if exists "Allow authenticated users to delete their own profile photos" on storage.objects;
drop policy if exists "Allow authenticated users to see all profile photos" on storage.objects;
drop policy if exists "Allow authenticated uploads to portfolio-photos" on storage.objects;
drop policy if exists "Allow authenticated users to modify their own portfolio photos" on storage.objects;
drop policy if exists "Allow authenticated users to delete their own portfolio photos" on storage.objects;
drop policy if exists "Allow users to view their own portfolio photos" on storage.objects;
drop policy if exists "Allow viewing portfolio photos of published professionals" on storage.objects;
drop policy if exists "Allow authenticated uploads to message-attachments bucket" on storage.objects;
drop policy if exists "Allow users to delete their own message attachments from bucket" on storage.objects;
drop policy if exists "Allow users to view message attachments in bucket" on storage.objects;

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
