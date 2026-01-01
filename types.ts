
export enum UserRole {
  ADMIN = 'Amministratore',
  EDITOR = 'Ufficio Tecnico',
  ACCOUNTANT = 'Ufficio Amministrativo',
  VIEWER = 'Visualizzatore'
}

export interface User {
  id: string;
  username: string;
  passwordHash: string;
  role: UserRole;
  lastActive?: string;
}

export interface ChatMessage {
  id: string;
  userId: string;
  username: string;
  text: string;
  timestamp: string;
}

export interface AuditEntry {
  id: string;
  timestamp: string;
  userId: string;
  username: string;
  action: string;
  details: string;
}

export enum WorkStatus {
  PROGETTO = 'Progetto (Stima)',
  AFFIDAMENTO = 'Affidamento (Contratto)',
  PAGAMENTO = 'Pagamento (Fattura)',
  ANNULLATO = 'Annullato'
}

export interface PlanningNeed {
  id: string;
  chapter: string;
  barracks: string;
  description: string;
  projectValue: number;
  quotationValue?: number;
  projectPdf?: { name: string; data: string; };
  quotationPdf?: { name: string; data: string; };
  listId?: string; // ID della lista mirata di appartenenza
  locked?: boolean;
  createdAt: string;
  ownerName: string;
}

export interface PlanningList {
  id: string;
  name: string;
  createdAt: string;
}

export interface FundingIDV {
  id: string;
  idvCode: string;
  capitolo: string;
  amount: number;
  motivation: string;
  createdAt: string;
  ownerId: string;
  ownerName: string;
  assignedToId?: string;
  assignedToName?: string;
  locked?: boolean;
}

export interface WorkOrder {
  id: string;
  orderNumber: string;
  description: string;
  estimatedValue: number;
  contractValue?: number;
  paidValue?: number;
  linkedIdvIds: string[];
  status: WorkStatus;
  winner?: string;
  createdAt: string;
  ownerId: string;
  ownerName: string;
  locked?: boolean;
  projectPdf?: { name: string; data: string; };
  contractPdf?: { name: string; data: string; };
  invoicePdf?: { name: string; data: string; };
  creGenerated?: boolean;
  creDate?: string;
}

export interface AppState {
  version: number;
  users: User[];
  idvs: FundingIDV[];
  orders: WorkOrder[];
  planningNeeds: PlanningNeed[];
  planningLists: PlanningList[];
  auditLog: AuditEntry[];
  chatMessages: ChatMessage[];
  lastSync: string;
}

export interface BidResult {
  winner: string;
  bidValue: number;
  date: string;
  contractPdf?: { name: string; data: string; };
}

export interface PaymentResult {
  paidValue: number;
  invoiceDate: string;
  invoiceNumber: string;
  invoicePdf?: { name: string; data: string; };
  creGenerated: boolean;
  creDate: string;
}
