import { clsx, type ClassValue } from "clsx"
import { twMerge } from "tailwind-merge"

export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs))
}

export function getSkillId(skillName: string): string {
  return skillName
    .toLowerCase()
    .trim()
    .replace(/[^a-z0-9_\-]/g, '_')
    .replace(/_+/g, '_')
    .substring(0, 120);
}

