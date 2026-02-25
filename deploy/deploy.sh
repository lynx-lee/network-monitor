#!/bin/bash

#===============================================================================
# Network Monitor 部署脚本
#
# 用法:
#   ./deploy/deploy.sh [命令] [选项]
#
# 命令:
#   start       启动所有服务（构建并后台运行）
#   stop        停止所有服务
#   restart     重启所有服务
#   status      查看服务状态
#   logs        查看服务日志
#   build       构建项目镜像
#   update      拉取最新代码并重启服务
#   clean       清理构建产物和容器
#   init        初始化部署环境
#   backup      备份数据（数据库 + 日志 + 配置）
#   restore     恢复数据
#   exec        进入容器
#   health      健康检查
#   help        显示帮助信息
#
#===============================================================================

set -e

# 颜色定义
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
CYAN='\033[0;36m'
NC='\033[0m' # No Color

# 项目配置
PROJECT_NAME="network-monitor"
SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
PROJECT_ROOT="$(cd "$SCRIPT_DIR/.." && pwd)"
COMPOSE_FILE="${SCRIPT_DIR}/docker-compose.yml"
BACKUP_DIR="${PROJECT_ROOT}/backups"
LOG_DIR="${PROJECT_ROOT}/logs"

#-------------------------------------------------------------------------------
# 工具函数
#-------------------------------------------------------------------------------

log_info() {
    echo -e "${BLUE}[INFO]${NC} $1"
}

log_success() {
    echo -e "${GREEN}[SUCCESS]${NC} $1"
}

log_warn() {
    echo -e "${YELLOW}[WARN]${NC} $1"
}

log_error() {
    echo -e "${RED}[ERROR]${NC} $1"
}

print_banner() {
    echo -e "${CYAN}"
    echo "╔════════════════════════════════════════════════════════════════╗"
    echo "║                                                              ║"
    echo "║    ███╗   ██╗███████╗████████╗    ███╗   ███╗ ██████╗ ███╗   ║"
    echo "║    ████╗  ██║██╔════╝╚══██╔══╝    ████╗ ████║██╔═══██╗████╗  ║"
    echo "║    ██╔██╗ ██║█████╗     ██║       ██╔████╔██║██║   ██║██╔██╗ ║"
    echo "║    ██║╚██╗██║██╔══╝     ██║       ██║╚██╔╝██║██║   ██║██║╚██╗║"
    echo "║    ██║ ╚████║███████╗   ██║       ██║ ╚═╝ ██║╚██████╔╝██║ ╚█║"
    echo "║    ╚═╝  ╚═══╝╚══════╝   ╚═╝       ╚═╝     ╚═╝ ╚═════╝ ╚═╝  ║"
    echo "║                                                              ║"
    echo "║           Network Monitor - 网络监控部署工具                 ║"
    echo "╚════════════════════════════════════════════════════════════════╝"
    echo -e "${NC}"
}

check_requirements() {
    log_info "检查系统依赖..."

    # 检查 Docker
    if ! command -v docker &> /dev/null; then
        log_error "Docker 未安装，请先安装 Docker"
        echo "  安装指南: https://docs.docker.com/get-docker/"
        exit 1
    fi

    # 检查 Docker Compose
    if ! command -v docker-compose &> /dev/null && ! docker compose version &> /dev/null; then
        log_error "Docker Compose 未安装，请先安装 Docker Compose"
        echo "  安装指南: https://docs.docker.com/compose/install/"
        exit 1
    fi

    # 检查 Docker 服务是否运行
    if ! docker info &> /dev/null; then
        log_error "Docker 服务未运行，请启动 Docker"
        exit 1
    fi

    log_success "系统依赖检查通过"
}

# 获取 docker compose 命令
get_compose_cmd() {
    if docker compose version &> /dev/null; then
        echo "docker compose"
    else
        echo "docker-compose"
    fi
}

COMPOSE_CMD=$(get_compose_cmd)

# 封装 compose 调用（自动加载 .env）
compose() {
    if [ -f "$PROJECT_ROOT/.env" ]; then
        $COMPOSE_CMD -f "$COMPOSE_FILE" --env-file "$PROJECT_ROOT/.env" "$@"
    else
        $COMPOSE_CMD -f "$COMPOSE_FILE" "$@"
    fi
}

