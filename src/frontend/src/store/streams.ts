import URI from 'urijs';

import { ReplaySubject, Observable, merge, fromEvent } from 'rxjs';
import { debounceTime, switchMap, map, distinctUntilChanged, shareReplay, filter } from 'rxjs/operators';

import * as RootStore from '@/store';
import * as CorpusStore from '@/store/corpus';
import * as PatternStore from '@/store/form/patterns';
import * as ExploreStore from '@/store/form/explore';
import * as HitsStore from '@/store/results/hits';
import * as InterfaceStore from '@/store/form/interface';
import * as DocsStore from '@/store/results/docs';
import * as HistoryStore from '@/store/history';
import * as FilterStore from '@/store/form/filters';

import { getFilterString } from '@/utils/';
import * as Api from '@/api';

import * as BLTypes from '@/types/blacklabtypes';
import { FilterValue } from '@/types/apptypes';
import jsonStableStringify from 'json-stable-stringify';
import { debugLog } from '@/utils/debug';

type QueryState = {
	params?: BLTypes.BLSearchParameters,
	state: Pick<RootStore.RootState, 'query'|'interface'|'global'|'hits'|'docs'>
};

const metadata$ = new ReplaySubject<FilterValue[]>(1);
const submittedMetadata$ = new ReplaySubject<FilterValue[]>(1);
const url$ = new ReplaySubject<QueryState>(1);

// TODO handle errors gracefully, right now the entire stream is closed permanently.

/**
 * Reads the entered document metadata filters as they are in the main search form,
 * then periodically polls blacklab for the number of matching documents and tokens,
 * yielding the effectively searched document and token counts when searching a pattern with those filters.
 * We can use this info for all sorts of interesting things such as calculating relative frequencies.
 */
export const selectedSubCorpus$ = merge(
	// This is the value-producing stream
	// it only runs when there's no action for a while, and when there's filters active
	metadata$.pipe(
		debounceTime(1000),
		// filter(v => v.length > 0),
		map<FilterValue[], BLTypes.BLSearchParameters>(filters => ({
			filter: getFilterString(filters),
			first: 0,
			number: 0,
			includetokencount: true,
			waitfortotal: true
		})),
		switchMap(params => new Observable<BLTypes.BLDocResults>(subscriber => {
			// Speedup: we know the totals beforehand when there are no filters: mock a reply
			if (!params.filter) {
				subscriber.next({
					docs: [],
					summary: {
						numberOfDocs: CorpusStore.getState().documentCount,
						stillCounting: false,
						tokensInMatchingDocuments: CorpusStore.getState().tokenCount,
					}
				} as any);
				return;
			}

			const {request, cancel} = Api.blacklab.getDocs(CorpusStore.getState().id, params, {
				headers: { 'Cache-Control': 'no-cache' }
			});
			request.then(
				// Sometimes a result comes in anyway after cancelling the request (and closing the subscription),
				// in this case the subscriber will bark at us if we try to push more values, so check for this.
				(result: BLTypes.BLDocResults) => { if (!subscriber.closed) { subscriber.next(result); } },
				(error: Api.ApiError) => { if (!subscriber.closed) { subscriber.error(error); } }
			);

			// When the observer is closed, cancel the ajax request
			return cancel;
		})),
	),

	// And the value-clearing stream, it always emits on changes
	// The idea is that if the last active filter is removed, the value is clear, and no new value is ever produced,
	// but when filters are changed, we don't fire a query right away.
	metadata$.pipe(map(v => null))
)
.pipe(
	// And finally remove subsequent nulls to prevent uneccesary rerenders when results are cleared repetitively
	distinctUntilChanged(),
	// And cache the last value so there's always something to display
	shareReplay(1),
);

