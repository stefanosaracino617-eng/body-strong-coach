import { createFileRoute, Outlet, redirect } from "@tanstack/react-router";
import { caricaSessioneApp } from "@/lib/profilo";

export const Route = createFileRoute("/_authenticated")({
  ssr: false,
  beforeLoad: async () => {
    const sessione = await caricaSessioneApp();
    if (!sessione) throw redirect({ to: "/" });
    return { sessione };
  },
  component: () => <Outlet />,
});
