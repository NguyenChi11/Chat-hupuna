export const insertTextAtCursor = (editable: HTMLDivElement, text: string) => {
  const selection = window.getSelection();
  if (!selection || selection.rangeCount === 0) {
    editable.appendChild(document.createTextNode(text));
    return;
  }

  const range = selection.getRangeAt(0);

  // Đảm bảo range nằm bên trong editable
  let current: Node | null = range.commonAncestorContainer;
  let isInside = false;
  while (current) {
    if (current === editable) {
      isInside = true;
      break;
    }
    current = current.parentNode;
  }

  if (!isInside) {
    editable.appendChild(document.createTextNode(text));
    return;
  }

  range.deleteContents();
  const textNode = document.createTextNode(text);
  range.insertNode(textNode);

  // Di chuyển caret sau emoji vừa chèn
  range.setStartAfter(textNode);
  range.collapse(true);
  selection.removeAllRanges();
  selection.addRange(range);
};


