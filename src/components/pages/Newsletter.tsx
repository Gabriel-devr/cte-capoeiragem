"use client";

import { useState, useEffect } from "react";
import { motion, AnimatePresence } from "motion/react";
import { Plus, Users, Trash2, Edit, Loader2, FileText } from "lucide-react";
import { ImageWithFallback } from "../fallback/ImageWithFallback";
import { InformativoPost } from "../InformativoPost";
import { Button } from "../ui/button";
import { Input } from "../ui/input";
import { Label } from "../ui/label";
import { Textarea } from "../ui/textarea";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "../ui/dialog";
import { Select, SelectContent, SelectGroup, SelectItem, SelectLabel, SelectTrigger, SelectValue } from "../ui/select";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { toast } from "sonner";
import { newsletterSchema, type NewsletterFormInput } from "@/utils/newsletterSchema";
import { TURMAS_BY_NUCLEO, NUCLEO_LABELS, type Nucleo } from "@/utils/turmas";
import {
  createNewsletter,
  listNewsletters,
  updateNewsletter,
  deleteNewsletter,
  uploadNewsletterImage,
} from "@/actions/newsletter_data";
import { listPlanos } from "@/actions/plano_data";
import { listStudent } from "@/actions/student_data";
import {
  Form,
  FormControl,
  FormField,
  FormItem,
  FormLabel,
  FormMessage,
} from "../ui/form";

interface Newsletter {
  id: number;
  title: string;
  date: string;
  author: string;
  category: string;
  image: string;
  excerpt: string;
  target_audience?: 'all' | 'plano' | 'turma' | 'aluno';
  target_plano_id?: string | null;
  target_turma?: string | null;
  target_student_id?: string | null;
  target_plano?: { nome_plano: string } | null;
  target_student?: { full_name: string; nickname: string | null } | null;
}

interface PlanoOption {
  id_plano: string;
  nome_plano: string;
}

interface StudentOption {
  student_id: string;
  full_name: string;
  nickname: string | null;
}

const AUDIENCE_BADGE_CLASSES: Record<string, string> = {
  all: "bg-slate-700 text-white",
  plano: "bg-blue-600 text-white",
  turma: "bg-purple-600 text-white",
  aluno: "bg-emerald-600 text-white",
};

function getAudienceLabel(newsletter: Newsletter): string {
  switch (newsletter.target_audience) {
    case "plano":
      return `Plano: ${newsletter.target_plano?.nome_plano ?? "—"}`;
    case "turma":
      return `Turma: ${newsletter.target_turma ?? "—"}`;
    case "aluno":
      return `Aluno: ${newsletter.target_student?.full_name ?? "—"}`;
    default:
      return "Todos";
  }
}

