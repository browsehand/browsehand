// @ts-check
import { defineConfig } from 'astro/config';
import starlight from '@astrojs/starlight';

export default defineConfig({
	redirects: {
		'/': '/installation/',
	},
	integrations: [
		starlight({
			title: 'BrowseHand',
			defaultLocale: 'ko',
			locales: {
				ko: { label: '한국어', lang: 'ko' },
			},
			sidebar: [
				{ label: '설치하기', link: '/installation/' },
				{ label: '사용 방법', link: '/quick-start/' },
				{ label: '기능 목록', link: '/tools/' },
				{
					label: '활용 예제',
					items: [
						{ label: '구글 맵에서 맛집 수집', link: '/examples/google-maps/' },
						{ label: '네이버 지도 가게 수집', link: '/examples/naver-map/' },
					],
				},
			],
		}),
	],
});
