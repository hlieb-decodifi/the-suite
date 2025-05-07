'use client';

import { ServiceListItem, AuthStatus } from '../../../../types';
import { ServicesTemplateServiceCard } from '../ServicesTemplateServiceCard/ServicesTemplateServiceCard';

export type ServicesTemplateServicesListProps = {
  services: ServiceListItem[];
  authStatus: AuthStatus;
};

export function ServicesTemplateServicesList({
  services,
  authStatus,
}: ServicesTemplateServicesListProps) {
  return (
    <div className="flex flex-col space-y-4">
      {services.map((service) => (
        <ServicesTemplateServiceCard
          key={service.id}
          service={service}
          authStatus={authStatus}
        />
      ))}
    </div>
  );
}
