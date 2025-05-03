import {type AtLeastTuple} from '@augment-vir/common';

/** Add more extensions here to search for more files. */
const supportedAudioExtensions: AtLeastTuple<string, 1> = [
    'mp3',
];

const extensionGlob =
    supportedAudioExtensions.length > 2
        ? `.{${supportedAudioExtensions.join(',')}}`
        : `.${supportedAudioExtensions[0]}`;

export const searchGlob = `**/*${extensionGlob}`;
