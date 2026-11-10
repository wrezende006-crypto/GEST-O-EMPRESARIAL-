export type PaymentMethod = 'pix' | 'boleto' | 'cartao_credito' | 'cartao_debito' | 'transferencia' | 'dinheiro';

export type TransactionType = 'entrada' | 'saida';

export type TransactionStatus = 'efetivado' | 'pendente';

export type ServiceStatus = 
  | 'orcamento'
  | 'aguardando_aprovacao'
  | 'aprovado'
  | 'aguardando_execucao'
  | 'em_andamento'
  | 'concluido'
  | 'cancelado';

export type ProposalStatus = 
  | 'em_elaboracao'
  | 'enviada'
  | 'aguardando_aprovacao'
  | 'aprovada'
  | 'recusada'
  | 'expirada';

export interface Customer {
  id: string;
  name: string;
  personType: 'PF' | 'PJ';
  document: string; // CPF or CNPJ
  phone: string;
  whatsapp: string;
  email: string;
  address: string;
  city: string;
  state: string;
  contactPerson?: string;
  notes?: string;
  createdAt: string;
}

export interface Collaborator {
  id: string;
  name: string;
  cpf: string;
  phone: string;
  role: string; // Eletricista Chefe, Auxiliar, Técnico em Eletrotécnica, Encarregado
  hiringType: 'CLT' | 'Diarista' | 'PJ' | 'Autônomo';
  dailyRate: number; // Valor da diária
  hourlyRate: number; // Custo hora
  admissionDate: string;
  status: 'ativo' | 'inativo';
  notes?: string;
}

export interface Supplier {
  id: string;
  name: string;
  document: string; // CNPJ / CPF
  contactPerson: string;
  phone: string;
  email: string;
  address: string;
  supplyType: string; // Distribuidora de Cabos, Iluminação, Locação de Ferramentas, etc.
  notes?: string;
}

export interface ServiceMaterial {
  id: string;
  name: string;
  quantity: number;
  unit: string; // metros, un, rolo, barras, kit
  unitPrice: number;
  totalPrice: number;
  supplierId?: string;
  isRealized?: boolean; // Previsto vs Efetivamente comprado
}

export interface ServiceTeamMember {
  id: string;
  collaboratorId: string;
  collaboratorName: string;
  role: string;
  daysWorked: number;
  hoursWorked: number;
  rateType: 'diaria' | 'hora';
  rateValue: number;
  totalCost: number;
  startDate?: string;
  endDate?: string;
}

export interface ServiceAdditionalExpense {
  id: string;
  description: string;
  category: string; // Combustível, Alimentação, Locação, Terceirização, Outros
  amount: number;
  date: string;
  isRealized: boolean; // Previsto vs Realizado
}

export interface ServiceAttachment {
  id: string;
  name: string;
  type: 'foto' | 'documento' | 'nota_fiscal' | 'art_laudo';
  url: string; // data url or path
  uploadDate: string;
  notes?: string;
}

export interface ServiceHistoryLog {
  id: string;
  date: string;
  author: string;
  action: string;
  details: string;
}

export interface ElectricalService {
  id: string;
  code: string; // OS-2026-001
  title: string;
  description: string;
  customerId: string;
  customerName: string;
  executionAddress: string;
  status: ServiceStatus;
  technicalLead: string;
  
  // Dates
  openingDate: string; // DD/MM/AAAA or YYYY-MM-DD
  expectedStartDate: string;
  expectedEndDate: string;
  actualEndDate?: string;

  // Commercial / Value
  contractedValue: number; // Preço de venda acordado
  pricingMode: 'target_price' | 'target_margin';
  targetMarginPercent: number; // e.g. 30%
  taxPercent: number; // e.g. 6% (Simples)
  cardFeePercent: number; // e.g. 3%

  // 9 Tabs Data
  team: ServiceTeamMember[];
  materials: ServiceMaterial[];
  additionalExpenses: ServiceAdditionalExpense[];
  attachments: ServiceAttachment[];
  history: ServiceHistoryLog[];
  proposalId?: string;

  notes?: string;
  createdAt: string;
  updatedAt: string;
}

export interface FinancialTransaction {
  id: string;
  type: TransactionType;
  description: string;
  customerId?: string;
  customerName?: string;
  supplierId?: string;
  supplierName?: string;
  serviceId?: string;
  serviceCode?: string;
  date: string; // data da transação ou lançamento
  dueDate: string; // data de vencimento
  paymentDate?: string; // data efetiva de pagamento
  amount: number;
  paymentMethod: PaymentMethod;
  category: string;
  isFixedExpense?: boolean;
  status: TransactionStatus; // efetivado vs pendente
  notes?: string;
  createdAt: string;
}

export interface ProposalItem {
  id: string;
  type: 'servico' | 'material';
  description: string;
  quantity: number;
  unit: string;
  unitPrice: number;
  totalPrice: number;
}

export interface CommercialProposal {
  id: string;
  code: string; // PROP-2026-001
  customerId: string;
  customerName: string;
  serviceId?: string; // se gerado a partir de um serviço
  serviceTitle: string;
  issueDate: string;
  validUntil: string;
  scopeOfWork: string;
  includedMaterials: string;
  includedServices: string;
  executionDeadline: string; // ex: "5 dias úteis"
  paymentTerms: string; // ex: "50% de entrada e 50% na entrega técnica"
  warrantyTerms: string; // ex: "12 meses de garantia de instalação"
  totalValue: number;
  status: ProposalStatus;
  items: ProposalItem[];
  notes?: string;
  convertedServiceId?: string;
  createdAt: string;
}

export interface CompanySettings {
  companyName: string;
  tradeName: string; // Nome fantasia
  cnpj: string;
  stateRegistration: string;
  phone: string;
  whatsapp: string;
  email: string;
  address: string;
  city: string;
  state: string;
  postalCode: string;
  technicalLead: string;
  creaNumber: string; // CREA / CFT
  adminName?: string; // Nome do Administrador (sem nome inicial, editável)
  adminRole?: string; // Cargo do Administrador (editável)
  bankName: string;
  bankAgency: string;
  bankAccount: string;
  pixKey: string;
  pixKeyType: 'CNPJ' | 'Email' | 'Telefone' | 'Aleatória';
  logoUrl: string;
  defaultTargetMargin: number; // e.g. 35%
  defaultTaxPercent: number; // e.g. 6%
  defaultCardFeePercent: number; // e.g. 3.5%
  categoriesExpense: string[];
  categoriesIncome: string[];
  serviceTypes: string[];
  proposalTemplateNotes: string;
  cnpjApiToken?: string;
}

export interface ERPDatabase {
  customers: Customer[];
  collaborators: Collaborator[];
  suppliers: Supplier[];
  services: ElectricalService[];
  transactions: FinancialTransaction[];
  proposals: CommercialProposal[];
  settings: CompanySettings;
  adminPin: string;
  lastUpdated: string;
}
