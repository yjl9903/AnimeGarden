export const types = ['动画', '合集', '音乐', '日剧', 'RAW', '漫画', '游戏', '特摄', '其他'];

// @unocss-include
export const DisplayTypeColor: Record<string, string> = {
  动画: 'text-red-600',
  合集: 'text-[#ff0000]',
  漫画: 'text-green-600',
  音乐: 'text-purple-600',
  日剧: 'text-blue-600',
  RAW: 'text-[#ffa500]',
  游戏: 'text-[#0eb9e7]',
  特摄: 'text-[#a52a2a]',
  其他: 'text-base-800'
};

export const DisplayTypeIcon: Record<string, string> = {
  动画: 'i-solar:tv-linear',
  合集: 'i-solar:folder-with-files-outline',
  漫画: 'i-solar:notebook-minimalistic-linear',
  音乐: 'i-solar:music-note-2-outline',
  日剧: 'i-solar:videocamera-record-outline',
  RAW: 'i-solar:file-linear',
  游戏: 'i-solar:gamepad-broken',
  特摄: 'i-solar:videocamera-record-outline',
  其他: 'i-solar:document-text-outline'
};
