-- RedefineTables
PRAGMA defer_foreign_keys=ON;
PRAGMA foreign_keys=OFF;
CREATE TABLE "new_guests" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "email" TEXT NOT NULL,
    "firstName" TEXT NOT NULL,
    "lastName" TEXT NOT NULL,
    "company" TEXT,
    "position" TEXT,
    "phone" TEXT,
    "isVip" BOOLEAN NOT NULL DEFAULT false,
    "isPlusOne" BOOLEAN NOT NULL DEFAULT false,
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" DATETIME NOT NULL
);
INSERT INTO "new_guests" ("company", "createdAt", "email", "firstName", "id", "isVip", "lastName", "phone", "position", "updatedAt") SELECT "company", "createdAt", "email", "firstName", "id", "isVip", "lastName", "phone", "position", "updatedAt" FROM "guests";
DROP TABLE "guests";
ALTER TABLE "new_guests" RENAME TO "guests";
CREATE UNIQUE INDEX "guests_email_key" ON "guests"("email");
PRAGMA foreign_keys=ON;
PRAGMA defer_foreign_keys=OFF;