# 加载 .env
load_env() {
    if [ -f "$PROJECT_ROOT/.env" ]; then
        log_info "加载环境变量: .env"
    else
        log_warn ".env 文件不存在，将使用 docker-compose.yml 中的默认值。"
        log_warn "建议执行: cp .env.example .env 并修改敏感配置。"
    fi
}

#-------------------------------------------------------------------------------
# 核心功能
#-------------------------------------------------------------------------------

# 初始化环境
do_init() {
    log_info "初始化部署环境..."

    # 创建必要目录
    mkdir -p "${LOG_DIR}"
    mkdir -p "${BACKUP_DIR}"

    # 检查 .env 文件
    if [ ! -f "$PROJECT_ROOT/.env" ]; then
        if [ -f "$PROJECT_ROOT/.env.example" ]; then
            log_info "从 .env.example 创建 .env 文件..."
            cp "$PROJECT_ROOT/.env.example" "$PROJECT_ROOT/.env"
            log_warn "已创建 .env 文件，请根据实际环境修改数据库密码等敏感配置后重新运行"
        else
            log_info "创建默认 .env 文件..."
            cat > "$PROJECT_ROOT/.env" << 'EOF'
# Network Monitor 环境配置
# 请根据实际情况修改以下配置

# 数据库配置 - 部署前务必修改密码
MYSQL_ROOT_PASSWORD=your_secure_root_password
DB_USER=network_monitor
DB_PASSWORD=your_secure_db_password
DB_NAME=network_monitor

# 应用配置
CLIENT_ORIGIN=http://localhost:8090
EOF
            log_warn "已创建 .env 文件，请修改数据库密码等敏感配置后重新运行"
        fi
    else
        log_info ".env 文件已存在，跳过创建"
    fi

    # 设置目录权限
    chmod -R 755 "${LOG_DIR}"
    chmod -R 755 "${BACKUP_DIR}"

    log_success "环境初始化完成"
}

# 构建项目
do_build() {
    local service="${1:-}"

    log_info "构建项目镜像..."

    cd "$PROJECT_ROOT"

    if [ -n "$service" ]; then
        log_info "构建服务: $service"
        compose build --no-cache "$service"
    else
        log_info "构建所有服务..."
        compose build --no-cache
    fi

    log_success "项目构建完成"
}

# 启动服务
do_start() {
    local service="${1:-}"

    log_info "启动 Network Monitor 服务..."

    cd "$PROJECT_ROOT"

    # 检查是否需要初始化
    if [ ! -d "${LOG_DIR}" ]; then
        do_init
    fi

    if [ -n "$service" ]; then
        log_info "启动服务: $service"
        compose up -d --build "$service"
    else
        compose up -d --build
    fi

    log_success "服务启动完成"
    echo ""
    log_info "服务访问地址:"
    echo "  - 前端界面: ${CYAN}http://localhost:8090${NC}"
    echo "  - 后端 API: ${CYAN}http://localhost:3001/api${NC}"
    echo "  - MySQL:    ${CYAN}localhost:3307${NC}"
    echo ""
    log_info "查看日志: ./deploy/deploy.sh logs"
    echo ""
    compose ps
}

# 停止服务
do_stop() {
    log_info "停止 Network Monitor 服务..."

    cd "$PROJECT_ROOT"
    compose down

    log_success "服务已停止"
}

# 重启服务
do_restart() {
    local service="${1:-}"

    log_info "重启服务..."

    cd "$PROJECT_ROOT"

    if [ -n "$service" ]; then
        log_info "重启服务: $service"
        compose restart "$service"
    else
        compose restart
    fi

    compose ps
    log_success "服务重启完成"
}

# 查看服务状态
do_status() {
    log_info "服务状态:"
    echo ""

    cd "$PROJECT_ROOT"
    compose ps

    echo ""
    log_info "容器资源使用情况:"
    docker stats --no-stream --format "table {{.Name}}\t{{.CPUPerc}}\t{{.MemUsage}}\t{{.NetIO}}" \
        $(docker ps --filter "name=${PROJECT_NAME}" -q 2>/dev/null) 2>/dev/null || log_warn "无运行中的容器"
}

