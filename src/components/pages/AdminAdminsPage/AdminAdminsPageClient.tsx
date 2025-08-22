"use client";

import { Typography } from '@/components/ui/typography';
import { CalendarDays } from 'lucide-react';
import { useState, useMemo } from 'react';
import { useRouter } from 'next/navigation';
import InviteAdminModal from '@/components/modals/InviteAdminModal';
import { Button } from '@/components/ui/button';


export default function AdminAdminsPageClient({ admins }: { admins: Array<{ id: string; name: string; email: string; createdAt: string }> }) {
  const [filterName, setFilterName] = useState('');
  const [sortDirection, setSortDirection] = useState<'asc' | 'desc'>('asc');
  const [inviteOpen, setInviteOpen] = useState(false);
  const router = useRouter();

  const filteredAdmins = useMemo(() => {
    let filtered = admins;
    if (filterName) {
      filtered = filtered.filter((a) => a.name.toLowerCase().includes(filterName.toLowerCase()));
    }
    filtered = filtered.sort((a, b) => {
      if (sortDirection === 'asc') {
        return a.createdAt.localeCompare(b.createdAt);
      } else {
        return b.createdAt.localeCompare(a.createdAt);
      }
    });
    return filtered;
  }, [admins, filterName, sortDirection]);

  // Handler for successful invite
  const handleInvited = async () => {
    setInviteOpen(false);
    router.refresh(); // Full page refresh to get latest admins
  };

  return (
    <div className="space-y-6">
        <InviteAdminModal isOpen={inviteOpen} onClose={() => setInviteOpen(false)} onInvited={handleInvited} />
      <div className="rounded-lg bg-card border shadow-sm overflow-hidden">
        <div className="p-6 border-b bg-muted/30">
          <Typography variant="h3" className="text-xl font-semibold">
            Admins
          </Typography>
          <Typography variant="small" className="text-muted-foreground">
            Showing {filteredAdmins.length} admins
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
                onChange={e => setFilterName(e.target.value)}
                className="border rounded px-2 py-1"
              />
            </label>
            <label className="flex items-center gap-2">
              Sort by Date:
              <select
                className="border rounded px-2 py-1"
                value={sortDirection}
                onChange={e => setSortDirection(e.target.value as 'asc' | 'desc')}
              >
                <option value="asc">Ascending</option>
                <option value="desc">Descending</option>
              </select>
            </label>
              <Button onClick={() => setInviteOpen(true)}>
                Invite Admin
              </Button>
          </div>
          {/* Desktop table view */}
          <div className="hidden md:block overflow-x-auto">
            <table className="w-full border-collapse">
              <thead>
                <tr className="bg-muted/20 hover:bg-muted/20">
                  <th className="border px-2 py-1">Name</th>
                  <th className="border px-2 py-1">Email</th>
                  <th className="border px-2 py-1">Created Date</th>
                </tr>
              </thead>
              <tbody>
                {filteredAdmins.length === 0 ? (
                  <tr>
                    <td colSpan={3}>
                      <div className="flex flex-col items-center justify-center space-y-2 py-8">
                        <CalendarDays className="h-12 w-12 text-muted-foreground" />
                        <Typography>No admins found</Typography>
                        <Typography variant="small" className="text-muted-foreground">
                          Admins will appear here once added.
                        </Typography>
                      </div>
                    </td>
                  </tr>
                ) : (
                  filteredAdmins.map((admin) => (
                    <tr key={admin.id} className="hover:bg-muted/50 cursor-pointer">
                      <td className="border px-2 py-1">{admin.name}</td>
                      <td className="border px-2 py-1">{admin.email}</td>
                      <td className="border px-2 py-1">{new Date(admin.createdAt).toLocaleDateString()}</td>
                    </tr>
                  ))
                )}
              </tbody>
            </table>
          </div>
          {/* Mobile card view */}
          <div className="md:hidden">
            {filteredAdmins.length === 0 ? (
              <div className="flex flex-col items-center justify-center space-y-2 py-8">
                <CalendarDays className="h-12 w-12 text-muted-foreground" />
                <Typography>No admins found</Typography>
                <Typography variant="small" className="text-muted-foreground">
                  Admins will appear here once added.
                </Typography>
              </div>
            ) : (
              filteredAdmins.map((admin) => (
                <div key={admin.id} className="p-4 border rounded-lg mb-2 bg-card hover:bg-muted/50 transition-colors cursor-pointer">
                  <div className="flex justify-between items-start">
                    <div>
                      <Typography className="font-medium">{admin.name}</Typography>
                      <div className="text-muted-foreground text-sm mt-1">
                        {admin.email}
                      </div>
                    </div>
                  </div>
                  <div className="mt-3 pt-3 border-t flex justify-between items-center">
                    <div>
                      <Typography variant="small" className="text-muted-foreground">
                        Created
                      </Typography>
                      <Typography className="font-medium">{new Date(admin.createdAt).toLocaleDateString()}</Typography>
                    </div>
                  </div>
                </div>
              ))
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
