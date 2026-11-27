import { createFileRoute } from "@tanstack/react-router";
import { ChartsScreen } from "@/components/charts-screen";

export const Route = createFileRoute("/charts")({ component: ChartsScreen });
