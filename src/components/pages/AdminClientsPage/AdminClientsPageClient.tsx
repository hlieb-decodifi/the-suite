// Client component for admin clients tab
'use client';
import { Typography } from '@/components/ui/typography';
import { CalendarDays } from 'lucide-react';
import { useState, useMemo } from 'react';



export default function AdminClientsPageClient({ clients }: { clients: Array<{ id: string; name: string; email: string; createdAt: string; completedAppointmentsCount: number }> }) {
  const [filterName, setFilterName] = useState('');
  const [sortDirection, setSortDirection] = useState<'asc' | 'desc'>('asc');

  const filteredClients = useMemo(() => {
    let filtered = clients;
    if (filterName) {
      filtered = filtered.filter(a => a.name.toLowerCase().includes(filterName.toLowerCase()));
    }
    filtered = filtered.sort((a, b) => {
      if (sortDirection === 'asc') {
        return a.createdAt.localeCompare(b.createdAt);
      } else {
        return b.createdAt.localeCompare(a.createdAt);
      }
    });
    return filtered;
  }, [clients, filterName, sortDirection]);

  return (
    <div className="space-y-6">
      <div className="rounded-lg bg-card border shadow-sm overflow-hidden">
        <div className="p-6 border-b bg-muted/30">
          <Typography variant="h3" className="text-xl font-semibold">
            Clients
          </Typography>
          <Typography variant="small" className="text-muted-foreground">
            Showing {filteredClients.length} clients
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
          </div>
          {/* Desktop table view */}
          <div className="hidden md:block overflow-x-auto">
            <table className="w-full border-collapse">
              <thead>
                <tr className="bg-muted/20 hover:bg-muted/20">
                  <th className="border px-2 py-1">Name</th>
                  <th className="border px-2 py-1">Email</th>
                  <th className="border px-2 py-1">Created Date</th>
                  <th className="border px-2 py-1">Completed Appointments</th>
                </tr>
              </thead>
              <tbody>
                {filteredClients.length === 0 ? (
                  <tr>
                    <td colSpan={4}>
                      <div className="flex flex-col items-center justify-center space-y-2 py-8">
                        <CalendarDays className="h-12 w-12 text-muted-foreground" />
                        <Typography>No clients found</Typography>
                        <Typography variant="small" className="text-muted-foreground">
                          Clients will appear here once added.
                        </Typography>
                      </div>
                    </td>
                  </tr>
                ) : (
                  filteredClients.map(client => (
                    <tr key={client.id} className="hover:bg-muted/50 cursor-pointer">
                      <td className="border px-2 py-1">{client.name}</td>
                      <td className="border px-2 py-1">{client.email}</td>
                      <td className="border px-2 py-1">{new Date(client.createdAt).toLocaleDateString()}</td>
                      <td className="border px-2 py-1 text-center">{client.completedAppointmentsCount ?? 0}</td>
                    </tr>
                  ))
                )}
              </tbody>
            </table>
          </div>
          {/* Mobile card view */}
          <div className="md:hidden">
            {filteredClients.length === 0 ? (
              <div className="flex flex-col items-center justify-center space-y-2 py-8">
                <CalendarDays className="h-12 w-12 text-muted-foreground" />
                <Typography>No clients found</Typography>
                <Typography variant="small" className="text-muted-foreground">
                  Clients will appear here once added.
                </Typography>
              </div>
            ) : (
              filteredClients.map(client => (
                <div key={client.id} className="p-4 border rounded-lg mb-2 bg-card hover:bg-muted/50 transition-colors cursor-pointer">
                  <div className="flex justify-between items-start">
                    <div>
                      <Typography className="font-medium">{client.name}</Typography>
                      <div className="text-muted-foreground text-sm mt-1">{client.email}</div>
                    </div>
                  </div>
                  <div className="mt-3 pt-3 border-t grid grid-cols-2 gap-2">
                    <div>
                      <Typography variant="small" className="text-muted-foreground">Completed</Typography>
                      <Typography className="font-medium">{client.completedAppointmentsCount ?? 0}</Typography>
                    </div>
                    <div className="col-span-2">
                      <Typography variant="small" className="text-muted-foreground">Created</Typography>
                      <Typography className="font-medium">{new Date(client.createdAt).toLocaleDateString()}</Typography>
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