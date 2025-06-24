# Cron Jobs Testing Guide - Time-Dependent Payment Flow

## Overview

Your payment system has three critical time-dependent cron jobs that handle different stages of the payment lifecycle:

1. **Pre-Auth Payments** (`/api/cron/pre-auth-payments`) - Runs twice daily
2. **Capture Payments** (`/api/cron/capture-payments`) - Runs every 4 hours
3. **Balance Notifications** (`/api/cron/balance-notifications`) - Runs every 2 hours

## Cron Job Analysis

### 1. Pre-Auth Payments Cron Job

**Purpose**: Authorizes payments 6 days before the appointment for bookings made >6 days in advance.

**Trigger Conditions**:

```sql
WHERE pre_auth_scheduled_for <= NOW()
  AND status = 'pending'
  AND pre_auth_placed_at IS NULL
  AND pre_auth_scheduled_for IS NOT NULL
```

**Actions**:

- Creates uncaptured Stripe payment intent
- Updates status to 'authorized'
- Sets `pre_auth_placed_at` timestamp
- Sets `stripe_payment_intent_id`

---

### 2. Capture Payments Cron Job

**Purpose**: Captures authorized payments after appointment completion.

**Trigger Conditions**:

```sql
WHERE capture_scheduled_for <= NOW()
  AND status IN ('authorized', 'pre_auth_scheduled')
  AND stripe_payment_intent_id IS NOT NULL
  AND captured_at IS NULL
```

**Actions**:

- Captures the Stripe payment intent
- Updates status to 'completed'
- Sets `captured_at` timestamp
- Sends payment confirmation emails

---

### 3. Balance Notifications Cron Job

**Purpose**: Sends balance payment notifications 2+ hours after appointment completion.

**Trigger Conditions**:

```sql
WHERE appointment.end_time <= (NOW() - INTERVAL '2 hours')
  AND appointment.status = 'completed'
  AND payment.balance_notification_sent_at IS NULL
  AND (
    (payment.status = 'authorized' AND payment.requires_balance_payment = true) OR
    (payment.status = 'completed' AND payment_method.is_online = false)
  )
```

**Actions**:

- Sends balance notification email (card payments)
- Sends review/tip notification email (cash payments)
- Sets `balance_notification_sent_at` timestamp

---

## Testing Strategy with Supabase CLI

### Prerequisites

1. **Supabase CLI** installed and authenticated
2. **Local development** environment running
3. **Test bookings** created in various states
4. **Email testing** environment (MailPit)

### Database Date Manipulation Queries

#### 1. Testing Pre-Auth Payments

```sql
-- Create a booking that needs pre-authorization
-- Step 1: Find a pending payment with future pre_auth_scheduled_for
SELECT id, booking_id, pre_auth_scheduled_for, status
FROM booking_payments
WHERE status = 'pending'
AND pre_auth_scheduled_for IS NOT NULL
AND pre_auth_placed_at IS NULL;

-- Step 2: Move the pre_auth_scheduled_for date to the past
UPDATE booking_payments
SET pre_auth_scheduled_for = NOW() - INTERVAL '1 hour'
WHERE id = '[payment_id]';

-- Step 3: Verify the cron job will pick it up
SELECT bp.id, bp.booking_id, bp.pre_auth_scheduled_for, bp.status,
       pp.stripe_account_id, c.stripe_customer_id
FROM booking_payments bp
JOIN bookings b ON bp.booking_id = b.id
JOIN professional_profiles pp ON b.professional_profile_id = pp.id
JOIN users u ON b.client_id = u.id
JOIN customers c ON u.id = c.user_id
WHERE bp.pre_auth_scheduled_for <= NOW()
AND bp.status = 'pending'
AND bp.pre_auth_placed_at IS NULL;
```

#### 2. Testing Capture Payments

```sql
-- Create a payment ready for capture
-- Step 1: Find an authorized payment with future capture date
SELECT id, booking_id, capture_scheduled_for, status, stripe_payment_intent_id
FROM booking_payments
WHERE status IN ('authorized', 'pre_auth_scheduled')
AND capture_scheduled_for IS NOT NULL
AND captured_at IS NULL;

-- Step 2: Move the capture_scheduled_for date to the past
UPDATE booking_payments
SET capture_scheduled_for = NOW() - INTERVAL '1 hour'
WHERE id = '[payment_id]';

-- Step 3: Verify the cron job will pick it up
SELECT id, booking_id, capture_scheduled_for, status, stripe_payment_intent_id
FROM booking_payments
WHERE capture_scheduled_for <= NOW()
AND status IN ('authorized', 'pre_auth_scheduled')
AND stripe_payment_intent_id IS NOT NULL
AND captured_at IS NULL;
```

#### 3. Testing Balance Notifications

