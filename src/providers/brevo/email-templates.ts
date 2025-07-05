export const BOOKING_CANCELLATION_CLIENT = {
  name: "Booking Cancellation - Client Notification",
  subject: "Your Booking with {{ params.professional_name }} has been Cancelled",
  content: `Booking Cancellation Confirmation

Dear {{ params.client_name }},

We're sorry to inform you that your appointment has been cancelled.

CANCELLED APPOINTMENT DETAILS
Professional: {{ params.professional_name }}
Date: {{ params.date }}
Time: {{ params.time }}
Booking ID: {{ params.booking_id }}

{% if params.payment %}
Payment Method: {{ params.payment.method.name }}
{% endif %}

{% if params.services %}
SERVICES:
{% for service in params.services %}
{{ service.name }} - ${{ service.price }}{% if not loop.last %}, {% endif %}
{% endfor %}
{% endif %}

{% if params.cancellation_reason %}
CANCELLATION REASON:
"{{ params.cancellation_reason }}"
{% endif %}

{% if params.payment and params.payment.method.is_online and params.refund_info %}
REFUND INFORMATION
Original Amount: ${{ params.refund_info.original_amount }}
{% if params.refund_info.refund_amount %}
Refund Amount: ${{ params.refund_info.refund_amount }}
{% endif %}
Refund Status: {{ params.refund_info.status }}
{% endif %}

VIEW BOOKING DETAILS
{{ params.appointment_details_url }}/{{ params.appointment_id }}

If you have any questions about this cancellation, please don't hesitate to contact us or reach out to the professional directly.

---
This email was sent by The Suite
{{ params.website_url }}

Need assistance? Contact us at {{ params.support_email }}`
};

export const BOOKING_CANCELLATION_PROFESSIONAL = {
  name: "Booking Cancellation - Professional Notification",
  subject: "Booking Cancelled - {{ params.client_name }}",
  content: `Booking Cancellation Notification

Dear {{ params.professional_name }},

The appointment with {{ params.client_name }} has been cancelled.

CANCELLED APPOINTMENT DETAILS
Client: {{ params.client_name }}
{% if params.client_phone %}
Client Phone: {{ params.client_phone }}
{% endif %}
Date: {{ params.date }}
Time: {{ params.time }}
Booking ID: {{ params.booking_id }}

{% if params.payment %}
Payment Method: {{ params.payment.method.name }}
{% endif %}

{% if params.services %}
SERVICES:
{% for service in params.services %}
{{ service.name }} - ${{ service.price }}{% if not loop.last %}, {% endif %}
{% endfor %}
{% endif %}

{% if params.cancellation_reason %}
CANCELLATION REASON:
"{{ params.cancellation_reason }}"
{% endif %}

{% if params.payment and params.payment.method.is_online and params.refund_info %}
REFUND INFORMATION
Original Amount: ${{ params.refund_info.original_amount }}
{% if params.refund_info.refund_amount %}
Refund Amount: ${{ params.refund_info.refund_amount }}
{% endif %}
Refund Status: {{ params.refund_info.status }}
{% endif %}

VIEW BOOKING DETAILS
{{ params.appointment_details_url }}/{{ params.appointment_id }}

This time slot is now available for new bookings. If you have any questions about this cancellation, please feel free to contact our support team.

---
This email was sent by The Suite
{{ params.website_url }}

Need assistance? Contact us at {{ params.support_email }}`
}; 