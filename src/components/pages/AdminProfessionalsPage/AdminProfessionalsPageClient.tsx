// Client component for admin professionals tab
'use client';

import { Typography } from '@/components/ui/typography';
import { CalendarDays } from 'lucide-react';
import { useState, useMemo } from 'react';
import { ProfessionalDetailsModal } from '@/components/modals/ProfessionalDetailsModal/ProfessionalDetailsModal';

import type { ProfessionalDetails as ServerProfessionalDetails } from '@/lib/admin/fetchProfessionalDetails';

// Helper to call server action from client
async function fetchProfessionalDetailsFromServer(userId: string) {
  // Dynamic import to avoid SSR issues
  const { getProfessionalDetailsAction } = await import(
    '@/server/domains/professionals/actions'
  );
  return getProfessionalDetailsAction(userId);
}

export default function AdminProfessionalsPageClient({
  professionals,
}: {
  professionals: Array<{
    id: string;
    name: string;
    email: string;
    createdAt: string;
    serviceCount: number;
    completedAppointmentsCount: number;
    isPublished: boolean;
  }>;
}) {
  const [filterName, setFilterName] = useState('');
  const [sortDirection, setSortDirection] = useState<'asc' | 'desc'>('asc');
  const [modalOpen, setModalOpen] = useState(false);
  type ModalProfessionalDetails = Omit<
    ServerProfessionalDetails,
    'createdAt'
  > & { name: string; isPublished: boolean; createdAt: string };
  const [selectedProfessional, setSelectedProfessional] =
    useState<ModalProfessionalDetails | null>(null);
  const [modalLoading, setModalLoading] = useState(false);

  const filteredProfessionals = useMemo(() => {
    let filtered = professionals;
    if (filterName) {
      filtered = filtered.filter((a) =>
        a.name.toLowerCase().includes(filterName.toLowerCase()),
      );
    }
    filtered = filtered.sort((a, b) => {
      if (sortDirection === 'asc') {
        return a.createdAt.localeCompare(b.createdAt);
      } else {
        return b.createdAt.localeCompare(a.createdAt);
      }
    });
    return filtered;
  }, [professionals, filterName, sortDirection]);

  // Fetch full professional details using server action
  async function handleProfessionalClick(professional: {
    id: string;
    name: string;
    isPublished: boolean;
  }) {
    setModalLoading(true);
    setModalOpen(true);
    setSelectedProfessional(null);
    try {
      const result = await fetchProfessionalDetailsFromServer(professional.id);
      if (!result || result.error || !result.data)
        throw new Error(result?.error || 'Failed to fetch details');
      const data = result.data;
      // Ensure all required fields are present for ModalProfessionalDetails
      setSelectedProfessional({
        id: data.id ?? professional.id,
        name: professional.name,
        email: data.email ?? '',
        professionalProfileId: data.professionalProfileId ?? null,
        isPublished: professional.isPublished,
        services: data.services ?? [],
        appointments: data.appointments ?? [],
        maxServices: data.maxServices ?? null,
        createdAt:
          data.createdAt !== undefined && data.createdAt !== null
            ? String(data.createdAt)
            : '',
      });
    } catch {
      setSelectedProfessional(null);
    } finally {
      setModalLoading(false);
    }
  }

  return (
    <div className="space-y-6">
      <ProfessionalDetailsModal
        isOpen={modalOpen}
        onOpenChange={(open) => {
          setModalOpen(open);
          if (!open) setSelectedProfessional(null);
        }}
        professional={selectedProfessional}
        loading={modalLoading}
      />
      <div className="rounded-lg bg-card border shadow-sm overflow-hidden">
        <div className="p-6 border-b bg-muted/30">
          <Typography variant="h3" className="text-xl font-semibold">
            Professionals
          </Typography>
          <Typography variant="small" className="text-muted-foreground">
            Showing {filteredProfessionals.length} professionals
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
          </div>
          {/* Desktop table view */}
          <div className="hidden md:block overflow-x-auto">
            <table className="w-full border-collapse">
              <thead>
                <tr className="bg-muted/20 hover:bg-muted/20">
                  <th className="border px-2 py-1">Name</th>
                  <th className="border px-2 py-1">Email</th>
                  <th className="border px-2 py-1">Created Date</th>
                  <th className="border px-2 py-1">Services</th>
                  <th className="border px-2 py-1">Completed Appointments</th>
                  <th className="border px-2 py-1">Published</th>
                </tr>
              </thead>
              <tbody>
                {filteredProfessionals.length === 0 ? (
                  <tr>
                    <td colSpan={6}>
                      <div className="flex flex-col items-center justify-center space-y-2 py-8">
                        <CalendarDays className="h-12 w-12 text-muted-foreground" />
                        <Typography>No professionals found</Typography>
                        <Typography
                          variant="small"
                          className="text-muted-foreground"
                        >
                          Professionals will appear here once added.
                        </Typography>
                      </div>
                    </td>
                  </tr>
                ) : (
                  filteredProfessionals.map((professional) => (
                    <tr
                      key={professional.id}
                      className="hover:bg-muted/50 cursor-pointer"
                      onClick={() => handleProfessionalClick(professional)}
                    >
                      <td className="border px-2 py-1">{professional.name}</td>
                      <td className="border px-2 py-1">{professional.email}</td>
                      <td className="border px-2 py-1">
                        {new Date(professional.createdAt).toLocaleDateString()}
                      </td>
                      <td className="border px-2 py-1 text-center">
                        {professional.serviceCount ?? 0}
                      </td>
                      <td className="border px-2 py-1 text-center">
                        {professional.completedAppointmentsCount ?? 0}
                      </td>
                      <td className="border px-2 py-1 text-center">
                        {professional.isPublished ? (
                          <span className="inline-block px-2 py-1 rounded bg-green-100 text-green-700 text-xs">
                            Published
                          </span>
                        ) : (
                          <span className="inline-block px-2 py-1 rounded bg-gray-200 text-gray-600 text-xs">
                            Unpublished
                          </span>
                        )}
                      </td>
                    </tr>
                  ))
                )}
              </tbody>
            </table>
          </div>
          {/* Mobile card view */}
          <div className="md:hidden">
            {filteredProfessionals.length === 0 ? (
              <div className="flex flex-col items-center justify-center space-y-2 py-8">
                <CalendarDays className="h-12 w-12 text-muted-foreground" />
                <Typography>No professionals found</Typography>
                <Typography variant="small" className="text-muted-foreground">
                  Professionals will appear here once added.
                </Typography>
              </div>
            ) : (
              filteredProfessionals.map((professional) => (
                <div
                  key={professional.id}
                  className="p-4 border rounded-lg mb-2 bg-card hover:bg-muted/50 transition-colors cursor-pointer"
                  onClick={() => handleProfessionalClick(professional)}
                >
                  <div className="flex justify-between items-start">
                    <div>
                      <Typography className="font-medium">
                        {professional.name}
                      </Typography>
                      <div className="text-muted-foreground text-sm mt-1">
                        {professional.email}
                      </div>
                    </div>
                    <div>
                      {professional.isPublished ? (
                        <span className="inline-block px-2 py-1 rounded bg-green-100 text-green-700 text-xs">
                          Published
                        </span>
                      ) : (
                        <span className="inline-block px-2 py-1 rounded bg-gray-200 text-gray-600 text-xs">
                          Unpublished
                        </span>
                      )}
                    </div>
                  </div>
                  <div className="mt-3 pt-3 border-t grid grid-cols-2 gap-2">
                    <div>
                      <Typography
                        variant="small"
                        className="text-muted-foreground"
                      >
                        Services
                      </Typography>
                      <Typography className="font-medium">
                        {professional.serviceCount ?? 0}
                      </Typography>
                    </div>
                    <div>
                      <Typography
                        variant="small"
                        className="text-muted-foreground"
                      >
                        Completed
                      </Typography>
                      <Typography className="font-medium">
                        {professional.completedAppointmentsCount ?? 0}
                      </Typography>
                    </div>
                    <div className="col-span-2">
                      <Typography
                        variant="small"
                        className="text-muted-foreground"
                      >
                        Created
                      </Typography>
                      <Typography className="font-medium">
                        {new Date(professional.createdAt).toLocaleDateString()}
                      </Typography>
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
