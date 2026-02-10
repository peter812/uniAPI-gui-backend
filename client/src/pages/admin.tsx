import AdminDashboard from "./admin-dashboard";

export default function Admin() {
  const handleLogout = () => {
    window.location.reload();
  };

  return (
    <AdminDashboard sessionToken="no-auth" onLogout={handleLogout} />
  );
}
