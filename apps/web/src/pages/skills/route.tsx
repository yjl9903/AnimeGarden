import { useState } from 'react';
import { Link } from '@tanstack/react-router';
import { ArrowDown, Check, Copy, Wrench } from 'lucide-react';

import Layout from '~/layouts/Layout';
import { OpenInChat } from '~/components/Skills/OpenInChat';
import { SkillPrompt } from '~/components/Skills/SkillPrompt';
import { getKeepShareURL, openMagnetLink } from '~/utils/url';
import { trackSkillsCopy, type TrackSkillsCopyPayload } from '~/utils/umami';

import {
  skillURL,
  skillPrompt,
  skillOptions,
  mcpOptions,
  pluginOptions,
  examples,
  demoResources,
  type SetupOption
} from './content';

import './skills.css';

/** Copies user-selected text and reports clipboard failures without claiming success. */
function CopyButton({
  text,
  tracking,
  label = '复制命令',
  iconOnly = false
}: {
  text: string;
  tracking: TrackSkillsCopyPayload;
  label?: string;
  iconOnly?: boolean;
}) {
  const [status, setStatus] = useState<'idle' | 'copied' | 'failed'>('idle');
  const feedback = status === 'copied' ? '已复制' : status === 'failed' ? '请手动选择复制' : label;

  async function copy() {
    try {
      await navigator.clipboard.writeText(text);
      // Record the action only after the clipboard accepts the text.
      trackSkillsCopy(tracking);
      setStatus('copied');
    } catch {
      setStatus('failed');
    }
  }

  return (
    <button
      type="button"
      className={`skills-copy${iconOnly ? ' skills-copy-icon' : ''}`}
      onClick={copy}
      aria-label={feedback}
      title={feedback}
    >
      {status === 'copied' ? (
        <Check size={iconOnly ? 18 : 14} />
      ) : (
        <Copy size={iconOnly ? 18 : 14} />
      )}
      <span className={iconOnly && status !== 'failed' ? 'sr-only' : undefined} aria-live="polite">
        {feedback}
      </span>
    </button>
  );
}

/** Shares code rendering and copy behavior between standalone blocks and client tabs. */
function SetupContent({ option, source }: { option: SetupOption; source: string }) {
  return (
    <>
      {option.kind === 'prompt' ? (
        <pre className="skills-online-prompt">
          <code>{option.content}</code>
        </pre>
      ) : (
        <pre>
          <code>
            {option.content.split('\n').map((line, index) => {
              const [executable, ...args] = line.split(' ');
              return (
                <span key={index}>
                  {index > 0 && '\n'}
                  <span className="skills-command-executable">{executable}</span>{' '}
                  <span className="skills-command-arguments">{args.join(' ')}</span>
                </span>
              );
            })}
          </code>
        </pre>
      )}
      <CopyButton
        key={option.id}
        text={option.content}
        tracking={{ kind: option.kind, source }}
        label={option.kind === 'prompt' ? '复制提示词' : '复制命令'}
        iconOnly
      />
    </>
  );
}

/** Keeps client choices in a compact keyboard-accessible tabbed panel. */
function SetupPanel({
  id,
  label,
  options
}: {
  id: string;
  label: string;
  options: readonly SetupOption[];
}) {
  const [selectedId, setSelectedId] = useState(options[0].id);
  const selected = options.find((option) => option.id === selectedId) ?? options[0];

  return (
    <>
      <div className="skills-install">
        <div className="skills-client-picker" role="tablist" aria-label={label}>
          {options.map((option, index) => (
            <button
              key={option.id}
              type="button"
              role="tab"
              id={`${id}-tab-${option.id}`}
              className={
                option.id === selected.id ? 'text-pink-600! dark:text-pink-400!' : undefined
              }
              aria-selected={option.id === selected.id}
              aria-controls={`${id}-panel`}
              tabIndex={option.id === selected.id ? 0 : -1}
              onClick={() => setSelectedId(option.id)}
              onKeyDown={(event) => {
                const next =
                  event.key === 'ArrowRight'
                    ? (index + 1) % options.length
                    : event.key === 'ArrowLeft'
                      ? (index + options.length - 1) % options.length
                      : event.key === 'Home'
                        ? 0
                        : event.key === 'End'
                          ? options.length - 1
                          : undefined;
                if (next === undefined) return;

                // Keep selection and keyboard focus together within each independent tab list.
                event.preventDefault();
                setSelectedId(options[next].id);
                event.currentTarget.parentElement
                  ?.querySelectorAll<HTMLButtonElement>('[role="tab"]')
                  [next]?.focus();
              }}
            >
              {option.name}
            </button>
          ))}
        </div>
        <div
          className="skills-terminal"
          id={`${id}-panel`}
          role="tabpanel"
          aria-labelledby={`${id}-tab-${selected.id}`}
          tabIndex={0}
        >
          <SetupContent option={selected} source={`${id}.${selected.id}`} />
        </div>
      </div>
    </>
  );
}

