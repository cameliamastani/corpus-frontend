import { getStoreBuilder } from 'vuex-typex';

import { getHistoryEntryFromState } from '@/utils';

import { RootState, SlimRootState } from '@/store';
import { SubmittedParameters, ModuleRootState as FormModuleRootState } from '@/store/form';
import { NormalizedIndex } from '@/types/apptypes';
import { debugLog } from '@/utils/debug';

/** Remove type U from union T */
type Remove<T, U> = T extends U ? never : T;

const version = 2;

interface HistoryEntry extends SubmittedParameters {
	readonly groupBy: string[];
	readonly groupByAdvanced: string[];
	readonly viewedResults: Remove<RootState['viewedResults'], null>;
	readonly caseSensitiveGroupBy: boolean;

	/** String representations of the query, for simpler displaying of the entry in UI */
	readonly displayValues: {
		readonly filters: string;
		readonly pattern: string;
	};

	readonly hash: number;
}

type ModuleRootState = HistoryEntry[];

type LocalStorageState = {
	indexLastModified: string;
	version: number;
	history: ModuleRootState;
};

const initialState: ModuleRootState = [];
const b = getStoreBuilder<RootState>().module<ModuleRootState>('history', initialState);
let index: NormalizedIndex;

const getState = b.state();

const get = {
	// Nothing yet
};

const internalActions = {
	replace: b.commit((state, payload: ModuleRootState) => {
		state.splice(0, state.length, ...payload);
	}, 'replace')
};

const actions = {
	addEntry: b.commit((state, payload: SlimRootState) => {
		const entry = getHistoryEntryFromState(payload);

		const i = state.findIndex(v => v.hash === entry.hash);
		if (i !== -1) {
			state.splice(i, 1);
		}
		// push entry
		state.unshift(entry);
		// pop entries older than 40
		state.splice(40);
		saveToLocalStorage(state);
	}, 'addEntry'),
	removeEntry: b.commit((state, i: number) => {
		state.splice(i, 1);
	}, 'removeEntry')
};

const init = (corpus: NormalizedIndex) => {
	index = corpus;
	readFromLocalStorage();
};

const readFromLocalStorage = () => {
	if (!window.localStorage) {
		return null;
	}

	const key = `cf/history/${index.id}`;
	const historyJson = window.localStorage.getItem(key);
	if (historyJson == null) {
		return null;
	}

	try {
		const state: LocalStorageState = JSON.parse(historyJson);
		if (state.indexLastModified !== index.timeModified) {
			// It could be the available annotations/metadata in the index have changed since saving the searches
			// We can't load this.
			debugLog('Index was modified in between saving and loading history, clearing history.');
			window.localStorage.removeItem(key);
			return null;
		}
		if (state.version !== version) {
			debugLog(`History out of date: read version ${state.version}, current version ${version}, clearing history.`);
			window.localStorage.removeItem(key);
			return null;
		}

		internalActions.replace(state.history);
	} catch (e) {
		debugLog('Could not read search history from localstorage', e);
	}
	return null;
};

const saveToLocalStorage = (state: ModuleRootState) => {
	if (!window.localStorage) {
		return;
	}

	const key = `cf/history/${index.id}`;
	const entry: LocalStorageState = {
		version,
		history: state,
		indexLastModified: index.timeModified
	};

	window.localStorage.setItem(key, JSON.stringify(entry));
};

export {
	ModuleRootState,

	getState,
	get,
	actions,
	init,

	HistoryEntry
};
