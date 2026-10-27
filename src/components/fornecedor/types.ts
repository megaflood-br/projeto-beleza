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

export type SupplierCatalogProduct = SupplierProductRow & {
  supplierId: string;
  supplierName: string;
  supplierCity: string | null;
  supplierAddress: string | null;
  deliveryMinCents: number;
  deliveryFeeCents: number;
  payMethods: string[];
};

export type SupplierOrderRow = {
  id: string;
  status: string;
  fulfillment: string;
  paymentMethod: string;
  notes: string | null;
  subtotalCents: number;
  deliveryFeeCents: number;
  totalCents: number;
  pickupCode: string | null;
  salonAddress: string | null;
  salonPhone: string | null;
  pickupAddress: string | null;
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
