import { API_URLS } from "@/constants/urls";

function extractErrorMessage(body, fallback) {
  if (!body?.detail) return fallback;
  if (typeof body.detail === "string") return body.detail;
  if (Array.isArray(body.detail) && body.detail[0]?.msg) {
    return body.detail[0].msg;
  }
  return fallback;
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

  let body = null;
  try {
    body = await response.json();
  } catch {
    body = null;
  }

  if (!response.ok) {
    throw new Error(
      extractErrorMessage(body, "Unable to sign in. Please try again."),
    );
  }

  return body;
}

export async function createUserRequest(payload, accessToken) {
  const response = await fetch(API_URLS.users.create, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      Accept: "application/json",
      Authorization: `Bearer ${accessToken}`,
    },
    body: JSON.stringify(payload),
  });

  let body = null;
  try {
    body = await response.json();
  } catch {
    body = null;
  }

  if (!response.ok) {
    throw new Error(
      extractErrorMessage(body, "Unable to create user. Please try again."),
    );
  }

  return body;
}

export async function listUsersRequest(accessToken) {
  const response = await fetch(API_URLS.users.list, {
    method: "GET",
    headers: {
      Accept: "application/json",
      Authorization: `Bearer ${accessToken}`,
    },
  });

  let body = null;
  try {
    body = await response.json();
  } catch {
    body = null;
  }

  if (!response.ok) {
    throw new Error(
      extractErrorMessage(body, "Unable to load users. Please try again."),
    );
  }

  return body;
}
