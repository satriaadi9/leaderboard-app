import { type ClassValue, clsx } from "clsx";
import { twMerge } from "tailwind-merge";
// @ts-ignore
import copy from "copy-to-clipboard";

export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs));
}

export async function copyToClipboard(text: string): Promise<boolean> {
  try {
    // Attempt to use the robust library first (handles execCommand, selection ranges, etc.)
    const success = copy(text, {
      debug: true,
      message: 'Press #{key} to copy',
    });
    
    if (success) return true;

    // If library returns false (rare), throw to trigger fallback
    throw new Error("Library reported failure");
  } catch (err) {
    console.warn("Clipboard copy failed, falling back to prompt", err);
    // The Nuclear Option: works everywhere, even on HTTP/insecure contexts
    // This prompts the user to manually copy the text.
    window.prompt("Copy to clipboard: Ctrl+C, Enter", text);
    return true; 
  }
}
