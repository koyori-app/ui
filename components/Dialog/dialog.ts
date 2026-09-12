/* サーバー描画では ref が null。open 属性は触らず、showModal と close だけで同期する。 */
export function syncDialog(dialog: HTMLDialogElement | null, open: boolean) {
  if (!dialog || dialog.open === open) return;
  if (open) dialog.showModal();
  else dialog.close();
}
