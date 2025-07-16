import React from 'react'

type ProfessionalsWidgetProps = {
  totalProfessionals: number
  newProfessionals: number
}

export function ProfessionalsWidget({ totalProfessionals, newProfessionals }: ProfessionalsWidgetProps) {
  return (
    <div className="bg-card border rounded-lg shadow-sm p-4">
      <h2 className="text-lg font-semibold mb-2">Service Professionals</h2>
      <div>Total professionals: {totalProfessionals}</div>
      <div>New professionals (last 30 days): {newProfessionals}</div>
    </div>
  )
} 