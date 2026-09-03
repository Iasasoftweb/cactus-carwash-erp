export const POS_REPORTING_PERMISSIONS = {
  viewSalesReport: 'POS_REPORT_VIEW',
  viewExecutiveDashboard: 'POS_EXECUTIVE_VIEW',
  viewProfitability: 'POS_PROFITABILITY_VIEW',
  viewOperationalProfitability: 'POS_OPERATIONAL_PROFITABILITY_VIEW',
  comparePoints: 'POS_MULTI_POINT_PROFITABILITY_VIEW',
  manageProfitabilityPolicy: 'POS_PROFITABILITY_POLICY_MANAGE',
  exportReporting: 'POS_REPORT_EXPORT',
} as const;

export type PosReportingPermission =
  (typeof POS_REPORTING_PERMISSIONS)[keyof typeof POS_REPORTING_PERMISSIONS];

export const POS_REPORTING_PERMISSION_CODES: PosReportingPermission[] =
  Object.values(POS_REPORTING_PERMISSIONS);