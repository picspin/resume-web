const STORAGE_KEY = 'resume-web:career:interview-role-play:v1'

export const EMPTY_INTERVIEW_INPUT = {
  jdText: '',
  interviewerLinkedIn: '',
  interviewType: 'hiring-manager',
  pressure: 'balanced',
  questionCount: '5',
  includeCurveballs: true,
}

export const INTERVIEW_TYPE_OPTIONS = [
  { value: 'hiring-manager', label: 'Hiring manager' },
  { value: 'behavioral', label: 'Behavioral / STAR' },
  { value: 'stakeholder', label: 'Clinical & stakeholder panel' },
  { value: 'case', label: 'Medical product case' },
]

export const PRESSURE_OPTIONS = [
  { value: 'supportive', label: 'Supportive' },
  { value: 'balanced', label: 'Balanced' },
  { value: 'challenging', label: 'Challenging' },
]

const DEFAULT_SETTINGS = {
  interviewType: 'hiring-manager',
  pressure: 'balanced',
  questionCount: 5,
  includeCurveballs: true,
}

const DEFAULT_QUESTIONS = [
  'Could you walk me through the medical problem you were solving and the outcome you owned?',
  'How would you translate this role\'s priorities into a 90-day plan?',
  'Tell me about a time you aligned clinical, commercial, and technical stakeholders around one decision.',
  'Which evidence would you use to show that a digital or AI solution is ready for real-world adoption?',
  'What would you ask me about the team, the customers, and the success metrics before joining?',
]

const FORMAT_QUESTIONS = {
  behavioral: [
    'Tell me about a high-stakes decision where the available evidence was incomplete. How did you proceed?',
    'Describe a time you had to recover trust after a project or stakeholder relationship changed course.',
  ],
  stakeholder: [
    'A clinical leader, a commercial lead, and a quality partner disagree on launch readiness. How would you create a decision path?',
    'How would you handle a physician champion who wants a faster rollout than the evidence currently supports?',
  ],
  case: [
    'You inherit a promising medical AI pilot with weak adoption. What would you diagnose first, and what would you change in 90 days?',
    'Which metrics would tell you whether a digital health solution has value beyond a technically successful demo?',
  ],
}

const CURVEBALL_QUESTIONS = [
  'What part of your background is least obvious for this role, and why should we still take the risk on you?',
  'If your preferred solution was rejected by a senior stakeholder tomorrow, how would you preserve momentum?',
]

function compactText(value, maxLength = 180) {
  const normalized = String(value || '').replace(/\s+/g, ' ').trim()
  if (!normalized) return ''
  return normalized.length > maxLength ? `${normalized.slice(0, maxLength - 1)}...` : normalized
}

function includesAny(text, terms) {
  return terms.some((term) => text.includes(term))
}

function extractInterviewerName(linkedInText) {
  const namedLine = String(linkedInText || '')
    .split('\n')
    .map((line) => line.trim())
    .find((line) => /^(name|linkedin name)\s*:/i.test(line))

  if (namedLine) return namedLine.replace(/^(name|linkedin name)\s*:/i, '').trim() || 'the interviewer'

  const firstLine = String(linkedInText || '')
    .split('\n')
    .map((line) => line.trim())
    .find(Boolean)

  return firstLine && firstLine.length < 70 ? firstLine : 'the interviewer'
}

function inferFocus(jdText, linkedInText) {
  const source = `${jdText} ${linkedInText}`.toLowerCase()
  const focus = []

  if (includesAny(source, ['clinical', 'patient', 'hospital', 'physician'])) focus.push('clinical adoption and patient impact')
  if (includesAny(source, ['regulatory', 'quality', 'compliance', 'ivd', 'mdr'])) focus.push('quality, regulatory judgement, and risk')
  if (includesAny(source, ['commercial', 'market', 'sales', 'business development', 'bd'])) focus.push('market strategy and stakeholder influence')
  if (includesAny(source, ['ai', 'digital', 'data', 'software', 'platform'])) focus.push('digital product evidence and responsible AI')
  if (includesAny(source, ['r&d', 'research', 'engineering', 'device', 'instrument'])) focus.push('technical development and product translation')

  return focus.length ? focus.slice(0, 3) : ['role priorities', 'cross-functional execution', 'evidence-backed impact']
}

