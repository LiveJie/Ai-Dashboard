# Step 2 · 具体实现（2026-08-01）

> 计划大纲见 [stepByStep.md](../../../stepByStep.md) Step 2
> 训练记录见 [step2-学习记录.md](step2-学习记录.md)
> 本文件 = Step 2 的完整可运行代码（与项目中已创建的文件完全一致）

## 一、建表 SQL + 初始数据

```sql
CREATE TABLE t_reservation (
    id          BIGINT      NOT NULL AUTO_INCREMENT COMMENT '主键',
    table_no    VARCHAR(32) NOT NULL COMMENT '桌位号(如 A01)',
    order_id    BIGINT      DEFAULT NULL COMMENT '预订关联订单号',
    status      TINYINT     NOT NULL DEFAULT 1 COMMENT '状态:0空闲 1已预订',
    book_time   VARCHAR(32) NOT NULL COMMENT '预订时间段(如 2026-08-01 18:00-20:00)',
    create_time DATETIME    NOT NULL DEFAULT CURRENT_TIMESTAMP COMMENT '创建时间',
    update_time DATETIME    NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP COMMENT '更新时间',
    PRIMARY KEY (id),
    UNIQUE KEY uk_table_time (table_no, book_time) COMMENT '唯一索引:同一桌位同一时间段只能订一次(DB层最后防线)'
) ENGINE = InnoDB COMMENT '包间桌位预订表(并发训练)';
```

> `t_stock` 表沿用 Step1（不重建、不改动）。

## 二、改动文件总览（新增 9 个，不改动任何既有文件）

| # | 文件 | 作用 | 关键现象 |
|---|---|---|---|
| 1 | `entity/Reservation.java` | 映射 t_reservation 表 | 无 |
| 2 | `mapper/ReservationMapper.java` | 继承 BaseMapper 提供单表 CRUD | 无 |
| 3 | `service/ReservationService.java` | 接口：`book()` 预订 | 无 |
| 4 | `service/impl/ReservationServiceImpl.java` | **锁粒度=桌位+时间段**，防重复预订 | 并发双订只有一个成功 |
| 5 | `controller/ReservationController.java` | POST /reservation/book | 供 curl 手动验证 |
| 6 | `service/SynchronizedStockService.java` | 接口：4 种加锁方式的扣库存 | 无 |
| 7 | `service/impl/SynchronizedStockServiceImpl.java` | **synchronized 修复超卖**（4 种加锁方式） | 100 线程抢 100 库存不超卖 |
| 8 | `test/.../SynchronizedTest.java` | 不超卖验证 + 桌位双订验证 | 剩余 0、双订仅 1 成功 |
| 9 | `test/.../LockLevelDemo.java` | 锁对象/可重入/字符串锁陷阱/锁升级 | 见下方验证矩阵 |

> 说明：计划大纲里只列了 `SynchronizedStockServiceImpl`，为保持项目「entity/mapper/service/controller 分层」约定，补充了接口 `SynchronizedStockService`（不算额外代码，只是按规范补全分层）。

## 三、每个文件完整代码

### 1. entity/Reservation.java（对应表 t_reservation）

```java
package com.jiege.reggie.entity;

import com.baomidou.mybatisplus.annotation.IdType;
import com.baomidou.mybatisplus.annotation.TableField;
import com.baomidou.mybatisplus.annotation.TableId;
import com.baomidou.mybatisplus.annotation.TableName;
import lombok.Data;

import java.io.Serializable;

/**
 * 包间桌位预订表（并发训练 Step2）
 * <p>业务场景：同一桌位同一时间段不能被两个人同时订走。
 * <p>锁定关键：代码层用 synchronized 控制「查重-插入」原子性；
 * 数据库层用唯一索引 uk_table_time(table_no, book_time) 做最后防线。
 *
 * @author jiege
 * @since 2026-08-01
 */
@Data
@TableName("t_reservation")
public class Reservation implements Serializable {

    private static final long serialVersionUID = 1L;

    @TableId(value = "id", type = IdType.AUTO)
    private Long id;

    /** 桌位号（如 A01、B02） */
    @TableField("table_no")
    private String tableNo;

    /** 预订关联订单号 */
    @TableField("order_id")
    private Long orderId;

    /** 状态：0 空闲 1 已预订 */
    @TableField("status")
    private Integer status;

    /** 预订时间段（如 2026-08-01 18:00-20:00） */
    @TableField("book_time")
    private String bookTime;
}
```

### 2. mapper/ReservationMapper.java

```java
package com.jiege.reggie.mapper;

import com.baomidou.mybatisplus.core.mapper.BaseMapper;
import com.jiege.reggie.entity.Reservation;
import org.apache.ibatis.annotations.Mapper;

/**
 * 桌位预订 Mapper（Step2）
 * <p>继承 BaseMapper 提供单表 CRUD；「查重-插入」的原子性由 Service 层 synchronized 保证，
 * DB 唯一索引兜底。
 *
 * @author jiege
 * @since 2026-08-01
 */
@Mapper
public interface ReservationMapper extends BaseMapper<Reservation> {
}
```

### 3. service/ReservationService.java

```java
package com.jiege.reggie.service;

import com.baomidou.mybatisplus.extension.service.IService;
import com.jiege.reggie.entity.Reservation;

/**
 * 桌位预订服务接口（Step2）
 *
 * @author jiege
 * @since 2026-08-01
 */
public interface ReservationService extends IService<Reservation> {

    /**
     * 预订桌位：同一桌位同一时间段只能订一次
     *
     * @param tableNo  桌位号（如 A01）
     * @param bookTime 预订时间段（如 2026-08-01 18:00-20:00）
     * @param orderId  关联订单号
     * @return true=预订成功；false=该桌位此时间段已被预订
     */
    boolean book(String tableNo, String bookTime, Long orderId);
}
```

