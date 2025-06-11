export interface ZipEntry {
  entryName: string;
  getData(): Buffer;
}
