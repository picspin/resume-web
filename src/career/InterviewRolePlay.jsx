import { useEffect, useMemo, useState } from 'react'
import { Bot, Clipboard, Copy, Flag, Lightbulb, ListChecks, Mic, RotateCcw, Send, User, Volume2 } from 'lucide-react'
import {
  EMPTY_INTERVIEW_INPUT,
  INTERVIEW_TYPE_OPTIONS,
  PRESSURE_OPTIONS,
  buildInterviewDebrief,
  buildInterviewBrief,
  buildRolePlayReply,
  clearInterviewRolePlay,
  readInterviewRolePlay,
  normalizeInterviewSettings,
  writeInterviewRolePlay,
} from './interviewRolePlayState'

function copyToClipboard(text) {
  if (!navigator?.clipboard?.writeText) return Promise.resolve(false)
  return navigator.clipboard.writeText(text).then(() => true).catch(() => false)
}

function InterviewerProfile({ brief }) {
  return (
    <aside className="border-b border-gray-200 bg-gray-50 p-4 lg:border-b-0 lg:border-r">
      <div className="flex items-start gap-3">
        <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-md bg-teal-100 text-teal-800">
          <User className="h-4 w-4" />
        </div>
        <div className="min-w-0">
          <p className="text-xs font-semibold uppercase tracking-wide text-teal-700">Interviewer lens</p>
          <h3 className="mt-1 text-base font-semibold text-gray-900">{brief.interviewer.name}</h3>
          <p className="mt-2 text-sm leading-relaxed text-gray-600">{brief.interviewer.profileSummary}</p>
        </div>
      </div>
      <div className="mt-4">
        <p className="text-xs font-semibold uppercase tracking-wide text-gray-500">Likely focus</p>
        <ul className="mt-2 space-y-2 text-sm text-gray-700">
          {brief.interviewer.focus.map((item) => (
            <li key={item} className="flex gap-2">
              <span className="mt-1.5 h-1.5 w-1.5 shrink-0 rounded-full bg-teal-700" />
              {item}
            </li>
          ))}
        </ul>
      </div>
    </aside>
  )
}

function PreparationForm({ form, onChange, onGenerate }) {
  return (
    <div className="p-4 sm:p-5">
      <div className="grid grid-cols-1 gap-4 lg:grid-cols-2">
        <label className="block text-sm font-medium text-gray-700">
          Job description
          <textarea
            value={form.jdText}
            onChange={(event) => onChange('jdText', event.target.value)}
            rows={8}
            className="mt-1 w-full resize-y rounded-md border border-gray-300 px-3 py-2 text-sm leading-relaxed focus:border-teal-600 focus:outline-none focus:ring-1 focus:ring-teal-600"
            placeholder="Paste the JD or the role priorities you want to rehearse."
          />
        </label>
        <label className="block text-sm font-medium text-gray-700">
          Interviewer LinkedIn notes
          <textarea
            value={form.interviewerLinkedIn}
            onChange={(event) => onChange('interviewerLinkedIn', event.target.value)}
            rows={8}
            className="mt-1 w-full resize-y rounded-md border border-gray-300 px-3 py-2 text-sm leading-relaxed focus:border-teal-600 focus:outline-none focus:ring-1 focus:ring-teal-600"
            placeholder="Paste name, role, headline, public posts, team context, or your own notes."
          />
        </label>
      </div>
      <div className="mt-4 grid grid-cols-1 gap-3 border-t border-gray-100 pt-4 sm:grid-cols-2 lg:grid-cols-4">
        <label className="block text-sm font-medium text-gray-700">
          Interview format
          <select
            value={form.interviewType}
            onChange={(event) => onChange('interviewType', event.target.value)}
            className="mt-1 w-full rounded-md border border-gray-300 bg-white px-3 py-2 text-sm focus:border-teal-600 focus:outline-none focus:ring-1 focus:ring-teal-600"
          >
            {INTERVIEW_TYPE_OPTIONS.map((option) => <option key={option.value} value={option.value}>{option.label}</option>)}
          </select>
        </label>
        <label className="block text-sm font-medium text-gray-700">
          Pressure
          <select
            value={form.pressure}
            onChange={(event) => onChange('pressure', event.target.value)}
            className="mt-1 w-full rounded-md border border-gray-300 bg-white px-3 py-2 text-sm focus:border-teal-600 focus:outline-none focus:ring-1 focus:ring-teal-600"
          >
            {PRESSURE_OPTIONS.map((option) => <option key={option.value} value={option.value}>{option.label}</option>)}
          </select>
        </label>
        <label className="block text-sm font-medium text-gray-700">
          Questions
          <select
            value={form.questionCount}
            onChange={(event) => onChange('questionCount', event.target.value)}
            className="mt-1 w-full rounded-md border border-gray-300 bg-white px-3 py-2 text-sm focus:border-teal-600 focus:outline-none focus:ring-1 focus:ring-teal-600"
          >
            <option value="3">3 questions</option>
            <option value="5">5 questions</option>
            <option value="7">7 questions</option>
          </select>
        </label>
        <label className="flex items-center gap-2 self-end rounded-md border border-gray-200 bg-gray-50 px-3 py-2 text-sm font-medium text-gray-700">
          <input
            type="checkbox"
            checked={form.includeCurveballs}
            onChange={(event) => onChange('includeCurveballs', event.target.checked)}
            className="h-4 w-4 rounded border-gray-300 text-teal-700 focus:ring-teal-600"
          />
          Include curveballs
        </label>
      </div>
      <div className="mt-4 flex flex-col gap-3 border-t border-gray-100 pt-4 sm:flex-row sm:items-center sm:justify-between">
        <p className="max-w-2xl text-xs leading-relaxed text-gray-500">
          Local-first: these notes remain in this browser. A local role-play baseline is generated immediately; the brief can be copied into your preferred LLM when you want richer improvisation.
        </p>
        <button
          type="button"
          onClick={onGenerate}
          className="inline-flex shrink-0 items-center justify-center gap-2 rounded-md bg-teal-700 px-4 py-2.5 text-sm font-medium text-white hover:bg-teal-800 focus:outline-none focus:ring-2 focus:ring-teal-600 focus:ring-offset-2"
        >
          <Clipboard className="h-4 w-4" />
          Build interview plan
        </button>
      </div>
    </div>
  )
}

