FROM chatwoot/chatwoot:latest

# Switch to root to perform copies
USER root

# Install Node.js and pnpm (Base image might be slim/production and lack build tools)
RUN if command -v apk >/dev/null; then \
    apk add --no-cache nodejs npm; \
    elif command -v apt-get >/dev/null; then \
    apt-get update && apt-get install -y nodejs npm; \
    fi && \
    npm install -g pnpm

# Copy custom patched files
COPY custom-Sidebar.vue /app/app/javascript/dashboard/components-next/sidebar/Sidebar.vue
COPY custom-MessageList.vue /app/app/javascript/dashboard/components-next/message/MessageList.vue
COPY custom-ContactInfo.vue /app/app/javascript/dashboard/routes/dashboard/conversation/contact/ContactInfo.vue
COPY custom-ConversationFilter.vue /app/app/javascript/dashboard/components-next/filter/ConversationFilter.vue
COPY custom-ChatList.vue /app/app/javascript/dashboard/components/ChatList.vue
COPY custom-ContactPanel.vue /app/app/javascript/dashboard/routes/dashboard/conversation/ContactPanel.vue
COPY custom-ContextMenu.vue /app/app/javascript/dashboard/components/widgets/conversation/contextMenu/Index.vue
COPY custom-SidepanelSwitch.vue /app/app/javascript/dashboard/components-next/Conversation/SidepanelSwitch.vue

# Run compilation (heavy step)
# We set dummy DB/Redis URLs to prevent connection errors during asset compilation
RUN cd /app && \
    export DATABASE_URL=postgres://dummy:dummy@127.0.0.1:5432/dummy && \
    export REDIS_URL=redis://127.0.0.1:6379/1 && \
    bundle exec rails assets:precompile RAILS_ENV=production SECRET_KEY_BASE=precompile_placeholder && \
    # Fix permissions: Give ownership of /app to the runtime user (1001) because we built as root
    chown -R 1001:0 /app

# Switch back to default user (UID 1001 is standard for Chatwoot)
USER 1001
