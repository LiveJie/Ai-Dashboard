# Step 2 · synchronized 训练记录（2026-08-01）

> 训练主题：synchronized 锁机制（修复超卖 + 桌位防重复预订）
> 对应计划：`stepByStep.md` Step 2

## 一、本次目标

- 掌握 synchronized 3 种用法（实例方法 / 静态方法 / 代码块）和锁对象选择
- 理解锁粒度：`this` / `Class` / 自定义 Object / 字符串常量陷阱 / 按业务维度细分
- 理解可重入性、管程（Monitor）思想、锁升级（无锁→偏向→轻量→重量）
- 用 synchronized 修复 Step1 超卖；实现桌位防重复预订（双层防线：代码锁 + 唯一索引）

## 二、新建文件清单（9 个，不改动既有文件）

| 文件 | 作用 |
|---|---|
| `entity/Reservation.java` | 映射 t_reservation 表 |
| `mapper/ReservationMapper.java` | MP 基础接口 |
| `service/ReservationService.java` | 接口：book() |
| `service/impl/ReservationServiceImpl.java` | 锁粒度=桌位+时间段，防重复预订 |
| `controller/ReservationController.java` | POST /reservation/book |
| `service/SynchronizedStockService.java` | 接口：4 种加锁方式 |
| `service/impl/SynchronizedStockServiceImpl.java` | synchronized 修复超卖 |
| `test/.../SynchronizedTest.java` | 不超卖 + 桌位双订验证 |
| `test/.../LockLevelDemo.java` | 锁对象/可重入/字符串锁陷阱/锁升级 |

数据库：`db_reggie.t_reservation`（新建，含唯一索引 uk_table_time）；`t_stock` 沿用 Step1

## 三、实测结果

### 1. SynchronizedTest（JUnit，2 个用例全过：tests=2, failures=0）

```
【方式一-实例方法锁】100 线程抢 100 库存，耗时 1411ms，成功数 = 100，剩余 = 0
【方式二-Class锁】100 线程抢 100 库存，耗时 1380ms，成功数 = 100，剩余 = 0
【方式三-自定义锁对象】100 线程抢 100 库存，耗时 1429ms，成功数 = 100，剩余 = 0
【方式四-按菜品锁】100 线程抢 100 库存，耗时 1392ms，成功数 = 100，剩余 = 0
>>> 4 种加锁方式全部通过：synchronized 修复超卖成功！

【桌位双订】2 线程抢同一桌位同一时间段：成功数 = 1，落库记录数 = 1
>>> 桌位防重复预订验证通过：同一桌位同一时间段只能被订走一次！
```

对比 Step1 OversellTest：同样 100 线程抢 100 库存，无锁时剩余 97（丢更新）；
加锁后 4 种方式剩余都是 0 —— 锁粒度不影响正确性，只影响并发度。

### 2. LockLevelDemo（main 直接运行）

```
【Demo1 三种用法锁的对象】
  实例方法锁 → 锁 this            ，identityHashCode = 887903902
  静态方法锁 → 锁 Class           ，identityHashCode = 1911477959
  代码块锁   → 锁自定义 Object   ，identityHashCode = 432647786
【Demo2 可重入性】
  outer() 已获取锁（this），重入计数 = 1
  inner() 再次获取同一把锁（this），重入计数 = 2，直接通过
  outer() 执行完毕，无死锁 → synchronized 可重入性验证通过
【Demo3 字符串锁陷阱】
  拼接字符串：s1 == s2 ? false（false 说明两个对象，synchronized(s1) 和 synchronized(s2) 互不阻塞）
  写死字面量：s3 == s4 ? true（true 说明常量池同一对象，任何地方 synchronized("A01:18:00") 都互相干扰）
【Demo4 锁升级】synchronized 锁的 4 种状态（只升不降）
  无锁        ：Mark Word 存 hashCode，无任何锁语义，开销 0
  偏向锁       ：单线程反复进入，Mark Word 记录线程ID，开销最小
  轻量级锁      ：多线程轮流进入，CAS 自旋抢锁，开销小
  重量级锁      ：竞争激烈，线程挂起等待内核 Monitor，开销最大
  >>> 升级路径：无锁 → (偏向锁) → 轻量级锁 → 重量级锁，只升不降
  >>> 注意：本机 JDK 17.0.15，JDK 15+ 默认关闭偏向锁（JEP 374），实际路径：无锁 → 轻量级 → 重量级
```

## 四、关键结论（要记住的）

1. **锁对象 = 互斥范围**：必须锁同一个对象才互斥。实例方法锁 this、静态方法锁
   Class、代码块锁指定对象——锁粒度越细，无关线程阻塞越少，并发度越高。
2. **临界区要包全**：只锁「扣减那行」没用，必须包住「查-判-扣-存」四步，
   否则两个线程仍会基于同一个旧库存各自扣减（Step1 Bug 复现）。
3. **字符串做锁两个坑**：拼接每次 new 新对象 → 锁失效；字面量进常量池 →
   全局共享互相干扰。正确做法：ConcurrentHashMap 锁对象池 / intern()。
4. **可重入**：Monitor 记录持有线程 + 重入计数，同一线程重复进入同一把锁不阻塞。
5. **锁升级**：无锁 → 偏向锁 → 轻量级锁 → 重量级锁，只升不降；JDK 15+ 默认
   关闭偏向锁，JDK 17 实际路径是 无锁 → 轻量级 → 重量级。
6. **双层防线**：代码层 synchronized（单实例有效）+ DB 唯一索引（多实例兜底）；
   集群/分布式场景进程内锁各自为政，必须靠唯一索引或分布式锁。

## 五、面试自测

- [ ] synchronized 三种用法分别锁的是谁？锁对象怎么选？
- [ ] 为什么锁粒度越细并发度越高？方式四（按菜品锁）怎么实现锁对象池？
- [ ] 字符串常量做锁有什么坑？如何避免？
- [ ] 什么是可重入？Monitor 是怎么记录重入的？
- [ ] 偏向锁/轻量级锁/重量级锁的区别？锁升级过程？JDK17 为什么没有偏向锁？
- [ ] 桌位防重复预订有几层防线？进程内锁在集群下为什么失效？

## 六、踩坑记录

1. **`book_time` VARCHAR(32) 超长**：SynchronizedTest 里用
   `"2026-08-01 18:00-20:00-" + System.currentTimeMillis()` 生成时间段（超过 32 字符），
   插入时抛 `Data truncation: Data too long for column 'book_time'`，导致双订测试
   两个线程都失败（成功数 0）。→ 改为固定时间段 + 跑前清理数据，测试可重复执行。
2. **字符串常量折叠**：LockLevelDemo Demo3 最初写 `"A01" + ":" + "18:00"`，javac
   常量折叠成常量池同一对象，`s1 == s2` 打印 true，没演示出「拼接每次 new 对象」
   的陷阱。→ 引入运行时变量 `String prefix = "A01"` 阻止折叠，`s1 == s2` 打印 false。
3. **Lombok getter/setter 标红**（老问题）：新建的 Reservation/Stock 实体在 IDE 里
   标红，是语言服务器缓存问题，`mvn` 编译与测试均通过，重载窗口即可恢复。
4. **lambda 捕获循环变量**：SynchronizedTest 里 switch(s) 直接在 lambda 中引用
   循环变量 `s` 编译不过（不是 effectively final）→ 提前取出为
   `final BiFunction<Long,Integer,Boolean> deduct` 再传给 lambda。

## 下一步

- [ ] Step 3：ReentrantLock + Condition + AQS（会员余额并发扣减）
