import { useState, useMemo } from 'react';
import { useActiveRecipes } from '@/hooks/useRecipes';
import { Search, Plus, Loader2 } from 'lucide-react';

const categoryFilters = [
  { key: 'todas', label: 'Todas', emoji: '🍽️' },
  { key: 'bolo', label: 'Bolos', emoji: '🎂' },
  { key: 'torta', label: 'Tortas', emoji: '🥧' },
  { key: 'salgado', label: 'Salgados', emoji: '🥪' },
  { key: 'bebida', label: 'Bebidas', emoji: '🥤' },
  { key: 'doce', label: 'Doces', emoji: '🍬' },
  { key: 'outro', label: 'Outros', emoji: '🍴' },
];

const Cardapio = () => {
  const { data: recipes, isLoading } = useActiveRecipes();
  const [search, setSearch] = useState('');
  const [category, setCategory] = useState('todas');

  const filtered = useMemo(() => {
    if (!recipes) return [];
    return recipes.filter(r => {
      const matchesCategory = category === 'todas' || r.category === category;
      const matchesSearch = r.name.toLowerCase().includes(search.toLowerCase());
      return matchesCategory && matchesSearch;
    });
  }, [recipes, search, category]);

  return (
    <div className="min-h-screen bg-white text-gray-900" style={{ fontFamily: "'Inter', 'Segoe UI', sans-serif" }}>
      {/* Header */}
      <header className="sticky top-0 z-50 bg-white border-b border-gray-100 shadow-sm">
        <div className="max-w-7xl mx-auto px-4 py-3 flex items-center gap-4">
          <h1 className="text-xl font-bold text-red-600 whitespace-nowrap">🍰 Cardápio</h1>
          <div className="flex-1 max-w-lg mx-auto relative">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-gray-400" />
            <input
              type="text"
              placeholder="Buscar no cardápio..."
              value={search}
              onChange={e => setSearch(e.target.value)}
              className="w-full pl-10 pr-4 py-2.5 rounded-full bg-gray-100 border-none text-sm text-gray-900 placeholder:text-gray-400 focus:outline-none focus:ring-2 focus:ring-red-500/30"
            />
          </div>
        </div>
      </header>

      {/* Categories */}
      <nav className="sticky top-[61px] z-40 bg-white border-b border-gray-100">
        <div className="max-w-7xl mx-auto px-4 py-3 flex gap-2 overflow-x-auto no-scrollbar">
          {categoryFilters.map(c => (
            <button
              key={c.key}
              onClick={() => setCategory(c.key)}
              className={`flex items-center gap-1.5 px-4 py-2 rounded-full text-sm font-medium whitespace-nowrap transition-all ${
                category === c.key
                  ? 'bg-red-600 text-white shadow-md'
                  : 'bg-gray-100 text-gray-600 hover:bg-gray-200'
              }`}
            >
              <span>{c.emoji}</span>
              {c.label}
            </button>
          ))}
        </div>
      </nav>

      {/* Content */}
      <main className="max-w-7xl mx-auto px-4 py-6">
        {isLoading ? (
          <div className="flex justify-center py-20">
            <Loader2 className="h-8 w-8 animate-spin text-red-500" />
          </div>
        ) : filtered.length === 0 ? (
          <div className="text-center py-20 text-gray-400">
            <p className="text-lg">Nenhum produto encontrado</p>
          </div>
        ) : (
          <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 xl:grid-cols-5 gap-4">
            {filtered.map(recipe => (
              <div
                key={recipe.id}
                className="bg-white rounded-2xl border border-gray-100 shadow-sm hover:shadow-lg transition-shadow overflow-hidden group"
              >
                <div className="aspect-square bg-gray-50 overflow-hidden">
                  {recipe.photo_url ? (
                    <img
                      src={recipe.photo_url}
                      alt={recipe.name}
                      className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-300"
                      loading="lazy"
                    />
                  ) : (
                    <div className="w-full h-full flex items-center justify-center text-5xl">
                      {recipe.category === 'bolo' ? '🎂' : recipe.category === 'torta' ? '🥧' : recipe.category === 'salgado' ? '🥪' : recipe.category === 'bebida' ? '🥤' : recipe.category === 'doce' ? '🍬' : '🍴'}
                    </div>
                  )}
                </div>
                <div className="p-3 space-y-2">
                  <h3 className="font-semibold text-sm text-gray-900 line-clamp-2 leading-tight">
                    {recipe.name}
                  </h3>
                  <div className="flex items-end justify-between">
                    <p className="text-base font-bold text-gray-900">
                      R$ {Number(recipe.sale_price).toFixed(2).replace('.', ',')}
                    </p>
                    <button className="flex items-center justify-center w-8 h-8 rounded-full bg-red-600 text-white hover:bg-red-700 transition-colors shadow-sm">
                      <Plus className="h-4 w-4" />
                    </button>
                  </div>
                </div>
              </div>
            ))}
          </div>
        )}
      </main>

      {/* Hide scrollbar */}
      <style>{`.no-scrollbar::-webkit-scrollbar{display:none}.no-scrollbar{-ms-overflow-style:none;scrollbar-width:none}`}</style>
    </div>
  );
};

export default Cardapio;
