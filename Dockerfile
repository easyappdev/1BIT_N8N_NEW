FROM chatwoot/chatwoot:latest

# Switch to root to perform copies
USER root

# Copy custom patched files
COPY custom-Sidebar.vue /app/app/javascript/dashboard/components-next/sidebar/Sidebar.vue
COPY custom-MessageList.vue /app/app/javascript/dashboard/components-next/message/MessageList.vue
COPY custom-ContactInfo.vue /app/app/javascript/dashboard/routes/dashboard/conversation/contact/ContactInfo.vue
COPY custom-ConversationFilter.vue /app/app/javascript/dashboard/components-next/filter/ConversationFilter.vue

# Run compilation (heavy step)
RUN cd /app && \
    bundle exec rails assets:precompile RAILS_ENV=production SECRET_KEY_BASE=precompile_placeholder

# Switch back to chatwoot user
USER chatwoot