### 4. service/impl/ReservationServiceImpl.java（Step2 核心：锁粒度 = 桌位+时间段）

```java
package com.jiege.reggie.service.impl;

import com.baomidou.mybatisplus.core.conditions.query.LambdaQueryWrapper;
import com.baomidou.mybatisplus.extension.service.impl.ServiceImpl;
import com.jiege.reggie.entity.Reservation;
import com.jiege.reggie.mapper.ReservationMapper;
import com.jiege.reggie.service.ReservationService;
import org.springframework.dao.DuplicateKeyException;
import org.springframework.stereotype.Service;

import java.util.Map;
import java.util.concurrent.ConcurrentHashMap;

/**
 * ============================================================
 *  Step2：包间桌位预订（synchronized 防重复预订）
 * ============================================================
 * 【总描述】
 * 业务规则：同一桌位同一时间段只能被订一次。
 * 无锁实现：两个线程同时「查重(没订过)」→「插入」，会双双成功 → 一桌两订。
 * 本类用 synchronized 把「查重-插入」包成临界区，锁粒度 = 桌位 + 时间段；
 * DB 层再加唯一索引兜底（分布式/集群下进程内锁失效时的最后防线）。
 *
 * 【锁粒度设计】
 * 1. 粗粒度（锁整个 Service/Class）：所有桌位互斥，A 桌预订会阻塞 B 桌 → 吞吐低。
 * 2. 细粒度（锁 table_no + book_time）：不同桌位、不同时间段互不阻塞 → 推荐。
 * 3. 锁对象池用 ConcurrentHashMap：key = "桌位号:时间段"，内存常驻，
 *    桌位有限所以可接受；若 key 无限增长需考虑淘汰（面试可展开）。
 *
 * @author jiege
 * @since 2026-08-01
 */
@Service
public class ReservationServiceImpl extends ServiceImpl<ReservationMapper, Reservation>
        implements ReservationService {

    /**
     * 锁对象池：key = "tableNo:bookTime" → 该桌位该时间段唯一的锁对象
     * <p>ConcurrentHashMap.computeIfAbsent 保证同一个 key 永远拿到同一个对象，
     * 且并发下不会重复创建（Map 本身线程安全）。
     */
    private final Map<String, Object> LOCK_POOL = new ConcurrentHashMap<>();

    /**
     * ============================================================
     *  预订桌位：同一桌位同一时间段只能订一次
     * ============================================================
     * 【演示什么】synchronized 代码块锁，锁粒度 = 「桌位 + 时间段」。
     * 两个线程同时订同一桌位同一时间段，只有一个能成功。
     * 【原理】「查重-插入」两步不是原子操作：不加锁时，线程A查重发现没有、
     * 线程B也查重发现没有 → 两个都插入 → 重复预订。加了锁，两个线程串行
     * 执行临界区：A 插入成功，B 再查重时发现已有 → 拒绝。
     * 【预期现象】并发双订同一桌位：恰好 1 个返回 true，1 个返回 false。
     * 【解决方法】（改前 → 改后）
     * 1. 代码块锁 + 锁对象池（推荐，粒度=桌位+时间）
     *    改前：直接 count 查重 → save 插入          // 两步不原子
     *    改后：synchronized (getLock(tableNo, bookTime)) { count 查重; save 插入; }
     * 2. 锁整个方法 synchronized book(...)          // 简单但所有桌位互斥
     *    改前：public boolean book(...) { ... }
     *    改后：public synchronized boolean book(...) { ... }
     * 3. DB 唯一索引兜底（必须保留）：
     *    改前：UNIQUE KEY 不存在
     *    改后：UNIQUE KEY uk_table_time (table_no, book_time)
     *    场景：将来拆成多实例/集群，进程内 synchronized 各自为政，
     *    两个实例可能同时通过查重 → 唯一索引让第二个插入抛 DuplicateKeyException
     *    → 捕获后返回 false，防止脏数据落库。
     * 【局限】进程内锁只对单实例有效；分布式场景要用分布式锁（Redis 锁/DB 锁），
     * 这是 Step8 对比的重点，这里先感受"锁粒度"的设计思想。
     */
    @Override
    public boolean book(String tableNo, String bookTime, Long orderId) {
        // ① 锁对象 = 桌位 + 时间段：同一桌位同一时间段互斥，其他桌位不阻塞
        Object lock = LOCK_POOL.computeIfAbsent(tableNo + ":" + bookTime, k -> new Object());
        synchronized (lock) {
            // ② 查重：该桌位该时间段是否已有「已预订」记录
            Long exists = count(new LambdaQueryWrapper<Reservation>()
                    .eq(Reservation::getTableNo, tableNo)
                    .eq(Reservation::getBookTime, bookTime)
                    .eq(Reservation::getStatus, 1));
            if (exists > 0) {
                return false;   // 已被预订，拒绝
            }
            // ③ 插入预订记录
            Reservation r = new Reservation();
            r.setTableNo(tableNo);
            r.setBookTime(bookTime);
            r.setOrderId(orderId);
            r.setStatus(1);
            try {
                return save(r);
            } catch (DuplicateKeyException e) {
                // ④ DB 唯一索引兜底：多实例/集群下两个线程都通过查重时，
                //    第二个 insert 命中唯一索引抛异常 → 视为预订失败
                return false;
            }
        }
    }
}
```

### 5. controller/ReservationController.java

