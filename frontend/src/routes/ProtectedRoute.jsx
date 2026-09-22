import { Navigate, Outlet } from "react-router-dom";
import { useAppSelector } from "@/store/hooks";
import { getRoleHome } from "@/constants/roles";

/**
 * Requires authentication. Optionally requires one of `roles`.
 */
export function ProtectedRoute({ roles }) {
  const { status, user } = useAppSelector((state) => state.auth);

  if (status !== "authenticated" || !user) {
    return <Navigate to="/login" replace />;
  }

  if (roles?.length && !roles.includes(user.role)) {
    return <Navigate to={getRoleHome(user.role)} replace />;
  }

  return <Outlet />;
}
