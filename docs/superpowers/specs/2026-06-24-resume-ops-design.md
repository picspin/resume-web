# Resume-Ops Medical Career System Design

Date: 2026-06-24

## Goal

Upgrade `resume-web` from a static resume website into a medical-industry career operating system inspired by `~/LLM/career-ops`.

The system must keep the current polished Web resume, add JD-specific resume iteration, and generate attractive Web and PDF outputs. It must also customize the `career-ops` evaluation mindset away from generic AI architect / CS roles and toward Xiaolei Zhu's target market: medical devices, pharma, radiology, healthcare digitalization, medical AI, clinical application leadership, product marketing, and business development roles.

## Source Material

The design is based on these current sources:

- Current Web project: `/Users/hilbert/Downloads/resume/Web/resume-web`
- Reference system: `/Users/hilbert/LLM/career-ops`
- Latest resume PDF: `/Users/hilbert/Downloads/resume/Xiaolei_zhu_resume.pdf`
- Existing Web resume Markdown: `/Users/hilbert/Downloads/resume/Web/resume-web/public/Xiaolei Zhu-PhD.md`
- Current structured resume data: `src/data/resume-en.json` and `src/data/resume-zh.json`
- Industry and HR analysis example: `/Users/hilbert/Downloads/resume/行业人力洞察专家职业分析.md`
- MNC JD examples: `/Users/hilbert/Downloads/resume/JD/`
- Reference prompt files:
  - `/Users/hilbert/LLM/career-ops/modes/_shared.md`
  - `/Users/hilbert/LLM/career-ops/modes/oferta.md`
  - `/Users/hilbert/LLM/career-ops/modes/scan.md`
  - `/Users/hilbert/LLM/career-ops/config/profile.example.yml`
  - `/Users/hilbert/LLM/career-ops/templates/cv-template.html`
  - `/Users/hilbert/LLM/career-ops/templates/portals.example.yml`

The industry analysis document is a worked example for how to infer hidden role needs, KPIs, HR screening concerns, stakeholder maps, and capability gaps. It should not make any one company or role the center of the system. The JD folder broadens the target market with examples from MNC pharma and medtech roles including clinical trial start-up, clinical modeling and analytics, medical affairs AI innovation, China clinical leadership, external innovation/BD, and R&D open innovation.

The latest PDF positions the candidate as an AI-enabled healthcare innovation leader with 10+ years across medical imaging, radiology, digital health, product strategy, China/APAC/global implementation, LLM/RAG tools, Google Cloud platform strategy, KOL/stakeholder work, and clinical/scientific solution building. The older Web Markdown provides deeper project, publication, patent, and society evidence.

## Architecture

Add a `career/` workspace inside `resume-web`. This is the user's career-ops layer and will be owned by this project.

```text
career/
  config/
    profile.yml
  data/
    master-resume.json
    master-resume.zh.json
  jds/
    sample-medical-digital-role.md
  modes/
    _shared.md
    evaluate.md
    pdf.md
    scan.md
  templates/
    resume-print.html
    portals.example.yml
  versions/
    {company-role}/
      resume.json
      metadata.json
      evaluation.md
      print.html
  output/
    cv-{slug}-{date}.pdf
```

The original `src/data/resume-en.json` and `src/data/resume-zh.json` remain compatible with the existing React UI. `career/data/master-resume.json` becomes the JD adaptation source of truth for generated versions. The React app gains a version loader later, so the same layout can show the default resume or a tailored version.

We do not directly mutate the upstream `~/LLM/career-ops` repo during implementation. Instead, the relevant prompt templates and scripts are adapted into `resume-web/career/`. This avoids breaking upstream update behavior and makes the resume website self-contained.

## Personal Profile Scope

`career/config/profile.yml` should be initialized from the latest PDF and Web resume. It should include:

- Identity: Xiaolei Zhu, PhD; Guangzhou, China; bilingual English/Chinese; global/APAC/China experience.
- Current positioning: AI-enabled healthcare innovation and digital radiology leader.
- Target roles:
  - Digital Health Product Marketing / Product Manager
  - Medical AI Solution / Clinical Workflow Lead
  - Healthcare Digital Transformation / Innovation Lead
  - Medical Device Product Strategy / Portfolio Manager
  - Radiology / Oncology Solution Marketing
  - Medical BD / Strategic Partnership / Ecosystem Development
  - Clinical Application / Scientific Solution Lead
  - Pharma Clinical Development / Clinical Operations Innovation
  - Clinical Modeling, RWD / RWE, and Trial Analytics Lead
  - Medical Affairs AI / Integrated Healthcare Solution Lead
  - Pharma R&D Open Innovation / External Innovation BD
  - Medical AI Evaluation / Standards / Scientific Committee Lead
  - Medical Device / Imaging Solution R&D Innovation Lead
