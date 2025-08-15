'use client';

import { TabsContent, Tabs } from '@/components/ui/tabs';
import { Typography } from '@/components/ui/typography';
import { formatCurrency } from '@/utils/formatCurrency';
import { User } from '@supabase/supabase-js';
import { useState } from 'react';
import { DateRange } from 'react-day-picker';
import { Appointment } from '../DashboardTemplateAppointmentsTable/DashboardTemplateAppointmentsTable';
import { DashboardTemplateAppointmentsWidget } from '../DashboardTemplateAppointmentsWidget/DashboardTemplateAppointmentsWidget';
import {
  Message,
  DashboardTemplateMessagesWidget,
} from '../DashboardTemplateMessagesWidget/DashboardTemplateMessagesWidget';
import { DashboardTemplateProfessionalStats } from '../DashboardTemplateProfessionalStats/DashboardTemplateProfessionalStats';
import {
  Refund,
  DashboardTemplateRefundsWidget,
} from '../DashboardTemplateRefundsWidget/DashboardTemplateRefundsWidget';
import { DashboardTemplateAppointmentsFilters } from '../DashboardTemplateAppointmentsFilters/DashboardTemplateAppointmentsFilters';
import { DashboardTemplateTabs } from '../DashboardTemplateTabs';
import { DashboardTemplateHeader } from '../DashboardTemplateHeader';

export type DashboardTemplateProfessionalViewProps = {
  user: User;
  dateRange: [Date | undefined, Date | undefined];
  onDateRangeChange: (range: [Date | undefined, Date | undefined]) => void;
};

// Helper function to filter data by date range
function filterByDateRange<T extends { date: Date }>(
  items: T[],
  dateRange: [Date | undefined, Date | undefined],
): T[] {
  if (!dateRange[0] && !dateRange[1]) return items;

  return items.filter((item) => {
    const itemDate = new Date(item.date);
    if (dateRange[0] && dateRange[1]) {
      return itemDate >= dateRange[0] && itemDate <= dateRange[1];
    } else if (dateRange[0]) {
      return itemDate >= dateRange[0];
    } else if (dateRange[1]) {
      return itemDate <= dateRange[1];
    }
    return true;
  });
}

// Dashboard widgets component
function DashboardWidgets({
  appointments,
  messages,
  refunds,
  upcomingCount,
  unreadCount,
  totalRefunds,
  isLoading,
  onTabChange,
}: {
  appointments: Appointment[];
  messages: Message[];
  refunds: Refund[];
  upcomingCount: number;
  unreadCount: number;
  totalRefunds: number;
  isLoading: boolean;
  onTabChange: (tab: string) => void;
}) {
  return (
    <div className="md:col-span-3 px-4 py-3 bg-card border rounded-lg shadow-sm">
      <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-6">
        <DashboardTemplateAppointmentsWidget
          appointments={appointments}
          upcomingCount={upcomingCount}
          isLoading={isLoading}
          onViewAllClick={() => onTabChange('appointments')}
        />

        <DashboardTemplateMessagesWidget
          messages={messages}
          unreadCount={unreadCount}
          isLoading={isLoading}
          onViewAllClick={() => onTabChange('messages')}
        />

        <DashboardTemplateRefundsWidget
          refunds={refunds}
          totalRefunds={totalRefunds}
          isLoading={isLoading}
          onViewAllClick={() => onTabChange('refunds')}
        />
      </div>
    </div>
  );
}

// Message list component
function MessagesList({ messages }: { messages: Message[] }) {
  return (
    <div className="rounded-md border divide-y">
      {messages.length > 0 ? (
        messages.map((message) => (
          <div
            key={message.id}
            className={`p-6 ${!message.isRead ? 'bg-primary/5' : ''}`}
          >
            <div className="flex justify-between items-center mb-2">
              <div className="font-medium">
                {message.sender}
                {!message.isRead && (
                  <span className="ml-2 inline-flex h-2 w-2 rounded-full bg-primary" />
                )}
              </div>
              <div className="text-sm text-muted-foreground">
                {message.createdAt.toLocaleDateString('en-US', { year: 'numeric', month: '2-digit', day: '2-digit' })}
              </div>
            </div>
            <p className="text-muted-foreground">{message.content}</p>
          </div>
        ))
      ) : (
        <div className="p-6 text-center">
          <Typography>No messages found</Typography>
        </div>
      )}
    </div>
  );
}

