---
title: 图像质量分析：用 C 写一个帧分析器
date: 2026-05-15
summary: 从 Y 平面建直方图、算均值/标准差/中位数、输出过曝率和噪点估计——不依赖 OpenCV，在树莓派上用纯 C 完成图像质量分析。
category: embedded
tags: [直方图, 图像质量, ISP, C语言, 嵌入式]
draft: false
---

> 在 ISP 调优中，第一步不是调参数，是量化当前画面"长什么样"。
>
> 这篇文章用纯 C 写一个帧分析器，从 YUYV 裸帧到直方图、统计量、曝光评估和噪点估计，不依赖任何图像库。

---

## 1. 为什么要写这个东西

接触树莓派 V4L2 采集之后，我拿到了 `frame.raw`——一张 640×480 的 YUYV 裸帧，614400 字节。用 ffplay 能看，但我想用**数据**描述这张图的质量：

- 亮度正常吗？还是偏暗偏亮？
- 对比度够吗？还是灰蒙蒙的？
- 有没有过曝或欠曝的区域？
- 噪点大不大？

学 OpenCV 的老师会说用 `cv::calcHist` 和 `cv::meanStdDev`。但嵌入式上没有 OpenCV，你得自己算。

---

## 2. 分析链路

```
frame.raw (YUYV)  →  提取 Y 平面  →  建直方图  →  计算统计量
                                          ↓
                                    曝光评估 + 噪点估计
```

一共六个步骤，全部手写。

### 2.1 提取 Y 平面

YUYV 每 4 字节 = 2 个像素，Y 在每组的第 0 和第 2 字节：

```c
void extract_y_plane(unsigned char *yuyv, unsigned char *y, int w, int h)
{
    int i;
    for (i = 0; i < w * h; i++)
        y[i] = yuyv[i * 2];   // 只取偶数字节 = Y
}
```

### 2.2 建直方图

统计 0-255 每个亮度值各有多少个像素。只有两行代码，但它是所有后续分析的基础：

```c
void build_histogram(unsigned char *y, int pixels, int hist[256])
{
    memset(hist, 0, 256 * sizeof(int));
    for (int i = 0; i < pixels; i++)
        hist[y[i]]++;
}
```

### 2.3 基础统计量

**均值、标准差、中位数、极值**——这四个量直接描述了图像的亮度和对比度：

```c
// 均值
double compute_mean(unsigned char *y, int pixels) {
    double sum = 0;
    for (int i = 0; i < pixels; i++) sum += y[i];
    return sum / pixels;
}

// 标准差 — 太小说明对比度低，太大可能噪点多
double compute_stddev(unsigned char *y, int pixels, double mean) {
    double sum = 0.0;
    for (int i = 0; i < pixels; i++) {
        double d = y[i] - mean;
        sum += d * d;
    }
    return sqrt(sum / pixels);
}

// 中位数 — 从直方图累积，不受极端值影响
int compute_median(int hist[256], int pixels) {
    int cum = 0;
    for (int i = 0; i < 256; i++) {
        cum += hist[i];
        if (cum >= pixels / 2) return i;
    }
    return 0;
}
```

中位数从直方图算，O(256) 而不是 O(n log n)，而且对极值（死黑死白像素）不敏感。

### 2.4 曝光评估

过曝和欠曝的像素占比，直接告诉你曝光有没有出问题：

```c
over_count = 0; under_count = 0;
for (i = 0; i < w * h; i++) {
    if (y_plane[i] > 240) over_count++;    // 过曝
    if (y_plane[i] < 10)  under_count++;   // 欠曝
}
over_pct  = 100.0 * over_count  / (w * h);
under_pct = 100.0 * under_count / (w * h);
```

生产环境中，ISP 的自动曝光（AE）模块就是基于这类统计——直方图分布决定曝光时间和传感器增益。

### 2.5 简单噪点估计

水平相邻像素 Y 值差异的方差。差异越大 → 噪点越多：

```c
diff_sum = 0;
for (i = 0; i < w * h - 1; i++) {
    int diff = (int)y_plane[i] - (int)y_plane[i + 1];
    diff_sum += (long long)diff * diff;
}
noise_var = (double)diff_sum / (w * h - 1);
```

这个算法远不如 ISO 15739 标准（灰阶卡 + 泊松拟合）精确，但它只需要一行像素就能快速判断噪点水平。生产调优中先用这种快方法定位问题，再用标准流程做精确测量。

---

## 3. 实际输出

在树莓派上编译运行，对一张室内实拍帧的分析结果：

```
=== Frame Analysis ===
Resolution:     640x480
Mean:           147.9
StdDev:         55.7
Median:         158
Min/Max:        18 / 243
Over-exposed:   2.59%
Under-exposed:  0.00%
Noise Var:      24.6
```

### 怎么读这些数字

| 指标          | 数值   | 判断                   |
| ------------- | ------ | ---------------------- |
| Mean          | 147.9  | 正常室内光，略偏亮     |
| StdDev        | 55.7   | 对比度良好，画面不平淡 |
| Median        | 158    | 跟 Mean 接近，分布对称 |
| Min/Max       | 18/243 | 没死黑(0)没死白(255)   |
| Over-exposed  | 2.59%  | 略高，可能有窗户或灯   |
| Under-exposed | 0.00%  | 暗部细节保留良好       |
| Noise Var     | 24.6   | USB 摄像头正常范围     |

这套数据是 ISP 调优的起点。只要你学会了从数据里判断画面质量，就进入了图像调试工程师的核心能力圈。

---

## 4. 生产环境中什么在用、什么不用

查了一圈资料，对照实际 ISP 调优工具链（Rockchip RKISP Tuner、Sophgo PQ Tools、Imatest、DXOMARK），总结：

| 能力               | 生产用吗  | 说明                            |
| ------------------ | :-------: | ------------------------------- |
| 直方图计算         |  ✅ 必须  | 每个 ISP 调优工具都有直方图面板 |
| Mean/StdDev/极值   |  ✅ 常用  | 快速判断曝光和对比度            |
| 中位数             |  ✅ 辅助  | 比 Mean 更鲁棒                  |
| 过曝/欠曝统计      |  ✅ 核心  | AE 模块直接依赖这类数据         |
| 相邻像素噪点估算   | ⚠️ 快速版 | 生产用 ISO 15739 灰阶法，更精确 |
| ASCII 直方图画终端 |  ❌ 不用  | 都有 GUI，但理解算法才懂调参    |

---

## 5. 跟 Imatest 的关系

Imatest 是 ISP 调优的标准工具。它测的东西包括：

- 直方图和色调曲线（OECF）
- 噪声 SNR 和动态范围
- MTF 锐度
- 色差 ΔE
- 视觉噪点

我写的 `frame_analyzer.c` 相当于 Imatest 里"Image Statistics"模块的**最轻量版**——不依赖 GUI、不依赖 OpenCV、在树莓派上秒出结果。

面试的时候你可以说："我写过一个嵌入式图像质量分析器，从 V4L2 采集的原始帧提取亮度数据，做直方图、曝光评估和噪点估计，对标 Imatest 的基础统计模块。" 这比"我学过 OpenCV"有说服力得多。

---

完整代码见仓库，下一篇讲白平衡——Gray World 算法和 C 实现。
