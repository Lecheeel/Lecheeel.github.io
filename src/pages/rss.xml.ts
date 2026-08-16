import rss from '@astrojs/rss';
import { getCollection } from 'astro:content';
import type { APIContext } from 'astro';

export async function GET(context: APIContext) {
  const posts = (await getCollection('blog'))
    .filter((p) => !p.data.draft)
    .sort((a, b) => b.data.pubDate.getTime() - a.data.pubDate.getTime());
  return rss({
    title: "Lecheeel's Blog",
    description: 'writing by lecheeel — things that surprised me',
    site: context.site ?? 'https://lecheeel.github.io',
    items: posts.map((post) => ({
      title: post.data.title,
      description: post.data.description,
      pubDate: post.data.pubDate,
      link: '/blog/' + post.id + '/',
    })),
    customData: '<language>en</language>',
  });
}
