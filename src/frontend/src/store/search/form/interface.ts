/**
 * Contains some state about the main search form.
 * Because there are different ways to generate a query (builder, direct text editing, n-grams, etc)
 * we need to track what the user is actually doing when a query is submitted,
 * so that we know how to construct the actual query that's sent to blacklab.
 */
import Vue from 'vue';
import {getStoreBuilder} from 'vuex-typex';

import {RootState} from '@/store/search/';
import {ModuleRootState as PatternModuleRootState} from '@/store/search/form/patterns';
import {ModuleRootState as ExploreModuleRootState} from '@/store/search/form/explore';
import {ViewId as ResultViewId} from '@/store/search/results';

type ModuleRootState = {
	form: 'search'|'explore';
	patternMode: keyof PatternModuleRootState;
	exploreMode: keyof ExploreModuleRootState;
	viewedResults: null|ResultViewId;

	groupDisplayMode: { [K in ResultViewId]?: string; }
};

const defaults: ModuleRootState = {
	form: 'search',
	patternMode: 'simple',
	exploreMode: 'ngram',
	viewedResults: null,
	groupDisplayMode: {}
};

const namespace = 'interface';
const b = getStoreBuilder<RootState>().module<ModuleRootState>(namespace, JSON.parse(JSON.stringify(defaults))); // copy so we don't add listeners to defaults
const getState = b.state();

const get = {
	form: b.read(state => state.form, 'form'),
	patternMode: b.read(state => state.patternMode, 'patternMode'),
	exploreMode: b.read(state => state.exploreMode, 'exploreMode'),
	viewedResults: b.read(state => state.viewedResults, 'viewedResults'),
	groupDisplayMode: b.read(state => state.groupDisplayMode, 'groupDisplayModes'),
};

const actions = {
	form: b.commit((state, payload: ModuleRootState['form']) => state.form = payload, 'form'),
	patternMode: b.commit((state, payload: ModuleRootState['patternMode']) => state.patternMode = payload, 'patternMode'),
	exploreMode: b.commit((state, payload: ModuleRootState['exploreMode']) => state.exploreMode = payload, 'exploreMode'),
	viewedResults: b.commit((state, payload: ModuleRootState['viewedResults']) => state.viewedResults = payload, 'viewedResults'),
	groupDisplayMode: b.commit((state, payload: {view: ResultViewId, value: string}) => Vue.set(state.groupDisplayMode, payload.view, payload.value), 'groupDisplayMode'),

	reset: b.commit(state => Object.assign(state, JSON.parse(JSON.stringify(defaults))), 'reset'),
	replace: b.commit((state, payload: ModuleRootState) => Object.assign(state, payload), 'replace'),
};

const init = () => {/**/};

export {
	ModuleRootState,

	getState,
	get,
	actions,
	init,

	namespace,
	defaults
};
