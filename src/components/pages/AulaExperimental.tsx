"use client";

import { AulaAvulsaSection } from "./AulaAvulsaSection";
import {
  createAulaExperimental,
  listAulasExperimentais,
  updateAulaExperimental,
  deleteAulaExperimental,
} from "@/actions/aula_experimental_data";

export function AulaExperimental() {
  return (
    <AulaAvulsaSection
      title="Aula experimental"
      newLabel="Nova aula experimental"
      editLabel="Editar aula experimental"
      emptyLabel="Nenhuma aula experimental cadastrada"
      successCreateLabel="Aula experimental cadastrada!"
      successUpdateLabel="Aula experimental atualizada!"
      confirmDeleteLabel="Deseja realmente excluir esta aula experimental?"
      successDeleteLabel="Aula experimental excluída"
      showValor={false}
      actions={{
        create: createAulaExperimental,
        list: listAulasExperimentais,
        update: updateAulaExperimental,
        delete: deleteAulaExperimental,
      }}
    />
  );
}
