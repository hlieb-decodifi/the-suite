export async function fetchLegalDocument(type: 'terms' | 'privacy') {
  const res = await fetch(`/api/legal_documents?type=${type}`);
  if (!res.ok) throw new Error('Failed to fetch document');
  const doc = await res.json();
  return {
    content: doc.content,
    effectiveDate: doc.effective_date || new Date().toISOString().slice(0, 10),
  };
}

export async function saveLegalDocument(type: 'terms' | 'privacy', content: string, effectiveDate: string) {
  const res = await fetch('/api/legal_documents', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ type, content, effectiveDate }),
  });
  if (!res.ok) throw new Error('Failed to save document');
  return true;
}
