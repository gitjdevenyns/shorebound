/**
 * Where a reader reaches a human.
 *
 * Apple requires a working support contact (guideline 1.5) and a privacy
 * policy reachable inside the app as well as in App Store Connect (5.1.1(i)).
 * Google Play requires a privacy policy URL too.
 *
 * SUPPORT_EMAIL is deliberately null until the domain exists. A support page
 * that prints an address nobody can receive mail at is worse than one that
 * says "use this instead" — so the UI branches on null rather than rendering a
 * dead mailto. Set it in one place here when the rename lands.
 */
export const SUPPORT_EMAIL: string | null = null;

/** Works today, and stays useful after the rename. */
export const ISSUES_URL = 'https://github.com/gitjdevenyns/GCF/issues';

/** Last substantive change to the privacy policy. Shown on the page. */
export const PRIVACY_UPDATED = '22 August 2026';
