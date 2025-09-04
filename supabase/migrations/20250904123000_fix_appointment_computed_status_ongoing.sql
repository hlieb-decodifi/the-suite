-- Fix the get_appointment_computed_status function to return 'ongoing' when appointment is in progress
-- This fixes the "Add Additional Services" button not showing during appointments

create or replace function get_appointment_computed_status(
  p_start_time timestamptz,
  p_end_time timestamptz,
  p_status text
)
returns text as $$
declare
  current_datetime timestamptz;
begin
  -- If appointment is cancelled, return cancelled
  if p_status = 'cancelled' then
    return 'cancelled';
  end if;

  current_datetime := now();

  -- If appointment hasn't started yet, it's upcoming
  if current_datetime < p_start_time then
    return 'upcoming';
  end if;

  -- If appointment has ended, it's completed
  if current_datetime > p_end_time then
    return 'completed';
  end if;

  -- If we're between start and end time, it's ongoing
  return 'ongoing';
end;
$$ language plpgsql;
