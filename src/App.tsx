import { Route, Routes } from 'react-router-dom';
import type { ReactElement } from 'react';
import Layout from './components/Layout';
import ErrorBoundary from './components/ErrorBoundary';
import Home from './pages/Home';
import Locations from './pages/Locations';
import LocationDetail from './pages/LocationDetail';
import FishList from './pages/FishList';
import FishDetail from './pages/FishDetail';
import IdentifyFish from './pages/IdentifyFish';
import Water from './pages/Water';
import Tides from './pages/Tides';
import Rigs from './pages/Rigs';
import Shops from './pages/Shops';
import Start from './pages/Start';
import Privacy from './pages/Privacy';
import Support from './pages/Support';
import Care from './pages/Care';
import Welcome from './pages/Welcome';
import SignIn from './pages/SignIn';
import SignUp from './pages/SignUp';
import Forgot from './pages/Forgot';
import ResetPassword from './pages/ResetPassword';
import Settings from './pages/Settings';
import NotFound from './pages/NotFound';
import RequireAuth from './components/RequireAuth';
import { AuthProvider } from './lib/auth';

/**
 * Route-level error boundary: a page that throws shows a recovery screen inside
 * the shell, so navigation and the rest of the guide stay usable. `key` resets
 * the boundary on navigation — otherwise a caught error would persist after the
 * user routes away from the broken page.
 */
function Page({ path, element }: { path: string; element: ReactElement }) {
  return <ErrorBoundary key={path}>{element}</ErrorBoundary>;
}

/**
 * A page behind the account gate. Everything the guide actually does is one of
 * these; the handful of routes that are not are the ones a stranger has to be
 * able to reach — the pitch, the two legal pages, and the doors themselves.
 */
function Gated({ path, element }: { path: string; element: ReactElement }) {
  return (
    <RequireAuth>
      <ErrorBoundary key={path}>{element}</ErrorBoundary>
    </RequireAuth>
  );
}

export default function App() {
  return (
    <AuthProvider>
        <Routes>
        <Route element={<Layout />}>
          <Route path="/" element={<Gated path="home" element={<Home />} />} />
          <Route path="/locations" element={<Gated path="locations" element={<Locations />} />} />
          <Route
            path="/locations/:slug"
            element={<Gated path="location-detail" element={<LocationDetail />} />}
          />
          <Route path="/fish" element={<Gated path="fish" element={<FishList />} />} />
          <Route path="/fish/:id" element={<Gated path="fish-detail" element={<FishDetail />} />} />
          <Route path="/id" element={<Gated path="identify" element={<IdentifyFish />} />} />
          <Route path="/water" element={<Gated path="water" element={<Water />} />} />
          <Route path="/tides" element={<Gated path="tides" element={<Tides />} />} />
          <Route path="/rigs" element={<Gated path="rigs" element={<Rigs />} />} />
          <Route path="/shops" element={<Gated path="shops" element={<Shops />} />} />
          <Route path="/start" element={<Gated path="start" element={<Start />} />} />
          {/* Reachable inside the app, not only from a marketing site:
              App Store guideline 5.1.1(i) requires the policy in both places. */}
          <Route path="/privacy" element={<Page path="privacy" element={<Privacy />} />} />
          <Route path="/support" element={<Page path="support" element={<Support />} />} />
          <Route path="/care" element={<Gated path="care" element={<Care />} />} />
          {/* The marketing landing page. It lives inside the app shell rather
              than on a separate site so the guide it describes is one tap away
              and stays the single source of the numbers it quotes. */}
          <Route path="/welcome" element={<Page path="welcome" element={<Welcome />} />} />
          {/* The doors. Reachable signed out, by definition. */}
          <Route path="/signin" element={<Page path="signin" element={<SignIn />} />} />
          <Route path="/signup" element={<Page path="signup" element={<SignUp />} />} />
          <Route path="/forgot" element={<Page path="forgot" element={<Forgot />} />} />
          <Route path="/reset" element={<Page path="reset" element={<ResetPassword />} />} />
          <Route path="/settings" element={<Gated path="settings" element={<Settings />} />} />
          <Route path="*" element={<NotFound />} />
        </Route>
      </Routes>
    </AuthProvider>
  );
}
