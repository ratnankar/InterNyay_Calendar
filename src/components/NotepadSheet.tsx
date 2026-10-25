import React, { useEffect, useMemo, useRef, useState } from 'react'
import { Keyboard, KeyboardAvoidingView, Platform, ScrollView, StyleSheet, TextInput as RNTextInput, View } from 'react-native'
import { useSafeAreaInsets } from 'react-native-safe-area-context'
import { Text } from '../ui'
import { shareText } from '../share'
import { dateKey, shortDate } from '../dates'
import { BODY_MAX, TITLE_MAX, useNotes } from '../NotesContext'
import { Note } from '../types'
import { font, makeStyles, radius, theme } from '../theme'
import ConfirmModal from './ConfirmModal'
import Reveal from './Reveal'
import { useOnChange } from '../hooks'
import { animateLayout, stagger } from '../motion'
import Field from './Field'
import Icon from './Icon'
import IconButton from './IconButton'
import InkPad from './InkPad'
import Sheet from './Sheet'
import SheetHeader from './SheetHeader'
import SheetScroll from './SheetScroll'
import Tappable from './Tappable'

export interface NoteCase { caseId: number; caseTitle: string }

interface Props {
  visible: boolean
  scope: NoteCase | null
  startNew: boolean
  onClose: () => void
}

const isEmpty = (n: Note) => !n.title.trim() && !n.body.trim() && !n.ink
const headline = (n: Note) => n.title.trim() || n.body.trim().split('\n')[0] || (n.ink ? 'Handwritten note' : 'Untitled note')
const preview = (n: Note) => {
  const body = n.body.trim()
  return n.title.trim() ? body : body.split('\n').slice(1).join('\n').trim()
}
const haystack = (n: Note) => `${n.title} ${n.body} ${n.caseTitle || ''}`.toLowerCase()
const when = (ts: number) => {
  const d = new Date(ts)
  const day = shortDate(dateKey(d))
  return d.getFullYear() === new Date().getFullYear() ? day : `${day} ${d.getFullYear()}`
}

