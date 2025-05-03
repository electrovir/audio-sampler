import {AnyOrigin, defineService, HttpMethod, type RestVirApi} from '@rest-vir/define-service';
import {exact, indexedKeys, unknownShape} from 'object-shape-tester';
import {parseUrl} from 'url-vir';

export type TemplateService = typeof samplerService;
export type TemplateServiceApi = RestVirApi<TemplateService>;

export const samplerService = defineService({
    serviceName: 'sampler-service',
    requiredClientOrigin(origin: string | undefined) {
        return !!origin && parseUrl(origin).hostname === 'localhost';
    },
    serviceOrigin: 'http://localhost:4651',
    endpoints: {
        /** This endpoint should always be first so that it is used by the dev port scanner. */
        '/health': {
            methods: {
                [HttpMethod.Get]: true,
            },
            requestDataShape: undefined,
            responseDataShape: exact('ok'),
            requiredClientOrigin: AnyOrigin,
        },
        /** Same as `/health`. */
        '/': {
            methods: {
                [HttpMethod.Get]: true,
            },
            requestDataShape: undefined,
            responseDataShape: exact('ok'),
            requiredClientOrigin: AnyOrigin,
        },
        '/list-files': {
            methods: {
                [HttpMethod.Post]: true,
            },
            requestDataShape: {
                path: '',
            },
            responseDataShape: indexedKeys({
                keys: '',
                values: false,
                required: true,
            }),
        },
        /** Like an audio sample */
        '/like': {
            methods: {
                [HttpMethod.Post]: true,
            },
            requestDataShape: {
                /**
                 * - `true`: set the audio as liked
                 * - `false`: unset the audio as liked
                 */
                value: true,
                path: '',
            },
            responseDataShape: undefined,
        },
        '/audio/*': {
            methods: {
                [HttpMethod.Get]: true,
            },
            requestDataShape: undefined,
            responseDataShape: unknownShape(),
        },
    },
});
