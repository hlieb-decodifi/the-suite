import { COOKIE_CONSENT_KEY } from './constants';

export function getLocalConsent(): boolean {
  if (typeof window === 'undefined') return false;
  return localStorage.getItem(COOKIE_CONSENT_KEY) === 'true';
}

export function setLocalConsent(value: boolean) {
  if (typeof window === 'undefined') return;
  localStorage.setItem(COOKIE_CONSENT_KEY, value ? 'true' : 'false');
}
