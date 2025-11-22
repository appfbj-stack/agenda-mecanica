import { ServiceStatus } from "./types";

export const STORAGE_KEY = 'oficina_plus_data_v1';

export const STATUS_COLORS: Record<ServiceStatus, string> = {
  [ServiceStatus.ANALYSIS]: 'bg-purple-100 text-purple-700 border-purple-200 dark:bg-purple-900/20 dark:text-purple-300 dark:border-purple-800',
  [ServiceStatus.PENDING_APPROVAL]: 'bg-orange-100 text-orange-700 border-orange-200 dark:bg-orange-900/20 dark:text-orange-300 dark:border-orange-800',
  [ServiceStatus.IN_PROGRESS]: 'bg-blue-100 text-blue-700 border-blue-200 dark:bg-blue-900/20 dark:text-blue-300 dark:border-blue-800',
  [ServiceStatus.READY]: 'bg-teal-100 text-teal-700 border-teal-200 dark:bg-teal-900/20 dark:text-teal-300 dark:border-teal-800',
  [ServiceStatus.COMPLETED]: 'bg-slate-100 text-slate-600 border-slate-200 dark:bg-slate-800 dark:text-slate-400 dark:border-slate-700',
};

export const STATUS_BADGE_STYLES: Record<ServiceStatus, string> = {
  [ServiceStatus.ANALYSIS]: 'bg-gradient-to-r from-purple-500 to-indigo-500 text-white shadow-purple-200 dark:shadow-none',
  [ServiceStatus.PENDING_APPROVAL]: 'bg-gradient-to-r from-orange-400 to-red-400 text-white shadow-orange-200 dark:shadow-none',
  [ServiceStatus.IN_PROGRESS]: 'bg-gradient-to-r from-blue-400 to-cyan-400 text-white shadow-blue-200 dark:shadow-none',
  [ServiceStatus.READY]: 'bg-gradient-to-r from-teal-400 to-emerald-400 text-white shadow-teal-200 dark:shadow-none',
  [ServiceStatus.COMPLETED]: 'bg-slate-200 text-slate-600 dark:bg-slate-700 dark:text-slate-300',
};