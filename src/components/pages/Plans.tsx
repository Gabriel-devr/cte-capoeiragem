"use client";

import { useEffect, useState } from "react";
import { motion, AnimatePresence } from "motion/react";
import { Settings, Plus, Edit, Trash2, Save, CalendarCheck, Loader2 } from "lucide-react";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { toast } from "sonner";

import { Button } from "../ui/button";
import { Input } from "../ui/input";
import { Textarea } from "../ui/textarea";
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

import { planoSchema, type PlanoFormData } from "@/utils/planoSchema";
import { createPlano, listPlanos, updatePlano, deletePlano, listPeriodos } from "@/actions/plano_data";
import type { Plano, Periodo } from "@/types/catalogo";

const defaultValues: PlanoFormData = {
  nome_plano: "",
  tipo_plano: "",
  frequencia: 1,
  preco_original: "0",
  preco_desconto: "",
  tipo_produto: "",
  descricao_produto: "",
};

export function Plans() {
  const [plans, setPlans] = useState<Plano[]>([]);
  const [periods, setPeriods] = useState<Periodo[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [editingPlan, setEditingPlan] = useState<Plano | null>(null);

  const form = useForm<PlanoFormData>({
    resolver: zodResolver(planoSchema),
    defaultValues,
  });

  const fetchData = async () => {
    setIsLoading(true);
    const [plansRes, periodsRes] = await Promise.all([listPlanos(), listPeriodos()]);

    if (plansRes.result === "sucesso") {
      setPlans(plansRes.planos || []);
    }
    if (periodsRes.result === "sucesso") {
      setPeriods(periodsRes.periodos || []);
    }
    setIsLoading(false);
  };

  useEffect(() => {
    fetchData();
  }, []);

  const onSubmit = async (data: PlanoFormData) => {
    try {
      const res = editingPlan ? await updatePlano(editingPlan.id_plano, data) : await createPlano(data);

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
        nome_plano: plan.nome_plano,
        tipo_plano: plan.tipo_plano,
        frequencia: plan.frequencia,
        preco_original: plan.preco_original.toString(),
        preco_desconto: plan.preco_desconto?.toString() || "",
        tipo_produto: plan.produtos?.tipo_produto || "",
        descricao_produto: plan.produtos?.descricao_produto || "",
      });
    } else {
      setEditingPlan(null);
      form.reset(defaultValues);
    }
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
          <h1 className="text-3xl font-bold text-foreground mb-2">Gestão de Planos</h1>
          <p className="inline-block text-foreground bg-white/80 backdrop-blur-sm px-3 py-1 rounded-lg shadow-sm">
            Gerencie os Planos da CTE Capoeiragem
          </p>
        </div>
        <Button
          onClick={() => openPlanModal()}
          className="bg-accent hover:bg-accent/90 text-accent-foreground"
        >
          <Plus className="w-5 h-5 mr-2" />
          Novo Plano
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

                  <div className="bg-accent/5 rounded-lg p-3 space-y-2">
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
                  </div>

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
        <DialogContent className="max-w-2xl">
          <DialogHeader>
            <DialogTitle className="text-2xl font-bold text-foreground flex items-center gap-2">
              <Settings className="w-6 h-6 text-accent" />
              {editingPlan ? "Editar Plano" : "Novo Plano"}
            </DialogTitle>
          </DialogHeader>
          <Form {...form}>
            <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-6 mt-6">
              <FormField
                control={form.control}
                name="nome_plano"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel className="font-medium">Nome do Plano *</FormLabel>
                    <FormControl>
                      <Input
                        {...field}
                        placeholder="Ex: Mensal 2x/semana"
                        className="bg-input-background border-accent/20 focus:border-accent"
                      />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />

              <div className="grid grid-cols-2 gap-4">
                <FormField
                  control={form.control}
                  name="tipo_plano"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel className="font-medium">Período *</FormLabel>
                      <Select onValueChange={field.onChange} defaultValue={field.value} value={field.value}>
                        <FormControl>
                          <SelectTrigger className="bg-input-background border-accent/20 focus:border-accent">
                            <SelectValue placeholder="Selecione um período" />
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
                          <SelectItem value="4">4x por semana</SelectItem>
                          <SelectItem value="5">5x por semana</SelectItem>
                          <SelectItem value="6">6x por semana</SelectItem>
                        </SelectContent>
                      </Select>
                      <FormMessage />
                    </FormItem>
                  )}
                />
              </div>

              <div className="grid grid-cols-2 gap-4">
                <FormField
                  control={form.control}
                  name="preco_original"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel className="font-medium">Preço Original *</FormLabel>
                      <div className="flex items-center gap-2">
                        <span className="text-sm text-muted-foreground font-medium">R$</span>
                        <FormControl>
                          <Input
                            {...field}
                            type="text"
                            className="bg-input-background border-accent/20 focus:border-accent"
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
                      <FormLabel className="font-medium">Preço c/ Desconto</FormLabel>
                      <div className="flex items-center gap-2">
                        <span className="text-sm text-muted-foreground font-medium">R$</span>
                        <FormControl>
                          <Input
                            {...field}
                            type="text"
                            placeholder="Opcional"
                            className="bg-input-background border-accent/20 focus:border-accent"
                          />
                        </FormControl>
                      </div>
                      <FormMessage />
                    </FormItem>
                  )}
                />
              </div>

              <div className="grid grid-cols-2 gap-4">
                <FormField
                  control={form.control}
                  name="tipo_produto"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel className="font-medium">Categoria do Produto</FormLabel>
                      <FormControl>
                        <Input
                          {...field}
                          placeholder="Ex: Assinatura"
                          className="bg-input-background border-accent/20 focus:border-accent"
                        />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />
              </div>

              <FormField
                control={form.control}
                name="descricao_produto"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel className="font-medium">Descrição do Produto</FormLabel>
                    <FormControl>
                      <Textarea
                        {...field}
                        placeholder="Ex: Descrição detalhada exibida para o aluno"
                        className="bg-input-background border-accent/20 focus:border-accent min-h-24"
                      />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />

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
