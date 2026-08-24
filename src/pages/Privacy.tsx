import { Link } from 'react-router-dom';
import { ISSUES_URL, PRIVACY_UPDATED, SUPPORT_EMAIL } from '../data/contact';

/**
 * Privacy policy.
 *
 * Written from what the code actually does, checked against it, and specific
 * enough to be falsifiable — every claim here names the file or the table it
 * comes from, because a policy that overstates is worse than none at all.
 *
 * Required by App Store guideline 5.1.1(i) and by Google Play. It has to be
 * reachable inside the app, which is why it is a route and is linked from the
 * support page and the footer rather than living only on a marketing site.
 */
export default function Privacy() {
  return (
    <div className="sect prose">
      <h1 className="d2">Privacy</h1>
      <p className="mut">Last updated {PRIVACY_UPDATED}.</p>

      <p className="lede">
        This app has no analytics, no advertising network and no tracking. It
        does have accounts now — that is the one thing about you it keeps, and
        it is set out first below. Most of what the app does still happens on
        your device and never reaches a server at all. What follows is the
        whole of it.
      </p>

      <h3>Your account</h3>
      <p>
        Using the guide needs an account. Creating one stores your{' '}
        <strong>email address</strong> and a{' '}
        <strong>one-way hash of your password</strong> — a hash, not the
        password, so nobody here can read it, tell it to you, or hand it over.
        Alongside that we keep only what you choose to set: a display name if
        you enter one, a home spot if you pick one, whether you want feet or
        metres, and whether you want the occasional email about new content.
      </p>
      <p>
        That is the complete list. No name is required, no phone number is
        asked for, no address, no payment details, no date of birth. Your email
        is used to sign you in, to reset your password, and — only if you tick
        the box — to tell you when spots or species are added. It is never sold,
        never rented, and never handed to an advertiser.
      </p>
      <p>
        <strong>You can delete the account from inside the app</strong>, on your
        settings page, without asking anyone. It removes the account and
        everything attached to it, immediately and for good. There is no
        thirty-day window, no reactivation and nothing kept back.
      </p>
      <p className="mut">
        Sign-in is handled by Supabase, which hosts the database. They process
        your email and password hash on our behalf to make sign-in work.
      </p>

      <h3>Your location never leaves your device</h3>
      <p>
        If you allow location access, your position is used on your phone to
        measure how far away each fishing spot and bait shop is. That is
        arithmetic against data already stored in the app.
      </p>
      <p>
        <strong>No request this app makes carries your coordinates.</strong> We
        do not store your location, we do not send it anywhere, and there is
        nothing for us to hand over because it never arrives. Ranking works
        with the network switched off entirely.
      </p>
      <p className="mut">
        You are never asked for location automatically. Nothing happens until
        you press the button, and refusing costs you nothing but the sorting.
      </p>

      <h3>Photos you send to the fish identifier</h3>
      <p>
        If you photograph a fish for identification, the picture is resized on
        your device and sent to our server, which passes it to Anthropic&rsquo;s
        Claude API to produce an estimate.
      </p>
      <p>
        <strong>The photo is never stored.</strong> Not in a file store, not in
        a database, not in a log. It exists in memory for the length of one
        request and is then gone. There is no photo history, and no way for us
        to look at what you sent, because there is nothing kept.
      </p>
      <p>
        Anthropic processes the image to answer the request. We do not send
        your name, your email, your account id or your location with it. The
        request carries the photo and nothing that identifies you.
      </p>

      <h3>What the identifier does record</h3>
      <p>
        The identifier costs real money per use, so it is rate limited. To do
        that we record, for each request, a <strong>salted HMAC-SHA256 hash of
        your IP address</strong> and a timestamp. The IP itself is hashed in
        memory and discarded — it is never written down. The hash cannot be
        reversed to an address without a secret key that is not in this app.
      </p>
      <p>
        <strong>Those rows are deleted after two days.</strong> They exist to
        count requests, not to recognise people, and an IP is not an identity —
        several people on the same network share one.
      </p>

      <h3>Things stored on your device only</h3>
      <p>
        The app keeps a few small preferences in your browser&rsquo;s local
        storage: your light or dark theme choice, and a cached copy of the bait
        shop listings so the directory still works offline. These stay on your
        device. Clearing your browser data removes them.
      </p>

      <h3>Other people&rsquo;s servers</h3>
      <p>Using the app makes ordinary web requests to a few third parties:</p>
      <ul className="bullets">
        <li>
          <strong>Map tiles</strong> come from OpenStreetMap and Esri. When a
          map is drawn, those services receive your IP address and which part
          of the map you are looking at, as any image request does.
        </li>
        <li>
          <strong>Cached tide and weather</strong> are read from Supabase, which
          hosts our data. Their servers log requests as any server does.
        </li>
        <li>
          <strong>Hosting</strong> is GitHub Pages, which serves the app itself.
        </li>
      </ul>
      <p className="mut">
        We do not control what those companies log, and we do not receive it.
        The underlying tide predictions come from NOAA and the forecasts from
        the National Weather Service; the app reads them from our cache, so you
        are not contacting them directly.
      </p>

      <h3>What we do not do</h3>
      <ul className="bullets">
        <li>
          An account, which is an email address and a password hash. Nothing
          else about you is required, and you can delete it yourself.
        </li>
        <li>No analytics, no tracking pixels, no advertising network.</li>
        <li>No selling or sharing of anything, because there is nothing to sell.</li>
        <li>No location history. No photo history. No search history.</li>
      </ul>
      <p>
        Bait shops can pay to stand out in the directory. That is an
        arrangement between us and the shop — it involves no data about you,
        and paid placement always says that it is paid.
      </p>

      <h3>Children</h3>
      <p>
        The app is a fishing reference. It is not directed at children and
        collects nothing that would identify one, or anyone else.
      </p>

      <h3>Changes</h3>
      <p>
        If this changes, the date at the top changes with it. Because the app
        holds nothing about you, there is no historic data for a future policy
        to apply to.
      </p>

      <h3>Asking us about it</h3>
      <p>
        {SUPPORT_EMAIL ? (
          <>Email <a href={`mailto:${SUPPORT_EMAIL}`}>{SUPPORT_EMAIL}</a>, or open an issue on{' '}</>
        ) : (
          <>Open an issue on{' '}</>
        )}
        <a href={ISSUES_URL} target="_blank" rel="noreferrer">GitHub ↗</a>. See
        also <Link to="/support">Support</Link>.
      </p>
      <p className="mut xs">
        A data request is the one thing we cannot usefully answer: we have no
        record of you to produce, correct or delete.
      </p>
    </div>
  );
}
