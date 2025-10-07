import { BadRequestException } from '@nestjs/common';
import { diskStorage } from 'multer';
import { extname } from 'path';

export const multerConfig = {
    storage: diskStorage({
        destination: './uploads', // save in uploads folder
        filename: (req, file, callback) => {
            // generate unique file name
            const uniqueSuffix = Date.now() + '-' + Math.round(Math.random() * 1e9);
            const ext = extname(file.originalname);
            callback(null, `profile-${uniqueSuffix}${ext}`);
        },
    }),

    // optional: file size limit (e.g., 2MB)
    // limits: {
    //     fileSize: 2 * 1024 * 1024,
    // },

    // validate file types
    fileFilter: (req: any, file: Express.Multer.File, callback: any) => {
        if (!file.mimetype.match(/\/(jpg|jpeg|png)$/)) {
            return callback(
                new BadRequestException('Only image files (JPG, JPEG, PNG) are allowed!'),
                false,
            );
        }
        callback(null, true);
    },
};
