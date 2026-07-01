import { z } from "zod";

export const profileSchema = z.object({
  full_name: z.string().min(1, "Nome completo é obrigatório"),
  nickname: z.string().optional().nullable(),
  email: z.string().email("E-mail inválido").optional(),
  phone: z.string()
    .refine((val) => {
      const nums = val.replace(/\D/g, "");
      return nums === "" || (nums.length >= 10 && nums.length <= 11);
    }, {
      message: "Telefone deve ter 10 ou 11 dígitos"
    })
    .optional().nullable().or(z.literal("")),
  birth_date: z.string().min(1, "Data de nascimento é obrigatória"),
  age: z.string().optional().nullable(),
  birthplace: z.string().optional().nullable(),
  state: z.string().max(2, "UF deve ter 2 caracteres").optional().nullable(),
  address: z.string().optional().nullable(),
  neighborhood: z.string().optional().nullable(),
  cpf: z.string()
    .refine((val) => {
      const nums = val.replace(/\D/g, "");
      return nums === "" || nums.length === 11;
    }, {
      message: "CPF deve ter exatamente 11 dígitos"
    })
    .optional().nullable().or(z.literal("")),
  rg: z.string().optional().nullable(),
  gender: z.enum(["Masculino", "Feminino", "Outro"]).default("Masculino"),
  package_type: z.enum(["Mensal", "Trimestral", "Semestral", "Anual"]).default("Mensal"),
  frequency: z.enum(["1x", "2x", "3x", "4x", "5x", "6x"]).default("2x"),
  instagram: z.string().optional().nullable(),
  shirt_size: z.enum(["PP", "P", "M", "G", "GG", "XG"]).default("M"),
  pants_size: z.enum(["PP", "P", "M", "G", "GG", "XG"]).default("M"),
  emergency_name: z.string().optional().nullable(),
  relationship: z.string().optional().nullable(),
  emergency_phone: z.string()
    .refine((val) => {
      const nums = val.replace(/\D/g, "");
      return nums === "" || (nums.length >= 10 && nums.length <= 11);
    }, {
      message: "Telefone de emergência inválido"
    })
    .optional().nullable().or(z.literal("")),
  
  // Dados de Saúde
  has_special_needs: z.boolean().default(false),
  has_diagnosis: z.boolean().default(false),
  has_medicine_allergy: z.boolean().default(false),
  has_food_allergy: z.boolean().default(false),
  uses_medication: z.boolean().default(false),
  has_psych_disorder: z.boolean().default(false),
  has_treatment: z.boolean().default(false),
  health_details: z.string().optional().nullable(),
});

export type ProfileFormData = z.infer<typeof profileSchema>;
