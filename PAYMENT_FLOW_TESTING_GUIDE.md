# Payment Flow Testing Guide - Complete Testing Scenarios

## Prerequisites

Before testing, ensure you have:

1. **Test Stripe Account** with connected professional accounts
2. **Test Payment Methods** in Stripe (test cards)
3. **Professional Profiles** with different deposit configurations:
   - No deposit required
   - Fixed amount deposit ($10, $25, $50)
   - Percentage deposit (25%, 50%, 75%)
4. **Cancellation Policy Settings** enabled/disabled
5. **Test Users**: Clients and professionals
6. **Email Testing** environment (MailPit or similar)

## Base Test Data Setup

### Professional Configurations:

- **Professional A**: No deposit required, no cancellation policy
- **Professional B**: $25 fixed deposit, cancellation policy enabled (25% at 48h, 50% at 24h)
- **Professional C**: 50% percentage deposit, cancellation policy enabled
- **Professional D**: 25% percentage deposit, no cancellation policy

### Services:

- **Service 1**: $50, 60 minutes
- **Service 2**: $100, 90 minutes
- **Extra Service**: $20, 30 minutes

---

## Core Payment Flow Scenarios (1-16)

## Scenario 1: Cash Payment Method

### Setup:

- Professional: Any
- Payment Method: Cash
- Service: $50 service

### Test Steps:

1. **Book Appointment**:

   - Navigate to professional's booking page
   - Select service and available time slot
   - Choose "Cash" as payment method
   - Add tip if desired
   - Complete booking

2. **Verify Results**:

   - ✅ Booking created with status "confirmed"
   - ✅ Payment record created with status "completed"
   - ✅ No Stripe checkout session created
   - ✅ Service fee ($1) marked for later collection
   - ✅ Email confirmations sent to both parties
   - ✅ Dashboard shows appointment

3. **Expected Database State**:
   ```sql
   booking_payments:
     - status: 'completed'
     - payment_type: 'full'
     - requires_balance_payment: false
     - stripe_checkout_session_id: null
   ```

---

## Scenario 2: Card Payment Method (Immediate)

### Setup:

- Professional: Professional A (no deposit)
- Payment Method: Credit Card
- Service: $50 service
- Appointment: Within 6 days

### Test Steps:

1. **Book Appointment**:

   - Select service and time slot ≤6 days away
   - Choose "Credit Card" payment method
   - Complete booking form

2. **Stripe Checkout**:

   - ✅ Redirected to Stripe Checkout
   - ✅ Payment processed immediately with uncaptured intent
   - ✅ Success page displayed

3. **Verify Results**:

   - ✅ Payment status "authorized"
   - ✅ Capture scheduled for post-appointment
   - ✅ Email confirmations sent
   - ✅ Professional notified

4. **Expected Database State**:
   ```sql
   booking_payments:
     - status: 'authorized'
     - capture_method: 'manual'
     - capture_scheduled_for: [post-appointment date]
     - stripe_payment_intent_id: [present]
   ```

---

## Scenario 3: Fixed Sum Deposit

### Setup:

- Professional: Professional B ($25 fixed deposit)
- Service: $100 service
- Payment Method: Credit Card

### Test Steps:

1. **Book Appointment**:

   - Select $100 service
   - Choose Credit Card payment

2. **Deposit Payment**:

   - ✅ Stripe checkout for $26 ($25 deposit + $1 service fee)
   - ✅ Complete payment successfully

3. **Verify Results**:

   - ✅ Payment status "deposit_paid"
   - ✅ Balance amount: $75
   - ✅ Requires balance payment: true
   - ✅ Email shows deposit paid, balance due

4. **Expected Database State**:
   ```sql
   booking_payments:
     - status: 'deposit_paid'
     - deposit_amount: 25.00
     - balance_amount: 75.00
     - requires_balance_payment: true
   ```

---

## Scenario 4: Percentage Deposit

### Setup:

- Professional: Professional C (50% deposit)
- Service: $100 service
- Payment Method: Credit Card

### Test Steps:

1. **Book Appointment**:

   - Select $100 service
   - Choose Credit Card payment

2. **Deposit Payment**:

   - ✅ Stripe checkout for $51 ($50 deposit + $1 service fee)
   - ✅ Complete payment successfully

3. **Verify Results**:

   - ✅ Payment status "deposit_paid"
   - ✅ Balance amount: $50
   - ✅ Balance payment notification scheduled

