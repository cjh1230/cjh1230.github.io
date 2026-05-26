---
title: 嵌入式图像处理（五）：整合 —— 从单一帧到完整质量报告
date: 2026-05-26
summary: 整合前四篇文章的全部模块，写出 iq_analyzer —— 一个不依赖 OpenCV、在树莓派上从 YUYV 帧输出结构化质量报告的纯 C 工具。
category: embedded
tags: [图像质量, ISP, Sobel, C语言, 嵌入式, 多文件项目]
draft: false
---

前几篇的工具各自跑各自的，每次要手动输命令、记参数、对比输出。太散了。这篇把所有模块拼成一个大号工具——`iq_analyzer`，输入一帧 YUYV，一次跑完亮度、曝光、色彩、噪点、清晰度五维分析，直接出综合评分。外加 JSON 导出。

---

## 1. 文件结构

六个源文件 + 一个头文件，Makefile 管编译：

- `iq_analyzer.h` — 四个 report 结构体，所有模块共享
- `iq_analyzer.c` — main()，参数解析 → 读帧 → 调各模块 → 出报告
- `luminance.c` — 亮度统计（直方图/均值/std/median/曝光）
- `color.c` — 色彩分析（U/V 均值 → 偏色方向）
- `noise.c` — 噪点评估（空间域相邻像素差方差）
- `sharpness.c` — 清晰度（Sobel 3×3 边缘能量，新算法）
- `report.c` — 加权评分 + 终端输出 + JSON 导出

```c
typedef struct { double mean, stddev; int median, min, max, hist[256];
    double over_pct, under_pct; int dyn_range; const char *status; } LumReport;
typedef struct { double u_mean, v_mean; const char *cast; } ColorReport;
typedef struct { double y_noise_var, uv_noise_var; const char *y_level, *uv_level; } NoiseReport;
typedef struct { double edge_energy; const char *level; } SharpReport;
```

分析的对象就是之前拍的那帧——关掉 AWB 和锐化后的原始画面：

![原始 YUYV 帧](/images/yuv/original.png)

---

## 2. 亮度统计

和之前 frame_analyzer 不太一样——这里所有统计从直方图算，不是从原始像素数组。先建一次 256 桶 histogram，后续全是 O(256)：

```c
/* 均值：加权求和 */
sum = 0.0;
for (i = 0; i < 256; i++)
    sum += i * hist[i];
r.mean = sum / total;

/* 标准差：同样从直方图算 */
sum = 0.0;
for (i = 0; i < 256; i++) {
    double diff = i - r.mean;
    sum += diff * diff * hist[i];
}
r.stddev = sqrt(sum / total);

/* 中位数：累加直方图到 halfway */
sum = 0.0;
for (i = 0; i < 256; i++) {
    sum += hist[i];
    if (sum >= total / 2) { r.median = i; break; }
}
```

曝光用累积分布的 P1 和 P99 间距作为动态范围，比之前简单的 0-255 范围更鲁棒。

---

## 3. 偏色检测

YUYV 里每 4 字节有 1 个 U 和 1 个 V。遍历取均值后，看 UV 偏离 128 的方向和幅度：

```c
du = u_mean - 128.0;
dv = v_mean - 128.0;

if (fabs(du) < 3 && fabs(dv) < 3)      r.cast = "neutral";
else if (dv > 5)                         r.cast = "warm";
else if (dv < -5)                        r.cast = "cool";
else if (du > 5)                         r.cast = "magenta";
else if (du < -5)                        r.cast = "green";
else                                     r.cast = "slight cast";
```

阈值是试出来的——3 以内肉眼基本看不出偏色，5 以上方向明确。

---

## 4. 噪点评估

用最简单的水平相邻像素差方差。值越小说明相邻像素越接近，画面越干净：

```c
for (y_idx = 0; y_idx < h; y_idx++) {
    for (x = 0; x < w - 1; x++) {
        diff = y_plane[y_idx * w + x] - y_plane[y_idx * w + x + 1];
        y_sum += diff * diff;
        y_cnt++;
    }
}
r.y_noise_var = y_sum / y_cnt;
```