export function Newsletter() {
  const [newsletters, setNewsletters] = useState<Newsletter[]>([]);
  const [planos, setPlanos] = useState<PlanoOption[]>([]);
  const [students, setStudents] = useState<StudentOption[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [editingNewsletter, setEditingNewsletter] = useState<Newsletter | null>(null);
  const [isUploadingImage, setIsUploadingImage] = useState(false);
  const [currentPage, setCurrentPage] = useState(1);
  const itemsPerPage = 6;

  const form = useForm<NewsletterFormInput>({
    resolver: zodResolver(newsletterSchema),
    defaultValues: {
      title: "",
      category: "",
      image: "",
      excerpt: "",
      target_audience: "all",
      target_plano_id: "",
      target_turma: "",
      target_student_id: "",
    }
  });

  const targetAudience = form.watch("target_audience");

  const handleImageUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    if (!file.type.startsWith("image/")) {
      toast.error("Selecione um arquivo de imagem");
      return;
    }

    setIsUploadingImage(true);
    const formData = new FormData();
    formData.append("file", file);
    const res = await uploadNewsletterImage(formData);
    setIsUploadingImage(false);

    if (res.result === "sucesso") {
      form.setValue("image", res.url, { shouldValidate: true });
    } else {
      toast.error("Erro ao enviar imagem: " + res.details);
    }
  };

  const fetchNewsletters = async () => {
    setIsLoading(true);
    const [newslettersRes, planosRes, studentsRes] = await Promise.all([
      listNewsletters(),
      listPlanos(),
      listStudent(),
    ]);
    if (newslettersRes.result === "sucesso") {
      setNewsletters(newslettersRes.data || []);
    } else {
      toast.error("Erro ao carregar informativos: " + newslettersRes.details);
    }
    if (planosRes.result === "sucesso") setPlanos(planosRes.planos || []);
    if (studentsRes.result === "sucesso") setStudents(studentsRes.students || []);
    setIsLoading(false);
  };

  useEffect(() => {
    fetchNewsletters();
  }, []);

  // Calcular total de páginas
  const totalPages = Math.ceil(newsletters.length / itemsPerPage);

  // Pegar itens da página atual
  const indexOfLastItem = currentPage * itemsPerPage;
  const indexOfFirstItem = indexOfLastItem - itemsPerPage;
  const currentNewsletters = newsletters.slice(indexOfFirstItem, indexOfLastItem);

  const handleOpenModal = (newsletter?: Newsletter) => {
    if (newsletter) {
      setEditingNewsletter(newsletter);
      form.reset({
        title: newsletter.title,
        category: newsletter.category,
        image: newsletter.image,
        excerpt: newsletter.excerpt,
        target_audience: newsletter.target_audience || "all",
        target_plano_id: newsletter.target_plano_id || "",
        target_turma: newsletter.target_turma || "",
        target_student_id: newsletter.target_student_id || "",
      });
    } else {
      setEditingNewsletter(null);
      form.reset({
        title: "",
        category: "",
        image: "",
        excerpt: "",
        target_audience: "all",
        target_plano_id: "",
        target_turma: "",
        target_student_id: "",
      });
    }
    setIsModalOpen(true);
  };

  const handleCloseModal = () => {
    setIsModalOpen(false);
    setEditingNewsletter(null);
    form.reset();
  };

  const onSubmit = async (data: NewsletterFormInput) => {
    const audience = data.target_audience ?? "all";
    const payload = {
      ...data,
      author: "CTE Capoeiragem",
      target_audience: audience,
      target_plano_id: audience === "plano" ? data.target_plano_id || null : null,
      target_turma: audience === "turma" ? data.target_turma || null : null,
      target_student_id: audience === "aluno" ? data.target_student_id || null : null,
    };
    let res;
    if (editingNewsletter) {
      res = await updateNewsletter(editingNewsletter.id, payload);
    } else {
      res = await createNewsletter(payload);
    }

    if (res.result === "sucesso") {
      toast.success(editingNewsletter ? "Informativo atualizado!" : "Informativo criado!");
      handleCloseModal();
      fetchNewsletters();
    } else {
      toast.error("Erro ao salvar: " + res.details);
    }
  };

  const handleDelete = async (id: number) => {
    if (confirm("Tem certeza que deseja excluir este informativo?")) {
      const res = await deleteNewsletter(id);
      if (res.result === "sucesso") {
        toast.success("Informativo excluído!");
        fetchNewsletters();
      } else {
        toast.error("Erro ao excluir: " + res.details);
      }
    }
  };

  if (isLoading && newsletters.length === 0) {
    return (
      <div className="flex justify-center items-center py-20">
        <Loader2 className="w-10 h-10 text-accent animate-spin" />
      </div>
    );
  }

  return (
    <div className="max-w-6xl mx-auto space-y-10">
      <motion.div
        initial={{ opacity: 0, y: -20 }}
        animate={{ opacity: 1, y: 0 }}
        className="flex justify-between items-start"
      >
        <div>
          <h1 className="text-4xl font-bold text-foreground mb-3">Informativo</h1>
          <p className="inline-block text-lg text-foreground bg-white/80 backdrop-blur-sm px-3 py-1 rounded-lg shadow-sm">
            Explore nosso histórico de conteúdos
          </p>
        </div>
        <Button
          onClick={() => handleOpenModal()}
          className="bg-accent hover:bg-accent/90 text-white shadow-lg"
        >
          <Plus className="w-5 h-5 mr-2" />
          Novo informativo
        </Button>
      </motion.div>

      <div className="flex flex-col items-center gap-8">
        <AnimatePresence>
          {!isLoading && newsletters.length === 0 ? (
            <motion.div
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              className="w-full flex flex-col items-center justify-center p-16 text-center border-2 border-dashed border-border rounded-3xl bg-card/30"
            >
              <div className="w-20 h-20 rounded-full bg-muted flex items-center justify-center mb-6">
                <FileText className="w-10 h-10 text-muted-foreground" />
              </div>
              <h3 className="text-2xl font-bold text-foreground mb-2">Nenhum informativo publicado ainda</h3>
              <p className="text-muted-foreground max-w-md mx-auto">
                Clique no botão 'Novo informativo' no topo da página para criar sua primeira postagem e compartilhar com a comunidade.
              </p>
            </motion.div>
          ) : (
            currentNewsletters.map((newsletter, index) => (
              <motion.div
                key={newsletter.id}
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0, scale: 0.95 }}
                transition={{ delay: index * 0.1 }}
                className="w-full"
              >
                <InformativoPost
                  newsletter={newsletter}
                  headerActions={
                    <div className="flex items-center gap-1">
                      <button
                        onClick={() => handleOpenModal(newsletter)}
                        className="w-8 h-8 rounded-full flex items-center justify-center text-muted-foreground hover:bg-accent hover:text-white transition-all"
                        title="Editar informativo"
                      >
                        <Edit className="w-4 h-4" />
                      </button>
                      <button
                        onClick={() => handleDelete(newsletter.id)}
                        className="w-8 h-8 rounded-full flex items-center justify-center text-muted-foreground hover:bg-destructive hover:text-white transition-all"
                        title="Excluir informativo"
                      >
                        <Trash2 className="w-4 h-4" />
                      </button>
                    </div>
                  }
                  imageBadge={
                    <span className={`inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs font-semibold shadow-md ${
                      AUDIENCE_BADGE_CLASSES[newsletter.target_audience || "all"]
                    }`}>
                      <Users className="w-3 h-3" />
                      {getAudienceLabel(newsletter)}
                    </span>
                  }
                />
              </motion.div>
            ))
          )}
        </AnimatePresence>
      </div>

      {/* Paginação dinâmica */}
      {totalPages > 1 && (
        <div className="flex justify-center gap-3">
          {Array.from({ length: totalPages }, (_, i) => i + 1).map((page) => (
            <button
              key={page}
              onClick={() => setCurrentPage(page)}
              className={`w-12 h-12 rounded-xl transition-all text-base font-medium ${
                page === currentPage
                  ? "bg-accent text-accent-foreground shadow-md"
                  : "bg-card border-2 border-border text-muted-foreground hover:bg-muted hover:border-accent"
              }`}
            >
              {page}
            </button>
          ))}
        </div>
      )}

      {/* Modal de Criar/Editar Informativo */}
      <Dialog open={isModalOpen} onOpenChange={setIsModalOpen}>
        <DialogContent className="max-w-3xl max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle className="text-2xl font-bold text-foreground flex items-center gap-2">
              {editingNewsletter ? (
                <>
                  <Edit className="w-6 h-6 text-accent" />
                  Editar Informativo
                </>
              ) : (
                <>
                  <Plus className="w-6 h-6 text-accent" />
                  Novo informativo
                </>
              )}
            </DialogTitle>
          </DialogHeader>

          <Form {...form}>
            <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-6 mt-6">
              <div className="bg-accent/5 border-l-4 border-accent p-4 rounded-r-lg">
                <p className="text-sm text-muted-foreground">
                  Preencha os campos abaixo para {editingNewsletter ? "atualizar" : "criar"} o informativo
                </p>
              </div>

              <div className="space-y-6">
                <FormField
                  control={form.control}
                  name="title"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel className="text-foreground font-medium">Título do Informativo *</FormLabel>
                      <FormControl>
                        <Input
                          {...field}
                          placeholder="Ex: A Ginga: Fundamento e Filosofia"
                          className="bg-input-background border-accent/20 focus:border-accent focus:ring-accent/20"
                        />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />

                <FormField
                  control={form.control}
                  name="category"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel className="text-foreground font-medium">Categoria *</FormLabel>
                      <Select onValueChange={field.onChange} defaultValue={field.value} value={field.value}>
                        <FormControl>
                          <SelectTrigger className="bg-input-background border-accent/20 focus:border-accent focus:ring-accent/20">
                            <SelectValue placeholder="Selecione uma categoria" />
                          </SelectTrigger>
                        </FormControl>
                        <SelectContent>
                          <SelectItem value="Instrumentos">Instrumentos</SelectItem>
                          <SelectItem value="História">História</SelectItem>
                          <SelectItem value="Técnica">Técnica</SelectItem>
                          <SelectItem value="Eventos">Eventos</SelectItem>
                          <SelectItem value="Comunidade">Comunidade</SelectItem>
                          <SelectItem value="Circular Interna">Circular Interna</SelectItem>
                        </SelectContent>
                      </Select>
                      <FormMessage />
                    </FormItem>
                  )}
                />

                <FormField
                  control={form.control}
                  name="image"
                  render={() => (
                    <FormItem>
                      <FormLabel className="text-foreground font-medium">Imagem *</FormLabel>
                      <FormControl>
                        <Input
                          type="file"
                          accept="image/*"
                          disabled={isUploadingImage}
                          onChange={handleImageUpload}
                          className="bg-input-background border-accent/20 focus:border-accent focus:ring-accent/20"
                        />
                      </FormControl>
                      <p className="text-xs text-muted-foreground">
                        {isUploadingImage
                          ? "Enviando imagem..."
                          : editingNewsletter
                          ? "Selecione uma nova imagem para substituir a atual"
                          : "Selecione uma imagem do seu computador"}
                      </p>
                      <FormMessage />
                    </FormItem>
                  )}
                />

                <FormField
                  control={form.control}
                  name="excerpt"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel className="text-foreground font-medium">Resumo/Descrição *</FormLabel>
                      <FormControl>
                        <Textarea
                          {...field}
                          placeholder="Digite uma breve descrição do conteúdo do informativo..."
                          className="bg-input-background border-accent/20 focus:border-accent focus:ring-accent/20 min-h-32"
                          maxLength={500}
                        />
                      </FormControl>
                      <p className="text-xs text-muted-foreground text-right">
                        {field.value?.length || 0}/500 caracteres
                      </p>
                      <FormMessage />
                    </FormItem>
                  )}
                />

                <FormField
                  control={form.control}
                  name="target_audience"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel className="text-foreground font-medium">Público-alvo *</FormLabel>
                      <Select onValueChange={field.onChange} defaultValue={field.value} value={field.value}>
                        <FormControl>
                          <SelectTrigger className="bg-input-background border-accent/20 focus:border-accent focus:ring-accent/20">
                            <SelectValue placeholder="Selecione o público" />
                          </SelectTrigger>
                        </FormControl>
                        <SelectContent>
                          <SelectItem value="all">Todos os usuários</SelectItem>
                          <SelectItem value="plano">Alunos de um plano</SelectItem>
                          <SelectItem value="turma">Alunos de uma turma</SelectItem>
                          <SelectItem value="aluno">Um aluno específico</SelectItem>
                        </SelectContent>
                      </Select>
                      <p className="text-xs text-muted-foreground">
                        Define quem poderá visualizar este informativo
                      </p>
                      <FormMessage />
                    </FormItem>
                  )}
                />

                {targetAudience === "plano" && (
                  <FormField
                    control={form.control}
                    name="target_plano_id"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel className="text-foreground font-medium">Plano *</FormLabel>
                        <Select onValueChange={field.onChange} value={field.value || ""}>
                          <FormControl>
                            <SelectTrigger className="bg-input-background border-accent/20 focus:border-accent focus:ring-accent/20">
                              <SelectValue placeholder="Selecione o plano" />
                            </SelectTrigger>
                          </FormControl>
                          <SelectContent>
                            {planos.map((p) => (
                              <SelectItem key={p.id_plano} value={p.id_plano}>{p.nome_plano}</SelectItem>
                            ))}
                          </SelectContent>
                        </Select>
                        <FormMessage />
                      </FormItem>
                    )}
                  />
                )}

                {targetAudience === "turma" && (
                  <FormField
                    control={form.control}
                    name="target_turma"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel className="text-foreground font-medium">Turma *</FormLabel>
                        <Select onValueChange={field.onChange} value={field.value || ""}>
                          <FormControl>
                            <SelectTrigger className="bg-input-background border-accent/20 focus:border-accent focus:ring-accent/20">
                              <SelectValue placeholder="Selecione a turma" />
                            </SelectTrigger>
                          </FormControl>
                          <SelectContent>
                            {(Object.keys(TURMAS_BY_NUCLEO) as Nucleo[]).map((nucleo) => (
                              TURMAS_BY_NUCLEO[nucleo].map((group) => (
                                <SelectGroup key={`${nucleo}-${group.categoria}`}>
                                  <SelectLabel>{NUCLEO_LABELS[nucleo]} · {group.categoria}</SelectLabel>
                                  {group.horarios.map((horario) => (
                                    <SelectItem key={horario.value} value={horario.value}>{horario.label}</SelectItem>
                                  ))}
                                </SelectGroup>
                              ))
                            ))}
                          </SelectContent>
                        </Select>
                        <FormMessage />
                      </FormItem>
                    )}
                  />
                )}

                {targetAudience === "aluno" && (
                  <FormField
                    control={form.control}
                    name="target_student_id"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel className="text-foreground font-medium">Aluno *</FormLabel>
                        <Select onValueChange={field.onChange} value={field.value || ""}>
                          <FormControl>
                            <SelectTrigger className="bg-input-background border-accent/20 focus:border-accent focus:ring-accent/20">
                              <SelectValue placeholder="Selecione o aluno" />
                            </SelectTrigger>
                          </FormControl>
                          <SelectContent>
                            {students.map((s) => (
                              <SelectItem key={s.student_id} value={s.student_id}>
                                {s.full_name}{s.nickname ? ` (${s.nickname})` : ""}
                              </SelectItem>
                            ))}
                          </SelectContent>
                        </Select>
                        <FormMessage />
                      </FormItem>
                    )}
                  />
                )}

                {form.watch("image") && (
                  <div className="space-y-2">
                    <Label className="text-foreground font-medium">Pré-visualização</Label>
                    <div className="relative h-48 rounded-xl overflow-hidden border-2 border-accent/20">
                      <ImageWithFallback
                        src={form.watch("image") || ""}
                        alt="Preview"
                        className="w-full h-full object-cover"
                      />
                    </div>
                  </div>
                )}
              </div>

              <div className="flex justify-end gap-3 pt-6 border-t border-border">
                <Button
                  type="button"
                  variant="outline"
                  onClick={handleCloseModal}
                >
                  Cancelar
                </Button>
                <Button
                  type="submit"
                  disabled={form.formState.isSubmitting || isUploadingImage}
                  className="bg-accent hover:bg-accent/90 text-white min-w-[150px]"
                >
                  {form.formState.isSubmitting ? (
                    <Loader2 className="w-4 h-4 animate-spin" />
                  ) : editingNewsletter ? (
                    <>
                      <Edit className="w-4 h-4 mr-2" />
                      Salvar Alterações
                    </>
                  ) : (
                    <>
                      <Plus className="w-4 h-4 mr-2" />
                      Criar Informativo
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