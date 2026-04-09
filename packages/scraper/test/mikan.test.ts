import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';

import { fetchMikanDetail, fetchMikanPage } from '../src/mikan';

const LIST_HTML = `
<!doctype html>
<html>
  <body>
    <table class="table table-striped tbl-border fadeIn">
      <tbody>
        <tr>
          <td>今天 22:04</td>
          <td>
            <a href="/Home/PublishGroup/392" target="_blank" class="magnet-link-wrap">Kirara Fantasia</a>
          </td>
          <td>
            <a href="/Home/Episode/765fcf5524c805231d25f74d4c90c41a5abab6dc" target="_blank" class="magnet-link-wrap">[黑ネズミたち] 库吉马唱歌的家 / Kujima Utaeba Ie Hororo - 01 (CR 1920x1080 AVC AAC MKV)</a>
            <a
              data-clipboard-text="magnet:?xt=urn:btih:765fcf5524c805231d25f74d4c90c41a5abab6dc&amp;tr=http%3a%2f%2ft.nyaatracker.com%2fannounce&amp;tr=http%3a%2f%2ftracker.kamigami.org%3a2710%2fannounce"
              class="js-magnet magnet-link"
            >[复制磁连]</a>
          </td>
          <td>781.1 MB</td>
          <td><a href="/Download/20260409/765fcf5524c805231d25f74d4c90c41a5abab6dc.torrent">下载</a></td>
          <td><a target="_blank" href="https://keepshare.org/rclukaia/magnet%3A%3Fxt%3Durn%3Abtih%3A765fcf5524c805231d25f74d4c90c41a5abab6dc">播放</a></td>
        </tr>
        <tr>
          <td>今天 22:01</td>
          <td>
            <a href="/Home/PublishGroup/359" target="_blank" class="magnet-link-wrap">ANi</a>
          </td>
          <td>
            <a href="/Home/Episode/c635df597c3f143437bb8aa0d334da14570fdd79" target="_blank" class="magnet-link-wrap">[ANi]  库吉马唱歌的家 - 01 [1080P][Baha][WEB-DL][AAC AVC][CHT][MP4]</a>
            <a
              data-clipboard-text="magnet:?xt=urn:btih:c635df597c3f143437bb8aa0d334da14570fdd79&amp;tr=http%3a%2f%2ft.nyaatracker.com%2fannounce"
              class="js-magnet magnet-link"
            >[复制磁连]</a>
          </td>
          <td>353.7 MB</td>
          <td><a href="/Download/20260409/c635df597c3f143437bb8aa0d334da14570fdd79.torrent">下载</a></td>
          <td><a target="_blank" href="https://keepshare.org/rclukaia/magnet%3A%3Fxt%3Durn%3Abtih%3Ac635df597c3f143437bb8aa0d334da14570fdd79">播放</a></td>
        </tr>
        <tr>
          <td>昨天 23:00</td>
          <td>
            <div class="dropdown">
              <div class="dropdown-toggle magnet-link-wrap" data-toggle="dropdown">
                <span>悠哈璃羽字幕社&amp;西农YUI汉化组</span>
                <span><i class="fa fa-angle-down" aria-hidden="true"></i></span>
              </div>
              <ul class="dropdown-menu material-dropdown-menu" style="top: 20px; margin-left: 0;">
                <li><a href="/Home/PublishGroup/12" class="material-dropdown-menu__link" target="_blank">悠哈C9字幕社</a></li>
                <li><a href="/Home/PublishGroup/97" class="material-dropdown-menu__link" target="_blank">西农YUI汉化组</a></li>
              </ul>
            </div>
          </td>
          <td>
            <a href="/Home/Episode/22ab4969f1aa0c058bfbd014be802b6cc1956eb2" target="_blank" class="magnet-link-wrap">【悠哈璃羽字幕社&amp;西农YUI汉化组】[暗芝居 第十六季_Yami Shibai 16][13][x264 1080p][CHT]</a>
            <a
              data-clipboard-text="magnet:?xt=urn:btih:22ab4969f1aa0c058bfbd014be802b6cc1956eb2&amp;tr=http%3a%2f%2ft.nyaatracker.com%2fannounce&amp;tr=http%3a%2f%2ftracker.kamigami.org%3a2710%2fannounce"
              class="js-magnet magnet-link"
            >[复制磁连]</a>
          </td>
          <td>59.8MB</td>
          <td><a href="/Download/20260408/22ab4969f1aa0c058bfbd014be802b6cc1956eb2.torrent">下载</a></td>
          <td><a target="_blank" href="https://keepshare.org/rclukaia/magnet%3A%3Fxt%3Durn%3Abtih%3A22ab4969f1aa0c058bfbd014be802b6cc1956eb2">播放</a></td>
        </tr>
      </tbody>
    </table>
  </body>
</html>
`;

