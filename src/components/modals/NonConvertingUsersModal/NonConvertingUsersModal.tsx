'use client';

import { useState, useEffect, useCallback } from 'react';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table';
import { Badge } from '@/components/ui/badge';
import { Typography } from '@/components/ui/typography';
import { Loader2, Eye, MousePointer, ExternalLink, Users } from 'lucide-react';
import { getNonConvertingUsers } from '@/api/activity-log';
import { useDateRange } from '@/components/layouts/AdminDashboardPageLayout/DateRangeContextProvider';
import type { NonConvertingUser } from '@/types/activity-analytics';

type NonConvertingUsersModalProps = {
  trigger?: React.ReactNode;
  totalCount?: number;
};

export function NonConvertingUsersModal({
  trigger,
  totalCount,
}: NonConvertingUsersModalProps) {
  const [isOpen, setIsOpen] = useState(false);
  const [users, setUsers] = useState<NonConvertingUser[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [hasMore, setHasMore] = useState(false);
  const [offset, setOffset] = useState(0);
  const [total, setTotal] = useState(0);
  const { start, end } = useDateRange();

  const LIMIT = 20; // Show 20 users per page

  const formatDate = (dateString: string): string => {
    return new Date(dateString).toLocaleDateString('en-US', {
      month: '2-digit',
      day: '2-digit',
      year: 'numeric',
    });
  };

  const formatUserName = (user: NonConvertingUser): string => {
    if (user.user_name) {
      return user.user_name;
    }
    if (user.user_id) {
      return `User ${user.user_id.slice(0, 8)}...`;
    }
    return `Anonymous (${user.session_id.slice(0, 8)}...)`;
  };

  const fetchUsers = useCallback(
    async (reset = false) => {
      setIsLoading(true);
      setError(null);

      try {
        const result = await getNonConvertingUsers(start, end);

        if (!result.success) {
          setError(result.error || 'Failed to fetch users');
          return;
        }

        const allUsers = (result.data || []) as NonConvertingUser[];
        const currentOffset = reset ? 0 : offset;

        // Apply pagination manually since the RPC function returns all users
        const startIndex = currentOffset;
        const endIndex = startIndex + LIMIT;
        const paginatedUsers = allUsers.slice(startIndex, endIndex);

        setUsers(reset ? paginatedUsers : [...users, ...paginatedUsers]);
        setHasMore(endIndex < allUsers.length);
        setTotal(allUsers.length);

        if (reset) {
          setOffset(LIMIT);
        } else {
          setOffset(offset + LIMIT);
        }
      } catch (err) {
        setError('Failed to fetch users');
        console.error('Error fetching non-converting users:', err);
      } finally {
        setIsLoading(false);
      }
    },
    [start, end, offset, users],
  );

  const handleLoadMore = () => {
    fetchUsers(false);
  };

  // Reset and fetch when modal opens or date range changes
  useEffect(() => {
    if (isOpen) {
      setUsers([]);
      setOffset(0);
      fetchUsers(true);
    }
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [isOpen, start, end]);

  const defaultTrigger = (
    <Button variant="outline" size="sm" className="h-8">
      <ExternalLink className="w-4 h-4 mr-2" />
      View All {totalCount ? `(${totalCount})` : ''}
    </Button>
  );

  return (
    <Dialog open={isOpen} onOpenChange={setIsOpen}>
      <DialogTrigger asChild>{trigger || defaultTrigger}</DialogTrigger>
      <DialogContent className="max-w-4xl max-h-[80vh] overflow-hidden flex flex-col">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <Users className="w-5 h-5" />
            Users Who Viewed But Didn't Book
            {total > 0 && (
              <Badge variant="secondary" className="ml-2">
                {total} total
              </Badge>
            )}
          </DialogTitle>
        </DialogHeader>

        <div className="flex-1 overflow-auto">
          {error ? (
            <div className="text-center py-8">
              <Typography variant="h4" className="text-destructive mb-2">
                Failed to Load Users
              </Typography>
              <Typography className="text-muted-foreground mb-4">
                {error}
              </Typography>
              <Button onClick={() => fetchUsers(true)}>Try Again</Button>
            </div>
          ) : (
            <>
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>User</TableHead>
                    <TableHead>Last Activity</TableHead>
                    <TableHead className="text-center">Views</TableHead>
                    <TableHead className="text-center">Started</TableHead>
                    <TableHead>Type</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {users.map((user, index) => (
                    <TableRow key={user.session_id || index}>
                      <TableCell>
                        <div className="flex items-center gap-2">
                          <Users className="w-4 h-4 text-muted-foreground" />
                          <div>
                            <div className="font-medium">
                              {formatUserName(user)}
                            </div>
                            {user.user_id && (
                              <div className="text-xs text-muted-foreground">
                                ID: {user.user_id.slice(0, 8)}...
                              </div>
                            )}
                          </div>
                        </div>
                      </TableCell>
                      <TableCell>{formatDate(user.last_activity)}</TableCell>
                      <TableCell className="text-center">
                        <Badge variant="outline" className="text-xs">
                          <Eye className="w-3 h-3 mr-1" />
                          {user.service_views + user.professional_views}
                        </Badge>
                      </TableCell>
                      <TableCell className="text-center">
                        <Badge variant="outline" className="text-xs">
                          <MousePointer className="w-3 h-3 mr-1" />
                          {user.bookings_started}
                        </Badge>
                      </TableCell>
                      <TableCell>
                        <Badge variant={user.user_id ? 'default' : 'secondary'}>
                          {user.user_id ? 'Registered' : 'Anonymous'}
                        </Badge>
                      </TableCell>
                    </TableRow>
                  ))}

                  {users.length === 0 && !isLoading && (
                    <TableRow>
                      <TableCell colSpan={5} className="text-center py-8">
                        <div className="flex flex-col items-center gap-2">
                          <Users className="w-8 h-8 text-muted-foreground" />
                          <Typography className="text-muted-foreground">
                            No non-converting users found
                          </Typography>
                          <Typography
                            variant="small"
                            className="text-muted-foreground"
                          >
                            Users who viewed services but didn't complete
                            bookings will appear here
                          </Typography>
                        </div>
                      </TableCell>
                    </TableRow>
                  )}
                </TableBody>
              </Table>

              {/* Load More Button */}
              {hasMore && (
                <div className="flex justify-center pt-4 border-t mt-4">
                  <Button
                    onClick={handleLoadMore}
                    disabled={isLoading}
                    variant="outline"
                  >
                    {isLoading ? (
                      <>
                        <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                        Loading...
                      </>
                    ) : (
                      <>
                        Load More ({users.length} of {total})
                      </>
                    )}
                  </Button>
                </div>
              )}

              {/* Loading indicator for initial load */}
              {isLoading && users.length === 0 && (
                <div className="flex justify-center items-center py-8">
                  <Loader2 className="w-6 h-6 animate-spin mr-2" />
                  <Typography>Loading users...</Typography>
                </div>
              )}
            </>
          )}
        </div>
      </DialogContent>
    </Dialog>
  );
}
