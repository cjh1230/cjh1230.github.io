---
title: ros2常见问题
date: 2024-04-01
summary: 这是一篇 Markdown 文章的示例。展示了 Markdown 的语法和渲染效果。
category: 例子
tags: [Markdown]
draft: true
---

# 1. 切换到默认渲染后端为D3D12

export GALLIUM_DRIVER=d3d12

# 2. 明确指定使用NVIDIA适配器（如果你使用的是NVIDIA显卡）

export MESA_D3D12_DEFAULT_ADAPTER_NAME=NVIDIA

# 3. 确保不使用软件渲染

export LIBGL_ALWAYS_SOFTWARE=0

# 4. 可选：针对某些旧版应用，可尝试VA-API后端

export WSLG_USE_VAAPI=1
