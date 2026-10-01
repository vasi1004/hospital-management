import { Navigate, Outlet } from "react-router-dom";
import { useAppSelector } from "@/store/hooks";
import { getRoleHome } from "@/constants/roles";
import { selectBackendRecoveryEpoch } from "@/features/ui/uiConfigSlice";

/**
 * Requires authentication. Optionally requires one of `roles`.
 * Remounts the matched route when the backend recovers from an outage so
 * stale "Failed to fetch" screens refetch automatically (no per-page wiring).
 */
export function ProtectedRoute({ roles }) {
  const { status, user } = useAppSelector((state) => state.auth);
  const recoveryEpoch = useAppSelector(selectBackendRecoveryEpoch);

  if (status !== "authenticated" || !user) {
    return <Navigate to="/login" replace />;
  }

  if (roles?.length && !roles.includes(user.role)) {
    return <Navigate to={getRoleHome(user.role)} replace />;
  }

  return <Outlet key={recoveryEpoch} />;
}
