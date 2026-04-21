const AUTH_TOKEN_KEY = "buttler.auth.token";
const AUTH_USER_KEY = "buttler.auth.user";
const LEGACY_REGISTERED_USER_KEY = "registeredUser";
const LEGACY_SESSION_KEY = "session";

export const saveAuthSession = (authResponse) => {
  if (!authResponse?.access_token || !authResponse?.user) {
    return;
  }

  localStorage.setItem(AUTH_TOKEN_KEY, authResponse.access_token);
  localStorage.setItem(AUTH_USER_KEY, JSON.stringify(authResponse.user));
  localStorage.setItem(LEGACY_SESSION_KEY, "active");
};

export const getToken = () => localStorage.getItem(AUTH_TOKEN_KEY);

export const saveUser = (user) => {
  localStorage.setItem(AUTH_USER_KEY, JSON.stringify(user));
};

export const getUser = () => {
  const storedUser = localStorage.getItem(AUTH_USER_KEY);

  if (storedUser) {
    try {
      return JSON.parse(storedUser);
    } catch {
      return null;
    }
  }

  const legacyUser = localStorage.getItem(LEGACY_REGISTERED_USER_KEY);

  if (!legacyUser) {
    return null;
  }

  try {
    return JSON.parse(legacyUser);
  } catch {
    return null;
  }
};

export const loginUser = (authResponse) => {
  if (authResponse) {
    saveAuthSession(authResponse);
    return;
  }

  localStorage.setItem(LEGACY_SESSION_KEY, "active");
};

export const logoutUser = () => {
  localStorage.removeItem(AUTH_TOKEN_KEY);
  localStorage.removeItem(AUTH_USER_KEY);
  localStorage.removeItem(LEGACY_SESSION_KEY);
};

export const isAuthenticated = () => {
  return !!getToken() || !!localStorage.getItem(LEGACY_SESSION_KEY);
};