function ScoreRow({ label, value }) {
  return (
    <div>
      <div className="flex items-center justify-between text-xs text-gray-600"><span>{label}</span><span>{value.toFixed(1)} / 5</span></div>
      <div className="mt-1 h-1.5 overflow-hidden rounded-full bg-gray-200"><div className="h-full rounded-full bg-teal-700" style={{ width: `${(value / 5) * 100}%` }} /></div>
    </div>
  )
}

function RolePlayDebrief({ debrief, onContinue }) {
  return (
    <section className="border-t border-gray-200 bg-teal-50/60 p-4 sm:p-5" aria-live="polite">
      <div className="flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between">
        <div>
          <p className="flex items-center gap-2 text-sm font-medium text-teal-800"><ListChecks className="h-4 w-4" /> Session debrief</p>
          <h3 className="mt-1 text-lg font-semibold text-gray-900">{debrief.answered} answers reviewed · {debrief.overall.toFixed(1)} / 5 overall</h3>
          <p className="mt-2 max-w-2xl text-sm leading-relaxed text-gray-700">{debrief.priority}</p>
        </div>
        <button type="button" onClick={onContinue} className="inline-flex shrink-0 items-center justify-center gap-2 rounded-md border border-teal-700 bg-white px-3 py-2 text-sm font-medium text-teal-800 hover:bg-teal-50">
          Continue practice
        </button>
      </div>
      <div className="mt-4 grid grid-cols-1 gap-3 sm:grid-cols-3">
        <ScoreRow label="Evidence" value={debrief.scores.evidence} />
        <ScoreRow label="Structure" value={debrief.scores.structure} />
        <ScoreRow label="Role relevance" value={debrief.scores.relevance} />
      </div>
    </section>
  )
}

