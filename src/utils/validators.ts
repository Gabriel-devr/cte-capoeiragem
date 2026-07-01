import { z } from "zod";

export const signUpSchema = z.object({
  full_name: z.string().min(1, "Nome completo é obrigatório"),
  birth_date: z.string().min(1, "Data de nascimento é obrigatória"),
  email: z.string().email("E-mail inválido"),
  password: z.string().min(6, "A senha deve ter pelo menos 6 caracteres"),
  confirm_password: z.string().min(6, "A confirmação de senha é obrigatória"),
}).refine((data) => data.password === data.confirm_password, {
  message: "As senhas não coincidem",
  path: ["confirm_password"],
});

export type SignUpFormData = z.infer<typeof signUpSchema>;
