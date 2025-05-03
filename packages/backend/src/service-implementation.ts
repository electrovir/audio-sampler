import {arrayToObject} from '@augment-vir/common';
import {readJsonFile, writeJsonFile} from '@augment-vir/node';
import {samplerService} from '@evir/common';
import {HttpStatus, implementService} from '@rest-vir/implement-service';
import {createReadStream, existsSync} from 'node:fs';
import {glob, readFile, stat, writeFile} from 'node:fs/promises';
import {homedir} from 'node:os';
import {basename, join, resolve} from 'node:path';
import {searchGlob} from './extensions.js';
import {currentPathFilePath, likeStatsFilePath} from './repo-paths.js';

function resolveTilde(filePath: string) {
    if (!filePath || typeof filePath !== 'string') {
        return '';
    }

    if (filePath[0] === '~') {
        return join(homedir(), filePath.slice(1));
    }
    return filePath;
}

export const samplerServiceImplementation = implementService({
    service: samplerService,
})({
    endpoints: {
        '/health'() {
            return {
                statusCode: HttpStatus.Ok,
                responseData: 'ok',
            };
        },
        '/'() {
            return {
                statusCode: HttpStatus.Ok,
                responseData: 'ok',
            };
        },
        async '/list-files'({requestData}) {
            const resolvedPath = resolve(resolveTilde(requestData.path));

            await writeFile(currentPathFilePath, resolvedPath);

            const paths = (
                await Array.fromAsync(
                    glob(searchGlob, {
                        cwd: resolvedPath,
                    }),
                )
            ).filter((path) => !basename(path).toLowerCase().endsWith('preview.mp3'));

            const currentLikes = ((await readJsonFile(likeStatsFilePath)) || []) as string[];

            return {
                statusCode: HttpStatus.Ok,
                responseData: arrayToObject(paths, (path) => {
                    return {
                        key: path,
                        value: currentLikes.includes(path),
                    };
                }) as Record<string, boolean>,
            };
        },
        async '/audio/*'({request}) {
            const audioPath = request.url.replace(/^\/audio\//, '');
            const startPath = String(await readFile(currentPathFilePath));

            const resolvedPath = resolve(resolveTilde(startPath));
            const filePath = join(resolvedPath, audioPath);

            if (!existsSync(filePath)) {
                return {
                    statusCode: HttpStatus.NotFound,
                };
            }

            return {
                statusCode: HttpStatus.Ok,
                responseData: createReadStream(filePath),
                dataType: 'audio/mpeg',
                headers: {
                    'Content-Disposition': `inline; filename="${basename(filePath)}"`,
                    'Content-Length': (await stat(filePath)).size,
                },
            };
        },
        async '/like'({requestData}) {
            const currentLikes = (await readJsonFile(likeStatsFilePath)) as string[];

            const included = currentLikes.includes(requestData.path);

            if (included && !requestData.value) {
                await writeJsonFile(
                    likeStatsFilePath,
                    currentLikes.filter((path) => path !== requestData.path),
                );
            } else if (!included && requestData.value) {
                await writeJsonFile(likeStatsFilePath, currentLikes.concat(requestData.path));
            }

            return {
                statusCode: HttpStatus.Ok,
            };
        },
    },
});
