export type VehicleType = 'Motorcycle' | 'Car';
export type JobStatus = 'intake' | 'inspection' | 'work-order' | 'qc' | 'completed';
export type OperationalStatus = 'Intake' | 'Inspection' | 'Waiting Approval' | 'Work In Progress' | 'Waiting Parts' | 'QC' | 'Ready for Pickup' | 'Completed' | 'Cancelled';
export interface OperationalTransition { status: OperationalStatus; at: string; reason?: string }
export interface WorkshopOperationsState { waitingParts: boolean; history: OperationalTransition[] }

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
export interface RecommendedJob { id: string; name: string; detail: string; priority: Priority; approved: boolean }
export interface PartEstimate { id: string; name: string; partNumber: string; quantity: number; unit: string; unitPrice: number }
export interface LaborEstimate { id: string; name: string; mode: 'fixed' | 'hourly'; hours: number; rate: number; fixed: number }
export interface Inspection {
  findings: string; checklist: InspectionGroup[]; recommendedJobs: RecommendedJob[];
  parts: PartEstimate[]; labor: LaborEstimate[]; consumables: number;
  additionalCost: number; discount: number; taxRate: number;
}
export type WorkStatus = 'Not started' | 'In progress' | 'Complete' | 'Paused' | 'Cancelled';
export interface WorkRow { id: string; name: string; detail: string; status: WorkStatus; mechanic: string }
export interface WorkPart { id: string; name: string; partNumber: string; quantity: number; unit: string; notes: string; partId?: string }
export interface WorkChange { id: string; work: string; reason: string; approval: 'Awaiting approval' | 'Approved' | 'Deferred' | 'Declined'; notes: string }
export interface WorkOrder {
  number: string; date: string; status: WorkStatus; mechanic: string; approvedWork: WorkRow[];
  actualWork: WorkRow[]; parts: WorkPart[]; changes: WorkChange[]; startTime: string;
  endTime: string; mechanicNotes: string; result: string; recommendations: string; signoff: string;
}
export type QCResult = 'Pass' | 'Needs attention' | 'Not applicable' | 'Not checked';
export interface QCCheck { name: string; result: QCResult; note: string }
export interface UnresolvedIssue { id: string; issue: string; status: 'Customer deferred' | 'Needs follow-up'; recommendation: string }
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
  compatibility: string; active: boolean; createdAt: string; updatedAt: string;
}
export type PartMovementType = 'OPENING' | 'STOCK_IN' | 'ISSUE_TO_JOB' | 'RETURN_FROM_JOB' | 'ADJUSTMENT_IN' | 'ADJUSTMENT_OUT';
export interface PartMovement {
  id: string; partId: string; type: PartMovementType; quantity: number; at: string;
  unitCost?: number; supplier?: string; reference?: string; note?: string; jobId?: string;
}
