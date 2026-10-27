-- 状态：组员第 2 周草案（已归档）。组长正式建表脚本为 docs/leader/week2/schema.sql（库 takeout_course），
-- 本文件仅作过程留痕；实际运行请用 scripts/db-init-backend.ps1。

-- =============================================================
-- 东华大学在线点餐系统 · 数据库建表脚本（评审版 v0.3）
-- 目标库：donghua_shop    字符集：utf8mb4    引擎：InnoDB
-- 说明：
--   1. 表结构与字段命名对齐“苍穹外卖”参考素材，便于组长复用其 SQL/DTO/VO；
--   2. 本版本由组员钱文博按前端页面字段需求整理，未经组长评审前不作为冻结依据；
--   3. 金额统一 DECIMAL(10,2)，时间统一 DATETIME，逻辑删除仅用于员工账号。
-- 执行：mysql -uroot -p < schema.sql
-- =============================================================

SET NAMES utf8mb4;
SET FOREIGN_KEY_CHECKS = 0;

CREATE DATABASE IF NOT EXISTS `donghua_shop`
  DEFAULT CHARACTER SET utf8mb4
  DEFAULT COLLATE utf8mb4_general_ci;

USE `donghua_shop`;

-- -------------------------------------------------------------
-- 1. 员工（管理端登录主体）
-- -------------------------------------------------------------
DROP TABLE IF EXISTS `employee`;
CREATE TABLE `employee` (
  `id`          BIGINT       NOT NULL AUTO_INCREMENT COMMENT '主键',
  `name`        VARCHAR(32)  NOT NULL COMMENT '姓名',
  `username`    VARCHAR(32)  NOT NULL COMMENT '登录账号',
  `password`    VARCHAR(64)  NOT NULL COMMENT '密码：MD5(明文)，不存明文',
  `phone`       VARCHAR(11)  NOT NULL COMMENT '手机号',
  `sex`         CHAR(2)      NOT NULL DEFAULT '1' COMMENT '性别 1男 2女',
  `id_number`   VARCHAR(18)  NOT NULL COMMENT '身份证号',
  `status`      TINYINT      NOT NULL DEFAULT 1 COMMENT '账号状态 1启用 0禁用',
  `create_time` DATETIME     NOT NULL DEFAULT CURRENT_TIMESTAMP,
  `update_time` DATETIME     NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  `create_user` BIGINT       NOT NULL DEFAULT 1 COMMENT '创建人',
  `update_user` BIGINT       NOT NULL DEFAULT 1 COMMENT '最后修改人',
  PRIMARY KEY (`id`),
  UNIQUE KEY `uk_employee_username` (`username`)
) ENGINE = InnoDB DEFAULT CHARSET = utf8mb4 COMMENT = '员工信息';

-- -------------------------------------------------------------
-- 2. 分类（菜品分类 / 套餐分类，两端共用）
-- -------------------------------------------------------------
DROP TABLE IF EXISTS `category`;
CREATE TABLE `category` (
  `id`          BIGINT      NOT NULL AUTO_INCREMENT COMMENT '主键',
  `type`        TINYINT     NOT NULL COMMENT '类型 1菜品分类 2套餐分类',
  `name`        VARCHAR(32) NOT NULL COMMENT '分类名称',
  `sort`        INT         NOT NULL DEFAULT 0 COMMENT '排序，升序',
  `status`      TINYINT     NOT NULL DEFAULT 1 COMMENT '状态 1启用 0禁用',
  `create_time` DATETIME    NOT NULL DEFAULT CURRENT_TIMESTAMP,
  `update_time` DATETIME    NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  `create_user` BIGINT      NOT NULL DEFAULT 1,
  `update_user` BIGINT      NOT NULL DEFAULT 1,
  PRIMARY KEY (`id`),
  UNIQUE KEY `uk_category_name_type` (`name`, `type`),
  KEY `idx_category_type` (`type`)
) ENGINE = InnoDB DEFAULT CHARSET = utf8mb4 COMMENT = '菜品及套餐分类';

