/*
 * SPDX-FileCopyrightText: syuilo and misskey-project
 * SPDX-License-Identifier: AGPL-3.0-only
 */

import { get } from 'idb-keyval';
import * as Misskey from 'fedired-js';
import type { PushNotificationDataMap } from '@/types.js';
import type { I18n } from '@@/js/i18n.js';
import type { Locale } from '../../../locales/index.js';
import { createEmptyNotification, createNotification } from '@/scripts/create-notification.js';
import { swLang } from '@/scripts/lang.js';
import * as swos from '@/scripts/operations.js';

globalThis.addEventListener('install', () => {
	// ev.waitUntil(globalThis.skipWaiting());
});

globalThis.addEventListener('activate', ev => {
	ev.waitUntil(
		caches.keys()
			.then(cacheNames => Promise.all(
				cacheNames
					.filter((v) => v !== swLang.cacheName)
					.map(name => caches.delete(name)),
			))
			.then(() => globalThis.clients.claim()),
	);
});

async function offlineContentHTML() {
	const i18n = await (swLang.i18n ?? swLang.fetchLocale()) as Partial<I18n<Locale>>;
	const messages = {
		title: i18n.ts?._offlineScreen.title ?? 'Offline - Could not connect to server',
		header: i18n.ts?._offlineScreen.header ?? 'Could not connect to server',
		reload: i18n.ts?.reload ?? 'Reload',
	};

	return `

	<!DOCTYPE html>
<html lang="es">
  <head>
    <meta charset="utf-8">
    <meta name="viewport" content="width=device-width, initial-scale=1.0">
    <title>Desconectado</title>
    <style>
      *{font-family:BIZ UDGothic,Roboto,HelveticaNeue,Arial,sans-serif}
      body,html{background-color:#191724;color:#e0def4;justify-content:center;margin:auto;padding:10px;text-align:center}
      button{border-radius:999px;padding:0 12px;border:none;cursor:pointer;margin-bottom:12px}.button-big{background:linear-gradient(90deg,#c4a7e7,#ebbcba);line-height:50px}
      .button-big:hover{background:#31748f}.button-label-big{color:#191724;font-weight:700;font-size:20px;padding:12px}
      p{font-size:16px}#msg,.dont-worry{font-size:18px}.icon-warning{color:#f6c177;height:4rem;padding-top:2rem}
      h1{font-size:32px}code{font-family:Fira,FiraCode,monospace}@media screen and (max-width:500px){details{width:50%}}
    </style>
  </head>
  <body>
    <svg class="icon-warning" xmlns="http://www.w3.org/2000/svg" fill="none" stroke="currentColor" stroke-linecap="round" stroke-linejoin="round" stroke-width="2" viewBox="0 0 24 24">
      <path d="M0 0h24v24H0z" fill="none" stroke="none"></path>
      <path d="M12 9v2m0 4v.01"></path>
      <path d="M5 19h14a2 2 0 0 0 1.84 -2.75l-7.1 -12.25a2 2 0 0 0 -3.5 0l-7.1 12.25a2 2 0 0 0 1.75 2.75"></path>
    </svg>
    <h1>¡Parece que estás desconectado!</h1>
    <button class="button-big" onclick="location.reload()"><span class="button-label-big">Recargar</span></button>
    <p class="dont-worry">Parece que Fedired no pudo conectarse al servidor, probablemente porque tu dispositivo no está conectado a internet o a la red.</p>
    <p>El Service Worker instalado es la versión <code>${_VERSION_}</code></p>
  </body>
</html>

	`;
}

globalThis.addEventListener('fetch', ev => {
	let isHTMLRequest = false;
	if (ev.request.headers.get('sec-fetch-dest') === 'document') {
		isHTMLRequest = true;
	} else if (ev.request.headers.get('accept')?.includes('/html')) {
		isHTMLRequest = true;
	} else if (ev.request.url.endsWith('/')) {
		isHTMLRequest = true;
	}

	if (!isHTMLRequest) return;
	ev.respondWith(
		fetch(ev.request)
			.catch(async () => {
				const html = await offlineContentHTML();
				return new Response(html, {
					status: 200,
					headers: {
						'content-type': 'text/html',
					},
				});
			}),
	);
});

