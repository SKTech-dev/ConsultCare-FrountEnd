import { Navigate, Outlet } from "react-router-dom";
import { useSelector } from "react-redux";
import GlobalLoader from "../ui/GlobalLoader";

export default function ProtectedRoute() {
  const { loading, isAuthenticated } = useSelector((state) => state.auth);

  if (loading) {
    return <GlobalLoader fullPage message="Checking your session..." />;
  }

  if (!isAuthenticated) {
    return <Navigate to="/login" replace />;
  }

  return <Outlet />;
}