- Target industries:
  - Medical devices and imaging
  - Pharma digital solutions
  - Pharma R&D and clinical development
  - Radiation oncology / digital oncology
  - Healthcare IT and hospital workflow software
  - Medical AI and clinical decision support
  - Real-world data, clinical analytics, and trial innovation
  - Cloud/data/AI platforms for healthcare
- Signature advantages:
  - PhD-level MR imaging and molecular imaging foundation
  - Siemens + Bayer medical imaging and radiology domain experience
  - Global/APAC/China localization bridge
  - Healthcare AI, LLM/RAG, cloud, and workflow translation
  - KOL, hospital, academic, vendor, and internal stakeholder ecosystem
  - Product marketing, portfolio strategy, business case, and sales enablement

The profile must separate factual claims from positioning language. JD tailoring may reframe real evidence, but must not invent qualifications, metrics, regulatory experience, or direct oncology/radiation therapy product ownership unless supported by the resume or later user input.

## Medical Archetype Detection

Replace the default `career-ops` archetypes in the local `career/modes/_shared.md` with healthcare-specific role archetypes. Each JD can be classified into one primary archetype or a hybrid of two.

| Archetype | JD signals | Candidate framing |
|-----------|------------|-------------------|
| Medical Digital Product Marketing | product marketing, value proposition, pricing, launch, sales collateral, portfolio, market analysis | Bridge global product strategy to China/APAC clinical and commercial adoption |
| Medical AI / Clinical Workflow Solution | AI contouring, imaging AI, workflow software, RAG, ML/DL, hospital workflow, clinical adoption | Translate AI/digital tools into regulated healthcare workflows and stakeholder adoption |
| Healthcare Digital Transformation | digital transformation, change management, adoption, enablement, cloud/data platform, operating model | Lead cross-functional digital capability building in medical imaging and radiology |
| Medical Device Portfolio / Product Strategy | lifecycle, roadmap, NPI, localization, competitive landscape, business case, regulatory registration | Connect clinical needs, market feasibility, product portfolio, and commercial rationale |
| Clinical Application / Scientific Solution Lead | clinical education, application support, KOL, scientific communication, hospital collaboration | Use PhD + imaging background to build credible clinical/scientific solution narratives |
| Medical BD / Ecosystem Partnership | partnership, alliance, ecosystem, vendor management, KOL network, hospital collaboration, business development | Build hospital-academia-vendor ecosystems and local AI/digital solution partnerships |
| Radiology / Oncology Commercialization | radiology, oncology, radiation therapy, digital oncology, treatment planning, imaging management, AI contouring | Adjacent-domain positioning from radiology and oncology-related imaging toward digital oncology |
| Pharma Clinical Development / Operations Innovation | clinical trial start-up, site activation, CTA/NDA, ICH-GCP, CTMS, CRO/vendor, study execution, patient journey | Position as adjacent clinical-development strategist with scientific, imaging, evidence-generation, and cross-functional healthcare execution experience |
| Clinical Modeling, RWD / RWE, and Trial Analytics | clinical modeling, simulation, RWD, RWE, patient recruitment prediction, endpoint assessment, protocol optimization, AI/ML, digital twins | Emphasize PhD research rigor, data science, Python/R/Matlab/SQL, imaging analytics, AI/ML, and translation of models into clinical decisions |
| Medical Affairs AI / Integrated Healthcare Solutions | medical affairs, disease-area strategy, access, AI/digital solution implementation, patient outcomes, compliance, ecosystem leadership | Frame as medical-digital bridge who can communicate AI value, align medical/commercial/access teams, and drive compliant healthcare innovation |
| Pharma R&D Open Innovation / External Innovation BD | open innovation, search and evaluation, due diligence, licensing, biotech ecosystem, venture, R&D partnership, deal process | Emphasize China/APAC ecosystem building, scientific assessment, BD collaboration, AI partner scouting, and executive-level communication |
| Medical AI Evaluation / Standards / Committee Leadership | AI model evaluation, expert committee, standards, academic conferences, KOL expert network, model benchmarking, industry influence | Frame around medical imaging AI credibility, scientific communication, KOL/hospital network building, and cross-functional standard-setting |
| Medical Device / Imaging Solution R&D Innovation | device R&D, imaging platform, clinical requirements, algorithm-product integration, usability, verification, translational research | Emphasize imaging physics, clinical workflow knowledge, AI-enabled tooling, hospital collaboration, and product-research translation |

