# Web Shell Boundary

`RF-83` introduces `apps/web` as the stable workspace identity for the RecruitFlow web shell.

Current state:
- the live Next.js source still remains at the repository root
- this package acts as the workspace boundary and startup target for web scripts
- later cutover work can move source files under `apps/web` without changing the command surface again

For this branch, treat the repository root as the temporary implementation location for the web shell and `apps/web` as the official package boundary.
