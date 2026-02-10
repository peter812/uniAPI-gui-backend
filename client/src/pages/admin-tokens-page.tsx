import { useState, useEffect } from "react";
import AdminLogin from "./admin-login";
import AdminTokens from "./admin-tokens";

export default function AdminTokensPage() {
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

  if (!sessionToken) {
    return <AdminLogin onLogin={setSessionToken} />;
  }

  return <AdminTokens sessionToken={sessionToken} />;
}