Example classifications:

- A digital oncology product marketing JD classifies as Medical Digital Product Marketing + Medical Device Portfolio / Product Strategy, with Radiology / Oncology Commercialization as an adjacent domain.
- A clinical trial start-up JD classifies as Pharma Clinical Development / Operations Innovation.
- A clinical modeling and analytics JD classifies as Clinical Modeling, RWD / RWE, and Trial Analytics.
- A medical affairs AI innovation JD classifies as Medical Affairs AI / Integrated Healthcare Solutions.
- An external AI innovation search-and-evaluation JD classifies as Pharma R&D Open Innovation / External Innovation BD.

## Evaluation System

The local system keeps the `career-ops` A-F structure but rewrites it for medical HR and hiring-manager usefulness. Block G posting legitimacy remains optional but recommended.

### Block A - Role And Market Context

Summarize:

- Medical archetype and hybrid classification
- Product or solution domain
- Buyer/stakeholder map: clinician, physicist, medical affairs, clinical operations, R&D, biostatistics, regulator, hospital manager, procurement, payer/access, sales, KOL, biotech partner, government stakeholder
- Seniority and function: product marketing, product strategy, BD, application, transformation, solution
- Local/global bridge requirement
- First 6-12 month implied outcomes

### Block B - Resume Evidence Match

Map every important JD requirement to exact resume evidence:

- Latest PDF summary and work bullets
- Web resume projects
- Publications, posters, patent, memberships
- Digital tools and AI/RAG projects
- China/APAC/global localization examples

The output should distinguish:

- Direct match
- Adjacent match
- Evidence gap
- Risk if HR screens literally
- Recommended wording for the resume

### Block C - HR Screen And Level Strategy

Optimize for HR and hiring-manager interpretation:

- How HR will tag the candidate in the first 30 seconds
- Which keywords should appear in summary, skills, and first-page bullets
- Whether the candidate looks overqualified, under-domain, or highly adjacent
- How to position the radiology/pharma background for medical device, pharma R&D, clinical development, medical affairs, oncology, digital health, or healthcare IT roles
- Level fit and title negotiation framing

This block is deliberately different from `career-ops`' CS-oriented level strategy. It should speak to healthcare hiring concerns: domain credibility, customer proximity, regulatory awareness, commercial maturity, and stakeholder trust.

### Block D - Business Impact, KPI, And Industry Insight

Use the HR industry analysis style to infer concrete success measures for the JD. This style is an example pattern: infer the business problem behind the JD, the KPIs the hiring manager likely owns, the hidden stakeholder concerns, and the capability gaps a candidate must address.

For product marketing and digital solution roles, evaluate fit against KPI domains:

- Product marketing performance: launch success, value proposition adoption, sales tool effectiveness, market requirement conversion
- Commercial development: revenue contribution, tender support, channel enablement, deal size, sales cycle influence
- Regulatory and market access support: NMPA awareness, registration support documentation, procurement pathway, hospital access
- Market influence: KOL network, show sites, medical education, brand communication, internal/external training
- Data-driven decision making: market/financial analysis, business cases, dashboarding, feedback loops

For pharma R&D, clinical development, and clinical operations roles, evaluate fit against KPI domains:

- Trial start-up speed: country/site activation, CTA/NDA readiness, ethics board coordination, amendment cycle time
- Clinical development quality: protocol feasibility, patient journey insight, evidence-generation plan quality, China data contribution
- Operational excellence: risk mitigation, CRO/vendor governance, CTMS/process compliance, cross-functional alignment
- Analytics and innovation impact: enrollment prediction, site selection, protocol optimization, endpoint exploration, RWD/RWE use, AI/ML deployment readiness
- External scientific influence: publications, presentations, regulatory/scientific forums, investigator network, government or institutional collaboration

For open innovation, external innovation, and BD roles, evaluate fit against KPI domains:

- Opportunity sourcing quality: relevance of AI/biotech/medtech opportunities, China ecosystem coverage, strategic fit
- Scientific and technical due diligence: evidence quality, risk assessment, clinical/translational logic, AI platform validity
- Deal/process contribution: executive recommendation quality, stakeholder alignment, term-sheet or pilot-program support
- Partnership network: biotech, academic, hospital, government, VC/PE, and internal global R&D connectivity
- Institutional memory: concise opportunity documentation, reusable assessment frameworks, follow-through discipline

This block should produce role-specific KPIs, not generic "impact" statements.

### Block E - Resume, Web, PDF, And LinkedIn Customization Plan

Recommend exactly how to tailor:

