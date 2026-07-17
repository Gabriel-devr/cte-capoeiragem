import { z } from "zod";

export const newsletterSchema = z.object({
  title: z.string().min(1, "O título é obrigatório"),
  category: z.string().min(1, "A categoria é obrigatória"),
  image: z.string().url("A imagem deve ser uma URL válida").optional().or(z.literal("")),
  excerpt: z.string().min(1, "O resumo é obrigatório").max(500, "O resumo deve ter no máximo 500 caracteres"),
  target_audience: z.enum(["all", "plano", "turma", "aluno"]).optional().default("all"),
  target_plano_id: z.string().optional().or(z.literal("")),
  target_turma: z.string().optional().or(z.literal("")),
  target_student_id: z.string().optional().or(z.literal("")),
}).superRefine((data, ctx) => {
  if (data.target_audience === "plano" && !data.target_plano_id) {
    ctx.addIssue({ code: z.ZodIssueCode.custom, path: ["target_plano_id"], message: "Selecione o plano" });
  }
  if (data.target_audience === "turma" && !data.target_turma) {
    ctx.addIssue({ code: z.ZodIssueCode.custom, path: ["target_turma"], message: "Selecione a turma" });
  }
  if (data.target_audience === "aluno" && !data.target_student_id) {
    ctx.addIssue({ code: z.ZodIssueCode.custom, path: ["target_student_id"], message: "Selecione o aluno" });
  }
});

// Tipo para o output (após transformação do Zod — target_audience sempre definido)
export type NewsletterFormData = z.output<typeof newsletterSchema>;

// Tipo para o input do formulário (target_audience pode ser undefined antes do default)
export type NewsletterFormInput = z.input<typeof newsletterSchema>;
