import { z } from "zod";

export const matriculaSchema = z.object({
  student_id:  z.string().uuid("Selecione um aluno"),
  plano_id:    z.string().uuid("Selecione um plano"),
  start_date:  z.string().min(1, "Data de início obrigatória"),
  end_date:    z.string().optional().or(z.literal("")),
  status:      z.enum(["active", "paused", "cancelled"]).default("active"),
  observacoes: z.string().optional(),
});

export type MatriculaFormData = z.infer<typeof matriculaSchema>;
