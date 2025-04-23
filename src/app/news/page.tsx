import { News } from '../../../utils/supabase/types';
import { createClient } from '@supabase/supabase-js';

async function getNews() {
  const supabase = createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL || '',
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY || '',
  );

  const { data } = await supabase
    .from('news')
    .select('*')
    .order('published_at', { ascending: false });
  return data as News[];
}

export default async function NewsPage() {
  const news = await getNews();

  return (
    <div className="container mx-auto py-8">
      <h1 className="text-3xl font-bold mb-6">Latest News</h1>

      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
        {news?.map((article) => (
          <div
            key={article.id}
            className="border rounded-lg overflow-hidden shadow-sm hover:shadow-md transition-shadow"
          >
            {article.image_url && (
              <img
                src={article.image_url}
                alt={article.title}
                className="w-full h-48 object-cover"
              />
            )}
            <div className="p-4">
              <p className="text-sm text-gray-500 mb-1">
                {new Date(article.published_at).toLocaleDateString()} •{' '}
                {article.category}
              </p>
              <h2 className="text-xl font-semibold mb-2">{article.title}</h2>
              <p className="text-gray-600 mb-3">{article.summary}</p>
              <div className="flex items-center text-sm">
                <span>By {article.author || 'Unknown'}</span>
              </div>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}
