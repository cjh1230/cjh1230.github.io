---
title: pytorch 环境配置
date: 2025-10-25
summary: 这篇文章详细介绍了如何在Windows系统上配置PyTorch深度学习环境，包括安装Miniconda、CUDA、cuDNN以及创建PyTorch虚拟环境的完整步骤。
category: 教程
tags: [机器学习, 视觉]
draft: false
---

Yolo需要pytorch环境，所以我们先做一个pytorch的环境配置

**难点**

pytorch环境搭建涉及到多个软件和环境的安装，所以最重要的就是不同软件之间的版本适配并能使用

本小节首先带大家安装一个python环境的下载和管理工具；

之后带大家下载\***\*对应版本的cuda、cudnn和pytorch\*\***，搭建一个可以使用的pytorch环境。

### **Miniconda**

我们使用miniconda进行python环境的管理，Miniconda相对Anaconda软件小，且功能足够使用，建议学习miniconda

Miniconda下载链接：[Installing Miniconda - Anaconda](https://www.anaconda.com/docs/getting-started/miniconda/install"%20\l%20"anaconda-website)

进入网站后，点击箭头指向的位置
![图片描述](/img/posts/pytorch/1.png)

接下来，会出现三个选项
![图片描述](/img/posts/pytorch/2.png)

第一种. 进入网站注册信息后下载（不推荐）

第二种. 复制命令直接在命令行下载（推荐）
![图片描述](/img/posts/pytorch/3.png)

复制之后在键盘上按下win + r
![图片描述](/img/posts/pytorch/4.png)

在上面输入cmd，点击确定
![图片描述](/img/posts/pytorch/5.png)

进入命令行后，直接右键将刚才复制的命令粘贴上去

接下来点击enter，安装包就自动开始下载了

第三种. 复制命令在powershell中下载

复制网站中的命令

找到电脑中的powershell 并打开
![图片描述](/img/posts/pytorch/6.png)

Ctrl + v 将代码复制过来点击enter

安装包下载完成之后

点击安装包，弹出该界面，即可开始下载
![图片描述](/img/posts/pytorch/7.png)

点击next
![图片描述](/img/posts/pytorch/8.png)

点击 I Agree
![图片描述](/img/posts/pytorch/9.png)

选择 just me ，点击next
![图片描述](/img/posts/pytorch/10.png)

点击browse选择你要安装的位置，点击next
![图片描述](/img/posts/pytorch/11.png)

按图中勾选，**注意：一定要将PATH这项勾选上，**点击install
![图片描述](/img/posts/pytorch/12.png)

点击next
![图片描述](/img/posts/pytorch/13.png)

安装完成，点击finish

## 环境验证

在电脑**设置**中，搜索环境变量（**注意：一定要用设置打开**），点击“编辑环境系统变量”
![图片描述](/img/posts/pytorch/14.png)

点击环境变量
![图片描述](/img/posts/pytorch/15.png)

双击系统变量中的Path检查是否有如图所示的三个Miniconda文件路径（软件安装中第7步添加PATH勾选上，这里就会有）
![图片描述](/img/posts/pytorch/16.png)

Win + R输入cmd，打开命令行

在命令行中输入指令“conda --version”，显示conda版本号，即为下载成功
![图片描述](/img/posts/pytorch/17.png)

**小结：**完成了miniconda的下载，下一步我们就可以进行cuda、cudnn、pytorch的对应版本下载以及pytorch的环境搭建

Pytorch

PyTorch（Python Torch）是一个开源的机器学习库，主要用于深度学习任务。它由 Facebook 的人工智能研究小组开发，提供了灵活的张量（tensor）数据结构和强大的深度学习工具。

CUDA

安装前可进行显卡驱动的升级

命令行输入指令“nvidia-smi”，查看CUDA版本
![图片描述](/img/posts/pytorch/18.png)

我的版本是13.0，CUDA版本向下兼容，所以12.6版本以下的CUDA，都可以选择安装

**软件安装**

下载链接：[CUDA Toolkit Archive | NVIDIA Developer](https://developer.nvidia.com/cuda-toolkit-archive)

打开链接：根据你电脑中的CUDA版本选择下载
![图片描述](/img/posts/pytorch/19.png)

接下来，根据你电脑的配置选择后，点击download
![图片描述](/img/posts/pytorch/20.png)

打开安装包，点击ok，这里的位置不需要修改
![图片描述](/img/posts/pytorch/21.png)

这里选择精简安装后，点击下一步
![图片描述](/img/posts/pytorch/22.png)

方框勾选后，点击下一步就开始安装了
![图片描述](/img/posts/pytorch/23.png)

命令行中输入“nvcc --version”，如下图所示，即为安装成功
![图片描述](/img/posts/pytorch/24.png)

**CUDNN 为深度学习计算设计的软件库**

**注意：cudnn的版本要与CUDA的版本相同**

**（**本文写于2025.10.25，在写这篇文章时13.x并没有CUDNN，所以如果你使用的是13.x版本，可以跳过这一步**）**

**软件安装**

下载链接：[cuDNN Archive | NVIDIA Developer](https://developer.nvidia.com/rdp/cudnn-archive)
![图片描述](/img/posts/pytorch/25.png)

下载第一个，下载完成后，解压该文件，并打开
![图片描述](/img/posts/pytorch/26.png)

查看环境变量，找到CUDA的位置
![图片描述](/img/posts/pytorch/27.png)

将这个位置的文件替换成刚刚下载的文件

**使用conda创建pytorch虚拟环境搭建**

**环境搭建**

打开命令行输入“python --version”查看自己的pythoon版本
![图片描述](/img/posts/pytorch/28.png)

输入“conda create -n pytorch python=你的版本”创建新python环境并命名为pytorch（可以修改为自己想改的名字

conda create -n 你的名字 python=你的版本）
![图片描述](/img/posts/pytorch/29.png)

这里输入y，同意下载。
![图片描述](/img/posts/pytorch/30.png)

显示“done”，下载完成
![图片描述](/img/posts/pytorch/31.png)

输入“conda activate pytorch”，如下，左边会变为pytorch
![图片描述](/img/posts/pytorch/32.png)

输入如下两行代码，将pip conda改为国内镜像
官网：[PyTorch](https://pytorch.org/)
![图片描述](/img/posts/pytorch/33.png)
前往pytorch官网，首页下滑，选择对应版本pytorch，复制，在命令行中输入

![图片描述](/img/posts/pytorch/34.png)

下载完成后，输入pip list
![图片描述](/img/posts/pytorch/35.png)

发现列表中有tourch，这样，我们的pytorch就安装完毕了