globalThis.addEventListener('push', ev => {
	// クライアント取得
	ev.waitUntil(globalThis.clients.matchAll({
		includeUncontrolled: true,
		type: 'window',
	}).then(async () => {
		const data: PushNotificationDataMap[keyof PushNotificationDataMap] = ev.data?.json();

		switch (data.type) {
			// case 'driveFileCreated':
			case 'notification':
			case 'unreadAntennaNote':
				// 1日以上経過している場合は無視
				if (Date.now() - data.dateTime > 1000 * 60 * 60 * 24) break;

				return createNotification(data);
			case 'readAllNotifications':
				await globalThis.registration.getNotifications()
					.then(notifications => notifications.forEach(n => n.tag !== 'read_notification' && n.close()));
				break;
		}

		await createEmptyNotification();
		return;
	}));
});

globalThis.addEventListener('notificationclick', (ev: ServiceWorkerGlobalScopeEventMap['notificationclick']) => {
	ev.waitUntil((async (): Promise<void> => {
		if (_DEV_) {
			console.log('notificationclick', ev.action, ev.notification.data);
		}

		const { action, notification } = ev;
		const data: PushNotificationDataMap[keyof PushNotificationDataMap] = notification.data ?? {};
		const { userId: loginId } = data;
		let client: WindowClient | null = null;

		switch (data.type) {
			case 'notification':
				switch (action) {
					case 'follow':
						if ('userId' in data.body) await swos.api('following/create', loginId, { userId: data.body.userId });
						break;
					case 'showUser':
						if ('user' in data.body) client = await swos.openUser(Misskey.acct.toString(data.body.user), loginId);
						break;
					case 'reply':
						if ('note' in data.body) client = await swos.openPost({ reply: data.body.note }, loginId);
						break;
					case 'renote':
						if ('note' in data.body) await swos.api('notes/create', loginId, { renoteId: data.body.note.id });
						break;
					case 'accept':
						switch (data.body.type) {
							case 'receiveFollowRequest':
								await swos.api('following/requests/accept', loginId, { userId: data.body.userId });
								break;
						}
						break;
					case 'reject':
						switch (data.body.type) {
							case 'receiveFollowRequest':
								await swos.api('following/requests/reject', loginId, { userId: data.body.userId });
								break;
						}
						break;
					case 'showFollowRequests':
						client = await swos.openClient('push', '/my/follow-requests', loginId);
						break;
					default:
						switch (data.body.type) {
							case 'receiveFollowRequest':
								client = await swos.openClient('push', '/my/follow-requests', loginId);
								break;
							case 'reaction':
								client = await swos.openNote(data.body.note.id, loginId);
								break;
							default:
								if ('note' in data.body) {
									client = await swos.openNote(data.body.note.id, loginId);
								} else if ('user' in data.body) {
									client = await swos.openUser(Misskey.acct.toString(data.body.user), loginId);
								}
								break;
						}
				}
				break;
			case 'unreadAntennaNote':
				client = await swos.openAntenna(data.body.antenna.id, loginId);
				break;
			default:
				switch (action) {
					case 'markAllAsRead':
						await globalThis.registration.getNotifications()
							.then(notifications => notifications.forEach(n => n.tag !== 'read_notification' && n.close()));
						await get<Pick<Misskey.entities.SignupResponse, 'id' | 'token'>[]>('accounts').then(accounts => {
							return Promise.all((accounts ?? []).map(async account => {
								await swos.sendMarkAllAsRead(account.id);
							}));
						});
						break;
					case 'settings':
						client = await swos.openClient('push', '/settings/notifications', loginId);
						break;
				}
		}

		if (client) {
			client.focus();
		}
		if (data.type === 'notification') {
			await swos.sendMarkAllAsRead(loginId);
		}

		notification.close();
	})());
});

globalThis.addEventListener('notificationclose', (ev: ServiceWorkerGlobalScopeEventMap['notificationclose']) => {
	const data: PushNotificationDataMap[keyof PushNotificationDataMap] = ev.notification.data;

	ev.waitUntil((async (): Promise<void> => {
		if (data.type === 'notification') {
			await swos.sendMarkAllAsRead(data.userId);
		}
		return;
	})());
});

globalThis.addEventListener('message', (ev: ServiceWorkerGlobalScopeEventMap['message']) => {
	ev.waitUntil((async (): Promise<void> => {
		switch (ev.data) {
			case 'clear':
				// Cache Storage全削除
				await caches.keys()
					.then(cacheNames => Promise.all(
						cacheNames.map(name => caches.delete(name)),
					));
				return; // TODO
		}

		if (typeof ev.data === 'object') {
			// E.g. '[object Array]' → 'array'
			const otype = Object.prototype.toString.call(ev.data).slice(8, -1).toLowerCase();

			if (otype === 'object') {
				if (ev.data.msg === 'initialize') {
					swLang.setLang(ev.data.lang);
				}
			}
		}
	})());
});