-- -------------------------------------------------------------
-- 3. 菜品
-- -------------------------------------------------------------
DROP TABLE IF EXISTS `dish`;
CREATE TABLE `dish` (
  `id`          BIGINT        NOT NULL AUTO_INCREMENT,
  `name`        VARCHAR(64)   NOT NULL COMMENT '菜品名称',
  `category_id` BIGINT        NOT NULL COMMENT '所属分类 id',
  `price`       DECIMAL(10,2) NOT NULL COMMENT '单价（元）',
  `image`       VARCHAR(255)  DEFAULT NULL COMMENT '图片 URL',
  `description` VARCHAR(255)  DEFAULT NULL COMMENT '描述',
  `status`      TINYINT       NOT NULL DEFAULT 1 COMMENT '1起售 0停售',
  `create_time` DATETIME      NOT NULL DEFAULT CURRENT_TIMESTAMP,
  `update_time` DATETIME      NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  `create_user` BIGINT        NOT NULL DEFAULT 1,
  `update_user` BIGINT        NOT NULL DEFAULT 1,
  PRIMARY KEY (`id`),
  KEY `idx_dish_category` (`category_id`),
  KEY `idx_dish_status_name` (`status`, `name`)
) ENGINE = InnoDB DEFAULT CHARSET = utf8mb4 COMMENT = '菜品';

-- -------------------------------------------------------------
-- 4. 菜品口味（多值：如 辣度/甜度/忌口）
-- -------------------------------------------------------------
DROP TABLE IF EXISTS `dish_flavor`;
CREATE TABLE `dish_flavor` (
  `id`      BIGINT      NOT NULL AUTO_INCREMENT,
  `dish_id` BIGINT      NOT NULL,
  `name`    VARCHAR(32) NOT NULL COMMENT '口味名，如 辣度',
  `value`   VARCHAR(64) NOT NULL COMMENT '口味值，逗号分隔，如 不辣,微辣,中辣',
  PRIMARY KEY (`id`),
  KEY `idx_flavor_dish` (`dish_id`)
) ENGINE = InnoDB DEFAULT CHARSET = utf8mb4 COMMENT = '菜品口味';

-- -------------------------------------------------------------
-- 5. 套餐及套餐-菜品关系
-- -------------------------------------------------------------
DROP TABLE IF EXISTS `setmeal`;
CREATE TABLE `setmeal` (
  `id`          BIGINT        NOT NULL AUTO_INCREMENT,
  `category_id` BIGINT        NOT NULL COMMENT '套餐分类 id（category.type=2）',
  `name`        VARCHAR(64)   NOT NULL,
  `price`       DECIMAL(10,2) NOT NULL,
  `status`      TINYINT       NOT NULL DEFAULT 1 COMMENT '1起售 0停售',
  `description` VARCHAR(255)  DEFAULT NULL,
  `image`       VARCHAR(255)  DEFAULT NULL,
  `create_time` DATETIME      NOT NULL DEFAULT CURRENT_TIMESTAMP,
  `update_time` DATETIME      NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  `create_user` BIGINT        NOT NULL DEFAULT 1,
  `update_user` BIGINT        NOT NULL DEFAULT 1,
  PRIMARY KEY (`id`),
  UNIQUE KEY `uk_setmeal_name` (`name`),
  KEY `idx_setmeal_category` (`category_id`)
) ENGINE = InnoDB DEFAULT CHARSET = utf8mb4 COMMENT = '套餐';

DROP TABLE IF EXISTS `setmeal_dish`;
CREATE TABLE `setmeal_dish` (
  `id`        BIGINT      NOT NULL AUTO_INCREMENT,
  `setmeal_id` BIGINT     NOT NULL,
  `dish_id`   BIGINT      NOT NULL,
  `name`      VARCHAR(64) NOT NULL COMMENT '菜品名称冗余，便于展示',
  `price`     DECIMAL(10,2) NOT NULL COMMENT '菜品单价冗余',
  `copies`    INT         NOT NULL DEFAULT 1 COMMENT '份数',
  PRIMARY KEY (`id`),
  KEY `idx_setmeal_dish_id` (`setmeal_id`)
) ENGINE = InnoDB DEFAULT CHARSET = utf8mb4 COMMENT = '套餐包含的菜品';

