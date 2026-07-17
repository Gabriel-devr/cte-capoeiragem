"use client";

import { useEffect, useState } from "react";
import { motion, AnimatePresence } from "motion/react";
import { Settings, Plus, Edit, Trash2, Save, CalendarCheck, Loader2 } from "lucide-react";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { toast } from "sonner";

import { Button } from "../ui/button";
import { Input } from "../ui/input";
import { Checkbox } from "../ui/checkbox";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "../ui/dialog";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "../ui/select";
import {
  Form,
  FormControl,
  FormField,
  FormItem,
  FormLabel,
  FormMessage,
} from "../ui/form";

import { planoSchema, type PlanoFormInput } from "@/utils/planoSchema";
import { createPlano, listPlanos, updatePlano, deletePlano, listPeriodos } from "@/actions/plano_data";
import type { Plano, Periodo } from "@/types/catalogo";
import { TURMAS_BY_NUCLEO, NUCLEO_LABELS, type Nucleo } from "@/utils/turmas";
import { formatCurrencyInput, parseCurrencyToNumber, numberToCurrencyInput } from "@/utils/formatters";

const PERIODO_ORDER = ["mensal", "trimestral", "semestral", "anual"];

const defaultValues: PlanoFormInput = {
  tipo_plano: "",
  frequencia: 1,
  turmas: [],
  nucleo: "matriz",
  gratuidade: false,
  bolsa_parcial: false,
  preco_original: "",
  preco_desconto: "",
  preco_familia: "",
};

function formatPriceShort(value: number): string {
  return Number.isInteger(value)
    ? value.toLocaleString("pt-BR")
    : value.toLocaleString("pt-BR", { minimumFractionDigits: 2, maximumFractionDigits: 2 });
}

function capitalize(value: string): string {
  return value.charAt(0).toUpperCase() + value.slice(1);
}

function getTurmaLabel(nucleo: Nucleo, turmas: string[]): string {
  if (!turmas || turmas.length === 0) return "";
  const categorias = new Set<string>();
  for (const group of TURMAS_BY_NUCLEO[nucleo] || []) {
    const pertenceAoGrupo =
      group.horarios.some((h) => turmas.includes(h.value)) ||
      turmas.some((t) => t.startsWith(`${group.categoria} `));
    if (pertenceAoGrupo) {
      categorias.add(group.categoria);
    }
  }
  return Array.from(categorias).join(" / ");
}

function buildNomePlano(data: {
  nucleo: string;
  frequencia: number;
  gratuidade?: boolean;
  bolsa_parcial?: boolean;
  periodoLabel?: string;
  turmaLabel?: string;
  preco_original?: number;
  preco_desconto?: number;
  preco_familia?: number;
}): string {
  const nucleoLabel = NUCLEO_LABELS[data.nucleo as Nucleo] || data.nucleo;

  if (data.gratuidade) {
    const parts = ["Bolsa", nucleoLabel];
    if (data.periodoLabel) parts.push(data.periodoLabel);
    parts.push(`${data.frequencia}x`);
    if (data.turmaLabel) parts.push(data.turmaLabel);
    return parts.join(" ");
  }

  const prefixo = data.bolsa_parcial ? "Bolsa Parcial" : "Núcleo";
  const base = `${prefixo} ${nucleoLabel} ${data.frequencia}x - R$${data.preco_original !== undefined ? formatPriceShort(data.preco_original) : "0"}`;

  const extras: string[] = [];
  if (data.preco_desconto !== undefined) extras.push(`desc. ${formatPriceShort(data.preco_desconto)}`);
  if (data.preco_familia !== undefined) extras.push(`desc. família ${formatPriceShort(data.preco_familia)}`);

  return extras.length > 0 ? `${base} (${extras.join(" · ")})` : base;
}