4. **Expected Database State**:
   ```sql
   booking_payments:
     - deposit_amount: 50.00
     - balance_amount: 50.00
     - payment_type: 'deposit'
   ```

---

## Scenario 5: Deposit Balance in Cash

### Setup:

- Continue from Scenario 3 or 4
- Balance payment due

### Test Steps:

1. **Professional Marks Service Complete**:

   - Professional goes to dashboard
   - Marks appointment as "completed"

2. **Balance Collection**:

   - ✅ System automatically generates balance payment request
   - ✅ Client receives balance notification email
   - ✅ Balance marked as "cash payment pending"

3. **Professional Confirms Cash Receipt**:
   - Professional marks cash balance as received
   - ✅ Payment status updated to "completed"

---

## Scenario 6: Deposit Balance by Card

### Setup:

- Continue from Scenario 3 or 4
- Balance payment due
- Client has saved payment method

### Test Steps:

1. **Automatic Balance Capture**:

   - Wait for appointment completion + 12 hours
   - ✅ System automatically charges saved payment method
   - ✅ Balance amount captured successfully

2. **Manual Balance Payment**:

   - Client clicks balance payment link from email
   - ✅ Can add/adjust tips
   - ✅ Completes balance payment manually

3. **Verify Results**:
   - ✅ Payment status "completed"
   - ✅ Professional receives payout
   - ✅ Confirmation emails sent

---

## Scenario 7: Appointment Less Than 6 Days in Advance

### Setup:

- Professional: Any with card payment
- Appointment: ≤6 days from now

### Test Steps:

1. **Book Appointment**:

   - Select date within 6 days
   - Choose Credit Card payment

2. **Immediate Authorization**:

   - ✅ Stripe creates uncaptured payment intent immediately
   - ✅ Payment authorized but not captured
   - ✅ Capture scheduled for post-appointment

3. **Expected Database State**:
   ```sql
   booking_payments:
     - status: 'authorized'
     - pre_auth_placed_at: [current time]
     - capture_scheduled_for: [post-appointment]
   ```

---

## Scenario 8: Appointment More Than 6 Days in Advance

### Setup:

- Professional: Any with card payment
- Appointment: >6 days from now

### Test Steps:

1. **Book Appointment**:

   - Select date more than 6 days away
   - Choose Credit Card payment

2. **Setup Intent Flow**:

   - ✅ Stripe setup intent to save payment method
   - ✅ No immediate charge
   - ✅ Authorization scheduled 6 days before appointment

3. **Pre-Authorization (6 days before)**:

   - ✅ Cron job creates uncaptured payment intent
   - ✅ Payment authorized automatically
   - ✅ Client notified of authorization

4. **Expected Database State**:
   ```sql
   booking_payments:
     - status: 'pending'
     - pre_auth_scheduled_for: [6 days before appointment]
     - stripe_payment_method_id: [saved method]
   ```

---

## Scenario 9: During Booking User Added Tips

### Setup:

- Any professional and service
- Payment method: Credit Card

### Test Steps:

1. **Book with Tip**:

   - Select service ($50)
   - Add tip amount ($10)
   - Choose payment method

2. **Payment Processing**:

   - ✅ Total charged: $61 ($50 + $10 tip + $1 fee)
   - ✅ Tip amount recorded separately
   - ✅ Professional receives service amount + tip

3. **Verify Results**:

   - ✅ Payment breakdown shows tip separately
   - ✅ Emails show tip amount
   - ✅ Professional payout includes tip

4. **Expected Database State**:
   ```sql
   booking_payments:
     - tip_amount: 10.00
     - amount: 61.00  // includes tip + service fee
   ```

---

## Scenario 10: During Appointment Professional Added Extra Services

### Setup:

- Existing appointment in progress
- Professional adds extra services

### Test Steps:

1. **Add Extra Services**:

   - Professional accesses appointment
   - Adds extra service ($20)
   - Updates appointment total

2. **Additional Payment Collection**:

   - ✅ System creates additional payment request
   - ✅ Client receives notification for extra charge
   - ✅ Payment processed using saved method

3. **Verify Results**:
   - ✅ Booking services updated
   - ✅ Additional payment recorded
   - ✅ Total amount reflects extra services

---

## Scenario 11: Client Cancelled - No Cancellation Policy

### Setup:

- Professional: Professional A (no cancellation policy)
- Existing confirmed booking

### Test Steps:

