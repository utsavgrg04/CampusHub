# CampusHub final workspace status

The workspace has two project folders: `CampusHub-Final-Working` and `CampusHub-Old-Backup`.

## Final project

The final project combines the currently served frontend with the compatible `_campushub_auth_stage` backend, auth libraries, local dependencies, `.env`, API routes, and SQLite database. Public JavaScript module references were scanned: 36 local imports resolve inside this folder; `node_modules` and package manifests are also local. No project source dependency points to a previous project folder.

The server was verified running at `http://127.0.0.1:3187` using `DB_PATH` set to this folder's `campus.db`. Frontend and health endpoints returned HTTP 200. SQLite integrity is `ok`; counts are 13 users, 13 events, and 1,286 items. Pre/post startup record digests and auth access aggregates matched. Google/Microsoft OAuth and authenticated Geoapify calls remain pending provider credentials and a real authorized test account.

The additional pre-startup DB safety copy is `campus.pre-auth-migration-backup.db`. Startup command for the isolated verification port:

```powershell
cd "C:\Users\admin\Downloads\campushub final\CampusHub-Organized\CampusHub-Final-Working"
$env:PORT = "3187"
$env:HOST = "127.0.0.1"
$env:DB_PATH = (Join-Path (Get-Location).Path "campus.db")
npm start
```

## Backup and original folders

All known in-workspace project trees have byte/hash-verified copies in `CampusHub-Old-Backup`: `advance lena mat bhulnaa`, `CampusHub-live`, `_campushub_auth_stage`, and `_campushub_auth_mods`. Their original copies remain at the workspace root, untouched. Historical root databases, archives, logs, and metadata are preserved under `Other-Previous-Files`. `__MACOSX` also has a complete extra copy under `MacOS-Metadata-Complete-2026-10-15` because the earlier metadata archive was missing three long-path entries.

The original running project at `C:\Users\admin\Downloads\CampusHub-project-main\CampusHub-project-main` remains untouched because PID 22148 serves port 3000 from that directory. A complete additive backup is at `CampusHub-Old-Backup/Other-Previous-Files/Original-Running-Project-2026-10-15`. Project files were copied without the open SQLite file, then `campus.db` was copied with SQLite's online backup API and passed integrity/count checks. Do not relocate or change the original project until a separately approved cutover.

The folders left outside `CampusHub-Organized` are retained originals, not missing backups. They remain in place so no source used by the running app is disturbed.
