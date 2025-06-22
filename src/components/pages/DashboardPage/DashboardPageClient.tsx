'use client';

import { useState, useEffect } from 'react';
import { AppointmentType } from '@/components/common/AppointmentItem';
import { Button } from '@/components/ui/button';
import { Typography } from '@/components/ui/typography';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { cn } from '@/utils/cn';
import { formatCurrency } from '@/utils/formatCurrency';
import { format } from 'date-fns';
import {
  BarChart3Icon,
  CalendarIcon,
  ClockIcon,
  MessageSquareIcon,
  RefreshCwIcon,
  UserIcon,
} from 'lucide-react';
import Link from 'next/link';
import { ConversationWithUser, ChatMessage } from '@/types/messages';

// Define stats type
type DashboardStats = {
  totalAppointments: number;
  upcomingAppointments: number;
  completedAppointments: number;
  cancelledAppointments: number;
  totalRevenue?: number | undefined;
  percentChange: number;
};

type DashboardPageClientProps = {
  isProfessional: boolean;
  upcomingAppointments: AppointmentType[];
  stats: DashboardStats;
  recentConversations: ConversationWithUser[];
};

export function DashboardPageClient({
  isProfessional,
  upcomingAppointments = [],
  stats,
  recentConversations = [],
}: DashboardPageClientProps) {
  // State for conversations to enable real-time updates
  const [conversations, setConversations] =
    useState<ConversationWithUser[]>(recentConversations);

  // Polling for conversation updates
  useEffect(() => {
    let conversationInterval: ReturnType<typeof setInterval>;
    let isTabVisible = true;

    // Check if tab is visible to avoid polling when user is away
    const handleVisibilityChange = () => {
      isTabVisible = !document.hidden;
      if (isTabVisible) {
        // Immediately check for updates when user comes back
        pollForConversations();
      }
    };

    const pollForConversations = async () => {
      // Only poll if tab is visible
      if (!isTabVisible) return;

      try {
        const { getRecentConversations } = await import(
          '@/server/domains/messages/actions'
        );
        const result = await getRecentConversations();
        if (result.success && result.conversations) {
          setConversations(result.conversations);
        }
      } catch (error) {
        console.error('Failed to poll conversations:', error);
      }
    };

    // Add visibility change listener
    document.addEventListener('visibilitychange', handleVisibilityChange);

    // Poll every 30 seconds for dashboard conversations
    const startPolling = () => {
      conversationInterval = setInterval(() => {
        if (isTabVisible) {
          pollForConversations();
        }
      }, 30000);
    };

    startPolling();

    // Cleanup
    return () => {
      document.removeEventListener('visibilitychange', handleVisibilityChange);
      clearInterval(conversationInterval);
    };
  }, []);

  // Use stats data
  const totalBookings = stats.totalAppointments;
  const totalRevenue = stats.totalRevenue || 0;
  const percentChange = stats.percentChange;
  const averageRevenue = totalBookings > 0 ? totalRevenue / totalBookings : 0;

  // Calculate total amount of upcoming appointments
  const upcomingAppointmentsTotal = upcomingAppointments.reduce(
    (total, appointment) => {
      // Use total including service fee for both professionals and clients
      const price =
        appointment.services?.totalWithServiceFee ||
        (appointment.services?.totalPrice || appointment.services?.price || 0) +
          1.0;
      console.log(
        `Appointment ${appointment.id}: service price = ${price}`,
        appointment.services,
      );
      return total + price;
    },
    0,
  );

  console.log('Upcoming appointments:', upcomingAppointments);
  console.log('Calculated total:', upcomingAppointmentsTotal);

  // Count unread messages from recent conversations
  const unreadCount = conversations.reduce((total, conversation) => {
    return total + (conversation.unread_count || 0);
  }, 0);

  // Refunds data - mock data for now
  const refunds = [
    {
      id: '1',
      amount: 65,
      status: 'completed',
      createdAt: '2023-10-05T10:00:00Z',
      description: 'Hair Cut (Cancelled by Robert Brown)',
    },
    {
      id: '2',
      amount: 45,
      status: 'pending',
      createdAt: '2023-09-20T10:00:00Z',
      description: 'Partial refund for Jennifer Lee',
    },
  ];

  const pendingRefunds = 1;
  const totalRefunds = 2;

  const getInitials = (firstName: string, lastName: string) => {
    return `${firstName.charAt(0)}${lastName.charAt(0)}`.toUpperCase();
  };

  // Get display text for last message (same logic as in messages page)
  const getLastMessageDisplay = (message: ChatMessage | undefined) => {
    if (!message) return 'No messages yet';

    if (
      message.attachments &&
      message.attachments.length > 0 &&
      !message.content.trim()
    ) {
      const count = message.attachments.length;
      return count === 1 ? '📷 Photo' : `📷 ${count} Photos`;
    }

    if (
      message.attachments &&
      message.attachments.length > 0 &&
      message.content.trim()
    ) {
      return `📷 ${message.content}`;
    }

    return message.content;
  };

  return (
    <div className="space-y-6">
      {/* Professional Stats */}
      {isProfessional && (
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          <StatCard
            title="Total Bookings"
            value={totalBookings.toString()}
            description={`${percentChange}% increase`}
            icon={<UserIcon className="h-5 w-5" />}
            valueColor="text-primary"
          />
          <StatCard
            title="Total Revenue"
            value={formatCurrency(totalRevenue)}
            description={`Avg. ${formatCurrency(averageRevenue)} per booking`}
            icon={<BarChart3Icon className="h-5 w-5" />}
            valueColor="text-emerald-500"
          />
        </div>
      )}

      {/* Dashboard Widgets */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        <WidgetCard
          title="Upcoming Appointments"
          count={upcomingAppointments.length}
          description={`Total value: ${formatCurrency(upcomingAppointmentsTotal)}`}
          icon={<CalendarIcon className="h-5 w-5" />}
          countColor="text-primary"
          viewAllLink="/dashboard/appointments"
          viewAllText="View all appointments"
        >
          <div className="space-y-4 max-h-[300px] overflow-y-auto pr-1">
            {upcomingAppointments.length > 0 ? (
              upcomingAppointments.slice(0, 3).map((appointment) => {
                // Get service name from the appointment
                const serviceName = appointment.services?.name || 'Service';

                // Get price including service fee for both professionals and clients
                const price =
                  appointment.services?.totalWithServiceFee ||
                  (appointment.services?.totalPrice ||
                    appointment.services?.price ||
                    0) + 1.0;

                // Check if there are additional services
                const hasAdditionalServices =
                  appointment.services?.hasAdditionalServices;
                const additionalServicesCount =
                  appointment.services?.additionalServicesCount || 0;

                return (
                  <div
                    key={appointment.id}
                    className="p-3 bg-muted/30 rounded-lg"
                  >
                    <Link href={`/bookings/${appointment.id}`}>
                      <div className="flex justify-between mb-1">
                        <div className="flex-1 min-w-0">
                          <Typography className="font-medium truncate">
                            {serviceName}
                          </Typography>
                          {hasAdditionalServices && (
                            <Typography className="text-xs text-muted-foreground">
                              + {additionalServicesCount} more service
                              {additionalServicesCount > 1 ? 's' : ''}
                            </Typography>
                          )}
                        </div>
                        <Typography className="font-medium">
                          {formatCurrency(price)}
                        </Typography>
                      </div>
                      <div className="flex items-center text-sm text-muted-foreground">
                        <CalendarIcon className="mr-1 h-3 w-3" />
                        {appointment.start_time
                          ? format(
                              new Date(appointment.start_time),
                              'MMM d, yyyy',
                            )
                          : 'No date'}
                        <ClockIcon className="ml-2 mr-1 h-3 w-3" />
                        {format(
                          new Date(appointment.start_time || new Date()),
                          'h:mm a',
                        )}
                      </div>
                    </Link>
                  </div>
                );
              })
            ) : (
              <div className="py-4 text-center text-muted-foreground">
                No upcoming appointments
              </div>
            )}
          </div>
        </WidgetCard>

        <WidgetCard
          title="Messages"
          count={unreadCount}
          description="Unread messages"
          icon={<MessageSquareIcon className="h-5 w-5" />}
          countColor="text-primary"
          viewAllLink="/dashboard/messages"
          viewAllText="View all messages"
        >
          <div className="space-y-4">
            {conversations.length > 0 ? (
              conversations.map((conversation) => (
                <Link
                  key={conversation.id}
                  href={`/dashboard/messages?conversation=${conversation.id}`}
                  className="block"
                >
                  <div className="p-3 bg-muted/30 rounded-lg hover:bg-muted/50 transition-colors">
                    <div className="flex items-center gap-2 mb-1">
                      <div className="flex items-center gap-2 flex-1">
                        <Avatar className="h-6 w-6">
                          <AvatarImage
                            src={conversation.other_user.profile_photo_url}
                          />
                          <AvatarFallback className="bg-primary/10 text-primary text-xs font-medium">
                            {getInitials(
                              conversation.other_user.first_name,
                              conversation.other_user.last_name,
                            )}
                          </AvatarFallback>
                        </Avatar>
                        {conversation.unread_count > 0 && (
                          <div className="h-2 w-2 rounded-full bg-primary"></div>
                        )}
                        <Typography className="font-medium text-sm">
                          {conversation.other_user.first_name}{' '}
                          {conversation.other_user.last_name}
                        </Typography>
                      </div>
                      {conversation.last_message && (
                        <Typography className="text-xs text-muted-foreground">
                          {format(
                            new Date(conversation.last_message.created_at),
                            'MMM d, yyyy',
                          )}
                        </Typography>
                      )}
                    </div>
                    <Typography className="text-sm text-muted-foreground line-clamp-2 ml-8">
                      {getLastMessageDisplay(conversation.last_message)}
                    </Typography>
                  </div>
                </Link>
              ))
            ) : (
              <div className="py-4 text-center text-muted-foreground">
                No recent conversations
              </div>
            )}
          </div>
        </WidgetCard>

        <WidgetCard
          title="Refunds"
          count={totalRefunds}
          description={`${pendingRefunds} pending refund`}
          icon={<RefreshCwIcon className="h-5 w-5" />}
          countColor="text-primary"
          viewAllLink="/dashboard/refunds"
          viewAllText="View all refunds"
        >
          <div className="space-y-4">
            {refunds.map((refund) => (
              <div key={refund.id} className="p-3 bg-muted/30 rounded-lg">
                <div className="flex justify-between items-center mb-1">
                  <Typography className="font-medium">
                    ${refund.amount.toFixed(2)}
                  </Typography>
                  <div
                    className={cn(
                      'text-xs px-2 py-0.5 rounded-full',
                      refund.status === 'completed'
                        ? 'bg-emerald-100 text-emerald-800'
                        : 'bg-amber-100 text-amber-800',
                    )}
                  >
                    {refund.status === 'completed'
                      ? 'Refund Completed'
                      : 'Pending Refund'}
                  </div>
                </div>
                <Typography className="text-sm text-muted-foreground">
                  {refund.description}
                </Typography>
                <Typography className="text-xs text-muted-foreground">
                  {format(new Date(refund.createdAt), 'MMM d, yyyy')}
                </Typography>
              </div>
            ))}
          </div>
        </WidgetCard>
      </div>
    </div>
  );
}

// Stat Card component
function StatCard({
  title,
  value,
  description,
  icon,
  valueColor = 'text-primary',
}: {
  title: string;
  value: string;
  description?: string;
  icon?: React.ReactNode;
  valueColor?: string;
}) {
  return (
    <div className="bg-white p-6 rounded-lg border shadow-sm">
      <div className="flex justify-between items-start mb-3">
        <Typography className="text-base font-medium">{title}</Typography>
        <div className="p-2">{icon}</div>
      </div>
      <div className="space-y-1">
        <Typography className="text-muted-foreground text-sm">
          {description}
        </Typography>
        <Typography className={`text-2xl font-bold ${valueColor}`}>
          {value}
        </Typography>
      </div>
    </div>
  );
}

// Widget Card component
function WidgetCard({
  title,
  count,
  description,
  icon,
  children,
  countColor = 'text-primary',
  viewAllLink,
  viewAllText,
}: {
  title: string;
  count: number;
  description?: string;
  icon?: React.ReactNode;
  children?: React.ReactNode;
  countColor?: string;
  viewAllLink?: string;
  viewAllText?: string;
}) {
  return (
    <div className="flex flex-col space-y-4">
      {/* Top card with count */}
      <div className="bg-white p-6 rounded-lg border shadow-sm">
        <div className="flex justify-between items-start mb-2">
          <Typography className="text-base font-medium">{title}</Typography>
          <div className="p-2">{icon}</div>
        </div>
        <Typography className="text-muted-foreground text-sm">
          {description}
        </Typography>
        <Typography className={`text-2xl font-bold ${countColor}`}>
          {count}
        </Typography>
      </div>

      {/* Bottom card with content */}
      <div className="flex-1 flex flex-col justify-between bg-white p-4 rounded-lg border shadow-sm">
        {children}

        {viewAllLink && (
          <div className="mt-4">
            <Link href={viewAllLink}>
              <Button className="w-full">{viewAllText || 'View all'}</Button>
            </Link>
          </div>
        )}
      </div>
    </div>
  );
}
