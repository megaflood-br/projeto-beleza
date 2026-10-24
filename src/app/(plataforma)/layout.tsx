import { requirePlatformAdmin } from "@/lib/tenant";
import { PlatformShell } from "@/components/plataforma/platform-shell";

export default async function PlataformaLayout({ children }: { children: React.ReactNode }) {
  const { session } = await requirePlatformAdmin();
  return <PlatformShell userName={session.name}>{children}</PlatformShell>;
}
