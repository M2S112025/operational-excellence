# Data models: actual frontend schemas and proposed backend additions

The interfaces below are extracted verbatim from the current repository. They are **actual frontend DTOs**, not a final database schema. `?` means optional in current persisted/legacy data. Referenced unions/helpers remain defined in each linked source; do not discard fields just because a new UI does not display them. Internal IDs, user IDs, display numbers, source references and historical names have different meanings.

## Relationships and persistence semantics

- Organization registry → module access and Audit standard/custom/scoring configuration are scoped explicitly by organization. Operational records generally carry Plant/Zone names rather than organization foreign keys; this is a production tenant gap.
- Audit → sections → questions → evidence; question→Action. Each saved Audit embeds the applicable checklist and scoring/reference snapshot.
- Action → source module/record/optional observation plus owner/reviewer; evidence/history arrays belong to the canonical Action. Source IDs are never new Action IDs.
- Gemba walk→observations; observation→Action/Red Tag/CI; Gemba evidence references IndexedDB Blob keys. Deployment history is informational, not an access grant.
- Red Tag→review→decision→disposition/Keep→closure; optional canonical Action and Gemba relationship. No imported 5S Red Tag DTO migration.
- CI→owner/team and Action IDs; proposal and completion review history separate from Actions. VI remains legacy compatibility.
- VM Board→metric assignments and Meetings; KPI actual/deviation→Action; Meeting embeds board-name/configured KPI review snapshots and attendance/topics/follow-ups.
- OpsRelationship joins explicit module/record/child refs; metadata only, never base64/files.

## Proposed server requirements (not implemented fields)

Every business entity/file/query needs an authorized organization scope, durable server-generated identity, version/concurrency token, authenticated actor provenance and server timestamps. Stable Plant/Zone/User foreign keys must coexist with historical display snapshots during migration. Define a migration map for existing browser IDs/name refs and a policy for local fixture data before production import. Do not trust request-supplied `createdBy`, `approvedBy`, `organizationId` or role flags as authorization.

Store immutable checklist/scoring/meeting revisions and an append-only command/event audit trail. Revision changes must not recompute completed answers/scores or replace historical evidence references. Normalize files into tenant-scoped storage metadata as an agreed backend design; raw frontend data URLs and static paths are not durable production file IDs. Proposed additional metadata is not a new frontend business field or a claim of implementation.

## Actual interface extracts

### Audit

Source: [features/five-s/types/five-s.ts](../../features/five-s/types/five-s.ts).

```ts
export interface FiveSAudit {
  /** Immutable creation-time policy. Absent on legacy records. */
  scoringPolicy?: Readonly<AuditScoringPolicy>;
  id: string;

  title: string;

  plant: string;

  department: string;

  area: string;

  auditor: string;

  status: FiveSAuditStatus;

  score: number;

  maxScore: number;

  completionPercentage: number;

  scheduledDate?: string;

  scheduledTime?: string;

  startedAt?: string;

  completedAt?: string;

  auditorSignature?: {
    userId: string;
    userName: string;
    signedAt: string;
    signatureImage: string;
  };

  dueDate: string;

  sections: FiveSSection[];
}
```

```ts
export interface FiveSSection {
  category: FiveSAuditStage;

  description: string;

  questions: FiveSQuestion[];

  score: number;

  maxScore: number;
}
```

```ts
export interface FiveSQuestion {
  id: string;

  category: FiveSAuditStage;

  question: string;

  description?: string;

  referenceImage?: string;

  referenceTitleKey?: string;

  referenceGuidanceKey?: string;

  referenceAltKey?: string;

  maxScore: number;

  score: number | null;

  /** Compliance identity independent of numeric policy score; absent on legacy records. */
  complianceResponse?: ComplianceResponse | null;

  status: FiveSQuestionStatus;

  observation?: string;

  evidence?: FiveSEvidence[];

  actionRequired: boolean;

  actionId?: string;

  /** Snapshot metadata. Missing values on legacy audits are treated as standard Compliance questions. */
  questionSource?: AuditQuestionSource;
  customQuestionId?: string;
  responseType?: AuditQuestionResponseType;
  mandatory?: boolean;
  requireEvidenceOnNonCompliance?: boolean;
  textResponse?: string;
  yesNoResponse?: "Yes" | "No";
}
```

```ts
export interface FiveSEvidence {
  id: string;
  name: string;

  type:
    | "image"
    | "document";

  size: number;

  dataUrl: string;

  uploadedAt: string;

  uploadedBy: string;
}
```

