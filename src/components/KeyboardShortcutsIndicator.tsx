export function KeyboardShortcutsIndicator() {
  return (
    <div className="flex justify-end mb-4">
      <div className="text-sm text-gray-500 bg-white px-4 py-2 rounded-lg border border-gray-200 shadow-sm">
        Usa{' '}
        <kbd className="px-2 py-1 bg-gray-100 border border-gray-300 rounded text-xs font-mono mx-1">
          ←
        </kbd>
        <kbd className="px-2 py-1 bg-gray-100 border border-gray-300 rounded text-xs font-mono mx-1">
          →
        </kbd>{' '}
        para navegar entre secciones
      </div>
    </div>
  );
}
