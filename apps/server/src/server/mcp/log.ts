import type { Context } from 'hono';

function detectMcpClient(userAgent?: string) {
  const ua = userAgent?.toLowerCase().trim();

  if (!ua) return 'unknown';
  if (ua.includes('claude')) return 'claude';
  if (ua.includes('cursor')) return 'cursor';
  if (ua.includes('vscode')) return 'vscode';
  if (ua.includes('windsurf')) return 'windsurf';
  if (ua.includes('chatgpt')) return 'chatgpt';
  if (ua.includes('curl')) return 'curl';
  if (ua.includes('python')) return 'python';
  if (ua.includes('node')) return 'node';
  if (ua.includes('chrome') || ua.includes('safari') || ua.includes('firefox')) {
    return 'browser';
  }

  return 'unknown';
}

export function getMcpClientInfo(c: Context) {
  const ua = c.req.header('user-agent');
  const contentType = c.req.header('content-type');
  const accept = c.req.header('accept');
  const mcpSessionId = c.req.header('mcp-session-id');
  const mcpProtocolVersion =
    c.req.header('mcp-protocol-version') ?? c.req.header('x-mcp-protocol-version');

  return {
    client: detectMcpClient(ua),
    userAgent: ua,
    contentType,
    accept,
    mcpProtocolVersion,
    sessionId: mcpSessionId
  };
}
