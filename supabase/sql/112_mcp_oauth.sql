-- Minimal OAuth 2.1 storage for the remote MCP connector (/api/mcp), so
-- hosted clients like claude.ai can connect via Dynamic Client Registration
-- + Authorization Code + PKCE instead of the static bearer token used by
-- local stdio clients (Claude Code, Qwen). Service-role access only; there
-- is no public API surface that reads these tables directly other than the
-- OAuth route handlers, which use the service-role client.

create table if not exists public.mcp_oauth_clients (
  client_id text primary key,
  client_name text,
  redirect_uris text[] not null,
  token_endpoint_auth_method text not null default 'none',
  created_at timestamptz not null default now()
);

alter table public.mcp_oauth_clients enable row level security;

create table if not exists public.mcp_oauth_codes (
  code text primary key,
  client_id text not null references public.mcp_oauth_clients(client_id) on delete cascade,
  user_id uuid not null references auth.users(id) on delete cascade,
  redirect_uri text not null,
  code_challenge text not null,
  scopes text[] not null default '{}',
  resource text,
  expires_at timestamptz not null,
  created_at timestamptz not null default now()
);

alter table public.mcp_oauth_codes enable row level security;

create table if not exists public.mcp_oauth_tokens (
  access_token text primary key,
  refresh_token text unique,
  client_id text not null references public.mcp_oauth_clients(client_id) on delete cascade,
  user_id uuid not null references auth.users(id) on delete cascade,
  scopes text[] not null default '{}',
  resource text,
  expires_at timestamptz not null,
  created_at timestamptz not null default now(),
  revoked_at timestamptz
);

alter table public.mcp_oauth_tokens enable row level security;

create index if not exists mcp_oauth_codes_expires_at_idx on public.mcp_oauth_codes (expires_at);
create index if not exists mcp_oauth_tokens_refresh_token_idx on public.mcp_oauth_tokens (refresh_token);
create index if not exists mcp_oauth_tokens_expires_at_idx on public.mcp_oauth_tokens (expires_at);

-- No public policies: these tables are only ever touched by the OAuth route
-- handlers using the service-role client, which bypasses RLS entirely. RLS
-- is enabled purely as defense in depth (blocks anon/authenticated-key access).
