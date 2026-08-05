# Step 1 · 具体实现（2026-08-01）

> 计划大纲见 [stepByStep.md](../../../stepByStep.md) Step 1
> 训练记录见 [step1-学习记录.md](step1-学习记录.md)
> 本文件 = Step 1 的完整可运行代码（与项目中已创建的文件完全一致）

## 一、建表 SQL + 初始数据

```sql
CREATE TABLE t_stock (
    id          BIGINT       NOT NULL AUTO_INCREMENT COMMENT '主键',
    dish_name   VARCHAR(64)  NOT NULL COMMENT '菜品名称',
    quantity    INT          NOT NULL DEFAULT 0 COMMENT '剩余库存',
    version     INT          NOT NULL DEFAULT 0 COMMENT '乐观锁版本号(Step4 使用)',
    create_time DATETIME     NOT NULL DEFAULT CURRENT_TIMESTAMP COMMENT '创建时间',
    update_time DATETIME     NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP COMMENT '更新时间',
    PRIMARY KEY (id)
) ENGINE = InnoDB COMMENT '菜品库存表(并发训练)';

INSERT INTO t_stock (id, dish_name, quantity) VALUES
(1, '宫保鸡丁', 100),
(2, '鱼香肉丝', 50),
(3, '麻婆豆腐', 200);
```

## 二、改动文件总览（新增 7 个，不改动任何既有文件）

| # | 文件 | 新增代码 | 作用 | 关键现象 |
|---|---|---|---|---|
| 1 | `entity/Stock.java` | 实体类 | 映射 t_stock 表 | 无 |
| 2 | `mapper/StockMapper.java` | 空接口 | 继承 BaseMapper 提供单表 CRUD | 无 |
| 3 | `service/StockService.java` | 接口 | 声明 `deduct()` 扣库存 | 无 |
| 4 | `service/impl/StockServiceImpl.java` | **无锁扣库存** | 查询→判断→修改 三步 | 并发下**丢失更新/超卖** |
| 5 | `controller/StockController.java` | 2 个接口 | 扣库存 + 查库存 | 供 curl 手动验证 |
| 6 | `test/.../ThreadDemo.java` | demo1/2/3 | 三特性演示 | 见下方验证矩阵 |
| 7 | `test/.../OversellTest.java` | 100 线程抢购 | 复现并发 Bug | 剩余库存 ≠ 0 |

## 三、每个文件完整代码

### 1. entity/Stock.java（对应表 t_stock）

```java
package com.jiege.reggie.entity;

import com.baomidou.mybatisplus.annotation.IdType;
import com.baomidou.mybatisplus.annotation.TableField;
import com.baomidou.mybatisplus.annotation.TableId;
import com.baomidou.mybatisplus.annotation.TableName;
import lombok.Data;

import java.io.Serializable;

/**
 * 菜品库存表（并发训练 Step1~8 复用）
 */
@Data
@TableName("t_stock")
public class Stock implements Serializable {

    private static final long serialVersionUID = 1L;

    @TableId(value = "id", type = IdType.AUTO)
    private Long id;

    @TableField("dish_name")
    private String dishName;      // 菜品名称

    @TableField("quantity")
    private Integer quantity;     // 剩余库存

    @TableField("version")
    private Integer version;      // 乐观锁版本号（Step4 CAS 章节使用）
}
```

### 2. mapper/StockMapper.java

```java
package com.jiege.reggie.mapper;

import com.jiege.reggie.entity.Stock;
import com.baomidou.mybatisplus.core.mapper.BaseMapper;
import org.apache.ibatis.annotations.Mapper;

@Mapper
public interface StockMapper extends BaseMapper<Stock> {
}
```

### 3. service/StockService.java

```java
package com.jiege.reggie.service;

import com.jiege.reggie.entity.Stock;
import com.baomidou.mybatisplus.extension.service.IService;

public interface StockService extends IService<Stock> {

    /**
     * 扣减库存
     * Step1：原始无锁实现，「查询-判断-修改」三步非原子，并发下必然超卖
     */
    boolean deduct(Long id, int count);
}
```

### 4. service/impl/StockServiceImpl.java（Step1 核心：故意不写锁）

