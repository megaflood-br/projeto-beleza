export type PromotionRow = {
  id: string;
  name: string;
  startsOn: string;
  endsOn: string;
  weekdays: number[];
  discountType: "PERCENT" | "CENTS";
  discountValue: number;
  active: boolean;
  items: { type: string; id: string; name: string }[];
};

export type HeatDay = {
  id: number;
  label: string;
  count: number;
  intensity: number;
  weak: boolean;
};
