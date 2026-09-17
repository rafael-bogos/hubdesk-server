import { randomUUID } from 'node:crypto';
import { extname } from 'node:path';
import { DeleteObjectCommand, GetObjectCommand, PutObjectCommand, S3Client } from '@aws-sdk/client-s3';
import { FileStorage, FileToSave, SavedFile } from '../../domain/ports/file-storage';

export interface S3FileStorageConfig {
  bucket: string;
  accountId: string;
  accessKeyId: string;
  secretAccessKey: string;
}

// R2 da Cloudflare é compatível com a API do S3 — mesmo SDK (@aws-sdk/client-s3),
// só apontando pro endpoint do R2 em vez da AWS. `path`/key gravado no banco
// (attachment.path, login_settings.customOAuthLogoPath) é o mesmo em ambos os
// backends (LocalFileStorage e este), então nenhuma migration de schema foi
// necessária pra trocar de um pro outro.
export class S3FileStorage implements FileStorage {
  private readonly client: S3Client;
  private readonly bucket: string;

  constructor(config: S3FileStorageConfig) {
    this.bucket = config.bucket;
    this.client = new S3Client({
      region: 'auto',
      endpoint: `https://${config.accountId}.r2.cloudflarestorage.com`,
      credentials: {
        accessKeyId: config.accessKeyId,
        secretAccessKey: config.secretAccessKey,
      },
    });
  }

  async save(file: FileToSave): Promise<SavedFile> {
    const key = `${randomUUID()}${extname(file.originalName)}`;

    await this.client.send(
      new PutObjectCommand({
        Bucket: this.bucket,
        Key: key,
        Body: file.buffer,
        ContentType: file.mimeType,
      }),
    );

    return { path: key, filename: file.originalName };
  }

  async read(path: string): Promise<Buffer> {
    const response = await this.client.send(new GetObjectCommand({ Bucket: this.bucket, Key: path }));
    const bytes = await response.Body?.transformToByteArray();

    if (!bytes) {
      throw new Error(`Arquivo "${path}" não encontrado no bucket`);
    }

    return Buffer.from(bytes);
  }

  async delete(path: string): Promise<void> {
    await this.client.send(new DeleteObjectCommand({ Bucket: this.bucket, Key: path }));
  }
}
