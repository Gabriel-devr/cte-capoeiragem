"use client";

import { useEffect, useState } from "react";
import { Send, Save, Loader2, Users, Settings, History } from "lucide-react";
import { toast } from "sonner";

import { Button } from "../ui/button";
import { Textarea } from "../ui/textarea";
import { Checkbox } from "../ui/checkbox";
import { Badge } from "../ui/badge";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "../ui/table";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from "../ui/dialog";

import {
  getWhatsappSettings,
  updateWhatsappSettings,
  listCobrancas,
  enviarCobrancas,
  listHistoricoAluno,
  type CobrancaItem,
  type HistoricoMensagem,
} from "@/actions/whatsapp_data";
import { formatPhone, toBRDate } from "@/utils/formatters";

// Mesmo texto do default definido em supabase_whatsapp_settings.sql. Serve de
// fallback aqui pro admin já visualizar/editar o padrão mesmo antes da tabela
// whatsapp_settings existir ou de qualquer configuração ter sido salva.
const DEFAULT_MESSAGE_TEMPLATE = `Olá, {{nome}}! Tudo bem? 🤸‍♂️

Passando para lembrar que a mensalidade do seu plano no CTE Capoeiragem está próxima do vencimento.

💰 Valor: {{valor}}
💰 Chave Pix:

Após realizar o pagamento, por favor, envie o comprovante por aqui para darmos baixa no sistema.

Se tiver qualquer dúvida ou se o pagamento já foi realizado, pode desconsiderar esta mensagem. Estamos à disposição! Axé! ✊🙏`;

const statusConfig: Record<HistoricoMensagem["status"], { label: string; className: string }> = {
  pending:   { label: "Pendente",  className: "bg-yellow-100 text-yellow-700 border-yellow-200" },
  sent:      { label: "Enviada",   className: "bg-green-100 text-green-700 border-green-200" },
  failed:    { label: "Falhou",    className: "bg-red-100 text-red-700 border-red-200" },
  cancelled: { label: "Cancelada", className: "bg-gray-100 text-gray-600 border-gray-200" },
};

function formatValor(valor: number) {
  return `R$ ${valor.toFixed(2)}`;
}

type TipoValor = "desconto" | "original";

function valorCobrado(item: CobrancaItem, tipoValor: TipoValor) {
  return tipoValor === "desconto" ? item.valor_desconto ?? item.valor_original : item.valor_original;
}

function preencherTemplate(template: string, item: CobrancaItem, tipoValor: TipoValor) {
  return template
    .replace(/\{\{nome\}\}/g, item.nickname || item.full_name)
    .replace(/\{\{plano\}\}/g, item.plano_nome)
    .replace(/\{\{valor\}\}/g, formatValor(valorCobrado(item, tipoValor)));
}

