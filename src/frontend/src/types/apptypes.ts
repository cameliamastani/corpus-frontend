import * as BLTypes from '@/types/blacklabtypes';

// -----------
// State types
// -----------

// TODO unify these with the above types, take care to backport changes to vuejs corpora management page

// NOTE: take care not to create any circular references or depend on objects being aliased (being the same instance, ===)
// The store is serialized and deserialized by the browser when navigating, all indirect references should use string ids

/** Property of a word, usually 'lemma', 'pos', 'word' */
export type NormalizedAnnotation = {
	/** id of the field this annotation resides in, usually 'contents' */
	annotatedFieldId: string;
	caseSensitive: boolean;
	description: string;
	displayName: string;
	/**
	 * Id of the annotationGroup, if this annotation is part of a group
	 * Note that groups are separate per annotatedField,
	 * so annotatedField 'contents' and 'somethingElse' can contain groups with the same id.
	 */
	groupId?: string;
	hasForwardIndex: boolean;
	/** 'lemma', 'pos', etc. These are only unique within the same annotatedField */
	id: string;
	isInternal: boolean;
	/**
	 * True if this is the default annotation that is matched when a cql query does not specify the field
	 * (e.g. just "searchTerm" instead of [fieldName="searchTerm"]
	 */
	isMainAnnotation: boolean;
	offsetsAlternative: string;
	/** When this is a subAnnotation */
	parentAnnotationId?: string;
	/** List of annotationIds in the same annotatedField, only present when the field has actual subAnnotations */
	subAnnotations?: string[];
	/** Based on the uiType of the original annotion, but select falls back to combobox if not all values are known */
	uiType: 'select'|'combobox'|'text'|'pos';
	/** Contains all known values for this field. Undefined if no values known or list was incomplete. */
	values?: Array<{value: string, label: string, title: string|null}>;
};

/** A set of annotations that form one data set on a token, usually there is only one of these in an index, called 'content' */
export type NormalizedAnnotatedField = {
	annotations: { [annotationId: string]: NormalizedAnnotation };
	description: string;
	displayName: string;
	/** Display order of annotations, by their id. */
	displayOrder: string[];
	hasContentStore: boolean;
	hasLengthTokens: boolean;
	hasXmlTags: boolean;
	/** usually 'contents', annotatedFieldId in NormalizedAnnotation refers to this */
	id: string;
	isAnnotatedField: boolean;
	/**
	 * If a cql query is fired that is just a string in quotes (such as "searchterm")
	 * this is the id of the annotation that is searched, usually the annotation with id 'word'.
	 * Refers to the id of a NormalizedAnnotation
	 */
	mainAnnotationId: string;
};

export type NormalizedMetadataField = {
	description: string;
	displayName: string;
	/** Id of the metadataFieldGroup, if part of a group */
	groupId?: string;
	id: string;
	/**
	 * Based on the uiType of the original metadata field,
	 * but 'select' is replaced by 'combobox' if not all values are known
	 * Unknown types are replaced by 'text'
	 */
	uiType: 'select'|'combobox'|'text'|'range'|'checkbox'|'radio';
	/** Only when uiType === 'select' */
	values?: Array<{value: string, label: string, title: string|null}>;
};

/** Contains information about the internal structure of the index - which fields exist for tokens, which metadata fields exist for documents, etc */
export type NormalizedIndex = {
	annotatedFields: { [id: string]: NormalizedAnnotatedField; };
	/** If no groups are defined by blacklab itself, all annotations of all annotatedFields are placed in generated groups called 'Annotations' */
	annotationGroups: Array<{
		annotatedFieldId: string;
		/**
		 * Pre-sorted based on the displayOrder of annotations in the parent annotatedField
		 * NOTE: we do this - blacklab returns them in order of declaration in the indexmetadata file.
		 */
		annotationIds: string[];
		/** Unique within groups with the same annotatedFieldId, treat as a user-friendly name */
		name: string;
	}>;
	contentViewable: boolean;
	/** Description of the main index */
	description: string;
	displayName: string;
	/** If -1, the blacklab version is too old to support this property, and it needs to be requested from the server. (we do this on app startup, see corpusStore). */
	documentCount: number;
	/** key of a BLFormat */
	documentFormat?: string;
	fieldInfo: BLTypes.BLDocFields;
	/** Id of this index */
	id: string;
	/** If no groups are defined by blacklab itself, all metadata fields are placed in a single group called 'Metadata' */
	metadataFieldGroups: Array<{
		/** Unique within groups with the same annotatedFieldId, treat as a user-friendly name */
		name: string;
		/** Keys in metadataFields */
		fields: string[];
	}>;
	metadataFields: { [key: string]: NormalizedMetadataField; };
	/** Owner of the corpus, if is a user owned corpus */
	owner: string|null;
	/** Id of the corpus minus the owner's username prefix */
	shortId: string;
	textDirection: 'ltr'|'rtl';
	/** yyyy-mm-dd hh:mm:ss */
	timeModified: string;
	tokenCount: number;
};

