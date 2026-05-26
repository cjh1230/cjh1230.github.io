---
title: 嵌入式图像处理（一）：YUV 体系与定点数互转
date: 2026-05-14
summary: 摄像头为什么输出 YUYV 而不是 RGB？4:2:0 和 4:2:2 到底差在哪？从人眼生物学出发拆解 YUV 全体系，给出定点数互转的 C 实现。
category: embedded
tags: [YUV, NV12, ISP, 颜色空间, C语言, 嵌入式]
draft: false
---

刚接触嵌入式图像的时候，我在树莓派上跑 `v4l2-ctl --list-formats`，看到输出是 YUYV。第一反应是困惑——显示器要的是 RGB，为什么摄像头不直接给 RGB？

后来发现，这个问题问反了。应该问的是：**为什么显示器敢用 RGB？**

---

## 1. 人眼的硬件配置

人眼视网膜上有两种感光细胞：

- **视杆细胞**：约 1.2 亿个，感知亮度。极灵敏，暗光下也能工作。
- **视锥细胞**：约 600 万个，感知颜色。需要充足光线，集中在视野中心。

亮度传感器的数量是颜色传感器的 20 倍。这不是什么设计缺陷，是演化留给我们的硬件配置。

工程上怎么利用这件事？把亮度（Y）和颜色（U/V）拆开。Y 必须全分辨率，UV 降采样，人眼看不出差别。而 RGB 三个通道人眼敏感度差不多——要压只能三个一起压，没有差异化处理的空间。

---

## 2. 采样：4:4:4、4:2:2、4:2:0

### 4:4:4

每个像素独立存 Y、U、V。数据量和 RGB 一样大。专业调色、医疗影像会用，嵌入式领域基本不碰。

### 4:2:2

水平方向两个像素共享一组 UV：

```
像素:  P0  P1  P2  P3
Y:     Y0  Y1  Y2  Y3   ← 每像素独立
U:     U0      U2       ← 两像素共用
V:     V0      V2
```

每像素 2 字节，比 RGB 省 1/3。USB 摄像头的 YUYV、ISP 的中间输出，大多是这个。

摄像头原始 YUYV 画面（640×480，614400 字节）：

![摄像头 YUYV 原始帧](/images/yuv/frame.jpg)

### 4:2:0

水平垂直都减半。2×2 的四个像素共享一组 UV。每像素 1.5 字节，省一半。

所有视频编码器（H.264、H.265）都在用 4:2:0。ISP 输出的 NV12 也是 4:2:0。

---

## 3. Packed vs Planar：同样的采样，不同的内存布局

采样比例只决定了"谁跟谁共享 UV"，但字节在内存里怎么排，是另一回事。

### YUYV（Packed，4:2:2）

```
[Y0][U0][Y1][V0] [Y2][U1][Y3][V1] ...
 └── 4字节=2像素 ─┘
```

Y 和 UV 交错存放。640×480 的 YUYV 一帧就是 `640×480×2 = 614400` 字节。

代码里遍历的时候，步进是 4 字节一次，每次处理两个像素：

```c
for (i = 0; i < h; i++) {
    for (j = 0; j < w; j += 2) {
        int off = (i * w + j) * 2;
        y0 = yuyv[off + 0];  u = yuyv[off + 1];
        y1 = yuyv[off + 2];  v = yuyv[off + 3];
        // 两个像素用同一组 UV
    }
}
```

### NV12（Semi-planar，4:2:0）

NV12 把 Y 和 UV 分成两块独立的内存区域：

```
Y 平面:  Y0 Y1 Y2 ... Y(w×h-1)    大小: w×h
UV 平面: U0 V0 U1 V1 U2 V2 ...    大小: w×h/2
```

总大小 `w×h×1.5`。640×480 就是 460800 字节。

UV 平面里 U 和 V 是交错放的（所以叫 semi-planar），每 4 个像素（2×2 块）对应一组 UV。查 UV 的时候偏移是：

```c
uv_off = (row/2) * w + (col/2) * 2;
u = nv12[w*h + uv_off];
v = nv12[w*h + uv_off + 1];
```

为什么硬编码器都吃 NV12？因为 Y 平面是连续的，硬件 DMA 可以直接搬过去做运动估计，不用从交错数据里拆。

