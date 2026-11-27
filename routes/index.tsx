import { createFileRoute } from "@tanstack/react-router";
import { GocharApp } from "@/components/gochar-app";

export const Route = createFileRoute("/")({ component: GocharApp });