### Canonical Actions

Source: [features/five-s/types/my-actions.ts](../../features/five-s/types/my-actions.ts).

```ts
export interface MyAction {
  id: string;

  /** Stable audit link for newly created actions; legacy records use sourceTitle. */
  auditId?: string;
  questionId?: string;
  questionText?: string;
  questionSource?: "standard" | "custom";
  customQuestionId?: string;
  sectionId?: string;
  zoneId?: string;

  title: string;
  description: string;

  source: MyActionSource;
  sourceTitle: string;

  /** Cross-module source metadata. Legacy audit records are normalized at read time. */
  sourceModule?: ActionSourceModule;
  sourceId?: string;
  sourceLabel?: string;
  sourceLocation?: string;
  sourceObservationId?: string;
  sourceObservation?: string;
  /** Exact VM references plus immutable display snapshots for KPI-created Actions. */
  visualManagementSource?: VisualManagementActionSource;

  category?: string;

  /** Operational classification selected when the action is created. */
  actionCategory?: string;
  /** Resolution classification selected by the responsible member. */
  correctiveActionCategory?: string;
  improvementTheme?: string;
  improvementClassification?: "Basic Improvement" | "Improvement Case" | "Trouble / Corrective Case";
  originalFinding?: string;

  plant: string;
  department: string;
  area: string;

  assignedTo: string;

  responsiblePersonId?: string;
  responsiblePersonName?: string;
  zoneLeaderId?: string;
  zoneLeaderName?: string;
  assignedByUserId?: string;
  assignedByName?: string;
  assignedAt?: string;
  createdByUserId?: string;
  createdByName?: string;

  /**
   * Auditor responsible for verifying the completed action.
   * Optional so existing/demo actions continue to work.
   */
  auditor?: string;

  status: MyActionStatus;
  priority: MyActionPriority;

  /** Effective date retained for existing filters and integrations. */
  dueDate: string;
  priorityDueDate?: string;
  dueDateOverride?: string;
  dueDateHistory?: Array<{ previousDate: string; newDate: string; reason: string; actorId: string; actorName: string; changedAt: string }>;

  createdAt: string;

  /**
   * Description entered by the responsible person
   * before submitting the action for auditor review.
   */
  actionTakenDescription?: string;
  resolutionObservation?: string;
  costSaving?: number;
  currency?: string;

  /**
   * Date the responsible person submitted the action
   * to the auditor for verification.
   */
  submittedForReviewAt?: string;

  /**
   * Final auditor verification details.
   */
  reviewedAt?: string;
  reviewedBy?: string;
  reviewerId?: string;
  reviewerName?: string;

  completedAt?: string;
  completedByUserId?: string;
  completedByName?: string;
  reviewHistory?: MyActionActivity[];
  activityHistory?: MyActionActivity[];
  reassignmentHistory?: MyActionReassignment[];

  /** Explicit closure metadata. Legacy records continue to fall back to review/completion fields. */
  closedByUserId?: string;
  closedBy?: string;
  closedAt?: string;
  closureRemark?: string;

  /**
   * Evidence captured when the issue was originally
   * identified during the audit.
   *
   * Used as BEFORE evidence in the closure report.
   */
  issueEvidence?: MyActionEvidence[];

  /** Optional work-in-progress evidence; completion evidence remains in `evidence`. */
  progressEvidence?: MyActionEvidence[];

  /**
   * Evidence uploaded by the action owner when
   * completing the corrective action.
   *
   * Used as AFTER evidence in the closure report.
   */
  evidence: MyActionEvidence[];
}
```

```ts
export interface MyActionEvidence {
  id: string;
  /** Action-level ownership metadata; optional for legacy evidence. */
  actionId?: string;
  evidenceType?: "finding" | "progress" | "resolution";
  name: string;

  type:
    | "image"
    | "document";

  uploadedAt: string;
  uploadedBy: string;
  mimeType?: string;

  url?: string;
  /** Source-owned binary reference, currently used by Gemba IndexedDB photos. */
  storageKey?: string;
}
```

```ts
export interface MyActionActivity {
  id: string;
  type: MyActionActivityType;
  actorId: string;
  actorName: string;
  createdAt: string;
  remark?: string;
}
```

### Original OPS Red Tag

Source: [features/five-s/red-tag/types.ts](../../features/five-s/red-tag/types.ts).

