import { z } from 'zod';

export const emailSchema = z
  .string({ required_error: 'Informe um e-mail.' })
  .trim()
  .email('Forneça um e-mail válido.');

export const passwordSchema = z
  .string({ required_error: 'Informe uma senha.' })
  .min(8, 'A senha deve conter pelo menos 8 caracteres.');

export const nameSchema = z
  .string({ required_error: 'Informe um nome.' })
  .trim()
  .min(2, 'Informe pelo menos 2 caracteres.')
  .max(80, 'O nome pode ter no máximo 80 caracteres.');

export const signupSchema = z.object({
  name: nameSchema,
  email: emailSchema,
  password: passwordSchema,
});

export const loginSchema = z.object({
  email: emailSchema,
  password: passwordSchema,
});

export const forgotPasswordSchema = z.object({
  email: emailSchema,
});

export const resetPasswordSchema = z
  .object({
    password: passwordSchema,
    confirmPassword: z
      .string({ required_error: 'Confirme a nova senha.' })
      .min(8, 'A senha deve conter pelo menos 8 caracteres.'),
  })
  .refine(({ password, confirmPassword }) => password === confirmPassword, {
    message: 'As senhas precisam ser iguais.',
    path: ['confirmPassword'],
  });

export type SignupInput = z.infer<typeof signupSchema>;
export type LoginInput = z.infer<typeof loginSchema>;
export type ForgotPasswordInput = z.infer<typeof forgotPasswordSchema>;
export type ResetPasswordInput = z.infer<typeof resetPasswordSchema>;

export const getFirstErrorMessage = (error: z.ZodError) => {
  const fieldErrors = error.flatten().fieldErrors;
  const message = Object.values(fieldErrors)
    .flat()
    .find((value): value is string => Boolean(value));

  return message ?? 'Revise os dados informados.';
};
