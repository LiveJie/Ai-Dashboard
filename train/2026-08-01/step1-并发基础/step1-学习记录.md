# Step 1 · 并发基础训练记录（2026-08-01）

> 训练主题：多线程基础 + 并发三特性 + volatile + 超卖复现
> 对应计划：`stepByStep.md` Step 1

## 一、本次目标

- 理解线程创建方式与并发三大特性：原子性 / 可见性 / 有序性
- 用真实业务（菜品库存扣减）复现并发 Bug：丢失更新 / 超卖
- 理解 volatile 的边界：只保证可见性+有序性，不保证原子性

## 二、新建文件清单（7 个）

| 文件 | 作用 |
|---|---|
| `entity/Stock.java` | 映射 t_stock 表 |
| `mapper/StockMapper.java` | MP 基础接口 |
| `service/StockService.java` | 接口：deduct() |
| `service/impl/StockServiceImpl.java` | 无锁扣库存（故意有 Bug） |
| `controller/StockController.java` | POST /stock/deduct、GET /stock/list |
| `test/.../ThreadDemo.java` | demo1/2/3 三特性演示 |
| `test/.../OversellTest.java` | 100 线程抢 100 库存复现 Bug |

数据库：`db_reggie.t_stock`（已建表，初始 3 条菜品数据）

## 三、实测结果

### 1. OversellTest（100 线程抢 100 库存）

```
初始库存 = 100
100 线程抢 100 库存，剩余库存 = 97
>>> 并发 Bug 复现成功【丢失更新】：本应扣 100 份，实际只扣了 3 份
断言失败（期望 0）→ 正是教学目的：证明无锁「查询-判断-修改」非原子
```

结论：单线程 curl 永远测不出来，只有并发测试（CountDownLatch 发令枪）能暴露。

### 2. ThreadDemo 三特性

```
【Demo1 原子性】理论值 = 500000，实际值 = 491764  → count++ 非原子，丢更新
【Demo2 可见性】普通变量：本次未触发（立即看到），JIT 优化导致偶发；多跑几次可复现「2 秒内没看到修改」；volatile 立即看到
【Demo3 有序性】DCL 单例 instance 必须加 volatile 禁止指令重排
【Demo4 并发减库存】已补满 100，100 线程各扣 1 → 最终剩余 98（耗时 77ms）→ 无锁并发丢失更新复现
```

## 四、关键结论（要记住的）

1. 并发三特性：**原子性**（count++ / 查改写）、**可见性**（CPU 缓存）、**有序性**（指令重排）。
2. `volatile` 解决可见性 + 有序性，**解决不了原子性** → 库存扣减不能只靠 volatile。
3. 「查询-判断-修改」三步不原子 → 并发下必然丢更新/超卖。
4. 修复方向：让扣减变原子 → Step2 用 synchronized。

## 五、面试自测

- [ ] 并发三特性分别被什么机制保证？
- [ ] volatile 能保证原子性吗？为什么 count++ 不是原子的？
- [ ] 指令重排是什么？DCL 单例为什么要加 volatile？
- [ ] 为什么并发 Bug 单线程测不出来？
- [ ] CountDownLatch 在这里的作用是什么？（发令枪：所有线程同时起跑）

## 六、踩坑记录

- 切换 JDK 到 17 后，IDE 里 Lombok 生成的 getter/setter 标红 —— 是语言服务器缓存问题，重载窗口或 `Java: Clean Java Language Server Workspace` 解决，编译本身通过。
- ThreadDemo 的可见性演示：普通变量偶发能看到修改（JIT 优化不稳定），多跑几次或增大循环观察。

## 下一步

- [ ] Step 2：synchronized 锁机制（修复超卖 + 桌位防重复预订）
