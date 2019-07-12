
# README

* [入门](./docs/getting_started_zh.md)

## 关于

Potree是一个基于WebGL的开源海量点云渲染引擎。
它孵化自[TU Wien Scanopy project](https://www.cg.tuwien.ac.at/research/projects/Scanopy/)
而且也部分来自于 [Harvest4D Project](https://harvest4d.org/).


<a href="http://potree.org/wp/demo/" target="_blank"> ![](./docs/images/potree_screens.png) </a>

最新的开发工作和消息可以从这里获得 [twitter](https://twitter.com/m_schuetz)

联系人: Markus Schütz (mschuetz@potree.org)

参考: [Potree: Rendering Large Point Clouds in Web Browsers](https://www.cg.tuwien.ac.at/research/publications/2016/SCHUETZ-2016-POT/SCHUETZ-2016-POT-thesis.pdf)

## 编译

确保你已经安装[node.js](http://nodejs.org/)

安装所有的依赖库，这些依赖库 在package.json中已经列出，接下来，安装gulp工具:

    cd <potree_directory>
    npm install --save
    npm install -g gulp
    npm install -g rollup

使用命令 ```gulp watch```  

* 创建 ./build/potree 
* 监控源码的变更，自动打包更新
* 启动网络服务 localhost:1234. 使用浏览器输入 http://localhost:1234/examples/ 可以测试例子.

```
gulp watch
```

## 下载

[PotreeConverter source and Win64 binaries](https://github.com/potree/PotreeConverter/releases)

## Showcase

在这里有一些在线的例子，可供浏览 [potree showcase](http://potree.org/wp/demo/) .

## 适用性

| 浏览器              | 系统      | 结果        |   |
| -------------------- |:-------:|:-------------:|:-:|
| Chrome 64            | Win10   | works         |   |
| Firefox 58           | Win10   | works         |   |
| Edge                 | Win10   | not supported |   |
| Internet Explorer 11 | Win7    | not supported |   |
| Chrome               | Android | works         |由于WebGL的部分扩展不支持，可能影响部分功能 |
| Opera                | Android | works         | 由于WebGL的部分扩展不支持，可能影响部分功能 |

## 引用

*  使用的Multi-res-octree算法是由 Michael Wimmer 和 Claus Scheiblauer（维也纳工程大学）创立的，该算法是[Scanopy Project](http://www.cg.tuwien.ac.at/research/projects/Scanopy/)的一部分.
* [Three.js](https://github.com/mrdoob/three.js), 是一个WebGL三维渲染库，potree是基于它的.
* [plas.io](http://plas.io/) 点云可视化系统. LAS 和 LAZ格式的解析使用的laslaz.js文件继承自plas.io. 感谢 [Uday Verma](https://twitter.com/udaykverma) 和 [Howard Butler](https://twitter.com/howardbutler)!
* [Harvest4D](https://harvest4d.org/) Potree 目前是 Harvest4D 项目的首要课题。
* Christian Boucheny (EDL 开发者) 和 Daniel Girardeau-Montaut ([CloudCompare](http://www.danielgm.net/cc/)). EDL着色器是改写自CloudCompare的源码!
* [Martin Isenburg](http://rapidlasso.com/), [Georepublic](http://georepublic.de/en/),
[Veesus](http://veesus.com/), [Sigeom Sa](http://www.sigeom.ch/), [SITN](http://www.ne.ch/sitn), [LBI ArchPro](http://archpro.lbg.ac.at/),  [Pix4D](http://pix4d.com/) 、以及其他所有potree 和 PotreeConverter的贡献者都提供了很多帮助和支持.
