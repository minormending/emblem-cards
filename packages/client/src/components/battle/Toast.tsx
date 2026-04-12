interface ToastProps {
  message: string | null;
}

/**
 * Non-blocking bottom-right message bubble for damage/error feedback.
 * The message lifecycle (show/hide/clear) is managed by gameStore.showMessage.
 */
export function Toast({ message }: ToastProps) {
  if (!message) return null;
  return (
    <div className="fixed bottom-24 right-4 z-50 pointer-events-none animate-[slideUp_0.2s_ease-out]">
      <div className="bg-gray-900 border border-white/20 rounded-lg px-4 py-2 text-sm font-bold text-white shadow-xl">
        {message}
      </div>
    </div>
  );
}
