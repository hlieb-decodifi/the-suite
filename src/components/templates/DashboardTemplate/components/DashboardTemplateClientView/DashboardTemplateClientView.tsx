'use client';

import { TabsContent, Tabs } from '@/components/ui/tabs';
import { Typography } from '@/components/ui/typography';
import { User } from '@supabase/supabase-js';
import { useState } from 'react';
import { DateRange } from 'react-day-picker';
import { Appointment } from '../DashboardTemplateAppointmentsTable/DashboardTemplateAppointmentsTable';
import { DashboardTemplateAppointmentsWidget } from '../DashboardTemplateAppointmentsWidget/DashboardTemplateAppointmentsWidget';
import {
  Message,
  DashboardTemplateMessagesWidget,
} from '../DashboardTemplateMessagesWidget/DashboardTemplateMessagesWidget';
import {
  Refund,
  DashboardTemplateRefundsWidget,
} from '../DashboardTemplateRefundsWidget/DashboardTemplateRefundsWidget';
import { formatCurrency } from '@/utils';
import { DashboardTemplateAppointmentsFilters } from '../DashboardTemplateAppointmentsFilters/DashboardTemplateAppointmentsFilters';
import { DashboardTemplateTabs } from '../DashboardTemplateTabs';
import { DashboardTemplateHeader } from '../DashboardTemplateHeader';

export type DashboardTemplateClientViewProps = {
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
    <div className="md:col-span-3 px-4 py-3 bg-card border rounded-lg">
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

// Mock appointments data
function getMockAppointmentsData(): Appointment[] {
  return [
    {
      id: 'app-1',
      date: new Date('2023-11-25'),
      time: '10:00 AM',
      serviceName: 'Hair Styling',
      professionalName: 'Jane Smith',
      status: 'upcoming' as const,
      amount: 85,
    },
    {
      id: 'app-2',
      date: new Date('2023-12-01'),
      time: '2:30 PM',
      serviceName: 'Makeup Session',
      professionalName: 'Alex Johnson',
      status: 'upcoming' as const,
      amount: 120,
    },
    {
      id: 'app-3',
      date: new Date('2023-10-15'),
      time: '11:00 AM',
      serviceName: 'Hair Color',
      professionalName: 'Jane Smith',
      status: 'completed' as const,
      amount: 150,
    },
    {
      id: 'app-4',
      date: new Date('2023-10-05'),
      time: '3:00 PM',
      serviceName: 'Hair Cut',
      professionalName: 'Carlos Rodriguez',
      status: 'cancelled' as const,
      amount: 65,
    },
  ];
}

// Mock messages data
function getMockMessagesData() {
  return [
    {
      id: 'msg-1',
      sender: 'Jane Smith',
      content:
        'Hi, just confirming your appointment for tomorrow at 10:00 AM for Hair Styling.',
      createdAt: new Date('2023-11-24'),
      isRead: false,
    },
    {
      id: 'msg-2',
      sender: 'Alex Johnson',
      content:
        'Looking forward to seeing you next week! Please arrive 10 minutes early for your appointment.',
      createdAt: new Date('2023-11-22'),
      isRead: true,
    },
  ];
}

// Mock refunds data
function getMockRefundsData(): Refund[] {
  return [
    {
      id: 'ref-1',
      amount: 65,
      date: new Date('2023-10-05'),
      status: 'completed' as const,
      serviceName: 'Hair Cut (Cancelled)',
    },
  ];
}

// Mock data for the client dashboard
function useClientDashboardData(
  dateRange: [Date | undefined, Date | undefined],
) {
  // Mock data - in a real app, this would come from an API
  const appointments = getMockAppointmentsData();
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

  return {
    appointments: filteredAppointments,
    upcomingAppointments,
    pastAppointments,
    messages,
    refunds: filteredRefunds,
  };
}

// Messages tab content component
function MessagesTabContent({ messages }: { messages: Message[] }) {
  return (
    <div className="rounded-lg bg-card border shadow-sm overflow-hidden">
      <div className="p-6 border-b bg-muted/30">
        <Typography variant="h3" className="text-xl font-semibold">
          Messages
        </Typography>
      </div>
      <div className="divide-y">
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
                  {message.createdAt.toLocaleDateString()}
                </div>
              </div>
              <p className="text-sm text-muted-foreground line-clamp-2">
                {message.content}
              </p>
            </div>
          ))
        ) : (
          <div className="p-6 text-center">
            <Typography>No messages found</Typography>
          </div>
        )}
      </div>
    </div>
  );
}

