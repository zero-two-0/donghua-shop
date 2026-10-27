-- 状态：组员第 2 周草案（已归档）。组长正式建表脚本为 docs/leader/week2/schema.sql（库 takeout_course），
-- 本文件仅作过程留痕；实际运行请用 scripts/db-init-backend.ps1。

-- =============================================================
-- 东华大学在线点餐系统 · 种子数据（评审版 v0.3）
-- 依赖：先执行 schema.sql。固定主键，便于前端 Mock 与联调对账。
-- 默认口令（仅课程演示）：员工 123456 / 用户验证码 1234
-- =============================================================
USE `donghua_shop`;

SET NAMES utf8mb4;
SET FOREIGN_KEY_CHECKS = 0;

TRUNCATE TABLE `employee`;
TRUNCATE TABLE `category`;
TRUNCATE TABLE `dish`;
TRUNCATE TABLE `dish_flavor`;
TRUNCATE TABLE `setmeal`;
TRUNCATE TABLE `setmeal_dish`;
TRUNCATE TABLE `user`;
TRUNCATE TABLE `address_book`;
TRUNCATE TABLE `shopping_cart`;
TRUNCATE TABLE `orders`;
TRUNCATE TABLE `order_detail`;

SET FOREIGN_KEY_CHECKS = 1;

-- 员工：两人各一个账号；密码列存 MD5(明文)，不存明文
INSERT INTO `employee` (`id`, `name`, `username`, `password`, `phone`, `sex`, `id_number`, `status`) VALUES
(1, '刘晟玺', 'admin', MD5('123456'), '13800000001', '1', '310101200001011234', 1),
(2, '钱文博', 'qianwenbo', MD5('123456'), '13800000002', '1', '310101200001015678', 1);

-- 分类：1=菜品分类，2=套餐分类
INSERT INTO `category` (`id`, `type`, `name`, `sort`, `status`) VALUES
(1, 1, '早餐早点', 1, 1),
(2, 1, '面食汤面', 2, 1),
(3, 1, '盖浇饭', 3, 1),
(4, 1, '小炒与汤', 4, 1),
(5, 2, '组合套餐', 5, 1),
(6, 2, '轻食套餐', 6, 1);

-- 菜品
INSERT INTO `dish` (`id`, `name`, `category_id`, `price`, `image`, `description`, `status`) VALUES
(1, '鲜肉小笼包（6只）', 1, 6.00,  '/img/dishes/1.png',  '现蒸现卖，皮薄多汁', 1),
(2, '生煎包（4只）',      1, 8.00,  '/img/dishes/2.png',  '底脆汤足，早餐人气', 1),
(3, '皮蛋瘦肉粥',          1, 5.00,  '/img/dishes/3.png',  '慢熬两小时', 1),
(4, '红烧牛肉面',          2, 18.00, '/img/dishes/4.png',  '牛腱肉足量，汤头浓郁', 1),
(5, '番茄鸡蛋面',          2, 12.00, '/img/dishes/5.png',  '酸甜开胃', 1),
(6, '葱油大排面',          2, 15.00, '/img/dishes/6.png',  '手工大排，葱香扑鼻', 1),
(7, '宫保鸡丁盖浇饭',      3, 16.00, '/img/dishes/7.png',  '微辣，配时蔬', 1),
(8, '红烧肉盖浇饭',        3, 18.00, '/img/dishes/8.png',  '肥而不腻', 1),
(9, '鱼香肉丝盖浇饭',      3, 15.00, '/img/dishes/9.png',  '酸甜微辣', 1),
(10, '咖喱鸡块饭',         3, 17.00, '/img/dishes/10.png', '日式咖喱，微辣', 1),
(11, '糖醋排骨',           4, 22.00, '/img/dishes/11.png', '小份现炒', 1),
(12, '蒜蓉西兰花',         4, 10.00, '/img/dishes/12.png', '清爽解腻', 1),
(13, '酸辣土豆丝',         4, 9.00,  '/img/dishes/13.png', '现炒，可选辣度', 1),
(14, '紫菜蛋花汤',         4, 4.00,  '/img/dishes/14.png', '每餐一碗', 1),
(15, '米饭',               3, 2.00,  '/img/dishes/15.png', '东北大米', 1),
(16, '冰镇酸梅汤',         4, 5.00,  '/img/dishes/16.png', '自制，解腻', 1),
(17, '梅干菜扣肉饭',       3, 19.00, '/img/dishes/17.png', '停售示例：售完', 0);

-- 口味
INSERT INTO `dish_flavor` (`dish_id`, `name`, `value`) VALUES
(4, '辣度', '不辣,微辣,中辣'),
(5, '辣度', '不辣,微辣'),
(7, '辣度', '不辣,微辣,中辣,特辣'),
(9, '辣度', '不辣,微辣,中辣'),
(13, '辣度', '不辣,微辣,中辣'),
(4, '加料', '加面,加牛肉,加青菜');

