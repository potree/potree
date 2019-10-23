
# 入门

### 下载 PotreeConverter

* [PotreeConverter](https://github.com/potree/PotreeConverter)

### 建立网络服务

由于浏览器严格的安全策略，几乎不可能直接打开potree的HTML文件，所有需要把所有必须的文件和点云都放到网络服务下. 
你可以搭建一个本地的网络服务，我们建议一下三个简单的跨平台服务，SimpleHTTPServer, live-server 和 XAMPP.

#### Python / SimpleHTTPServer

对于很多已经安装Python的机器,在Potree HTML文件夹下开启命令行工具，输入命令:

```python –m SimpleHTTPServer```

然后，通过浏览器输入 localhost:8000 


#### live-server
[live-server](https://www.npmjs.com/package/live-server) 是一个简单的node网络服务. 它有一个好处是当文件发送改变时可以自动刷新页面. 首先要安装[node.js](https://nodejs.org/en/) and npm (会和node一起安装) , 然后在Potree HTML文件夹下开启命令行，输入:

  ```
  npm install -g live-server
  live-server
  ```

它会在默认浏览器中自动打开文件夹下的页面，你可以通过GUI选择想要的页面. 如果你找不到该页面，也可以通过localhost+端口号（在命令行中已经给出）打开网页. 


#### XAMPP
[XAMPP](https://www.apachefriends.org/de/index.html), 包括了 [Apache](http://httpd.apache.org/) 、PHP 和 MySQL (不是必须).

在安装并启动Apache/XAMPP之后, 你可以通过localhost+URL的方式打开htdocs文件夹下的页面 . 假设你的文件夹是 ```C:\xampp\htdocs```, 那么你可以在浏览器中输入```http://localhost```

### 转换 & 生成Web页面

通过[PotreeConverter page](https://github.com/potree/PotreeConverter)可以学习一些转换（converter）方面的知识，用你的点云试试下面这句话:

```
./PotreeConverter.exe C:/pointcloud.las -o C:/xampp/htdocs/potree --generate-page pageName
```

你可以通过下面这个URL，打开并查看生成的potree网页: ```http://localhost/potree/examples/pageName.html```

![](images/lion_demo_screenshot.jpg)