```java
package com.jiege.reggie.controller;

import com.jiege.reggie.common.R;
import com.jiege.reggie.service.ReservationService;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.web.bind.annotation.PostMapping;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RequestParam;
import org.springframework.web.bind.annotation.RestController;

/**
 * 桌位预订 Controller（Step2）
 * <p>curl 手动验证：两个终端同时请求同一桌位同一时间段，只有一个成功。
 *
 * @author jiege
 * @since 2026-08-01
 */
@RestController
@RequestMapping("/reservation")
public class ReservationController {

    @Autowired
    private ReservationService reservationService;

    /**
     * 预订桌位：同一桌位同一时间段只能订一次
     * <p>POST /reservation/book?tableNo=A01&bookTime=2026-08-01 18:00-20:00&orderId=1001
     */
    @PostMapping("/book")
    public R<Boolean> book(@RequestParam String tableNo,
                           @RequestParam String bookTime,
                           @RequestParam Long orderId) {
        boolean ok = reservationService.book(tableNo, bookTime, orderId);
        return ok ? R.success(true) : R.fail("该桌位此时间段已被预订");
    }
}
```

### 6. service/SynchronizedStockService.java

```java
package com.jiege.reggie.service;

import com.baomidou.mybatisplus.extension.service.IService;
import com.jiege.reggie.entity.Stock;

/**
 * 加锁扣库存服务接口（Step2）
 * <p>同一个扣减逻辑（查库存→判断→扣减→落库），分别用 4 种 synchronized
 * 加锁方式实现，用来对比「锁对象/锁粒度」的选择。
 *
 * @author jiege
 * @since 2026-08-01
 */
public interface SynchronizedStockService extends IService<Stock> {

    /**
     * 方式一：synchronized 修饰实例方法，锁对象 = this（Spring 单例 Bean，全局唯一）
     */
    boolean deductMethodLock(Long id, int count);

    /**
     * 方式二：synchronized (Class) 代码块，等价于「静态方法锁」，锁对象 = Class
     */
    boolean deductClassLock(Long id, int count);

    /**
     * 方式三：synchronized (自定义锁对象)，锁对象 = 服务内唯一的 Object 实例
     */
    boolean deductObjectLock(Long id, int count);

    /**
     * 方式四：synchronized (按菜品隔离的锁对象)，锁粒度 = 单个菜品，不同菜品互不阻塞
     */
    boolean deductDishLock(Long id, int count);
}
```

### 7. service/impl/SynchronizedStockServiceImpl.java（Step2 核心：4 种加锁方式）

