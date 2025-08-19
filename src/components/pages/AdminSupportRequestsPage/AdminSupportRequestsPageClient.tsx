// Client component for admin support requests tab
'use client';
import { useDateRange } from '@/components/layouts/AdminDashboardPageLayout/DateRangeContextProvider';
import { useEffect, useState } from 'react';


import { Badge } from '@/components/ui/badge';
import { Typography } from '@/components/ui/typography';
import { format } from 'date-fns';
import { ChevronRight, Clock, MessageSquare } from 'lucide-react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import type { SupportRequest } from '@/types/support_requests';
import { fetchAdminSupportRequests } from '@/app/admin/support-requests/actions';



export function AdminSupportRequestsPageClient() {
  const { start, end } = useDateRange();
  const [supportRequests, setSupportRequests] = useState<SupportRequest[]>([]);
  const [loading, setLoading] = useState<boolean>(true);
  const [error, setError] = useState<string | null>(null);
  const [activeFilter, setActiveFilter] = useState('all');
  const router = useRouter();

  useEffect(() => {
    let cancelled = false;
    async function fetchData() {
      setLoading(true);
      setError(null);
      try {
        const params: { start?: string; end?: string } = {};
        if (start) params.start = start;
        if (end) params.end = end;
        const data = await fetchAdminSupportRequests(params);
        if (!cancelled) setSupportRequests(data);
      } catch (err: unknown) {
        let message = 'Failed to fetch support requests';
        if (err && typeof err === 'object' && 'message' in err && typeof (err as { message?: unknown }).message === 'string') {
          message = (err as { message: string }).message;
        }
        if (!cancelled) setError(message);
      } finally {
        if (!cancelled) setLoading(false);
      }
    }
    fetchData();
    return () => { cancelled = true; };
  }, [start, end]);

  // Filter logic
  const filteredSupportRequests = supportRequests.filter((req) => {
    if (activeFilter === 'all') return true;
    return req.status === activeFilter;
  });

  // Count for each status
  const pendingCount = supportRequests.filter((r) => r.status === 'pending').length;
  const inProgressCount = supportRequests.filter((r) => r.status === 'in_progress').length;
  const resolvedCount = supportRequests.filter((r) => r.status === 'resolved').length;

  // Status badge
  function StatusBadge({ status }: { status: string }) {
    switch (status) {
      case 'pending':
        return <Badge variant="outline" className="bg-amber-500/10 text-amber-600 border-amber-500/20">Pending</Badge>;
      case 'in_progress':
        return <Badge variant="outline" className="bg-orange-500/10 text-orange-500 border-orange-500/20">In Progress</Badge>;
      case 'resolved':
        return <Badge variant="outline" className="bg-green-500/10 text-green-500 border-green-500/20">Resolved</Badge>;
      case 'closed':
        return <Badge variant="outline" className="bg-muted/50 text-muted-foreground border-muted">Closed</Badge>;
      default:
        return null;
    }
  }

  // Filter buttons (subtabs)
  function FilterButtons() {
    return (
      <div className="inline-flex items-center mb-4 bg-muted/30 p-1 rounded-full">
        <button
          className={`px-4 py-1.5 rounded-full text-sm font-medium ${activeFilter === 'all' ? 'bg-white shadow-sm' : 'text-muted-foreground'}`}
          onClick={() => setActiveFilter('all')}
        >All</button>
        <button
          className={`px-4 py-1.5 rounded-full text-sm font-medium ${pendingCount > 0 ? 'hover:bg-muted' : ''} ${activeFilter === 'pending' ? 'bg-white shadow-sm' : 'text-muted-foreground'}`}
          onClick={() => setActiveFilter('pending')}
        >Pending</button>
        <button
          className={`px-4 py-1.5 rounded-full text-sm font-medium ${inProgressCount > 0 ? 'hover:bg-muted' : ''} ${activeFilter === 'in_progress' ? 'bg-white shadow-sm' : 'text-muted-foreground'}`}
          onClick={() => setActiveFilter('in_progress')}
        >In Progress</button>
        <button
          className={`px-4 py-1.5 rounded-full text-sm font-medium ${resolvedCount > 0 ? 'hover:bg-muted' : ''} ${activeFilter === 'resolved' ? 'bg-white shadow-sm' : 'text-muted-foreground'}`}
          onClick={() => setActiveFilter('resolved')}
        >Resolved</button>
      </div>
    );
  }

  // Table/Card UI (matches dashboard)
  function TableView() {
    if (loading) {
      return <div className="py-8 text-center text-muted-foreground">Loading support requests...</div>;
    }
    if (error) {
      return <div className="py-8 text-center text-destructive">{error}</div>;
    }
    if (!filteredSupportRequests.length) {
      return (
        <div className="flex flex-col items-center justify-center space-y-2 py-8">
          <MessageSquare className="h-12 w-12 text-muted-foreground" />
          <Typography>No support requests found</Typography>
          <Typography variant="small" className="text-muted-foreground">
            Support requests will appear here once submitted.
          </Typography>
        </div>
      );
    }
    // Desktop table
    return (
      <>
        <div className="hidden md:block overflow-x-auto">
          <table className="w-full border-collapse">
            <thead>
              <tr className="bg-muted/20 hover:bg-muted/20">
                <th className="border px-2 py-1">Created</th>
                <th className="border px-2 py-1">Title</th>
                <th className="border px-2 py-1">Category</th>
                <th className="border px-2 py-1">Priority</th>
                <th className="border px-2 py-1">Status</th>
                <th className="border px-2 py-1">Client</th>
                <th className="border px-2 py-1">Professional</th>
              </tr>
            </thead>
            <tbody>
              {filteredSupportRequests.map((req) => (
                <tr
                  key={req.id}
                  className="hover:bg-muted/50 cursor-pointer"
                  onClick={() => router.push(`/support-request/${req.id}`)}
                >
                  <td className="border px-2 py-1">{format(new Date(req.created_at), 'MMM dd, yyyy')}</td>
                  <td className="border px-2 py-1">{req.title}</td>
                  <td className="border px-2 py-1">{req.category}</td>
                  <td className="border px-2 py-1">
                    <Badge variant="outline" className="capitalize">{req.priority}</Badge>
                  </td>
                  <td className="border px-2 py-1">
                    <StatusBadge status={req.status} />
                  </td>
                  <td className="border px-2 py-1">
                    {req.client_user ? `${req.client_user.first_name || ''} ${req.client_user.last_name || ''}`.trim() : ''}
                  </td>
                  <td className="border px-2 py-1">
                    {req.professional_user ? `${req.professional_user.first_name || ''} ${req.professional_user.last_name || ''}`.trim() : ''}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
        {/* Mobile card view */}
        <div className="md:hidden">
          {filteredSupportRequests.map((req) => (
            <Link key={req.id} href={`/support-request/${req.id}`}>
              <div className="p-4 border rounded-lg mb-2 bg-card hover:bg-muted/50 transition-colors cursor-pointer">
                <div className="flex justify-between items-start">
                  <div>
                    <Typography className="font-medium">{req.title}</Typography>
                    <div className="text-muted-foreground text-sm flex items-center mt-1">
                      <MessageSquare className="mr-1 h-3 w-3" />
                      {format(new Date(req.created_at), 'MMM dd, yyyy')}
                      <span className="mx-1">•</span>
                      <Clock className="mr-1 h-3 w-3" />
                      {format(new Date(req.created_at), 'h:mm a')}
                    </div>
                  </div>
                  <StatusBadge status={req.status} />
                </div>
                <div className="mt-3 pt-3 border-t flex justify-between items-center">
                  <div>
                    <Typography variant="small" className="text-muted-foreground">Professional</Typography>
                    <Typography className="font-medium">{req.professional_user ? `${req.professional_user.first_name || ''} ${req.professional_user.last_name || ''}`.trim() : ''}</Typography>
                  </div>
                  <div className="flex items-center">
                    <ChevronRight className="h-4 w-4 text-muted-foreground" />
                  </div>
                </div>
              </div>
            </Link>
          ))}
        </div>
      </>
    );
  }

  return (
    <div className="space-y-6">
      <div className="rounded-lg bg-card border shadow-sm overflow-hidden">
        <div className="p-6 border-b bg-muted/30">
          <Typography variant="h3" className="text-xl font-semibold">Support Requests</Typography>
          <Typography variant="small" className="text-muted-foreground">Showing {filteredSupportRequests.length} support requests</Typography>
        </div>
        <div className="p-4">
          <FilterButtons />
          {TableView()}
        </div>
      </div>
    </div>
  );
}
