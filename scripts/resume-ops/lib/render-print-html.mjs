function escapeHtml(value) {
  return String(value ?? '')
    .replaceAll('&', '&amp;')
    .replaceAll('<', '&lt;')
    .replaceAll('>', '&gt;')
    .replaceAll('"', '&quot;');
}

function section(title, body) {
  return `<section><h2>${escapeHtml(title)}</h2>${body}</section>`;
}

function list(items) {
  return `<ul>${items.map((item) => `<li>${escapeHtml(item)}</li>`).join('')}</ul>`;
}

function renderExperience(work = []) {
  return work.slice(0, 6).map((job) => `
    <div class="item">
      <div class="item-head"><span>${escapeHtml(job.title)} - ${escapeHtml(job.company)}</span><span class="muted">${escapeHtml(job.date)}</span></div>
      ${list(job.details || [])}
    </div>
  `).join('');
}

function renderProjects(projects = []) {
  return projects.slice(0, 5).map((project) => `
    <div class="item">
      <div class="item-head"><span>${escapeHtml(project.title)}</span></div>
      <p>${escapeHtml(project.description || '')}</p>
    </div>
  `).join('');
}

export function renderPrintHtml({ resume, metadata, template }) {
  const contact = [
    resume.general?.address,
    resume.general?.email_private || resume.general?.email_work,
    resume.general?.linkedin,
    resume.general?.github,
  ].filter(Boolean).map(escapeHtml).join('<span>|</span>');

  const body = [
    section('Professional Summary', `<p>${escapeHtml(resume.summary)}</p>`),
    section('Core Competencies', `<div class="tags">${(resume.targetedKeywords || []).slice(0, 10).map((item) => `<span class="tag">${escapeHtml(item)}</span>`).join('')}</div>`),
    section('Work Experience', renderExperience(resume.work)),
    section('Selected Projects', renderProjects(resume.projects)),
    section('Education', renderProjects((resume.education || []).map((edu) => ({ title: `${edu.degree} - ${edu.institution}`, description: `${edu.major || ''} ${edu.date || ''}` })))),
    section('Truth Notes', list(metadata.truthWarnings || [])),
  ].join('\n');

  return template
    .replaceAll('{{LANG}}', resume.language || 'en')
    .replaceAll('{{NAME}}', escapeHtml(resume.general?.name || 'Xiaolei Zhu, PhD'))
    .replaceAll('{{ROLE_LABEL}}', escapeHtml(metadata.roleLabel || 'Medical Digital Role'))
    .replaceAll('{{CONTACT}}', contact)
    .replaceAll('{{BODY}}', body);
}
