import { API_URLS } from "@/constants/urls";

function extractErrorMessage(body, fallback) {
  if (!body?.detail) return fallback;
  if (typeof body.detail === "string") return body.detail;
  if (Array.isArray(body.detail) && body.detail[0]?.msg) {
    return body.detail[0].msg;
  }
  return fallback;
}

async function parseJson(response) {
  try {
    return await response.json();
  } catch {
    return null;
  }
}

function authHeaders(accessToken) {
  return {
    Accept: "application/json",
    Authorization: `Bearer ${accessToken}`,
  };
}

async function request(url, { method = "GET", accessToken, body } = {}) {
  const headers = { ...authHeaders(accessToken) };
  if (body !== undefined) headers["Content-Type"] = "application/json";

  const response = await fetch(url, {
    method,
    headers,
    body: body !== undefined ? JSON.stringify(body) : undefined,
  });

  const data = await parseJson(response);
  if (!response.ok) {
    throw new Error(extractErrorMessage(data, "Request failed."));
  }
  return data;
}

/** Load assignable roles from auth backend (source of truth). */
export async function listUserRolesRequest(accessToken) {
  return request(API_URLS.users.roles, { accessToken });
}

export async function listUsersRequest(accessToken, params = {}) {
  const query = new URLSearchParams();
  Object.entries(params).forEach(([key, value]) => {
    if (value !== undefined && value !== null && value !== "") {
      query.set(key, String(value));
    }
  });
  const suffix = query.toString() ? `?${query}` : "";
  return request(`${API_URLS.users.list}${suffix}`, { accessToken });
}

export async function getUserRequest(accessToken, userId) {
  return request(API_URLS.users.detail(userId), { accessToken });
}

export async function createUserRequest(payload, accessToken) {
  return request(API_URLS.users.create, {
    method: "POST",
    accessToken,
    body: payload,
  });
}

export async function updateUserRequest(accessToken, userId, payload) {
  return request(API_URLS.users.detail(userId), {
    method: "PUT",
    accessToken,
    body: payload,
  });
}

export async function setUserActiveRequest(accessToken, userId, active) {
  const path = active
    ? API_URLS.users.activate(userId)
    : API_URLS.users.deactivate(userId);
  return request(path, { method: "PATCH", accessToken });
}

export async function resetUserPasswordRequest(accessToken, userId, password) {
  return request(API_URLS.users.resetPassword(userId), {
    method: "POST",
    accessToken,
    body: { password },
  });
}

export async function deleteUserRequest(accessToken, userId) {
  return request(API_URLS.users.detail(userId), {
    method: "DELETE",
    accessToken,
  });
}

export async function loginRequest(payload) {
  const response = await fetch(API_URLS.auth.login, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      Accept: "application/json",
    },
    body: JSON.stringify(payload),
  });

  const body = await parseJson(response);
  if (!response.ok) {
    throw new Error(
      extractErrorMessage(body, "Unable to sign in. Please try again."),
    );
  }
  return body;
}

/** Current authenticated user from auth backend. */
export async function fetchMeRequest(accessToken) {
  return request(API_URLS.auth.me, { accessToken });
}

/** Notify auth backend of logout (stateless JWT discard). */
export async function logoutRequest(accessToken) {
  return request(API_URLS.auth.logout, {
    method: "POST",
    accessToken,
  });
}