```java
package com.jiege.reggie.service.impl;

import com.jiege.reggie.entity.Stock;
import com.jiege.reggie.mapper.StockMapper;
import com.jiege.reggie.service.StockService;
import com.baomidou.mybatisplus.extension.service.impl.ServiceImpl;
import org.springframework.stereotype.Service;

@Service
public class StockServiceImpl extends ServiceImpl<StockMapper, Stock> implements StockService {

    @Override
    public boolean deduct(Long id, int count) {
        Stock stock = getById(id);                     // ① 查询库存
        if (stock == null) {
            return false;
        }
        try {
            Thread.sleep(10);                          // 模拟耗时，放大竞态窗口（教学用）
        } catch (InterruptedException e) {
            Thread.currentThread().interrupt();
        }
        if (stock.getQuantity() < count) {             // ② 判断充足
            return false;
        }
        stock.setQuantity(stock.getQuantity() - count); // ③ 扣减
        return updateById(stock);                      // ④ 落库
    }
}
```

> **会出现的情况**：①②③④ 不是原子操作。两个线程同时读到 `quantity=100` → 都判断通过 → 都写 `99`。
> 结果分两种：**丢失更新**（100 线程只成功扣了 3 份，剩余 97，最常见）或 **超卖**（库存被扣成负数）。

### 5. controller/StockController.java

```java
package com.jiege.reggie.controller;

import com.jiege.reggie.common.R;
import com.jiege.reggie.entity.Stock;
import com.jiege.reggie.service.StockService;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.web.bind.annotation.*;

import java.util.List;

@RestController
@RequestMapping("/stock")
public class StockController {

    @Autowired
    private StockService stockService;

    /** 扣减库存（Step1 无锁实现，并发会超卖） */
    @PostMapping("/deduct")   // POST /stock/deduct?stockId=1&count=5
    public R<Boolean> deduct(@RequestParam Long stockId, @RequestParam(defaultValue = "1") Integer count) {
        boolean ok = stockService.deduct(stockId, count);
        return ok ? R.success(true) : R.fail("库存不足");
    }

    /** 查询全部库存（用于验证扣减结果） */
    @GetMapping("/list")      // GET /stock/list
    public R<List<Stock>> list() {
        return R.success(stockService.list());
    }
}
```

### 6. test/.../ThreadDemo.java（三特性 + 并发减库存演示，main 里注释选择运行）

> Demo1-3 纯 JVM 演示无需数据库；**Demo4 需要 MySQL**（t_stock 表已建好），
> 每次运行前会自动把库存补满为 100，可反复测试。

