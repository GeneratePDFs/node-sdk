import { writeFileSync } from 'fs';
import { GeneratePDFs } from './GeneratePDFs.js';
import { InvalidArgumentException } from './exceptions/InvalidArgumentException.js';
import { RuntimeException } from './exceptions/RuntimeException.js';

interface PdfData {
  id: number;
  name: string;
  status: string;
  download_url: string;
  created_at: string;
}

export class Pdf {
  private readonly client: GeneratePDFs;

  public constructor(
    private readonly id: number,
    private readonly name: string,
    private readonly status: string,
    private readonly downloadUrl: string,
    private readonly createdAt: Date,
    client: GeneratePDFs
  ) {
    this.client = client;
  }

  /**
   * Create a Pdf instance from API response data.
   *
   * @param data API response data
   * @param client The GeneratePDFs client instance
   * @returns Pdf instance
   */
  public static fromArray(data: PdfData, client: GeneratePDFs): Pdf {
    if (!data.id || !data.name || !data.status || !data.download_url || !data.created_at) {
      throw new InvalidArgumentException('Invalid PDF data structure');
    }

    // Parse the created_at date
    let createdAt: Date;
    try {
      createdAt = new Date(data.created_at);
      if (isNaN(createdAt.getTime())) {
        throw new InvalidArgumentException(`Invalid created_at format: ${data.created_at}`);
      }
    } catch (error) {
      if (error instanceof InvalidArgumentException) {
        throw error;
      }
      throw new InvalidArgumentException(`Invalid created_at format: ${data.created_at}`);
    }

    return new Pdf(
      Number(data.id),
      String(data.name),
      String(data.status),
      String(data.download_url),
      createdAt,
      client
    );
  }

  /**
   * Get the PDF ID.
   *
   * @returns PDF ID
   */
  public getId(): number {
    return this.id;
  }

  /**
   * Get the PDF name.
   *
   * @returns PDF name
   */
  public getName(): string {
    return this.name;
  }

  /**
   * Get the PDF status.
   *
   * @returns PDF status
   */
  public getStatus(): string {
    return this.status;
  }

  /**
   * Get the download URL.
   *
   * @returns Download URL
   */
  public getDownloadUrl(): string {
    return this.downloadUrl;
  }

  /**
   * Get the creation date.
   *
   * @returns Creation date
   */
  public getCreatedAt(): Date {
    return this.createdAt;
  }

  /**
   * Check if the PDF is ready for download.
   *
   * @returns True if PDF is ready
   */
  public isReady(): boolean {
    return this.status === 'completed';
  }

  /**
   * Download the PDF content.
   *
   * @returns PDF binary content as Buffer
   * @throws RuntimeException If the PDF is not ready or download fails
   */
  public async download(): Promise<Buffer> {
    if (!this.isReady()) {
      throw new RuntimeException(`PDF is not ready yet. Current status: ${this.status}`);
    }

    return await this.client.downloadPdf(this.downloadUrl);
  }

  /**
   * Download the PDF and save it to a file.
   *
   * @param filePath Path where to save the PDF file
   * @returns True on success
   * @throws RuntimeException If the PDF is not ready or download fails
   */
  public async downloadToFile(filePath: string): Promise<boolean> {
    const content = await this.download();

    try {
      writeFileSync(filePath, content);
      return true;
    } catch (error) {
      throw new RuntimeException(`Failed to write PDF to file: ${filePath}`);
    }
  }

  /**
   * Refresh the PDF data from the API.
   *
   * @returns A new Pdf instance with updated data
   */
  public async refresh(): Promise<Pdf> {
    return await this.client.getPdf(this.id);
  }
}