const DETAIL_HTML = `
<!doctype html>
<html>
  <head>
    <title>【悠哈璃羽字幕社&amp;西农YUI汉化组】[暗芝居 第十六季_Yami Shibai 16][13][x264 1080p][CHT] - Mikan Project</title>
  </head>
  <body>
    <div class="leftbar-container">
      <div class="dropdown" style="padding-bottom: 10px; cursor: pointer;">
        <div class="dropdown-toggle material-dropdown__btn" data-toggle="dropdown" style="padding-left: 0;">
          <span style="cursor: text; font-size: 12px;">字幕组：</span>
          <span class="magnet-link-wrap">
            <span style="font-size: 12px;">悠哈璃羽字幕社&amp;西农YUI汉化组</span>
            <span><i class="fa fa-angle-down" aria-hidden="true"></i></span>
          </span>
        </div>
        <ul class="dropdown-menu material-dropdown-menu" style="top: 20px; margin-left: 0;">
          <li><a href="/Home/PublishGroup/12" class="material-dropdown-menu__link" target="_blank">悠哈C9字幕社</a></li>
          <li><a href="/Home/PublishGroup/97" class="material-dropdown-menu__link" target="_blank">西农YUI汉化组</a></li>
        </ul>
      </div>
      <p class="bangumi-info">发布日期：昨天 23:00</p>
      <p class="bangumi-info">文件大小：59.8MB</p>
      <div class="leftbar-nav">
        <a class="btn episode-btn" href="/Download/20260408/22ab4969f1aa0c058bfbd014be802b6cc1956eb2.torrent">下载种子</a>
        <a class="btn episode-btn" href="magnet:?xt=urn:btih:22ab4969f1aa0c058bfbd014be802b6cc1956eb2&amp;tr=http%3a%2f%2ft.nyaatracker.com%2fannounce&amp;tr=http%3a%2f%2ftracker.kamigami.org%3a2710%2fannounce">磁力链接</a>
      </div>
    </div>
    <div class="central-container">
      <div class="episode-header">
        <p class="episode-title">【悠哈璃羽字幕社&amp;西农YUI汉化组】[暗芝居 第十六季_Yami Shibai 16][13][x264 1080p][CHT] [59.8MB]</p>
      </div>
      <div style="padding-bottom: 20px" class="episode-desc">
        <div style="margin-top: -10px; margin-bottom: 10px;">
          <div style="width: 100%; margin-right: auto; margin-left: auto;" class="hidden-xs hidden-sm">
            <a href="https://equity.tmall.com/tm?agentId=030f9003a26d4361">
              <img src="/images/SSWJ/sswj6_lg.jpg" />
            </a>
          </div>
        </div>
        <p><img alt="" src="https://i.loli.net/2021/07/14/NVgM7KsRaDljU3d.png" /></p>
        <p>──────────────────────────────</p>
        <p><strong>你可以</strong></p>
        <p>● 跟兴趣相投的伙伴一起为动画传播奉献力量</p>
        <p>● 有意加入请加 Q 群：<strong>801237938</strong></p>
      </div>
    </div>
  </body>
</html>
`;