```ts
export interface RedTag {
  id: string;
  tagNumber: string;
  plant: string;
  zone: string;
  section: string;
  itemName: string;
  /** Legacy field retained so historical Red Tags remain readable. */
  quantity?: number;
  department?: string;
  category?: RedTagCategory;
  estimatedValue?: number;
  reason: RedTagReason;
  reasonCategory?: RedTagReasonCategory;
  customReason?: string;
  remarks: string;
  /** Legacy client workflow fields; V2 records capture responsibility/target in dispositionDetails. */
  requiredAction?: string;
  responsiblePersonId?: string;
  responsiblePersonName?: string;
  targetDate?: string;
  status: RedTagStatus;
  createdById: string;
  createdByName: string;
  createdAt: string;
  imageUrl?: string;
  actionId?: string;
  syncedActionStatus?: import("@/features/five-s/types/my-actions").MyActionStatus;
  disposition?: RedTagDisposition;
  dispositionNote?: string;
  verificationRemark?: string;
  verifiedByUserId?: string;
  verifiedByName?: string;
  verifiedAt?: string;
  removedByUserId?: string;
  removedByName?: string;
  removedAt?: string;
  removalConfirmed?: boolean;
  afterEvidence?: RedTagEvidence[];
  review?: RedTagReview;
  decisionRecord?: RedTagDecisionRecord;
  handlingMode?: "direct" | "linked_action";
  dispositionDetails?: RedTagDispositionDetails;
  keepConfirmation?: RedTagKeepConfirmation;
  closure?: RedTagClosure;
  closedAt?: string;
  history: RedTagHistoryEvent[];
}
```

```ts
export interface RedTagReview {
  reviewerId: string;
  reviewerName: string;
  submittedAt: string;
  reviewedAt?: string;
  comments?: string;
}
```

```ts
export interface RedTagDecisionRecord {
  type: RedTagDecision;
  decidedAt: string;
  decidedByUserId: string;
  decidedByName: string;
  comments?: string;
}
```

```ts
export interface RedTagDispositionDetails {
  decision: RedTagDecision;
  responsiblePersonId: string;
  responsiblePersonName: string;
  targetDate: string;
  startedAt: string;
  startedByUserId: string;
  startedByName: string;
  executionNotes?: string;
  completedAt?: string;
  completedByUserId?: string;
  completedByName?: string;
  completionNotes?: string;
  responsibleConfirmed?: boolean;
  evidence: RedTagEvidence[];
  approval?: { approved: boolean; approvedAt: string; approvedByUserId: string; approvedByName: string; comment?: string };
}
```

```ts
export interface RedTagKeepConfirmation {
  justification: string;
  confirmedAt: string;
  confirmedByUserId: string;
  confirmedByName: string;
}
```

### Gemba

Source: [features/gemba/types.ts](../../features/gemba/types.ts).

```ts
export interface GembaWalk {
  id: string;
  plant: string;
  zone: string;
  leadId: string;
  leadName: string;
  participants: GembaParticipant[];
  purpose: string;
  notes?: string;
  scheduledDate: string;
  /** Only meaningful for a "Scheduled" walk; absent for legacy/"Start now" walks. */
  scheduledTime?: string;
  status: GembaWalkStatus;
  createdAt: string;
  updatedAt: string;
  startedAt?: string;
  completedAt?: string;
  observationIds: string[];
  actionIds: string[];
  activity: GembaActivity[];
}
```

```ts
export interface GembaObservation {
  id: string;
  gembaId: string;
  type: GembaObservationType;
  title: string;
  description: string;
  location: string;
  peopleInvolved: string[];
  evidence: GembaEvidence[];
  voiceNote?: GembaVoiceNote;
  createdById: string;
  createdByName: string;
  createdAt: string;
  updatedAt: string;
  actionId?: string;
  /** Explicit follow-up decision. Legacy records derive this from actionId/noActionReason. */
  correctiveActionNeeded?: boolean;
  redTagId?: string;
  improvementId?: string;
  noActionReason?: string;
  horizontalDeployment?: GembaHorizontalDeployment;
  /** Historical snapshots are audit information, never access grants. */
  horizontalDeploymentHistory?: Array<{ deployment: GembaHorizontalDeployment; at: string; actorId: string }>;
}
```

