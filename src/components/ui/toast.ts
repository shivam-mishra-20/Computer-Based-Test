import { toast } from 'sonner';

export const notify = {
  success: (msg: string, opts: Record<string, unknown> = {}) => toast.success(msg, opts),
  error: (msg: string, opts: Record<string, unknown> = {}) => toast.error(msg, opts),
  info: (msg: string, opts: Record<string, unknown> = {}) => toast(msg, opts),
};
