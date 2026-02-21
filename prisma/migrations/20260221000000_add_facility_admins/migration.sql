-- CreateTable
CREATE TABLE `facility_admins` (
    `id` BIGINT UNSIGNED NOT NULL AUTO_INCREMENT,
    `facility_id` BIGINT UNSIGNED NOT NULL,
    `admin_user_id` BIGINT UNSIGNED NOT NULL,
    `created_at` DATETIME(0) NOT NULL DEFAULT CURRENT_TIMESTAMP(0),
    `updated_at` DATETIME(0) NOT NULL DEFAULT CURRENT_TIMESTAMP(0) ON UPDATE CURRENT_TIMESTAMP(0),

    UNIQUE INDEX `uq_facility_admin`(`facility_id`, `admin_user_id`),
    INDEX `idx_facility_admin_facility`(`facility_id`),
    INDEX `idx_facility_admin_user`(`admin_user_id`),
    PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- AddForeignKey
ALTER TABLE `facility_admins` ADD CONSTRAINT `fk_facility_admin_facility` FOREIGN KEY (`facility_id`) REFERENCES `facilities`(`facility_id`) ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `facility_admins` ADD CONSTRAINT `fk_facility_admin_user` FOREIGN KEY (`admin_user_id`) REFERENCES `users`(`user_id`) ON DELETE CASCADE ON UPDATE CASCADE;