export default function NotepadSheet({ visible, scope, startNew, onClose }: Props) {
  const s = useS()
  const insets = useSafeAreaInsets()
  const { notes, loaded, loadFailed, status, syncState, add, update, remove, reload, retrySave } = useNotes()
  const bodyRef = useRef<React.ComponentRef<typeof RNTextInput>>(null)
  const [editing, setEditing] = useState<string | null>(null)
  const [showAll, setShowAll] = useState(false)
  const [confirm, setConfirm] = useState<string | null>(null)
  const [q, setQ] = useState('')
  const [copied, setCopied] = useState(false)
  const [mode, setMode] = useState<'type' | 'write'>('type')
  const started = useRef(false)

  const note = editing ? notes.find(n => n.id === editing) : undefined
  const writing = mode === 'write'
  const hasText = !!note && !!(note.title.trim() || note.body.trim())

  const finish = () => {
    if (note && isEmpty(note)) remove(note.id)
    setEditing(null)
  }
  const close = () => { finish(); onClose() }
  const back = () => { if (note) finish(); else close() }

  useOnChange(visible ? `open:${scope?.caseId ?? ''}` : 'closed', key => {
    if (key === 'closed') return
    setEditing(null)
    setShowAll(false)
    setQ('')
  })
  useEffect(() => { if (visible) started.current = false }, [visible, scope?.caseId])
  useEffect(() => {
    if (!visible || !startNew || started.current || !loaded || loadFailed) return
    started.current = true
    const id = add(scope ? { caseId: scope.caseId, caseTitle: scope.caseTitle } : undefined)
    if (id) queueMicrotask(() => setEditing(id))
  }, [visible, startNew, loaded, loadFailed, scope, add])
  useEffect(() => {
    if (!copied) return
    const timer = setTimeout(() => setCopied(false), 2000)
    return () => clearTimeout(timer)
  }, [copied])

  const filtered = !!scope && !showAll
  const list = useMemo(() => {
    const terms = q.toLowerCase().split(/\s+/).filter(Boolean)
    return notes
      .filter(n => (!filtered || n.caseId === scope?.caseId) && terms.every(t => haystack(n).includes(t)))
      .sort((a, b) => Number(!!b.pinned) - Number(!!a.pinned) || b.updatedAt - a.updatedAt)
  }, [notes, q, filtered, scope?.caseId])

  const open = (n: Note) => {
    setMode(n.ink && !n.body.trim() ? 'write' : 'type')
    setEditing(n.id)
  }

  const create = () => {
    const id = add(scope && filtered ? { caseId: scope.caseId, caseTitle: scope.caseTitle } : undefined)
    if (id) setEditing(id)
  }

  const share = async () => {
    if (!note) return
    const text = [note.title.trim(), note.caseTitle ? `Case: ${note.caseTitle}` : '', note.body.trim()].filter(Boolean).join('\n\n')
    if (!text) return
    try {
      if (await shareText(text) === 'copied') setCopied(true)
    } catch { }
  }

  const subtitle = filtered ? scope?.caseTitle : `${notes.length} note${notes.length === 1 ? '' : 's'}`

  return (
    <Sheet visible={visible} onClose={back}>
      <SheetHeader title={note ? 'Edit note' : 'Notepad'} subtitle={note ? `Edited ${when(note.updatedAt)}` : subtitle} onClose={close} />

      {note ? (
        <KeyboardAvoidingView style={s.fill} behavior={Platform.OS === 'ios' ? 'padding' : undefined}>
          <ScrollView style={s.fill} contentContainerStyle={[s.editor, { paddingBottom: 24 + insets.bottom }]} keyboardShouldPersistTaps="handled">
            <View style={s.tools}>
              {copied ? <Text style={s.copied}>Copied to clipboard</Text> : null}
              <View style={s.fill} />
              <IconButton icon="pin" label={note.pinned ? 'Unpin note' : 'Pin note to the top'} tone={note.pinned ? 'danger' : 'soft'} size={40} onPress={() => update(note.id, { pinned: !note.pinned })} />
              {hasText ? <IconButton icon="share" label={Platform.OS === 'web' ? 'Copy note' : 'Share note'} size={40} onPress={share} /> : null}
            </View>
            {note.caseTitle ? (
              <View style={s.caseTag}>
                <Icon name="case" size={16} color={theme.brand} />
                <Text style={s.caseTagText} numberOfLines={2}>{note.caseTitle}</Text>
                <IconButton icon="close" label="Unlink from this case" tone="plain" size={36} onPress={() => update(note.id, { caseId: null, caseTitle: null })} />
              </View>
            ) : scope ? (
              <Tappable onPress={() => update(note.id, { caseId: scope.caseId, caseTitle: scope.caseTitle })} pressedScale={0.98} accessibilityRole="button" accessibilityLabel="Link note to this case" containerStyle={s.linkCaseSlot} style={s.linkCase}>
                <Icon name="case" size={16} color={theme.brand} />
                <Text style={s.linkCaseText} numberOfLines={1}>Link to {scope.caseTitle}</Text>
              </Tappable>
            ) : null}
            <Field
              value={note.title}
              onChangeText={t => update(note.id, { title: t })}
              placeholder="Title"
              maxLength={TITLE_MAX}
              autoCorrect={false}
              returnKeyType="next"
              onSubmitEditing={() => bodyRef.current?.focus()}
              accessibilityLabel="Note title"
            />
            <View style={s.modes}>
              {(['type', 'write'] as const).map(m => (
                <Tappable key={m} onPress={() => { if (m === 'write') Keyboard.dismiss(); setMode(m) }} containerStyle={s.slot} pressedScale={0.98} accessibilityRole="button" accessibilityState={{ selected: (m === 'write') === writing }} accessibilityLabel={m === 'write' ? 'Write by hand' : 'Type'} style={[s.mode, (m === 'write') === writing && s.modeOn]}>
                  <Icon name={m === 'write' ? 'draw' : 'keyboard'} size={20} color={(m === 'write') === writing ? theme.brand : theme.muted} />
                  <Text style={[s.modeText, (m === 'write') === writing && s.modeTextOn]}>{m === 'write' ? 'Write' : 'Type'}</Text>
                </Tappable>
              ))}
            </View>
            {writing ? (
              <InkPad value={note.ink} onChange={ink => update(note.id, { ink })} />
            ) : (
              <>
                <Field
                  ref={bodyRef}
                  value={note.body}
                  onChangeText={t => update(note.id, { body: t })}
                  placeholder="Write your note here"
                  multiline
                  maxLength={BODY_MAX}
                  autoFocus={!note.title && !note.body}
                  accessibilityLabel="Note text"
                />
                {note.body.length > BODY_MAX * 0.9 ? <Text style={s.count}>{note.body.length} / {BODY_MAX} characters</Text> : null}
              </>
            )}
            {status === 'error' ? (
              <Tappable onPress={retrySave} pressedScale={0.98} accessibilityRole="button" accessibilityLabel="Try saving again" containerStyle={s.savedSlot} style={s.failed}>
                <Text style={s.failedText}>Could not save on this phone. Tap to try again.</Text>
              </Tappable>
            ) : (
              <Text style={s.saved}>{status === 'saving' ? 'Saving…' : syncState === 'syncing' ? 'Saved · syncing…' : syncState === 'failed' ? 'Saved on this phone · will sync when you are online' : syncState === 'ok' ? 'Saved · synced to your account' : 'Saved'}</Text>
            )}
            <View style={s.actions}>
              <Tappable onPress={() => setConfirm(note.id)} containerStyle={s.slot} style={[s.btn, s.deleteBtn]} accessibilityRole="button" accessibilityLabel="Delete note">
                <Icon name="trash" size={20} color={theme.danger} />
                <Text style={s.deleteText}>Delete</Text>
              </Tappable>
              <Tappable onPress={finish} containerStyle={s.slot} style={[s.btn, s.doneBtn]} accessibilityRole="button">
                <Text style={s.doneText}>Done</Text>
              </Tappable>
            </View>
          </ScrollView>
        </KeyboardAvoidingView>
      ) : (
        <SheetScroll keyboardShouldPersistTaps="handled">
          {loadFailed ? (
            <View style={s.failBox}>
              <Text style={s.failTitle}>Your notes could not be opened</Text>
              <Text style={s.failText}>They are still on this phone. Nothing has been changed, and new notes are paused so they are not overwritten.</Text>
              <Tappable onPress={reload} pressedScale={0.97} accessibilityRole="button" containerStyle={s.linkSlot} style={s.link}>
                <Text style={s.linkText}>Try again</Text>
              </Tappable>
            </View>
          ) : null}

          <Tappable onPress={create} disabled={!loaded || loadFailed} pressedScale={0.98} accessibilityRole="button" containerStyle={s.newSlot} style={[s.newBtn, (!loaded || loadFailed) && s.newOff]}>
            <Icon name="add" size={22} color={theme.navy} />
            <Text style={s.newText}>{filtered ? 'New note for this case' : 'New note'}</Text>
          </Tappable>

          {notes.length > 3 || q ? (
            <View style={s.searchWrap}>
              <Field value={q} onChangeText={setQ} placeholder="Search notes" autoCorrect={false} returnKeyType="search" accessibilityLabel="Search notes" />
            </View>
          ) : null}

          {list.length === 0 && !loadFailed ? (
            <Text style={s.empty}>
              {!loaded ? 'Loading notes…' : q.trim() ? 'No notes match your search.' : filtered ? 'No notes for this case yet.' : 'No notes yet. Your notes are private to your account.'}
            </Text>
          ) : null}

          {list.map((n, i) => (
            <Reveal key={n.id} delay={stagger(i)}>
              <Tappable onPress={() => open(n)} pressedScale={0.99} accessibilityRole="button" containerStyle={s.cardSlot} style={s.card}>
                <View style={s.cardTop}>
                  {n.pinned ? <Icon name="pin" size={16} color={theme.danger} /> : null}
                  <Text style={s.cardTitle} numberOfLines={1}>{headline(n)}</Text>
                  <Text style={s.cardDate}>{when(n.updatedAt)}</Text>
                </View>
                {preview(n) ? <Text style={s.cardBody} numberOfLines={2}>{preview(n)}</Text> : null}
                {n.ink ? (
                  <View style={s.cardCase}>
                    <Icon name="draw" size={14} color={theme.muted} />
                    <Text style={s.cardInkText} numberOfLines={1}>Handwriting</Text>
                  </View>
                ) : null}
                {n.caseTitle && !filtered ? (
                  <View style={s.cardCase}>
                    <Icon name="case" size={14} color={theme.brand} />
                    <Text style={s.cardCaseText} numberOfLines={1}>{n.caseTitle}</Text>
                  </View>
                ) : null}
              </Tappable>
            </Reveal>
          ))}

          {scope ? (
            <Tappable onPress={() => { animateLayout(); setShowAll(a => !a) }} pressedScale={0.97} accessibilityRole="button" containerStyle={s.linkSlot} style={s.link}>
              <Text style={s.linkText}>{filtered ? 'Show all notes' : 'Show only this case'}</Text>
            </Tappable>
          ) : null}
        </SheetScroll>
      )}

      <ConfirmModal
        visible={confirm !== null} danger icon="trash" title="Delete this note?" confirmLabel="Delete"
        message="The note is deleted from all your devices. This cannot be undone."
        onCancel={() => setConfirm(null)}
        onConfirm={() => { if (confirm) remove(confirm); setConfirm(null); setEditing(null) }}
      />
    </Sheet>
  )
}

