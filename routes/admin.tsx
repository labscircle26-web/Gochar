import { createFileRoute, Navigate } from "@tanstack/react-router";

export const Route = createFileRoute("/admin")({ component: AdminPage });

function AdminPage() {
  return <Navigate to="/" />;
}
