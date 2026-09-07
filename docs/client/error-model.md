# Client Result 与错误模型

`@animegarden/client` 使用两层错误模型：

- `fetchAPI` 是底层请求原语，失败时抛出错误；请求错误使用 `AnimeGardenError`，
  与最终分类一致的原生 `AbortError` / `TimeoutError` 保留原异常对象。
- `fetchStatus`、`fetchResourceDetail`、`fetchCollection`、`generateCollection` 和
  `fetchResources` 是高级 API，将请求失败转换为 `ClientResult`。
- URL、SDK 配置、参数序列化以及调用方 hook 自身抛出的开发者错误不会被转换，继续向外抛出。

## 统一返回类型

```ts
type ClientErrorCode =
  | 'NOT_FOUND'
  | 'BAD_REQUEST'
  | 'RATE_LIMITED'
  | 'SERVER_ERROR'
  | 'NETWORK_ERROR'
  | 'TIMEOUT'
  | 'ABORTED'
  | 'INVALID_RESPONSE';

type ClientFailure = {
  ok: false;
  code: ClientErrorCode;
  error: AnimeGardenError;
};

type ClientResult<T extends object> = ({ ok: true } & T) | ClientFailure;
```

调用方必须先判断 `ok`：

```ts
const result = await fetchResourceDetail('dmhy', providerId);

if (!result.ok) {
  if (result.code === 'NOT_FOUND') {
    // 资源不存在
  }
  console.error(result.error);
  return;
}

console.log(result.resource);
```

`fetchResources` 失败时还会保留已经取得的 `resources`、`pagination`、`filter` 和 `timestamp`，
用于多页请求的部分结果展示。

## 错误分类

| 情况                                | `code`             | `retryable` |
| ----------------------------------- | ------------------ | ----------- |
| HTTP 404                            | `NOT_FOUND`        | 否          |
| HTTP 400–499（404、408、429 除外）  | `BAD_REQUEST`      | 否          |
| HTTP 429                            | `RATE_LIMITED`     | 是          |
| HTTP 5xx                            | `SERVER_ERROR`     | 是          |
| 网络失败                            | `NETWORK_ERROR`    | 是          |
| HTTP 408 或请求超时                 | `TIMEOUT`          | 是          |
| 主动取消                            | `ABORTED`          | 否          |
| 非法 JSON、2xx 错误体或缺少必要字段 | `INVALID_RESPONSE` | 否          |

`AnimeGardenError` 同时保留 `status`、`statusText`、`response`、`body` 和 `original` 等诊断信息。
错误工厂方法统一使用 `from` 前缀：`fromResponse`、`fromOriginalError`、
`fromInvalidResponse` 和 `fromBadRequest`。

取消分类以实际请求信号为准：信号已取消时，`TimeoutError` 原因归为 `TIMEOUT`，其他原因均归为
`ABORTED`，包括调用方传入的普通 `Error`、字符串、对象和 `null`。只有信号未取消时才根据传输
异常判断取消、超时或网络失败。自定义取消原因不会被误标为可重试的 `NETWORK_ERROR`。

该规则覆盖请求发出前、等待响应、读取成功或失败响应体、限流等待和分页之间。已取消的请求
不会再调用 fetch，调用方取消后也不会继续重试或请求下一页；列表仍保留已经取得的部分结果。
hook 或 progress 自身抛出的开发者错误继续向外抛出，即使它们同时取消了请求。

收到 HTTP 429 后，即使退避等待被请求超时中断，也保留已经收到的 `RATE_LIMITED` 分类、HTTP 状态和
响应体；这也适用于调用方传入的超时信号。其他主动取消原因仍返回 `ABORTED`。

收到成功响应头后，读取响应体时发生的取消、超时或连接中断仍分别归为 `ABORTED`、`TIMEOUT`
和 `NETWORK_ERROR`，并保留响应与原始异常。请求信号因超时中断时，即使响应体只抛出
`AbortError`，也保留 `TIMEOUT` 分类。响应体完整读取后的 JSON 语法错误才归为 `INVALID_RESPONSE`。

高级 API 会先校验响应的顶层对象，JSON `null`、数组和其他非对象值统一返回 `INVALID_RESPONSE`，
不会泄漏字段访问产生的 `TypeError`。底层 `fetchAPI` 仍允许返回这些合法 JSON 值。

响应中的日期字段只接受有效的 `Date`、字符串或数字。`null`、布尔值和无效日期会作为
`INVALID_RESPONSE` 返回；已解析筛选条件中的 `before`、`after` 也不保留 `null`。

## 底层 fetchAPI

`fetchAPI` 保持 throw 语义，供需要直接处理 HTTP 的底层调用使用：

```ts
try {
  const body = await fetchAPI('resources');
} catch (error) {
  if (error instanceof AnimeGardenError) {
    console.error(error.code, error.retryable, error.status);
  }
}
```

它会将 HTTP 错误、网络失败和响应解析错误包装为 `AnimeGardenError`，并防御 HTTP 2xx 中的
`{ status: 'ERROR' }`。标准取消或超时异常在没有响应上下文、且名称与信号分类一致时保留原对象；
其他取消原因包装为 `AnimeGardenError`。高级 API 会把这两种异常形式统一转换成失败 Result。
`fetchAPI` 当前仍从包主入口导出。
