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
('Yearly', 'Standard yearly subscription (save 15%)', 199.99, 'year', 'price_1RRXNzLMOPuguC73xExJDINf', true);

-- You can add other seed data for other tables here if needed 

insert into admin_configs (key, value, description, data_type) values
  ('min_reviews_to_display', '5', 'Minimum number of reviews before displaying professional reviews publicly', 'integer'),
  ('service_fee_dollars', '1.0', 'Service fee charged on transactions', 'decimal'),
  ('max_portfolio_photos', '20', 'Maximum number of portfolio photos per professional', 'integer'),
  ('max_services_default', '50', 'Default maximum number of services per professional', 'integer'),
  ('review_edit_window_days', '7', 'Number of days clients can edit their reviews after creation', 'integer');

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
  'yahlepp@gmail.com',
  'support@the-suite.com',
  'Booking Cancelled - {{ params.client_name }}',
  '<!DOCTYPE html><html><head><meta charset="utf-8"><title>Booking Cancellation</title></head><body><div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto;"><h1>Booking Cancellation Notification</h1><p>Dear {{ params.professional_name }},</p><p>The appointment with {{ params.client_name }} has been cancelled.</p><h2>CANCELLED APPOINTMENT DETAILS</h2><p>Client: {{ params.client_name }}{% if params.client_phone %}<br>Client Phone: {{ params.client_phone }}{% endif %}<br>Date: {{ params.date }}<br>Time: {{ params.time }}<br>Booking ID: {{ params.booking_id }}</p>{% if params.payment %}<p>Payment Method: {{ params.payment.method.name }}</p>{% endif %}{% if params.services %}<h3>SERVICES:</h3><p>{% for service in params.services %}{{ service.name }} - ${{ service.price }}{% if not loop.last %}, {% endif %}{% endfor %}</p>{% endif %}{% if params.cancellation_reason %}<h3>CANCELLATION REASON:</h3><p>"{{ params.cancellation_reason }}"</p>{% endif %}{% if params.payment and params.payment.method.is_online and params.refund_info %}<h3>REFUND INFORMATION</h3><p>Original Amount: ${{ params.refund_info.original_amount }}{% if params.refund_info.refund_amount %}<br>Refund Amount: ${{ params.refund_info.refund_amount }}{% endif %}<br>Refund Status: {{ params.refund_info.status }}</p>{% endif %}<p><a href="{{ params.appointment_details_url }}/{{ params.appointment_id }}">VIEW BOOKING DETAILS</a></p><p>This time slot is now available for new bookings. If you have any questions about this cancellation, please feel free to contact our support team.</p><hr><p>This email was sent by The Suite<br>{{ params.website_url }}</p><p>Need assistance? Contact us at {{ params.support_email }}</p></div></body></html>',
  '{{ contact.EMAIL }}',
  true
),
-- Booking Cancellation - Client
(
  'Booking Cancellation - Client Notification',
  'Email sent to clients when a booking is cancelled',
  'BookingCancellationClient',
  'The Suite Team',
  'yahlepp@gmail.com',
  'support@the-suite.com',
  'Booking Cancellation Confirmation - {{ params.professional_name }}',
  '<!DOCTYPE html><html><head><meta charset="utf-8"><title>Booking Cancellation Confirmation</title></head><body><div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto;"><h1>Booking Cancellation Confirmation</h1><p>Dear {{ params.client_name }},</p><p>Your appointment with {{ params.professional_name }} has been cancelled.</p><h2>CANCELLED APPOINTMENT DETAILS</h2><p>Professional: {{ params.professional_name }}<br>Date: {{ params.date }}<br>Time: {{ params.time }}<br>Booking ID: {{ params.booking_id }}</p>{% if params.payment %}<p>Payment Method: {{ params.payment.method.name }}</p>{% endif %}{% if params.services %}<h3>SERVICES:</h3><p>{% for service in params.services %}{{ service.name }} - ${{ service.price }}{% if not loop.last %}, {% endif %}{% endfor %}</p>{% endif %}{% if params.payment and params.payment.method.is_online and params.refund_info %}<h3>REFUND INFORMATION</h3><p>Original Amount: ${{ params.refund_info.original_amount }}{% if params.refund_info.refund_amount %}<br>Refund Amount: ${{ params.refund_info.refund_amount }}{% endif %}<br>Refund Status: {{ params.refund_info.status }}<br><small>Please note that refunds may take 5-10 business days to appear in your account.</small></p>{% endif %}<p><a href="{{ params.appointment_details_url }}/{{ params.appointment_id }}">VIEW BOOKING DETAILS</a></p><p>If you have any questions about this cancellation or would like to book another appointment, please don''t hesitate to contact us.</p><hr><p>This email was sent by The Suite<br>{{ params.website_url }}</p><p>Need assistance? Contact us at {{ params.support_email }}</p></div></body></html>',
  '{{ contact.EMAIL }}',
  true
),
-- Booking Confirmation - Client
(
  'Booking Confirmation - Client',
  'Email sent to clients when a booking is confirmed',
  'BookingConfirmationClient',
  'The Suite Team',
  'yahlepp@gmail.com',
  'support@the-suite.com',
  'Booking Confirmation - {{ params.professional_name }}',
  '<!DOCTYPE html><html><head><meta charset="utf-8"><title>Booking Confirmation</title></head><body><div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto;"><h1>Booking Confirmation</h1><p>Dear {{ params.client_name }},</p><p>Your appointment with {{ params.professional_name }} has been confirmed.</p><h2>APPOINTMENT DETAILS</h2><p>Date: {{ params.date }}<br>Time: {{ params.time }}<br>Booking ID: {{ params.booking_id }}</p>{% if params.services %}<h3>SERVICES:</h3><p>{% for service in params.services %}{{ service.name }} - ${{ service.price }}{% if not loop.last %}, {% endif %}{% endfor %}</p>{% endif %}<h3>PAYMENT SUMMARY</h3><p>Subtotal: ${{ params.subtotal }}{% if params.tip_amount %}<br>Tip: ${{ params.tip_amount }}{% endif %}<br>Total: ${{ params.total }}<br>Payment Method: {{ params.payment_method }}{% if params.deposit_amount %}<br>Deposit Paid: ${{ params.deposit_amount }}{% endif %}{% if params.balance_due %}<br>Balance Due: ${{ params.balance_due }}{% if params.balance_due_date %}<br>Balance Due Date: {{ params.balance_due_date }}{% endif %}{% endif %}</p><p><a href="{{ params.appointment_details_url }}/{{ params.appointment_id }}">VIEW BOOKING DETAILS</a></p><hr><p>This email was sent by The Suite<br>{{ params.website_url }}</p><p>Need assistance? Contact us at {{ params.support_email }}</p></div></body></html>',
  '{{ contact.EMAIL }}',
  true
),
-- Booking Confirmation - Professional
(
  'Booking Confirmation - Professional',
  'Email sent to professionals when a new booking is made',
  'BookingConfirmationProfessional',
  'The Suite Team',
  'yahlepp@gmail.com',
  'support@the-suite.com',
  'New Booking - {{ params.client_name }}',
  '<!DOCTYPE html><html><head><meta charset="utf-8"><title>New Booking</title></head><body><div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto;"><h1>New Booking Notification</h1><p>Dear {{ params.professional_name }},</p><p>You have a new booking from {{ params.client_name }}.</p><h2>APPOINTMENT DETAILS</h2><p>Client: {{ params.client_name }}{% if params.client_phone %}<br>Client Phone: {{ params.client_phone }}{% endif %}<br>Date: {{ params.date }}<br>Time: {{ params.time }}<br>Booking ID: {{ params.booking_id }}</p>{% if params.services %}<h3>SERVICES:</h3><p>{% for service in params.services %}{{ service.name }} - ${{ service.price }}{% if not loop.last %}, {% endif %}{% endfor %}</p>{% endif %}<h3>PAYMENT SUMMARY</h3><p>Subtotal: ${{ params.subtotal }}{% if params.tip_amount %}<br>Tip: ${{ params.tip_amount }}{% endif %}<br>Professional Total: ${{ params.professional_total }}</p><p><a href="{{ params.appointment_details_url }}/{{ params.appointment_id }}">VIEW BOOKING DETAILS</a></p><hr><p>This email was sent by The Suite<br>{{ params.website_url }}</p><p>Need assistance? Contact us at {{ params.support_email }}</p></div></body></html>',
  '{{ contact.EMAIL }}',
  true
),
-- Payment Confirmation - Client
(
  'Payment Confirmation - Client',
  'Email sent to clients when a payment is processed',
  'PaymentConfirmationClient',
  'The Suite Team',
  'yahlepp@gmail.com',
  'support@the-suite.com',
  'Payment Confirmation - {{ params.professional_name }}',
  '<!DOCTYPE html><html><head><meta charset="utf-8"><title>Payment Confirmation</title></head><body><div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto;"><h1>Payment Confirmation</h1><p>Dear {{ params.client_name }},</p><p>Your payment to {{ params.professional_name }} has been processed successfully.</p><h2>PAYMENT DETAILS</h2><p>Payment Method: {{ params.payment_method }}<br>Booking ID: {{ params.booking_id }}</p>{% if params.services %}<h3>SERVICES:</h3><p>{% for service in params.services %}{{ service.name }} - ${{ service.price }}{% if not loop.last %}, {% endif %}{% endfor %}</p>{% endif %}<h3>PAYMENT SUMMARY</h3><p>Subtotal: ${{ params.subtotal }}{% if params.tip_amount %}<br>Tip: ${{ params.tip_amount }}{% endif %}<br>Total: ${{ params.total }}</p><p><a href="{{ params.appointment_details_url }}/{{ params.appointment_id }}">VIEW BOOKING DETAILS</a></p><hr><p>This email was sent by The Suite<br>{{ params.website_url }}</p><p>Need assistance? Contact us at {{ params.support_email }}</p></div></body></html>',
  '{{ contact.EMAIL }}',
  true
),
-- Payment Confirmation - Professional
(
  'Payment Confirmation - Professional',
  'Email sent to professionals when a payment is received',
  'PaymentConfirmationProfessional',
  'The Suite Team',
  'yahlepp@gmail.com',
  'support@the-suite.com',
  'Payment Received - {{ params.client_name }}',
  '<!DOCTYPE html><html><head><meta charset="utf-8"><title>Payment Received</title></head><body><div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto;"><h1>Payment Received</h1><p>Dear {{ params.professional_name }},</p><p>A payment has been received from {{ params.client_name }}.</p><h2>PAYMENT DETAILS</h2><p>Payment Method: {{ params.payment_method }}<br>Booking ID: {{ params.booking_id }}</p>{% if params.services %}<h3>SERVICES:</h3><p>{% for service in params.services %}{{ service.name }} - ${{ service.price }}{% if not loop.last %}, {% endif %}{% endfor %}</p>{% endif %}<h3>PAYMENT SUMMARY</h3><p>Subtotal: ${{ params.subtotal }}{% if params.tip_amount %}<br>Tip: ${{ params.tip_amount }}{% endif %}<br>Professional Total: ${{ params.professional_total }}</p><p><a href="{{ params.appointment_details_url }}/{{ params.appointment_id }}">VIEW BOOKING DETAILS</a></p><hr><p>This email was sent by The Suite<br>{{ params.website_url }}</p><p>Need assistance? Contact us at {{ params.support_email }}</p></div></body></html>',
  '{{ contact.EMAIL }}',
  true
),
-- Balance Notification
(
  'Balance Payment Notification',
  'Email sent to remind about outstanding balance payment',
  'BalanceNotification',
  'The Suite Team',
  'yahlepp@gmail.com',
  'support@the-suite.com',
  'Balance Payment Due - {{ params.professional_name }}',
  '<!DOCTYPE html><html><head><meta charset="utf-8"><title>Balance Payment Due</title></head><body><div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto;"><h1>Balance Payment Due</h1><p>Dear {{ params.professional_name }},</p><p>This is a reminder about the outstanding balance payment for your upcoming appointment.</p><h2>PAYMENT DETAILS</h2><p>Total Amount: ${{ params.total_amount }}{% if params.deposit_paid %}<br>Deposit Paid: ${{ params.deposit_paid }}{% endif %}<br>Balance Amount: ${{ params.balance_amount }}{% if params.current_tip %}<br>Current Tip: ${{ params.current_tip }}{% endif %}<br>Total Due: ${{ params.total_due }}</p><p><a href="{{ params.balance_payment_url }}">PAY BALANCE NOW</a></p><p><a href="{{ params.appointment_details_url }}/{{ params.appointment_id }}">VIEW APPOINTMENT DETAILS</a></p><hr><p>This email was sent by The Suite<br>{{ params.website_url }}</p><p>Need assistance? Contact us at {{ params.support_email }}</p></div></body></html>',
  '{{ contact.EMAIL }}',
  true
),
-- Refund Request - Professional
(
  'Refund Request - Professional',
  'Email sent to professionals when a refund is requested',
  'RefundRequestProfessional',
  'The Suite Team',
  'yahlepp@gmail.com',
  'support@the-suite.com',
  'Refund Request - {{ params.client_name }}',
  '<!DOCTYPE html><html><head><meta charset="utf-8"><title>Refund Request</title></head><body><div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto;"><h1>Refund Request</h1><p>Dear {{ params.professional_name }},</p><p>{{ params.client_name }} has requested a refund for {{ params.service_name }}.</p><h2>REFUND DETAILS</h2><p>Original Amount: ${{ params.original_amount }}<br>Reason: "{{ params.reason }}"</p><p><a href="{{ params.review_url }}">REVIEW REFUND REQUEST</a></p><p><a href="{{ params.appointment_details_url }}/{{ params.appointment_id }}">VIEW APPOINTMENT DETAILS</a></p><hr><p>This email was sent by The Suite<br>{{ params.website_url }}</p><p>Need assistance? Contact us at {{ params.support_email }}</p></div></body></html>',
  '{{ contact.EMAIL }}',
  true
),
-- Refund Completion - Client
(
  'Refund Completion - Client',
  'Email sent to clients when a refund is processed',
  'RefundCompletionClient',
  'The Suite Team',
  'yahlepp@gmail.com',
  'support@the-suite.com',
  'Refund Processed - {{ params.professional_name }}',
  '<!DOCTYPE html><html><head><meta charset="utf-8"><title>Refund Processed</title></head><body><div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto;"><h1>Refund Processed</h1><p>Dear {{ params.client_name }},</p><p>Your refund request has been approved and processed.</p><h2>REFUND DETAILS</h2><p>Professional: {{ params.professional_name }}<br>Original Amount: ${{ params.original_amount }}<br>Refund Amount: ${{ params.refund_amount }}{% if params.reason %}<br>Reason: "{{ params.reason }}"{% endif %}</p><p>Please note that refunds may take 5-10 business days to appear in your account.</p><p><a href="{{ params.appointment_details_url }}/{{ params.appointment_id }}">VIEW BOOKING DETAILS</a></p><hr><p>This email was sent by The Suite<br>{{ params.website_url }}</p><p>Need assistance? Contact us at {{ params.support_email }}</p></div></body></html>',
  '{{ contact.EMAIL }}',
  true
),
-- Refund Completion - Professional
(
  'Refund Completion - Professional',
  'Email sent to professionals when a refund is processed',
  'RefundCompletionProfessional',
  'The Suite Team',
  'yahlepp@gmail.com',
  'support@the-suite.com',
  'Refund Processed - {{ params.client_name }}',
  '<!DOCTYPE html><html><head><meta charset="utf-8"><title>Refund Processed</title></head><body><div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto;"><h1>Refund Processed</h1><p>Dear {{ params.professional_name }},</p><p>The refund for {{ params.client_name }} has been processed.</p><h2>REFUND DETAILS</h2><p>Original Amount: ${{ params.original_amount }}<br>Refund Amount: ${{ params.refund_amount }}<br>Platform Fee: ${{ params.platform_fee }}<br>Net Refund: ${{ params.net_refund }}{% if params.reason %}<br>Reason: "{{ params.reason }}"{% endif %}</p><p><a href="{{ params.appointment_details_url }}/{{ params.appointment_id }}">VIEW BOOKING DETAILS</a></p><hr><p>This email was sent by The Suite<br>{{ params.website_url }}</p><p>Need assistance? Contact us at {{ params.support_email }}</p></div></body></html>',
  '{{ contact.EMAIL }}',
  true
),
-- Refund Decline - Client
(
  'Refund Decline - Client',
  'Email sent to clients when a refund is declined',
  'RefundDeclineClient',
  'The Suite Team',
  'yahlepp@gmail.com',
  'support@the-suite.com',
  'Refund Request Declined - {{ params.professional_name }}',
  '<!DOCTYPE html><html><head><meta charset="utf-8"><title>Refund Request Declined</title></head><body><div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto;"><h1>Refund Request Declined</h1><p>Dear {{ params.client_name }},</p><p>Your refund request has been reviewed and declined by {{ params.professional_name }}.</p><h2>REQUEST DETAILS</h2><p>Original Amount: ${{ params.original_amount }}<br>Decline Reason: "{{ params.decline_reason }}"</p><p><a href="{{ params.appointment_details_url }}/{{ params.appointment_id }}">VIEW BOOKING DETAILS</a></p><hr><p>This email was sent by The Suite<br>{{ params.website_url }}</p><p>Need assistance? Contact us at {{ params.support_email }}</p></div></body></html>',
  '{{ contact.EMAIL }}',
  true
),
-- Review & Tip Notification
(
  'Review & Tip Notification',
  'Email sent to request review and optional tip',
  'ReviewTipNotification',
  'The Suite Team',
  'yahlepp@gmail.com',
  'support@the-suite.com',
  'Share Your Experience - {{ params.professional_name }}',
  '<!DOCTYPE html><html><head><meta charset="utf-8"><title>Share Your Experience</title></head><body><div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto;"><h1>Share Your Experience</h1><p>Dear {{ params.client_name }},</p><p>Thank you for booking with {{ params.professional_name }}. We hope you had a great experience!</p><h2>BOOKING DETAILS</h2><p>Date: {{ params.date }}<br>Time: {{ params.time }}<br>Payment Method: {{ params.payment_method }}</p><h3>PAYMENT SUMMARY</h3><p>Service Amount: ${{ params.service_amount }}<br>Service Fee: ${{ params.service_fee }}<br>Total Amount: ${{ params.total_amount }}</p><p><a href="{{ params.review_url }}">LEAVE A REVIEW & TIP</a></p><p><a href="{{ params.appointment_details_url }}/{{ params.appointment_id }}">VIEW BOOKING DETAILS</a></p><hr><p>This email was sent by The Suite<br>{{ params.website_url }}</p><p>Need assistance? Contact us at {{ params.support_email }}</p></div></body></html>',
  '{{ contact.EMAIL }}',
  true
),
-- Contact Inquiry - Admin
(
  'Contact Inquiry - Admin Notification',
  'Email sent to admin when contact form is submitted',
  'ContactInquiryAdmin',
  'The Suite Team',
  'yahlepp@gmail.com',
  'support@the-suite.com',
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
  'yahlepp@gmail.com',
  'support@the-suite.com',
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
  'yahlepp@gmail.com',
  'support@the-suite.com',
  'Cancellation Fee Charged - {{ params.professional_name }}',
  '<!DOCTYPE html><html><head><meta charset="utf-8"><title>Cancellation Fee Charged</title></head><body><div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto;"><h1>Cancellation Fee Charged</h1><p>Dear {{ params.client_name }},</p><p>A cancellation fee has been charged for your cancelled appointment with {{ params.professional_name }}.</p><h2>CHARGE DETAILS</h2><p>Charge Amount: ${{ params.policy_info.charge_amount }} ({{ params.policy_info.charge_percentage }}% of ${{ params.policy_info.service_amount }})<br>Reason: {{ params.policy_info.time_description }}</p><p><a href="{{ params.appointment_details_url }}/{{ params.appointment_id }}">VIEW BOOKING DETAILS</a></p><hr><p>This email was sent by The Suite<br>{{ params.website_url }}</p><p>Need assistance? Contact us at {{ params.support_email }}</p></div></body></html>',
  '{{ contact.EMAIL }}',
  true
),
-- Cancellation Policy Charge - Professional
(
  'Cancellation Policy Charge - Professional',
  'Email sent to professionals when cancellation fee is applied',
  'CancellationPolicyChargeProfessional',
  'The Suite Team',
  'yahlepp@gmail.com',
  'support@the-suite.com',
  'Cancellation Fee Applied - {{ params.client_name }}',
  '<!DOCTYPE html><html><head><meta charset="utf-8"><title>Cancellation Fee Applied</title></head><body><div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto;"><h1>Cancellation Fee Applied</h1><p>Dear {{ params.professional_name }},</p><p>A cancellation fee has been applied for {{ params.client_name }}''s cancelled appointment.</p><h2>CHARGE DETAILS</h2><p>Charge Amount: ${{ params.policy_info.charge_amount }} ({{ params.policy_info.charge_percentage }}% of ${{ params.policy_info.service_amount }})<br>Reason: {{ params.policy_info.time_description }}</p><p><a href="{{ params.appointment_details_url }}/{{ params.appointment_id }}">VIEW BOOKING DETAILS</a></p><hr><p>This email was sent by The Suite<br>{{ params.website_url }}</p><p>Need assistance? Contact us at {{ params.support_email }}</p></div></body></html>',
  '{{ contact.EMAIL }}',
  true
),
-- No Show Notification - Client
(
  'No Show Notification - Client',
  'Email sent to clients when marked as no-show',
  'NoShowNotificationClient',
  'The Suite Team',
  'yahlepp@gmail.com',
  'support@the-suite.com',
  'No Show Fee Charged - {{ params.professional_name }}',
  '<!DOCTYPE html><html><head><meta charset="utf-8"><title>No Show Fee Charged</title></head><body><div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto;"><h1>No Show Fee Charged</h1><p>Dear {{ params.client_name }},</p><p>You have been marked as a no-show for your appointment with {{ params.professional_name }}.</p><h2>CHARGE DETAILS</h2><p>No Show Fee: ${{ params.no_show_fee }}</p><p><a href="{{ params.appointment_details_url }}/{{ params.appointment_id }}">VIEW BOOKING DETAILS</a></p><hr><p>This email was sent by The Suite<br>{{ params.website_url }}</p><p>Need assistance? Contact us at {{ params.support_email }}</p></div></body></html>',
  '{{ contact.EMAIL }}',
  true
),
-- No Show Notification - Professional
(
  'No Show Notification - Professional',
  'Email sent to professionals when client is marked as no-show',
  'NoShowNotificationProfessional',
  'The Suite Team',
  'yahlepp@gmail.com',
  'support@the-suite.com',
  'Client No Show - {{ params.client_name }}',
  '<!DOCTYPE html><html><head><meta charset="utf-8"><title>Client No Show</title></head><body><div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto;"><h1>Client No Show</h1><p>Dear {{ params.professional_name }},</p><p>{{ params.client_name }} has been marked as a no-show for their appointment.</p><h2>CHARGE DETAILS</h2><p>No Show Fee: ${{ params.no_show_fee }}</p><p><a href="{{ params.appointment_details_url }}/{{ params.appointment_id }}">VIEW BOOKING DETAILS</a></p><hr><p>This email was sent by The Suite<br>{{ params.website_url }}</p><p>Need assistance? Contact us at {{ params.support_email }}</p></div></body></html>',
  '{{ contact.EMAIL }}',
  true
);
