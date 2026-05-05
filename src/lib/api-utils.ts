export const getApiUrl = (path: string) => {
  const baseUrl = (import.meta as any).env.VITE_API_URL || "";
  const cleanPath = path.startsWith("/") ? path : `/${path}`;
  return `${baseUrl}${cleanPath}`;
};
