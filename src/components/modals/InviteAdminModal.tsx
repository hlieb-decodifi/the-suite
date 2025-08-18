
import React, { useState } from 'react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
} from '@/components/ui/dialog';

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

  const handleInvite = async (e?: React.FormEvent) => {
    if (e) e.preventDefault();
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

  return (
    <Dialog open={isOpen} onOpenChange={onClose}>
      <DialogContent className="max-w-md">
        <DialogHeader>
          <DialogTitle>Invite New Admin</DialogTitle>
        </DialogHeader>
        {success ? (
          <div className="flex flex-col items-center justify-center py-8 text-center">
            <div className="h-12 w-12 rounded-full bg-green-100 flex items-center justify-center mb-4">
              <span className="text-green-600 text-2xl">✓</span>
            </div>
            <h3 className="text-lg font-medium">Invitation sent!</h3>
            <p className="text-sm text-muted-foreground mt-2">The admin has been invited successfully.</p>
          </div>
        ) : (
          <form onSubmit={handleInvite} className="space-y-4">
            <div className="space-y-2">
              <Label htmlFor="invite-admin-email">Admin Email <span className="text-destructive">*</span></Label>
              <Input
                id="invite-admin-email"
                type="email"
                placeholder="admin@email.com"
                value={email}
                onChange={e => setEmail(e.target.value)}
                required
                disabled={loading}
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="invite-admin-firstname">First Name</Label>
              <Input
                id="invite-admin-firstname"
                type="text"
                placeholder="First Name"
                value={firstName}
                onChange={e => setFirstName(e.target.value)}
                disabled={loading}
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="invite-admin-lastname">Last Name</Label>
              <Input
                id="invite-admin-lastname"
                type="text"
                placeholder="Last Name"
                value={lastName}
                onChange={e => setLastName(e.target.value)}
                disabled={loading}
              />
            </div>
            {error && <div className="text-destructive text-sm mt-2">{error}</div>}
            <DialogFooter className="mt-4">
              <Button type="button" variant="outline" onClick={onClose} disabled={loading}>
                Cancel
              </Button>
              <Button type="submit" disabled={loading || !email}>
                {loading ? 'Inviting...' : 'Send Invite'}
              </Button>
            </DialogFooter>
          </form>
        )}
      </DialogContent>
    </Dialog>
  );
}
