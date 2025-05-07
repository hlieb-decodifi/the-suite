import { Suspense } from 'react';
import { ServicesTemplateHeader } from './components/ServicesTemplateHeader';
import { ClientServicesContainer } from './components/ClientServicesContainer';
import { getServices } from './actions';

export async function ServicesTemplate() {
  // Fetch services data on the server
  const services = await getServices();

  return (
    <div className="container py-8 space-y-8">
      <ServicesTemplateHeader />

      <Suspense
        fallback={<div className="text-center py-10">Loading services...</div>}
      >
        <ClientServicesContainer initialServices={services} />
      </Suspense>
    </div>
  );
}
