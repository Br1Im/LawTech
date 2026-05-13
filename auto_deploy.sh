#!/bin/bash
# Auto-deploy script for LawTech
# Watches local file changes in frontend/ and server/ and rebuilds containers

LOG_FILE="/var/log/lawtech-autodeploy.log"
PROJECT_DIR="/opt/LawTech"
LOCK_FILE="/tmp/lawtech-deploy.lock"
DEBOUNCE=10

log() {
    echo "[$(date "+%Y-%m-%d %H:%M:%S")] $1" | tee -a "$LOG_FILE"
}

deploy() {
    # Prevent concurrent deploys
    if [ -f "$LOCK_FILE" ]; then
        PID=$(cat "$LOCK_FILE")
        if kill -0 "$PID" 2>/dev/null; then
            log "Deploy already running (PID $PID), skipping"
            return
        fi
        rm -f "$LOCK_FILE"
    fi
    echo $$ > "$LOCK_FILE"

    cd "$PROJECT_DIR" || { log "ERROR: cannot cd to $PROJECT_DIR"; rm -f "$LOCK_FILE"; return; }

    CHANGED_FRONTEND=false
    CHANGED_BACKEND=false

    # Check what changed (modified tracked files)
    if git diff --name-only 2>/dev/null | grep -q "^frontend/"; then
        CHANGED_FRONTEND=true
    fi
    if git diff --name-only 2>/dev/null | grep -q "^server/"; then
        CHANGED_BACKEND=true
    fi
    # Also check untracked files
    if git ls-files --others --exclude-standard 2>/dev/null | grep -q "^frontend/"; then
        CHANGED_FRONTEND=true
    fi
    if git ls-files --others --exclude-standard 2>/dev/null | grep -q "^server/"; then
        CHANGED_BACKEND=true
    fi

    if ! $CHANGED_FRONTEND && ! $CHANGED_BACKEND; then
        log "No relevant changes detected, skipping deploy"
        rm -f "$LOCK_FILE"
        return
    fi

    log "=== DEPLOYING LOCAL CHANGES ==="

    if $CHANGED_FRONTEND; then
        log "Frontend changes detected, rebuilding..."
        docker compose build --no-cache frontend >> "$LOG_FILE" 2>&1
        if [ $? -ne 0 ]; then
            log "ERROR: frontend build failed"
            rm -f "$LOCK_FILE"
            return
        fi
        docker compose up -d --force-recreate frontend >> "$LOG_FILE" 2>&1
        log "Frontend redeployed"
    fi

    if $CHANGED_BACKEND; then
        log "Backend changes detected, rebuilding..."
        docker compose build --no-cache backend >> "$LOG_FILE" 2>&1
        if [ $? -ne 0 ]; then
            log "ERROR: backend build failed"
            rm -f "$LOCK_FILE"
            return
        fi
        docker compose up -d --force-recreate backend >> "$LOG_FILE" 2>&1
        log "Backend redeployed"

        # Run migrations
        sleep 5
        log "Running migrations..."
        docker compose exec -T backend node scripts/apply_all_migrations.js >> "$LOG_FILE" 2>&1
    fi

    # Auto-commit changes
    cd "$PROJECT_DIR"
    git add -A frontend/ server/ >> "$LOG_FILE" 2>&1
    if ! git diff --cached --quiet 2>/dev/null; then
        git commit -m "auto-deploy: $(date +%Y-%m-%d_%H:%M:%S)" >> "$LOG_FILE" 2>&1
        log "Changes committed"
    fi

    RUNNING=$(docker compose ps 2>/dev/null | grep "Up" | wc -l)
    log "Deploy complete. Running containers: $RUNNING"
    log "========================================="

    rm -f "$LOCK_FILE"
}

# --- Main: watch mode ---
log "Starting file watcher on $PROJECT_DIR/frontend and $PROJECT_DIR/server"

while true; do
    inotifywait -r -q -e modify,create,delete,move \
        --exclude '\.(git|node_modules|dist|build)' \
        "$PROJECT_DIR/frontend/src" \
        "$PROJECT_DIR/server" \
        2>/dev/null

    log "File change detected, waiting ${DEBOUNCE}s for debounce..."
    sleep "$DEBOUNCE"

    # Drain any queued events during debounce
    while inotifywait -r -q -t 1 -e modify,create,delete,move \
        --exclude '\.(git|node_modules|dist|build)' \
        "$PROJECT_DIR/frontend/src" \
        "$PROJECT_DIR/server" 2>/dev/null; do
        sleep 2
    done

    deploy
done
