import { type ClassValue, clsx } from 'clsx';
import { twMerge } from 'tailwind-merge';
import { customAlphabet } from 'nanoid';
import dayjs from 'dayjs';

export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs));
}

export async function hashPassword(password: string): Promise<string> {
  const encoder = new TextEncoder();
  const salt = process.env.AUTH_SECRET || '';
  const data = encoder.encode(password + salt);
  const hash = await crypto.subtle.digest('SHA-256', data);
  return btoa(String.fromCharCode(...new Uint8Array(hash)));
}

export async function comparePassword(
  password: string,
  hashedPassword: string
): Promise<boolean> {
  const hash = await hashPassword(password);
  return hash === hashedPassword;
}

export function setNestedValue(obj: any, path: string, value: any) {
  const keys = path.split('.');
  let current = obj;

  for (let i = 0; i < keys.length - 1; i++) {
    const key = keys[i];
    if (!(key in current)) {
      current[key] = {};
    }
    current = current[key];
  }

  current[keys[keys.length - 1]] = value;
}

export function getNestedValue(obj: any, path: string) {
  const keys = path.split('.');
  let value = obj;

  for (const key of keys) {
    if (value === undefined || value === null) return undefined;
    value = value[key];
  }

  return value;
}

const urlFriendlyAlphabet =
  '0123456789ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz';
export const generateId = customAlphabet(urlFriendlyAlphabet, 16);

export function formatDate(date: Date | string) {
  if (!date) return '未知时间';
  return dayjs(date).format('YYYY-MM-DD HH:mm:ss');
}

export async function fetchWithTimeout(url: string, options: any = {}) {
  const { timeout = 8000, ...fetchOptions } = options;

  const controller = new AbortController();
  const id = setTimeout(() => controller.abort(), timeout);

  const response = await fetch(url, {
    ...fetchOptions,
    signal: controller.signal
  });

  clearTimeout(id);
  return response;
}
