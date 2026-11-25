import axios from "axios";

const API = import.meta.env.VITE_API_URL;

// sab requests me admin cookie jaye
const api = axios.create({
  baseURL: API,
  withCredentials: true,
});

// uploads backend root pe serve hote hain ("/api" ke bahar)
const BACKEND_URL = API.replace(/\/api\/?$/, "");

// Cloudinary jaisi full URL waise hi, purane local paths backend se
export const imageUrl = (path) => {
  if (!path) return "";
  return /^https?:\/\//.test(path) ? path : `${BACKEND_URL}/${path}`;
};

// backend kabhi string, kabhi {message}/{msg} bhejta hai
export const errorMessage = (err, fallback = "Something went wrong") => {
  const data = err.response?.data;
  if (typeof data === "string") return data;
  return data?.message || data?.msg || fallback;
};

export default api;
