-- CreateTable
CREATE TABLE "User" (
    "database_id" INTEGER NOT NULL PRIMARY KEY AUTOINCREMENT,
    "id" TEXT NOT NULL,
    "pix_id" TEXT NOT NULL,
    "name" TEXT,
    "authorized" BOOLEAN DEFAULT false,
    "blacklisted" BOOLEAN DEFAULT false,
    "premium" BOOLEAN DEFAULT false,
    "role" TEXT DEFAULT 'USER',
    "created" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated" DATETIME NOT NULL,
    "config_id" TEXT NOT NULL,
    "stats_id" TEXT NOT NULL,
    CONSTRAINT "User_config_id_fkey" FOREIGN KEY ("config_id") REFERENCES "Config" ("config_id") ON DELETE RESTRICT ON UPDATE CASCADE,
    CONSTRAINT "User_stats_id_fkey" FOREIGN KEY ("stats_id") REFERENCES "Stats" ("stats_id") ON DELETE RESTRICT ON UPDATE CASCADE
);

-- CreateTable
CREATE TABLE "Stats" (
    "stats_id" TEXT NOT NULL PRIMARY KEY,
    "hangman" JSONB,
    "ttt" JSONB,
    "stickers" INTEGER NOT NULL DEFAULT 0
);

-- CreateTable
CREATE TABLE "Config" (
    "config_id" TEXT NOT NULL PRIMARY KEY,
    "user_ratio" TEXT NOT NULL DEFAULT 'RATIO_1_1',
    "auto_sticker" BOOLEAN NOT NULL DEFAULT false,
    "commands_used" INTEGER NOT NULL DEFAULT 0
);

-- CreateTable
CREATE TABLE "Transaction" (
    "transaction_id" INTEGER NOT NULL PRIMARY KEY AUTOINCREMENT,
    "sender_id" INTEGER,
    "receiver_id" INTEGER,
    "amount" INTEGER NOT NULL,
    "type" TEXT NOT NULL,
    "created_at" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT "Transaction_sender_id_fkey" FOREIGN KEY ("sender_id") REFERENCES "User" ("database_id") ON DELETE SET NULL ON UPDATE CASCADE,
    CONSTRAINT "Transaction_receiver_id_fkey" FOREIGN KEY ("receiver_id") REFERENCES "User" ("database_id") ON DELETE SET NULL ON UPDATE CASCADE
);

-- CreateTable
CREATE TABLE "Marriage" (
    "marriage_id" INTEGER NOT NULL PRIMARY KEY AUTOINCREMENT,
    "partner1ID" TEXT NOT NULL,
    "partner2ID" TEXT NOT NULL,
    "status" TEXT NOT NULL DEFAULT 'SINGLE',
    "since" DATETIME,
    "divorceRequested" BOOLEAN DEFAULT false,
    "divorceRequesterID" INTEGER,
    CONSTRAINT "Marriage_divorceRequesterID_fkey" FOREIGN KEY ("divorceRequesterID") REFERENCES "User" ("database_id") ON DELETE SET NULL ON UPDATE CASCADE,
    CONSTRAINT "Marriage_partner1ID_fkey" FOREIGN KEY ("partner1ID") REFERENCES "User" ("id") ON DELETE RESTRICT ON UPDATE CASCADE,
    CONSTRAINT "Marriage_partner2ID_fkey" FOREIGN KEY ("partner2ID") REFERENCES "User" ("id") ON DELETE RESTRICT ON UPDATE CASCADE
);

-- CreateTable
CREATE TABLE "Group" (
    "database_id" INTEGER NOT NULL PRIMARY KEY AUTOINCREMENT,
    "group_id" TEXT NOT NULL,
    "name" TEXT,
    "autosticker" BOOLEAN NOT NULL DEFAULT false,
    "prefix" TEXT NOT NULL DEFAULT '.',
    "members" INTEGER NOT NULL DEFAULT 0,
    "last_activity" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "hangman" JSONB,
    "ttt" JSONB
);

-- CreateTable
CREATE TABLE "GroupUser" (
    "user_id" INTEGER NOT NULL,
    "group_id" INTEGER NOT NULL,
    "messages" INTEGER NOT NULL DEFAULT 0,

    PRIMARY KEY ("user_id", "group_id"),
    CONSTRAINT "GroupUser_user_id_fkey" FOREIGN KEY ("user_id") REFERENCES "User" ("database_id") ON DELETE RESTRICT ON UPDATE CASCADE,
    CONSTRAINT "GroupUser_group_id_fkey" FOREIGN KEY ("group_id") REFERENCES "Group" ("database_id") ON DELETE RESTRICT ON UPDATE CASCADE
);

-- CreateTable
CREATE TABLE "ScheduledPix" (
    "pix_id" TEXT NOT NULL,
    "amount" INTEGER NOT NULL DEFAULT 0,
    "senderID" INTEGER,
    "receiverID" INTEGER,
    "schedule_time" DATETIME,
    CONSTRAINT "ScheduledPix_senderID_fkey" FOREIGN KEY ("senderID") REFERENCES "User" ("database_id") ON DELETE SET NULL ON UPDATE CASCADE,
    CONSTRAINT "ScheduledPix_receiverID_fkey" FOREIGN KEY ("receiverID") REFERENCES "User" ("database_id") ON DELETE SET NULL ON UPDATE CASCADE
);

-- CreateTable
CREATE TABLE "_GroupToUser" (
    "A" INTEGER NOT NULL,
    "B" INTEGER NOT NULL,
    CONSTRAINT "_GroupToUser_A_fkey" FOREIGN KEY ("A") REFERENCES "Group" ("database_id") ON DELETE CASCADE ON UPDATE CASCADE,
    CONSTRAINT "_GroupToUser_B_fkey" FOREIGN KEY ("B") REFERENCES "User" ("database_id") ON DELETE CASCADE ON UPDATE CASCADE
);

-- CreateIndex
CREATE UNIQUE INDEX "User_id_key" ON "User"("id");

-- CreateIndex
CREATE UNIQUE INDEX "User_pix_id_key" ON "User"("pix_id");

-- CreateIndex
CREATE UNIQUE INDEX "User_config_id_key" ON "User"("config_id");

-- CreateIndex
CREATE UNIQUE INDEX "User_stats_id_key" ON "User"("stats_id");

-- CreateIndex
CREATE UNIQUE INDEX "Marriage_divorceRequesterID_key" ON "Marriage"("divorceRequesterID");

-- CreateIndex
CREATE UNIQUE INDEX "Group_group_id_key" ON "Group"("group_id");

-- CreateIndex
CREATE UNIQUE INDEX "ScheduledPix_pix_id_key" ON "ScheduledPix"("pix_id");

-- CreateIndex
CREATE UNIQUE INDEX "_GroupToUser_AB_unique" ON "_GroupToUser"("A", "B");

-- CreateIndex
CREATE INDEX "_GroupToUser_B_index" ON "_GroupToUser"("B");
