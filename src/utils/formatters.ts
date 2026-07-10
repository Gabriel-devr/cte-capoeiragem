/**
 * Formata um número de telefone no padrão (XX) XXXXX-XXXX ou (XX) XXXX-XXXX
 */
export const formatPhone = (value: string) => {
  if (!value) return "";
  const numbers = value.replace(/\D/g, "");
  if (numbers.length <= 10) {
    return numbers.replace(/(\d{2})(\d{4})(\d{4})/, "($1) $2-$3");
  }
  return numbers.replace(/(\d{2})(\d{5})(\d{4})/, "($1) $2-$3");
};

/**
 * Formata um CPF no padrão XXX.XXX.XXX-XX
 */
export const formatCPF = (value: string) => {
  if (!value) return "";
  const numbers = value.replace(/\D/g, "");
  return numbers.replace(/(\d{3})(\d{3})(\d{3})(\d{2})/, "$1.$2.$3-$4");
};

/**
 * Formata uma data de nascimento para exibição (YYYY-MM-DD para DD/MM/YYYY)
 * Útil para campos que não são input type="date"
 */
export const formatDateToBR = (dateStr: string) => {
  if (!dateStr) return "";
  const [year, month, day] = dateStr.split("-");
  return `${day}/${month}/${year}`;
};

/**
 * Formata um input de data digitado livremente para DD/MM/YYYY
 */
export const formatDateInput = (value: string) => {
  if (!value) return "";
  const numbers = value.replace(/\D/g, "");
  if (numbers.length <= 2) return numbers;
  if (numbers.length <= 4) return numbers.replace(/(\d{2})(\d{1,2})/, "$1/$2");
  return numbers.replace(/(\d{2})(\d{2})(\d{1,4})/, "$1/$2/$3").slice(0, 10);
};

export const toBRDate = (isoDate: string | null | undefined) => {
  if (!isoDate) return "";
  if (isoDate.includes("/")) return isoDate; 
  const [year, month, day] = isoDate.split("-");
  return `${day}/${month}/${year}`;
};

export const toISODate = (brDate: string | null | undefined) => {
  if (!brDate) return "";
  if (brDate.includes("-")) return brDate; 
  const [day, month, year] = brDate.split("/");
  if (!year || year.length < 4) return "";
  return `${year}-${month}-${day}`;
};

/**
 * Calcula a idade a partir de uma data de nascimento no formato DD/MM/AAAA
 */
export const calculateAge = (brDate: string | null | undefined): number | null => {
  if (!brDate) return null;
  const [day, month, year] = brDate.split("/");
  if (!day || !month || !year || year.length < 4) return null;
  const birth = new Date(Number(year), Number(month) - 1, Number(day));
  if (isNaN(birth.getTime())) return null;
  const today = new Date();
  let age = today.getFullYear() - birth.getFullYear();
  const hasHadBirthdayThisYear =
    today.getMonth() > birth.getMonth() ||
    (today.getMonth() === birth.getMonth() && today.getDate() >= birth.getDate());
  if (!hasHadBirthdayThisYear) age--;
  return age >= 0 ? age : null;
};

/**
 * Limpa toda formatação, deixando apenas números
 */
export const stripNonDigits = (value: string) => {
  if (!value) return "";
  return value.replace(/\D/g, "");
};

/**
 * Formata um CEP no padrão XXXXX-XXX
 */
export const formatCEP = (value: string) => {
  if (!value) return "";
  const numbers = value.replace(/\D/g, "");
  return numbers.replace(/(\d{5})(\d{1,3})/, "$1-$2").slice(0, 9);
};

export interface CEPAddress {
  logradouro: string;
  bairro: string;
  uf: string;
  erro?: boolean;
}

/**
 * Busca endereço a partir de um CEP usando a API ViaCEP.
 * Retorna null se o CEP for inválido, não encontrado ou em caso de falha de rede.
 */
export const fetchAddressByCEP = async (cep: string): Promise<CEPAddress | null> => {
  const numbers = stripNonDigits(cep);
  if (numbers.length !== 8) return null;

  try {
    const res = await fetch(`https://viacep.com.br/ws/${numbers}/json/`);
    if (!res.ok) return null;
    const data = await res.json();
    if (data.erro) return null;
    return data;
  } catch {
    return null;
  }
};