export function WhatsappCobranca() {
  const [cobrancas, setCobrancas] = useState<CobrancaItem[]>([]);
  const [selected, setSelected] = useState<Set<string>>(new Set());
  const [isLoading, setIsLoading] = useState(true);

  const [template, setTemplate] = useState(DEFAULT_MESSAGE_TEMPLATE);
  const [isSettingsOpen, setIsSettingsOpen] = useState(false);
  const [templateDraft, setTemplateDraft] = useState(DEFAULT_MESSAGE_TEMPLATE);
  const [isSavingSettings, setIsSavingSettings] = useState(false);

  const [mensagem, setMensagem] = useState(DEFAULT_MESSAGE_TEMPLATE);
  const [tipoValor, setTipoValor] = useState<TipoValor>("desconto");
  const [isSending, setIsSending] = useState(false);

  const [historicoAluno, setHistoricoAluno] = useState<CobrancaItem | null>(null);
  const [historico, setHistorico] = useState<HistoricoMensagem[]>([]);
  const [isLoadingHistorico, setIsLoadingHistorico] = useState(false);

  const fetchData = async () => {
    setIsLoading(true);
    const [settingsRes, cobrancasRes] = await Promise.all([
      getWhatsappSettings(),
      listCobrancas(),
    ]);

    if (settingsRes.result === "sucesso" && settingsRes.settings) {
      const savedTemplate = settingsRes.settings.message_template || DEFAULT_MESSAGE_TEMPLATE;
      setTemplate(savedTemplate);
      setTemplateDraft(savedTemplate);
      setMensagem(savedTemplate);
    } else {
      // Sem configuração salva ainda (ex: tabela não criada) - mostra o padrão
      // mesmo assim, pra o admin já visualizar e poder editar.
      toast.error("Erro ao carregar configurações: " + settingsRes.details);
    }

    if (cobrancasRes.result === "sucesso" && cobrancasRes.cobrancas) {
      setCobrancas(cobrancasRes.cobrancas);
    } else {
      toast.error("Erro ao carregar alunos: " + cobrancasRes.details);
    }

    setIsLoading(false);
  };

  useEffect(() => {
    fetchData();
  }, []);

  const toggleSelected = (studentId: string) => {
    setSelected((prev) => {
      const next = new Set(prev);
      if (next.has(studentId)) next.delete(studentId);
      else next.add(studentId);
      return next;
    });
  };

  const toggleSelectAll = () => {
    if (selected.size === cobrancas.length) {
      setSelected(new Set());
    } else {
      setSelected(new Set(cobrancas.map((c) => c.student_id)));
    }
  };

  const handleOpenSettings = () => {
    setTemplateDraft(template);
    setIsSettingsOpen(true);
  };

  const handleSaveSettings = async () => {
    setIsSavingSettings(true);
    const res = await updateWhatsappSettings({ message_template: templateDraft });
    if (res.result === "sucesso") {
      toast.success("Mensagem padrão salva com sucesso!");
      setTemplate(templateDraft);
      setIsSettingsOpen(false);
    } else {
      toast.error("Erro ao salvar: " + res.details);
    }
    setIsSavingSettings(false);
  };

  const handleVerHistorico = async (item: CobrancaItem) => {
    setHistoricoAluno(item);
    setIsLoadingHistorico(true);
    setHistorico([]);
    const res = await listHistoricoAluno(item.student_id);
    if (res.result === "sucesso" && res.historico) {
      setHistorico(res.historico);
    } else {
      toast.error("Erro ao carregar histórico: " + res.details);
    }
    setIsLoadingHistorico(false);
  };

  const mensagemValida = mensagem.trim().length > 0;
  const podeEnviar = mensagemValida && selected.size > 0;

  const handleEnviar = async () => {
    const selecionados = cobrancas.filter((c) => selected.has(c.student_id));

    if (selecionados.length === 0) {
      toast.error("Selecione ao menos um aluno.");
      return;
    }

    if (!mensagemValida) {
      toast.error("Escreva a mensagem que será enviada.");
      return;
    }

    const semTelefone = selecionados.filter((c) => !c.telephone);
    if (semTelefone.length > 0) {
      toast.error(`${semTelefone.length} aluno(s) selecionado(s) sem telefone cadastrado.`);
      return;
    }

    setIsSending(true);
    const payload = selecionados.map((item) => ({
      student_id: item.student_id,
      full_name: item.full_name,
      telephone: item.telephone as string,
      mensagem: preencherTemplate(mensagem, item, tipoValor),
    }));

    const res = await enviarCobrancas(payload);

    if (res.result === "sucesso") {
      const ignoradosMsg = res.ignorados ? ` (${res.ignorados} já tinham cobrança de hoje pendente e foram ignorados)` : "";
      toast.success(`Cobrança enviada para ${res.enviados} aluno(s)!${ignoradosMsg}`);
      setSelected(new Set());
    } else {
      toast.error("Erro ao enviar cobranças: " + res.details);
    }
    setIsSending(false);
  };

  if (isLoading) {
    return (
      <div className="flex items-center justify-center py-16">
        <Loader2 className="w-8 h-8 text-accent animate-spin" />
      </div>
    );
  }

  return (
    <div className="space-y-8">
      {/* Enviar cobrança */}
      <div className="bg-card border border-border rounded-xl p-6 shadow-lg space-y-5">
        <div className="flex items-center justify-between">
          <h3 className="text-lg font-bold text-foreground flex items-center gap-2">
            <Send className="w-5 h-5 text-accent" /> Enviar cobrança
          </h3>
          <Button variant="outline" size="sm" onClick={handleOpenSettings} className="gap-2 cursor-pointer">
            <Settings className="w-4 h-4" /> Editar mensagem padrão
          </Button>
        </div>

        <div className="space-y-2">
          <label className="text-sm font-medium text-foreground">
            Mensagem <span className="text-destructive">*</span>
          </label>
          <Textarea
            value={mensagem}
            onChange={(e) => setMensagem(e.target.value)}
            rows={6}
            className="bg-input-background"
          />
          <p className="text-xs text-muted-foreground">
            Use <code className="bg-muted px-1 rounded">{"{{nome}}"}</code>,{" "}
            <code className="bg-muted px-1 rounded">{"{{plano}}"}</code> e{" "}
            <code className="bg-muted px-1 rounded">{"{{valor}}"}</code> — serão substituídos por aluno.
          </p>
        </div>

        <div className="space-y-2">
          <label className="text-sm font-medium text-foreground">Valor a cobrar</label>
          <div className="flex gap-2">
            <Button
              type="button"
              variant={tipoValor === "desconto" ? "default" : "outline"}
              size="sm"
              onClick={() => setTipoValor("desconto")}
              className={tipoValor === "desconto" ? "bg-accent hover:bg-accent/90 text-accent-foreground cursor-pointer" : "cursor-pointer"}
            >
              Com desconto
            </Button>
            <Button
              type="button"
              variant={tipoValor === "original" ? "default" : "outline"}
              size="sm"
              onClick={() => setTipoValor("original")}
              className={tipoValor === "original" ? "bg-accent hover:bg-accent/90 text-accent-foreground cursor-pointer" : "cursor-pointer"}
            >
              Valor integral
            </Button>
          </div>
          <p className="text-xs text-muted-foreground">
            Define qual valor entra no lugar de <code className="bg-muted px-1 rounded">{"{{valor}}"}</code> — vale pra todos os alunos selecionados neste envio.
          </p>
        </div>

        <div className="space-y-3 pt-2 border-t border-border">
          <h4 className="text-sm font-semibold text-foreground flex items-center gap-2">
            <Users className="w-4 h-4 text-accent" /> Selecione os alunos <span className="text-destructive">*</span>
          </h4>

          {cobrancas.length === 0 ? (
            <p className="text-sm text-muted-foreground py-8 text-center">Nenhum aluno com matrícula ativa.</p>
          ) : (
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead className="w-10">
                    <Checkbox
                      checked={selected.size === cobrancas.length && cobrancas.length > 0}
                      onCheckedChange={toggleSelectAll}
                      className="cursor-pointer"
                    />
                  </TableHead>
                  <TableHead>Aluno</TableHead>
                  <TableHead>Plano</TableHead>
                  <TableHead>Valor</TableHead>
                  <TableHead>Telefone</TableHead>
                  <TableHead className="w-10"></TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {cobrancas.map((item) => (
                  <TableRow key={item.student_id}>
                    <TableCell>
                      <Checkbox
                        checked={selected.has(item.student_id)}
                        onCheckedChange={() => toggleSelected(item.student_id)}
                        className="cursor-pointer"
                      />
                    </TableCell>
                    <TableCell className="font-medium">{item.nickname || item.full_name}</TableCell>
                    <TableCell>{item.plano_nome}</TableCell>
                    <TableCell>
                      {item.valor_desconto != null ? (
                        <div className="flex flex-col leading-tight">
                          <span className={tipoValor === "desconto" ? "font-semibold text-accent" : "text-muted-foreground line-through"}>
                            {formatValor(item.valor_desconto)}
                          </span>
                          <span className={tipoValor === "original" ? "font-semibold text-accent" : "text-xs text-muted-foreground line-through"}>
                            {formatValor(item.valor_original)}
                          </span>
                        </div>
                      ) : (
                        formatValor(item.valor_original)
                      )}
                    </TableCell>
                    <TableCell className={!item.telephone ? "text-destructive" : ""}>
                      {item.telephone ? formatPhone(item.telephone) : "Sem telefone"}
                    </TableCell>
                    <TableCell>
                      <Button
                        variant="ghost"
                        size="icon"
                        title="Ver histórico de mensagens"
                        onClick={() => handleVerHistorico(item)}
                        className="text-muted-foreground cursor-pointer"
                      >
                        <History className="w-4 h-4" />
                      </Button>
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          )}
        </div>

        <div className="flex justify-end">
          <Button
            onClick={handleEnviar}
            disabled={isSending || !podeEnviar}
            className="bg-accent hover:bg-accent/90 text-white cursor-pointer"
          >
            {isSending ? <Loader2 className="w-4 h-4 animate-spin" /> : <><Send className="w-4 h-4 mr-2" /> Enviar cobranças ({selected.size})</>}
          </Button>
        </div>
      </div>

      {/* Modal: editar mensagem padrão */}
      <Dialog open={isSettingsOpen} onOpenChange={setIsSettingsOpen}>
        <DialogContent className="max-w-xl">
          <DialogHeader>
            <DialogTitle>Editar mensagem padrão</DialogTitle>
          </DialogHeader>

          <div className="space-y-2">
            <Textarea
              value={templateDraft}
              onChange={(e) => setTemplateDraft(e.target.value)}
              rows={8}
              className="bg-input-background"
            />
            <p className="text-xs text-muted-foreground">
              Esse é o texto usado como ponto de partida sempre que você for enviar uma cobrança.
              Alterar aqui não muda o texto de cobranças já enviadas.
            </p>
          </div>

          <DialogFooter>
            <Button variant="outline" onClick={() => setIsSettingsOpen(false)} className="cursor-pointer">Cancelar</Button>
            <Button onClick={handleSaveSettings} disabled={isSavingSettings} className="bg-accent hover:bg-accent/90 text-white cursor-pointer">
              {isSavingSettings ? <Loader2 className="w-4 h-4 animate-spin" /> : <><Save className="w-4 h-4 mr-2" /> Salvar</>}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Modal: histórico de mensagens do aluno */}
      <Dialog open={!!historicoAluno} onOpenChange={(open) => !open && setHistoricoAluno(null)}>
        <DialogContent className="max-w-xl">
          <DialogHeader>
            <DialogTitle>
              Histórico de mensagens — {historicoAluno?.nickname || historicoAluno?.full_name}
            </DialogTitle>
          </DialogHeader>

          {isLoadingHistorico ? (
            <div className="flex items-center justify-center py-8">
              <Loader2 className="w-6 h-6 text-accent animate-spin" />
            </div>
          ) : historico.length === 0 ? (
            <p className="text-sm text-muted-foreground py-8 text-center">Nenhuma cobrança enviada para este aluno ainda.</p>
          ) : (
            <div className="space-y-3 max-h-[60vh] overflow-y-auto">
              {historico.map((h) => (
                <div key={h.id} className="border border-border rounded-lg p-3 space-y-2">
                  <div className="flex items-center justify-between">
                    <span className="text-sm font-medium text-foreground">{toBRDate(h.scheduled_date)}</span>
                    <Badge variant="outline" className={statusConfig[h.status].className}>
                      {statusConfig[h.status].label}
                    </Badge>
                  </div>
                  <p className="text-sm text-muted-foreground whitespace-pre-wrap">{h.mensagem}</p>
                </div>
              ))}
            </div>
          )}
        </DialogContent>
      </Dialog>
    </div>
  );
}