const useS = makeStyles(() => StyleSheet.create({
  fill: { flex: 1 },
  editor: { padding: 16, gap: 12, width: '100%', maxWidth: 720, alignSelf: 'center' },
  tools: { flexDirection: 'row', alignItems: 'center', gap: 8 },
  copied: { ...font.caption, fontWeight: '600', color: theme.muted },
  caseTag: { flexDirection: 'row', alignItems: 'center', gap: 8, backgroundColor: theme.blueSoft, borderRadius: radius.sm, paddingVertical: 4, paddingLeft: 12, paddingRight: 4 },
  caseTagText: { flex: 1, ...font.label, fontWeight: '500', color: theme.brand },
  modes: { flexDirection: 'row', gap: 8 },
  mode: { flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 8, height: 44, borderRadius: radius.sm + 2, borderWidth: 1.5, borderColor: theme.line, backgroundColor: theme.card },
  modeOn: { borderColor: theme.brand, backgroundColor: theme.brandSoft },
  modeText: { ...font.label, fontWeight: '500', color: theme.muted },
  modeTextOn: { color: theme.brand, fontWeight: '700' },
  saved: { ...font.caption, color: theme.faint, textAlign: 'center' },
  count: { ...font.caption, fontVariant: font.digits, color: theme.muted, textAlign: 'right' },
  savedSlot: { alignSelf: 'center' },
  failed: { paddingVertical: 6, paddingHorizontal: 12, borderRadius: radius.sm, backgroundColor: theme.dangerSoft },
  failedText: { ...font.caption, fontWeight: '600', color: theme.danger, textAlign: 'center' },
  failBox: { backgroundColor: theme.dangerSoft, borderWidth: 1, borderColor: theme.dangerLine, borderRadius: radius.md, paddingHorizontal: 16, paddingVertical: 14, gap: 4, marginBottom: 14 },
  failTitle: { ...font.label, fontWeight: '500', color: theme.danger },
  failText: { ...font.small, color: theme.ink },
  linkCaseSlot: { alignSelf: 'flex-start' },
  linkCase: { flexDirection: 'row', alignItems: 'center', gap: 8, minHeight: 44, paddingVertical: 8, paddingHorizontal: 12, borderRadius: radius.sm, borderWidth: 1.5, borderColor: theme.line, backgroundColor: theme.card },
  linkCaseText: { ...font.label, fontWeight: '500', color: theme.brand, flexShrink: 1 },
  actions: { flexDirection: 'row', gap: 10 },
  slot: { flex: 1 },
  btn: { height: 48, borderRadius: radius.sm + 2, alignItems: 'center', justifyContent: 'center', flexDirection: 'row', gap: 8 },
  deleteBtn: { borderWidth: 1.5, borderColor: theme.dangerLine, backgroundColor: theme.dangerSoft },
  deleteText: { color: theme.danger, fontWeight: '700', ...font.label },
  doneBtn: { backgroundColor: theme.goldBtn },
  doneText: { color: theme.navy, fontWeight: '700', ...font.label },
  newSlot: { marginBottom: 14 },
  newBtn: { flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 8, height: 48, borderRadius: radius.sm + 2, backgroundColor: theme.goldBtn },
  newOff: { opacity: 0.5 },
  newText: { color: theme.navy, fontWeight: '700', ...font.label },
  searchWrap: { marginBottom: 14 },
  empty: { textAlign: 'center', color: theme.muted, ...font.body, marginTop: 32, paddingHorizontal: 24 },
  cardSlot: { marginBottom: 10 },
  card: { backgroundColor: theme.card, borderRadius: radius.md, borderWidth: 1, borderColor: theme.line, paddingHorizontal: 16, paddingVertical: 14, gap: 2 },
  cardTop: { flexDirection: 'row', alignItems: 'center', gap: 8, minHeight: 22 },
  cardTitle: { flex: 1, ...font.label, fontWeight: '500', color: theme.ink },
  cardDate: { ...font.caption, color: theme.muted },
  cardBody: { ...font.small, color: theme.muted },
  cardCase: { flexDirection: 'row', alignItems: 'center', gap: 6, marginTop: 4 },
  cardInkText: { flex: 1, ...font.small, fontWeight: '500', color: theme.muted },
  cardCaseText: { flex: 1, ...font.small, fontWeight: '500', color: theme.brand },
  linkSlot: { alignSelf: 'center', marginTop: 8 },
  link: { minHeight: 44, justifyContent: 'center', paddingVertical: 8, paddingHorizontal: 12 },
  linkText: { ...font.label, fontWeight: '500', color: theme.brand },
}))