```java
package com.jiege.reggie.service.impl;

import com.baomidou.mybatisplus.extension.service.impl.ServiceImpl;
import com.jiege.reggie.entity.Stock;
import com.jiege.reggie.mapper.StockMapper;
import com.jiege.reggie.service.SynchronizedStockService;
import org.springframework.stereotype.Service;

import java.util.Map;
import java.util.concurrent.ConcurrentHashMap;

/**
 * ============================================================
 *  Step2：用 synchronized 修复 Step1 超卖
 * ============================================================
 * 【总描述】
 * Step1 的 StockServiceImpl 是「无锁」实现：查库存→判断→扣减→落库四步
 * 不是原子操作，并发下必然丢更新/超卖。本类用 synchronized 把四步包成一个
 * 临界区，用 4 种加锁方式演示「锁对象/锁粒度」的区别。
 *
 * 【4 种加锁方式对比】
 * | 方式 | 写法 | 锁对象 | 粒度 | 评价 |
 * |---|---|---|---|---|
 * | 一 | 实例方法加 synchronized | this（单例） | 全局粗锁 | 简单但所有菜品互相阻塞 |
 * | 二 | synchronized(Class) 代码块 | Class | 全局粗锁 | 等价静态方法锁 |
 * | 三 | synchronized(自定义 Object) | 唯一锁对象 | 全局粗锁 | 原理同二，更直观 |
 * | 四 | synchronized(按菜品隔离) | 每菜品一个锁 | 细粒度 | 不同菜品互不阻塞，推荐 |
 *
 * 【关键点】
 * 1. 所有线程必须锁【同一个对象】才互斥——锁不同的对象等于没锁。
 * 2. 临界区必须包住「查-判-扣-存」全部四步，只锁 updateById 那一步没用
 *    （两个线程还是会读到同一个旧库存）。
 * 3. 方式四的锁对象池用 ConcurrentHashMap 管理，key=stockId；
 *    同一个菜品的线程拿到同一个锁对象，不同菜品的线程各拿各的。
 *
 * @author jiege
 * @since 2026-08-01
 */
@Service
public class SynchronizedStockServiceImpl extends ServiceImpl<StockMapper, Stock>
        implements SynchronizedStockService {

    /** 方式三专用：全类共享的唯一锁对象（所有菜品互斥） */
    private final Object GLOBAL_LOCK = new Object();

    /** 方式四专用：锁对象池，key = stockId，粒度 = 单个菜品 */
    private final Map<Long, Object> DISH_LOCKS = new ConcurrentHashMap<>();

    /**
     * ============================================================
     *  方式一：synchronized 实例方法
     * ============================================================
     * 【演示什么】synchronized 修饰实例方法时，锁对象是 this（当前实例）。
     * 因为 SynchronizedStockServiceImpl 是 Spring 单例 Bean，所有请求拿到的
     * 都是同一个 this，所以并发扣库存会被串行化。
     * 【原理】JVM 给方法加上 ACC_SYNCHRONIZED 标志，进入方法前自动 monitorenter，
     * 退出时 monitorexit，等价于 synchronized(this){整个方法体}。
     * 【预期现象】100 线程并发扣 100 库存，最终剩余 0、成功数 100，不超卖。
     * 【解决方法】（改前 → 改后）
     * 1. 方法加 synchronized
     *    改前：public boolean deduct(Long id, int count) { ... }
     *    改后：public synchronized boolean deductMethodLock(Long id, int count) { ... }
     * 2. 缺点：this 是全局唯一 → 所有菜品（id=1/2/3）的扣减互相阻塞，吞吐低
     */
    @Override
    public synchronized boolean deductMethodLock(Long id, int count) {
        return doDeduct(id, count);   // 整个「查-判-扣-存」都在锁内
    }

    /**
     * ============================================================
     *  方式二：synchronized (Class) 代码块（等价静态方法锁）
     * ============================================================
     * 【演示什么】静态方法用 synchronized 时锁的是 Class 对象；
     * 用代码块 synchronized(类.class) 可以达到同样效果，还更灵活。
     * 【原理】SynchronizedStockServiceImpl.class 在 JVM 里全局唯一，
     * 所有实例（哪怕 new 多个对象）都会互斥——比方式一的 this 锁更"狠"。
     * 【预期现象】100 线程并发扣 100 库存，最终剩余 0、成功数 100，不超卖。
     * 【解决方法】（改前 → 改后）
     * 1. 代码块锁 Class
     *    改前：stockService.deduct(...)   // 无锁
     *    改后：synchronized (SynchronizedStockServiceImpl.class) { doDeduct(id, count); }
     * 2. 等价写法：public static synchronized boolean deduct(...)
     * 3. 缺点：Class 锁是全局锁，连不同实例都互斥，粒度最粗
     */
    @Override
    public boolean deductClassLock(Long id, int count) {
        synchronized (SynchronizedStockServiceImpl.class) {
            return doDeduct(id, count);
        }
    }

    /**
     * ============================================================
     *  方式三：synchronized (自定义锁对象)
     * ============================================================
     * 【演示什么】不锁 this、不锁 Class，而锁一个我们自己 new 出来的对象。
     * 这是最常写的写法，适合只保护「部分代码」而不是整个方法。
     * 【原理】互斥的唯一条件 = 所有线程锁的是同一个对象。GLOBAL_LOCK 是
     * 单例 Bean 的一个字段，全 JVM 只有一份 → 线程安全。
     * 【预期现象】100 线程并发扣 100 库存，最终剩余 0、成功数 100，不超卖。
     * 【解决方法】（改前 → 改后）
     * 1. 自定义锁对象
     *    改前：stockService.deduct(...)   // 无锁
     *    改后：synchronized (GLOBAL_LOCK) { doDeduct(id, count); }
     * 2. 为什么用 private final Object GLOBAL_LOCK = new Object()？
     *    - final：防止字段被替换成别的对象导致锁失效
     *    - private：防止外部拿到锁对象做奇怪的事
     * 3. 缺点：仍是全局锁，所有菜品互斥；粒度由锁对象决定，想细化就看方式四
     */
    @Override
    public boolean deductObjectLock(Long id, int count) {
        synchronized (GLOBAL_LOCK) {
            return doDeduct(id, count);
        }
    }

    /**
     * ============================================================
     *  方式四：synchronized (按菜品隔离的锁对象) —— 推荐
     * ============================================================
     * 【演示什么】锁粒度 = 单个菜品。扣 id=1 的线程只和扣 id=1 的线程互斥，
     * 扣 id=2 的线程完全不受影响 → 并发度最高，且正确性不受影响。
     * 【原理】DISH_LOCKS 是一个 ConcurrentHashMap（线程安全的 Map），
     * computeIfAbsent：key 不存在时才创建锁对象，存在则直接复用 → 同一个
     * stockId 永远拿到同一个锁对象。锁对象池要跟着业务维度走（这里按菜品）。
     * 【预期现象】100 线程并发扣 id=1 库存，最终剩余 0、成功数 100，不超卖；
     * 同时并发扣 id=2 也不会被阻塞（吞吐对比见 SynchronizedTest 输出）。
     * 【解决方法】（改前 → 改后）
     * 1. 按业务维度细分锁
     *    改前：synchronized (GLOBAL_LOCK) { ... }        // 全局互斥
     *    改后：synchronized (getDishLock(id)) { ... }    // 按菜品互斥
     * 2. 获取锁对象（关键）
     *    改前：Object lock = new Object();               // 每次 new = 锁不同对象 = 没锁！
     *    改后：Object lock = DISH_LOCKS.computeIfAbsent(id, k -> new Object());
     * 3. 锁池会常驻内存：菜品数量固定（业务表有限行），可接受；
     *    若 key 无限增长，需考虑过期清理，这是后话（面试可展开）
     */
    @Override
    public boolean deductDishLock(Long id, int count) {
        // ① 取该菜品的专属锁对象：同一个 id 永远返回同一个对象
        Object dishLock = DISH_LOCKS.computeIfAbsent(id, k -> new Object());
        synchronized (dishLock) {   // ② 只锁这一个菜品，其他菜品不阻塞
            return doDeduct(id, count);
        }
    }

    /**
     * 【核心扣减逻辑】查库存 → 判断充足 → 扣减 → 落库。
     * <p>注意：本方法【本身不加锁】，必须由外部 4 个加锁方法在临界区内调用，
     * 否则四步又变成非原子 → 超卖复发（这就是 Step1 的 Bug）。
     * 放大竞态窗口的 Thread.sleep(10) 保留，方便对比「加锁前/后」的现象差异。
     */
    private boolean doDeduct(Long id, int count) {
        // ① 查询当前库存
        Stock stock = getById(id);
        if (stock == null) {
            return false;
        }
        // ② 模拟耗时：放大「查-判-扣-存」之间的竞态窗口（教学用，与 Step1 一致）
        try {
            Thread.sleep(10);
        } catch (InterruptedException e) {
            Thread.currentThread().interrupt();
        }
        // ③ 判断库存是否充足
        if (stock.getQuantity() < count) {
            return false;
        }
        // ④ 扣减并落库
        stock.setQuantity(stock.getQuantity() - count);
        return updateById(stock);
    }
}
```

### 8. test/.../SynchronizedTest.java（@SpringBootTest，直接跑 JUnit）

