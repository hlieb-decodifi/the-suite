import React from 'react'

type AdminDashboardTemplateProps = {
  children?: React.ReactNode
  // Add props for stats/widgets as needed
}

export function AdminDashboardTemplate({ children }: AdminDashboardTemplateProps) {
  return (
    <div className="p-8">
      <h1 className="text-2xl font-bold mb-4">Admin Dashboard</h1>
      <div className="bg-card rounded-lg shadow-sm border p-6">
        <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-6">
          {children || <p className="col-span-full text-center">Welcome, admin! Dashboard content coming soon.</p>}
        </div>
      </div>
    </div>
  )
} 