import {
  skillURL,
  skillPrompt,
  skillOptions,
  mcpOptions,
  pluginOptions,
  examples,
  demoResources,
  skillsPageMetadata
} from '~/pages/skills/content';
import { ResponseCacheControl } from '~/utils/response';
import { getChatAppLinks } from '~/components/Skills/chat-apps';
import { buildPageTitle } from '~/utils/seo';
import { getKeepShareURL } from '~/utils/url';

import {
  frontmatter,
  heading,
  paragraph,
  link,
  escapeMarkdown,
  resourceUrl,
  type MarkdownResult
} from './shared.server';

/** Renders the onboarding content without querying live resources or loading the UI. */
export function renderSkillsMarkdown(): MarkdownResult {
  const body =
    frontmatter({
      title: buildPageTitle(skillsPageMetadata.title),
      description: skillsPageMetadata.description
    }) +
    heading(1, '找动画，也可以聊着来。') +
    paragraph('把 Anime Garden 带进你的 AI 助手。') +
    `${link('AnimeGarden Skill', skillURL)}\n\n` +
    skillOptions
      .map(
        (option) =>
          heading(2, option.name) +
          `\`\`\`${option.kind === 'command' ? 'sh' : 'text'}\n${option.content}\n\`\`\`\n\n` +
          (option.kind === 'prompt'
            ? getChatAppLinks(option.content)
                .map((app) => link(`在 ${app.name} 中打开`, app.href))
                .join(' · ') + '\n\n'
            : '')
      )
      .join('') +
    heading(2, '安装 MCP') +
    mcpOptions
      .map((option) => heading(3, option.name) + `\`\`\`sh\n${option.content}\n\`\`\`\n\n`)
      .join('') +
    heading(2, '安装插件') +
    pluginOptions
      .map((option) => heading(3, option.name) + `\`\`\`sh\n${option.content}\n\`\`\`\n\n`)
      .join('') +
    heading(2, '试着问它') +
    examples
      .map(
        (example) =>
          heading(3, example.title) +
          example.prompt.replace('AnimeGarden', `[AnimeGarden](${skillURL})`) +
          '\n\n' +
          getChatAppLinks(example.prompt.replace('AnimeGarden', `[AnimeGarden](${skillURL})`))
            .map((app) => link(`在 ${app.name} 中打开`, app.href))
            .join(' · ') +
          '\n\n'
      )
      .join('') +
    heading(2, '示例对话（静态）') +
    `> ${skillPrompt}\n\n` +
    paragraph('找到「上伊那牡丹，醉姿如百合」第 01 话，以下是部分版本：') +
    '| 字幕组 | 规格 | 大小 | 播放 / 下载 |\n| --- | --- | --- | --- |\n' +
    demoResources
      .map(
        (resource) =>
          `| ${link(resource.fansub, resourceUrl(resource))} | ${escapeMarkdown(resource.specs)} | ${escapeMarkdown(resource.size)} | ${link('播放', getKeepShareURL(resource.magnet))} / ${link('下载', resource.magnet)} |\n`
      )
      .join('');

  return { body, cacheControl: ResponseCacheControl.Docs };
}
