import { z } from "zod";

export const planoSchema = z.object({
  tipo_plano: z.string().min(1, "O período (tipo) do plano é obrigatório"),
  frequencia: z.number().min(1, "Frequência é obrigatória").max(3, "Frequência inválida"),
  turmas: z.array(z.string()).default([]),
  nucleo: z.enum(["minimundo", "matriz"], {
    errorMap: () => ({ message: "Selecione o núcleo" }),
  }),
  gratuidade: z.boolean().default(false),
  bolsa_parcial: z.boolean().default(false),
  preco_original: z.string().optional(),
  preco_desconto: z.string().optional(),
  preco_familia: z.string().optional(),
}).superRefine((data, ctx) => {
  if (data.gratuidade && data.bolsa_parcial) {
    ctx.addIssue({ code: z.ZodIssueCode.custom, path: ["bolsa_parcial"], message: "Um plano não pode ser gratuidade integral e bolsa parcial ao mesmo tempo" });
  }
  if (!data.gratuidade && !data.preco_original?.trim()) {
    ctx.addIssue({ code: z.ZodIssueCode.custom, path: ["preco_original"], message: "Preço original é obrigatório" });
  }
});

// Tipo de saída (após aplicar os defaults do Zod — turmas/gratuidade sempre definidos)
export type PlanoFormData = z.output<typeof planoSchema>;

// Tipo de entrada do formulário (turmas/gratuidade podem ser undefined antes do default)
export type PlanoFormInput = z.input<typeof planoSchema>;
