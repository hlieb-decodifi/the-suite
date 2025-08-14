
import React, { useState } from 'react';

type InviteAdminModalProps = {
  isOpen: boolean;
  onClose: () => void;
  onInvited?: () => void;
};

export default function InviteAdminModal({ isOpen, onClose, onInvited }: InviteAdminModalProps) {
  const [email, setEmail] = useState('');
  const [firstName, setFirstName] = useState('');
  const [lastName, setLastName] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState(false);

  // Reset state when modal is closed
  React.useEffect(() => {
    if (!isOpen) {
      setEmail('');
      setFirstName('');
      setLastName('');
      setError(null);
      setSuccess(false);
      setLoading(false);
    }
  }, [isOpen]);

  const handleInvite = async () => {
    setLoading(true);
    setError(null);
    setSuccess(false);
    try {
      const res = await fetch('/api/auth/invite-admin', {
        method: 'POST',
        body: JSON.stringify({ email, firstName, lastName }),
        headers: { 'Content-Type': 'application/json' },
      });
      const result = await res.json();
      if (result.success) {
        setSuccess(true);
        if (onInvited) onInvited();
      } else {
        setError(result.error || 'Failed to invite admin.');
      }
    } catch {
      setError('Network error.');
    }
    setLoading(false);
  };

  if (!isOpen) return null;
  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black bg-opacity-50">
      <div className="bg-white p-6 rounded shadow-lg w-full max-w-md">
        <h2 className="text-xl font-bold mb-4">Invite New Admin</h2>
        {success ? (
          <div className="text-green-600 mb-4">Invitation sent!</div>
        ) : (
          <>
            <input
              type="email"
              placeholder="Admin Email"
              value={email}
              onChange={e => setEmail(e.target.value)}
              required
              className="w-full mb-2 p-2 border rounded"
            />
            <input
              type="text"
              placeholder="First Name"
              value={firstName}
              onChange={e => setFirstName(e.target.value)}
              className="w-full mb-2 p-2 border rounded"
            />
            <input
              type="text"
              placeholder="Last Name"
              value={lastName}
              onChange={e => setLastName(e.target.value)}
              className="w-full mb-2 p-2 border rounded"
            />
            {error && <div className="text-red-600 mb-2">{error}</div>}
            <button onClick={handleInvite} disabled={loading} className="bg-blue-600 text-white px-4 py-2 rounded mr-2">
              {loading ? 'Inviting...' : 'Send Invite'}
            </button>
            <button onClick={onClose} className="bg-gray-300 px-4 py-2 rounded">Cancel</button>
          </>
        )}
      </div>
    </div>
  );
}
