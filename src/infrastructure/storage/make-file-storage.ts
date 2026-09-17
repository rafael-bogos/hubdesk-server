import { resolve } from 'node:path';
import { FileStorage } from '../../domain/ports/file-storage';
import { env } from '../../main/config/env';
import { LocalFileStorage } from './local-file-storage';
import { S3FileStorage } from './s3-file-storage';

export const makeFileStorage = (): FileStorage => {
  if (env.r2AccountId && env.r2AccessKeyId && env.r2SecretAccessKey && env.r2BucketName) {
    return new S3FileStorage({
      accountId: env.r2AccountId,
      accessKeyId: env.r2AccessKeyId,
      secretAccessKey: env.r2SecretAccessKey,
      bucket: env.r2BucketName,
    });
  }

  return new LocalFileStorage(resolve(process.cwd(), env.uploadsDir));
};
