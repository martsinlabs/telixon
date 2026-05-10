export function resolveInsertText(event: InputEvent): string {
  return event.data ?? event.dataTransfer?.getData('text/plain') ?? '';
}