// Refunds tab content component
function RefundsTabContent({ refunds }: { refunds: Refund[] }) {
  return (
    <div className="rounded-lg bg-card border shadow-sm overflow-hidden">
      <div className="p-6 border-b bg-muted/30">
        <Typography variant="h3" className="text-xl font-semibold">
          Refunds
        </Typography>
      </div>
      <div className="divide-y">
        {refunds.length > 0 ? (
          refunds.map((refund) => (
            <div key={refund.id} className="p-6">
              <div className="flex justify-between items-start mb-2">
                <div>
                  <Typography className="font-medium">
                    {refund.serviceName}
                  </Typography>
                  <Typography variant="small" className="text-muted-foreground">
                    {refund.date.toLocaleDateString()}
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
    </div>
  );
}

// Overview tab content component
function OverviewTabContent({
  dateRange,
  appointments,
  upcomingAppointments,
  pastAppointments,
  messages,
  refunds,
  unreadCount,
  isLoading,
  setActiveTab,
}: {
  dateRange: [Date | undefined, Date | undefined];
  appointments: Appointment[];
  upcomingAppointments: Appointment[];
  pastAppointments: Appointment[];
  messages: Message[];
  refunds: Refund[];
  unreadCount: number;
  isLoading: boolean;
  setActiveTab: (tab: string) => void;
}) {
  return (
    <TabsContent value="overview" className="space-y-8">
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

      <DashboardTemplateAppointmentsFilters
        dateRange={dateRange}
        filteredAppointments={appointments}
        upcomingAppointments={upcomingAppointments}
        pastAppointments={pastAppointments}
        isLoading={isLoading}
        title="My Appointments"
      />
    </TabsContent>
  );
}

// Main tab content component for the client dashboard
function ClientDashboardContent({
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
  } = useClientDashboardData(dateRange);

  const unreadCount = messages.filter((m) => !m.isRead).length;

  return (
    <>
      <div className="mt-4">
        <Tabs
          defaultValue="overview"
          value={activeTab}
          onValueChange={setActiveTab}
        >
          <DashboardTemplateTabs className="mb-4" />

          <OverviewTabContent
            dateRange={dateRange}
            appointments={appointments}
            upcomingAppointments={upcomingAppointments}
            pastAppointments={pastAppointments}
            messages={messages}
            refunds={refunds}
            unreadCount={unreadCount}
            isLoading={isLoading}
            setActiveTab={setActiveTab}
          />

          <TabsContent value="appointments">
            <DashboardTemplateAppointmentsFilters
              dateRange={dateRange}
              filteredAppointments={appointments}
              upcomingAppointments={upcomingAppointments}
              pastAppointments={pastAppointments}
              isLoading={isLoading}
              title="My Appointments"
            />
          </TabsContent>

          <TabsContent value="messages">
            <MessagesTabContent messages={messages} />
          </TabsContent>

          <TabsContent value="refunds">
            <RefundsTabContent refunds={refunds} />
          </TabsContent>
        </Tabs>
      </div>
    </>
  );
}

export function DashboardTemplateClientView({
  user,
  dateRange,
  onDateRangeChange,
}: DashboardTemplateClientViewProps) {
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
        title="Client Dashboard"
        dateRange={dateRange}
        onDateRangeChange={handleDateRangeChange}
      />

      <ClientDashboardContent
        activeTab={activeTab}
        dateRange={dateRange}
        isLoading={isLoading}
        setActiveTab={setActiveTab}
      />
    </div>
  );
}