function inferRoleLabel(jdText) {
  const firstMeaningfulLine = String(jdText || '')
    .split('\n')
    .map((line) => line.trim())
    .find((line) => line.length > 8)

  const title = firstMeaningfulLine?.split(/[.!?]/)[0]?.trim()
  return title ? compactText(title, 96) : 'the target role'
}

function profileSummary(linkedInText) {
  const withoutNameLine = String(linkedInText || '')
    .split('\n')
    .filter((line) => !/^(name|linkedin name)\s*:/i.test(line.trim()))
    .join(' ')

  return compactText(withoutNameLine, 220)
}

function questionForFocus(focus, roleLabel) {
  const lowered = focus.toLowerCase()
  if (lowered.includes('clinical')) return `For ${roleLabel}, how would you earn clinician trust while keeping the workflow practical?`
  if (lowered.includes('regulatory')) return 'Describe a decision where you balanced speed, evidence, quality, and compliance.'
  if (lowered.includes('market')) return 'How would you align commercial needs with a credible clinical value story?'
  if (lowered.includes('digital')) return 'How do you decide whether an AI or digital-health concept is ready to move from pilot to scaled use?'
  if (lowered.includes('technical')) return 'Tell me about turning a technical or R&D constraint into a useful product decision.'
  return `What is the most important outcome you would own in your first 90 days in ${roleLabel}?`
}

function uniqueQuestions(questions) {
  return questions.filter((question, index) => questions.indexOf(question) === index)
}

function normalizeQuestionCount(value) {
  const count = Number.parseInt(value, 10)
  return [3, 5, 7].includes(count) ? count : 5
}

export function normalizeInterviewSettings(input = {}) {
  return {
    interviewType: INTERVIEW_TYPE_OPTIONS.some((option) => option.value === input.interviewType) ? input.interviewType : DEFAULT_SETTINGS.interviewType,
    pressure: PRESSURE_OPTIONS.some((option) => option.value === input.pressure) ? input.pressure : DEFAULT_SETTINGS.pressure,
    questionCount: normalizeQuestionCount(input.questionCount),
    includeCurveballs: input.includeCurveballs !== false,
  }
}

export function buildInterviewBrief(input = EMPTY_INTERVIEW_INPUT) {
  const settings = normalizeInterviewSettings(input)
  const rawInterviewerLinkedIn = String(input.interviewerLinkedIn || '')
  const jdText = compactText(input.jdText, 1200)
  const interviewerLinkedIn = compactText(rawInterviewerLinkedIn, 1200)
  const roleLabel = inferRoleLabel(jdText)
  const interviewerName = extractInterviewerName(rawInterviewerLinkedIn)
  const focus = inferFocus(jdText, interviewerLinkedIn)
  const formatQuestions = FORMAT_QUESTIONS[settings.interviewType] || []
  const likelyQuestions = uniqueQuestions([
    ...formatQuestions,
    ...focus.map((item) => questionForFocus(item, roleLabel)),
    ...DEFAULT_QUESTIONS,
    ...(settings.includeCurveballs ? CURVEBALL_QUESTIONS : []),
  ]).slice(0, settings.questionCount)

  return {
    interviewer: {
      name: interviewerName,
      profileSummary: interviewerLinkedIn
        ? profileSummary(rawInterviewerLinkedIn)
        : 'No LinkedIn notes provided. The interviewer will use the JD priorities as the primary lens.',
      focus,
    },
    roleLabel,
    settings,
    likelyQuestions,
    openingQuestion: likelyQuestions[0],
    prompt: [
      'Act as a thoughtful English-speaking interviewer for the role below.',
      `Role / JD: ${jdText || '[Paste a job description]'}`,
      `Interviewer background: ${interviewerLinkedIn || '[Paste LinkedIn notes]'}`,
      `Interview format: ${settings.interviewType}. Pressure: ${settings.pressure}. Ask one question at a time. Use concise, evidence-seeking follow-ups. Challenge vague claims, but stay professional.`,
      'After every candidate answer, give a brief private coaching note: evidence used, missing detail, and a stronger next move.',
    ].join('\n\n'),
  }
}