```ts
export interface GembaEvidence {
  id: string;
  name: string;
  /**
   * Displayable URL: a static path for seed/demo assets, or a session-local
   * object/data URL for a just-captured photo before persistence completes.
   * Never persisted to localStorage when it is a `blob:`/`data:` URL — see
   * `sanitizeEvidenceForPersist` in gemba-store.ts. Absent once only the
   * IndexedDB-backed `storageKey` remains (e.g. after a page refresh).
   */
  url?: string;
  /** IndexedDB key for the photo Blob (lib/gemba/gemba-photo-storage.ts). Present for any photo added since the IndexedDB migration. */
  storageKey?: string;
  mimeType?: string;
  size?: number;
  note?: string;
  uploadedAt: string;
  uploadedBy: string;
}
```

```ts
export interface GembaHorizontalDeployment {
  enabled: true;
  /** Absent on legacy selected-Zone records; never inferred on load. */
  policy?: "same-plant-broadcast";
  targetZoneIds: string[];
  recipients: GembaHorizontalDeploymentRecipient[];
  createdAt: string;
  updatedAt: string;
}
```

### Continual Improvement

Source: [features/five-s/continuous-improvement/types.ts](../../features/five-s/continuous-improvement/types.ts).

```ts
export interface ContinuousImprovement {
  id: string;
  plant: string;
  zone: string;
  zoneCode: string;
  zoneLeaderId: string;
  zoneLeaderName: string;

  title: string;
  issueDescription: string;
  proposedImprovement: string;
  expectedBenefit: string;
  benefitType: ImprovementBenefitType;
  proposedSaving: number;
  estimatedTime: number;
  estimatedTimeUnit: TimeUnit;

  proposedById: string;
  proposedByName: string;
  ownerId: string;
  ownerName: string;
  memberIds: string[];
  memberNames: string[];
  participants: ImprovementPerson[];

  status: ImprovementStatus;
  reviewerId?: string;
  reviewerName?: string;
  reviewDecision?: "approved" | "rejected" | "on_hold";
  reviewRemark?: string;
  reviewedAt?: string;
  reviewedById?: string;
  reviewedByName?: string;
  holdReason?: string;
  heldAt?: string;
  heldById?: string;
  heldByName?: string;

  implementationProcess?: string;
  actionTaken?: string;
  progressNotes?: string;
  actionIds: string[];
  actualBenefit?: string;
  actualSaving?: number;
  completionRemark?: string;
  completionReviewRemark?: string;
  completionReviewedAt?: string;
  completionReviewedById?: string;
  completionReviewedByName?: string;

  /** Existing current-state images. Kept as an alias for the legacy CI model. */
  existingPhotos: ImprovementEvidence[];
  /** Completion images. Kept as an alias for the legacy CI model. */
  evidence: ImprovementEvidence[];
  beforeEvidence: ImprovementEvidence[];
  afterEvidence: ImprovementEvidence[];

  createdAt: string;
  updatedAt: string;
  submittedAt?: string;
  startedAt?: string;
  completionSubmittedAt?: string;
  completedAt?: string;
  completedById?: string;
  completedByName?: string;
  timeline: ImprovementEvent[];
}
```

```ts
export interface ImprovementEvidence {
  id: string;
  name: string;
  url: string;
  uploadedAt: string;
  uploadedBy: string;
  mimeType?: string;
  caption?: string;
}
```

### Legacy Visual Improvement

Source: [features/visual-improvement/types.ts](../../features/visual-improvement/types.ts).

```ts
export interface VisualImprovement {
  id: string;
  title: string;
  plant: string;
  zone: string;
  location: string;
  category: VisualImprovementCategory;
  ownerId: string;
  ownerName: string;
  participants: VisualImprovementPerson[];
  status: VisualImprovementStatus;
  beforeDescription: string;
  beforeEvidence: VisualImprovementEvidence[];
  afterDescription?: string;
  afterEvidence: VisualImprovementEvidence[];
  expectedBenefit: string;
  proposedCostSaving?: number;
  actualCostSaving?: number;
  benefitDescription?: string;
  timeSaved?: string;
  spaceSaved?: string;
  safetyBenefit?: string;
  qualityBenefit?: string;
  otherBenefit?: string;
  estimatedCompletionDate?: string;
  completionNotes?: string;
  actionId?: string;
  createdById: string;
  createdByName: string;
  createdAt: string;
  updatedAt: string;
  startedAt?: string;
  submittedAt?: string;
  completedById?: string;
  completedByName?: string;
  completedAt?: string;
  reviewedById?: string;
  reviewedByName?: string;
  reviewedAt?: string;
  reviewRemark?: string;
  activity: VisualImprovementActivity[];
}
```

### Visual Management

Source: [features/visual-management/types.ts](../../features/visual-management/types.ts).

