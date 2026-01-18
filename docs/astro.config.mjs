// @ts-check
import { defineConfig } from 'astro/config';
import starlight from '@astrojs/starlight';

// https://astro.build/config
export default defineConfig({
	site: 'https://browsehand.com',
	integrations: [
		starlight({
			title: 'BrowseHand',
			social: [{ icon: 'github', label: 'GitHub', href: 'https://github.com/user/browsehand' }],
			sidebar: [
				{
					label: 'Getting Started',
					items: [
						{ label: 'Quick Start', link: '/guides/quickstart/' },
					],
				},
				{
					label: 'Guides',
					items: [
						{ label: 'Usage Scenarios', link: '/guides/scenarios/' },
					],
				},
				{
					label: 'Reference',
					items: [
						{ label: 'MCP Tools', link: '/reference/tools/' },
						{ label: 'Troubleshooting', link: '/reference/troubleshooting/' },
					],
				},
			],
		}),
	],
});
