'use client';

import React, { useState } from 'react';
import { Typography } from '@/components/ui/typography';
import { CalendarDays, Trash2 } from 'lucide-react';
import { useRouter } from 'next/navigation';
import InviteAdminModal from '@/components/modals/InviteAdminModal';
import { Button } from '@/components/ui/button';
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from '@/components/ui/alert-dialog';
import { deleteAdminAction } from '@/api/auth/actions';
import { useAuthStore } from '@/stores/authStore';

export default function AdminAdminsPageClient({
  admins,
}: {
  admins: Array<{ id: string; name: string; email: string; createdAt: string }>;
}) {
  const [filterName, setFilterName] = useState('');
  const [sortDirection, setSortDirection] = useState<'asc' | 'desc'>('asc');
  const [inviteOpen, setInviteOpen] = useState(false);
  const [deleteDialogOpen, setDeleteDialogOpen] = useState(false);
  const [adminToDelete, setAdminToDelete] = useState<{
    id: string;
    name: string;
    email: string;
  } | null>(null);
  const [isDeleting, setIsDeleting] = useState(false);
  const currentUser = useAuthStore((state) => state.user);
  const router = useRouter();

  // When filterName or sortDirection changes, update the URL search params to trigger a server fetch
  React.useEffect(() => {
    const params = new URLSearchParams(window.location.search);
    if (filterName) {
      params.set('filterName', filterName);
    } else {
      params.delete('filterName');
    }
    if (sortDirection) {
      params.set('sortDirection', sortDirection);
    } else {
      params.delete('sortDirection');
    }
    // Only push if changed
    const newSearch = params.toString();
    if (window.location.search !== `?${newSearch}`) {
      const newUrl = newSearch
        ? `${window.location.pathname}?${newSearch}`
        : window.location.pathname;
      router.replace(newUrl);
    }
  }, [filterName, sortDirection, router]);

  // Handler for successful invite
  const handleInvited = async () => {
    setInviteOpen(false);
    router.refresh(); // Full page refresh to get latest admins
  };

  // Handler to open delete confirmation dialog
  const handleDeleteClick = (admin: {
    id: string;
    name: string;
    email: string;
  }) => {
    setAdminToDelete(admin);
    setDeleteDialogOpen(true);
  };

  // Handler to delete admin
  const handleDeleteConfirm = async () => {
    if (!adminToDelete) return;

    setIsDeleting(true);
    try {
      const result = await deleteAdminAction(adminToDelete.id);
      if (result.success) {
        setDeleteDialogOpen(false);
        setAdminToDelete(null);
        router.refresh(); // Refresh to get updated admin list
      } else {
        // Show error in console for now
        console.error('Failed to delete admin:', result.error);
        alert(result.error || 'Failed to delete admin');
      }
    } catch (error) {
      console.error('Error deleting admin:', error);
      alert('An error occurred while deleting the admin');
    } finally {
      setIsDeleting(false);
    }
  };

  return (
    <div className="space-y-6">
      <InviteAdminModal
        isOpen={inviteOpen}
        onClose={() => setInviteOpen(false)}
        onInvited={handleInvited}
      />
      <div className="rounded-lg bg-card border shadow-sm overflow-hidden">
        <div className="p-6 border-b bg-muted/30">
          <Typography variant="h3" className="text-xl font-semibold">
            Admins
          </Typography>
          <Typography variant="small" className="text-muted-foreground">
            Showing {admins.length} admins
          </Typography>
        </div>
        <div className="p-4">
          <div className="flex gap-4 mb-4 items-center">
            <label className="flex items-center gap-2">
              Name:
              <input
                type="text"
                placeholder="Filter by name"
                value={filterName}
                onChange={(e) => setFilterName(e.target.value)}
                className="border rounded px-2 py-1"
              />
            </label>
            <label className="flex items-center gap-2">
              Sort by Date:
              <select
                className="border rounded px-2 py-1"
                value={sortDirection}
                onChange={(e) =>
                  setSortDirection(e.target.value as 'asc' | 'desc')
                }
              >
                <option value="asc">Ascending</option>
                <option value="desc">Descending</option>
              </select>
            </label>
            <Button onClick={() => setInviteOpen(true)}>Invite Admin</Button>
          </div>
          {/* Desktop table view */}
          <div className="hidden md:block overflow-x-auto">
            <table className="w-full border-collapse">
              <thead>
                <tr className="bg-muted/20 hover:bg-muted/20">
                  <th className="border px-2 py-1">Name</th>
                  <th className="border px-2 py-1">Email</th>
                  <th className="border px-2 py-1">Created Date</th>
                  <th className="border px-2 py-1 w-24">Actions</th>
                </tr>
              </thead>
              <tbody>
                {admins.length === 0 ? (
                  <tr>
                    <td colSpan={4}>
                      <div className="flex flex-col items-center justify-center space-y-2 py-8">
                        <CalendarDays className="h-12 w-12 text-muted-foreground" />
                        <Typography>No admins found</Typography>
                        <Typography
                          variant="small"
                          className="text-muted-foreground"
                        >
                          Admins will appear here once added.
                        </Typography>
                      </div>
                    </td>
                  </tr>
                ) : (
                  admins.map((admin) => {
                    const isCurrentUser = currentUser?.id === admin.id;
                    return (
                      <tr key={admin.id} className="hover:bg-muted/50">
                        <td className="border px-2 py-1">{admin.name}</td>
                        <td className="border px-2 py-1">{admin.email}</td>
                        <td className="border px-2 py-1">
                          {new Date(admin.createdAt).toLocaleDateString()}
                        </td>
                        <td className="border px-2 py-1">
                          <Button
                            variant="ghost"
                            size="sm"
                            onClick={() => handleDeleteClick(admin)}
                            disabled={isCurrentUser}
                            className="h-8 w-8 p-0 hover:bg-destructive/10 hover:text-destructive disabled:opacity-50"
                            title={
                              isCurrentUser
                                ? 'Cannot delete your own account'
                                : 'Delete admin'
                            }
                          >
                            <Trash2 className="h-4 w-4" />
                          </Button>
                        </td>
                      </tr>
                    );
                  })
                )}
              </tbody>
            </table>
          </div>
          {/* Mobile card view */}
          <div className="md:hidden">
            {admins.length === 0 ? (
              <div className="flex flex-col items-center justify-center space-y-2 py-8">
                <CalendarDays className="h-12 w-12 text-muted-foreground" />
                <Typography>No admins found</Typography>
                <Typography variant="small" className="text-muted-foreground">
                  Admins will appear here once added.
                </Typography>
              </div>
            ) : (
              admins.map((admin) => {
                const isCurrentUser = currentUser?.id === admin.id;
                return (
                  <div
                    key={admin.id}
                    className="p-4 border rounded-lg mb-2 bg-card hover:bg-muted/50 transition-colors"
                  >
                    <div className="flex justify-between items-start">
                      <div className="flex-1">
                        <Typography className="font-medium">
                          {admin.name}
                        </Typography>
                        <div className="text-muted-foreground text-sm mt-1">
                          {admin.email}
                        </div>
                      </div>
                      <Button
                        variant="ghost"
                        size="sm"
                        onClick={() => handleDeleteClick(admin)}
                        disabled={isCurrentUser}
                        className="h-8 w-8 p-0 hover:bg-destructive/10 hover:text-destructive disabled:opacity-50 ml-2"
                        title={
                          isCurrentUser
                            ? 'Cannot delete your own account'
                            : 'Delete admin'
                        }
                      >
                        <Trash2 className="h-4 w-4" />
                      </Button>
                    </div>
                    <div className="mt-3 pt-3 border-t flex justify-between items-center">
                      <div>
                        <Typography
                          variant="small"
                          className="text-muted-foreground"
                        >
                          Created
                        </Typography>
                        <Typography className="font-medium">
                          {new Date(admin.createdAt).toLocaleDateString()}
                        </Typography>
                      </div>
                    </div>
                  </div>
                );
              })
            )}
          </div>
        </div>
      </div>

      {/* Delete Confirmation Dialog */}
      <AlertDialog open={deleteDialogOpen} onOpenChange={setDeleteDialogOpen}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Delete Admin User</AlertDialogTitle>
            <AlertDialogDescription>
              Are you sure you want to delete{' '}
              <strong>{adminToDelete?.name || adminToDelete?.email}</strong>?
              This action cannot be undone. The user will be permanently removed
              from both the authentication system and the database.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel disabled={isDeleting}>Cancel</AlertDialogCancel>
            <AlertDialogAction
              onClick={handleDeleteConfirm}
              disabled={isDeleting}
              className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
            >
              {isDeleting ? 'Deleting...' : 'Delete'}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
}
