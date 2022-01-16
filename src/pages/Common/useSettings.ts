import {createChromeStorageStateHookLocal} from 'use-chrome-storage';

export const INITIAL_SETTINGS = {
    POSITIVE_SEARCH_TERMS: [
        { term: 'clean', exclude: { before: ['not', 'isn\'t'], after: ['ing'] }},
        { term: 'no sex', exclude: { before: [], after: [] }},
        { term: 'young adult', exclude: { before: [], after: [] }}
    ],
    NEGATIVE_SEARCH_TERMS: [
        { term: 'sex', exclude: { before: ['no'], after: ['ist'] }},
        { term: 'adult', exclude: { before: ['young', 'new'], after: ['hood', 'ing']}},
        { term: 'erotic', exclude: { before: ['not', 'isn\'t'], after: []}}
    ],
    SNIPPET_HALF_LENGTH: 65,
    ENABLED: true,
}

export const useSettings = createChromeStorageStateHookLocal('cleanreads_settings', INITIAL_SETTINGS);