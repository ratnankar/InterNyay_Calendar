import { CaseItem, CaseParty, ChequeDetails, HearingEntry, HearingRow, HistoryItem, MiscApplication, MiscDocItem, MiscDocument } from './types'
import { fullDate, todayKey } from './dates'

const isClosed = (s?: string | null) => /^(decided|withdrawn)$/i.test((s || '').trim())
const isWithdrawn = (s?: string | null) => /^withdrawn$/i.test((s || '').trim())

const NO_COURT = 'Court not set'

export const NO_COURTS: string[] = ['']
export const inCourts = (sel: string[], court: string) => sel.length === 0 || sel.includes(court)
export const noCourtSelected = (sel: string[]) => sel.length > 0 && sel.every(c => !c)

const courtOf = (c?: string | null) => (c && c.trim()) || NO_COURT

const MISC_DISPOSED = 'Disposed Off'
const isDisposed = (status?: string | null) => (status || '').trim().toLowerCase() === MISC_DISPOSED.toLowerCase()

const MISC_LINE = /^\s*misc\.?\s*application\s*:\s*(.+?)\s*$/i
const LINE_BREAK = /\r\n|[\n\v\f\r\u0085\u2028\u2029]/

function isMiscOnlyRow(r: HearingRow): boolean {
  if (r.orderDocId && r.orderDocId.trim()) return false
  if (r.outcome && r.outcome.trim()) return false
  if (!r.notes || !r.notes.trim()) return false
  let sawApplication = false
  for (const line of r.notes.split(LINE_BREAK)) {
    if (!line.trim()) continue
    if (!MISC_LINE.test(line)) return false
    sawApplication = true
  }
  return sawApplication
}

const NO_APPLICATION = {
  applicationType: '', applicationStatus: '', applicationOutcome: '', filingDate: '', disposedOn: '',
  applicationNext: '', applicationHearings: [], applicationDocs: [],
}

const roleOf = (c: CaseItem, id?: number | null) => (id != null ? c.clientSubTypes?.[String(id)] || '' : '')

function clientLabelsOf(c?: CaseItem): string[] {
  if (!c) return []
  const people = [
    ...(c.clientName ? [{ id: c.clientId, name: c.clientName }] : []),
    ...(c.additionalClients || []).filter(x => x?.name).map(x => ({ id: x.id, name: x.name as string })),
  ]
  return people.map(p => {
    const role = roleOf(c, p.id)
    return role ? `${p.name} (${role})` : p.name
  })
}

const opponentsOf = (c?: CaseItem): CaseParty[] => {
  const list = (c?.opponents || []).filter(o => o?.name)
  return list.length || !c?.opposingParty ? list : [{ name: c.opposingParty }]
}

const nonClientsOf = (c?: CaseItem): string[] =>
  (c?.nonClients || []).filter(n => n?.name).map(n => (n.subType ? `${n.name} (${n.subType})` : n.name))

const money = (v?: number | string | null) => (v == null || v === '' ? '' : `₹${(Number(v) || 0).toLocaleString('en-IN')}`)

const chequeOf = (c?: CaseItem): ChequeDetails => ({
  no: c?.chequeNo || '',
  date: c?.chequeDate || '',
  memoDate: c?.memoDate || '',
  reason: c?.bouncingReason || '',
  claim: money(c?.claimAmount),
  noticeDate: c?.noticeDate || '',
})

const caseSide = (c?: CaseItem) => ({
  caseStatus: c?.status || '',
  reliefSought: c?.reliefSought || '',
  caseFilingDate: c?.filingDate || '',
  clientLabel: clientLabelsOf(c).join(', '),
})