-- -------------------------------------------------------------
-- 6. 用户（C 端，课程内使用测试账号，openid 由后端生成）
-- -------------------------------------------------------------
DROP TABLE IF EXISTS `user`;
CREATE TABLE `user` (
  `id`          BIGINT      NOT NULL AUTO_INCREMENT,
  `openid`      VARCHAR(64) NOT NULL COMMENT '模拟微信身份标识，课程内由后端生成',
  `name`        VARCHAR(32)  DEFAULT NULL,
  `phone`       VARCHAR(11)  DEFAULT NULL,
  `sex`         CHAR(2)      DEFAULT NULL COMMENT '1男 2女',
  `id_number`   VARCHAR(18)  DEFAULT NULL,
  `avatar`      VARCHAR(255) DEFAULT NULL,
  `create_time` DATETIME    NOT NULL DEFAULT CURRENT_TIMESTAMP,
  PRIMARY KEY (`id`),
  UNIQUE KEY `uk_user_openid` (`openid`)
) ENGINE = InnoDB DEFAULT CHARSET = utf8mb4 COMMENT = '用户';

-- -------------------------------------------------------------
-- 7. 收货地址
-- -------------------------------------------------------------
DROP TABLE IF EXISTS `address_book`;
CREATE TABLE `address_book` (
  `id`            BIGINT      NOT NULL AUTO_INCREMENT,
  `user_id`       BIGINT      NOT NULL COMMENT '归属用户，受保护接口必须校验',
  `consignee`     VARCHAR(50) NOT NULL COMMENT '收货人',
  `sex`           CHAR(2)     DEFAULT NULL,
  `phone`         VARCHAR(11) NOT NULL,
  `province_code` VARCHAR(12) DEFAULT NULL,
  `province_name` VARCHAR(32) DEFAULT NULL,
  `city_code`     VARCHAR(12) DEFAULT NULL,
  `city_name`     VARCHAR(32) DEFAULT NULL,
  `district_code` VARCHAR(12) DEFAULT NULL,
  `district_name` VARCHAR(32) DEFAULT NULL,
  `detail`        VARCHAR(200) NOT NULL COMMENT '详细地址',
  `label`         VARCHAR(100) DEFAULT NULL COMMENT '标签，如 宿舍/教学楼',
  `is_default`    TINYINT     NOT NULL DEFAULT 0 COMMENT '1默认地址，同一用户至多一条',
  `create_time`   DATETIME    NOT NULL DEFAULT CURRENT_TIMESTAMP,
  `update_time`   DATETIME    NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  PRIMARY KEY (`id`),
  KEY `idx_address_user` (`user_id`)
) ENGINE = InnoDB DEFAULT CHARSET = utf8mb4 COMMENT = '收货地址';

-- -------------------------------------------------------------
-- 8. 购物车
-- -------------------------------------------------------------
DROP TABLE IF EXISTS `shopping_cart`;
CREATE TABLE `shopping_cart` (
  `id`          BIGINT        NOT NULL AUTO_INCREMENT,
  `name`        VARCHAR(64)   NOT NULL COMMENT '商品名称冗余',
  `image`       VARCHAR(255)  DEFAULT NULL,
  `user_id`     BIGINT        NOT NULL,
  `dish_id`     BIGINT        DEFAULT NULL COMMENT '菜品 id 与套餐 id 二选一',
  `setmeal_id`  BIGINT        DEFAULT NULL,
  `dish_flavor` VARCHAR(128)  DEFAULT NULL COMMENT '已选口味，展示用',
  `number`      INT           NOT NULL DEFAULT 1 COMMENT '数量，1..99',
  `amount`      DECIMAL(10,2) NOT NULL COMMENT '该行小计',
  `create_time` DATETIME      NOT NULL DEFAULT CURRENT_TIMESTAMP,
  PRIMARY KEY (`id`),
  KEY `idx_cart_user` (`user_id`),
  KEY `idx_cart_user_dish` (`user_id`, `dish_id`)
) ENGINE = InnoDB DEFAULT CHARSET = utf8mb4 COMMENT = '购物车';

