export const saveUser = (user) => {
  localStorage.setItem("registeredUser", JSON.stringify(user));
};

export const getUser = () => {
  return JSON.parse(localStorage.getItem("registeredUser"));
};

export const loginUser = () => {
  localStorage.setItem("session", "active");
};

export const logoutUser = () => {
  localStorage.removeItem("session");
};

export const isAuthenticated = () => {
  return !!localStorage.getItem("session");
};