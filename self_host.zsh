#!/usr/bin/env zsh

set -euo pipefail

ROOT_DIR="${0:A:h}"
STATE_DIR="$ROOT_DIR/.self_host"
CONFIG_FILE="$STATE_DIR/config.env"
APP_ENV_FILE="$STATE_DIR/app.env"
RUN_APP_SCRIPT="$STATE_DIR/run_app.zsh"
DOCKER_COMPOSE_FILE="$STATE_DIR/docker-compose.yml"
LOG_DIR="$STATE_DIR/logs"
APP_LOG="$LOG_DIR/app.log"
INFRA_LOG="$LOG_DIR/infra.log"
CADDYFILE="${SELF_HOST_CADDYFILE:-$HOME/Caddyfile}"
DEFAULT_PUBLIC_URL="${SELF_HOST_PUBLIC_URL:-http://avalon.pinky.lilf.ir}"
DEFAULT_NODE_VERSION="${SELF_HOST_NODE_VERSION:-20.20.0}"
DEFAULT_APP_PORT="${SELF_HOST_APP_PORT:-3301}"
DEFAULT_MONGO_PORT="${SELF_HOST_MONGO_PORT:-27017}"
DEFAULT_MINIO_PORT="${SELF_HOST_MINIO_PORT:-9000}"
MONGO_IMAGE="${SELF_HOST_MONGO_IMAGE:-mongo:7}"
MINIO_IMAGE="${SELF_HOST_MINIO_IMAGE:-minio/minio:latest}"
DOCKER_DAEMON_JSON="${SELF_HOST_DOCKER_DAEMON_JSON:-/etc/docker/daemon.json}"
APP_SESSION="proavalon-selfhost-app"
INFRA_SESSION="proavalon-selfhost-infra"
CADDY_BEGIN="# BEGIN ProAvalon self-host"
CADDY_END="# END ProAvalon self-host"
S3_BUCKET_NAME="proavalon"

proxy_vars=(
  ALL_PROXY all_proxy
  HTTP_PROXY HTTPS_PROXY NO_PROXY
  http_proxy https_proxy no_proxy
  npm_config_proxy npm_config_https_proxy
  NPM_CONFIG_PROXY NPM_CONFIG_HTTPS_PROXY
)

usage() {
  cat <<USAGE
Usage:
  ./self_host.zsh setup [public_url]
  ./self_host.zsh redeploy
  ./self_host.zsh start
  ./self_host.zsh stop

Default public_url: $DEFAULT_PUBLIC_URL
USAGE
}

tmuxnew () {
  local session="$1"
  shift

  tmux kill-session -t "$session" &>/dev/null || true
  tmux new-session -d -s "$session" "$@"
}

tmuxnew_with_env() {
  local session="$1"
  shift
  local command="$1"
  shift
  local -a tmux_args=(-d -s "$session")
  local env_assignment

  for env_assignment in "$@"; do
    tmux_args+=(-e "$env_assignment")
  done

  tmux kill-session -t "$session" &>/dev/null || true
  tmux new-session "${tmux_args[@]}" "$command"
}

die() {
  print -u2 -- "Error: $*"
  exit 1
}

note() {
  print -- "==> $*"
}

require_command() {
  command -v "$1" >/dev/null 2>&1 || die "Missing required command: $1"
}

ensure_prerequisites() {
  require_command tmux
  require_command caddy
  require_command docker
  require_command pnpm
  require_command python3
  require_command ss
  zsh -lc 'source ~/.shared.sh >/dev/null 2>&1 || true; type nvm-load >/dev/null 2>&1' \
    || die 'nvm-load is required in zsh login shells'
}

ensure_dirs() {
  mkdir -p "$STATE_DIR" "$LOG_DIR" "$STATE_DIR/data/mongodb" "$STATE_DIR/data/minio"
}

build_proxy_exports() {
  local var value
  local -a exports=()

  for var in "${proxy_vars[@]}"; do
    if (( ${+parameters[$var]} )); then
      value="${(P)var}"
      exports+=("export $var=${(qqq)value}")
    fi
  done

  print -r -- "${(F)exports}"
}