const DETAIL_HTML_WITH_PLAIN_SUBGROUP = `
<!doctype html>
<html>
  <head>
    <title>[DBD-Raws][返乡战士/帝皇战纪/Overman King Gainer][01-26TV全集+特典][1080P][BDRip][HEVC-10bit][简繁外挂][FLAC][MKV](オーバーマン キングゲイナー) - Mikan Project</title>
  </head>
  <body>
    <div class="leftbar-container">
      <p class="bangumi-info">字幕组：DBD制作组</p>
      <p class="bangumi-info">发布日期：今天 22:48</p>
      <p class="bangumi-info">文件大小：45.1GB</p>
      <div class="leftbar-nav">
        <a class="btn episode-btn" href="/Download/20260409/2599120547acc6f8904a316a14cb384801b8303e.torrent">下载种子</a>
        <a class="btn episode-btn" href="magnet:?xt=urn:btih:2599120547acc6f8904a316a14cb384801b8303e&amp;tr=http%3a%2f%2ft.nyaatracker.com%2fannounce&amp;tr=http%3a%2f%2ftracker.kamigami.org%3a2710%2fannounce">磁力链接</a>
      </div>
    </div>
    <div class="central-container">
      <div class="episode-header">
        <p class="episode-title">[DBD-Raws][返乡战士/帝皇战纪/Overman King Gainer][01-26TV全集+特典][1080P][BDRip][HEVC-10bit][简繁外挂][FLAC][MKV](オーバーマン キングゲイナー) [45.1GB]</p>
      </div>
      <div class="episode-desc">
        <div style="margin-top: -10px; margin-bottom: 10px;">
          <div class="hidden-xs hidden-sm">
            <a href="https://equity.tmall.com/tm?agentId=030f9003a26d4361">
              <img src="/images/SSWJ/sswj7_lg.jpg" />
            </a>
          </div>
        </div>
        <p>片名：返乡战士/帝皇战纪/Overman King Gainer</p>
      </div>
    </div>
  </body>
</html>
`;

function createFetch(routes: Record<string, string>) {
  return async (request: string) => {
    const body = routes[request];
    if (!body) {
      return new Response('Not found', { status: 404 });
    }
    return new Response(body, { status: 200 });
  };
}