```sql
-- Create appointments needing balance notifications
-- Step 1: Find completed appointments without notifications
SELECT a.id, a.booking_id, a.date, a.end_time, a.status,
       bp.status as payment_status, bp.balance_notification_sent_at,
       pm.name as payment_method, pm.is_online
FROM appointments a
JOIN booking_payments bp ON a.booking_id = bp.booking_id
JOIN payment_methods pm ON bp.payment_method_id = pm.id
WHERE a.status = 'completed'
AND bp.balance_notification_sent_at IS NULL;

-- Step 2: Move appointment end time to 3+ hours ago
UPDATE appointments
SET date = CURRENT_DATE - INTERVAL '1 day',
    end_time = '14:00:00'  -- 2 PM yesterday
WHERE id = '[appointment_id]';

-- Step 3: Verify the cron job will pick it up
SELECT a.booking_id, a.date, a.end_time,
       bp.status, bp.requires_balance_payment,
       pm.name, pm.is_online
FROM appointments a
JOIN booking_payments bp ON a.booking_id = bp.booking_id
JOIN payment_methods pm ON bp.payment_method_id = pm.id
WHERE a.status = 'completed'
AND CONCAT(a.date, ' ', a.end_time)::timestamp <= (NOW() - INTERVAL '2 hours')
AND bp.balance_notification_sent_at IS NULL
AND (
  (bp.status = 'authorized' AND bp.requires_balance_payment = true) OR
  (bp.status = 'completed' AND pm.is_online = false)
);
```

---

## Comprehensive Testing Scenarios

### Scenario 1: Full Pre-Auth to Capture Flow

**Setup**: Booking made >6 days in advance with card payment

```bash
# 1. Create test booking (via UI or API)
# 2. Manipulate dates using Supabase CLI

supabase db reset --local  # If needed for clean state

# Query to set up the scenario
psql "postgresql://postgres:postgres@localhost:54322/postgres" << EOF
-- Set pre-auth date to past (trigger pre-auth)
UPDATE booking_payments
SET pre_auth_scheduled_for = NOW() - INTERVAL '1 hour'
WHERE booking_id = '[your_booking_id]';
EOF

# 3. Test pre-auth cron job
curl http://localhost:3000/api/cron/pre-auth-payments

# 4. Verify payment was authorized
psql "postgresql://postgres:postgres@localhost:54322/postgres" << EOF
SELECT status, stripe_payment_intent_id, pre_auth_placed_at
FROM booking_payments
WHERE booking_id = '[your_booking_id]';
EOF

# 5. Set capture date to past (trigger capture)
psql "postgresql://postgres:postgres@localhost:54322/postgres" << EOF
UPDATE booking_payments
SET capture_scheduled_for = NOW() - INTERVAL '1 hour'
WHERE booking_id = '[your_booking_id]';

-- Also mark appointment as completed
UPDATE appointments
SET status = 'completed'
WHERE booking_id = '[your_booking_id]';
EOF

# 6. Test capture cron job
curl http://localhost:3000/api/cron/capture-payments

# 7. Verify payment was captured
psql "postgresql://postgres:postgres@localhost:54322/postgres" << EOF
SELECT status, captured_at, amount
FROM booking_payments
WHERE booking_id = '[your_booking_id]';
EOF
```

### Scenario 2: Balance Notification Testing

**Setup**: Test both card and cash payment balance notifications

```bash
# Card Payment Balance Notification
psql "postgresql://postgres:postgres@localhost:54322/postgres" << EOF
-- Set appointment to completed and 3+ hours ago
UPDATE appointments
SET status = 'completed',
    date = CURRENT_DATE - INTERVAL '1 day',
    end_time = '12:00:00'
WHERE booking_id = '[card_booking_id]';

-- Ensure payment requires balance
UPDATE booking_payments
SET status = 'authorized',
    requires_balance_payment = true,
    balance_notification_sent_at = NULL
WHERE booking_id = '[card_booking_id]';
EOF

# Cash Payment Review Notification
psql "postgresql://postgres:postgres@localhost:54322/postgres" << EOF
-- Set appointment to completed and 3+ hours ago
UPDATE appointments
SET status = 'completed',
    date = CURRENT_DATE - INTERVAL '1 day',
    end_time = '12:00:00'
WHERE booking_id = '[cash_booking_id]';

-- Ensure payment is completed cash payment
UPDATE booking_payments
SET status = 'completed',
    balance_notification_sent_at = NULL
WHERE booking_id = '[cash_booking_id]';
EOF

# Test balance notifications cron job
curl http://localhost:3000/api/cron/balance-notifications

# Verify notifications were sent
psql "postgresql://postgres:postgres@localhost:54322/postgres" << EOF
SELECT booking_id, balance_notification_sent_at
FROM booking_payments
WHERE booking_id IN ('[card_booking_id]', '[cash_booking_id]');
EOF
```

### Scenario 3: Edge Case Testing

#### Failed Pre-Auth Due to Expired Card

```sql
-- Simulate expired card scenario
UPDATE booking_payments
SET pre_auth_scheduled_for = NOW() - INTERVAL '1 hour',
    stripe_payment_method_id = 'pm_expired_card'  -- Use test expired card
WHERE booking_id = '[booking_id]';
```

#### Capture Deadline Passed