```java
package com.jiege.reggie.demos.concurrency;

import com.baomidou.mybatisplus.core.conditions.query.LambdaQueryWrapper;
import com.jiege.reggie.entity.Reservation;
import com.jiege.reggie.entity.Stock;
import com.jiege.reggie.service.ReservationService;
import com.jiege.reggie.service.SynchronizedStockService;
import org.junit.jupiter.api.Test;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.boot.test.context.SpringBootTest;

import java.util.concurrent.CountDownLatch;
import java.util.concurrent.atomic.AtomicInteger;

/**
 * ============================================================
 *  Step2-验证：synchronized 修复超卖 + 桌位防重复预订
 * ============================================================
 * 【总描述】
 * 1. synchronizedNoOversell：100 线程抢 100 库存，用 Step2 的 4 种加锁方式
 *    各跑一遍，验证都不超卖（对比 Step1 OversellTest 的失败结果）。
 * 2. reservationDoubleBook：两个线程同时订同一桌位同一时间段，
 *    验证恰好只有 1 个成功（无锁实现会双双成功）。
 *
 * 【预期现象】
 * - 4 种加锁方式：成功数 == 100、剩余库存 == 0（不超卖）
 * - 桌位双订：成功数 == 1
 *
 * @author jiege
 */
@SpringBootTest
class SynchronizedTest {

    @Autowired
    private SynchronizedStockService syncStockService;

    @Autowired
    private ReservationService reservationService;

    /**
     * ============================================================
     *  Test1：100 线程抢 100 库存（4 种加锁方式逐一验证）
     * ============================================================
     * 【演示什么】synchronized 把「查-判-扣-存」四步包成临界区后，
     * 并发扣库存不再丢失更新。
     * 【原理】同一把锁同一时刻只允许一个线程进入临界区；线程串行执行
     * 四步，后一个线程读到的一定是前一个线程写回的新库存 → 账目对得上。
     * 【预期现象】每种方式打印：成功数 = 100、剩余库存 = 0（不超卖）。
     * 【解决方法】（改前 → 改后）
     * 1. 无锁版（Step1 Bug）：
     *    改前：public boolean deduct(...) { 查; 判; 扣; 存; }   // 四步非原子
     *    改后：加 synchronized 锁住四步（本类 4 种加锁方式任选其一）
     * 2. 若断言失败（剩余 != 0）→ 说明锁对象没选对（多个线程锁了不同对象）
     */
    @Test
    void synchronizedNoOversell() throws Exception {
        // ① 4 种加锁方式：lambda 数组，分别执行 deductMethodLock / deductClassLock
        //    / deductObjectLock / deductDishLock
        String[] styles = {"方式一-实例方法锁", "方式二-Class锁", "方式三-自定义锁对象", "方式四-按菜品锁"};
        for (int s = 0; s < styles.length; s++) {
            // ② 先取出本轮要用的加锁方式（final，供 lambda 捕获），再重置库存为 100
            final java.util.function.BiFunction<Long, Integer, Boolean> deduct = switch (s) {
                case 0 -> syncStockService::deductMethodLock;
                case 1 -> syncStockService::deductClassLock;
                case 2 -> syncStockService::deductObjectLock;
                default -> syncStockService::deductDishLock;
            };
            Stock stock = syncStockService.getById(1L);
            if (stock == null) {
                throw new IllegalStateException("请先执行 Step1 建表 SQL，并插入 id=1 的库存数据");
            }
            stock.setQuantity(100);
            syncStockService.updateById(stock);

            // ③ 100 线程并发各扣 1（CountDownLatch 发令枪，真正同时起跑）
            int threads = 100;
            CountDownLatch ready = new CountDownLatch(threads);
            CountDownLatch start = new CountDownLatch(1);
            CountDownLatch done = new CountDownLatch(threads);
            AtomicInteger success = new AtomicInteger(0);
            for (int i = 0; i < threads; i++) {
                new Thread(() -> {
                    ready.countDown();
                    try { start.await(); } catch (InterruptedException e) { Thread.currentThread().interrupt(); }
                    try {
                        if (deduct.apply(1L, 1)) {
                            success.incrementAndGet();
                        }
                    } finally {
                        done.countDown();
                    }
                }).start();
            }
            ready.await();
            long begin = System.currentTimeMillis();
            start.countDown();
            done.await();
            long cost = System.currentTimeMillis() - begin;

            // ④ 打印并断言：成功数 100、剩余 0
            int remain = syncStockService.getById(1L).getQuantity();
            System.out.println("【" + styles[s] + "】100 线程抢 100 库存，耗时 " + cost + "ms"
                    + "，成功数 = " + success.get() + "，剩余 = " + remain);
            org.junit.jupiter.api.Assertions.assertEquals(100, success.get(),
                    styles[s] + "：有线程扣减失败");
            org.junit.jupiter.api.Assertions.assertEquals(0, remain,
                    styles[s] + "：库存对不上账，仍超卖/丢更新");
        }
        System.out.println(">>> 4 种加锁方式全部通过：synchronized 修复超卖成功！");
    }

    /**
     * ============================================================
     *  Test2：两个线程同时订同一桌位同一时间段 → 只能成功 1 个
     * ============================================================
     * 【演示什么】synchronized 锁粒度 = 「桌位 + 时间段」防重复预订。
     * 【原理】两个线程同时进入 book()：若不加锁，都查重(没订过)→都插入 → 一桌两订；
     * 加了锁后串行执行临界区：A 插入成功，B 再查重发现已有 → 返回 false。
     * 【预期现象】并发双订同一桌位：成功数 = 1（另一个被拒绝）。
     * 【解决方法】（改前 → 改后）
     * 1. 代码块锁 + 锁对象池（锁粒度=桌位+时间）：
     *    改前：count 查重 → save 插入（两步不原子）
     *    改后：synchronized (LOCK_POOL.computeIfAbsent(tableNo+":"+bookTime, ...)) { ... }
     * 2. DB 唯一索引兜底：集群下进程内锁各自为政时，靠 uk_table_time 拦截
     */
    @Test
    void reservationDoubleBook() throws Exception {
        // ① 固定桌位+时间段（book_time 列是 VARCHAR(32)，不能拼超长时间戳）；
        //    跑前先清掉该桌位该时间段的遗留数据，保证测试可重复执行
        String tableNo = "A01";
        String bookTime = "2026-08-01 18:00-20:00";
        // 清掉该桌位该时间段的遗留数据（保证从"未预订"状态开始）
        reservationService.remove(new LambdaQueryWrapper<Reservation>()
                .eq(Reservation::getTableNo, tableNo)
                .eq(Reservation::getBookTime, bookTime));

        // ② 两个线程同时订同一桌位同一时间段（带不同的订单号）
        int threads = 2;
        CountDownLatch ready = new CountDownLatch(threads);
        CountDownLatch start = new CountDownLatch(1);
        CountDownLatch done = new CountDownLatch(threads);
        AtomicInteger success = new AtomicInteger(0);
        for (int i = 0; i < threads; i++) {
            final long orderId = 1000L + i;
            new Thread(() -> {
                ready.countDown();
                try { start.await(); } catch (InterruptedException e) { Thread.currentThread().interrupt(); }
                try {
                    if (reservationService.book(tableNo, bookTime, orderId)) {
                        success.incrementAndGet();
                    }
                } finally {
                    done.countDown();
                }
            }).start();
        }
        ready.await();
        start.countDown();
        done.await();

        // ③ 打印并断言：恰好 1 个成功
        long rows = reservationService.count(new LambdaQueryWrapper<Reservation>()
                .eq(Reservation::getTableNo, tableNo)
                .eq(Reservation::getBookTime, bookTime)
                .eq(Reservation::getStatus, 1));
        System.out.println("【桌位双订】2 线程抢同一桌位同一时间段：成功数 = " + success.get() + "，落库记录数 = " + rows);
        org.junit.jupiter.api.Assertions.assertEquals(1, success.get(), "重复预订了！同一桌位同一时间段只能订一次");
        org.junit.jupiter.api.Assertions.assertEquals(1, rows, "数据库记录数与成功数不一致");
        System.out.println(">>> 桌位防重复预订验证通过：同一桌位同一时间段只能被订走一次！");
    }
}
```

