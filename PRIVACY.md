# Your data in Take Control
Budget calculations run on this device. Budgets, names and your optional profile photo are stored in this browser. There is no cloud account, bank connection, or automatic cross-device synchronization in this version. The hosting provider receives normal web-request metadata when serving the app.

Browser budget storage is **unencrypted by default**. In Settings → Budget protection and backups, you can enable an AES-256-GCM vault with a password. Enabling verifies encrypted data before removing the plaintext budget. Reloading, locking, or 15 minutes of inactivity requires the password again. Unlock keys remain only in memory; there is no password reset. A browser-data copy of a locked vault contains ciphertext. Scripts executing while the vault is unlocked can still access budget data. Anyone able to use this browser profile, or scripts running on the same website origin, may be able to read it. Selecting a person or avatar is not authentication. Use your device lock and a private browser profile.

New backup files use the same Take Control password as device encryption. While unlocked, the app creates backups using its in-memory encryption key without retaining or asking again for the password. Existing backups retain their original passwords. New backup files use password-based authenticated encryption. Keep the password separately in a password manager: there is no password recovery. Test restoring your backup before relying on it. Downloading or sharing a file does not prove it was saved successfully. The file includes your budget, names and optional photo.

Manual “Copy my data” synchronization is unencrypted and includes the same sensitive information. The app asks before copying. Avoid shared clipboards and public destinations. Older JSON backups remain unencrypted; importing one requires a warning and validation.

Clearing browser storage, losing the device or changing the website address can remove access to your budget. An encrypted backup and its password are required for recovery. Backups do not migrate automatically to a new website address.

Report security concerns privately to the repository owner through GitHub's private vulnerability reporting feature when enabled. Never attach real budgets, passwords or profile pictures to public issues.
