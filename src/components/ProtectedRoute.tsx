import { Navigate } from "react-router-dom";
import { useAuth } from "../contexts/AuthContext";

interface Props {
  pageKey: string;
  children: React.ReactNode;
}

export default function ProtectedRoute({ pageKey, children }: Props) {
  const { user, loading, canView } = useAuth();

  if (loading) {
    return <div style={{ padding: 32, opacity: 0.6 }}>Checking access...</div>;
  }

  if (!user) {
    return <Navigate to="/login" replace />;
  }

  if (!canView(pageKey)) {
    return (
      <div style={{ padding: 32, textAlign: "center" }}>
        <h2 style={{ color: "#FF6B6B", margin: 0 }}>Access Denied</h2>
        <p style={{ opacity: 0.7, marginTop: 8 }}>
          Your role ({user.role}) does not have access to this page.
        </p>
      </div>
    );
  }

  return <>{children}</>;
}
