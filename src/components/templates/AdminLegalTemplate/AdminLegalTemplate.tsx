'use client';
import React, { useState } from 'react';
import { Typography } from '@/components/ui/typography';
import { useToast } from '@/components/ui/use-toast';
import TiptapLegalEditor from './TiptapLegalEditor';
// updateLegalDocument will be passed as a prop

import type { LegalDoc } from '@/types/legal_documents';
type AdminLegalTemplateProps = {
  initialTerms: LegalDoc;
  initialPrivacy: LegalDoc;
  initialCopyright: LegalDoc;
  updateLegalDocument: (
    type: 'terms' | 'privacy' | 'copyright',
    content: string,
    effectiveDate: string,
  ) => Promise<boolean>;
};

// Helper function to format date for input
function formatDateForInput(dateString: string): string {
  if (!dateString) return '';

  try {
    // If it's already in YYYY-MM-DD format, return as is
    if (/^\d{4}-\d{2}-\d{2}$/.test(dateString)) {
      return dateString;
    }

    // Otherwise, parse and format
    const date = new Date(dateString);
    if (isNaN(date.getTime())) return '';

    return date.toISOString().slice(0, 10);
  } catch {
    return '';
  }
}

function AdminLegalTemplate({
  initialTerms,
  initialPrivacy,
  initialCopyright,
  updateLegalDocument,
}: AdminLegalTemplateProps) {
  const { toast } = useToast();
  const [activeTab, setActiveTab] = useState<'terms' | 'privacy' | 'copyright'>(
    'terms',
  );
  console.log(
    'activeTab',
    initialTerms.effectiveDate,
    initialPrivacy.effectiveDate,
    initialCopyright.effectiveDate,
  );
  const [content, setContent] = useState(initialTerms.content);
  const [effectiveDate, setEffectiveDate] = useState(
    formatDateForInput(initialTerms.effectiveDate),
  );
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState('');

  // Switch content/effectiveDate when tab changes
  React.useEffect(() => {
    if (activeTab === 'terms') {
      setContent(initialTerms.content);
      setEffectiveDate(formatDateForInput(initialTerms.effectiveDate));
    } else if (activeTab === 'privacy') {
      setContent(initialPrivacy.content);
      setEffectiveDate(formatDateForInput(initialPrivacy.effectiveDate));
    } else {
      setContent(initialCopyright.content);
      setEffectiveDate(formatDateForInput(initialCopyright.effectiveDate));
    }
    setError('');
  }, [activeTab, initialTerms, initialPrivacy, initialCopyright]);

  const handleSave = async () => {
    setSaving(true);
    setError('');
    try {
      const isSuccess = await updateLegalDocument(
        activeTab,
        content,
        effectiveDate,
      );
      if (!isSuccess) throw new Error();

      const documentName =
        activeTab === 'terms'
          ? 'Terms & Conditions'
          : activeTab === 'privacy'
            ? 'Privacy Policy'
            : 'Copyright Policy';
      toast({
        title: 'Document Saved Successfully!',
        description: `${documentName} has been updated and published. All related pages have been refreshed.`,
      });
    } catch {
      setError('Failed to save document.');
    }
    setSaving(false);
  };

  return (
    <div className="p-4 w-full">
      <Typography variant="h3" className="mb-4">
        Legal Documents
      </Typography>
      <div className="flex gap-2 mb-6">
        <button
          className={`px-4 py-2 rounded ${activeTab === 'terms' ? 'bg-primary text-white' : 'bg-muted'}`}
          onClick={() => setActiveTab('terms')}
        >
          Terms & Conditions
        </button>
        <button
          className={`px-4 py-2 rounded ${activeTab === 'privacy' ? 'bg-primary text-white' : 'bg-muted'}`}
          onClick={() => setActiveTab('privacy')}
        >
          Privacy Policy
        </button>
        <button
          className={`px-4 py-2 rounded ${activeTab === 'copyright' ? 'bg-primary text-white' : 'bg-muted'}`}
          onClick={() => setActiveTab('copyright')}
        >
          Copyright Policy
        </button>
      </div>
      <>
        <div className="mb-4">
          <label className="block mb-2 font-medium">Effective Date</label>
          <div className="flex items-center gap-2">
            <input
              type="date"
              value={effectiveDate}
              onChange={(e) => setEffectiveDate(e.target.value)}
              className="border border-border rounded px-3 py-2 max-w-sm focus:outline-none focus:ring-2 focus:ring-primary focus:border-transparent"
            />
            {effectiveDate && (
              <button
                type="button"
                onClick={() => setEffectiveDate('')}
                className="px-3 py-2 text-sm text-muted-foreground hover:text-destructive border border-border rounded transition-colors"
              >
                Clear
              </button>
            )}
          </div>
          <Typography variant="small" className="text-muted-foreground mt-1">
            Leave blank if there is no effective date
          </Typography>
        </div>
        <div className="mb-4">
          <label className="block mb-1 font-medium">Document Content</label>
          <TiptapLegalEditor value={content} onChange={setContent} />
        </div>
        {error && <div className="text-red-500 mb-2">{error}</div>}
        <button
          onClick={handleSave}
          disabled={saving}
          className="bg-primary text-white px-4 py-2 rounded"
        >
          {saving ? 'Saving...' : 'Save'}
        </button>
      </>
    </div>
  );
}

export default AdminLegalTemplate;
