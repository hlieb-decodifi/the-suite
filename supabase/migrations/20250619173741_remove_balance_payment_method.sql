alter table "public"."booking_payments" drop constraint "booking_payments_balance_payment_method_check";

alter table "public"."professional_profiles" drop constraint "professional_profiles_balance_payment_method_check";

alter table "public"."booking_payments" drop column "balance_payment_method";

alter table "public"."professional_profiles" drop column "balance_payment_method";


