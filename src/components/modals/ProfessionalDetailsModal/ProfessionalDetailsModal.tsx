import React, { useState } from 'react';
import { Modal } from '../Modal';
import { Tabs, TabsList, TabsTrigger, TabsContent } from '@/components/ui/tabs';
import { Typography } from '@/components/ui/typography';

import { ServiceUI } from '@/types/services';
import { Appointment } from '@/types/appointments';

type ProfessionalDetails = {
  id: string;
  name: string;
  email: string;
  createdAt?: string;
  professionalProfileId: string | null;
  isPublished: boolean;
  services: ServiceUI[];
  appointments: Appointment[];
  maxServices?: number | null;
};

type ProfessionalDetailsModalProps = {
  isOpen: boolean;
  onOpenChange: (open: boolean) => void;
  professional: ProfessionalDetails | null;
  loading?: boolean;
};

export function ProfessionalDetailsModal({
  isOpen,
  onOpenChange,
  professional,
  loading,
}: ProfessionalDetailsModalProps) {
  // Local state for max services input
  const [maxServices, setMaxServices] = useState<number | ''>(
    professional &&
      typeof professional.maxServices === 'number' &&
      !isNaN(professional.maxServices)
      ? professional.maxServices
      : '',
  );
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // Update local state if professional changes
  React.useEffect(() => {
    if (
      professional &&
      typeof professional.maxServices === 'number' &&
      !isNaN(professional.maxServices)
    ) {
      setMaxServices(professional.maxServices);
    } else {
      setMaxServices('');
    }
  }, [professional]);

  // Handler to update max_services in DB
  async function handleMaxServicesBlur() {
    if (!professional || maxServices === '' || typeof maxServices !== 'number')
      return;
    setSaving(true);
    setError(null);
    try {
      // Dynamically import the server action
      const { updateProfessionalMaxServicesAction } = await import(
        '@/server/domains/professionals/actions'
      );
      const result = await updateProfessionalMaxServicesAction(
        professional.id,
        maxServices,
      );
      if (!result.success) {
        setError(result.error || 'Failed to update');
      }
    } catch (e: unknown) {
      if (
        typeof e === 'object' &&
        e !== null &&
        'message' in e &&
        typeof (e as { message?: unknown }).message === 'string'
      ) {
        setError((e as { message: string }).message);
      } else {
        setError('Failed to update');
      }
    } finally {
      setSaving(false);
    }
  }

  return (
    <Modal
      isOpen={isOpen}
      onOpenChange={onOpenChange}
      title={
        professional
          ? `Professional: ${professional.name}`
          : 'Professional Details'
      }
      hideCloseButton={true}
    >
      {loading ? (
        <div className="p-8 flex items-center justify-center">
          <Typography>Loading...</Typography>
        </div>
      ) : !professional ? (
        <div className="p-8 flex items-center justify-center">
          <Typography>No data found.</Typography>
        </div>
      ) : (
        <Tabs defaultValue="profile" className="w-full">
          <TabsList>
            <TabsTrigger value="profile">Profile</TabsTrigger>
            <TabsTrigger value="services">
              Services ({professional.services.length})
            </TabsTrigger>
            <TabsTrigger value="appointments">
              Appointments ({professional.appointments.length})
            </TabsTrigger>
          </TabsList>
          <TabsContent value="profile">
            <div className="space-y-2">
              <Typography variant="h5">Basic Info</Typography>
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <Typography variant="small" className="text-muted-foreground">
                    Name
                  </Typography>
                  <Typography>{professional.name}</Typography>
                </div>
                <div>
                  <Typography variant="small" className="text-muted-foreground">
                    Email
                  </Typography>
                  <Typography>{professional.email}</Typography>
                </div>
                <div>
                  <Typography variant="small" className="text-muted-foreground">
                    Created
                  </Typography>
                  <Typography>
                    {professional.createdAt
                      ? new Date(professional.createdAt).toLocaleString()
                      : 'N/A'}
                  </Typography>
                </div>
                <div>
                  <Typography variant="small" className="text-muted-foreground">
                    Published
                  </Typography>
                  <Typography>
                    {professional.isPublished ? 'Yes' : 'No'}
                  </Typography>
                </div>
                <div className="col-span-2">
                  <Typography
                    variant="small"
                    className="text-muted-foreground mb-1 block"
                  >
                    Max Services
                  </Typography>
                  <input
                    type="number"
                    min={1}
                    className="border rounded px-2 py-1 w-32 mb-1"
                    value={maxServices}
                    onChange={(e) =>
                      setMaxServices(
                        e.target.value === '' ? '' : Number(e.target.value),
                      )
                    }
                    onBlur={handleMaxServicesBlur}
                    disabled={saving}
                  />
                  {saving && (
                    <span className="ml-2 text-xs text-muted-foreground">
                      Saving...
                    </span>
                  )}
                  {error && (
                    <div className="text-red-500 text-xs mt-1">{error}</div>
                  )}
                </div>
              </div>
            </div>
          </TabsContent>
          {/* ...existing code for services and appointments tabs... */}
          <TabsContent value="services">
            {professional.services.length === 0 ? (
              <Typography className="p-4">No services found.</Typography>
            ) : (
              <div className="overflow-x-auto">
                <table className="w-full border-collapse">
                  <thead>
                    <tr className="bg-muted/20">
                      <th className="border px-2 py-1">Name</th>
                      <th className="border px-2 py-1">Price</th>
                      <th className="border px-2 py-1">Duration</th>
                      <th className="border px-2 py-1">Description</th>
                    </tr>
                  </thead>
                  <tbody>
                    {professional.services.map((service) => (
                      <tr key={service.id}>
                        <td className="border px-2 py-1">{service.name}</td>
                        <td className="border px-2 py-1">{service.price}</td>
                        <td className="border px-2 py-1">{service.duration}</td>
                        <td className="border px-2 py-1">
                          {service.description}
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}
          </TabsContent>
          <TabsContent value="appointments">
            {professional.appointments.length === 0 ? (
              <Typography className="p-4">No appointments found.</Typography>
            ) : (
              <div className="overflow-x-auto">
                <table className="w-full border-collapse">
                  <thead>
                    <tr className="bg-muted/20">
                      <th className="border px-2 py-1">Start Time</th>
                      <th className="border px-2 py-1">End Time</th>
                      <th className="border px-2 py-1">Status</th>
                    </tr>
                  </thead>
                  <tbody>
                    {professional.appointments.map((appointment) => (
                      <tr key={appointment.id}>
                        <td className="border px-2 py-1">
                          {new Date(appointment.startTime).toLocaleString()}
                        </td>
                        <td className="border px-2 py-1">
                          {new Date(appointment.endTime).toLocaleString()}
                        </td>
                        <td className="border px-2 py-1">
                          {appointment.status}
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}
          </TabsContent>
        </Tabs>
      )}
    </Modal>
  );
}
