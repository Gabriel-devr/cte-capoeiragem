export interface TurmaOption {
  label: string;
  value: string;
}

export interface TurmaGroup {
  categoria: string;
  horarios: TurmaOption[];
}

export type Nucleo = "matriz" | "minimundo";

export const NUCLEO_LABELS: Record<Nucleo, string> = {
  matriz: "Matriz",
  minimundo: "MiniMundo",
};

export const TURMAS_BY_NUCLEO: Record<Nucleo, TurmaGroup[]> = {
  matriz: [
    {
      categoria: "Infantil",
      horarios: [
        { label: "Seg e qua – 9h às 9h40", value: "Infantil seg e qua – 9h às 9h40" },
        { label: "Seg e qua – 10h às 10h50", value: "Infantil seg e qua – 10h às 10h50" },
        { label: "Seg e qua – 17h às 17h40", value: "Infantil seg e qua – 17h às 17h40" },
        { label: "Ter e qui – 15h10 às 15h50", value: "Infantil ter e qui – 15h10 às 15h50" },
        { label: "Ter e qui – 16h às 16h50", value: "Infantil ter e qui – 16h às 16h50" },
        { label: "Sáb – 9h10 às 9h50", value: "Infantil sáb – 9h10 às 9h50" },
        { label: "Sáb – 10h às 10h50", value: "Infantil sáb – 10h às 10h50" },
      ],
    },
    {
      categoria: "Bebê",
      horarios: [
        { label: "Seg e qua – 16h10 às 16h50", value: "Bebê seg e qua – 16h10 às 16h50" },
      ],
    },
    {
      categoria: "Funcional",
      horarios: [
        { label: "Seg e qua – 8h às 8h50", value: "Funcional seg e qua – 8h às 8h50" },
        { label: "Sáb – 8h às 8h50", value: "Funcional sáb – 8h às 8h50" },
      ],
    },
    {
      categoria: "Ado&adu",
      horarios: [
        { label: "Seg e qua – 18h45 às 20h", value: "Ado&adu seg e qua – 18h45 às 20h" },
        { label: "Seg e qua – 20h às 21h15", value: "Ado&adu seg e qua – 20h às 21h15" },
        { label: "Ter e qui – 8h às 9h15", value: "Ado&adu ter e qui – 8h às 9h15" },
        { label: "Ter e qui – 19h30 às 20h45", value: "Ado&adu ter e qui – 19h30 às 20h45" },
        { label: "Sáb – 11h às 12h15", value: "Ado&adu sáb – 11h às 12h15" },
      ],
    },
  ],
  minimundo: [
    {
      categoria: "Infantil",
      horarios: [
        { label: "Ter e qui – 8h10 às 8h40", value: "MiniMundo Infantil ter e qui – 8h10 às 8h40" },
      ],
    },
  ],
};

export const TURMAS_OPTIONS: TurmaOption[] = (Object.keys(TURMAS_BY_NUCLEO) as Nucleo[]).flatMap(
  (nucleo) => TURMAS_BY_NUCLEO[nucleo].flatMap((group) => group.horarios)
);
