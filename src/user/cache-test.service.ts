import { Injectable, Inject } from '@nestjs/common';
import { ClientProxy } from '@nestjs/microservices';
import { firstValueFrom } from 'rxjs';

@Injectable()
export class CacheClientService {
    constructor(@Inject('CACHE_SERVICE') private readonly cacheClient: ClientProxy) { }

    async setCache(key: string, value: any) {
        const response = await firstValueFrom(
            this.cacheClient.send({ cmd: 'set_cache' }, { key, value }),
        );
        return response;
    }

    async getCache(key: string) {
        const response = await firstValueFrom(this.cacheClient.send({ cmd: 'get_cache' }, key));
        return response;
    }
}