export const submittedSubcorpus$ = submittedMetadata$.pipe(
	debounceTime(1000),
	map<FilterValue[], BLTypes.BLSearchParameters>(filters => ({
		filter: getFilterString(filters),
		first: 0,
		number: 0,
		includetokencount: true,
		waitfortotal: true
	})),
	switchMap(params => new Observable<BLTypes.BLDocResults>(subscriber => {
		// Speedup: we know the totals beforehand when there are no totals: mock a reply
		if (!params.filter) {
			subscriber.next({
				docs: [],
				summary: {
					numberOfDocs: CorpusStore.getState().documentCount,
					stillCounting: false,
					tokensInMatchingDocuments: CorpusStore.getState().tokenCount,
				}
			} as any);
			return;
		}

		const {request, cancel} = Api.blacklab.getDocs(CorpusStore.getState().id, params, {
			headers: { 'Cache-Control': 'no-cache' }
		});
		request.then(
			// Sometimes a result comes in anyway after cancelling the request (and closing the subscription),
			// in this case the subscriber will bark at us if we try to push more values, so check for this.
			(result: BLTypes.BLDocResults) => { if (!subscriber.closed) { subscriber.next(result); } },
			(error: Api.ApiError) => { if (!subscriber.closed) { subscriber.error(error); } }
		);

		// When the observer is closed, cancel the ajax request
		return cancel;
	})),
	// And cache the last value so there's always something to display
	shareReplay(1),
);

