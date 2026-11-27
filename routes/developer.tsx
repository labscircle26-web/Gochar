import { createFileRoute } from "@tanstack/react-router";
import { DeveloperConsole } from "@/components/developer-console";

export const Route = createFileRoute("/developer")({
  component: DeveloperConsole,
});
