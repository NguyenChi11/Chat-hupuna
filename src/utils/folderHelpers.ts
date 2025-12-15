import type { FolderNode } from '../types/folderTypes';

export function findNodeById(nodes: FolderNode[], id: string | null): FolderNode | null {
  if (!id) return null;
  const stack = [...nodes];
  while (stack.length) {
    const n = stack.shift()!;
    if (n.id === id) return n;
    if (n.children?.length) stack.push(...n.children);
  }
  return null;
}

export function findPath(nodes: FolderNode[], id: string | null): FolderNode[] {
  if (!id) return [];
  const dfs = (arr: FolderNode[]): FolderNode[] => {
    for (const n of arr) {
      if (n.id === id) return [n];
      const child = dfs(n.children || []);
      if (child.length) return [n, ...child];
    }
    return [];
  };
  return dfs(nodes);
}

export function flatten(nodes: FolderNode[]): FolderNode[] {
  const out: FolderNode[] = [];
  const stack = [...nodes];
  while (stack.length) {
    const n = stack.shift()!;
    out.push(n);
    if (n.children?.length) stack.push(...n.children);
  }
  return out;
}

export function updateNode(
  nodes: FolderNode[],
  id: string,
  updater: (n: FolderNode) => FolderNode | null,
): FolderNode[] {
  const loop = (arr: FolderNode[]): FolderNode[] =>
    arr
      .map((n) => {
        if (n.id === id) return updater(n) as FolderNode;
        const children = loop(n.children || []);
        return { ...n, children };
      })
      .filter(Boolean) as FolderNode[];
  return loop(nodes);
}
