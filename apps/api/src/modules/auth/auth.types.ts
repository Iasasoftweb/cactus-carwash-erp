import type { AuthUserResponse } from '@cactus/shared';

export type AuthTokenPayload = {
  sub: string;
  companyId: string;
  username: string;
};

export type AuthenticatedRequestUser = AuthUserResponse;
