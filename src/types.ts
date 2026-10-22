export interface User {
  id: number
  name: string
  email: string
  role?: string
  profilePicture?: string | null
}

export interface LoginResponse {
  token: string
  user: User
}

export interface CaseItem {
  id: number
  title: string
  caseNo?: string | null
  fileNo?: string | null
  cnrNo?: string | null
  court?: string | null
  district?: string | null
  courtNo?: string | null
  judgeName?: string | null
  caseNature?: string | null
  caseType?: string | null
  clientName?: string | null
  opposingParty?: string | null
  status?: string | null
  nextHearing?: string | null
  reliefSought?: string | null
  filingDate?: string | null
  clientId?: number | null
  clientSubTypes?: Record<string, string> | null
  building?: string | null
  floor?: string | null
}

export interface HearingRow {
  id: number
  caseId: number
  date: string
  notes?: string | null
  outcome?: string | null
  judgeName?: string | null
  orderDocId?: string | null
}

export interface MiscHearing {
  id: number
  date: string
  note?: string | null
}

export interface MiscDocument {
  id: string
  name: string
  fileName?: string | null
  size?: string | null
  date?: string | null
}

export interface MiscApplication {
  id: number
  caseId: number
  caseTitle?: string | null
  caseNo?: string | null
  court?: string | null
  district?: string | null
  caseStatus?: string | null
  clientName?: string | null
  applicationType: string
  filingDate?: string | null
  hearingDate?: string | null
  status?: string | null
  disposedOn?: string | null
  disposalOutcome?: string | null
  hearings?: MiscHearing[] | null
  applicationDocument?: MiscDocument | null
  orderDocument?: MiscDocument | null
  additionalDocuments?: MiscDocument[] | null
}

export interface Page<T> {
  content: T[]
  last: boolean
  number: number
  totalPages: number
}

export interface HearingLeave {
  caseId: number
  judgeName?: string | null
  onLeave: boolean
  leaveFrom?: string | null
  leaveTo?: string | null
  reason?: string | null
  causeListNo?: number | null
}

export interface JudgeLeave {
  id?: number | null
  name: string
  court?: string | null
  district?: string | null
  leaveFrom: string
  leaveTo?: string | null
  reason?: string | null
}

export interface HearingEntry {
  key: string

  kind: 'hearing' | 'misc'
  date: string
  caseId: number
  caseTitle: string
  caseNo: string
  court: string
  district: string
  courtNo: string
  judgeName: string
  notes: string
  outcome: string
  clientName: string
  opposingParty: string
  caseNature: string
  caseType: string
  cnrNo: string
  fileNo: string
  building: string
  floor: string

  upcoming: boolean

  applicationType: string
  applicationStatus: string
  applicationOutcome: string
  filingDate: string
  disposedOn: string

  applicationNext: string
  applicationHearings: HistoryItem[]
  applicationDocs: MiscDocItem[]

  caseStatus: string
  reliefSought: string
  caseFilingDate: string
  clientLabel: string
  caseNext: string
  caseHistory: HistoryItem[]
}

export interface HistoryItem {
  date: string
  note: string
}

export interface MiscDocItem {
  kind: 'Application' | 'Order' | 'Additional'
  name: string
  size: string
  date: string
}

export interface Holiday {
  id: number
  date: string
  label: string
  description?: string | null
  courtType?: string | null
}

export interface Note {
  id: string
  title: string
  body: string
  ink?: string
  caseId?: number | null
  caseTitle?: string | null
  pinned?: boolean
  createdAt: number
  updatedAt: number
  // Set on a note that was deleted: only a marker is kept until the deletion reaches the server
  deleted?: boolean
  // updatedAt of the version the server has; the note still has to be sent when it differs from updatedAt
  synced?: number
}

export interface CourtRow {
  id: number
  court: string
  district?: string | null
  highCourt?: boolean
}
