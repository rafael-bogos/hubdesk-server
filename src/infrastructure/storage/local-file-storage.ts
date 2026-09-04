import { randomUUID } from 'node:crypto';
import { mkdir, readFile, unlink, writeFile } from 'node:fs/promises';
import { extname, join, resolve } from 'node:path';
import { FileStorage, FileToSave, SavedFile } from '../../domain/ports/file-storage';

export class LocalFileStorage implements FileStorage {
  constructor(private readonly uploadsDir: string) {}

  async save(file: FileToSave): Promise<SavedFile> {
    await mkdir(this.uploadsDir, { recursive: true });

    const filename = `${randomUUID()}${extname(file.originalName)}`;
    const path = join(this.uploadsDir, filename);

    await writeFile(path, file.buffer);

    return { path: filename, filename: file.originalName };
  }

  async read(path: string): Promise<Buffer> {
    return readFile(resolve(this.uploadsDir, path));
  }

  async delete(path: string): Promise<void> {
    await unlink(resolve(this.uploadsDir, path));
  }

  getUrl(path: string): string {
    return `/uploads/${path}`;
  }
}
