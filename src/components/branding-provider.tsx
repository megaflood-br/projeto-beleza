"use client";

import { createContext, useContext, useEffect, type ReactNode } from "react";
import { SYSTEM_FAVICON, SYSTEM_LOGO, SYSTEM_LOGO_DARK, SYSTEM_PRIMARY, type SystemBrand } from "@/lib/branding";

const BrandingContext = createContext<SystemBrand>({
  logoUrl: SYSTEM_LOGO,
  logoDarkUrl: SYSTEM_LOGO_DARK,
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
  useEffect(() => {
    const href = brand.faviconUrl || SYSTEM_FAVICON;
    const links = document.querySelectorAll<HTMLLinkElement>("link[rel='icon'], link[rel='shortcut icon']");
    if (!links.length) {
      const created = document.createElement("link");
      created.rel = "icon";
      created.href = href;
      document.head.appendChild(created);
      return;
    }
    for (const link of links) link.href = href;
  }, [brand.faviconUrl]);
  return <BrandingContext.Provider value={brand}>{children}</BrandingContext.Provider>;
}

export function useBrand() {
  return useContext(BrandingContext);
}
