'use client';

import { MessageSquare } from 'lucide-react';
import { DashboardTemplateCard } from '../DashboardTemplateCard/DashboardTemplateCard';
import { DashboardTemplateWidget } from '../DashboardTemplateWidget';
import { DashboardTemplateDateTime } from '../DashboardTemplateDateTime';

export type Message = {
  id: string;
  sender: string;
  content: string;
  createdAt: Date;
  isRead: boolean;
};

export type DashboardTemplateMessagesWidgetProps = {
  messages: Message[];
  unreadCount: number;
  isLoading?: boolean;
  onViewAllClick?: () => void;
};

// Loading state for the messages widget
function MessagesLoadingState() {
  return (
    <div className="p-6 space-y-3">
      {[1, 2, 3].map((i) => (
        <div key={i} className="space-y-2">
          <div className="flex justify-between">
            <div className="h-4 w-24 bg-muted/30 animate-pulse rounded" />
            <div className="h-4 w-16 bg-muted/30 animate-pulse rounded" />
          </div>
          <div className="h-12 bg-muted/30 animate-pulse rounded" />
        </div>
      ))}
    </div>
  );
}

// Empty state for the messages widget
function MessagesEmptyState() {
  return (
    <div className="p-6 flex flex-col items-center justify-center h-40">
      <MessageSquare className="h-8 w-8 mb-2 text-muted-foreground" />
      <p className="text-center">No messages yet</p>
      <p className="text-center text-sm text-muted-foreground">
        Messages from clients and professionals will appear here.
      </p>
    </div>
  );
}

// Message item component
function MessageItem({ message }: { message: Message }) {
  return (
    <div className={`p-4 ${!message.isRead ? 'bg-primary/5' : ''}`}>
      <div className="flex justify-between items-center mb-1">
        <div className="font-medium">
          {message.sender}
          {!message.isRead && (
            <span className="ml-2 inline-flex h-2 w-2 rounded-full bg-primary" />
          )}
        </div>
        <DashboardTemplateDateTime
          showIcons
          date={message.createdAt}
          variant="compact"
        />
      </div>
      <p className="text-sm text-muted-foreground line-clamp-2">
        {message.content}
      </p>
    </div>
  );
}

export function DashboardTemplateMessagesWidget({
  messages,
  unreadCount,
  isLoading = false,
  onViewAllClick,
}: DashboardTemplateMessagesWidgetProps) {
  const hasUnreadMessages = unreadCount > 0;

  return (
    <div className="space-y-4">
      {/* Statistics card */}
      <div className="flex items-center justify-between">
        <DashboardTemplateCard
          title="Messages"
          value={unreadCount.toString()}
          description={`${hasUnreadMessages ? 'Unread messages' : 'No unread messages'}`}
          icon={<MessageSquare className="h-5 w-5" />}
          isLoading={isLoading}
          colorVariant={hasUnreadMessages ? 'primary' : 'default'}
          className="flex-1"
        />
      </div>

      {/* Messages widget */}
      <DashboardTemplateWidget
        isLoading={isLoading}
        loadingContent={<MessagesLoadingState />}
        emptyContent={<MessagesEmptyState />}
        isEmpty={messages.length === 0}
        onViewAllClick={onViewAllClick}
        viewAllText="View all messages"
      >
        {messages.slice(0, 2).map((message) => (
          <MessageItem key={message.id} message={message} />
        ))}
      </DashboardTemplateWidget>
    </div>
  );
}
