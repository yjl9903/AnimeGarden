import clsx from 'clsx';
import { useMemo } from 'react';

interface Props {
  files: Array<{
    name: string;

    size: string;
  }>;

  hasMoreFiles: boolean;
}

export function FilesCard({ files, hasMoreFiles }: Props) {
  const tree = useMemo(() => getDirTree(files), [files]);

  return (
    <div className="file-list rounded-md shadow-box">
      <h2 className="text-lg font-bold border-b px4 py2">文件列表</h2>
      <div className="mb4 max-h-[80vh] overflow-auto px4 py4 space-y-2">
        {/* {files.map((f) => (
          <div key={f.name + '_' + f.size} className="py2 flex justify-between items-center gap4">
            <div className="text-sm text-base-600">{f.name}</div>
            <div className="text-xs text-base-400 select-none">{f.size}</div>
          </div>
        ))} */}
        {tree.map((item) => (
          <Tree key={item.name} tree={item} />
        ))}
        {files.length === 0 ? (
          <div className="py2 select-none text-center text-red-400">种子信息解析失败</div>
        ) : undefined}
        {hasMoreFiles ? <div className="text-base-400">...</div> : undefined}
      </div>
    </div>
  );
}

function Tree({ tree, className }: { tree: TreeItem; className?: any }) {
  return (
    <div className={clsx(className)}>
      <div className="flex items-center gap4">
        <div className="flex items-center gap-1">
          <span className={clsx(getIcon(tree))}></span>
          <div className="text-sm text-base-600">{tree.name}</div>
        </div>
        <div className="flex-auto"></div>
        {!tree.directory && <div className="text-xs text-base-400 select-none">{tree.size}</div>}
      </div>
      {tree.directory && tree.children.length > 0 && (
        <div className="my-1 pl-4 py-1 space-y-2 border-l border-l-1">
          {tree.children.map((child) => (
            <Tree key={child.name} tree={child}></Tree>
          ))}
        </div>
      )}
    </div>
  );
}

function getIcon(tree: TreeItem) {
  if (tree.directory) {
    return 'i-ant-design-folder-outlined';
  } else {
    const ext = tree.name.split('.').at(-1);
    switch (ext) {
      case 'mp4':
      case 'mkv':
        return 'i-ant-design-play-circle-outlined';
      case 'ass':
        return 'i-fluent-subtitles-24-regular';
      case 'rar':
      case '7z':
      case 'zip':
        return 'i-ant-design-file-zip-outlined';
      default:
        return 'i-ant-design-file-outlined';
    }
  }
}

interface TreeItem {
  name: string;

  directory: boolean;

  size: string;

  level: number;

  children: TreeItem[];
}

function getDirTree(files: Props['files']) {
  const root: TreeItem = { name: '', directory: true, size: '', level: -1, children: [] };
  for (const file of files) {
    const names = file.name.split('/');

    let node = root;
    for (const part of names) {
      const found = node.children.find((f) => f.name === part);
      if (found) {
        node = found;
      } else {
        const next: TreeItem = {
          name: part,
          directory: true,
          size: '',
          level: node.level + 1,
          children: []
        };
        node.children.push(next);
        node = next;
      }
    }
    node.directory = false;
    node.size = file.size;
  }
  return root.children;
}
