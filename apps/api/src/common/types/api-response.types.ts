export type VehicleTypeResponse = {
  id: string;
  code: string;
  name: string;
};

export type CatalogServiceResponse = {
  id: string;
  priceId: string;
  code: string;
  name: string;
  category: string;
  vehicleTypeId: string;
  vehicleType: string;
  price: number;
  taxable: boolean;
};

export type EmployeeResponse = {
  id: string;
  employeeNo: string;
  fullName: string;
};

export type OrderListItemResponse = {
  id: string;
  orderNumber: string;
  customerAlias: string;
  vehicle: string;
  vehicleType: string;
  operationalStatus: string;
  financialStatus: string;
  total: number;
  entryAt: Date;
};

export type CreatedOrderResponse = {
  id: string;
  orderNumber: string;
  customerAlias: string;
  vehicle: string;
  vehicleType: string;
  operationalStatus: string;
  financialStatus: string;
  total: number;
  qrToken: string;
  createdAt: Date;
};