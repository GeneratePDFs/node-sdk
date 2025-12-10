import { readFileSync, existsSync } from 'fs';
import { Pdf } from './Pdf.js';
import { InvalidArgumentException } from './exceptions/InvalidArgumentException.js';

interface ImageInput {
  name: string;
  path: string;
  mimeType?: string;
}

interface ProcessedImage {
  name: string;
  content: string;
  mime_type: string;
}

interface ApiResponse {
  data?: {
    id: number;
    name: string;
    status: string;
    download_url: string;
    created_at: string;
  };
}

export class GeneratePDFs {
  private static readonly BASE_URL = 'https://api.generatepdfs.com';
  private readonly apiToken: string;
  private readonly baseUrl: string;

  private constructor(apiToken: string) {
    this.apiToken = apiToken;
    this.baseUrl = GeneratePDFs.BASE_URL;
  }

  /**
   * Create a new GeneratePDFs instance with the provided API token.
   *
   * @param apiToken The API token for authentication
   * @returns GeneratePDFs instance
   */
  public static connect(apiToken: string): GeneratePDFs {
    return new GeneratePDFs(apiToken);
  }

  /**
   * Generate a PDF from HTML file(s) with optional CSS and images.
   *
   * @param htmlPath Path to the HTML file
   * @param cssPath Optional path to the CSS file
   * @param images Optional array of image files
   * @returns PDF object containing PDF information
   * @throws InvalidArgumentException If files are invalid
   */
  public async generateFromHtml(
    htmlPath: string,
    cssPath?: string | null,
    images: ImageInput[] = []
  ): Promise<Pdf> {
    if (!existsSync(htmlPath)) {
      throw new InvalidArgumentException(`HTML file not found or not readable: ${htmlPath}`);
    }

    const htmlContent = readFileSync(htmlPath);
    const htmlBase64 = htmlContent.toString('base64');

    const data: Record<string, unknown> = {
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
      data.images = this.processImages(images);
    }

    const response = await this.makeRequest('/pdfs/generate', data);

    if (!response.data) {
      throw new InvalidArgumentException('Invalid API response: missing data');
    }

    return Pdf.fromArray(response.data, this);
  }

  /**
   * Generate a PDF from a URL.
   *
   * @param url The URL to convert to PDF
   * @returns PDF object containing PDF information
   * @throws InvalidArgumentException If URL is invalid
   */
  public async generateFromUrl(url: string): Promise<Pdf> {
    try {
      new URL(url);
    } catch {
      throw new InvalidArgumentException(`Invalid URL: ${url}`);
    }

    const data = {
      url: url,
    };

    const response = await this.makeRequest('/pdfs/generate', data);

    if (!response.data) {
      throw new InvalidArgumentException('Invalid API response: missing data');
    }

    return Pdf.fromArray(response.data, this);
  }

  /**
   * Get a PDF by its ID.
   *
   * @param id The PDF ID
   * @returns PDF object containing PDF information
   * @throws InvalidArgumentException If ID is invalid
   */
  public async getPdf(id: number): Promise<Pdf> {
    if (id <= 0) {
      throw new InvalidArgumentException(`Invalid PDF ID: ${id}`);
    }

    const response = await this.makeGetRequest(`/pdfs/${id}`);

    if (!response.data) {
      throw new InvalidArgumentException('Invalid API response: missing data');
    }

    return Pdf.fromArray(response.data, this);
  }

  /**
   * Process image files and return formatted array for API.
   *
   * @param images Array of image inputs
   * @returns Array of processed images
   */
  private processImages(images: ImageInput[]): ProcessedImage[] {
    const processed: ProcessedImage[] = [];

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
      const mimeType = image.mimeType ?? this.detectMimeType(path);

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
   * @param filePath Path to the file
   * @returns MIME type
   */
  private detectMimeType(filePath: string): string {
    const extension = filePath.split('.').pop()?.toLowerCase() ?? '';
    const mimeTypes: Record<string, string> = {
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
   * @param downloadUrl The download URL for the PDF
   * @returns PDF binary content as Buffer
   */
  public async downloadPdf(downloadUrl: string): Promise<Buffer> {
    const response = await fetch(downloadUrl, {
      headers: {
        Authorization: `Bearer ${this.apiToken}`,
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
   * @param endpoint API endpoint
   * @param data Request data
   * @returns Decoded JSON response
   */
  private async makeRequest(endpoint: string, data: Record<string, unknown>): Promise<ApiResponse> {
    const url = `${this.baseUrl}${endpoint}`;

    const response = await fetch(url, {
      method: 'POST',
      headers: {
        Authorization: `Bearer ${this.apiToken}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify(data),
    });

    if (!response.ok) {
      const errorText = await response.text();
      throw new Error(`API request failed: ${response.status} ${response.statusText} - ${errorText}`);
    }

    return (await response.json()) as ApiResponse;
  }

  /**
   * Make an HTTP GET request to the API.
   *
   * @param endpoint API endpoint
   * @returns Decoded JSON response
   */
  private async makeGetRequest(endpoint: string): Promise<ApiResponse> {
    const url = `${this.baseUrl}${endpoint}`;

    const response = await fetch(url, {
      headers: {
        Authorization: `Bearer ${this.apiToken}`,
      },
    });

    if (!response.ok) {
      const errorText = await response.text();
      throw new Error(`API request failed: ${response.status} ${response.statusText} - ${errorText}`);
    }

    return (await response.json()) as ApiResponse;
  }
}


