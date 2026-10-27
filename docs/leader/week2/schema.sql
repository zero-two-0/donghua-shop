-- 第2周交付：MySQL 8.0.16+ 空库初始化设计。仅生成，未经授权不执行。
-- 在用户自行创建并选定的空schema运行；不包含DROP/ALTER/真实迁移。
-- 不包含默认管理员密码：由course profile启动器读取显式COURSE_ADMIN_PASSWORD运行参数后创建。
-- 沿用MyBatis表字段；关系为逻辑外键，事务与Service保证聚合一致性。
SET NAMES utf8mb4;

CREATE TABLE `employee` (
  `id` BIGINT NOT NULL AUTO_INCREMENT,
  `username` VARCHAR(64) NOT NULL,
  `name` VARCHAR(64) NOT NULL,
  `password` VARCHAR(255) NOT NULL,
  `phone` VARCHAR(32) NULL,
  `sex` VARCHAR(2) NULL,
  `id_number` VARCHAR(32) NULL,
  `status` INT NOT NULL DEFAULT 0,
  `create_time` DATETIME NULL DEFAULT CURRENT_TIMESTAMP,
  `update_time` DATETIME NULL DEFAULT CURRENT_TIMESTAMP,
  `create_user` BIGINT NULL,
  `update_user` BIGINT NULL,
  PRIMARY KEY (id),
  UNIQUE KEY uk_employee_username (username),
  CONSTRAINT ck_employee_status CHECK (status IN (0,1))
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci COMMENT='员工';

CREATE TABLE `user` (
  `id` BIGINT NOT NULL AUTO_INCREMENT,
  `openid` VARCHAR(128) NOT NULL,
  `name` VARCHAR(64) NULL,
  `phone` VARCHAR(32) NULL,
  `sex` VARCHAR(2) NULL,
  `id_number` VARCHAR(32) NULL,
  `avatar` VARCHAR(512) NULL,
  `create_time` DATETIME NULL DEFAULT CURRENT_TIMESTAMP,
  PRIMARY KEY (id),
  UNIQUE KEY uk_user_openid (openid)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci COMMENT='用户';

CREATE TABLE `category` (
  `id` BIGINT NOT NULL AUTO_INCREMENT,
  `type` INT NOT NULL,
  `name` VARCHAR(64) NOT NULL,
  `sort` INT NOT NULL DEFAULT 0,
  `status` INT NOT NULL DEFAULT 0,
  `create_time` DATETIME NULL DEFAULT CURRENT_TIMESTAMP,
  `update_time` DATETIME NULL DEFAULT CURRENT_TIMESTAMP,
  `create_user` BIGINT NULL,
  `update_user` BIGINT NULL,
  PRIMARY KEY (id),
  UNIQUE KEY uk_category_type_name (type,name),
  KEY idx_category_type_status_sort (type,status,sort),
  CONSTRAINT ck_category_type CHECK (type IN (1,2)),
  CONSTRAINT ck_category_status CHECK (status IN (0,1))
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci COMMENT='分类';

CREATE TABLE `dish` (
  `id` BIGINT NOT NULL AUTO_INCREMENT,
  `name` VARCHAR(64) NOT NULL,
  `category_id` BIGINT NOT NULL,
  `price` DECIMAL(10,2) NOT NULL,
  `image` VARCHAR(512) NULL,
  `description` VARCHAR(512) NULL,
  `status` INT NOT NULL DEFAULT 0,
  `create_time` DATETIME NULL DEFAULT CURRENT_TIMESTAMP,
  `update_time` DATETIME NULL DEFAULT CURRENT_TIMESTAMP,
  `create_user` BIGINT NULL,
  `update_user` BIGINT NULL,
  PRIMARY KEY (id),
  KEY idx_dish_category_status (category_id,status),
  CONSTRAINT ck_dish_price CHECK (price >= 0),
  CONSTRAINT ck_dish_status CHECK (status IN (0,1))
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci COMMENT='菜品';

CREATE TABLE `dish_flavor` (
  `id` BIGINT NOT NULL AUTO_INCREMENT,
  `dish_id` BIGINT NOT NULL,
  `name` VARCHAR(64) NOT NULL,
  `value` VARCHAR(512) NOT NULL,
  PRIMARY KEY (id),
  KEY idx_flavor_dish (dish_id)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci COMMENT='菜品口味';

CREATE TABLE `setmeal` (
  `id` BIGINT NOT NULL AUTO_INCREMENT,
  `category_id` BIGINT NOT NULL,
  `name` VARCHAR(64) NOT NULL,
  `price` DECIMAL(10,2) NOT NULL,
  `status` INT NOT NULL DEFAULT 0,
  `description` VARCHAR(512) NULL,
  `image` VARCHAR(512) NULL,
  `create_time` DATETIME NULL DEFAULT CURRENT_TIMESTAMP,
  `update_time` DATETIME NULL DEFAULT CURRENT_TIMESTAMP,
  `create_user` BIGINT NULL,
  `update_user` BIGINT NULL,
  PRIMARY KEY (id),
  KEY idx_setmeal_category_status (category_id,status),
  CONSTRAINT ck_setmeal_price CHECK (price >= 0),
  CONSTRAINT ck_setmeal_status CHECK (status IN (0,1))
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci COMMENT='套餐';

CREATE TABLE `setmeal_dish` (
  `id` BIGINT NOT NULL AUTO_INCREMENT,
  `setmeal_id` BIGINT NOT NULL,
  `dish_id` BIGINT NOT NULL,
  `name` VARCHAR(64) NOT NULL,
  `price` DECIMAL(10,2) NOT NULL,
  `copies` INT NOT NULL,
  PRIMARY KEY (id),
  UNIQUE KEY uk_setmeal_dish (setmeal_id,dish_id),
  KEY idx_sd_dish (dish_id),
  CONSTRAINT ck_sd_copies CHECK (copies > 0)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci COMMENT='套餐菜品关系';

CREATE TABLE `address_book` (
  `id` BIGINT NOT NULL AUTO_INCREMENT,
  `user_id` BIGINT NOT NULL,
  `consignee` VARCHAR(64) NOT NULL,
  `phone` VARCHAR(32) NOT NULL,
  `sex` VARCHAR(2) NULL,
  `province_code` VARCHAR(16) NULL,
  `province_name` VARCHAR(64) NULL,
  `city_code` VARCHAR(16) NULL,
  `city_name` VARCHAR(64) NULL,
  `district_code` VARCHAR(16) NULL,
  `district_name` VARCHAR(64) NULL,
  `detail` VARCHAR(255) NOT NULL,
  `label` VARCHAR(32) NULL,
  `is_default` INT NOT NULL DEFAULT 0,
  PRIMARY KEY (id),
  KEY idx_address_user_default (user_id,is_default),
  CONSTRAINT ck_address_default CHECK (is_default IN (0,1))
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci COMMENT='地址簿';

CREATE TABLE `shopping_cart` (
  `id` BIGINT NOT NULL AUTO_INCREMENT,
  `name` VARCHAR(64) NOT NULL,
  `user_id` BIGINT NOT NULL,
  `dish_id` BIGINT NULL,
  `setmeal_id` BIGINT NULL,
  `dish_flavor` VARCHAR(512) NULL,
  `number` INT NOT NULL,
  `amount` DECIMAL(10,2) NOT NULL,
  `image` VARCHAR(512) NULL,
  `create_time` DATETIME NULL DEFAULT CURRENT_TIMESTAMP,
  PRIMARY KEY (id),
  KEY idx_cart_user (user_id),
  KEY idx_cart_item (user_id,dish_id,setmeal_id),
  CONSTRAINT ck_cart_item CHECK ((dish_id IS NULL) <> (setmeal_id IS NULL)),
  CONSTRAINT ck_cart_number CHECK (number BETWEEN 1 AND 99),
  CONSTRAINT ck_cart_amount CHECK (amount >= 0)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci COMMENT='购物车';

CREATE TABLE `orders` (
  `id` BIGINT NOT NULL AUTO_INCREMENT,
  `number` VARCHAR(64) NOT NULL,
  `status` INT NOT NULL DEFAULT 1,
  `user_id` BIGINT NOT NULL,
  `address_book_id` BIGINT NOT NULL,
  `order_time` DATETIME NOT NULL,
  `checkout_time` DATETIME NULL,
  `pay_method` INT NOT NULL,
  `pay_status` INT NOT NULL DEFAULT 0,
  `amount` DECIMAL(10,2) NOT NULL,
  `remark` VARCHAR(512) NULL,
  `user_name` VARCHAR(64) NULL,
  `phone` VARCHAR(32) NULL,
  `address` VARCHAR(512) NULL,
  `consignee` VARCHAR(64) NULL,
  `cancel_reason` VARCHAR(255) NULL,
  `rejection_reason` VARCHAR(255) NULL,
  `cancel_time` DATETIME NULL,
  `estimated_delivery_time` DATETIME NULL,
  `delivery_status` INT NULL,
  `delivery_time` DATETIME NULL,
  `pack_amount` INT NOT NULL DEFAULT 0,
  `tableware_number` INT NOT NULL DEFAULT 0,
  `tableware_status` INT NULL,
  PRIMARY KEY (id),
  UNIQUE KEY uk_orders_number (number),
  KEY idx_orders_user_time (user_id,order_time),
  KEY idx_orders_status_time (status,order_time),
  CONSTRAINT ck_orders_status CHECK (status BETWEEN 1 AND 6),
  CONSTRAINT ck_orders_pay CHECK (pay_status IN (0,1,2)),
  CONSTRAINT ck_orders_amount CHECK (amount >= 0)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci COMMENT='订单';

CREATE TABLE `order_detail` (
  `id` BIGINT NOT NULL AUTO_INCREMENT,
  `name` VARCHAR(64) NOT NULL,
  `order_id` BIGINT NOT NULL,
  `dish_id` BIGINT NULL,
  `setmeal_id` BIGINT NULL,
  `dish_flavor` VARCHAR(512) NULL,
  `number` INT NOT NULL,
  `amount` DECIMAL(10,2) NOT NULL,
  `image` VARCHAR(512) NULL,
  PRIMARY KEY (id),
  KEY idx_detail_order (order_id),
  CONSTRAINT ck_detail_item CHECK ((dish_id IS NULL) <> (setmeal_id IS NULL)),
  CONSTRAINT ck_detail_number CHECK (number > 0),
  CONSTRAINT ck_detail_amount CHECK (amount >= 0)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci COMMENT='订单明细';

-- 以下全部为虚构演示素材与测试身份，不含真实个人信息。
INSERT INTO `user` (id,openid,name,create_time) VALUES (1,'course:demo-user','演示用户一',CURRENT_TIMESTAMP),(2,'course:demo-user-2','演示用户二',CURRENT_TIMESTAMP);
INSERT INTO category (id,type,name,sort,status) VALUES (1,1,'课程热菜',1,1),(2,2,'课程套餐',2,1);
INSERT INTO dish (id,name,category_id,price,image,description,status) VALUES (1,'宫保鸡丁',1,18.00,'/assets/dish-1.svg','课程演示菜品，可替换为复用素材',1),(2,'番茄炒蛋',1,12.00,'/assets/dish-2.svg','课程演示菜品',1);
INSERT INTO dish_flavor (dish_id,name,value) VALUES (1,'辣度','["不辣","微辣","中辣"]');
INSERT INTO setmeal (id,category_id,name,price,status,description,image) VALUES (1,2,'双人演示套餐',28.00,1,'宫保鸡丁与番茄炒蛋组合','/assets/setmeal-1.svg');
INSERT INTO setmeal_dish (setmeal_id,dish_id,name,price,copies) VALUES (1,1,'宫保鸡丁',18.00,1),(1,2,'番茄炒蛋',12.00,1);
INSERT INTO address_book (id,user_id,consignee,phone,detail,label,is_default) VALUES (1,1,'演示收货人','00000000000','课程测试地址一','学校',1),(2,2,'演示收货人二','00000000000','课程测试地址二','学校',1);
