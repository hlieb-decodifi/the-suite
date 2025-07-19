export type CookieConsentProps = {
  /**
   * If provided, overrides the default logic and forces the popup to show or hide.
   */
  open?: boolean;
  /**
   * Optional callback when consent is given.
   */
  onConsentGiven?: () => void;
}; 