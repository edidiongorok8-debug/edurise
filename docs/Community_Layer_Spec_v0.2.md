# Nigerian School Platform — Multi-School Community Layer
## Spec Addendum to Blueprint v0.1 (this document: v0.2 draft)

**Date:** 17 October 2026
**Status:** Draft for owner and management review
**Relation to the blueprint:** All sections of Blueprint v0.1 remain in force except where amended here. This addendum redefines the product as a multi-school community platform and adds the community layer.

---

## 1. Product redefinition

This is NOT a single-school website. It is a community platform that links secondary schools within a geographical zone in Nigeria so they can:

- Present themselves in one official shared space
- View other schools' progress
- Adopt what is making better schools better

The "pilot school" concept from the blueprint becomes a "founding school" concept: the first school onboarded, one of many rather than the center of the product.

**Architecture consequence:** multi-tenancy is core from day one. Every school-owned record carries a `school_id`; authorization verifies school membership on every request; cross-tenant isolation tests are part of the automated test suite.

## 2. Zone structure

- Country: Nigeria
- State: Oyo State (LGA to be confirmed by owner; see Open Decisions)
- Zones are data, not code: the platform supports a Country → State → LGA hierarchy so expanding to new zones is configuration, never a rebuild.

## 3. How a school joins (registration and verification flow)

1. A school representative submits a registration request: official school name, address, state, LGA, school type (public/private), contact details, and evidence of legitimacy (e.g., letterhead letter or an official school email address).
2. A platform super-admin/Reviewer verifies the request and approves or rejects it.
3. On approval, the platform creates the school's tenant; the registrant becomes that school's School Administrator.
4. The School Administrator invites their staff by email.
5. Staff sign in with their own Google credentials. The school admin's approval binds the Google identity to that school's membership and role.

**Security rule (unchanged from blueprint, now more important):** Google login is authentication only. Authorization comes from verified school membership. No unapproved Google account can enter any school's workspace, and no member of School A can ever access School B's private records.

## 4. Community layer (public, shared space)

Each school gets a community profile containing only school-approved, published content:

- Official name, location (state/LGA), school type, motto
- Academic programmes and offerings
- Events calendar
- Achievements and awards
- Published announcements and updates
- Community metrics (see section 5)

**Never shared between schools:** staff records, staff tasks and goals, individual student records, unpublished content, internal notes.

## 5. Progress sharing (confirmed by owner)

Shared between schools:
- Enrollment trends (aggregate numbers)
- Achievements, programmes and events
- Published updates

WAEC and JAMB results (owner decision: these will show):
- **Recommendation: school-level aggregates only** — e.g., "72% of candidates earned 5 credits including English and Mathematics", "average UTME score", per-subject pass rates.
- Individual student results are personal data, mostly of minors. Displaying them across schools without each family's consent would create serious obligations and risks under the Nigeria Data Protection Act 2023 (see blueprint section 8). Aggregates achieve the comparison goal without this exposure.
- Aggregates must be non-identifying: suppress very small cohorts so figures cannot be traced back to individuals.

## 6. Data protection stance (amendment to blueprint section 8)

- Schools act as data controllers for their own data; the platform acts as processor. Confirm with legal review before launch.
- No individual student data in the first release (agreed).
- All community metrics pass a privacy review before the publishing feature ships.

## 7. Data model additions (to blueprint section 12)

- **Zone:** `id`, `country`, `state`, `lga`, `slug`
- **SchoolRegistrationRequest:** `id`, `submitted_by_id`, `school_name`, `state`, `lga`, `school_type`, `evidence_ref`, `status` (pending/approved/rejected), `reviewed_by_id`, timestamps
- **SchoolProfile:** `id`, `school_id`, `about`, `motto`, `logo_media_id`, `is_published`, timestamps
- **CommunityMetric:** `id`, `school_id`, `metric_type` (enrollment, waec_aggregate, jamb_aggregate, ...), `period`, `value`, `source`, `published_at`, timestamps
- **SchoolEvent:** `id`, `school_id`, `title`, `category`, `starts_at`, `ends_at`, `visibility`, timestamps
- **Achievement:** `id`, `school_id`, `title`, `description`, `awarded_at`, `evidence_media_id`, timestamps

## 8. Role amendments (to blueprint section 3)

New roles:
- **School Representative:** submits the registration request (pre-approval)
- **Platform Reviewer:** verifies registration requests and approves school tenants

All other roles from the blueprint remain, scoped per school. Community content publishing stays inside each school's own editor/approver chain.

## 9. Roadmap amendment (to blueprint section 10)

- **Phase 1 (core, day one):** school registration + verification, tenant isolation, school community profiles.
- **Phase 2:** per-school staff workspace (tasks, goals, notifications) as per the blueprint.
- **Phase 3:** community metrics publishing (enrollment trends, WAEC/JAMB aggregates) after privacy review.
- Later phases unchanged. Student/parent portal, individual results display (if ever) only after a consent and safeguarding framework is approved.

## 10. Open decisions

1. Confirm the zone: Oyo State and which LGA? (Owner mentioned "Akwa Ibom" as an LGA; Akwa Ibom is a state. Possibly Akinyele LGA in Oyo was meant.)
2. WAEC/JAMB results: school-level aggregates only (recommended), or individual student results (requires consent framework and is not possible in the first release)?
3. Verification standard: what evidence must a school provide to prove it is legitimate?
4. Founding school: does Kings Kids Christian International High School remain the first school onboarded?
5. Public school directory: is the list of member schools visible to the public, or to member schools only?