### 9. test/.../LockLevelDemo.java（main 直接运行）

```java
package com.jiege.reggie.demos.concurrency;

/**
 * ============================================================
 *  Step2-演示：synchronized 锁机制（锁对象 / 可重入 / 字符串锁陷阱 / 锁升级）
 * ============================================================
 * 【总描述】
 * 本类回答 4 个问题：
 *   1. synchronized 三种用法分别锁的是谁？（实例方法=this / 静态方法=Class / 代码块=指定对象）
 *   2. 可重入性：同一线程重复拿同一把锁会不会死锁？
 *   3. 字符串常量做锁有什么坑？怎么避免？
 *   4. 锁升级：无锁 → 偏向锁 → 轻量级锁 → 重量级锁（JVM 层面怎么升级的？）
 *
 * 【使用方法】
 * main 方法里选择要跑的 demo（默认全跑），观察每个 demo 的「预期现象」。
 *
 * @author jiege
 */
public class LockLevelDemo {

    public static void main(String[] args) {
        // ===== 需要验证哪个就保留哪个，其余注释掉 =====
        demo1LockObject();    // Demo1：三种用法锁的是谁
        demo2Reentrant();     // Demo2：可重入性
        demo3StringLockTrap();// Demo3：字符串常量锁陷阱
        demo4LockUpgrade();   // Demo4：锁升级概念
        // ============================================
    }

    /**
     * ============================================================
     *  Demo1 三种 synchronized 用法：锁的分别是哪个对象
     * ============================================================
     * 【演示什么】实例方法锁 / 静态方法锁 / 代码块锁，锁对象各不相同。
     * 【原理】JVM 层面 synchronized 都要拿到一个「对象监视器 Monitor」：
     * - 实例方法（非 static）→ 锁 this（当前实例）
     * - 静态方法（static）→ 锁 类名.class（Class 对象）
     * - 代码块 → 锁你写的那个对象
     * 用 System.identityHashCode 打印锁对象地址，能直观看到"锁的是谁"。
     * 【预期现象】打印三个不同的 identityHashCode：
     * 实例方法锁 = this 的地址；静态方法锁 = Class 的地址；代码块锁 = 自定义对象地址。
     * 【解决方法】（改前 → 改后）
     * 1. 实例方法：
     *    改前：public void m() { ... }
     *    改后：public synchronized void m() { ... }        // 锁 this
     * 2. 静态方法：
     *    改前：public static void m() { ... }
     *    改后：public static synchronized void m() { ... } // 锁 类.class
     * 3. 代码块（最灵活，推荐）：
     *    改前：{ ... }
     *    改后：synchronized (lock) { ... }                  // 锁 lock 对象
     * 关键：多个线程必须锁【同一个对象】才互斥；锁不同对象等于没锁。
     */
    private static void demo1LockObject() {
        LockDemoObject obj = new LockDemoObject();
        System.out.println("【Demo1 三种用法锁的对象】");
        obj.instanceMethod();                       // ① 实例方法锁：锁 this
        LockDemoObject.staticMethod();              // ② 静态方法锁：锁 Class
        obj.blockMethod();                          // ③ 代码块锁：锁自定义对象
    }

    /**
     * ============================================================
     *  Demo2 可重入性
     * ============================================================
     * 【演示什么】同一线程对同一把锁可以【重复进入】，不会自己锁死自己。
     * 【原理】Monitor 里记录着持有线程 + 重入计数：每次 monitorenter 计数+1，
     * 每次 monitorexit 计数-1，计数归 0 才真正释放。持有线程自己再进入时
     * 直接计数+1 放行，不阻塞。
     * 【预期现象】outer() 加锁 → 调用 inner()（也加同一把锁）→ 正常执行不死锁。
     * 【解决方法】（改前 → 改后）
     * 1. 理解可重入的价值：
     *    改前：外层方法加了锁，内层方法如果不可重入就得等外层释放 → 自己等自己 = 死锁
     *    改后：synchronized 天然可重入，outer 锁内调 inner 直接通过（对比见下）
     * 2. 反例：如果用「不可重入锁」（自己写锁不处理重入），outer 锁内调 inner
     *    就会死锁。所以 Java 内置锁可重入是底线保障。
     */
    private static void demo2Reentrant() {
        ReentrantDemo rd = new ReentrantDemo();
        System.out.println("【Demo2 可重入性】");
        rd.outer();
    }

    /**
     * ============================================================
     *  Demo3 字符串常量做锁的陷阱
     * ============================================================
     * 【演示什么】用字符串当锁对象有两个坑：
     * 坑1 字符串【拼接】每次 new 新对象 → 两个线程锁的不是同一个对象 → 锁失效；
     * 坑2 字符串【字面量】在常量池全局共享 → 无关代码锁同一个字面量会互相干扰。
     * 【原理】String 是不可变对象：
     * - 用 + 拼接（非常量折叠时）会 new 出新的 String，identityHashCode 不同；
     * - 写死字面量会进字符串常量池，同一内容同一地址（intern 池全局一份）。
     * 【预期现象】打印拼接字符串的地址不同（== false）、字面量的地址相同（== true）。
     * 【解决方法】（改前 → 改后）
     * 1. 不用字符串做锁，用专用锁对象池（本步 ReservationServiceImpl 的做法）：
     *    改前：synchronized (tableNo + ":" + bookTime) { ... }  // 每次 new，锁失效
     *    改后：synchronized (LOCK_POOL.computeIfAbsent(tableNo + ":" + bookTime, k -> new Object())) { ... }
     * 2. 非要用字符串：用 String.intern() 强制复用常量池对象
     *    改前：synchronized (tableNo) { ... }
     *    改后：synchronized (tableNo.intern()) { ... }          // 谨慎：intern 池全局共享
     * 3. 千万别用写死字面量（如 synchronized ("lock")）当业务锁：
     *    任意两个业务都能拿到同一个对象互斥，还会和 JVM 内部/框架代码撞锁
     */
    private static void demo3StringLockTrap() {
        System.out.println("【Demo3 字符串锁陷阱】");
        // ① 陷阱1：字符串拼接（含运行时变量，防止 javac 常量折叠）每次 new 新对象
        //    → 两个线程 synchronized(s1) 和 synchronized(s2) 锁的是不同对象 = 锁失效
        String prefix = "A01";   // 运行时变量：写死字面量会被 javac 折叠进常量池
        String s1 = prefix + ":" + "18:00";
        String s2 = prefix + ":" + "18:00";
        System.out.println("  拼接字符串：s1 == s2 ? " + (s1 == s2)
                + "（false 说明两个对象，synchronized(s1) 和 synchronized(s2) 互不阻塞）");
        // ② 陷阱2：写死字面量进常量池 → 全局同一对象，无关业务也会互斥
        String s3 = "A01:18:00";
        String s4 = "A01:18:00";
        System.out.println("  写死字面量：s3 == s4 ? " + (s3 == s4)
                + "（true 说明常量池同一对象，任何地方 synchronized(\"A01:18:00\") 都互相干扰）");
        // ③ 正确做法：intern() 复用池对象，但要注意池是全局共享的
        System.out.println("  解法：synchronized((tableNo + \":\" + bookTime).intern()) 或专用锁对象池（推荐）");
    }

    /**
     * ============================================================
     *  Demo4 锁升级：无锁 → 偏向锁 → 轻量级锁 → 重量级锁
     * ============================================================
     * 【演示什么】synchronized 不是一上来就是重量级锁，JVM 会按竞争程度
     * 逐级升级（只升不降），核心目的是让"竞争不激烈的场景"开销尽量小。
     * 【原理】对象头 Mark Word 里存锁状态：
     * ① 无锁：Mark Word 存 hashCode 等普通信息；
     * ② 偏向锁：只有一个线程反复进入时，Mark Word 记录线程 ID，该线程再来
     *    无需任何 CAS，直接进临界区（性能最好）。JDK 15+ 默认关闭（JEP 374），
     *    JDK 17 已无偏向锁，实际路径：无锁 → 轻量级 → 重量级；
     * ③ 轻量级锁：第二个线程来抢时撤销偏向，改用 CAS 自旋抢锁，抢不到再升级；
     * ④ 重量级锁：CAS 自旋失败（竞争激烈）→ 挂起等待 + 操作系统互斥量（Monitor），
     *    线程被阻塞，需要内核态切换，开销最大但最公平。
     * 【预期现象】打印锁升级路径表 + JDK 版本说明（本机 JDK17：偏向锁已默认关闭）。
     * 【解决方法】（改前 → 改后）
     * 1. 减少锁竞争（从源头避免升级到重量级锁）：
     *    改前：synchronized (GLOBAL_LOCK) { ... }   // 全局粗锁，竞争激烈
     *    改后：synchronized (getDishLock(id)) { ... } // 锁粒度细分，竞争小
     * 2. 锁内少做事：把耗时的 IO/DB 移出临界区，缩短持锁时间
     *    改前：synchronized (lock) { 查DB; 判; 扣; 写DB; }
     *    改后：synchronized (lock) { 只做判+扣; }，查/写放到锁外
     * 3. 观察手段：JVM 参数 -XX:+PrintFlagsFinal 查偏向锁开关，
     *    或用 jol（Java Object Layout）看 Mark Word 变化（面试提一嘴即可）
     */
    private static void demo4LockUpgrade() {
        System.out.println("【Demo4 锁升级】synchronized 锁的 4 种状态（只升不降）");
        System.out.println("  " + pad("无锁", 10) + "：Mark Word 存 hashCode，无任何锁语义，开销 0");
        System.out.println("  " + pad("偏向锁", 10) + "：单线程反复进入，Mark Word 记录线程ID，开销最小");
        System.out.println("  " + pad("轻量级锁", 10) + "：多线程轮流进入，CAS 自旋抢锁，开销小");
        System.out.println("  " + pad("重量级锁", 10) + "：竞争激烈，线程挂起等待内核 Monitor，开销最大");
        System.out.println("  >>> 升级路径：无锁 → (偏向锁) → 轻量级锁 → 重量级锁，只升不降");
        System.out.println("  >>> 注意：本机 JDK " + System.getProperty("java.version")
                + "，JDK 15+ 默认关闭偏向锁（JEP 374），实际路径：无锁 → 轻量级 → 重量级");
        System.out.println("  >>> 面试点：锁粒度细化 + 临界区缩短，都能减少竞争、避免升级成重量级锁");
    }

    private static String pad(String s, int len) {
        StringBuilder sb = new StringBuilder(s);
        while (sb.length() < len) {
            sb.append(' ');
        }
        return sb.toString();
    }

    /** Demo1 用：演示三种加锁方式锁对象 */
    static class LockDemoObject {

        /** 代码块锁专用锁对象 */
        private final Object LOCK = new Object();

        /** 实例方法锁：锁 this */
        public synchronized void instanceMethod() {
            System.out.println("  实例方法锁 → 锁 this            ，identityHashCode = " + System.identityHashCode(this));
        }

        /** 静态方法锁：锁 Class */
        public static synchronized void staticMethod() {
            System.out.println("  静态方法锁 → 锁 Class           ，identityHashCode = " + System.identityHashCode(LockDemoObject.class));
        }

        /** 代码块锁：锁自定义对象 */
        public void blockMethod() {
            synchronized (LOCK) {
                System.out.println("  代码块锁   → 锁自定义 Object   ，identityHashCode = " + System.identityHashCode(LOCK));
            }
        }
    }

    /** Demo2 用：演示可重入（外层锁内调内层锁方法不死锁） */
    static class ReentrantDemo {

        /** 外层方法：加锁 */
        public synchronized void outer() {
            System.out.println("  outer() 已获取锁（this），重入计数 = 1");
            inner();   // 同一线程再次获取同一把锁 → 可重入
            System.out.println("  outer() 执行完毕，无死锁 → synchronized 可重入性验证通过");
        }

        /** 内层方法：同一把锁（this）再次加锁 */
        public synchronized void inner() {
            System.out.println("  inner() 再次获取同一把锁（this），重入计数 = 2，直接通过");
        }
    }
}
```