-- 套餐
INSERT INTO `setmeal` (`id`, `category_id`, `name`, `price`, `status`, `description`, `image`) VALUES
(1, 5, '单人午餐套餐', 22.00, 1, '宫保鸡丁盖浇饭 + 紫菜蛋花汤 + 酸梅汤', '/img/dishes/101.png'),
(2, 5, '双人分享套餐', 45.00, 1, '红烧肉盖浇饭 + 鱼香肉丝盖浇饭 + 糖醋排骨 + 2份米饭', '/img/dishes/102.png'),
(3, 6, '轻食减脂套餐', 20.00, 1, '蒜蓉西兰花 + 紫菜蛋花汤 + 米饭', '/img/dishes/103.png');

INSERT INTO `setmeal_dish` (`setmeal_id`, `dish_id`, `name`, `price`, `copies`) VALUES
(1, 7,  '宫保鸡丁盖浇饭', 16.00, 1),
(1, 14, '紫菜蛋花汤',      4.00, 1),
(1, 16, '冰镇酸梅汤',      5.00, 1),
(2, 8,  '红烧肉盖浇饭',   18.00, 1),
(2, 9,  '鱼香肉丝盖浇饭', 15.00, 1),
(2, 11, '糖醋排骨',       22.00, 1),
(2, 15, '米饭',            2.00, 2),
(3, 12, '蒜蓉西兰花',     10.00, 1),
(3, 14, '紫菜蛋花汤',      4.00, 1),
(3, 15, '米饭',            2.00, 1);

-- 用户（C 端，课程内用手机号 + 固定验证码 1234 模拟登录）
INSERT INTO `user` (`id`, `openid`, `name`, `phone`, `sex`, `avatar`) VALUES
(1, 'test-openid-0001', '测试同学', '13800001111', '1', NULL),
(2, 'test-openid-0002', '王同学',   '13800002222', '2', NULL);

-- 收货地址
INSERT INTO `address_book` (`id`, `user_id`, `consignee`, `sex`, `phone`, `province_code`, `province_name`, `city_code`, `city_name`, `district_code`, `district_name`, `detail`, `label`, `is_default`) VALUES
(1, 1, '测试同学', '1', '13800001111', '310000', '上海市', '310100', '上海市', '310118', '松江区', '东华大学松江校区 32 号宿舍楼 412 室', '宿舍', 1),
(2, 1, '测试同学', '1', '13800001111', '310000', '上海市', '310100', '上海市', '310118', '松江区', '东华大学松江校区 第一教学楼 A203', '教学楼', 0);

-- 购物车
INSERT INTO `shopping_cart` (`id`, `name`, `image`, `user_id`, `dish_id`, `setmeal_id`, `dish_flavor`, `number`, `amount`) VALUES
(1, '红烧牛肉面', '/img/dishes/4.png', 1, 4, NULL, '微辣', 2, 36.00),
(2, '紫菜蛋花汤', '/img/dishes/14.png', 1, 14, NULL, NULL, 1, 4.00);

-- 订单：一条已完成、一条待付款，供两端页面演示
INSERT INTO `orders`
(`id`, `number`, `status`, `user_id`, `address_book_id`, `order_time`, `checkout_time`, `pay_method`, `pay_status`,
 `amount`, `remark`, `phone`, `address`, `consignee`, `estimated_delivery_time`, `delivery_status`, `delivery_time`, `pack_amount`) VALUES
(1, '202610240001', 5, 1, 1, '2026-10-24 11:32:10', '2026-10-24 11:33:02', 1, 1,
 56.00, '不要香菜', '13800001111', '东华大学松江校区 32 号宿舍楼 412 室', '测试同学', '2026-10-24 12:10:00', 1, '2026-10-24 12:02:00', 0),
(2, '202610260002', 1, 1, 1, '2026-10-26 18:05:44', NULL, 1, 0,
 22.00, NULL, '13800001111', '东华大学松江校区 32 号宿舍楼 412 室', '测试同学', NULL, 1, NULL, 0);

INSERT INTO `order_detail` (`name`, `image`, `order_id`, `dish_id`, `setmeal_id`, `dish_flavor`, `number`, `amount`) VALUES
('红烧牛肉面',    '/img/dishes/4.png',  1, 4,    NULL, '微辣', 2, 36.00),
('糖醋排骨',      '/img/dishes/11.png', 1, 11,   NULL, NULL,   1, 22.00),
('单人午餐套餐',  '/img/dishes/101.png', 2, NULL, 1,    NULL,   1, 22.00),
('紫菜蛋花汤',    '/img/dishes/14.png', 2, 14,   NULL, NULL,   1,  4.00);
