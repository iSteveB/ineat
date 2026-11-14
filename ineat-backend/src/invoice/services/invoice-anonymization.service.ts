import { Injectable, Logger } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { execFile } from 'child_process';
import { mkdtemp, readFile, rm, writeFile } from 'fs/promises';
import { tmpdir } from 'os';
import { join, resolve } from 'path';
import { promisify } from 'util';

const execFileAsync = promisify(execFile);
const DEFAULT_TIMEOUT_MS = 120_000;

export class InvoiceAnonymizationError extends Error {
  constructor(
    message: string,
    readonly cause?: unknown,
  ) {
    super(message);
    this.name = 'InvoiceAnonymizationError';
  }
}

@Injectable()
export class InvoiceAnonymizationService {
  private readonly logger = new Logger(InvoiceAnonymizationService.name);

  constructor(private readonly config: ConfigService) {}

  async anonymizePdf(pdfBuffer: Buffer): Promise<Buffer> {
    this.assertPdf(pdfBuffer);

    const workingDirectory = await mkdtemp(join(tmpdir(), 'ineat-invoice-'));
    const inputPath = join(workingDirectory, 'input.pdf');
    const outputPath = join(workingDirectory, 'anonymized.pdf');
    const reportPath = join(workingDirectory, 'report.json');

    try {
      await writeFile(inputPath, pdfBuffer, { mode: 0o600 });

      const pythonExecutable =
        this.config.get<string>('INVOICE_ANONYMIZER_PYTHON') ?? 'python3';
      const scriptPath =
        this.config.get<string>('INVOICE_ANONYMIZER_SCRIPT') ??
        resolve(process.cwd(), 'scripts/anonymize-invoice.py');
      const timeout = this.readTimeout();

      const { stderr } = await execFileAsync(
        pythonExecutable,
        [scriptPath, inputPath, outputPath, reportPath],
        {
          timeout,
          maxBuffer: 1024 * 1024,
          env: {
            ...process.env,
            PYTHONUNBUFFERED: '1',
          },
        },
      );

      if (stderr.trim()) {
        this.logger.warn(`Invoice anonymizer warning: ${stderr.trim()}`);
      }

      const anonymizedPdf = await readFile(outputPath);
      this.assertPdf(anonymizedPdf);

      const report = JSON.parse(await readFile(reportPath, 'utf8')) as {
        pages?: number;
        redactions?: number;
      };
      this.logger.log(
        `Invoice anonymized (pages=${report.pages ?? 'unknown'}, redactions=${report.redactions ?? 'unknown'})`,
      );

      return anonymizedPdf;
    } catch (error) {
      throw new InvoiceAnonymizationError(
        "La facture n'a pas pu être anonymisée",
        error,
      );
    } finally {
      await rm(workingDirectory, { recursive: true, force: true });
    }
  }

  private assertPdf(buffer: Buffer): void {
    if (buffer.length < 5 || buffer.subarray(0, 5).toString() !== '%PDF-') {
      throw new InvoiceAnonymizationError('Le document produit est invalide');
    }
  }

  private readTimeout(): number {
    const configured = Number(
      this.config.get<string>('INVOICE_ANONYMIZER_TIMEOUT_MS'),
    );
    return Number.isFinite(configured) && configured > 0
      ? configured
      : DEFAULT_TIMEOUT_MS;
  }
}