/** Introduces the skill inside the site's shared search, navigation and collection layout. */
export default function SkillsPage() {
  return (
    <Layout heading={false}>
      <div className="skills-page">
        <section className="skills-intro" aria-labelledby="skills-title">
          <div>
            <h1 id="skills-title">
              找动画，
              <br />
              也可以聊着来。
            </h1>
            <p className="skills-lead">把 Anime Garden 带进你的 AI 助手。</p>
            <div className="skills-actions">
              <a href="#use-skill" className="skills-primary bg-pink-600 hover:bg-pink-700">
                开始使用 <ArrowDown size={16} />
              </a>
            </div>
          </div>

          <figure className="skills-conversation" aria-label="Codex 搜索动画资源的静态对话示例">
            <figcaption className="sr-only">使用 AnimeGarden 的静态对话示例</figcaption>
            <div className="skills-chat-body">
              <div className="skills-chat-user-message">
                <div className="skills-chat-user">
                  <SkillPrompt />
                </div>
                <CopyButton
                  text={skillPrompt}
                  tracking={{ kind: 'prompt', source: 'hero' }}
                  label="复制提示词"
                  iconOnly
                />
              </div>
              <div className="skills-chat-activity">
                <div className="skills-chat-status">已完成搜索</div>
                <p className="skills-chat-commentary">
                  我会使用 AnimeGarden 技能查找「上伊那牡丹」第一话的资源。
                </p>
                <div className="skills-chat-tool">
                  <Wrench
                    className="skills-chat-tool-icon"
                    size={16}
                    strokeWidth={1.5}
                    aria-hidden="true"
                  />
                  <span>已读取 AnimeGarden 技能</span>
                </div>
                <div className="skills-chat-tool">
                  <img
                    className="skills-chat-tool-icon"
                    src="/favicon.svg"
                    width={16}
                    height={16}
                    alt=""
                  />
                  <span>已搜索 AnimeGarden</span>
                </div>
              </div>
              <div className="skills-chat-answer">
                <p>找到「上伊那牡丹，醉姿如百合」第 01 话，以下是部分版本：</p>
                {/* Fixed verified resource samples; the demo never implies a live search on page load. */}
                <table>
                  <thead>
                    <tr>
                      <th scope="col">字幕组</th>
                      <th scope="col">规格</th>
                      <th scope="col">大小</th>
                      <th scope="col">播放 / 下载</th>
                    </tr>
                  </thead>
                  <tbody>
                    {demoResources.map((resource) => (
                      <tr key={resource.providerId}>
                        <td>
                          <Link
                            to="/detail/$provider/$providerId"
                            params={{
                              provider: resource.provider,
                              providerId: resource.providerId
                            }}
                          >
                            {resource.fansub}
                          </Link>
                        </td>
                        <td>{resource.specs}</td>
                        <td>{resource.size}</td>
                        <td>
                          <a
                            href={getKeepShareURL(resource.magnet)}
                            target="_blank"
                            rel="noreferrer"
                          >
                            播放
                          </a>
                          {' / '}
                          <a
                            href={resource.magnet}
                            onClick={(event) =>
                              openMagnetLink(
                                event,
                                resource.magnet,
                                `${resource.provider}:${resource.providerId}`,
                                'skills'
                              )
                            }
                          >
                            下载
                          </a>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>
          </figure>
        </section>

        {skillOptions.map((option) => (
          <section
            key={option.id}
            id={option.id === 'online' ? 'use-skill' : 'install-skill'}
            className="skills-section"
            aria-labelledby={`skill-${option.id}-title`}
          >
            <div className="skills-section-heading">
              <h2 id={`skill-${option.id}-title`}>{option.name}</h2>
              {option.kind === 'prompt' && <OpenInChat prompt={option.content} source="direct" />}
            </div>
            <div className="skills-install">
              <div className="skills-terminal">
                <SetupContent option={option} source={option.id} />
              </div>
            </div>
          </section>
        ))}

        <section id="install-mcp" className="skills-section" aria-labelledby="install-mcp-title">
          <div className="skills-section-heading">
            <h2 id="install-mcp-title">安装 MCP</h2>
          </div>
          <SetupPanel id="mcp" label="MCP 客户端" options={mcpOptions} />
        </section>

        <section id="install" className="skills-section" aria-labelledby="install-title">
          <div className="skills-section-heading">
            <h2 id="install-title">安装插件</h2>
          </div>
          <SetupPanel id="plugin" label="插件客户端" options={pluginOptions} />
        </section>

        <section id="examples" className="skills-section" aria-labelledby="examples-title">
          <div className="skills-section-heading">
            <h2 id="examples-title">试着问它</h2>
          </div>
          <div className="skills-examples">
            {examples.map((example) => {
              const prompt = example.prompt.replace('AnimeGarden', `[AnimeGarden](${skillURL})`);
              return (
                <article key={example.title} className="skills-example">
                  <h3>{example.title}</h3>
                  <p>{example.prompt}</p>
                  <div className="flex items-center gap-3">
                    <CopyButton
                      text={prompt}
                      tracking={{ kind: 'example', source: 'example', example: example.title }}
                      label="复制示例"
                    />
                    <OpenInChat prompt={prompt} source="example" example={example.title} />
                  </div>
                </article>
              );
            })}
          </div>
        </section>
      </div>
    </Layout>
  );
}