```ts
export interface VisualManagementBoard {
  id: string;
  name: string;
  plant: string;
  zone?: string;
  tier: VisualManagementTier;
  owner: VisualManagementPerson;
  members: VisualManagementPerson[];
  meetingFrequency: string;
  sections: VisualManagementKpiEntry[];
  status: VisualManagementBoardStatus;
  createdAt: string;
  updatedAt: string;
}
```

```ts
export interface VisualManagementMeeting {
  id: string;
  boardId: string;
  /** Immutable display snapshot used after a Board is renamed or deactivated. */
  boardName?: string;
  plant: string;
  zone?: string;
  tier: VisualManagementTier;
  lead: VisualManagementPerson;
  participants: VisualManagementParticipant[];
  scheduleId?: string;
  occurrenceDate?: string;
  scheduledTime?: string;
  scheduledDurationMinutes?: number;
  startedAt: string;
  completedAt?: string;
  kpiEntries: VisualManagementKpiEntry[];
  /** Immutable Phase 2 configured-KPI snapshots captured when the meeting starts. */
  configuredKpiReviews?: import("./kpi-execution-store").MeetingKpiReviewSnapshot[];
  topicIds: string[];
  decisionIds: string[];
  actionIds: string[];
  redFlagIds: string[];
  continuousImprovementIds: string[];
  gembaIds: string[];
  escalationIds: string[];
  status: VisualManagementMeetingStatus;
}
```

```ts
export interface VisualManagementTopic {
  id: string;
  meetingId: string;
  section: VisualManagementKpiSection;
  title: string;
  description: string;
  owner?: VisualManagementPerson;
  decision?: string;
  followUpRequired?: boolean;
  followUpType?: VisualManagementFollowUpType;
  linkedActionId?: string;
  linkedRedFlagId?: string;
  linkedCIId?: string;
  linkedGembaId?: string;
  escalationId?: string;
  createdBy: VisualManagementPerson;
  createdAt: string;
}
```

```ts
export interface VisualManagementEscalation {
  id: string;
  sourceBoardId: string;
  sourceMeetingId: string;
  targetBoardId: string;
  topicId: string;
  actionId?: string;
  reason: string;
  status: VisualManagementEscalationStatus;
  createdBy: VisualManagementPerson;
  createdAt: string;
  updatedAt: string;
}
```

### VM configured KPI

Source: [features/visual-management/kpi-configuration.ts](../../features/visual-management/kpi-configuration.ts).

```ts
export interface VisualManagementKpiDefinition {
  id: string;
  level: KpiLevel;
  name: string;
  originalObjective: string;
  smartObjective: string;
  smartAnalysis: SmartAnalysis;
  bucket: KpiBucket;
  indicatorType: KpiIndicatorType;
  measurementType: KpiMeasurementType;
  direction: KpiDirection;
  baseline: number;
  target: number;
  targetDate: string;
  performanceThreshold?: KpiPerformanceThreshold;
  parentKpiId?: string;
  functionName?: string;
  ownerUserId?: string;
  reviewFrequency?: KpiReviewFrequency;
  relationshipExplanation?: string;
  /** Simplified Daily Management metadata. Optional for legacy KPI records. */
  simpleMetricType?: "numeric" | "event";
  unit?: string;
  eventCategories?: string[];
  aggregation?: "average" | "sum" | "latest";
  status: "active" | "archived";
  createdAt: string;
  updatedAt: string;
}
```

### VM execution snapshots

Source: [features/visual-management/kpi-execution-store.ts](../../features/visual-management/kpi-execution-store.ts).

```ts
export interface VisualManagementKpiAssignment { id: string; boardId: string; kpiId: string; target?: number; performanceThreshold?: KpiPerformanceThreshold; displayOrder: number; isVisible: boolean; assignedAt: string; assignedByUserId: string }
```

```ts
export interface KpiActualEntry { id: string; kpiId: string; boardId: string; value: number; reportingPeriod: KpiReportingPeriod; reportedAt: string; reportedByUserId: string; comment?: string; statusSnapshot: KpiPerformanceStatus; neutralReason?: "no_production_holiday"; targetSnapshot: number; thresholdSnapshot: KpiPerformanceThreshold; measurementSnapshot: KpiMeasurementType; directionSnapshot: KpiDirection; createdAt: string }
```

```ts
export interface KpiDeviation { id: string; kpiActualEntryId: string; kpiId: string; boardId: string; status: "amber" | "red"; comment: string; correctiveActionRequired: boolean; noActionJustification?: string; actionId?: string; createdByUserId: string; createdAt: string }
```