```java
package com.jiege.reggie.demos.concurrency;

import com.jiege.reggie.ReggieApplication;
import com.jiege.reggie.entity.Stock;
import com.jiege.reggie.service.StockService;
import org.springframework.boot.WebApplicationType;
import org.springframework.boot.builder.SpringApplicationBuilder;
import org.springframework.context.ConfigurableApplicationContext;

import java.util.concurrent.CountDownLatch;
import java.util.concurrent.atomic.AtomicInteger;

/**
 * ============================================================
 *  Step1-演示：并发三大特性（原子性 / 可见性 / 有序性）
 * ============================================================
 *
 * 【总描述】
 * 并发编程的三个核心问题，都由"多个线程共享同一个数据"引起：
 *   1. 原子性：操作不可分割（count++ 是读-加-写三步）
 *   2. 可见性：一个线程的修改，另一个线程看不到（CPU 缓存）
 *   3. 有序性：指令重排导致执行顺序和代码顺序不一致
 *
 * 【使用方法】
 * main 方法里注释掉不需要的 demo，每次只保留一个，对照每个方法里的
 * 「预期现象」观察输出，理解对应特性。
 */
public class ThreadDemo {

    /** 普通布尔变量（问题版，不保证可见性）——被 CPU 缓存后子线程可能看不到修改 */
    private static boolean FLAG_PLAIN = false; // false=未修改 true=已修改

    /** volatile 布尔变量（保证可见性）——每次读写都直接操作主内存 */
    private static volatile boolean FLAG_VOLATILE = false;

    public static void main(String[] args) throws Exception {
        // ===== 需要验证哪个就保留哪个，其余注释掉 =====
//        demo1Atomicity();    // Demo1：原子性
//        demo2Visibility();   // Demo2：可见性
        demo3Reordering();   // Demo3：有序性（概念演示）
//        demo4StockDeduct();  // Demo4：并发减库存（需要 MySQL，跑前自动补满库存）
        // ============================================
    }

    /**
     * ============================================================
     *  Demo1 原子性
     * ============================================================
     * 【演示什么】count++ 不是原子操作，100 个线程并发累加会丢失更新。
     * 【原理】count[0]++ 实际是三步：读取 → 加1 → 写回。
     *         两个线程可能同时读到同一个值（比如 5），都加 1 都写 6，
     *         本该加两次变成 7，结果只加了一次 → 结果偏小。
     * 【预期现象】理论值 = 500000，实际值 < 500000（多跑几次更明显）。
     * 【解决方法】（改前 → 改后）
     * 1. 加锁：让 count[0]++ 变成原子操作
     *    改前：count[0]++;
     *    改后：synchronized (ThreadDemo.class) { count[0]++; }
     *    注意：所有线程必须锁同一个对象才互斥。
     * 2. 原子类：无需加锁，CAS 保证原子
     *    改前：int[] count = {0}; ... count[0]++;
     *    改后：AtomicInteger count = new AtomicInteger(0); count.incrementAndGet();
     */
    private static void demo1Atomicity() throws InterruptedException {
        // ① 共享计数器：用 int[] 而不是 int 的原因
        //    lambda 里只能使用"引用不变"的外部变量；int 会被修改，
        //    编译器不允许；数组的引用不变（变的是 count[0]），所以能用
        AtomicInteger count = new AtomicInteger(0);

        // ② 任务配置：100 个线程，每个线程对 count[0] 加 5000 次
        int threads = 100;
        int perThread = 5000;

        // ③ 创建 100 个线程并启动
        //    start() 是"开启新线程异步执行"；直接调 run() 只是当前线程同步执行，没意义
        Thread[] ts = new Thread[threads];
        for (int i = 0; i < threads; i++) {
            ts[i] = new Thread(() -> {
                for (int j = 0; j < perThread; j++) {
                    // 加锁：确保每个线程只能执行这行代码，避免丢失更新
//                    synchronized (ThreadDemo.class) {
//                        count[0]++;   // 非原子！读取-加1-写回三步可能被打断
//                    }

                        count.incrementAndGet();

                }
            });
            ts[i].start();
        }

        // ④ join()：主线程等待所有子线程执行完，否则下面打印时线程可能还没跑完
        for (Thread t : ts) {
            t.join();
        }

        // ⑤ 打印对比结果，判断是否出现丢失更新
        int expected = threads * perThread;
        System.out.println("【Demo1 原子性】理论值 = " + expected + "，实际值 = " + count.get());
        System.out.println(count.get() < expected
                ? "   => 结果偏小，丢失更新复现（count++ 非原子）"
                : "   => 本次恰好没触发，多跑几次或调大 perThread 即可复现");
    }

    /**
     * ============================================================
     *  Demo2 可见性
     * ============================================================
     * 【演示什么】主线程修改一个变量，子线程能否立刻看到？
     * 【原理】每个线程有 CPU 缓存，普通变量先写缓存不刷新主内存，
     *         子线程读的是自己缓存里的旧值 → 看不到修改。
     *         volatile 强制每次读写都走主内存 → 立即看到。
     * 【预期现象】
     *   第①段用普通 boolean（问题版）：子线程 2 秒内很可能看不到修改，打印「可见性缺失」；
     *   第②段用 volatile：子线程立即看到修改，很快退出并打印自旋次数。
     * 【注意】普通变量演示是概率性的（取决于 JIT 优化），多跑几次才明显。
     * 【解决方法】（改前 → 改后）——4 种方案互相独立，选哪种就要配套改哪几处
     * 1. volatile：强制每次读写都走主内存
     *    改前：private static boolean FLAG_PLAIN = false;
     *    改后：private static volatile boolean FLAG_PLAIN = false;
     * 2. 加锁：锁的进入/释放有内存屏障，读写都加锁即可保证可见性
     *    改前：while (!FLAG) { }    /   FLAG = true;
     *    改后：synchronized (LOCK) { while (!FLAG) { } }
     *         synchronized (LOCK) { FLAG = true; }
     * 3. AtomicInteger：内部 value 是 volatile，get/set 保证可见性（还附带原子性）
     *    改前：private static boolean FLAG = false;
     *    改后：private static AtomicInteger FLAG = new AtomicInteger(0);
     *         子线程判断：if (FLAG.get() == 1) 退出;   主线程写：FLAG.set(1);
     * 4. 不可变对象（final）：值不可变，天然线程安全，无需考虑可见性
     *    改后：private static final boolean FLAG = true;
     * 说明：当前代码是问题版（普通 boolean），用于复现「可见性缺失」；
     *       想体验方案3（AtomicInteger）就切换方法体里注释提示的那三处（声明/读/写）。
     */
    private static void demo2Visibility() throws InterruptedException {
        // ========== ① 普通变量（问题版，不保证可见性） ==========
        // 子线程：不断自旋检查 FLAG_PLAIN，直到被修改或被打断
        // 想体验方案3（AtomicInteger）：把声明改成 AtomicInteger，
        // 下面 while 换成 while (FLAG_PLAIN.get() == 0 && ...)，
        // 主线程写换成 FLAG_PLAIN.set(1)（三处配套，见 Javadoc 方案3）
        Thread worker = new Thread(() -> {
            int loop = 0;
            while (!FLAG_PLAIN && !Thread.currentThread().isInterrupted()) {
                loop++;   // 空转计数，用于观察自旋了多少次
            }
            if (!Thread.currentThread().isInterrupted()) {
                System.out.println("【Demo2 可见性】普通变量：子线程看到了修改，自旋 " + loop + " 次（本次未触发）");
            }
        });
        worker.start();

        // 主线程 sleep 100ms：先让子线程跑起来，确保它在主线程修改前就开始读
        Thread.sleep(100);
        // 主线程修改 FLAG_PLAIN：普通 boolean 写，可能只写进 CPU 缓存不刷新主内存
        FLAG_PLAIN = true;

        // 等子线程最多 2 秒；没退出说明子线程一直读的是缓存旧值 = 可见性缺失
        worker.join(2000);
        if (worker.isAlive()) {
            System.out.println("【Demo2 可见性】普通变量：2 秒内没看到修改 => 可见性缺失（缓存未刷新）");
            worker.interrupt();          // 中断子线程（死循环不检查中断标志无法停止）
            worker.join(1000);           // 等它真正退出，防止程序挂住
        }

        // ========== ② volatile 变量（保证可见性，对比演示） ==========
        Thread worker2 = new Thread(() -> {
            int loop = 0;
            while (!FLAG_VOLATILE && !Thread.currentThread().isInterrupted()) {
                loop++;
            }
            if (!Thread.currentThread().isInterrupted()) {
                System.out.println("【Demo2 可见性】volatile 变量：子线程立即看到修改，自旋 " + loop + " 次");
            }
        });
        worker2.start();

        Thread.sleep(100);               // 同样先让子线程跑起来
        FLAG_VOLATILE = true;            // 主线程修改，volatile 立即对子线程可见

        worker2.join(2000);              // volatile 场景子线程应很快退出
        if (worker2.isAlive()) {
            System.out.println("【Demo2 可见性】volatile 变量：未在 2 秒内退出（异常）");
            worker2.interrupt();
            worker2.join(1000);
        }
    }

    /**
     * ============================================================
     *  Demo3 有序性（概念演示）
     * ============================================================
     * 【演示什么】CPU/编译器可能指令重排，导致多线程下执行顺序和代码顺序不一致。
     * 【原理】instance = new Singleton() 拆成三步：
     *        1. 分配内存  2. 初始化对象  3. 把地址赋给引用
     *        重排后可能变成 1→3→2：另一个线程在 3 完成后、2 完成前读到了
     *        instance，拿到的是"内存已分配但对象未初始化"的半成品。
     *        解决办法：instance 加 volatile 禁止重排（保证 2 在 3 之前）。
     * 【预期现象】打印 DCL 单例的正确写法（本 Demo 为概念讲解，不实际复现重排）。
     * 【解决方法】（改前 → 改后）
     * 1. instance 加 volatile：禁止指令重排，保证「先初始化对象，再赋给引用」
     *    改前：private static Singleton instance;
     *    改后：private static volatile Singleton instance;
     * 2. 枚举单例：天然线程安全，不存在重排问题（最推荐）
     *    改后：public enum Singleton { INSTANCE }
     */
    private static void demo3Reordering() {
        // ① 展示错误写法：不加 volatile 的 DCL（Double Check Lock）有重排风险
        System.out.println("【Demo3 有序性】DCL 双检锁单例：instance 必须加 volatile 禁止指令重排");
        // ② 给出正确写法（关键点：private static volatile Singleton instance;）
        System.out.println("         正确写法：private static volatile Singleton instance;");
        // ③ 一句话总结原因
        System.out.println("         原因：new 对象三步可重排，volatile 保证「先初始化后赋引用」");
    }

    /**
     * ============================================================
     *  Demo4 并发减库存（业务场景：超卖复现）
     * ============================================================
     * 【演示什么】无锁扣减 t_stock 库存：100 个线程并发扣同一菜品各 1 份，
     *            复现 Step1 的并发 Bug（库存丢失更新，对不上账）。
     * 【原理】StockServiceImpl.deduct 是「查询 -> 判断 -> 扣减 -> 落库」四步，
     *        不是原子操作；多个线程可能同时读到同一个旧库存值，各自扣 1 后写回，
     *        本应扣 100 份实际只扣掉几份 → 剩余库存比预期多。
     * 【预期现象】跑前自动把库存补满 100，100 线程各扣 1 → 最终剩余 ≠ 0（通常 97 左右）。
     * 【解决方法】（改前 → 改后）
     * 1. synchronized 加锁：让「查-判-扣-存」整体原子（Step2 实现）
     *    改后：synchronized 锁同一个对象，包住整个 deduct 方法体
     * 2. 乐观锁 version：更新时校验版本号，失败重试（Step4 实现）
     *    改后：UPDATE t_stock SET quantity = quantity - 1 WHERE id = ? AND version = ?
     * 3. 数据库行锁/分布式锁：强一致但吞吐更低（后续步骤对比）
     */
    private static void demo4StockDeduct() throws Exception {
        // ① 启动 Spring 容器：ThreadDemo 是纯 main 类，没有依赖注入，
        //    必须手动启动上下文才能拿到 StockService（非 web 模式，不起 Tomcat）
        try (ConfigurableApplicationContext ctx = new SpringApplicationBuilder(ReggieApplication.class)
                .web(WebApplicationType.NONE)
                .run()) {
            StockService stockService = ctx.getBean(StockService.class);

            // ② 补满库存：每次跑之前都重置为 100，方便反复测试
            Stock stock = stockService.getById(1L);
            stock.setQuantity(100);
            stockService.updateById(stock);
            System.out.println("【Demo4 并发减库存】已补满库存 = " + stock.getQuantity());

            // ③ 100 个线程并发各扣 1：CountDownLatch 三把锁当发令枪
            //    ready：线程就绪  start：同时起跑  done：全部完成
            int threads = 100;
            CountDownLatch ready = new CountDownLatch(threads);
            CountDownLatch start = new CountDownLatch(1);
            CountDownLatch done = new CountDownLatch(threads);
            for (int i = 0; i < threads; i++) {
                new Thread(() -> {
                    ready.countDown();               // 报告就绪
                    try { start.await(); } catch (InterruptedException e) { Thread.currentThread().interrupt(); }
                    try {
                        stockService.deduct(1L, 1);  // 每个线程扣 1 份（无锁实现，有 Bug）
                    } finally {
                        done.countDown();            // 报告完成
                    }
                }).start();
            }
            ready.await();                           // 等 100 个线程都就绪
            long t0 = System.currentTimeMillis();
            start.countDown();                       // 发令：同时开跑
            done.await();                            // 等全部扣完
            long cost = System.currentTimeMillis() - t0;

            // ④ 查最终库存对比预期（0 = 100 份全扣完）
            Stock after = stockService.getById(1L);
            System.out.println("【Demo4 并发减库存】100 线程各扣 1，耗时 " + cost + "ms，最终剩余 = " + after.getQuantity() + "（预期 0）");
            System.out.println(after.getQuantity() == 0
                    ? "   => 本次恰好全扣完，多跑几次可复现丢失更新"
                    : "   => 剩余 " + after.getQuantity() + " 份：无锁并发丢失更新复现！");
        }
        // try-with-resources 自动 ctx.close()，保证 Spring 上下文正常关闭、程序能退出
    }
}
```

