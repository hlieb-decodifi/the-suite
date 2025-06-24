import { Badge } from '@/components/ui/badge';
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table';
import { Typography } from '@/components/ui/typography';
import { formatCurrency } from '@/utils';
import { format } from 'date-fns';
import { CalendarDays, Clock, ChevronRight, DollarSign } from 'lucide-react';
import { useRouter } from 'next/navigation';

export type Refund = {
  id: string;
  date: Date;
  time: string;
  serviceName: string;
  clientName?: string;
  professionalName?: string;
  status:
    | 'pending'
    | 'approved'
    | 'processing'
    | 'completed'
    | 'declined'
    | 'failed';
  amount: number;
  requestedAmount?: number | undefined;
  originalAmount: number;
};

export type DashboardTemplateRefundsTableProps = {
  refunds: Refund[];
  isLoading?: boolean;
  isProfessionalView?: boolean;
};

// Helper component to render the status badge
function RefundStatusBadge({ status }: { status: Refund['status'] }) {
  switch (status) {
    case 'pending':
      return (
        <Badge
          variant="outline"
          className="bg-amber-500/10 text-amber-600 border-amber-500/20"
        >
          Pending
        </Badge>
      );
    case 'approved':
      return (
        <Badge
          variant="outline"
          className="bg-blue-500/10 text-blue-600 border-blue-500/20"
        >
          Approved
        </Badge>
      );
    case 'processing':
      return (
        <Badge
          variant="outline"
          className="bg-purple-500/10 text-purple-600 border-purple-500/20"
        >
          Processing
        </Badge>
      );
    case 'completed':
      return (
        <Badge
          variant="outline"
          className="bg-green-500/10 text-green-500 border-green-500/20"
        >
          Completed
        </Badge>
      );
    case 'declined':
      return (
        <Badge
          variant="outline"
          className="bg-red-500/10 text-red-500 border-red-500/20"
        >
          Declined
        </Badge>
      );
    case 'failed':
      return (
        <Badge
          variant="outline"
          className="bg-gray-500/10 text-gray-600 border-gray-500/20"
        >
          Failed
        </Badge>
      );
    default:
      return null;
  }
}

// Helper component for loading state
function RefundTableLoading() {
  return (
    <div className="rounded-md border p-8">
      <div className="flex flex-col items-center justify-center space-y-2">
        <div className="h-8 w-32 bg-muted/30 animate-pulse rounded" />
        <Typography variant="small" className="text-muted-foreground">
          Loading refunds...
        </Typography>
      </div>
    </div>
  );
}

// Helper component for empty state
function RefundTableEmpty() {
  return (
    <div className="rounded-md border p-8">
      <div className="flex flex-col items-center justify-center space-y-2">
        <DollarSign className="h-12 w-12 text-muted-foreground" />
        <Typography>No refunds found</Typography>
        <Typography variant="small" className="text-muted-foreground">
          Refund requests will appear here once submitted.
        </Typography>
      </div>
    </div>
  );
}

// Mobile refund card for responsive display
function RefundCard({
  refund,
  isProfessionalView,
}: {
  refund: Refund;
  isProfessionalView: boolean;
}) {
  const router = useRouter();

  return (
    <div
      className="p-4 border rounded-lg mb-2 bg-card cursor-pointer hover:bg-muted/30 transition-colors"
      onClick={() => router.push(`/refunds/${refund.id}`)}
    >
      <div className="flex justify-between items-start">
        <div>
          <Typography className="font-medium">{refund.serviceName}</Typography>
          <div className="text-muted-foreground text-sm flex items-center mt-1">
            <CalendarDays className="mr-1 h-3 w-3" />
            {format(refund.date, 'MMM dd, yyyy')}
            <span className="mx-1">•</span>
            <Clock className="mr-1 h-3 w-3" />
            {refund.time}
          </div>
        </div>
        <RefundStatusBadge status={refund.status} />
      </div>

      <div className="mt-3 pt-3 border-t flex justify-between items-center">
        <div>
          <Typography variant="small" className="text-muted-foreground">
            {isProfessionalView ? 'Client' : 'Professional'}
          </Typography>
          <Typography className="font-medium">
            {isProfessionalView ? refund.clientName : refund.professionalName}
          </Typography>
        </div>
        <div className="flex items-center">
          <Typography className="font-bold mr-2">
            {formatCurrency(refund.amount)}
          </Typography>
          <ChevronRight className="h-4 w-4 text-muted-foreground" />
        </div>
      </div>
    </div>
  );
}

export function DashboardTemplateRefundsTable({
  refunds,
  isLoading = false,
  isProfessionalView = false,
}: DashboardTemplateRefundsTableProps) {
  const router = useRouter();

  if (isLoading) return <RefundTableLoading />;
  if (refunds.length === 0) return <RefundTableEmpty />;

  return (
    <>
      {/* Desktop table view - hidden on small screens */}
      <div className="hidden md:block overflow-x-auto">
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead className="w-[180px]">Date & Time</TableHead>
              <TableHead className="w-[200px]">Service</TableHead>
              <TableHead className="w-[180px]">
                {isProfessionalView ? 'Client' : 'Professional'}
              </TableHead>
              <TableHead className="w-[120px]">Status</TableHead>
              <TableHead className="w-[100px] text-right">Amount</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {refunds.map((refund) => (
              <TableRow
                key={refund.id}
                className="hover:bg-muted/50 cursor-pointer"
                onClick={() => router.push(`/refunds/${refund.id}`)}
              >
                <TableCell>
                  <div className="flex flex-col">
                    <div className="flex items-center">
                      <CalendarDays className="mr-1 h-3 w-3 text-muted-foreground" />
                      <span>{format(refund.date, 'MMM dd, yyyy')}</span>
                    </div>
                    <div className="flex items-center text-muted-foreground">
                      <Clock className="mr-1 h-3 w-3" />
                      <span>{refund.time}</span>
                    </div>
                  </div>
                </TableCell>
                <TableCell>{refund.serviceName}</TableCell>
                <TableCell>
                  {isProfessionalView
                    ? refund.clientName
                    : refund.professionalName}
                </TableCell>
                <TableCell>
                  <RefundStatusBadge status={refund.status} />
                </TableCell>
                <TableCell className="text-right font-medium">
                  {formatCurrency(refund.amount)}
                </TableCell>
              </TableRow>
            ))}
          </TableBody>
        </Table>
      </div>

      {/* Mobile card view - shown only on small screens */}
      <div className="md:hidden">
        {refunds.map((refund) => (
          <RefundCard
            key={refund.id}
            refund={refund}
            isProfessionalView={isProfessionalView}
          />
        ))}
      </div>
    </>
  );
}
