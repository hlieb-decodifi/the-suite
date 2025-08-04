'use client';

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
import { MessageBadge } from '@/components/ui/message-badge';
import { formatCurrency } from '@/utils';
import { format } from 'date-fns';
import { ChevronRight, Clock, MessageSquare } from 'lucide-react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { useEffect, useState } from 'react';

// Define support request type
type SupportRequestType = {
  id: string;
  title: string;
  description: string;
  status: 'pending' | 'in_progress' | 'resolved' | 'closed';
  category: string;
  requested_amount?: number | null;
  original_amount?: number | null;
  created_at: string;
  appointment_id?: string | null;
  client_id: string;
  professional_id?: string | null;
  // Additional fields for display
  serviceName?: string;
  clientName?: string;
  professionalName?: string;
  appointmentDate?: string;
  // Added fields for joined user and appointment data
  client_user?: {
    first_name?: string;
    last_name?: string;
  };
  professional_user?: {
    first_name?: string;
    last_name?: string;
  };
  appointments?: {
    bookings?: {
      booking_services?: {
        services?: {
          name?: string;
        };
      }[];
    }[];
  };
};

// Type for transformed support request data for the table
type SupportRequest = {
  id: string;
  date: Date;
  title: string;
  description: string;
  clientName?: string | undefined;
  professionalName?: string | undefined;
  status: 'pending' | 'in_progress' | 'resolved' | 'closed';
  amount?: number | undefined;
  serviceName?: string | undefined;
  unreadCount?: number;
  conversationId?: string;
};

type DashboardSupportRequestsPageClientProps = {
  isProfessional: boolean;
  startDate?: string | undefined;
  endDate?: string | undefined;
  status?: string | undefined;
  category?: string | undefined;
};

// Filter Buttons component (copied from DashboardAppointmentsPageClient)
function FilterButtons({
  activeFilter,
  setActiveFilter,
  pendingCount,
  resolvedCount,
}: {
  activeFilter: string;
  setActiveFilter: (filter: string) => void;
  pendingCount: number;
  resolvedCount: number;
}) {
  return (
    <div className="inline-flex items-center mb-4 bg-muted/30 p-1 rounded-full">
      <button
        className={`px-4 py-1.5 rounded-full text-sm font-medium ${
          activeFilter === 'all'
            ? 'bg-white shadow-sm'
            : 'text-muted-foreground'
        }`}
        onClick={() => setActiveFilter('all')}
      >
        All
      </button>
      <button
        className={`px-4 py-1.5 rounded-full text-sm font-medium ${
          pendingCount > 0 ? 'hover:bg-muted' : ''
        } ${
          activeFilter === 'pending'
            ? 'bg-white shadow-sm'
            : 'text-muted-foreground'
        }`}
        onClick={() => setActiveFilter('pending')}
      >
        Pending
      </button>
      <button
        className={`px-4 py-1.5 rounded-full text-sm font-medium ${
          resolvedCount > 0 ? 'hover:bg-muted' : ''
        } ${
          activeFilter === 'resolved'
            ? 'bg-white shadow-sm'
            : 'text-muted-foreground'
        }`}
        onClick={() => setActiveFilter('resolved')}
      >
        Resolved
      </button>
    </div>
  );
}

// Helper component to render the status badge
function SupportRequestStatusBadge({
  status,
}: {
  status: string;
}) {
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
    case 'in_progress':
      return (
        <Badge
          variant="outline"
          className="bg-orange-500/10 text-orange-500 border-orange-500/20"
        >
          In Progress
        </Badge>
      );
    case 'resolved':
      return (
        <Badge
          variant="outline"
          className="bg-green-500/10 text-green-500 border-green-500/20"
        >
          Resolved
        </Badge>
      );
    case 'closed':
      return (
        <Badge
          variant="outline"
          className="bg-muted/50 text-muted-foreground border-muted"
        >
          Closed
        </Badge>
      );
    default:
      return null;
  }
}

// Helper component for loading state
function SupportRequestTableLoading() {
  return (
    <div className="rounded-md border p-8">
      <div className="flex flex-col items-center justify-center space-y-2">
        <div className="h-8 w-32 bg-muted/30 animate-pulse rounded" />
        <Typography variant="small" className="text-muted-foreground">
          Loading support requests...
        </Typography>
      </div>
    </div>
  );
}

// Helper component for empty state
function SupportRequestTableEmpty() {
  return (
    <div className="rounded-md border p-8">
      <div className="flex flex-col items-center justify-center space-y-2">
        <MessageSquare className="h-12 w-12 text-muted-foreground" />
        <Typography>No support requests found</Typography>
        <Typography variant="small" className="text-muted-foreground">
          Support requests will appear here once created.
        </Typography>
      </div>
    </div>
  );
}

