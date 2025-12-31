import { writeFileSync } from 'fs';
import { GeneratePDFs } from './GeneratePDFs.js';
import { InvalidArgumentException } from './exceptions/InvalidArgumentException.js';
import { RuntimeException } from './exceptions/RuntimeException.js';

export class Pdf {
  #client;
  #id;
  #name;
  #status;
  #downloadUrl;
  #createdAt;

  constructor(id, name, status, downloadUrl, createdAt, client) {
    this.#id = id;
    this.#name = name;
    this.#status = status;
    this.#downloadUrl = downloadUrl;
    this.#createdAt = createdAt;
    this.#client = client;
  }

  /**
   * Create a Pdf instance from API response data.
   *
   * @param {{id: number, name: string, status: string, download_url: string, created_at: string}} data API response data
   * @param {GeneratePDFs} client The GeneratePDFs client instance
   * @returns {Pdf} Pdf instance
   */
  static fromArray(data, client) {
    if (!data.id || !data.name || !data.status || !data.download_url || !data.created_at) {
      throw new InvalidArgumentException('Invalid PDF data structure');
    }

    // Parse the created_at date
    let createdAt;
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
   * @returns {number} PDF ID
   */
  getId() {
    return this.#id;
  }

  /**
   * Get the PDF name.
   *
   * @returns {string} PDF name
   */
  getName() {
    return this.#name;
  }

  /**
   * Get the PDF status.
   *
   * @returns {string} PDF status
   */
  getStatus() {
    return this.#status;
  }

  /**
   * Get the download URL.
   *
   * @returns {string} Download URL
   */
  getDownloadUrl() {
    return this.#downloadUrl;
  }

  /**
   * Get the creation date.
   *
   * @returns {Date} Creation date
   */
  getCreatedAt() {
    return this.#createdAt;
  }

  /**
   * Check if the PDF is ready for download.
   *
   * @returns {boolean} True if PDF is ready
   */
  isReady() {
    return this.#status === 'completed';
  }

  /**
   * Download the PDF content.
   *
   * @returns {Promise<Buffer>} PDF binary content as Buffer
   * @throws {RuntimeException} If the PDF is not ready or download fails
   */
  async download() {
    if (!this.isReady()) {
      throw new RuntimeException(`PDF is not ready yet. Current status: ${this.#status}`);
    }

    return await this.#client.downloadPdf(this.#downloadUrl);
  }

  /**
   * Download the PDF and save it to a file.
   *
   * @param {string} filePath Path where to save the PDF file
   * @returns {Promise<boolean>} True on success
   * @throws {RuntimeException} If the PDF is not ready or download fails
   */
  async downloadToFile(filePath) {
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
   * @returns {Promise<Pdf>} A new Pdf instance with updated data
   */
  async refresh() {
    return await this.#client.getPdf(this.#id);
  }
}