// Refunds list component
function RefundsList({ refunds }: { refunds: Refund[] }) {
  return (
    <div className="rounded-md border divide-y">
      {refunds.length > 0 ? (
        refunds.map((refund) => (
          <div key={refund.id} className="p-6">
            <div className="flex justify-between items-start mb-2">
              <div>
                <Typography className="font-medium">
                  {refund.serviceName}
                </Typography>
                <Typography variant="small" className="text-muted-foreground">
                  {refund.date.toLocaleDateString('en-US', { year: 'numeric', month: '2-digit', day: '2-digit' })}
                </Typography>
              </div>
              <div className="space-y-1 text-right">
                <Typography className="font-bold">
                  {formatCurrency(refund.amount)}
                </Typography>
                <Typography
                  variant="small"
                  className={`
                  ${refund.status === 'pending' ? 'text-yellow-500' : ''}
                  ${refund.status === 'completed' ? 'text-green-500' : ''}
                  ${refund.status === 'declined' ? 'text-destructive' : ''}
                `}
                >
                  {refund.status === 'pending'
                    ? 'Pending Refund'
                    : refund.status === 'completed'
                      ? 'Refund Completed'
                      : 'Refund Declined'}
                </Typography>
              </div>
            </div>
          </div>
        ))
      ) : (
        <div className="p-6 text-center">
          <Typography>No refunds found</Typography>
        </div>
      )}
    </div>
  );
}

// Mock appointment data generation
function getMockAppointmentData() {
  return [
    {
      id: 'app-1',
      date: new Date('2023-11-25'),
      time: '10:00 AM',
      serviceName: 'Hair Styling',
      clientName: 'Sarah Johnson',
      status: 'upcoming' as const,
      amount: 85,
    },
    {
      id: 'app-2',
      date: new Date('2023-12-01'),
      time: '2:30 PM',
      serviceName: 'Makeup Session',
      clientName: 'Emily Davis',
      status: 'upcoming' as const,
      amount: 120,
    },
    {
      id: 'app-3',
      date: new Date('2023-10-15'),
      time: '11:00 AM',
      serviceName: 'Hair Color',
      clientName: 'Michelle Wilson',
      status: 'completed' as const,
      amount: 150,
    },
    {
      id: 'app-4',
      date: new Date('2023-10-05'),
      time: '3:00 PM',
      serviceName: 'Hair Cut',
      clientName: 'Robert Brown',
      status: 'cancelled' as const,
      amount: 65,
    },
    {
      id: 'app-5',
      date: new Date('2023-10-18'),
      time: '1:00 PM',
      serviceName: 'Full Makeup',
      clientName: 'Jennifer Lee',
      status: 'completed' as const,
      amount: 175,
    },
  ];
}

// Mock message data generation
function getMockMessagesData() {
  return [
    {
      id: 'msg-1',
      sender: 'Sarah Johnson',
      content:
        'I might be running about 10 minutes late for my appointment tomorrow. Is that okay?',
      createdAt: new Date('2023-11-24'),
      isRead: false,
    },
    {
      id: 'msg-2',
      sender: 'Emily Davis',
      content:
        'Could you bring an extra mirror for my makeup session? I want to see the details up close.',
      createdAt: new Date('2023-11-22'),
      isRead: true,
    },
    {
      id: 'msg-3',
      sender: 'Robert Brown',
      content:
        'Thank you for refunding my cancelled appointment. I appreciate your understanding.',
      createdAt: new Date('2023-10-06'),
      isRead: true,
    },
  ];
}

// Mock refund data generation
function getMockRefundsData() {
  return [
    {
      id: 'ref-1',
      amount: 65,
      date: new Date('2023-10-05'),
      status: 'completed' as const,
      serviceName: 'Hair Cut (Cancelled by Robert Brown)',
    },
    {
      id: 'ref-2',
      amount: 45,
      date: new Date('2023-09-20'),
      status: 'pending' as const,
      serviceName: 'Partial refund for Jennifer Lee',
    },
  ];
}

// Professional dashboard data provider
function useProfessionalDashboardData(
  dateRange: [Date | undefined, Date | undefined],
) {
  const appointments = getMockAppointmentData();
  const messages = getMockMessagesData();
  const refunds = getMockRefundsData();

  // Apply date filter
  const filteredAppointments = filterByDateRange(appointments, dateRange);
  const upcomingAppointments = filteredAppointments.filter(
    (a) => a.status === 'upcoming',
  );
  const pastAppointments = filteredAppointments.filter(
    (a) => a.status === 'completed' || a.status === 'cancelled',
  );
  const filteredRefunds = filterByDateRange(refunds, dateRange);

  // Calculate total revenue and bookings
  const totalRevenue = pastAppointments.reduce((sum, app) => {
    if (app.status === 'completed') {
      return sum + app.amount;
    }
    return sum;
  }, 0);

  const totalBookings = pastAppointments.filter(
    (a) => a.status === 'completed',
  ).length;

  return {
    appointments: filteredAppointments,
    upcomingAppointments,
    pastAppointments,
    messages,
    refunds: filteredRefunds,
    totalRevenue,
    totalBookings,
  };
}