1. **Cancel Appointment**:

   - Client navigates to booking
   - Selects "Cancel Appointment"
   - Provides cancellation reason

2. **Cancellation Processing**:

   - ✅ Booking status changed to "cancelled"
   - ✅ Full refund processed (if payment made)
   - ✅ No cancellation fees charged

3. **Verify Results**:

   - ✅ Payment status "refunded"
   - ✅ Stripe refund initiated
   - ✅ Both parties notified

4. **Expected Database State**:
   ```sql
   bookings:
     - status: 'cancelled'
   booking_payments:
     - status: 'refunded'
   ```

---

## Scenario 12: Client Cancelled in Advance (No Fees)

### Setup:

- Professional: Professional B (has cancellation policy)
- Cancellation: >48 hours before appointment

### Test Steps:

1. **Cancel More Than 48h in Advance**:

   - Cancel appointment 3+ days before
   - Provide reason

2. **No Fee Cancellation**:

   - ✅ No cancellation fee applied
   - ✅ Full refund processed
   - ✅ Cancellation policy noted but not applied

3. **Verify Results**:
   - ✅ Payment fully refunded
   - ✅ Professional notified of free cancellation

---

## Scenario 13: Client Cancelled Within Policy Period (Fees Applied)

### Setup:

- Professional: Professional B (25% at 48h, 50% at 24h)
- Cancellation: Within policy timeframe

### Test Steps:

1. **Cancel Within 24-48 Hours**:

   - Cancel appointment 30 hours before
   - Confirm cancellation

2. **Fee Calculation**:

   - ✅ 25% cancellation fee calculated ($12.50 on $50 service)
   - ✅ Remaining amount refunded ($37.50)
   - ✅ Professional receives cancellation fee

3. **Cancel Within 24 Hours**:

   - Cancel appointment 12 hours before
   - ✅ 50% cancellation fee applied ($25)
   - ✅ 50% refunded to client ($25)

4. **Verify Results**:
   - ✅ Partial refund processed
   - ✅ Cancellation fee charged
   - ✅ Both parties receive detailed breakdown

---

## Scenario 14: Client No-Show

### Setup:

- Confirmed appointment
- Client doesn't attend

### Test Steps:

1. **Professional Marks No-Show**:

   - Professional accesses appointment post-time
   - Clicks "Mark as No-Show"
   - Sets charge percentage (0-100%)

2. **No-Show Processing**:

   - ✅ Charge applied to client's saved payment method
   - ✅ Appointment marked as cancelled
   - ✅ Professional receives no-show fee

3. **Verify Results**:

   - ✅ Client charged appropriate amount
   - ✅ No-show notification emails sent
   - ✅ Professional compensated

4. **Expected Database State**:
   ```sql
   appointments:
     - status: 'cancelled'
   booking_payments:
     - status: 'completed'  // with no-show charge
   ```

---

## Scenario 15: Client Added Tips After Appointment

### Setup:

- Completed appointment
- Client wants to add tip retroactively

### Test Steps:

1. **Post-Appointment Tip Addition**:

   - Client receives review/tip notification email
   - Clicks link to add tip
   - Selects tip amount

2. **Tip Processing**:

   - ✅ Additional payment processed for tip only
   - ✅ Professional receives tip payment
   - ✅ Confirmation emails sent

3. **Verify Results**:
   - ✅ Separate tip payment recorded
   - ✅ Professional payout updated
   - ✅ Payment history shows tip addition

---

## Scenario 16: Client Requested Refund

### Setup:

- Completed appointment
- Client unsatisfied with service

### Test Steps:

1. **Refund Request Submission**:

   - Client navigates to completed appointment
   - Clicks "Request Refund"
   - Provides reason and requested amount

2. **Refund Review Process**:

   - ✅ Refund request created with "pending" status
   - ✅ Professional receives notification
   - ✅ Professional can approve/decline with notes

3. **Refund Processing**:

   - If approved: ✅ Stripe refund initiated
   - ✅ Client receives refund confirmation
   - ✅ Professional payout adjusted

4. **Verify Results**:

   - ✅ Refund status tracking
   - ✅ Proper fund movement
   - ✅ Dispute resolution documented

5. **Expected Database State**:
   ```sql
   refunds:
     - status: 'completed'
     - refund_amount: [approved amount]
     - stripe_refund_id: [present]
   ```

---

## Additional Critical Scenarios (17-35)

## Scenario 17: Failed Payment Processing

### Setup:

