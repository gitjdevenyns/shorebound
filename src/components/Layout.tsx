import { NavLink, Link, Outlet, useLocation } from 'react-router-dom';
import { useEffect, useRef } from 'react';
import type { ComponentType } from 'react';
import { useTheme } from '../lib/theme';
import { useOnline } from '../lib/network';
import {
  IconCameraFish, IconDanger, IconFish, IconHome, IconSpots, IconWater,
} from './ui/icons';

/**
 * Primary navigation. The design boards specify a five-slot tab bar
 * (Home · Spots · Water · Fish · Care); "Water" opens the Tides & Water screen.
 * Read-the-water (habitat modules) and Rigs + Knots are reference sections
 * reached from Home, location pages and the desktop nav.
 */
const TABS = [
  { to: '/', label: 'Home', end: true, Icon: IconHome },
  { to: '/locations', label: 'Spots', end: false, Icon: IconSpots },
  { to: '/tides', label: 'Water', end: false, Icon: IconWater },
  { to: '/fish', label: 'Fish', end: false, Icon: IconFish },
  { to: '/care', label: 'Care', end: false, Icon: IconDanger },
];

/**
 * Desktop nav.
 *
 * Two items carry an icon rather than a label alone. Handle With Care exists
 * because several of these fish injure people, and a hazard triangle says that
 * at a glance where four words do not. Photo ID is a camera with a fish in it,
 * which explains the feature more directly than naming it does.
 *
 * `/tides` is deliberately not here. It used to sit beside `/water` as "Tides +
 * Water" and "Read Water", which read as two entries for one thing. It is
 * reached from every conditions card and from each spot page, which is where
 * somebody actually wants it.
 */
const DESKTOP_NAV: Array<{
  to: string; label: string; end: boolean; Icon?: ComponentType<{ className?: string }>;
}> = [
  { to: '/', label: 'Home', end: true },
  { to: '/locations', label: 'Spots', end: false },
  { to: '/water', label: 'Water', end: false },
  { to: '/fish', label: 'Fish', end: false },
  { to: '/rigs', label: 'Rigs + Knots', end: false },
  { to: '/shops', label: 'Bait + Tackle', end: false },
  { to: '/id', label: 'Photo ID', end: false, Icon: IconCameraFish },
  { to: '/care', label: 'Handle With Care', end: false, Icon: IconDanger },
];

/** Move focus to the page heading on navigation so keyboard/SR users land in content. */
function useRouteFocus() {
  const { pathname } = useLocation();
  const main = useRef<HTMLElement>(null);
  const first = useRef(true);

  useEffect(() => {
    if (first.current) {
      first.current = false;
      return;
    }
    window.scrollTo(0, 0);
    // preventScroll matters: <main> begins directly below a position:sticky
    // appbar, so letting focus() scroll it into view parks it at the top of
    // the viewport and hides the first ~59px of every page behind the bar —
    // undoing the scrollTo above. Focus still moves, so the a11y behaviour
    // this effect exists for is unchanged.
    main.current?.focus({ preventScroll: true });
  }, [pathname]);

  return main;
}

export default function Layout() {
  const [theme, toggleTheme] = useTheme();
  const online = useOnline();
  const main = useRouteFocus();

  return (
    <div className="app">
      <a className="skip-link" href="#main">
        Skip to content
      </a>

      <header className="appbar">
        <Link to="/" className="appbar-brand">
          {/* The same file the app icon is rendered from, so the mark in the
              bar and the icon on the home screen can never drift apart. */}
          <img className="mark" src="/assets/icon-mark.svg" alt="" width={34} height={34} />
          <span>
            <span className="name">Shorebound</span>
            <span className="lab lab-xs">
              Go fish yo&rsquo;self - Florida Gulf Coast
            </span>
          </span>
        </Link>

        <nav className="appnav" aria-label="Sections">
          {DESKTOP_NAV.map((n) => (
            <NavLink
              key={n.to}
              to={n.to}
              end={n.end}
              className={({ isActive }) => (isActive ? 'on' : undefined)}
            >
              {n.Icon && <n.Icon className="navic" />}
              {n.label}
            </NavLink>
          ))}
        </nav>

        <div className="appbar-actions">
          <button
            type="button"
            className="iconbtn"
            onClick={toggleTheme}
            aria-label={`Switch to ${theme === 'dark' ? 'light' : 'dark'} theme`}
          >
            <span aria-hidden="true">{theme === 'dark' ? '◑' : '◐'}</span>
            {theme === 'dark' ? 'Dark' : 'Light'}
          </button>
        </div>
      </header>

      {/* Explains why live slots are empty. The bundled guide still works, so
          this is informational, never blocking. */}
      <div aria-live="polite">
        {!online && (
          <p className="offline-bar">
            <span className="dot" aria-hidden="true" />
            Offline — the full guide still works. Live tide and weather are paused.
          </p>
        )}
      </div>

      <main id="main" className="app-main" ref={main} tabIndex={-1}>
        <div className="app-shell">
          <Outlet />
        </div>
      </main>

      {/* Every page ends here, which is what "easily accessible" means for a
          privacy policy under App Store guideline 5.1.1(i) — a link in one
          buried settings screen does not qualify. */}
      <footer className="appfoot">
        <nav aria-label="Legal and support">
          <Link to="/start">Start here</Link>
          <Link to="/welcome">About</Link>
          <Link to="/privacy">Privacy</Link>
          <Link to="/support">Support</Link>
          <Link to="/shops">Bait &amp; tackle</Link>
        </nav>
        <p>
          Tide predictions from NOAA, forecasts from the National Weather
          Service. Everything live here is a prediction, never a measurement.
        </p>
      </footer>

      <nav className="tabbar" aria-label="Primary">
        {TABS.map(({ to, label, end, Icon }) => (
          <NavLink
            key={to}
            to={to}
            end={end}
            className={({ isActive }) => (isActive ? 'on' : undefined)}
          >
            <Icon />
            {label}
          </NavLink>
        ))}
      </nav>
    </div>
  );
}
