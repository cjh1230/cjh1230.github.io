---
title: 嵌入式图像处理（二）：用 C 写帧分析器
date: 2026-05-15
summary: 从 Y 平面建直方图、算均值/标准差/中位数、输出过曝率和噪点估计——不依赖 OpenCV，在树莓派上用纯 C 完成图像质量分析。
category: embedded
tags: [直方图, 图像质量, ISP, C语言, 嵌入式]
draft: false
---

[上一篇](/posts/embedded/yuv0) 做完了 YUYV 到 RGB 的格式转换。拿到一帧画面后，下一步是用数据回答：**这张图质量怎么样？**

嵌入式上没有 OpenCV，`cv::calcHist` 和 `cv::meanStdDev` 都不存在。得自己写。

---

## 1. 分析链路

处理流程很简单：从 YUYV 里抽 Y 平面 → 建直方图 → 算统计量 → 判断曝光和噪点。

### 1.1 提取 Y 平面

YUYV 每 4 字节 = 2 个像素，Y 在每组的第 0 和第 2 字节。抽 Y 就是把所有偶数字节抄出来：

```c
void extract_y_plane(unsigned char *yuyv, unsigned char *y, int w, int h)
{
    int i;
    for (i = 0; i < w * h; i++)
        y[i] = yuyv[i * 2];
}
```

为什么只看 Y？所有曝光和对比度的信息都在亮度通道里，UV 只影响颜色。摄像头的自动曝光（AE）模块只读 Y 平面。

### 1.2 建直方图

```c
void build_histogram(unsigned char *y, int pixels, int hist[256])
{
    int i;
    memset(hist, 0, 256 * sizeof(int));
    for (i = 0; i < pixels; i++)
        hist[y[i]]++;
}
```

### 1.3 统计量

```c
double compute_mean(unsigned char *y, int pixels)
{
    double sum = 0;
    int i;
    for (i = 0; i < pixels; i++) sum += y[i];
    return sum / pixels;
}

double compute_stddev(unsigned char *y, int pixels, double mean)
{
    double d, sum = 0.0;
    int i;
    for (i = 0; i < pixels; i++) {
        d = y[i] - mean;
        sum += d * d;
    }
    return sqrt(sum / pixels);
}

int compute_median(int hist[256], int pixels)
{
    int cum = 0, i;
    for (i = 0; i < 256; i++) {
        cum += hist[i];
        if (cum >= pixels / 2) return i;
    }
    return 0;
}

void find_min_max(unsigned char *y, int pixels, int *min, int *max)
{
    int i;
    *min = 255; *max = 0;
    for (i = 0; i < pixels; i++) {
        if (y[i] < *min) *min = y[i];
        if (y[i] > *max) *max = y[i];
    }
}
```

中位数从直方图算，O(256)，比排序取中位快得多，对极端像素不敏感。标准差太小说明画面灰，太大可能噪点多。

### 1.4 曝光评估

```c
over_count = 0; under_count = 0;
for (i = 0; i < w * h; i++) {
    if (y_plane[i] > 240) over_count++;
    if (y_plane[i] < 10)  under_count++;
}
over_pct  = 100.0 * over_count  / (w * h);
under_pct = 100.0 * under_count / (w * h);
```

ISP 的 AE 模块本质上就是在做这件事——根据直方图分布决定曝光时间和传感器增益。

### 1.5 噪点估计

水平相邻像素 Y 值差异的方差：

```c
diff_sum = 0;
for (i = 0; i < w * h - 1; i++) {
    int diff = (int)y_plane[i] - (int)y_plane[i + 1];
    diff_sum += (long long)diff * diff;
}
noise_var = (double)diff_sum / (w * h - 1);
```

不如 ISO 15739 灰阶卡法精确，但一行像素就能出结果，快速定位问题够用了。

---

## 2. 实际输出

对上一篇文章里的 640×480 室内实拍帧跑一次：

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

Mean 147.9 正常室内亮度，略偏亮。StdDev 55.7 对比度够，画面不平淡。Median 158 跟 Mean 接近，分布对称。Min/Max 是 18/243，没死黑也没死白，动态范围被充分利用。

过曝 2.59%，集中在画面窗户或灯光区域。欠曝 0%，暗部细节保留得好。Noise Var 24.6 是 USB 摄像头典型水平——换成树莓派 IMX219 传感器，这个值会在 15 以下。

---

## 3. 完整 main

```c
int main(int argc, char *argv[])
{
    const char *in_file = (argc >= 2) ? argv[1] : "frame.raw";
    int w = (argc >= 3) ? atoi(argv[2]) : 640;
    int h = (argc >= 4) ? atoi(argv[3]) : 480;
    int size_in = w * h * 2;

    unsigned char *yuyv = malloc(size_in);
    unsigned char *y_plane = malloc(w * h);
    int hist[256];
    FILE *fp = fopen(in_file, "rb");
    fread(yuyv, 1, size_in, fp);
    fclose(fp);

    extract_y_plane(yuyv, y_plane, w, h);
    build_histogram(y_plane, w * h, hist);

    double mean = compute_mean(y_plane, w * h);
    double stddev = compute_stddev(y_plane, w * h, mean);
    int median = compute_median(hist, w * h);
    int min, max;
    find_min_max(y_plane, w * h, &min, &max);

    /* 曝光评估 */
    int over_count = 0, under_count = 0;
    for (int i = 0; i < w * h; i++) {
        if (y_plane[i] > 240) over_count++;
        if (y_plane[i] < 10)  under_count++;
    }
    double over_pct  = 100.0 * over_count  / (w * h);
    double under_pct = 100.0 * under_count / (w * h);

    /* 噪点估计 */
    long long diff_sum = 0;
    for (int i = 0; i < w * h - 1; i++) {
        int diff = (int)y_plane[i] - (int)y_plane[i + 1];
        diff_sum += (long long)diff * diff;
    }
    double noise_var = (double)diff_sum / (w * h - 1);

    printf("=== Frame Analysis ===\n");
    printf("Resolution:     %dx%d\n", w, h);
    printf("Mean:           %.1f\n", mean);
    printf("StdDev:         %.1f\n", stddev);
    printf("Median:         %d\n", median);
    printf("Min/Max:        %d / %d\n", min, max);
    printf("Over-exposed:   %.2f%%\n", over_pct);
    printf("Under-exposed:  %.2f%%\n", under_pct);
    printf("Noise Var:      %.1f\n", noise_var);

    free(yuyv);
    free(y_plane);
    return 0;
}
```

没有 OpenCV，只依赖标准 C。树莓派上 `gcc -O2 -o frame_analyzer frame_analyzer.c -lm`，秒出结果。

---

[上一篇](/posts/embedded/yuv0)：YUV 体系与定点数互转。

## 参考

- 完整代码：`frame_analyzer.c`
- ISO 15739：噪声测量标准
- 树莓派 V4L2 文档：Linux Media Infrastructure API
