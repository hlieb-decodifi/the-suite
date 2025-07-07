import Link from 'next/link';
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from '@/components/ui/card';
import { Mail, Palette, CheckCircle, Send } from 'lucide-react';
import { BrevoTemplateTester } from './brevo-template-tester';

export default function DevPage() {
  return (
    <div className="space-y-6">
      <div className="text-center">
        <h1 className="text-3xl font-bold text-gray-900 mb-4">
          Development Tools
        </h1>
        <p className="text-lg text-gray-600 max-w-2xl mx-auto">
          Access development tools for previewing templates, testing components,
          and ensuring quality across The Suite platform.
        </p>
      </div>

      <div className="grid gap-6 md:grid-cols-2 lg:grid-cols-3">
        <Link href="/dev/email-preview">
          <Card className="transition-all hover:shadow-lg hover:scale-105 cursor-pointer">
            <CardHeader>
              <div className="flex items-center gap-3">
                <div className="p-2 bg-amber-100 rounded-lg">
                  <Mail className="h-6 w-6 text-amber-600" />
                </div>
                <div>
                  <CardTitle className="text-lg">Email Templates</CardTitle>
                  <CardDescription>Preview all email templates</CardDescription>
                </div>
              </div>
            </CardHeader>
            <CardContent>
              <p className="text-sm text-gray-600 mb-4">
                Preview all 18 standardized email templates with dummy data.
                View both HTML and text versions.
              </p>
              <div className="flex items-center gap-2 text-sm text-green-600">
                <CheckCircle className="h-4 w-4" />
                <span>Standardized & Accessible</span>
              </div>
            </CardContent>
          </Card>
        </Link>

        <Card>
          <CardHeader>
            <div className="flex items-center gap-3">
              <div className="p-2 bg-blue-100 rounded-lg">
                <Send className="h-6 w-6 text-blue-600" />
              </div>
              <div>
                <CardTitle className="text-lg">Brevo Template Tester</CardTitle>
                <CardDescription>Test Brevo email templates</CardDescription>
              </div>
            </div>
          </CardHeader>
          <CardContent>
            <div className="space-y-4">
              <div>
                <p className="text-sm text-gray-600 mb-2">
                  Send test emails using Brevo templates with dynamic variables
                </p>
                <p className="text-xs text-gray-500">
                  Select a template and provide recipient email to test the
                  email delivery
                </p>
              </div>
              <div className="bg-gray-50 p-3 rounded-md">
                <p className="text-xs text-gray-500 mb-2">
                  Required Environment Variable:
                </p>
                <code className="text-xs font-mono bg-gray-100 px-2 py-1 rounded">
                  BREVO_API_KEY
                </code>
              </div>
              <BrevoTemplateTester />
            </div>
          </CardContent>
        </Card>

        <Card className="opacity-50">
          <CardHeader>
            <div className="flex items-center gap-3">
              <div className="p-2 bg-gray-100 rounded-lg">
                <Palette className="h-6 w-6 text-gray-600" />
              </div>
              <div>
                <CardTitle className="text-lg">UI Components</CardTitle>
                <CardDescription>Component library preview</CardDescription>
              </div>
            </div>
          </CardHeader>
          <CardContent>
            <p className="text-sm text-gray-600 mb-4">
              Preview and test UI components with different states and
              configurations.
            </p>
            <div className="text-sm text-gray-500">Coming soon...</div>
          </CardContent>
        </Card>

        <Card className="opacity-50">
          <CardHeader>
            <div className="flex items-center gap-3">
              <div className="p-2 bg-gray-100 rounded-lg">
                <CheckCircle className="h-6 w-6 text-gray-600" />
              </div>
              <div>
                <CardTitle className="text-lg">API Testing</CardTitle>
                <CardDescription>Test API endpoints</CardDescription>
              </div>
            </div>
          </CardHeader>
          <CardContent>
            <p className="text-sm text-gray-600 mb-4">
              Test various API endpoints with sample data and view responses.
            </p>
            <div className="text-sm text-gray-500">Coming soon...</div>
          </CardContent>
        </Card>
      </div>

      <div className="bg-white rounded-lg border p-6">
        <h2 className="text-xl font-semibold text-gray-900 mb-4">
          Email Template Standards
        </h2>
        <div className="grid gap-6 md:grid-cols-2">
          <div>
            <h3 className="font-medium text-gray-900 mb-3">
              Brand Colors Applied
            </h3>
            <div className="space-y-2 text-sm">
              <div className="flex items-center gap-3">
                <div className="w-4 h-4 rounded-full bg-[#dea85b]"></div>
                <span className="text-gray-700">
                  Primary Gold (#dea85b) - Buttons, highlights, accents
                </span>
              </div>
              <div className="flex items-center gap-3">
                <div className="w-4 h-4 rounded-full bg-[#313131]"></div>
                <span className="text-gray-700">
                  Text Dark (#313131) - Main content text
                </span>
              </div>
              <div className="flex items-center gap-3">
                <div className="w-4 h-4 rounded-full bg-[#5d6c6f]"></div>
                <span className="text-gray-700">
                  Text Muted (#5d6c6f) - Secondary text
                </span>
              </div>
              <div className="flex items-center gap-3">
                <div className="w-4 h-4 rounded-full bg-[#f5f5f5]"></div>
                <span className="text-gray-700">
                  Background Light (#f5f5f5) - Card backgrounds
                </span>
              </div>
            </div>
          </div>

          <div>
            <h3 className="font-medium text-gray-900 mb-3">
              Features Implemented
            </h3>
            <ul className="space-y-1 text-sm text-gray-700">
              <li className="flex items-center gap-2">
                <CheckCircle className="h-4 w-4 text-green-500" />
                <span>18 templates standardized</span>
              </li>
              <li className="flex items-center gap-2">
                <CheckCircle className="h-4 w-4 text-green-500" />
                <span>Consistent brand colors</span>
              </li>
              <li className="flex items-center gap-2">
                <CheckCircle className="h-4 w-4 text-green-500" />
                <span>Email-safe font stacks</span>
              </li>
              <li className="flex items-center gap-2">
                <CheckCircle className="h-4 w-4 text-green-500" />
                <span>Mobile-responsive design</span>
              </li>
              <li className="flex items-center gap-2">
                <CheckCircle className="h-4 w-4 text-green-500" />
                <span>Accessible contrast ratios</span>
              </li>
              <li className="flex items-center gap-2">
                <CheckCircle className="h-4 w-4 text-green-500" />
                <span>Professional styling</span>
              </li>
            </ul>
          </div>
        </div>
      </div>
    </div>
  );
}
