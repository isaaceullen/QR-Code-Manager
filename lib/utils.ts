import { clsx, type ClassValue } from "clsx"
import { twMerge } from "tailwind-merge"

export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs))
}

export function sanitizeText(text: string): string {
  if (!text) return "";
  try {
    // 1. decodeURIComponent
    let decoded = text;
    try {
      decoded = decodeURIComponent(text);
    } catch (e) {
      // fallback if it's not a valid URI component
    }
    
    // 2. Remove accents
    const noAccents = decoded.normalize("NFD").replace(/[\u0300-\u036f]/g, "");
    
    // 3. Remove special characters, keep letters, numbers, spaces
    const sanitized = noAccents.replace(/[^a-zA-Z0-9\s-]/g, "").trim();
    
    return sanitized;
  } catch (e) {
    return text;
  }
}
