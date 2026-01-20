FROM chatwoot/chatwoot:latest

# Switch to root to perform copies
USER root

# Install pnpm (required by Vite but missing in some base images)
RUN npm install -g pnpm

# Copy custom patched files
COPY custom-Sidebar.vue /app/app/javascript/dashboard/components-next/sidebar/Sidebar.vue
COPY custom-MessageList.vue /app/app/javascript/dashboard/components-next/message/MessageList.vue
COPY custom-ContactInfo.vue /app/app/javascript/dashboard/routes/dashboard/conversation/contact/ContactInfo.vue
COPY custom-ConversationFilter.vue /app/app/javascript/dashboard/components-next/filter/ConversationFilter.vue

# Run compilation (heavy step)
# We set dummy DB/Redis URLs to prevent connection errors during asset compilation
RUN cd /app && \
    export DATABASE_URL=postgres://dummy:dummy@127.0.0.1:5432/dummy && \
    export REDIS_URL=redis://127.0.0.1:6379/1 && \
    bundle exec rails assets:precompile RAILS_ENV=production SECRET_KEY_BASE=precompile_placeholder

# Switch back to chatwoot user
USER chatwoot
