import Parser from 'rss-parser';
const p = new Parser({
    customFields: {
      item: ['media:content', 'media:thumbnail', 'description', 'content:encoded', 'enclosure']
    }
});
p.parseURL('https://feeds.bbci.co.uk/news/rss.xml').then(feed => {
  const item = feed.items[0];
  console.log(item);
}).catch(console.error);