### 7. test/.../OversellTest.java（@SpringBootTest，直接跑 JUnit）

```java
package com.jiege.reggie.demos.concurrency;

import com.jiege.reggie.entity.Stock;
import com.jiege.reggie.service.StockService;
import org.junit.jupiter.api.Test;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.boot.test.context.SpringBootTest;

import java.util.concurrent.CountDownLatch;

@SpringBootTest
class OversellTest {

    @Autowired
    private StockService stockService;

    @Test
    void oversell() throws Exception {
        // 1) 重置库存为 100，保证测试可重复执行
        Stock stock = stockService.getById(1L);
        if (stock == null) {
            throw new IllegalStateException("请先执行 Step1 建表 SQL，并插入 id=1 的库存数据");
        }
        stock.setQuantity(100);
        stockService.updateById(stock);

        // 2) 100 个线程同时扣 1 份库存（CountDownLatch 发令枪，保证真正同时开跑）
        int threadCount = 100;
        CountDownLatch ready = new CountDownLatch(threadCount);
        CountDownLatch start = new CountDownLatch(1);
        CountDownLatch done = new CountDownLatch(threadCount);
        for (int i = 0; i < threadCount; i++) {
            new Thread(() -> {
                ready.countDown();
                try {
                    start.await();
                    stockService.deduct(1L, 1);
                } catch (InterruptedException e) {
                    Thread.currentThread().interrupt();
                } finally {
                    done.countDown();
                }
            }).start();
        }
        ready.await();
        start.countDown();
        done.await();

        // 3) 打印结果：正确并发下剩余应为 0，实际 != 0 即并发 Bug
        int remain = stockService.getById(1L).getQuantity();
        System.out.println("100 线程抢 100 库存，剩余库存 = " + remain);
        if (remain < 0) {
            System.out.println(">>> 并发 Bug 复现【超卖】：库存被扣成负数");
        } else if (remain > 0) {
            System.out.println(">>> 并发 Bug 复现【丢失更新】：本应扣 100 份，实际只扣了 " + (100 - remain) + " 份");
        } else {
            System.out.println(">>> 本次恰好扣完（竞态窗口未命中），多跑几次观察");
        }
        // 断言：期望剩余 0。此处"断言失败"正是教学目的——证明无锁实现存在并发 Bug
        assert remain == 0 : "并发 Bug 复现：剩余库存 = " + remain + "（期望 0）";
    }
}
```