-- -------------------------------------------------------------
-- 9. 订单与订单明细
-- -------------------------------------------------------------
DROP TABLE IF EXISTS `orders`;
CREATE TABLE `orders` (
  `id`                     BIGINT        NOT NULL AUTO_INCREMENT,
  `number`                 VARCHAR(50)   NOT NULL COMMENT '订单号，业务唯一',
  `status`                 TINYINT       NOT NULL DEFAULT 1 COMMENT '1待付款 2待接单 3已接单 4派送中 5已完成 6已取消',
  `user_id`                BIGINT        NOT NULL,
  `address_book_id`        BIGINT        DEFAULT NULL,
  `order_time`             DATETIME      NOT NULL DEFAULT CURRENT_TIMESTAMP,
  `checkout_time`          DATETIME      DEFAULT NULL COMMENT '支付完成时间',
  `pay_method`             TINYINT       NOT NULL DEFAULT 1 COMMENT '1模拟支付 2其他（课程不接入真实支付）',
  `pay_status`             TINYINT       NOT NULL DEFAULT 0 COMMENT '0未支付 1已支付 2已退款',
  `amount`                 DECIMAL(10,2) NOT NULL COMMENT '订单总额，由后端计算',
  `remark`                 VARCHAR(100)  DEFAULT NULL,
  `phone`                  VARCHAR(11)   NOT NULL COMMENT '收货电话快照',
  `address`                VARCHAR(255)  NOT NULL COMMENT '收货地址快照',
  `consignee`              VARCHAR(32)   NOT NULL COMMENT '收货人快照',
  `cancel_reason`          VARCHAR(255)  DEFAULT NULL,
  `rejection_reason`       VARCHAR(255)  DEFAULT NULL,
  `cancel_time`            DATETIME      DEFAULT NULL,
  `estimated_delivery_time` DATETIME     DEFAULT NULL,
  `delivery_status`        TINYINT       NOT NULL DEFAULT 1 COMMENT '1立即送出 0选择时间',
  `delivery_time`          DATETIME      DEFAULT NULL,
  `pack_amount`            INT           DEFAULT 0 COMMENT '打包费',
  `tableware_number`       INT           DEFAULT NULL COMMENT '餐具数量',
  `tableware_status`       TINYINT       NOT NULL DEFAULT 1 COMMENT '1按餐量提供 0选择数量',
  PRIMARY KEY (`id`),
  UNIQUE KEY `uk_orders_number` (`number`),
  KEY `idx_orders_user` (`user_id`, `order_time`),
  KEY `idx_orders_status` (`status`)
) ENGINE = InnoDB DEFAULT CHARSET = utf8mb4 COMMENT = '订单';

DROP TABLE IF EXISTS `order_detail`;
CREATE TABLE `order_detail` (
  `id`          BIGINT        NOT NULL AUTO_INCREMENT,
  `name`        VARCHAR(64)   NOT NULL COMMENT '商品名称快照',
  `image`       VARCHAR(255)  DEFAULT NULL,
  `order_id`    BIGINT        NOT NULL,
  `dish_id`     BIGINT        DEFAULT NULL,
  `setmeal_id`  BIGINT        DEFAULT NULL,
  `dish_flavor` VARCHAR(128)  DEFAULT NULL,
  `number`      INT           NOT NULL,
  `amount`      DECIMAL(10,2) NOT NULL COMMENT '小计 = 单价 × 数量，快照',
  PRIMARY KEY (`id`),
  KEY `idx_detail_order` (`order_id`)
) ENGINE = InnoDB DEFAULT CHARSET = utf8mb4 COMMENT = '订单明细';

SET FOREIGN_KEY_CHECKS = 1;
