import { z } from "zod";

export const financialSchema = z.object({
  student_id: z.string().uuid("Selecione um aluno"),
  due_date:   z.string().min(1, "Data obrigatória"),
  status:     z.enum(["pending", "paid"]).default("pending"),
});

export type FinancialFormData = z.infer<typeof financialSchema>;
