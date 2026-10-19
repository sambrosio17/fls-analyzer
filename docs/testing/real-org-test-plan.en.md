# Real-org test plan

Italiano: [real-org-test-plan.it.md](real-org-test-plan.it.md)

Most of OrgFox's write paths have only run against the demo org and mocked APIs. This plan checks them on real Salesforce before the beta. Run it on **two sandboxes**:

- **A, clean:** a fresh Developer sandbox or Developer Edition.
- **B, messy:** a sandbox copied from a real production org, with managed packages, several record types, Lightning apps with page overrides, and at least one profile whose name has brackets or other special characters (e.g. `guests (old) Profile`).

Never run it on production.

## How to report

For each step write **OK**, or **KO** plus: the error text shown in OrgFox, the change set number (CS-…), and a screenshot. If a step fails, export the change set to Excel (Export → Excel) and attach it. Note which sandbox (A or B) and the OrgFox commit (`git log -1 --oneline`).

## 0. Setup

| # | Step | Expected |
|---|---|---|
| 0.1 | `git pull && npm install && npm run build`, start with `DEMO_MODE=false` | App opens on the login page |
| 0.2 | Orgs → connect the sandbox (Sandbox login), give it an alias | Org appears with the SANDBOX tag and the alias in the top bar |
| 0.3 | Connected user: check it has API Enabled, View Setup and Configuration, Manage Profiles and Permission Sets | No permission warning on the org card |
| 0.4 | Note in Setup the current FLS of 3 fields on Account for 2 profiles and 1 permission set (screenshot) | Baseline to compare with |

## 1. FLS matrix

| # | Step | Expected |
|---|---|---|
| 1.1 | Open FLS matrix on Account | Fields × profiles/PS load; values match Setup for the 3 fields of 0.4 |
| 1.2 | Find a field hidden from the connected user (no FLS on its profile) | Shown with "Hidden from you" |
| 1.3 | Give Read on 2 fields to 1 profile + 1 PS, Read & edit on 1 field to the other profile; Go to preview | Preview lists exactly those rows with insert/update; warnings if a profile lacks object read |
| 1.4 | Apply | Status Completed, every row Applied |
| 1.5 | Check in Setup (Field Accessibility or the profile) | Same values as the preview |
| 1.6 | Undo these changes → apply the undo change set | Setup is back to the baseline of 0.4 |
| 1.7 | Prepare a change on 1 field, go to preview, **change the same field in Setup**, then apply | That row is a Conflict and is skipped; the others are Applied |
| 1.8 | Bulk: select a block of 20+ fields × 5+ PS with drag, Read & edit, apply | Completed; spot-check 3 cells in Setup |
| 1.9 | Repeat 1.3–1.5 in each matrix view (Grid, Focus, Map, Rules) | Same result in all four |

## 2. Apex class access

| # | Step | Expected |
|---|---|---|
| 2.1 | Open Apex classes | Classes load, managed ones tagged |
| 2.2 | Enable 2 classes for 1 PS, disable 1 class on 1 profile, apply | Completed; Setup → the PS/profile → Apex Class Access matches |
| 2.3 | Undo | Back to the starting state |

## 3. Page layout assignments

| # | Step | Expected |
|---|---|---|
| 3.1 | Layouts and pages → Account | Matrix profile × record type matches Setup → Page Layout Assignment |
| 3.2 | Edit assignments: change 2 cells, use Whole column… once, apply | Completed; Setup shows the new assignments |
| 3.3 | Repeat on a profile with special characters in the name (sandbox B) | Completed, or the refused row shows Salesforce's reason and the others are saved |
| 3.4 | Undo | Back to the starting assignments |
| 3.5 | Repeat 3.2 with the Brush and Board views | Same result |

## 4. Lightning page assignments

| # | Step | Expected |
|---|---|---|
| 4.1 | Lightning pages for an app with page overrides | Effective page per profile × record type matches Lightning App Builder → Activation |
| 4.2 | Change one assignment on **Desktop** only, apply | Completed; Activation shows the change for desktop only |
| 4.3 | Change one on **Phone** only, then one with "Apply each change to desktop and phone" | Completed; both form factors as requested |
| 4.4 | Remove a page override | Profile falls back to the app or org default, as the preview said |
| 4.5 | Retry the app that failed with `INVALID_CROSS_REFERENCE_KEY` (`Sales_Pilot_n`) | Completed, or the refused rows show which profile/page Salesforce rejects |
| 4.6 | Undo | Back to the starting state |

## 5. Restart during a run

| # | Step | Expected |
|---|---|---|
| 5.1 | Prepare a big FLS change (500+ rows), apply, and **stop the server (Ctrl+C) while it is running** | — |
| 5.2 | Start the server again, open the change set | It finishes by itself; the banner says it was resumed; no row is a conflict because of the restart |
| 5.3 | Check 5 rows in Setup | Match the requested values |
| 5.4 | Do the same with a layout assignment change set | Same |

## 6. Tokens and connection

| # | Step | Expected |
|---|---|---|
| 6.1 | Refresh token button on the org | Success message |
| 6.2 | In Salesforce, revoke the app's access (Setup → Connected Apps OAuth Usage or the user's OAuth connections) and reload the matrix | OrgFox asks to Reconnect; Reconnect works and keeps the alias |

## 7. Exports

| # | Step | Expected |
|---|---|---|
| 7.1 | Matrix → Export → Salesforce metadata (.zip) for 2 PS; deploy it to sandbox A with `sf project deploy start --metadata-dir` | Deploy succeeds; FLS matches |
| 7.2 | Excel and CSV exports of the matrix and of a change set | Files open in Excel; values match the screen |

## 8. Timing (write down the numbers)

| # | What | Record |
|---|---|---|
| 8.1 | Loading the FLS matrix on the largest object of sandbox B | seconds |
| 8.2 | Applying 500 FLS rows | seconds |
| 8.3 | Applying 20 page assignments (timings are shown in the result) | seconds per step |
