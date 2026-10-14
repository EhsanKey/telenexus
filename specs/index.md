# System Specifications Index (SSOT)
## SOURCE OF TRUTH — Telegram Personal Intelligence & Contact Management Platform

> **Status:** Authoritative Baseline (v1.0.0)  
> **Standards:** [Agentic Engineering Blueprint](file:///docs/AGENTIC-ENGINEERING-BLUEPRINT.md) | [SRS](file:///docs/SRS.md)  
> **Architectural Law:** Telegram owns Telegram data. SOURCE OF TRUTH owns user-created metadata. No Telegram message history is ever persisted in PostgreSQL.

This directory serves as the **Single Source of Truth (SSOT)** for all business requirements, entity definitions, state transitions, API contracts, and quality invariants. In case of any conflict between code implementation and these specifications, **the specification prevails**.

---

## Master Specification Catalog

| Spec ID | Title | Primary Domain | Governed Services | SRS Traceability |
|---|---|---|---|---|
| [`SPEC-01`](file:///specs/SPEC-01-system-foundation.md) | **System Foundation & Cross-Cutting Invariants** | Architecture & Standards | Backend, Frontend, DB | SRS §1, §3, §4, §16, §17 |
| [`SPEC-02`](file:///specs/SPEC-02-telegram-auth-session.md) | **Telegram MTProto Auth & Session Lifecycle** | Authentication & Security | Backend (MTProto), Frontend | SRS §5.1 (FR-AUTH-001..014), §9.2 |
| [`SPEC-03`](file:///specs/SPEC-03-entity-normalization-navigation.md) | **Entity Normalization & Conversation Navigation** | Domain Modeling & MTProto | Backend, Frontend | SRS §2, §5.2 (FR-CHAT-001..007), §5.5 |
| [`SPEC-04`](file:///specs/SPEC-04-ephemeral-message-viewer.md) | **Ephemeral Message Viewer & Media Indicator Engine** | Live Messaging (Zero-Store) | Backend, Frontend | SRS §5.3 (FR-MSG-001..008), §12.3 |
| [`SPEC-05`](file:///specs/SPEC-05-custom-profile-metadata.md) | **Custom Profile & Personal Metadata Management** | CRM Core & Persistence | Backend, Neon DB, Frontend | SRS §5.4 (FR-PROFILE-001..014), §7.4 |
| [`SPEC-06`](file:///specs/SPEC-06-social-links-tag-taxonomy.md) | **Social Links & Tag Taxonomy System** | CRM Extensions | Backend, Neon DB, Frontend | SRS §5.4, §7.5, §7.6, §7.7 |
| [`SPEC-07`](file:///specs/SPEC-07-google-drive-backup-recovery.md) | **Google Drive Backup & Disaster Recovery** | Cloud Backup & Privacy | Backend, Drive API, Frontend | SRS §5.6 (FR-DRIVE-001..010), §7.9 |
| [`SPEC-08`](file:///specs/SPEC-08-ui-ux-design-system.md) | **Desktop Three-Panel Layout & Responsive UX** | Frontend Presentation & UX | Next.js Client App | SRS §6 (UI/UX), §10.1, §13 |
| [`SPEC-09`](file:///specs/SPEC-09-security-privacy-error-taxonomy.md) | **Security, Privacy, Threat Model & Error Taxonomy** | Security, Resilience, Observability | Full-Stack Infrastructure | SRS §9, §10, §11, §15, §18 |

---

## Spec-Driven Development Workflow

```text
┌────────────────────────────────────────────────────────┐
│               SPECIFICATION INDEX (SSOT)               │
│          specs/ (SPEC-01 through SPEC-09)              │
└───────────────────────────┬────────────────────────────┘
                            │ Governs
         ┌──────────────────┴──────────────────┐
         ▼                                     ▼
┌──────────────────────────────┐    ┌──────────────────────────────┐
│       BACKEND SERVICE        │    │       FRONTEND SERVICE       │
│  - Node.js + TypeScript      │    │  - Next.js 15+ (App Router)  │
│  - GramJS MTProto Engine     │    │  - React 19 + TypeScript     │
│  - Neon PostgreSQL (Drizzle) │    │  - Reverse Proxy Route       │
│  - Google Drive REST Client  │    │  - Three-Panel CRM Layout    │
└──────────────────────────────┘    └──────────────────────────────┘
```

## Traceability & Change Protocol
1. Any modification to schema attributes, endpoints, or error codes must begin with an amendment to the respective `SPEC-*.md` file.
2. Changes must cite the corresponding SRS requirement ID (e.g. `FR-PROFILE-004`).
3. Multi-project features must be planned using the `cross-stack-feature-plan` skill before any code editing occurs.
