export function extractCover(description: string) {
  // 使用正则表达式匹配第一个img标签的src属性
  const imgRegex = /<img[^>]+src=["']([^"']+)["'][^>]*>/i;
  const match = description.match(imgRegex);

  if (match && match[1]) {
    return match[1];
  }

  return undefined;
}