UV 噪点用同样逻辑，但每 2 行 2 列采样一次——色度通道天然低分辨率，全采样没意义。

---

## 5. 清晰度：Sobel 边缘能量

这是前面没涉及的新模块。思路很直觉：清晰图像的边缘锐利、亮度落差大；模糊图像边缘平缓、落差小。

Sobel 算子用两个 3×3 核分别测水平和垂直梯度：

```
Sobel X:          Sobel Y:
[-1  0 +1]        [-1 -2 -1]
[-2  0 +2]        [ 0  0  0]
[-1  0 +1]        [+1 +2 +1]
```

对每个内部像素（跳过边界 1px）算 gx 和 gy，梯度幅值 `mag = sqrt(gx² + gy²)`，全体取均值：

```c
for (y_idx = 1; y_idx < h - 1; y_idx++) {
    for (x = 1; x < w - 1; x++) {
        gx = -1 * y[(y_idx-1)*w + (x-1)] + 1 * y[(y_idx-1)*w + (x+1)]
             -2 * y[y_idx*w    + (x-1)] + 2 * y[y_idx*w    + (x+1)]
             -1 * y[(y_idx+1)*w + (x-1)] + 1 * y[(y_idx+1)*w + (x+1)];

        gy = -1 * y[(y_idx-1)*w + (x-1)] - 2 * y[(y_idx-1)*w + x] - 1 * y[(y_idx-1)*w + (x+1)]
             +1 * y[(y_idx+1)*w + (x-1)] + 2 * y[(y_idx+1)*w + x] + 1 * y[(y_idx+1)*w + (x+1)];

        mag = sqrt(gx * gx + gy * gy);
        sum += mag;
        count++;
    }
}
r.edge_energy = sum / count;
```

edge_energy < 15 判 soft，< 30 判 normal，以上 sharp。

---

## 6. 综合评分

五项加权，满分 10。亮度占 30%（最重要——人眼先看亮度），曝光和色彩各 20%，噪点和清晰度各 15%：

```c
lum_s   = clamp(1.0 - fabs(l.mean - 120) / 80, 0.0, 1.0);
exp_s   = clamp(1.0 - (l.over_pct + l.under_pct) / 25, 0.0, 1.0);
col_s   = strcmp(c.cast, "neutral") == 0 ? 1.0 : 0.5;
noise_s = strcmp(n.y_level, "clean") == 0 ? 1.0 : 0.5;
sharp_s = strcmp(s.level, "normal") == 0 ? 1.0 : 0.5;

score = (lum_s * 0.30 + exp_s * 0.20 + col_s * 0.20
      + noise_s * 0.15 + sharp_s * 0.15) * 10;
```

权重和阈值是我自己拍的——没有标准参考，纯凭调试感觉。生产中的 ISP 评分系统远比这个复杂，但核心思路一样：多维打分、加权综合。

白平衡加增强后的实际输出：

```
=== Image Quality Analysis Report ===

LUMINANCE
  Mean:       169.7  (normal)
  StdDev:      69.8
  Median:      184
  Min/Max:   17 / 255

EXPOSURE
  Over-exposed:  28.0%
  Dynamic Range: 209

COLOR
  U Mean:   124.2
  Cast:     cool

NOISE
  Y  Noise Var:     44.2  (heavy)
  UV Noise Var:    131.4  (heavy)

SHARPNESS
  Edge Energy:    30.3  (sharp)

OVERALL SCORE: 3.6 / 10
```

---

## 7. 完整管线

三个工具串成管线：

```
原始帧 → auto_wb (Gray World) → image_enhance → iq_analyzer → JSON 报告
```

三步处理后，原始帧从偏绿、噪声 24.5 变成白平衡校正 + 均衡化 + Gamma + 模糊的综合增强结果：

![管线增强结果 — Gamma 校正后](/images/yuv/gamma.png)`full_pipeline.sh` 一行跑完。

---

完整代码：[github.com/cjh1230/learn-embedded-linux-video](https://github.com/cjh1230/learn-embedded-linux-video)
