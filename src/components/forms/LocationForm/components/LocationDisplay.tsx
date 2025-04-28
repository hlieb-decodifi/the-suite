'use client';

import { Typography } from '@/components/ui/typography';
import { Button } from '@/components/ui/button';
import { MapPin } from 'lucide-react';
import { LocationFormValues } from '../schema';

export type LocationDisplayProps = {
  data: LocationFormValues;
  onEditClick: () => void;
};

export function LocationDisplay({ data, onEditClick }: LocationDisplayProps) {
  const hasAddress = Boolean(
    data.country || data.state || data.city || data.streetAddress,
  );

  if (!hasAddress) {
    return (
      <div className="text-center py-8">
        <MapPin size={36} className="mx-auto text-[#DEA85B] mb-4 opacity-50" />
        <Typography className="text-[#5D6C6F] mb-2">
          No address information added yet
        </Typography>
        <Button
          onClick={onEditClick}
          variant="outline"
          className="mt-2 border-[#DEA85B] text-[#DEA85B] hover:bg-[#FAEBD7] hover:text-[#C89245]"
        >
          Add Your Address
        </Button>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {data.address && (
        <div>
          <Typography variant="small" className="text-[#5D6C6F] font-medium">
            Full Address
          </Typography>
          <Typography className="text-[#313131] font-medium mt-1 mb-4">
            {data.address}
          </Typography>
        </div>
      )}
      <div className="grid grid-cols-1 sm:grid-cols-2 gap-6">
        <div>
          <Typography variant="small" className="text-[#5D6C6F] font-medium">
            Country
          </Typography>
          <Typography className="text-[#313131] font-medium mt-1">
            {data.country || '-'}
          </Typography>
        </div>

        <div>
          <Typography variant="small" className="text-[#5D6C6F] font-medium">
            State/Province
          </Typography>
          <Typography className="text-[#313131] font-medium mt-1">
            {data.state || '-'}
          </Typography>
        </div>

        <div>
          <Typography variant="small" className="text-[#5D6C6F] font-medium">
            City
          </Typography>
          <Typography className="text-[#313131] font-medium mt-1">
            {data.city || '-'}
          </Typography>
        </div>

        <div>
          <Typography variant="small" className="text-[#5D6C6F] font-medium">
            Street Address
          </Typography>
          <Typography className="text-[#313131] font-medium mt-1">
            {data.streetAddress || '-'}
          </Typography>
        </div>
      </div>
    </div>
  );
}
