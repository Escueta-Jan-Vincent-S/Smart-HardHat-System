import {
  Routes,
  Route,
  Navigate,
} from "react-router-dom";

import Site from "./pages/Site/Site";
import CreateSite from "./pages/CreateSite/CreateSite";
import SiteCreated from "./pages/SiteCreated/SiteCreated";
import Dashboard from "./pages/Dashboard/Dashboard";


function App() {
  return (
    <Routes>

      {/* ROOT */}
      <Route
        path="/"
        element={
          <Navigate
            to="/site-access"
            replace
          />
        }
      />


      {/* SITE ACCESS */}
      <Route
        path="/site-access"
        element={<Site />}
      />


      {/* CREATE SITE */}
      <Route
        path="/create-site"
        element={<CreateSite />}
      />


      {/* SITE CREATED */}
      <Route
        path="/site-created"
        element={<SiteCreated />}
      />


      {/* DASHBOARD */}
      <Route
        path="/dashboard"
        element={<Dashboard />}
      />

    </Routes>
  );
}


export default App;