const caseExtra = (c?: CaseItem) => ({
  caseStage: c?.caseStage || '',
  actsSections: c?.actsSections || '',
  registrationDate: c?.registrationDate || '',
  firstHearingDate: c?.firstHearingDate || '',
  lastHearingDate: '',
  decisionDate: c?.decisionDate || '',
  disposalNature: c?.disposalNature || '',
  firNo: c?.firNo || '',
  firSection: c?.firSection || '',
  policeStation: c?.policeStation || '',
  description: c?.description || '',
  clients: clientLabelsOf(c),
  nonClients: nonClientsOf(c),
  opponents: opponentsOf(c),
  cheque: chequeOf(c),
})

const partyLine = (p: CaseParty) => [p.name, p.fatherName && `Father: ${p.fatherName}`, p.phone, p.address].filter(Boolean).join(' · ')

function docLines(a: MiscApplication): MiscDocItem[] {
  const line = (kind: MiscDocItem['kind'], d?: MiscDocument | null): MiscDocItem[] =>
    d && (d.name || d.fileName) ? [{ kind, name: d.name || d.fileName || '', size: d.size || '', date: d.date ? d.date.slice(0, 10) : '' }] : []
  return [
    ...line('Application', a.applicationDocument),
    ...line('Order', a.orderDocument),
    ...(a.additionalDocuments || []).flatMap(d => line('Additional', d)),
  ]
}

function applicationStatusText(e: Pick<HearingEntry, 'applicationStatus' | 'applicationOutcome'>): string {
  return isDisposed(e.applicationStatus) && e.applicationOutcome ? `${e.applicationStatus} - ${e.applicationOutcome}` : e.applicationStatus || 'Pending'
}

// The small tags of a hearing (status, nature, type; for an application its status and outcome). Shown in the card and used as filters
export function badgesOf(e: HearingEntry): string[] {
  const misc = e.kind === 'misc'
  return [...(misc ? [e.applicationStatus || 'Pending', e.applicationOutcome] : [e.caseStatus, e.caseNature, e.reliefSought || e.caseType])]
    .filter((t, i, all): t is string => !!t && all.indexOf(t) === i)
}

export const roomOf = (e: Pick<HearingEntry, 'building' | 'floor'>): string => [e.building, e.floor].filter(Boolean).join(', ')

export type Field = [label: string, value: string]

const dateText = (d: string) => (d ? fullDate(d) : '')

export function hearingFields(e: HearingEntry, opts: { judge?: string; listNo?: number | string } = {}): Field[] {
  const many = e.opponents.length > 1
  const lone = e.opponents[0]
  const rows: [string, string | number | undefined | null, boolean?][] = [
    ['Relief Sought', e.reliefSought],
    ['Case No', e.caseNo, true],
    ['Court No', e.courtNo],
    ['Building', e.building],
    ['Cause List No', opts.listNo],
    ['Judge', opts.judge ?? e.judgeName],
    ['File No', e.fileNo],
    ['CNR No', e.cnrNo],
    ['Filing Date', dateText(e.caseFilingDate)],
    ['Registration Date', dateText(e.registrationDate)],
    ['First Hearing', dateText(e.firstHearingDate)],
    ['Last Hearing', dateText(e.lastHearingDate)],
    ['Case Stage', e.caseStage],
    ['Acts & Sections', e.actsSections],
    ['District', e.district],
    ['Court', e.court === NO_COURT ? '' : e.court],
    ['Decision Date', dateText(e.decisionDate)],
    ['Nature of Disposal', e.disposalNature],
    ['FIR No', e.firNo],
    ['Section', e.firSection],
    ['Police Station', e.policeStation],
    [e.clients.length > 1 ? 'Clients' : 'Client', e.clients.join(', '), true],
    [e.nonClients.length > 1 ? 'Non-clients' : 'Non-client', e.nonClients.join(', ')],
    ...(many
      ? [['Opposite Parties', e.opponents.map((o, i) => `${i + 1}. ${partyLine(o)}`).join('\n')] as [string, string]]
      : [
          ['Opposite Party', lone?.name || e.opposingParty] as [string, string | undefined],
          ["Father's Name", lone?.fatherName] as [string, string | null | undefined],
          ['Address', lone?.address] as [string, string | null | undefined],
          ['Phone', lone?.phone] as [string, string | null | undefined],
        ]),
    ['Description', e.description],
  ]
  return rows.filter(([, v, always]) => always || (v !== '' && v != null)).map(([l, v]) => [l, v == null || v === '' ? '—' : String(v)])
}

