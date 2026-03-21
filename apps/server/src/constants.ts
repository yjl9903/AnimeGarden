export const anonymous = 'anonymous';

/**
 * 通知 resources 变化的 Redis channel
 */
export const NOTIFY_CHANNEL = `notify-resources`;

/**
 * 调用 cron 服务的命令
 */
export const RPC_INVOKE_CHANNEL = `invoke-rpc`;

/**
 * 响应 cron 服务的命令
 */
export const RPC_REPLY_CHANNEL = `reply-rpc`;

/**
 * 最大同时存活缓存任务个数
 */
export const MAX_RESOURCES_TASK_COUNT = 100;

/**
 * 最大同时存活收藏夹个数
 */
export const MAX_COLLECTION_COUNT = 100;

/**
 * 单个任务缓存预取数量
 */
export const RESOURCES_TASK_PREFETCH_COUNT = 1000;

/**
 * 单个任务内存缓存允许预取的最大资源数量
 */
export const RESOURCES_TASK_PREFETCH_MAX_COUNT = 5000;

/**
 * 详情信息过期时间
 */
export const DETAIL_EXPIRE = 7 * 24 * 60 * 60;