另外还有 I420（FFmpeg 内部格式），U 和 V 各自独立成平面，三块内存完全分开。

| 格式 | 采样  | 排列         | 常见场景                      |
| ---- | :---: | ------------ | ----------------------------- |
| YUYV | 4:2:2 | Packed       | USB 摄像头默认                |
| UYVY | 4:2:2 | Packed       | 采集卡                        |
| NV12 | 4:2:0 | Semi-planar  | 硬编码器、ISP 输出            |
| NV21 | 4:2:0 | Semi-planar  | Android Camera（UV 顺序反的） |
| I420 | 4:2:0 | Fully planar | FFmpeg 内部                   |

---

## 4. YUV ↔ RGB 互转：为什么嵌入式不用浮点

BT.601 标准给了转换公式：

```
R = Y + 1.402 × (V - 128)
G = Y - 0.344 × (U - 128) - 0.714 × (V - 128)
B = Y + 1.772 × (U - 128)
```

但浮点在嵌入式上太慢了。一帧 640×480 就要算 30 万次，浮点版本要几十毫秒。换成定点数——全部系数乘 256 取整，用整数乘加然后右移 8 位——快一个数量级：

```c
// YUV → RGB（Q8 定点数）
C = Y;
D = U - 128;
E = V - 128;
R = CLAMP((298 * C + 409 * E + 128) >> 8);
G = CLAMP((298 * C - 100 * D - 208 * E + 128) >> 8);
B = CLAMP((298 * C + 516 * D + 128) >> 8);
```

`CLAMP` 不是可选的——定点数运算可能算出 256 或 -1，不截断就会溢出绕回，画面出现随机色块。我第一次没加 CLAMP 的时候，输出图像边缘全是花花绿绿的噪点，盯着代码看了十分钟才反应过来。

RGB 转 YUV 同理：

```c
Y = ( 77 * R + 150 * G +  29 * B) >> 8;
U = ((-43 * R -  85 * G + 128 * B) >> 8) + 128;
V = ((128 * R - 107 * G -  21 * B) >> 8) + 128;
```

注意 Y 公式里绿色系数占 0.587（150/256），远大于红蓝——这就是 Bayer 阵列里放了两个绿色像素的原因。

---

## 5. YUYV → RGB24

每 4 字节处理两个像素，共用一组 UV：

```c
#define CLAMP(x) ((x) < 0 ? 0 : (x) > 255 ? 255 : (x))

void yuyv_to_rgb(unsigned char *yuyv, unsigned char *rgb, int w, int h)
{
    int i, j;
    int y0, y1, u, v;
    int r, g, b;
    int C, D, E;

    for (i = 0; i < h; i++) {
        for (j = 0; j < w; j += 2) {
            int off = (i * w + j) * 2;

            y0 = yuyv[off + 0];
            u  = yuyv[off + 1];
            y1 = yuyv[off + 2];
            v  = yuyv[off + 3];

            /* 像素 0 */
            C = y0;  D = u - 128;  E = v - 128;
            r = (298 * C + 409 * E + 128) >> 8;
            g = (298 * C - 100 * D - 208 * E + 128) >> 8;
            b = (298 * C + 516 * D + 128) >> 8;
            rgb[(i * w + j) * 3 + 0] = CLAMP(r);
            rgb[(i * w + j) * 3 + 1] = CLAMP(g);
            rgb[(i * w + j) * 3 + 2] = CLAMP(b);

            /* 像素 1 */
            C = y1;
            r = (298 * C + 409 * E + 128) >> 8;
            g = (298 * C - 100 * D - 208 * E + 128) >> 8;
            b = (298 * C + 516 * D + 128) >> 8;
            rgb[(i * w + j + 1) * 3 + 0] = CLAMP(r);
            rgb[(i * w + j + 1) * 3 + 1] = CLAMP(g);
            rgb[(i * w + j + 1) * 3 + 2] = CLAMP(b);
        }
    }
}
```

![YUYV→RGB 转换结果](/images/yuv/output.jpg)

---

## 6. NV12 → RGB24

Y 在第一个平面，UV 在第二个平面。2×2 的四个像素共用一组 UV：

