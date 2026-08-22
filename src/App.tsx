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
import Care from './pages/Care';
import NotFound from './pages/NotFound';

/**
 * Route-level error boundary: a page that throws shows a recovery screen inside
 * the shell, so navigation and the rest of the guide stay usable. `key` resets
 * the boundary on navigation — otherwise a caught error would persist after the
 * user routes away from the broken page.
 */
function Page({ path, element }: { path: string; element: ReactElement }) {
  return <ErrorBoundary key={path}>{element}</ErrorBoundary>;
}

export default function App() {
  return (
    <Routes>
      <Route element={<Layout />}>
        <Route path="/" element={<Page path="home" element={<Home />} />} />
        <Route path="/locations" element={<Page path="locations" element={<Locations />} />} />
        <Route
          path="/locations/:slug"
          element={<Page path="location-detail" element={<LocationDetail />} />}
        />
        <Route path="/fish" element={<Page path="fish" element={<FishList />} />} />
        <Route path="/fish/:id" element={<Page path="fish-detail" element={<FishDetail />} />} />
        <Route path="/id" element={<Page path="identify" element={<IdentifyFish />} />} />
        <Route path="/water" element={<Page path="water" element={<Water />} />} />
        <Route path="/tides" element={<Page path="tides" element={<Tides />} />} />
        <Route path="/rigs" element={<Page path="rigs" element={<Rigs />} />} />
        <Route path="/shops" element={<Page path="shops" element={<Shops />} />} />
        <Route path="/care" element={<Page path="care" element={<Care />} />} />
        <Route path="*" element={<NotFound />} />
      </Route>
    </Routes>
  );
}
