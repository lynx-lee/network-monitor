#!/usr/bin/env bash
set -euo pipefail

# ============================================================
# Network Monitor 部署脚本
# 用法:
#   ./deploy/deploy.sh [命令]
#
# 命令:
#   up        构建并启动所有服务（默认）
#   down      停止并移除所有服务
#   restart   重启所有服务
#   rebuild   强制重新构建并启动
#   status    查看服务状态
#   logs      查看实时日志（可追加服务名: logs backend）
#   clean     停止服务并清理 volumes
# ============================================================

# 定位到项目根目录（deploy.sh 所在目录的上一级）
SCRIPT_DIR="$(cd "$(dirname "$0")" && pwd)"
PROJECT_ROOT="$(cd "$SCRIPT_DIR/.." && pwd)"
COMPOSE_FILE="$SCRIPT_DIR/docker-compose.yml"

cd "$PROJECT_ROOT"

# 颜色输出
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
CYAN='\033[0;36m'
NC='\033[0m' # No Color

log_info()  { echo -e "${GREEN}[INFO]${NC}  $*"; }
log_warn()  { echo -e "${YELLOW}[WARN]${NC}  $*"; }
log_error() { echo -e "${RED}[ERROR]${NC} $*"; }

# 检查 docker compose 命令是否可用
check_docker() {
  if command -v docker &>/dev/null && docker compose version &>/dev/null; then
    DOCKER_COMPOSE="docker compose"
  elif command -v docker-compose &>/dev/null; then
    DOCKER_COMPOSE="docker-compose"
  else
    log_error "未找到 docker compose，请先安装 Docker。"
    exit 1
  fi
}

# 加载 .env（如果存在）
load_env() {
  if [ -f "$PROJECT_ROOT/.env" ]; then
    log_info "加载环境变量: .env"
  else
    log_warn ".env 文件不存在，将使用 docker-compose.yml 中的默认值。"
    log_warn "建议执行: cp .env.example .env 并修改敏感配置。"
  fi
}

compose() {
  if [ -f "$PROJECT_ROOT/.env" ]; then
    $DOCKER_COMPOSE -f "$COMPOSE_FILE" --env-file "$PROJECT_ROOT/.env" "$@"
  else
    $DOCKER_COMPOSE -f "$COMPOSE_FILE" "$@"
  fi
}

cmd_up() {
  log_info "构建并启动所有服务..."
  compose up -d --build
  echo ""
  log_info "服务已启动："
  compose ps
  echo ""
  log_info "前端:     ${CYAN}http://localhost:8090${NC}"
  log_info "后端 API: ${CYAN}http://localhost:3001/api${NC}"
  log_info "MySQL:    ${CYAN}localhost:3307${NC}"
}

cmd_down() {
  log_info "停止并移除所有服务..."
  compose down
  log_info "服务已停止。"
}

cmd_restart() {
  log_info "重启所有服务..."
  compose restart
  compose ps
}

cmd_rebuild() {
  log_info "强制重新构建并启动..."
  compose down
  compose build --no-cache
  compose up -d
  echo ""
  compose ps
  log_info "重新构建完成。"
}

cmd_status() {
  compose ps
}

cmd_logs() {
  local service="${1:-}"
  if [ -n "$service" ]; then
    log_info "查看 $service 日志（Ctrl+C 退出）..."
    compose logs -f "$service"
  else
    log_info "查看所有服务日志（Ctrl+C 退出）..."
    compose logs -f
  fi
}

cmd_clean() {
  log_warn "此操作将停止服务并删除数据卷（包括数据库数据）！"
  read -rp "确认继续？(y/N): " confirm
  if [[ "$confirm" =~ ^[Yy]$ ]]; then
    compose down -v
    log_info "服务已停止，数据卷已清理。"
  else
    log_info "操作已取消。"
  fi
}

cmd_help() {
  echo "用法: $0 [命令]"
  echo ""
  echo "命令:"
  echo "  up        构建并启动所有服务（默认）"
  echo "  down      停止并移除所有服务"
  echo "  restart   重启所有服务"
  echo "  rebuild   强制重新构建并启动（不使用缓存）"
  echo "  status    查看服务运行状态"
  echo "  logs      查看实时日志（可追加服务名，如: logs backend）"
  echo "  clean     停止服务并清理数据卷"
  echo "  help      显示此帮助信息"
}

# ---- 主入口 ----
check_docker
load_env

COMMAND="${1:-up}"
shift 2>/dev/null || true

case "$COMMAND" in
  up)       cmd_up ;;
  down)     cmd_down ;;
  restart)  cmd_restart ;;
  rebuild)  cmd_rebuild ;;
  status)   cmd_status ;;
  logs)     cmd_logs "$@" ;;
  clean)    cmd_clean ;;
  help|-h|--help) cmd_help ;;
  *)
    log_error "未知命令: $COMMAND"
    cmd_help
    exit 1
    ;;
esac
