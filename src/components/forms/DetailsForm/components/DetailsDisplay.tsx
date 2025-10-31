'use client';

import { Typography } from '@/components/ui/typography';
import { PhoneNumberUtil, PhoneNumberFormat } from 'google-libphonenumber';
import { DetailsFormValues } from '../schema';

const phoneUtil = PhoneNumberUtil.getInstance();

const formatPhoneNumber = (phone: string): string => {
  if (!phone || phone.trim() === '') {
    return '-';
  }

  try {
    const parsed = phoneUtil.parseAndKeepRawInput(phone);
    if (phoneUtil.isValidNumber(parsed)) {
      // Use INTERNATIONAL format for a clean, professional display
      return phoneUtil.format(parsed, PhoneNumberFormat.INTERNATIONAL);
    }
    // If parsing fails or number is invalid, return the original phone number
    return phone;
  } catch {
    // If parsing fails, return the original phone number
    return phone;
  }
};

export type DetailsDisplayProps = {
  data: DetailsFormValues;
};

export function DetailsDisplay({ data }: DetailsDisplayProps) {
  return (
    <div className="space-y-6">
      <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
        <div>
          <Typography variant="small" className="text-[#5D6C6F] font-medium">
            First Name
          </Typography>
          <Typography className="text-[#313131] font-medium mt-1">
            {data.firstName || '-'}
          </Typography>
        </div>

        <div>
          <Typography variant="small" className="text-[#5D6C6F] font-medium">
            Last Name
          </Typography>
          <Typography className="text-[#313131] font-medium mt-1">
            {data.lastName || '-'}
          </Typography>
        </div>
      </div>

      <div>
        <Typography variant="small" className="text-[#5D6C6F] font-medium">
          Phone Number
        </Typography>
        <Typography className="text-[#313131] font-medium mt-1">
          {formatPhoneNumber(data.phone || '')}
        </Typography>
      </div>
    </div>
  );
}
