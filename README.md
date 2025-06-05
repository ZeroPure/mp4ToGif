### 单个MP4文件转GIF页面



### 依赖下载

```
#npm
npm install

#yarn
yarn install
```



### 主要依赖

```
"@ffmpeg/core": "^0.10.0",
"@ffmpeg/ffmpeg": "^0.9.8",
```

高版本ffmpeg可能会出现导入模块错误

```
Uncaught ReferenceError: createFFmpegCore is not defined
```

解决链接

```
https://github.com/ffmpegwasm/ffmpeg.wasm/issues/262
```



