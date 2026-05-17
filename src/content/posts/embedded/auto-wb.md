---
title: 嵌入式图像处理（三）：从零实现白平衡算法
date: 2026-05-16
summary: 关掉摄像头的自动白平衡后，画面严重偏绿。用纯 C 实现 Gray World 和 White Patch 两种经典算法，在树莓派上把颜色拉回中性。
category: embedded
tags: [白平衡, ISP, C语言, 嵌入式, 颜色科学]
draft: false
---

跑通帧分析后，我看了一下同一个摄像头在不同光照下的表现——定量分析和定性看是两码事，同一张图，颜色可能偏得离谱。

我把 USB 摄像头的 `white_balance_automatic` 设成 0，锐化也关了，拍了一帧 640×480 的 YUYV。先跑 frame_analyzer，数据看起来正常：

```
Mean:    128.5
StdDev:  52.9
Noise:   30.1（关了锐化比之前高）
```

然后转成 RGB 分别看三个通道的平均值——问题暴露了：

```
avgR = 108.4
avgG = 175.1    ← 比 R 高了 60%
avgB = 122.3
```

G 通道碾压 R 和 B。画面偏绿，但直方图和标准差完全看不出来。这就是没有白平衡的原始数据。

![关掉 AWB 的原始帧](/images/yuv/original.png)

---

## 1. Gray World

Gray World 基于一个统计假设：**正常场景里所有像素的 R、G、B 平均值应该相等**——整个画面宏观上是灰色的。如果 avgR 偏低，说明红色被压了，放大 R 就行。

用 G 做基准算增益：

```
gainR = avgG / avgR = 175.1 / 108.4 = 1.6148
gainB = avgG / avgB = 175.1 / 122.3 = 1.4311
```

然后遍历所有像素，R 和 B 分别乘对应增益，G 不变：

```c
void gray_world_wb(unsigned char *rgb, int pixels,
                   double *out_gainR, double *out_gainB)
{
    long sumR = 0, sumG = 0, sumB = 0;
    for (int i = 0; i < pixels * 3; i += 3) {
        sumR += rgb[i+0]; sumG += rgb[i+1]; sumB += rgb[i+2];
    }
    double avgR = (double)sumR / pixels;
    double avgG = (double)sumG / pixels;
    double avgB = (double)sumB / pixels;

    double gainR = avgG / avgR;
    double gainB = avgG / avgB;

    for (int i = 0; i < pixels * 3; i += 3) {
        rgb[i+0] = CLAMP((int)(rgb[i+0] * gainR));
        rgb[i+2] = CLAMP((int)(rgb[i+2] * gainB));
    }
    *out_gainR = gainR;
    *out_gainB = gainB;
}
```

校正后三个通道的平均值：

```
avgR = 162.7
avgG = 175.1
avgB = 164.6
```

R 从 108 拉到 163，三个值接近了。绿色溢出的画面被拉回中性。

![Gray World 校正结果](/images/yuv/gray_world.png)

这个算法 1980 年就提出了。它的盲区也很明显：如果画面本身就偏色（大草坪、日落），全局平均不是灰的——它会误校正，把日落拉成白天的颜色。

---

## 2. White Patch

另一种思路：**画面里最亮的像素应该是纯白色的**（R=G=B=255）。用最亮像素的 R、G、B 分量反算增益：

```c
void white_patch_wb(unsigned char *rgb, int pixels,
                    double *out_gainR, double *out_gainB)
{
    int maxR = 0, maxG = 0, maxB = 0;
    for (int i = 0; i < pixels * 3; i += 3) {
        if (rgb[i+0] > maxR) maxR = rgb[i+0];
        if (rgb[i+1] > maxG) maxG = rgb[i+1];
        if (rgb[i+2] > maxB) maxB = rgb[i+2];
    }

    double gainR = 255.0 / maxR;
    double gainB = 255.0 / maxB;

    for (int i = 0; i < pixels * 3; i += 3) {
        rgb[i+0] = CLAMP((int)(rgb[i+0] * gainR));
        rgb[i+2] = CLAMP((int)(rgb[i+2] * gainB));
    }
    *out_gainR = gainR;
    *out_gainB = gainB;
}
```

我这帧恰好有纯白像素（maxR=maxG=maxB=255），WP 增益全是 1.0——什么也没改。但如果画面没有白色物体，比如拍日落或者全是草地，WP 找出来的"最亮像素"根本就不是白的，增益会偏。

Gray World 怕画面本身偏色，White Patch 怕画面没有白色。两个算法的失效场景正好互补。

---

## 3. 混合策略

最简单的折中——取两个算法的平均增益：

```c
double mix_gainR = (gw_gainR + wp_gainR) / 2.0;
double mix_gainB = (gw_gainB + wp_gainB) / 2.0;

for (int i = 0; i < pixels * 3; i += 3) {
    rgb[i+0] = CLAMP((int)(rgb[i+0] * mix_gainR));
    rgb[i+2] = CLAMP((int)(rgb[i+2] * mix_gainB));
}
```

混合增益 `gainR=1.3074, gainB=1.2156`，介于 GW 的激进和 WP 的保守之间。

![混合校正结果](/images/yuv/mixed_wb.png)

---

## 4. 完整输出

```
GW Before: avgR=108.4 avgG=175.1 avgB=122.3
GW Gains:  gainR=1.6148  gainB=1.4311
GW After:  avgR=162.7 avgG=175.1 avgB=164.6

WP Gains:  gainR=1.0000  gainB=1.0000

Mixed WB:  gainR=1.3074  gainB=1.2156
```

关掉 AWB 后 G 比 R 高了 60%，Gray World 一轮就把差距拉回来了。

---

## 5. 这些算法在生产中怎么用

Gray World 和 White Patch 单独用都不够稳。查了现代 ISP 的文档（Rockchip ISP、Sophgo PQ），实际方案是它们的延续：

- 不做全局假设，而是把画面分区块，每个块独立算增益，再加权投票
- 工厂标定多组标准光源（D65/D50/TL84/A），把"光源是什么颜色"这个问题变成"离哪条标定曲线最近"
- 高端机用 CNN 直接预测增益，但嵌入式上还是统计方法为主

两个 40 年前的算法，改进后至今还在用。

---

## 参考

- 完整代码：`auto_wb.c`
- Gray World: Buchsbaum, 1980
- White Patch / Retinex: Land, 1971
