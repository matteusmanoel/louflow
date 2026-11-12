# .cursor/Dockerfile — LouFlow (Cursor Cloud Agents)
# Ubuntu 24.04 + Node 24 (igual ao azure-pipelines.yml) + Docker com fuse-overlayfs/iptables-legacy
# (receita da doc do Cursor para Docker aninhado; necessário para o Postgres de teste).
# Não COPY o repositório: o checkout é feito depois, fora desta imagem.
FROM ubuntu:24.04

ENV DEBIAN_FRONTEND=noninteractive

RUN apt-get update && apt-get install -y --no-install-recommends \
      ca-certificates curl gnupg git sudo tmux jq unzip openssh-server \
      build-essential python3 \
    && rm -rf /var/lib/apt/lists/*

# Node 24 (CI usa 24.x; engines do package.json: >=22). pnpm vem do corepack (packageManager = pnpm@11.28.6).
RUN curl -fsSL https://deb.nodesource.com/setup_24.x | bash - \
    && apt-get install -y nodejs \
    && rm -rf /var/lib/apt/lists/* \
    && corepack enable \
    && corepack prepare pnpm@11.28.6 --activate
ENV COREPACK_ENABLE_DOWNLOAD_PROMPT=0
ENV COREPACK_DEFAULT_TO_LATEST=0

# Docker (para `pnpm db:up` / `pnpm test:db`)
RUN install -m 0755 -d /etc/apt/keyrings && \
    curl --retry 3 --retry-delay 5 -fsSL https://download.docker.com/linux/ubuntu/gpg | gpg --dearmor -o /etc/apt/keyrings/docker.gpg && \
    chmod a+r /etc/apt/keyrings/docker.gpg && \
    echo "deb [arch=$(dpkg --print-architecture) signed-by=/etc/apt/keyrings/docker.gpg] https://download.docker.com/linux/ubuntu \
    $(. /etc/os-release && echo "$VERSION_CODENAME") stable" | tee /etc/apt/sources.list.d/docker.list > /dev/null && \
    apt-get update && \
    apt-get install -y docker-ce docker-ce-cli containerd.io docker-buildx-plugin docker-compose-plugin \
    && rm -rf /var/lib/apt/lists/*

RUN apt-get update && apt-get install -y fuse-overlayfs iptables && rm -rf /var/lib/apt/lists/*
RUN mkdir -p /etc/docker && printf '%s\n' '{' '  "storage-driver": "fuse-overlayfs"' '}' > /etc/docker/daemon.json
RUN update-alternatives --set iptables /usr/sbin/iptables-legacy && \
    update-alternatives --set ip6tables /usr/sbin/ip6tables-legacy

# Usuário não-root com docker e sudo sem senha (padrão da doc do Cursor).
# ubuntu:24.04 já tem o usuário ubuntu — não falhar se existir.
RUN echo 'PasswordAuthentication no\nChallengeResponseAuthentication no\nUsePAM no' > /etc/ssh/sshd_config.d/disable_password_auth.conf
RUN id -u ubuntu >/dev/null 2>&1 || useradd -m -s /bin/bash ubuntu
RUN groupadd -f docker && usermod -aG docker ubuntu && usermod -aG sudo ubuntu
RUN echo "ubuntu ALL=(ALL) NOPASSWD:ALL" > /etc/sudoers.d/ubuntu

# Substitui o shim do corepack: sem isso, `pnpm -v` no login shell caía em 11.24.0 ou baixava 12.x.
RUN npm install -g pnpm@11.28.6 --force && pnpm --version

USER ubuntu
WORKDIR /home/ubuntu
