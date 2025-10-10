import { BadRequestException, Injectable, Logger } from '@nestjs/common';
import { CreatePdfDto } from './dto/create-pdf.dto';
import { UpdatePdfDto } from './dto/update-pdf.dto';

// ✅ Works with pdf-parse@1.1.1
// eslint-disable-next-line @typescript-eslint/no-var-requires
const pdfParse = require('pdf-parse');

@Injectable()
export class PdfService {
  private readonly logger = new Logger(PdfService.name);

  async create(file: Express.Multer.File, dto?: CreatePdfDto) {
    this.logger.debug('Starting PDF processing...');

    if (!file) throw new BadRequestException('No file provided');
    if (file.mimetype !== 'application/pdf') {
      throw new BadRequestException('Only PDF files are allowed');
    }

    try {
      this.logger.debug(`Parsing PDF: ${file.originalname}`);
      const data = await pdfParse(file.buffer);

      this.logger.debug(`PDF parsed successfully with ${data.numpages} pages`);

      return {
        fileName: file.originalname,
        pageCount: data.numpages,
        info: data.info,
        textSnippet: data.text.substring(0, 300),
      };
    } catch (err) {
      this.logger.error(`Error parsing PDF: ${err.message}`, err.stack);
      throw new BadRequestException('Failed to process PDF');
    }
  }

  findAll() {
    return `This action returns all pdf`;
  }

  findOne(id: number) {
    return `This action returns a #${id} pdf`;
  }

  update(id: number, updatePdfDto: UpdatePdfDto) {
    return `This action updates a #${id} pdf`;
  }

  remove(id: number) {
    return `This action removes a #${id} pdf`;
  }
}
