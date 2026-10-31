"use client";

import { createContext, useContext, type ReactNode } from "react";
import { SYSTEM_LOGO, SYSTEM_PRIMARY, type SystemBrand } from "@/lib/branding";

const BrandingContext = createContext<SystemBrand>({
  logoUrl: SYSTEM_LOGO,
  primary: SYSTEM_PRIMARY,
  wine: SYSTEM_PRIMARY,
  wineDeep: "#c70337",
  goldSoft: "#ffdce5",
  name: "MegaBeauty",
  faviconUrl: null,
  secondary: "#0f172a",
  partnerSlug: null,
});

export function BrandingProvider({ brand, children }: { brand: SystemBrand; children: ReactNode }) {
  return <BrandingContext.Provider value={brand}>{children}</BrandingContext.Provider>;
}

export function useBrand() {
  return useContext(BrandingContext);
}
