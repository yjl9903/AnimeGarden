import { JSDOM } from 'jsdom';
import { truncate } from '@animegarden/shared';
import { tradToSimple } from 'simptrad';

export interface DescriptionResult {
  html: string;
  plain: string;
  summary: string;
  images: Array<{ src: string; alt?: string }>;
}

export function normalizeDescription(description: string): DescriptionResult {
  const jsdom = new JSDOM(description);
  const { window } = jsdom;
  const document = jsdom.window.document;

  // 提取所有图片
  const images = Array.from(document.querySelectorAll('img'))
    .map((img) => ({
      src: img.getAttribute('src') || '',
      alt: img.getAttribute('alt') || undefined
    }))
    .filter((img) => img.src);

  // 提取所有有文本内容的节点和 br 节点
  const walker = document.createTreeWalker(
    document.body || document,
    window.NodeFilter.SHOW_TEXT | window.NodeFilter.SHOW_ELEMENT,
    {
      acceptNode: (node) => {
        if (node.nodeType === window.Node.TEXT_NODE) {
          return node.textContent?.trim()
            ? window.NodeFilter.FILTER_ACCEPT
            : window.NodeFilter.FILTER_REJECT;
        } else if (node.nodeType === window.Node.ELEMENT_NODE) {
          const tagName = (node as Element).tagName?.toLowerCase();
          return ['p', 'br', 'div'].includes(tagName)
            ? window.NodeFilter.FILTER_ACCEPT
            : window.NodeFilter.FILTER_SKIP;
        }
        return window.NodeFilter.FILTER_REJECT;
      }
    }
  );

  const parts: string[] = [];
  let node;
  while ((node = walker.nextNode())) {
    if (node.nodeType === window.Node.TEXT_NODE) {
      const text = node.textContent?.trim();
      if (text) {
        if (parts.length === 0) {
          parts.push(text);
        } else {
          parts[parts.length - 1] += text;
        }
      }
    } else if (node.nodeType === window.Node.ELEMENT_NODE) {
      const tagName = (node as Element).tagName?.toLowerCase();
      if (tagName === 'br') {
        parts.push('');
      } else if (['p', 'div'].includes(tagName)) {
        parts.push('');
      }
    }
  }

  parts.splice(0, parts.length, ...parts.map((part) => tradToSimple(part.trim())).filter(Boolean));

  const plain = parts.join('\n');
  const summary = truncate(parts.join(' ').replace(/(簡介|简介):(&nbsp;|\s)*/, ''), 64);

  return {
    html: description,
    plain,
    summary,
    images
  };
}
