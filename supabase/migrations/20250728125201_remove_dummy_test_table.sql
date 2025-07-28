drop policy "Anyone can view dummy test data" on "public"."dummy_test_table";

revoke delete on table "public"."dummy_test_table" from "anon";

revoke insert on table "public"."dummy_test_table" from "anon";

revoke references on table "public"."dummy_test_table" from "anon";

revoke select on table "public"."dummy_test_table" from "anon";

revoke trigger on table "public"."dummy_test_table" from "anon";

revoke truncate on table "public"."dummy_test_table" from "anon";

revoke update on table "public"."dummy_test_table" from "anon";

revoke delete on table "public"."dummy_test_table" from "authenticated";

revoke insert on table "public"."dummy_test_table" from "authenticated";

revoke references on table "public"."dummy_test_table" from "authenticated";

revoke select on table "public"."dummy_test_table" from "authenticated";

revoke trigger on table "public"."dummy_test_table" from "authenticated";

revoke truncate on table "public"."dummy_test_table" from "authenticated";

revoke update on table "public"."dummy_test_table" from "authenticated";

revoke delete on table "public"."dummy_test_table" from "service_role";

revoke insert on table "public"."dummy_test_table" from "service_role";

revoke references on table "public"."dummy_test_table" from "service_role";

revoke select on table "public"."dummy_test_table" from "service_role";

revoke trigger on table "public"."dummy_test_table" from "service_role";

revoke truncate on table "public"."dummy_test_table" from "service_role";

revoke update on table "public"."dummy_test_table" from "service_role";

alter table "public"."dummy_test_table" drop constraint "dummy_test_table_pkey";

drop index if exists "public"."dummy_test_table_pkey";

drop table "public"."dummy_test_table";


