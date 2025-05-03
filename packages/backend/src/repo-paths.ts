import {writeJsonFile} from '@augment-vir/node';
import {existsSync} from 'node:fs';
import {mkdir} from 'node:fs/promises';
import {join, resolve} from 'node:path';

export const monoRepoDirPath = resolve(import.meta.dirname, '..', '..', '..');
export const notCommittedDirPath = join(monoRepoDirPath, '.not-committed');

await mkdir(notCommittedDirPath, {recursive: true});

export const currentPathFilePath = join(notCommittedDirPath, 'path.txt');
export const likeStatsFilePath = join(notCommittedDirPath, 'liked.json');

if (!existsSync(likeStatsFilePath)) {
    await writeJsonFile(likeStatsFilePath, []);
}
