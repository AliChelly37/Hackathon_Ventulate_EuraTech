import { createFileRoute, Navigate } from "@tanstack/react-router";

export const Route = createFileRoute("/_authenticated/onboarding")({
  component: () => <Navigate to="/intake" replace />,
});