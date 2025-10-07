// import { BadRequestException, Injectable } from '@nestjs/common';
// import { ConfigService } from '@nestjs/config';
// import { diskStorage } from 'multer';
// import multerS3 from 'multer-s3';
// import { S3Client } from '@aws-sdk/client-s3';
// import { extname } from 'path';

// @Injectable()
// export class FileUploader {
//     private s3: S3Client;
//     private isLocal: boolean;

//     constructor(private readonly configService: ConfigService) {
//         const nodeEnv = this.configService.get<string>('NODE_ENV') || 'local';
//         this.isLocal = nodeEnv === 'local';

//         // Initialize S3 only if not local
//         if (!this.isLocal) {
//             this.s3 = new S3Client({
//                 region: this.configService.get<string>('AWS_REGION'),
//                 credentials: {
//                     accessKeyId: this.configService.get<string>('AWS_ACCESS_KEY_ID'),
//                     secretAccessKey: this.configService.get<string>('AWS_SECRET_ACCESS_KEY'),
//                 },
//             });
//         }
//     }

//     /** Local disk storage (for dev) */
//     private localStorage() {
//         return diskStorage({
//             destination: './uploads',
//             filename: (req, file, callback) => {
//                 const uniqueSuffix = Date.now() + '-' + Math.round(Math.random() * 1e9);
//                 const ext = extname(file.originalname);
//                 callback(null, `profile-${uniqueSuffix}${ext}`);
//             },
//         });
//     }

//     /** S3 storage (for prod) */
//     private s3Storage() {
//         return multerS3({
//             s3: this.s3,
//             bucket: this.configService.get<string>('AWS_S3_BUCKET'),
//             acl: 'public-read',
//             key: (req, file, callback) => {
//                 const uniqueSuffix = Date.now() + '-' + Math.round(Math.random() * 1e9);
//                 const ext = extname(file.originalname);
//                 callback(null, `profile-images/profile-${uniqueSuffix}${ext}`);
//             },
//         });
//     }

//     /** File type validation */
//     private imageFileFilter(req: any, file: Express.Multer.File, callback: any) {
//         if (!file.mimetype.match(/\/(jpg|jpeg|png)$/)) {
//             return callback(
//                 new BadRequestException('Only image files (JPG, JPEG, PNG) are allowed!'),
//                 false,
//             );
//         }
//         callback(null, true);
//     }

//     /** Get dynamic Multer config */
//     getMulterConfig() {
//         return {
//             storage: this.isLocal ? this.localStorage() : this.s3Storage(),
//             fileFilter: this.imageFileFilter,
//             limits: { fileSize: 2 * 1024 * 1024 }, // 2MB
//         };
//     }
// }
