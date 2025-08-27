-- supabase/seed.sql
DELETE FROM public.roles;

insert into roles (name) values ('client'), ('professional'), ('admin');


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
('Yearly', 'Standard yearly subscription (save 15%)', 199.99, 'year', 'price_1RRXNzLMOPuguC73xExJDINf', true);


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

-- Insert email templates
INSERT INTO public.email_templates (
  name,
  description,
  tag,
  sender_name,
  sender_email,
  reply_to,
  subject,
  html_content,
  to_field,
  is_active
) VALUES
-- Booking Cancellation - Professional
(
  'Booking Cancellation - Professional Notification',
  'Email sent to professionals when a booking is cancelled',
  'BookingCancellationProfessional',
  'The Suite Team',
  'og.jessica@thesuiteservice.com',
  'og.jessica@thesuiteservice.com',
  'Booking Cancelled - {{ params.client_name }}',
  '<!DOCTYPE html><html><head><meta charset="utf-8"><title>Booking Cancellation</title></head><body><div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto;"><h1>Booking Cancellation Notification</h1><p>Dear {{ params.professional_name }},</p><p>The appointment with {{ params.client_name }} has been cancelled.</p><h2>CANCELLED APPOINTMENT DETAILS</h2><p>Client: {{ params.client_name }}{% if params.client_phone %}<br>Client Phone: {{ params.client_phone }}{% endif %}<br>Date: {{ params.date }}<br>Time: {{ params.time }}<br>Booking ID: {{ params.booking_id }}</p>{% if params.payment %}<p>Payment Method: {{ params.payment.method.name }}</p>{% endif %}{% if params.services %}<h3>SERVICES:</h3><p>{% for service in params.services %}{{ service.name }} - ${{ service.price }}{% if not loop.last %}, {% endif %}{% endfor %}</p>{% endif %}{% if params.cancellation_reason %}<h3>CANCELLATION REASON:</h3><p>"{{ params.cancellation_reason }}"</p>{% endif %}{% if params.payment and params.payment.method.is_online and params.refund_info %}<h3>REFUND INFORMATION</h3><p>Original Amount: ${{ params.refund_info.original_amount }}{% if params.refund_info.refund_amount %}<br>Refund Amount: ${{ params.refund_info.refund_amount }}{% endif %}<br>Refund Status: {{ params.refund_info.status }}</p>{% endif %}<p><a href="{{ params.appointment_details_url }}">VIEW BOOKING DETAILS</a></p><p>This time slot is now available for new bookings. If you have any questions about this cancellation, please feel free to contact our support team.</p><hr><p>This email was sent by The Suite<br>{{ params.website_url }}</p><p>Need assistance? Contact us at {{ params.support_email }}</p></div></body></html>',
  '{{ contact.EMAIL }}',
  true
),
-- Booking Cancellation - Client
(
  'Booking Cancellation - Client Notification',
  'Email sent to clients when a booking is cancelled',
  'BookingCancellationClient',
  'The Suite Team',
  'og.jessica@thesuiteservice.com',
  'og.jessica@thesuiteservice.com',
  'Booking Cancellation Confirmation - {{ params.professional_name }}',
  '<!DOCTYPE html><html><head><meta charset="utf-8"><title>Booking Cancellation Confirmation</title></head><body><div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto;"><h1>Booking Cancellation Confirmation</h1><p>Dear {{ params.client_name }},</p><p>Your appointment with {{ params.professional_name }} has been cancelled.</p><h2>CANCELLED APPOINTMENT DETAILS</h2><p>Professional: {{ params.professional_name }}<br>Date: {{ params.date }}<br>Time: {{ params.time }}<br>Booking ID: {{ params.booking_id }}</p>{% if params.payment %}<p>Payment Method: {{ params.payment.method.name }}</p>{% endif %}{% if params.services %}<h3>SERVICES:</h3><p>{% for service in params.services %}{{ service.name }} - ${{ service.price }}{% if not loop.last %}, {% endif %}{% endfor %}</p>{% endif %}{% if params.payment and params.payment.method.is_online and params.refund_info %}<h3>REFUND INFORMATION</h3><p>Original Amount: ${{ params.refund_info.original_amount }}{% if params.refund_info.refund_amount %}<br>Refund Amount: ${{ params.refund_info.refund_amount }}{% endif %}<br>Refund Status: {{ params.refund_info.status }}<br><small>Please note that refunds may take 5-10 business days to appear in your account.</small></p>{% endif %}<p><a href="{{ params.appointment_details_url }}">VIEW BOOKING DETAILS</a></p><p>If you have any questions about this cancellation or would like to book another appointment, please don''t hesitate to contact us.</p><hr><p>This email was sent by The Suite<br>{{ params.website_url }}</p><p>Need assistance? Contact us at {{ params.support_email }}</p></div></body></html>',
  '{{ contact.EMAIL }}',
  true
),
-- Booking Confirmation - Client
(
  'Booking Confirmation - Client',
  'Email sent to clients when a booking is confirmed',
  'BookingConfirmationClient',
  'The Suite Team',
  'og.jessica@thesuiteservice.com',
  'og.jessica@thesuiteservice.com',
  'Booking Confirmation - {{ params.professional_name }}',
  '<!DOCTYPE html><html><head><meta charset="utf-8"><title>Booking Confirmation</title></head><body><div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto;"><h1>Booking Confirmation</h1><p>Dear {{ params.client_name }},</p><p>Your appointment with {{ params.professional_name }} has been confirmed.</p><h2>APPOINTMENT DETAILS</h2><p>Date: {{ params.date }}<br>Time: {{ params.time }}<br>Booking ID: {{ params.booking_id }}</p>{% if params.services %}<h3>SERVICES:</h3><p>{% for service in params.services %}{{ service.name }} - ${{ service.price }}<br>{% endfor %}</p>{% endif %}<h3>PAYMENT DETAILS</h3><p>Subtotal: ${{ params.subtotal }}<br>Service Fee: ${{ params.service_fee }} (paid by card)<br>{% if params.tip_amount %}Tip: ${{ params.tip_amount }}<br>{% endif %}Total: ${{ params.total }}</p><p>Payment Method: {{ params.payment_method }}</p>{% if params.deposit_amount > 0 %}<p>Deposit Amount: ${{ params.deposit_amount }} (paid by card)</p>{% endif %}{% if params.balance_due > 0 %}<div style="background-color: #f8f9fa; padding: 15px; margin: 15px 0; border-radius: 5px;"><strong>IMPORTANT: Cash Payment Required</strong><br>Amount to pay in cash at the appointment: ${{ params.balance_due }}<br>Please bring exact change.</div>{% endif %}<p>If you need to cancel or reschedule your appointment, please do so at least 48 hours in advance to avoid any cancellation fees.</p><p>Best regards,<br>The Suite Team</p></div></body></html>',
  '{{ contact.EMAIL }}',
  true
),
-- Booking Confirmation - Professional
(
  'Booking Confirmation - Professional',
  'Email sent to professionals when a new booking is made',
  'BookingConfirmationProfessional',
  'The Suite Team',
  'og.jessica@thesuiteservice.com',
  'og.jessica@thesuiteservice.com',
  'New Booking - {{ params.client_name }}',
  '<!DOCTYPE html><html><head><meta charset="utf-8"><title>New Booking</title></head><body><div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto;"><h1>New Booking Notification</h1><p>Dear {{ params.professional_name }},</p><p>You have a new booking from {{ params.client_name }}.</p><h2>APPOINTMENT DETAILS</h2><p>Client: {{ params.client_name }}{% if params.client_phone %}<br>Client Phone: {{ params.client_phone }}{% endif %}<br>Date: {{ params.date }}<br>Time: {{ params.time }}<br>Booking ID: {{ params.booking_id }}</p>{% if params.services %}<h3>SERVICES:</h3><p>{% for service in params.services %}{{ service.name }} - ${{ service.price }}{% if not loop.last %}, {% endif %}{% endfor %}</p>{% endif %}<h3>PAYMENT SUMMARY</h3><p>Subtotal: ${{ params.subtotal }}{% if params.tip_amount %}<br>Tip: ${{ params.tip_amount }}{% endif %}<br>Professional Total: ${{ params.professional_total }}</p><p><a href="{{ params.appointment_details_url }}">VIEW BOOKING DETAILS</a></p><hr><p>This email was sent by The Suite<br>{{ params.website_url }}</p><p>Need assistance? Contact us at {{ params.support_email }}</p></div></body></html>',
  '{{ contact.EMAIL }}',
  true
),
-- Payment Confirmation - Client
(
  'Payment Confirmation - Client',
  'Email sent to clients when a payment is processed',
  'PaymentConfirmationClient',
  'The Suite Team',
  'og.jessica@thesuiteservice.com',
  'og.jessica@thesuiteservice.com',
  'Payment Confirmation - {{ params.professional_name }}',
  '<!DOCTYPE html><html><head><meta charset="utf-8"><title>Payment Confirmation</title></head><body><div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto;"><h1>Payment Confirmation</h1><p>Dear {{ params.client_name }},</p><p>Your payment to {{ params.professional_name }} has been processed successfully.</p><h2>PAYMENT DETAILS</h2><p>Payment Method: {{ params.payment_method }}<br>Booking ID: {{ params.booking_id }}</p>{% if params.services %}<h3>SERVICES:</h3><p>{% for service in params.services %}{{ service.name }} - ${{ service.price }}{% if not loop.last %}, {% endif %}{% endfor %}</p>{% endif %}<h3>PAYMENT SUMMARY</h3><p>Subtotal: ${{ params.subtotal }}{% if params.tip_amount %}<br>Tip: ${{ params.tip_amount }}{% endif %}<br>Total: ${{ params.total }}</p><p><a href="{{ params.appointment_details_url }}">VIEW BOOKING DETAILS</a></p><hr><p>This email was sent by The Suite<br>{{ params.website_url }}</p><p>Need assistance? Contact us at {{ params.support_email }}</p></div></body></html>',
  '{{ contact.EMAIL }}',
  true
),
-- Payment Confirmation - Professional
(
  'Payment Confirmation - Professional',
  'Email sent to professionals when a payment is received',
  'PaymentConfirmationProfessional',
  'The Suite Team',
  'og.jessica@thesuiteservice.com',
  'og.jessica@thesuiteservice.com',
  'Payment Received - {{ params.client_name }}',
  '<!DOCTYPE html><html><head><meta charset="utf-8"><title>Payment Received</title></head><body><div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto;"><h1>Payment Received</h1><p>Dear {{ params.professional_name }},</p><p>A payment has been received from {{ params.client_name }}.</p><h2>PAYMENT DETAILS</h2><p>Payment Method: {{ params.payment_method }}<br>Booking ID: {{ params.booking_id }}</p>{% if params.services %}<h3>SERVICES:</h3><p>{% for service in params.services %}{{ service.name }} - ${{ service.price }}{% if not loop.last %}, {% endif %}{% endfor %}</p>{% endif %}<h3>PAYMENT SUMMARY</h3><p>Subtotal: ${{ params.subtotal }}{% if params.tip_amount %}<br>Tip: ${{ params.tip_amount }}{% endif %}<br>Professional Total: ${{ params.professional_total }}</p><p><a href="{{ params.appointment_details_url }}">VIEW BOOKING DETAILS</a></p><hr><p>This email was sent by The Suite<br>{{ params.website_url }}</p><p>Need assistance? Contact us at {{ params.support_email }}</p></div></body></html>',
  '{{ contact.EMAIL }}',
  true
),
-- Balance Notification
(
  'Balance Payment Notification',
  'Email sent to remind about outstanding balance payment',
  'BalanceNotification',
  'The Suite Team',
  'og.jessica@thesuiteservice.com',
  'og.jessica@thesuiteservice.com',
  'Balance Payment Due - {{ params.professional_name }}',
  '<!DOCTYPE html><html><head><meta charset="utf-8"><title>Balance Payment Due</title></head><body><div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto;"><h1>Balance Payment Due</h1><p>Dear {{ params.professional_name }},</p><p>This is a reminder about the outstanding balance payment for your upcoming appointment.</p><h2>PAYMENT DETAILS</h2><p>Total Amount: ${{ params.total_amount }}{% if params.deposit_paid %}<br>Deposit Paid: ${{ params.deposit_paid }}{% endif %}<br>Balance Amount: ${{ params.balance_amount }}{% if params.current_tip %}<br>Current Tip: ${{ params.current_tip }}{% endif %}<br>Total Due: ${{ params.total_due }}</p><p><a href="{{ params.balance_payment_url }}">PAY BALANCE NOW</a></p><p><a href="{{ params.appointment_details_url }}">VIEW APPOINTMENT DETAILS</a></p><hr><p>This email was sent by The Suite<br>{{ params.website_url }}</p><p>Need assistance? Contact us at {{ params.support_email }}</p></div></body></html>',
  '{{ contact.EMAIL }}',
  true
),
-- Refund Request - Professional
(
  'Refund Request - Professional',
  'Email sent to professionals when a refund is requested',
  'RefundRequestProfessional',
  'The Suite Team',
  'og.jessica@thesuiteservice.com',
  'og.jessica@thesuiteservice.com',
  'Refund Request - {{ params.client_name }}',
  '<!DOCTYPE html><html><head><meta charset="utf-8"><title>Refund Request</title></head><body><div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto;"><h1>Refund Request</h1><p>Dear {{ params.professional_name }},</p><p>{{ params.client_name }} has requested a refund for {{ params.service_name }}.</p><h2>REFUND DETAILS</h2><p>Original Amount: ${{ params.original_amount }}<br>Reason: "{{ params.reason }}"</p><p><a href="{{ params.review_url }}">REVIEW REFUND REQUEST</a></p><p><a href="{{ params.appointment_details_url }}">VIEW APPOINTMENT DETAILS</a></p><hr><p>This email was sent by The Suite<br>{{ params.website_url }}</p><p>Need assistance? Contact us at {{ params.support_email }}</p></div></body></html>',
  '{{ contact.EMAIL }}',
  true
),
-- Refund Completion - Client
(
  'Refund Completion - Client',
  'Email sent to clients when a refund is processed',
  'RefundCompletionClient',
  'The Suite Team',
  'og.jessica@thesuiteservice.com',
  'og.jessica@thesuiteservice.com',
  'Refund Processed - {{ params.professional_name }}',
  '<!DOCTYPE html><html><head><meta charset="utf-8"><title>Refund Processed</title></head><body><div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto;"><h1>Refund Processed</h1><p>Dear {{ params.client_name }},</p><p>Your refund request has been approved and processed.</p><h2>REFUND DETAILS</h2><p>Professional: {{ params.professional_name }}<br>Original Amount: ${{ params.original_amount }}<br>Refund Amount: ${{ params.refund_amount }}{% if params.reason %}<br>Reason: "{{ params.reason }}"{% endif %}</p><p>Please note that refunds may take 5-10 business days to appear in your account.</p><p><a href="{{ params.appointment_details_url }}">VIEW BOOKING DETAILS</a></p><hr><p>This email was sent by The Suite<br>{{ params.website_url }}</p><p>Need assistance? Contact us at {{ params.support_email }}</p></div></body></html>',
  '{{ contact.EMAIL }}',
  true
),
-- Refund Completion - Professional
(
  'Refund Completion - Professional',
  'Email sent to professionals when a refund is processed',
  'RefundCompletionProfessional',
  'The Suite Team',
  'og.jessica@thesuiteservice.com',
  'og.jessica@thesuiteservice.com',
  'Refund Processed - {{ params.client_name }}',
  '<!DOCTYPE html><html><head><meta charset="utf-8"><title>Refund Processed</title></head><body><div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto;"><h1>Refund Processed</h1><p>Dear {{ params.professional_name }},</p><p>The refund for {{ params.client_name }} has been processed.</p><h2>REFUND DETAILS</h2><p>Original Amount: ${{ params.original_amount }}<br>Refund Amount: ${{ params.refund_amount }}<br>Platform Fee: ${{ params.platform_fee }}<br>Net Refund: ${{ params.net_refund }}{% if params.reason %}<br>Reason: "{{ params.reason }}"{% endif %}</p><p><a href="{{ params.appointment_details_url }}">VIEW BOOKING DETAILS</a></p><hr><p>This email was sent by The Suite<br>{{ params.website_url }}</p><p>Need assistance? Contact us at {{ params.support_email }}</p></div></body></html>',
  '{{ contact.EMAIL }}',
  true
),
-- Refund Decline - Client
(
  'Refund Decline - Client',
  'Email sent to clients when a refund is declined',
  'RefundDeclineClient',
  'The Suite Team',
  'og.jessica@thesuiteservice.com',
  'og.jessica@thesuiteservice.com',
  'Refund Request Declined - {{ params.professional_name }}',
  '<!DOCTYPE html><html><head><meta charset="utf-8"><title>Refund Request Declined</title></head><body><div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto;"><h1>Refund Request Declined</h1><p>Dear {{ params.client_name }},</p><p>Your refund request has been reviewed and declined by {{ params.professional_name }}.</p><h2>REQUEST DETAILS</h2><p>Original Amount: ${{ params.original_amount }}<br>Decline Reason: "{{ params.decline_reason }}"</p><p><a href="{{ params.appointment_details_url }}">VIEW BOOKING DETAILS</a></p><hr><p>This email was sent by The Suite<br>{{ params.website_url }}</p><p>Need assistance? Contact us at {{ params.support_email }}</p></div></body></html>',
  '{{ contact.EMAIL }}',
  true
),
-- Review & Tip Notification
(
  'Review & Tip Notification',
  'Email sent to request review and optional tip',
  'ReviewTipNotification',
  'The Suite Team',
  'og.jessica@thesuiteservice.com',
  'og.jessica@thesuiteservice.com',
  'Share Your Experience - {{ params.professional_name }}',
  '<!DOCTYPE html><html><head><meta charset="utf-8"><title>Share Your Experience</title></head><body><div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto;"><h1>Share Your Experience</h1><p>Dear {{ params.client_name }},</p><p>Thank you for booking with {{ params.professional_name }}. We hope you had a great experience!</p><h2>BOOKING DETAILS</h2><p>Date: {{ params.date }}<br>Time: {{ params.time }}<br>Payment Method: {{ params.payment_method }}</p><h3>PAYMENT SUMMARY</h3><p>Service Amount: ${{ params.service_amount }}<br>Service Fee: ${{ params.service_fee }}<br>Total Amount: ${{ params.total_amount }}</p><p><a href="{{ params.review_url }}">LEAVE A REVIEW & TIP</a></p><p><a href="{{ params.appointment_details_url }}">VIEW BOOKING DETAILS</a></p><hr><p>This email was sent by The Suite<br>{{ params.website_url }}</p><p>Need assistance? Contact us at {{ params.support_email }}</p></div></body></html>',
  '{{ contact.EMAIL }}',
  true
),
-- Contact Inquiry - Admin
(
  'Contact Inquiry - Admin Notification',
  'Email sent to admin when contact form is submitted',
  'ContactInquiryAdmin',
  'The Suite Team',
  'og.jessica@thesuiteservice.com',
  'og.jessica@thesuiteservice.com',
  'New Contact Inquiry - {{ params.subject }}',
  '<!DOCTYPE html><html><head><meta charset="utf-8"><title>New Contact Inquiry</title></head><body><div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto;"><h1>New Contact Inquiry</h1><h2>INQUIRY DETAILS</h2><p>Name: {{ params.name }}<br>Email: {{ params.email }}{% if params.phone %}<br>Phone: {{ params.phone }}{% endif %}<br>Subject: {{ params.subject }}<br>Submitted: {{ params.submitted_at }}<br>Inquiry ID: {{ params.inquiry_id }}<br>Urgency: <span style="color: {{ params.urgency_color }}">{{ params.urgency }}</span></p><h3>MESSAGE</h3><p>"{{ params.message }}"</p><p><a href="{{ params.dashboard_url }}">VIEW IN DASHBOARD</a></p><hr><p>This email was sent by The Suite</p></div></body></html>',
  '{{ contact.EMAIL }}',
  true
),
-- Contact Inquiry - Confirmation
(
  'Contact Inquiry - Confirmation',
  'Email sent to confirm contact form submission',
  'ContactInquiryConfirmation',
  'The Suite Team',
  'og.jessica@thesuiteservice.com',
  'og.jessica@thesuiteservice.com',
  'Contact Form Received - {{ params.subject }}',
  '<!DOCTYPE html><html><head><meta charset="utf-8"><title>Contact Form Received</title></head><body><div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto;"><h1>Contact Form Received</h1><p>Dear {{ params.name }},</p><p>Thank you for contacting us. We have received your inquiry and will respond as soon as possible.</p><h2>YOUR MESSAGE</h2><p>Subject: {{ params.subject }}<br>Message: "{{ params.message }}"<br>Inquiry ID: {{ params.inquiry_id }}</p><p>Please keep your inquiry ID for future reference.</p><hr><p>This email was sent by The Suite</p></div></body></html>',
  '{{ contact.EMAIL }}',
  true
),
-- Cancellation Policy Charge - Client
(
  'Cancellation Policy Charge - Client',
  'Email sent to clients when cancellation fee is charged',
  'CancellationPolicyChargeClient',
  'The Suite Team',
  'og.jessica@thesuiteservice.com',
  'og.jessica@thesuiteservice.com',
  'Cancellation Fee Charged - {{ params.professional_name }}',
  '<!DOCTYPE html><html><head><meta charset="utf-8"><title>Cancellation Fee Charged</title></head><body><div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto;"><h1>Cancellation Fee Charged</h1><p>Dear {{ params.client_name }},</p><p>A cancellation fee has been charged for your cancelled appointment with {{ params.professional_name }}.</p><h2>CHARGE DETAILS</h2><p>Charge Amount: ${{ params.policy_info.charge_amount }} ({{ params.policy_info.charge_percentage }}% of ${{ params.policy_info.service_amount }})<br>Reason: {{ params.policy_info.time_description }}</p><p><a href="{{ params.appointment_details_url }}">VIEW BOOKING DETAILS</a></p><hr><p>This email was sent by The Suite<br>{{ params.website_url }}</p><p>Need assistance? Contact us at {{ params.support_email }}</p></div></body></html>',
  '{{ contact.EMAIL }}',
  true
),
-- Cancellation Policy Charge - Professional
(
  'Cancellation Policy Charge - Professional',
  'Email sent to professionals when cancellation fee is applied',
  'CancellationPolicyChargeProfessional',
  'The Suite Team',
  'og.jessica@thesuiteservice.com',
  'og.jessica@thesuiteservice.com',
  'Cancellation Fee Applied - {{ params.client_name }}',
  '<!DOCTYPE html><html><head><meta charset="utf-8"><title>Cancellation Fee Applied</title></head><body><div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto;"><h1>Cancellation Fee Applied</h1><p>Dear {{ params.professional_name }},</p><p>A cancellation fee has been applied for {{ params.client_name }}''s cancelled appointment.</p><h2>CHARGE DETAILS</h2><p>Charge Amount: ${{ params.policy_info.charge_amount }} ({{ params.policy_info.charge_percentage }}% of ${{ params.policy_info.service_amount }})<br>Reason: {{ params.policy_info.time_description }}</p><p><a href="{{ params.appointment_details_url }}">VIEW BOOKING DETAILS</a></p><hr><p>This email was sent by The Suite<br>{{ params.website_url }}</p><p>Need assistance? Contact us at {{ params.support_email }}</p></div></body></html>',
  '{{ contact.EMAIL }}',
  true
),
-- No Show Notification - Client
(
  'No Show Notification - Client',
  'Email sent to clients when marked as no-show',
  'NoShowNotificationClient',
  'The Suite Team',
  'og.jessica@thesuiteservice.com',
  'og.jessica@thesuiteservice.com',
  'No Show Fee Charged - {{ params.professional_name }}',
  '<!DOCTYPE html><html><head><meta charset="utf-8"><title>No Show Fee Charged</title></head><body><div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto;"><h1>No Show Fee Charged</h1><p>Dear {{ params.client_name }},</p><p>You have been marked as a no-show for your appointment with {{ params.professional_name }}.</p><h2>CHARGE DETAILS</h2><p>No Show Fee: ${{ params.no_show_fee }}</p><p><a href="{{ params.appointment_details_url }}">VIEW BOOKING DETAILS</a></p><hr><p>This email was sent by The Suite<br>{{ params.website_url }}</p><p>Need assistance? Contact us at {{ params.support_email }}</p></div></body></html>',
  '{{ contact.EMAIL }}',
  true
),
-- No Show Notification - Professional
(
  'No Show Notification - Professional',
  'Email sent to professionals when client is marked as no-show',
  'NoShowNotificationProfessional',
  'The Suite Team',
  'og.jessica@thesuiteservice.com',
  'og.jessica@thesuiteservice.com',
  'Client No Show - {{ params.client_name }}',
  '<!DOCTYPE html><html><head><meta charset="utf-8"><title>Client No Show</title></head><body><div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto;"><h1>Client No Show</h1><p>Dear {{ params.professional_name }},</p><p>{{ params.client_name }} has been marked as a no-show for their appointment.</p><h2>CHARGE DETAILS</h2><p>No Show Fee: ${{ params.no_show_fee }}</p><p><a href="{{ params.appointment_details_url }}">VIEW BOOKING DETAILS</a></p><hr><p>This email was sent by The Suite<br>{{ params.website_url }}</p><p>Need assistance? Contact us at {{ params.support_email }}</p></div></body></html>',
  '{{ contact.EMAIL }}',
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
    professional_role_id uuid;
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
    
    -- Get the professional role ID
    SELECT id INTO professional_role_id FROM roles WHERE name = 'professional';
    
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
        working_hours = '{"monday": {"start": "09:00", "end": "17:00"}, "tuesday": {"start": "09:00", "end": "17:00"}, "wednesday": {"start": "09:00", "end": "17:00"}, "thursday": {"start": "09:00", "end": "17:00"}, "friday": {"start": "09:00", "end": "17:00"}, "saturday": {"start": "10:00", "end": "15:00"}, "sunday": {"start": "10:00", "end": "15:00"}}'::jsonb,
        timezone = 'America/Los_Angeles',
        location = 'San Francisco, CA',
        address_id = dummy_address_id,
        facebook_url = 'https://facebook.com/johndoe',
        instagram_url = 'https://instagram.com/johndoe',
        tiktok_url = 'https://tiktok.com/@johndoe',
        is_published = true,
        is_subscribed = true,
        stripe_account_id = 'acct_1Rps2uPtT7haMfhy',
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
    RAISE NOTICE 'Stripe Account: acct_1Rps2uPtT7haMfhy';
    
END $$;

-- Create dummy client account
DO $$
DECLARE
    client_user_id uuid := gen_random_uuid();
    client_role_id uuid;
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
    
    -- Get the client role ID
    SELECT id INTO client_role_id FROM roles WHERE name = 'client';
    
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
    
    RAISE NOTICE 'All appointments created successfully!';
    RAISE NOTICE 'Created 6 different appointment scenarios:';
    RAISE NOTICE '1. Past completed appointment with review';
    RAISE NOTICE '2. Past cancelled appointment with cancellation fee';
    RAISE NOTICE '3. Upcoming confirmed appointment with deposit';
    RAISE NOTICE '4. Future appointment pending payment';
    RAISE NOTICE '5. Past no-show appointment';
    RAISE NOTICE '6. Future appointment with pre-auth scheduled';
    
END $$;

-- Create admin user
DO $$
DECLARE
    admin_user_id uuid := gen_random_uuid();
    admin_role_id uuid;
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
    
    -- Get the admin role ID
    SELECT id INTO admin_role_id FROM roles WHERE name = 'admin';
    
    -- Update the user record created by the trigger to have admin role
    UPDATE users 
    SET role_id = admin_role_id 
    WHERE id = admin_user_id;
    
    RAISE NOTICE 'Admin user created successfully!';
    RAISE NOTICE 'Admin User ID: %', admin_user_id;
    RAISE NOTICE 'Email: admin@mail.com';
    RAISE NOTICE 'Password: secret';
    RAISE NOTICE 'Role: admin';
    
END $$;