---
title: 嵌入式图像处理（四）：对比度、Gamma 与滤波
date: 2026-05-17
summary: 不依赖 OpenCV，用纯 C 实现直方图均衡化、Gamma 校正和 3×3 均值滤波。均衡化后标准差从 52.9 跳到 74.0，对比度提升 41%。
category: embedded
tags: [直方图均衡化, Gamma校正, 滤波, ISP, C语言, 嵌入式]
draft: false
---

白平衡把颜色拉回来了，但画面还是灰——Y 值挤在 10 到 243 之间，最亮不够白，最暗不够黑。这篇文章对 Y 平面做三件事：拉宽对比度、按人眼感知重新映射亮度、抹平局部噪点。

---

## 1. 直方图均衡化

原图 Y 直方图只占了 10-243 这一块，0-9 和 244-255 完全是空的。这 234 个灰阶的差距就是画面灰蒙蒙的来源。

均衡化的做法很简单：把每个亮度值的"排名"重新映射到 0-255 范围。亮度 10 的像素是最暗的 → 改成 0。亮度 243 的像素是最亮的 → 改成 255。中间的按比例分布。

```c
void hist_equalize(unsigned char *y, int pixels)
{
    int hist[256], cdf[256];

    build_histogram(y, pixels, hist);

    /* 累积分布：cdf[i] = 有多少像素 ≤ i */
    cdf[0] = hist[0];
    for (int i = 1; i < 256; i++)
        cdf[i] = cdf[i - 1] + hist[i];

    /* 找到第一个非零 cdf */
    int cdf_min = cdf[0];
    for (int i = 0; cdf[i] == 0; i++)
        cdf_min = cdf[i + 1];

    /* 排名映射到 0-255 */
    for (int i = 0; i < pixels; i++)
        y[i] = (cdf[y[i]] - cdf_min) * 255 / (pixels - cdf_min);
}
```

跑完后的对比：

```
Before EQ:  Mean=128.5  Std=52.9  Min=10  Max=243
After  EQ:  Mean=128.2  Std=74.0  Min=0   Max=255
```

均值几乎不变（排名映射不会改变平均亮度太多），但标准差从 52.9 跳到 74.0——提升 41%。Min 从 10 变成 0，Max 从 243 变成 255，用满了整个 256 阶。

![直方图均衡化结果](/images/yuv/equalized.png)

---

## 2. Gamma 校正

摄像头 sensor 输出是线性的——光子数量翻倍，Y 值翻倍。但人眼对暗部变化极其敏感，对亮部变化迟钝。线性 Y 值的暗部细节在人眼看来全部糊在一起。

显示器出厂时都做了 sRGB Gamma（约 2.2）校正来补偿人眼这个特性，但我们的裸帧没经过任何 Gamma 映射。解决很简单——对每个 Y 做幂函数映射：

```
Y_out = 255 × (Y_in / 255) ^ (1 / 2.2)
```

嵌入式上不一个个算 `pow`，预先算好 256 个值的 LUT，O(1) 查表：

```c
void gamma_correct(unsigned char *y, int pixels, double gamma)
{
    unsigned char lut[256];
    for (int i = 0; i < 256; i++)
        lut[i] = (unsigned char)(255.0 * pow(i / 255.0, 1.0 / gamma));

    for (int i = 0; i < pixels; i++)
        y[i] = lut[y[i]];
}
```

效果很直观：

```
Before Gm:  Mean=128.5  Std=52.9  Min=10  Max=243
After  Gm:  Mean=181.7  Std=37.7  Min=58  Max=249
```

Mean 从 128 跳到 181——暗部大幅提亮，原来接近 10 的阴影区域涨到 58，细节出来了。Std 降低是因为亮度被非线性压缩，高光部分被压到一起了。

![Gamma 校正结果](/images/yuv/gamma.png)

---

## 3. 3×3 均值滤波

最简单的空间去噪——每个像素用 3×3 邻域 9 个值取平均：

```c
void blur_3x3(unsigned char *y_in, unsigned char *y_out, int w, int h)
{
    for (int row = 1; row < h - 1; row++) {
        for (int col = 1; col < w - 1; col++) {
            int idx = row * w + col;
            int sum = y_in[idx - w - 1] + y_in[idx - w] + y_in[idx - w + 1]
                    + y_in[idx - 1]     + y_in[idx]     + y_in[idx + 1]
                    + y_in[idx + w - 1] + y_in[idx + w] + y_in[idx + w + 1];
            y_out[idx] = sum / 9;
        }
    }
}
```

写这段时踩过一个坑：二维坐标转一维索引。`row - 1 * w + col` 会先算 `1 * w` 再减——`*` 优先级高于 `-`。写成 `idx = row * w + col` 然后用 `idx - w - 1` 这样偏移，避开优先级问题。

跑完的结果：

```
Before Bl:  Mean=128.5  Std=52.9  Min=10  Max=243
After  Bl:  Mean=127.1  Std=53.5  Min=0   Max=241
```

Mean 和 Std 几乎没变——均值滤波不改变全局分布，只把局部细节抹平。效果很温和。

![3×3 均值滤波结果](/images/yuv/blur.png)

---

## 4. 框架

三个算法都从同一帧原始数据出发，互不叠加：

```c
/* 每次算法前从原始帧复制，避免"上个算法输出变成下个输入" */
memcpy(yuyv, yuyv_orig, size);
apply_algorithm(yuyv, ...);
save_result(yuyv);
```

不串行叠加是有意为之——叠加后你看不出每个算法各自的效果。调试时保持独立输出，对比才有意义。

---

## 5. 跟 ISP 管线的关系

直方图均衡化很少直接用作输出，但它的"双峰检测"变体被 AE 模块用来判断场景类型（逆光、户外、室内）。Gamma 校正是 ISP 管线的倒数第二步——处理完所有图像操作后、输出到显示器前做映射。均值滤波太暴力了，生产中的 ISP 用双边滤波或引导滤波来保边模糊，降噪走专门的 YNR/3DNR 模块。

这三个算法不是生产级方案，但它们恰好对应 ISP 管线里三个不同阶段的核心思路。

---

完整代码见仓库。
