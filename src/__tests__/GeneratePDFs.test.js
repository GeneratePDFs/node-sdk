import { describe, it, expect, beforeEach, jest } from '@jest/globals';
import { writeFileSync, unlinkSync, existsSync } from 'fs';
import { tmpdir } from 'os';
import { join } from 'path';
import { GeneratePDFs } from '../GeneratePDFs.js';
import { Pdf } from '../Pdf.js';
import { InvalidArgumentException } from '../exceptions/InvalidArgumentException.js';

// Mock fetch globally
const mockFetch = jest.fn();
global.fetch = mockFetch;

describe('GeneratePDFs', () => {
  let apiToken;
  let baseUrl;

  beforeEach(() => {
    apiToken = 'test-api-token';
    baseUrl = 'https://api.generatepdfs.com';
    jest.clearAllMocks();
  });

  describe('connect', () => {
    it('creates a new GeneratePDFs instance', () => {
      const client = GeneratePDFs.connect(apiToken);
      expect(client).toBeInstanceOf(GeneratePDFs);
    });
  });

  describe('generateFromHtml', () => {
    it('throws exception when HTML file does not exist', async () => {
      const client = GeneratePDFs.connect(apiToken);

      await expect(
        client.generateFromHtml('/non/existent/file.html')
      ).rejects.toThrow(InvalidArgumentException);
      await expect(
        client.generateFromHtml('/non/existent/file.html')
      ).rejects.toThrow('HTML file not found or not readable');
    });

    it('throws exception when CSS file does not exist', async () => {
      const client = GeneratePDFs.connect(apiToken);
      const htmlFile = join(tmpdir(), `test-${Date.now()}.html`);

      writeFileSync(htmlFile, '<html><body>Test</body></html>');

      try {
        await expect(
          client.generateFromHtml(htmlFile, '/non/existent/file.css')
        ).rejects.toThrow(InvalidArgumentException);
        await expect(
          client.generateFromHtml(htmlFile, '/non/existent/file.css')
        ).rejects.toThrow('CSS file not found or not readable');
      } finally {
        if (existsSync(htmlFile)) {
          unlinkSync(htmlFile);
        }
      }
    });

    it('successfully generates PDF from HTML file', async () => {
      const htmlFile = join(tmpdir(), `test-${Date.now()}.html`);
      writeFileSync(htmlFile, '<html><body>Test</body></html>');

      const mockResponse = {
        data: {
          id: 123,
          name: 'test.pdf',
          status: 'pending',
          download_url: 'https://api.generatepdfs.com/pdfs/123/download/token',
          created_at: '2024-01-01T12:00:00.000000Z',
        },
      };

      mockFetch.mockResolvedValueOnce({
        ok: true,
        json: async () => mockResponse,
      });

      const client = GeneratePDFs.connect(apiToken);
      const pdf = await client.generateFromHtml(htmlFile);

      expect(pdf).toBeInstanceOf(Pdf);
      expect(pdf.getId()).toBe(123);
      expect(pdf.getName()).toBe('test.pdf');
      expect(pdf.getStatus()).toBe('pending');

      expect(mockFetch).toHaveBeenCalledWith(
        `${baseUrl}/pdfs/generate`,
        expect.objectContaining({
          method: 'POST',
          headers: expect.objectContaining({
            Authorization: `Bearer ${apiToken}`,
            'Content-Type': 'application/json',
          }),
        })
      );

      if (existsSync(htmlFile)) {
        unlinkSync(htmlFile);
      }
    });

    it('includes CSS when provided', async () => {
      const htmlFile = join(tmpdir(), `test-${Date.now()}.html`);
      const cssFile = join(tmpdir(), `test-${Date.now()}.css`);

      writeFileSync(htmlFile, '<html><body>Test</body></html>');
      writeFileSync(cssFile, 'body { color: red; }');

      const mockResponse = {
        data: {
          id: 123,
          name: 'test.pdf',
          status: 'pending',
          download_url: 'https://api.generatepdfs.com/pdfs/123/download/token',
          created_at: '2024-01-01T12:00:00.000000Z',
        },
      };

      mockFetch.mockResolvedValueOnce({
        ok: true,
        json: async () => mockResponse,
      });

      const client = GeneratePDFs.connect(apiToken);
      const pdf = await client.generateFromHtml(htmlFile, cssFile);

      expect(pdf).toBeInstanceOf(Pdf);

      const fetchCall = mockFetch.mock.calls[0];
      const body = JSON.parse(fetchCall[1]?.body);
      expect(body.html).toBeDefined();
      expect(body.css).toBeDefined();

      if (existsSync(htmlFile)) {
        unlinkSync(htmlFile);
      }
      if (existsSync(cssFile)) {
        unlinkSync(cssFile);
      }
    });

    it('includes images when provided', async () => {
      const htmlFile = join(tmpdir(), `test-${Date.now()}.html`);
      const imageFile = join(tmpdir(), `test-${Date.now()}.png`);

      writeFileSync(htmlFile, '<html><body>Test</body></html>');
      writeFileSync(imageFile, 'fake-image-content');

      const mockResponse = {
        data: {
          id: 123,
          name: 'test.pdf',
          status: 'pending',
          download_url: 'https://api.generatepdfs.com/pdfs/123/download/token',
          created_at: '2024-01-01T12:00:00.000000Z',
        },
      };

      mockFetch.mockResolvedValueOnce({
        ok: true,
        json: async () => mockResponse,
      });

      const client = GeneratePDFs.connect(apiToken);
      const pdf = await client.generateFromHtml(htmlFile, null, [
        {
          name: 'test.png',
          path: imageFile,
        },
      ]);

      expect(pdf).toBeInstanceOf(Pdf);

      const fetchCall = mockFetch.mock.calls[0];
      const body = JSON.parse(fetchCall[1]?.body);
      expect(body.html).toBeDefined();
      expect(body.images).toBeDefined();
      expect(Array.isArray(body.images)).toBe(true);
      expect(body.images.length).toBeGreaterThan(0);

      if (existsSync(htmlFile)) {
        unlinkSync(htmlFile);
      }
      if (existsSync(imageFile)) {
        unlinkSync(imageFile);
      }
    });

    it('throws exception when API response is invalid', async () => {
      const htmlFile = join(tmpdir(), `test-${Date.now()}.html`);
      writeFileSync(htmlFile, '<html><body>Test</body></html>');

      const mockResponse = {
        // Missing 'data' key
      };

      const mockResponseObj = {
        ok: true,
        json: async () => mockResponse,
      };

      mockFetch.mockResolvedValueOnce(mockResponseObj);
      mockFetch.mockResolvedValueOnce(mockResponseObj);

      const client = GeneratePDFs.connect(apiToken);

      await expect(client.generateFromHtml(htmlFile)).rejects.toThrow(InvalidArgumentException);
      await expect(client.generateFromHtml(htmlFile)).rejects.toThrow('Invalid API response: missing data');

      if (existsSync(htmlFile)) {
        unlinkSync(htmlFile);
      }
    });

    it('handles API errors', async () => {
      const htmlFile = join(tmpdir(), `test-${Date.now()}.html`);
      writeFileSync(htmlFile, '<html><body>Test</body></html>');

      mockFetch.mockResolvedValueOnce({
        ok: false,
        status: 400,
        statusText: 'Bad Request',
        text: async () => 'Error message',
      });

      const client = GeneratePDFs.connect(apiToken);

      await expect(client.generateFromHtml(htmlFile)).rejects.toThrow();

      if (existsSync(htmlFile)) {
        unlinkSync(htmlFile);
      }
    });
  });

  describe('generateFromUrl', () => {
    it('throws exception for invalid URL', async () => {
      const client = GeneratePDFs.connect(apiToken);

      await expect(client.generateFromUrl('not-a-valid-url')).rejects.toThrow(InvalidArgumentException);
      await expect(client.generateFromUrl('not-a-valid-url')).rejects.toThrow('Invalid URL');
    });

    it('successfully generates PDF from URL', async () => {
      const mockResponse = {
        data: {
          id: 456,
          name: 'url-example.com-2024-01-01-12-00-00.pdf',
          status: 'pending',
          download_url: 'https://api.generatepdfs.com/pdfs/456/download/token',
          created_at: '2024-01-01T12:00:00.000000Z',
        },
      };

      mockFetch.mockResolvedValueOnce({
        ok: true,
        json: async () => mockResponse,
      });

      const client = GeneratePDFs.connect(apiToken);
      const pdf = await client.generateFromUrl('https://example.com');

      expect(pdf).toBeInstanceOf(Pdf);
      expect(pdf.getId()).toBe(456);
      expect(pdf.getName()).toBe('url-example.com-2024-01-01-12-00-00.pdf');

      const fetchCall = mockFetch.mock.calls[0];
      const body = JSON.parse(fetchCall[1]?.body);
      expect(body.url).toBe('https://example.com');
    });
  });

  describe('getPdf', () => {
    it('throws exception for invalid ID', async () => {
      const client = GeneratePDFs.connect(apiToken);

      await expect(client.getPdf(0)).rejects.toThrow(InvalidArgumentException);
      await expect(client.getPdf(0)).rejects.toThrow('Invalid PDF ID: 0');

      await expect(client.getPdf(-1)).rejects.toThrow(InvalidArgumentException);
      await expect(client.getPdf(-1)).rejects.toThrow('Invalid PDF ID: -1');
    });

    it('successfully retrieves PDF by ID', async () => {
      const mockResponse = {
        data: {
          id: 789,
          name: 'retrieved.pdf',
          status: 'completed',
          download_url: 'https://api.generatepdfs.com/pdfs/789/download/token',
          created_at: '2024-01-01T12:00:00.000000Z',
        },
      };

      mockFetch.mockResolvedValueOnce({
        ok: true,
        json: async () => mockResponse,
      });

      const client = GeneratePDFs.connect(apiToken);
      const pdf = await client.getPdf(789);

      expect(pdf).toBeInstanceOf(Pdf);
      expect(pdf.getId()).toBe(789);
      expect(pdf.getName()).toBe('retrieved.pdf');
      expect(pdf.getStatus()).toBe('completed');

      expect(mockFetch).toHaveBeenCalledWith(
        `${baseUrl}/pdfs/789`,
        expect.objectContaining({
          headers: expect.objectContaining({
            Authorization: `Bearer ${apiToken}`,
          }),
        })
      );
    });

    it('throws exception when API response is invalid', async () => {
      const mockResponse = {
        // Missing 'data' key
      };

      const mockResponseObj = {
        ok: true,
        json: async () => mockResponse,
      };

      mockFetch.mockResolvedValueOnce(mockResponseObj);
      mockFetch.mockResolvedValueOnce(mockResponseObj);

      const client = GeneratePDFs.connect(apiToken);

      await expect(client.getPdf(123)).rejects.toThrow(InvalidArgumentException);
      await expect(client.getPdf(123)).rejects.toThrow('Invalid API response: missing data');
    });
  });

  describe('downloadPdf', () => {
    it('successfully downloads PDF content', async () => {
      const downloadUrl = 'https://api.generatepdfs.com/pdfs/123/download/token';
      const pdfContent = '%PDF-1.4 fake pdf content';

      mockFetch.mockResolvedValueOnce({
        ok: true,
        arrayBuffer: async () => {
          const buffer = Buffer.from(pdfContent, 'utf-8');
          return buffer.buffer.slice(buffer.byteOffset, buffer.byteOffset + buffer.byteLength);
        },
      });

      const client = GeneratePDFs.connect(apiToken);
      const content = await client.downloadPdf(downloadUrl);

      expect(Buffer.isBuffer(content)).toBe(true);
      expect(content.toString('utf-8')).toBe(pdfContent);

      expect(mockFetch).toHaveBeenCalledWith(
        downloadUrl,
        expect.objectContaining({
          headers: expect.objectContaining({
            Authorization: `Bearer ${apiToken}`,
          }),
        })
      );
    });

    it('throws exception when download fails', async () => {
      const downloadUrl = 'https://api.generatepdfs.com/pdfs/123/download/token';

      mockFetch.mockResolvedValueOnce({
        ok: false,
        status: 404,
        statusText: 'Not Found',
      });

      const client = GeneratePDFs.connect(apiToken);

      await expect(client.downloadPdf(downloadUrl)).rejects.toThrow();
    });
  });
});
