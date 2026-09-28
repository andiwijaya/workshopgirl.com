export type VehicleType = 'Motorcycle' | 'Car';
export type JobStatus = 'intake' | 'inspection' | 'work-order' | 'qc' | 'completed';
export type OperationalStatus = 'Intake' | 'Inspection' | 'Waiting Approval' | 'Work In Progress' | 'Waiting Parts' | 'QC' | 'Ready for Pickup' | 'Completed' | 'Cancelled';
export interface OperationalTransition { status: OperationalStatus; at: string; reason?: string }
export interface WorkshopOperationsState { waitingParts: boolean; waitingPartsReason?: string; history: OperationalTransition[] }

export interface Customer { id: string; name: string; phone: string; address: string }
export interface Vehicle {
  id: string; type: VehicleType; plate: string; make: string; model: string;
  year: number | null; color: string; odometer: number | null;
}
export interface Intake {
  number: string; complaint: string; accessories: string[]; conditionNotes: string;
  date: string; arrivalTime: string;
}
export type InspectionStatus = 'Good' | 'Monitor' | 'Service' | 'Replace' | 'Not checked' | 'Not applicable';
export type Priority = 'Urgent' | 'Recommended' | 'Can wait';
export interface InspectionCheck { name: string; status: InspectionStatus; note: string }
export interface InspectionGroup { category: string; items: InspectionCheck[] }
export interface RecommendedJob { id: string; name: string; detail: string; priority: Priority; approved: boolean; approvedAt?: string; approvedBy?: string }
export interface PartEstimate { id: string; name: string; partNumber: string; quantity: number; unit: string; unitPrice: number }
export interface LaborEstimate { id: string; name: string; mode: 'fixed' | 'hourly'; hours: number; rate: number; fixed: number }
export interface Inspection {
  findings: string; checklist: InspectionGroup[]; recommendedJobs: RecommendedJob[];
  parts: PartEstimate[]; labor: LaborEstimate[]; consumables: number;
  additionalCost: number; discount: number; taxRate: number;
  revision?: number; approvedRevision?: number; approvedAt?: string; approvedBy?: string;
}
export type WorkStatus = 'Not started' | 'In progress' | 'Complete' | 'Paused' | 'Cancelled';
export interface WorkRow { id: string; name: string; detail: string; status: WorkStatus; mechanic: string; sourceRecommendationId?: string }
export interface WorkPart { id: string; name: string; partNumber: string; quantity: number; unit: string; notes: string; partId?: string }
export interface WorkChange { id: string; work: string; reason: string; approval: 'Awaiting approval' | 'Approved' | 'Deferred' | 'Declined'; notes: string }
export interface WorkOrder {
  number: string; date: string; status: WorkStatus; mechanic: string; approvedWork: WorkRow[];
  actualWork: WorkRow[]; parts: WorkPart[]; changes: WorkChange[]; startTime: string;
  endTime: string; mechanicNotes: string; result: string; recommendations: string; signoff: string;
  noRepairAcknowledged?: boolean; noRepairReason?: string;
}
export type QCResult = 'Pass' | 'Needs attention' | 'Not applicable' | 'Not checked';
export interface QCCheck { name: string; result: QCResult; note: string }
export interface UnresolvedIssue { id: string; issue: string; status: 'Customer deferred' | 'Needs follow-up'; recommendation: string; deferralReason?: string }
export interface QualityCheck {
  number: string; date: string; inspector: string; mechanic: string; finalStatus: 'In progress' | 'Rework required' | 'Ready for handover';
  checks: QCCheck[]; unresolvedIssues: UnresolvedIssue[]; returnedItems: string[];
  roadTest: 'Completed' | 'Not completed' | 'Not required'; roadTester: string;
  odometerBefore: number | null; odometerAfter: number | null; roadTestNotes: string;
  readinessNotes: string; recommendations: string; customerNotes: string;
  handoverRecipient: string; handoverStaff: string; handoverDate: string; handoverTime: string;
}
export interface WorkshopJob {
  id: string; number: string; status: JobStatus; customerId: string; vehicleId: string;
  intake: Intake; inspection?: Inspection; workOrder?: WorkOrder; qc?: QualityCheck;
  /** Vehicle odometer captured when this job was completed. */
  serviceOdometer?: number | null;
  /** Optional, additive local metadata. Phase 1 records without it remain valid. */
  operations?: WorkshopOperationsState;
  createdAt: string; updatedAt: string;
}
export interface WorkshopStore {
  version: 1; customers: Customer[]; vehicles: Vehicle[]; jobs: WorkshopJob[];
  /** Additive local inventory ledger. Missing arrays are initialized on load. */
  parts: WorkshopPart[]; partMovements: PartMovement[];
  /** Additive local service follow-up metadata; history itself is always projected from jobs. */
  warranties: WorkshopWarranty[]; warrantyClaims: WarrantyClaim[]; nextServices: NextService[];
  /** Additive local-first billing records. Missing arrays are initialized on load. */
  invoices: WorkshopInvoice[]; payments: WorkshopPayment[];
  /** Additive local-first procurement. Older stores are loaded with empty collections. */
  suppliers: WorkshopSupplier[]; purchaseNeeds: PurchaseNeed[];
  purchaseOrders: PurchaseOrder[]; goodsReceipts: GoodsReceipt[];
}

