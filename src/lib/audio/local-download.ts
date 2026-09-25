/** One short-lived local blob URL. Release on replacement, timeout and navigation. */
export class LocalDownload {
  private url: string | undefined;
  private timer: ReturnType<typeof setTimeout> | undefined;
  save(document: unknown, filename: string): void {
    this.dispose();
    this.url = URL.createObjectURL(new Blob([JSON.stringify(document, null, 2)], { type: 'application/json' }));
    const link = globalThis.document.createElement('a'); link.href = this.url; link.download = filename;
    globalThis.document.body.append(link); link.click(); link.remove();
    this.timer = setTimeout(() => this.dispose(), 1000);
  }
  dispose(): void { clearTimeout(this.timer); this.timer = undefined; if (this.url) URL.revokeObjectURL(this.url); this.url = undefined; }
}
