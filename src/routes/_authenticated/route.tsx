import { createFileRoute, Outlet, redirect } from "@tanstack/react-router";
import { GuscioApp } from "@/components/GuscioApp";
import { caricaSessioneApp } from "@/lib/profilo";

export const Route = createFileRoute("/_authenticated")({
  ssr: false,
  beforeLoad: async () => {
    const sessione = await caricaSessioneApp();
    if (!sessione) throw redirect({ to: "/" });
    return { sessione };
  },
  component: AreaAutenticata,
});

function AreaAutenticata() {
  const { sessione } = Route.useRouteContext();
  return (
    <GuscioApp sessione={sessione}>
      <Outlet />
    </GuscioApp>
  );
}