// Overview tab content
function OverviewTabContent({
  dateRange,
  appointments,
  upcomingAppointments,
  pastAppointments,
  messages,
  refunds,
  totalRevenue,
  totalBookings,
  isLoading,
  unreadCount,
  setActiveTab,
}: {
  dateRange: [Date | undefined, Date | undefined];
  appointments: Appointment[];
  upcomingAppointments: Appointment[];
  pastAppointments: Appointment[];
  messages: Message[];
  refunds: Refund[];
  totalRevenue: number;
  totalBookings: number;
  isLoading: boolean;
  unreadCount: number;
  setActiveTab: (tab: string) => void;
}) {
  return (
    <TabsContent value="overview" className="space-y-6">
      <div className="space-y-6">
        <DashboardTemplateProfessionalStats
          totalBookings={totalBookings}
          totalRevenue={totalRevenue}
          percentChange={10} // Mocked percentage change
          isLoading={isLoading}
        />
        <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
          <DashboardWidgets
            appointments={appointments}
            messages={messages}
            refunds={refunds}
            upcomingCount={upcomingAppointments.length}
            unreadCount={unreadCount}
            totalRefunds={refunds.length}
            isLoading={isLoading}
            onTabChange={setActiveTab}
          />
        </div>
      </div>

      <DashboardTemplateAppointmentsFilters
        dateRange={dateRange}
        filteredAppointments={appointments}
        upcomingAppointments={upcomingAppointments}
        pastAppointments={pastAppointments}
        isLoading={isLoading}
        isProfessionalView={true}
      />
    </TabsContent>
  );
}

// Main content component that handles tabs
function ProfessionalDashboardContent({
  activeTab,
  dateRange,
  isLoading,
  setActiveTab,
}: {
  activeTab: string;
  dateRange: [Date | undefined, Date | undefined];
  isLoading: boolean;
  setActiveTab: (tab: string) => void;
}) {
  const {
    appointments,
    upcomingAppointments,
    pastAppointments,
    messages,
    refunds,
    totalRevenue,
    totalBookings,
  } = useProfessionalDashboardData(dateRange);

  const unreadCount = messages.filter((m) => !m.isRead).length;

  return (
    <div className="mt-4">
      <Tabs
        defaultValue="overview"
        value={activeTab}
        onValueChange={setActiveTab}
      >
        <DashboardTemplateTabs
          className="mb-4"
          activeTab={activeTab}
          onTabChange={setActiveTab}
        />

        <OverviewTabContent
          dateRange={dateRange}
          appointments={appointments}
          upcomingAppointments={upcomingAppointments}
          pastAppointments={pastAppointments}
          messages={messages}
          refunds={refunds}
          totalRevenue={totalRevenue}
          totalBookings={totalBookings}
          isLoading={isLoading}
          unreadCount={unreadCount}
          setActiveTab={setActiveTab}
        />

        <TabsContent value="appointments">
          <DashboardTemplateAppointmentsFilters
            dateRange={dateRange}
            filteredAppointments={appointments}
            upcomingAppointments={upcomingAppointments}
            pastAppointments={pastAppointments}
            isLoading={isLoading}
            isProfessionalView={true}
          />
        </TabsContent>

        <TabsContent value="messages">
          <Typography variant="h3" className="text-xl font-semibold mb-4">
            Messages from Clients
          </Typography>
          <MessagesList messages={messages} />
        </TabsContent>

        <TabsContent value="refunds">
          <Typography variant="h3" className="text-xl font-semibold mb-4">
            Refunds
          </Typography>
          <RefundsList refunds={refunds} />
        </TabsContent>
      </Tabs>
    </div>
  );
}

export function DashboardTemplateProfessionalView({
  user,
  dateRange,
  onDateRangeChange,
}: DashboardTemplateProfessionalViewProps) {
  const [isLoading, setIsLoading] = useState(false);
  const [activeTab, setActiveTab] = useState('overview');

  // Handle date range change
  const handleDateRangeChange = (range: DateRange) => {
    setIsLoading(true);
    // Simulate loading
    setTimeout(() => {
      onDateRangeChange([range.from, range.to]);
      setIsLoading(false);
    }, 500);
  };

  return (
    <div>
      <DashboardTemplateHeader
        user={user}
        title="Professional Dashboard"
        dateRange={dateRange}
        onDateRangeChange={handleDateRangeChange}
      />

      <ProfessionalDashboardContent
        activeTab={activeTab}
        dateRange={dateRange}
        isLoading={isLoading}
        setActiveTab={setActiveTab}
      />
    </div>
  );
}