function RolePlaySession({ brief, messages, answer, onAnswerChange, onSubmitAnswer, onReset, onFinish }) {
  const settings = normalizeInterviewSettings(brief.settings)
  const currentQuestion = messages.filter((message) => message.role === 'interviewer').at(-1)?.content || brief.openingQuestion
  const answered = messages.filter((message) => message.role === 'candidate').length
  const complete = answered >= settings.questionCount
  const readQuestion = () => {
    if (typeof window !== 'undefined' && 'speechSynthesis' in window) {
      window.speechSynthesis.cancel()
      window.speechSynthesis.speak(new SpeechSynthesisUtterance(currentQuestion))
    }
  }

  return (
    <div className="grid grid-cols-1 lg:grid-cols-[minmax(0,1fr)_280px]">
      <div className="p-4 sm:p-5">
        <div className="flex flex-col gap-3 border-b border-gray-100 pb-4 sm:flex-row sm:items-start sm:justify-between">
          <div>
            <p className="flex items-center gap-2 text-sm font-medium text-teal-700">
              <Mic className="h-4 w-4" />
              English role-play playground
            </p>
            <h3 className="mt-1 text-lg font-semibold text-gray-900">Practice for {brief.roleLabel}</h3>
            <p className="mt-1 text-xs text-gray-500">{settings.interviewType.replace(/-/g, ' ')} · {settings.pressure} pressure · {answered} / {settings.questionCount} answered</p>
          </div>
          <div className="flex flex-wrap gap-2">
            <button type="button" onClick={readQuestion} className="inline-flex items-center justify-center gap-2 rounded-md border border-gray-300 px-3 py-2 text-sm font-medium text-gray-700 hover:bg-gray-50">
              <Volume2 className="h-4 w-4" /> Read aloud
            </button>
            <button type="button" onClick={onReset} className="inline-flex items-center justify-center gap-2 rounded-md border border-gray-300 px-3 py-2 text-sm font-medium text-gray-700 hover:bg-gray-50">
              <RotateCcw className="h-4 w-4" /> Reset
            </button>
          </div>
        </div>

        <div className="mt-4 max-h-[28rem] space-y-4 overflow-y-auto pr-1" aria-live="polite">
          {messages.map((message, index) => (
            <article key={`${message.role}-${index}`} className={message.role === 'candidate' ? 'ml-auto max-w-[90%]' : 'max-w-[90%]'}>
              <div className={`flex items-center gap-2 text-xs font-semibold ${message.role === 'candidate' ? 'justify-end text-blue-700' : 'text-teal-700'}`}>
                {message.role === 'candidate' ? <User className="h-3.5 w-3.5" /> : <Bot className="h-3.5 w-3.5" />}
                {message.role === 'candidate' ? 'You' : 'Interviewer'}
              </div>
              <p className={`mt-1 rounded-md p-3 text-sm leading-relaxed ${message.role === 'candidate' ? 'bg-blue-50 text-gray-800' : 'bg-gray-50 text-gray-800'}`}>
                {message.content}
              </p>
              {message.coaching && (
                <p className="mt-2 rounded-md border border-amber-200 bg-amber-50 p-3 text-xs leading-relaxed text-amber-950">
                  <span className="font-semibold">Coaching note:</span> {message.coaching}
                </p>
              )}
            </article>
          ))}
        </div>

        <label className="mt-5 block text-sm font-medium text-gray-700">
          Your answer in English
          <textarea
            value={answer}
            onChange={(event) => onAnswerChange(event.target.value)}
            rows={5}
            className="mt-1 w-full resize-y rounded-md border border-gray-300 px-3 py-2 text-sm leading-relaxed focus:border-teal-600 focus:outline-none focus:ring-1 focus:ring-teal-600"
            disabled={complete}
            placeholder={complete ? 'This practice set is complete. Review the debrief or reset to rehearse again.' : 'Answer with context, your action, the stakeholders involved, and an outcome.'}
          />
        </label>
        <div className="mt-3 flex items-center justify-between gap-3">
          <p className="text-xs text-gray-500">The interviewer follows up after each answer. Nothing is submitted externally.</p>
          <button
            type="button"
            onClick={complete ? onFinish : onSubmitAnswer}
            disabled={!complete && !answer.trim()}
            className="inline-flex shrink-0 items-center justify-center gap-2 rounded-md bg-teal-700 px-4 py-2 text-sm font-medium text-white hover:bg-teal-800 disabled:cursor-not-allowed disabled:bg-gray-300"
          >
            {complete ? <Flag className="h-4 w-4" /> : <Send className="h-4 w-4" />}
            {complete ? 'Review session' : 'Send answer'}
          </button>
        </div>
      </div>

      <aside className="border-t border-gray-200 bg-gray-50 p-4 lg:border-l lg:border-t-0">
        <p className="text-xs font-semibold uppercase tracking-wide text-gray-500">Question path</p>
        <ol className="mt-3 space-y-3">
          {brief.likelyQuestions.map((question, index) => (
            <li key={question} className={question === currentQuestion ? 'rounded-md border border-teal-300 bg-teal-50 p-3' : 'border-l-2 border-gray-200 pl-3'}>
              <div className="text-xs font-semibold text-gray-500">{String(index + 1).padStart(2, '0')}</div>
              <p className="mt-1 text-sm leading-relaxed text-gray-700">{question}</p>
            </li>
          ))}
        </ol>
      </aside>
    </div>
  )
}

