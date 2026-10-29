import {
  Routes,
  Route,
  Navigate,
} from "react-router-dom";

import Site from "./pages/Site/Site";
import CreateSite from "./pages/CreateSite/CreateSite";
import CreateSiteExisiting from "./pages/CreateSite/CreateSiteExisiting";
import SiteCreated from "./pages/SiteCreated/SiteCreated";
import Verify from "./pages/Verify/verify";
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


      {/* CREATE SITE - NEW SUPERVISOR */}
      <Route
        path="/create-site"
        element={<CreateSite />}
      />

      {/* CREATE SITE - EXISTING SUPERVISOR */}
      <Route
        path="/create-site-existing"
        element={<CreateSiteExisiting />}
      />


      {/* SITE CREATED */}
      <Route
        path="/site-created"
        element={<SiteCreated />}
      />


      {/* VERIFY SITE RESULT */}
      <Route
        path="/verify"
        element={<Verify />}
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