export type WorkshopInvoiceStatus = 'Draft' | 'Issued' | 'Void';
export type WorkshopInvoiceLineType = 'LABOR' | 'INVENTORY_PART' | 'NON_INVENTORY_MATERIAL' | 'MANUAL';
export type WorkshopPaymentMethod = 'Cash' | 'Bank Transfer' | 'Card' | 'Digital Payment' | 'Other';
export interface WorkshopInvoiceLine {
  lineId: string; sourceType: WorkshopInvoiceLineType; sourceId?: string; sourceIds?: string[];
  description: string; quantityMilli: number; unit: string; unitSellingPrice: number | null;
  priceConfirmed: boolean; included: boolean; lineTotal: number;
}
export interface WorkshopPartySnapshot { name: string; phone: string; address: string }
export interface WorkshopVehicleSnapshot { type: VehicleType; plate: string; make: string; model: string; year: number | null }
export interface WorkshopInvoice {
  invoiceId: string; invoiceNumber?: string; jobId: string; status: WorkshopInvoiceStatus;
  customerSnapshot?: WorkshopPartySnapshot; vehicleSnapshot?: WorkshopVehicleSnapshot;
  jobNumberSnapshot?: string; lines: WorkshopInvoiceLine[]; subtotal: number; discount: number;
  taxRateBps: number; taxAmount: number; grandTotal: number; currency: 'IDR';
  noCharge: boolean; cancelledBillingReason?: string; replacesInvoiceId?: string; replacedByInvoiceId?: string;
  issuedAt?: string; voidAt?: string; voidReason?: string; createdAt: string; updatedAt: string;
}
export interface WorkshopPayment {
  paymentId: string; invoiceId: string; kind: 'Payment' | 'Reversal'; amount: number;
  method?: WorkshopPaymentMethod; reference?: string; paidAt: string; note?: string;
  createdAt: string; reversalOfPaymentId?: string; reversalReason?: string; receiptNumber?: string;
}

export type WarrantyCoverageType = 'Labor' | 'Parts' | 'Labor and parts';
export type WarrantyClaimStatus = 'Open' | 'Resolved' | 'Declined';
export interface WorkshopWarranty {
  id: string; jobId: string; vehicleId: string; coverageType: WarrantyCoverageType;
  coveredWork: string[]; coveredPartIds: string[]; startDate: string; startOdometer: number | null;
  expiryDate: string | null; expiryOdometer: number | null; terms: string;
  createdAt: string; updatedAt: string;
}
export interface WarrantyClaim {
  id: string; warrantyId: string; date: string; odometer: number | null;
  issue: string; resolution: string; notes: string; status: WarrantyClaimStatus;
  createdAt: string; updatedAt: string;
}
export interface NextService {
  id: string; jobId: string; vehicleId: string; date: string | null;
  odometer: number | null; recommendation: string; createdAt: string; updatedAt: string;
}

