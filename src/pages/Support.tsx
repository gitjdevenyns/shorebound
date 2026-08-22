import { Link } from 'react-router-dom';
import { ISSUES_URL, SUPPORT_EMAIL } from '../data/contact';
import { getLocations } from '../lib/api';

/**
 * Support.
 *
 * App Store guideline 1.5 requires an easy way to reach a person. This is also
 * the page that answers the questions the guide's own honesty creates — why a
 * spot has no season note, why the identifier says "I can't tell", why the
 * tide card says predicted rather than measured — because a reader who does
 * not understand those reads them as the app being broken.
 */
export default function Support() {
  const count = getLocations().length;

  return (
    <div className="sect prose">
      <h1 className="d2">Support</h1>

      <p className="lede">
        Something wrong, missing or out of date? Tell us — especially if it is
        about a real place. A closed gate or a wrong phone number is the kind
        of mistake that wastes someone&rsquo;s morning.
      </p>

      <div className="card card-pad">
        <span className="lab">Get in touch</span>
        <p style={{ marginTop: 6 }}>
          {SUPPORT_EMAIL ? (
            <>
              Email <a href={`mailto:${SUPPORT_EMAIL}`}>{SUPPORT_EMAIL}</a>, or
              open an issue on{' '}
            </>
          ) : (
            <>Open an issue on{' '}</>
          )}
          <a href={ISSUES_URL} target="_blank" rel="noreferrer">GitHub ↗</a>.
        </p>
        <p className="mut xs">
          If you are reporting a spot or a shop, the name and what you found
          there is enough. A photo of the sign helps more than anything.
        </p>
      </div>

      <h3>Things that look like bugs and are not</h3>

      <h4>A spot has no season or hours listed</h4>
      <p>
        That field has not been researched yet, and we leave it empty rather
        than filling it with something plausible. Empty means &ldquo;we have
        not checked&rdquo;, never &ldquo;there is nothing to say&rdquo;. Of the{' '}
        {count} spots, some are more complete than others, and we would rather
        show you the gap than paper over it.
      </p>

      <h4>The identifier said it could not tell</h4>
      <p>
        That is the identifier working. It is allowed to say so, and it is
        built to say so whenever it is unsure — a confident wrong answer about
        a fish that can hurt you is far worse than an honest shrug. Anything it
        cannot name is flagged as potentially hazardous for the same reason.
      </p>
      <p>
        It is an <strong>estimate</strong>, every time. Do not use it to decide
        whether something is safe to handle or legal to keep.
      </p>

      <h4>The tide or weather looks wrong</h4>
      <p>
        Everything live in this app is a <strong>prediction</strong> from NOAA
        or a <strong>forecast</strong> from the National Weather Service, never
        a measurement. Wind, rain and pressure push real water around and the
        prediction does not know that. The card says when it was last
        refreshed; if it is stale it says so rather than hiding it.
      </p>

      <h4>Live data is missing</h4>
      <p>
        The guide is designed to be complete with no signal at all — every spot,
        species and rig is on your device. Only tide and weather need the
        network, and when it is gone the app says so instead of showing you
        nothing.
      </p>

      <h4>A bait shop&rsquo;s hours are wrong</h4>
      <p>
        Very possibly. Shop hours are the least reliable thing in the guide,
        and the 2024 storms closed several businesses that still have live
        websites. Where we could not confirm hours first-party, the listing
        says so and tells you to call. If you find one that is wrong or gone,
        that is the single most useful thing you can report.
      </p>

      <h3>Fishing regulations</h3>
      <p>
        This is a field guide, not a legal reference. Sizes, seasons, bag limits
        and licences change, and the only current source is{' '}
        <a href="https://myfwc.com/fishing/saltwater/recreational/" target="_blank" rel="noreferrer">
          FWC ↗
        </a>. Check before you keep anything.
      </p>

      <h3>Privacy</h3>
      <p>
        Short version: your location never leaves your device and photos are
        never stored. The long version is on the{' '}
        <Link to="/privacy">privacy page</Link>.
      </p>
    </div>
  );
}
