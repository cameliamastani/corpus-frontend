<template lang="jsx">
	<div class="modal fade modal-fullwidth">
		<div class="modal-dialog">
			<div class="modal-content">
				<div class="modal-header">
					<button type="button" data-dismiss="modal" class="close" title="close">&times;</button>
					<h3>{{annotationDisplayName || annotationId}}</h3>
				</div>
				<div v-if="isValidTagset" class="modal-body">
					<div class="list-group-container">
						<div class="list-group main">
							<button v-for="value in tagset.values"
								type="button"
								:key="value.id"
								:class="{
									'list-group-item': true,
									'active': annotationValue=== value
								}"

								@click="annotationValue = (annotationValue === value ? null : value)"
							>
								{{value.displayName}}
							</button>
						</div>

						<div v-if="annotationValue" class="category-container">
							<ul v-for="subId in annotationValue.subAnnotationIds" class="list-group category">
								<li class="list-group-item active category-name">{{annotationDisplayNames[subId]}}</li>
								<!-- debugging -->
								<!-- :style="{
									backgroundColor: (!subValue.pos || subValue.pos.includes(annotationValue.value)) ? undefined : 'red'
								}" -->
								<li class="list-group-item category-value" v-for="subValue in tagset.subAnnotations[subId].values" :key="subValue.value" v-if="!subValue.pos || subValue.pos.includes(annotationValue.value)">
									<label>
										<input type="checkbox" v-model="selected[`${annotationValue.value}/${subId}/${subValue.value}`]"/>
										{{subValue.displayName}}
									</label>
								</li>
							</ul>
							<em v-if="annotationValue.subAnnotationIds.length === 0">No options</em>
						</div>
					</div>
					<hr>
					<div>{{query}}</div>
				</div>
				<div v-else class="modal-body">
					<div class="alert alert-danger">
						{{errorMessage}}
					</div>
				</div>
				<div class="modal-footer">
					<!-- Don't use submit/reset, since these are not in their own form it messes up submitting any parent form using enter key in input -->
					<button type="button" class="btn btn-primary" @click.prevent="submit" data-dismiss="modal">Ok</button>
					<button type="button" class="btn btn-default" @click.prevent="reset">Reset</button>
				</div>
			</div>
		</div>
	</div>
</template>

<script lang="ts">
import Vue from 'vue';
import * as TagsetStore from '@/store/search/tagset';
import * as CorpusStore from '@/store/search/corpus';
import * as InterfaceStore from '@/store/search/form/interface';

import {NormalizedAnnotation, Tagset} from '@/types/apptypes';

export default Vue.extend({
	props: {
		annotationId: {
			required: true,
			type: String,
		},
		annotationDisplayName: String,
	},
	data: () => ({
		annotationValue: null as null|Tagset['values'][string],
		selected: {} as {[key: string]: boolean}
	}),
	computed: {
		tagset: TagsetStore.getState,
		annotationDisplayNames: CorpusStore.get.annotationDisplayNames,
		isValidTagset(): boolean { return TagsetStore.getState().state === 'loaded'; },
		errorMessage(): string { return this.isValidTagset ? '' : TagsetStore.getState().message; },
		query(): string {
			if (this.annotationValue == null) { return ''; }
			const mainValue = this.annotationValue.value;

			const subAnnots = this.annotationValue.subAnnotationIds.map(id => ({
				id,
				values: this.tagset.subAnnotations[id].values
					.map(v => v.value)
					.filter(v => this.selected[`${mainValue}/${id}/${v}`])
			}))
			.filter(v => v.values.length > 0);
			const subAnnotStrings = subAnnots.map(({id, values}) => `${id}="${values.join('|')}"`);

			return [`${this.annotationId}="${mainValue}"`].concat(subAnnots.map(({id, values}) => `${id}="${values.join('|')}"`)).join('&');
		},
	},
	methods: {
		reset() {
			Object.keys(this.selected).forEach(k => this.selected[k] = false);
			this.annotationValue = null;
		},
		submit() {
			if (this.annotationValue == null) {
				this.$emit('submit', {
					query: '',
				});
				return;
			}

			const mainValue = this.annotationValue.value;
			const subAnnots = this.annotationValue.subAnnotationIds.map(id => ({
				id,
				values: this.tagset.subAnnotations[id].values
					.map(v => v.value)
					.filter(v => this.selected[`${mainValue}/${id}/${v}`])
			}))
			.filter(v => v.values.length > 0);

			this.$emit('submit', {
				queryString: this.query,
				value: {
					[this.annotationId]: this.annotationValue.value,
					...subAnnots.reduce((acc, cur) => {
						acc[cur.id] = cur.values.join('|');
						return acc;
					}, {} as {[key: string]: string})
				}
			});
		}
	},
	created() {
		Object.values(this.tagset.values).forEach(value => {
			value.subAnnotationIds.forEach(annotId => {
				const {values, id} = this.tagset.subAnnotations[annotId];
				values.forEach(({value: subAnnotValue}) => {
					Vue.set(this.selected, `${value.value}/${annotId}/${subAnnotValue}`, false);
				});
			});
		});
	}
});

</script>

<style lang="scss" scoped>

.list-group-container {
	display: flex;
	flex-wrap: nowrap;

	> .list-group.main,
	> .category-container {
		max-height: calc(100vh - 305px);
		min-height: 200px;
		overflow: auto;
	}
}

.category-container {
	overflow: auto;
	flex-grow: 1;
	display: flex;
	flex-wrap: wrap;

	.list-group {
		margin-right: 12px;
		min-width: 120px;
		>.list-group-item {
			padding: 6px 10px;
		}
	}
}

.list-group {
	padding: 0;

	&.main {
		display: inline-block;
		flex: none;
		flex-basis: auto;
		margin: 0 20px 0 0;
	}

	&.category {
		display: inline-block;
		vertical-align: top;
		white-space: nowrap;
		flex: none;

		label {
			margin: 0;
			padding: 0;
		}
	}
}

</style>