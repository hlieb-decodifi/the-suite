import React from 'react'
import { BookingsActivityWidget } from '@/components/templates/AdminDashboardTemplate'
// Add other widgets as needed

export function AdminDashboardPage() {
  // In the future, receive data via props or context
  // For now, render placeholder widgets
  return (
    <>
      <BookingsActivityWidget totalBookings={0} bookingsPerDay={{}} />
      {/* Add other widgets here, e.g. <ClientsWidget />, <ProfessionalsWidget />, etc. */}
    </>
  )
} 