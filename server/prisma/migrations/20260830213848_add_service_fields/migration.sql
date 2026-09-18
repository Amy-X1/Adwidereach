-- AlterTable
ALTER TABLE "Service" ADD COLUMN "category" TEXT;
ALTER TABLE "Service" ADD COLUMN "imageUrl" TEXT;
ALTER TABLE "Service" ADD COLUMN "requirements" TEXT;

-- RedefineTables
PRAGMA defer_foreign_keys=ON;
PRAGMA foreign_keys=OFF;
CREATE TABLE "new_Order" (
    "isActive" BOOLEAN NOT NULL DEFAULT true,
    "features" TEXT,
    "id" INTEGER NOT NULL PRIMARY KEY AUTOINCREMENT,
    "userId" INTEGER NOT NULL,
    "total" REAL NOT NULL,
    "currency" TEXT NOT NULL DEFAULT 'NGN',
    "status" TEXT NOT NULL DEFAULT 'PENDING',
    "reference" TEXT NOT NULL,
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" DATETIME NOT NULL,
    CONSTRAINT "Order_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User" ("id") ON DELETE CASCADE ON UPDATE CASCADE
);
INSERT INTO "new_Order" ("createdAt", "currency", "id", "reference", "status", "total", "updatedAt", "userId") SELECT "createdAt", "currency", "id", "reference", "status", "total", "updatedAt", "userId" FROM "Order";
DROP TABLE "Order";
ALTER TABLE "new_Order" RENAME TO "Order";
CREATE UNIQUE INDEX "Order_reference_key" ON "Order"("reference");
CREATE INDEX "Order_userId_idx" ON "Order"("userId");
CREATE TABLE "new_ServicePackage" (
    "id" INTEGER NOT NULL PRIMARY KEY AUTOINCREMENT,
    "serviceId" INTEGER NOT NULL,
    "name" TEXT NOT NULL,
    "imageUrl" TEXT,
    "category" TEXT,
    "requirements" TEXT,
    "price" REAL NOT NULL,
    "deliveryDays" INTEGER NOT NULL,
    "details" TEXT,
    "isActive" BOOLEAN NOT NULL DEFAULT true,
    "features" TEXT,
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT "ServicePackage_serviceId_fkey" FOREIGN KEY ("serviceId") REFERENCES "Service" ("id") ON DELETE CASCADE ON UPDATE CASCADE
);
INSERT INTO "new_ServicePackage" ("createdAt", "deliveryDays", "details", "id", "name", "price", "serviceId") SELECT "createdAt", "deliveryDays", "details", "id", "name", "price", "serviceId" FROM "ServicePackage";
DROP TABLE "ServicePackage";
ALTER TABLE "new_ServicePackage" RENAME TO "ServicePackage";
CREATE INDEX "ServicePackage_serviceId_idx" ON "ServicePackage"("serviceId");
PRAGMA foreign_keys=ON;
PRAGMA defer_foreign_keys=OFF;
