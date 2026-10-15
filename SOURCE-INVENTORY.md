# Source inventory and archive map

| Item | Location | Status |
|---|---|---|
| Final working project | `CampusHub-Final-Working/` | Latest current frontend, compatible auth-stage backend, local dependencies/configuration, and SQLite data copy. Independently served on port 3187. |
| Final DB pre-migration copy | `CampusHub-Final-Working/campus.db` | Integrity `ok`; 13 users, 13 events, 1,286 items. |
| Final DB extra safety backup | `CampusHub-Final-Working/campus.pre-auth-migration-backup.db` | SQLite online backup made before final startup migration; integrity `ok`. |
| Running project backup | `CampusHub-Old-Backup/Other-Previous-Files/Original-Running-Project-2026-10-15/` | Complete source/dependency/config copy; its DB is SQLite online backup. |
| Prior source trees | `CampusHub-Old-Backup/Old-Version-1-Project-Main/`, `Old-Version-2-CampusHub-Live/`, `Old-Version-3-Auth-Stage/`, `Other-Previous-Files/Auth-Mods/` | Copies verified against original trees; all originals remain in place outside `CampusHub-Organized`. |
| Previous provisional final | `CampusHub-Old-Backup/Provisional-Final-Working-2026-10-15/` | Preserved before promotion of the final project. |
| Root database/archive/log history | `CampusHub-Old-Backup/Other-Previous-Files/` | Historical/test databases, zip archive, previous live DB backup, and preview logs preserved. |
| macOS archive metadata | `CampusHub-Old-Backup/Other-Previous-Files/MacOS-Metadata-Complete-2026-10-15/` | Complete copy; earlier `MacOS-Metadata/` copy is retained too. |

See `CONSOLIDATION-NOTES.md` and `CampusHub-Old-Backup/README.md` for exact original paths and verification status.