build_docker_env_prefix() {
  local var
  local -a prefix=(env)

  for var in "${proxy_vars[@]}"; do
    prefix+=(-u "$var")
  done

  print -r -- "${(j: :)${(@q)prefix}}"
}

get_configured_registry_mirror() {
  local configured_mirror="${SELF_HOST_REGISTRY_MIRROR:-}"

  if [[ -n "$configured_mirror" ]]; then
    print -r -- "$configured_mirror"
    return
  fi

  [[ -f "$DOCKER_DAEMON_JSON" ]] || return 0

  python3 - "$DOCKER_DAEMON_JSON" <<'PY'
import json
import sys

path = sys.argv[1]

try:
    with open(path, 'r', encoding='utf-8') as handle:
        data = json.load(handle)
except Exception:
    raise SystemExit(0)

mirrors = data.get('registry-mirrors') or []
if mirrors:
    print(str(mirrors[0]).rstrip('/'))
PY
}

resolve_docker_image_ref() {
  local image_ref="$1"
  local mirror
  mirror="$(get_configured_registry_mirror)"

  if [[ -z "$mirror" ]]; then
    print -r -- "$image_ref"
    return
  fi

  local mirror_without_scheme="${mirror#http://}"
  mirror_without_scheme="${mirror_without_scheme#https://}"
  mirror_without_scheme="${mirror_without_scheme%/}"

  local image_name="${image_ref%%:*}"
  local image_tag=""
  if [[ "$image_ref" == *:* ]]; then
    image_tag=":${image_ref##*:}"
  fi

  local image_path="$image_ref"
  if [[ "$image_name" != */* ]]; then
    image_path="library/${image_ref}"
  fi

  print -r -- "${mirror_without_scheme}/${image_path}"
}

normalize_public_url() {
  python3 - "$1" <<'PY'
import sys
from urllib.parse import urlparse

raw = sys.argv[1].strip()
parsed = urlparse(raw)
if parsed.scheme not in {'http', 'https'}:
    raise SystemExit('public_url must begin with http:// or https://')
if not parsed.netloc:
    raise SystemExit('public_url must include a hostname')
if parsed.path not in ('', '/'):
    raise SystemExit('public_url must not include a path')
if parsed.params or parsed.query or parsed.fragment:
    raise SystemExit('public_url must not include params, query, or fragment')
print(f'{parsed.scheme}://{parsed.netloc}')
PY
}

set_public_url_values() {
  local normalized_url="$1"
  local parsed

  parsed="$(python3 - "$normalized_url" <<'PY'
import shlex
import sys
from urllib.parse import urlparse
parsed = urlparse(sys.argv[1])
print(f"PUBLIC_URL={shlex.quote(sys.argv[1])}")
print(f"PUBLIC_SCHEME={shlex.quote(parsed.scheme)}")
print(f"PUBLIC_HOSTPORT={shlex.quote(parsed.netloc)}")
print(f"PUBLIC_HOST={shlex.quote(parsed.hostname or '')}")
PY
)"
  eval "$parsed"
}

random_hex() {
  openssl rand -hex "$1"
}

port_in_use() {
  local port="$1"
  ss -ltn | awk '{print $4}' | grep -Eq "(^|:)$port$"
}

choose_free_port() {
  local preferred="$1"
  local candidate="$preferred"

  while port_in_use "$candidate"; do
    candidate="$(( candidate + 1 ))"
  done

  print -r -- "$candidate"
}

load_existing_config_if_present() {
  if [[ -f "$CONFIG_FILE" ]]; then
    source "$CONFIG_FILE"
  fi
}

persist_config() {
  local requested_url="$1"
  ensure_dirs
  load_existing_config_if_present

  local normalized_url
  normalized_url="$(normalize_public_url "$requested_url")" || die 'Invalid public URL'
  set_public_url_values "$normalized_url"

  NODE_VERSION="${NODE_VERSION:-$DEFAULT_NODE_VERSION}"
  APP_PORT="$(choose_free_port "${APP_PORT:-$DEFAULT_APP_PORT}")"
  MONGO_PORT="$(choose_free_port "${MONGO_PORT:-$DEFAULT_MONGO_PORT}")"
  MINIO_PORT="$(choose_free_port "${MINIO_PORT:-$DEFAULT_MINIO_PORT}")"
  MONGO_USERNAME="${MONGO_USERNAME:-root}"
  MONGO_PASSWORD="${MONGO_PASSWORD:-$(random_hex 18)}"
  MINIO_ROOT_USER="${MINIO_ROOT_USER:-admin}"
  MINIO_ROOT_PASSWORD="${MINIO_ROOT_PASSWORD:-$(random_hex 18)}"
  SESSION_SECRET="${SESSION_SECRET:-$(random_hex 24)}"

  cat > "$CONFIG_FILE" <<EOF_CONFIG
PUBLIC_URL='${PUBLIC_URL}'
PUBLIC_SCHEME='${PUBLIC_SCHEME}'
PUBLIC_HOSTPORT='${PUBLIC_HOSTPORT}'
PUBLIC_HOST='${PUBLIC_HOST}'
NODE_VERSION='${NODE_VERSION}'
APP_PORT='${APP_PORT}'
MONGO_PORT='${MONGO_PORT}'
MINIO_PORT='${MINIO_PORT}'
MONGO_USERNAME='${MONGO_USERNAME}'
MONGO_PASSWORD='${MONGO_PASSWORD}'
MINIO_ROOT_USER='${MINIO_ROOT_USER}'
MINIO_ROOT_PASSWORD='${MINIO_ROOT_PASSWORD}'
SESSION_SECRET='${SESSION_SECRET}'
EOF_CONFIG
}

load_config() {
  [[ -f "$CONFIG_FILE" ]] || die "Missing $CONFIG_FILE. Run ./self_host.zsh setup first."
  source "$CONFIG_FILE"
}

write_docker_compose_file() {
  local mongo_image_ref minio_image_ref
  mongo_image_ref="$(resolve_docker_image_ref "$MONGO_IMAGE")"
  minio_image_ref="$(resolve_docker_image_ref "$MINIO_IMAGE")"

  cat > "$DOCKER_COMPOSE_FILE" <<EOF_COMPOSE
services:
  mongo:
    image: ${mongo_image_ref}
    restart: unless-stopped
    environment:
      MONGO_INITDB_ROOT_USERNAME: ${MONGO_USERNAME}
      MONGO_INITDB_ROOT_PASSWORD: ${MONGO_PASSWORD}
    ports:
      - 127.0.0.1:${MONGO_PORT}:27017
    volumes:
      - ${STATE_DIR}/data/mongodb:/data/db

  minio:
    image: ${minio_image_ref}
    restart: unless-stopped
    environment:
      MINIO_ROOT_USER: ${MINIO_ROOT_USER}
      MINIO_ROOT_PASSWORD: ${MINIO_ROOT_PASSWORD}
    command: server /data
    ports:
      - 127.0.0.1:${MINIO_PORT}:9000
    volumes:
      - ${STATE_DIR}/data/minio:/data
EOF_COMPOSE
}

write_app_env_file() {
  cat > "$APP_ENV_FILE" <<EOF_ENV
ENV=selfhost
PORT=${APP_PORT}
IP=127.0.0.1
MY_SECRET_KEY=${SESSION_SECRET}
DATABASEURL=mongodb://${MONGO_USERNAME}:${MONGO_PASSWORD}@127.0.0.1:${MONGO_PORT}/proavalon?authSource=admin
SERVER_DOMAIN=${PUBLIC_HOSTPORT}
AWS_ACCESS_KEY_ID=${MINIO_ROOT_USER}
AWS_SECRET_ACCESS_KEY=${MINIO_ROOT_PASSWORD}
S3_PUBLIC_FILE_LINK_PREFIX=${PUBLIC_URL}/${S3_BUCKET_NAME}/
S3_BUCKET_NAME=${S3_BUCKET_NAME}
S3_ENDPOINT=http://127.0.0.1:${MINIO_PORT}
S3_REGION=auto
S3_FORCE_PATH_STYLE=true
WHITELISTED_VPN_USERNAMES=
EOF_ENV
}

write_run_app_script() {
  cat > "$RUN_APP_SCRIPT" <<EOF_RUN
#!/usr/bin/env zsh
set -euo pipefail

cd ${(q)ROOT_DIR}
set -a
source ${(q)APP_ENV_FILE}
set +a
export COREPACK_ENABLE_STRICT=0
source ~/.shared.sh >/dev/null 2>&1 || true
nvm-load >/dev/null 2>&1
nvm use ${(q)NODE_VERSION} >/dev/null
exec pnpm start >> ${(q)APP_LOG} 2>&1
EOF_RUN
  chmod +x "$RUN_APP_SCRIPT"
}

run_in_node_shell() {
  local command_string="$1"
  local proxy_exports
  proxy_exports="$(build_proxy_exports)"
  zsh -lc "set -euo pipefail; cd ${(q)ROOT_DIR}; ${proxy_exports:+$proxy_exports; }export COREPACK_ENABLE_STRICT=0; source ~/.shared.sh >/dev/null 2>&1 || true; nvm-load >/dev/null 2>&1; nvm use ${(q)NODE_VERSION} >/dev/null; ${command_string}"
}

repo_uses_yarn() {
  python3 - "$ROOT_DIR/package.json" <<'PY'
import json
import sys

try:
    with open(sys.argv[1], 'r', encoding='utf-8') as handle:
        package_json = json.load(handle)
except Exception:
    print('false')
    raise SystemExit(0)

package_manager = str(package_json.get('packageManager') or '')
print('true' if package_manager.startswith('yarn@') else 'false')
PY
}

install_dependencies() {
  note 'Installing dependencies with pnpm'
  local uses_yarn
  uses_yarn="$(repo_uses_yarn)"

  if [[ "$uses_yarn" == 'true' && -f "$ROOT_DIR/yarn.lock" ]]; then
    if [[ ! -f "$ROOT_DIR/pnpm-lock.yaml" || "$ROOT_DIR/package.json" -nt "$ROOT_DIR/pnpm-lock.yaml" || "$ROOT_DIR/yarn.lock" -nt "$ROOT_DIR/pnpm-lock.yaml" ]]; then
      note 'Refreshing pnpm-lock.yaml from yarn.lock'
      run_in_node_shell 'pnpm import'
    fi
  elif [[ ! -f "$ROOT_DIR/pnpm-lock.yaml" ]]; then
    [[ -f "$ROOT_DIR/yarn.lock" ]] || die 'Missing pnpm-lock.yaml and yarn.lock. Cannot perform a deterministic install.'
    note 'Generating pnpm-lock.yaml from yarn.lock'
    run_in_node_shell 'pnpm import'
  fi

  run_in_node_shell 'pnpm install --frozen-lockfile --prefer-offline --reporter append-only --network-concurrency 1 --fetch-retries 20 --fetch-retry-factor 2 --fetch-retry-mintimeout 2000 --fetch-retry-maxtimeout 120000'
}

build_app() {
  note 'Building ProAvalon'
  run_in_node_shell 'pnpm run build'
}

port_is_ready() {
  local host="$1"
  local port="$2"
  python3 - "$host" "$port" <<'PY'
import socket
import sys

host, port = sys.argv[1], int(sys.argv[2])
with socket.socket() as sock:
    sock.settimeout(1)
    try:
        sock.connect((host, port))
    except OSError:
        raise SystemExit(1)
raise SystemExit(0)
PY
}

print_log_tail() {
  local log_file="$1"
  local lines="${2:-80}"

  [[ -f "$log_file" ]] || return 0

  print -- "---- Last ${lines} lines of ${log_file#$ROOT_DIR/} ----"
  tail -n "$lines" "$log_file"
  print -- '---- End log tail ----'
}

wait_for_tcp() {
  local host="$1"
  local port="$2"
  local label="$3"
  local session_name="${4:-}"
  local log_file="${5:-}"
  local deadline="$((SECONDS + 90))"

  while (( SECONDS < deadline )); do
    if port_is_ready "$host" "$port"; then
      print -- "${label} is ready on ${host}:${port}"
      return 0
    fi

    if [[ -n "$session_name" ]] && ! tmux has-session -t "$session_name" &>/dev/null; then
      [[ -n "$log_file" ]] && print_log_tail "$log_file"
      die "${label} exited before binding to ${host}:${port}"
    fi

    sleep 1
  done

  [[ -n "$log_file" ]] && print_log_tail "$log_file"
  die "Timed out waiting for ${label} on ${host}:${port}"
}

configure_minio_bucket() {
  note 'Ensuring MinIO bucket exists and is publicly readable'
  local endpoint="http://127.0.0.1:${MINIO_PORT}"
  run_in_node_shell "AWS_ACCESS_KEY_ID=${(q)MINIO_ROOT_USER} AWS_SECRET_ACCESS_KEY=${(q)MINIO_ROOT_PASSWORD} S3_ENDPOINT=${(q)endpoint} S3_BUCKET_NAME=${(q)S3_BUCKET_NAME} node <<'NODE'
const {
  CreateBucketCommand,
  PutBucketPolicyCommand,
  S3Client,
} = require('@aws-sdk/client-s3');

(async () => {
  const client = new S3Client({
    region: 'auto',
    endpoint: process.env.S3_ENDPOINT,
    forcePathStyle: true,
    credentials: {
      accessKeyId: process.env.AWS_ACCESS_KEY_ID,
      secretAccessKey: process.env.AWS_SECRET_ACCESS_KEY,
    },
  });

  const bucket = process.env.S3_BUCKET_NAME;
  try {
    await client.send(new CreateBucketCommand({ Bucket: bucket }));
  } catch (error) {
    const alreadyExists = ['BucketAlreadyOwnedByYou', 'BucketAlreadyExists'].includes(error.name);
    if (!alreadyExists) {
      throw error;
    }
  }

  await client.send(new PutBucketPolicyCommand({
    Bucket: bucket,
    Policy: JSON.stringify({
      Version: '2012-10-17',
      Statement: [
        {
          Sid: 'PublicReadGetObject',
          Effect: 'Allow',
          Principal: '*',
          Action: ['s3:GetObject'],
          Resource: ['arn:aws:s3:::' + bucket + '/*'],
        },
      ],
    }),
  }));
})();
NODE"
}

render_caddy_block() {
  cat <<EOF_BLOCK
$CADDY_BEGIN
$PUBLIC_URL {
    encode zstd gzip

    @proavalon_assets path /${S3_BUCKET_NAME} /${S3_BUCKET_NAME}/*
    handle @proavalon_assets {
        reverse_proxy 127.0.0.1:${MINIO_PORT}
    }

    handle {
        reverse_proxy 127.0.0.1:${APP_PORT}
    }
}
$CADDY_END
EOF_BLOCK
}

update_caddyfile() {
  [[ -f "$CADDYFILE" ]] || touch "$CADDYFILE"
  local block_contents tmp_file
  block_contents="$(render_caddy_block)"
  tmp_file="$STATE_DIR/Caddyfile.candidate"

  TARGET_CADDYFILE="$CADDYFILE" BLOCK_BEGIN="$CADDY_BEGIN" BLOCK_END="$CADDY_END" BLOCK_CONTENTS="$block_contents" OUTPUT_PATH="$tmp_file" python3 - <<'PY'
import os
import pathlib
import re

path = pathlib.Path(os.environ['TARGET_CADDYFILE'])
text = path.read_text() if path.exists() else ''
begin = os.environ['BLOCK_BEGIN']
end = os.environ['BLOCK_END']
block = os.environ['BLOCK_CONTENTS'].rstrip() + '\n'
pattern = re.compile(re.escape(begin) + r'.*?' + re.escape(end) + r'\n?', re.S)
if pattern.search(text):
    updated = pattern.sub(block, text)
else:
    updated = text.rstrip() + ('\n\n' if text.strip() else '') + block
pathlib.Path(os.environ['OUTPUT_PATH']).write_text(updated)
PY

  caddy validate --config "$tmp_file" --adapter caddyfile >/dev/null
  cp "$tmp_file" "$CADDYFILE"
  caddy reload --config "$CADDYFILE" --adapter caddyfile >/dev/null
}

assert_port_is_free() {
  local port="$1"
  local label="$2"
  if port_in_use "$port"; then
    die "$label port $port is already in use. Run setup to pick new ports or free the port manually."
  fi
}

start_infra() {
  note 'Starting MongoDB and MinIO via docker compose'
  local docker_env_prefix
  docker_env_prefix="$(build_docker_env_prefix)"
  local cmd="set -euo pipefail; cd ${(q)ROOT_DIR}; ${docker_env_prefix} docker compose -f ${(q)DOCKER_COMPOSE_FILE} up 2>&1 | tee -a ${(q)INFRA_LOG}"
  tmuxnew "$INFRA_SESSION" zsh -lc "$cmd"
  wait_for_tcp 127.0.0.1 "$MONGO_PORT" 'MongoDB'
  wait_for_tcp 127.0.0.1 "$MINIO_PORT" 'MinIO'
}

start_app() {
  [[ -f "$ROOT_DIR/out/app.js" ]] || die 'Missing build output out/app.js. Run setup or redeploy first.'
  note 'Starting ProAvalon app'
  local var value
  local -a env_assignments=()

  for var in "${proxy_vars[@]}"; do
    if (( ${+parameters[$var]} )); then
      value="${(P)var}"
      env_assignments+=("$var=$value")
    fi
  done

  tmuxnew_with_env "$APP_SESSION" "zsh -lc 'exec ${(q)RUN_APP_SCRIPT}'" "${env_assignments[@]}"
  wait_for_tcp 127.0.0.1 "$APP_PORT" 'ProAvalon app' "$APP_SESSION" "$APP_LOG"
}

stop_services() {
  note 'Stopping ProAvalon self-host services'
  tmux kill-session -t "$APP_SESSION" &>/dev/null || true
  tmux kill-session -t "$INFRA_SESSION" &>/dev/null || true
  if [[ -f "$DOCKER_COMPOSE_FILE" ]]; then
    local docker_env_prefix
    docker_env_prefix="$(build_docker_env_prefix)"
    eval "$docker_env_prefix docker compose -f ${(q)DOCKER_COMPOSE_FILE} down --remove-orphans >/dev/null 2>&1" || true
  fi
}

print_summary() {
  cat <<EOF_SUMMARY
Self-hosted ProAvalon is ready.
  Public URL: $PUBLIC_URL
  App port:   $APP_PORT
  Mongo port: $MONGO_PORT
  MinIO port: $MINIO_PORT

Tmux sessions:
  $APP_SESSION
  $INFRA_SESSION
EOF_SUMMARY
}

setup_cmd() {
  local public_url="${1:-$DEFAULT_PUBLIC_URL}"
  stop_services
  persist_config "$public_url"
  load_config
  write_docker_compose_file
  write_app_env_file
  write_run_app_script
  install_dependencies
  build_app
  update_caddyfile
  assert_port_is_free "$APP_PORT" 'App'
  assert_port_is_free "$MONGO_PORT" 'MongoDB'
  assert_port_is_free "$MINIO_PORT" 'MinIO'
  start_infra
  configure_minio_bucket
  start_app
  print_summary
}

redeploy_cmd() {
  load_config
  stop_services
  write_docker_compose_file
  write_app_env_file
  write_run_app_script
  install_dependencies
  build_app
  update_caddyfile
  assert_port_is_free "$APP_PORT" 'App'
  assert_port_is_free "$MONGO_PORT" 'MongoDB'
  assert_port_is_free "$MINIO_PORT" 'MinIO'
  start_infra
  configure_minio_bucket
  start_app
  print_summary
}

start_cmd() {
  load_config
  write_docker_compose_file
  write_app_env_file
  write_run_app_script
  update_caddyfile
  assert_port_is_free "$APP_PORT" 'App'
  assert_port_is_free "$MONGO_PORT" 'MongoDB'
  assert_port_is_free "$MINIO_PORT" 'MinIO'
  start_infra
  configure_minio_bucket
  start_app
  print_summary
}

stop_cmd() {
  stop_services
}

main() {
  ensure_prerequisites

  case "${1:-}" in
    setup)
      setup_cmd "${2:-$DEFAULT_PUBLIC_URL}"
      ;;
    redeploy)
      redeploy_cmd
      ;;
    start)
      start_cmd
      ;;
    stop)
      stop_cmd
      ;;
    *)
      usage
      exit 1
      ;;
  esac
}

main "$@"