// Mobile support request card for responsive display
function SupportRequestTableCard({
  supportRequest,
  isProfessionalView,
}: {
  supportRequest: SupportRequest;
  isProfessionalView: boolean;
}) {
  return (
    <Link href={`/support-request/${supportRequest.id}`}>
      <div className="p-4 border rounded-lg mb-2 bg-card hover:bg-muted/50 transition-colors cursor-pointer">
                  <div className="flex justify-between items-start">
            <div>
              <div className="flex items-center">
                <Typography className="font-medium">
                  {supportRequest.title}
                </Typography>
                {supportRequest.unreadCount > 0 && (
                  <MessageBadge count={supportRequest.unreadCount} size="sm" className="ml-2" />
                )}
              </div>
              <div className="text-muted-foreground text-sm flex items-center mt-1">
                <MessageSquare className="mr-1 h-3 w-3" />
                {format(supportRequest.date, 'MMM dd, yyyy')}
                <span className="mx-1">•</span>
                <Clock className="mr-1 h-3 w-3" />
                {format(supportRequest.date, 'h:mm a')}
              </div>
            </div>
            <SupportRequestStatusBadge status={supportRequest.status} />
          </div>

        <div className="mt-3 pt-3 border-t flex justify-between items-center">
          <div>
            <Typography variant="small" className="text-muted-foreground">
              {isProfessionalView ? 'Client' : 'Professional'}
            </Typography>
            <Typography className="font-medium">
              {isProfessionalView
                ? supportRequest.clientName || 'Client'
                : supportRequest.professionalName || 'Professional'}
            </Typography>
          </div>
          <div className="flex items-center">
            {supportRequest.amount ? (
              <Typography className="font-bold mr-2">
                {formatCurrency(supportRequest.amount)}
              </Typography>
            ) : (
              <Typography className="font-bold mr-2 text-muted-foreground">
                -
              </Typography>
            )}
            <ChevronRight className="h-4 w-4 text-muted-foreground" />
          </div>
        </div>
      </div>
    </Link>
  );
}

// Support requests table component (copied from DashboardTemplateAppointmentsTable)
function DashboardTemplateSupportRequestsTable({
  supportRequests,
  isLoading = false,
  isProfessionalView = false,
}: {
  supportRequests: SupportRequest[];
  isLoading?: boolean;
  isProfessionalView?: boolean;
}) {
  const router = useRouter();

  if (isLoading) return <SupportRequestTableLoading />;
  if (supportRequests.length === 0) return <SupportRequestTableEmpty />;

  return (
    <>
      {/* Desktop table view - hidden on small screens */}
      <div className="hidden md:block overflow-x-auto">
        <Table>
          <TableHeader>
            <TableRow className="bg-muted/20 hover:bg-muted/20">
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
            {supportRequests.map((supportRequest) => (
              <TableRow
                key={supportRequest.id}
                className="hover:bg-muted/50 cursor-pointer"
                onClick={() => router.push(`/support-request/${supportRequest.id}`)}
              >
                <TableCell>
                  <div className="flex flex-col">
                    <div className="flex items-center">
                      <MessageSquare className="mr-1 h-3 w-3 text-muted-foreground" />
                      <span>{format(supportRequest.date, 'MMM dd, yyyy')}</span>
                      {supportRequest.unreadCount > 0 && (
                        <MessageBadge count={supportRequest.unreadCount} size="sm" className="ml-2" />
                      )}
                    </div>
                    <div className="flex items-center text-muted-foreground">
                      <Clock className="mr-1 h-3 w-3" />
                      <span>{format(supportRequest.date, 'h:mm a')}</span>
                    </div>
                  </div>
                </TableCell>
                <TableCell>
                  <div className="space-y-1">
                    <div className="font-medium line-clamp-1">
                      {supportRequest.title}
                    </div>
                    <div className="text-sm text-muted-foreground line-clamp-2">
                      {supportRequest.description}
                    </div>
                    {supportRequest.serviceName && (
                      <div className="text-xs text-muted-foreground">
                        Service: {supportRequest.serviceName}
                      </div>
                    )}
                  </div>
                </TableCell>
                <TableCell>
                  {isProfessionalView
                    ? supportRequest.clientName || 'Client'
                    : supportRequest.professionalName || 'Professional'}
                </TableCell>
                <TableCell>
                  <SupportRequestStatusBadge status={supportRequest.status} />
                </TableCell>
                <TableCell className="text-right font-medium">
                  {supportRequest.amount ? formatCurrency(supportRequest.amount) : '-'}
                </TableCell>
              </TableRow>
            ))}
          </TableBody>
        </Table>
      </div>

      {/* Mobile card view - shown only on small screens */}
      <div className="md:hidden">
        {supportRequests.map((supportRequest) => (
          <SupportRequestTableCard
            key={supportRequest.id}
            supportRequest={supportRequest}
            isProfessionalView={isProfessionalView}
          />
        ))}
      </div>
    </>
  );
}