export function assessInterviewAnswer(answer) {
  const source = String(answer || '').toLowerCase()
  const signals = []
  if (/\d|%|million|kpi|metric|increase|reduce|improve/.test(source)) signals.push('a measurable outcome')
  if (/clinician|hospital|patient|customer|physician/.test(source)) signals.push('a user or clinical stakeholder')
  if (/team|cross-functional|commercial|engineering|r&d|quality/.test(source)) signals.push('cross-functional collaboration')
  if (/because|therefore|result|impact|outcome/.test(source)) signals.push('a clear decision-to-impact link')
  const score = Math.min(5, Math.max(1, 1 + signals.length))
  return {
    signals,
    score,
    evidence: signals.some((signal) => signal === 'a measurable outcome') ? 5 : 2,
    structure: signals.some((signal) => signal === 'a clear decision-to-impact link') ? 5 : 2,
    relevance: signals.some((signal) => signal === 'a user or clinical stakeholder') ? 5 : 3,
  }
}

export function buildRolePlayReply({ brief, answer, turn = 0 }) {
  const settings = normalizeInterviewSettings(brief.settings)
  const assessment = assessInterviewAnswer(answer)
  const signals = assessment.signals
  const nextQuestion = brief.likelyQuestions[Math.min(turn + 1, brief.likelyQuestions.length - 1)] || DEFAULT_QUESTIONS[0]
  const isComplete = turn + 1 >= settings.questionCount
  const pressureFollowUp = settings.pressure === 'challenging'
    ? 'Be specific: what did you personally decide, what evidence changed your mind, and what result did you own?'
    : nextQuestion
  const coaching = signals.length
    ? `Strong signal: you mentioned ${signals.slice(0, 2).join(' and ')}. Add one precise scope, constraint, or metric to make the evidence easier to trust.`
    : 'Your answer has a useful direction. Make it interview-ready with a concrete situation, your decision, the stakeholders involved, and a measurable result.'

  return {
    coaching,
    assessment,
    complete: isComplete,
    followUp: isComplete
      ? 'Thank you. That completes this rehearsal. Open your debrief to decide which story to sharpen next.'
      : turn === 0 && settings.pressure !== 'supportive'
      ? 'What was the hardest trade-off, and how did you decide what not to do?'
      : pressureFollowUp,
  }
}

export function buildInterviewDebrief({ brief, messages = [] }) {
  const answers = messages.filter((message) => message.role === 'candidate' && message.assessment)
  const average = (field) => answers.length
    ? answers.reduce((total, answer) => total + answer.assessment[field], 0) / answers.length
    : 0
  const scores = {
    evidence: average('evidence'),
    structure: average('structure'),
    relevance: average('relevance'),
  }
  const weakest = Object.entries(scores).sort(([, left], [, right]) => left - right)[0]?.[0] || 'evidence'
  const priority = {
    evidence: 'Add a specific scale, metric, adoption signal, or decision constraint to your strongest example.',
    structure: 'Use a tighter STAR arc: situation, your decision, the stakeholder alignment, then the measurable result.',
    relevance: `Reconnect your answer to ${brief.roleLabel} and the interviewer’s stated focus.`,
  }[weakest]

  return {
    answered: answers.length,
    scores,
    overall: answers.length ? (scores.evidence + scores.structure + scores.relevance) / 3 : 0,
    priority,
  }
}

export function readInterviewRolePlay(storage = globalThis?.localStorage) {
  try {
    const saved = storage?.getItem(STORAGE_KEY)
    return saved ? JSON.parse(saved) : null
  } catch {
    return null
  }
}

export function writeInterviewRolePlay(payload, storage = globalThis?.localStorage) {
  try {
    storage?.setItem(STORAGE_KEY, JSON.stringify(payload))
    return true
  } catch {
    return false
  }
}

export function clearInterviewRolePlay(storage = globalThis?.localStorage) {
  try {
    storage?.removeItem(STORAGE_KEY)
  } catch {
    // Local storage can be unavailable in private or server rendering contexts.
  }
}
