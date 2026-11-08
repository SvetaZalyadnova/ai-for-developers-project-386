# Domain Docs

Use the following layout for domain documentation. This repository is single-context.

## Before exploring a domain

- Read the root `GLOSSARY.md` if it exists. If `GLOSSARY-MAP.md` exists instead, read the glossary for the relevant context.
- Read relevant decisions in `docs/adr/` before making changes in that area.
- If these files do not exist, proceed without flagging their absence. Create them when terms or decisions are resolved through domain-modeling work.

## Use the glossary's vocabulary

Use terms as defined in the relevant glossary in issue titles, proposals, and test names. If a needed concept is missing, note it for domain-modeling.

## Flag ADR conflicts

If a proposal conflicts with an existing ADR, identify the ADR and explain the conflict instead of silently overriding it.