export const ERP_PERMISSIONS = {
  customerView: 'CUSTOMER_VIEW',
  customerManage: 'CUSTOMER_MANAGE',
  customerCreditManage: 'CUSTOMER_CREDIT_MANAGE',

  employeeView: 'EMPLOYEE_VIEW',
  employeeManage: 'EMPLOYEE_MANAGE',
  staffAssignmentManage: 'STAFF_ASSIGNMENT_MANAGE',

  cashView: 'CASH_VIEW',
  cashSessionOperate: 'CASH_SESSION_OPERATE',
  cashManage: 'CASH_MANAGE',
  cashReprint: 'CASH_REPRINT',

  expenseView: 'EXPENSE_VIEW',
  expenseCreate: 'EXPENSE_CREATE',
  expenseApprove: 'EXPENSE_APPROVE',
  expenseManage: 'EXPENSE_MANAGE',

  supplierView: 'SUPPLIER_VIEW',
  supplierManage: 'SUPPLIER_MANAGE',
  purchaseView: 'PURCHASE_VIEW',
  purchaseManage: 'PURCHASE_MANAGE',
  accountsPayableView: 'ACCOUNTS_PAYABLE_VIEW',
  accountsPayableManage: 'ACCOUNTS_PAYABLE_MANAGE',

  orderView: 'ORDER_VIEW',
  orderCreate: 'ORDER_CREATE',
  orderManage: 'ORDER_MANAGE',
  orderFinancialManage: 'ORDER_FINANCIAL_MANAGE',

  posOperate: 'POS_OPERATE',
  posSaleVoid: 'POS_SALE_VOID',
  posHoldManage: 'POS_HOLD_MANAGE',
  posPriceOverride: 'POS_PRICE_OVERRIDE',
  posKitchenView: 'POS_KITCHEN_VIEW',
  posKitchenManage: 'POS_KITCHEN_MANAGE',

  catalogView: 'CATALOG_VIEW',
  catalogManage: 'CATALOG_MANAGE',
  productView: 'PRODUCT_VIEW',
  productManage: 'PRODUCT_MANAGE',
  inventoryView: 'INVENTORY_VIEW',
  inventoryManage: 'INVENTORY_MANAGE',

  userView: 'USER_VIEW',
  userManage: 'USER_MANAGE',
  userPasswordReset: 'USER_PASSWORD_RESET',
  userRoleManage: 'USER_ROLE_MANAGE',
  roleView: 'ROLE_VIEW',
  roleManage: 'ROLE_MANAGE',

  companyView: 'COMPANY_VIEW',
  companyManage: 'COMPANY_MANAGE',
  businessConfigurationView: 'BUSINESS_CONFIGURATION_VIEW',
  businessConfigurationManage: 'BUSINESS_CONFIGURATION_MANAGE',

  financialDashboardView: 'FINANCIAL_DASHBOARD_VIEW',
  financialDashboardAllBranches:
    'FINANCIAL_DASHBOARD_VIEW_ALL_BRANCHES',

  posReportView: 'POS_REPORT_VIEW',
  posExecutiveView: 'POS_EXECUTIVE_VIEW',
  posProfitabilityView: 'POS_PROFITABILITY_VIEW',
  posOperationalProfitabilityView:
    'POS_OPERATIONAL_PROFITABILITY_VIEW',
  posMultiPointProfitabilityView:
    'POS_MULTI_POINT_PROFITABILITY_VIEW',
  posProfitabilityPolicyManage:
    'POS_PROFITABILITY_POLICY_MANAGE',
  posReportExport: 'POS_REPORT_EXPORT',
} as const;

export type ErpPermission =
  (typeof ERP_PERMISSIONS)[keyof typeof ERP_PERMISSIONS];