describe('mikan', () => {
  beforeEach(() => {
    vi.useFakeTimers();
    vi.setSystemTime(new Date('2026-04-09T12:00:00+08:00'));
  });

  afterEach(() => {
    vi.useRealTimers();
  });

  it('should parse list page and keep the first publish group when multiple groups exist', async () => {
    const fetch = createFetch({
      'https://mikanani.kas.pub/Home/Classic/1': LIST_HTML
    });

    const resources = await fetchMikanPage(fetch, { page: 1, retry: 0 });

    expect(resources).toHaveLength(3);
    expect(resources[0]).toMatchObject({
      provider: 'mikan',
      providerId: '765fcf5524c805231d25f74d4c90c41a5abab6dc',
      href: '765fcf5524c805231d25f74d4c90c41a5abab6dc',
      type: '动画',
      size: '781.1 MB',
      publisher: {
        id: '392',
        name: 'Kirara Fantasia'
      },
      fansub: {
        id: '392',
        name: 'Kirara Fantasia'
      },
      createdAt: '2026-04-09T14:04:00.000Z'
    });
    expect(resources[0].magnet).toBe('magnet:?xt=urn:btih:765fcf5524c805231d25f74d4c90c41a5abab6dc');
    expect(resources[0].tracker).toBe(
      '&tr=http%3a%2f%2ft.nyaatracker.com%2fannounce&tr=http%3a%2f%2ftracker.kamigami.org%3a2710%2fannounce'
    );

    expect(resources[1]?.title).toBe('[ANi] 库吉马唱歌的家 - 01 [1080P][Baha][WEB-DL][AAC AVC][CHT][MP4]');

    expect(resources[2]).toMatchObject({
      providerId: '22ab4969f1aa0c058bfbd014be802b6cc1956eb2',
      href: '22ab4969f1aa0c058bfbd014be802b6cc1956eb2',
      size: '59.8MB',
      publisher: {
        id: '12',
        name: '悠哈C9字幕社'
      },
      fansub: {
        id: '12',
        name: '悠哈C9字幕社'
      },
      createdAt: '2026-04-08T15:00:00.000Z'
    });
  });

  it('should parse detail page and strip ad blocks from description', async () => {
    const fetch = createFetch({
      'https://mikanani.kas.pub/Home/Episode/22ab4969f1aa0c058bfbd014be802b6cc1956eb2': DETAIL_HTML
    });

    const detail = await fetchMikanDetail(fetch, '22ab4969f1aa0c058bfbd014be802b6cc1956eb2', {
      retry: 0
    });

    expect(detail).toMatchObject({
      provider: 'mikan',
      providerId: '22ab4969f1aa0c058bfbd014be802b6cc1956eb2',
      title: '【悠哈璃羽字幕社&西农YUI汉化组】[暗芝居 第十六季_Yami Shibai 16][13][x264 1080p][CHT]',
      href: 'https://mikanani.kas.pub/Home/Episode/22ab4969f1aa0c058bfbd014be802b6cc1956eb2',
      type: '动画',
      size: '59.8MB',
      publisher: {
        id: '12',
        name: '悠哈C9字幕社'
      },
      fansub: {
        id: '12',
        name: '悠哈C9字幕社'
      },
      createdAt: '2026-04-08T15:00:00.000Z',
      files: [],
      hasMoreFiles: false
    });

    expect(detail?.magnets).toEqual([
      {
        name: '种子',
        url: 'https://mikanani.kas.pub/Download/20260408/22ab4969f1aa0c058bfbd014be802b6cc1956eb2.torrent'
      },
      {
        name: '磁力链接',
        url: 'magnet:?xt=urn:btih:22ab4969f1aa0c058bfbd014be802b6cc1956eb2&tr=http%3a%2f%2ft.nyaatracker.com%2fannounce&tr=http%3a%2f%2ftracker.kamigami.org%3a2710%2fannounce'
      }
    ]);
    expect(detail?.description).toContain('801237938');
    expect(detail?.description).toContain('NVgM7KsRaDljU3d.png');
    expect(detail?.description).not.toContain('SSWJ');
  });

  it('should parse detail date by label instead of the first bangumi-info item', async () => {
    const fetch = createFetch({
      'https://mikanani.kas.pub/Home/Episode/2599120547acc6f8904a316a14cb384801b8303e':
        DETAIL_HTML_WITH_PLAIN_SUBGROUP
    });

    const detail = await fetchMikanDetail(fetch, '2599120547acc6f8904a316a14cb384801b8303e', {
      retry: 0
    });

    expect(detail).toMatchObject({
      provider: 'mikan',
      providerId: '2599120547acc6f8904a316a14cb384801b8303e',
      title:
        '[DBD-Raws][返乡战士/帝皇战纪/Overman King Gainer][01-26TV全集+特典][1080P][BDRip][HEVC-10bit][简繁外挂][FLAC][MKV](オーバーマン キングゲイナー)',
      size: '45.1GB',
      createdAt: '2026-04-09T14:48:00.000Z',
      magnets: [
        {
          name: '种子',
          url: 'https://mikanani.kas.pub/Download/20260409/2599120547acc6f8904a316a14cb384801b8303e.torrent'
        },
        {
          name: '磁力链接',
          url: 'magnet:?xt=urn:btih:2599120547acc6f8904a316a14cb384801b8303e&tr=http%3a%2f%2ft.nyaatracker.com%2fannounce&tr=http%3a%2f%2ftracker.kamigami.org%3a2710%2fannounce'
        }
      ],
      files: [],
      hasMoreFiles: false
    });
    expect(detail?.publisher).toBeUndefined();
    expect(detail?.fansub).toBeUndefined();
  });
});