- Any booking scenario
- Use declined test card (4000000000000002)

### Test Steps:

1. **Attempt Payment**:

   - Complete booking with declined card
   - ✅ Payment fails gracefully

2. **Failure Handling**:

   - ✅ Booking status remains "pending_payment"
   - ✅ User shown clear error message
   - ✅ Can retry with different payment method
   - ✅ No partial charges applied

3. **Expected Database State**:
   ```sql
   booking_payments:
     - status: 'failed'
   bookings:
     - status: 'pending_payment'
   ```

---

## Scenario 18: Professional Cancellation

### Setup:

- Confirmed appointment
- Professional needs to cancel

### Test Steps:

1. **Professional Cancels**:

   - Professional accesses appointment
   - Selects "Cancel Appointment"
   - Provides reason

2. **Cancellation Processing**:

   - ✅ Full refund processed automatically
   - ✅ Client notified immediately
   - ✅ No fees charged to client
   - ✅ Professional may face platform penalty

3. **Expected Database State**:
   ```sql
   bookings:
     - status: 'cancelled'
     - cancelled_by: 'professional'
   booking_payments:
     - status: 'refunded'
   ```

---

## Scenario 19: Appointment Rescheduling

### Setup:

- Existing confirmed appointment
- Either party requests reschedule

### Test Steps:

1. **Reschedule Request**:

   - User selects new date/time
   - ✅ Payment method validation
   - ✅ New authorization if needed

2. **Payment Adjustment**:

   - ✅ Previous authorization cancelled
   - ✅ New authorization for new date
   - ✅ No additional charges

3. **Verify Results**:

   - ✅ Appointment updated
   - ✅ Payment schedule adjusted
   - ✅ Both parties notified

---

## Scenario 20: Expired Payment Method

### Setup:

- Scheduled payment with expired card
- Pre-authorization or balance payment due

### Test Steps:

1. **Payment Attempt with Expired Card**:

   - System attempts scheduled payment
   - ✅ Payment fails due to expired card

2. **Failure Recovery**:

   - ✅ Client notified of failed payment
   - ✅ Request for updated payment method
   - ✅ Grace period before appointment cancellation
   - ✅ Can update payment method and retry

3. **Expected Database State**:
   ```sql
   booking_payments:
     - status: 'failed'
     - failure_reason: 'expired_card'
   ```

---

## Scenario 21: Webhook Failure Recovery

### Setup:

- Payment processed in Stripe
- Webhook fails to reach application

### Test Steps:

1. **Simulate Webhook Failure**:

   - Payment completes in Stripe
   - Application doesn't receive confirmation

2. **Recovery Process**:

   - ✅ Manual webhook replay from Stripe
   - ✅ Payment status synchronization
   - ✅ Delayed notifications sent
   - ✅ Data consistency maintained

---

## Scenario 22: Balance Payment Deadline Expiry

### Setup:

- Deposit paid appointment
- Balance payment overdue

### Test Steps:

1. **Balance Payment Overdue**:

   - 24+ hours past appointment completion
   - No balance payment received

2. **Deadline Processing**:

   - ✅ Professional receives partial payment
   - ✅ Client receives overdue notice
   - ✅ Account may be marked for collection
   - ✅ Future booking restrictions applied

---

## Scenario 23: Concurrent Booking Attempts

### Setup:

- Two clients attempt to book same time slot
- Simultaneous form submissions

### Test Steps:

1. **Race Condition Test**:

   - Two users submit booking forms simultaneously
   - ✅ Only one booking succeeds
   - ✅ Second user receives "slot unavailable" error
   - ✅ No double-booking occurs
   - ✅ Failed payment is not processed

---

## Scenario 24: Professional Stripe Account Disconnection

### Setup:

- Professional with active bookings
- Stripe account gets disconnected

### Test Steps:

1. **Account Disconnection**:

   - Professional disconnects Stripe account
   - ✅ Existing bookings remain valid
   - ✅ New bookings blocked for card payments
   - ✅ Cash payments still available
   - ✅ Professionals notified to reconnect

---

## Scenario 25: Service Fee Only Payment (Cash Bookings)

### Setup:

- Cash payment booking
- Service fee collection required

### Test Steps:

1. **Service Fee Collection**:

   - Cash booking created
   - ✅ Separate $1 service fee charge
   - ✅ Fee collected via card payment
   - ✅ Professional receives full service amount

---

## Scenario 26: Multiple Extra Services During Booking

