#!/usr/bin/env node

import fs from 'fs';
import path from 'path';

import { S3Client, PutObjectCommand } from '@aws-sdk/client-s3';

const R2_ACCOUNT_ID = '7cbfb60ad7052f0d8cf590a51e024987';
const R2_ACCESS_KEY_ID = 'dca9a1c53946b3316761d65ce887d19f';
const R2_SECRET_ACCESS_KEY = process.env.S3_SECRET_KEY;

// 配置 R2 客户端
const r2Client = new S3Client({
  region: 'auto',
  endpoint: `https://${R2_ACCOUNT_ID}.r2.cloudflarestorage.com`,
  credentials: {
    accessKeyId: R2_ACCESS_KEY_ID,
    secretAccessKey: R2_SECRET_ACCESS_KEY
  },
  // 兼容性配置 <source_id data="0" title="https://developers.cloudflare.com/r2/examples/aws/aws-sdk-js-v3/" /><source_id data="4" title="https://developers.cloudflare.com/r2/examples/aws/aws-sdk-js/" /><source_id data="13" title="https://blog.cloudflare.com/zh-cn/r2-ga/?unique=1" />
  requestChecksumCalculation: 'WHEN_REQUIRED',
  responseChecksumValidation: 'WHEN_REQUIRED'
});

// 基础上传方法
async function uploadFile(bucketName, filePath, targetKey) {
  console.log('Uploading:', filePath);
  const fileContent = fs.readFileSync(filePath);

  if (fileContent.length === 0) {
    console.error('Uploaded Failed:', targetKey,'empty file');
    throw new Error('empty file')
  }

  const params = {
    Bucket: bucketName,
    Key: targetKey,
    Body: fileContent,
    ContentType: 'application/octet-stream',
    ACL: 'public-read' // 可选访问控制 <source_id data="1" title="https://juejin.cn/post/7400585120284770345" /><source_id data="8" title="https://www.zhuxiuxiang.com/2024/07/01/cloudflare-s3-browser/" />
  };

  try {
    const data = await r2Client.send(new PutObjectCommand(params));
    console.log(`Uploaded OK: ${targetKey}`);
    console.log(data);
    return `https://${bucketName}.${R2_ACCOUNT_ID}.r2.cloudflarestorage.com/${targetKey}`;
  } catch (err) {
    console.error('Uploaded Failed:', targetKey, err);
    throw err;
  }
}

const filepath = process.argv[2];
await uploadFile('heapdump', filepath, path.basename(filepath));