// ---------
// Old types
// ---------

// TODO merge the old and new NormalizedIndex types

// Helper - get all props in A not in B
type Subtract<A, B> = Pick<A, Exclude<keyof A, keyof B>>;

interface INormalizedIndexOld {
	// new props
	/** ID in the form username:indexname */
	id: string;
	/** username extracted */
	owner: string|null;
	/** indexname extracted */
	shortId: string;

	// original props, with normalized values
	documentFormat: string|null;
	indexProgress: BLTypes.BLIndexProgress|null;
	tokenCount: number|null;
}
export type NormalizedIndexOld = INormalizedIndexOld & Subtract<BLTypes.BLIndex, INormalizedIndexOld>;

interface INormalizedFormatOld {
	// new props
	id: string;
	/** Username extracted */
	owner: string|null;
	/** internal name extracted */
	shortId: string;

	// original props, with normalized values
	/** Null if would be empty originally */
	helpUrl: string|null;
	/** Null if would be empty originally */
	description: string|null;
	/** set to shortId if originally empty */
	displayName: string;
}
export type NormalizedFormatOld = INormalizedFormatOld & Subtract<BLTypes.BLFormat, INormalizedFormatOld>;

// ------------------
// Types used on page
// ------------------

export type AnnotationValue = {
	/** Unique id of the annotated field  */
	// readonly annotatedFieldId: string;

	/** Unique ID of the property */
	readonly id: string;
	/** Raw value of the property */
	value: string;
	/** Should the property match using case sensitivity */
	case: boolean;
	/**
	 * Type of the annotation.
	 * Some types require special treatment when parsing or serializing from/to cql.
	 * Always available, but not required to allow committing new values to the store without setting it.
	 */
	readonly type?: NormalizedAnnotation['uiType'];
};

export type FilterValue = {
	/** Unique id of the metadata field */
	readonly id: string;
	/**
	 * Type of the filter, determines how the values are interpreted and read from the DOM
	 * See CorpusConfig.java/search.vm
	 *
	 * 'range' -> has two numerical inputs, min and max
	 * 'select' -> is a multiselect field
	 *
	 * There is also 'combobox' and 'text',
	 * but these are just a regular text input (with some autocompletion on combobox)
	 * and can be treated the same way for the purposes of state and DOM manipulation
	 *
	 * It's possible for a user to specify another type (using uiType for annotatedFields and metadataFields in the index format),
	 * but this should just be ignored and treated as 'text'.
	 */
	type: NormalizedMetadataField['uiType'];
	/** Values of the filter, for selects, the selected values as array elements, for text, the text as the first array element, for ranges the min and max values in indices [0][1] */
	values: string[];
};

// -------------------
// Configuration types
// -------------------

export type Tagset = {
	/** Referring to the annotation for which the values exist, this is the annotation under which the main part-of-speech category is stored ('ww', 'vnw' etc) */
	// annotationId: string;
	/**
	 * All known values for this annotation.
	 * The raw values can be gathered from blacklab
	 * but displaynames, and the valid constraints need to be manually configured.
	 */
	values: {
		[key: string]: {
			value: string;
			displayName: string;
			/** All subannotations that can be used on this type of part-of-speech */
			subAnnotationIds: Array<keyof Tagset['subAnnotations']>;
		}
	};
	/**
	 * All subannotations of the main annotation
	 * Except the displayNames for values, we could just autofill this from blacklab.
	 */
	subAnnotations: {
		[key: string]: {
			id: string;
			/** The known values for the subannotation */
			values: Array<{
				value: string;
				displayName: string;
				/** Only allow/show this specific value for the defined main annotation values (referring to Tagset['values'][key]) */
				pos?: string[];
			}>;
		};
	};
};

export class ApiError extends Error {
	public readonly title: string;
	public readonly message: string;
	/** http code, -1 if miscellaneous network error */
	public readonly statusText: string;

	constructor(title: string, message: string, statusText: string) {
		super();
		this.title = title;
		this.message = message;
		this.statusText = statusText;
	}
}