export interface WorkshopPart {
  id: string; sku: string; name: string; category: string; brand: string; unit: string;
  location: string; supplier: string; minimumStock: number; barcode?: string;
  compatibility: string; active: boolean; defaultSupplierId?: string; createdAt: string; updatedAt: string;
}
export type PartMovementType = 'OPENING' | 'STOCK_IN' | 'ISSUE_TO_JOB' | 'RETURN_FROM_JOB' | 'ADJUSTMENT_IN' | 'ADJUSTMENT_OUT';
export type PartMovementSourceType = 'PURCHASE_RECEIPT';
export interface PartMovement {
  id: string; partId: string; type: PartMovementType; quantity: number; at: string;
  partNameSnapshot?: string; partSkuSnapshot?: string; partUnitSnapshot?: string;
  unitCost?: number; supplier?: string; reference?: string; note?: string; jobId?: string;
  sourceType?: PartMovementSourceType; sourceId?: string; poId?: string; poNumber?: string;
  receiptId?: string; receiptNumber?: string; receiptLineId?: string;
}

export type PurchaseNeedSource = 'JOB_SHORTAGE' | 'REPLENISHMENT' | 'MANUAL';
export type PurchaseNeedState = 'Open' | 'Ordered' | 'Partially Received' | 'Fulfilled' | 'Cancelled';
export interface WorkshopSupplier { supplierId: string; name: string; phone?: string; email?: string; address?: string; contactPerson?: string; notes?: string; active: boolean; createdAt: string; updatedAt: string }
export interface PurchaseNeed { needId: string; source: PurchaseNeedSource; partId: string; partNameSnapshot: string; skuSnapshot: string; unitSnapshot: string; requestedQuantity: number; jobId?: string; jobRequestedQuantitySnapshot?: number; requiredBy?: string; reason?: string; createdAt: string; cancelledAt?: string; cancelReason?: string }
export interface PurchaseNeedAllocation { needId: string; quantity: number }
export type PurchaseOrderStatus = 'Draft' | 'Issued' | 'Closed' | 'Cancelled';
export interface PurchaseOrderLine { lineId: string; partId: string; partNameSnapshot: string; skuSnapshot: string; unitSnapshot: string; orderedQuantity: number; agreedUnitCost: number; sourceAllocations: PurchaseNeedAllocation[] }
export interface SupplierSnapshot { name: string; phone?: string; email?: string; address?: string; contactPerson?: string }
export interface PurchaseOrder { poId: string; poNumber?: string; status: PurchaseOrderStatus; supplierId?: string; supplierSnapshot?: SupplierSnapshot; orderDate: string; expectedDate?: string; lines: PurchaseOrderLine[]; notes?: string; createdAt: string; updatedAt: string; issuedAt?: string; closedAt?: string; cancelledAt?: string; cancelReason?: string; closeReason?: string }
export interface AcceptedNeedAllocation { needId: string; quantity: number }
export interface GoodsReceiptLine { receiptLineId: string; poLineId: string; partId: string; partNameSnapshot: string; skuSnapshot: string; unitSnapshot: string; deliveredQuantity: number; acceptedQuantity: number; rejectedQuantity: number; actualUnitCost?: number; rejectionNote?: string; acceptedNeedAllocations: AcceptedNeedAllocation[]; stockMovementId?: string }
export interface GoodsReceipt { receiptId: string; receiptNumber: string; poId: string; receivedAt: string; supplierDeliveryNote?: string; supplierInvoiceReference?: string; receivedBy?: string; notes?: string; lines: GoodsReceiptLine[]; createdAt: string }
