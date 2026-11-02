import { requireTenant } from "@/lib/tenant";
import { canAccess } from "@/lib/permissions";
import { readWhatsAppLive } from "@/lib/whatsapp-live";
import { ensureReceptionist, loadReceptionistCatalog, loadReceptionistConfig } from "@/lib/receptionist-runtime";
import { ReceptionistBoard } from "@/components/recepcionista/receptionist-board";

export default async function RecepcionistaPage() {
  const { session, access, tenant } = await requireTenant();
  await ensureReceptionist(session.tenantId);
  const [config, catalog, whatsapp] = await Promise.all([
    loadReceptionistConfig(session.tenantId),
    loadReceptionistCatalog(session.tenantId),
    readWhatsAppLive(session.tenantId),
  ]);

  return (
    <ReceptionistBoard
      config={config}
      catalog={catalog}
      salonName={tenant.name}
      whatsappConnected={whatsapp.connected}
      canEdit={canAccess(access, "receptionist", "edit")}
    />
  );
}
