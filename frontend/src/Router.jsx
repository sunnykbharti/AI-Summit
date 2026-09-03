import {
  createBrowserRouter,
  RouterProvider,
  Navigate,
} from "react-router-dom";

import HomeLayout from "./layouts/HomeLayout";

/* ── Eager imports — all pages pre-loaded, zero navigation delay ── */
import Login         from "./pages/Login";
import Home          from "./pages/Home";
import Dashboard     from "./pages/Dashboard";
import PoseAnalysis  from "./pages/PoseAnalysis";
import Sessions      from "./pages/Sessions";
import Progress      from "./pages/Progress";
import Profile       from "./pages/Profile";
import Exercise      from "./pages/Exercises";
import Leaderboard   from "./pages/Leaderboard";

const Router = () => {
  const routes = createBrowserRouter([
    /* ====== AUTH ====== */
    {
      path: "/login",
      element: <Login />,
    },

    /* ====== POSECARE MAIN APPLICATION ====== */
    {
      element: <HomeLayout />,
      children: [
        { path: "/",              element: <Dashboard /> },
        { path: "/posecare",      element: <Home /> },
        { path: "/dashboard",     element: <Dashboard /> },
        { path: "/pose-analysis", element: <PoseAnalysis /> },
        { path: "/sessions",      element: <Sessions /> },
        { path: "/progress",      element: <Progress /> },
        { path: "/exercises",     element: <Exercise /> },
        { path: "/leaderboard",   element: <Leaderboard /> },
        { path: "/profile",       element: <Profile /> },
        { path: "*",              element: <Navigate to="/dashboard" replace /> },
      ],
    },
  ]);

  return <RouterProvider router={routes} />;
};

export default Router;