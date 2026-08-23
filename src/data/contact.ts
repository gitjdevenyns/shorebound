/**
 * Where a reader reaches a human.
 *
 * Apple requires a working support contact (guideline 1.5) and a privacy
 * policy reachable inside the app as well as in App Store Connect (5.1.1(i)).
 * Google Play requires a privacy policy URL too.
 *
 * SUPPORT_EMAIL must be a mailbox that actually receives. The UI still
 * branches on null, so setting this back to null is the correct move if the
 * address ever stops working — a support page printing an address nobody
 * reads is worse than one pointing somewhere else.
 */
export const SUPPORT_EMAIL: string | null = 'support@shorebound.app';

/** Works today, and stays useful after the rename. */
export const ISSUES_URL = 'https://github.com/gitjdevenyns/shorebound/issues';

/** Last substantive change to the privacy policy. Shown on the page. */
export const PRIVACY_UPDATED = '22 August 2026';