## 四、验证矩阵（注释/运行方式 + 预期现象）

| 操作 | 运行方式 | 预期现象 | 说明 |
|---|---|---|---|
| **SynchronizedTest.Test1** | `mvn test -Dtest=SynchronizedTest#synchronizedNoOversell` | 4 种加锁方式：成功数 100、剩余 0 | 对比 Step1 OversellTest（剩余≠0） |
| **SynchronizedTest.Test2** | `mvn test -Dtest=SynchronizedTest#reservationDoubleBook` | 2 线程双订同一桌位：成功数 1、落库 1 | 无锁会双双成功 |
| **LockLevelDemo.Demo1** | main 保留 demo1LockObject() | 打印 this / Class / 自定义对象 三个不同 identityHashCode | 三种用法锁对象不同 |
| **LockLevelDemo.Demo2** | main 保留 demo2Reentrant() | outer 锁内调 inner 不死锁 | 可重入性 |
| **LockLevelDemo.Demo3** | main 保留 demo3StringLockTrap() | 拼接字符串 == false；字面量 == true | 字符串做锁的两个坑 |
| **LockLevelDemo.Demo4** | main 保留 demo4LockUpgrade() | 打印 4 级锁 + JDK17 无偏向锁说明 | 锁升级概念 |
| **curl 桌位预订** | 先 `mvn spring-boot:run`，再两个终端同时 POST `/reservation/book` | 一个 success、一个 fail | 手动验证 |

> LockLevelDemo 运行命令：`mvn compile exec:java -Dexec.mainClass=com.jiege.reggie.demos.concurrency.LockLevelDemo -Dexec.classpathScope=test`

## 五、关键结论（这步你要记住）

1. **synchronized 三种用法**：实例方法锁 this / 静态方法锁 Class / 代码块锁指定对象。
2. **锁对象选择**：多线程必须锁【同一个对象】才互斥；锁粒度 = 锁对象的范围，
   细粒度（方式四/桌位+时间）并发度更高。
3. **字符串做锁的坑**：拼接每次 new（锁失效）、字面量全局共享（互相干扰）；
   正确做法 = 专用锁对象池或 intern()。
4. **可重入**：同一线程可重复进入同一把锁（Monitor 重入计数）。
5. **锁升级**：无锁 → 偏向锁 → 轻量级锁 → 重量级锁，只升不降；
   JDK 15+ 默认关闭偏向锁，JDK 17 实际路径为 无锁 → 轻量级 → 重量级。
6. **DB 兜底**：进程内 synchronized 只对单实例有效，集群必须靠唯一索引/分布式锁兜底。
