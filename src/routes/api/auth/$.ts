import { createFileRoute } from "@tanstack/react-router";
import { auth } from "@/lib/auth/server";

function registrationClosed(request: Request): boolean {
  return new URL(request.url).pathname.includes("/sign-up");
}

export const Route = createFileRoute("/api/auth/$")({
  server: {
    handlers: {
      GET: ({ request }) => auth.handler(request),
      POST: ({ request }) =>
        registrationClosed(request)
          ? new Response(JSON.stringify({ message: "Registration is closed." }), {
              status: 403,
              headers: { "content-type": "application/json" },
            })
          : auth.handler(request),
    },
  },
});
