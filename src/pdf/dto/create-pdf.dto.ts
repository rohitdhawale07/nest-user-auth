import { IsFile, MaxFileSize, HasMimeType } from 'nestjs-form-data';

export class CreatePdfDto {
    // @IsFile()
    // @MaxFileSize(10 * 1024 * 1024) // 10 MB limit
    // // @HasMimeType(['application/pdf'])
    // file: any;
}
