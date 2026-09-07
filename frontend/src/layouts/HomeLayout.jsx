import { useEffect } from "react";
import { Outlet } from "react-router-dom";
import Navbar from "../components/Navbar";
import { prefetch } from "../api/Api";

const HomeLayout = () => {
  useEffect(() => {
    // Warm client cache in the background right on app load
    // Guarantees zero latency on subsequent navigation
    const timer = setTimeout(() => {
      prefetch("/dashboard/summary");
      prefetch("/dashboard/recent_sessions");
      prefetch("/dashboard/weekly");
      prefetch("/sessions");
      prefetch("/pose/leaderboard?period=all_time");
      prefetch("/profile");
    }, 100);
    return () => clearTimeout(timer);
  }, []);

  return (
    <>
      <Navbar />
      <Outlet />
    </>
  );
};

export default HomeLayout;