- Professional summary
- Core qualifications
- First-page skills and keywords
- Work bullets
- Projects selected for Web/PDF
- Publications or posters to surface
- LinkedIn headline/about wording
- Portfolio/demo links to include

The plan must produce both:

- ATS/HR-optimized PDF content
- Polished Web layout content, using the existing visual resume style

### Block F - Interview And Narrative Plan

Prepare HR and hiring-manager storylines:

- 6-10 STAR+R stories mapped to JD requirements
- A "why this role / why this company / why now" narrative
- Gap-handling answers, especially for radiation oncology, regulatory registration, direct P&L, or specific product gaps
- First 90 days plan based on the inferred role type:
  - product/technology deep dive
  - market diagnosis
  - stakeholder mapping
  - competitive intelligence
  - value proposition system
  - sales enablement package
  - KOL ecosystem plan
  - clinical evidence or trial-operation diagnosis when the role is R&D/clinical-development oriented
  - partner landscape and due-diligence map when the role is open-innovation or BD oriented

### Block G - Posting Legitimacy

Keep the original posting legitimacy analysis, but adjust context for medical roles:

- Long hiring cycles are normal for medical device and senior product roles.
- Niche radiology/oncology roles may stay open longer without being suspicious.
- Generic JD wording is common in multinational healthcare companies, but should still be weighed if the role lacks specific product scope.

## JD Adaptation Rules

The resume adapter must be truth-based.

Allowed:

- Reorder bullets by JD relevance.
- Rewrite wording to match JD language when the underlying evidence exists.
- Select the most relevant projects.
- Emphasize adjacent evidence with clear phrasing, e.g. "radiology digital platform experience applicable to oncology workflow software".
- Add metadata explaining why each change was made.

Not allowed:

- Invent direct radiation therapy product ownership.
- Invent NMPA registration leadership unless the source resume later supports it.
- Invent P&L ownership, revenue numbers, market share, customer counts, or KOL counts.
- Invent direct clinical trial start-up ownership, CTA/NDA ownership, signed-deal ownership, or line-management scope unless the source resume later supports it.
- Claim hands-on mastery of tools absent from the resume.
- Hide significant domain gaps from the evaluation.

## Scanner Customization

The local `career/modes/scan.md` and `career/templates/portals.example.yml` should be customized for healthcare roles.

### Title Filter Positive Keywords

Include terms such as:

- Digital Health
- Healthcare IT
- Medical AI
- Clinical AI
- Imaging AI
- Radiology
- Oncology
- Digital Oncology
- Advanced Oncology Solutions
- Product Marketing
- Product Manager
- Portfolio Manager
- Strategic Marketing
- Market Access
- Commercial Development
- Business Development
- External Innovation
- Search & Evaluation
- Open Innovation
- R&D Innovation
- Clinical Development
- Clinical Operations
- Study Start-Up
- Clinical Trial
- Clinical Modeling
- Real World Data
- RWD
- Real World Evidence
- RWE
- Medical Affairs
- Integrated Healthcare Solution
- Evidence Generation
- Regulatory
- CTA
- NDA
- Clinical Application
- Solution Marketing
- Solution Architect
- Scientific Marketing
- KOL
- Medical Education
- Scientific Communication
- Medical Device R&D
- Translational Research
- Healthcare Digital Transformation

### Title Filter Negative Keywords

Exclude roles likely outside scope:

- nurse
- physician
- pure sales representative
- intern
- junior
- embedded firmware
- mechanical-only engineering
- manufacturing-only
- clinical trial CRA/CRC-only
- insurance claims
- hospital administration-only
- lab technician-only
- bench scientist-only with no translational, AI, clinical, or strategic scope

### Target Company Categories

The template should seed companies across:

- Medical imaging and radiology: Siemens Healthineers, GE HealthCare, Philips, Canon Medical, United Imaging
- Radiation oncology and oncology software: Varian, Elekta, RaySearch, Accuray
- Pharma and life-science digital/R&D: Bayer, Roche, AstraZeneca, Novartis, Sanofi, Pfizer, Johnson & Johnson, Eli Lilly, AbbVie, Astellas, Boehringer Ingelheim, Merck, GSK, Takeda, BMS
- Healthcare IT and digital health: Epic, Oracle Health, Dedalus, InterSystems, Philips Informatics
- Medical AI and imaging AI: local and global vendors relevant to China/APAC
- Cloud/AI healthcare platform teams: Google Cloud Healthcare, Microsoft Healthcare, AWS Healthcare, NVIDIA Healthcare
- Clinical research, RWD, and trial technology: IQVIA, ICON, Parexel, Medidata, Veeva, TriNetX, Flatiron Health

