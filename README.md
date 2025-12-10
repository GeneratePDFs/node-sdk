# GeneratePDFs Node.js SDK

Node.js SDK for the [GeneratePDFs.com](https://generatepdfs.com) API, your go-to place for HTML to PDF.

Upload your HTML files, along with any CSS files and images to generate a PDF. Alternatively provide a URL to generate a PDF from it's contents.

## Installation

```bash
npm install generatepdfs/node-sdk
```

## Get your API Token

Sign up for an account on [GeneratePDFs.com](https://generatepdfs.com) and head to the API Tokens section and create a new token.

## Usage

### Basic Setup

```javascript
import { GeneratePDFs } from 'generatepdfs/node-sdk';

const client = GeneratePDFs.connect('YOUR_API_TOKEN');
```

### Generate PDF from HTML File

```javascript
import { GeneratePDFs } from 'generatepdfs/node-sdk';

// Simple HTML file
const pdf = await client.generateFromHtml('/path/to/file.html');

// HTML file with CSS
const pdf = await client.generateFromHtml(
  '/path/to/file.html',
  '/path/to/file.css'
);

// HTML file with CSS and images
const pdf = await client.generateFromHtml(
  '/path/to/file.html',
  '/path/to/file.css',
  [
    {
      name: 'logo.png',
      path: '/path/to/logo.png',
      mimeType: 'image/png' // Optional, will be auto-detected
    },
    {
      name: 'photo.jpg',
      path: '/path/to/photo.jpg'
    }
  ]
);
```

### Generate PDF from URL

```javascript
const pdf = await client.generateFromUrl('https://example.com');
```

### Get PDF by ID

```javascript
// Retrieve a PDF by its ID
const pdf = await client.getPdf(123);
```

### Working with PDF Objects

The SDK returns `Pdf` objects that provide easy access to PDF information and downloading:

```javascript
// Access PDF properties
const pdfId = pdf.getId();
const pdfName = pdf.getName();
const status = pdf.getStatus();
const downloadUrl = pdf.getDownloadUrl();
const createdAt = pdf.getCreatedAt();

// Check if PDF is ready
if (pdf.isReady()) {
  // Download PDF content as Buffer
  const pdfContent = await pdf.download();
  
  // Or save directly to file
  await pdf.downloadToFile('/path/to/save/output.pdf');
}

// Refresh PDF data from the API (useful for checking status updates)
const refreshedPdf = await pdf.refresh();
if (refreshedPdf.isReady()) {
  const pdfContent = await refreshedPdf.download();
}
```

### Client Methods

- `generateFromHtml(htmlPath: string, cssPath?: string | null, images?: ImageInput[]): Promise<Pdf>` - Generate a PDF from HTML file(s)
- `generateFromUrl(url: string): Promise<Pdf>` - Generate a PDF from a URL
- `getPdf(id: number): Promise<Pdf>` - Retrieve a PDF by its ID
- `downloadPdf(downloadUrl: string): Promise<Buffer>` - Download PDF binary content from a download URL

### PDF Object Methods

- `getId(): number` - Get the PDF ID
- `getName(): string` - Get the PDF filename
- `getStatus(): string` - Get the current status (pending, processing, completed, failed)
- `getDownloadUrl(): string` - Get the download URL
- `getCreatedAt(): Date` - Get the creation date
- `isReady(): boolean` - Check if the PDF is ready for download
- `download(): Promise<Buffer>` - Download and return PDF binary content
- `downloadToFile(filePath: string): Promise<boolean>` - Download and save PDF to a file
- `refresh(): Promise<Pdf>` - Refresh PDF data from the API and return a new Pdf instance with updated information

## Requirements

- Node.js 18.0 or higher

## Testing

To run the test suite, execute:

```bash
npm test
```

To run tests with coverage:

```bash
npm run test:coverage
```

## Contributing

Contributions and suggestions are **welcome** and will be fully **credited**.

We accept contributions via Pull Requests on [GitHub](https://github.com/GeneratePDFs/node-sdk).

### Pull Requests

- **Follow TypeScript best practices** - Use proper types, avoid `any`, use explicit return types
- **Add tests!** - Your patch won't be accepted if it doesn't have tests.
- **Document any change in behaviour** - Make sure the README / CHANGELOG and any other relevant documentation are kept up-to-date.
- **Consider our release cycle** - We try to follow semver. Randomly breaking public APIs is not an option.
- **Create topic branches** - Don't ask us to pull from your master branch.
- **One pull request per feature** - If you want to do more than one thing, send multiple pull requests.
- **Send coherent history** - Make sure each individual commit in your pull request is meaningful. If you had to make multiple intermediate commits while developing, please squash them before submitting.

## Changelog

See [CHANGELOG.md](CHANGELOG.md) for a history of changes.

## License

This project is licensed under the MIT License. See the [LICENSE](LICENSE) file for details.


