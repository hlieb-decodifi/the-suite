'use client';

import { useEffect, useState } from 'react';
import { useAuthStore } from '@/stores/authStore';
import { useProfile, useSetCookieConsent } from '@/api/profiles/hooks';
import { Button } from '@/components/ui/button';
import { COOKIE_CONSENT_TEXT } from './constants';
import { getLocalConsent, setLocalConsent } from './helpers';
import type { CookieConsentProps } from './types';
import Link from 'next/link';

export function CookieConsent({ open, onConsentGiven }: CookieConsentProps) {
  const { user } = useAuthStore();
  const userId = user?.id;
  const { data: profile } = useProfile(userId || '');
  const setCookieConsentMutation = useSetCookieConsent();

  // Local state to control popup visibility
  const [show, setShow] = useState(false);

  // Determine if consent has been given (DB for logged in, local for guests)
  const consentGiven =
    typeof open === 'boolean'
      ? !open
      : userId
      ? profile?.cookieConsent
      : getLocalConsent();

  // Show popup if consent not given
  useEffect(() => {
    if (typeof open === 'boolean') {
      setShow(open);
    } else {
      setShow(!consentGiven);
    }
  }, [open, consentGiven]);

  // If user logs in and had previously given local consent, sync to DB
  useEffect(() => {
    if (userId && getLocalConsent() && !profile?.cookieConsent) {
      setCookieConsentMutation.mutate({ userId, consent: true });
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [userId, profile?.cookieConsent]);

  const handleAccept = () => {
    if (userId) {
      setCookieConsentMutation.mutate({ userId, consent: true }, {
        onSuccess: () => {
          setShow(false);
          onConsentGiven?.();
        },
      });
    } else {
      setLocalConsent(true);
      setShow(false);
      onConsentGiven?.();
    }
  };

  if (!show) return null;

  return (
    <div className="fixed bottom-4 left-0 right-0 z-50 flex justify-center pointer-events-none">
      <div className="bg-white border border-gray-200 shadow-lg rounded-lg p-6 max-w-md w-full flex flex-col gap-4 pointer-events-auto">
        <div>
          <h2 className="text-lg font-semibold mb-1">{COOKIE_CONSENT_TEXT.title}</h2>
          <p className="text-sm text-gray-700">{COOKIE_CONSENT_TEXT.description}</p>
        </div>
        <div className="flex gap-2 justify-end">
          <Button variant="default" onClick={handleAccept} data-testid="cookie-consent-accept">
            {COOKIE_CONSENT_TEXT.accept}
          </Button>
          <Link href={COOKIE_CONSENT_TEXT.learnMoreUrl} target="_blank" rel="noopener noreferrer">
            <Button variant="outline" type="button">
              {COOKIE_CONSENT_TEXT.learnMore}
            </Button>
          </Link>
        </div>
      </div>
    </div>
  );
} 