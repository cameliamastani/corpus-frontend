/**
 * This module contains the corpus info as it's configured in blacklab.
 * We use it for pretty much everything to do with layout:
 * which annotations and filters are available, what is the default annotation (lemma/pos/word/etc...),
 * are the filters subdivided in groups, what is the text direction, and so on.
 */

import {getStoreBuilder} from 'vuex-typex';
import deepFreeze from 'deep-freeze';

import * as Api from '@/api';

import {RootState} from '@/store/search/';

import {normalizeIndex} from '@/utils/blacklabutils';

import * as BLTypes from '@/types/blacklabtypes';
import {NormalizedIndex, NormalizedAnnotation, NormalizedMetadataField, NormalizedAnnotatedField} from '@/types/apptypes';

declare const SINGLEPAGE: { INDEX: BLTypes.BLIndexMetadata; };

type ModuleRootState = NormalizedIndex;

const namespace = 'corpus';
const b = getStoreBuilder<RootState>().module<ModuleRootState>(namespace, normalizeIndex(JSON.parse(JSON.stringify(SINGLEPAGE.INDEX))));

const getState = b.state();

const get = {
	annotations: b.read(state =>
		Object.values(state.annotatedFields)
		.flatMap(f => Object.values(f.annotations))
		.filter(a => !a.isInternal)
	, 'annotations'),
	annotationsMap: b.read((state): {[id: string]: NormalizedAnnotation[]} =>
		get.annotations()
		.reduce<{[id: string]: NormalizedAnnotation[]}>((fields, field) => {
			if (!fields[field.id]) {
				fields[field.id] = [];
			}
			fields[field.id].push(field);
			return fields;
		}, {})
		// return annotations;
	, 'annotationsMap'),

	// TODO might be collisions between multiple annotatedFields, this is an unfinished part in blacklab
	// like for instance, in a BLHitSnippet, how do we know which of the props comes from which annotatedfield.
	annotationDisplayNames: b.read(state =>
		Object.values(state.annotatedFields)
		.flatMap(f => Object.values(f.annotations))
		.reduce<{[id: string]: string; }>((acc, v) => {
			acc[v.id] = v.displayName;
			return acc;
		}, {}), 'annotationDisplayNames'),

	// TODO there can be multiple main annotations if there are multiple annotatedFields
	// the ui needs to respect this (probably render more extensive results?)
	firstMainAnnotation: () => get.annotations().find(f => f.isMainAnnotation)!,

	/**
	 * Returns all metadatagroups from the indexstructure, unless there are no metadatagroups defined
	 * Then a single generated group "metadata" is returned, containing all metadata fields.
	 * If groups are defined, fields not in a group are omitted
	 */
	metadataGroups: b.read((state): Array<{
		name: string,
		fields: NormalizedMetadataField[]
	}> => {
		return state.metadataFieldGroups.map(g => {
			return {
				...g,
				fields: g.fields.map(fieldId => state.metadataFields[fieldId]).filter(f => f != null)
			};
		});
	}, 'metadataGroups'),

	annotationGroups: b.read((state): Array<{
		name: string;
		annotatedFieldId: string;
		annotations: NormalizedAnnotation[]
	}> => {
		return state.annotationGroups.map(g => ({
			...g,
			annotations: g.annotationIds.map(id => state.annotatedFields[g.annotatedFieldId].annotations[id]).filter(annot => !annot.isInternal)
		}));
	}, 'annotationGroups'),

	textDirection: b.read(state => state.textDirection, 'getTextDirection')
};

const actions = {
	// nothing here yet (probably never, indexmetadata should be considered immutable)
	// maybe just some things to customize displaynames and the like.
};

const init = () => {
	const state = getState();

	if (state.documentCount === -1) {
		// Request a sum of all documents in the corpus
		Api.blacklab.getDocs(state.id, {
			first: 0,
			number: 0,
			waitfortotal: true
		})
		.request.then(r => {
			state.documentCount = r.summary.numberOfDocs;
		});
	}
};

export {
	ModuleRootState,
	NormalizedIndex,
	NormalizedAnnotatedField,
	NormalizedAnnotation,
	NormalizedMetadataField,

	getState,
	get,
	actions,
	init,

	namespace,
};
