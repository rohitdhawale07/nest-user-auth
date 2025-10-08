import { Module } from '@nestjs/common';
import { ClientsModule, Transport } from '@nestjs/microservices';

@Module({
    imports: [
        ClientsModule.register([
            {
                name: 'CACHE_SERVICE',
                transport: Transport.TCP,
                options: {
                    host: '127.0.0.1',
                    port: 4001, // same as your microservice port
                },
            },
        ]),
    ],
    exports: [ClientsModule], // 👈 makes CACHE_SERVICE available elsewhere
})
export class CacheClientModule { }