export function chequeFields(e: HearingEntry): Field[] {
  const c = e.cheque
  const rows: [string, string][] = [
    ['Cheque No', c.no],
    ['Cheque Date', dateText(c.date)],
    ['Memo Date', dateText(c.memoDate)],
    ['Bouncing Reason', c.reason],
    ['Claim Amount', c.claim],
    ['Notice Date', dateText(c.noticeDate)],
  ]
  return rows.filter(([, v]) => !!v)
}

export function applicationFields(e: HearingEntry): Field[] {
  const rows: [string, string | undefined, boolean?][] = [
    ['Application', e.applicationType],
    ['Status', applicationStatusText(e)],
    ['Case', e.caseTitle],
    ['Case No', e.caseNo, true],
    ['Client', e.clientLabel],
    ['Court', e.court === NO_COURT ? '' : e.court],
    ['District', e.district],
    ['Filing Date', e.filingDate ? fullDate(e.filingDate) : ''],
    ['Disposed Off On', e.disposedOn ? fullDate(e.disposedOn) : ''],
  ]
  return rows.filter(([, v, always]) => always || !!v).map(([l, v]) => [l, v || '—'])
}

export function buildEntries(cases: CaseItem[], rows: HearingRow[], today: string = todayKey(), applications: MiscApplication[] = []): HearingEntry[] {
  const byId = new Map<number, CaseItem>(cases.map(c => [c.id, c]))
  const seen = new Set<string>()
  const out: HearingEntry[] = []

  const history = new Map<number, HistoryItem[]>()
  const lastHeard = new Map<number, string>()

  const make = (c: CaseItem, date: string, row?: HearingRow): HearingEntry => ({
    key: `${c.id}|${date}`,
    kind: 'hearing',
    date,
    caseId: c.id,
    caseTitle: c.title || 'Untitled case',
    caseNo: c.caseNo || '',
    court: courtOf(c.court),
    district: c.district || '',
    courtNo: c.courtNo || '',
    judgeName: row?.judgeName || c.judgeName || '',
    notes: row?.notes || '',
    outcome: row?.outcome || '',
    clientName: c.clientName || '',
    opposingParty: c.opposingParty || '',
    caseNature: c.caseNature || '',
    caseType: c.caseType || '',
    cnrNo: c.cnrNo || '',
    fileNo: c.fileNo || '',
    building: c.building || '',
    floor: c.floor || '',
    upcoming: c.nextHearing === date && !isClosed(c.status),
    ...NO_APPLICATION,
    ...caseSide(c),
    caseNext: c.nextHearing || '',
    caseHistory: [],
    ...caseExtra(c),
  })

  for (const r of rows) {
    const c = byId.get(r.caseId)
    if (!c || !r.date) continue

    if (isMiscOnlyRow(r)) continue

    if (isWithdrawn(c.status) && r.date >= today) continue
    const e = make(c, r.date, r)
    if (seen.has(e.key)) continue
    seen.add(e.key)
    out.push(e)
    const item = { date: r.date, note: [r.outcome, r.notes].map(v => (v || '').trim()).filter(Boolean).join(' — ') }
    if (r.date <= today && r.date > (lastHeard.get(r.caseId) || '')) lastHeard.set(r.caseId, r.date)
    const past = history.get(r.caseId)
    if (past) past.push(item)
    else history.set(r.caseId, [item])
  }
  for (const e of out) e.caseHistory = (history.get(e.caseId) || []).sort((x, y) => y.date.localeCompare(x.date))

  for (const c of cases) {
    if (!c.nextHearing || isClosed(c.status)) continue
    const key = `${c.id}|${c.nextHearing}`
    if (seen.has(key)) continue
    seen.add(key)
    out.push(make(c, c.nextHearing))
  }

  for (const a of applications) {
    if (!a || a.caseId == null || !a.applicationType) continue
    const c = byId.get(a.caseId)
    const disposed = isDisposed(a.status)
    const notes = new Map<string, string>()
    for (const h of a.hearings || []) if (h?.date) notes.set(h.date, (h.note || '').trim())
    if (a.hearingDate && !notes.has(a.hearingDate)) notes.set(a.hearingDate, '')

    const applied = [...notes.entries()].map(([date, note]) => ({ date, note })).sort((x, y) => y.date.localeCompare(x.date))
    const docs = docLines(a)

    notes.forEach((note, date) => {
      const key = `misc|${a.id}|${date}`
      if (seen.has(key)) return
      seen.add(key)
      out.push({
        key,
        kind: 'misc',
        date,
        caseId: a.caseId,
        caseTitle: c?.title || a.caseTitle || 'Untitled case',
        caseNo: c?.caseNo || a.caseNo || '',
        court: courtOf(c?.court || a.court),
        district: c?.district || a.district || '',
        courtNo: c?.courtNo || '',
        judgeName: c?.judgeName || '',
        notes: note,
        outcome: '',
        clientName: c?.clientName || a.clientName || '',
        opposingParty: c?.opposingParty || '',
        caseNature: c?.caseNature || '',
        caseType: c?.caseType || '',
        cnrNo: c?.cnrNo || '',
        fileNo: c?.fileNo || '',
        building: c?.building || '',
        floor: c?.floor || '',

        upcoming: !disposed && a.hearingDate === date,
        applicationType: a.applicationType.trim(),
        applicationStatus: (a.status || 'Pending').trim(),
        applicationOutcome: disposed ? (a.disposalOutcome || '').trim() : '',
        filingDate: a.filingDate || '',
        disposedOn: disposed ? a.disposedOn || '' : '',
        applicationNext: disposed ? '' : a.hearingDate || '',
        applicationHearings: applied,
        applicationDocs: docs,
        ...caseSide(c),
        caseStatus: c?.status || a.caseStatus || '',
        clientLabel: c?.clientName || a.clientName || '',
        caseNext: '',
        caseHistory: [],
        ...caseExtra(c),
      })
    })
  }

  for (const e of out) e.lastHearingDate = lastHeard.get(e.caseId) || ''

  return out.sort((a, b) =>
    a.date.localeCompare(b.date) || a.court.localeCompare(b.court) || (a.kind === b.kind ? 0 : a.kind === 'hearing' ? -1 : 1)
    || a.caseTitle.localeCompare(b.caseTitle) || a.applicationType.localeCompare(b.applicationType))
}

export function groupByDate(entries: HearingEntry[]): Map<string, HearingEntry[]> {
  const m = new Map<string, HearingEntry[]>()
  for (const e of entries) {
    const list = m.get(e.date)
    if (list) list.push(e)
    else m.set(e.date, [e])
  }
  return m
}

export function courtsOf(entries: HearingEntry[]): string[] {
  const n = new Map<string, number>()
  for (const e of entries) n.set(e.court, (n.get(e.court) || 0) + 1)
  return [...n.entries()].sort((a, b) => b[1] - a[1] || a[0].localeCompare(b[0])).map(([c]) => c)
}

export function countLabel(list: Pick<HearingEntry, 'kind'>[]): string {
  const apps = list.filter(e => e.kind === 'misc').length
  const hearings = list.length - apps
  const parts: string[] = []
  if (hearings > 0 || apps === 0) parts.push(`${hearings} hearing${hearings === 1 ? '' : 's'}`)
  if (apps > 0) parts.push(`${apps} application${apps === 1 ? '' : 's'}`)
  return parts.join(' · ')
}

export const firstParty = (title: string): string => title.split(/\s+(?:vs\.?|v\/s|v\.)\s+/i)[0] || title
