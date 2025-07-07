import { PropsWithChildren } from 'react';
import Link from 'next/link';

export default function DevLayout({ children }: PropsWithChildren) {
  return (
    <div className="min-h-screen bg-gray-50">
      <div className="border-b bg-white">
        <div className="mx-auto max-w-7xl px-4 py-4">
          <div className="flex items-center justify-between">
            <div>
              <Link
                href="/dev"
                className="text-2xl font-bold text-gray-900 hover:text-amber-600 transition-colors"
              >
                The Suite - Development Tools
              </Link>
              <p className="text-gray-600 mt-1">
                Preview and test various components and templates
              </p>
            </div>
            <nav className="flex items-center space-x-4">
              <Link
                href="/dev/email-preview"
                className="text-gray-700 hover:text-amber-600 font-medium transition-colors"
              >
                Email Templates
              </Link>
              <Link
                href="/"
                className="bg-amber-500 hover:bg-amber-600 text-white px-4 py-2 rounded-md font-medium transition-colors"
              >
                Back to App
              </Link>
            </nav>
          </div>
        </div>
      </div>

      <div className="mx-auto max-w-7xl p-4">{children}</div>
    </div>
  );
}
