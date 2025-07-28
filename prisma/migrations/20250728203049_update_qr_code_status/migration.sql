/*
  Warnings:

  - You are about to drop the column `isUsed` on the `qr_codes` table. All the data in the column will be lost.

*/
-- RedefineTables
PRAGMA defer_foreign_keys=ON;
PRAGMA foreign_keys=OFF;
CREATE TABLE "new_qr_codes" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "code" TEXT NOT NULL,
    "type" TEXT NOT NULL,
    "status" TEXT NOT NULL DEFAULT 'CREATED',
    "usedAt" DATETIME,
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "guestId" TEXT NOT NULL,
    "eventId" TEXT NOT NULL,
    CONSTRAINT "qr_codes_guestId_fkey" FOREIGN KEY ("guestId") REFERENCES "guests" ("id") ON DELETE CASCADE ON UPDATE CASCADE,
    CONSTRAINT "qr_codes_eventId_fkey" FOREIGN KEY ("eventId") REFERENCES "events" ("id") ON DELETE CASCADE ON UPDATE CASCADE
);
INSERT INTO "new_qr_codes" ("code", "createdAt", "eventId", "guestId", "id", "type", "usedAt") SELECT "code", "createdAt", "eventId", "guestId", "id", "type", "usedAt" FROM "qr_codes";
DROP TABLE "qr_codes";
ALTER TABLE "new_qr_codes" RENAME TO "qr_codes";
CREATE UNIQUE INDEX "qr_codes_code_key" ON "qr_codes"("code");
PRAGMA foreign_keys=ON;
PRAGMA defer_foreign_keys=OFF;