export default function InterviewRolePlay() {
  const [form, setForm] = useState(EMPTY_INTERVIEW_INPUT)
  const [brief, setBrief] = useState(null)
  const [messages, setMessages] = useState([])
  const [answer, setAnswer] = useState('')
  const [copied, setCopied] = useState('')
  const [sessionFinished, setSessionFinished] = useState(false)

  useEffect(() => {
    const saved = readInterviewRolePlay()
    if (saved?.form) setForm({ ...EMPTY_INTERVIEW_INPUT, ...saved.form })
    if (saved?.brief) {
      const savedBrief = { ...saved.brief, settings: normalizeInterviewSettings(saved.brief.settings) }
      setBrief(savedBrief)
      setMessages(saved.messages || [{ role: 'interviewer', content: savedBrief.openingQuestion }])
    }
  }, [])

  const questionCount = brief?.likelyQuestions.length || 0
  const transcript = useMemo(
    () => messages.map((message) => `${message.role === 'candidate' ? 'Candidate' : 'Interviewer'}: ${message.content}`).join('\n\n'),
    [messages],
  )

  const save = (nextBrief, nextMessages, nextForm = form) => {
    writeInterviewRolePlay({ form: nextForm, brief: nextBrief, messages: nextMessages, updatedAt: new Date().toISOString() })
  }

  const changeField = (field, value) => {
    const nextForm = { ...form, [field]: value }
    setForm(nextForm)
  }

  const generate = () => {
    const nextBrief = buildInterviewBrief(form)
    const nextMessages = [{ role: 'interviewer', content: nextBrief.openingQuestion }]
    setBrief(nextBrief)
    setMessages(nextMessages)
    setAnswer('')
    setCopied('')
    setSessionFinished(false)
    save(nextBrief, nextMessages)
  }

  const submitAnswer = () => {
    if (!answer.trim() || !brief) return
    const candidateContent = answer.trim()
    const reply = buildRolePlayReply({ brief, answer: candidateContent, turn: messages.filter((message) => message.role === 'candidate').length })
    const candidateMessage = { role: 'candidate', content: candidateContent, assessment: reply.assessment }
    const nextMessages = [...messages, candidateMessage, { role: 'interviewer', content: reply.followUp, coaching: reply.coaching, complete: reply.complete }]
    setMessages(nextMessages)
    setAnswer('')
    if (reply.complete) setSessionFinished(true)
    save(brief, nextMessages)
  }

  const reset = () => {
    setForm(EMPTY_INTERVIEW_INPUT)
    setBrief(null)
    setMessages([])
    setAnswer('')
    setCopied('')
    setSessionFinished(false)
    clearInterviewRolePlay()
  }

  const copyBrief = async () => {
    if (!brief) return
    const didCopy = await copyToClipboard(`${brief.prompt}\n\nInterview transcript so far:\n${transcript || '[Not started]'}`)
    setCopied(didCopy ? 'LLM brief copied' : 'Clipboard unavailable')
  }

  const debrief = brief ? buildInterviewDebrief({ brief, messages }) : null

  return (
    <section className="rounded-lg border border-gray-200 bg-white">
      <header className="flex flex-col gap-3 border-b border-gray-200 p-4 sm:flex-row sm:items-start sm:justify-between sm:p-5">
        <div>
          <p className="flex items-center gap-2 text-sm font-medium text-teal-700">
            <Lightbulb className="h-4 w-4" />
            Interview role-play
          </p>
          <h2 className="mt-1 text-lg font-semibold text-gray-900">Turn JD and interviewer context into an English rehearsal</h2>
          <p className="mt-2 max-w-3xl text-sm text-gray-600">
            Build a role-specific interviewer lens, rehearse evidence-led answers, and receive a structured follow-up after every turn.
          </p>
        </div>
        {brief && (
          <button
            type="button"
            onClick={copyBrief}
            className="inline-flex shrink-0 items-center justify-center gap-2 rounded-md border border-gray-300 px-3 py-2 text-sm font-medium text-gray-700 hover:bg-gray-50"
          >
            <Copy className="h-4 w-4" />
            Copy LLM brief
          </button>
        )}
      </header>

      {brief ? (
        <div className="grid grid-cols-1 lg:grid-cols-[300px_minmax(0,1fr)]">
          <InterviewerProfile brief={brief} />
          <RolePlaySession
            brief={brief}
            messages={messages}
            answer={answer}
            onAnswerChange={setAnswer}
            onSubmitAnswer={submitAnswer}
            onReset={reset}
            onFinish={() => setSessionFinished(true)}
          />
        </div>
      ) : (
        <PreparationForm form={form} onChange={changeField} onGenerate={generate} />
      )}

      {brief && sessionFinished && <RolePlayDebrief debrief={debrief} onContinue={() => setSessionFinished(false)} />}

      <footer className="flex flex-wrap items-center justify-between gap-2 border-t border-gray-100 bg-gray-50 px-4 py-3 text-xs text-gray-500 sm:px-5">
        <span>{brief ? `${questionCount} likely questions prepared` : 'Prepare a local interview plan to start'}</span>
        <span>{copied || 'Local rehearsal baseline · optional LLM handoff'}</span>
      </footer>
    </section>
  )
}
