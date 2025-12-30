
export enum WorkStatus {
  PROGETTO = 'Progetto (Stima)',
  AFFIDAMENTO = 'Affidamento (Contratto)',
  PAGAMENTO = 'Pagamento (Fattura)',
  ANNULLATO = 'Annullato'
}

export interface BidResult {
  winner: string;
  bidValue: number;
  date: string;
  contractPdf?: {
    name: string;
    data: string;
  };
}

export interface PaymentResult {
  paidValue: number;
  invoiceDate: string;
  invoiceNumber: string;
  invoicePdf?: {
    name: string;
    data: string;
  };
  creGenerated: boolean;
  creDate?: string;
}

export interface FundingIDV {
  id: string;
  idvCode: string;     // Identificativo univoco finanziamento
  capitolo: string;    // Capitolo di spesa
  amount: number;      // Importo totale assegnato (l'assegno)
  motivation: string;  // Motivazione/Provenienza
  createdAt: string;
  locked?: boolean;    // Stato di blocco del fondo
}

export interface WorkOrder {
  id: string;
  orderNumber: string;
  description: string;
  
  // Fasi della spesa
  estimatedValue: number;  // Valore fase Progetto
  contractValue?: number;  // Valore fase Affidamento
  paidValue?: number;      // Valore fase Pagamento
  
  linkedIdvIds: string[];  // IDV (assegni) utilizzati per coprire questa spesa
  status: WorkStatus;
  winner?: string;         // Aggiudicatario (per fase Affidamento)
  createdAt: string;
  locked?: boolean;        // Stato di blocco della pratica
  projectPdf?: {           // Allegato PDF del progetto protocollato
    name: string;
    data: string;          // Base64 encoded PDF
  };
  contractPdf?: {          // Allegato contratto/affidamento
    name: string;
    data: string;
  };
  invoicePdf?: {           // Allegato fattura
    name: string;
    data: string;
  };
  creGenerated?: boolean;  // Indica se il CRE è stato emesso
  creDate?: string;        // Data emissione CRE
}

export interface ChapterStats {
  capitolo: string;
  totalBudget: number;
  committed: number;   // Somma stime progetti
  contracted: number;  // Somma contratti affidati
  spent: number;       // Somma fatture pagate
  available: number;   // Residuo reale (Budget - Impegni/Spese)
}
