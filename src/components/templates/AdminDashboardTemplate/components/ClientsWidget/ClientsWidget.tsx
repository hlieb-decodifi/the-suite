import React from 'react'

type ClientsWidgetProps = {
  totalClients: number
  newClients: number
}

export function ClientsWidget({ totalClients, newClients }: ClientsWidgetProps) {
  return (
    <div className="bg-card border rounded-lg shadow-sm p-4">
      <h2 className="text-lg font-semibold mb-2">Clients Registered</h2>
      <div>Total clients: {totalClients}</div>
      <div>New clients (last 30 days): {newClients}</div>
    </div>
  )
} 