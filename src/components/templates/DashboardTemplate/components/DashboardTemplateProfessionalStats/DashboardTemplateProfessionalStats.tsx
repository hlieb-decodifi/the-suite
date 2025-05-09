import { DashboardTemplateCard } from '../DashboardTemplateCard/DashboardTemplateCard';
import { BarChart3, Users } from 'lucide-react';
import { formatCurrency } from '@/utils/formatCurrency';

export type DashboardTemplateProfessionalStatsProps = {
  totalBookings: number;
  totalRevenue: number;
  percentChange?: number;
  isLoading?: boolean;
};

export function DashboardTemplateProfessionalStats({
  totalBookings,
  totalRevenue,
  percentChange,
  isLoading = false,
}: DashboardTemplateProfessionalStatsProps) {
  const renderBookingsDescription = (): string => {
    if (!percentChange) return '';

    if (percentChange > 0) {
      return `${Math.abs(percentChange)}% increase`;
    } else if (percentChange < 0) {
      return `${Math.abs(percentChange)}% decrease`;
    } else {
      return 'No change';
    }
  };

  const renderRevenueDescription = (): string => {
    if (totalBookings <= 0) return '';
    return `Avg. ${formatCurrency(totalRevenue / totalBookings)} per booking`;
  };

  return (
    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
      <DashboardTemplateCard
        title="Total Bookings"
        value={totalBookings.toString()}
        description={renderBookingsDescription()}
        icon={<Users className="h-5 w-5" />}
        isLoading={isLoading}
        colorVariant="primary"
      />

      <DashboardTemplateCard
        title="Total Revenue"
        value={formatCurrency(totalRevenue)}
        description={renderRevenueDescription()}
        icon={<BarChart3 className="h-5 w-5" />}
        isLoading={isLoading}
        colorVariant="success"
      />
    </div>
  );
}
