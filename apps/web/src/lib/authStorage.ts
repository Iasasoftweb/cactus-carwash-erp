import type {
  AuthLoginResponse,
  AuthUserResponse,
} from '@cactus/shared';

const TOKEN_KEY =
  'cactus.auth.accessToken';

const USER_KEY =
  'cactus.auth.user';

export function getAccessToken():
  | string
  | null {
  return sessionStorage.getItem(
    TOKEN_KEY,
  );
}

export function getAuthUser():
  | AuthUserResponse
  | null {
  const raw =
    sessionStorage.getItem(
      USER_KEY,
    );

  if (!raw) {
    return null;
  }

  try {
    return JSON.parse(
      raw,
    ) as AuthUserResponse;
  } catch {
    clearAuthSession();
    return null;
  }
}

export function saveAuthSession(
  session: AuthLoginResponse,
): void {
  sessionStorage.setItem(
    TOKEN_KEY,
    session.accessToken,
  );

  sessionStorage.setItem(
    USER_KEY,
    JSON.stringify(
      session.user,
    ),
  );
}

export function updateAuthUser(
  user: AuthUserResponse,
): void {
  sessionStorage.setItem(
    USER_KEY,
    JSON.stringify(user),
  );
}

export function clearAuthSession(): void {
  sessionStorage.removeItem(
    TOKEN_KEY,
  );

  sessionStorage.removeItem(
    USER_KEY,
  );

  localStorage.removeItem(
    'cactus.authenticated',
  );

  localStorage.removeItem(
    'cactus.user',
  );
}

export function hasPermission(
  permission: string,
): boolean {
  return (
    getAuthUser()?.permissions.includes(
      permission,
    ) ?? false
  );
}