### Setup:

- Main service booking
- Multiple additional services added

### Test Steps:

1. **Book with Multiple Extras**:

   - Select main service ($50)
   - Add 3 extra services ($20, $15, $10)
   - ✅ Total calculated correctly ($96 + tip + fee)
   - ✅ All services recorded separately
   - ✅ Payment breakdown accurate

---

## Scenario 27: Partial Refund Processing

### Setup:

- Completed appointment
- Partial refund requested/approved

### Test Steps:

1. **Partial Refund Request**:

   - Client requests 50% refund
   - Professional approves partial amount
   - ✅ Correct amount refunded
   - ✅ Professional retains remainder
   - ✅ Payment status updated to "partially_refunded"

---

## Scenario 28: Professional Declining Refund

### Setup:

- Client refund request submitted
- Professional review required

### Test Steps:

1. **Refund Decline Process**:

   - Professional reviews request
   - Provides decline reason
   - ✅ Client notified of decline
   - ✅ Dispute escalation option provided
   - ✅ Status changed to "declined"

---

## Scenario 29: High Value Transaction Testing

### Setup:

- Service with high value ($500+)
- Test payment limits and processing

### Test Steps:

1. **High Value Booking**:

   - Book expensive service
   - ✅ Payment processing succeeds
   - ✅ Proper fee calculations
   - ✅ Connected account limits respected
   - ✅ Enhanced fraud protection applied

---

## Scenario 30: Zero Dollar Service Edge Case

### Setup:

- Free consultation or promotional service
- $0 service amount

### Test Steps:

1. **Zero Dollar Booking**:

   - Book free service
   - ✅ No payment required
   - ✅ Service fee handling ($1 only)
   - ✅ Booking confirmation sent
   - ✅ Professional receives booking

---

## Time-Dependent Cron Job Scenarios (31-35)

## Scenario 31: Pre-Authorization Cron Job Testing

### Setup:

- Booking made >6 days in advance
- Setup intent completed, payment method saved

### Test Steps using Supabase CLI:

1. **Create Test Booking**:

   - Book appointment 8 days in advance
   - Complete setup intent flow
   - Verify `pre_auth_scheduled_for` date set

2. **Manipulate Database Date**:

   ```sql
   -- Move pre-auth date to past to trigger cron job
   UPDATE booking_payments
   SET pre_auth_scheduled_for = NOW() - INTERVAL '1 hour'
   WHERE booking_id = '[booking_id]';
   ```

3. **Execute Cron Job**:

   ```bash
   curl http://localhost:3000/api/cron/pre-auth-payments
   ```

4. **Verify Results**:
   - ✅ Payment status changed to 'authorized'
   - ✅ `pre_auth_placed_at` timestamp set
   - ✅ `stripe_payment_intent_id` populated
   - ✅ Stripe dashboard shows uncaptured payment intent

---

## Scenario 32: Payment Capture Cron Job Testing

### Setup:

- Authorized payment ready for capture
- Appointment completed

### Test Steps using Supabase CLI:

1. **Setup Authorized Payment**:

   - Use result from Scenario 31 or create authorized payment
   - Mark appointment as completed

2. **Manipulate Database Date**:

   ```sql
   -- Move capture date to past to trigger cron job
   UPDATE booking_payments
   SET capture_scheduled_for = NOW() - INTERVAL '1 hour'
   WHERE booking_id = '[booking_id]';

   -- Ensure appointment is completed
   UPDATE appointments
   SET status = 'completed'
   WHERE booking_id = '[booking_id]';
   ```

3. **Execute Cron Job**:

   ```bash
   curl http://localhost:3000/api/cron/capture-payments
   ```

4. **Verify Results**:
   - ✅ Payment status changed to 'completed'
   - ✅ `captured_at` timestamp set
   - ✅ Correct amount captured in Stripe
   - ✅ Payment confirmation emails sent
   - ✅ Professional receives payout

---

## Scenario 33: Balance Notification Cron Job Testing (Card Payments)

### Setup:

- Authorized payment requiring balance
- Appointment completed >2 hours ago

### Test Steps using Supabase CLI:

1. **Setup Completed Appointment**:

   - Create booking with deposit payment
   - Balance amount due