```sql
-- Set capture date far in the past
UPDATE booking_payments
SET capture_scheduled_for = NOW() - INTERVAL '7 days'
WHERE booking_id = '[booking_id]';
```

#### Multiple Notifications Prevention

```sql
-- Test that notifications aren't sent twice
UPDATE booking_payments
SET balance_notification_sent_at = NULL
WHERE booking_id = '[booking_id]';
-- Run cron twice, verify only one notification
```

---

## Testing Commands & Scripts

### Quick Test Setup Script

```bash
#!/bin/bash
# setup_cron_test.sh

BOOKING_ID="$1"
SCENARIO="$2"

case $SCENARIO in
  "pre-auth")
    psql "postgresql://postgres:postgres@localhost:54322/postgres" << EOF
    UPDATE booking_payments
    SET pre_auth_scheduled_for = NOW() - INTERVAL '1 hour'
    WHERE booking_id = '$BOOKING_ID';
EOF
    echo "Pre-auth test setup complete. Run: curl http://localhost:3000/api/cron/pre-auth-payments"
    ;;

  "capture")
    psql "postgresql://postgres:postgres@localhost:54322/postgres" << EOF
    UPDATE booking_payments
    SET capture_scheduled_for = NOW() - INTERVAL '1 hour'
    WHERE booking_id = '$BOOKING_ID';

    UPDATE appointments
    SET status = 'completed'
    WHERE booking_id = '$BOOKING_ID';
EOF
    echo "Capture test setup complete. Run: curl http://localhost:3000/api/cron/capture-payments"
    ;;

  "balance")
    psql "postgresql://postgres:postgres@localhost:54322/postgres" << EOF
    UPDATE appointments
    SET status = 'completed',
        date = CURRENT_DATE - INTERVAL '1 day',
        end_time = '12:00:00'
    WHERE booking_id = '$BOOKING_ID';

    UPDATE booking_payments
    SET balance_notification_sent_at = NULL
    WHERE booking_id = '$BOOKING_ID';
EOF
    echo "Balance notification test setup complete. Run: curl http://localhost:3000/api/cron/balance-notifications"
    ;;

  *)
    echo "Usage: $0 <booking_id> <pre-auth|capture|balance>"
    ;;
esac
```

### Verification Queries

```sql
-- Pre-Auth Status Check
SELECT
  bp.id,
  bp.booking_id,
  bp.status,
  bp.pre_auth_scheduled_for,
  bp.pre_auth_placed_at,
  bp.stripe_payment_intent_id
FROM booking_payments bp
WHERE bp.booking_id = '[booking_id]';

-- Capture Status Check
SELECT
  bp.id,
  bp.booking_id,
  bp.status,
  bp.capture_scheduled_for,
  bp.captured_at,
  bp.amount
FROM booking_payments bp
WHERE bp.booking_id = '[booking_id]';

-- Balance Notification Check
SELECT
  a.booking_id,
  a.status as appointment_status,
  a.date,
  a.end_time,
  bp.status as payment_status,
  bp.balance_notification_sent_at,
  pm.name as payment_method
FROM appointments a
JOIN booking_payments bp ON a.booking_id = bp.booking_id
JOIN payment_methods pm ON bp.payment_method_id = pm.id
WHERE a.booking_id = '[booking_id]';
```

---

## Manual Cron Job Testing

### Local Testing Commands

```bash
# Test each cron job individually
curl -X GET http://localhost:3000/api/cron/pre-auth-payments
curl -X GET http://localhost:3000/api/cron/capture-payments
curl -X GET http://localhost:3000/api/cron/balance-notifications

# Check responses for:
# - processedCount
# - errorCount
# - errorDetails
# - duration
```

### Production Testing (Careful!)

```bash
# Use with extreme caution in production
curl -X GET https://your-domain.com/api/cron/pre-auth-payments
# Monitor logs and Stripe dashboard carefully
```

---

## Validation Checklist

For each cron job test:

### Pre-Auth Payments

- [ ] Payment status changed from 'pending' to 'authorized'
- [ ] `pre_auth_placed_at` timestamp set
- [ ] `stripe_payment_intent_id` populated
- [ ] Stripe dashboard shows uncaptured payment intent
- [ ] No duplicate processing

### Capture Payments

- [ ] Payment status changed to 'completed'
- [ ] `captured_at` timestamp set
- [ ] Correct amount captured in Stripe
- [ ] Professional receives payout
- [ ] Confirmation emails sent to both parties
- [ ] Email content accurate

### Balance Notifications

- [ ] `balance_notification_sent_at` timestamp set
- [ ] Correct email type sent (balance vs review/tip)
- [ ] Email content shows correct amounts
- [ ] Action links functional
- [ ] No duplicate notifications

### General Validation

- [ ] Database consistency maintained
- [ ] No orphaned records
- [ ] Proper error handling for failures
- [ ] Webhook events processed correctly
- [ ] Logs show clear processing information

This guide allows you to test the entire time-dependent payment flow without waiting for real-time delays, ensuring your cron jobs work correctly across all scenarios.
