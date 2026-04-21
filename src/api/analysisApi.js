import { request } from "./client";

export const validatePerson = (file, signal) => {
  const formData = new FormData();
  formData.append("image", file);

  return request("/validate-person", {
    method: "POST",
    body: formData,
    signal,
  });
};

export const processImageApi = (file, signal) => {
  const formData = new FormData();
  formData.append("image", file);

  return request("/process", {
    method: "POST",
    body: formData,
    signal,
  });
};

export const validateClothingUrl = (url) =>
  request("/validate-clothing-url", {
    method: "POST",
    body: { url },
  });

export const checkFitApi = ({ file, height, weight, productUrl }) => {
  const formData = new FormData();
  formData.append("image", file);
  formData.append("height", height);
  formData.append("weight", weight);
  formData.append("product_url", productUrl);

  return request("/check-fit", {
    method: "POST",
    body: formData,
  });
};