export function Plans() {
  const [plans, setPlans] = useState<Plano[]>([]);
  const [periods, setPeriods] = useState<Periodo[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [editingPlan, setEditingPlan] = useState<Plano | null>(null);
  const [customTurma, setCustomTurma] = useState("");
  const [customCategoria, setCustomCategoria] = useState("");

  const form = useForm<PlanoFormInput>({
    resolver: zodResolver(planoSchema),
    defaultValues,
  });

  const selectedNucleo = (form.watch("nucleo") || "matriz") as Nucleo;
  const turmaGroups = TURMAS_BY_NUCLEO[selectedNucleo] || [];
  const isGratuidade = form.watch("gratuidade");
  const isBolsaParcial = form.watch("bolsa_parcial");

  const handleFormattedChange = (fieldName: "preco_original" | "preco_desconto" | "preco_familia", formatter: (val: string) => string) => {
    return (e: React.ChangeEvent<HTMLInputElement>) => {
      form.setValue(fieldName, formatter(e.target.value));
    };
  };

  const fetchData = async () => {
    setIsLoading(true);
    const [plansRes, periodsRes] = await Promise.all([listPlanos(), listPeriodos()]);

    if (plansRes.result === "sucesso") {
      setPlans(plansRes.planos || []);
    }
    if (periodsRes.result === "sucesso") {
      const filtered = (periodsRes.periodos || []).filter((p: Periodo) => p.nome_periodo !== "semanal");
      filtered.sort((a, b) => {
        const posA = PERIODO_ORDER.indexOf(a.nome_periodo);
        const posB = PERIODO_ORDER.indexOf(b.nome_periodo);
        return (posA === -1 ? PERIODO_ORDER.length : posA) - (posB === -1 ? PERIODO_ORDER.length : posB);
      });
      setPeriods(filtered);
    }
    setIsLoading(false);
  };

  useEffect(() => {
    fetchData();
  }, []);

  const onSubmit = async (data: PlanoFormInput) => {
    try {
      const preco_original = data.gratuidade ? 0 : parseCurrencyToNumber(data.preco_original) ?? 0;
      const preco_desconto = data.gratuidade || data.bolsa_parcial ? undefined : parseCurrencyToNumber(data.preco_desconto);
      const preco_familia = data.gratuidade || data.bolsa_parcial ? undefined : parseCurrencyToNumber(data.preco_familia);

      const periodoLabel = periods.find((p) => p.id_periodo === data.tipo_plano)?.nome_periodo;
      const turmaLabel = getTurmaLabel(data.nucleo as Nucleo, data.turmas || []);

      const payload = {
        ...data,
        nome_plano: buildNomePlano({
          nucleo: data.nucleo,
          frequencia: data.frequencia,
          gratuidade: data.gratuidade,
          bolsa_parcial: data.bolsa_parcial,
          periodoLabel: periodoLabel ? capitalize(periodoLabel) : undefined,
          turmaLabel,
          preco_original,
          preco_desconto,
          preco_familia,
        }),
        preco_original,
        preco_desconto,
        preco_familia,
      };

      const res = editingPlan ? await updatePlano(editingPlan.id_plano, payload) : await createPlano(payload);

      if (res.result === "sucesso") {
        toast.success(editingPlan ? "Plano atualizado com sucesso!" : "Plano criado com sucesso!");
        setIsModalOpen(false);
        fetchData();
      } else {
        toast.error("Erro ao salvar plano: " + res.details);
      }
    } catch {
      toast.error("Ocorreu um erro inesperado.");
    }
  };

  const handleDeletePlan = async (planId: string) => {
    if (!confirm("Tem certeza que deseja excluir este plano?")) return;

    const res = await deletePlano(planId);
    if (res.result === "sucesso") {
      toast.success("Plano excluído com sucesso!");
      fetchData();
    } else {
      toast.error("Erro ao excluir: " + res.details);
    }
  };

  const openPlanModal = (plan?: Plano) => {
    if (plan) {
      setEditingPlan(plan);
      form.reset({
        tipo_plano: plan.tipo_plano,
        frequencia: plan.frequencia,
        turmas: plan.turmas || [],
        nucleo: plan.nucleo || "matriz",
        gratuidade: plan.gratuidade || false,
        bolsa_parcial: plan.bolsa_parcial || false,
        preco_original: numberToCurrencyInput(plan.preco_original),
        preco_desconto: numberToCurrencyInput(plan.preco_desconto),
        preco_familia: numberToCurrencyInput(plan.preco_familia),
      });
    } else {
      setEditingPlan(null);
      form.reset(defaultValues);
    }
    setCustomTurma("");
    setCustomCategoria("");
    setIsModalOpen(true);
  };

  return (
    <div className="space-y-8">
      <motion.div
        initial={{ opacity: 0, y: -20 }}
        animate={{ opacity: 1, y: 0 }}
        className="flex justify-between items-start"
      >
        <div>
          <h1 className="text-3xl font-bold text-foreground mb-2">Gestão de planos</h1>
          <p className="inline-block text-foreground bg-white/80 backdrop-blur-sm px-3 py-1 rounded-lg shadow-sm">
            Gerencie os planos da CTE Capoeiragem
          </p>
        </div>
        <Button
          onClick={() => openPlanModal()}
          className="bg-accent hover:bg-accent/90 text-accent-foreground"
        >
          <Plus className="w-5 h-5 mr-2" />
          Novo plano
        </Button>
      </motion.div>

      {isLoading ? (
        <div className="flex justify-center items-center py-20">
          <Loader2 className="w-10 h-10 text-accent animate-spin" />
        </div>
      ) : (
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.1 }}
          className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6"
        >
          <AnimatePresence>
            {plans.map((plan) => (
              <motion.div
                key={plan.id_plano}
                initial={{ opacity: 0, scale: 0.95 }}
                animate={{ opacity: 1, scale: 1 }}
                exit={{ opacity: 0, scale: 0.95 }}
                className="bg-card border border-border rounded-xl p-6 shadow-lg hover:shadow-xl transition-shadow"
              >
                <div className="flex items-start justify-between mb-4">
                  <div className="flex-1">
                    <h3 className="text-xl font-bold text-foreground mb-1">{plan.nome_plano}</h3>
                    <p className="text-sm text-muted-foreground capitalize">
                      {plan.periodos?.nome_periodo || "N/A"}
                      {plan.produtos?.tipo_produto ? ` · ${plan.produtos.tipo_produto}` : ""}
                      {plan.nucleo ? ` · ${NUCLEO_LABELS[plan.nucleo]}` : ""}
                    </p>
                  </div>
                  <div className="flex gap-2">
                    <Button variant="ghost" size="sm" onClick={() => openPlanModal(plan)} className="text-accent h-8 w-8 p-0">
                      <Edit className="w-4 h-4" />
                    </Button>
                    <Button variant="ghost" size="sm" onClick={() => handleDeletePlan(plan.id_plano)} className="text-destructive h-8 w-8 p-0">
                      <Trash2 className="w-4 h-4" />
                    </Button>
                  </div>
                </div>

                <div className="space-y-3 border-t border-border pt-4">
                  <div className="flex items-center justify-between">
                    <span className="text-sm text-muted-foreground">Frequência:</span>
                    <span className="text-sm font-semibold text-foreground">{plan.frequencia}x por semana</span>
                  </div>

                  {plan.turmas && plan.turmas.length > 0 && (
                    <div className="pt-1">
                      <span className="text-sm text-muted-foreground">Turmas:</span>
                      <ul className="mt-1 space-y-0.5">
                        {plan.turmas.map((turma) => (
                          <li key={turma} className="text-xs text-foreground">{turma}</li>
                        ))}
                      </ul>
                    </div>
                  )}

                  {plan.gratuidade ? (
                    <div className="bg-accent/5 rounded-lg p-3">
                      <span className="text-sm font-bold text-accent">Gratuidade (bolsa integral)</span>
                    </div>
                  ) : (
                    <div className="bg-accent/5 rounded-lg p-3 space-y-2">
                      {plan.bolsa_parcial && (
                        <span className="text-xs font-bold text-accent uppercase tracking-wide">Bolsa parcial</span>
                      )}
                      {plan.preco_desconto !== undefined && plan.preco_desconto !== null && (
                        <div className="flex items-baseline justify-between">
                          <span className="text-sm text-muted-foreground">C/ desconto:</span>
                          <span className="text-lg font-bold text-accent">R$ {Number(plan.preco_desconto).toFixed(2)}</span>
                        </div>
                      )}
                      <div className="flex items-baseline justify-between">
                        <span className="text-sm text-muted-foreground">{plan.preco_desconto ? "S/ desconto:" : "Preço:"}</span>
                        <span className={`text-base text-foreground ${plan.preco_desconto ? "line-through text-muted-foreground/50 text-sm" : "font-bold text-accent text-lg"}`}>
                          R$ {Number(plan.preco_original).toFixed(2)}
                        </span>
                      </div>
                      {plan.preco_familia !== undefined && plan.preco_familia !== null && (
                        <div className="flex items-baseline justify-between">
                          <span className="text-sm text-muted-foreground">Preço família:</span>
                          <span className="text-lg font-bold text-accent">R$ {Number(plan.preco_familia).toFixed(2)}</span>
                        </div>
                      )}
                    </div>
                  )}

                  {plan.produtos?.descricao_produto && (
                    <p className="text-sm text-foreground border-t border-border pt-3">
                      {plan.produtos.descricao_produto}
                    </p>
                  )}
                </div>
              </motion.div>
            ))}
          </AnimatePresence>
        </motion.div>
      )}

      {plans.length === 0 && !isLoading && (
        <div className="text-center py-16 bg-card border border-border rounded-xl">
          <CalendarCheck className="w-16 h-16 mx-auto text-muted-foreground mb-4" />
          <p className="text-muted-foreground">Nenhum plano cadastrado</p>
        </div>
      )}

      {/* Modal de Plano (já inclui os campos de produto) */}
      <Dialog open={isModalOpen} onOpenChange={setIsModalOpen}>
        <DialogContent className="max-w-3xl max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle className="text-2xl font-bold text-foreground flex items-center gap-2">
              <Settings className="w-6 h-6 text-accent" />
              {editingPlan ? "Editar plano" : "Novo plano"}
            </DialogTitle>
          </DialogHeader>
          <Form {...form}>
            <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-6 mt-6">
              <div className="grid grid-cols-3 gap-4">
                <FormField
                  control={form.control}
                  name="nucleo"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel className="font-medium">Núcleo *</FormLabel>
                      <Select
                        onValueChange={(value) => {
                          field.onChange(value);
                          form.setValue("turmas", []);
                        }}
                        defaultValue={field.value}
                        value={field.value}
                      >
                        <FormControl>
                          <SelectTrigger className="bg-input-background border-accent/20 focus:border-accent">
                            <SelectValue placeholder="Selecione" />
                          </SelectTrigger>
                        </FormControl>
                        <SelectContent>
                          <SelectItem value="matriz">Matriz</SelectItem>
                          <SelectItem value="minimundo">MiniMundo</SelectItem>
                        </SelectContent>
                      </Select>
                      <FormMessage />
                    </FormItem>
                  )}
                />
                <FormField
                  control={form.control}
                  name="tipo_plano"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel className="font-medium">Período *</FormLabel>
                      <Select onValueChange={field.onChange} defaultValue={field.value} value={field.value}>
                        <FormControl>
                          <SelectTrigger className="bg-input-background border-accent/20 focus:border-accent">
                            <SelectValue placeholder="Selecione" />
                          </SelectTrigger>
                        </FormControl>
                        <SelectContent>
                          {periods.map((period) => (
                            <SelectItem key={period.id_periodo} value={period.id_periodo}>
                              {period.nome_periodo}
                            </SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
                      <FormMessage />
                    </FormItem>
                  )}
                />
                <FormField
                  control={form.control}
                  name="frequencia"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel className="font-medium">Frequência *</FormLabel>
                      <Select onValueChange={(val) => field.onChange(parseInt(val))} defaultValue={field.value?.toString()} value={field.value?.toString()}>
                        <FormControl>
                          <SelectTrigger className="bg-input-background border-accent/20 focus:border-accent">
                            <SelectValue placeholder="Selecione" />
                          </SelectTrigger>
                        </FormControl>
                        <SelectContent>
                          <SelectItem value="1">1x por semana</SelectItem>
                          <SelectItem value="2">2x por semana</SelectItem>
                          <SelectItem value="3">3x por semana</SelectItem>
                        </SelectContent>
                      </Select>
                      <FormMessage />
                    </FormItem>
                  )}
                />
              </div>

              <FormField
                control={form.control}
                name="turmas"
                render={({ field }) => {
                  const predefinedValues = new Set(turmaGroups.flatMap((g) => g.horarios.map((h) => h.value)));
                  const categoriaAtual = customCategoria || turmaGroups[0]?.categoria || "";

                  const customTurmasDoGrupo = (categoria: string) =>
                    (field.value || []).filter(
                      (t) => !predefinedValues.has(t) && t.startsWith(`${categoria} `)
                    );

                  const categoriasConhecidas = new Set(turmaGroups.map((g) => g.categoria));
                  const outrasTurmasPersonalizadas = (field.value || []).filter(
                    (t) => !predefinedValues.has(t) && ![...categoriasConhecidas].some((c) => t.startsWith(`${c} `))
                  );

                  const removeTurma = (turma: string) =>
                    field.onChange((field.value || []).filter((t) => t !== turma));

                  const addCustomTurma = () => {
                    const texto = customTurma.trim();
                    if (!texto || !categoriaAtual) return;
                    const value = `${categoriaAtual} ${texto}`;
                    const current = field.value || [];
                    if (!current.includes(value)) {
                      field.onChange([...current, value]);
                    }
                    setCustomTurma("");
                  };

                  return (
                    <FormItem>
                      <FormLabel className="font-medium">Turmas — {NUCLEO_LABELS[selectedNucleo]}</FormLabel>
                      <div className="border border-accent/20 rounded-lg p-4 bg-input-background space-y-3">
                        {turmaGroups.map((group) => {
                          const customsDoGrupo = customTurmasDoGrupo(group.categoria);
                          return (
                            <div key={group.categoria}>
                              <p className="text-xs font-semibold uppercase tracking-wide text-accent mb-1.5">{group.categoria}</p>
                              <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-x-4 gap-y-1">
                                {group.horarios.map((horario) => {
                                  const checked = field.value?.includes(horario.value) ?? false;
                                  return (
                                    <label key={horario.value} className="flex items-center gap-2 text-sm text-foreground cursor-pointer">
                                      <Checkbox
                                        checked={checked}
                                        onCheckedChange={(value) => {
                                          const current = field.value || [];
                                          field.onChange(
                                            value ? [...current, horario.value] : current.filter((t) => t !== horario.value)
                                          );
                                        }}
                                      />
                                      {horario.label}
                                    </label>
                                  );
                                })}
                                {customsDoGrupo.map((turma) => (
                                  <label key={turma} className="flex items-center gap-2 text-sm text-foreground cursor-pointer">
                                    <Checkbox
                                      checked
                                      onCheckedChange={(value) => {
                                        if (!value) removeTurma(turma);
                                      }}
                                    />
                                    {turma.slice(group.categoria.length).trim()}{" "}
                                    <span className="text-xs text-muted-foreground">(personalizado)</span>
                                  </label>
                                ))}
                              </div>
                            </div>
                          );
                        })}

                        <div className="border-t border-accent/20 pt-3">
                          <p className="text-xs font-semibold uppercase tracking-wide text-accent mb-1.5">
                            Adicionar turma personalizada
                          </p>
                          <p className="text-xs text-muted-foreground mb-2">
                            Não encontrou o horário desejado? Escolha a categoria e descreva o horário manualmente
                            (ex: "sáb – 12h às 14h"). A turma personalizada vale só para este plano e não altera a
                            lista de turmas pré-definidas.
                          </p>
                          <div className="flex items-center gap-2">
                            <Select value={categoriaAtual} onValueChange={setCustomCategoria}>
                              <SelectTrigger className="w-40 shrink-0 bg-background border-accent/20 focus:border-accent">
                                <SelectValue placeholder="Categoria" />
                              </SelectTrigger>
                              <SelectContent>
                                {turmaGroups.map((group) => (
                                  <SelectItem key={group.categoria} value={group.categoria}>
                                    {group.categoria}
                                  </SelectItem>
                                ))}
                              </SelectContent>
                            </Select>
                            <Input
                              value={customTurma}
                              onChange={(e) => setCustomTurma(e.target.value)}
                              onKeyDown={(e) => {
                                if (e.key === "Enter") {
                                  e.preventDefault();
                                  addCustomTurma();
                                }
                              }}
                              placeholder="Ex: sáb – 12h às 14h"
                              className="bg-background border-accent/20 focus:border-accent"
                            />
                            <Button type="button" variant="outline" onClick={addCustomTurma}>
                              <Plus className="w-4 h-4 mr-1" />
                              Adicionar
                            </Button>
                          </div>

                          {outrasTurmasPersonalizadas.length > 0 && (
                            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-x-4 gap-y-1 mt-3">
                              {outrasTurmasPersonalizadas.map((turma) => (
                                <label key={turma} className="flex items-center gap-2 text-sm text-foreground cursor-pointer">
                                  <Checkbox
                                    checked
                                    onCheckedChange={(value) => {
                                      if (!value) removeTurma(turma);
                                    }}
                                  />
                                  {turma} <span className="text-xs text-muted-foreground">(personalizado)</span>
                                </label>
                              ))}
                            </div>
                          )}
                        </div>
                      </div>
                      <FormMessage />
                    </FormItem>
                  );
                }}
              />

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <FormField
                  control={form.control}
                  name="gratuidade"
                  render={({ field }) => (
                    <FormItem>
                      <label className="flex items-center gap-2 text-sm text-foreground cursor-pointer border border-accent/20 rounded-lg p-4 bg-input-background h-full">
                        <FormControl>
                          <Checkbox
                            checked={field.value}
                            onCheckedChange={(value) => {
                              field.onChange(!!value);
                              if (value) form.setValue("bolsa_parcial", false);
                            }}
                          />
                        </FormControl>
                        <div>
                          <span className="font-medium">Gratuidade</span>
                          <p className="text-xs text-muted-foreground">
                            Plano de bolsa integral, sem cobrança. O nome do plano será gerado automaticamente
                            como "Bolsa {NUCLEO_LABELS[selectedNucleo]} ...".
                          </p>
                        </div>
                      </label>
                      <FormMessage />
                    </FormItem>
                  )}
                />

                <FormField
                  control={form.control}
                  name="bolsa_parcial"
                  render={({ field }) => (
                    <FormItem>
                      <div className="border border-accent/20 rounded-lg p-4 bg-input-background h-full space-y-3">
                        <label className="flex items-center gap-2 text-sm text-foreground cursor-pointer">
                          <FormControl>
                            <Checkbox
                              checked={field.value}
                              onCheckedChange={(value) => {
                                field.onChange(!!value);
                                if (value) form.setValue("gratuidade", false);
                              }}
                            />
                          </FormControl>
                          <div>
                            <span className="font-medium">Bolsa parcial</span>
                            <p className="text-xs text-muted-foreground">
                              Plano com desconto de bolsa. Informe abaixo o valor efetivamente cobrado. O nome do
                              plano será gerado automaticamente como "Bolsa Parcial {NUCLEO_LABELS[selectedNucleo]} ...".
                            </p>
                          </div>
                        </label>
                        {field.value && (
                          <FormField
                            control={form.control}
                            name="preco_original"
                            render={({ field: precoField }) => (
                              <FormItem>
                                <FormLabel className="font-medium text-xs">Valor cobrado *</FormLabel>
                                <div className="flex items-center gap-2">
                                  <span className="text-sm text-muted-foreground font-medium">R$</span>
                                  <FormControl>
                                    <Input
                                      {...precoField}
                                      value={precoField.value || ""}
                                      type="text"
                                      inputMode="decimal"
                                      placeholder="0,00"
                                      className="bg-background border-accent/20 focus:border-accent"
                                      onChange={handleFormattedChange("preco_original", formatCurrencyInput)}
                                    />
                                  </FormControl>
                                </div>
                                <FormMessage />
                              </FormItem>
                            )}
                          />
                        )}
                      </div>
                      <FormMessage />
                    </FormItem>
                  )}
                />
              </div>

              {!isGratuidade && !isBolsaParcial && (
              <div className="grid grid-cols-3 gap-4">
                <FormField
                  control={form.control}
                  name="preco_original"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel className="font-medium">Preço original *</FormLabel>
                      <div className="flex items-center gap-2">
                        <span className="text-sm text-muted-foreground font-medium">R$</span>
                        <FormControl>
                          <Input
                            {...field}
                            value={field.value || ""}
                            type="text"
                            inputMode="decimal"
                            placeholder="0,00"
                            className="bg-input-background border-accent/20 focus:border-accent"
                            onChange={handleFormattedChange("preco_original", formatCurrencyInput)}
                          />
                        </FormControl>
                      </div>
                      <FormMessage />
                    </FormItem>
                  )}
                />
                <FormField
                  control={form.control}
                  name="preco_desconto"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel className="font-medium">Preço c/ desconto</FormLabel>
                      <div className="flex items-center gap-2">
                        <span className="text-sm text-muted-foreground font-medium">R$</span>
                        <FormControl>
                          <Input
                            {...field}
                            value={field.value || ""}
                            type="text"
                            inputMode="decimal"
                            placeholder="Opcional"
                            className="bg-input-background border-accent/20 focus:border-accent"
                            onChange={handleFormattedChange("preco_desconto", formatCurrencyInput)}
                          />
                        </FormControl>
                      </div>
                      <FormMessage />
                    </FormItem>
                  )}
                />
                <FormField
                  control={form.control}
                  name="preco_familia"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel className="font-medium">Preço família</FormLabel>
                      <div className="flex items-center gap-2">
                        <span className="text-sm text-muted-foreground font-medium">R$</span>
                        <FormControl>
                          <Input
                            {...field}
                            value={field.value || ""}
                            type="text"
                            inputMode="decimal"
                            placeholder="Opcional"
                            className="bg-input-background border-accent/20 focus:border-accent"
                            onChange={handleFormattedChange("preco_familia", formatCurrencyInput)}
                          />
                        </FormControl>
                      </div>
                      <FormMessage />
                    </FormItem>
                  )}
                />
              </div>
              )}

              <div className="flex justify-end gap-3 pt-6 border-t">
                <Button type="button" variant="outline" onClick={() => setIsModalOpen(false)}>Cancelar</Button>
                <Button
                  type="submit"
                  disabled={form.formState.isSubmitting}
                  className="bg-accent hover:bg-accent/90 text-white min-w-[100px]"
                >
                  {form.formState.isSubmitting ? (
                    <Loader2 className="w-4 h-4 animate-spin" />
                  ) : (
                    <>
                      <Save className="w-4 h-4 mr-2" />
                      {editingPlan ? "Salvar" : "Adicionar"}
                    </>
                  )}
                </Button>
              </div>
            </form>
          </Form>
        </DialogContent>
      </Dialog>
    </div>
  );
}
