export type SupplierProductRow = {
  id: string;
  name: string;
  brand: string | null;
  sku: string | null;
  category: string | null;
  unit: string;
  priceCents: number;
  minQty: number;
  stock: number | null;
  description: string | null;
  active: boolean;
};

export type SupplierOrderRow = {
  id: string;
  status: string;
  notes: string | null;
  totalCents: number;
  createdAt: string;
  receivedAt: string | null;
  salonName: string;
  supplierName: string;
  items: {
    id: string;
    name: string;
    brand: string | null;
    quantity: number;
    unit: string;
    unitCents: number;
    lineCents: number;
  }[];
};