## PDF And Web Layout

The PDF should use a local version of `career-ops/templates/cv-template.html` as the foundation:

- Single column
- ATS-readable selectable text
- A4 default, Letter optional
- Clear header with name and contact
- Professional summary, core competencies, work experience, selected projects, education/certifications, selected publications
- Space-efficient typography inspired by the `career-ops` template
- No image-dependent critical content

The Web layout should preserve the existing `resume-web` strengths:

- Visual profile and project imagery
- Bilingual English/Chinese support
- Dark mode
- Project previews
- Version selection for JD-tailored resumes
- Download button mapped to the selected version's PDF

The PDF and Web outputs may differ in emphasis: PDF optimizes for HR/ATS and hiring manager scan; Web optimizes for credibility, portfolio depth, and visual storytelling.

## Scripts

Add or adapt scripts:

- `resume:sync`: build `career/data/master-resume.json` from existing structured data and resume Markdown.
- `resume:adapt`: input a JD file and slug, output `career/versions/{slug}/resume.json`, `metadata.json`, and `evaluation.md`.
- `resume:pdf`: render `career/versions/{slug}/print.html` to `career/output/*.pdf`.
- `resume:build`: run adapt + PDF.
- `resume:scan`: later wrapper around the customized scanner.

The first implementation can use deterministic rule-based keyword extraction and section ranking. If an LLM is later connected, it must still emit metadata and respect the truth-based constraints.

## React Integration

The React app should:

- Load the default resume when no version is selected.
- Discover available generated versions from a static manifest.
- Allow selecting a tailored version.
- Display metadata such as company, role, archetype, fit score, and generated date.
- Download the PDF for the selected version.
- Keep existing bilingual behavior. If a version only exists in English, the UI should make that clear rather than silently mixing languages.

## Testing And Verification

Implementation is complete only when:

- `npm run build` passes.
- A sample medical JD is saved under `career/jds/`.
- `npm run resume:adapt -- --jd career/jds/sample-medical-digital-role.md --slug sample-medical-digital-role` generates:
  - `career/versions/sample-medical-digital-role/resume.json`
  - `career/versions/sample-medical-digital-role/metadata.json`
  - `career/versions/sample-medical-digital-role/evaluation.md`
- `npm run resume:pdf -- --slug sample-medical-digital-role` generates a non-empty PDF.
- The generated PDF is rendered to images and visually checked for layout defects.
- The Web app can display the default resume and the sample tailored version.
- The evaluation output uses medical archetypes and HR/KPI blocks, not the default AI architect archetypes.
- The adapter metadata identifies source evidence for each major rewrite or section selection.

## Implementation Phases

### Phase 1 - Local Medical Resume-Ops Foundation

- Add `career/` structure.
- Initialize `profile.yml` from the latest PDF and Web Markdown.
- Add medical `modes/_shared.md`, `evaluate.md`, `pdf.md`, and scanner template.
- Add sample MNC medical digital / pharma innovation JD.
- Add deterministic resume adaptation and metadata generation.
- Add print HTML and PDF generation.

### Phase 2 - Web Version Experience

- Add version manifest generation.
- Add version selector to React.
- Map download button to selected version PDF.
- Refine display for HR/PDF versus Web/project storytelling.

### Phase 3 - Medical Job Discovery

- Customize scanner title filters, company lists, and location filters.
- Add medical job pipeline files.
- Add scan output to JD/evaluation workflow.

### Phase 4 - Iteration Intelligence

- Accumulate evaluation history.
- Track gaps by archetype.
- Suggest learning/projects/content updates for recurring gaps.
- Optionally connect an LLM for higher-quality rewriting while preserving truth constraints and metadata.

## Scope Decisions

1. Phase 1 initializes profile, sample JD, evaluation, and PDF output in English first, because the latest polished PDF is English and most multinational medical-device JDs are English. The data model must leave room for Chinese labels and future Chinese-tailored versions.
2. Customized prompts live under `career/modes/` inside `resume-web`. The root of this repo should not add a top-level `modes/` directory in Phase 1, because that would blur the boundary between the Web app and the embedded career system. Compatibility is exposed through npm scripts instead.
3. The first scanner configuration targets China/APAC medical devices, pharma digital, healthcare IT, medical AI, radiology, and oncology roles. It may include selected global remote or hybrid healthcare digital roles, but China/APAC relevance is the default filter.
4. Phase 1 includes scanner prompt/config customization, but not a fully automated multi-source scan run in the Web UI. Full scanner execution and pipeline integration are Phase 3 work.
