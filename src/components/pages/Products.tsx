"use client";

import { useEffect, useState } from "react";
import { motion, AnimatePresence } from "motion/react";
import { Package, Plus, Edit, Trash2, Save, Loader2 } from "lucide-react";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { toast } from "sonner";

import { Button } from "../ui/button";
import { Input } from "../ui/input";
import { Label } from "../ui/label";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "../ui/dialog";
import { Textarea } from "../ui/textarea";
import {
  Form,
  FormControl,
  FormField,
  FormItem,
  FormLabel,
  FormMessage,
} from "../ui/form";

import { produtoSchema, type ProdutoFormData } from "@/utils/produtoSchema";
import { createProduto, listProdutos, updateProduto, deleteProduto } from "@/actions/produto_data";

interface Product {
  id_produto: string;
  nome_produto: string;
  tipo_produto: string;
  descricao_produto?: string;
}

export function Products() {
  const [products, setProducts] = useState<Product[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [isProductModalOpen, setIsProductModalOpen] = useState(false);
  const [editingProduct, setEditingProduct] = useState<Product | null>(null);

  const form = useForm<ProdutoFormData>({
    resolver: zodResolver(produtoSchema),
    defaultValues: {
      nome_produto: "",
      tipo_produto: "",
      descricao_produto: "",
    },
  });

  const fetchData = async () => {
    setIsLoading(true);
    const res = await listProdutos();
    if (res.result === "sucesso") {
      setProducts(res.produtos || []);
    } else {
      toast.error("Erro ao carregar produtos: " + res.details);
    }
    setIsLoading(false);
  };

  useEffect(() => {
    fetchData();
  }, []);

  const onSubmit = async (data: ProdutoFormData) => {
    try {
      let res;
      if (editingProduct) {
        res = await updateProduto(editingProduct.id_produto, data);
      } else {
        res = await createProduto(data);
      }

      if (res.result === "sucesso") {
        toast.success(editingProduct ? "Produto atualizado com sucesso!" : "Produto criado com sucesso!");
        setIsProductModalOpen(false);
        fetchData();
      } else {
        toast.error("Erro ao salvar produto: " + res.details);
      }
    } catch (error) {
      toast.error("Ocorreu um erro inesperado.");
    }
  };

  const handleDeleteProduct = async (productId: string) => {
    if (!confirm("Tem certeza que deseja excluir este produto?")) return;
    
    const res = await deleteProduto(productId);
    if (res.result === "sucesso") {
      toast.success("Produto excluído com sucesso!");
      fetchData();
    } else {
      toast.error("Erro ao excluir: " + res.details);
    }
  };

  const openProductModal = (product?: Product) => {
    if (product) {
      setEditingProduct(product);
      form.reset({
        nome_produto: product.nome_produto,
        tipo_produto: product.tipo_produto || "",
        descricao_produto: product.descricao_produto || "",
      });
    } else {
      setEditingProduct(null);
      form.reset({
        nome_produto: "",
        tipo_produto: "",
        descricao_produto: "",
      });
    }
    setIsProductModalOpen(true);
  };

  return (
    <div className="space-y-8">
      <motion.div
        initial={{ opacity: 0, y: -20 }}
        animate={{ opacity: 1, y: 0 }}
        className="flex justify-between items-start"
      >
        <div>
          <h1 className="text-3xl font-bold text-foreground mb-2">Gestão de Produtos</h1>
          <p className="text-muted-foreground">
            Gerencie os produtos da CTE Capoeiragem
          </p>
        </div>
        <Button
          onClick={() => openProductModal()}
          className="bg-accent hover:bg-accent/90 text-accent-foreground"
        >
          <Plus className="w-5 h-5 mr-2" />
          Novo Produto
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
            {products.map((product) => (
              <motion.div
                key={product.id_produto}
                initial={{ opacity: 0, scale: 0.95 }}
                animate={{ opacity: 1, scale: 1 }}
                exit={{ opacity: 0, scale: 0.95 }}
                className="bg-card border border-border rounded-xl p-6 shadow-lg hover:shadow-xl transition-shadow"
              >
                <div className="flex items-start justify-between mb-4">
                  <div className="flex-1">
                    <h3 className="text-2xl font-bold text-foreground mb-2">{product.nome_produto}</h3>
                    <p className="text-sm text-muted-foreground">{product.tipo_produto || "Geral"}</p>
                  </div>
                  <div className="flex gap-2">
                    <Button variant="ghost" size="sm" onClick={() => openProductModal(product)} className="text-accent h-8 w-8 p-0">
                      <Edit className="w-4 h-4" />
                    </Button>
                    <Button variant="ghost" size="sm" onClick={() => handleDeleteProduct(product.id_produto)} className="text-destructive h-8 w-8 p-0">
                      <Trash2 className="w-4 h-4" />
                    </Button>
                  </div>
                </div>

                {product.descricao_produto && (
                  <div className="border-t border-border pt-4">
                    <p className="text-sm text-foreground">{product.descricao_produto}</p>
                  </div>
                )}
              </motion.div>
            ))}
          </AnimatePresence>
        </motion.div>
      )}

      {products.length === 0 && !isLoading && (
        <div className="text-center py-16 bg-card border border-border rounded-xl">
          <Package className="w-16 h-16 mx-auto text-muted-foreground mb-4" />
          <p className="text-muted-foreground">Nenhum produto cadastrado</p>
        </div>
      )}

      {/* Modal de Produto */}
      <Dialog open={isProductModalOpen} onOpenChange={setIsProductModalOpen}>
        <DialogContent className="max-w-2xl">
          <DialogHeader>
            <DialogTitle className="text-2xl font-bold text-foreground flex items-center gap-2">
              <Package className="w-6 h-6 text-accent" />
              {editingProduct ? "Editar Produto" : "Novo Produto"}
            </DialogTitle>
          </DialogHeader>
          <Form {...form}>
            <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-6 mt-6">
              <FormField
                control={form.control}
                name="nome_produto"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel className="font-medium">Nome do Produto *</FormLabel>
                    <FormControl>
                      <Input
                        {...field}
                        placeholder="Ex: Camiseta Branca"
                        className="bg-input-background border-accent/20 focus:border-accent"
                      />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />

              <FormField
                control={form.control}
                name="tipo_produto"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel className="font-medium">Tipo/Categoria</FormLabel>
                    <FormControl>
                      <Input
                        {...field}
                        placeholder="Ex: Vestuário"
                        className="bg-input-background border-accent/20 focus:border-accent"
                      />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />

              <FormField
                control={form.control}
                name="descricao_produto"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel className="font-medium">Descrição</FormLabel>
                    <FormControl>
                      <Textarea
                        {...field}
                        placeholder="Ex: Descrição detalhada do produto"
                        className="bg-input-background border-accent/20 focus:border-accent min-h-24"
                      />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />

              <div className="flex justify-end gap-3 pt-6 border-t">
                <Button type="button" variant="outline" onClick={() => setIsProductModalOpen(false)}>Cancelar</Button>
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
                      {editingProduct ? "Salvar" : "Adicionar"}
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
