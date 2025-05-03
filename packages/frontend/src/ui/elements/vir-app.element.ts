import {assert} from '@augment-vir/assert';
import {log, removePrefix} from '@augment-vir/common';
import {samplerService} from '@evir/common';
import {generateApi, mapServiceDevPort} from '@rest-vir/define-service';
import {classMap, css, defineElementNoInputs, html, listen, nothing, repeat} from 'element-vir';
import {
    LoaderAnimated24Icon,
    noNativeFormStyles,
    noNativeSpacing,
    ViraButton,
    ViraInput,
} from 'vira';

const pathCacheKey = 'chosen-path';
const indexCacheKey = 'last-index';
const api = mapServiceDevPort(samplerService).then((service) => {
    return generateApi(service);
});

export const VirApp = defineElementNoInputs({
    tagName: 'vir-app',
    styles: css`
        :host {
            display: flex;
            flex-direction: column;
            align-items: center;
            font-family: sans-serif;
            padding: 32px;
        }

        p {
            ${noNativeSpacing};
        }

        .path-submission {
            display: flex;
            flex-direction: column;
            align-items: center;
            gap: 8px;
        }

        .audio {
            display: flex;
            align-items: center;
            gap: 8px;

            & .like-button {
                ${noNativeFormStyles};
                cursor: pointer;
                display: flex;
                align-items: center;
                justify-content: center;
                text-align: center;
                border-radius: 8px;
                height: 30px;
                width: 40px;
                font-size: 1.2em;
                border: 1px solid #ccc;

                &.liked {
                    border: 1px solid red;
                }
            }
        }

        header {
            position: sticky;
            top: 0;
            background: white;
            padding: 8px;
            display: flex;
            align-content: center;
            flex-direction: column;
            align-items: flex-start;
            gap: 2px;
            z-index: 999;
        }
    `,
    state() {
        const startIndex: number = Number(globalThis.localStorage.getItem(indexCacheKey)) || 0;

        return {
            enteredPath: globalThis.localStorage.getItem(pathCacheKey) || '',
            loadedPath: '',
            isLoading: false,
            audioList: undefined as undefined | Readonly<Record<string, boolean>>,
            latestLoadedIndex: startIndex,
            currentIndex: startIndex,
            startIndex: startIndex,
            forceLoaded: [] as string[],
            isPlaying: undefined as boolean | undefined,
        };
    },
    render({state, updateState, host}) {
        function forceLoad(path: string) {
            updateState({
                forceLoaded: state.forceLoaded.slice(-20).concat(path),
            });
        }
        function pauseAll() {
            Array.from(host.shadowRoot.querySelectorAll('audio')).forEach((element) => {
                assert.instanceOf(element, HTMLAudioElement);
                element.pause();
            });
        }
        async function playAtIndexIfExists(index: number) {
            const existingElement = host.shadowRoot.querySelector(`[data-audio-index="${index}"]`);

            if (existingElement instanceof HTMLAudioElement) {
                existingElement.currentTime = 0;
                await existingElement.play();
            }
        }
        async function loadSongList() {
            const path = state.enteredPath;

            updateState({
                isLoading: true,
            });

            try {
                const output = await (
                    await api
                ).endpoints['/list-files'].fetch({
                    requestData: {
                        path: path,
                    },
                });

                if (!output.ok) {
                    throw new Error(output.data);
                }

                updateState({
                    loadedPath: path,
                    audioList: output.data,
                });
            } catch (error) {
                log.error(error);
                updateState({
                    audioList: {},
                });
            } finally {
                updateState({
                    isLoading: false,
                });
            }
        }
        if (state.currentIndex > state.latestLoadedIndex) {
            updateState({
                latestLoadedIndex: state.currentIndex,
            });
        }

        if (
            !state.isLoading &&
            state.audioList == undefined &&
            globalThis.localStorage.getItem(pathCacheKey) &&
            !state.loadedPath
        ) {
            void loadSongList();
        }

        const audioCount: number = state.audioList ? Object.keys(state.audioList).length : 0;
        const currentAudio = state.audioList
            ? Object.entries(state.audioList)
                  .slice(0, Math.max(state.latestLoadedIndex, state.currentIndex) + 1)
                  .reverse()
            : [];

        const audioListTemplates =
            state.audioList == undefined
                ? nothing
                : audioCount === 0
                  ? html`
                        <p class="faint">No audio files found.</p>
                    `
                  : html`
                        <header>
                            <${ViraButton.assign({
                                text: state.isPlaying ? 'Pause' : 'Resume',
                            })}
                                ${listen('click', () => {
                                    pauseAll();
                                    if (!state.isPlaying) {
                                        void playAtIndexIfExists(state.currentIndex);
                                    }

                                    updateState({
                                        isPlaying: !state.isPlaying,
                                    });
                                })}
                            ></${ViraButton}>
                            <${ViraButton.assign({
                                text: 'Next',
                            })}
                                ${listen('click', () => {
                                    pauseAll();

                                    const newIndex = state.currentIndex + 1;

                                    void playAtIndexIfExists(newIndex);

                                    updateState({
                                        currentIndex: newIndex,
                                    });
                                })}
                            ></${ViraButton}>
                            <p class="list-progress">
                                File ${state.latestLoadedIndex + 1} / ${audioCount}
                            </p>
                        </header>
                        ${repeat(
                            currentAudio,
                            ([path]) => path,
                            (
                                [
                                    path,
                                    isLiked,
                                ],
                                index,
                            ) => {
                                const url = `http://localhost:4651/audio/${removePrefix({value: path, prefix: '/'})}`;

                                const fileName = path.split('/').slice(-1)[0];
                                const originalIndex = currentAudio.length - 1 - index;

                                const isLatest = originalIndex === state.currentIndex;
                                const isAlreadyChecked = originalIndex < state.startIndex;
                                const forceLoaded = state.forceLoaded.includes(path);
                                const outOfRange = originalIndex < state.currentIndex - 20;

                                if (
                                    isAlreadyChecked &&
                                    !forceLoaded &&
                                    state.currentIndex === originalIndex
                                ) {
                                    forceLoad(path);
                                }

                                return html`
                                    <div class="file">
                                        <p>${fileName}</p>
                                        <div class="audio">
                                            ${(isAlreadyChecked || outOfRange) && !forceLoaded
                                                ? html`
                                                      <button
                                                          ${listen('click', () => {
                                                              forceLoad(path);
                                                          })}
                                                      >
                                                          load
                                                      </button>
                                                  `
                                                : html`
                                                      <audio
                                                          data-audio-index=${originalIndex}
                                                          ?autoplay=${isLatest}
                                                          ${listen('ended', () => {
                                                              if (state.isPlaying === undefined) {
                                                                  updateState({isPlaying: true});
                                                              }

                                                              if (
                                                                  !isLatest ||
                                                                  state.isPlaying === false ||
                                                                  !state.audioList ||
                                                                  state.currentIndex >=
                                                                      Object.keys(state.audioList)
                                                                          .length -
                                                                          1
                                                              ) {
                                                                  return;
                                                              }

                                                              globalThis.localStorage.setItem(
                                                                  indexCacheKey,
                                                                  String(
                                                                      Math.max(
                                                                          state.currentIndex,
                                                                          state.latestLoadedIndex,
                                                                      ),
                                                                  ),
                                                              );

                                                              const newIndex =
                                                                  state.currentIndex + 1;

                                                              void playAtIndexIfExists(newIndex);

                                                              updateState({
                                                                  currentIndex: newIndex,
                                                              });
                                                          })}
                                                          controls
                                                          crossorigin="anonymous"
                                                          src=${url}
                                                      ></audio>
                                                  `}
                                            <button
                                                class="like-button ${classMap({
                                                    liked: isLiked,
                                                })}"
                                                ${listen('click', async () => {
                                                    updateState({
                                                        isPlaying: false,
                                                        audioList: {
                                                            ...state.audioList,
                                                            [path]: !isLiked,
                                                        },
                                                    });

                                                    await (
                                                        await api
                                                    ).endpoints['/like'].fetch({
                                                        requestData: {
                                                            path,
                                                            value: !isLiked,
                                                        },
                                                    });
                                                })}
                                            >
                                                ${isLiked ? '❤️' : '🤍'}
                                            </button>
                                            <button
                                                ${listen('click', () => {
                                                    pauseAll();
                                                    void playAtIndexIfExists(originalIndex);
                                                    updateState({
                                                        currentIndex: originalIndex,
                                                        isPlaying: true,
                                                    });
                                                })}
                                            >
                                                resume
                                            </button>
                                        </div>
                                    </div>
                                `;
                            },
                        )}
                    `;

        return html`
            <section class="path-submission">
                <label>
                    <p>Enter a path for audio files:</p>
                    <${ViraInput.assign({
                        value: state.enteredPath,
                        disableBrowserHelps: true,
                        disabled: state.isLoading,
                    })}
                        ${listen(ViraInput.events.valueChange, (event) => {
                            const newPath = event.detail;
                            globalThis.localStorage.setItem(pathCacheKey, newPath);
                            updateState({
                                enteredPath: newPath,
                            });
                        })}
                    ></${ViraInput}>
                </label>
                <${ViraButton.assign({
                    text: 'Find Audio Files',
                    icon: state.isLoading ? LoaderAnimated24Icon : undefined,
                    disabled: state.loadedPath === state.enteredPath || state.isLoading,
                })}
                    ${listen('click', async () => {
                        globalThis.localStorage.removeItem(indexCacheKey);
                        updateState({
                            currentIndex: 0,
                            startIndex: 0,
                        });
                        await loadSongList();
                    })}
                ></${ViraButton}>
                <section class="all-audio">${audioListTemplates}</section>
            </section>
        `;
    },
});