url$.pipe(
	// filter(v => v.params != null && v.state.interface.viewedResults != null),
	distinctUntilChanged((a, b) => {
		const jsonOld = jsonStableStringify(a.params);
		const jsonNew = jsonStableStringify(b.params);
		const oldResults = a.state.interface.viewedResults;
		const newResults = b.state.interface.viewedResults;

		return jsonOld === jsonNew && oldResults === newResults && a.state.query.subForm === b.state.query.subForm;
	}),
	// generate the new page url
	map<QueryState, QueryState&{
		/**
		 * When the full url would be very long, we need to generate a truncated version (without the pattern - which is often the longest part)
		 * This is an unfortunate side-effect of Tomcat being unable to handle large referrer headers (which contain the full url)
		 * and so blacklab-server will error out on any requests when the current url of the page is long enough.
		 * Additionally, loading the page from a long url is impossible too, because the front-end Tomcat instance also can't serve the page any longer.
		 */
		isTruncated: boolean;
		url: string;
	}>(v => {
		const uri = new URI();

		// Extract our current url path, up to and including 'search'
		// Usually something like ['corpus-frontend', ${indexId}, 'search']
		// But might be different depending on whether the application is proxied or deployed using a different name.
		const basePath = uri.segmentCoded().slice(0, uri.segmentCoded().lastIndexOf('search')+1);

		// If we're not searching, return a bare url pointing to /search/
		if (v.params == null) {
			return {
				url: uri.segmentCoded(basePath).search('').toString(),
				isTruncated: false,
				state: v.state
			};
		}

		// remove null, undefined, empty strings and empty arrays from our query params
		const queryParams: Partial<BLTypes.BLSearchParameters> = Object.entries(v.params).reduce((acc, [key, val]) => {
			if (val == null) { return; }
			if (typeof val === 'string' && val.length === 0) { return; }
			if (Array.isArray(val) && val.length === 0) { return; }
			acc[key] = val;
			return acc;
		}, {} as any);

		// Store some interface state in the url, so the query can be restored to the correct form
		// even when loading the page from just the url. See UrlPageState class in store/index.ts
		// TODO we should probably output the form in the url as /${indexId}/('search'|'explore')/('simple'|'advanced' ...etc)/('hits'|'docs')
		Object.assign(queryParams, {
			interface: JSON.stringify({
				form: v.state.query.form,
				exploreMode: v.state.query.form === 'explore' ? v.state.query.subForm : undefined, // remove if not relevant
				patternMode: v.state.query.form === 'search' ? v.state.query.subForm : undefined, // remove if not relevant
				viewedResults: undefined // remove from query parameters: is encoded in path (segmentcoded)
			} as Partial<InterfaceStore.ModuleRootState>)
		});

		// Generate the new url
		const uri2 = uri
			.segmentCoded(basePath)
			.segmentCoded(v.state.interface.viewedResults!)
			.search(queryParams);

		const fullUrl = uri2.toString();
		return {
			url: fullUrl.length <= 4000 ? fullUrl : uri2.search(Object.assign({}, queryParams, {patt: undefined})).toString(),
			isTruncated: fullUrl.length > 4000,
			state: v.state,
			params: v.params
		};
	}),
	// In the case the new url is identical to the current url, don't put it in history
	filter(v => {
		// new urls are always generated without trailing slash (no empty trailing segment string)
		// while current url might contain one for whatever reason (if user just landed on page)
		// So strip it from the current url in order to properly compare.
		const curUrl = new URI().toString().replace(/\/+$/, '');

		if (curUrl !== v.url) {
			return true;
		} else if (!v.isTruncated) {
			return false;
		}

		// Url was truncated and is equal to current,
		// Might still be able to compare the patterns by checking the state from which it was generated
		const lastState: HistoryStore.HistoryEntry|null = history.state;
		if (lastState == null) {
			// don't store; no previous state stored in history (i.e. the user just landed on the page, so it MUST be equal)
			// this can't actually happen I think, since if you just landed here, how did the url end up truncated
			// since the page can't even load with a url long enough to generate a state that would generate a truncated url.
			return false;
		}

		// shortcut: only need to check the pattern, as the interface state IS contained in the url, and is guaranteed to be the same
		return jsonStableStringify(v.state.query.formState) !== jsonStableStringify(lastState.patterns[lastState.interface.patternMode]);
	}),
	map((v): QueryState&{
		entry: HistoryStore.HistoryEntry
		url: string,
	} => {
		const {query, docs, hits, global} = v.state;
		const entry: HistoryStore.HistoryEntry = {
			filters: query.filters!,
			global,
			hits: v.state.interface.viewedResults === 'hits' ? hits : HitsStore.defaults,
			docs: v.state.interface.viewedResults === 'docs' ? docs : DocsStore.defaults,
			explore: query.form === 'explore' ? {
				...ExploreStore.defaults,
				[query.subForm]: query.formState
			} : ExploreStore.defaults,
			patterns: query.form === 'search' ? {
				...PatternStore.defaults,
				[query.subForm]: query.formState
			} : PatternStore.defaults,
			interface: {
				form: query.form!,
				exploreMode: query.form === 'explore' ? query.subForm : 'ngram',
				patternMode: query.form === 'search' ? query.subForm : 'simple',
				viewedResults: v.state.interface.viewedResults
			}
		};
		return {
			url: v.url,
			entry,
			state: v.state,
			params: v.params
		};
	})
)
.subscribe(v => {
	debugLog('Adding/updating query in query history, and adding browser history entry', v.url, v.entry);
	HistoryStore.actions.addEntry({entry: v.entry, pattern: v.params && v.params.patt, url: v.url});
	history.pushState(v.entry, '', v.url);
});

export default () => {
	debugLog('Begin attaching store to url and subcorpus calculations.');

	// Because we use vuex-typex, getters are a little different
	// It doesn't matter though, they're attached to the same state instance, so just ignore the state argument.

	RootStore.store.watch(
		state => FilterStore.get.activeFilters(),
		v => metadata$.next(v),
		{ immediate: true }
	);
	RootStore.store.watch(
		state => Object.values(state.query.filters || {}),
		v => submittedMetadata$.next(v),
		{ immediate: true }
	);

	RootStore.store.watch(
		(state): QueryState => ({
			params: RootStore.get.blacklabParameters(),
			state: {
				docs: state.docs,
				global: state.global,
				hits: state.hits,
				interface: state.interface,
				query: state.query
			}
		}),
		v => {
			url$.next(JSON.parse(JSON.stringify(v)));
		},
		{
			immediate: true,
			deep: true
		}
	);

	fromEvent<PopStateEvent>(window, 'popstate')
	.pipe(map<PopStateEvent, HistoryStore.HistoryEntry>(evt => evt.state ? evt.state : new RootStore.UrlPageState().get()))
	.subscribe(state => RootStore.actions.replace(state));

	debugLog('Finished connecting store to url and subcorpus calculations.');
};