```ts
export interface MeetingKpiReviewSnapshot { id: string; meetingId: string; boardId: string; kpiId: string; kpiActualEntryId?: string; kpiNameSnapshot: string; kpiLevelSnapshot: "unit" | "functional"; bucketSnapshot: string; reportingPeriodSnapshot?: KpiReportingPeriod; actualSnapshot?: number; targetSnapshot: number; statusSnapshot: KpiPerformanceStatus; deviationSnapshot?: string; correctiveActionRequiredSnapshot?: boolean; noActionJustificationSnapshot?: string; actionId?: string; reviewedAt: string; reviewedByUserId: string }
```

### Meeting scheduling

Source: [features/visual-management/meeting-schedule-store.ts](../../features/visual-management/meeting-schedule-store.ts).

```ts
export interface MeetingSchedule {
  id: string;
  boardId: string;
  date: string;
  time: string;
  durationMinutes: number;
  recurrence: MeetingRecurrence;
  attendees: VisualManagementParticipant[];
  createdByUserId: string;
  createdAt: string;
  status: "Scheduled" | "Cancelled";
  overrides: MeetingScheduleOverride[];
}
```

```ts
export interface MeetingRecurrence { type: MeetingRepeat; interval: number; weekdays?: number[]; end: MeetingEnd }
```

### Custom checklist configuration

Source: [features/settings/custom-audit-questions/types.ts](../../features/settings/custom-audit-questions/types.ts).

```ts
export interface CustomAuditQuestion {
  id: string;
  organizationId?: string;
  question: string;
  stage: FiveSAuditStage;
  responseType: AuditQuestionResponseType;
  mandatory: boolean;
  requireEvidenceOnNonCompliance: boolean;
  instruction?: string;
  referenceImage?: string;
  active: boolean;
  order: number;
  source: "custom";
  createdBy: string;
  createdAt: string;
  updatedAt: string;
}
```

### Standard checklist override

Source: [features/settings/standard-audit-checklist/store.ts](../../features/settings/standard-audit-checklist/store.ts).

```ts
export interface StandardQuestionEdit { question: string; instruction: string; referenceImage?: string; updatedBy: string; updatedAt: string }
```

### Organization directory

Source: [features/five-s/administration/types.ts](../../features/five-s/administration/types.ts).

```ts
export interface AdminUser { id:string; employeeId:string; name:string; email:string; plant:string; status:AdminUserStatus; roles:AdminRole[]; zoneMemberships:AdminZoneMembership[]; permissions:PermissionCode[]; updatedAt:string }
```

### Plant/Zone

Source: [lib/organization-store.ts](../../lib/organization-store.ts).

```ts
export interface OrganizationPlant {
  id: string;
  name: string;
  code: string;
  location: string;
  managerId: string;
  managerName: string;
  status: OrganizationStatus;
  description?: string;
  codeLocked: boolean;
}
```

```ts
export interface OrganizationZone {
  id: string;
  name: string;
  code: string;
  plantId: string;
  leaderId: string;
  leaderName: string;
  department: string;
  status: OrganizationStatus;
  description?: string;
}
```

### Organization registry

Source: [lib/module-entitlements.ts](../../lib/module-entitlements.ts).

```ts
export interface Organization {
  id: string;
  name: string;
  industry: string;
  plants: number;
  users: number;
  status: "Active" | "Inactive";
  lastUpdated: string;
}
```

### Cross-module relationship

Source: [lib/relationships/types.ts](../../lib/relationships/types.ts).

```ts
export interface OpsRecordRef {
  module: OpsModule;
  recordId: string;
  childId?: string;
  label?: string;
}
```

```ts
export interface OpsRelationship {
  id: string;
  from: OpsRecordRef;
  to: OpsRecordRef;
  relationshipType: OpsRelationshipType;
  createdAt: string;
  createdBy?: string;
  metadata?: Record<string, string | number | boolean>; // Simple metadata only
}
```

## Serialization and validation decisions still needed

Calendar due dates/schedule occurrence dates are not interchangeable with UTC instants. Preserve numeric compliance identity separately from configurable score values. Define decimal precision/currency for savings, event/percentage KPI domain rules, display-number uniqueness scopes, nullable versus empty-string migration (especially intentionally removed reference images), and allowed legacy status aliases. Maintain arrays/order and unique relationship/source-link constraints. Backend DTO acceptance must be narrower than `Partial<Entity>` generic patching.
