import React from 'react'

type RefundsWidgetProps = {
  totalRefunds: number
}

export function RefundsWidget({ totalRefunds }: RefundsWidgetProps) {
  return (
    <div className="bg-card border rounded-lg shadow-sm p-4">
      <h2 className="text-lg font-semibold mb-2">Refunds</h2>
      <div>Total refund requests (last 30 days): {totalRefunds}</div>
    </div>
  )
} 