# 查看日志
do_logs() {
    local service="${1:-}"
    local lines="${2:-100}"

    cd "$PROJECT_ROOT"

    if [ -n "$service" ]; then
        log_info "查看 $service 日志 (最近 $lines 行, Ctrl+C 退出)..."
        compose logs -f --tail="$lines" "$service"
    else
        log_info "查看所有服务日志 (最近 $lines 行, Ctrl+C 退出)..."
        compose logs -f --tail="$lines"
    fi
}

# 更新并重启
do_update() {
    log_info "更新 Network Monitor..."

    cd "$PROJECT_ROOT"

    # 拉取最新代码（如果是 git 仓库）
    if [ -d "$PROJECT_ROOT/.git" ]; then
        # 检查是否有可用的 remote
        local remote
        remote=$(git remote | head -1)
        if [ -n "$remote" ]; then
            local branch
            branch=$(git symbolic-ref --short HEAD 2>/dev/null || echo "main")
            log_info "拉取最新代码 ($remote/$branch)..."
            git pull "$remote" "$branch" || log_warn "Git 拉取失败，跳过"
        else
            log_warn "未配置 Git remote，跳过代码拉取"
        fi
    fi

    # 重新构建
    log_info "重新构建镜像..."
    compose build --no-cache

    # 重启服务
    log_info "重启服务..."
    compose up -d --force-recreate

    echo ""
    compose ps
    log_success "更新完成"
}

# 清理
do_clean() {
    local deep="${1:-}"

    log_warn "清理项目..."

    cd "$PROJECT_ROOT"

    if [ "$deep" = "--deep" ] || [ "$deep" = "-d" ]; then
        log_warn "此操作将停止服务并删除数据卷（包括数据库数据）！"
        read -rp "确认继续？(y/N): " confirm
        if [[ ! "$confirm" =~ ^[Yy]$ ]]; then
            log_info "操作已取消"
            return
        fi

        # 停止并删除容器和卷
        compose down -v --remove-orphans

        # 删除相关 Docker 镜像
        log_warn "清理 Docker 镜像..."
        docker images --filter "reference=${PROJECT_NAME}*" -q | xargs -r docker rmi -f 2>/dev/null || true

        # 清理未使用的 Docker 资源
        docker system prune -f

        log_warn "注意: 深度清理不会删除备份和日志目录，如需删除请手动执行:"
        echo "  rm -rf ${BACKUP_DIR}"
        echo "  rm -rf ${LOG_DIR}"
    else
        # 普通清理：停止容器，保留数据卷
        compose down --remove-orphans
    fi

    log_success "清理完成"
}

# 备份数据
do_backup() {
    local backup_name="${1:-backup_$(date +%Y%m%d_%H%M%S)}"
    local backup_path="${BACKUP_DIR}/${backup_name}"

    log_info "备份数据到: ${backup_path}"

    mkdir -p "${backup_path}"

    cd "$PROJECT_ROOT"

    # 备份数据库
    log_info "备份 MySQL 数据库..."
    local db_user="${DB_USER:-network_monitor}"
    local db_password="${DB_PASSWORD:-changeme_db_pw}"
    local db_name="${DB_NAME:-network_monitor}"

    # 从 .env 加载变量
    if [ -f "$PROJECT_ROOT/.env" ]; then
        source <(grep -E '^(DB_USER|DB_PASSWORD|DB_NAME)=' "$PROJECT_ROOT/.env" 2>/dev/null) || true
        db_user="${DB_USER:-$db_user}"
        db_password="${DB_PASSWORD:-$db_password}"
        db_name="${DB_NAME:-$db_name}"
    fi

    docker exec ${PROJECT_NAME}-db mysqldump -u"$db_user" -p"$db_password" "$db_name" > "${backup_path}/database.sql" 2>/dev/null || {
        log_warn "数据库备份失败，可能容器未运行"
    }

    # 备份日志
    if [ -d "${LOG_DIR}" ] && [ "$(ls -A "${LOG_DIR}" 2>/dev/null)" ]; then
        log_info "备份日志目录..."
        cp -r "${LOG_DIR}" "${backup_path}/"
    fi

    # 备份配置
    if [ -f "$PROJECT_ROOT/.env" ]; then
        log_info "备份 .env 配置..."
        cp "$PROJECT_ROOT/.env" "${backup_path}/"
    fi

    # 压缩备份
    log_info "压缩备份文件..."
    cd "${BACKUP_DIR}"
    tar -czf "${backup_name}.tar.gz" "${backup_name}"
    rm -rf "${backup_name}"

    log_success "备份完成: ${BACKUP_DIR}/${backup_name}.tar.gz"
}

