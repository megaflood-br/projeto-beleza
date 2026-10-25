export type TenantUserRow = {
  id: string;
  name: string;
  email: string;
  role: string;
  active: boolean;
  professionalId: string | null;
  professionalName: string | null;
};
