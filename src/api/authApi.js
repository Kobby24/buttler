import { request } from "./client";

export const registerUser = (payload) =>
  request("/auth/register", {
    method: "POST",
    body: payload,
  });

export const loginUserApi = (payload) =>
  request("/auth/login", {
    method: "POST",
    body: payload,
  });

export const updateUserAvatar = (payload, token) =>
  request("/auth/avatar", {
    method: "PATCH",
    body: payload,
    token,
  });

export const getUserActivities = (userId, token) =>
  request(`/auth/${userId}/activities`, {
    token,
  });
