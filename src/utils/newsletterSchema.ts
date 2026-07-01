import { z } from "zod";

export const newsletterSchema = z.object({
  title: z.string().min(1, "O título é obrigatório"),
  author: z.string().min(1, "O autor é obrigatório"),
  category: z.string().min(1, "A categoria é obrigatória"),
  image: z.string().url("A imagem deve ser uma URL válida").optional().or(z.literal("")),
  excerpt: z.string().min(1, "O resumo é obrigatório").max(200, "O resumo deve ter no máximo 200 caracteres"),
  target_audience: z.enum(["active", "inactive", "all"]).optional().default("all"),
});

// Tipo para o output (após transformação do Zod — target_audience sempre definido)
export type NewsletterFormData = z.output<typeof newsletterSchema>;

// Tipo para o input do formulário (target_audience pode ser undefined antes do default)
export type NewsletterFormInput = z.input<typeof newsletterSchema>;
