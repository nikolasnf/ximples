import Link from 'next/link';

export default function PageNotFound() {
  return (
    <div className="min-h-screen bg-gray-50 flex items-center justify-center p-6">
      <div className="text-center max-w-md">
        <p className="text-6xl font-bold text-[#183A6B] mb-4">404</p>
        <h1 className="text-2xl font-bold text-gray-900 mb-2">Página não encontrada</h1>
        <p className="text-gray-600 mb-8">
          Esta página não existe, foi removida ou ainda não foi publicada.
        </p>
        <Link
          href="/"
          className="inline-block bg-[#183A6B] text-white font-semibold px-6 py-3 rounded-xl hover:bg-[#122C52] transition-colors"
        >
          Ir para o Ximples
        </Link>
      </div>
    </div>
  );
}