```c
void nv12_to_rgb(unsigned char *nv12, unsigned char *rgb, int w, int h)
{
    int i, j;
    int y0, y1, y2, y3, u, v;
    int r, g, b;
    int C, D, E;

    for (i = 0; i < h; i += 2) {
        for (j = 0; j < w; j += 2) {
            y0 = nv12[i * w + j];
            y1 = nv12[i * w + j + 1];
            y2 = nv12[i * w + j + w];
            y3 = nv12[i * w + j + w + 1];

            int uv_off = (i/2) * w + (j/2) * 2;
            u = nv12[w * h + uv_off];
            v = nv12[w * h + uv_off + 1];

            D = u - 128;  E = v - 128;

            /* pixel (i, j) */
            C = y0;
            r = (298*C + 409*E + 128) >> 8;
            g = (298*C - 100*D - 208*E + 128) >> 8;
            b = (298*C + 516*D + 128) >> 8;
            rgb[(i*w + j) * 3 + 0] = CLAMP(r);
            rgb[(i*w + j) * 3 + 1] = CLAMP(g);
            rgb[(i*w + j) * 3 + 2] = CLAMP(b);

            /* pixel (i, j+1) */
            C = y1;
            r = (298*C + 409*E + 128) >> 8;
            g = (298*C - 100*D - 208*E + 128) >> 8;
            b = (298*C + 516*D + 128) >> 8;
            rgb[(i*w + j + 1) * 3 + 0] = CLAMP(r);
            rgb[(i*w + j + 1) * 3 + 1] = CLAMP(g);
            rgb[(i*w + j + 1) * 3 + 2] = CLAMP(b);

            /* pixel (i+1, j) */
            C = y2;
            r = (298*C + 409*E + 128) >> 8;
            g = (298*C - 100*D - 208*E + 128) >> 8;
            b = (298*C + 516*D + 128) >> 8;
            rgb[((i+1)*w + j) * 3 + 0] = CLAMP(r);
            rgb[((i+1)*w + j) * 3 + 1] = CLAMP(g);
            rgb[((i+1)*w + j) * 3 + 2] = CLAMP(b);

            /* pixel (i+1, j+1) */
            C = y3;
            r = (298*C + 409*E + 128) >> 8;
            g = (298*C - 100*D - 208*E + 128) >> 8;
            b = (298*C + 516*D + 128) >> 8;
            rgb[((i+1)*w + j + 1) * 3 + 0] = CLAMP(r);
            rgb[((i+1)*w + j + 1) * 3 + 1] = CLAMP(g);
            rgb[((i+1)*w + j + 1) * 3 + 2] = CLAMP(b);
        }
    }
}
```

四像素转了四次看起来重复，但嵌入式上循环展开避免分支，编译器也好优化。

![NV12 往返结果](/images/yuv/nv12_rt.jpg)

---

## 7. 验证

读入 YUYV → 转 RGB → 转回 YUYV 做往返验证；再 RGB → NV12 → RGB 看 4:2:0 降采样的损失。YUYV 往返视觉无损，NV12 往返因 4 像素 UV 平均有轻微损失，肉眼不太看得出来。

YUYV 往返结果：

![YUYV 往返结果](/images/yuv/roundtrip.jpg)

用 ffplay 直接看 raw 数据确认：

```bash
ffplay -f rawvideo -pixel_format yuyv422 -video_size 640x480 roundtrip.yuyv
ffplay -f rawvideo -pixel_format rgb24   -video_size 640x480 nv12_rt.rgb
```

---

## 8. 跟 ISP 调试的关系

理解 Y 和 UV 的分工不是为了考试。调 ISP 的时候，你调的任何参数都落在 Y 或 UV 上：

- **曝光**看 Y 直方图——亮度分布，判断过曝/欠曝
- **Gamma** 调 Y 通道的暗部和亮部非线性映射
- **白平衡**看 U/V——灰色物体上 U 和 V 应该都是 128
- **降噪**在 Y 上要保守（人眼对亮度噪声极其敏感），在 UV 上可以大胆（颜色噪声人眼迟钝）

反过来，如果你不知道这个分工，很容易干蠢事——比如在 UV 通道加锐化，除了让颜色噪点更明显，什么好处都没有。

---

## 参考

- BT.601 标准：ITU-R BT.601-7
- 树莓派 V4L2 文档：Linux Media Infrastructure API

完整代码：[github.com/cjh1230/learn-embedded-linux-video](https://github.com/cjh1230/learn-embedded-linux-video)
