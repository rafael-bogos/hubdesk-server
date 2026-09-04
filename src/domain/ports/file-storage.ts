export interface SavedFile {
  path: string;
  filename: string;
}

export interface FileToSave {
  originalName: string;
  mimeType: string;
  buffer: Buffer;
}

export interface FileStorage {
  save(file: FileToSave): Promise<SavedFile>;
  delete(path: string): Promise<void>;
  getUrl(path: string): string;
}
