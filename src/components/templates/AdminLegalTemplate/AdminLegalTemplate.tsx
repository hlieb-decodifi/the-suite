import React, { useEffect, useState } from 'react';
import { Typography } from '@/components/ui/typography';
import TiptapLegalEditor from './TiptapLegalEditor';
import { fetchLegalDocument, saveLegalDocument } from './legalApi';

export default function AdminLegalTemplate() {
  const [activeTab, setActiveTab] = useState<'terms' | 'privacy'>('terms');
  const [content, setContent] = useState(''); // HTML string
  const [effectiveDate, setEffectiveDate] = useState('');
  const [loading, setLoading] = useState(false);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState('');

  useEffect(() => {
    setLoading(true);
    fetchLegalDocument(activeTab)
      .then(doc => {
        setContent(doc.content || '');
        // Ensure date is in YYYY-MM-DD format
        const formatDate = (dateStr: string) => {
          if (!dateStr) return new Date().toISOString().slice(0, 10);
          const d = new Date(dateStr);
          if (isNaN(d.getTime())) return new Date().toISOString().slice(0, 10);
          return d.toISOString().slice(0, 10);
        };
        setEffectiveDate(formatDate(doc.effectiveDate));
        setError('');
      })
      .catch(() => setError('Failed to fetch document.'))
      .finally(() => setLoading(false));
  }, [activeTab]);

  const handleSave = async () => {
    setSaving(true);
    setError('');
    try {
      await saveLegalDocument(activeTab, content, effectiveDate);
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
      {loading ? (
        <div>Loading...</div>
      ) : (
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
      )}
    </div>
  );
}
