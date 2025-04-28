'use client';

import { Typography } from '@/components/ui/typography';
import { DetailsFormValues } from '../schema';

export type DetailsDisplayProps = {
  data: DetailsFormValues;
};

export function DetailsDisplay({ data }: DetailsDisplayProps) {
  return (
    <div className="space-y-6">
      <div className="grid grid-cols-1 sm:grid-cols-2 gap-6">
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
          {data.phone || '-'}
        </Typography>
      </div>
    </div>
  );
}
