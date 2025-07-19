import { describe, it, expect } from 'vitest';

import { normalizeDescription } from '../src/description';

describe('description', () => {
  it('should normalize', () => {
    expect(
      normalizeDescription(`<strong>簡介:&nbsp;</strong><br><hr>
<p><img alt="" src="https://s2.loli.net/2025/07/15/n6PVEL3jzIRgdCu.webp"></p>
<p><strong>保龄球少女！</strong></p>
<p><strong>Turkey!</strong></p>
<p><strong>ターキー！</strong></p>
<p>&nbsp;</p>
<p><strong>字幕：巴哈姆特動畫瘋</strong></p>
<p><strong>脚本&amp;压制：hchsoon</strong></p>
<p><strong>本片简体字幕经过繁化姬处理后生成，请自行判断下载；如有措辞不当，概不负责。</strong>
&nbsp;</p>
<hr>
<p><strong>本组作品首发于：<a href="https://nyaa.si/?f=0&amp;c=0_0&amp;q=lolihouse" rel="external nofollow">nyaa.si</a></strong></p>
<p><strong>另备份发布于：<a href="https://acg.rip/?term=LoliHouse" rel="external nofollow">acg.rip</a> | <a href="https://share.dmhy.org/topics/list?keyword=lolihouse" rel="external nofollow">dmhy.org</a> | <a href="https://bangumi.moe/search/581be821ee98e9ca20730eae" rel="external nofollow">bangumi.moe</a> | <a href="https://share.acgnx.se/team-135-1.html" rel="external nofollow">acgnx.se</a></strong></p>
<p><strong>备份发布情况取决于各站点可用性，如有缺失烦请移步其他站点下载。</strong></p>
<p><strong>其余站点系自发抓取非我组正式发布。</strong></p>
<hr>
<p><strong>为了顺利地观看我们的作品，推荐大家使用以下播放器：</strong></p>
<p><strong>Windows：<a href="https://mpv.io/" rel="external nofollow">mpv</a>（<a href="https://vcb-s.com/archives/7594" rel="external nofollow">教程</a>）</strong></p>
<p><strong>macOS：<a href="https://iina.io/" rel="external nofollow">IINA</a></strong></p>
<p><strong>iOS/Android：<a href="https://www.videolan.org/vlc/" rel="external nofollow">VLC media player</a></strong></p>
<hr>
<p><strong><a href="https://share.dmhy.org/topics/view/599634_LoliHouse_LoliHouse_5th_Anniversary_Announcement.html" rel="external nofollow">点击查看 LoliHouse 五周年纪念公告（附往年全部礼包）</a></strong></p>
<p><strong><a href="https://github.com/AmusementClub/OKP" rel="external nofollow">点击查看 One-Key-Publish 一键发布工具包</a></strong></p>
<hr>
<p><strong>人人为我，我为人人，为了各位观众能快速下载，请使用 uTorrent / qBittorrent 等正规 BT 软件下载，并保持开机上传，谢谢~</strong></p><br>`)
    ).toMatchInlineSnapshot(`
      {
        "html": "<strong>簡介:&nbsp;</strong><br><hr>
      <p><img alt="" src="https://s2.loli.net/2025/07/15/n6PVEL3jzIRgdCu.webp"></p>
      <p><strong>保龄球少女！</strong></p>
      <p><strong>Turkey!</strong></p>
      <p><strong>ターキー！</strong></p>
      <p>&nbsp;</p>
      <p><strong>字幕：巴哈姆特動畫瘋</strong></p>
      <p><strong>脚本&amp;压制：hchsoon</strong></p>
      <p><strong>本片简体字幕经过繁化姬处理后生成，请自行判断下载；如有措辞不当，概不负责。</strong>
      &nbsp;</p>
      <hr>
      <p><strong>本组作品首发于：<a href="https://nyaa.si/?f=0&amp;c=0_0&amp;q=lolihouse" rel="external nofollow">nyaa.si</a></strong></p>
      <p><strong>另备份发布于：<a href="https://acg.rip/?term=LoliHouse" rel="external nofollow">acg.rip</a> | <a href="https://share.dmhy.org/topics/list?keyword=lolihouse" rel="external nofollow">dmhy.org</a> | <a href="https://bangumi.moe/search/581be821ee98e9ca20730eae" rel="external nofollow">bangumi.moe</a> | <a href="https://share.acgnx.se/team-135-1.html" rel="external nofollow">acgnx.se</a></strong></p>
      <p><strong>备份发布情况取决于各站点可用性，如有缺失烦请移步其他站点下载。</strong></p>
      <p><strong>其余站点系自发抓取非我组正式发布。</strong></p>
      <hr>
      <p><strong>为了顺利地观看我们的作品，推荐大家使用以下播放器：</strong></p>
      <p><strong>Windows：<a href="https://mpv.io/" rel="external nofollow">mpv</a>（<a href="https://vcb-s.com/archives/7594" rel="external nofollow">教程</a>）</strong></p>
      <p><strong>macOS：<a href="https://iina.io/" rel="external nofollow">IINA</a></strong></p>
      <p><strong>iOS/Android：<a href="https://www.videolan.org/vlc/" rel="external nofollow">VLC media player</a></strong></p>
      <hr>
      <p><strong><a href="https://share.dmhy.org/topics/view/599634_LoliHouse_LoliHouse_5th_Anniversary_Announcement.html" rel="external nofollow">点击查看 LoliHouse 五周年纪念公告（附往年全部礼包）</a></strong></p>
      <p><strong><a href="https://github.com/AmusementClub/OKP" rel="external nofollow">点击查看 One-Key-Publish 一键发布工具包</a></strong></p>
      <hr>
      <p><strong>人人为我，我为人人，为了各位观众能快速下载，请使用 uTorrent / qBittorrent 等正规 BT 软件下载，并保持开机上传，谢谢~</strong></p><br>",
        "images": [
          {
            "alt": undefined,
            "src": "https://s2.loli.net/2025/07/15/n6PVEL3jzIRgdCu.webp",
          },
        ],
        "plain": "简介:
      保龄球少女！
      Turkey!
      ターキー！
      字幕：巴哈姆特动画疯
      脚本&压制：hchsoon
      本片简体字幕经过繁化姬处理后生成，请自行判断下载；如有措辞不当，概不负责。
      本组作品首发于：nyaa.si
      另备份发布于：acg.rip|dmhy.org|bangumi.moe|acgnx.se
      备份发布情况取决于各站点可用性，如有缺失烦请移步其他站点下载。
      其余站点系自发抓取非我组正式发布。
      为了顺利地观看我们的作品，推荐大家使用以下播放器：
      Windows：mpv（教程）
      macOS：IINA
      iOS/Android：VLC media player
      点击查看 LoliHouse 五周年纪念公告（附往年全部礼包）
      点击查看 One-Key-Publish 一键发布工具包
      人人为我，我为人人，为了各位观众能快速下载，请使用 uTorrent / qBittorrent 等正规 BT 软件下载，并保持开机上传，谢谢~",
        "summary": "保龄球少女！ Turkey! ターキー！ 字幕：巴哈姆特动画疯 脚本&压制：hchsoon 本片简体字幕经过繁化姬处理后生...",
      }
    `);
  });
});
