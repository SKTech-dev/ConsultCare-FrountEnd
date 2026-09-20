import { Navigate, Outlet, useLocation } from "react-router-dom";
import { getRole } from "../../features/auth/roles";
import { useSelector } from "react-redux";
import GlobalLoader from "../ui/GlobalLoader";

export default function ProtectedRoute({ roles }) {
  const { loading, isAuthenticated, user } = useSelector((state) => state.auth);
  const location = useLocation();

  if (loading) {
    return <GlobalLoader fullPage message="Checking your session..." />;
  }

  if (!isAuthenticated) {
    return <Navigate to={`/login?next=${encodeURIComponent(location.pathname)}`} replace />;
  }

  if (!getRole(user) || (roles && !roles.includes(getRole(user)))) {
    return <Navigate to="/access-denied" replace />;
  }

  return <Outlet />;
}
