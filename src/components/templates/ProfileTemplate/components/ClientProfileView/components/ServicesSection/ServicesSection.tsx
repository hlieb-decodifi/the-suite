import { User } from '@supabase/supabase-js';
import { useState, useEffect } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Typography } from '@/components/ui/typography';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { MapPin, Calendar } from 'lucide-react';

export type ServicesSectionProps = {
  user: User;
};

type Service = {
  id: string;
  name: string;
  category: string;
  location: string;
  availability: string;
  distance: string;
};

const mockServices: Service[] = [
  {
    id: '1',
    name: 'Home Cleaning',
    category: 'Cleaning',
    location: 'Available in your area',
    availability: 'Mon-Fri',
    distance: '0.8 miles away',
  },
  {
    id: '2',
    name: 'Lawn Care',
    category: 'Landscaping',
    location: 'Available in your area',
    availability: 'Weekends',
    distance: '1.2 miles away',
  },
  {
    id: '3',
    name: 'Pet Sitting',
    category: 'Pet Care',
    location: 'Available in your area',
    availability: '24/7',
    distance: '2.0 miles away',
  },
];

const ServiceCard = ({ service }: { service: Service }) => (
  <div
    key={service.id}
    className="flex flex-col md:flex-row justify-between items-start md:items-center p-4 rounded-md border border-[#ECECEC] hover:bg-slate-50 transition-colors"
  >
    <div className="mb-2 md:mb-0">
      <div className="flex items-center gap-2 mb-1">
        <Typography variant="large" className="font-medium">
          {service.name}
        </Typography>
        <Badge variant="outline" className="bg-slate-100">
          {service.category}
        </Badge>
      </div>
      <div className="flex flex-col md:flex-row md:items-center gap-1 md:gap-3 text-sm text-gray-500">
        <div className="flex items-center gap-1">
          <MapPin size={14} />
          <span>{service.distance}</span>
        </div>
        <div className="hidden md:block">•</div>
        <div className="flex items-center gap-1">
          <Calendar size={14} />
          <span>{service.availability}</span>
        </div>
      </div>
    </div>
    <Button size="sm" className="mt-2 md:mt-0">
      Book Now
    </Button>
  </div>
);

export function ServicesSection({ user }: ServicesSectionProps) {
  const [services, setServices] = useState<Service[]>([]);
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    // In a real app, you would fetch services based on user location
    const fetchServices = async () => {
      setIsLoading(true);
      try {
        // Simulate API call delay
        await new Promise((resolve) => setTimeout(resolve, 500));

        // Get user location from metadata if available
        const userCity = user.user_metadata?.address?.city;
        const userState = user.user_metadata?.address?.state;

        // In a real app, you would use these to filter services
        console.log('Fetching services for:', userCity, userState);

        setServices(mockServices);
      } catch (error) {
        console.error('Error fetching services:', error);
        setServices([]);
      } finally {
        setIsLoading(false);
      }
    };

    fetchServices();
  }, [user]);

  return (
    <Card className="border border-[#ECECEC] shadow-sm">
      <CardHeader className="px-6 pt-6 pb-4">
        <CardTitle className="flex justify-between items-center">
          <Typography variant="h4" className="text-[#313131] font-semibold">
            Services In Your Area
          </Typography>
          <Button variant="outline" size="sm">
            View All
          </Button>
        </CardTitle>
      </CardHeader>
      <CardContent className="px-6 pb-6">
        {isLoading ? (
          <div className="text-center py-8">
            <Typography variant="muted">Loading services...</Typography>
          </div>
        ) : services.length === 0 ? (
          <div className="text-center py-8">
            <Typography variant="muted">
              No services available in your area yet.
            </Typography>
          </div>
        ) : (
          <div className="space-y-4">
            {services.map((service) => (
              <ServiceCard key={service.id} service={service} />
            ))}
          </div>
        )}
      </CardContent>
    </Card>
  );
}
