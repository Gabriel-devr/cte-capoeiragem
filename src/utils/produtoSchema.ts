import { z } from "zod";

export const produtoSchema = z.object({
  nome_produto: z.string().min(1, "Nome do produto é obrigatório"),
  tipo_produto: z.string().optional(),
  descricao_produto: z.string().optional(),
});

export type ProdutoFormData = z.infer<typeof produtoSchema>;
