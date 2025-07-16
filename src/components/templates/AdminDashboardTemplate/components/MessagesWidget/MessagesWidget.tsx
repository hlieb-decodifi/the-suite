import React from 'react'

type MessagesWidgetProps = {
  totalChats: number
}

export function MessagesWidget({ totalChats }: MessagesWidgetProps) {
  return (
    <div className="bg-card border rounded-lg shadow-sm p-4">
      <h2 className="text-lg font-semibold mb-2">Messages</h2>
      <div>Total chats: {totalChats}</div>
    </div>
  )
} 