# 恢复数据
do_restore() {
    local backup_file="${1:-}"

    if [ -z "$backup_file" ]; then
        log_error "请指定备份文件"
        echo "用法: ./deploy/deploy.sh restore <backup_file.tar.gz>"
        echo ""
        log_info "可用的备份文件:"
        ls -lh "${BACKUP_DIR}"/*.tar.gz 2>/dev/null || echo "  无备份文件"
        exit 1
    fi

    if [ ! -f "$backup_file" ]; then
        # 尝试在备份目录中查找
        if [ -f "${BACKUP_DIR}/${backup_file}" ]; then
            backup_file="${BACKUP_DIR}/${backup_file}"
        else
            log_error "备份文件不存在: $backup_file"
            exit 1
        fi
    fi

    log_warn "恢复数据将覆盖现有数据库，是否继续? [y/N]"
    read -r confirm
    if [ "$confirm" != "y" ] && [ "$confirm" != "Y" ]; then
        log_info "取消恢复"
        exit 0
    fi

    log_info "恢复数据从: $backup_file"

    # 解压备份
    local temp_dir=$(mktemp -d)
    tar -xzf "$backup_file" -C "$temp_dir"
    local backup_name=$(ls "$temp_dir")
    local restore_path="${temp_dir}/${backup_name}"

    # 恢复日志
    if [ -d "${restore_path}/logs" ]; then
        log_info "恢复日志目录..."
        cp -r "${restore_path}/logs/"* "${LOG_DIR}/" 2>/dev/null || true
    fi

    # 恢复数据库
    if [ -f "${restore_path}/database.sql" ]; then
        log_info "恢复数据库..."

        local db_user="${DB_USER:-network_monitor}"
        local db_password="${DB_PASSWORD:-changeme_db_pw}"
        local db_name="${DB_NAME:-network_monitor}"

        if [ -f "$PROJECT_ROOT/.env" ]; then
            source <(grep -E '^(DB_USER|DB_PASSWORD|DB_NAME)=' "$PROJECT_ROOT/.env" 2>/dev/null) || true
            db_user="${DB_USER:-$db_user}"
            db_password="${DB_PASSWORD:-$db_password}"
            db_name="${DB_NAME:-$db_name}"
        fi

        # 确保数据库容器运行
        cd "$PROJECT_ROOT"
        compose up -d db
        log_info "等待数据库就绪..."
        sleep 10

        docker exec -i ${PROJECT_NAME}-db mysql -u"$db_user" -p"$db_password" "$db_name" < "${restore_path}/database.sql"
        log_success "数据库恢复完成"
    fi

    # 清理临时目录
    rm -rf "$temp_dir"

    log_success "数据恢复完成"
}

# 进入容器
do_exec() {
    local service="${1:-backend}"
    local cmd="${2:-/bin/sh}"

    log_info "进入 $service 容器..."

    cd "$PROJECT_ROOT"
    compose exec "$service" $cmd
}

# 健康检查
do_health() {
    log_info "执行健康检查..."
    echo ""

    local all_healthy=true

    # 检查前端
    if curl -s -o /dev/null -w "%{http_code}" http://localhost:8090 2>/dev/null | grep -q "200\|301\|302"; then
        echo -e "  前端服务 (Nginx):  ${GREEN}✓ 正常${NC}"
    else
        echo -e "  前端服务 (Nginx):  ${RED}✗ 异常${NC}"
        all_healthy=false
    fi

    # 检查后端
    if curl -s -o /dev/null -w "%{http_code}" http://localhost:3001/api/health 2>/dev/null | grep -q "200"; then
        echo -e "  后端服务 (Express):${GREEN}✓ 正常${NC}"
    else
        echo -e "  后端服务 (Express):${RED}✗ 异常${NC}"
        all_healthy=false
    fi

    # 检查数据库
    if docker exec ${PROJECT_NAME}-db mysqladmin ping -h localhost -u root -p"${MYSQL_ROOT_PASSWORD:-changeme_root_pw}" --silent &>/dev/null; then
        echo -e "  MySQL 数据库:      ${GREEN}✓ 正常${NC}"
    else
        echo -e "  MySQL 数据库:      ${RED}✗ 异常${NC}"
        all_healthy=false
    fi

    echo ""
    if [ "$all_healthy" = true ]; then
        log_success "所有服务运行正常"
    else
        log_error "部分服务异常，请检查日志: ./deploy/deploy.sh logs"
        exit 1
    fi
}

# 显示帮助
show_help() {
    print_banner
    echo "用法: ./deploy/deploy.sh [命令] [选项]"
    echo ""
    echo "命令:"
    echo "  start [service]     启动服务，可指定单个服务 (默认全部)"
    echo "  stop                停止所有服务"
    echo "  restart [service]   重启服务，可指定单个服务"
    echo "  status              查看服务状态与资源使用"
    echo "  logs [service] [n]  查看日志，可指定服务和行数 (默认 100 行)"
    echo "  build [service]     构建镜像，不使用缓存"
    echo "  update              拉取最新代码并重新构建、重启"
    echo "  clean [--deep]      清理容器 (--deep 同时删除数据卷和镜像)"
    echo "  init                初始化部署环境 (.env / 目录)"
    echo "  backup [name]       备份数据库、日志和配置"
    echo "  restore <file>      从备份文件恢复数据"
    echo "  exec [service] [cmd] 进入容器 (默认 backend /bin/sh)"
    echo "  health              健康检查 (前端/后端/数据库)"
    echo "  help                显示帮助信息"
    echo ""
    echo "示例:"
    echo "  ./deploy/deploy.sh start                # 启动所有服务"
    echo "  ./deploy/deploy.sh start backend        # 仅启动后端"
    echo "  ./deploy/deploy.sh logs backend 200     # 查看后端最近 200 行日志"
    echo "  ./deploy/deploy.sh restart frontend     # 重启前端服务"
    echo "  ./deploy/deploy.sh backup prod_backup   # 备份数据"
    echo "  ./deploy/deploy.sh restore prod_backup.tar.gz  # 恢复数据"
    echo "  ./deploy/deploy.sh exec db mysql        # 进入 MySQL 容器"
    echo "  ./deploy/deploy.sh health               # 健康检查"
    echo "  ./deploy/deploy.sh clean --deep         # 深度清理"
    echo ""
    echo "服务列表:"
    echo "  - frontend   前端服务 (Nginx, :8090)"
    echo "  - backend    后端服务 (Node.js + Express, :3001)"
    echo "  - db         MySQL 数据库 (:3307)"
    echo ""
}

#-------------------------------------------------------------------------------
# 主程序
#-------------------------------------------------------------------------------

main() {
    local command="${1:-help}"
    shift || true

    # 除 help 外的命令都需要加载环境和检查依赖
    case "$command" in
        help|--help|-h)
            show_help
            return
            ;;
    esac

    check_requirements
    load_env

    case "$command" in
        start|up)
            print_banner
            do_start "$@"
            ;;
        stop|down)
            print_banner
            do_stop
            ;;
        restart)
            print_banner
            do_restart "$@"
            ;;
        status)
            print_banner
            do_status
            ;;
        logs)
            do_logs "$@"
            ;;
        build|rebuild)
            print_banner
            do_build "$@"
            ;;
        update)
            print_banner
            do_update
            ;;
        clean)
            print_banner
            do_clean "$@"
            ;;
        init)
            print_banner
            do_init
            ;;
        backup)
            print_banner
            do_backup "$@"
            ;;
        restore)
            print_banner
            do_restore "$@"
            ;;
        exec)
            do_exec "$@"
            ;;
        health)
            print_banner
            do_health
            ;;
        *)
            log_error "未知命令: $command"
            echo ""
            show_help
            exit 1
            ;;
    esac
}

main "$@"
