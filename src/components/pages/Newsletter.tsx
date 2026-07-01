"use client";

import { useState, useEffect } from "react";
import { motion, AnimatePresence } from "motion/react";
import { Plus, Calendar, User as UserIcon, Users, Trash2, Tag, Edit, Loader2, FileText } from "lucide-react";
import { ImageWithFallback } from "../fallback/ImageWithFallback";
import { Button } from "../ui/button";
import { Input } from "../ui/input";
import { Label } from "../ui/label";
import { Textarea } from "../ui/textarea";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "../ui/dialog";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "../ui/select";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { toast } from "sonner";
import { newsletterSchema, type NewsletterFormInput } from "@/utils/newsletterSchema";
import {
  createNewsletter,
  listNewsletters,
  updateNewsletter,
  deleteNewsletter
} from "@/actions/newsletter_data";
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
  target_audience?: 'all' | 'active' | 'inactive';
}

export function Newsletter() {
  const [newsletters, setNewsletters] = useState<Newsletter[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [editingNewsletter, setEditingNewsletter] = useState<Newsletter | null>(null);
  const [currentPage, setCurrentPage] = useState(1);
  const itemsPerPage = 6;

  const form = useForm<NewsletterFormInput>({
    resolver: zodResolver(newsletterSchema),
    defaultValues: {
      title: "",
      author: "",
      category: "",
      image: "",
      excerpt: "",
      target_audience: "all",
    }
  });

  const fetchNewsletters = async () => {
    setIsLoading(true);
    const res = await listNewsletters();
    if (res.result === "sucesso") {
      setNewsletters(res.data || []);
    } else {
      toast.error("Erro ao carregar newsletters: " + res.details);
    }
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
        author: newsletter.author,
        category: newsletter.category,
        image: newsletter.image,
        excerpt: newsletter.excerpt,
        target_audience: (newsletter as any).target_audience || "all",
      });
    } else {
      setEditingNewsletter(null);
      form.reset({
        title: "",
        author: "",
        category: "",
        image: "",
        excerpt: "",
        target_audience: "all",
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
    const payload = { ...data, target_audience: data.target_audience ?? "all" };
    let res;
    if (editingNewsletter) {
      res = await updateNewsletter(editingNewsletter.id, payload);
    } else {
      res = await createNewsletter(payload);
    }

    if (res.result === "sucesso") {
      toast.success(editingNewsletter ? "Newsletter atualizada!" : "Newsletter criada!");
      handleCloseModal();
      fetchNewsletters();
    } else {
      toast.error("Erro ao salvar: " + res.details);
    }
  };

  const handleDelete = async (id: number) => {
    if (confirm("Tem certeza que deseja excluir esta newsletter?")) {
      const res = await deleteNewsletter(id);
      if (res.result === "sucesso") {
        toast.success("Newsletter excluída!");
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
          <h1 className="text-4xl font-bold text-foreground mb-3">Newsletter</h1>
          <p className="text-lg text-muted-foreground">
            Explore nosso histórico de conteúdos sobre capoeira
          </p>
        </div>
        <Button
          onClick={() => handleOpenModal()}
          className="bg-accent hover:bg-accent/90 text-white shadow-lg"
        >
          <Plus className="w-5 h-5 mr-2" />
          Nova Newsletter
        </Button>
      </motion.div>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
        <AnimatePresence>
          {!isLoading && newsletters.length === 0 ? (
            <motion.div
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              className="col-span-full flex flex-col items-center justify-center p-16 text-center border-2 border-dashed border-border rounded-3xl bg-card/30"
            >
              <div className="w-20 h-20 rounded-full bg-muted flex items-center justify-center mb-6">
                <FileText className="w-10 h-10 text-muted-foreground" />
              </div>
              <h3 className="text-2xl font-bold text-foreground mb-2">Nenhuma newsletter publicada ainda</h3>
              <p className="text-muted-foreground max-w-md mx-auto">
                Clique no botão 'Nova Newsletter' no topo da página para criar sua primeira postagem e compartilhar com a comunidade.
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
                className="bg-white border-2 border-border rounded-2xl overflow-hidden shadow-md hover:shadow-xl transition-all hover:border-accent group"
              >
                <div className="relative h-56 overflow-hidden">
                  <ImageWithFallback
                    src={newsletter.image}
                    alt={newsletter.title}
                    className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-300"
                  />

                  {/* Action Buttons */}
                  <div className="absolute top-3 right-3 flex gap-2">
                    <button
                      onClick={() => handleOpenModal(newsletter)}
                      className="w-10 h-10 rounded-full bg-white/95 backdrop-blur-sm flex items-center justify-center text-accent hover:bg-accent hover:text-white transition-all shadow-lg hover:scale-110"
                      title="Editar newsletter"
                    >
                      <Edit className="w-4 h-4" />
                    </button>
                    <button
                      onClick={() => handleDelete(newsletter.id)}
                      className="w-10 h-10 rounded-full bg-white/95 backdrop-blur-sm flex items-center justify-center text-destructive hover:bg-destructive hover:text-white transition-all shadow-lg hover:scale-110"
                      title="Excluir newsletter"
                    >
                      <Trash2 className="w-4 h-4" />
                    </button>
                  </div>

                  {/* Badge de público-alvo */}
                  <div className="absolute top-3 left-3">
                    <span className={`inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs font-semibold shadow-md ${
                      newsletter.target_audience === 'active'
                        ? 'bg-emerald-500 text-white'
                        : newsletter.target_audience === 'inactive'
                        ? 'bg-rose-500 text-white'
                        : 'bg-slate-700 text-white'
                    }`}>
                      <Users className="w-3 h-3" />
                      {newsletter.target_audience === 'active' ? 'Ativos'
                        : newsletter.target_audience === 'inactive' ? 'Inativos'
                        : 'Todos'}
                    </span>
                  </div>
                </div>

                <div className="p-8">
                  <div className="flex items-center gap-4 text-sm text-muted-foreground mb-4">
                    <div className="flex items-center gap-2">
                      <Calendar className="w-4 h-4" />
                      <span>{new Date(newsletter.date).toLocaleDateString('pt-BR', { day: 'numeric', month: 'long', year: 'numeric' })}</span>
                    </div>
                    <div className="flex items-center gap-2">
                      <UserIcon className="w-4 h-4" />
                      <span>{newsletter.author}</span>
                    </div>
                  </div>

                  <h3 className="text-xl font-bold text-foreground mb-3 group-hover:text-accent transition-colors">
                    {newsletter.title}
                  </h3>

                  <p className="text-base text-muted-foreground mb-5 line-clamp-2">
                    {newsletter.excerpt}
                  </p>

                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-2 text-sm text-accent bg-accent/10 px-3 py-2 rounded-lg">
                      <Tag className="w-4 h-4" />
                      <span>{newsletter.category}</span>
                    </div>
                    <button className="text-base text-accent hover:text-accent/80 transition-colors font-medium">
                      Ler mais →
                    </button>
                  </div>
                </div>
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

      {/* Modal de Criar/Editar Newsletter */}
      <Dialog open={isModalOpen} onOpenChange={setIsModalOpen}>
        <DialogContent className="max-w-3xl max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle className="text-2xl font-bold text-foreground flex items-center gap-2">
              {editingNewsletter ? (
                <>
                  <Edit className="w-6 h-6 text-accent" />
                  Editar Newsletter
                </>
              ) : (
                <>
                  <Plus className="w-6 h-6 text-accent" />
                  Nova Newsletter
                </>
              )}
            </DialogTitle>
          </DialogHeader>

          <Form {...form}>
            <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-6 mt-6">
              <div className="bg-accent/5 border-l-4 border-accent p-4 rounded-r-lg">
                <p className="text-sm text-muted-foreground">
                  Preencha os campos abaixo para {editingNewsletter ? "atualizar" : "criar"} a newsletter
                </p>
              </div>

              <div className="space-y-6">
                <FormField
                  control={form.control}
                  name="title"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel className="text-foreground font-medium">Título da Newsletter *</FormLabel>
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

                <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                  <FormField
                    control={form.control}
                    name="author"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel className="text-foreground font-medium">Autor *</FormLabel>
                        <FormControl>
                          <Input
                            {...field}
                            placeholder="Ex: Mestre João"
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
                            <SelectItem value="Cultura & Movimento">Cultura & Movimento</SelectItem>
                            <SelectItem value="Instrumentos">Instrumentos</SelectItem>
                            <SelectItem value="História">História</SelectItem>
                            <SelectItem value="Técnica">Técnica</SelectItem>
                            <SelectItem value="Eventos">Eventos</SelectItem>
                            <SelectItem value="Comunidade">Comunidade</SelectItem>
                          </SelectContent>
                        </Select>
                        <FormMessage />
                      </FormItem>
                    )}
                  />
                </div>

                <FormField
                  control={form.control}
                  name="image"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel className="text-foreground font-medium">URL da Imagem *</FormLabel>
                      <FormControl>
                        <Input
                          {...field}
                          type="url"
                          placeholder="https://exemplo.com/imagem.jpg"
                          className="bg-input-background border-accent/20 focus:border-accent focus:ring-accent/20"
                        />
                      </FormControl>
                      <p className="text-xs text-muted-foreground">
                        Cole a URL de uma imagem hospedada online
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
                          placeholder="Digite uma breve descrição do conteúdo da newsletter..."
                          className="bg-input-background border-accent/20 focus:border-accent focus:ring-accent/20 min-h-32"
                          maxLength={200}
                        />
                      </FormControl>
                      <p className="text-xs text-muted-foreground text-right">
                        {field.value?.length || 0}/200 caracteres
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
                      <FormLabel className="text-foreground font-medium">Público-Alvo *</FormLabel>
                      <Select onValueChange={field.onChange} defaultValue={field.value} value={field.value}>
                        <FormControl>
                          <SelectTrigger className="bg-input-background border-accent/20 focus:border-accent focus:ring-accent/20">
                            <SelectValue placeholder="Selecione o público" />
                          </SelectTrigger>
                        </FormControl>
                        <SelectContent>
                          <SelectItem value="all">Todos os usuários</SelectItem>
                          <SelectItem value="active">Somente Ativos</SelectItem>
                          <SelectItem value="inactive">Somente Inativos</SelectItem>
                        </SelectContent>
                      </Select>
                      <p className="text-xs text-muted-foreground">
                        Define quem poderá visualizar esta newsletter
                      </p>
                      <FormMessage />
                    </FormItem>
                  )}
                />

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
                  disabled={form.formState.isSubmitting}
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
                      Criar Newsletter
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