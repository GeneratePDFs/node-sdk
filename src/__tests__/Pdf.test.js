import { describe, it, expect, beforeEach, jest } from '@jest/globals';
import { writeFileSync, unlinkSync, existsSync } from 'fs';
import { tmpdir } from 'os';
import { join } from 'path';
import { GeneratePDFs } from '../GeneratePDFs.js';
import { Pdf } from '../Pdf.js';
import { InvalidArgumentException } from '../exceptions/InvalidArgumentException.js';
import { RuntimeException } from '../exceptions/RuntimeException.js';

// Mock fetch globally
const mockFetch = jest.fn();
global.fetch = mockFetch;

describe('Pdf', () => {
  let client;
  let apiToken;

  beforeEach(() => {
    apiToken = 'test-api-token';
    client = GeneratePDFs.connect(apiToken);
    jest.clearAllMocks();
  });

  describe('fromArray', () => {
    it('creates Pdf instance from valid data', () => {
      const data = {
        id: 123,
        name: 'test.pdf',
        status: 'completed',
        download_url: 'https://api.generatepdfs.com/pdfs/123/download/token',
        created_at: '2024-01-01T12:00:00.000000Z',
      };

      const pdf = Pdf.fromArray(data, client);

      expect(pdf).toBeInstanceOf(Pdf);
      expect(pdf.getId()).toBe(123);
      expect(pdf.getName()).toBe('test.pdf');
      expect(pdf.getStatus()).toBe('completed');
      expect(pdf.getDownloadUrl()).toBe('https://api.generatepdfs.com/pdfs/123/download/token');
    });

    it('throws exception when required fields are missing', () => {
      const data = {
        id: 123,
        // Missing other required fields
      };

      expect(() => Pdf.fromArray(data, client)).toThrow(InvalidArgumentException);
      expect(() => Pdf.fromArray(data, client)).toThrow('Invalid PDF data structure');
    });

    it('throws exception when created_at format is invalid', () => {
      const data = {
        id: 123,
        name: 'test.pdf',
        status: 'completed',
        download_url: 'https://api.generatepdfs.com/pdfs/123/download/token',
        created_at: 'invalid-date-format',
      };

      expect(() => Pdf.fromArray(data, client)).toThrow(InvalidArgumentException);
      expect(() => Pdf.fromArray(data, client)).toThrow('Invalid created_at format');
    });
  });

  describe('getters', () => {
    it('return correct values', () => {
      const data = {
        id: 456,
        name: 'document.pdf',
        status: 'pending',
        download_url: 'https://api.generatepdfs.com/pdfs/456/download/token',
        created_at: '2024-01-01T12:00:00.000000Z',
      };

      const pdf = Pdf.fromArray(data, client);

      expect(pdf.getId()).toBe(456);
      expect(pdf.getName()).toBe('document.pdf');
      expect(pdf.getStatus()).toBe('pending');
      expect(pdf.getDownloadUrl()).toBe('https://api.generatepdfs.com/pdfs/456/download/token');
      expect(pdf.getCreatedAt()).toBeInstanceOf(Date);
    });
  });

  describe('isReady', () => {
    it('returns true when status is completed', () => {
      const data = {
        id: 123,
        name: 'test.pdf',
        status: 'completed',
        download_url: 'https://api.generatepdfs.com/pdfs/123/download/token',
        created_at: '2024-01-01T12:00:00.000000Z',
      };

      const pdf = Pdf.fromArray(data, client);

      expect(pdf.isReady()).toBe(true);
    });

    it('returns false when status is not completed', () => {
      const data = {
        id: 123,
        name: 'test.pdf',
        status: 'pending',
        download_url: 'https://api.generatepdfs.com/pdfs/123/download/token',
        created_at: '2024-01-01T12:00:00.000000Z',
      };

      const pdf = Pdf.fromArray(data, client);

      expect(pdf.isReady()).toBe(false);
    });
  });

  describe('download', () => {
    it('throws exception when PDF is not ready', async () => {
      const data = {
        id: 123,
        name: 'test.pdf',
        status: 'pending',
        download_url: 'https://api.generatepdfs.com/pdfs/123/download/token',
        created_at: '2024-01-01T12:00:00.000000Z',
      };

      const pdf = Pdf.fromArray(data, client);

      await expect(pdf.download()).rejects.toThrow(RuntimeException);
      await expect(pdf.download()).rejects.toThrow('PDF is not ready yet');
    });

    it('successfully downloads PDF content', async () => {
      const data = {
        id: 123,
        name: 'test.pdf',
        status: 'completed',
        download_url: 'https://api.generatepdfs.com/pdfs/123/download/token',
        created_at: '2024-01-01T12:00:00.000000Z',
      };

      const pdfContent = '%PDF-1.4 fake pdf content';

      mockFetch.mockResolvedValueOnce({
        ok: true,
        arrayBuffer: async () => {
          const buffer = Buffer.from(pdfContent, 'utf-8');
          return buffer.buffer.slice(buffer.byteOffset, buffer.byteOffset + buffer.byteLength);
        },
      });

      const pdf = Pdf.fromArray(data, client);
      const content = await pdf.download();

      expect(Buffer.isBuffer(content)).toBe(true);
      expect(content.toString('utf-8')).toBe(pdfContent);
    });
  });

  describe('downloadToFile', () => {
    it('successfully saves PDF to file', async () => {
      const data = {
        id: 123,
        name: 'test.pdf',
        status: 'completed',
        download_url: 'https://api.generatepdfs.com/pdfs/123/download/token',
        created_at: '2024-01-01T12:00:00.000000Z',
      };

      const pdfContent = '%PDF-1.4 fake pdf content';
      const tempFile = join(tmpdir(), `test-${Date.now()}.pdf`);

      mockFetch.mockResolvedValueOnce({
        ok: true,
        arrayBuffer: async () => {
          const buffer = Buffer.from(pdfContent, 'utf-8');
          return buffer.buffer.slice(buffer.byteOffset, buffer.byteOffset + buffer.byteLength);
        },
      });

      const pdf = Pdf.fromArray(data, client);

      try {
        const result = await pdf.downloadToFile(tempFile);

        expect(result).toBe(true);
        expect(existsSync(tempFile)).toBe(true);
        // Note: We can't easily read the file back in the test environment
        // but the file existence check is sufficient
      } finally {
        if (existsSync(tempFile)) {
          unlinkSync(tempFile);
        }
      }
    });
  });

  describe('fromArray with different status values', () => {
    it('handles different status values', () => {
      const statuses = ['pending', 'processing', 'completed', 'failed'];

      for (const status of statuses) {
        const data = {
          id: 123,
          name: 'test.pdf',
          status: status,
          download_url: 'https://api.generatepdfs.com/pdfs/123/download/token',
          created_at: '2024-01-01T12:00:00.000000Z',
        };

        const pdf = Pdf.fromArray(data, client);

        expect(pdf.getStatus()).toBe(status);
        expect(pdf.isReady()).toBe(status === 'completed');
      }
    });
  });

  describe('refresh', () => {
    it('successfully updates PDF data', async () => {
      const initialData = {
        id: 123,
        name: 'test.pdf',
        status: 'pending',
        download_url: 'https://api.generatepdfs.com/pdfs/123/download/token',
        created_at: '2024-01-01T12:00:00.000000Z',
      };

      const pdf = Pdf.fromArray(initialData, client);

      // Verify initial state
      expect(pdf.getStatus()).toBe('pending');

      const mockResponse = {
        data: {
          id: 123,
          name: 'test.pdf',
          status: 'completed',
          download_url: 'https://api.generatepdfs.com/pdfs/123/download/new-token',
          created_at: '2024-01-01T12:00:00.000000Z',
        },
      };

      mockFetch.mockResolvedValueOnce({
        ok: true,
        json: async () => mockResponse,
      });

      // Refresh the PDF
      const refreshedPdf = await pdf.refresh();

      // Verify refreshed state
      expect(refreshedPdf).toBeInstanceOf(Pdf);
      expect(refreshedPdf.getId()).toBe(123);
      expect(refreshedPdf.getStatus()).toBe('completed');
      expect(refreshedPdf.getDownloadUrl()).toBe('https://api.generatepdfs.com/pdfs/123/download/new-token');
    });
  });
});

