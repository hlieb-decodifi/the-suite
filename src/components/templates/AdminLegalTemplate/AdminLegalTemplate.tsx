"use client";
import React, { useState } from 'react';
import { Typography } from '@/components/ui/typography';
import TiptapLegalEditor from './TiptapLegalEditor';
// updateLegalDocument will be passed as a prop

import type { LegalDoc } from '@/types/legal_documents';
type AdminLegalTemplateProps = {
  initialTerms: LegalDoc;
  initialPrivacy: LegalDoc;
  updateLegalDocument: (type: 'terms' | 'privacy', content: string, effectiveDate: string) => Promise<boolean>;
};

function AdminLegalTemplate({
  initialTerms,
  initialPrivacy,
  updateLegalDocument,
}: AdminLegalTemplateProps) {
  const [activeTab, setActiveTab] = useState<'terms' | 'privacy'>('terms');
  const [content, setContent] = useState(initialTerms.content);
  const [effectiveDate, setEffectiveDate] = useState(initialTerms.effectiveDate);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState('');

  // Switch content/effectiveDate when tab changes
  React.useEffect(() => {
    if (activeTab === 'terms') {
      setContent(initialTerms.content);
      setEffectiveDate(initialTerms.effectiveDate);
    } else {
      setContent(initialPrivacy.content);
      setEffectiveDate(initialPrivacy.effectiveDate);
    }
    setError('');
  }, [activeTab, initialTerms, initialPrivacy]);

  const handleSave = async () => {
    setSaving(true);
    setError('');
    try {
      const success = await updateLegalDocument(activeTab, content, effectiveDate);
      if (!success) throw new Error();
    } catch {
      setError('Failed to save document.');
    }
    setSaving(false);
  };

  return (
    <div className="p-4 w-full">
      <Typography variant="h3" className="mb-4">Legal Documents</Typography>
      <div className="flex gap-2 mb-6">
        <button
          className={`px-4 py-2 rounded ${activeTab === 'terms' ? 'bg-primary text-white' : 'bg-muted'}`}
          onClick={() => setActiveTab('terms')}
        >Terms & Conditions</button>
        <button
          className={`px-4 py-2 rounded ${activeTab === 'privacy' ? 'bg-primary text-white' : 'bg-muted'}`}
          onClick={() => setActiveTab('privacy')}
        >Privacy Policy</button>
      </div>
      <>
        <div className="mb-4">
          <label className="block mb-1 font-medium">Effective Date</label>
          <input
            type="date"
            value={effectiveDate}
            onChange={e => setEffectiveDate(e.target.value)}
            className="border rounded px-2 py-1"
          />
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
        >{saving ? 'Saving...' : 'Save'}</button>
      </>
    </div>
  );
}

export default AdminLegalTemplate;

