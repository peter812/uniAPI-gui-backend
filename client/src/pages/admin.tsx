import { useState, useEffect } from "react";
import AdminLogin from "./admin-login";
import AdminDashboard from "./admin-dashboard";

export default function Admin() {
  const [sessionToken, setSessionToken] = useState<string | null>(() => {
    if (typeof window !== "undefined") {
      return sessionStorage.getItem("adminSession");
    }
    return null;
  });

  useEffect(() => {
    if (sessionToken) {
      sessionStorage.setItem("adminSession", sessionToken);
    } else {
      sessionStorage.removeItem("adminSession");
    }
  }, [sessionToken]);

  const handleLogout = () => {
    setSessionToken(null);
  };

  if (!sessionToken) {
    return <AdminLogin onLogin={setSessionToken} />;
  }

  return (
    <AdminDashboard sessionToken={sessionToken} onLogout={handleLogout} />
  );
}
