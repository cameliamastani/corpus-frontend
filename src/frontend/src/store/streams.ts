import { ReplaySubject, Observable, merge } from 'rxjs';
import { debounceTime, switchMap, map, distinctUntilChanged, publishLast, publishReplay, shareReplay, debounce, filter, tap } from 'rxjs/operators';

import * as rootStore from '@/store';
import * as formStore from '@/store/form';
import * as corpusStore from '@/store/corpus';

import { getFilterString } from '@/utils/';
import * as Api from '@/api';

import * as BLTypes from '@/types/blacklabtypes';
import { MetadataValue } from '@/types/apptypes';

const metadata$ = new ReplaySubject<MetadataValue[]>(1);
const submittedMetadata$ = new ReplaySubject<MetadataValue[]>(1);

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
		map<MetadataValue[], BLTypes.BLSearchParameters>(filters => ({
			filter: getFilterString(filters),
			first: 0,
			number: 0,
			includetokencount: true,
			waitfortotal: true
		})),
		switchMap(params => new Observable<BLTypes.BLDocResults|null>(subscriber => {
			// Speedup: we know the totals beforehand when there are no totals: mock a reply
			if (!params.filter) {
				subscriber.next({
					docs: [],
					summary: {
						numberOfDocs: corpusStore.getState().documentCount,
						stillCounting: false,
						tokensInMatchingDocuments: corpusStore.getState().tokenCount,
					}
				} as any);
				return;
			}

			// todo keep requesting until finished.
			const {request, cancel} = Api.blacklab.getDocs(corpusStore.getState().id, params);
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
	map<MetadataValue[], BLTypes.BLSearchParameters>(filters => ({
		filter: getFilterString(filters),
		first: 0,
		number: 0,
		includetokencount: true,
		waitfortotal: true
	})),
	switchMap(params => new Observable<BLTypes.BLDocResults|null>(subscriber => {
		// Speedup: we know the totals beforehand when there are no totals: mock a reply
		if (!params.filter) {
			subscriber.next({
				docs: [],
				summary: {
					numberOfDocs: corpusStore.getState().documentCount,
					stillCounting: false,
					tokensInMatchingDocuments: corpusStore.getState().tokenCount,
				}
			} as any);
			return;
		}

		const {request, cancel} = Api.blacklab.getDocs(corpusStore.getState().id, params);
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

export default () => {
	// Because we use vuex-typex, getters are a little different
	// It doesn't matter though, they're attached to the same state instance, so just ignore the state argument.

	// NOTE: temporarily disabled, see https://github.com/INL/corpus-frontend/issues/153
	// rootStore.store.watch(
	// 	state => formStore.get.activeFilters(),
	// 	v => metadata$.next(v),
	// 	{ immediate: true }
	// );
	rootStore.store.watch(
		state => {
			const params = formStore.get.lastSubmittedParameters();
			return params != null ? params.filters : [];
		},
		v => submittedMetadata$.next(v),
		{ immediate: true }
	);
};