// Main component
export function DashboardSupportRequestsPageClient({
  isProfessional,
  startDate,
  endDate,
  status,
  category,
}: DashboardSupportRequestsPageClientProps) {
  const [supportRequestsData, setSupportRequestsData] = useState<SupportRequestType[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [activeFilter, setActiveFilter] = useState('all');

  // Fetch support requests
  useEffect(() => {
    const fetchSupportRequests = async () => {
      try {
        setIsLoading(true);
        setError(null);
        
        const { getSupportRequests } = await import('@/server/domains/support-requests/actions');
        const result = await getSupportRequests();
        
        if (result.success && result.supportRequests) {
          // eslint-disable-next-line @typescript-eslint/no-explicit-any
          setSupportRequestsData(result.supportRequests as any[]);
        } else {
          setError(result.error || 'Failed to load support requests');
        }
      } catch (err) {
        console.error('Error fetching support requests:', err);
        setError('Failed to load support requests');
      } finally {
        setIsLoading(false);
      }
    };

    fetchSupportRequests();
  }, [startDate, endDate, status, category]);

  // Validate support requests array to ensure each item has required fields
  const validSupportRequests = Array.isArray(supportRequestsData)
    ? supportRequestsData.filter((supportRequest): supportRequest is SupportRequestType => {
        return (
          typeof supportRequest === 'object' &&
          supportRequest !== null &&
          typeof supportRequest.id === 'string' &&
          typeof supportRequest.title === 'string' &&
          typeof supportRequest.created_at === 'string' &&
          typeof supportRequest.status === 'string'
        );
      })
    : [];

  // Transform support requests into the format needed for the table
  const transformedSupportRequests: SupportRequest[] = validSupportRequests.map((supportRequest) => {
    const createdDate = new Date(supportRequest.created_at);

    // Extract client and professional names from the joined user data
    const clientName = supportRequest.client_user 
      ? `${supportRequest.client_user.first_name || ''} ${supportRequest.client_user.last_name || ''}`.trim()
      : undefined;
    
    const professionalName = supportRequest.professional_user 
      ? `${supportRequest.professional_user.first_name || ''} ${supportRequest.professional_user.last_name || ''}`.trim()
      : undefined;

    // Extract service name from appointments -> bookings -> booking_services -> services
    const serviceName = supportRequest.appointments?.bookings?.[0]?.booking_services?.[0]?.services?.name;

    return {
      id: supportRequest.id,
      date: createdDate,
      title: supportRequest.title,
      description: supportRequest.description,
      clientName: clientName || 'Client',
      professionalName: professionalName || 'Professional',
      status: supportRequest.status,
      amount: supportRequest.requested_amount || undefined,
      serviceName: serviceName,
      unreadCount: supportRequest.unread_count || 0,
      conversationId: supportRequest.conversations?.id,
    };
  });

  // Filter support requests based on selected filters
  const filteredSupportRequests = transformedSupportRequests.filter((supportRequest) => {
    // Status filter
    if (activeFilter !== 'all' && supportRequest.status !== activeFilter) {
      return false;
    }

    return true;
  });

  // Group support requests by status
  const pendingSupportRequests = filteredSupportRequests.filter(
    (supportRequest) => supportRequest.status === 'pending',
  );

  const inProgressSupportRequests = filteredSupportRequests.filter(
    (supportRequest) => supportRequest.status === 'in_progress',
  );

  const resolvedSupportRequests = filteredSupportRequests.filter(
    (supportRequest) => supportRequest.status === 'resolved',
  );

  const closedSupportRequests = filteredSupportRequests.filter(
    (supportRequest) => supportRequest.status === 'closed',
  );

  // Sort by date (newest first)
  const sortedSupportRequests = filteredSupportRequests.sort((a, b) => 
    b.date.getTime() - a.date.getTime()
  );

  if (error) {
    return (
      <div className="space-y-6">
        <div className="rounded-lg bg-card border shadow-sm overflow-hidden">
          <div className="p-6 border-b bg-muted/30">
            <Typography variant="h3" className="text-xl font-semibold">
              Support Requests
            </Typography>
            <Typography variant="small" className="text-muted-foreground">
              Error loading support requests
            </Typography>
          </div>
          <div className="p-8 text-center">
            <Typography className="text-destructive">Error: {error}</Typography>
          </div>
        </div>
      </div>
    );
  }

  // Table view with filters
  return (
    <div className="space-y-6">
      {/* Regular Table View */}
      <div className="rounded-lg bg-card border shadow-sm overflow-hidden">
        <div className="p-6 border-b bg-muted/30">
          <Typography variant="h3" className="text-xl font-semibold">
            Support Requests
          </Typography>
          <Typography variant="small" className="text-muted-foreground">
            Showing {sortedSupportRequests.length} support requests
          </Typography>
        </div>
        <div className="p-4">
          <FilterButtons
            activeFilter={activeFilter}
            setActiveFilter={setActiveFilter}
            pendingCount={pendingSupportRequests.length}
            resolvedCount={resolvedSupportRequests.length}
          />

          <DashboardTemplateSupportRequestsTable
            supportRequests={
              activeFilter === 'all'
                ? sortedSupportRequests
                : activeFilter === 'pending'
                  ? pendingSupportRequests
                  : sortedSupportRequests.filter(
                      (sr) => sr.status === activeFilter,
                    )
            }
            isLoading={isLoading}
            isProfessionalView={isProfessional}
          />
        </div>
      </div>
    </div>
  );
}
