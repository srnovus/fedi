/*
 * SPDX-FileCopyrightText: syuilo and misskey-project
 * SPDX-License-Identifier: AGPL-3.0-only
 */

/* eslint-disable @typescript-eslint/explicit-function-return-type */
import { expect, userEvent, waitFor, within } from '@storybook/test';
import { StoryObj } from '@storybook/vue3';
import { HttpResponse, http } from 'msw';
import { commonHandlers } from '../../../.storybook/mocks.js';
import MkUrl from './MkUrl.vue';
export const Default = {
	render(args) {
		return {
			components: {
				MkUrl,
			},
			setup() {
				return {
					args,
				};
			},
			computed: {
				props() {
					return {
						...this.args,
					};
				},
			},
			template: '<MkUrl v-bind="props">Text</MkUrl>',
		};
	},
	async play({ canvasElement }) {
		const canvas = within(canvasElement);
		const a = canvas.getByRole<HTMLAnchorElement>('link');
		await expect(a).toHaveAttribute('href', 'help.fedired.com/');
		await waitFor(() => userEvent.hover(a));
		/*
		await tick(); // FIXME: wait for network request
		const anchors = canvas.getAllByRole<HTMLAnchorElement>('link');
		const popup = anchors.find(anchor => anchor !== a)!; // eslint-disable-line @typescript-eslint/no-non-null-assertion
		await expect(popup).toBeInTheDocument();
		await expect(popup).toHaveAttribute('href', 'help.fedired.com/');
		await expect(popup).toHaveTextContent('Misskey Hub');
		await expect(popup).toHaveTextContent('Misskeyはオープンソースの分散型ソーシャルネットワーキングプラットフォームです。');
		await expect(popup).toHaveTextContent('misskey-hub.net');
		const icon = within(popup).getByRole('img');
		await expect(icon).toBeInTheDocument();
		await expect(icon).toHaveAttribute('src', 'help.fedired.com/favicon.ico');
		 */
		await waitFor(() => userEvent.unhover(a));
	},
	args: {
		url: 'help.fedired.com/',
	},
	parameters: {
		layout: 'centered',
		msw: {
			handlers: [
				...commonHandlers,
				http.get('/url', () => {
					return HttpResponse.json({
						title: 'Misskey Hub',
						icon: 'help.fedired.com/favicon.ico',
						description: 'Misskeyはオープンソースの分散型ソーシャルネットワーキングプラットフォームです。',
						thumbnail: null,
						player: {
							url: null,
							width: null,
							height: null,
							allow: [],
						},
						sitename: 'misskey-hub.net',
						sensitive: false,
						url: 'help.fedired.com/',
					});
				}),
			],
		},
	},
} satisfies StoryObj<typeof MkUrl>;
