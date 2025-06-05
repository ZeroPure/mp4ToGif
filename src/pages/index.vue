<template>
  <div>
    <h2>Upload Video</h2>
    <el-upload
      ref="uploadRef"
      class="upload"
      drag
      :auto-upload="false"
      :on-change="handleChange"
      :show-file-list="true"
    >
      <el-icon class="icon" :size="50">
        <UploadFilled />
      </el-icon>
      <div class="upload-text">
        Drop file here or <em style="color: #409eff">click to upload</em>
      </div>
      <template #tip>
        <div class="el-upload__tip" style="font-size: 14px; color: #666;">
          video file with a size less than 100mb
        </div>
      </template>
    </el-upload>

    <div v-if="videoURL" class="preview">
      <h3>Video</h3>
      <video ref="videoRef" controls  width="100%">
        <source :src="videoURL" type="video/mp4">
      </video>
      <div class="btn" style="width: 100%;display: flex;justify-content: space-between;">
        <el-button @click="setStartTime" type="primary" size="large">set start time</el-button>
        <el-button @click="setEndTime" type="primary" size="large">set end time</el-button>
      </div>
      <el-form
        ref="ruleFormRef"
        label-width="auto"
        :rules="rules"
        :model="formData"
        style="margin-top: 20px"
      >
        <el-form-item label="Start Time" prop="startTime">
          <el-input v-model="formData.startTime"></el-input>
        </el-form-item>
        <el-form-item label="End Time" prop="endTime">
          <el-input v-model="formData.endTime"></el-input>
        </el-form-item>
        <el-form-item>
          <el-button @click="onConvertClick" type="success" size="large">Convert to Gif</el-button>
        </el-form-item>
      </el-form>
      <div v-if="gifInfo" style="width: 98%;margin-top: 20px;border: 1px solid #cccccc;padding: 15px;display: flex;justify-content: space-between;align-items: center">
        <div style="display: flex;align-items: center">
          <img src="@/assets/image.png" alt="png" style="width: 50px;height: 50px;">
          <text style="margin-left: 20px;">{{gifInfo.name}}</text>
        </div>
        <el-button type="primary" @click="downloadGif" size="large">download</el-button>
      </div>
    </div>
  </div>
</template>

<script setup>
import {nextTick, reactive, ref} from 'vue'
import { createFFmpeg, fetchFile } from "@ffmpeg/ffmpeg";
import { ElMessage, ElMessageBox } from 'element-plus'
const videoURL = ref('')
const uploadRef = ref(null)
const videoRef = ref(null)
const videoFile = ref(null)
const gifInfo = ref(null)
const ruleFormRef = ref(null)
const formData = reactive({
  startTime: null,
  endTime: null,
})
const rules = {
  startTime: [
    {
      required: true,
      message: 'Please select start time',
      trigger: 'blur'
    }
  ],
  endTime: [
    {
      required: true,
      message: 'Please select end time',
      trigger: 'blur'
    },
    {
      validator: (rule, value, callback) => {
        if(formData.startTime == null || value == null){
          return callback()
        }
        if(value <= formData.startTime){
          return callback(new Error('end time should be greater than start time'))
        }
        return callback()
      },
      trigger: 'blur'
    }
  ]
}
const handleChange = (file) => {
  // console.log(file)
  // console.log(file.raw)
  if(!file && !file.raw){
    ElMessage.error('please select a file')
    return;
  }

  const rawFile = file.raw
  const isVideo = rawFile.type.startsWith('video/')
  const limitSize = rawFile.size / 1024 / 1024 < 100

  if(!isVideo){
    ElMessage.error('only support video file')
    uploadRef.value?.clearFiles()
    // console.log(uploadRef.value)
    return;
  }

  if(!limitSize){
    ElMessage.error('file size should less than 100mb')
    uploadRef.value?.clearFiles()
    return;
  }

  videoURL.value = ''
  videoFile.value = null
  gifInfo.value = null
  formData.startTime = null
  formData.endTime = null
  nextTick(() => {
    videoURL.value = URL.createObjectURL(rawFile)
    videoFile.value = rawFile
    console.log(videoURL.value)
  })
  // 清除文件列表，从而可以再次上传
  uploadRef.value?.clearFiles()
}

const getCurrentTime = () => {
  return videoRef.value.currentTime
}

const setStartTime = () => {
  formData.startTime = getCurrentTime()
}

const setEndTime = () => {
  formData.endTime = getCurrentTime()
}

const ffmpeg = createFFmpeg({
  log: true,
  corePath: '/ffmpeg/ffmpeg-core.js',
  progress: ({ratio}) => {
    console.log(`完成率: ${(ratio * 100).toFixed(2)}%`)
  }
})
const convertToGif = async() => {
  const duration = formData.endTime - formData.startTime
  const start = formData.startTime

  try{
    if(!ffmpeg.isLoaded()){
      ElMessage.info('Loading ffmpeg-core.js, please wait a moment')
      await ffmpeg.load()
    }
    // 写入文件
    ffmpeg.FS('writeFile', 'input.mp4', await fetchFile(videoFile.value))
    // 第一步：生成调色板
    await ffmpeg.run(
        '-ss', `${start}`,
        '-t', `${duration}`,
        '-i', 'input.mp4',
        '-vf', 'fps=16,scale=320:-1:flags=lanczos,palettegen',
        'palette.png'
    );

    // 第二步：使用调色板生成gif
    await ffmpeg.run(
        '-ss', `${start}`,
        '-t', `${duration}`,
        '-i', 'input.mp4',
        '-i', 'palette.png',
        '-filter_complex', 'fps=16,scale=320:-1:flags=lanczos[x];[x][1:v]paletteuse',
        '-gifflags', '+transdiff',
        'output.gif'
    );

    // 读取 gif 文件
    const data = await ffmpeg.FS('readFile','output.gif');
    const gifURL = URL.createObjectURL(new Blob([data.buffer], { type: 'image/gif' }));
    // window.open(gifURL, '_blank');
    gifInfo.value = {
      url: gifURL,
      name: 'output.gif'
    }
    ElMessage.success('Convert to gif success');
  }catch(err){
    ElMessage.error('Convert to gif failed')
    console.log('convert failed:', err)
  }
}

const onConvertClick = () => {
  ruleFormRef.value.validate((valid) => {
    if(valid) {
      convertToGif()
    }else{
      return false;
    }
  })
}

const downloadGif = () => {
  if(gifInfo.value){
    const link = document.createElement('a')
    link.href = gifInfo.value.url
    link.download = gifInfo.value.name
    link.click()
  }
}
</script>

<style scoped>

</style>
