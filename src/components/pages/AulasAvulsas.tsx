"use client";

import { AulaAvulsaSection } from "./AulaAvulsaSection";
import {
  createAulaAvulsa,
  listAulasAvulsas,
  updateAulaAvulsa,
  deleteAulaAvulsa,
} from "@/actions/aula_avulsa_data";

export function AulasAvulsas() {
  return (
    <AulaAvulsaSection
      title="Aulas avulsas"
      newLabel="Nova aula avulsa"
      editLabel="Editar aula avulsa"
      emptyLabel="Nenhuma aula avulsa cadastrada"
      successCreateLabel="Aula avulsa cadastrada!"
      successUpdateLabel="Aula avulsa atualizada!"
      confirmDeleteLabel="Deseja realmente excluir esta aula avulsa?"
      successDeleteLabel="Aula avulsa excluída"
      actions={{
        create: createAulaAvulsa,
        list: listAulasAvulsas,
        update: updateAulaAvulsa,
        delete: deleteAulaAvulsa,
      }}
    />
  );
}
