import { Navigate, Outlet, useSearchParams } from "react-router-dom";
import { getDestination } from "../../features/auth/roles";
import { useSelector } from "react-redux";
import GlobalLoader from "../ui/GlobalLoader";

export default function PublicRoute() {
  const { loading, isAuthenticated, user } = useSelector((state) => state.auth);
  const [params] = useSearchParams();

  if (loading) {
    return <GlobalLoader fullPage message="Checking your session..." />;
  }

  if (isAuthenticated) {
    return <Navigate to={getDestination(user, params.get("next"))} replace />;
  }

  return <Outlet />;
}
