import { addDays, todayKey } from './dates'
import { CaseItem, CourtRow, HearingLeave, JudgeLeave, HearingRow, Holiday, MiscApplication, User } from './types'

export const user: User = { id: 1, name: 'Adv. Ratnan Karshakya', email: 'demo@internyay.in', role: 'ADVOCATE' }

const SAKET = 'Saket District Court'
const ROHINI = 'Rohini District Court'
const THC = 'Tis Hazari District Court'
const PHC = 'Patiala House District Court'
const KKD = 'Karkardooma District Court'
const HC = 'Delhi High Court'

const SEED: [string, string, string, string, string, string, string, string, string, number][] = [
  ['Sharma vs. State', 'CRL.A. 112/2026', SAKET, '14', 'Hon. Anjali Verma', 'Criminal', 'Bail', 'Rakesh Sharma', 'State of NCT of Delhi', 0],
  ['Mehra Traders vs. Kapoor', 'CS 481/2025', SAKET, '9', 'Hon. P. K. Rao', 'Civil', 'Recovery Suit', 'Mehra Traders', 'S. Kapoor', 0],
  ['Gupta vs. Gupta', 'HMA 77/2026', ROHINI, '204', 'Hon. Neha Bansal', 'Family', 'Divorce', 'Sunita Gupta', 'Ravi Gupta', 0],
  ['Union Bank vs. Arora', 'OA 36/2026', HC, '31', 'Hon. Justice R. Menon', 'Civil', 'Writ', 'Union Bank', 'D. Arora', 1],
  ['Singh vs. DDA', 'W.P.(C) 902/2026', HC, '31', 'Hon. Justice R. Menon', 'Civil', 'Writ', 'Harpreet Singh', 'DDA', 2],
  ['State vs. Joshi', 'SC 220/2026', THC, '3', 'Hon. M. Kaur', 'Criminal', 'Sessions', 'Amit Joshi', 'State', 2],
  ['Khan vs. Khan', 'MACT 54/2026', KKD, '12', 'Hon. S. Iyer', 'Civil', 'Motor Accident', 'Zoya Khan', 'Reliance General', 3],
  ['Bose vs. Bose', 'CC 310/2026', PHC, '5', 'Hon. T. Sethi', 'Criminal', 'Cheque Bounce', 'Anil Bose', 'Pradeep Bose', 3],
  ['Verma vs. Municipal Corp.', 'CS 612/2025', SAKET, '14', 'Hon. Anjali Verma', 'Civil', 'Injunction', 'Pooja Verma', 'MCD', 4],
  ['Kapoor vs. State', 'BAIL 1442/2026', ROHINI, '118', 'Hon. D. Malik', 'Criminal', 'Anticipatory Bail', 'Vikram Kapoor', 'State', 5],
  ['Rao Infra vs. NHAI', 'ARB 18/2026', HC, '8', 'Hon. Justice S. Dutt', 'Civil', 'Arbitration', 'Rao Infra', 'NHAI', 6],
  ['Nair vs. Nair', 'GW 91/2026', THC, '7', 'Hon. M. Kaur', 'Family', 'Guardianship', 'Latha Nair', 'Mohan Nair', 7],
  ['Ahmed vs. State', 'CRL.M.C. 774/2026', HC, '22', 'Hon. Justice A. Bhat', 'Criminal', 'Quashing', 'Salim Ahmed', 'State', 8],
  ['Choudhury vs. Choudhury', 'HMA 140/2026', SAKET, '9', 'Hon. P. K. Rao', 'Family', 'Maintenance', 'Meera Choudhury', 'Arun Choudhury', 9],
  ['Dutta vs. Insurance Co.', 'MACT 88/2026', KKD, '12', 'Hon. S. Iyer', 'Civil', 'Motor Accident', 'Kabir Dutta', 'New India Assurance', 10],
  ['Malhotra vs. State', 'SC 305/2026', PHC, '5', 'Hon. T. Sethi', 'Criminal', 'Sessions', 'Rohan Malhotra', 'State', 12],
  ['Reddy vs. Reddy', 'CS 199/2026', ROHINI, '204', 'Hon. Neha Bansal', 'Civil', 'Partition', 'Srinivas Reddy', 'Venkat Reddy', 14],
  ['Fernandes vs. State', 'CRL.A. 51/2026', SAKET, '14', 'Hon. Anjali Verma', 'Criminal', 'Appeal', 'Joseph Fernandes', 'State', 15],
]

export function cases(): CaseItem[] {
  const t = todayKey()
  return SEED.map((r, i) => ({
    id: i + 1, title: r[0], caseNo: r[1], fileNo: `F-${100 + i}`, cnrNo: `DLST01${String(100000 + i * 137).slice(0, 6)}2026`,
    court: r[2], district: r[2].replace(' District Court', ''), courtNo: r[3], judgeName: r[4], caseNature: r[5], caseType: r[6],
    clientName: r[7], opposingParty: r[8], status: 'Pending', nextHearing: addDays(t, r[9]),
    reliefSought: r[6], filingDate: addDays(t, -60 - i), clientId: i + 1, clientSubTypes: { [String(i + 1)]: r[5] === 'Criminal' ? 'Accused' : 'Plaintiff/Petitioner' },
    ...(i % 2 === 0 ? { building: 'Block A', floor: i % 4 === 0 ? 'Ground floor' : '2nd floor' } : {}),
  }))
}

