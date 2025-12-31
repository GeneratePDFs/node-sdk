import { readFileSync, existsSync } from 'fs';
import { Pdf } from './Pdf.js';
import { InvalidArgumentException } from './exceptions/InvalidArgumentException.js';

export class GeneratePDFs {
  static BASE_URL = 'https://api.generatepdfs.com';
  #apiToken;
  #baseUrl;

  constructor(apiToken) {
    this.#apiToken = apiToken;
    this.#baseUrl = GeneratePDFs.BASE_URL;
  }

  /**
   * Create a new GeneratePDFs instance with the provided API token.
   *
   * @param {string} apiToken The API token for authentication
   * @returns {GeneratePDFs} GeneratePDFs instance
   */
  static connect(apiToken) {
    return new GeneratePDFs(apiToken);
  }

  /**
   * Generate a PDF from HTML file(s) with optional CSS and images.
   *
   * @param {string} htmlPath Path to the HTML file
   * @param {string|null} cssPath Optional path to the CSS file
   * @param {Array<{name: string, path: string, mimeType?: string}>} images Optional array of image files
   * @returns {Promise<Pdf>} PDF object containing PDF information
   * @throws {InvalidArgumentException} If files are invalid
   */
  async generateFromHtml(htmlPath, cssPath = null, images = []) {
    if (!existsSync(htmlPath)) {
      throw new InvalidArgumentException(`HTML file not found or not readable: ${htmlPath}`);
    }

    const htmlContent = readFileSync(htmlPath);
    const htmlBase64 = htmlContent.toString('base64');

    const data = {
      html: htmlBase64,
    };

    if (cssPath !== null && cssPath !== undefined) {
      if (!existsSync(cssPath)) {
        throw new InvalidArgumentException(`CSS file not found or not readable: ${cssPath}`);
      }

      const cssContent = readFileSync(cssPath);
      data.css = cssContent.toString('base64');
    }

    if (images.length > 0) {
      data.images = this.#processImages(images);
    }

    const response = await this.#makeRequest('/pdfs/generate', data);

    if (!response.data) {
      throw new InvalidArgumentException('Invalid API response: missing data');
    }

    return Pdf.fromArray(response.data, this);
  }

  /**
   * Generate a PDF from a URL.
   *
   * @param {string} url The URL to convert to PDF
   * @returns {Promise<Pdf>} PDF object containing PDF information
   * @throws {InvalidArgumentException} If URL is invalid
   */
  async generateFromUrl(url) {
    try {
      new URL(url);
    } catch {
      throw new InvalidArgumentException(`Invalid URL: ${url}`);
    }

    const data = {
      url: url,
    };

    const response = await this.#makeRequest('/pdfs/generate', data);

    if (!response.data) {
      throw new InvalidArgumentException('Invalid API response: missing data');
    }

    return Pdf.fromArray(response.data, this);
  }

  /**
   * Get a PDF by its ID.
   *
   * @param {number} id The PDF ID
   * @returns {Promise<Pdf>} PDF object containing PDF information
   * @throws {InvalidArgumentException} If ID is invalid
   */
  async getPdf(id) {
    if (id <= 0) {
      throw new InvalidArgumentException(`Invalid PDF ID: ${id}`);
    }

    const response = await this.#makeGetRequest(`/pdfs/${id}`);

    if (!response.data) {
      throw new InvalidArgumentException('Invalid API response: missing data');
    }

    return Pdf.fromArray(response.data, this);
  }

  /**
   * Process image files and return formatted array for API.
   *
   * @param {Array<{name: string, path: string, mimeType?: string}>} images Array of image inputs
   * @returns {Array<{name: string, content: string, mime_type: string}>} Array of processed images
   */
  #processImages(images) {
    const processed = [];

    for (const image of images) {
      if (!image.path || !image.name) {
        continue;
      }

      const path = image.path;
      const name = image.name;

      if (!existsSync(path)) {
        continue;
      }

      const content = readFileSync(path);
      const contentBase64 = content.toString('base64');

      // Detect mime type if not provided
      const mimeType = image.mimeType ?? this.#detectMimeType(path);

      processed.push({
        name: name,
        content: contentBase64,
        mime_type: mimeType,
      });
    }

    return processed;
  }

  /**
   * Detect MIME type of a file based on extension.
   *
   * @param {string} filePath Path to the file
   * @returns {string} MIME type
   */
  #detectMimeType(filePath) {
    const extension = filePath.split('.').pop()?.toLowerCase() ?? '';
    const mimeTypes = {
      jpg: 'image/jpeg',
      jpeg: 'image/jpeg',
      png: 'image/png',
      gif: 'image/gif',
      webp: 'image/webp',
      svg: 'image/svg+xml',
    };

    return mimeTypes[extension] ?? 'application/octet-stream';
  }

  /**
   * Download a PDF from the API.
   *
   * @param {string} downloadUrl The download URL for the PDF
   * @returns {Promise<Buffer>} PDF binary content as Buffer
   */
  async downloadPdf(downloadUrl) {
    const response = await fetch(downloadUrl, {
      headers: {
        Authorization: `Bearer ${this.#apiToken}`,
      },
    });

    if (!response.ok) {
      throw new Error(`Failed to download PDF: ${response.statusText}`);
    }

    const arrayBuffer = await response.arrayBuffer();
    return Buffer.from(arrayBuffer);
  }

  /**
   * Make an HTTP POST request to the API.
   *
   * @param {string} endpoint API endpoint
   * @param {Record<string, unknown>} data Request data
   * @returns {Promise<{data?: {id: number, name: string, status: string, download_url: string, created_at: string}}>} Decoded JSON response
   */
  async #makeRequest(endpoint, data) {
    const url = `${this.#baseUrl}${endpoint}`;

    const response = await fetch(url, {
      method: 'POST',
      headers: {
        Authorization: `Bearer ${this.#apiToken}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify(data),
    });

    if (!response.ok) {
      const errorText = await response.text();
      throw new Error(`API request failed: ${response.status} ${response.statusText} - ${errorText}`);
    }

    return await response.json();
  }

  /**
   * Make an HTTP GET request to the API.
   *
   * @param {string} endpoint API endpoint
   * @returns {Promise<{data?: {id: number, name: string, status: string, download_url: string, created_at: string}}>} Decoded JSON response
   */
  async #makeGetRequest(endpoint) {
    const url = `${this.#baseUrl}${endpoint}`;

    const response = await fetch(url, {
      headers: {
        Authorization: `Bearer ${this.#apiToken}`,
      },
    });

    if (!response.ok) {
      const errorText = await response.text();
      throw new Error(`API request failed: ${response.status} ${response.statusText} - ${errorText}`);
    }

    return await response.json();
  }
}