## 四、验证矩阵（注释/运行方式 + 预期现象）

| 操作 | 运行方式 | 预期现象 | 说明 |
|---|---|---|---|
| **Demo1 原子性** | 只保留 `demo1Atomicity()`，其余注释 | 理论值 500000，实际值 < 500000 | count++ 非原子，丢更新 |
| **Demo2 可见性** | 只保留 `demo2Visibility()` | 普通变量：打印「2 秒内没看到修改」；volatile：立即退出 | 偶发普通变量也能看到，多跑几次 |
| **Demo3 有序性** | 只保留 `demo3Reordering()` | 打印 DCL 单例正确写法 | 概念演示，理解指令重排 |
| **Demo4 并发减库存** | 只保留 `demo4StockDeduct()`（需要 MySQL） | 自动补满库存 100，100 线程各扣 1 → 剩余 ≠ 0（实测 98） | 无锁并发丢失更新复现 |
| **OversellTest** | `mvn test -Dtest=OversellTest` | 剩余库存 ≠ 0（通常 97 左右），断言失败 | 并发 Bug 稳定复现 |
| **curl 单次扣减** | `curl -X POST "localhost:8080/stock/deduct?stockId=1&count=5"` | 返回 success，库存 -5 | 单线程下无问题，只有并发才出错 |

## 五、关键结论（这步你要记住）

1. **并发三特性**：原子性（count++ / 查改写）、可见性（缓存）、有序性（指令重排）。
2. `volatile` 只解决**可见性 + 有序性**，**解决不了原子性**——所以库存扣减不能只靠 volatile。
3. 库存扣减的正确性需要「原子性」，这是 Step2 用 synchronized 要解决的。
4. 单线程 curl 永远测不出 Bug，必须用并发测试（CountDownLatch 模拟同时开跑）。
