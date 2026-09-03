import type {
  AuthenticatedRequestUser,
} from './auth.types';

export type BranchAccessContext =
  Pick<
    AuthenticatedRequestUser,
    | 'companyId'
    | 'branchAccessMode'
    | 'branchIds'
  >;

export function branchScope(
  user: BranchAccessContext,
) {
  if (
    user.branchAccessMode === 'ALL'
  ) {
    return {
      companyId:
        user.companyId,
    };
  }

  return {
    companyId:
      user.companyId,

    id: {
      in: user.branchIds,
    },
  };
}

export function hasBranchAccess(
  user: BranchAccessContext,
  branchId: string,
): boolean {
  if (
    user.branchAccessMode === 'ALL'
  ) {
    return true;
  }

  return user.branchIds.includes(
    branchId,
  );
}