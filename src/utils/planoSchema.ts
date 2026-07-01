import { z } from "zod";

export const planoSchema = z.object({
  nome_plano: z.string().min(1, "Nome do plano é obrigatório"),
  tipo_plano: z.string().min(1, "O período (tipo) do plano é obrigatório"),
  frequencia: z.number().min(1, "Frequência é obrigatória"),
  preco_original: z.string().min(1, "Preço original é obrigatório"),
  preco_desconto: z.string().optional(),
});

export type PlanoFormData = z.infer<typeof planoSchema>;
