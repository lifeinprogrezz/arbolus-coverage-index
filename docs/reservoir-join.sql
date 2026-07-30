-- The reservoir join (build spec §4) — the highest-value production feature.
-- Question it answers: "which of our existing experts work at an org the
-- index says uses vendor X?" Zero acquisition cost, zero platform risk:
-- they are already verified, already paid, already responsive.
--
-- Prototype runs this against a SYNTHETIC reservoir (labelled synthetic=true).
-- Production would run it against the real ~200k expert base — the measured
-- hit-ratio is the two-week experiment's FIRST falsifiable claim
-- (our org-join assumption: 2–6 hits/vendor in the sweet spot; the
-- self-declared-stack model predicts ~0.55 — the real number reprices the
-- whole 20-in-30 walk).

-- direct hits: experts employed at an org with usage evidence for :vendor
select
  r.id            as expert_id,
  r.title,
  r.employer,
  r.dormant,
  o.org_name      as evidence_org,
  o.evidence_type,
  o.status        as org_status
from reservoir_experts r
join customer_orgs o
  on o.org_domain = r.employer_domain
where o.vendor_id = :vendor_id;

-- dormant-reactivation slice (activation loop 4): dormant experts whose org
-- the index NEWLY mapped — the composer re-prompts them, same consent rules
select r.*
from reservoir_experts r
join customer_orgs o on o.org_domain = r.employer_domain
where o.vendor_id = :vendor_id
  and r.dormant;

-- per-vendor reservoir depth (book_state.reservoir_hits)
select o.vendor_id, count(distinct r.id) as reservoir_hits
from reservoir_experts r
join customer_orgs o on o.org_domain = r.employer_domain
group by o.vendor_id;
