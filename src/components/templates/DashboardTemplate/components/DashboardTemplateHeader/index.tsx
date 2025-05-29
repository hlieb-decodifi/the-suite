'use client';

import { Typography } from '@/components/ui/typography';
import { User } from '@supabase/supabase-js';
import Link from 'next/link';
import { Button } from '@/components/ui/button';
import { UserCircle } from 'lucide-react';
import { DateRange } from 'react-day-picker';
import { DashboardTemplateDateRangePicker } from '../DashboardTemplateDateRangePicker/DashboardTemplateDateRangePicker';

export type DashboardTemplateHeaderProps = {
  user: User;
  title: string;
  dateRange: [Date | undefined, Date | undefined];
  onDateRangeChange: (range: DateRange) => void;
};

export function DashboardTemplateHeader({
  user,
  title,
  dateRange,
  onDateRangeChange,
}: DashboardTemplateHeaderProps) {
  return (
    <div className="flex flex-col md:flex-row justify-between items-start mb-6 gap-4">
      <div>
        <Typography
          variant="h2"
          className="leading-5 border-none font-bold text-foreground"
        >
          {title}
        </Typography>
        <Typography className="text-muted-foreground">
          Welcome back, {user.email}
        </Typography>
      </div>

      <div className="flex flex-col md:flex-row items-stretch gap-3 w-full md:w-auto">
        <Link href="/profile" className="w-full cursor-pointer">
          <Button
            variant="outline"
            className="w-full font-medium justify-start text-foreground border-border"
          >
            <UserCircle size={16} className="mr-2" />
            Go to Profile
          </Button>
        </Link>

        <DashboardTemplateDateRangePicker
          dateRange={
            dateRange[0] && dateRange[1]
              ? { from: dateRange[0], to: dateRange[1] }
              : undefined
          }
          onDateRangeChange={onDateRangeChange}
          className="w-full md:w-auto"
        />
      </div>
    </div>
  );
}
