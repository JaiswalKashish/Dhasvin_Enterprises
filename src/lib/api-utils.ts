/**
 * Safely ensures that the provided data is returned as an array.
 * Handles cases where the API might return a wrapped object (e.g. { products: [...] })
 * instead of a raw array.
 */
export function ensureArray<T>(data: any, key?: string): T[] {
  if (Array.isArray(data)) {
    return data;
  }
  
  if (data && typeof data === 'object') {
    // If a specific key is provided, try that first
    if (key && Array.isArray(data[key])) {
      return data[key];
    }
    
    // Fallback: look for any property that is an array
    const firstArrayKey = Object.keys(data).find(k => Array.isArray(data[k]));
    if (firstArrayKey) {
      return data[firstArrayKey];
    }
  }
  
  return [];
}