2. **Manipulate Database Dates**:

   ```sql
   -- Move appointment to past (>2 hours ago)
   UPDATE appointments
   SET status = 'completed',
       date = CURRENT_DATE - INTERVAL '1 day',
       end_time = '12:00:00'
   WHERE booking_id = '[booking_id]';

   -- Ensure balance notification not sent yet
   UPDATE booking_payments
   SET status = 'authorized',
       requires_balance_payment = true,
       balance_notification_sent_at = NULL
   WHERE booking_id = '[booking_id]';
   ```

3. **Execute Cron Job**:

   ```bash
   curl http://localhost:3000/api/cron/balance-notifications
   ```

4. **Verify Results**:
   - ✅ `balance_notification_sent_at` timestamp set
   - ✅ Balance notification email sent to client
   - ✅ Email contains correct payment amounts
   - ✅ Action links functional

---

## Scenario 34: Review/Tip Notification Cron Job Testing (Cash Payments)

### Setup:

- Completed cash payment appointment
- > 2 hours after appointment end

### Test Steps using Supabase CLI:

1. **Setup Cash Payment**:

   - Create booking with cash payment method
   - Mark as completed

2. **Manipulate Database Dates**:

   ```sql
   -- Move appointment to past (>2 hours ago)
   UPDATE appointments
   SET status = 'completed',
       date = CURRENT_DATE - INTERVAL '1 day',
       end_time = '14:00:00'
   WHERE booking_id = '[booking_id]';

   -- Ensure cash payment completed
   UPDATE booking_payments
   SET status = 'completed',
       balance_notification_sent_at = NULL
   WHERE booking_id = '[booking_id]';
   ```

3. **Execute Cron Job**:

   ```bash
   curl http://localhost:3000/api/cron/balance-notifications
   ```

4. **Verify Results**:
   - ✅ Review/tip notification email sent
   - ✅ Email encourages review and optional tip
   - ✅ Links to review/tip page functional

---

## Scenario 35: Failed Cron Job Recovery Testing

### Setup:

- Various payment states that might cause cron job failures

### Test Steps:

1. **Expired Payment Method**:

   ```sql
   -- Simulate expired card for pre-auth
   UPDATE booking_payments
   SET pre_auth_scheduled_for = NOW() - INTERVAL '1 hour',
       stripe_payment_method_id = 'pm_card_visa_chargeDeclined'
   WHERE booking_id = '[booking_id]';
   ```

2. **Missing Stripe Data**:

   ```sql
   -- Missing payment intent for capture
   UPDATE booking_payments
   SET capture_scheduled_for = NOW() - INTERVAL '1 hour',
       stripe_payment_intent_id = NULL
   WHERE booking_id = '[booking_id]';
   ```

3. **Execute Cron Jobs**:

   ```bash
   curl http://localhost:3000/api/cron/pre-auth-payments
   curl http://localhost:3000/api/cron/capture-payments
   ```

4. **Verify Error Handling**:
   - ✅ Cron jobs don't crash
   - ✅ Error details logged
   - ✅ Failed payments tracked
   - ✅ Successful payments still process

---

## Testing Validation Checklist

For each scenario, verify:

### Database Integrity

- [ ] Payment records match expected amounts
- [ ] Status transitions are correct
- [ ] Timestamps are accurate
- [ ] Foreign key relationships maintained

### Stripe Integration

- [ ] Payment intents created correctly
- [ ] Capture/refund operations successful
- [ ] Webhooks processed properly
- [ ] Connected account transfers accurate

### Email Notifications

- [ ] All required parties notified
- [ ] Email content accurate and formatted
- [ ] Action links functional
- [ ] Timing appropriate

### User Experience

- [ ] Clear status messages
- [ ] Proper error handling
- [ ] Responsive UI elements
- [ ] Intuitive flow progression

### Financial Accuracy

- [ ] Service fees calculated correctly
- [ ] Tip amounts processed properly
- [ ] Deposit/balance splits accurate
- [ ] Refund amounts correct

---

## Common Testing Tools

### Database Queries

```sql
-- Check payment status
SELECT * FROM booking_payments WHERE booking_id = '[booking_id]';

-- Verify refund records
SELECT * FROM refunds WHERE appointment_id = '[appointment_id]';

-- Check appointment status
SELECT * FROM appointments WHERE id = '[appointment_id]';
```

### Stripe Dashboard

- Monitor payment intents
- Verify connected account transfers
- Check refund status
- Review webhook logs

### Email Testing

- MailPit for local email testing
- Verify email delivery and formatting
- Test email action links

This comprehensive testing guide covers all 35 payment flow scenarios with detailed steps and verification criteria.
