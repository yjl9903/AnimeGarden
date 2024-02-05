export function hydrateNodes(selector: string, handler: (node: Element) => void | Promise<void>) {
  document.addEventListener('astro:page-load', () => {
    const nodes = document.querySelectorAll(selector);
    nodes.forEach((node) => {
      handler(node);
    });
  });
}

export function hydrateNodesEvent(
  selector: string,
  event: string,
  handler: (node: Element, event: Event) => void | Promise<void>
) {
  hydrateNodes(selector, (node) => {
    node.addEventListener(event, (ev) => {
      handler(node, ev);
    });
  });
}
