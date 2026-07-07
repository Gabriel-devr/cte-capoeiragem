export interface Plano {
  id_plano: string;
  nome_plano: string;
  tipo_plano: string; // UUID referenciando periodos
  frequencia: number;
  preco_original: number;
  preco_desconto?: number;
  produto_id?: string;
  periodos?: {
    nome_periodo: string;
  };
  produtos?: {
    tipo_produto: string;
    descricao_produto?: string;
  };
}

export interface Periodo {
  id_periodo: string;
  nome_periodo: string;
}