export function hearings(): HearingRow[] {
  const t = todayKey()
  const rows: HearingRow[] = []
  const outcomes = ['Adjourned for arguments', 'Reply filed, next date given', 'Evidence of PW-1 recorded', 'Matter not reached']
  SEED.forEach((r, i) => {
    if (i % 2 === 0) {
      rows.push({ id: 1000 + i, caseId: i + 1, date: addDays(t, -(3 + (i % 9))), outcome: outcomes[i % 4], notes: i % 3 === 0 ? 'Bring original documents' : '', judgeName: r[4] })
    }
  })
  return rows
}

export function miscApplications(): MiscApplication[] {
  const t = todayKey()
  const base = (caseId: number) => {
    const c = cases()[caseId - 1]
    return { caseId, caseTitle: c.title, caseNo: c.caseNo, court: c.court, district: c.district, caseStatus: 'Pending', clientName: c.clientName }
  }
  return [
    {
      id: 1, ...base(1), applicationType: 'Bail Application', filingDate: addDays(t, -20), hearingDate: t, status: 'Pending',
      hearings: [{ id: 11, date: t }, { id: 12, date: addDays(t, -7), note: 'Reply sought from the State' }, { id: 13, date: addDays(t, -14), note: 'Notice issued' }],
      applicationDocument: { id: 'd1', name: 'Bail Application', fileName: 'bail-application.pdf', size: '412.0 KB', date: addDays(t, -20) },
      additionalDocuments: [{ id: 'd2', name: 'Medical certificate', fileName: 'medical.pdf', size: '1.2 MB', date: addDays(t, -15) }],
    },
    {
      id: 2, ...base(10), applicationType: 'Application for Exemption', filingDate: addDays(t, -9), hearingDate: addDays(t, 5), status: 'Pending',
      hearings: [{ id: 21, date: addDays(t, 5) }, { id: 22, date: addDays(t, -2), note: 'Personal appearance exempted for the day' }],
    },
    {
      id: 3, ...base(4), applicationType: 'Application for Condonation of Delay', filingDate: addDays(t, -30), hearingDate: null, status: 'Disposed Off',
      disposedOn: addDays(t, -3), disposalOutcome: 'Allowed',
      hearings: [{ id: 31, date: addDays(t, -3), note: 'Allowed, delay condoned' }, { id: 32, date: addDays(t, -10) }],
      applicationDocument: { id: 'd3', name: 'Condonation Application', fileName: 'condonation.pdf', size: '230.5 KB', date: addDays(t, -30) },
      orderDocument: { id: 'd4', name: 'Order dated hearing', fileName: 'order.pdf', size: '98.0 KB', date: addDays(t, -3) },
    },
    {
      id: 4, ...base(5), applicationType: 'Interim Injunction Application', filingDate: addDays(t, -4), hearingDate: addDays(t, 2), status: 'Pending',
      hearings: [{ id: 41, date: addDays(t, 2) }],
    },
  ]
}

export function courts(): CourtRow[] {
  return [SAKET, ROHINI, THC, PHC, KKD, HC].map((court, id) => ({ id, court }))
}

export function holidays(): Holiday[] {
  const t = todayKey()
  return [
    { id: 1, date: addDays(t, 11), label: 'Diwali Break', description: 'Courts closed', courtType: 'BOTH' },
    { id: 2, date: addDays(t, 13), label: 'Bhai Dooj', courtType: 'DISTRICT' },
    { id: 3, date: addDays(t, -6), label: 'Dussehra', courtType: 'HIGH' },
  ]
}

export const noHearing = (): string[] => [addDays(todayKey(), 16)]

export function judgeLeaves(): JudgeLeave[] {
  const t = todayKey()
  return [
    { name: 'Hon. Anjali Verma', court: SAKET, district: 'Saket', leaveFrom: addDays(t, 4), leaveTo: addDays(t, 5), reason: 'Casual leave' },
    { name: 'Hon. M. Kaur', court: THC, district: 'Tis Hazari', leaveFrom: addDays(t, 2), leaveTo: addDays(t, 2), reason: 'Official duty' },
    { name: 'Hon. Justice R. Menon', court: HC, district: 'New Delhi', leaveFrom: addDays(t, 1), leaveTo: addDays(t, 3), reason: 'Medical leave' },
    { name: 'Hon. Rekha Sood', court: ROHINI, district: 'Rohini', leaveFrom: addDays(t, 2), leaveTo: addDays(t, 6), reason: 'Training' },
  ]
}

export function leave(date: string): HearingLeave[] {
  return cases()
    .filter(c => c.nextHearing === date)
    .map((c): HearingLeave => c.id === 6
      ? { caseId: c.id, judgeName: c.judgeName, onLeave: true, leaveFrom: date, leaveTo: date, reason: 'Official duty', causeListNo: 12 }
      : { caseId: c.id, judgeName: c.judgeName, onLeave: false, causeListNo: 10 + c.id })
}
