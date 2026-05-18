import { z } from 'zod';

export const loginSchema = z.object({
  username: z.string().min(1, 'Thiếu username'),
  password: z.string().min(1, 'Thiếu mật khẩu'),
});

export const changePasswordSchema = z
  .object({
    oldPassword: z.string().min(1, 'Thiếu mật khẩu cũ'),
    newPassword: z.string().min(6, 'Mật khẩu mới tối thiểu 6 ký tự'),
  })
  .refine((d) => d.oldPassword !== d.newPassword, {
    message: 'Mật khẩu mới phải khác mật khẩu cũ',
    path: ['newPassword'],
  });

export type LoginInput = z.infer<typeof loginSchema>;
export type ChangePasswordInput = z.infer<typeof changePasswordSchema>;
