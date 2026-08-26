export type ProductFormValue = {
  id: string;
  name: string;
  sku: string | null;
  barcode: string | null;
  brand: string | null;
  categoryId: string | null;
  categoryName: string | null;
  unit: string;
  unitEquals: number;
  costCents: number;
  saleCents: number;
  professionalPriceCents: number;
  extraCostCents: number;
  commissionPct: number | null;
  cashbackPct: number | null;
  returnAfterDays: number | null;
  stock: number;
  minStock: number;
  imageUrl: string | null;
  notes: string | null;
  requestAvailable: boolean;
  active: boolean;
  services: { serviceId: string; quantity: number; name: string }[];
};

export type ProductLotValue = {
  id: string;
  productId: string;
  productName: string;
  brand: string | null;
  code: string;
  quantity: number;
  unit: string;
  expiresAt: string;
};

export type ProductRequestValue = {
  id: string;
  productId: string;
  productName: string;
  professionalId: string | null;
  professionalName: string | null;
  quantity: number;
  unit: string;
  status: string;
  notes: string | null;
  createdAt: string;
};
