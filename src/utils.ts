import { clsx, type ClassValue } from 'clsx';
import { twMerge } from 'tailwind-merge';

export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs));
}

export const CATEGORY_COLORS: Record<string, string> = {
  food: '#F87171', // red-400
  transport: '#60A5FA', // blue-400
  shopping: '#FBBF24', // amber-400
  entertainment: '#A78BFA', // violet-400
  bills: '#34D399', // emerald-400
  health: '#F472B6', // pink-400
  education: '#FB923C', // orange-400
  other: '#94A3B8', // slate-400
};

export const formatCurrency = (amount: number, lang: string) => {
  return new Intl.NumberFormat(lang === 'vi' ? 'vi-VN' : 'en-US', {
    style: 'currency',
    currency: lang === 'vi' ? 'VND' : 'USD',
  }).format(amount);
};
